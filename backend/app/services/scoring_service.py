import asyncio
import logging
import os

from app.core.config import settings
from app.models.game import Room
from app.models.scoring import BattleResult, JudgeScore, PlayerScore
from app.services.gmi_scoring import score_with_gmi
from app.services.gemini_scoring import score_with_gemini_batch
from app.utils.images import load_reference_image_as_data_url

logger = logging.getLogger(__name__)

# Path to frontend public dir where reference images are stored
CELEBRATIONS_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "celebrations"
)


def aggregate_score(gmi_score: float, gemini_score: float) -> float:
    return round((0.65 * gmi_score) + (0.35 * gemini_score), 1)


async def score_room(room: Room) -> dict:
    """Score both players and return a results message dict."""
    celebration = room.celebration
    celebration_name = celebration.get("name", "Unknown")

    # Try to load reference image
    ref_image_filename = celebration.get("id", "") + "-ref.jpg"
    ref_image_path = os.path.join(CELEBRATIONS_DIR, ref_image_filename)
    ref_image_data_url = load_reference_image_as_data_url(ref_image_path)

    # If no reference image, use a placeholder prompt
    if not ref_image_data_url:
        ref_image_data_url = "data:image/jpeg;base64,/9j/4AAQSkZJRg=="  # tiny placeholder
        logger.warning("No reference image found at %s", ref_image_path)

    # Choose style scorer: RocketRide pipeline or direct Gemini
    if settings.scoring_backend == "rocketride":
        from app.services.rocketride_scoring import score_with_rocketride
        style_scorer = score_with_rocketride
        logger.info("Using RocketRide pipeline for style scoring")
    else:
        style_scorer = score_with_gemini_batch

    async def score_player(player_id: str) -> tuple[str, PlayerScore]:
        frames = room.frames.get(player_id, [])

        if not frames:
            return player_id, PlayerScore(
                final=5.0,
                gmi=JudgeScore(score=5.0, feedback="No frames captured."),
                gemini=JudgeScore(score=5.0, feedback="No frames captured."),
            )

        gmi_result, gemini_result = await asyncio.gather(
            score_with_gmi(frames, ref_image_data_url, celebration_name),
            style_scorer(frames, ref_image_data_url, celebration_name),
        )

        final = aggregate_score(gmi_result.score, gemini_result.score)

        return player_id, PlayerScore(
            final=final,
            gmi=gmi_result,
            gemini=gemini_result,
        )

    scored = await asyncio.gather(
        *[score_player(p.player_id) for p in room.players]
    )

    scores = dict(scored)
    winner_id = max(scores, key=lambda pid: scores[pid].final)

    result = BattleResult(winner_id=winner_id, scores=scores)
    return result.model_dump(by_alias=True)
