import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
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
        "surface-dark": {
          DEFAULT: "hsl(var(--surface-dark))",
          foreground: "hsl(var(--surface-dark-foreground))",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["clamp(2.75rem, 5vw + 1rem, 5.5rem)", { lineHeight: "1.02", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-lg": ["clamp(2.25rem, 4vw + 1rem, 4rem)", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-md": ["clamp(1.75rem, 2.5vw + 1rem, 2.75rem)", { lineHeight: "1.1", letterSpacing: "-0.01em", fontWeight: "700" }],
        "display-sm": ["clamp(1.375rem, 1.5vw + 1rem, 1.75rem)", { lineHeight: "1.2", fontWeight: "700" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius)",
        sm: "var(--radius)",
        xl: "var(--radius)",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 8px 24px -8px rgb(0 0 0 / 0.10)",
        "card-hover": "0 4px 10px 0 rgb(0 0 0 / 0.06), 0 16px 32px -12px rgb(0 0 0 / 0.16)",
        header: "0 1px 0 0 hsl(var(--border))",
      },
      maxWidth: {
        container: "1440px",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
