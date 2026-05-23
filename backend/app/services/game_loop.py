import asyncio
import logging

from app.models.game import RoomPhase

logger = logging.getLogger(__name__)


async def run_room_game(room_id: str, matchmaker, score_fn=None) -> None:
    """Run one round: countdown → perform → judging → results."""
    room = matchmaker.rooms.get(room_id)
    if not room:
        return

    # Countdown
    room.phase = RoomPhase.COUNTDOWN
    await matchmaker.broadcast(room, {"type": "countdown", "seconds": 3})
    await asyncio.sleep(3)

    # Performance window
    room.phase = RoomPhase.PERFORMING
    await matchmaker.broadcast(room, {"type": "perform", "durationSeconds": 5})
    await asyncio.sleep(5)

    # Judging
    room.phase = RoomPhase.JUDGING
    await matchmaker.broadcast(room, {"type": "judging"})

    # Score
    if score_fn:
        try:
            result = await score_fn(room)
            room.phase = RoomPhase.RESULTS
            await matchmaker.broadcast(room, result)
        except Exception:
            logger.exception("Scoring failed for room %s", room_id)
            # Send mock results so the demo doesn't freeze
            await _send_mock_results(room, matchmaker)
    else:
        # No scoring service yet — send mock results
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
