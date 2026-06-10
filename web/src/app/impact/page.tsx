"use client";
/** الشاشة 4 — عدّاد الأثر: نطاق بافتراضات معلنة (لا رقم واحد) + مقارنة الناقل الوطني */
import { useEffect, useMemo, useState } from "react";
import CountUp from "@/components/CountUp";
import { DemoBadge } from "@/components/Badges";
import { getImpact } from "@/lib/api";
import type { ImpactData } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { fmt, fmtCompact } from "@/lib/format";

function CompareBar({
  label, mcm, max, color, sub,
}: { label: string; mcm: number; max: number; color: string; sub?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="text-ink-dim">{label}</span>
        <span className="num font-bold" style={{ color }}>{mcm.toFixed(0)} <span className="text-[10px] text-ink-mute">MCM</span></span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-space-700">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (mcm / max) * 100)}%`, background: color }} />
      </div>
      {sub && <p className="text-[10px] leading-relaxed text-ink-mute">{sub}</p>}
    </div>
  );
}

export default function ImpactPage() {
  const { t, lang } = useLang();
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [rate, setRate] = useState(0.35);

  useEffect(() => {
    getImpact().then((d) => {
      setImpact(d);
      setRate(d.scenarios.conservative);
    });
  }, []);

  const calc = useMemo(() => {
    if (!impact) return null;
    const c = impact.constants;
    const recovered = impact.detected_total_m3_mid * rate;
    return {
      recovered,
      people: (recovered / 1_000_000) * c.people_per_mcm,
      usdLow: recovered * c.desal_usd_low,
      usdHigh: recovered * c.desal_usd_high,
      recoveredMcm: recovered / 1_000_000,
    };
  }, [impact, rate]);

  if (!impact || !calc) return <p className="py-24 text-center text-ink-mute">{t("loading")}</p>;
  const c = impact.constants;

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h1 className="font-head text-2xl font-extrabold glow-text">{t("impact_title")}</h1>
          <p className="mt-1 text-xs text-ink-dim">{t("impact_sub")}</p>
        </div>
        <DemoBadge />
      </div>

      {/* سحّاب معدل التأكيد — افتراض معلَن */}
      <div className="panel p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-bold text-ink-dim">{t("confirmation_rate")}</span>
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="mizan-range max-w-xs flex-1"
            dir="ltr"
          />
          <span className="kpi-number text-2xl text-teal-glow">{Math.round(rate * 100)}%</span>
          <div className="flex gap-2 text-[11px]">
            <button
              onClick={() => setRate(impact.scenarios.conservative)}
              className={`rounded-full border px-3 py-1 ${rate === impact.scenarios.conservative ? "border-teal-glow text-teal-glow" : "border-space-700 text-ink-dim"}`}
            >
              {t("scenario_conservative")} {Math.round(impact.scenarios.conservative * 100)}%
            </button>
            <button
              onClick={() => setRate(impact.scenarios.expected)}
              className={`rounded-full border px-3 py-1 ${rate === impact.scenarios.expected ? "border-teal-glow text-teal-glow" : "border-space-700 text-ink-dim"}`}
            >
              {t("scenario_expected")} {Math.round(impact.scenarios.expected * 100)}%
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-ink-mute">{impact.scenario_note_ar}</p>
      </div>

      {/* العدّادات الثلاثة */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="panel border-teal-glow/30 p-5 text-center shadow-glow">
          <div className="kpi-number text-5xl text-teal-glow">
            <CountUp value={calc.recovered} format={(n) => fmtCompact(n, lang)} />
          </div>
          <div className="mt-2 text-sm text-ink-dim">{t("recoverable_m3")}</div>
          <p className="mt-2 text-[10px] leading-relaxed text-ink-mute">
            {t("detected_from")} <b className="num">{impact.detected_fields}</b> {t("fields_detected_short")} ·{" "}
            <span dir="ltr" className="num">
              {fmtCompact(impact.detected_total_m3_low, lang)}–{fmtCompact(impact.detected_total_m3_high, lang)}
            </span>{" "}
            × {Math.round(rate * 100)}%
          </p>
        </div>
        <div className="panel border-cyanline/30 p-5 text-center">
          <div className="kpi-number text-5xl text-cyanline">
            <CountUp value={calc.people} format={(n) => fmt(n)} />
          </div>
          <div className="mt-2 text-sm text-ink-dim">{t("people_equiv")}</div>
          <p className="mt-2 text-[10px] leading-relaxed text-ink-mute">{t("people_method")}</p>
        </div>
        <div className="panel border-flag-green/30 p-5 text-center">
          <div className="kpi-number text-5xl text-flag-green">
            $<CountUp value={(calc.usdLow + calc.usdHigh) / 2} format={(n) => fmtCompact(n, lang)} />
          </div>
          <div className="mt-2 text-sm text-ink-dim">{t("money_equiv")}</div>
          <p className="mt-2 text-[10px] leading-relaxed text-ink-mute">
            {t("money_method")} ·{" "}
            <span dir="ltr" className="num">
              ${fmtCompact(calc.usdLow, lang)}–${fmtCompact(calc.usdHigh, lang)}
            </span>
          </p>
        </div>
      </div>

      {/* المقارنة مع الناقل الوطني — أرقام ملحق أ الحقيقية */}
      <div className="panel space-y-4 p-5">
        <h2 className="font-head text-lg font-extrabold text-teal-glow">{t("carrier_compare")}</h2>
        <CompareBar
          label={lang === "ar" ? "إنتاج الناقل الوطني (6 مليارات دولار)" : "National Carrier output ($6bn)"}
          mcm={c.carrier_mcm}
          max={c.carrier_mcm}
          color="#38BDF8"
        />
        <CompareBar
          label={lang === "ar" ? "الضخّ الجائر السنوي فوق الآمن (MWI)" : "Annual overdraft above safe yield (MWI)"}
          mcm={c.overdraft_mcm}
          max={c.carrier_mcm}
          color="#F43F5E"
          sub={t("carrier_line")}
        />
        <CompareBar
          label={lang === "ar" ? "ما وفّره الإنفاذ اليدوي 2023/24 (201 بئر)" : "Saved by manual enforcement 2023/24 (201 wells)"}
          mcm={c.manual_2023_24.mcm}
          max={c.carrier_mcm}
          color="#F59E0B"
          sub={t("manual_line")}
        />
        <CompareBar
          label={lang === "ar" ? `استرجاع ميزان المقدَّر (سيناريو ${Math.round(rate * 100)}%) — demo` : `MIZAN estimated recovery (${Math.round(rate * 100)}% scenario) — demo`}
          mcm={calc.recoveredMcm}
          max={c.carrier_mcm}
          color="#2DD4BF"
        />
        <p className="border-t border-space-700 pt-3 text-[11px] leading-relaxed text-ink-mute">
          {c.avg_sealed_well_note_ar} · {lang === "ar"
            ? `متوسط البئر المُغلَق في حملات 2023/24: ~${fmtCompact(c.avg_sealed_well_m3, "ar")} م³`
            : `Avg. sealed well in 2023/24 campaigns: ~${fmtCompact(c.avg_sealed_well_m3, "en")} m³`}
        </p>
      </div>
    </div>
  );
}
