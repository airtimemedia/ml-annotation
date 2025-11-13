import sys
from pathlib import Path

current_dir = Path(__file__).resolve().parent
ui_root = current_dir.parent

sys.path.insert(0, str(ui_root / "server"))

from app.main import app

app = app
