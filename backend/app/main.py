"""FastAPI application entry point."""

import asyncio
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import drivers, events, health, leaderboard, predictions, radio
from app.core.config import get_settings
from app.core.database import init_db
from app.core.logging import get_logger, setup_logging
from app.core.redis_client import close_redis, get_redis, init_redis
from app.websocket.manager import manager

setup_logging()
logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s", settings.app_name)

    await init_redis()
    logger.info("Redis connected")

    await init_db()
    logger.info("Database tables ensured")

    await manager.start_subscriber()
    logger.info("WebSocket pub/sub subscriber running")

    yield

    logger.info("Shutting down")
    await manager.stop_subscriber()
    await close_redis()


app = FastAPI(
    title=settings.app_name,
    version="1.1.0",
    description="Real-time Formula 1 analytics and AI prediction platform.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routers
app.include_router(health.router)
app.include_router(drivers.router, prefix="/api/v1")
app.include_router(leaderboard.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(predictions.router, prefix="/api/v1")
app.include_router(radio.router, prefix="/api/v1")


# WebSocket endpoint

@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket) -> None:
    """Real-time live feed.

    Client → Server messages:
      {"type": "set_delay", "value": 35}   — buffer all outgoing messages by 35 s
      {"type": "sync_now"}                  — flush buffer, set delay back to 0

    Server → Client messages:
      {"type": "snapshot", "channel": "...", "data": {...}}   — full state
      {"type": "delta",    "channel": "...", "data": {...}}   — incremental update
      {"type": "ping"}                                         — keepalive
    """
    await manager.connect(websocket)
    try:
        # Immediately push the current leaderboard snapshot on connect
        redis = get_redis()
        raw_snapshot = await redis.get(settings.redis_leaderboard_key)
        if raw_snapshot:
            await websocket.send_text(
                json.dumps({
                    "type": "snapshot",
                    "channel": "leaderboard",
                    "data": json.loads(raw_snapshot),
                })
            )

        # Bidirectional receive loop — actual push delivery runs in the
        # per-connection delivery task started by manager.connect()
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                _handle_client_message(websocket, raw)
            except asyncio.TimeoutError:
                # Timeout is fine — delivery task sends its own pings
                pass

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("WebSocket session ended: %s", exc)
    finally:
        await manager.disconnect(websocket)


def _handle_client_message(websocket: WebSocket, raw: str) -> None:
    """Parse and dispatch an inbound WebSocket control message."""
    try:
        msg = json.loads(raw)
    except json.JSONDecodeError:
        logger.debug("Unparseable WS message from %s: %.80s", id(websocket), raw)
        return

    msg_type = msg.get("type")

    if msg_type == "set_delay":
        try:
            delay = float(msg["value"])
        except (KeyError, TypeError, ValueError):
            logger.debug("Invalid set_delay value: %s", msg)
            return
        manager.set_delay(websocket, delay)

    elif msg_type == "sync_now":
        manager.sync_now(websocket)

    else:
        logger.debug("Unknown WS message type '%s' from %s", msg_type, id(websocket))
