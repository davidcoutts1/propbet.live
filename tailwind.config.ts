import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#06090f",
        surface: "#0d131e",
        surface2: "#141c2b",
        elevated: "#1a2436",
        border: "#212c42",
        borderLight: "#2b3852",
        primary: "#22e08a",
        primaryDark: "#12b56b",
        accent: "#38bdf8",
        violet: "#8b5cf6",
        muted: "#8394ae",
        faint: "#5a6b86",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-grotesk)", "var(--font-inter)", "sans-serif"],
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #22e08a 0%, #14b8a6 45%, #38bdf8 100%)",
        "brand-radial":
          "radial-gradient(60% 60% at 50% 0%, rgba(34,224,138,0.18) 0%, rgba(56,189,248,0.06) 45%, transparent 100%)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,224,138,0.25), 0 8px 40px -8px rgba(34,224,138,0.35)",
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 12px 40px -20px rgba(0,0,0,0.7)",
        float: "0 20px 60px -20px rgba(0,0,0,0.8)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        shimmer: "shimmer 8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
