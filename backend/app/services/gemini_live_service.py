from __future__ import annotations

import asyncio
import base64
import json
import logging
import re
import time
from collections.abc import Awaitable, Callable

from google import genai
from google.genai import types

from app.core.config import settings
from app.utils.images import strip_data_url_prefix

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are a real-time celebration judge and sports commentator for WorldMog, a 1v1 battle game.
Two players compete to replicate a famous soccer celebration. You can see their camera feeds.

You MUST follow this exact output format every time you speak. Say exactly two lines:
SCORES: player1_id colon score, player2_id colon score
Then give a short exciting commentary sentence.

Example: "SCORES: P1A2B3 colon 6.5, P4C5D6 colon 7.0. Player two is absolutely nailing that pose!"

Scoring criteria: pose accuracy, energy, enthusiasm, style, confidence.
Start scores around 3 to 4 and adjust gradually based on effort.
Be an entertaining sports announcer — short, punchy, fun.
Keep commentary to ONE sentence max. React to what you see in real time.
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
        self._session = None
        self._ctx = None
        self._tasks: list[asyncio.Task] = []
        self._active = False
        self._frame_queue: asyncio.Queue = asyncio.Queue()
        self._last_frame_time: dict[str, float] = {pid: 0.0 for pid in player_ids}

    async def start(self, reference_image_b64: str) -> None:
        try:
            client = genai.Client(api_key=settings.gemini_api_key)

            config = types.LiveConnectConfig(
                response_modalities=[types.Modality.AUDIO],
                output_audio_transcription=types.AudioTranscriptionConfig(),
                system_instruction=types.Content(
                    parts=[types.Part(text=SYSTEM_PROMPT)],
                ),
                realtime_input_config=types.RealtimeInputConfig(
                    turn_coverage="TURN_INCLUDES_ONLY_ACTIVITY",
                ),
            )

            self._ctx = client.aio.live.connect(
                model=settings.gemini_live_model,
                config=config,
            )
            self._session = await self._ctx.__aenter__()
            self._active = True

            # Send initial context as text
            setup_text = (
                f"This is a 1v1 celebration battle. The celebration to replicate is: {self.celebration_name}. "
                f"The two player IDs are: {self.player_ids[0]} and {self.player_ids[1]}. "
                f"I will now stream their camera feeds. Judge them in real time. "
                f"Remember to always say SCORES with both player IDs and their scores, then commentary."
            )
            await self._session.send_client_content(
                turns=types.Content(role="user", parts=[types.Part(text=setup_text)]),
                turn_complete=True,
            )

            # Send reference image if available
            if reference_image_b64:
                raw = strip_data_url_prefix(reference_image_b64)
                if raw:
                    await self._session.send_realtime_input(
                        video=types.Blob(
                            data=base64.b64decode(raw),
                            mime_type="image/jpeg",
                        )
                    )

            # Start background tasks
            self._tasks.append(asyncio.create_task(self._send_frames_loop()))
            self._tasks.append(asyncio.create_task(self._receive_loop()))
            logger.info("Gemini Live session started for room %s", self.room_id)

        except Exception:
            logger.exception("Failed to start Gemini Live for room %s", self.room_id)
            self._active = False

    async def send_frame(self, player_id: str, frame_b64: str) -> None:
        if not self._active:
            return

        now = time.monotonic()
        if now - self._last_frame_time.get(player_id, 0) < 1.5:
            return
        self._last_frame_time[player_id] = now

        await self._frame_queue.put(frame_b64)

    async def _send_frames_loop(self) -> None:
        try:
            while self._active:
                frame_b64 = await self._frame_queue.get()
                if not self._active:
                    break
                try:
                    raw = strip_data_url_prefix(frame_b64)
                    frame_bytes = base64.b64decode(raw)
                    await self._session.send_realtime_input(
                        video=types.Blob(data=frame_bytes, mime_type="image/jpeg")
                    )
                except Exception:
                    logger.warning("Failed to send frame to Gemini Live for room %s", self.room_id)
        except asyncio.CancelledError:
            pass

    async def _receive_loop(self) -> None:
        try:
            async for msg in self._session.receive():
                if not self._active:
                    break

                server_content = msg.server_content
                if not server_content:
                    continue

                # Forward audio chunks to players for live commentary voice
                if server_content.model_turn:
                    for part in server_content.model_turn.parts:
                        if part.inline_data and part.inline_data.data:
                            audio_b64 = base64.b64encode(part.inline_data.data).decode("ascii")
                            await self._broadcast(self.room_id, {
                                "type": "commentary_audio",
                                "data": audio_b64,
                            })

                # Get text from output transcription (audio → text)
                if server_content.output_transcription and server_content.output_transcription.text:
                    text = server_content.output_transcription.text.strip()
                    if text:
                        await self._parse_and_broadcast(text)

        except asyncio.CancelledError:
            pass
        except Exception:
            logger.exception("Gemini Live receive loop error for room %s", self.room_id)
        finally:
            self._active = False

    async def _parse_and_broadcast(self, text: str) -> None:
        # Try to extract scores: look for patterns like "P1A2B3 colon 6.5" or "P1A2B3: 6.5"
        scores: dict[str, float] = {}
        for pid in self.player_ids:
            # Match "PLAYERID colon X.X" or "PLAYERID: X.X" or "PLAYERID X.X"
            pattern = rf'{re.escape(pid)}\s*(?:colon|:)?\s*(\d+(?:\.\d+)?)'
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    score = min(10.0, max(0.0, float(match.group(1))))
                    scores[pid] = round(score, 1)
                except ValueError:
                    pass

        if len(scores) == 2:
            await self._broadcast(self.room_id, {
                "type": "live_scores",
                "scores": scores,
            })

        # Extract commentary — anything after the scores line, or the whole text if no scores
        commentary = text
        # Remove the SCORES portion if present
        commentary = re.sub(r'SCORES?\s*:?.*?(?:\d+(?:\.\d+)?)\s*[,.]?\s*', '', commentary, count=1)
        commentary = commentary.strip().strip('.')
        if not commentary:
            commentary = text

        # Only broadcast if it's meaningful (not just score numbers)
        if commentary and len(commentary) > 5:
            await self._broadcast(self.room_id, {
                "type": "commentary",
                "text": commentary,
            })

    async def stop(self) -> None:
        self._active = False
        for task in self._tasks:
            if not task.done():
                task.cancel()
        for task in self._tasks:
            try:
                await task
            except asyncio.CancelledError:
                pass
        self._tasks.clear()
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
