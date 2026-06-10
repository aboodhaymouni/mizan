"use client";
/** الشاشة 1 — لوحة القيادة الوطنية (إلهام التصميم mockup 2): خريطة قمر صناعي NASA حيّة + طبقات + KPIs + استراتيجية */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MapView, { Basemap } from "@/components/MapView";
import LayerPanel from "@/components/LayerPanel";
import StrategicPanel from "@/components/StrategicPanel";
import { DemoBadge, TierDot } from "@/components/Badges";
import {
  getAlerts, getBasins, getClimate, getExclusions, getFields, getImpact, getMeta, getValidation,
} from "@/lib/api";
import type { AlertItem, BasinsFC, ClimateData, FieldsFC, ImpactData, ValidationData } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { fmtMcm } from "@/lib/format";

export default function NationalMapPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [fields, setFields] = useState<FieldsFC | null>(null);
  const [basins, setBasins] = useState<BasinsFC | null>(null);
  const [exclusions, setExclusions] = useState<GeoJSON.FeatureCollection | null>(null);
  const [validation, setValidation] = useState<ValidationData | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [climate, setClimate] = useState<ClimateData | null>(null);
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [layers, setLayers] = useState({ fields: true, basins: true, validation: false });
  const [lastUpdate, setLastUpdate] = useState("");

  useEffect(() => {
    getFields().then(setFields).catch(console.error);
    getBasins().then(setBasins).catch(console.error);
    getExclusions().then(setExclusions).catch(() => {});
    getValidation().then(setValidation).catch(() => {});
    getAlerts().then(setAlerts).catch(() => {});
    getImpact().then(setImpact).catch(() => {});
    getClimate().then(setClimate).catch(() => {});
    getMeta().then((m) => setLastUpdate(m.generated_at.slice(0, 10))).catch(() => {});
  }, []);

  const stats = useMemo(() => {
    if (!fields) return null;
    const props = fields.features.map((f) => f.properties);
    return {
      total: props.length,
      reds: props.filter((p) => p.tier === "red").length,
      oranges: props.filter((p) => p.tier === "orange").length,
      m3mid: props.reduce((s, p) => s + (p.est_m3_low + p.est_m3_high) / 2, 0),
    };
  }, [fields]);

  return (
    <div className="grid gap-3 lg:grid-cols-[300px_1fr_300px]">
      {/* يمين (RTL): الطبقات + KPIs */}
      <aside className="order-2 space-y-3 lg:order-1">
        <div className="panel p-4">
          <h1 className="font-head text-lg font-extrabold leading-snug glow-text">{t("map_title")}</h1>
          <p className="mt-1 text-[11px] text-ink-dim">{t("app_tag")}</p>
        </div>

        {/* KPIs (إلهام mockup 2) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="panel border-flag-red/30 p-3 shadow-glow-red">
            <div className="kpi-number text-3xl text-flag-red">{stats ? stats.reds : "—"}</div>
            <div className="mt-0.5 text-[11px] text-ink-dim">{t("high_priority_zones")} 🔴</div>
          </div>
          <div className="panel border-flag-orange/20 p-3">
            <div className="kpi-number text-3xl text-flag-orange">{stats ? stats.oranges : "—"}</div>
            <div className="mt-0.5 text-[11px] text-ink-dim">{t("median_risk_zones")} 🟠</div>
          </div>
          <div className="panel col-span-2 p-3">
            <div className="kpi-number text-3xl text-teal-glow">{stats ? fmtMcm(stats.m3mid, lang) : "—"}</div>
            <div className="mt-0.5 text-[11px] text-ink-dim">{t("est_recoverable")}</div>
          </div>
          {climate && (
            <Link href="/timemachine" className="panel col-span-2 border-gold/30 bg-gold/5 p-3 shadow-glow-gold transition-transform hover:-translate-y-0.5">
              <div className="kpi-number text-3xl text-gold">{climate.rain_proof.mean_summer_mm}<span className="text-sm text-ink-mute"> mm</span></div>
              <div className="mt-0.5 text-[11px] text-ink-dim">
                {lang === "ar" ? "مطر الصيف (NASA POWER حقيقي)" : "summer rain (real NASA POWER)"}
              </div>
            </Link>
          )}
        </div>

        <LayerPanel
          basemap={basemap}
          onBasemap={setBasemap}
          layers={layers}
          onToggle={(k) => setLayers((s) => ({ ...s, [k]: !s[k] }))}
        />
      </aside>

      {/* الوسط: الخريطة */}
      <div className="relative order-1 lg:order-2">
        <MapView
          fields={fields}
          basins={layers.basins ? basins : null}
          exclusions={exclusions}
          validationSites={layers.validation && validation ? validation.sites : []}
          onFieldClick={(id) => router.push(`/queue?focus=${id}`)}
          className="h-[78vh] min-h-[520px]"
          showBasinLabels
          basemap={basemap}
          showFields={layers.fields}
        />
        <div className="absolute start-3 top-3 z-10 flex gap-2">
          <DemoBadge />
          {basemap === "satellite" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-flag-green/40 bg-space-950/80 px-2.5 py-1 text-[11px] font-bold text-flag-green backdrop-blur">
              🛰 {t("nasa_live_badge")}
            </span>
          )}
        </div>
        {lastUpdate && (
          <span className="absolute bottom-3 end-3 z-10 rounded-lg bg-space-950/80 px-2.5 py-1 text-[10px] text-ink-mute backdrop-blur">
            {t("last_update")}: <span dir="ltr" className="num">{lastUpdate}</span> · {t("approx_boundaries")}
          </span>
        )}
      </div>

      {/* يسار (RTL): الاستراتيجية + التنبيهات */}
      <aside className="order-3 space-y-3">
        <StrategicPanel impact={impact} />
        <div className="panel p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-teal-glow">{t("top_alerts")}</h2>
            <Link href="/queue" className="text-[11px] text-cyanline hover:underline">{t("view_queue")} ←</Link>
          </div>
          <ul className="space-y-1">
            {alerts.slice(0, 6).map((a) => (
              <li key={a.id}>
                <Link href={`/queue?focus=${a.id}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-space-800">
                  <span className="flex items-center gap-2"><TierDot tier={a.tier} /><span dir="ltr" className="num">{a.id}</span></span>
                  <span className="num text-ink-dim">{a.area_ha} ha · <b style={{ color: "#F43F5E" }}>{a.score}</b></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
