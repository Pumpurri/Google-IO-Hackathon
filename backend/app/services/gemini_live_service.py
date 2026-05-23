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
You are the most UNHINGED, CHAOTIC commentator in WorldMog history — a live 1v1 soccer celebration battle!
Two players are competing to replicate a famous celebration. You see their camera feeds.

YOUR JOB: Never stop talking! You're a deranged mix of a sports announcer, a gen-z meme lord, and a reality TV judge who's had way too much coffee.
Talk CONSTANTLY — react to every movement, every pose, every bit of energy you see.
Be ABSOLUTELY HILARIOUS. Use internet slang, meme references, and gen-z humor.

ROASTING is your specialty:
- Bad attempts get DESTROYED: "bro is moving like a sleep paralysis demon", "giving 404-celebration-not-found energy", "this is what happens when you skip celebration practice and watch Netflix instead"
- Good attempts get UNHINGED PRAISE: "OH THEY ATE AND LEFT NO CRUMBS", "this person was literally BORN to do this celebration", "someone call the fire department because that was FIRE"
- Reference the specific celebration they're attempting!

IMPORTANT — you MUST include scores naturally in your commentary. Work them in like a chaotic announcer:
"Player one is sitting at a TRAGIC 3.5 right now — bro that's not even passing, that's a LinkedIn endorsement level effort!"
"I'm bumping player two to an 8.5 because WHAT WAS THAT?! That was absolutely UNREAL!"

Score criteria: pose accuracy, energy, enthusiasm, style, confidence.
Start around 3-4, go up for effort and accuracy, down for standing still or being lazy.
Scores are 0 to 10, use decimals like 6.5 or 7.2.

ALWAYS mention BOTH player scores every few sentences so viewers can track who's winning.
Never be silent! Fill every moment with commentary! You are the main character of this broadcast!
"""


class GeminiLiveSession:
    def __init__(
        self,
        room_id: str,
        player_ids: list[str],
        player_names: dict[str, str],
        celebration_name: str,
        broadcast_cb: Callable[[str, dict], Awaitable[None]],
    ) -> None:
        self.room_id = room_id
        self.player_ids = player_ids
        self.player_names = player_names
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
            client = genai.Client(
                vertexai=True,
                project=settings.google_cloud_project,
                location=settings.google_cloud_location,
            )

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
            name1 = self.player_names.get(self.player_ids[0], self.player_ids[0])
            name2 = self.player_names.get(self.player_ids[1], self.player_ids[1])
            setup_text = (
                f"THE BATTLE IS ON! The celebration they must replicate: {self.celebration_name}! "
                f"Player one is {name1}, player two is {name2}. "
                f"Use their NAMES when commentating — call them {name1} and {name2}! "
                f"Camera feeds are coming in NOW. Start commentating immediately! "
                f"Remember to mention scores for BOTH players by name naturally in your commentary. "
                f"Never stop talking! React to everything! GO GO GO!"
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
        if now - self._last_frame_time.get(player_id, 0) < 0.5:
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
        # Extract scores from natural speech — match by player name or ID
        scores: dict[str, float] = {}
        for pid in self.player_ids:
            name = self.player_names.get(pid, pid)
            # Try matching by name first, then by player ID
            for identifier in [re.escape(name), re.escape(pid)]:
                patterns = [
                    rf'{identifier}\s*(?:is\s+)?(?:at\s+|a\s+|colon\s*|:\s*|,?\s+)(\d+(?:\.\d+)?)',
                    rf'(?:giving|give)\s+{identifier}\s+(?:a\s+)?(\d+(?:\.\d+)?)',
                    rf'{identifier}[^0-9]{{0,30}}?(\d+(?:\.\d+)?)',
                ]
                found = False
                for pattern in patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        try:
                            score = min(10.0, max(0.0, float(match.group(1))))
                            if score > 0:
                                scores[pid] = round(score, 1)
                                found = True
                                break
                        except ValueError:
                            pass
                if found:
                    break

        if len(scores) == 2:
            await self._broadcast(self.room_id, {
                "type": "live_scores",
                "scores": scores,
            })

        # Broadcast ALL text as commentary — this IS the live announcer
        if text and len(text) > 3:
            await self._broadcast(self.room_id, {
                "type": "commentary",
                "text": text,
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
    player_names: dict[str, str],
    celebration_name: str,
    reference_image_b64: str,
    broadcast_cb: Callable[[str, dict], Awaitable[None]],
) -> None:
    session = GeminiLiveSession(room_id, player_ids, player_names, celebration_name, broadcast_cb)
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
