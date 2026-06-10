import type { Metadata } from "next";
import { Almarai, Tajawal } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import TopBar from "@/components/TopBar";

const almarai = Almarai({
  weight: ["400", "700", "800"],
  subsets: ["arabic"],
  variable: "--font-almarai",
  display: "swap",
});

const tajawal = Tajawal({
  weight: ["400", "500", "700"],
  subsets: ["arabic", "latin"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ميزان MIZAN — نوزِن مياه الأردن المسروقة من الفضاء",
  description:
    "نظام فضائي–ذكي يكشف سرقة المياه الجوفية ويتنبّأ باستنزاف الخزانات في الأردن — GRACE-FO + Sentinel-2 + AI. AstroCode 2026 · Vcoders",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${almarai.variable} ${tajawal.variable} min-h-screen`}>
        <LangProvider>
          <TopBar />
          <main className="mx-auto max-w-[1700px] px-3 pb-8 pt-3 sm:px-5">{children}</main>
        </LangProvider>
      </body>
    </html>
  );
}
