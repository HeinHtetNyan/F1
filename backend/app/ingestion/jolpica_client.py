"""Jolpica/Ergast API client — free fallback for circuit info and race results."""

from datetime import date
from typing import Dict, List, Optional

import httpx

from app.core.logging import get_logger

logger = get_logger(__name__)

_BASE = "https://api.jolpi.ca/ergast"
_TIMEOUT = 10.0
_YEAR = 2026


class JolpicaClient:
    """Lightweight async client for Jolpica/Ergast F1 API (no auth required)."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _get(self, path: str) -> Optional[dict]:
        url = f"{_BASE}{path}"
        try:
            resp = await self._client.get(url)
            if resp.status_code == 200:
                return resp.json()
            logger.warning("Jolpica %s → HTTP %d", path, resp.status_code)
        except Exception as exc:
            logger.warning("Jolpica request error %s: %s", path, exc)
        return None

    async def get_current_race_weekend(self, today: Optional[date] = None) -> Optional[Dict]:
        """Return the nearest race from the 2026 calendar relative to today.

        Prefers the next upcoming race; falls back to the most recent past race if
        no future races remain. Returns a dict with keys:
          round, raceName, circuitId, circuitName, locality, country, raceDate, year
        """
        if today is None:
            today = date.today()

        data = await self._get(f"/f1/{_YEAR}.json")
        if not data:
            return None

        races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
        if not races:
            return None

        upcoming: Optional[dict] = None
        latest_past: Optional[dict] = None

        for race in races:
            race_date_str = race.get("date", "")
            try:
                race_date = date.fromisoformat(race_date_str)
            except ValueError:
                continue

            if race_date >= today:
                if upcoming is None:
                    upcoming = race  # first future race (calendar is sorted)
            else:
                latest_past = race  # keep updating until we pass today

        target = upcoming or latest_past
        if not target:
            return None

        circuit = target.get("Circuit", {})
        loc = circuit.get("Location", {})
        return {
            "round":       target.get("round"),
            "year":        _YEAR,
            "raceName":    target.get("raceName", ""),
            "circuitId":   circuit.get("circuitId", ""),
            "circuitName": circuit.get("circuitName", ""),
            "locality":    loc.get("locality", ""),
            "country":     loc.get("country", ""),
            "raceDate":    target.get("date", ""),
        }

    async def get_latest_race_results(self) -> List[Dict]:
        """Return the finishing order from the most recent completed race.

        Each dict has: position, driverCode, driverNumber, givenName,
        familyName, constructorName.
        """
        data = await self._get(f"/f1/{_YEAR}/last/results.json")
        if not data:
            return []

        races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
        if not races:
            return []

        results = races[0].get("Results", [])
        out: List[Dict] = []
        for r in results:
            driver = r.get("Driver", {})
            constructor = r.get("Constructor", {})
            try:
                position = int(r.get("position", 99))
                driver_number = int(driver.get("permanentNumber") or 0)
            except (ValueError, TypeError):
                continue

            out.append({
                "position":        position,
                "driverCode":      driver.get("code", "???"),
                "driverNumber":    driver_number,
                "givenName":       driver.get("givenName", ""),
                "familyName":      driver.get("familyName", ""),
                "constructorName": constructor.get("name", "Unknown"),
            })

        out.sort(key=lambda x: x["position"])
        return out
