import base64
import json
import logging

from google import genai
from google.genai import types

from app.core.config import settings
from app.models.scoring import JudgeScore
from app.utils.images import pick_key_frames, strip_data_url_prefix

logger = logging.getLogger(__name__)

gemini_client = genai.Client(
    vertexai=True,
    project=settings.google_cloud_project,
    location=settings.google_cloud_location,
)


def _text(t: str) -> types.Part:
    return types.Part(text=t)


def _image(b64: str) -> types.Part:
    return types.Part(inline_data=types.Blob(
        data=base64.b64decode(b64),
        mime_type="image/jpeg",
    ))


async def score_with_gemini_batch(
    player_frames: list[str],
    reference_image_data_url: str,
    celebration_name: str,
) -> JudgeScore:
    """Score style and energy using Gemini multimodal batch call."""
    frames = pick_key_frames(player_frames, count=3)

    if not frames:
        return JudgeScore(score=5.0, feedback="No frames captured.")

    try:
        parts: list[types.Part] = [
            _text(
                f"You are the most CHAOTIC and HILARIOUS celebration judge the world has ever seen. "
                f"The player is trying to replicate the '{celebration_name}' celebration. "
                f"Score their STYLE, ENERGY, and EXPRESSIVENESS (not just pose accuracy). "
                f"Your feedback MUST be 1-2 sentences max and absolutely UNHINGED. "
                f"Use gen-z slang, meme references, and internet humor. "
                f"If they brought the energy, go FERAL with praise (\"actual slay, this person doesn't celebrate goals they DEVOUR them\"). "
                f"If they were mid, destroy them (\"bro celebrated like they just found out their flight got delayed\", \"this has the energy of a linkedin post\"). "
                f"Always mention the specific celebration ('{celebration_name}') they attempted. Be devastating but funny, not cruel. "
                f'Return ONLY valid JSON: {{"score": <number 0-10>, "feedback": "<one sentence>"}}'
            ),
            _text("Reference celebration:"),
        ]

        ref_b64 = strip_data_url_prefix(reference_image_data_url)
        if ref_b64:
            parts.append(_image(ref_b64))

        parts.append(_text("Player's performance frames:"))

        for frame in frames:
            parts.append(_image(strip_data_url_prefix(frame)))

        parts.append(_text("Score their style and energy. Return JSON only."))

        response = gemini_client.models.generate_content(
            model=settings.gemini_batch_model,
            contents=types.Content(parts=parts, role="user"),
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=2048,
            ),
        )

        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

        return JudgeScore.model_validate(json.loads(raw))

    except (json.JSONDecodeError, Exception) as exc:
        logger.exception("Gemini scoring failed: %s", exc)
        return JudgeScore(score=5.0, feedback="Gemini scoring unavailable; used fallback.")
