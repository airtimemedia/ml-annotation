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
        prompt_name = annotation.get("prompt_name")

        if not prompt_name:
            return jsonify({
                "error": "Missing prompt_name in annotation"
            }), 400

        # Load fresh data, update the row, and push to Hugging Face
        # This ensures no shared state between users
        dataset_service = get_dataset_service(dataset_repo=dataset_repo)
        dataset_service.update_and_push(annotation)

        return jsonify({
            "success": True,
            "message": "Annotation saved to Hugging Face",
            "dataset": dataset_repo
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

        # Load fresh data, append the new row, and push to Hugging Face
        dataset_service = get_dataset_service(dataset_repo=dataset_repo)
        rows = dataset_service.load(force_refresh=False)

        # Add the new row
        rows.append(row_data)

        # Push updated data to Hugging Face
        dataset_service._push_data_to_hub(rows, f"Add cloned row: {row_data.get('prompt_name')}")

        return jsonify({
            "success": True,
            "message": "Row created successfully",
            "dataset": dataset_repo
        })
    except Exception as e:
        return jsonify({
            "error": "Failed to create row",
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
