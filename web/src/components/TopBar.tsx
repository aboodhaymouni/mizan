"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { getMeta } from "@/lib/api";
import Logo from "./Logo";
import { DemoBadge } from "./Badges";

const NAV: { href: string; key: "nav_map" | "nav_basin" | "nav_queue" | "nav_impact" | "nav_validation" | "nav_methodology" }[] = [
  { href: "/", key: "nav_map" },
  { href: "/basin/azraq", key: "nav_basin" },
  { href: "/queue", key: "nav_queue" },
  { href: "/impact", key: "nav_impact" },
  { href: "/validation", key: "nav_validation" },
  { href: "/methodology", key: "nav_methodology" },
];

export default function TopBar() {
  const { lang, setLang, t } = useLang();
  const pathname = usePathname();
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    getMeta()
      .then((m) => setDemoMode(m.data_mode === "demo"))
      .catch(() => setDemoMode(true));
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-space-700/70 bg-space-950/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-[1700px] flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={36} />
          <span className="leading-tight">
            <span className="block font-head text-lg font-extrabold text-ink glow-text">
              {t("app_name")} <span className="text-teal-glow">MIZAN</span>
            </span>
            <span className="block text-[11px] text-ink-mute">{t("team")}</span>
          </span>
        </Link>

        <nav className="order-3 -mb-px flex w-full gap-1 overflow-x-auto pt-1 md:order-2 md:w-auto md:flex-1 md:justify-center md:pt-0">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href.split("/").slice(0, 2).join("/"));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-teal-glow/10 font-bold text-teal-glow shadow-glow"
                    : "text-ink-dim hover:bg-space-800 hover:text-ink"
                }`}
              >
                {t(n.key)}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 ms-auto flex items-center gap-2 md:order-3">
          {demoMode && <DemoBadge />}
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="rounded-lg border border-space-700 bg-space-800 px-3 py-1.5 text-sm font-bold text-ink-dim transition-colors hover:border-teal-glow/50 hover:text-teal-glow"
            aria-label="Switch language"
          >
            {lang === "ar" ? "EN" : "عربي"}
          </button>
        </div>
      </div>
    </header>
  );
}
