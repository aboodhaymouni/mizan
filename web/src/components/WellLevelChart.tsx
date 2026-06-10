"use client";
/**
 * العتبة الحرجة على مناسيب آبار الوزارة (إصلاح المراجعة #15):
 * −20م (2000–2017) · ~1م/سنة → استقراء بنطاق ثقة → نافذة سنوات حرجة (لا نقطة كاذبة الدقة)
 */
import {
  Area, ComposedChart, Line, ReferenceArea, ReferenceDot, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Forecast } from "@/lib/types";
import { useLang } from "@/lib/i18n";

export default function WellLevelChart({ forecast }: { forecast: Forecast }) {
  const { t, lang } = useLang();
  const w = forecast.well_level;

  // إعادة بناء السلسلة من ثوابت ملحق أ: هبوط −20م حتى 2017 ثم استقراء بالمعدل
  const rows: { year: number; level: number | null; proj: number | null; band: [number, number] | null }[] = [];
  for (let y = 2000; y <= 2040; y++) {
    const histLevel = y <= 2017 ? -(20 * (y - 2000)) / 17 : null;
    let proj: number | null = null;
    let band: [number, number] | null = null;
    if (y >= 2017) {
      const dy = y - 2017;
      proj = -20 + w.rate_m_per_yr * dy;
      const spread = 0.18 * dy;
      band = [proj - spread, proj + spread];
    }
    rows.push({ year: y, level: histLevel != null ? Math.round(histLevel * 10) / 10 : null, proj: proj != null ? Math.round(proj * 10) / 10 : null, band });
  }

  const threshold = -35; // −20م + عتبة توضيحية −15م إضافية
  const midYear = Math.round((w.critical_year_low + w.critical_year_high) / 2);
  const midLevel = -20 + w.rate_m_per_yr * (midYear - 2017);

  return (
    <div dir="ltr" className="h-[260px] w-full">
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <XAxis dataKey="year" stroke="#5C7191" tick={{ fontSize: 11 }} ticks={[2000, 2008, 2017, 2025, 2033, 2040]} />
          <YAxis stroke="#5C7191" tick={{ fontSize: 11 }} width={42} domain={[-46, 2]} />
          <Tooltip
            contentStyle={{ background: "#0B1422", border: "1px solid #1B2C44", borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: "#8FA3BF" }}
            formatter={(v: number | [number, number]) =>
              Array.isArray(v) ? [`${v[0].toFixed(1)} … ${v[1].toFixed(1)} m`, ""] : [`${v} m`, ""]
            }
          />
          {/* نافذة العتبة الحرجة — نطاق سنوات معلَن لا نقطة */}
          <ReferenceArea
            x1={w.critical_year_low}
            x2={w.critical_year_high}
            fill="#F43F5E"
            fillOpacity={0.1}
            stroke="#F43F5E"
            strokeOpacity={0.3}
            strokeDasharray="3 3"
            label={{
              value: `${t("critical_window")} ${w.critical_year_low}–${w.critical_year_high}`,
              position: "insideTop",
              fill: "#F43F5E",
              fontSize: 10,
            }}
          />
          <ReferenceLine
            y={threshold}
            stroke="#F43F5E"
            strokeDasharray="6 3"
            label={{ value: lang === "ar" ? "العتبة (توضيحية)" : "Threshold (illustrative)", position: "insideBottomLeft", fill: "#F43F5E", fontSize: 10 }}
          />
          <Area dataKey="band" stroke="none" fill="#F59E0B" fillOpacity={0.12} isAnimationActive={false} />
          <Line dataKey="level" stroke="#38BDF8" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
          <Line dataKey="proj" stroke="#F59E0B" strokeWidth={1.8} strokeDasharray="6 4" dot={false} connectNulls={false} isAnimationActive={false} />
          {/* النقطة الحمراء الوامضة */}
          <ReferenceDot
            x={midYear}
            y={midLevel}
            r={5}
            fill="#F43F5E"
            stroke="#F43F5E"
            shape={(props: { cx?: number; cy?: number }) => {
              const { cx = 0, cy = 0 } = props;
              return (
                <g>
                  <circle cx={cx} cy={cy} r={9} fill="#F43F5E" opacity={0.3}>
                    <animate attributeName="r" values="6;12;6" dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0.08;0.4" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={cx} cy={cy} r={4.5} fill="#F43F5E" stroke="#060B14" strokeWidth={1.2} />
                </g>
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">{w.source_note_ar}</p>
    </div>
  );
}
