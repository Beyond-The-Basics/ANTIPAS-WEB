// The team's lineup, styled as a pitch graphic — adapted from a reference "Starting Lineup"
// template to Kickoff's own palette (brand green pitch, white player chips) rather than the
// reference's navy/yellow.
//
// One real gap versus the reference: there is no position data anywhere in the app (no GK/DEF/
// MID/FWD, no starter/sub flag) — only role (captain/admin/member) and, now, jersey number. So
// this does NOT place players by tactical position; it distributes them into rows that narrow
// toward a single anchor at the bottom (the captain), purely for the pitch-diagram look. The
// "starters" / subs split below the lineup size is ordered by who joined first, not a real
// selection — there's no field for that either.

import type { GameType, Membership, Team } from "../api/types";
import { Avatar, SPORT_LABEL } from "./ui";

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

function PlayerChip({
  name,
  jerseyNumber,
}: {
  name: string;
  jerseyNumber: number | null;
}) {
  return (
    <div className="flex w-[76px] flex-none flex-col items-center gap-1.5">
      <div className="relative">
        <Avatar name={name} size={44} />
        {jerseyNumber !== null && (
          <div className="absolute -bottom-1 -right-1 flex h-[19px] w-[19px] items-center justify-center rounded-full border-2 border-white bg-brand-deep text-[10px] font-extrabold text-white">
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

export function LineupCard({
  team,
  members,
  gameType,
  userName,
}: {
  team: Team;
  members: Membership[];
  gameType: GameType | null;
  userName: (id: string) => string;
}) {
  const startingCount = gameType?.players_per_side ?? members.length;
  const starters = members.slice(0, startingCount);
  const subs = members.slice(startingCount);
  const rows = formationRows(starters.length);

  // Consume `starters` row by row, anchor (captain if present, else first) at the bottom.
  const captain = starters.find((m) => m.role === "captain");
  const rest = starters.filter((m) => m.id !== captain?.id);
  const ordered = captain ? [captain, ...rest] : starters;
  let cursor = 0;
  const rowsOfMembers = rows.map((size) => {
    const slice = ordered.slice(cursor, cursor + size);
    cursor += size;
    return slice;
  });

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">
            Starting lineup
          </div>
          <div className="text-lg font-extrabold">{team.name}</div>
        </div>
        {gameType && (
          <div className="rounded-full bg-brand-tint px-3 py-1.5 text-[12px] font-bold text-brand-deep">
            {gameType.label} · {SPORT_LABEL[team.sport]}
          </div>
        )}
      </div>

      <div className="relative flex flex-col-reverse items-center gap-5 bg-brand bg-stripe-lg px-4 py-7">
        {/* Pitch markings — decorative, no meaning beyond "this is a pitch". */}
        <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-white/25" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />

        {starters.length === 0 ? (
          <p className="relative text-center text-[12.5px] text-white/85">
            No active members yet.
          </p>
        ) : (
          rowsOfMembers.map((row, i) => (
            <div key={i} className="relative flex justify-center gap-4">
              {row.map((m) => (
                <PlayerChip key={m.id} name={userName(m.user_id)} jerseyNumber={m.jersey_number} />
              ))}
            </div>
          ))
        )}
      </div>

      {subs.length > 0 && (
        <div className="border-t border-line px-5 py-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-muted">
            Subs
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] font-semibold text-ink-2">
            {subs.map((m) => (
              <span key={m.id}>
                {m.jersey_number !== null && (
                  <span className="mr-1 text-faint">#{m.jersey_number}</span>
                )}
                {userName(m.user_id)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
