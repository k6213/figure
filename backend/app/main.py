"""
app/main.py
FastAPI + Socket.IO 애플리케이션 진입점.

⚠️  실행 커맨드 변경됨  ⚠️
  기존:  uvicorn app.main:app         --reload --port 8000
  변경:  uvicorn app.main:socket_app  --reload --port 8000

Socket.IO ASGI 래퍼(socket_app)가 WebSocket 핸드셰이크를 처리하고
나머지 HTTP 요청은 기존 FastAPI app 으로 그대로 위임한다.
"""
from pathlib import Path

import socketio as _sio_lib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import auth, listings, generate3d, user_figures
from app.api.v1.chat import sio          # ← Socket.IO AsyncServer 인스턴스
from app.core.config import settings

# 업로드 디렉터리 생성
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# ── FastAPI 앱 ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="HeroFig API",
    description="피규어 시세 분석 대시보드 백엔드 API",
    version="0.1.0",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 라우터 ────────────────────────────────────────────────────────────────────
app.include_router(auth.router,           prefix="/api/v1")
app.include_router(listings.router,       prefix="/api/v1")
app.include_router(generate3d.router,     prefix="/api/v1")
app.include_router(user_figures.router,   prefix="/api/v1")

# 업로드 파일을 공개 URL 로 서빙 (/uploads/파일명 으로 접근)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/health", tags=["system"])
async def health() -> dict:
    return {"status": "ok", "env": settings.APP_ENV}


# ── Socket.IO ASGI 래핑 ───────────────────────────────────────────────────────
# socket_app 이 WebSocket(/socket.io) 을 처리하고, 그 외 요청은 app 에 위임한다.
# uvicorn 실행 대상을 반드시 socket_app 으로 변경할 것.
socket_app = _sio_lib.ASGIApp(sio, app)
