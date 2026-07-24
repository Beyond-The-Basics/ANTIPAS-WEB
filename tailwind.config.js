/** @type {import('tailwindcss').Config} */
// Palette and radii are lifted verbatim from the Kickoff Design prototype
// ("Kickoff Web Client.dc.html") so screens can be ported without re-deriving values.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f4f5f4",
        ink: "#141414",
        "ink-2": "#333333",
        muted: "#6b7280",
        faint: "#9ca3a0",
        line: "#e4e6e4",
        "line-2": "#eceeec",
        brand: {
          DEFAULT: "#147A49",
          dark: "#0f6a3f",
          deep: "#0f5c37",
          tint: "#e2f0e9",
        },
        chip: "#eceeec",
        "chip-2": "#eef0ef",
        "chip-ink": "#5f6b64",
        "chip-ink-2": "#8a8f8a",
        // The marketing landing page runs a lighter, higher-contrast scale than the signed-in
        // app: white page, #f7f8f7 bands, hairline borders. Namespaced so it can't drift into
        // app screens by accident. Source: "Kickoff Landing.dc.html" design handoff.
        landing: {
          body: "#4b4f4b",
          quote: "#2a2d2a",
          band: "#f7f8f7",
          tint: "#eaf3ee",
          line: "#ececec",
          "line-strong": "#dcdedc",
          "line-hover": "#bfc3bf",
          divider: "#f0f0f0",
          hover: "#f2f3f2",
          "hover-soft": "#fafbfa",
        },
      },
      borderRadius: {
        card: "14px",
        panel: "16px",
        tile: "12px",
        field: "9px",
        btn: "10px",
        cta: "13px",
        feature: "18px",
        step: "20px",
        photo: "24px",
        band: "28px",
      },
      boxShadow: {
        float: "0 2px 8px rgba(0,0,0,.12)",
        pin: "0 4px 12px rgba(0,0,0,.12)",
        hero: "0 30px 60px -24px rgba(0,0,0,.32)",
        "float-card": "0 16px 34px -12px rgba(0,0,0,.28)",
        "btn-brand": "0 6px 16px -6px #147A49",
        "btn-brand-lg": "0 12px 26px -10px #147A49",
        "card-hover": "0 18px 40px -22px rgba(0,0,0,.25)",
        "cta-white": "0 14px 30px -12px rgba(0,0,0,.45)",
      },
      keyframes: {
        // The two cards that hover over the hero photo.
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        floaty: "floaty 5s ease-in-out infinite",
      },
      backgroundImage: {
        // The diagonal stripe used on match banners and the profile cover.
        stripe:
          "repeating-linear-gradient(135deg,#147A49,#147A49 12px,#0f6a3f 12px,#0f6a3f 24px)",
        "stripe-lg":
          "repeating-linear-gradient(135deg,#147A49,#147A49 16px,#0f6a3f 16px,#0f6a3f 32px)",
        // Faint white stripe laid over the solid-green final CTA band.
        "cta-stripe":
          "repeating-linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.05) 18px,transparent 18px,transparent 36px)",
      },
    },
  },
  plugins: [],
};
