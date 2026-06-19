from __future__ import annotations
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# 항상 이 파일 기준으로 .env 위치를 절대 경로로 지정 (CWD 무관)
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), extra="ignore", case_sensitive=False)

    APP_ENV:  str  = "development"
    DEBUG:    bool = True

    # JWT
    SECRET_KEY:                  str = "dev-secret-please-change"
    ALGORITHM:                   str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Frontend origin — used to build OAuth redirect_uri
    # Must match what is registered in each provider's console
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # OAuth 키 (.env 에서 주입)
    NAVER_CLIENT_ID:      str = ""
    NAVER_CLIENT_SECRET:  str = ""
    KAKAO_CLIENT_ID:      str = ""
    GOOGLE_CLIENT_ID:     str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Meshy AI – https://www.meshy.ai/api
    MESHY_API_KEY: str = ""

    # Supabase – https://supabase.com/dashboard/project/{ref}/settings/api
    SUPABASE_URL:         str = ""   # e.g. https://xxxx.supabase.co
    SUPABASE_SERVICE_KEY: str = ""   # service_role key (RLS 우회)

    # 업로드된 이미지를 외부(Luma)에서 접근할 수 있는 서버 공개 URL
    # 로컬 개발: ngrok 등으로 터널링 후 입력 (e.g. https://xxxx.ngrok.io)
    # 프로덕션: 실제 도메인 (e.g. https://api.herofig.com)
    BACKEND_PUBLIC_URL: str = "http://localhost:8000"

    # DB / Redis (선택)
    DATABASE_URL: str = ""
    REDIS_URL:    str = "redis://localhost:6379/0"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
