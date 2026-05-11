from typing import Any

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
    ADMIN_IDS: list[int] = []
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 50

    @classmethod
    def _parse_admin_ids(cls, v: Any) -> list[int]:
        if isinstance(v, list):
            return v
        if isinstance(v, str) and v.strip():
            return [int(x.strip()) for x in v.split(",") if x.strip()]
        return []

    def model_post_init(self, __context: Any) -> None:
        if isinstance(self.ADMIN_IDS, str):
            object.__setattr__(
                self,
                "ADMIN_IDS",
                self._parse_admin_ids(self.ADMIN_IDS),
            )


settings = Settings()