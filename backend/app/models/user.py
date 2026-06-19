from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id:         str
    email:      EmailStr
    nickname:   str
    provider:   str = "email"
    created_at: Optional[str] = None

    model_config = {"from_attributes": True}
