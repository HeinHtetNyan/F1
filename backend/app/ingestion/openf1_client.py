"""Async HTTP client for the OpenF1 REST API with retry + exponential backoff."""

import asyncio
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class OpenF1Client:
    """Async HTTP client for the OpenF1 REST API.

    All public methods return an empty list on permanent failure (after
    exhausting retries) so callers can fall back to the Redis cache.
    """

    def __init__(self) -> None:
        self.base_url = settings.openf1_base_url
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self) -> "OpenF1Client":
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(10.0, connect=5.0),
            headers={"Accept": "application/json"},
            follow_redirects=True,
        )
        return self

    async def __aexit__(self, *_: Any) -> None:
        if self._client:
            await self._client.aclose()

    # Internal helpers

    async def _get_raw(self, endpoint: str, params: Optional[Dict] = None) -> List[Dict]:
        """Single HTTP GET — raises on any failure."""
        assert self._client is not None, "Use async context manager"
        response = await self._client.get(endpoint, params=params)
        response.raise_for_status()
        return response.json()  # type: ignore[return-value]

    async def _get(
        self,
        endpoint: str,
        params: Optional[Dict] = None,
        max_retries: Optional[int] = None,
        backoff_base: Optional[float] = None,
    ) -> List[Dict]:
        """GET with exponential backoff; returns [] after all retries exhausted."""
        retries = max_retries if max_retries is not None else settings.openf1_max_retries
        base    = backoff_base if backoff_base is not None else settings.openf1_backoff_base

        last_exc: Optional[Exception] = None
        for attempt in range(retries):
            try:
                return await self._get_raw(endpoint, params)
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code
                # 4xx (except 429) are permanent — no point retrying
                if 400 <= status < 500 and status != 429:
                    logger.error(
                        "OpenF1 permanent HTTP %s on %s: %s",
                        status, endpoint, exc.response.text[:200],
                    )
                    return []
                last_exc = exc
            except (httpx.RequestError, httpx.TimeoutException) as exc:
                last_exc = exc

            wait = base * (2 ** attempt)
            logger.warning(
                "OpenF1 retry %d/%d for %s in %.1fs — %s",
                attempt + 1, retries, endpoint, wait, last_exc,
            )
            await asyncio.sleep(wait)

        logger.error("OpenF1 all retries exhausted for %s — %s", endpoint, last_exc)
        return []

    # Public API methods

    async def get_latest_session(self) -> Optional[Dict]:
        data = await self._get("/sessions", {"session_key": "latest"})
        return data[0] if data else None

    async def get_drivers(self, session_key: str = "latest") -> List[Dict]:
        return await self._get("/drivers", {"session_key": session_key})

    async def get_positions(self, session_key: str = "latest") -> List[Dict]:
        return await self._get("/position", {"session_key": session_key})

    async def get_laps(
        self,
        session_key: str = "latest",
        driver_number: Optional[int] = None,
    ) -> List[Dict]:
        params: Dict = {"session_key": session_key}
        if driver_number is not None:
            params["driver_number"] = driver_number
        return await self._get("/laps", params)

    async def get_stints(self, session_key: str = "latest") -> List[Dict]:
        return await self._get("/stints", {"session_key": session_key})

    async def get_pit_stops(self, session_key: str = "latest") -> List[Dict]:
        return await self._get("/pit", {"session_key": session_key})

    async def get_race_control(self, session_key: str = "latest") -> List[Dict]:
        return await self._get("/race_control", {"session_key": session_key})

    async def get_intervals(self, session_key: str = "latest") -> List[Dict]:
        return await self._get("/intervals", {"session_key": session_key})

    async def get_car_data(
        self,
        session_key: str = "latest",
        driver_number: Optional[int] = None,
    ) -> List[Dict]:
        params: Dict = {"session_key": session_key}
        if driver_number is not None:
            params["driver_number"] = driver_number
        return await self._get("/car_data", params)

    async def get_team_radio(self, session_key: str = "latest") -> List[Dict]:
        return await self._get("/team_radio", {"session_key": session_key})

    async def get_location(
        self,
        session_key: str = "latest",
        date_gt: Optional[str] = None,
    ) -> List[Dict]:
        params: Dict = {"session_key": session_key}
        if date_gt:
            params["date>"] = date_gt
        return await self._get("/location", params, max_retries=1)
