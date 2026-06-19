"""
app/api/v1/generate3d.py
─────────────────────────────────────────────────────────────────────────────
Meshy AI 기반 사진 → 3D 모델(.glb) 생성 API.

엔드포인트:
  POST /api/v1/generate3d/upload-and-start  — 이미지 업로드 + 생성 시작
  GET  /api/v1/generate3d/{id}/status       — 특정 작업 상태 조회
  GET  /api/v1/generate3d/{id}/poll         — 완료될 때까지 블로킹 대기
  GET  /api/v1/generate3d                   — 내 작업 목록
  DELETE /api/v1/generate3d/{id}            — 작업 삭제 (Meshy 미지원, 목록에서만 제거)
"""
from __future__ import annotations

import logging
import uuid
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse

from app.api.v1.auth import get_current_user
from app.core.config import settings
from app.models.user import UserOut
from app.services import meshy3d, supabase_db, supabase_storage

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

_ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}
_MIME = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/generate3d", tags=["3D Generation"])


# ── 응답 스키마 ───────────────────────────────────────────────────────────────

class GenerationResponse:
    pass


# ── 엔드포인트 ────────────────────────────────────────────────────────────────

@router.post(
    "/upload-and-start",
    summary="이미지 업로드 후 3D 모델 생성 시작",
)
async def upload_and_start(
    file: UploadFile = File(...),
    user: UserOut = Depends(get_current_user),
) -> dict[str, Any]:
    # 확장자 검증
    suffix = Path(file.filename or "").suffix.lower() or ".jpg"
    if suffix not in _ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 파일 형식: {_ALLOWED_EXT}")

    # 파일 읽기
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="파일 크기가 20MB를 초과합니다.")

    # Supabase Storage에 업로드 → 공개 URL 획득
    unique_name  = f"{uuid.uuid4().hex}{suffix}"
    content_type = _MIME.get(suffix, "image/jpeg")
    public_url   = await supabase_storage.upload_image(content, unique_name, content_type)
    logger.info("[upload-and-start] Supabase Storage 업로드 완료 → %s", public_url)

    # Meshy AI 작업 등록
    data    = await meshy3d.create_task(image_url=public_url)
    task_id = data["id"]
    status  = data["state"]

    # Supabase 저장
    await supabase_db.upsert_figure(
        user_id=user.id,
        generation_id=task_id,
        status=status,
        prompt="image-to-3d",
        thumbnail_url=public_url,
    )

    return {
        "generation_id": task_id,
        "status":        status,
        "message":       f"3D 모델 생성 시작. 이미지: {unique_name}",
    }


@router.get("/proxy-glb", summary="Meshy CDN GLB 프록시 (CORS 우회)")
async def proxy_glb(url: str) -> StreamingResponse:
    """
    브라우저는 assets.meshy.ai CORS 정책으로 직접 GLB 요청 불가.
    이 엔드포인트가 서버 사이드에서 GLB를 스트리밍으로 중계합니다.

    인증 불필요 이유:
      Meshy URL 자체가 CloudFront 서명 URL (Expires + Signature + Key-Pair-Id 포함)
      → URL을 알아야만 접근 가능하며 만료 시 자동 무효화됨
    """
    if not url.startswith("https://assets.meshy.ai/"):
        raise HTTPException(status_code=400, detail="허용되지 않는 URL입니다.")

    async def _stream():
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            async with client.stream("GET", url) as resp:
                if resp.is_error:
                    logger.error("[proxy-glb] Meshy CDN 오류 %s", resp.status_code)
                    raise HTTPException(status_code=resp.status_code, detail="GLB 파일을 가져올 수 없습니다.")
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    yield chunk

    return StreamingResponse(
        _stream(),
        media_type="model/gltf-binary",
        headers={"Content-Disposition": 'attachment; filename="model.glb"'},
    )


@router.get("/{generation_id}/status", summary="작업 상태 조회")
async def get_status(
    generation_id: str,
    background_tasks: BackgroundTasks,
    user: UserOut = Depends(get_current_user),
) -> dict[str, Any]:
    data   = await meshy3d.get_task(generation_id)
    status = data["state"]
    assets = data.get("assets")

    if status in ("completed", "failed"):
        background_tasks.add_task(
            supabase_db.upsert_figure,
            user_id=user.id,
            generation_id=generation_id,
            status=status,
            model_url=(assets or {}).get("model"),      # glb URL
            thumbnail_url=(assets or {}).get("image"),
        )

    return {
        "generation_id": generation_id,
        "status":        status,
        "progress":      data.get("progress", 0),
        "assets":        assets,
    }


@router.get("/{generation_id}/poll", summary="완료까지 대기 (최대 10분)")
async def poll_generation(
    generation_id: str,
    _: UserOut = Depends(get_current_user),
) -> dict[str, Any]:
    data = await meshy3d.poll_until_done(generation_id)
    return {
        "generation_id": generation_id,
        "status":        data["state"],
        "assets":        data.get("assets"),
        "message":       "3D 모델 생성 완료!",
    }


@router.get("", summary="내 작업 목록")
async def list_my_generations(
    limit:  int = 20,
    offset: int = 0,
    _: UserOut = Depends(get_current_user),
) -> dict[str, Any]:
    page_num  = (offset // limit) + 1
    page_size = limit
    return await meshy3d.list_tasks(page_num=page_num, page_size=page_size)


@router.delete("/{generation_id}", summary="작업 삭제")
async def delete_generation(
    generation_id: str,
    user: UserOut = Depends(get_current_user),
) -> dict[str, str]:
    # Meshy는 삭제 API 미제공 → Supabase에서만 제거
    try:
        await supabase_db.delete_figure(generation_id)
    except Exception:
        pass
    return {"deleted": generation_id}
