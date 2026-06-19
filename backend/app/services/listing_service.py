"""
app/services/listing_service.py
─────────────────────────────────────────────────────────────────────────────
mha_figures_all_platforms.json 을 읽어 API 응답 형식으로 가공합니다.

DB 없이 JSON 파일만으로 대시보드가 동작합니다.
DB 연결 후에는 RAW_LISTINGS 테이블을 우선 조회하도록 확장 가능합니다.
"""
from __future__ import annotations

import json
import logging
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.services.condition_extractor import get_condition_tags, mock_crawled_at

logger = logging.getLogger(__name__)

# JSON 파일 위치 (backend/ 기준 상위 디렉토리에 있다고 가정)
_JSON_CANDIDATES = [
    Path(__file__).parents[3] / "mha_figures_all_platforms.json",
    Path(__file__).parents[4] / "mha_figures_all_platforms.json",
    Path("mha_figures_all_platforms.json"),
]

SORT_MAP = {
    "latest":     (lambda x: x.get("crawled_at") or "", True),
    "price_asc":  (lambda x: x.get("price") or 0, False),
    "price_desc": (lambda x: x.get("price") or 0, True),
    "honey":      (lambda x: x.get("honey_score") or 0, True),
}


# ── mtime 기반 자동 갱신 캐시 ─────────────────────────────────────────────────
class _JsonCache:
    """
    JSON 파일의 수정 시각(mtime)을 감시합니다.
    크롤러가 파일을 새로 저장하면 다음 요청 시 자동으로 다시 읽습니다.
    """
    def __init__(self) -> None:
        self._lock:  threading.Lock          = threading.Lock()
        self._data:  dict[str, list[dict]]   = {}
        self._mtime: float                   = 0.0
        self._path:  Path | None             = None

    def _find_path(self) -> Path | None:
        if self._path and self._path.exists():
            return self._path
        for p in _JSON_CANDIDATES:
            if p.exists():
                self._path = p
                return p
        return None

    def get(self) -> dict[str, list[dict]]:
        path = self._find_path()
        if not path:
            return {}
        mtime = path.stat().st_mtime
        with self._lock:
            if mtime != self._mtime:
                try:
                    self._data  = json.loads(path.read_text(encoding="utf-8"))
                    self._mtime = mtime
                    logger.info(f"[cache] JSON 재로드: {path.name} (mtime 변경)")
                except Exception as e:
                    logger.error(f"[cache] JSON 로드 실패: {e}")
        return self._data

    def mtime(self) -> float:
        """마지막으로 감지된 JSON 파일의 mtime을 반환합니다."""
        path = self._find_path()
        return path.stat().st_mtime if path else 0.0


_cache = _JsonCache()


def _load_json() -> dict[str, list[dict]]:
    return _cache.get()


def get_json_mtime() -> float:
    """크롤러 업데이트 감지용 — SSE 스트림에서 사용합니다."""
    return _cache.mtime()


# ── 상태값 정규화 ─────────────────────────────────────────────────────────────
def _norm_status(raw: str) -> str:
    m = {
        "판매중": "on_sale",  "on_sale": "on_sale",  "1": "on_sale",
        "예약중": "reserved", "reserved": "reserved", "2": "reserved",
        "판매완료": "sold",   "sold": "sold",         "3": "sold",
    }
    return m.get(str(raw).strip(), "on_sale")


def _norm_platform(raw: str) -> str:
    m = {
        "번개장터": "bunjang", "bunjang": "bunjang",
        "중고나라":  "joongna", "joongna": "joongna",
        "당근마켓":  "daangn",  "daangn":  "daangn",
    }
    return m.get(str(raw).strip(), (raw or "bunjang").lower())


def _parse_price(raw) -> int:
    if isinstance(raw, (int, float)):
        return int(raw)
    try:
        return int(str(raw).replace(",", "").replace("원", "").strip())
    except (ValueError, AttributeError):
        return 0


def _normalize(item: dict, character_name: str) -> dict:
    """크롤러 원본 dict → API 표준 형식."""
    name     = item.get("name", "").strip()
    price    = _parse_price(item.get("price", 0))
    status   = _norm_status(item.get("status_label", item.get("status", "")))
    platform = _norm_platform(item.get("platform", ""))

    # 수집 시각
    raw_ts = item.get("crawled_at")
    if raw_ts:
        try:
            ts = datetime.fromisoformat(str(raw_ts))
            crawled_at = ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            crawled_at = mock_crawled_at(name, price)
    else:
        crawled_at = mock_crawled_at(name, price)

    # 상품 ID 구성
    pid = (
        item.get("product_id") or
        item.get("platform_pid") or
        (item.get("page_url", "").rstrip("/").split("/")[-1]) or
        str(uuid.uuid4())[:8]
    )

    honey_score   = item.get("honey_score")
    is_honey_deal = bool(honey_score and honey_score >= 15)

    return {
        "id":             f"{platform}_{pid}",
        "name":           name,
        "price":          price,
        "platform":       platform,
        "status":         status,
        "page_url":       item.get("page_url") or item.get("link", ""),
        "image_url":      item.get("image_url") or item.get("image", ""),
        "condition_tags": get_condition_tags(name, price),
        "honey_score":    honey_score,
        "is_honey_deal":  is_honey_deal,
        "character_name": character_name,
        "crawled_at":     crawled_at.isoformat(),
    }


# ── 퍼블릭 서비스 함수 ────────────────────────────────────────────────────────

def get_characters() -> list[dict]:
    """캐릭터 이름 + 매물 수 목록 반환."""
    raw = _load_json()
    return [
        {"name": k, "count": len(v)}
        for k, v in raw.items()
        if k != "기타/미분류"
    ]


def get_listings(
    character: Optional[str] = None,
    platform:  Optional[str] = None,
    sort:      str            = "latest",
    status:    Optional[str] = None,
    limit:     int            = 100,
    offset:    int            = 0,
) -> list[dict]:
    """필터·정렬 조건에 맞는 매물 리스트 반환."""
    raw = _load_json()
    all_items: list[dict] = []

    for char_name, items in raw.items():
        if character and character not in ("all", "") and char_name != character:
            continue
        for item in items:
            all_items.append(_normalize(item, char_name))

    # 플랫폼 필터
    if platform and platform not in ("", "all"):
        all_items = [i for i in all_items if i["platform"] == platform]

    # 판매 상태 필터 (기본: 판매완료 제외)
    if status:
        all_items = [i for i in all_items if i["status"] == status]
    else:
        all_items = [i for i in all_items if i["status"] != "sold"]

    # 중복 제거 (동일 id)
    seen: set[str] = set()
    unique = [i for i in all_items if not (i["id"] in seen or seen.add(i["id"]))]

    # 정렬
    key_fn, reverse = SORT_MAP.get(sort, SORT_MAP["latest"])
    unique.sort(key=key_fn, reverse=reverse)

    return unique[offset: offset + limit]


def get_chart_data(character: Optional[str] = None) -> list[dict]:
    """
    일별 시세 집계 데이터 반환 (Recharts 직결 형식).
    DB 없이 JSON 매물의 crawled_at 을 기준으로 직접 집계합니다.
    """
    listings = get_listings(character=character, limit=10_000, status=None)

    # 날짜별 그룹핑
    by_date: dict[str, list[int]] = {}
    active_by: dict[str, int]     = {}

    for item in listings:
        ts = item.get("crawled_at", "")
        if not ts:
            continue
        dk = ts[:10]   # YYYY-MM-DD
        p  = item.get("price", 0)
        if p > 0:
            by_date.setdefault(dk, []).append(p)
        if item.get("status") == "on_sale":
            active_by[dk] = active_by.get(dk, 0) + 1

    if not by_date:
        return []

    result: list[dict] = []
    prev_avg: Optional[float] = None

    for dk in sorted(by_date):
        prices = by_date[dk]
        avg    = round(sum(prices) / len(prices))
        mn, mx = min(prices), max(prices)
        change = round((avg - prev_avg) / prev_avg * 100, 2) if prev_avg else None

        result.append({
            "date":             dk,
            "avg_price":        avg,
            "min_price":        mn,
            "max_price":        mx,
            "price_band":       [mn, mx],   # Recharts Area range
            "listing_count":    len(prices),
            "active_count":     active_by.get(dk, 0),
            "price_change_pct": change,
            "ma_7":  None,
            "ma_30": None,
        })
        prev_avg = avg

    # 이동평균 계산
    avgs = [r["avg_price"] for r in result]
    for i, row in enumerate(result):
        row["ma_7"]  = _ma(avgs, i, 7)
        row["ma_30"] = _ma(avgs, i, 30)

    return result[-90:]   # 최근 90일


def _ma(vals: list, idx: int, w: int) -> Optional[float]:
    """단순 이동평균."""
    chunk = [v for v in vals[max(0, idx - w + 1): idx + 1] if v]
    return round(sum(chunk) / len(chunk)) if chunk else None


def get_stats(character: Optional[str] = None) -> dict:
    """대시보드 KPI 통계."""
    items  = get_listings(character=character, limit=10_000)
    prices = [i["price"] for i in items if i["price"] > 0]
    return {
        "total":     len(items),
        "on_sale":   sum(1 for i in items if i["status"] == "on_sale"),
        "avg_price": round(sum(prices) / len(prices)) if prices else 0,
        "min_price": min(prices) if prices else 0,
        "max_price": max(prices) if prices else 0,
        "honey":     sum(1 for i in items if i["is_honey_deal"]),
    }
