import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0b1a2b",
          2: "#12253a",
        },
        cream: {
          DEFAULT: "#f3efe4",
          2: "#ebe4d4",
        },
        ink: "#1a1a1a",
        coral: "#e2554a",
        paper: "#fffdf8",
        grid: "#2d8f6f",
        "muted-ink": "#5a564c",
        // legado / utilitários de formulário
        panel: "#0b1a2b",
        panel2: "#12253a",
        field: "#fffdf8",
        line: "#1a1a1a",
        bright: "#f3efe4",
        dim: "#5a564c",
        faint: "#8a8478",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "0px",
        md: "0px",
        sm: "0px",
      },
      fontFamily: {
        sans: ["IBM Plex Mono", "ui-monospace", "monospace"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
        pixel: ["Press Start 2P", "ui-monospace", "monospace"],
        display: ["Press Start 2P", "ui-monospace", "monospace"],
      },
      boxShadow: {
        pixel: "4px 4px 0 #1a1a1a",
        "pixel-sm": "2px 2px 0 #1a1a1a",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
export default config
