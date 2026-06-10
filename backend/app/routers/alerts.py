# -*- coding: utf-8 -*-
"""GET /alerts?limit=20 — أعلى الحقول درجةً (🔴 أولاً) مشتقة حيّاً من الحقول.

تُشتق من بيانات الحقول في الذاكرة (لا من alerts.json مباشرة) حتى تعكس
أي تحديث حالة (PATCH) فوراً — alerts.json يبقى مرجع شكل العنصر.
"""

from fastapi import APIRouter, Query

from ..store import get_store

router = APIRouter(tags=["alerts"])


def _alert_from(feature: dict, rank: int) -> dict:
    """تحويل Feature إلى عنصر تنبيه بنفس شكل alerts.json."""
    p = feature["properties"]
    return {
        "id": p["id"],
        "rank": rank,
        "score": p.get("score"),
        "tier": p.get("tier"),
        "area_ha": p.get("area_ha"),
        "first_seen_year": p.get("first_seen_year"),
        "flag": p.get("flag"),
        "est_m3_low": p.get("est_m3_low"),
        "est_m3_high": p.get("est_m3_high"),
        "status": p.get("status"),
        "centroid": p.get("centroid"),
    }


@router.get("/alerts")
def list_alerts(limit: int = Query(20, ge=1, description="عدد التنبيهات (افتراضي 20)")):
    """أعلى الحقول درجة مرتبة تنازلياً."""
    store = get_store()
    features = sorted(
        store.docs["fields"]["features"],
        key=lambda f: (-f["properties"].get("score", 0), f["properties"]["id"]),
    )[:limit]
    return {
        "alerts": [_alert_from(f, i + 1) for i, f in enumerate(features)],
        "is_demo": True,
    }
