"use client";
/** مصفوفة الخطر — شبكة احتمال×أثر (إلهام التصميم mockup 1)، تُملأ من توزيع درجات الحقول */
import type { FieldsFC } from "@/lib/types";
import { useLang } from "@/lib/i18n";

const COLS = ["low", "med", "high"] as const;
const ROWS = ["high", "med", "low"] as const; // الأعلى أثراً في الأعلى

function cellColor(impact: string, prob: string): string {
  const score = ({ low: 0, med: 1, high: 2 } as Record<string, number>)[impact] +
                ({ low: 0, med: 1, high: 2 } as Record<string, number>)[prob];
  if (score >= 3) return "bg-flag-red/80 text-white";
  if (score >= 2) return "bg-flag-orange/70 text-space-950";
  return "bg-flag-green/60 text-space-950";
}

export default function RiskMatrix({ fields }: { fields: FieldsFC | null }) {
  const { t, lang } = useLang();
  // تصنيف الحقول إلى خلايا: الأثر = المساحة، الاحتمال = الدرجة
  const grid: Record<string, number> = {};
  if (fields) {
    for (const f of fields.features) {
      const p = f.properties;
      const prob = p.score >= 70 ? "high" : p.score >= 40 ? "med" : "low";
      const impact = p.area_ha >= 25 ? "high" : p.area_ha >= 10 ? "med" : "low";
      const k = `${impact}_${prob}`;
      grid[k] = (grid[k] || 0) + 1;
    }
  }
  const probLabel = lang === "ar" ? ["منخفض", "متوسط", "عالٍ"] : ["Low", "Med", "High"];
  const impactLabel = lang === "ar" ? ["عالٍ", "متوسط", "منخفض"] : ["High", "Med", "Low"];

  return (
    <div>
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-dim">{t("risk_matrix")}</div>
      <div className="flex gap-1.5">
        <div className="flex flex-col justify-around pe-1 text-[9px] text-ink-mute">
          {impactLabel.map((l) => <span key={l}>{l}</span>)}
        </div>
        <div>
          <div className="grid grid-cols-3 gap-1">
            {ROWS.map((impact) =>
              COLS.map((prob) => {
                const n = grid[`${impact}_${prob}`] || 0;
                return (
                  <div
                    key={`${impact}_${prob}`}
                    className={`flex h-9 w-9 items-center justify-center rounded text-xs font-bold ${cellColor(impact, prob)} ${n === 0 ? "opacity-30" : ""}`}
                  >
                    {n}
                  </div>
                );
              }),
            )}
          </div>
          <div className="mt-1 flex justify-around text-[9px] text-ink-mute">
            {probLabel.map((l) => <span key={l}>{l}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
