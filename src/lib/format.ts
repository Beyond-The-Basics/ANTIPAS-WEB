/** Date and countdown formatting for the labels the design asks for. */

/** "Sat, Aug 2" — plus the time when the value carries one. */
export function dateLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const day = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  // A date-only string ("2026-08-02") parses to midnight UTC; showing "12:00 AM"
  // for it would be inventing precision the API never sent.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateOnly) return day;
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

/** "18h" / "2 days" / "expired" — the design shows expiry as a countdown, not a timestamp. */
export function expiresLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const ms = new Date(value).getTime() - Date.now();
  if (Number.isNaN(ms)) return "—";
  if (ms <= 0) return "expired";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.floor(ms / 60_000))}m`;
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)} days`;
}

/** "Saturday, 8 Aug 2026" — the negotiation card's Date row, spelled out in full. */
export function fullDateLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "18:30" — 24h clock, matching the negotiation card's Time row. */
export function timeOnlyLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** "18:30 – 20:00", or just the start time when there's no end. */
export function timeRangeLabel(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return "—";
  return end ? `${timeOnlyLabel(start)} – ${timeOnlyLabel(end)}` : timeOnlyLabel(start);
}

/** "just now" / "2h ago" / "5 days ago" — Offer History timestamps. */
export function relativeTime(value: string | null | undefined): string {
  if (!value) return "—";
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms)) return "—";
  if (ms < 60_000) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
