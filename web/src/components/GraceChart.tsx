"use client";
/**
 * منحنى GRACE للمنطقة الشرقية/الأردن — TWS + GWS + تنبّؤ Prophet بنطاق ثقة
 * فجوة 2017–2018 تُعرض بشفافية · القطع عند 9/2024 معلَن (MASCON)
 */
import {
  Area, ComposedChart, Line, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Forecast, TwsSeries } from "@/lib/types";
import { useLang } from "@/lib/i18n";

interface Row {
  month: string;
  tws: number | null;
  gws: number | null;
  yhat: number | null;
  band: [number, number] | null;
}

export default function GraceChart({ tws, forecast }: { tws: TwsSeries; forecast: Forecast }) {
  const { t, lang } = useLang();

  const rows: Row[] = [
    ...tws.series.map((p) => ({
      month: p.month,
      tws: p.tws_cm,
      gws: p.gws_cm,
      yhat: null,
      band: null,
    })),
    ...forecast.grace_forecast.series.map((p) => ({
      month: p.month,
      tws: null,
      gws: null,
      yhat: p.yhat,
      band: [p.lo, p.hi] as [number, number],
    })),
  ];

  const yearTicks = rows
    .filter((r) => r.month.endsWith("-01") && parseInt(r.month) % 2 === 0)
    .map((r) => r.month);

  return (
    <div dir="ltr" className="h-[300px] w-full">
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <XAxis
            dataKey="month"
            ticks={yearTicks}
            tickFormatter={(m: string) => m.slice(0, 4)}
            stroke="#5C7191"
            tick={{ fontSize: 11 }}
          />
          <YAxis stroke="#5C7191" tick={{ fontSize: 11 }} unit="" width={46} />
          <Tooltip
            contentStyle={{
              background: "#0B1422",
              border: "1px solid #1B2C44",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "#8FA3BF" }}
            formatter={(v: number | [number, number], name: string) => {
              const labels: Record<string, string> = {
                tws: t("tws_label"),
                gws: t("gws_label"),
                yhat: t("forecast_label"),
                band: t("forecast_band"),
              };
              if (Array.isArray(v)) return [`${v[0]} … ${v[1]} cm`, labels[name] ?? name];
              return [`${v} cm`, labels[name] ?? name];
            }}
          />
          {/* فجوة GRACE → GRACE-FO */}
          <ReferenceArea
            x1={tws.gap[0]}
            x2={tws.gap[1]}
            fill="#8FA3BF"
            fillOpacity={0.08}
            stroke="#8FA3BF"
            strokeOpacity={0.25}
            strokeDasharray="3 3"
            label={{
              value: t("grace_gap"),
              position: "insideTop",
              fill: "#8FA3BF",
              fontSize: 10,
            }}
          />
          {/* قطع MASCON عند 9/2024 */}
          <ReferenceLine
            x={tws.ends_at}
            stroke="#F59E0B"
            strokeDasharray="4 3"
            label={{ value: "9/2024", position: "insideTopRight", fill: "#F59E0B", fontSize: 10 }}
          />
          <ReferenceLine y={0} stroke="#27405F" strokeDasharray="2 4" />
          {/* نطاق الثقة */}
          <Area
            dataKey="band"
            name="band"
            stroke="none"
            fill="#F43F5E"
            fillOpacity={0.12}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="tws"
            name="tws"
            stroke="#38BDF8"
            strokeWidth={1.6}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="gws"
            name="gws"
            stroke="#2DD4BF"
            strokeWidth={1.4}
            strokeDasharray="5 3"
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="yhat"
            name="yhat"
            stroke="#F43F5E"
            strokeWidth={1.8}
            strokeDasharray="6 4"
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className={`mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-dim ${lang === "ar" ? "justify-end" : ""}`}>
        <span><span className="me-1 inline-block h-0.5 w-4 bg-cyanline align-middle" /> {t("tws_label")}</span>
        <span><span className="me-1 inline-block h-0.5 w-4 border-t-2 border-dashed border-teal-glow align-middle" /> {t("gws_label")}</span>
        <span><span className="me-1 inline-block h-0.5 w-4 border-t-2 border-dashed border-flag-red align-middle" /> {t("forecast_label")}</span>
        <span className="text-ink-mute">{t("backtest")}: ±{forecast.grace_forecast.backtest_mae_cm} cm</span>
      </div>
    </div>
  );
}
