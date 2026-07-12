import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f17",
        surface: "#131a26",
        surface2: "#1b2534",
        border: "#25324a",
        primary: "#22c55e",
        primaryDark: "#16a34a",
        accent: "#38bdf8",
        danger: "#ef4444",
        muted: "#8ba0bd",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
