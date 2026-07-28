// Shared reference data for the onboarding wizard and the profile edit screen.

import i18n from "../i18n";

/** Morocco first and pre-selected, per the product's initial market; the rest cover where the
 * design's testimonials (Austin, Dallas, Miami) and common opponents come from. Free text would
 * let data drift ("Morrocco", "morocco", "MA") — a fixed list keeps it queryable later. */
export const COUNTRIES = [
  "Morocco",
  "France",
  "Spain",
  "Portugal",
  "United States",
  "United Kingdom",
  "Germany",
  "Belgium",
  "Netherlands",
  "United Arab Emirates",
  "Tunisia",
  "Algeria",
  "Egypt",
  "Canada",
] as const;

export const DEFAULT_COUNTRY: (typeof COUNTRIES)[number] = "Morocco";

export type AthleticTraitKey = "speed_rating" | "strength_rating" | "stamina_rating" | "agility_rating";

// `label`/`hint` are live getters resolved through i18n at read time (same idea as
// `SPORT_LABEL` in ui.tsx) so `ATHLETIC_TRAITS.map(t => t.label)` call sites don't need to change
// or juggle a `t` function of their own — handy since both call sites already use `t` as their
// loop variable name for "trait".
export const ATHLETIC_TRAITS: { key: AthleticTraitKey; label: string; hint: string }[] = [
  {
    key: "speed_rating",
    get label() {
      return i18n.t("traits.speed.label");
    },
    get hint() {
      return i18n.t("traits.speed.hint");
    },
  },
  {
    key: "strength_rating",
    get label() {
      return i18n.t("traits.strength.label");
    },
    get hint() {
      return i18n.t("traits.strength.hint");
    },
  },
  {
    key: "stamina_rating",
    get label() {
      return i18n.t("traits.stamina.label");
    },
    get hint() {
      return i18n.t("traits.stamina.hint");
    },
  },
  {
    key: "agility_rating",
    get label() {
      return i18n.t("traits.agility.label");
    },
    get hint() {
      return i18n.t("traits.agility.hint");
    },
  },
];
