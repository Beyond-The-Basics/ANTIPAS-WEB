// Primitives ported from the Kickoff Design prototype ("Kickoff Web Client.dc.html").
// The prototype expresses these as inline style objects (pill(), rolePill(), dot(), tabStyle(), …);
// here they are components so the palette lives in one place.

import type { ReactNode } from "react";

import type { Sport, TeamRole } from "../api/types";

// --- status pills -------------------------------------------------------------

/** Prototype `pill()`: three visual buckets across every status enum in the API. */
const PILL_TONE: Record<string, string> = {
  open: "bg-chip text-chip-ink",
  pending: "bg-chip text-chip-ink",
  confirmed: "bg-brand-tint text-brand-deep",
  played: "bg-brand-tint text-brand-deep",
  declined: "bg-chip-2 text-chip-ink-2",
  withdrawn: "bg-chip-2 text-chip-ink-2",
  closed: "bg-chip-2 text-chip-ink-2",
  expired: "bg-chip-2 text-chip-ink-2",
  cancelled_by_a: "bg-chip-2 text-chip-ink-2",
  cancelled_by_b: "bg-chip-2 text-chip-ink-2",
};

/** `cancelled_by_a` reads badly in a pill; the API has no display name for it. */
export function statusLabel(value: string): string {
  return value.replace(/_/g, " ");
}

export function Pill({ value, label }: { value: string; label?: string }) {
  const tone = PILL_TONE[value] ?? "bg-chip-2 text-chip-ink-2";
  return (
    <span
      className={`${tone} whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold capitalize`}
    >
      {label ?? statusLabel(value)}
    </span>
  );
}

export function RolePill({ role }: { role: TeamRole | null }) {
  const captain = role === "captain";
  return (
    <span
      className={`${
        captain ? "bg-brand-tint text-brand-deep" : "bg-chip text-muted"
      } whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold capitalize`}
    >
      {role ?? "—"}
    </span>
  );
}

// --- identity -----------------------------------------------------------------

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full bg-line font-bold text-[#3a3a3a]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}

/** Overlapping avatars with a `+n` chip, as on the Teams list rows. */
export function AvatarStack({ names, total }: { names: string[]; total: number }) {
  const shown = names.slice(0, 3);
  const overflow = Math.max(0, total - shown.length);
  return (
    <div className="flex flex-none">
      {shown.map((n, i) => (
        <div
          key={`${n}-${i}`}
          className="flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 border-white bg-line text-[9.5px] font-bold text-[#3a3a3a]"
          style={{ marginRight: -9 }}
          title={n}
        >
          {initials(n)}
        </div>
      ))}
      {overflow > 0 && (
        <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 border-white bg-chip text-[9.5px] font-bold text-muted">
          +{overflow}
        </div>
      )}
    </div>
  );
}

const SPORT_LETTER: Record<Sport, string> = { soccer: "S", tennis: "T", paddle: "P" };
export const SPORT_LABEL: Record<Sport, string> = {
  soccer: "Soccer",
  tennis: "Tennis",
  paddle: "Paddle",
};

/** Prototype `dot()` — a rounded green square carrying the sport's initial. */
export function SportDot({ sport, size = 22 }: { sport: Sport; size?: number }) {
  return (
    <div
      className="flex flex-none items-center justify-center bg-brand font-bold text-white"
      style={{ width: size, height: size, borderRadius: 7, fontSize: size * 0.5 }}
      title={SPORT_LABEL[sport]}
    >
      {SPORT_LETTER[sport]}
    </div>
  );
}

/** The small square marker used to type a row in a mixed list. */
export function TypeDot() {
  return <div className="h-[9px] w-[9px] flex-none rounded-[3px] bg-brand" />;
}

/** Compact "discoverable within Xkm" badge for a PlayerAvailability card. */
export function RadiusChip({ km }: { km: number | null }) {
  if (km == null) return null;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-bold text-brand-deep">
      📍 {km} km
    </span>
  );
}

// --- surfaces -----------------------------------------------------------------

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-tile border border-line bg-white ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="mb-1 text-[26px] font-bold">{title}</h1>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3.5 text-[13px] font-bold uppercase tracking-[.05em] text-muted">
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-tile border border-dashed border-line p-[18px] text-[12.5px] text-faint">
      {children}
    </div>
  );
}

// --- controls -----------------------------------------------------------------

type ButtonVariant = "primary" | "ghost";

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  type = "button",
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  title?: string;
}) {
  const tone =
    variant === "primary"
      ? "bg-brand text-white border border-transparent hover:bg-brand-dark"
      : "bg-white text-ink-2 border border-line hover:bg-canvas";
  const dims =
    size === "sm" ? "px-3 py-1.5 text-[12.5px] rounded-[7px]" : "px-4 py-2.5 text-[13px] rounded-field";
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex-none font-semibold ${tone} ${dims} ${className}`}
    >
      {children}
    </button>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="mb-5 mt-6 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px flex-none whitespace-nowrap border-b-2 px-4 py-2.5 text-[13.5px] font-semibold ${
            active === t.id
              ? "border-brand text-ink"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1.5 text-[11.5px] font-semibold text-muted">{children}</div>
  );
}

/** Short id for compact display, full value in a tooltip. */
export function ShortId({ id }: { id: string }) {
  return (
    <span className="font-mono text-[11px] text-faint" title={id}>
      {id.slice(0, 8)}
    </span>
  );
}

/**
 * A 1-5 self-rating control: five dots, filled up to `value`. Used for the onboarding wizard's
 * athletic characteristics and their read/edit surface on the profile page.
 *
 * Read-only when `onChange` is omitted (renders plain `<span>`s instead of `<button>`s, so it
 * can't take focus or announce as interactive where there's nothing to do).
 */
export function RatingDots({
  value,
  onChange,
  max = 5,
}: {
  value: number | null;
  onChange?: (next: number) => void;
  max?: number;
}) {
  const dots = Array.from({ length: max }, (_, i) => i + 1);
  const Dot = onChange ? "button" : "span";
  return (
    <div className="flex items-center gap-1.5" role={onChange ? "group" : undefined}>
      {dots.map((n) => (
        <Dot
          key={n}
          type={onChange ? "button" : undefined}
          aria-label={onChange ? `Set to ${n}` : undefined}
          onClick={onChange ? () => onChange(n) : undefined}
          className={`h-3 w-3 rounded-full border transition-colors ${
            value !== null && n <= value
              ? "border-brand bg-brand"
              : "border-line-2 bg-transparent"
          } ${onChange ? "cursor-pointer hover:border-brand" : ""}`}
        />
      ))}
    </div>
  );
}
