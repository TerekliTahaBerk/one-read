import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces — clean white / neutral
        ivory: "#FFFFFF",
        cream: "#F4F4F5",
        paper: "#FFFFFF",
        // Text — neutral grayscale
        ink: "#1A1A1A",
        graphite: "#3F3F46",
        ash: "#52525B",
        fog: "#A1A1AA",
        // Lines — neutral hairlines
        line: "#E4E4E7",
        "line-strong": "#D4D4D8",
        // Accent reserved for error/alert states only
        dawn: "#C0362C",
        "dawn-soft": "#E5B274",
        glow: "#F2D8A8",
        // --- Admin panel only ---------------------------------------------
        // Warm OneRead brand palette, scoped to the /admin surface. These are
        // additive: no public-site class references them, so restyling the
        // admin never repaints the marketing site. Single accent = dawn amber.
        // Neutral white base — matches the public site chrome (see the "read"
        // theme in lib/product-themes.ts). The single accent is driven by a CSS
        // variable so each product section can recolour it (OneArticle blue,
        // OneLingo purple, OneFilm mauve); the fallback is OneRead ink for
        // top-level pages and any surface outside the shell (e.g. login).
        admin: {
          bg: "#FFFFFF", // page canvas — white, like the site
          surface: "#FFFFFF", // cards / panels
          sink: "#F6F6F7", // recessed fill / table head / hover
          line: "#EAEAEA", // neutral hairline
          "line-strong": "#DADADA",
          ink: "#111111", // near-black — headings / neutral primary
          body: "#52525B", // body text
          muted: "#6B6B6B", // captions / eyebrow
          accent: "var(--admin-accent, #111111)",
          "accent-strong": "var(--admin-accent-strong, #000000)",
          "accent-tint": "var(--admin-accent-tint, #F2F2F2)", // active/selected wash
        },
      },
      boxShadow: {
        admin: "0 1px 2px rgba(17,17,17,0.04), 0 1px 3px rgba(17,17,17,0.03)",
        "admin-md":
          "0 1px 2px rgba(17,17,17,0.05), 0 10px 28px -14px rgba(17,17,17,0.16)",
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'ui-serif', 'Georgia', 'Cambria', 'serif'],
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      letterSpacing: {
        wordmark: "0.22em",
        eyebrow: "0.18em",
      },
      maxWidth: {
        prose: "34rem",
        column: "40rem",
      },
      animation: {
        "rise": "rise 900ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "rise-delayed": "rise 900ms cubic-bezier(0.16, 1, 0.3, 1) 120ms both",
        "rise-delayed-2": "rise 900ms cubic-bezier(0.16, 1, 0.3, 1) 240ms both",
        "rise-delayed-3": "rise 900ms cubic-bezier(0.16, 1, 0.3, 1) 360ms both",
        "rise-delayed-4": "rise 900ms cubic-bezier(0.16, 1, 0.3, 1) 480ms both",
        "fade-in": "fadeIn 600ms ease-out both",
        "draw-check": "drawCheck 500ms cubic-bezier(0.65, 0, 0.45, 1) 200ms both",
        "ray-pulse": "rayPulse 4s ease-in-out infinite",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        drawCheck: {
          "0%": { strokeDashoffset: "30" },
          "100%": { strokeDashoffset: "0" },
        },
        rayPulse: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "0.85" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
