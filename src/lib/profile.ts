// Shared reference data for the onboarding wizard and the profile edit screen.

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

export const ATHLETIC_TRAITS: { key: AthleticTraitKey; label: string; hint: string }[] = [
  { key: "speed_rating", label: "Speed", hint: "Sprinting, quick breaks" },
  { key: "strength_rating", label: "Strength", hint: "Physical duels, power" },
  { key: "stamina_rating", label: "Stamina", hint: "Lasting the full match" },
  { key: "agility_rating", label: "Agility", hint: "Change of direction, balance" },
];
