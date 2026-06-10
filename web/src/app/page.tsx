"use client";
/** الشاشة 1 — الخريطة الوطنية: غرفة عمليات المياه الجوفية */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MapView from "@/components/MapView";
import { DemoBadge, TierDot } from "@/components/Badges";
import { getAlerts, getBasins, getExclusions, getFields, getMeta, getValidation } from "@/lib/api";
import type { AlertItem, BasinsFC, FieldsFC, ValidationData } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { fmt, fmtMcm, TIER_EMOJI } from "@/lib/format";

export default function NationalMapPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [fields, setFields] = useState<FieldsFC | null>(null);
  const [basins, setBasins] = useState<BasinsFC | null>(null);
  const [exclusions, setExclusions] = useState<GeoJSON.FeatureCollection | null>(null);
  const [validation, setValidation] = useState<ValidationData | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getFields().then(setFields).catch(console.error);
    getBasins().then(setBasins).catch(console.error);
    getExclusions().then(setExclusions).catch(() => {});
    getValidation().then(setValidation).catch(() => {});
    getAlerts().then(setAlerts).catch(() => {});
    getMeta().then((m) => setLastUpdate(m.generated_at.slice(0, 10))).catch(() => {});
  }, []);

  const stats = useMemo(() => {
    if (!fields) return null;
    const props = fields.features.map((f) => f.properties);
    const reds = props.filter((p) => p.tier === "red").length;
    const m3mid = props.reduce((s, p) => s + (p.est_m3_low + p.est_m3_high) / 2, 0);
    return { total: props.length, reds, m3mid };
  }, [fields]);

  return (
    <div className="grid gap-3 lg:grid-cols-[340px_1fr]">
      {/* الشريط الجانبي — يمين في RTL */}
      <aside className="space-y-3">
        <div className="panel p-4">
          <h1 className="font-head text-xl font-extrabold leading-snug glow-text">{t("map_title")}</h1>
          <p className="mt-1 text-xs text-ink-dim">{t("app_tag")}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="panel border-flag-red/30 p-3 shadow-glow-red">
            <div className="kpi-number text-3xl text-flag-red">{stats ? stats.reds : "—"}</div>
            <div className="mt-0.5 text-[11px] text-ink-dim">{t("red_flags")}</div>
          </div>
          <div className="panel p-3">
            <div className="kpi-number text-3xl">{stats ? stats.total : "—"}</div>
            <div className="mt-0.5 text-[11px] text-ink-dim">{t("suspect_fields")}</div>
          </div>
          <div className="panel col-span-2 p-3">
            <div className="kpi-number text-3xl text-teal-glow">
              {stats ? fmtMcm(stats.m3mid, lang) : "—"}
            </div>
            <div className="mt-0.5 text-[11px] text-ink-dim">{t("est_recoverable")}</div>
          </div>
        </div>

        {/* بحث */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (search.trim()) router.push(`/queue?focus=${encodeURIComponent(search.trim().toUpperCase())}`);
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search_placeholder")}
            className="w-full rounded-xl border border-space-700 bg-space-900 px-3 py-2 text-sm text-ink placeholder:text-ink-mute focus:border-teal-glow/60 focus:outline-none"
          />
        </form>

        {/* صحة الأحواض */}
        {basins && (
          <div className="panel p-3">
            <h2 className="mb-2 text-sm font-bold text-teal-glow">{t("basin_health")}</h2>
            <ul className="space-y-1.5">
              {basins.features.map((b) => (
                <li key={b.properties.id} className="flex items-center justify-between text-xs">
                  <Link
                    href={b.properties.status !== "context" ? `/basin/${b.properties.id}` : "#"}
                    className={b.properties.status !== "context" ? "text-ink hover:text-teal-glow" : "cursor-default text-ink-mute"}
                  >
                    {lang === "ar" ? b.properties.name_ar : b.properties.name_en}
                    {b.properties.closure_year && (
                      <span className="ms-1 rounded bg-flag-red/15 px-1 py-0.5 text-[9px] text-flag-red">
                        {t("basin_closed")}
                      </span>
                    )}
                  </Link>
                  {b.properties.exploitation_pct ? (
                    <span
                      className="num font-bold"
                      style={{ color: b.properties.status === "modeled" ? "#F43F5E" : "#F59E0B" }}
                      title={b.properties.exploitation_source ?? ""}
                    >
                      {b.properties.exploitation_pct}% <span className="text-[9px] text-ink-mute">{t("of_safe_yield")}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-ink-mute">{t("context_basin")}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* أعلى التنبيهات */}
        <div className="panel p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-teal-glow">{t("top_alerts")}</h2>
            <Link href="/queue" className="text-[11px] text-cyanline hover:underline">
              {t("view_queue")} ←
            </Link>
          </div>
          <ul className="space-y-1">
            {alerts.slice(0, 7).map((a) => (
              <li key={a.id}>
                <Link
                  href={`/queue?focus=${a.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-space-800"
                >
                  <span className="flex items-center gap-2">
                    <TierDot tier={a.tier} />
                    <span dir="ltr" className="num">{a.id}</span>
                  </span>
                  <span className="num text-ink-dim">
                    {a.area_ha} ha · <b style={{ color: "#F43F5E" }}>{a.score}</b>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* الطبقات + آخر تحديث */}
        <div className="panel space-y-2 p-3 text-xs">
          <label className="flex cursor-pointer items-center gap-2 text-ink-dim">
            <input
              type="checkbox"
              checked={showValidation}
              onChange={(e) => setShowValidation(e.target.checked)}
              className="accent-teal-500"
            />
            {t("layer_validation")}
          </label>
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-space-700 pt-2 text-[10px] text-ink-mute">
            <span>{TIER_EMOJI.red} ≥70</span>
            <span>{TIER_EMOJI.orange} 40–69</span>
            <span>{TIER_EMOJI.green} &lt;40</span>
            <span className="text-cyanline">▢ {t("layer_exclusions")}</span>
          </div>
          {lastUpdate && (
            <p className="text-[10px] text-ink-mute">
              {t("last_update")}: <span dir="ltr" className="num">{lastUpdate}</span> · {t("approx_boundaries")}
            </p>
          )}
        </div>
      </aside>

      {/* الخريطة */}
      <div className="relative">
        <MapView
          fields={fields}
          basins={basins}
          exclusions={exclusions}
          validationSites={showValidation && validation ? validation.sites : []}
          onFieldClick={(id) => router.push(`/queue?focus=${id}`)}
          className="h-[78vh] min-h-[480px]"
          showBasinLabels
        />
        <div className="absolute start-3 top-3 z-10">
          <DemoBadge />
        </div>
      </div>
    </div>
  );
}
