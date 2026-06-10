"use client";
import { useLang } from "@/lib/i18n";

/** شارة «بيانات تجريبية · demo data» — إلزامية عند أي بيانات مولّدة (لا mock كحقيقي أبداً) */
export function DemoBadge({ small = false }: { small?: boolean }) {
  const { t } = useLang();
  return (
    <span
      title={t("demo_tooltip")}
      className={`inline-flex items-center gap-1 rounded-full border border-flag-orange/50 bg-flag-orange/10 font-body text-flag-orange ${
        small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-flag-orange" />
      {t("demo_badge")} · demo data
    </span>
  );
}

/** شارة «إشارة إقليمية ~300كم» — إلزامية بجانب منحنى GRACE (قاعدة الصياغة) */
export function RegionalBadge() {
  const { t } = useLang();
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-cyanline/40 bg-cyanline/10 px-2.5 py-1 text-xs text-cyanline">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="2" fill="currentColor" />
        <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="0.9" opacity="0.6" />
      </svg>
      {t("regional_badge")}
    </span>
  );
}

export function TierDot({ tier }: { tier: "red" | "orange" | "green" }) {
  const colors = { red: "bg-flag-red", orange: "bg-flag-orange", green: "bg-flag-green" };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${colors[tier]}`} />;
}

export function StatusPill({ status }: { status: string }) {
  const { t } = useLang();
  const map: Record<string, { cls: string; key: "status_new" | "status_inspected" | "status_confirmed" | "status_cleared" }> = {
    new: { cls: "border-cyanline/40 bg-cyanline/10 text-cyanline", key: "status_new" },
    inspected: { cls: "border-flag-orange/40 bg-flag-orange/10 text-flag-orange", key: "status_inspected" },
    confirmed: { cls: "border-flag-red/40 bg-flag-red/10 text-flag-red", key: "status_confirmed" },
    cleared: { cls: "border-flag-green/40 bg-flag-green/10 text-flag-green", key: "status_cleared" },
  };
  const m = map[status] ?? map.new;
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] ${m.cls}`}>{t(m.key)}</span>
  );
}
