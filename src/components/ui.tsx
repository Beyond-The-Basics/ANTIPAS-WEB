// Primitives ported from the Kickoff Design prototype ("Kickoff Web Client.dc.html").
// The prototype expresses these as inline style objects (pill(), rolePill(), dot(), tabStyle(), …);
// here they are components so the palette lives in one place.

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { Sport, TeamRole } from "../api/types";
import i18n from "../i18n";

/** A live object indexed by key that always resolves through the current i18n language — reads
 * like a plain lookup object (`SPORT_LABEL[sport]`) at every existing call site, but re-resolves
 * on each access rather than baking in a translation at import time. Not itself reactive (a plain
 * property read doesn't subscribe a component to re-render), but every consumer already calls
 * `useTranslation()` for its own strings, which re-renders it on language change anyway. */
function labelLookup<K extends string>(namespace: string): Record<K, string> {
  return new Proxy({} as Record<K, string>, {
    get: (_target, prop: string) => i18n.t(`${namespace}.${prop}`),
  });
}

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

export const STATUS_LABEL = labelLookup<string>("status");

export function Pill({ value, label }: { value: string; label?: string }) {
  const { t } = useTranslation();
  const tone = PILL_TONE[value] ?? "bg-chip-2 text-chip-ink-2";
  return (
    <span
      className={`${tone} whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold capitalize`}
    >
      {label ?? t(`status.${value}`)}
    </span>
  );
}

export function RolePill({ role }: { role: TeamRole | null }) {
  const { t } = useTranslation();
  const captain = role === "captain";
  return (
    <span
      className={`${
        captain ? "bg-brand-tint text-brand-deep" : "bg-chip text-muted"
      } whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold capitalize`}
    >
      {role ? t(`role.${role}`) : "—"}
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

// Single-letter icon inside the sport badge — kept as abstract initials rather than translated,
// same idea as a logo mark.
const SPORT_LETTER: Record<Sport, string> = {
  soccer: "S",
  tennis: "T",
  paddle: "P",
  basketball: "B",
};

/** Sport glyphs for the places that read as a personal choice rather than a data label (the
 * profile's favourite-sports picker) — warmer than the abstract `SportDot` initials. Paddle has no
 * emoji of its own; the paddle-bat one is the closest read. */
export const SPORT_EMOJI: Record<Sport, string> = {
  soccer: "⚽",
  tennis: "🎾",
  paddle: "🏓",
  basketball: "🏀",
};

export const SPORT_LABEL = labelLookup<Sport>("sports");

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
    <div className="mb-5 mt-6 flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px border-b-2 px-4 py-2.5 text-[13.5px] font-semibold ${
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

/**
 * Spider/radar plot of a small set of 1..max ratings — the athletic profile's read *and* edit
 * surface, so it replaces the old row of `RatingDots` rather than decorating it. Every level on
 * every axis is a hit target when `onChange` is passed, which keeps the ratings editable without
 * needing a second control alongside the graph.
 *
 * Unrated axes plot at the centre (0) so the shape still closes; `null` stays distinct from 1 in
 * the data, it just has nowhere else to sit on the web.
 */
export function RadarChart({
  axes,
  max = 5,
  size = 360,
  onChange,
  handleLabel,
}: {
  axes: { key: string; label: string; value: number | null }[];
  max?: number;
  size?: number;
  onChange?: (key: string, next: number) => void;
  /** Accessible name for one level handle, e.g. t("profile.setTraitTo", { trait, level }). */
  handleLabel?: (trait: string, level: number) => string;
}) {
  // Deliberately wider than tall: the left/right axis labels stick out horizontally, and a square
  // box clips the longer ones (French "Endurance", English "Strength") once the value is appended.
  const width = size;
  const height = Math.round(size * 0.7);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.285;
  const count = axes.length;
  const angleOf = (i: number) => (Math.PI * 2 * i) / count - Math.PI / 2;
  const pointOf = (i: number, level: number) => {
    const r = (level / max) * radius;
    return [cx + Math.cos(angleOf(i)) * r, cy + Math.sin(angleOf(i)) * r] as const;
  };
  const polygon = (level: number) =>
    axes.map((_, i) => pointOf(i, level).join(",")).join(" ");

  const valuePoints = axes.map((a, i) => pointOf(i, a.value ?? 0));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-w-[360px]"
      role="img"
      aria-label={axes.map((a) => `${a.label}: ${a.value ?? "—"}/${max}`).join(", ")}
    >
      {/* rings + spokes */}
      {Array.from({ length: max }, (_, i) => i + 1).map((level) => (
        <polygon
          key={level}
          points={polygon(level)}
          className="fill-none stroke-line-2"
          strokeWidth={1}
        />
      ))}
      {axes.map((a, i) => {
        const [x, y] = pointOf(i, max);
        return (
          <line key={a.key} x1={cx} y1={cy} x2={x} y2={y} className="stroke-line-2" strokeWidth={1} />
        );
      })}

      {/* plotted shape */}
      <polygon
        points={valuePoints.map((p) => p.join(",")).join(" ")}
        className="fill-brand/25 stroke-brand"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* level hit targets — invisible until hovered, so the graph doesn't read as 20 dots */}
      {onChange &&
        axes.map((a, i) =>
          Array.from({ length: max }, (_, l) => l + 1).map((level) => {
            const [x, y] = pointOf(i, level);
            return (
              <circle
                key={`${a.key}-${level}`}
                cx={x}
                cy={y}
                r={7}
                role="button"
                tabIndex={0}
                aria-label={handleLabel?.(a.label, level) ?? `${a.label} ${level}`}
                onClick={() => onChange(a.key, level)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange(a.key, level);
                  }
                }}
                className="cursor-pointer fill-transparent hover:fill-brand/30 focus:outline-none focus-visible:fill-brand/40"
              />
            );
          }),
        )}

      {/* current value markers, drawn over the hit targets */}
      {axes.map((a, i) => {
        if (a.value == null) return null;
        const [x, y] = pointOf(i, a.value);
        return <circle key={a.key} cx={x} cy={y} r={3.5} className="pointer-events-none fill-brand" />;
      })}

      {/* axis labels, pushed just outside the outer ring */}
      {axes.map((a, i) => {
        const angle = angleOf(i);
        const x = cx + Math.cos(angle) * (radius + 16);
        const y = cy + Math.sin(angle) * (radius + 16);
        const cos = Math.cos(angle);
        const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
        // Nudge the top/bottom labels clear of the ring they'd otherwise sit on.
        const dy = Math.sin(angle) < -0.2 ? "-0.1em" : Math.sin(angle) > 0.2 ? "0.8em" : "0.35em";
        return (
          <text
            key={a.key}
            x={x}
            y={y}
            dy={dy}
            textAnchor={anchor}
            className="fill-ink-2 text-[11px] font-semibold"
          >
            {a.label}
            <tspan className="fill-faint"> {a.value ?? "—"}</tspan>
          </text>
        );
      })}
    </svg>
  );
}
