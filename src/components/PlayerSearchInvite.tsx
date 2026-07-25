// Search-by-name invite widget, shared by team creation (OnboardingPage-style wizard step) and
// the Recruiting tab on an existing team. Wraps `GET /users?q=` (server-side name search) +
// `POST /teams/{id}/roster-invitations` (the existing mutual-consent invite — the player still has
// to accept).
//
// Sport is a soft signal, not a filter: results are just sorted so players whose onboarding
// favorite_sports includes this team's sport surface first, with a small badge. Nobody is
// excluded — a captain can still invite anyone by name.

import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { Sport, User } from "../api/types";
import { useToast } from "../context/Toast";
import { Avatar, Button, SPORT_LABEL } from "./ui";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export function PlayerSearchInvite({
  teamId,
  sport,
  excludeUserIds,
  onInvited,
}: {
  teamId: string;
  sport: Sport;
  /** Current members (and anyone else who shouldn't show up as an invite target). */
  excludeUserIds: Set<string>;
  onInvited: (user: User) => void;
}) {
  const { run } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      api
        .get<User[]>(`/users?q=${encodeURIComponent(q)}`)
        .then((users) => {
          const sorted = [...users].sort((a, b) => {
            const aMatch = a.favorite_sports.includes(sport) ? 0 : 1;
            const bMatch = b.favorite_sports.includes(sport) ? 0 : 1;
            return aMatch - bMatch;
          });
          setResults(sorted);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, sport]);

  const invite = (user: User) =>
    run(
      () => api.post(`/teams/${teamId}/roster-invitations`, { user_id: user.id }),
      `Invite sent to ${user.name}`,
    ).then((ok) => {
      if (ok) {
        setInvitedIds((prev) => new Set(prev).add(user.id));
        onInvited(user);
      }
    });

  const visible = results.filter((u) => !excludeUserIds.has(u.id));

  return (
    <div>
      <input
        className="field w-full"
        autoFocus
        placeholder="Search players by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim().length >= MIN_QUERY_LENGTH && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {loading && <div className="px-1 text-[12.5px] text-faint">Searching…</div>}
          {!loading && visible.length === 0 && (
            <div className="px-1 text-[12.5px] text-faint">No players match "{query.trim()}".</div>
          )}
          {visible.map((u) => {
            const plays = u.favorite_sports.includes(sport);
            const invited = invitedIds.has(u.id);
            return (
              <div
                key={u.id}
                className="flex items-center gap-2.5 rounded-[10px] border border-line px-3 py-2"
              >
                <Avatar name={u.name} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{u.name}</div>
                  {plays && (
                    <div className="text-[11px] text-brand-deep">Plays {SPORT_LABEL[sport]}</div>
                  )}
                </div>
                <Button size="sm" disabled={invited} onClick={() => invite(u)}>
                  {invited ? "Invited" : "Invite"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
