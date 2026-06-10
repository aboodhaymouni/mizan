/** الشاشة 2 — غلاف خادمي: يوفّر generateStaticParams للتصدير الساكن ثم يعرض مكوّن العميل */
import BasinClient from "./BasinClient";

export function generateStaticParams() {
  // الأحواض المنمذجة (azraq أساسي، amman_zarqa ثانوي) — لتصدير GitHub Pages الساكن
  return [{ id: "azraq" }, { id: "amman_zarqa" }];
}

export default function BasinPage({ params }: { params: { id: string } }) {
  return <BasinClient basinId={params.id || "azraq"} />;
}
