import json
import logging

from openai import AsyncOpenAI
from pydantic import ValidationError

from app.core.config import settings
from app.models.scoring import JudgeScore
from app.utils.images import pick_key_frames

logger = logging.getLogger(__name__)

client = AsyncOpenAI(
    api_key=settings.gmi_api_key,
    base_url="https://api.gmi-serving.com/v1",
)


async def score_with_gmi(
    player_frames: list[str],
    reference_image_data_url: str,
    celebration_name: str,
) -> JudgeScore:
    """Score physical accuracy with a GMI vision-language model."""
    frames = pick_key_frames(player_frames, count=3)

    if not frames:
        return JudgeScore(score=5.0, feedback="No frames captured.")

    try:
        response = await client.chat.completions.create(
            model=settings.gmi_vision_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are the most UNHINGED soccer celebration judge on the internet. "
                        "Compare the player's body position, arm placement, and stance "
                        "against the reference celebration image. "
                        "Score strictly on physical accuracy of the pose. "
                        "Your feedback MUST be 1-2 sentences max and absolutely HILARIOUS. "
                        "Use gen-z slang, internet humor, and meme references. "
                        "If they nailed it, go full hype beast mode (\"this person was BORN to celebrate goals, actual main character energy\"). "
                        "If they flopped, ROAST them mercilessly (\"bro stood there like a mannequin at Zara\", \"giving NPC energy fr fr\"). "
                        "Always reference the specific celebration they were attempting. "
                        "Be funny, not mean-spirited — think sports roast, not bullying. "
                        'Return ONLY valid JSON: {"score": <number 0-10>, "feedback": "<one sentence>"}'
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"Reference celebration: {celebration_name}"},
                        {"type": "image_url", "image_url": {"url": reference_image_data_url}},
                        {"type": "text", "text": "Player's performance frames:"},
                        *[{"type": "image_url", "image_url": {"url": frame}} for frame in frames],
                        {"type": "text", "text": "Score the accuracy. Return JSON only."},
                    ],
                },
            ],
            temperature=0.2,
            max_tokens=200,
        )

        raw = response.choices[0].message.content or "{}"
        # Strip markdown code fences if the model wraps the JSON
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

        return JudgeScore.model_validate(json.loads(raw))

    except (json.JSONDecodeError, ValidationError) as exc:
        logger.warning("GMI response parse failed: %s", exc)
        return JudgeScore(score=5.0, feedback="Scoring response was invalid; used fallback.")
    except Exception as exc:
        logger.exception("GMI API call failed: %s", exc)
        return JudgeScore(score=5.0, feedback="GMI API error; used fallback.")
