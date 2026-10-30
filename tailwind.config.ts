import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // GREEN GENX brand palette
        brand: {
          50: "#effaf1",
          100: "#d8f3dc",
          200: "#b7e4c7",
          300: "#95d5b2",
          400: "#74c69d",
          500: "#52b788",
          600: "#40916c",
          700: "#2d6a4f",
          800: "#1b4332",
          900: "#081c15",
          950: "#04120d",
        },
        ink: {
          DEFAULT: "#0f1f17",
          soft: "#3d5247",
          mute: "#6b7f74",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(8, 28, 21, 0.05), 0 8px 24px -12px rgba(8, 28, 21, 0.12)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
