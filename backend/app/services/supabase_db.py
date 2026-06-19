"""
app/services/supabase_db.py
─────────────────────────────────────────────────────────────────────────────
Supabase PostgREST 클라이언트 (httpx 사용 — 추가 패키지 불필요).

user_figures 테이블 CRUD:
  upsert_figure()   — 생성 시작 시 레코드 생성, 완료 시 갱신
  get_figure()      — generation_id 로 단건 조회
  list_figures()    — user_id 기준 목록 조회
  delete_figure()   — 삭제

SQL 스키마 (Supabase SQL Editor 에서 실행):
  CREATE TABLE IF NOT EXISTS user_figures (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        TEXT NOT NULL,
    generation_id  TEXT NOT NULL UNIQUE,
    status         TEXT NOT NULL DEFAULT 'queued',
    model_url      TEXT,
    thumbnail_url  TEXT,
    prompt         TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS user_figures_user_id_idx ON user_figures(user_id);
  ALTER TABLE user_figures ENABLE ROW LEVEL SECURITY;
  -- 백엔드는 service_role key 로 RLS 우회하므로 별도 정책 불필요
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


# ── 내부 헬퍼 ─────────────────────────────────────────────────────────────────

def _enabled() -> bool:
    """Supabase URL + Key 가 모두 설정되어 있는지 확인."""
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY)


def _headers() -> dict[str, str]:
    return {
        "apikey":        settings.SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",   # 변경 후 레코드 반환
    }


def _base() -> str:
    # /rest/v1 이 이미 포함된 경우 중복 방지
    url = settings.SUPABASE_URL.rstrip("/")
    if url.endswith("/rest/v1"):
        return f"{url}/user_figures"
    return f"{url}/rest/v1/user_figures"


# ── 공개 함수 ─────────────────────────────────────────────────────────────────

async def upsert_figure(
    *,
    user_id: str,
    generation_id: str,
    status: str,
    prompt: str = "",
    model_url: str | None = None,
    thumbnail_url: str | None = None,
) -> dict[str, Any] | None:
    """
    user_figures 레코드를 INSERT(없으면) 또는 UPDATE(있으면).
    generation_id 를 충돌 키로 사용합니다.

    Returns
    -------
    dict  저장된 레코드 | None (Supabase 미설정 시)
    """
    if not _enabled():
        logger.debug("[Supabase] URL/KEY 미설정 — DB 저장 건너뜀")
        return None

    payload: dict[str, Any] = {
        "user_id":       user_id,
        "generation_id": generation_id,
        "status":        status,
        "prompt":        prompt,
        "updated_at":    "now()",
    }
    if model_url is not None:
        payload["model_url"] = model_url
    if thumbnail_url is not None:
        payload["thumbnail_url"] = thumbnail_url

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                _base(),
                headers={
                    **_headers(),
                    "Prefer": "return=representation,resolution=merge-duplicates",
                },
                json=payload,
                params={"on_conflict": "generation_id"},
            )

        if resp.is_error:
            logger.error("[Supabase] upsert 실패 — %s %s", resp.status_code, resp.text)
            return None

        rows = resp.json()
        logger.info("[Supabase] upsert 완료 — generation_id=%s status=%s", generation_id, status)
        return rows[0] if rows else None

    except Exception as exc:
        logger.exception("[Supabase] upsert 예외 — %s", exc)
        return None


async def get_figure(generation_id: str) -> dict[str, Any] | None:
    """generation_id 로 단건 조회."""
    if not _enabled():
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                _base(),
                headers=_headers(),
                params={"generation_id": f"eq.{generation_id}", "limit": "1"},
            )
        rows = resp.json() if not resp.is_error else []
        return rows[0] if rows else None
    except Exception as exc:
        logger.exception("[Supabase] get_figure 예외 — %s", exc)
        return None


async def list_figures(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """user_id 의 작업 목록을 최신순으로 반환."""
    if not _enabled():
        return []
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                _base(),
                headers={**_headers(), "Prefer": "count=exact"},
                params={
                    "user_id": f"eq.{user_id}",
                    "order":   "created_at.desc",
                    "limit":   str(limit),
                    "offset":  str(offset),
                },
            )
        return resp.json() if not resp.is_error else []
    except Exception as exc:
        logger.exception("[Supabase] list_figures 예외 — %s", exc)
        return []


async def delete_figure(generation_id: str) -> None:
    """generation_id 로 레코드 삭제."""
    if not _enabled():
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.delete(
                _base(),
                headers=_headers(),
                params={"generation_id": f"eq.{generation_id}"},
            )
        logger.info("[Supabase] 삭제 완료 — generation_id=%s", generation_id)
    except Exception as exc:
        logger.exception("[Supabase] delete_figure 예외 — %s", exc)
