from flask import Blueprint, jsonify, request
from app.services.dataset_service import get_dataset_service

dataset_bp = Blueprint("dataset", __name__)


@dataset_bp.route("/load-intent-data", methods=["GET"])
def load_dataset():
    """Load dataset from Hugging Face (always fresh to avoid user data leaking)"""
    try:
        refresh = request.args.get("refresh", "false").lower() == "true"
        dataset_repo = request.args.get("dataset", "Cantina/intent-full-data-20251106")
        split = request.args.get("split", "train")  # 'train' or 'test'

        dataset_service = get_dataset_service(dataset_repo=dataset_repo, split=split)

        # Always load fresh data (no shared cache between users)
        rows = dataset_service.load(force_refresh=refresh)

        return jsonify({
            "success": True,
            "rows": rows,
            "count": len(rows),
            "source": "huggingface",
            "dataset": dataset_repo,
            "split": split
        })
    except Exception as e:
        return jsonify({
            "error": "Failed to load dataset",
            "message": str(e)
        }), 500


@dataset_bp.route("/dataset-status", methods=["GET"])
def dataset_status():
    """Dataset status endpoint (kept for compatibility)"""
    try:
        # No background loading anymore - always returns ready
        return jsonify({
            "loading": False,
            "cached": False,  # No cache - always loads fresh
            "count": 0  # Unknown until loaded
        })
    except Exception as e:
        return jsonify({
            "error": "Failed to get status",
            "message": str(e)
        }), 500
