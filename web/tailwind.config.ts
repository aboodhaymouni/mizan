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
        panel: "0 8px 30px rgba(2, 6, 16, 0.55)",
      },
      animation: {
        "pulse-dot": "pulseDot 1.6s ease-in-out infinite",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(1.6)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
