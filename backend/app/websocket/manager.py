"""WebSocket connection manager.

Features added over v1:
- Per-connection sync-delay (delay_seconds). Client sends:
    {"type": "set_delay", "value": 35}
  and all subsequent messages are held for 35 s before delivery.
  Client can also send {"type": "sync_now"} to flush queued messages
  immediately (set delay to 0 temporarily).

- Delayed delivery via per-connection asyncio.Queue + delivery task.
  Each message is stamped with its publish_time (monotonic). The delivery
  task sleeps until publish_time + delay_seconds before sending.

- Multi-channel Redis pub/sub (leaderboard / events / predictions).
  Manager subscribes to all channels in settings.redis_pubsub_channels.
  Messages arrive tagged with "channel"; clients receive the full JSON.

Redis key / channel legend (updated):
  f1:ch:leaderboard   — leaderboard snapshots and deltas
  f1:ch:events        — new race events
  f1:ch:predictions   — AI predictions
"""

import asyncio
import json
import time
from dataclasses import dataclass, field
from typing import Dict, Optional, Set

from fastapi import WebSocket
from starlette.websockets import WebSocketState

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.redis_client import get_redis

logger = get_logger(__name__)
settings = get_settings()


# ---------------------------------------------------------------------------
# Per-connection state
# ---------------------------------------------------------------------------

@dataclass
class _ConnState:
    delay_seconds: float = 0.0
    # (publish_monotonic, json_payload)
    queue: asyncio.Queue = field(
        default_factory=lambda: asyncio.Queue(maxsize=settings.ws_queue_maxsize)
    )
    delivery_task: Optional[asyncio.Task] = None


# ---------------------------------------------------------------------------
# Connection manager
# ---------------------------------------------------------------------------

class ConnectionManager:
    def __init__(self) -> None:
        self._connections: Dict[WebSocket, _ConnState] = {}
        self._lock = asyncio.Lock()
        self._subscriber_task: Optional[asyncio.Task] = None

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        state = _ConnState()
        async with self._lock:
            self._connections[websocket] = state
        # Start per-connection delivery task
        state.delivery_task = asyncio.create_task(
            self._deliver_to(websocket, state),
            name=f"ws_deliver_{id(websocket)}",
        )
        logger.info("WebSocket connected — total: %d", len(self._connections))

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            state = self._connections.pop(websocket, None)
        if state and state.delivery_task:
            state.delivery_task.cancel()
            try:
                await state.delivery_task
            except asyncio.CancelledError:
                pass
        logger.info("WebSocket disconnected — total: %d", len(self._connections))

    # ------------------------------------------------------------------
    # Delay control (called from WS endpoint on client message)
    # ------------------------------------------------------------------

    def set_delay(self, websocket: WebSocket, delay_seconds: float) -> None:
        state = self._connections.get(websocket)
        if state is None:
            return
        clamped = max(0.0, min(delay_seconds, settings.ws_max_delay_seconds))
        state.delay_seconds = clamped
        logger.info("WS %s delay set to %.1f s", id(websocket), clamped)

    def sync_now(self, websocket: WebSocket) -> None:
        """Flush all queued messages immediately by zeroing delay."""
        self.set_delay(websocket, 0.0)

    # ------------------------------------------------------------------
    # Broadcasting
    # ------------------------------------------------------------------

    async def broadcast(self, payload: str) -> None:
        """Enqueue a message for all connected clients (respects per-client delay)."""
        if not self._connections:
            return
        publish_time = time.monotonic()
        async with self._lock:
            snapshot = dict(self._connections)
        for ws, state in snapshot.items():
            try:
                state.queue.put_nowait((publish_time, payload))
            except asyncio.QueueFull:
                logger.warning("WS queue full for %s — dropping message", id(ws))

    # ------------------------------------------------------------------
    # Per-connection delivery task
    # ------------------------------------------------------------------

    async def _deliver_to(self, ws: WebSocket, state: _ConnState) -> None:
        """Pull from the connection's queue and deliver at the scheduled time."""
        while True:
            try:
                # Wait up to 30 s for a message; send ping on timeout
                try:
                    publish_time, payload = await asyncio.wait_for(
                        state.queue.get(), timeout=30.0
                    )
                except asyncio.TimeoutError:
                    if ws.client_state == WebSocketState.CONNECTED:
                        await ws.send_text('{"type":"ping"}')
                    continue

                # Honour per-connection delay
                target = publish_time + state.delay_seconds
                wait = target - time.monotonic()
                if wait > 0:
                    await asyncio.sleep(wait)

                if ws.client_state == WebSocketState.CONNECTED:
                    await ws.send_text(payload)

            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.debug("Delivery error for WS %s: %s", id(ws), exc)
                break

    # ------------------------------------------------------------------
    # Redis pub/sub subscriber (background task)
    # ------------------------------------------------------------------

    async def start_subscriber(self) -> None:
        if self._subscriber_task and not self._subscriber_task.done():
            return
        self._subscriber_task = asyncio.create_task(
            self._redis_subscriber(), name="ws_redis_subscriber"
        )
        channels = settings.redis_pubsub_channels
        logger.info("Redis pub/sub subscriber started — channels: %s", channels)

    async def stop_subscriber(self) -> None:
        if self._subscriber_task:
            self._subscriber_task.cancel()
            try:
                await self._subscriber_task
            except asyncio.CancelledError:
                pass
            self._subscriber_task = None

    async def _redis_subscriber(self) -> None:
        channels = settings.redis_pubsub_channels
        redis = get_redis()
        pubsub = redis.pubsub()
        await pubsub.subscribe(*channels)
        logger.info("Subscribed to Redis channels: %s", channels)
        try:
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                data: Optional[str] = message.get("data")
                if data:
                    await self.broadcast(data)
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error("Redis subscriber error: %s", exc)
        finally:
            await pubsub.unsubscribe(*channels)
            await pubsub.aclose()


# Singleton shared across the application lifetime
manager = ConnectionManager()
