# -*- coding: utf-8 -*-
"""endpoints عامة — CONTRACTS §4.

GET /validation        → validation.json (P7: عتبة 5كم معلَنة + lift + تأطير تطابق حالات)
GET /impact?rate       → إعادة حساب السيناريو من معدل التأكيد (0.1–0.9) فوق ثوابت impact.json
GET /timemachine       → timemachine.json (آلة الزمن vector-replay 2016–2026)
GET /meta              → {data_mode, generated_at, version}
"""

from typing import Optional

from fastapi import APIRouter, Query

from ..store import get_store

router = APIRouter(tags=["misc"])


def _scenario(base: dict, rate: float) -> dict:
    """حساب سيناريو الاسترجاع: م³ مكتشفة × معدل التأكيد، فوق ثوابت الملحق أ.

    - المكافئ البشري: معادلة الوزارة 1 مليون م³ ≈ ~3,730 شخصاً لسنة.
    - القيمة المالية: تقديرية بمنهجية معلنة = م³ × كلفة التحلية البديلة 0.5–0.7$.
    """
    c = base["constants"]
    rec_low = round(base["detected_total_m3_low"] * rate)
    rec_mid = round(base["detected_total_m3_mid"] * rate)
    rec_high = round(base["detected_total_m3_high"] * rate)
    return {
        "rate": rate,
        "recovered_m3_low": rec_low,
        "recovered_m3_mid": rec_mid,
        "recovered_m3_high": rec_high,
        # مكافئ الأشخاص لكل حد من النطاق
        "people_equiv_low": round(rec_low / 1_000_000 * c["people_per_mcm"]),
        "people_equiv_mid": round(rec_mid / 1_000_000 * c["people_per_mcm"]),
        "people_equiv_high": round(rec_high / 1_000_000 * c["people_per_mcm"]),
        # أوسع نطاق معلَن: أدنى م³ × أدنى كلفة ↔ أعلى م³ × أعلى كلفة
        "usd_low": round(rec_low * c["desal_usd_low"]),
        "usd_high": round(rec_high * c["desal_usd_high"]),
        "method_note_ar": "القيمة تقديرية بمنهجية معلنة: م³ × كلفة التحلية البديلة 0.5–0.7$/م³",
        "method_note_en": "Indicative value: m³ × alternative desalination cost 0.5–0.7 $/m³",
    }


@router.get("/validation")
def get_validation():
    """شاشة التحقق P7 — عتبة ≤5كم معلَنة سلفاً + lift + تأطير تطابق الحالات."""
    return get_store().docs["validation"]


@router.get("/impact")
def get_impact(
    rate: Optional[float] = Query(
        None,
        ge=0.1,
        le=0.9,
        description="معدل تأكيد التفتيش (0.1–0.9) — اختياري؛ بدونه تُحسب السيناريوهات المعلنة",
    ),
):
    """عدّاد الأثر — يعيد حساب السيناريو من معدل التأكيد فوق ثوابت impact.json."""
    base = dict(get_store().docs["impact"])  # نسخة سطحية حتى لا نلوث الذاكرة
    if rate is not None:
        base["scenario"] = _scenario(base, rate)
    else:
        # بلا rate: حساب السيناريوهين المعلنين (متحفّظ/متوقّع) من الملف نفسه
        base["computed_scenarios"] = {
            name: _scenario(base, value) for name, value in base["scenarios"].items()
        }
    return base


@router.get("/timemachine")
def get_timemachine():
    """آلة الزمن — عدد الحقول الظاهرة والهكتارات لكل سنة 2016–2026."""
    return get_store().docs["timemachine"]


@router.get("/meta")
def get_meta():
    """بيانات وصفية: وضع البيانات (demo) وتاريخ التوليد والإصدار."""
    meta = dict(get_store().docs["meta"])
    meta["version"] = meta.get("generator_version")
    return meta
