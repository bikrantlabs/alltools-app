"""Minimal AllTools plugin supervisor for the MVP.

The supervisor intentionally stays dependency-free. The Electron main process can
invoke it with a plugin command and a JSON request, while the supervisor keeps
process management outside the renderer.
"""
from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
from typing import Any


def emit(event: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(event, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def run(command: list[str], request: dict[str, Any]) -> int:
    process = subprocess.Popen(
        command,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        cwd=request.get("jobDirectory"),
        env={**os.environ, "ALLTOOLS_OFFLINE": "1"},
        start_new_session=True,
    )
    assert process.stdin is not None
    assert process.stdout is not None
    process.stdin.write(json.dumps(request) + "\n")
    process.stdin.flush()
    process.stdin.close()

    for line in process.stdout:
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            emit({"type": "log", "jobId": request.get("jobId"), "level": "warning", "message": "Plugin emitted invalid protocol output."})
            continue
        emit(event)

    return process.wait()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--request", required=True, help="Path to a JSON request file")
    parser.add_argument("--command", nargs=argparse.REMAINDER, required=True)
    args = parser.parse_args()
    with open(args.request, encoding="utf-8") as handle:
        request = json.load(handle)
    return run(args.command, request)


if __name__ == "__main__":
    raise SystemExit(main())
