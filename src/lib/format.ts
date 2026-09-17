/** Date and countdown formatting for the labels the design asks for.
 *
 * `dateLabel`/`fullDateLabel`/`timeOnlyLabel` take the active i18n language so month/weekday names
 * follow it (e.g. "sam." not "Sat" in French). `expiresLabel`/`relativeTime` take `t` directly
 * since "expired"/"ago"/"days" are words, not just a calendar format — call sites already have
 * `useTranslation()` for the rest of their strings.
 */

import type { TFunction } from "i18next";

/** "Sat, Aug 2" — plus the time when the value carries one. */
export function dateLabel(value: string | null | undefined, language: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const day = d.toLocaleDateString(language, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  // A date-only string ("2026-08-02") parses to midnight UTC; showing "12:00 AM"
  // for it would be inventing precision the API never sent.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateOnly) return day;
  const time = d.toLocaleTimeString(language, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

/** "18h" / "2 days" / "expired" — the design shows expiry as a countdown, not a timestamp. */
export function expiresLabel(value: string | null | undefined, t: TFunction): string {
  if (!value) return "—";
  const ms = new Date(value).getTime() - Date.now();
  if (Number.isNaN(ms)) return "—";
  if (ms <= 0) return t("common.time.expired");
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return t("common.time.minutesShort", { count: Math.max(1, Math.floor(ms / 60_000)) });
  if (hours < 48) return t("common.time.hoursShort", { count: hours });
  const days = Math.floor(hours / 24);
  return t(days === 1 ? "common.time.dayShort" : "common.time.daysShort", { count: days });
}

/** "Saturday, 8 Aug 2026" — the negotiation card's Date row, spelled out in full. */
export function fullDateLabel(value: string | null | undefined, language: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(language, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "18:30" — 24h clock, matching the negotiation card's Time row. */
export function timeOnlyLabel(value: string | null | undefined, language: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** "18:30 – 20:00", or just the start time when there's no end. */
export function timeRangeLabel(
  start: string | null | undefined,
  end: string | null | undefined,
  language: string,
): string {
  if (!start) return "—";
  return end
    ? `${timeOnlyLabel(start, language)} – ${timeOnlyLabel(end, language)}`
    : timeOnlyLabel(start, language);
}

/** "just now" / "2h ago" / "5 days ago" — Offer History timestamps. */
export function relativeTime(value: string | null | undefined, t: TFunction): string {
  if (!value) return "—";
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms)) return "—";
  if (ms < 60_000) return t("common.time.justNow");
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return t("common.time.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("common.time.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return t(days === 1 ? "common.time.dayAgo" : "common.time.daysAgo", { count: days });
}

/** "Sat 8 Aug · 18:30" — Discover's kick-off line: short day, day-first date, 24h clock. */
export function kickoffLabel(value: string | null | undefined, language: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const day = d.toLocaleDateString(language, { weekday: "short", day: "numeric", month: "short" });
  return `${day} · ${timeOnlyLabel(value, language)}`;
}
