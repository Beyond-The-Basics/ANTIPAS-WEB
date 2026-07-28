// The team's lineup, styled as a pitch graphic — adapted from a reference "Starting Lineup"
// template to Kickoff's own palette (brand green pitch, white player chips).
//
// Positions are stored per membership (lineup_position = slot index) so the captain can arrange
// the formation. When a lineup type is set the pitch shows exactly players_per_side positions:
// filled slots get a player chip, the rest render as empty placeholders. Members without an
// explicit position auto-fill the remaining slots (captain first) so the default still looks
// sensible before anyone drags anything.
//
// In editable mode (captain), chips are draggable and every slot — plus the subs strip — is a drop
// target: dropping swaps/moves players and reports the whole new arrangement via onReorder.

import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { GameType, Membership, Team } from "../api/types";
import { Avatar, SPORT_LABEL } from "./ui";

export interface LineupAssignment {
  user_id: string;
  position: number | null;
}

/** Row sizes, anchor-first, that fan out into a rough pyramid — decorative only, not tactical. */
function formationRows(count: number): number[] {
  if (count <= 1) return [count];
  if (count <= 3) return [1, count - 1];
  if (count <= 6) return [1, Math.ceil((count - 1) / 2), Math.floor((count - 1) / 2)];
  const rest = count - 1;
  const perRow = Math.ceil(rest / 3);
  const rows = [1];
  let remaining = rest;
  for (let i = 0; i < 3 && remaining > 0; i++) {
    const n = Math.min(perRow, remaining);
    rows.push(n);
    remaining -= n;
  }
  return rows;
}

/** Resolve members into `total` pitch slots (respecting explicit positions) plus a subs list. */
function buildSlots(members: Membership[], total: number): {
  slots: (Membership | null)[];
  subs: Membership[];
} {
  const placed = new Map<number, Membership>();
  const unplaced: Membership[] = [];
  for (const m of members) {
    const p = m.lineup_position;
    if (p !== null && p >= 0 && p < total && !placed.has(p)) placed.set(p, m);
    else unplaced.push(m);
  }
  // Captain first among the auto-filled, otherwise keep join order.
  unplaced.sort((a, b) => (a.role === "captain" ? -1 : b.role === "captain" ? 1 : 0));

  const slots: (Membership | null)[] = [];
  let ui = 0;
  for (let i = 0; i < total; i++) {
    if (placed.has(i)) slots.push(placed.get(i)!);
    else if (ui < unplaced.length) slots.push(unplaced[ui++]);
    else slots.push(null);
  }
  return { slots, subs: unplaced.slice(ui) };
}

function assignmentsFrom(slots: (Membership | null)[], subs: Membership[]): LineupAssignment[] {
  const out: LineupAssignment[] = [];
  slots.forEach((m, i) => m && out.push({ user_id: m.user_id, position: i }));
  subs.forEach((m) => out.push({ user_id: m.user_id, position: null }));
  return out;
}

function PlayerChip({
  name,
  jerseyNumber,
  draggable,
  onDragStart,
}: {
  name: string;
  jerseyNumber: number | null;
  draggable?: boolean;
  onDragStart?: () => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={`flex w-[76px] flex-none flex-col items-center gap-1.5 ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <div className="relative">
        <Avatar name={name} size={44} />
        {jerseyNumber !== null && (
          <div className="absolute -bottom-1 -end-1 flex h-[19px] w-[19px] items-center justify-center rounded-full border-2 border-white bg-brand-deep text-[10px] font-extrabold text-white">
            {jerseyNumber}
          </div>
        )}
      </div>
      <div className="w-full truncate rounded-full bg-white/95 px-1.5 py-[3px] text-center text-[10px] font-bold uppercase tracking-[.02em] text-ink">
        {name.split(" ")[0]}
      </div>
    </div>
  );
}

/** An unfilled lineup position — same footprint as PlayerChip so the rows stay aligned. */
function EmptyChip() {
  const { t } = useTranslation();
  return (
    <div className="flex w-[76px] flex-none flex-col items-center gap-1.5">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-white/50 text-white/60">
        <span className="text-lg font-bold leading-none">+</span>
      </div>
      <div className="w-full rounded-full bg-white/15 px-1.5 py-[3px] text-center text-[10px] font-bold uppercase tracking-[.02em] text-white/60">
        {t("lineup.open")}
      </div>
    </div>
  );
}

type DragSource = { kind: "slot"; index: number } | { kind: "sub"; index: number };

export function LineupCard({
  team,
  members,
  gameType,
  userName,
  editable = false,
  onReorder,
}: {
  team: Team;
  members: Membership[];
  gameType: GameType | null;
  userName: (id: string) => string;
  /** When true (captain), chips can be dragged between slots and the subs strip. */
  editable?: boolean;
  onReorder?: (assignments: LineupAssignment[]) => void;
}) {
  const { t } = useTranslation();
  const [drag, setDrag] = useState<DragSource | null>(null);

  const total = gameType?.players_per_side ?? members.length;
  const { slots, subs } = buildSlots(members, total);
  const rows = formationRows(total);

  // Consume slots row by row, anchor row (1) rendered at the bottom via flex-col-reverse.
  let cursor = 0;
  const rowsOfSlots = rows.map((size) => {
    const slice = slots.map((m, i) => ({ m, i })).slice(cursor, cursor + size);
    cursor += size;
    return slice;
  });

  const dropOnSlot = (target: number) => {
    if (!drag || !onReorder) return;
    const nextSlots = [...slots];
    const nextSubs = [...subs];
    if (drag.kind === "slot") {
      [nextSlots[drag.index], nextSlots[target]] = [nextSlots[target], nextSlots[drag.index]];
    } else {
      const mover = nextSubs.splice(drag.index, 1)[0];
      const displaced = nextSlots[target];
      nextSlots[target] = mover;
      if (displaced) nextSubs.push(displaced);
    }
    setDrag(null);
    onReorder(assignmentsFrom(nextSlots, nextSubs));
  };

  const dropOnSubs = () => {
    if (!drag || !onReorder || drag.kind !== "slot") return;
    const nextSlots = [...slots];
    const mover = nextSlots[drag.index];
    if (!mover) return;
    nextSlots[drag.index] = null;
    setDrag(null);
    onReorder(assignmentsFrom(nextSlots, [...subs, mover]));
  };

  const allowDrop = (e: React.DragEvent) => {
    if (editable) e.preventDefault();
  };

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">
            {t("lineup.startingLineup")}
          </div>
          <div className="text-lg font-extrabold">{team.name}</div>
        </div>
        {gameType && (
          <div className="rounded-full bg-brand-tint px-3 py-1.5 text-[12px] font-bold text-brand-deep">
            {gameType.label} · {SPORT_LABEL[team.sport]}
          </div>
        )}
      </div>

      {editable && (
        <div className="border-b border-line bg-canvas px-5 py-2 text-[11.5px] font-semibold text-muted">
          {t("lineup.dragHint")}
        </div>
      )}

      <div className="relative flex flex-col-reverse items-center gap-5 bg-brand bg-stripe-lg px-4 py-7">
        {/* Pitch markings — decorative, no meaning beyond "this is a pitch". */}
        <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-white/25" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />

        {total === 0 ? (
          <p className="relative text-center text-[12.5px] text-white/85">
            {t("lineup.noActiveMembers")}
          </p>
        ) : (
          rowsOfSlots.map((row, ri) => (
            <div key={ri} className="relative flex justify-center gap-4">
              {row.map(({ m, i }) => (
                <div
                  key={i}
                  onDragOver={allowDrop}
                  onDrop={() => dropOnSlot(i)}
                  className={editable ? "rounded-xl transition hover:bg-white/10" : ""}
                >
                  {m ? (
                    <PlayerChip
                      name={userName(m.user_id)}
                      jerseyNumber={m.jersey_number}
                      draggable={editable}
                      onDragStart={() => setDrag({ kind: "slot", index: i })}
                    />
                  ) : (
                    <EmptyChip />
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {(subs.length > 0 || editable) && (
        <div
          className="border-t border-line px-5 py-4"
          onDragOver={allowDrop}
          onDrop={dropOnSubs}
        >
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-muted">
            {t("lineup.subs")}
          </div>
          {subs.length === 0 ? (
            <p className="text-[12px] text-faint">
              {editable ? t("lineup.dropToBench") : t("lineup.none")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {subs.map((m, i) => (
                <div
                  key={m.id}
                  draggable={editable}
                  onDragStart={() => editable && setDrag({ kind: "sub", index: i })}
                  className={`rounded-full bg-canvas px-3 py-1.5 text-[12.5px] font-semibold text-ink-2 ${
                    editable ? "cursor-grab active:cursor-grabbing" : ""
                  }`}
                >
                  {m.jersey_number !== null && (
                    <span className="me-1 text-faint">#{m.jersey_number}</span>
                  )}
                  {userName(m.user_id)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
