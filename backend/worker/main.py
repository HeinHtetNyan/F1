"""Worker entry point — runs the ingestion + AI pipeline on a fixed interval."""

import asyncio
import signal
import sys

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal, init_db
from app.core.logging import get_logger, setup_logging
from app.core.redis_client import close_redis, init_redis
from app.ingestion.openf1_client import OpenF1Client
from worker.tasks import ingest_and_update

setup_logging()
logger = get_logger(__name__)
settings = get_settings()

_shutdown = asyncio.Event()


def _handle_signal(*_):
    logger.info("Shutdown signal received")
    _shutdown.set()


async def run() -> None:
    logger.info("F1 Worker starting — poll interval: %.1fs", settings.poll_interval_seconds)

    await init_redis()
    logger.info("Redis connected")

    await init_db()
    logger.info("Database ready")

    async with OpenF1Client() as client:
        while not _shutdown.is_set():
            start = asyncio.get_event_loop().time()

            async with AsyncSessionLocal() as db:
                await ingest_and_update(client, db)

            elapsed = asyncio.get_event_loop().time() - start
            sleep_for = max(0.0, settings.poll_interval_seconds - elapsed)
            logger.debug("Cycle complete in %.2fs, sleeping %.2fs", elapsed, sleep_for)

            try:
                await asyncio.wait_for(_shutdown.wait(), timeout=sleep_for)
            except asyncio.TimeoutError:
                pass

    await close_redis()
    logger.info("Worker stopped cleanly")


def main() -> None:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, _handle_signal)

    try:
        loop.run_until_complete(run())
    except KeyboardInterrupt:
        pass
    finally:
        loop.close()
        sys.exit(0)


if __name__ == "__main__":
    main()
