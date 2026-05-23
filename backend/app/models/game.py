from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum

from fastapi import WebSocket


class RoomPhase(StrEnum):
    MATCHED = "matched"
    COUNTDOWN = "countdown"
    PERFORMING = "performing"
    JUDGING = "judging"
    RESULTS = "results"


@dataclass(slots=True)
class PlayerConnection:
    player_id: str
    websocket: WebSocket
    room_id: str | None = None


@dataclass(slots=True)
class Room:
    room_id: str
    players: list[PlayerConnection]
    celebration: dict
    phase: RoomPhase = RoomPhase.MATCHED
    frames: dict[str, list[str]] = field(default_factory=dict)
