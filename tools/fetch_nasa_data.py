# -*- coding: utf-8 -*-
"""
ميزان MIZAN — جالب بيانات NASA الحقيقية (real NASA data fetcher)
=================================================================
يجلب بيانات حقيقية 100% من NASA بلا أي مفتاح/مصادقة:

1. **NASA POWER API** (power.larc.nasa.gov) — سلاسل مناخية شهرية حقيقية مشتقة من
   MERRA-2 والأقمار: الأمطار (PRECTOTCORR) والتبخّر-النتح (EVPTRNS) ودرجة الحرارة
   والإشعاع — فوق حوض الأزرق ونقاط مرجعية. يثبت «النفي المطري الصيفي» بأرقام حقيقية.

2. **NASA GIBS** (gibs.earthdata.nasa.gov) — صور أقمار حقيقية (VIIRS/MODIS TrueColor
   + MODIS NDVI) بلا مصادقة عبر WMS — خلفية الخريطة + آلة الزمن 2016↔2026.

المخرجات → data/real/ :
  - climate.json        السلاسل المناخية الحقيقية (POWER) + ملخص النفي المطري
  - nasa_sources.json   بيان المصادر والمعرّفات الحقيقية المستخدمة
  - (الصور تُجلب بـ fetch_nasa_imagery.ps1 إلى web/public/nasa/)

تشغيل:  python tools/fetch_nasa_data.py
"""
import json
import os
import sys
import urllib.request
import urllib.error
import calendar

# Windows console UTF-8 (الطباعة العربية)
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "real")

# نقاط القياس الحقيقية (lon, lat) — مركز مزارع الأزرق + نقاط سياق
POINTS = {
    "azraq_farms": (36.90, 31.90),     # قلب مزارع الأزرق المروية
    "azraq_oasis": (36.83, 31.84),     # الواحة/المحمية
    "amman_zarqa": (36.05, 32.05),     # الحوض الثانوي
}

POWER_BASE = "https://power.larc.nasa.gov/api/temporal/monthly/point"
# PRECTOTCORR: أمطار مصححة (mm/day) · EVPTRNS: تبخّر-نتح · T2M: حرارة 2م · ALLSKY_SFC_SW_DWN: إشعاع
PARAMS = "PRECTOTCORR,EVPTRNS,T2M,ALLSKY_SFC_SW_DWN"
START_YEAR = 2002
END_YEAR = 2024


def fetch_power(lon, lat, start=START_YEAR, end=END_YEAR):
    """يجلب السلسلة الشهرية الحقيقية من NASA POWER لنقطة."""
    url = (
        f"{POWER_BASE}?parameters={PARAMS}&community=AG"
        f"&longitude={lon}&latitude={lat}&start={start}&end={end}&format=JSON"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "MIZAN/1.0 (AstroCode2026)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def to_monthly_mm(prec_daily_by_month):
    """تحويل PRECTOTCORR (mm/day) إلى إجمالي شهري (mm) بضرب أيام الشهر.

    مفاتيح POWER الشهرية: YYYYMM، مع YYYY13 = المتوسط السنوي (يُتجاهل).
    """
    out = []
    for key in sorted(prec_daily_by_month):
        if key.endswith("13"):
            continue
        year, month = int(key[:4]), int(key[4:6])
        if month < 1 or month > 12:
            continue
        days = calendar.monthrange(year, month)[1]
        mm_day = prec_daily_by_month[key]
        if mm_day is None or mm_day < -100:  # fill value -999
            mm = None
        else:
            mm = round(mm_day * days, 1)
        out.append({"month": f"{year}-{month:02d}", "precip_mm": mm})
    return out


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    series = {}
    rain_negation = {}

    for name, (lon, lat) in POINTS.items():
        print(f"  جلب NASA POWER لـ {name} ({lat}N {lon}E) ...", end=" ", flush=True)
        try:
            data = fetch_power(lon, lat)
        except urllib.error.URLError as e:
            print(f"فشل: {e}")
            sys.exit(1)
        p = data["properties"]["parameter"]
        prec = to_monthly_mm(p["PRECTOTCORR"])
        et = p.get("EVPTRNS", {})
        t2m = p.get("T2M", {})

        # دمج درجة الحرارة في كل شهر (حقيقية)
        for row in prec:
            key = row["month"].replace("-", "")
            tv = t2m.get(key)
            row["t2m_c"] = round(tv, 1) if tv is not None and tv > -100 else None

        series[name] = {
            "lon": lon, "lat": lat,
            "elevation_m": data["geometry"]["coordinates"][2]
            if len(data["geometry"]["coordinates"]) > 2 else None,
            "monthly": prec,
        }

        # ملخص النفي المطري الصيفي (حزيران–آب) بأرقام حقيقية
        summers = {}
        for row in prec:
            y, m = row["month"].split("-")
            if m in ("06", "07", "08") and row["precip_mm"] is not None:
                summers.setdefault(y, 0.0)
                summers[y] += row["precip_mm"]
        if summers:
            vals = list(summers.values())
            rain_negation[name] = {
                "mean_summer_mm": round(sum(vals) / len(vals), 1),
                "max_summer_mm": round(max(vals), 1),
                "years": len(vals),
                "note_ar": "مجموع أمطار حزيران–آب (NASA POWER) — قرب الصفر يثبت أن أي خُضرة صيفية = ضخّ جوفي",
            }
        print(f"تم ({len(prec)} شهراً)")

    out = {
        "source": "NASA POWER (MERRA-2 / satellite-derived), power.larc.nasa.gov",
        "parameters": {
            "PRECTOTCORR": "إجمالي الأمطار المصحَّح (mm) — محوّل من mm/day × أيام الشهر",
            "EVPTRNS": "التبخّر-النتح",
            "T2M": "درجة الحرارة عند 2م (°C)",
        },
        "fetched_range": f"{START_YEAR}-01 → {END_YEAR}-12",
        "points": series,
        "summer_rain_negation": rain_negation,
        "is_real": True,
        "is_demo": False,
    }
    path = os.path.join(OUT_DIR, "climate.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"\n  ✅ كُتب {os.path.relpath(path)} ({os.path.getsize(path)/1024:.1f} KB)")

    # طباعة برهان النفي المطري الحقيقي
    az = rain_negation.get("azraq_farms", {})
    print(f"\n  🌧️ برهان النفي المطري الحقيقي (الأزرق، NASA POWER):")
    print(f"     متوسط أمطار حزيران–آب = {az.get('mean_summer_mm')} مم/الصيف على {az.get('years')} سنة")
    print(f"     أقصى صيف = {az.get('max_summer_mm')} مم → أي خُضرة صيفية = ضخّ جوفي حتماً")

    # بيان المصادر الحقيقية
    sources = {
        "satellite_imagery": {
            "provider": "NASA GIBS (Global Imagery Browse Services)",
            "layers": [
                "VIIRS_SNPP_CorrectedReflectance_TrueColor (375م — خلفية الأردن)",
                "MODIS_Terra_CorrectedReflectance_TrueColor (250م — آلة الزمن الأزرق)",
                "MODIS_Terra_L3_NDVI_Monthly (مؤشر الخضرة)",
            ],
            "auth": "بلا مصادقة (WMS عام)",
            "endpoint": "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
        },
        "climate": {
            "provider": "NASA POWER",
            "dataset": "MERRA-2 + satellite-derived",
            "auth": "بلا مصادقة (REST عام)",
        },
        "grace": {
            "provider": "NASA/JPL GRACE & GRACE-FO",
            "note": "اتجاه TWS الهابط والقيم الإقليمية منشورة (Rodell et al. 2024، JPL) — السلسلة الكاملة تحتاج Earthdata؛ المعروض اتجاه إقليمي موثّق",
            "published_figures": "هبوط المياه العذبة منذ 2015 ~1,200 كم³ · 21/37 خزاناً تجاوز الاستدامة",
        },
        "is_real": True,
    }
    spath = os.path.join(OUT_DIR, "nasa_sources.json")
    with open(spath, "w", encoding="utf-8") as f:
        json.dump(sources, f, ensure_ascii=False, indent=2)
    print(f"  ✅ كُتب {os.path.relpath(spath)}")


if __name__ == "__main__":
    main()
