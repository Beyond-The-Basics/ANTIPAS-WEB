/** @type {import('tailwindcss').Config} */
// Palette and radii are lifted verbatim from the Kickoff Design prototype
// ("Kickoff Web Client.dc.html") so screens can be ported without re-deriving values.
//
// Colors are CSS variables (RGB triplets, defined in src/styles.css under `:root`/`.dark`) rather
// than raw hex, so every semantic token below re-themes for dark mode without touching call sites.
// `withOpacity` keeps Tailwind's opacity modifiers (`bg-brand/10`) working through that indirection.
function withOpacity(varName) {
  return ({ opacityValue }) =>
    opacityValue === undefined
      ? `rgb(var(${varName}))`
      : `rgb(var(${varName}) / ${opacityValue})`;
}

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Discover 7b type system. `display` is for page-title scale only; `body` for everything
      // else on screens built to it. Arabic swaps both to Rubik (see src/styles.css).
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        body: ['"Instrument Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        canvas: withOpacity("--color-canvas"),
        surface: withOpacity("--color-surface"),
        ink: withOpacity("--color-ink"),
        "ink-2": withOpacity("--color-ink-2"),
        muted: withOpacity("--color-muted"),
        faint: withOpacity("--color-faint"),
        line: withOpacity("--color-line"),
        "line-2": withOpacity("--color-line-2"),
        brand: {
          DEFAULT: withOpacity("--color-brand"),
          dark: withOpacity("--color-brand-dark"),
          deep: withOpacity("--color-brand-deep"),
          tint: withOpacity("--color-brand-tint"),
        },
        chip: withOpacity("--color-chip"),
        "chip-2": withOpacity("--color-chip-2"),
        "chip-ink": withOpacity("--color-chip-ink"),
        "chip-ink-2": withOpacity("--color-chip-ink-2"),
        danger: {
          bg: withOpacity("--color-danger-bg"),
          border: withOpacity("--color-danger-border"),
          text: withOpacity("--color-danger-text"),
        },
        scrollbar: withOpacity("--color-scrollbar"),
        // The marketing landing page runs a lighter, higher-contrast scale than the signed-in
        // app: white page, #f7f8f7 bands, hairline borders. Namespaced so it can't drift into
        // app screens by accident. Source: "Kickoff Landing.dc.html" design handoff.
        landing: {
          body: withOpacity("--color-landing-body"),
          quote: withOpacity("--color-landing-quote"),
          band: withOpacity("--color-landing-band"),
          tint: withOpacity("--color-landing-tint"),
          line: withOpacity("--color-landing-line"),
          "line-strong": withOpacity("--color-landing-line-strong"),
          "line-hover": withOpacity("--color-landing-line-hover"),
          divider: withOpacity("--color-landing-divider"),
          hover: withOpacity("--color-landing-hover"),
          "hover-soft": withOpacity("--color-landing-hover-soft"),
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
        // Faint white stripe laid over the solid-brand final CTA band.
        "cta-stripe":
          "repeating-linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.05) 18px,transparent 18px,transparent 36px)",
      },
    },
  },
  plugins: [],
};
