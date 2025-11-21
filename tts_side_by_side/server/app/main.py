import os
from pathlib import Path
from dotenv import load_dotenv

from app.constants import (
    ENV_PATH_PARENT_LEVELS,
    DEFAULT_SERVER_PORT,
    ENV_DEVELOPMENT,
    SERVER_HOST
)
from app.services.app import create_app

# Load .env from project root directory (only for local development)
# In production (Vercel), environment variables are set directly and this is skipped
env_path = Path(__file__).parents[ENV_PATH_PARENT_LEVELS] / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    print(f"Loaded .env from: {env_path}")
else:
    print(f"No .env file found at {env_path}, using environment variables from host")

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", str(DEFAULT_SERVER_PORT)))
    debug = os.environ.get("FLASK_ENV") == ENV_DEVELOPMENT
    app.run(host=SERVER_HOST, port=port, debug=debug)
