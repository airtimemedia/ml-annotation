# Dataset Transformation Scripts

This directory contains scripts for transforming the intent dataset.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Ensure your Hugging Face token is set in the root `.env` file (two levels up):
```bash
HUGGINGFACE_TOKEN=your_token_here
```

## Transform Dataset Notebook

**File**: `transform_dataset.ipynb`

This notebook transforms the dataset from the original 5-column format to a simplified 3-column format:

### Transformation Mapping:
- `prompt_name` → `prompt_name` (unchanged)
- `unified_format_output_enriched_fixed` → `input`
- `gpt5-results-20251104` → `output`

### What it does:
1. Downloads the dataset from Hugging Face
2. Transforms the data structure
3. Validates the transformation
4. Saves the transformed data locally
5. (Optional) Uploads back to Hugging Face

### Usage:

```bash
# Open in Jupyter
jupyter notebook transform_dataset.ipynb

# Or use JupyterLab
jupyter lab transform_dataset.ipynb

# Or run with VS Code
code transform_dataset.ipynb
```

### Important Notes:

⚠️ **The upload cell is commented out by default** to prevent accidental overwrites. Review the transformed data locally first, then uncomment the upload cell if you want to push to Hugging Face.

The notebook will:
- Try multiple possible filenames (data.json, train.json, dataset.json, annotations.json)
- Show you the original data structure
- Display validation statistics
- Save the transformed data to `../transformed_data.json`
- Optionally upload to Hugging Face as `transformed_data.json`

### Output:

The transformed JSON will have this structure:
```json
[
  {
    "prompt_name": "mention_not_in_history_prompt",
    "input": "{\"action\": \"dj\", ...}",
    "output": "{\"action\": \"dj\", ...}"
  }
]
```
