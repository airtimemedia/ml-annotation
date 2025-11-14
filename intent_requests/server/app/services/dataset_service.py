import os
import tempfile
import pyarrow.parquet as pq
import pyarrow as pa
from huggingface_hub import hf_hub_download, HfApi
from typing import List, Dict, Any

# Configure HuggingFace to use /tmp for caching (Vercel serverless requirement)
os.environ.setdefault("HF_HOME", "/tmp/huggingface")
os.environ.setdefault("HUGGINGFACE_HUB_CACHE", "/tmp/huggingface/hub")


class DatasetService:
    def __init__(self, dataset_repo: str = "Cantina/intent-full-data-20251106"):
        # No in-memory cache - always load fresh to avoid user data leaking between requests
        self.hf_token = os.environ.get("HUGGINGFACE_TOKEN")
        self.dataset_repo = dataset_repo

        if not self.hf_token:
            raise ValueError("HUGGINGFACE_TOKEN environment variable is required")

    def _transform_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """No transformation needed - just pass through"""
        return dict(row)

    def load(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """Load dataset from Hugging Face (always fresh to avoid user data leaking)"""
        print(f"Loading from Hugging Face...")

        # Download parquet file from HuggingFace
        # The file is cached in /tmp/huggingface/hub for performance (read-only cache)
        # but we don't keep an in-memory cache to avoid sharing data between users
        parquet_path = hf_hub_download(
            repo_id=self.dataset_repo,
            filename="data/train-00000-of-00001.parquet",
            repo_type="dataset",
            token=self.hf_token,
            cache_dir="/tmp/huggingface/hub",
            force_download=force_refresh  # Re-download if force_refresh is True
        )

        # Read parquet file with pyarrow (no pandas needed)
        table = pq.read_table(parquet_path)

        # Convert to list of dicts
        data_list = table.to_pylist()

        # Transform rows
        rows = [self._transform_row(row) for row in data_list]
        print(f"Loaded {len(rows)} rows from Hugging Face")
        return rows

    # Removed async loading methods to prevent shared state between users

    def update_and_push(self, row_data: Dict[str, Any]) -> None:
        """Load fresh data, update a single row, and push to Hugging Face"""
        prompt_name = row_data.get("prompt_name")
        if not prompt_name:
            raise ValueError("prompt_name is required")

        # Load fresh data from Hugging Face (no shared cache)
        print(f"Loading fresh data to update row: {prompt_name}")
        rows = self.load(force_refresh=False)

        # Find and update the row
        updated = False
        for i, row in enumerate(rows):
            if row["prompt_name"] == prompt_name:
                rows[i].update(row_data)
                print(f"Updated row: {prompt_name}")
                updated = True
                break

        if not updated:
            raise ValueError(f"Row not found: {prompt_name}")

        # Push updated data to Hugging Face
        self._push_data_to_hub(rows, f"Update annotations: {prompt_name}")

    def _push_data_to_hub(self, rows: List[Dict[str, Any]], commit_message: str) -> None:
        """Push data to Hugging Face (internal method)"""
        if not rows:
            raise ValueError("No data to push")

        print(f"Pushing {len(rows)} rows to Hugging Face...")

        # Convert to PyArrow Table
        table = pa.Table.from_pylist(rows)

        # Write to temporary parquet file in /tmp (Vercel serverless requirement)
        with tempfile.NamedTemporaryFile(suffix='.parquet', delete=False, dir='/tmp') as tmp:
            tmp_path = tmp.name

        try:
            # Write parquet file
            pq.write_table(table, tmp_path)

            # Upload using HuggingFace Hub API
            api = HfApi()
            api.upload_file(
                path_or_fileobj=tmp_path,
                path_in_repo="data/train-00000-of-00001.parquet",
                repo_id=self.dataset_repo,
                repo_type="dataset",
                token=self.hf_token,
                commit_message=commit_message
            )
            print(f"Successfully pushed to Hugging Face")
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)


def get_dataset_service(dataset_repo: str = "Cantina/intent-full-data-20251106") -> DatasetService:
    """Create a new DatasetService instance (no singleton to avoid shared state)"""
    return DatasetService(dataset_repo=dataset_repo)
