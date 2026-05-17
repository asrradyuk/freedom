from typing import Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    BOT_TOKEN: str
    BOT_SECRET: str

    LIVEKIT_URL: str
    LIVEKIT_API_KEY: str
    LIVEKIT_API_SECRET: str

    PAYMENT_URL: str = ""
    WEBAPP_URL: str = "https://freedom-ouep.vercel.app"
    YUKASSA_SHOP_ID: str = ""
    YUKASSA_SECRET_KEY: str = ""
    ADMIN_IDS: list[int] = []
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 50

    @field_validator("ADMIN_IDS", mode="before")
    @classmethod
    def parse_admin_ids(cls, v: Any) -> list[int]:
        if isinstance(v, list):
            return [int(x) for x in v]
        if isinstance(v, (int, float)):
            return [int(v)]
        if isinstance(v, str):
            v = v.strip().strip("[]")
            if not v:
                return []
            return [int(x.strip()) for x in v.split(",") if x.strip()]
        return []


settings = Settings()