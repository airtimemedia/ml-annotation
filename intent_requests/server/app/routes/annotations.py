from flask import Blueprint, jsonify, request
from app.services.dataset_service import get_dataset_service

annotations_bp = Blueprint("annotations", __name__)


@annotations_bp.route("/save-intent-annotations", methods=["POST"])
def save_annotation():
    """Save a single annotation and push to Hugging Face"""
    try:
        data = request.get_json()
        if not data or "annotation" not in data:
            return jsonify({
                "error": "Missing annotation in request body"
            }), 400

        annotation = data["annotation"]
        dataset_repo = data.get("dataset", "Cantina/intent-full-data-20251106")
        split = data.get("split", "train")  # 'train' or 'test'
        prompt_name = annotation.get("prompt_name")

        if not prompt_name:
            return jsonify({
                "error": "Missing prompt_name in annotation"
            }), 400

        # Load fresh data, update the row, and push to Hugging Face
        # This ensures no shared state between users
        dataset_service = get_dataset_service(dataset_repo=dataset_repo, split=split)
        dataset_service.update_and_push(annotation)

        return jsonify({
            "success": True,
            "message": f"Annotation saved to {split} split",
            "dataset": dataset_repo,
            "split": split
        })
    except Exception as e:
        return jsonify({
            "error": "Failed to save annotation",
            "message": str(e)
        }), 500


@annotations_bp.route("/create-intent-row", methods=["POST"])
def create_intent_row():
    """Create a new row in the dataset (for cloning functionality)"""
    try:
        data = request.get_json()
        if not data or "row" not in data:
            return jsonify({
                "error": "Missing row data in request body"
            }), 400

        row_data = data["row"]
        dataset_repo = data.get("dataset", "Cantina/intent-full-data-20251106")
        split = data.get("split", "train")  # 'train' or 'test'
        insert_after_index = data.get("insert_after_index")

        # Validate required fields
        if not row_data.get("prompt_name"):
            return jsonify({
                "error": "Missing prompt_name in row data"
            }), 400
        if not row_data.get("input"):
            return jsonify({
                "error": "Missing input in row data"
            }), 400
        if not row_data.get("output"):
            return jsonify({
                "error": "Missing output in row data"
            }), 400

        # Load fresh data, insert the new row, and push to Hugging Face
        dataset_service = get_dataset_service(dataset_repo=dataset_repo, split=split)
        rows = dataset_service.load(force_refresh=False)

        # Insert the new row after the specified index, or at the end if not specified
        if insert_after_index is not None and 0 <= insert_after_index < len(rows):
            rows.insert(insert_after_index + 1, row_data)
            commit_msg = f"Add row after index {insert_after_index}: {row_data.get('prompt_name')}"
        else:
            rows.append(row_data)
            commit_msg = f"Add row at end: {row_data.get('prompt_name')}"

        # Push updated data to Hugging Face
        dataset_service._push_data_to_hub(rows, commit_msg)

        return jsonify({
            "success": True,
            "message": f"Row created successfully in {split} split",
            "dataset": dataset_repo,
            "split": split
        })
    except Exception as e:
        return jsonify({
            "error": "Failed to create row",
            "message": str(e)
        }), 500


@annotations_bp.route("/delete-intent-row", methods=["POST"])
def delete_intent_row():
    """Delete a row from the dataset"""
    try:
        data = request.get_json()
        if not data or "row_index" not in data:
            return jsonify({
                "error": "Missing row_index in request body"
            }), 400

        row_index = data["row_index"]
        dataset_repo = data.get("dataset", "Cantina/intent-full-data-20251106")
        split = data.get("split", "train")  # 'train' or 'test'

        # Validate row index
        dataset_service = get_dataset_service(dataset_repo=dataset_repo, split=split)
        rows = dataset_service.load(force_refresh=False)

        if not (0 <= row_index < len(rows)):
            return jsonify({
                "error": f"Invalid row_index: {row_index}. Must be between 0 and {len(rows) - 1}"
            }), 400

        # Get row info for commit message before deleting
        row_prompt_name = rows[row_index].get("prompt_name", "unknown")

        # Delete the row
        deleted_row = rows.pop(row_index)
        commit_msg = f"Delete row {row_index}: {row_prompt_name}"

        # Push updated data to Hugging Face
        dataset_service._push_data_to_hub(rows, commit_msg)

        return jsonify({
            "success": True,
            "message": f"Row deleted successfully from {split} split",
            "dataset": dataset_repo,
            "split": split,
            "new_total_rows": len(rows)
        })
    except Exception as e:
        return jsonify({
            "error": "Failed to delete row",
            "message": str(e)
        }), 500


@annotations_bp.route("/flush-annotations", methods=["POST"])
def flush_annotations():
    """Flush any pending annotations (kept for compatibility, but not needed now)"""
    try:
        return jsonify({
            "success": True,
            "message": "No pending annotations (saves are immediate)"
        })
    except Exception as e:
        return jsonify({
            "error": "Failed to flush annotations",
            "message": str(e)
        }), 500
