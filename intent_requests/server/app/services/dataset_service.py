import os
import threading
import json
import tempfile
import requests
from huggingface_hub import hf_hub_download, HfApi
from typing import List, Dict, Any, Optional


class DatasetService:
    def __init__(self):
        self.cache: Optional[List[Dict[str, Any]]] = None
        self.hf_token = os.environ.get("HUGGINGFACE_TOKEN")
        self.dataset_repo = "Cantina/intent-full-data-20251106"
        self._loading_lock = threading.Lock()
        self._is_loading = False
        self._load_thread: Optional[threading.Thread] = None

        if not self.hf_token:
            raise ValueError("HUGGINGFACE_TOKEN environment variable is required")

    def _transform_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """No transformation needed - just pass through"""
        return dict(row)

    def load(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """Load dataset from cache or Hugging Face (blocking)"""
        if self.cache and not force_refresh:
            print(f"Loading from memory cache ({len(self.cache)} rows)")
            return self.cache

        print(f"{'Refreshing' if force_refresh else 'Loading'} from Hugging Face...")

        # Use HuggingFace Datasets Server API to get data as JSON
        # This avoids needing pandas/pyarrow
        api_url = f"https://datasets-server.huggingface.co/rows"
        params = {
            "dataset": self.dataset_repo,
            "config": "default",
            "split": "train",
            "offset": 0,
            "length": 100  # Fetch in batches
        }

        headers = {"Authorization": f"Bearer {self.hf_token}"}

        all_rows = []
        offset = 0
        batch_size = 100

        while True:
            params["offset"] = offset
            params["length"] = batch_size

            response = requests.get(api_url, params=params, headers=headers)
            response.raise_for_status()

            data = response.json()
            rows = data.get("rows", [])

            if not rows:
                break

            # Extract row data
            for item in rows:
                row_data = item.get("row", {})
                all_rows.append(self._transform_row(row_data))

            # Check if we've fetched all rows
            if len(rows) < batch_size:
                break

            offset += batch_size
            print(f"Loaded {len(all_rows)} rows so far...")

        self.cache = all_rows
        print(f"Loaded {len(self.cache)} rows into memory")
        return self.cache

    def load_async(self, force_refresh: bool = False) -> bool:
        """Start loading dataset in background thread. Returns True if started, False if already loading."""
        with self._loading_lock:
            if self._is_loading:
                print("Dataset already loading in background")
                return False

            if self.cache and not force_refresh:
                print(f"Using cached dataset ({len(self.cache)} rows)")
                return False

            self._is_loading = True

        def _load_in_background():
            try:
                print(f"Background: {'Refreshing' if force_refresh else 'Loading'} from Hugging Face...")

                # Use HuggingFace Datasets Server API
                api_url = f"https://datasets-server.huggingface.co/rows"
                params = {
                    "dataset": self.dataset_repo,
                    "config": "default",
                    "split": "train",
                    "offset": 0,
                    "length": 100
                }

                headers = {"Authorization": f"Bearer {self.hf_token}"}

                all_rows = []
                offset = 0
                batch_size = 100

                while True:
                    params["offset"] = offset
                    params["length"] = batch_size

                    response = requests.get(api_url, params=params, headers=headers)
                    response.raise_for_status()

                    data = response.json()
                    rows = data.get("rows", [])

                    if not rows:
                        break

                    for item in rows:
                        row_data = item.get("row", {})
                        all_rows.append(self._transform_row(row_data))

                    if len(rows) < batch_size:
                        break

                    offset += batch_size

                with self._loading_lock:
                    self.cache = all_rows
                    self._is_loading = False
                    print(f"Background: Loaded {len(self.cache)} rows into memory")
            except Exception as e:
                with self._loading_lock:
                    self._is_loading = False
                print(f"Background: Error loading dataset: {e}")

        self._load_thread = threading.Thread(target=_load_in_background, daemon=True)
        self._load_thread.start()
        return True

    def is_loading(self) -> bool:
        """Check if dataset is currently being loaded in background"""
        with self._loading_lock:
            return self._is_loading

    def update_row(self, row_data: Dict[str, Any]) -> None:
        """Update a single row in the cache"""
        if not self.cache:
            raise ValueError("Dataset not loaded")

        prompt_name = row_data.get("prompt_name")
        if not prompt_name:
            raise ValueError("prompt_name is required")

        # Find and update the row (cache uses new column names)
        for i, row in enumerate(self.cache):
            if row["prompt_name"] == prompt_name:
                self.cache[i].update(row_data)
                print(f"Updated row in cache: {prompt_name}")
                return

        raise ValueError(f"Row not found: {prompt_name}")

    def push_to_hub(self, commit_message: str) -> None:
        """Push the current cache to Hugging Face"""
        if not self.cache:
            raise ValueError("No data to push")

        print(f"Pushing {len(self.cache)} rows to Hugging Face...")

        # Save as JSON (lightweight alternative)
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp:
            json.dump(self.cache, tmp, indent=2)
            tmp_path = tmp.name

        try:
            # Upload using HuggingFace Hub API
            api = HfApi()
            api.upload_file(
                path_or_fileobj=tmp_path,
                path_in_repo="data/train.json",
                repo_id=self.dataset_repo,
                repo_type="dataset",
                token=self.hf_token,
                commit_message=commit_message
            )
            print(f"Successfully pushed to Hugging Face")
        finally:
            # Clean up temp file
            import os
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)


# Global instance - lazy initialized
_dataset_service_instance = None

def get_dataset_service() -> DatasetService:
    global _dataset_service_instance
    if _dataset_service_instance is None:
        _dataset_service_instance = DatasetService()
    return _dataset_service_instance
