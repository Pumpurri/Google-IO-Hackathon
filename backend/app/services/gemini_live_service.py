from __future__ import annotations

import asyncio
import base64
import json
import logging
import time
from collections.abc import Awaitable, Callable

from google import genai
from google.genai import types

from app.core.config import settings
from app.utils.images import strip_data_url_prefix

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are a real-time celebration judge for WorldMog, a 1v1 battle game.
Two players compete to replicate a famous soccer celebration.
You will receive frames from both players, labeled with their IDs.

After each frame, output EXACTLY two lines:
SCORES: {"<player1_id>": <score 0.0-10.0>, "<player2_id>": <score 0.0-10.0>}
COMMENTARY: <One short, exciting sentence>

Scoring criteria:
- Pose accuracy compared to the reference celebration
- Energy and enthusiasm
- Style and confidence

Start scores around 3-4 and adjust based on effort. Scores should change
gradually — small increments up or down based on what you see.
Be an entertaining sports announcer — short, punchy, fun.
Examples: "Player A is NAILING that pose!", "More energy needed!", "What a battle!"
"""


class GeminiLiveSession:
    def __init__(
        self,
        room_id: str,
        player_ids: list[str],
        celebration_name: str,
        broadcast_cb: Callable[[str, dict], Awaitable[None]],
    ) -> None:
        self.room_id = room_id
        self.player_ids = player_ids
        self.celebration_name = celebration_name
        self._broadcast = broadcast_cb
        self._ctx = None
        self._session = None
        self._receive_task: asyncio.Task | None = None
        self._active = False
        self._last_frame_time: dict[str, float] = {pid: 0.0 for pid in player_ids}

    async def start(self, reference_image_b64: str) -> None:
        try:
            client = genai.Client(api_key=settings.gemini_api_key)

            config = types.LiveConnectConfig(
                response_modalities=["TEXT"],
                system_instruction=types.Content(
                    parts=[types.Part.from_text(SYSTEM_PROMPT)],
                ),
                temperature=0.7,
            )

            self._ctx = client.aio.live.connect(
                model=settings.gemini_live_model,
                config=config,
            )
            self._session = await self._ctx.__aenter__()
            self._active = True

            # Send reference image and context as the first turn
            parts: list[types.Part] = [
                types.Part.from_text(
                    f"Celebration battle: '{self.celebration_name}'. "
                    f"Players: {self.player_ids[0]} vs {self.player_ids[1]}. "
                    f"Reference image of the target celebration:"
                ),
            ]

            if reference_image_b64:
                raw = strip_data_url_prefix(reference_image_b64)
                if raw:
                    parts.append(types.Part.from_bytes(
                        data=base64.b64decode(raw),
                        mime_type="image/jpeg",
                    ))

            parts.append(types.Part.from_text(
                "I will now send frames from each player. "
                "Respond with SCORES and COMMENTARY after each frame."
            ))

            await self._session.send_client_content(
                turns=types.Content(role="user", parts=parts),
                turn_complete=True,
            )

            self._receive_task = asyncio.create_task(self._receive_loop())
            logger.info("Gemini Live session started for room %s", self.room_id)

        except Exception:
            logger.exception("Failed to start Gemini Live for room %s", self.room_id)
            self._active = False

    async def send_frame(self, player_id: str, frame_b64: str) -> None:
        if not self._active or not self._session:
            return

        now = time.monotonic()
        if now - self._last_frame_time.get(player_id, 0) < 1.5:
            return
        self._last_frame_time[player_id] = now

        try:
            raw = strip_data_url_prefix(frame_b64)
            frame_bytes = base64.b64decode(raw)

            await self._session.send_client_content(
                turns=types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(f"[Frame from {player_id}]"),
                        types.Part.from_bytes(data=frame_bytes, mime_type="image/jpeg"),
                    ],
                ),
                turn_complete=True,
            )
        except Exception:
            logger.warning("Failed to send frame to Gemini Live for room %s", self.room_id)

    async def _receive_loop(self) -> None:
        try:
            buffer = ""
            async for msg in self._session.receive():
                if not self._active:
                    break

                if msg.text:
                    buffer += msg.text

                if msg.server_content and msg.server_content.turn_complete:
                    await self._parse_and_broadcast(buffer)
                    buffer = ""

        except asyncio.CancelledError:
            pass
        except Exception:
            logger.exception("Gemini Live receive loop error for room %s", self.room_id)
        finally:
            self._active = False

    async def _parse_and_broadcast(self, text: str) -> None:
        for line in text.strip().split("\n"):
            line = line.strip()

            if line.startswith("SCORES:"):
                try:
                    scores = json.loads(line[len("SCORES:"):].strip())
                    if isinstance(scores, dict):
                        await self._broadcast(self.room_id, {
                            "type": "live_scores",
                            "scores": {k: round(float(v), 1) for k, v in scores.items()},
                        })
                except (json.JSONDecodeError, ValueError):
                    logger.debug("Unparseable live scores: %s", line)

            elif line.startswith("COMMENTARY:"):
                comment = line[len("COMMENTARY:"):].strip()
                if comment:
                    await self._broadcast(self.room_id, {
                        "type": "commentary",
                        "text": comment,
                    })

    async def stop(self) -> None:
        self._active = False
        if self._receive_task and not self._receive_task.done():
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
        if self._ctx:
            try:
                await self._ctx.__aexit__(None, None, None)
            except Exception:
                pass
            self._ctx = None
            self._session = None
        logger.info("Gemini Live session stopped for room %s", self.room_id)


# ---------------------------------------------------------------------------
# Module-level session manager
# ---------------------------------------------------------------------------

_active_sessions: dict[str, GeminiLiveSession] = {}


async def start_live_session(
    room_id: str,
    player_ids: list[str],
    celebration_name: str,
    reference_image_b64: str,
    broadcast_cb: Callable[[str, dict], Awaitable[None]],
) -> None:
    session = GeminiLiveSession(room_id, player_ids, celebration_name, broadcast_cb)
    _active_sessions[room_id] = session
    await session.start(reference_image_b64)


async def forward_frame(room_id: str, player_id: str, frame_b64: str) -> None:
    session = _active_sessions.get(room_id)
    if session:
        await session.send_frame(player_id, frame_b64)


async def stop_live_session(room_id: str) -> None:
    session = _active_sessions.pop(room_id, None)
    if session:
        await session.stop()
