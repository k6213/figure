"""
app/api/v1/user_figures.py
─────────────────────────────────────────────────────────────────────────────
user_figures 테이블 REST API.

엔드포인트:
  GET    /api/v1/user-figures              — 내 저장 목록
  GET    /api/v1/user-figures/{gen_id}     — 단건 조회
  DELETE /api/v1/user-figures/{gen_id}     — 삭제
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.v1.auth import get_current_user
from app.models.user import UserOut
from app.services import supabase_db

router = APIRouter(prefix="/user-figures", tags=["User Figures"])


@router.get("", summary="내 3D 작업 목록 (DB 저장분)")
async def list_my_figures(
    limit: int = 20,
    offset: int = 0,
    user: UserOut = Depends(get_current_user),
) -> list[dict[str, Any]]:
    return await supabase_db.list_figures(user.id, limit=limit, offset=offset)


@router.get("/{generation_id}", summary="단건 조회")
async def get_my_figure(
    generation_id: str,
    user: UserOut = Depends(get_current_user),
) -> dict[str, Any]:
    row = await supabase_db.get_figure(generation_id)
    if not row:
        raise HTTPException(status_code=404, detail="레코드를 찾을 수 없습니다.")
    if row["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")
    return row


@router.delete("/{generation_id}", summary="삭제")
async def delete_my_figure(
    generation_id: str,
    user: UserOut = Depends(get_current_user),
) -> dict[str, str]:
    row = await supabase_db.get_figure(generation_id)
    if row and row.get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")
    await supabase_db.delete_figure(generation_id)
    return {"deleted": generation_id}
