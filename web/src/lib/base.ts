/**
 * مسار أساسي للنشر تحت مسار فرعي (GitHub Pages: /mizan).
 * فارغ محلياً (NEXT_PUBLIC_BASE_PATH غير مضبوط) — لا يكسر التطوير.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** يسبق المسارات المحلية (data/، nasa/) بالمسار الأساسي — للأصول غير المُدارة بـ next/link */
export function asset(p: string): string {
  if (/^https?:\/\//.test(p)) return p; // روابط مطلقة (GIBS…) تُترك
  return `${BASE_PATH}${p.startsWith("/") ? "" : "/"}${p}`;
}
