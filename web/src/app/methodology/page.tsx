"use client";
/** الشاشة 5 — المنهجية: الداتاستات CORE/SUPPORT/STRETCH + الحدود الخمسة + Model Card + إفصاح AI */
import { useLang } from "@/lib/i18n";
import { DemoBadge, RegionalBadge } from "@/components/Badges";

const DATASETS = [
  { name: "Sentinel-2 L2A", id: "COPERNICUS/S2_SR_HARMONIZED", role_ar: "كاشف الحقول (NDVI/NDWI) — العين", role_en: "Field detector (NDVI/NDWI)", cls: "CORE", artifact_ar: "قناع الريّ + بانل الدليل", artifact_en: "Irrigation mask + evidence panel" },
  { name: "GRACE + GRACE-FO mascon", id: "NASA/GRACE/MASS_GRIDS_V04/MASCON", role_ar: "وزن المياه بالجاذبية (TWS) — الميزان", role_en: "Weighing water via gravity (TWS)", cls: "CORE", artifact_ar: "منحنى المنطقة الشرقية + دفتر الميزان", artifact_en: "Regional curve + ledger" },
  { name: "CHIRPS", id: "UCSB-CHG/CHIRPS/DAILY", role_ar: "شاهد النفي المطري — دفتر المطر", role_en: "Rainfall alibi witness", cls: "CORE", artifact_ar: "أعمدة المطر في بصمة الريّ", artifact_en: "Rain bars in fingerprint chart" },
  { name: "HLS v2 (L30+S30)", id: "NASA/HLS/HLSL30/v002", role_ar: "سلسلة موحّدة لسنة الظهور الأول", role_en: "Harmonized first-seen series", cls: "CORE", artifact_ar: "عمود «الظهور الأول» بالطابور", artifact_en: "First-seen column in queue" },
  { name: "MODIS ET", id: "MODIS/061/MOD16A2GF + MOD16A2", role_ar: "تقدير م³ (Method B) — العدّاد", role_en: "m³ estimation (Method B)", cls: "CORE", artifact_ar: "نطاق م³/سنة لكل حقل", artifact_en: "m³/yr range per field" },
  { name: "SMAP L4 rootzone", id: "NASA/SMAP/SPL4SMGP/008", role_ar: "توكيد ريّ مستقل عن NDVI", role_en: "Irrigation confirmation independent of NDVI", cls: "CORE", artifact_ar: "منحنى الرطوبة في بانل الدليل", artifact_en: "Moisture chart in evidence panel" },
  { name: "GLDAS-2.2 CLSM DA", id: "NASA/GLDAS/V022/CLSM/G025/DA1D", role_ar: "مياه جوفية مشتقة من الجاذبية (GWS_tavg ~27.8كم)", role_en: "Gravity-derived groundwater (GWS_tavg)", cls: "CORE", artifact_ar: "منحنى GWS في شاشة الحوض", artifact_en: "GWS curve in basin screen" },
  { name: "ESA WorldCover v200", id: "ESA/WorldCover/v200", role_ar: "فلتر غطاء موسَّع (يلتقط الزيتون)", role_en: "Expanded landcover filter (catches olives)", cls: "SUPPORT", artifact_ar: "ضمن قواعد P2", artifact_en: "In P2 rules" },
  { name: "JRC Global Surface Water", id: "JRC/GSW1_4/GlobalSurfaceWater", role_ar: "استبعاد الريّ السطحي", role_en: "Surface-water exclusion", cls: "SUPPORT", artifact_ar: "ضمن قواعد P2", artifact_en: "In P2 rules" },
  { name: "Landsat 8/9", id: "LANDSAT/LC08|LC09/C02/T1_L2", role_ar: "تدقيق + سنة 2016 (آلة الزمن)", role_en: "Cross-check + 2016 (time machine)", cls: "SUPPORT", artifact_ar: "آلة الزمن", artifact_en: "Time machine" },
  { name: "ERA5-Land", id: "ECMWF/ERA5_LAND/MONTHLY_AGGR", role_ar: "ET₀ لطريقة FAO-56 (Method C)", role_en: "ET₀ for FAO-56 (Method C)", cls: "SUPPORT", artifact_ar: "نطاق م³ متعدد الطرق", artifact_en: "Multi-method m³ range" },
  { name: "HydroSHEDS hybas_7", id: "WWF/HydroSHEDS/v1/Basins", role_ar: "مضلعات الأحواض البديلة", role_en: "Fallback basin polygons", cls: "SUPPORT", artifact_ar: "حدود الأحواض", artifact_en: "Basin boundaries" },
  { name: "Sentinel-1 SAR", id: "COPERNICUS/S1_GRD", role_ar: "كشف تحت البلاستيك (جواب بطاقة الحكّام)", role_en: "Under-plastic detection (judges card)", cls: "STRETCH", artifact_ar: "—", artifact_en: "—" },
  { name: "Dynamic World / WorldCereal", id: "GOOGLE/DYNAMICWORLD/V1", role_ar: "weak labels لعينات RF", role_en: "Weak labels for RF samples", cls: "STRETCH", artifact_ar: "—", artifact_en: "—" },
];

const LIMITS = [
  { ch_ar: "GRACE خشن (~300كم)", ch_en: "GRACE is coarse (~300km)", fact_ar: "لا يحدّد بئراً", fix_ar: "ماكرو فقط؛ التحديد من Sentinel-2؛ لا ادعاء حقلياً من الجاذبية", fix_en: "Macro only; field-level from Sentinel-2; no field claims from gravity" },
  { ch_ar: "إيجابيات كاذبة", ch_en: "False positives", fact_ar: "ليست كل مزرعة غير شرعية", fix_ar: "درجة ثقة + استبعادات (محمية RAMSAR، JRC) + human-in-the-loop → مرشّحات لا اتهامات", fix_en: "Confidence score + exclusions + human-in-the-loop → filters, not accusations" },
  { ch_ar: "بيانات التراخيص", ch_en: "License data", fact_ar: "السجل غير متاح", fix_ar: "قلب المشكلة: الأزرق مغلق قانونياً → التوسّع الجديد مشبوه بالتعريف (Tier B) + صيغة P4 معاد توزينها معلَنة", fix_en: "Inverted: Azraq legally closed → new expansion suspect by definition (Tier B) + re-weighted P4" },
  { ch_ar: "زمن GRACE-FO", ch_en: "GRACE-FO timeline", fact_ar: "شهري + فجوة 2017–2018 + ينتهي 9/2024", fix_ar: "مناسب للاتجاهات؛ الفجوة والقطع يُعرضان بشفافية على المنحنى نفسه", fix_en: "Trend-grade; gap and cutoff shown transparently on the chart itself" },
  { ch_ar: "الحساسية السياسية", ch_en: "Political sensitivity", fact_ar: "كشف المخالفات حسّاس", fix_ar: "أداة دعم قرار لمفتّشين بشر، لا «وشاية»؛ لا تُعرّف أفراداً", fix_en: "Decision-support for human inspectors, not denunciation; identifies no individuals" },
];

const REFS = [
  { t: "Gropius et al., Hydrogeology Journal 30 (2022) 1769–1787 — البرهان القاتل (MWI+BGR)", u: "doi.org/10.1007/s10040-022-02523-3" },
  { t: "MDPI Water 8(4):132 — الأحواض الثلاثة 144–360%", u: "mdpi.com/2073-4441/8/4/132" },
  { t: "Sassani et al., Sci Rep 15:6500 (2025) — prior art إيران", u: "nature.com/articles/s41598-025-91188-5" },
  { t: "MWI عبر sciepub AJWR (625/418/205 + المناسيب) · IWMI (نسب MWI 2009)", u: "pubs.sciepub.com/ajwr/10/2/4" },
  { t: "Jordan Times 11/2024 — أرقام الإنفاذ (201 بئر، 62 م.م³، 1593)", u: "jordantimes.com" },
  { t: "Rodell et al. 2024 · NASA/UCI 2015 — GRACE عالمياً (21/37 خزاناً)", u: "gracefo.jpl.nasa.gov" },
  { t: "ENR/MEED — الناقل الوطني 300 م.م³ بـ~6 مليارات دولار (عقد 1/2025)", u: "enr.com/articles/62448" },
];

export default function MethodologyPage() {
  const { t, lang } = useLang();
  const ar = lang === "ar";

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <h1 className="font-head text-2xl font-extrabold glow-text">{t("meth_title")}</h1>
        <div className="flex gap-2"><RegionalBadge /><DemoBadge /></div>
      </div>

      {/* المحرّكات الثلاثة */}
      <div className="panel p-4">
        <h2 className="mb-3 font-head text-lg font-extrabold text-teal-glow">{t("meth_engines")}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { n: "E1", ar_t: "كاشف الحقول المرويّة", en_t: "Irrigated-Field Detector", ar_d: "أين الحقول؟ — Sentinel-2 NDVI + CHIRPS≈0 + استبعادات → مضلعات", en_d: "Where are the fields? S2 NDVI + CHIRPS≈0 + exclusions → polygons" },
            { n: "E2", ar_t: "محاسب الاشتباه", en_t: "Anomaly & Suspicion Scorer", ar_d: "أيّها مشبوه وكم يسرق؟ — درجة 0–100 بأوزان شفافة + م³/سنة → طابور GPS", en_d: "Which is suspect and how much? 0–100 transparent score + m³/yr → GPS queue" },
            { n: "E3", ar_t: "متنبّئ استنزاف الحوض", en_t: "Basin Depletion Forecaster", ar_d: "متى ينهار؟ — GRACE إقليمي + Prophet (مساند) + عتبة حرجة على مناسيب الآبار", en_d: "When does it collapse? Regional GRACE + Prophet (supporting) + well-level threshold" },
          ].map((e) => (
            <div key={e.n} className="panel-raised p-3">
              <div className="kpi-number text-2xl text-cyanline">{e.n}</div>
              <div className="mt-1 font-bold">{ar ? e.ar_t : e.en_t}</div>
              <p className="mt-1 text-xs leading-relaxed text-ink-dim">{ar ? e.ar_d : e.en_d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* الداتاستات */}
      <div className="panel overflow-x-auto p-4">
        <h2 className="mb-1 font-head text-lg font-extrabold text-teal-glow">{t("meth_datasets")}</h2>
        <p className="mb-3 text-[11px] text-ink-mute">
          {ar
            ? "القاعدة: أي داتاست يُذكر أمام الحكّام له artifact مرئي — CORE في المنتج، SUPPORT في القواعد، STRETCH لا يُدّعى استخدامه"
            : "Rule: any dataset named to judges has a visible artifact — CORE in product, SUPPORT in rules, STRETCH never claimed"}
        </p>
        <table className="w-full min-w-[760px] text-xs">
          <thead>
            <tr className="border-b border-space-700 text-ink-mute">
              <th className="px-2 py-2 text-start">{ar ? "الداتاست" : "Dataset"}</th>
              <th className="px-2 py-2 text-start">{ar ? "المعرّف" : "GEE ID"}</th>
              <th className="px-2 py-2 text-start">{ar ? "الدور" : "Role"}</th>
              <th className="px-2 py-2 text-start">{ar ? "الأثر المرئي" : "Visible artifact"}</th>
              <th className="px-2 py-2 text-start">{ar ? "التصنيف" : "Class"}</th>
            </tr>
          </thead>
          <tbody>
            {DATASETS.map((d) => (
              <tr key={d.name} className="border-b border-space-700/50">
                <td className="px-2 py-2 font-bold">{d.name}</td>
                <td className="num px-2 py-2 text-[10px] text-ink-mute" dir="ltr">{d.id}</td>
                <td className="px-2 py-2 text-ink-dim">{ar ? d.role_ar : d.role_en}</td>
                <td className="px-2 py-2 text-ink-dim">{ar ? d.artifact_ar : d.artifact_en}</td>
                <td className="px-2 py-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      d.cls === "CORE"
                        ? "border-teal-glow/50 text-teal-glow"
                        : d.cls === "SUPPORT"
                          ? "border-cyanline/40 text-cyanline"
                          : "border-space-600 text-ink-mute"
                    }`}
                  >
                    {d.cls}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Model Card */}
      <div className="panel p-4">
        <h2 className="mb-2 font-head text-lg font-extrabold text-teal-glow">{t("meth_model_card")}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="panel-raised p-3 text-xs leading-relaxed text-ink-dim">
            <h3 className="mb-1 font-bold text-ink">{ar ? "قاعدة الكشف v1 (P2)" : "Detection rule v1 (P2)"}</h3>
            <code dir="ltr" className="block rounded bg-space-950 p-2 text-[10px] text-teal-glow">
              mean(NDVI, Jun–Aug) ≥ 0.35<br />
              AND sum(CHIRPS, Jun–Aug) &lt; 10mm<br />
              AND WorldCover ∈ {"{cropland, bare, tree, shrub}"}<br />
              AND outside JRC water AND outside RAMSAR reserve
            </code>
            <p className="mt-2">{ar ? "بدائل العتبة 0.30/0.40 (بوابة H6) · ML (Random Forest) تحسين فوق القاعدة لا شرط" : "Threshold fallbacks 0.30/0.40 (gate H6) · RF is an upgrade, not a requirement"}</p>
          </div>
          <div className="panel-raised p-3 text-xs leading-relaxed text-ink-dim">
            <h3 className="mb-1 font-bold text-ink">{ar ? "درجة الاشتباه (P4) — معاد توزينها بلا طبقة تراخيص" : "Suspicion score (P4) — re-weighted, no license layer"}</h3>
            <code dir="ltr" className="block rounded bg-space-950 p-2 text-[10px] text-teal-glow">
              score = 35·inside_protected_basin<br />
              + 25·is_new_after_closure<br />
              + 15·(persistence_months / 12)<br />
              + 12.5·norm(area_ha) + 12.5·norm(expansion)
            </code>
            <p className="mt-2">{ar ? "🔴≥70 · 🟠40–69 · 🟢<40 · تُعاير على مواقع الإنفاذ (precision@20) يوم الحدث" : "🔴≥70 · 🟠40–69 · 🟢<40 · calibrated on enforcement sites (precision@20) on event day"}</p>
          </div>
        </div>
      </div>

      {/* الحدود الخمسة */}
      <div className="panel overflow-x-auto p-4">
        <h2 className="mb-3 font-head text-lg font-extrabold text-teal-glow">{t("meth_limits")}</h2>
        <table className="w-full min-w-[640px] text-xs">
          <thead>
            <tr className="border-b border-space-700 text-ink-mute">
              <th className="px-2 py-2 text-start">{ar ? "التحدّي" : "Challenge"}</th>
              <th className="px-2 py-2 text-start">{ar ? "الحقيقة" : "Reality"}</th>
              <th className="px-2 py-2 text-start">{ar ? "المعالجة" : "Mitigation"}</th>
            </tr>
          </thead>
          <tbody>
            {LIMITS.map((l, i) => (
              <tr key={i} className="border-b border-space-700/50">
                <td className="px-2 py-2 font-bold">{ar ? l.ch_ar : l.ch_en}</td>
                <td className="px-2 py-2 text-ink-dim">{l.fact_ar}</td>
                <td className="px-2 py-2 text-ink-dim">{ar ? l.fix_ar : l.fix_en}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* المراجع + الإفصاح */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="panel p-4">
          <h2 className="mb-2 font-head text-lg font-extrabold text-teal-glow">{t("meth_refs")}</h2>
          <ul className="space-y-2 text-xs leading-relaxed text-ink-dim">
            {REFS.map((r, i) => (
              <li key={i}>
                • {r.t}
                <span dir="ltr" className="num ms-1 text-[10px] text-ink-mute">({r.u})</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel border-teal-glow/30 p-4">
          <h2 className="mb-2 font-head text-lg font-extrabold text-teal-glow">{t("meth_ai")}</h2>
          <p className="text-xs leading-relaxed text-ink-dim">{t("meth_ai_text")}</p>
          <p className="mt-3 border-t border-space-700 pt-3 text-[11px] leading-relaxed text-ink-mute">
            {ar
              ? "كل المكوّنات مفتوحة المصدر (GEE المجاني للأبحاث، FastAPI، PostGIS، Next.js، MapLibre) — كلفة تشغيل شبه صفرية واستضافة سيادية ممكنة للوزارة."
              : "Fully open-source stack (GEE free for research, FastAPI, PostGIS, Next.js, MapLibre) — near-zero running cost, sovereign hosting possible for the ministry."}
          </p>
        </div>
      </div>
    </div>
  );
}
