import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import type {
  GuestApplication,
  GuestSearch,
  Match,
  MatchGuestParticipant,
  Membership,
  Team,
  User,
} from "../api/types";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Pill,
  SectionLabel,
  ShortId,
} from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";
import { dateLabel, expiresLabel } from "../lib/format";

export function MatchDetailPage() {
  const { matchId = "" } = useParams();
  const { user: acting } = useActingUser();
  const { run } = useToast();

  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searches, setSearches] = useState<GuestSearch[]>([]);
  const [apps, setApps] = useState<Record<string, GuestApplication[]>>({});
  const [guests, setGuests] = useState<MatchGuestParticipant[]>([]);
  /** Which side of the fixture the acting user can act for — null if they're on neither. */
  const [mySide, setMySide] = useState<{ teamId: string; manages: boolean } | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteUser, setInviteUser] = useState("");

  const teamName = useCallback(
    (id: string) => teams.find((t) => t.id === id)?.name ?? id.slice(0, 8),
    [teams],
  );
  const userName = useCallback(
    (id: string) => users.find((u) => u.id === id)?.name ?? id.slice(0, 8),
    [users],
  );

  const reload = useCallback(async () => {
    await run(async () => {
      const [m, ts, us, allSearches, participants] = await Promise.all([
        api.get<Match>(`/matches/${matchId}`),
        api.get<Team[]>(`/teams`),
        api.get<User[]>(`/users`),
        api.get<GuestSearch[]>(`/guest-searches`),
        api.get<MatchGuestParticipant[]>(`/matches/${matchId}/guests`),
      ]);
      setMatch(m);
      setTeams(ts);
      setUsers(us);
      // Browse returns every open guest search; narrow to this fixture.
      const mine = allSearches.filter((s) => s.match_id === matchId);
      setSearches(mine);
      setGuests(participants);

      const perSearch = await Promise.all(
        mine.map((s) =>
          api
            .get<GuestApplication[]>(`/guest-searches/${s.id}/applications`)
            .catch(() => [] as GuestApplication[])
            .then((list) => [s.id, list] as const),
        ),
      );
      setApps(Object.fromEntries(perSearch));

      if (acting) {
        const rosters = await Promise.all(
          [m.team_a_id, m.team_b_id].map((id) =>
            api
              .get<Membership[]>(`/teams/${id}/members`)
              .catch(() => [] as Membership[])
              .then((members) => ({ id, members })),
          ),
        );
        let side: { teamId: string; manages: boolean } | null = null;
        for (const { id, members } of rosters) {
          const me = members.find((x) => x.user_id === acting.id);
          if (me) side = { teamId: id, manages: me.role === "captain" || me.role === "admin" };
        }
        setMySide(side);
      } else {
        setMySide(null);
      }
    });
  }, [matchId, acting, run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!match) return <Empty>Loading match…</Empty>;

  const act = (fn: () => Promise<unknown>, message: string) => run(fn, message).then(reload);
  const live = match.status === "confirmed";
  const myOpenSearch = searches.find((s) => s.team_id === mySide?.teamId && s.status === "open");

  return (
    <>
      <Link
        to={`/teams/${mySide?.teamId ?? match.team_a_id}?tab=matches`}
        className="mb-3.5 inline-block text-[13px] text-muted hover:text-ink"
      >
        ← Back
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">
            {teamName(match.team_a_id)} vs {teamName(match.team_b_id)}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            {dateLabel(match.date)} · {match.city} · {match.pitch}
          </p>
        </div>
        <Pill value={match.status} />
      </div>

      {mySide?.manages && live && (
        <div className="mb-8 flex gap-2">
          <Button
            variant="ghost"
            onClick={() => act(() => api.post(`/matches/${match.id}/played`), "Marked played")}
          >
            Mark played
          </Button>
          <Button
            variant="ghost"
            onClick={() => act(() => api.post(`/matches/${match.id}/cancel`), "Match cancelled")}
          >
            Cancel match
          </Button>
        </div>
      )}

      <SectionLabel>
        Guest search {myOpenSearch ? `· expires in ${expiresLabel(myOpenSearch.expires_at)}` : ""}
      </SectionLabel>

      {searches.length === 0 ? (
        <Card className="mb-5 flex items-center justify-between gap-3 px-[18px] py-4">
          <div>
            <div className="text-sm font-semibold">No guest search open</div>
            <div className="mt-0.5 text-[12.5px] text-muted">
              A guest fills a one-off gap in this fixture — free to publish, and accepting one
              creates a match participation, not a roster membership.
            </div>
          </div>
          {mySide?.manages && live && (
            <Button
              size="sm"
              onClick={() =>
                act(
                  () =>
                    api.post(`/matches/${match.id}/guest-searches`, { team_id: mySide.teamId }),
                  "Guest search published",
                )
              }
            >
              Publish guest search
            </Button>
          )}
        </Card>
      ) : (
        <div className="mb-6 flex flex-col gap-4">
          {searches.map((s) => (
            <div key={s.id}>
              <Card className="mb-2.5 flex items-center justify-between gap-3 px-[18px] py-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {teamName(s.team_id)} · {s.city}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-muted">
                    expires in {expiresLabel(s.expires_at)} <ShortId id={s.id} />
                  </div>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <Pill value={s.status} />
                  {mySide?.manages && s.team_id === mySide.teamId && s.status === "open" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        act(() => api.post(`/guest-searches/${s.id}/withdraw`), "Withdrawn")
                      }
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              </Card>

              <div className="flex flex-col gap-2.5 pl-1">
                {(apps[s.id] ?? []).length === 0 && (
                  <p className="text-[12.5px] text-faint">No applicants to this search yet.</p>
                )}
                {(apps[s.id] ?? []).map((a) => (
                  <Card key={a.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold">{userName(a.user_id)}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        {a.direction === "player_applied" ? "applied as guest" : "invited as guest"}
                      </div>
                    </div>
                    <Pill value={a.status} />
                    {mySide?.manages &&
                      a.status === "pending" &&
                      a.direction === "player_applied" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              act(() => api.post(`/guest-applications/${a.id}/decline`), "Declined")
                            }
                          >
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              act(
                                () => api.post(`/guest-applications/${a.id}/accept`),
                                "Accepted — guest added to the match",
                              )
                            }
                          >
                            Accept
                          </Button>
                        </>
                      )}
                    {mySide?.manages &&
                      a.status === "pending" &&
                      a.direction === "team_invited" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            act(
                              () => api.post(`/guest-applications/${a.id}/withdraw`),
                              "Invite withdrawn",
                            )
                          }
                        >
                          Withdraw invite
                        </Button>
                      )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {mySide?.manages &&
        live &&
        (inviting ? (
          <div className="mb-8 flex items-center gap-2">
            <select
              className="field w-[220px]"
              autoFocus
              value={inviteUser}
              onChange={(e) => setInviteUser(e.target.value)}
            >
              <option value="">— pick a player —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <Button
              disabled={!inviteUser}
              onClick={() =>
                act(
                  () =>
                    api.post(`/matches/${match.id}/guest-invitations`, {
                      team_id: mySide.teamId,
                      user_id: inviteUser,
                    }),
                  "Guest invited",
                ).then(() => {
                  setInviteUser("");
                  setInviting(false);
                })
              }
            >
              Invite
            </Button>
            <Button variant="ghost" onClick={() => setInviting(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="ghost" className="mb-8" onClick={() => setInviting(true)}>
            + Invite a guest
          </Button>
        ))}

      <SectionLabel>Confirmed guests</SectionLabel>
      {guests.length === 0 ? (
        <Empty>No guests on this match yet.</Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {guests.map((g) => (
            <Card key={g.id} className="flex items-center gap-3 rounded-[10px] px-4 py-3">
              <Avatar name={userName(g.user_id)} size={28} />
              <div className="text-[13.5px] font-semibold">{userName(g.user_id)}</div>
              <div className="text-xs text-muted">playing for {teamName(g.team_id)}</div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-4 text-[11.5px] leading-snug text-faint">
        Direct invites have no <span className="font-mono">guest_search_id</span>, so they don't
        appear under a search — the invited player sees them on Discover, and they show up here once
        accepted.
      </p>
    </>
  );
}
