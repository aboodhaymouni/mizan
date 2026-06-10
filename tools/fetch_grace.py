# -*- coding: utf-8 -*-
"""
ميزان MIZAN — جالب GRACE/GRACE-FO الحقيقي (real GRACE fetcher)
===============================================================
يحمّل سلسلة mascon الحقيقية (JPL RL06.3Mv04 — نفس داتاست الوثائق
`NASA/GRACE/MASS_GRIDS_V04/MASCON`) من NASA PO.DAAC عبر Earthdata token،
يستخرج TWS الإقليمي فوق شرق الأردن، ويبني تنبّؤاً حقيقياً (انحدار + توافقيات
موسمية + backtest) → data/real/tws_series.json + forecast.json (is_real=true).

المصادقة: token من data/real/.ed_token (مُستثنى من git).
تشغيل:  python tools/fetch_grace.py
"""
import json
import math
import os
import sys

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try: sys.stdout.reconfigure(encoding="utf-8")
    except Exception: pass

import numpy as np
import requests
import xarray as xr

HERE = os.path.dirname(__file__)
REAL_DIR = os.path.join(HERE, "..", "data", "real")
RAW_DIR = os.path.join(REAL_DIR, "_grace_raw")
NC_NAME = "GRCTellus.JPL.200204_202604.GLO.RL06.3M.MSCNv04CRI.nc"
NC_URL = ("https://archive.podaac.earthdata.nasa.gov/podaac-ops-cumulus-protected/"
          "TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4/" + NC_NAME)

# نطاق شرق الأردن الإقليمي (إشارة GRACE ~300كم — ليست حوضية)
REGION = {"lon_min": 35.5, "lon_max": 39.3, "lat_min": 29.5, "lat_max": 33.4}
BASELINE = ("2004-01", "2009-12")   # baseline anomalies الرسمي للـ mascon


def token():
    p = os.path.join(REAL_DIR, ".ed_token")
    if not os.path.exists(p):
        sys.exit("✗ لا يوجد data/real/.ed_token")
    return open(p, encoding="utf-8").read().strip()


def download():
    os.makedirs(RAW_DIR, exist_ok=True)
    dst = os.path.join(RAW_DIR, NC_NAME)
    if os.path.exists(dst) and os.path.getsize(dst) > 1_000_000:
        print(f"  الملف موجود ({os.path.getsize(dst)/1e6:.0f} MB) — تخطّي التنزيل")
        return dst
    print("  تنزيل GRACE mascon الحقيقي من PO.DAAC ...", flush=True)
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token()}", "User-Agent": "MIZAN/1.0"})
    r = s.get(NC_URL, stream=True, allow_redirects=True, timeout=300)
    if r.status_code == 401:
        sys.exit("✗ 401 — الـ token مرفوض/منتهٍ. أنشئ token جديداً من urs.earthdata.nasa.gov")
    r.raise_for_status()
    total = int(r.headers.get("Content-Length", 0))
    got = 0
    with open(dst, "wb") as f:
        for chunk in r.iter_content(chunk_size=1 << 20):
            f.write(chunk); got += len(chunk)
            if total:
                print(f"\r    {got/1e6:.0f}/{total/1e6:.0f} MB", end="", flush=True)
    print(f"\r  ✅ نُزّل {got/1e6:.0f} MB")
    return dst


def fit_harmonic(t, y):
    """انحدار خطّي + توافقية سنوية: y ≈ a + b·t + c·sin(2πt) + d·cos(2πt). t بالسنوات."""
    X = np.column_stack([np.ones_like(t), t, np.sin(2*np.pi*t), np.cos(2*np.pi*t)])
    coef, *_ = np.linalg.lstsq(X, y, rcond=None)
    return coef


def predict(coef, t):
    X = np.column_stack([np.ones_like(t), t, np.sin(2*np.pi*t), np.cos(2*np.pi*t)])
    return X @ coef


def main():
    nc = download()
    print("  فتح NetCDF واستخراج TWS الإقليمي ...", flush=True)
    ds = xr.open_dataset(nc)
    var = "lwe_thickness"
    lons = ds["lon"].values
    # mascon قد يكون 0–360؛ نطاقنا 35–39 لا يحتاج لفّاً
    lon_sel = (lons >= REGION["lon_min"]) & (lons <= REGION["lon_max"])
    lat = ds["lat"].values
    lat_sel = (lat >= REGION["lat_min"]) & (lat <= REGION["lat_max"])

    da = ds[var].isel(lon=np.where(lon_sel)[0], lat=np.where(lat_sel)[0])
    # متوسط مكاني (موزون بـ cos(lat))
    w = np.cos(np.deg2rad(da["lat"].values))
    region_mean = (da * xr.DataArray(w, dims=["lat"], coords={"lat": da["lat"]})).sum("lat") / w.sum()
    region_mean = region_mean.mean("lon")  # cm anomaly شهري

    times = ds["time"].values  # datetime64
    vals = region_mean.values.astype("float32")
    months = [str(np.datetime_as_string(t, unit="M")) for t in times]  # YYYY-MM

    # baseline: أعد المركزة على 2004–2009 (اصطلاح mascon — عادة مركزة سلفاً، نضمنها)
    base_mask = [(BASELINE[0] <= m <= BASELINE[1]) for m in months]
    base = np.nanmean(vals[np.array(base_mask)])
    vals = vals - base

    # ملء الأشهر المفقودة (فجوات GRACE) كـ null
    ym0 = months[0]; ym1 = months[-1]
    y0, m0 = map(int, ym0.split("-")); y1, m1 = map(int, ym1.split("-"))
    have = {months[i]: round(float(vals[i]), 2) for i in range(len(months)) if np.isfinite(vals[i])}
    full = []
    yy, mm = y0, m0
    while (yy, mm) <= (y1, m1):
        full.append(f"{yy}-{mm:02d}")
        mm += 1
        if mm > 12: mm, yy = 1, yy+1
    series = []
    # gws ≈ اتجاه منعّم (متوسط متحرك 13 شهراً مركزي على TWS الحقيقي) — مزيل الموسمية
    tws_list = [have.get(m) for m in full]
    for i, m in enumerate(full):
        tws = have.get(m)
        win = [tws_list[j] for j in range(max(0, i-6), min(len(tws_list), i+7)) if tws_list[j] is not None]
        gws = round(sum(win)/len(win), 2) if len(win) >= 5 else None
        series.append({"month": m, "tws_cm": tws, "gws_cm": gws})

    n_real = sum(1 for s in series if s["tws_cm"] is not None)
    print(f"  ✅ TWS حقيقي: {n_real} شهراً ({full[0]} → {full[-1]})")

    # كتابة tws_series.json الحقيقي
    tws_out = {
        "scope": "regional_east_jordan",
        "label_ar": "منحنى GRACE للمنطقة الشرقية/الأردن",
        "label_en": "GRACE curve — East Jordan region",
        "unit": "cm",
        "resolution_note_ar": "إشارة إقليمية ~300كم — لا تُنسب لحوض مفرد",
        "source": "NASA/JPL GRACE & GRACE-FO mascon RL06.3Mv04 (PO.DAAC, real)",
        "gap": ["2017-07", "2018-05"],
        "ends_at": full[-1],
        "series": series,
        "is_real": True, "is_demo": False,
    }
    json.dump(tws_out, open(os.path.join(REAL_DIR, "tws_series.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))

    # ---- التنبّؤ الحقيقي + backtest على TWS الفعلي
    idx = [(int(m[:4]) + (int(m[5:7])-1)/12.0) for m in full]
    t = np.array(idx)
    y = np.array([have.get(m, np.nan) for m in full])
    ok = np.isfinite(y)
    t_ok, y_ok = t[ok], y[ok]

    # backtest: حجب آخر 24 شهراً
    cut = t_ok[-1] - 2.0
    tr = t_ok <= cut
    coef_bt = fit_harmonic(t_ok[tr], y_ok[tr])
    mae = float(np.mean(np.abs(predict(coef_bt, t_ok[~tr]) - y_ok[~tr]))) if (~tr).any() else None

    # نموذج كامل + استقراء حتى 2035-12
    coef = fit_harmonic(t_ok, y_ok)
    resid = float(np.std(y_ok - predict(coef, t_ok)))
    fc = []
    yy, mm = y1, m1
    for _ in range(1, 12 * 11):
        mm += 1
        if mm > 12: mm, yy = 1, yy+1
        if yy > 2035: break
        tt = yy + (mm-1)/12.0
        yhat = float(predict(coef, np.array([tt]))[0])
        band = 1.0 * resid + 0.18 * (tt - t_ok[-1])  # عدم يقين يتسع مع الأفق
        fc.append({"month": f"{yy}-{mm:02d}", "yhat": round(yhat, 2),
                   "lo": round(yhat - band, 2), "hi": round(yhat + band, 2)})

    forecast_out = {
        "basin_id": "azraq",
        "grace_forecast": {
            "label_ar": "تنبّؤ (انحدار + موسمية) على GRACE الحقيقي — إشارة إقليمية مساندة",
            "model": "linear+annual-harmonic (lstsq) على mascon الحقيقي",
            "series": fc,
            "backtest_mae_cm": round(mae, 2) if mae is not None else None,
            "backtest_note_ar": "حجب آخر 24 شهراً من السلسلة الحقيقية وإعادة التنبؤ بها",
        },
        "well_level": {
            "drop_2000_2017_m": -20, "rate_m_per_yr": -1.1,
            "critical_year_low": 2031, "critical_year_high": 2035,
            "threshold_note_ar": "عتبة توضيحية: عمق ضخ اقتصادي إضافي −15م من منسوب 2017",
            "threshold_note_en": "Illustrative threshold: additional −15m economic pumping depth from 2017 level",
            "source_note_ar": "المنسوب والاتجاه من قياسات آبار الوزارة (ملحق أ) — الاستقراء والنطاق محسوبان",
        },
        "is_real": True, "is_demo": False,
    }
    json.dump(forecast_out, open(os.path.join(REAL_DIR, "forecast.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))

    # اتجاه TWS الحقيقي (سم/سنة) للتقرير
    slope = coef[1]
    print(f"  ✅ التنبّؤ الحقيقي: backtest MAE = {mae:.2f} سم · اتجاه TWS = {slope:.2f} سم/سنة")
    print(f"     كُتب data/real/tws_series.json + forecast.json (is_real=true)")
    ds.close()


if __name__ == "__main__":
    main()
