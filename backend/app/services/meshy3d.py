"""
app/services/meshy3d.py
─────────────────────────────────────────────────────────────────────────────
Meshy AI Image-to-3D API 클라이언트.

공식 문서: https://docs.meshy.ai/en/api/image-to-3d
API Base:  https://api.meshy.ai/openapi/v1

워크플로우
──────────
1. create_task()     — 이미지 URL → task_id 반환 (즉시)
2. get_task()        — 상태 조회 (PENDING → IN_PROGRESS → SUCCEEDED | FAILED)
3. poll_until_done() — 완료될 때까지 폴링

상태 매핑
─────────
PENDING     → queued
IN_PROGRESS → dreaming
SUCCEEDED   → completed
FAILED      → failed
CANCELED    → failed
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx
from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)

_BASE_URL  = "https://api.meshy.ai/openapi/v1"  # 공식 최신 엔드포인트
_POLL_SEC  = 5
_TIMEOUT_S = 600  # 최대 10분


def _headers() -> dict[str, str]:
    if not settings.MESHY_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="MESHY_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.",
        )
    return {
        "Authorization": f"Bearer {settings.MESHY_API_KEY}",
        "Content-Type":  "application/json",
    }


def _raise_for_status(resp: httpx.Response, context: str) -> None:
    if resp.is_error:
        try:
            detail = resp.json()
        except Exception:
            detail = resp.text
        logger.error("[Meshy AI] %s — %s %s", context, resp.status_code, detail)
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Meshy AI 오류({context}): {detail}",
        )


def _normalize_status(meshy_status: str) -> str:
    """Meshy 상태값 → 내부 상태값"""
    return {
        "PENDING":     "queued",
        "IN_PROGRESS": "dreaming",
        "SUCCEEDED":   "completed",
        "FAILED":      "failed",
        "CANCELED":    "failed",   # 문서 정식 상태값
        "EXPIRED":     "failed",   # 구 API 호환
    }.get(meshy_status.upper(), "queued")


async def create_task(
    image_url: str,
    *,
    ai_model:          str   = "meshy-6",   # 최신·최고품질 모델
    should_texture:    bool  = True,
    enable_pbr:        bool  = True,        # 메탈릭/러프니스/노멀 맵 (PBR)
    hd_texture:        bool  = True,        # 4K 해상도 텍스처 (고화질)
    should_remesh:     bool  = True,        # 리메시 → 균일하고 매끄러운 메시
    topology:          str   = "quad",      # "quad" 가 더 부드럽고 아름다운 외형
    target_polycount:  int   = 300_000,     # 300k 폴리곤 (Meshy 최대값, 최고 디테일)
    image_enhancement: bool  = True,        # 입력 이미지 자동 최적화
    remove_lighting:   bool  = True,        # 베이크된 조명 제거 → PBR 정확도 향상
    symmetry_mode:     str   = "auto",      # 대칭 감지 자동
    texture_prompt:    str   = (
        # 울트라 무광 피규어 질감 유도 프롬프트
        # 핵심: ultra-matte + zero specular + clay-like + high roughness map
        "ultra-matte finish collectible figure, "
        "zero specular reflection, zero gloss, zero sheen, "
        "soft-touch PVC vinyl texture, clay-like surface feel, "
        "high roughness map, pure diffuse-only Lambertian shading, "
        "flat even base color with no highlights baked in, "
        "no baked lighting no shadows in albedo texture, "
        "vivid opaque paint, clean color boundaries, "
        "PBR roughness 1.0 metalness 0.0 specular 0.0, "
        "commercial matte-coated vinyl toy quality"
    ),
    target_formats:    list[str] | None = None,
) -> dict[str, Any]:
    """
    Meshy AI에 고품질 Image-to-3D 작업을 등록합니다.

    최적 파라미터 요약 (상업용 피규어 품질)
    ────────────────────────────────────────
    ai_model="meshy-6"        : 최신 모델, 가장 높은 기하학적 정확도
    hd_texture=True           : 4K 텍스처 (기본 1K 대비 16배 해상도)
    should_remesh=True        : 리메시 → 균일한 폴리곤 분포, 매끄러운 표면
    topology="quad"           : 쿼드 메시 (트라이앵글보다 곡면 표현 우수)
    target_polycount=300_000  : 최대 폴리곤 수 → 세밀한 디테일
    enable_pbr=True           : roughness/metalness/normal 맵 3종 세트 생성
    remove_lighting=True      : 입력 사진의 음영 제거 → PBR 재질 정확도 향상
    image_enhancement=True    : 입력 이미지 품질 자동 보정
    texture_prompt            : "roughness 0.2 metalness 0.0" 명시 → 플라스틱 PBR 유도
    """
    if target_formats is None:
        target_formats = ["glb"]

    payload: dict[str, Any] = {
        "image_url":          image_url,
        "ai_model":           ai_model,
        "should_texture":     should_texture,
        "enable_pbr":         enable_pbr,
        "hd_texture":         hd_texture,
        "should_remesh":      should_remesh,
        "topology":           topology,
        "target_polycount":   target_polycount,
        "image_enhancement":  image_enhancement,
        "remove_lighting":    remove_lighting,
        "symmetry_mode":      symmetry_mode,
        "texture_prompt":     texture_prompt,
        "target_formats":     target_formats,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{_BASE_URL}/image-to-3d",
            headers=_headers(),
            json=payload,
        )

    _raise_for_status(resp, "create_task")
    data = resp.json()
    task_id = data.get("result")
    logger.info("[Meshy AI] 작업 등록 — task_id=%s model=%s", task_id, ai_model)
    return {"id": task_id, "state": "queued", "raw": data}


async def get_task(task_id: str) -> dict[str, Any]:
    """
    task_id의 현재 상태를 조회합니다.

    Returns
    -------
    dict  id, state, assets(glb_url/thumbnail_url), progress(0~100) 포함
    """
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{_BASE_URL}/image-to-3d/{task_id}",
            headers=_headers(),
        )

    _raise_for_status(resp, "get_task")
    raw = resp.json()

    meshy_status = raw.get("status", "PENDING")
    state        = _normalize_status(meshy_status)
    model_urls   = raw.get("model_urls") or {}
    glb_url      = model_urls.get("glb")
    thumb_url    = raw.get("thumbnail_url")
    progress     = raw.get("progress", 0)

    return {
        "id":             task_id,
        "state":          state,
        "assets":         {"model": glb_url, "image": thumb_url} if glb_url else None,
        "progress":       progress,
        "failure_reason": raw.get("task_error", {}).get("message") if state == "failed" else None,
        "raw":            raw,
    }


async def list_tasks(
    page_num:  int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    """내 계정의 Image-to-3D 작업 목록을 조회합니다."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{_BASE_URL}/image-to-3d",
            headers=_headers(),
            params={"pageNum": page_num, "pageSize": page_size},
        )

    _raise_for_status(resp, "list_tasks")
    raw = resp.json()

    tasks = raw if isinstance(raw, list) else raw.get("data", [])
    generations = []
    for t in tasks:
        state      = _normalize_status(t.get("status", "PENDING"))
        model_urls = t.get("model_urls") or {}
        glb_url    = model_urls.get("glb")
        thumb_url  = t.get("thumbnail_url")
        generations.append({
            "id":         t.get("id"),
            "state":      state,
            "assets":     {"model": glb_url, "image": thumb_url} if glb_url else None,
            "progress":   t.get("progress", 0),
            "created_at": t.get("created_at"),
        })

    return {
        "has_more":    False,
        "count":       len(generations),
        "limit":       page_size,
        "offset":      (page_num - 1) * page_size,
        "generations": generations,
    }


async def poll_until_done(
    task_id: str,
    *,
    poll_interval: float = _POLL_SEC,
    timeout:       float = _TIMEOUT_S,
) -> dict[str, Any]:
    """task_id가 SUCCEEDED 또는 FAILED 될 때까지 폴링합니다."""
    elapsed = 0.0
    while elapsed < timeout:
        data  = await get_task(task_id)
        state = data["state"]

        logger.debug("[Meshy AI] 폴링 — id=%s state=%s progress=%s%%",
                     task_id, state, data.get("progress"))

        if state == "completed":
            logger.info("[Meshy AI] 완료 — id=%s glb=%s",
                        task_id, (data.get("assets") or {}).get("video"))
            return data

        if state == "failed":
            reason = data.get("failure_reason") or "알 수 없는 오류"
            logger.error("[Meshy AI] 실패 — id=%s reason=%s", task_id, reason)
            raise HTTPException(status_code=422, detail=f"Meshy AI 생성 실패: {reason}")

        await asyncio.sleep(poll_interval)
        elapsed += poll_interval

    raise HTTPException(
        status_code=504,
        detail=f"Meshy AI 타임아웃 — {timeout}초 초과 (id={task_id})",
    )
