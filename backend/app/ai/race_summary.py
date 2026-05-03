"""Race summary generator.

Aggregates structured events into a timeline and generates a natural-language
summary.  The _generate_narrative() function is a placeholder — swap in an
LLM call (Anthropic, OpenAI, etc.) without changing the public interface.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Timeline builder
# ---------------------------------------------------------------------------

def build_timeline(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sort and enrich raw event dicts into a structured timeline."""
    timeline = []
    for evt in sorted(events, key=lambda e: e.get("timestamp", "")):
        entry: Dict[str, Any] = {
            "timestamp": evt.get("timestamp"),
            "lap": evt.get("lap_number"),
            "type": evt.get("event_type"),
            "driver_number": evt.get("driver_number"),
            "description": _describe_event(evt),
        }
        if evt.get("event_metadata"):
            entry["detail"] = evt["event_metadata"]
        timeline.append(entry)
    return timeline


def _describe_event(evt: Dict[str, Any]) -> str:
    etype = evt.get("event_type", "unknown")
    driver = evt.get("driver_number")
    lap = evt.get("lap_number")
    meta = evt.get("event_metadata") or {}

    lap_str = f" (Lap {lap})" if lap else ""
    driver_str = f"Car #{driver}" if driver else "Session"

    descriptions = {
        "pit_stop": (
            f"{driver_str} pits{lap_str}."
            + (f" Duration: {meta.get('pit_duration'):.1f}s" if meta.get("pit_duration") else "")
        ),
        "overtake": (
            f"{driver_str} overtakes{lap_str}, "
            f"P{meta.get('position_before')} → P{meta.get('position_after')}."
        ),
        "safety_car": f"Safety car deployed{lap_str}.",
        "virtual_safety_car": f"Virtual safety car{lap_str}.",
        "yellow_flag": f"Yellow flag{lap_str}." + (f" Sector {meta.get('sector')}" if meta.get("sector") else ""),
        "green_flag": f"Green flag — racing resumed{lap_str}.",
        "red_flag": f"Red flag — session stopped{lap_str}.",
        "drs_enabled": f"DRS enabled{lap_str}.",
        "fastest_lap": f"{driver_str} sets fastest lap{lap_str}.",
    }

    return descriptions.get(etype, f"{etype.replace('_', ' ').title()}{lap_str}.")


# ---------------------------------------------------------------------------
# Summary generator
# ---------------------------------------------------------------------------

def generate_summary(
    timeline: List[Dict[str, Any]],
    session_name: Optional[str] = None,
    total_laps: Optional[int] = None,
) -> Dict[str, Any]:
    """Return a structured summary with an embedded narrative string."""
    event_counts: Dict[str, int] = {}
    for entry in timeline:
        event_counts[entry["type"]] = event_counts.get(entry["type"], 0) + 1

    narrative = _generate_narrative(timeline, session_name, total_laps, event_counts)

    return {
        "session_name": session_name,
        "total_events": len(timeline),
        "event_counts": event_counts,
        "highlights": [e["description"] for e in timeline if e["type"] in {"overtake", "safety_car", "red_flag"}][:10],
        "timeline": timeline,
        "narrative": narrative,
        "generated_at": datetime.utcnow().isoformat(),
    }


def _generate_narrative(
    timeline: List[Dict[str, Any]],
    session_name: Optional[str],
    total_laps: Optional[int],
    event_counts: Dict[str, int],
) -> str:
    """Placeholder narrative generator.

    Replace with an LLM call, e.g.:
        client = anthropic.Anthropic()
        msg = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}]
        )
        return msg.content[0].text
    """
    pits = event_counts.get("pit_stop", 0)
    overtakes = event_counts.get("overtake", 0)
    sc = event_counts.get("safety_car", 0)

    parts: List[str] = []
    if session_name:
        parts.append(f"Race summary for {session_name}.")
    if total_laps:
        parts.append(f"The race ran over {total_laps} laps.")
    if pits:
        parts.append(f"There were {pits} pit stop{'s' if pits != 1 else ''}.")
    if overtakes:
        parts.append(f"{overtakes} overtake{'s were' if overtakes != 1 else ' was'} recorded.")
    if sc:
        parts.append("A safety car was deployed during the race.")

    if not parts:
        return "No significant events recorded."
    return " ".join(parts)
