import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"] },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        electric: "hsl(var(--electric))",
        cyan: { soft: "hsl(var(--cyan))" },
        danger: "hsl(var(--danger))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        navy: { 950: "#060d1f", 900: "#0a1530", 800: "#0f1f45", 700: "#16295a" },
      },
      borderRadius: { xl: "0.9rem", "2xl": "1.2rem" },
      boxShadow: { soft: "0 1px 2px rgba(10,21,48,.05), 0 4px 16px -4px rgba(10,21,48,.08)" },
    },
  },
  plugins: [],
};
export default config;
