from flask import Blueprint, jsonify, request
from app.services.dataset_service import get_dataset_service

dataset_bp = Blueprint("dataset", __name__)


@dataset_bp.route("/load-intent-data", methods=["GET"])
def load_dataset():
    """Load dataset from cache or Hugging Face"""
    try:
        refresh = request.args.get("refresh", "false").lower() == "true"
        dataset_service = get_dataset_service()

        if refresh:
            # Start background refresh, return current cache immediately
            started = dataset_service.load_async(force_refresh=True)

            if dataset_service.cache:
                # Return current cache while refresh happens in background
                return jsonify({
                    "success": True,
                    "rows": dataset_service.cache,
                    "count": len(dataset_service.cache),
                    "source": "cache",
                    "refreshing": started
                })
            else:
                # No cache yet, must load synchronously
                rows = dataset_service.load(force_refresh=True)
                return jsonify({
                    "success": True,
                    "rows": rows,
                    "count": len(rows),
                    "source": "huggingface"
                })
        else:
            # Normal load (use cache if available, otherwise load synchronously)
            rows = dataset_service.load(force_refresh=False)
            return jsonify({
                "success": True,
                "rows": rows,
                "count": len(rows),
                "source": "cache" if dataset_service.cache else "huggingface"
            })
    except Exception as e:
        return jsonify({
            "error": "Failed to load dataset",
            "message": str(e)
        }), 500


@dataset_bp.route("/dataset-status", methods=["GET"])
def dataset_status():
    """Check if dataset is currently loading"""
    try:
        dataset_service = get_dataset_service()
        return jsonify({
            "loading": dataset_service.is_loading(),
            "cached": dataset_service.cache is not None,
            "count": len(dataset_service.cache) if dataset_service.cache else 0
        })
    except Exception as e:
        return jsonify({
            "error": "Failed to get status",
            "message": str(e)
        }), 500
