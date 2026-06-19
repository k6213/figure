"""
app/services/supabase_storage.py
─────────────────────────────────────────────────────────────────────────────
Supabase Storage 파일 업로드 클라이언트.

이미지를 Supabase Storage(공개 버킷)에 업로드하고
외부에서 접근 가능한 공개 URL을 반환합니다.
"""
from __future__ import annotations

import logging
from pathlib import Path

import httpx
from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)

_BUCKET = "figures"


def _storage_base() -> str:
    url = settings.SUPABASE_URL.rstrip("/")
    # /rest/v1 제거하고 storage URL 구성
    if "/rest/v1" in url:
        url = url.split("/rest/v1")[0]
    return url


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
    }


async def upload_image(file_bytes: bytes, filename: str, content_type: str = "image/jpeg") -> str:
    """
    이미지를 Supabase Storage에 업로드하고 공개 URL을 반환합니다.

    Parameters
    ----------
    file_bytes   : 이미지 바이트
    filename     : 저장할 파일명 (예: uuid.jpg)
    content_type : MIME 타입

    Returns
    -------
    str  공개 접근 가능한 URL
    """
    base = _storage_base()
    upload_url = f"{base}/storage/v1/object/{_BUCKET}/{filename}"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            upload_url,
            headers={**_headers(), "Content-Type": content_type},
            content=file_bytes,
        )

    if resp.is_error:
        logger.error("[Supabase Storage] 업로드 실패 — %s %s", resp.status_code, resp.text)
        raise HTTPException(
            status_code=500,
            detail=f"이미지 업로드 실패: {resp.text}",
        )

    public_url = f"{base}/storage/v1/object/public/{_BUCKET}/{filename}"
    logger.info("[Supabase Storage] 업로드 완료 → %s", public_url)
    return public_url
