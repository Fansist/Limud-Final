import type { Config } from "tailwindcss";

// Limud design system. Source of truth: VISUAL DESIGN BRIEF.
// Calm, modern, education-grade. Inter type. Primary blue + accent
// fuchsia. Soft shadows. Rounded-2xl cards.
//
// Backwards-compatible aliases at the bottom map the original
// brand/ink/paper/signal/accent token names (used by the v0.1 role
// surfaces) to the new design system, so older code re-skins to the
// new look without rewrites.

const primary = {
  50:  "#eff6ff",
  100: "#dbeafe",
  200: "#bfdbfe",
  300: "#93c5fd",
  400: "#60a5fa",
  500: "#3b82f6",
  600: "#2563eb",
  700: "#1d4ed8",
  800: "#1e40af",
  900: "#1e3a8a",
  950: "#172554"
};

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  // Multiple theme strategies enabled by class:
  //   html.dark               -> dark mode
  //   html.theme-green        -> green primary (emerald) override
  //   html.dark.oled          -> AMOLED pure-black background
  //   body.high-contrast      -> WCAG triple-A contrast
  //   body.dyslexia-font      -> OpenDyslexic + relaxed spacing
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary,
        accent: {
          50:  "#fdf4ff",
          100: "#fae8ff",
          200: "#f5d0fe",
          300: "#f0abfc",
          400: "#e879f9",
          500: "#d946ef",
          600: "#c026d3",
          700: "#a21caf",
          800: "#86198f",
          900: "#701a75"
        },
        success: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d"
        },
        warning: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f"
        },
        // Gamification (only on student-facing reward surfaces).
        gold:   "#FFD700",
        xp:     "#8B5CF6",
        streak: "#F97316",
        coin:   "#EAB308",

        // ---- Backwards-compatibility aliases (v0.1 tokens) ----
        // Existing role-surface code references these names. Map them
        // to the new system so the redesign propagates automatically.
        brand: primary,
        ink: {
          DEFAULT: "#111827", // gray-900
          soft:    "#374151", // gray-700
          muted:   "#6b7280"  // gray-500
        },
        paper: {
          DEFAULT: "#f9fafb", // gray-50
          soft:    "#f3f4f6"  // gray-100
        },
        signal: {
          ok:      "#22c55e", // success-500
          warn:    "#f59e0b", // warning-500
          alert:   "#dc2626", // red-600
          offline: "#8b5cf6"  // xp purple — used for AI-offline badge
        }
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif"
        ],
        serif: ["ui-serif", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        dyslexia: [
          "OpenDyslexic",
          "Comic Sans MS",
          "var(--font-inter)",
          "system-ui",
          "sans-serif"
        ]
      },
      boxShadow: {
        sm:     "0 1px 2px 0 rgba(15, 23, 42, 0.05)",
        DEFAULT:"0 1px 3px 0 rgba(15, 23, 42, 0.1), 0 1px 2px -1px rgba(15, 23, 42, 0.06)",
        md:     "0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06)",
        lg:     "0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.08)",
        // Brief §5: blue-tinted glows for FAB + AI-active indicator.
        "glow-sm": "0 0 10px -1px rgba(59, 130, 246, 0.3)",
        glow:      "0 0 20px -2px rgba(59, 130, 246, 0.4)",
        "glow-lg": "0 0 30px -4px rgba(59, 130, 246, 0.5)",
        // Backwards-compat alias used by v0.1 role surfaces.
        soft:   "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)",
        ring:   "0 0 0 4px rgba(59,130,246,0.15)"
      },
      borderRadius: {
        // Brief §4: cards rounded-2xl (1rem); buttons/inputs rounded-xl
        // (0.75rem). xl2 alias kept for legacy callers.
        xl2: "1rem"
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        "bounce-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" }
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(59,130,246,0.45)" },
          "50%":      { boxShadow: "0 0 24px 6px rgba(59,130,246,0.0)" }
        },
        "pulse-ring": {
          "0%":   { boxShadow: "0 0 0 0 rgba(59,130,246,0.6)" },
          "100%": { boxShadow: "0 0 0 12px rgba(59,130,246,0)" }
        },
        "coin-flip": {
          "0%, 100%": { transform: "rotateY(0deg)" },
          "50%":      { transform: "rotateY(180deg)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-10px)" }
        },
        sparkle: {
          "0%, 100%": { opacity: "0", transform: "scale(0.5)" },
          "50%":      { opacity: "1", transform: "scale(1.2)" }
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" }
        },
        "progress-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(59,130,246,0.45)" },
          "50%":      { boxShadow: "0 0 0 6px rgba(59,130,246,0)" }
        }
      },
      animation: {
        "fade-in":        "fade-in 0.5s ease-out",
        "slide-up":       "slide-up 0.3s ease-out",
        "scale-in":       "scale-in 0.3s ease-out",
        "bounce-slow":    "bounce-slow 2s ease-in-out infinite",
        "pulse-glow":     "pulse-glow 2s ease-in-out infinite",
        "pulse-ring":     "pulse-ring 1.5s ease-out infinite",
        "coin-flip":      "coin-flip 0.6s ease-in-out",
        float:            "float 3s ease-in-out infinite",
        sparkle:          "sparkle 1s ease-out",
        shimmer:          "shimmer 2s linear infinite",
        "gradient-shift": "gradient-shift 4s ease-in-out infinite",
        "progress-pulse": "progress-pulse 2s ease-in-out infinite"
      },
      backgroundImage: {
        // Brief §10: hero / empty-state mesh — five soft radial
        // gradients, looks like the inside of an opal.
        "mesh-gradient": [
          "radial-gradient(at 12% 18%, rgba(59,130,246,0.18) 0px, transparent 55%)",
          "radial-gradient(at 88% 22%, rgba(217,70,239,0.16) 0px, transparent 50%)",
          "radial-gradient(at 22% 88%, rgba(45,212,191,0.18) 0px, transparent 55%)",
          "radial-gradient(at 78% 78%, rgba(251,146,60,0.14) 0px, transparent 50%)",
          "radial-gradient(at 50% 50%, rgba(167,139,250,0.12) 0px, transparent 55%)"
        ].join(","),
        "progress-bar": "linear-gradient(90deg, #6366f1, #8b5cf6, #d946ef)",
        "gradient-text": "linear-gradient(90deg, #2563eb, #c026d3)"
      },
      transitionTimingFunction: {
        emphasis: "cubic-bezier(0.2, 0.8, 0.2, 1)"
      }
    }
  },
  plugins: []
};

export default config;
