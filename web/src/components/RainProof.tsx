"use client";
/**
 * برهان النفي المطري — بيانات NASA POWER الحقيقية:
 * متوسط أمطار الصيف فوق الأزرق ≈ صفر → أي خُضرة صيفية = ضخّ جوفي حتماً.
 */
import type { ClimateData } from "@/lib/types";
import { useLang } from "@/lib/i18n";

export default function RainProof({ climate, compact = false }: { climate: ClimateData; compact?: boolean }) {
  const { t, lang } = useLang();
  const p = climate.rain_proof;

  if (compact) {
    return (
      <div className="rounded-xl border border-gold/30 bg-gold/5 px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="kpi-number text-2xl text-gold">{p.mean_summer_mm}<span className="text-xs text-ink-mute"> mm</span></span>
          <span className="text-[11px] leading-tight text-ink-dim">
            {lang === "ar" ? `متوسط مطر الصيف · ${p.years} سنة` : `mean summer rain · ${p.years} yrs`}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-ink-mute">
          {lang === "ar" ? "NASA POWER حقيقي — أي خُضرة صيفية = ضخّ جوفي" : "Real NASA POWER — summer green = pumping"}
        </p>
      </div>
    );
  }

  return (
    <div className="panel relative overflow-hidden p-5">
      <span className="absolute end-3 top-3 rounded-full border border-flag-green/40 bg-flag-green/10 px-2 py-0.5 text-[10px] font-bold text-flag-green">
        ● {lang === "ar" ? "بيانات NASA حقيقية" : "Real NASA data"}
      </span>
      <h3 className="font-head text-lg font-extrabold text-gold">
        {lang === "ar" ? "شاهد النفي المطري" : "The rainfall alibi"}
      </h3>
      <p className="mt-1 text-[11px] text-ink-mute">NASA POWER · MERRA-2 · {climate.rain_proof.years} {lang === "ar" ? "سنة" : "years"}</p>

      <div className="mt-4 flex items-end gap-4">
        <div>
          <div className="kpi-number text-6xl text-gold glow-text">{p.mean_summer_mm}</div>
          <div className="text-xs text-ink-dim">{lang === "ar" ? "مم مطر · متوسط الصيف (حزيران–آب)" : "mm rain · summer mean (Jun–Aug)"}</div>
        </div>
        <div className="mb-1 text-ink-mute">
          <div className="text-sm">{lang === "ar" ? "أقصى صيف على الإطلاق:" : "Max summer ever:"} <b className="num text-ink">{p.max_summer_mm} mm</b></div>
        </div>
      </div>

      <p className="mt-4 rounded-lg border border-gold/20 bg-space-950/40 p-3 text-sm leading-relaxed text-ink">
        {lang === "ar" ? p.implication_ar : p.implication_en}
      </p>
    </div>
  );
}
