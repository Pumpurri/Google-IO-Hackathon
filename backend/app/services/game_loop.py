import asyncio
import logging
import os

from app.models.game import RoomPhase
from app.services.gemini_live_service import start_live_session, stop_live_session
from app.utils.images import load_reference_image_as_data_url

logger = logging.getLogger(__name__)

CELEBRATIONS_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "celebrations"
)


async def run_room_game(room_id: str, matchmaker, score_fn=None) -> None:
    """Run one round: countdown → perform → judging → results."""
    try:
        await _run_room_game_inner(room_id, matchmaker, score_fn)
    except Exception:
        logger.exception("Game loop crashed for room %s — sending mock results", room_id)
        room = matchmaker.rooms.get(room_id)
        if room:
            await _send_mock_results(room, matchmaker)


async def _run_room_game_inner(room_id: str, matchmaker, score_fn=None) -> None:
    room = matchmaker.rooms.get(room_id)
    if not room:
        return

    # Get Ready — let players study the celebration
    room.phase = RoomPhase.COUNTDOWN
    await matchmaker.broadcast(room, {"type": "countdown", "seconds": -1, "label": "STUDY THE MOVE"})
    await asyncio.sleep(10)

    # Countdown ticks from server
    for n in range(5, 0, -1):
        await matchmaker.broadcast(room, {"type": "countdown", "seconds": n})
        await asyncio.sleep(1)
    await matchmaker.broadcast(room, {"type": "countdown", "seconds": 0, "label": "GO!"})
    await asyncio.sleep(0.6)

    # Performance window
    room.phase = RoomPhase.PERFORMING
    await matchmaker.broadcast(room, {"type": "perform", "durationSeconds": 15})

    # Start Gemini Live for real-time scoring
    try:
        celebration = room.celebration
        ref_path = os.path.join(CELEBRATIONS_DIR, celebration.get("id", "") + "-ref.jpg")
        ref_b64 = load_reference_image_as_data_url(ref_path)

        async def broadcast_live(rid: str, payload: dict) -> None:
            r = matchmaker.rooms.get(rid)
            if r:
                await matchmaker.broadcast(r, payload)

        await start_live_session(
            room_id=room_id,
            player_ids=[p.player_id for p in room.players],
            player_names={p.player_id: p.name or p.player_id for p in room.players},
            celebration_name=celebration.get("name", "Unknown"),
            reference_image_b64=ref_b64,
            broadcast_cb=broadcast_live,
        )
    except Exception:
        logger.exception("Gemini Live start failed for room %s — continuing without live scores", room_id)

    await asyncio.sleep(15)

    # Stop live commentary — timeout to prevent blocking if WebSocket hangs
    try:
        await asyncio.wait_for(stop_live_session(room_id), timeout=3.0)
    except asyncio.TimeoutError:
        logger.warning("Gemini Live stop timed out for room %s — continuing", room_id)
    except Exception:
        logger.warning("Gemini Live stop failed for room %s", room_id)

    room.phase = RoomPhase.JUDGING
    await matchmaker.broadcast(room, {"type": "judging", "stage": "analyzing"})
    await asyncio.sleep(1.5)
    await matchmaker.broadcast(room, {"type": "judging", "stage": "comparing"})
    await asyncio.sleep(1.5)
    await matchmaker.broadcast(room, {"type": "judging", "stage": "deliberating"})

    # Score (runs during the deliberating stage) — timeout to prevent hang
    if score_fn:
        try:
            result = await asyncio.wait_for(score_fn(room), timeout=30.0)
            room.phase = RoomPhase.RESULTS
            await matchmaker.broadcast(room, result)
        except asyncio.TimeoutError:
            logger.warning("Scoring timed out for room %s — using mock", room_id)
            await _send_mock_results(room, matchmaker)
        except Exception:
            logger.exception("Scoring failed for room %s", room_id)
            await _send_mock_results(room, matchmaker)
    else:
        await _send_mock_results(room, matchmaker)


async def _send_mock_results(room, matchmaker) -> None:
    """Send placeholder results when scoring is unavailable."""
    import random
    p1, p2 = room.players
    s1 = round(random.uniform(4.0, 9.0), 1)
    s2 = round(random.uniform(4.0, 9.0), 1)
    room.phase = RoomPhase.RESULTS
    await matchmaker.broadcast(room, {
        "type": "results",
        "winnerId": p1.player_id if s1 >= s2 else p2.player_id,
        "scores": {
            p1.player_id: {
                "final": s1,
                "gmi": {"score": s1, "feedback": "Mock score"},
                "gemini": {"score": s1, "feedback": "Mock score"},
            },
            p2.player_id: {
                "final": s2,
                "gmi": {"score": s2, "feedback": "Mock score"},
                "gemini": {"score": s2, "feedback": "Mock score"},
            },
        },
    })
