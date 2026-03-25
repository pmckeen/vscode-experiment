from pathlib import Path
import runpy

SCRIPT_PATH = Path(__file__).resolve().parent / "tools" / "cryptoquip-cli" / "main.py"
runpy.run_path(str(SCRIPT_PATH), run_name="__main__")
