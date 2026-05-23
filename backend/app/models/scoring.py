from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class JudgeScore(BaseModel):
    score: float = Field(ge=0, le=10)
    feedback: str = Field(min_length=1, max_length=500)


class PlayerScore(BaseModel):
    final: float = Field(ge=0, le=10)
    gmi: JudgeScore
    gemini: JudgeScore


class BattleResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    message_type: Literal["results"] = Field(default="results", alias="type")
    winner_id: str = Field(alias="winnerId")
    scores: dict[str, PlayerScore]
