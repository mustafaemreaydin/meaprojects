import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      fontFamily: {
        sans: ["Anta Trial", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        ink: {
          900: "var(--ink-900)",
          800: "var(--ink-800)",
          700: "var(--ink-700)",
          600: "var(--ink-600)",
          500: "var(--ink-500)",
          400: "var(--ink-400)",
          300: "var(--ink-300)",
          200: "var(--ink-200)",
          100: "var(--ink-100)",
        },
        paper: {
          50: "var(--paper-50)",
          100: "var(--paper-100)",
          200: "var(--paper-200)",
          300: "var(--paper-300)",
        },
        mist: {
          50: "var(--mist-50)",
          100: "var(--mist-100)",
          200: "var(--mist-200)",
          300: "var(--mist-300)",
          400: "var(--mist-400)",
          500: "var(--mist-500)",
          600: "var(--mist-600)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        bg: "var(--bg)",
        "bg-elevated": "var(--bg-elevated)",
        surface: "var(--surface)",
        border: "var(--border)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.06)",
        DEFAULT: "0 4px 12px rgba(0, 0, 0, 0.08)",
        lg: "0 12px 32px rgba(0, 0, 0, 0.12)",
        mist: "0 0 0 3px rgba(0, 0, 0, 0.12)",
      },
      fontSize: {
        "display-xl": ["56px", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "700" }],
        display: ["44px", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "700" }],
        h1: ["32px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" }],
        h2: ["24px", { lineHeight: "1.3", letterSpacing: "-0.015em", fontWeight: "600" }],
        h3: ["18px", { lineHeight: "1.4", letterSpacing: "-0.01em", fontWeight: "500" }],
        "body-lg": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        body: ["14px", { lineHeight: "1.6", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.4", letterSpacing: "0.02em", fontWeight: "500" }],
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        "slide-up": "slide-up 220ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
