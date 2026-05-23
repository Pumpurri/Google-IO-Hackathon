from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str = ""
    gmi_api_key: str = ""
    gmi_vision_model: str = "openai/gpt-4o"
    gemini_batch_model: str = "gemini-2.5-flash"
    gemini_live_model: str = "models/gemini-3.1-flash-live-preview"
    scoring_backend: str = "direct"  # "direct" or "rocketride"
    allowed_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
