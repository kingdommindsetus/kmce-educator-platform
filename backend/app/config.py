from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "KMCE Educator Platform"
    database_url: str = "sqlite:///./kmce.db"
    upload_dir: str = "./uploads"
    max_upload_mb: int = 25

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
