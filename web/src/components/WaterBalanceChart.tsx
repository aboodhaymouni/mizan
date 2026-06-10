"use client";
/**
 * الميزان المائي الحقيقي — NASA POWER:
 * أعمدة المطر الشهري الحقيقي + منحنى العجز التراكمي (Σ مطر−تبخّر) الهابط — بيانات ناسا 100%.
 */
import {
  Area, Bar, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { ClimateData } from "@/lib/types";
import { useLang } from "@/lib/i18n";

export default function WaterBalanceChart({ climate, height = 280 }: { climate: ClimateData; height?: number }) {
  const { t, lang } = useLang();
  // عيّنة كل شهر؛ المحور السفلي بالسنوات
  const rows = climate.series.map((s) => ({
    month: s.month,
    precip: s.precip_mm,
    deficit: s.cum_deficit_mm,
  }));
  const yearTicks = rows.filter((r) => r.month.endsWith("-01") && parseInt(r.month) % 3 === 0).map((r) => r.month);

  return (
    <div className="panel p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-head text-lg font-extrabold text-gold">
          {lang === "ar" ? climate.title_ar : climate.title_en}
        </h3>
        <span className="rounded-full border border-flag-green/40 bg-flag-green/10 px-2 py-0.5 text-[10px] font-bold text-flag-green">
          ● {lang === "ar" ? "NASA POWER حقيقي" : "Real NASA POWER"}
        </span>
      </div>
      <p className="mb-2 text-[11px] text-ink-mute">{climate.note_ar}</p>
      <div dir="ltr" style={{ height }} className="w-full">
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={{ top: 8, right: 6, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="deficitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E9B949" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#E9B949" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" ticks={yearTicks} tickFormatter={(m: string) => m.slice(0, 4)} stroke="#5C7191" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="rain" stroke="#38BDF8" tick={{ fontSize: 10 }} width={34} />
            <YAxis yAxisId="def" orientation="right" stroke="#E9B949" tick={{ fontSize: 10 }} width={44} />
            <Tooltip
              contentStyle={{ background: "#0B1422", border: "1px solid #1B2C44", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "#8FA3BF" }}
              formatter={(v: number, n: string) =>
                n === "precip"
                  ? [`${v} mm`, lang === "ar" ? "مطر حقيقي (شهري)" : "real rain (monthly)"]
                  : [`${Math.round(v)} mm`, lang === "ar" ? "عجز تراكمي" : "cumulative deficit"]
              }
            />
            <Bar yAxisId="rain" dataKey="precip" name="precip" fill="#38BDF8" opacity={0.55} isAnimationActive={false} />
            <Area yAxisId="def" dataKey="deficit" name="deficit" stroke="#E9B949" strokeWidth={2} fill="url(#deficitGrad)" isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-ink-dim" dir={lang === "ar" ? "rtl" : "ltr"}>
        <span><span className="me-1 inline-block h-2 w-3 bg-cyanline/60 align-middle" /> {lang === "ar" ? "مطر شهري حقيقي (مم)" : "real monthly rain (mm)"}</span>
        <span><span className="me-1 inline-block h-0.5 w-4 bg-gold align-middle" /> {lang === "ar" ? "العجز المائي التراكمي" : "cumulative water deficit"}</span>
      </div>
    </div>
  );
}
