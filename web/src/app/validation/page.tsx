"use client";
/** التحقّق P7 — تطابق حالات بمواقع إنفاذ حقيقية (الإصلاح الكامل لقنبلة P7) */
import { useEffect, useState } from "react";
import MapView from "@/components/MapView";
import { DemoBadge } from "@/components/Badges";
import { getBasins, getFields, getValidation } from "@/lib/api";
import type { BasinsFC, FieldsFC, ValidationData } from "@/lib/types";
import { useLang } from "@/lib/i18n";

export default function ValidationPage() {
  const { t, lang } = useLang();
  const [validation, setValidation] = useState<ValidationData | null>(null);
  const [fields, setFields] = useState<FieldsFC | null>(null);
  const [basins, setBasins] = useState<BasinsFC | null>(null);

  useEffect(() => {
    getValidation().then(setValidation).catch(console.error);
    getFields({ min_score: 70 }).then(setFields).catch(() => {});
    getBasins().then(setBasins).catch(() => {});
  }, []);

  if (!validation) return <p className="py-24 text-center text-ink-mute">{t("loading")}</p>;
  const s = validation.stats;

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h1 className="font-head text-2xl font-extrabold glow-text">{t("validation_title")}</h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-dim">
            {lang === "ar" ? s.framing_ar : s.framing_en}
          </p>
        </div>
        <DemoBadge />
      </div>

      {/* الإحصاءات */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="panel border-teal-glow/30 p-4 text-center shadow-glow">
          <div className="kpi-number text-4xl text-teal-glow">
            {s.hits}<span className="text-xl text-ink-mute">/{s.in_scope}</span>
          </div>
          <div className="mt-1 text-[11px] text-ink-dim">{t("hits")} · {t("in_methodology")}</div>
        </div>
        <div className="panel p-4 text-center">
          <div className="kpi-number text-4xl">≤{validation.threshold_km}<span className="text-base text-ink-mute">km</span></div>
          <div className="mt-1 text-[11px] text-ink-dim">{t("threshold")}</div>
        </div>
        <div className="panel p-4 text-center">
          <div className="kpi-number text-4xl text-cyanline">×{s.lift}</div>
          <div className="mt-1 text-[11px] text-ink-dim">{t("lift")}</div>
        </div>
        <div className="panel p-4 text-center">
          <div className="kpi-number text-4xl">{s.red_area_pct}%</div>
          <div className="mt-1 text-[11px] text-ink-dim">{t("red_area")}</div>
        </div>
        <div className="panel p-4 text-center">
          <div className="kpi-number text-4xl text-flag-orange">{Math.round(s.precision_at_20 * 100)}%</div>
          <div className="mt-1 text-[11px] text-ink-dim">{t("precision20")}</div>
        </div>
      </div>
      <p className="px-1 text-[11px] text-ink-mute">
        {s.lift_note_ar} · {s.precision_note_ar} · {validation.threshold_note_ar}
      </p>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* الخريطة */}
        <div className="relative">
          <MapView
            fields={fields}
            basins={basins}
            validationSites={validation.sites}
            className="h-[480px]"
            showBasinLabels
          />
          <div className="absolute start-3 top-3 z-10"><DemoBadge /></div>
        </div>

        {/* جدول المواقع الستة */}
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-space-700 text-xs text-ink-mute">
                <th className="px-3 py-2.5 text-start">{lang === "ar" ? "الموقع" : "Site"}</th>
                <th className="px-3 py-2.5 text-start">{lang === "ar" ? "التفاصيل" : "Details"}</th>
                <th className="px-3 py-2.5 text-start">{lang === "ar" ? "النطاق" : "Scope"}</th>
              </tr>
            </thead>
            <tbody>
              {validation.sites.map((site) => (
                <tr key={site.id} className="border-b border-space-700/50">
                  <td className="px-3 py-2.5 align-top">
                    <div className="font-bold">{lang === "ar" ? site.name_ar : site.name_en}</div>
                    <div className="num text-[10px] text-ink-mute" dir="ltr">
                      {site.lat.toFixed(2)}N {site.lon.toFixed(2)}E · {site.date}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-top text-xs leading-relaxed text-ink-dim">
                    {lang === "ar" ? site.detail_ar : site.detail_en}
                    <div className="mt-0.5 text-[10px] text-ink-mute">{site.source}</div>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    {site.scope === "in_methodology" ? (
                      <span className="rounded-full border border-teal-glow/40 bg-teal-glow/10 px-2 py-0.5 text-[10px] text-teal-glow">
                        ✓ {site.hit ? t("hits") : t("in_methodology")}
                      </span>
                    ) : (
                      <span
                        className="rounded-full border border-space-600 bg-space-800 px-2 py-0.5 text-[10px] text-ink-dim"
                        title={lang === "ar" ? site.out_reason_ar ?? "" : site.out_reason_en ?? ""}
                      >
                        {t("out_methodology")}
                      </span>
                    )}
                    {site.scope === "out_of_methodology" && (
                      <p className="mt-1 max-w-[180px] text-[10px] leading-relaxed text-ink-mute">
                        {lang === "ar" ? site.out_reason_ar : site.out_reason_en}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-3 py-2 text-[10px] text-ink-mute">{s.mini_aoi_note_ar}</p>
        </div>
      </div>
    </div>
  );
}
