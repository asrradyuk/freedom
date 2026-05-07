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


settings = Settings()