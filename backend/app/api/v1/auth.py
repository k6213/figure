"""
app/api/v1/auth.py
─────────────────────────────────────────────────────────────────────────────
인증 API 라우터.

인증 백엔드: Supabase Auth (Google OAuth + Email OTP)
  - 모든 보호 엔드포인트는 Supabase access_token 을 Bearer 토큰으로 받는다.
  - get_current_user 가 Supabase JWKS 공개키로 JWT 서명을 직접 검증한다.
    → /auth/v1/user 방식(세션 DB 조회)을 사용하지 않으므로
      session_not_found 오류가 발생하지 않는다.

엔드포인트:
  GET  /api/v1/auth/me  — 현재 유저 정보 (토큰 검증)
"""
from __future__ import annotations

import logging
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt

from app.core.config import settings
from app.models.user import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)

# ── JWKS 인메모리 캐시 (프로세스 수명 동안 유지) ──────────────────────────────
_jwks_keys: list[dict] | None = None


async def _fetch_jwks() -> list[dict]:
    """Supabase JWKS 엔드포인트에서 공개키 목록을 가져온다."""
    global _jwks_keys
    if _jwks_keys is not None:
        return _jwks_keys

    url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(url)
        resp.raise_for_status()
        _jwks_keys = resp.json().get("keys", [])
        logger.info("[auth] JWKS 로드 완료 (%d 개 키)", len(_jwks_keys))
        return _jwks_keys
    except Exception as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            f"JWKS 가져오기 실패: {exc}",
        )


def _find_key(keys: list[dict], kid: str | None) -> dict:
    """kid 가 일치하는 키를 반환. 키가 하나뿐이면 kid 무시."""
    if kid:
        for k in keys:
            if k.get("kid") == kid:
                return k
    if keys:
        return keys[0]
    raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "JWKS 키 없음")


# ── 의존성: Supabase JWT 서명 검증 → 현재 유저 추출 ──────────────────────────
async def get_current_user(
    cred: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> UserOut:
    """
    Supabase JWKS 공개키로 JWT 서명을 직접 검증한다.
    세션 DB 조회를 하지 않으므로 session_not_found 오류가 없다.
    """
    if not cred:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    token = cred.credentials

    try:
        header  = jwt.get_unverified_header(token)
        kid     = header.get("kid")
        alg     = header.get("alg", "ES256")

        keys    = await _fetch_jwks()
        raw_key = _find_key(keys, kid)
        pub_key = jwk.construct(raw_key, algorithm=alg)

        payload = jwt.decode(
            token,
            pub_key,
            algorithms=[alg, "ES256", "RS256"],
            audience="authenticated",
            options={"verify_aud": True},
        )
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {exc}")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Token validation failed: {exc}")

    meta     = payload.get("user_metadata") or {}
    app_meta = payload.get("app_metadata")  or {}

    return UserOut(
        id=payload["sub"],
        email=payload.get("email", ""),
        nickname=(
            meta.get("full_name")
            or meta.get("name")
            or (payload.get("email") or "").split("@")[0]
            or "User"
        ),
        provider=app_meta.get("provider", "email"),
    )


# ── 현재 유저 조회 ────────────────────────────────────────────────────────────
@router.get("/me")
async def me(current_user: UserOut = Depends(get_current_user)) -> UserOut:
    return current_user
