"""
app/api/v1/listings.py
─────────────────────────────────────────────────────────────────────────────
피규어 매물 데이터 API 라우터.

엔드포인트:
  GET /api/v1/characters           — 캐릭터 목록 + 매물 수
  GET /api/v1/listings             — 매물 목록 (필터/정렬)
  GET /api/v1/listings/chart       — 일별 시세 집계 (Recharts 형식)
  GET /api/v1/listings/stats       — KPI 통계 요약
  GET /api/v1/listings/honey       — 꿀매물 전용 (honey_score 내림차순)
  GET /api/v1/listings/stream      — SSE: 크롤러 업데이트 실시간 푸시
"""
from __future__ import annotations

import asyncio
import json as json_lib
from typing import Annotated, AsyncGenerator, Literal, Optional

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse

from app.api.v1.auth import get_current_user, _fetch_jwks, _find_key
from app.models.user import UserOut
from jose import JWTError, jwk, jwt
from app.services import listing_service

router = APIRouter(tags=["listings"])


# ── 캐릭터 목록 ───────────────────────────────────────────────────────────────
@router.get("/characters", summary="캐릭터 목록")
async def list_characters(
    _: UserOut = Depends(get_current_user),
) -> list[dict]:
    return listing_service.get_characters()


# ── 매물 목록 ─────────────────────────────────────────────────────────────────
@router.get("/listings", summary="매물 목록 (필터/정렬)")
async def list_listings(
    character: Annotated[Optional[str], Query(description="캐릭터 이름")] = None,
    platform: Annotated[
        Optional[Literal["bunjang", "joongna", "daangn"]],
        Query(description="플랫폼 필터"),
    ] = None,
    sort: Annotated[
        Literal["latest", "price_asc", "price_desc", "honey"],
        Query(description="정렬 기준"),
    ] = "latest",
    limit:  Annotated[int, Query(ge=1, le=200)] = 80,
    offset: Annotated[int, Query(ge=0)]         = 0,
    _: UserOut = Depends(get_current_user),
) -> list[dict]:
    return listing_service.get_listings(
        character=character or None,
        platform=platform or None,
        sort=sort,
        limit=limit,
        offset=offset,
    )


# ── 시세 차트 ─────────────────────────────────────────────────────────────────
@router.get(
    "/listings/chart",
    summary="일별 시세 집계 (Recharts 형식)",
    description="date / avg_price / min_price / max_price / price_band / ma_7 / ma_30 / listing_count 포함",
)
async def get_chart(
    character: Annotated[Optional[str], Query()] = None,
    _: UserOut = Depends(get_current_user),
) -> list[dict]:
    return listing_service.get_chart_data(character=character or None)


# ── KPI 통계 ─────────────────────────────────────────────────────────────────
@router.get("/listings/stats", summary="대시보드 KPI 통계")
async def get_stats(
    character: Annotated[Optional[str], Query()] = None,
    _: UserOut = Depends(get_current_user),
) -> dict:
    return listing_service.get_stats(character=character or None)


# ── 꿀매물 전용 ───────────────────────────────────────────────────────────────
@router.get("/listings/honey", summary="꿀매물 목록 (honey_score 내림차순)")
async def list_honey(
    character: Annotated[Optional[str], Query()] = None,
    limit:     Annotated[int, Query(ge=1, le=50)] = 20,
    _: UserOut = Depends(get_current_user),
) -> list[dict]:
    return listing_service.get_listings(
        character=character or None,
        sort="honey",
        limit=limit,
    )


# ── SSE: 실시간 크롤러 업데이트 스트림 ────────────────────────────────────────
@router.get(
    "/listings/stream",
    summary="크롤러 업데이트 SSE 스트림",
    description=(
        "크롤러가 JSON 파일을 새로 저장할 때마다 `update` 이벤트를 전송합니다. "
        "EventSource는 Authorization 헤더를 지원하지 않으므로 "
        "JWT 토큰을 `token` 쿼리 파라미터로 전달합니다."
    ),
    include_in_schema=True,
)
async def stream_updates(
    request: Request,
    token:   Annotated[str, Query(description="JWT access token")] = "",
) -> StreamingResponse:
    # ── 토큰 검증 (JWKS 공개키로 JWT 서명 직접 검증) ────────────────────────
    # EventSource는 Authorization 헤더 불가 → query param 으로 토큰 전달
    async def _unauth():
        yield "event: error\ndata: unauthorized\n\n"

    if not token:
        return StreamingResponse(_unauth(), media_type="text/event-stream", status_code=401)

    try:
        header  = jwt.get_unverified_header(token)
        kid     = header.get("kid")
        alg     = header.get("alg", "ES256")
        keys    = await _fetch_jwks()
        raw_key = _find_key(keys, kid)
        pub_key = jwk.construct(raw_key, algorithm=alg)
        jwt.decode(token, pub_key, algorithms=[alg, "ES256", "RS256"], audience="authenticated")
    except JWTError:
        return StreamingResponse(_unauth(), media_type="text/event-stream", status_code=401)
    except Exception:
        return StreamingResponse(_unauth(), media_type="text/event-stream", status_code=503)

    # ── SSE 제너레이터 ────────────────────────────────────────────────────────
    async def _generator() -> AsyncGenerator[str, None]:
        prev_mtime = listing_service.get_json_mtime()

        # 연결 확인 이벤트
        yield f"event: connected\ndata: {json_lib.dumps({'type': 'connected'})}\n\n"

        while True:
            # 클라이언트 연결 끊김 감지
            if await request.is_disconnected():
                break

            cur_mtime = listing_service.get_json_mtime()
            if cur_mtime != prev_mtime:
                prev_mtime = cur_mtime
                # 최신 통계를 함께 전달
                stats = listing_service.get_stats()
                payload = json_lib.dumps({
                    "type":    "update",
                    "total":   stats["total"],
                    "on_sale": stats["on_sale"],
                    "honey":   stats["honey"],
                })
                yield f"event: update\ndata: {payload}\n\n"

            # 3초마다 mtime 확인 (과부하 방지)
            await asyncio.sleep(3)

        # 연결 종료 시 keepalive 루프도 정리됨

    return StreamingResponse(
        _generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache, no-transform",
            "X-Accel-Buffering": "no",       # nginx 버퍼링 비활성화
            "Connection":        "keep-alive",
        },
    )
