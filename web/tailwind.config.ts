import type { Config } from "tailwindcss";

/**
 * هوية "غرفة التحكّم الفضائية" — tokens من CONTRACTS.md §5
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        space: {
          950: "#060B14", // الخلفية الأساسية
          900: "#0B1422", // أسطح
          850: "#0E1A2B",
          800: "#122236", // أسطح مرتفعة
          700: "#1B2C44", // حدود
          600: "#27405F",
        },
        ink: {
          DEFAULT: "#E6EDF7",
          dim: "#8FA3BF",
          mute: "#5C7191",
        },
        teal: {
          glow: "#2DD4BF",
        },
        cyanline: "#38BDF8",
        // ذهبي سينمائي — لهجة آلة الزمن والعناوين الكبرى (إلهام التصميم)
        gold: {
          DEFAULT: "#E9B949",
          soft: "#F1C75B",
          deep: "#C99A2E",
        },
        flag: {
          red: "#F43F5E",
          orange: "#F59E0B",
          green: "#10B981",
        },
      },
      fontFamily: {
        head: ["var(--font-almarai)", "system-ui", "sans-serif"],
        body: ["var(--font-tajawal)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(45, 212, 191, 0.18)",
        "glow-red": "0 0 20px rgba(244, 63, 94, 0.35)",
        "glow-gold": "0 0 30px rgba(233, 185, 73, 0.25)",
        panel: "0 8px 30px rgba(2, 6, 16, 0.55)",
        cinematic: "0 20px 60px rgba(2, 6, 16, 0.7)",
      },
      fontSize: {
        hero: ["clamp(2.6rem, 6vw, 5.2rem)", { lineHeight: "1", letterSpacing: "-0.02em" }],
      },
      animation: {
        "pulse-dot": "pulseDot 1.6s ease-in-out infinite",
        "fade-up": "fadeUp 0.5s ease-out",
        scan: "scan 6s linear infinite",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(1.6)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
