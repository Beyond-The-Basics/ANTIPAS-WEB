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
      },
      borderRadius: {
        card: "14px",
        panel: "16px",
        tile: "12px",
        field: "9px",
      },
      boxShadow: {
        float: "0 2px 8px rgba(0,0,0,.12)",
        pin: "0 4px 12px rgba(0,0,0,.12)",
      },
      backgroundImage: {
        // The diagonal stripe used on match banners and the profile cover.
        stripe:
          "repeating-linear-gradient(135deg,#147A49,#147A49 12px,#0f6a3f 12px,#0f6a3f 24px)",
        "stripe-lg":
          "repeating-linear-gradient(135deg,#147A49,#147A49 16px,#0f6a3f 16px,#0f6a3f 32px)",
      },
    },
  },
  plugins: [],
};
