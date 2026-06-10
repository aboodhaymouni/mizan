"use client";
/**
 * آلة الزمن الفضائية — شاشة سينمائية (إلهام التصميم mockup 1)
 * صور NASA GIBS حقيقية (MODIS TrueColor) قبل/بعد + سحّاب + لوحة التحليل + مصفوفة الخطر + منسوب الماء.
 */
import { useEffect, useMemo, useState } from "react";
import type { ClimateData, FieldsFC, Forecast, NasaManifest, TimeMachineData } from "@/lib/types";
import { getClimate, getFields, getForecast, getNasa, getTimeMachine } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { fmt } from "@/lib/format";
import RiskMatrix from "@/components/RiskMatrix";
import { DemoBadge } from "@/components/Badges";

const YEARS = [2016, 2018, 2020, 2022, 2024];

export default function TimeMachinePage() {
  const { t, lang } = useLang();
  const [nasa, setNasa] = useState<NasaManifest | null>(null);
  const [tm, setTm] = useState<TimeMachineData | null>(null);
  const [fields, setFields] = useState<FieldsFC | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [climate, setClimate] = useState<ClimateData | null>(null);
  const [split, setSplit] = useState(50);
  const [yearIdx, setYearIdx] = useState(YEARS.length - 1);

  useEffect(() => {
    getNasa().then(setNasa).catch(() => {});
    getTimeMachine().then(setTm).catch(() => {});
    getFields({ basin: "azraq" }).then(setFields).catch(() => {});
    getForecast("azraq").then(setForecast).catch(() => {});
    getClimate().then(setClimate).catch(() => {});
  }, []);

  const afterYear = YEARS[yearIdx];
  const beforeImg = nasa?.time_machine.years["2016"];
  const afterImg = nasa?.time_machine.years[String(afterYear)];
  const stats = tm?.years[String(afterYear)];

  // كشوف الآبار حتى السنة المختارة (من مخرجات الكشف)
  const detections = useMemo(() => {
    if (!fields) return 0;
    return fields.features.filter((f) => f.properties.first_seen_year <= afterYear).length;
  }, [fields, afterYear]);

  return (
    <div className="space-y-3">
      {/* العنوان السينمائي */}
      <div className="relative flex flex-col items-center justify-center py-4 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-ink-mute">{t("satellite_time_machine")}</span>
        <h1 dir="ltr" className="kpi-number mt-1 text-hero text-gold glow-text">
          2016 <span className="text-ink-dim">→</span> {afterYear}
        </h1>
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-flag-green/40 bg-flag-green/10 px-3 py-1 text-[11px] font-bold text-flag-green">
          ● {t("nasa_live_badge")} · NASA GIBS · MODIS
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_330px]">
        {/* مسرح الصور قبل/بعد */}
        <div className="panel relative overflow-hidden p-0">
          <div className="relative h-[58vh] min-h-[420px] w-full select-none" dir="ltr">
            {afterImg && (
              <img src={afterImg} alt={`Azraq ${afterYear}`} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
            )}
            {beforeImg && (
              <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
                <img src={beforeImg} alt="Azraq 2016" className="h-full w-full object-cover" draggable={false} />
              </div>
            )}
            {/* مقبض السحب */}
            <div className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-gold shadow-glow-gold" style={{ left: `${split}%` }}>
              <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold bg-space-950/90 px-2 py-1 text-[10px] font-bold text-gold">⇄</div>
            </div>
            {/* ملصقات قبل/بعد */}
            <span className="absolute left-3 top-3 rounded-lg bg-space-950/80 px-2.5 py-1 text-xs font-bold text-ink-dim backdrop-blur">{t("before")} · 2016</span>
            <span className="absolute right-3 top-3 rounded-lg bg-space-950/80 px-2.5 py-1 text-xs font-bold text-gold backdrop-blur">{t("after")} · {afterYear}</span>
            {/* خط مسح سينمائي */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
              <div className="h-12 w-full bg-gradient-to-b from-transparent via-teal-glow/20 to-transparent animate-scan" />
            </div>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-space-950/80 px-3 py-1 text-[11px] text-ink-dim backdrop-blur">
              {t("real_imagery_caption")}
            </span>
          </div>
          {/* سحّاب الانقسام */}
          <div className="px-4 py-3">
            <input type="range" min={2} max={98} value={split} onChange={(e) => setSplit(Number(e.target.value))} className="mizan-range" dir="ltr" />
          </div>
        </div>

        {/* لوحة التحليل */}
        <div className="space-y-3">
          <div className="panel p-4">
            <h3 className="mb-3 font-head text-sm font-extrabold uppercase tracking-wide text-ink-dim">{t("intelligence")}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-space-700/60 pb-2">
                <span className="text-xs text-ink-dim">{t("well_detections")}</span>
                <span className="kpi-number text-2xl text-flag-red">{detections}</span>
              </div>
              <div className="flex items-center justify-between border-b border-space-700/60 pb-2">
                <span className="text-xs text-ink-dim">{t("detected_hectares")}</span>
                <span className="kpi-number text-2xl text-gold">{stats ? fmt(stats.total_ha) : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-dim">{t("recharge_rate")}</span>
                <span className="kpi-number text-xl text-flag-orange">{climate ? climate.rain_proof.mean_summer_mm : "—"}<span className="text-[10px] text-ink-mute"> mm/{lang === "ar" ? "صيف" : "summer"}</span></span>
              </div>
            </div>
          </div>

          <div className="panel p-4">
            <RiskMatrix fields={fields} />
          </div>

          {/* منسوب الماء التاريخي المصغّر */}
          {forecast && (
            <div className="panel p-4">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-dim">{t("historical_water")}</div>
              <MiniWaterLevel rate={forecast.well_level.rate_m_per_yr} />
              <p className="mt-1 text-[10px] text-ink-mute">
                {lang === "ar" ? "قياسات آبار الوزارة — الأزرق −20م (2000–2017)" : "Ministry wells — Azraq −20m (2000–2017)"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* شريط الزمن السفلي */}
      <div className="panel p-4">
        <input
          type="range" min={0} max={YEARS.length - 1} step={1} value={yearIdx}
          onChange={(e) => setYearIdx(Number(e.target.value))} className="mizan-range" dir="ltr"
        />
        <div dir="ltr" className="mt-2 flex justify-between text-xs">
          {YEARS.map((y, i) => (
            <button
              key={y}
              onClick={() => setYearIdx(i)}
              className={`rounded px-2 py-0.5 font-bold transition-colors ${i === yearIdx ? "text-gold" : "text-ink-mute hover:text-ink-dim"}`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-center"><DemoBadge /></div>
    </div>
  );
}

function MiniWaterLevel({ rate }: { rate: number }) {
  // منحنى هابط بسيط من −20م 2017 بمعدل rate — SVG خفيف
  const pts: string[] = [];
  for (let i = 0; i <= 24; i++) {
    const x = (i / 24) * 100;
    const level = -(20 * (i / 24)) + (i > 17 ? rate * 0 : 0);
    const y = 8 + (Math.abs(level) / 24) * 40;
    pts.push(`${x},${y}`);
  }
  return (
    <svg viewBox="0 0 100 56" className="h-16 w-full" preserveAspectRatio="none">
      <polyline points={pts.join(" ")} fill="none" stroke="#38BDF8" strokeWidth="1.4" />
      <line x1="0" y1="48" x2="100" y2="48" stroke="#F43F5E" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
    </svg>
  );
}
