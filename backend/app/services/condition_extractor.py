"""
app/services/condition_extractor.py
─────────────────────────────────────────────────────────────────────────────
상품명에서 피규어 상태 태그를 추출합니다.

1차: 키워드 사전 매칭
2차: 추출 결과가 없으면 결정론적 목(Mock) 태그 부여
     → hashlib 시드를 사용해 동일 상품은 항상 같은 태그가 나옵니다
"""
from __future__ import annotations

import hashlib
import random
from datetime import datetime, timedelta, timezone
from typing import Optional

# ── 키워드 → 태그 매핑 ────────────────────────────────────────────────────────
KEYWORD_MAP: dict[str, list[str]] = {
    "미개봉":   ["미개봉", "unopened", "未開封", "새것", "미사용"],
    "새상품":   ["새상품", "신품", "정품", "새 상품"],
    "박스없음": ["박스없음", "박스 없음", "노박스", "박스X", "박스없이", "상자없음", "박스미포함"],
    "박스훼손": ["박스훼손", "박스파손", "박스찌그", "박스눌림", "박스구김", "박스손상", "박스 훼손"],
    "이물질":   ["이물질", "먼지", "이물"],
    "오염":     ["오염", "얼룩", "자국", "흔적", "때", "스크래치", "기스", "흠집"],
    "변색":     ["변색", "황변", "탈색", "색 바램", "색변"],
    "파손":     ["파손", "깨짐", "크랙", "crack", "파손있음"],
    "결함":     ["결함", "불량", "하자", "누락", "결품", "부품없음", "부품 없음"],
}

# 표시 우선순위 (심각한 결함 → 상태 좋음 순)
TAG_PRIORITY = ["파손", "결함", "변색", "오염", "이물질", "박스훼손", "박스없음", "미개봉", "새상품"]

# 목 데이터 가중치 (현실적인 중고 거래 분포 반영)
MOCK_WEIGHTS: list[tuple[str, float]] = [
    ("새상품",   0.06),
    ("미개봉",   0.08),
    ("박스없음", 0.20),
    ("박스훼손", 0.14),
    ("오염",     0.10),
    ("이물질",   0.08),
    ("변색",     0.06),
    ("결함",     0.04),
    ("파손",     0.03),
    # 나머지 0.21 = 태그 없음
]


def extract_condition_tags(name: str) -> list[str]:
    """
    상품명에서 상태 태그를 키워드 매칭으로 추출합니다.

    Returns:
        우선순위 정렬된 태그 리스트 (최대 3개)

    Example:
        >>> extract_condition_tags("데쿠 피규어 박스없음 오염있음")
        ['오염', '박스없음']
    """
    if not name:
        return []
    name_l = name.lower()
    found  = {tag for tag, kws in KEYWORD_MAP.items() if any(k.lower() in name_l for k in kws)}
    return [t for t in TAG_PRIORITY if t in found][:3]


def mock_condition_tags(name: str, price: Optional[int] = None) -> list[str]:
    """
    키워드 매칭 실패 시 결정론적 목 태그를 반환합니다.
    동일한 name+price 조합은 항상 동일한 결과를 반환합니다.
    """
    seed = int(hashlib.md5(f"{name}{price or 0}".encode()).hexdigest(), 16) % (2 ** 32)
    rng  = random.Random(seed)
    prob = rng.random()
    tags: list[str] = []

    for tag, w in MOCK_WEIGHTS:
        if prob < w:
            tags.append(tag)
            # 30% 확률로 두 번째 태그 추가 (단, 미개봉/새상품은 단독)
            if tag not in ("미개봉", "새상품") and rng.random() < 0.30:
                others = [t for t, _ in MOCK_WEIGHTS if t not in (tag, "미개봉", "새상품")]
                if others:
                    tags.append(rng.choice(others))
            break
        prob -= w

    return [t for t in TAG_PRIORITY if t in tags]


def get_condition_tags(name: str, price: Optional[int] = None) -> list[str]:
    """
    진입점 함수. 키워드 추출 → 실패 시 목 데이터 순으로 처리합니다.
    """
    real = extract_condition_tags(name)
    return real if real else mock_condition_tags(name, price)


def mock_crawled_at(name: str, price: Optional[int] = None) -> datetime:
    """
    결정론적 목 수집 일시를 생성합니다. 최근 30일 내 임의의 UTC 시각.
    """
    seed = int(hashlib.md5(f"ts:{name}{price or 0}".encode()).hexdigest(), 16) % (2 ** 32)
    rng  = random.Random(seed)
    return datetime.now(timezone.utc) - timedelta(
        days=rng.randint(0, 29),
        hours=rng.randint(0, 23),
        minutes=rng.randint(0, 59),
    )
