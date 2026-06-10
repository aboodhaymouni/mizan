/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  // تصدير ساكن لـ GitHub Pages (يُفعَّل عبر متغير البيئة في الـ CI فقط)
  ...(process.env.MIZAN_STATIC_EXPORT === "1"
    ? { output: "export", basePath, assetPrefix: basePath || undefined, trailingSlash: true }
    : {}),
  images: { unoptimized: true },
};

export default nextConfig;
