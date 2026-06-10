-- =====================================================================
-- ميزان MIZAN — مخطط PostGIS الكامل (الجداول الخمسة)
-- جاهز لـ Supabase (قرار المراجعة #6: Supabase free = PostGIS + PgBouncer)
-- التشغيل: ألصق هذا الملف في SQL Editor بمشروع Supabase، أو:
--   psql "$DATABASE_URL" -f schema.sql
-- ثم حمّل بيانات demo عبر:  python load_demo.py  (انظر التعليق في أسفله)
--
-- ملاحظة العقد: كل بيانات demo موسومة is_demo — لا mock كحقيقي أبداً.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------
-- 1) basins — الأحواض (حدود تقريبية في وضع demo: is_demo_geometry)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS basins (
    id                   text PRIMARY KEY,            -- azraq, amman_zarqa, ...
    name_ar              text NOT NULL,
    name_en              text NOT NULL,
    exploitation_pct     numeric,                     -- 215 للأزرق، 176 لعمّان-الزرقا (MWI 2009 عبر IWMI) — NULL لأحواض context
    exploitation_source  text,
    closure_year         integer,                     -- إغلاق قانوني (الأزرق 1992) — منطق Tier B
    well_level_drop_m    numeric,                     -- هبوط مناسيب آبار الوزارة 2000–2017 (الأزرق −20م)
    safe_yield_mcm       numeric,                     -- الإنتاج الآمن (يُملأ يوم الحدث إن توافر مصدر)
    status               text NOT NULL DEFAULT 'context'
                         CHECK (status IN ('modeled', 'secondary', 'context')),
    is_demo_geometry     boolean NOT NULL DEFAULT true,
    geom                 geometry(Polygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS basins_geom_gix ON basins USING gist (geom);

COMMENT ON TABLE basins IS 'الأحواض الجوفية — context = خارج النموذج التجريبي (يُعرض رمادياً)';
COMMENT ON COLUMN basins.well_level_drop_m IS 'من قياسات آبار الوزارة — لا من GRACE (قاعدة صياغة GRACE)';

-- ---------------------------------------------------------------------
-- 2) fields — الحقول المشبوهة (مخرجات P2–P5)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fields (
    id                 text PRIMARY KEY,              -- AZQ-0042
    basin_id           text NOT NULL REFERENCES basins(id),
    area_ha            numeric NOT NULL,
    first_seen_year    integer,                       -- من سلسلة HLS/S2
    flag               text CHECK (flag IN ('NEW', 'EXPANDING', 'STABLE')),
    expansion_rate     numeric,                       -- نسبة سنوية
    persistence_months integer,                       -- أشهر النشاط بالسنة (مراجعة: بدل العتبة الثنائية)
    anti_phase_score   numeric,                       -- بصمة الريّ الزمنية NDVI×CHIRPS ضد الموسم 0..1
    score              numeric NOT NULL,              -- صيغة P4 المعتمدة (CONTRACTS §3)
    score_breakdown    jsonb,                         -- مكوّنات الدرجة (explainability)
    tier               text CHECK (tier IN ('red', 'orange', 'green')),  -- red ≥70 · orange 40–69 · green <40
    est_m3_low         bigint,                        -- area_ha × 6000 (Method A)
    est_m3_high        bigint,                        -- area_ha × 9000
    status             text NOT NULL DEFAULT 'new'
                       CHECK (status IN ('new', 'inspected', 'confirmed', 'cleared')),
    status_note        text,
    status_updated_at  timestamptz,
    rank               integer,                       -- الرتبة بالدرجة (1 = الأعلى)
    cluster            text,
    ndvi_series        jsonb,                         -- 36 شهراً [{month, ndvi, chirps_mm}]
    sm_rootzone        jsonb,                         -- 12 قيمة SMAP rootzone (توكيد مستقل)
    is_demo            boolean NOT NULL DEFAULT true,
    centroid           geometry(Point, 4326),
    geom               geometry(Polygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS fields_geom_gix       ON fields USING gist (geom);
CREATE INDEX IF NOT EXISTS fields_basin_score_ix ON fields (basin_id, score DESC);
CREATE INDEX IF NOT EXISTS fields_status_ix      ON fields (status);

COMMENT ON TABLE fields IS 'الحقول المشبوهة من Sentinel-2 حصراً — لا ادعاء حقلياً من GRACE';
COMMENT ON COLUMN fields.status IS 'دورة صارمة: new → inspected → confirmed | cleared (تُفرض في طبقة الـ API)';

-- ---------------------------------------------------------------------
-- 3) tws_series — منحنى GRACE للمنطقة الشرقية/الأردن (إشارة إقليمية ~300كم)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tws_series (
    scope    text NOT NULL DEFAULT 'regional_east_jordan',  -- إقليمي — لا يُنسب لحوض مفرد (قاعدة GRACE)
    month    date NOT NULL,                                 -- أول يوم بالشهر
    tws_cm   numeric,                                       -- lwe_thickness (MASCON، ينتهي 9/2024)
    gws_cm   numeric,                                       -- gws = tws − soil moisture (GLDAS)
    is_demo  boolean NOT NULL DEFAULT true,
    PRIMARY KEY (scope, month)
);

COMMENT ON TABLE tws_series IS '«منحنى GRACE للمنطقة الشرقية/الأردن» — إشارة إقليمية ~300كم، فجوة 2017-07→2018-05 تُعرض بشفافية';

-- ---------------------------------------------------------------------
-- 4) alerts — أعلى التنبيهات (مشتقة من fields، لقطة قابلة للتجديد)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    field_id        text PRIMARY KEY REFERENCES fields(id),
    rank            integer NOT NULL,
    score           numeric NOT NULL,
    tier            text,
    area_ha         numeric,
    first_seen_year integer,
    flag            text,
    est_m3_low      bigint,
    est_m3_high     bigint,
    status          text,
    is_demo         boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS alerts_rank_ix ON alerts (rank);

-- ---------------------------------------------------------------------
-- 5) validation_sites — مواقع التحقق P7 (عتبة ≤5كم معلَنة سلفاً + lift)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS validation_sites (
    id            text PRIMARY KEY,                  -- khan_zabib, jafr, ...
    name_ar       text NOT NULL,
    name_en       text NOT NULL,
    date          text,                              -- "2025-08" — دقة شهرية من الأخبار
    detail_ar     text,
    detail_en     text,
    source        text,                              -- "صراحة نيوز (PDF محفوظ)"
    coords_note   text,                              -- إحداثيات تقريبية لمركز المنطقة
    scope         text CHECK (scope IN ('in_methodology', 'out_of_methodology')),
    out_reason_ar text,                              -- للكفرين: غور مروي بقناة الملك عبدالله
    out_reason_en text,
    hit           boolean,                           -- داخل ≤5كم من مضلع 🔴 (mini-AOI) — NULL لخارج المنهجية
    is_demo       boolean NOT NULL DEFAULT true,
    geom          geometry(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS validation_sites_geom_gix ON validation_sites USING gist (geom);

COMMENT ON TABLE validation_sites IS 'P7: تطابق حالات (case-study concordance) — لا precision/recall على عيّنة إخبارية';

-- =====================================================================
-- كيفية التبديل من SQLite/ملفات demo إلى PostGIS/Supabase:
-- 1) أنشئ مشروع Supabase (free tier) وألصق هذا الملف في SQL Editor.
-- 2) حمّل بيانات demo:  DATABASE_URL=postgresql://... python load_demo.py
--    (يتطلب psycopg2-binary — انظر requirements.txt)
-- 3) في backend/app/store.py استبدل القراءة من الملفات باستعلامات SQL
--    (نفس مخططات CONTRACTS §2 حرفياً، فالعقد لا يتغيّر)، أو أبقِ القراءة
--    من الملفات واستبدل SQLite بجدول field_status هنا — الواجهة لا تتأثر
--    لأنها تقرأ عبر طبقة fallback (CONTRACTS §4).
-- 4) استعلام مكاني نموذجي (تحقق P7 — عتبة 5كم):
--      SELECT v.id, MIN(ST_Distance(v.geom::geography, f.geom::geography)) / 1000 AS km
--      FROM validation_sites v
--      JOIN fields f ON f.tier = 'red'
--      WHERE v.scope = 'in_methodology'
--      GROUP BY v.id HAVING MIN(ST_Distance(v.geom::geography, f.geom::geography)) <= 5000;
-- =====================================================================
