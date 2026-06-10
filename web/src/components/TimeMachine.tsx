"use client";
/** آلة الزمن 2016 ↔ 2026 — الصحراء تخضرّ (إعادة عرض المتجهات حسب سنة الظهور الأول) */
import type { TimeMachineData } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { fmt, fmtMcm } from "@/lib/format";

export default function TimeMachine({
  data,
  year,
  onYearChange,
}: {
  data: TimeMachineData;
  year: number;
  onYearChange: (y: number) => void;
}) {
  const { t, lang } = useLang();
  const stats = data.years[String(year)];

  return (
    <div className="panel p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-head text-lg font-extrabold text-teal-glow">⏳ {t("time_machine")}</h3>
        <span className="kpi-number text-3xl text-ink">{year}</span>
      </div>
      <input
        type="range"
        min={2016}
        max={2026}
        step={1}
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
        className="mizan-range"
        dir="ltr"
        aria-label={t("time_machine")}
      />
      <div dir="ltr" className="mt-1 flex justify-between text-[10px] text-ink-mute">
        <span>2016</span><span>2021</span><span>2026</span>
      </div>
      {stats && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="panel-raised p-2">
            <div className="kpi-number text-xl text-flag-green">{stats.fields_visible}</div>
            <div className="text-[10px] text-ink-mute">{t("fields_visible")}</div>
          </div>
          <div className="panel-raised p-2">
            <div className="kpi-number text-xl">{fmt(stats.total_ha)}</div>
            <div className="text-[10px] text-ink-mute">ha</div>
          </div>
          <div className="panel-raised p-2">
            <div className="kpi-number text-xl">{fmtMcm(stats.est_m3_mid, lang)}</div>
            <div className="text-[10px] text-ink-mute">{lang === "ar" ? "م³/سنة (وسط)" : "m³/yr (mid)"}</div>
          </div>
        </div>
      )}
      <p className="mt-2 text-[10px] leading-relaxed text-ink-mute">{data.note_ar}</p>
    </div>
  );
}
