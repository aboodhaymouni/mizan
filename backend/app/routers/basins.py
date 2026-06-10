# -*- coding: utf-8 -*-
"""endpoints الأحواض — CONTRACTS §4.

GET /basins                 → GeoJSON بأحواض وخصائص الصحة
GET /basins/{id}/health     → خصائص الحوض + مؤشرات محسوبة من الحقول
GET /basins/{id}/forecast   → محتوى forecast.json (العتبة الحرجة على مناسيب الآبار)
GET /basins/{id}/ledger     → دفتر الميزان (Mass-Balance)
"""

from fastapi import APIRouter, HTTPException

from ..store import get_store

router = APIRouter(prefix="/basins", tags=["basins"])


def _get_basin(basin_id: str) -> dict:
    """يرجع Feature الحوض أو 404."""
    store = get_store()
    for feature in store.docs["basins"]["features"]:
        if feature["properties"]["id"] == basin_id:
            return feature
    raise HTTPException(status_code=404, detail=f"حوض غير موجود: {basin_id}")


@router.get("")
def list_basins():
    """كل الأحواض كـ GeoJSON FeatureCollection (الحدود تقريبية — is_demo_geometry)."""
    return get_store().docs["basins"]


@router.get("/{basin_id}/health")
def basin_health(basin_id: str):
    """خصائص الحوض + مؤشرات الكشف المحسوبة حيّاً من الحقول."""
    store = get_store()
    basin = _get_basin(basin_id)

    # مؤشرات مشتقة من حقول هذا الحوض (تعكس تحديثات الحالة فوراً)
    fields = [
        f["properties"]
        for f in store.docs["fields"]["features"]
        if f["properties"].get("basin_id") == basin_id
    ]
    tier_counts = {"red": 0, "orange": 0, "green": 0}
    status_counts = {"new": 0, "inspected": 0, "confirmed": 0, "cleared": 0}
    for p in fields:
        if p.get("tier") in tier_counts:
            tier_counts[p["tier"]] += 1
        if p.get("status") in status_counts:
            status_counts[p["status"]] += 1

    return {
        **basin["properties"],
        "indicators": {
            "fields_detected": len(fields),
            "total_ha": round(sum(p.get("area_ha", 0) for p in fields), 1),
            "tier_counts": tier_counts,
            "status_counts": status_counts,
            "est_m3_low": sum(p.get("est_m3_low", 0) for p in fields),
            "est_m3_high": sum(p.get("est_m3_high", 0) for p in fields),
        },
        "is_demo": True,
    }


@router.get("/{basin_id}/forecast")
def basin_forecast(basin_id: str):
    """التنبؤ: منحنى Prophet الإقليمي المساند + العتبة الحرجة على مناسيب الآبار."""
    _get_basin(basin_id)  # 404 إن لم يوجد الحوض
    forecast = get_store().docs["forecast"]
    if forecast.get("basin_id") != basin_id:
        raise HTTPException(
            status_code=404,
            detail=f"لا تنبؤ متاح للحوض '{basin_id}' — خارج النموذج التجريبي (context)",
        )
    return forecast


@router.get("/{basin_id}/ledger")
def basin_ledger(basin_id: str):
    """دفتر الميزان (Mass-Balance Audit): كفة GRACE الإقليمية مقابل ما نفسّره."""
    _get_basin(basin_id)
    ledger = get_store().docs["ledger"]
    if ledger.get("basin_id") != basin_id:
        raise HTTPException(
            status_code=404,
            detail=f"لا دفتر ميزان متاحاً للحوض '{basin_id}' — خارج النموذج التجريبي (context)",
        )
    return ledger
