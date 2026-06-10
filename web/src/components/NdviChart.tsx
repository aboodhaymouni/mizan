"use client";
/**
 * بصمة الريّ الزمنية — NDVI ضد مطر CHIRPS (anti-phase):
 * الحقل المروي يخضرّ تحديداً حين المطر صفر — النبت الطبيعي يتبع المطر
 */
import {
  Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { NdviPoint } from "@/lib/types";
import { useLang } from "@/lib/i18n";

export default function NdviChart({ series, height = 200 }: { series: NdviPoint[]; height?: number }) {
  const { t } = useLang();
  const ticks = series.filter((p) => p.month.endsWith("-01") || p.month.endsWith("-07")).map((p) => p.month);
  return (
    <div dir="ltr" style={{ height }} className="w-full">
      <ResponsiveContainer>
        <ComposedChart data={series} margin={{ top: 4, right: -10, bottom: 0, left: -22 }}>
          <XAxis
            dataKey="month"
            ticks={ticks}
            tickFormatter={(m: string) => (m.endsWith("-01") ? m.slice(0, 4) : "☀")}
            stroke="#5C7191"
            tick={{ fontSize: 10 }}
          />
          <YAxis yAxisId="ndvi" stroke="#10B981" tick={{ fontSize: 10 }} domain={[0, 1]} width={34} />
          <YAxis yAxisId="rain" orientation="right" stroke="#38BDF8" tick={{ fontSize: 10 }} width={34} />
          <Tooltip
            contentStyle={{ background: "#0B1422", border: "1px solid #1B2C44", borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: "#8FA3BF" }}
            formatter={(v: number, name: string) =>
              name === "ndvi" ? [v, "NDVI"] : [`${v} mm`, t("rain")]
            }
          />
          <Bar yAxisId="rain" dataKey="chirps_mm" name="chirps" fill="#38BDF8" opacity={0.45} isAnimationActive={false} />
          <Line yAxisId="ndvi" dataKey="ndvi" name="ndvi" stroke="#10B981" strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
