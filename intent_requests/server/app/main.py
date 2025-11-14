import os
from pathlib import Path
from dotenv import load_dotenv
from app.services.app import create_app

# Load .env from repository root (2 levels up from this file)
env_path = Path(__file__).resolve().parents[3] / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"Loaded .env from: {env_path}")
else:
    print(f"Warning: .env not found at {env_path}")

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5177"))
    debug = os.environ.get("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
