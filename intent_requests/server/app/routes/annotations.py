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
        prompt_name = annotation.get("prompt_name")

        if not prompt_name:
            return jsonify({
                "error": "Missing prompt_name in annotation"
            }), 400

        # Load fresh data, update the row, and push to Hugging Face
        # This ensures no shared state between users
        dataset_service = get_dataset_service()
        dataset_service.update_and_push(annotation)

        return jsonify({
            "success": True,
            "message": "Annotation saved to Hugging Face"
        })
    except Exception as e:
        return jsonify({
            "error": "Failed to save annotation",
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
