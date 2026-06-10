"use client";
/** الشاشة 3 — طابور التفتيش (قلب المنتج): جدول مرتّب بالدرجة + بانل الدليل */
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import EvidencePanel from "@/components/EvidencePanel";
import { DemoBadge, StatusPill, TierDot } from "@/components/Badges";
import { getFields } from "@/lib/api";
import type { FieldProps, FieldsFC, FieldStatus } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { fmt, fmtGps } from "@/lib/format";

function QueueInner() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");

  const [fields, setFields] = useState<FieldsFC | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [flagFilter, setFlagFilter] = useState("");
  const [selected, setSelected] = useState<FieldProps | null>(null);

  useEffect(() => {
    getFields().then((fc) => {
      setFields(fc);
      if (focusId) {
        const f = fc.features.find((x) => x.properties.id === focusId);
        if (f) setSelected(f.properties);
      }
    });
  }, [focusId]);

  const rows = useMemo(() => {
    if (!fields) return [];
    return fields.features
      .map((f) => f.properties)
      .filter(
        (p) =>
          p.score >= minScore &&
          (!statusFilter || p.status === statusFilter) &&
          (!flagFilter || p.flag === flagFilter),
      )
      .sort((a, b) => a.rank - b.rank);
  }, [fields, minScore, statusFilter, flagFilter]);

  function onStatusChange(id: string, status: FieldStatus) {
    setFields((prev) =>
      prev
        ? {
            ...prev,
            features: prev.features.map((f) =>
              f.properties.id === id ? { ...f, properties: { ...f.properties, status } } : f,
            ),
          }
        : prev,
    );
  }

  const selectCls =
    "rounded-lg border border-space-700 bg-space-900 px-2 py-1.5 text-xs text-ink focus:border-teal-glow/60 focus:outline-none";

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h1 className="font-head text-2xl font-extrabold glow-text">{t("queue_title")}</h1>
          <p className="mt-1 text-xs text-ink-dim">{t("queue_sub")}</p>
        </div>
        <DemoBadge />
      </div>

      {/* الفلاتر */}
      <div className="panel flex flex-wrap items-center gap-3 p-3 text-xs">
        <label className="flex items-center gap-2 text-ink-dim">
          {t("filter_min_score")}
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="mizan-range w-36"
            dir="ltr"
          />
          <span className="num w-7 font-bold text-teal-glow">{minScore}</span>
        </label>
        <label className="flex items-center gap-2 text-ink-dim">
          {t("filter_status")}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
            <option value="">{t("all")}</option>
            <option value="new">{t("status_new")}</option>
            <option value="inspected">{t("status_inspected")}</option>
            <option value="confirmed">{t("status_confirmed")}</option>
            <option value="cleared">{t("status_cleared")}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-ink-dim">
          {t("filter_flag")}
          <select value={flagFilter} onChange={(e) => setFlagFilter(e.target.value)} className={selectCls}>
            <option value="">{t("all")}</option>
            <option value="NEW">{t("flag_new")}</option>
            <option value="EXPANDING">{t("flag_expanding")}</option>
            <option value="STABLE">{t("flag_stable")}</option>
          </select>
        </label>
        <span className="ms-auto text-ink-mute">
          <b className="num text-ink">{rows.length}</b> {t("results_count")}
        </span>
      </div>

      {/* الجدول — الأعمدة الثمانية */}
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[840px] text-sm">
          <thead>
            <tr className="border-b border-space-700 text-xs text-ink-mute">
              <th className="px-3 py-2.5 text-start">{t("col_rank")}</th>
              <th className="px-3 py-2.5 text-start">{t("col_id")}</th>
              <th className="px-3 py-2.5 text-start">{t("col_gps")}</th>
              <th className="px-3 py-2.5 text-start">{t("col_area")}</th>
              <th className="px-3 py-2.5 text-start">{t("col_first_seen")}</th>
              <th className="px-3 py-2.5 text-start">{t("col_volume")}</th>
              <th className="px-3 py-2.5 text-start">{t("col_score")}</th>
              <th className="px-3 py-2.5 text-start">{t("col_status")}</th>
              <th className="px-3 py-2.5 text-start">{t("col_evidence")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 120).map((p) => (
              <tr
                key={p.id}
                className={`queue-row ${selected?.id === p.id ? "bg-teal-glow/5" : ""}`}
                onClick={() => setSelected(p)}
              >
                <td className="num px-3 py-2 font-bold text-ink-dim">#{p.rank}</td>
                <td className="num px-3 py-2" dir="ltr">{p.id}</td>
                <td className="num px-3 py-2 text-xs text-ink-dim" dir="ltr">{fmtGps(p.centroid)}</td>
                <td className="num px-3 py-2">{p.area_ha}</td>
                <td className="num px-3 py-2">
                  {p.first_seen_year}
                  {p.flag === "NEW" && <span className="ms-1 text-[9px] text-flag-red">●</span>}
                  {p.flag === "EXPANDING" && <span className="ms-1 text-[9px] text-flag-orange">▲</span>}
                </td>
                <td className="num px-3 py-2 text-xs" dir="ltr">
                  {fmt(p.est_m3_low / 1000)}–{fmt(p.est_m3_high / 1000)}K
                </td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1.5">
                    <TierDot tier={p.tier} />
                    <b className="num">{p.score}</b>
                  </span>
                </td>
                <td className="px-3 py-2"><StatusPill status={p.status} /></td>
                <td className="px-3 py-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(p);
                    }}
                    className="rounded-lg border border-teal-glow/40 px-2.5 py-1 text-[11px] font-bold text-teal-glow transition-colors hover:bg-teal-glow/10"
                  >
                    {t("open_evidence")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!fields && <p className="py-16 text-center text-ink-mute">{t("loading")}</p>}
      </div>

      {selected && (
        <EvidencePanel field={selected} onClose={() => setSelected(null)} onStatusChange={onStatusChange} />
      )}
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense>
      <QueueInner />
    </Suspense>
  );
}
