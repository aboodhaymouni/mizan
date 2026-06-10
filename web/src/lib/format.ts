/** تنسيق الأرقام — أرقام لاتينية عالية الوضوح في الاتجاهين (لوحات التحكم) */

const nf = new Intl.NumberFormat("en-US");

export function fmt(n: number): string {
  return nf.format(Math.round(n));
}

export function fmtCompact(n: number, lang: "ar" | "en" = "ar"): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}${lang === "ar" ? " مليار" : "B"}`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}${lang === "ar" ? " مليون" : "M"}`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}${lang === "ar" ? " ألف" : "K"}`;
  return fmt(n);
}

export function fmtMcm(m3: number, lang: "ar" | "en" = "ar"): string {
  const mcm = m3 / 1_000_000;
  return lang === "ar" ? `${mcm.toFixed(1)} م.م³` : `${mcm.toFixed(1)} MCM`;
}

export function fmtGps([lon, lat]: [number, number]): string {
  return `${lat.toFixed(4)}N ${lon.toFixed(4)}E`;
}

export const TIER_COLORS: Record<string, string> = {
  red: "#F43F5E",
  orange: "#F59E0B",
  green: "#10B981",
};

export const TIER_EMOJI: Record<string, string> = {
  red: "🔴",
  orange: "🟠",
  green: "🟢",
};
