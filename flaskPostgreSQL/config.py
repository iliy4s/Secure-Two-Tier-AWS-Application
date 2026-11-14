import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_NAME = os.getenv("DB_NAME", "flask_crud_db")

    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")

    SECRET_KEY = os.getenv("SECRET_KEY")

    FLASK_DEBUG = os.getenv(
        "FLASK_DEBUG", "False"
    ).lower() in ("true", "1", "t")

    HOST = os.getenv("HOST", "127.0.0.1")
    PORT = int(os.getenv("PORT", "5050"))

    @classmethod
    def validate(cls):
        required = ["DB_USER", "DB_PASSWORD"]

        missing = [
            name for name in required
            if not getattr(cls, name)
        ]

        if missing:
            raise RuntimeError(
                f"Missing required environment variables: {', '.join(missing)}"
            )