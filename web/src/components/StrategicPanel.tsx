"use client";
/** لوحة الاستراتيجية — مؤشرات الأداء + القضايا + التوصية (إلهام التصميم mockup 2، أرقام ملحق أ) */
import Link from "next/link";
import type { ImpactData } from "@/lib/types";
import { useLang } from "@/lib/i18n";

export default function StrategicPanel({ impact }: { impact: ImpactData | null }) {
  const { t, lang } = useLang();
  const c = impact?.constants;

  const issues = [
    { key: "issue_closure", href: "/basin/azraq", tone: "text-flag-red" },
    { key: "issue_targeting", href: "/queue", tone: "text-flag-orange" },
    { key: "issue_recharge", href: "/methodology", tone: "text-cyanline" },
    { key: "issue_conservation", href: "/impact", tone: "text-teal-glow" },
  ] as const;

  return (
    <div className="space-y-3">
      {/* مؤشرات الأداء */}
      <div className="panel p-4">
        <h3 className="mb-3 font-head text-sm font-extrabold uppercase tracking-wide text-ink-dim">{t("kpi_performance")}</h3>
        <div className="space-y-3">
          <div className="flex items-end justify-between border-b border-space-700/60 pb-2">
            <span className="text-xs text-ink-dim">{t("national_deficit")}</span>
            <span className="kpi-number text-2xl text-flag-red">−{c ? c.overdraft_mcm : "—"}<span className="text-xs text-ink-mute"> MCM</span></span>
          </div>
          <div className="flex items-end justify-between border-b border-space-700/60 pb-2">
            <span className="text-xs text-ink-dim">{t("overdraft_rate")}</span>
            <span className="kpi-number text-2xl text-flag-orange">{c ? c.national_abstraction_pct : "—"}%</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-xs text-ink-dim">{t("alert_status")}</span>
            <span className="rounded-full border border-flag-red/40 bg-flag-red/10 px-2.5 py-1 text-xs font-bold text-flag-red">
              {lang === "ar" ? "حرج · الأزرق 215%" : "Critical · Azraq 215%"}
            </span>
          </div>
        </div>
      </div>

      {/* القضايا الاستراتيجية */}
      <div className="panel p-4">
        <h3 className="mb-2 font-head text-sm font-extrabold uppercase tracking-wide text-ink-dim">{t("strategic_issues")}</h3>
        <ul className="space-y-1">
          {issues.map((it) => (
            <li key={it.key}>
              <Link href={it.href} className="flex items-center justify-between rounded-lg px-2 py-2 text-xs transition-colors hover:bg-space-800">
                <span className="flex items-center gap-2">
                  <span className={`${it.tone}`}>●</span>
                  <span className="text-ink">{t(it.key)}</span>
                </span>
                <span className="text-ink-mute">{lang === "ar" ? "←" : "→"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* التوصية */}
      <Link href="/basin/azraq" className="block panel border-gold/30 bg-gold/5 p-4 shadow-glow-gold transition-transform hover:-translate-y-0.5">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gold">{t("recommendation")}</div>
        <div className="font-head text-base font-extrabold text-ink">{t("rec_azraq")}</div>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-dim">{t("rec_azraq_sub")}</p>
      </Link>
    </div>
  );
}
