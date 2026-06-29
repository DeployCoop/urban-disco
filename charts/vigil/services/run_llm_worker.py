"""Launcher for the ARQ LLM worker.

Python 3.12+ removed implicit event loop creation in the main thread.
This wrapper ensures an event loop exists before ARQ's Worker initialises.

Usage:
    python -m services.run_llm_worker
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from arq.worker import run_worker
from services.llm_worker import WorkerSettings


def main():
    asyncio.set_event_loop(asyncio.new_event_loop())
    run_worker(WorkerSettings)


if __name__ == "__main__":
    main()
