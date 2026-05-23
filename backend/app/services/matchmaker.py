from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from uuid import uuid4

from fastapi import WebSocket

from app.models.game import PlayerConnection, Room, RoomPhase
from app.services.celebrations import pick_random_celebration
from app.services.gemini_live_service import forward_frame, stop_live_session

logger = logging.getLogger(__name__)


class Matchmaker:
    def __init__(self) -> None:
        self.start_game_callback: Callable[[str], Awaitable[None]] | None = None
        self.waiting: list[PlayerConnection] = []
        self.players: dict[str, PlayerConnection] = {}
        self.rooms: dict[str, Room] = {}

    def set_start_game_callback(self, cb: Callable[[str], Awaitable[None]]) -> None:
        self.start_game_callback = cb

    async def connect(self, websocket: WebSocket) -> PlayerConnection:
        await websocket.accept()
        player = PlayerConnection(
            player_id=f"P{uuid4().hex[:6].upper()}",
            websocket=websocket,
        )
        self.players[player.player_id] = player
        await self._send(player, {"type": "welcome", "playerId": player.player_id})
        self.waiting.append(player)
        await self._send(player, {"type": "waiting"})

        if len(self.waiting) >= 2:
            await self._create_room()

        return player

    async def handle_message(self, player_id: str, message: dict) -> None:
        player = self.players.get(player_id)
        if not player:
            return

        msg_type = message.get("type")

        if msg_type == "frame" and player.room_id:
            room = self.rooms.get(player.room_id)
            if room and room.phase == RoomPhase.PERFORMING:
                room.frames[player_id].append(message["frame"])
                asyncio.create_task(
                    forward_frame(room.room_id, player_id, message["frame"])
                )

        elif msg_type == "rematch" and player.room_id:
            room = self.rooms.get(player.room_id)
            if room and room.phase == RoomPhase.RESULTS:
                room.celebration = pick_random_celebration()
                room.frames = {p.player_id: [] for p in room.players}
                room.phase = RoomPhase.MATCHED
                await self.broadcast(room, {
                    "type": "matched",
                    "roomId": room.room_id,
                    "celebration": room.celebration,
                })
                if self.start_game_callback:
                    asyncio.create_task(self.start_game_callback(room.room_id))

        elif msg_type == "leave":
            await self._leave_room(player)

    async def _leave_room(self, player: PlayerConnection) -> None:
        """Leave the current room and re-queue for a new match."""
        if player.room_id:
            asyncio.create_task(stop_live_session(player.room_id))
            room = self.rooms.pop(player.room_id, None)
            if room:
                for p in room.players:
                    if p.player_id != player.player_id:
                        try:
                            await self._send(p, {"type": "opponent_disconnected"})
                        except Exception:
                            pass
                        p.room_id = None
                        self.waiting.append(p)
                        await self._send(p, {"type": "waiting"})
            player.room_id = None

        self.waiting.append(player)
        await self._send(player, {"type": "waiting"})

        if len(self.waiting) >= 2:
            await self._create_room()

    async def disconnect(self, player_id: str) -> None:
        player = self.players.pop(player_id, None)
        if not player:
            return

        # Remove from waiting queue
        self.waiting = [p for p in self.waiting if p.player_id != player_id]

        # Clean up room
        if player.room_id:
            asyncio.create_task(stop_live_session(player.room_id))
            room = self.rooms.pop(player.room_id, None)
            if room:
                for p in room.players:
                    if p.player_id != player_id:
                        try:
                            await self._send(p, {"type": "opponent_disconnected"})
                        except Exception:
                            pass
                        p.room_id = None
                        self.waiting.append(p)
                        await self._send(p, {"type": "waiting"})

    async def _send(self, player: PlayerConnection, payload: dict) -> None:
        try:
            await player.websocket.send_json(payload)
        except Exception:
            logger.warning("Failed to send to %s", player.player_id)

    async def broadcast(self, room: Room, payload: dict) -> None:
        for player in room.players:
            await self._send(player, payload)

    async def _create_room(self) -> None:
        p1, p2 = self.waiting.pop(0), self.waiting.pop(0)
        room_id = f"R{uuid4().hex[:8].upper()}"
        celebration = pick_random_celebration()
        room = Room(room_id=room_id, players=[p1, p2], celebration=celebration)

        for player in room.players:
            player.room_id = room_id
            room.frames[player.player_id] = []

        self.rooms[room_id] = room

        await self._send(p1, {
            "type": "matched",
            "roomId": room_id,
            "playerId": p1.player_id,
            "opponentId": p2.player_id,
            "celebration": celebration,
        })
        await self._send(p2, {
            "type": "matched",
            "roomId": room_id,
            "playerId": p2.player_id,
            "opponentId": p1.player_id,
            "celebration": celebration,
        })

        if self.start_game_callback:
            asyncio.create_task(self.start_game_callback(room_id))
