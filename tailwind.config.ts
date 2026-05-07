import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0E1116",
          soft: "#1B2028",
          muted: "#5B6472"
        },
        paper: {
          DEFAULT: "#FAFAF7",
          soft: "#F2F1EC"
        },
        brand: {
          50: "#F0F7FF",
          100: "#DDEBFF",
          200: "#B6D4FF",
          300: "#85B5FF",
          400: "#5390F5",
          500: "#2F6FE0",
          600: "#1E54B8",
          700: "#163F8C",
          800: "#102E66",
          900: "#0A1F47"
        },
        accent: {
          warm: "#E8B26B",
          mint: "#7DCFB6",
          rose: "#E6A4B4"
        },
        signal: {
          ok: "#3FA66B",
          warn: "#D89B2C",
          alert: "#C45C5C",
          offline: "#8A6FB0"
        }
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"],
        serif: ["ui-serif", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      boxShadow: {
        soft: "0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.06)",
        ring: "0 0 0 4px rgba(47,111,224,0.15)"
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: []
};

export default config;
