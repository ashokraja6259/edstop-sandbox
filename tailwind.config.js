/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "var(--color-border)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          foreground: "var(--color-secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--color-destructive)",
          foreground: "var(--color-destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--color-muted)",
          foreground: "var(--color-muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--color-popover)",
          foreground: "var(--color-popover-foreground)",
        },
        card: {
          DEFAULT: "var(--color-card)",
          foreground: "var(--color-card-foreground)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          foreground: "var(--color-success-foreground)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          foreground: "var(--color-warning-foreground)",
        },
        error: {
          DEFAULT: "var(--color-error)",
          foreground: "var(--color-error-foreground)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          foreground: "var(--color-surface-foreground)",
        },
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
      },
      borderRadius: {
        lg: "16px",
        md: "12px",
        sm: "8px",
        xs: "4px",
      },
      fontFamily: {
        heading: ["Space Grotesk", "Inter", "sans-serif"],
        body: ["Space Grotesk", "Inter", "sans-serif"],
        caption: ["Space Grotesk", "Inter", "sans-serif"],
        data: ["Space Grotesk", "Inter", "sans-serif"],
        code: ["JetBrains Mono", "monospace"],
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
      boxShadow: {
        "geometric-sm": "0 2px 4px rgba(0, 0, 0, 0.3)",
        geometric: "0 4px 8px rgba(0, 0, 0, 0.3)",
        "geometric-md": "0 8px 16px rgba(0, 0, 0, 0.4)",
        "geometric-lg": "0 16px 24px rgba(0, 0, 0, 0.5)",
        "geometric-xl": "0 24px 48px rgba(0, 0, 0, 0.6)",
        "glow-purple": "0 0 20px rgba(124, 58, 237, 0.5)",
        "glow-pink": "0 0 20px rgba(236, 72, 153, 0.5)",
        "glow-blue": "0 0 20px rgba(79, 70, 229, 0.5)",
      },
      transitionDuration: {
        "250": "250ms",
        "400": "400ms",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        "bounce-out": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      ringWidth: {
        "3": "3px",
      },
      zIndex: {
        "100": "100",
        "200": "200",
        "300": "300",
        "400": "400",
      },
      keyframes: {
        "pulse-geometric": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "pulse-geometric": "pulse-geometric 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.4s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
      },
    },
  },
  plugins: [],
};