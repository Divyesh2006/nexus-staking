from functools import lru_cache
import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Nexus Staking Excel Generator"
    api_prefix: str = "/api"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    base_dir: Path = Path(__file__).resolve().parents[3]
    upload_dir: Path = base_dir / "uploads"
    generated_dir: Path = base_dir / "generated"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    # If the hosting environment provides an empty CORS_ORIGINS value
    # pydantic-settings will attempt to parse it as JSON and fail.
    # Remove an empty env var so Settings() falls back to the default.
    cors_env = os.environ.get("CORS_ORIGINS")
    if cors_env is not None and cors_env.strip() == "":
        os.environ.pop("CORS_ORIGINS", None)

    settings = Settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.generated_dir.mkdir(parents=True, exist_ok=True)
    return settings
