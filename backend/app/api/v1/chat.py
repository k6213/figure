"""
app/api/v1/chat.py
실시간 채팅 서버 — python-socketio AsyncServer (ASGI 모드)

이벤트 규격
───────────────────────────────────────────────────────────────────────────
  C→S  chat:send     { text: str }
  S→C  chat:message  Message
  S→C  chat:history  Message[]        (접속 직후 히스토리 전송)
  S→C  chat:users    int              (전체 접속자 수 갱신)

Message = {
    id        : str  (UUID-4)
    nickname  : str
    text      : str
    timestamp : str  (ISO-8601 UTC)
    type      : "user" | "system"
}
───────────────────────────────────────────────────────────────────────────
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import socketio

from app.core.config import settings

# ── AsyncServer (ASGI 모드) ────────────────────────────────────────────────────
sio = socketio.AsyncServer(
    async_mode="asgi",
    # Vite proxy rewrites the Origin header, so we delegate CORS to the FastAPI
    # middleware and allow all origins here. Restrict in production.
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

# ── 인메모리 상태 ─────────────────────────────────────────────────────────────
_history: list[dict] = []       # 최근 MAX_HISTORY 개 메시지
_users:   dict[str, str] = {}   # sid → nickname
_anon_seq: int = 0

MAX_HISTORY = 100   # 인메모리 보존 한도
MAX_TEXT    = 300   # 메시지 최대 길이


# ── 헬퍼 ─────────────────────────────────────────────────────────────────────
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _next_anon() -> str:
    global _anon_seq
    _anon_seq += 1
    return f"익명의 덕후 {_anon_seq}"


def _unique_nick(base: str) -> str:
    """동일 닉네임이 이미 있으면 '닉네임 (2)' 형식으로 변환."""
    existing = set(_users.values())
    if base not in existing:
        return base
    idx = 2
    while f"{base} ({idx})" in existing:
        idx += 1
    return f"{base} ({idx})"


def _system_msg(text: str) -> dict:
    return {
        "id":        str(uuid.uuid4()),
        "nickname":  "SYSTEM",
        "text":      text,
        "timestamp": _now(),
        "type":      "system",
    }


def _push(msg: dict) -> None:
    _history.append(msg)
    if len(_history) > MAX_HISTORY:
        _history.pop(0)


# ── 연결 이벤트 ───────────────────────────────────────────────────────────────
@sio.event
async def connect(sid: str, environ: dict, auth: dict | None = None) -> None:
    """
    클라이언트 접속.
    auth 딕셔너리에서 nickname 을 추출하거나 익명 번호를 부여한다.
    """
    raw = ((auth or {}).get("nickname") or "").strip()[:30]
    nickname = _unique_nick(raw) if raw else _next_anon()
    _users[sid] = nickname

    # 1) 이 클라이언트에게만 히스토리 전송
    await sio.emit("chat:history", _history[-MAX_HISTORY:], to=sid)

    # 2) 모든 클라이언트에게 접속자 수 갱신
    await sio.emit("chat:users", len(_users))

    # 3) 입장 알림 브로드캐스트
    msg = _system_msg(f"{nickname}님이 입장했습니다.")
    _push(msg)
    await sio.emit("chat:message", msg)


@sio.event
async def disconnect(sid: str) -> None:
    nickname = _users.pop(sid, "알 수 없음")
    await sio.emit("chat:users", len(_users))

    msg = _system_msg(f"{nickname}님이 퇴장했습니다.")
    _push(msg)
    await sio.emit("chat:message", msg)


# ── 메시지 수신 ───────────────────────────────────────────────────────────────
@sio.on("chat:send")
async def handle_send(sid: str, data: Any) -> None:
    if not isinstance(data, dict):
        return

    text = str(data.get("text", "")).strip()[:MAX_TEXT]
    if not text:
        return

    msg: dict = {
        "id":        str(uuid.uuid4()),
        "nickname":  _users.get(sid, "알 수 없음"),
        "text":      text,
        "timestamp": _now(),
        "type":      "user",
    }
    _push(msg)
    await sio.emit("chat:message", msg)
