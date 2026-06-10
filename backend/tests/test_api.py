# -*- coding: utf-8 -*-
"""اختبارات ميزان MIZAN API — كل endpoint من عقد CONTRACTS §4.

تستخدم قاعدة SQLite مؤقتة (MIZAN_DB_PATH) حتى لا تلوث backend/mizan.db.
"""

import os
import tempfile
from pathlib import Path

# قاعدة بيانات مؤقتة قبل استيراد التطبيق (المخزن يقرأ متغير البيئة عند أول إنشاء)
_TMP_DB = str(Path(tempfile.mkdtemp(prefix="mizan_test_")) / "test_mizan.db")
os.environ["MIZAN_DB_PATH"] = _TMP_DB

from fastapi.testclient import TestClient  # noqa: E402

import app.store as store_module  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)


def _new_field_ids(n: int) -> list:
    """يرجع n معرفاً لحقول حالتها new (للاختبارات المعدِّلة للحالة)."""
    res = client.get("/fields", params={"status": "new", "limit": n})
    assert res.status_code == 200
    return [f["properties"]["id"] for f in res.json()["features"]]


# ---------- /meta ----------

def test_meta():
    res = client.get("/meta")
    assert res.status_code == 200
    body = res.json()
    assert body["data_mode"] == "demo"
    assert "generated_at" in body
    assert body["version"] == body["generator_version"]


# ---------- /fields + الفلاتر ----------

def test_fields_collection():
    res = client.get("/fields")
    assert res.status_code == 200
    body = res.json()
    assert body["type"] == "FeatureCollection"
    assert body["count"] == len(body["features"]) > 0
    props = body["features"][0]["properties"]
    for key in ("id", "basin_id", "score", "tier", "status", "flag", "is_demo"):
        assert key in props
    assert props["is_demo"] is True  # لا mock كحقيقي أبداً


def test_fields_filter_basin():
    res = client.get("/fields", params={"basin": "azraq"})
    assert res.status_code == 200
    assert all(f["properties"]["basin_id"] == "azraq" for f in res.json()["features"])
    # حوض بلا حقول → مجموعة فارغة (لا خطأ)
    res2 = client.get("/fields", params={"basin": "disi"})
    assert res2.status_code == 200
    assert res2.json()["count"] == 0


def test_fields_filter_min_score():
    res = client.get("/fields", params={"min_score": 70})
    assert res.status_code == 200
    feats = res.json()["features"]
    assert len(feats) > 0
    assert all(f["properties"]["score"] >= 70 for f in feats)


def test_fields_filter_status_and_flag():
    res = client.get("/fields", params={"status": "new", "flag": "EXPANDING"})
    assert res.status_code == 200
    for f in res.json()["features"]:
        assert f["properties"]["status"] == "new"
        assert f["properties"]["flag"] == "EXPANDING"


def test_fields_limit():
    res = client.get("/fields", params={"limit": 5})
    assert res.status_code == 200
    assert res.json()["count"] == 5
    # الترتيب: الدرجة الأعلى أولاً (حسب الرتبة المسبقة)
    scores = [f["properties"]["score"] for f in res.json()["features"]]
    assert scores == sorted(scores, reverse=True)


# ---------- /fields/{id} و /fields/{id}/ndvi ----------

def test_field_by_id():
    fid = _new_field_ids(1)[0]
    res = client.get(f"/fields/{fid}")
    assert res.status_code == 200
    feature = res.json()
    assert feature["type"] == "Feature"
    assert feature["properties"]["id"] == fid
    assert feature["geometry"]["type"] == "Polygon"


def test_field_unknown_404():
    assert client.get("/fields/AZQ-9999").status_code == 404
    assert client.get("/fields/AZQ-9999/ndvi").status_code == 404
    res = client.patch("/fields/AZQ-9999/status", json={"status": "inspected"})
    assert res.status_code == 404


def test_field_ndvi():
    fid = _new_field_ids(1)[0]
    res = client.get(f"/fields/{fid}/ndvi")
    assert res.status_code == 200
    body = res.json()
    assert body["id"] == fid
    assert len(body["series"]) == 36  # 36 شهراً: 2023-01 → 2025-12
    first = body["series"][0]
    for key in ("month", "ndvi", "chirps_mm"):
        assert key in first


# ---------- دورة الحالة: new → inspected → confirmed | cleared ----------

def test_status_lifecycle_valid_confirmed():
    fid = _new_field_ids(3)[0]
    res = client.patch(f"/fields/{fid}/status", json={"status": "inspected", "note": "فُحص ميدانياً"})
    assert res.status_code == 200
    assert res.json()["properties"]["status"] == "inspected"
    assert res.json()["properties"]["status_note"] == "فُحص ميدانياً"

    res = client.patch(f"/fields/{fid}/status", json={"status": "confirmed"})
    assert res.status_code == 200
    assert res.json()["properties"]["status"] == "confirmed"

    # confirmed حالة نهائية — أي انتقال بعدها مرفوض
    res = client.patch(f"/fields/{fid}/status", json={"status": "inspected"})
    assert res.status_code == 422


def test_status_lifecycle_valid_cleared():
    fid = _new_field_ids(3)[1]
    assert client.patch(f"/fields/{fid}/status", json={"status": "inspected"}).status_code == 200
    res = client.patch(f"/fields/{fid}/status", json={"status": "cleared"})
    assert res.status_code == 200
    assert res.json()["properties"]["status"] == "cleared"


def test_status_invalid_transitions_422():
    fid = _new_field_ids(3)[2]
    # قفز مباشر new → confirmed مرفوض
    assert client.patch(f"/fields/{fid}/status", json={"status": "confirmed"}).status_code == 422
    # العودة إلى new مرفوضة دائماً
    assert client.patch(f"/fields/{fid}/status", json={"status": "new"}).status_code == 422
    # حالة غير معروفة مرفوضة
    assert client.patch(f"/fields/{fid}/status", json={"status": "banana"}).status_code == 422
    # الحقل لم يتغير
    assert client.get(f"/fields/{fid}").json()["properties"]["status"] == "new"


def test_status_persists_in_sqlite():
    """التثبيت: إعادة تحميل المخزن من الملفات + SQLite تُبقي الحالة المحدثة."""
    fid = _new_field_ids(1)[0]
    assert client.patch(f"/fields/{fid}/status", json={"status": "inspected", "note": "تثبيت"}).status_code == 200

    store_module.reset_store()  # محاكاة إعادة الإقلاع — يعاد التحميل والدمج
    res = client.get(f"/fields/{fid}")
    assert res.status_code == 200
    assert res.json()["properties"]["status"] == "inspected"
    assert res.json()["properties"]["status_note"] == "تثبيت"


# ---------- /alerts ----------

def test_alerts_default_and_limit():
    res = client.get("/alerts")
    assert res.status_code == 200
    alerts = res.json()["alerts"]
    assert len(alerts) == 20  # الافتراضي
    scores = [a["score"] for a in alerts]
    assert scores == sorted(scores, reverse=True)
    assert alerts[0]["rank"] == 1

    res5 = client.get("/alerts", params={"limit": 5})
    assert len(res5.json()["alerts"]) == 5


# ---------- /basins ----------

def test_basins_collection():
    res = client.get("/basins")
    assert res.status_code == 200
    body = res.json()
    assert body["type"] == "FeatureCollection"
    ids = {f["properties"]["id"] for f in body["features"]}
    assert {"azraq", "amman_zarqa", "yarmouk", "dead_sea", "disi", "jafr"} <= ids
    azraq = next(f for f in body["features"] if f["properties"]["id"] == "azraq")
    assert azraq["properties"]["exploitation_pct"] == 215  # ملحق أ — MWI 2009 عبر IWMI


def test_basin_health():
    res = client.get("/basins/azraq/health")
    assert res.status_code == 200
    body = res.json()
    assert body["exploitation_pct"] == 215
    ind = body["indicators"]
    assert ind["fields_detected"] > 0
    assert ind["est_m3_high"] > ind["est_m3_low"] > 0
    # حوض مجهول → 404
    assert client.get("/basins/nope/health").status_code == 404


def test_basin_forecast():
    res = client.get("/basins/azraq/forecast")
    assert res.status_code == 200
    body = res.json()
    # العتبة الحرجة الفعلية على مناسيب الآبار (قرار المراجعة #15)
    assert body["well_level"]["critical_year_low"] == 2031
    assert body["well_level"]["critical_year_high"] == 2035
    assert body["is_demo"] is True
    # حوض خارج النموذج → 404
    assert client.get("/basins/disi/forecast").status_code == 404
    assert client.get("/basins/nope/forecast").status_code == 404


def test_basin_ledger():
    res = client.get("/basins/azraq/ledger")
    assert res.status_code == 200
    body = res.json()
    assert "unknown_deficit_mcm" in body
    assert body["is_demo"] is True
    assert client.get("/basins/disi/ledger").status_code == 404


# ---------- /validation ----------

def test_validation():
    res = client.get("/validation")
    assert res.status_code == 200
    body = res.json()
    assert body["threshold_km"] == 5  # عتبة معلَنة سلفاً (إصلاح قنبلة P7)
    assert len(body["sites"]) == 6
    assert body["stats"]["in_scope"] == 3
    assert body["is_demo"] is True


# ---------- /impact ----------

def test_impact_default_scenarios():
    res = client.get("/impact")
    assert res.status_code == 200
    body = res.json()
    assert body["constants"]["people_per_mcm"] == 3730  # معادلة الوزارة — ملحق أ
    assert set(body["computed_scenarios"]) == {"conservative", "expected"}
    assert body["computed_scenarios"]["conservative"]["rate"] == 0.35


def test_impact_rate_05():
    base = client.get("/impact").json()
    res = client.get("/impact", params={"rate": 0.5})
    assert res.status_code == 200
    sc = res.json()["scenario"]
    assert sc["rate"] == 0.5
    # إعادة الحساب فوق ثوابت impact.json حرفياً
    assert sc["recovered_m3_mid"] == round(base["detected_total_m3_mid"] * 0.5)
    assert sc["recovered_m3_low"] == round(base["detected_total_m3_low"] * 0.5)
    assert sc["people_equiv_mid"] == round(sc["recovered_m3_mid"] / 1_000_000 * 3730)
    assert sc["usd_low"] == round(sc["recovered_m3_low"] * 0.5)
    assert sc["usd_high"] == round(sc["recovered_m3_high"] * 0.7)


def test_impact_rate_out_of_range_422():
    assert client.get("/impact", params={"rate": 0.05}).status_code == 422
    assert client.get("/impact", params={"rate": 0.95}).status_code == 422


# ---------- /timemachine ----------

def test_timemachine():
    res = client.get("/timemachine")
    assert res.status_code == 200
    body = res.json()
    assert "2016" in body["years"] and "2026" in body["years"]
    assert body["years"]["2016"]["fields_visible"] == 0
    assert body["is_demo"] is True


# ---------- CORS ----------

def test_cors_preflight_localhost_3000():
    res = client.options(
        "/fields",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "PATCH",
        },
    )
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == "http://localhost:3000"
