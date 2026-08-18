import json
import subprocess
import sys
import unittest
from pathlib import Path


class SupervisorTests(unittest.TestCase):
    def test_supervisor_forwards_plugin_event(self) -> None:
        with self.subTest("protocol forwarding"):
            from tempfile import TemporaryDirectory

            with TemporaryDirectory() as directory:
                tmp_path = Path(directory)
                request_path = tmp_path / "request.json"
                request_path.write_text(json.dumps({"type": "start", "jobId": "job-1", "jobDirectory": str(tmp_path)}), encoding="utf-8")
                plugin = "import sys; print('{\\\"type\\\":\\\"completed\\\",\\\"jobId\\\":\\\"job-1\\\",\\\"outputs\\\":[]}', flush=True)"
                result = subprocess.run(
                    [sys.executable, "supervisor.py", "--request", str(request_path), "--command", sys.executable, "-c", plugin],
                    cwd=Path(__file__).parent,
                    check=True,
                    text=True,
                    capture_output=True,
                )
                event = json.loads(result.stdout.strip())
                self.assertEqual(event["type"], "completed")
                self.assertEqual(event["jobId"], "job-1")


if __name__ == "__main__":
    unittest.main()
