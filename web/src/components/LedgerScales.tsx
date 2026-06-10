"use client";
/**
 * دفتر الميزان — Mass-Balance Audit (إصلاح المراجعة #12):
 * كفة GRACE الإقليمية مقابل كفة المُفسَّر → «العجز المجهول» — GRACE بنيوي لا زخرفي
 */
import type { LedgerData } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { DemoBadge, RegionalBadge } from "./Badges";

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-ink-dim">
        <span>{label}</span>
        <span className="num font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-space-700">
        <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export default function LedgerScales({ ledger }: { ledger: LedgerData }) {
  const { t, lang } = useLang();
  const L = ledger.left_scale;
  const R = ledger.right_scale;
  const max = Math.max(L.total_demand_mcm, R.documented_abstraction_mcm + R.detected_fields_et_mcm) * 1.15;

  return (
    <div className="panel p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-head text-lg font-extrabold text-teal-glow">{t("ledger_title")}</h3>
        <div className="flex gap-2">
          <RegionalBadge />
          {ledger.is_demo && <DemoBadge small />}
        </div>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-ink-dim">
        {lang === "ar" ? ledger.explain_ar : ledger.explain_en}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="panel-raised space-y-3 p-3">
          <h4 className="text-sm font-bold text-cyanline">⚖ {t("ledger_left")}</h4>
          <Bar label={t("ledger_grace")} value={L.grace_regional_loss_mcm} max={max} color="#38BDF8" />
          <Bar label={t("ledger_recharge")} value={L.recharge_mcm} max={max} color="#27405F" />
          <div className="border-t border-space-700 pt-2 text-end">
            <span className="kpi-number text-xl text-cyanline">{L.total_demand_mcm}</span>
            <span className="ms-1 text-[11px] text-ink-mute">{t("ledger_unit")}</span>
          </div>
        </div>
        <div className="panel-raised space-y-3 p-3">
          <h4 className="text-sm font-bold text-teal-glow">⚖ {t("ledger_right")}</h4>
          <Bar label={t("ledger_documented")} value={R.documented_abstraction_mcm} max={max} color="#2DD4BF" />
          <Bar label={t("ledger_detected")} value={R.detected_fields_et_mcm} max={max} color="#10B981" />
          <div className="border-t border-space-700 pt-2 text-end">
            <span className="kpi-number text-xl text-teal-glow">
              {(R.documented_abstraction_mcm + R.detected_fields_et_mcm).toFixed(1)}
            </span>
            <span className="ms-1 text-[11px] text-ink-mute">{t("ledger_unit")}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-flag-red/40 bg-flag-red/10 p-3 text-center">
        <span className="text-xs text-ink-dim">{t("ledger_unknown")}</span>
        <div className="kpi-number text-3xl text-flag-red">
          {ledger.unknown_deficit_mcm} <span className="text-sm text-ink-mute">{t("ledger_unit")}</span>
        </div>
        <p className="mt-1 text-[10px] text-ink-mute">{ledger.method_note_ar}</p>
      </div>
    </div>
  );
}
