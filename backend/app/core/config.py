from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "IntellSpend"
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    OPENROUTER_API_KEY: str = ""          # set in .env
    FRONTEND_URL: str = ""
    class Config:
        env_file = ".env"


settings = Settings()
