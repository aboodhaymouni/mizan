# -*- coding: utf-8 -*-
"""تحميل بيانات data/demo إلى PostGIS/Supabase — ميزان MIZAN.

الاستخدام:
    pip install psycopg2-binary
    # سلسلة الاتصال من Supabase: Settings → Database → Connection string (URI)
    DATABASE_URL="postgresql://postgres:...@db.xxxx.supabase.co:5432/postgres" python load_demo.py

يفترض أن schema.sql نُفّذ مسبقاً (SQL Editor أو psql -f schema.sql).
كل الصفوف المحمَّلة demo موسومة is_demo=true — تُستبدل بمخرجات GEE الحقيقية
بنفس المخطط بلا تغيير في العقد (CONTRACTS §2).
"""

import json
import os
import sys
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import Json, execute_values
except ImportError:
    sys.exit("psycopg2 غير مثبت — نفّذ: pip install psycopg2-binary")

# مسار بيانات demo: متغير البيئة أو الافتراضي نسبة لجذر المشروع
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv("MIZAN_DATA_DIR", PROJECT_ROOT / "data" / "demo"))

DSN = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
if not DSN:
    sys.exit("اضبط DATABASE_URL (سلسلة اتصال Supabase/PostGIS) قبل التشغيل")


def _read(name: str):
    with open(DATA_DIR / name, encoding="utf-8") as fh:
        return json.load(fh)


def _geom(geometry: dict) -> str:
    """GeoJSON → نص يمر عبر ST_GeomFromGeoJSON."""
    return json.dumps(geometry)


def load(cur) -> None:
    # ---- 1) basins ----
    basins = _read("basins.geojson")["features"]
    execute_values(
        cur,
        """INSERT INTO basins (id, name_ar, name_en, exploitation_pct, exploitation_source,
                               closure_year, well_level_drop_m, status, is_demo_geometry, geom)
           VALUES %s
           ON CONFLICT (id) DO NOTHING""",
        [
            (
                p["id"], p["name_ar"], p["name_en"], p.get("exploitation_pct"),
                p.get("exploitation_source"), p.get("closure_year"),
                p.get("well_level_drop_m"), p.get("status", "context"),
                p.get("is_demo_geometry", True), _geom(f["geometry"]),
            )
            for f in basins
            for p in [f["properties"]]
        ],
        template="(%s,%s,%s,%s,%s,%s,%s,%s,%s, ST_SetSRID(ST_GeomFromGeoJSON(%s),4326))",
    )
    print(f"basins: {len(basins)}")

    # ---- 2) fields ----
    fields = _read("fields.geojson")["features"]
    execute_values(
        cur,
        """INSERT INTO fields (id, basin_id, area_ha, first_seen_year, flag, expansion_rate,
                               persistence_months, anti_phase_score, score, score_breakdown,
                               tier, est_m3_low, est_m3_high, status, rank, cluster,
                               ndvi_series, sm_rootzone, is_demo, centroid, geom)
           VALUES %s
           ON CONFLICT (id) DO NOTHING""",
        [
            (
                p["id"], p["basin_id"], p["area_ha"], p.get("first_seen_year"),
                p.get("flag"), p.get("expansion_rate"), p.get("persistence_months"),
                p.get("anti_phase_score"), p["score"], Json(p.get("score_breakdown")),
                p.get("tier"), p.get("est_m3_low"), p.get("est_m3_high"),
                p.get("status", "new"), p.get("rank"), p.get("cluster"),
                Json(p.get("ndvi_series")), Json(p.get("sm_rootzone")),
                p.get("is_demo", True),
                p["centroid"][0], p["centroid"][1], _geom(f["geometry"]),
            )
            for f in fields
            for p in [f["properties"]]
        ],
        template=(
            "(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,"
            " ST_SetSRID(ST_MakePoint(%s,%s),4326),"
            " ST_SetSRID(ST_GeomFromGeoJSON(%s),4326))"
        ),
    )
    print(f"fields: {len(fields)}")

    # ---- 3) tws_series (إقليمي — قاعدة صياغة GRACE) ----
    tws = _read("tws_series.json")
    rows = [
        (tws["scope"], f"{r['month']}-01", r.get("tws_cm"), r.get("gws_cm"), tws.get("is_demo", True))
        for r in tws["series"]
    ]
    execute_values(
        cur,
        """INSERT INTO tws_series (scope, month, tws_cm, gws_cm, is_demo)
           VALUES %s ON CONFLICT (scope, month) DO NOTHING""",
        rows,
    )
    print(f"tws_series: {len(rows)}")

    # ---- 4) alerts ----
    alerts = _read("alerts.json")["alerts"]
    execute_values(
        cur,
        """INSERT INTO alerts (field_id, rank, score, tier, area_ha, first_seen_year,
                               flag, est_m3_low, est_m3_high, status, is_demo)
           VALUES %s ON CONFLICT (field_id) DO NOTHING""",
        [
            (
                a["id"], a["rank"], a["score"], a.get("tier"), a.get("area_ha"),
                a.get("first_seen_year"), a.get("flag"), a.get("est_m3_low"),
                a.get("est_m3_high"), a.get("status"), True,
            )
            for a in alerts
        ],
    )
    print(f"alerts: {len(alerts)}")

    # ---- 5) validation_sites ----
    val = _read("validation.json")
    execute_values(
        cur,
        """INSERT INTO validation_sites (id, name_ar, name_en, date, detail_ar, detail_en,
                                         source, coords_note, scope, out_reason_ar,
                                         out_reason_en, hit, is_demo, geom)
           VALUES %s ON CONFLICT (id) DO NOTHING""",
        [
            (
                s["id"], s["name_ar"], s["name_en"], s.get("date"), s.get("detail_ar"),
                s.get("detail_en"), s.get("source"), s.get("coords_note"), s.get("scope"),
                s.get("out_reason_ar"), s.get("out_reason_en"), s.get("hit"),
                val.get("is_demo", True), s["lon"], s["lat"],
            )
            for s in val["sites"]
        ],
        template="(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, ST_SetSRID(ST_MakePoint(%s,%s),4326))",
    )
    print(f"validation_sites: {len(val['sites'])}")


def main() -> None:
    with psycopg2.connect(DSN) as con:
        with con.cursor() as cur:
            load(cur)
        con.commit()
    print("تم التحميل بنجاح — كل الصفوف موسومة is_demo=true")


if __name__ == "__main__":
    main()
