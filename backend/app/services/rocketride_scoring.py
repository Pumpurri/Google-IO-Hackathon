import json
import logging
import os

from app.models.scoring import JudgeScore
from app.utils.images import pick_key_frames

logger = logging.getLogger(__name__)

_client = None
_token: str | None = None

PIPELINE_PATH = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "pipeline", "scoring.pipe")
)


async def _ensure_pipeline() -> tuple:
    global _client, _token
    if _client is not None and _token is not None:
        return _client, _token

    from rocketride import RocketRideClient

    _client = RocketRideClient()
    await _client.connect()
    result = await _client.use(filepath=PIPELINE_PATH, use_existing=True)
    _token = result["token"]
    logger.info("RocketRide scoring pipeline started, token=%s", _token)
    return _client, _token


async def score_with_rocketride(
    player_frames: list[str],
    reference_image_data_url: str,
    celebration_name: str,
) -> JudgeScore:
    """Score style/energy via RocketRide pipeline (Gemini-backed)."""
    try:
        from rocketride.schema import Question

        client, token = await _ensure_pipeline()
        frames = pick_key_frames(player_frames, count=3)

        question = Question(expectJson=True)
        question.addQuestion(
            f"Score this player's performance of the '{celebration_name}' "
            "soccer celebration. Rate style, energy, and expressiveness 0-10. "
            'Return JSON: {{"score": <number>, "feedback": "<one sentence>"}}'
        )
        question.addInstruction(
            "Scoring criteria",
            "Evaluate energy, expressiveness, body commitment, and overall style. "
            "Your feedback MUST be 1-2 sentences max and absolutely HILARIOUS. "
            "Use gen-z slang, internet humor, and meme references. "
            "If they killed it, go full hype beast (\"actual legend behavior, this person doesn't celebrate they TRANSCEND\"). "
            "If they flopped, ROAST them (\"bro moved like a loading screen\", \"giving mannequin-at-Zara energy\"). "
            f"Always reference the specific celebration ('{celebration_name}') they attempted. "
            "Be devastatingly funny, not mean-spirited. 7+ means great performance.",
        )
        question.addExample(
            "Player does Ronaldo SIUU with full jump and arm pull",
            {"score": 8.5, "feedback": "The SIUU was so crispy Ronaldo himself would shed a single tear — absolute main character energy."},
        )
        question.addContext(
            {
                "celebration": celebration_name,
                "num_frames": len(frames),
                "reference_provided": bool(reference_image_data_url),
            }
        )

        response = await client.chat(token=token, question=question)

        answers = response.get("answers", [])
        if not answers:
            logger.warning("RocketRide returned no answers")
            return JudgeScore(score=5.0, feedback="RocketRide pipeline returned no answers.")

        answer = answers[0]
        if isinstance(answer, str):
            answer = json.loads(answer)

        return JudgeScore.model_validate(answer)

    except Exception:
        logger.exception("RocketRide scoring failed, using fallback")
        return JudgeScore(score=5.0, feedback="RocketRide scoring unavailable; neutral fallback.")
