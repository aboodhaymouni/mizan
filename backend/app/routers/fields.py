# -*- coding: utf-8 -*-
"""endpoints الحقول — CONTRACTS §4.

GET   /fields                 فلاتر: basin, min_score, status, flag, limit → GeoJSON FeatureCollection
GET   /fields/{id}            → Feature
GET   /fields/{id}/ndvi       → {id, series: [...]}
PATCH /fields/{id}/status     body {"status": "...", "note": "..."} → Feature محدَّث (يثبت في SQLite)
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..store import FieldNotFound, InvalidTransition, get_store

router = APIRouter(tags=["fields"])


class StatusUpdate(BaseModel):
    """جسم طلب تحديث الحالة — الدورة: new → inspected → confirmed | cleared."""

    status: str
    note: Optional[str] = None


def _sort_key(feature: dict):
    """ترتيب الحقول: حسب rank المُسبق (الدرجة الأعلى أولاً) ثم الدرجة ثم المعرف."""
    props = feature["properties"]
    rank = props.get("rank")
    return (rank if rank is not None else 10**6, -props.get("score", 0), props["id"])


@router.get("/fields")
def list_fields(
    basin: Optional[str] = Query(None, description="فلتر حسب معرف الحوض (basin_id)"),
    min_score: Optional[float] = Query(None, ge=0, le=100, description="حد أدنى لدرجة الاشتباه"),
    status: Optional[str] = Query(None, description="new | inspected | confirmed | cleared"),
    flag: Optional[str] = Query(None, description="NEW | EXPANDING | STABLE"),
    limit: Optional[int] = Query(None, ge=1, description="أقصى عدد حقول"),
):
    """كل الحقول المشبوهة كـ GeoJSON FeatureCollection مع الفلاتر الاختيارية."""
    store = get_store()
    features = sorted(store.docs["fields"]["features"], key=_sort_key)

    if basin is not None:
        features = [f for f in features if f["properties"].get("basin_id") == basin]
    if min_score is not None:
        features = [f for f in features if f["properties"].get("score", 0) >= min_score]
    if status is not None:
        features = [f for f in features if f["properties"].get("status") == status]
    if flag is not None:
        features = [f for f in features if f["properties"].get("flag") == flag]
    if limit is not None:
        features = features[:limit]

    return {
        "type": "FeatureCollection",
        "count": len(features),
        "is_demo": True,
        "features": features,
    }


@router.get("/fields/{field_id}")
def get_field(field_id: str):
    """حقل واحد كـ GeoJSON Feature."""
    try:
        return get_store().get_field(field_id)
    except FieldNotFound:
        raise HTTPException(status_code=404, detail=f"حقل غير موجود: {field_id}")


@router.get("/fields/{field_id}/ndvi")
def get_field_ndvi(field_id: str):
    """سلسلة NDVI الشهرية (مع CHIRPS) للحقل — 36 شهراً."""
    try:
        feature = get_store().get_field(field_id)
    except FieldNotFound:
        raise HTTPException(status_code=404, detail=f"حقل غير موجود: {field_id}")
    return {
        "id": field_id,
        "series": feature["properties"].get("ndvi_series", []),
        "is_demo": True,
    }


@router.patch("/fields/{field_id}/status")
def patch_field_status(field_id: str, body: StatusUpdate):
    """تحديث حالة حقل — يثبت في SQLite ويرجع الـ Feature المحدَّث."""
    try:
        return get_store().update_status(field_id, body.status, body.note)
    except FieldNotFound:
        raise HTTPException(status_code=404, detail=f"حقل غير موجود: {field_id}")
    except InvalidTransition as exc:
        raise HTTPException(status_code=422, detail=str(exc))
