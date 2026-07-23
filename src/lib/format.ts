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
