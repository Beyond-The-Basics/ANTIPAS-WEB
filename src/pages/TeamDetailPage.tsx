import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { api } from "../api/client";
import type {
  Match,
  Membership,
  OpponentApplication,
  OpponentSearch,
  RosterApplication,
  RosterSearch,
  Team,
  TeamRole,
  User,
} from "../api/types";
import { PlayerSearchInvite } from "../components/PlayerSearchInvite";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Label,
  Pill,
  RolePill,
  SectionLabel,
  ShortId,
  SportDot,
  Tabs,
} from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";
import { dateLabel, expiresLabel } from "../lib/format";
import { COUNTRIES } from "../lib/reference";

type Tab = "members" | "recruiting" | "opponent" | "matches";

const TABS: { id: Tab; label: string }[] = [
  { id: "members", label: "Members" },
  { id: "recruiting", label: "Recruiting" },
  { id: "opponent", label: "Find opponent" },
  { id: "matches", label: "Matches" },
];

export function TeamDetailPage() {
  const { teamId = "" } = useParams();
  const { user: acting } = useActingUser();
  const { run } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const tab = (params.get("tab") as Tab) ?? "members";
  const setTab = (t: Tab) => setParams(t === "members" ? {} : { tab: t }, { replace: true });

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [rosterSearches, setRosterSearches] = useState<RosterSearch[]>([]);
  const [rosterApps, setRosterApps] = useState<RosterApplication[]>([]);
  const [opponentSearches, setOpponentSearches] = useState<OpponentSearch[]>([]);
  const [opponentApps, setOpponentApps] = useState<OpponentApplication[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");

  const userName = useCallback(
    (id: string) => users.find((u) => u.id === id)?.name ?? id.slice(0, 8),
    [users],
  );
  const teamName = useCallback(
    (id: string) => teams.find((t) => t.id === id)?.name ?? id.slice(0, 8),
    [teams],
  );

  const reload = useCallback(async () => {
    await run(async () => {
      const [t, m, mt, allRoster, rApps, allOpp, oApps, us, ts] = await Promise.all([
        api.get<Team>(`/teams/${teamId}`),
        api.get<Membership[]>(`/teams/${teamId}/members`),
        api.get<Match[]>(`/teams/${teamId}/matches`),
        api.get<RosterSearch[]>(`/roster-searches`),
        // These two are captain/admin-only and 403 for everyone else. They have to fail soft:
        // rejecting here would take down the whole batch and leave the page on "Loading team…"
        // for plain members and for anyone opening a team they're not on.
        api
          .get<RosterApplication[]>(`/teams/${teamId}/roster-applications`)
          .catch(() => [] as RosterApplication[]),
        api.get<OpponentSearch[]>(`/opponent-searches`),
        api
          .get<OpponentApplication[]>(`/teams/${teamId}/opponent-applications`)
          .catch(() => [] as OpponentApplication[]),
        api.get<User[]>(`/users`),
        api.get<Team[]>(`/teams`),
      ]);
      setTeam(t);
      setName(t.name);
      setMembers(m);
      setMatches(mt);
      setRosterSearches(allRoster.filter((s) => s.team_id === teamId));
      setRosterApps(rApps);
      setOpponentSearches(allOpp.filter((s) => s.team_id === teamId));
      setOpponentApps(oApps);
      setUsers(us);
      setTeams(ts);
    });
  }, [teamId, run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!team) return <Empty>Loading team…</Empty>;

  const myRole: TeamRole | null =
    members.find((m) => m.user_id === acting?.id)?.role ?? null;
  const isCaptain = myRole === "captain";
  const manages = isCaptain || myRole === "admin";

  const act = (fn: () => Promise<unknown>, message: string) => run(fn, message).then(reload);

  return (
    <>
      <Link to="/teams" className="mb-3.5 inline-block text-[13px] text-muted hover:text-ink">
        ← Teams
      </Link>

      <div className="mb-1.5 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <SportDot sport={team.sport} size={44} />
          <div className="min-w-0">
            {renaming ? (
              <div className="flex items-center gap-2">
                <input
                  className="field w-[240px] !text-base !font-bold"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() =>
                    act(() => api.patch(`/teams/${team.id}`, { name }), "Team renamed").then(() =>
                      setRenaming(false),
                    )
                  }
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setName(team.name);
                    setRenaming(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <h1 className="truncate text-2xl font-bold">{team.name}</h1>
            )}
            <div className="mt-1.5 flex gap-1.5">
              <RolePill role={myRole} />
              <Pill
                value={team.completed ? "confirmed" : "open"}
                label={team.completed ? "Completed roster" : "Recruiting"}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-none gap-2">
          {isCaptain && !renaming && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  act(
                    () => api.patch(`/teams/${team.id}`, { completed: !team.completed }),
                    team.completed ? "Marked recruiting" : "Marked completed",
                  )
                }
              >
                {team.completed ? "Mark recruiting" : "Mark completed"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRenaming(true)}>
                Rename
              </Button>
            </>
          )}
          {myRole && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                run(() => api.post(`/teams/${team.id}/leave`), "Left team").then(() =>
                  navigate("/teams"),
                )
              }
            >
              Leave team
            </Button>
          )}
        </div>
      </div>

      <AboutTeam team={team} manages={manages} act={act} />

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "members" && (
        <MembersTab
          team={team}
          members={members}
          manages={manages}
          isCaptain={isCaptain}
          userName={userName}
          act={act}
        />
      )}

      {tab === "recruiting" && (
        <RecruitingTab
          team={team}
          members={members}
          searches={rosterSearches}
          apps={rosterApps}
          userName={userName}
          manages={manages}
          act={act}
          reload={reload}
        />
      )}

      {tab === "opponent" && (
        <OpponentTab
          team={team}
          searches={opponentSearches}
          apps={opponentApps}
          teamName={teamName}
          manages={manages}
          act={act}
        />
      )}

      {tab === "matches" && (
        <MatchesTab teamId={teamId} matches={matches} teamName={teamName} />
      )}
    </>
  );
}

// --- about ----------------------------------------------------------------------

function AboutTeam({
  team,
  manages,
  act,
}: {
  team: Team;
  manages: boolean;
  act: (fn: () => Promise<unknown>, message: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(team.description ?? "");
  const [country, setCountry] = useState(team.country);
  const [city, setCity] = useState(team.city ?? "");

  if (editing) {
    return (
      <Card className="mb-5 flex flex-col gap-3 p-4">
        <div>
          <Label>Description</Label>
          <textarea
            className="field w-full"
            rows={2}
            maxLength={500}
            placeholder="What's this team about — level, vibe, how often you play…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Label>Country</Label>
            <select
              className="field w-full"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <Label>City</Label>
            <input
              className="field w-full"
              placeholder="(none)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() =>
              act(
                () =>
                  api.patch(`/teams/${team.id}`, {
                    description: description.trim() || null,
                    country,
                    city: city.trim() || null,
                  }),
                "Team info updated",
              ).then(() => setEditing(false))
            }
          >
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </Card>
    );
  }

  const location = [team.city, team.country].filter(Boolean).join(", ");
  return (
    <Card className="mb-5 flex items-start justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-[13px] text-ink-2">
          {team.description || <span className="text-faint">No description yet.</span>}
        </p>
        <p className="mt-1 text-[12px] text-muted">{location}</p>
      </div>
      {manages && (
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          Edit
        </Button>
      )}
    </Card>
  );
}

// --- members ------------------------------------------------------------------

function MembersTab({
  team,
  members,
  manages,
  isCaptain,
  userName,
  act,
}: {
  team: Team;
  members: Membership[];
  manages: boolean;
  isCaptain: boolean;
  userName: (id: string) => string;
  act: (fn: () => Promise<unknown>, message: string) => Promise<unknown>;
}) {
  if (members.length === 0) return <Empty>No active members.</Empty>;

  return (
    <div className="flex flex-col gap-2">
      {members.map((m) => {
        const canManage = manages && m.role !== "captain";
        return (
          <Card key={m.id} className="flex items-center gap-3 rounded-[10px] px-4 py-3">
            <Avatar name={userName(m.user_id)} />
            <div className="flex-1 text-[13.5px] font-semibold">{userName(m.user_id)}</div>
            <RolePill role={m.role} />
            {canManage && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    act(
                      () =>
                        api.patch(`/teams/${team.id}/members/${m.user_id}/role`, {
                          role: (m.role === "admin" ? "member" : "admin") as TeamRole,
                        }),
                      "Role updated",
                    )
                  }
                >
                  {m.role === "admin" ? "Demote to member" : "Promote to admin"}
                </Button>
                {isCaptain && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      act(
                        () =>
                          api.post(`/teams/${team.id}/transfer-captain`, {
                            new_captain_user_id: m.user_id,
                          }),
                        "Captaincy transferred",
                      )
                    }
                  >
                    Make captain
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    act(() => api.del(`/teams/${team.id}/members/${m.user_id}`), "Member removed")
                  }
                >
                  Remove
                </Button>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// --- recruiting ---------------------------------------------------------------

function RecruitingTab({
  team,
  members,
  searches,
  apps,
  userName,
  manages,
  act,
  reload,
}: {
  team: Team;
  members: Membership[];
  searches: RosterSearch[];
  apps: RosterApplication[];
  userName: (id: string) => string;
  manages: boolean;
  act: (fn: () => Promise<unknown>, message: string) => Promise<unknown>;
  reload: () => Promise<void>;
}) {
  const [city, setCity] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [inviting, setInviting] = useState(false);

  return (
    <div>
      {searches.length === 0 ? (
        <Card className="mb-5 flex items-center justify-between gap-3 px-[18px] py-4">
          <div>
            <div className="text-sm font-semibold">No open roster search</div>
            <div className="mt-0.5 text-[12.5px] text-muted">
              Publish one so players can find and apply to this team.
            </div>
          </div>
          {manages &&
            (publishing ? (
              <div className="flex flex-none items-center gap-2">
                <input
                  className="field w-[160px]"
                  autoFocus
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={!city}
                  onClick={() =>
                    act(
                      () => api.post(`/teams/${team.id}/roster-searches`, { city }),
                      "Roster search published",
                    ).then(() => {
                      setCity("");
                      setPublishing(false);
                    })
                  }
                >
                  Publish
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPublishing(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setPublishing(true)}>
                Publish roster search
              </Button>
            ))}
        </Card>
      ) : (
        searches.map((s) => (
          <Card key={s.id} className="mb-5 flex items-center justify-between gap-3 px-[18px] py-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold">
                Roster search · {s.city} <ShortId id={s.id} />
              </div>
              <div className="mt-0.5 text-[12.5px] text-muted">
                Costs 1 credit to publish · expires in {expiresLabel(s.expires_at)}
              </div>
            </div>
            <div className="flex flex-none items-center gap-2">
              <Pill value={s.status} />
              {manages && s.status === "open" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => act(() => api.post(`/roster-searches/${s.id}/close`), "Search closed")}
                >
                  Close
                </Button>
              )}
            </div>
          </Card>
        ))
      )}

      <SectionLabel>Applicants</SectionLabel>
      {apps.length === 0 ? (
        <Empty>No roster applications yet.</Empty>
      ) : (
        <div className="mb-6 flex flex-col gap-2.5">
          {apps.map((a) => (
            <Card key={a.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">{userName(a.user_id)}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {a.direction === "player_applied" ? "applied to join" : "invited by team"}
                </div>
              </div>
              <Pill value={a.status} />
              {manages && a.status === "pending" && a.direction === "player_applied" && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      act(() => api.post(`/roster-applications/${a.id}/decline`), "Declined")
                    }
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      act(
                        () => api.post(`/roster-applications/${a.id}/accept`),
                        "Accepted — member added",
                      )
                    }
                  >
                    Accept
                  </Button>
                </>
              )}
              {manages && a.status === "pending" && a.direction === "team_invited" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    act(() => api.post(`/roster-applications/${a.id}/withdraw`), "Invite withdrawn")
                  }
                >
                  Withdraw invite
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {manages &&
        (inviting ? (
          <div>
            <PlayerSearchInvite
              teamId={team.id}
              sport={team.sport}
              excludeUserIds={new Set(members.map((m) => m.user_id))}
              onInvited={() => reload()}
            />
            <Button variant="ghost" className="mt-2.5" onClick={() => setInviting(false)}>
              Done
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setInviting(true)}>
            + Invite a player
          </Button>
        ))}
    </div>
  );
}

// --- find opponent ------------------------------------------------------------

function OpponentTab({
  team,
  searches,
  apps,
  teamName,
  manages,
  act,
}: {
  team: Team;
  searches: OpponentSearch[];
  apps: OpponentApplication[];
  teamName: (id: string) => string;
  manages: boolean;
  act: (fn: () => Promise<unknown>, message: string) => Promise<unknown>;
}) {
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [gameTypeId, setGameTypeId] = useState("");
  const [city, setCity] = useState("");
  const [pitch, setPitch] = useState("");
  const [date, setDate] = useState("");

  if (!team.completed) {
    return (
      <div className="rounded-tile border border-dashed border-line p-6 text-[13.5px] leading-relaxed text-muted">
        Mark the team <strong className="text-ink">completed</strong> under Members before you can
        publish an opponent search — a full roster is required to challenge another team.
      </div>
    );
  }

  const publish = async () => {
    if (!gameTypeId) return notify("A game_type_id is required", "error");
    await act(
      () =>
        api.post(`/teams/${team.id}/opponent-searches`, {
          game_type_id: gameTypeId,
          city,
          pitch,
          date,
        }),
      "Opponent search published",
    ).then(() => {
      setCity("");
      setPitch("");
      setDate("");
      setOpen(false);
    });
  };

  return (
    <div>
      {searches.length === 0 ? (
        <Card className="mb-5 px-[18px] py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">No open opponent search</div>
              <div className="mt-0.5 text-[12.5px] text-muted">
                Terms are fixed at publish — responding teams can only accept or be rejected.
              </div>
            </div>
            {manages && !open && (
              <Button size="sm" onClick={() => setOpen(true)}>
                Publish opponent search
              </Button>
            )}
          </div>
          {open && (
            <div className="mt-4 flex flex-wrap items-end gap-2.5 border-t border-line-2 pt-4">
              <div>
                <Label>game_type_id</Label>
                <input
                  className="field w-[220px] font-mono !text-[12px]"
                  placeholder="uuid — seeded via `make seed`"
                  value={gameTypeId}
                  onChange={(e) => setGameTypeId(e.target.value)}
                />
              </div>
              <div>
                <Label>City</Label>
                <input
                  className="field w-[150px]"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <Label>Pitch</Label>
                <input
                  className="field w-[150px]"
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                />
              </div>
              <div>
                <Label>Date</Label>
                <input
                  type="date"
                  className="field"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <Button disabled={!gameTypeId || !city || !pitch || !date} onClick={publish}>
                Publish
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          )}
          <p className="mt-3 text-[11.5px] leading-snug text-faint">
            There is no list-game-types endpoint yet, so the id has to be pasted in by hand.
          </p>
        </Card>
      ) : (
        searches.map((s) => (
          <Card key={s.id} className="mb-5 flex items-center justify-between gap-3 px-[18px] py-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold">
                {dateLabel(s.date)} · {s.city} · {s.pitch}
              </div>
              <div className="mt-0.5 text-[12.5px] text-muted">
                Costs 1 credit to publish · expires in {expiresLabel(s.expires_at)}
              </div>
            </div>
            <div className="flex flex-none items-center gap-2">
              <Pill value={s.status} />
              {manages && s.status === "open" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    act(() => api.post(`/opponent-searches/${s.id}/withdraw`), "Withdrawn")
                  }
                >
                  Withdraw
                </Button>
              )}
            </div>
          </Card>
        ))
      )}

      <SectionLabel>Responding teams</SectionLabel>
      <ResponderList searches={searches} teamName={teamName} manages={manages} act={act} />

      {apps.length > 0 && (
        <div className="mt-8">
          <SectionLabel>This team's challenges to others</SectionLabel>
          <div className="flex flex-col gap-2.5">
            {apps.map((a) => (
              <Card key={a.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex-1 text-[13.5px] font-semibold">
                  Challenge <ShortId id={a.opponent_search_id} />
                </div>
                <Pill value={a.status} />
                {manages && a.status === "pending" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      act(() => api.post(`/opponent-applications/${a.id}/withdraw`), "Withdrawn")
                    }
                  >
                    Withdraw
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Applicants live under each search, so they are fetched per open search. */
function ResponderList({
  searches,
  teamName,
  manages,
  act,
}: {
  searches: OpponentSearch[];
  teamName: (id: string) => string;
  manages: boolean;
  act: (fn: () => Promise<unknown>, message: string) => Promise<unknown>;
}) {
  const [bySearch, setBySearch] = useState<Record<string, OpponentApplication[]>>({});

  const load = useCallback(async () => {
    const entries = await Promise.all(
      searches.map((s) =>
        api
          .get<OpponentApplication[]>(`/opponent-searches/${s.id}/applications`)
          .catch(() => [] as OpponentApplication[])
          .then((list) => [s.id, list] as const),
      ),
    );
    setBySearch(Object.fromEntries(entries));
  }, [searches]);

  useEffect(() => {
    void load();
  }, [load]);

  const all = Object.values(bySearch).flat();
  if (all.length === 0) return <Empty>No teams have responded yet.</Empty>;

  return (
    <div className="flex flex-col gap-2.5">
      {all.map((a) => (
        <Card key={a.id} className="flex items-center gap-3 px-4 py-3.5">
          <div className="flex-1 text-[13.5px] font-semibold">
            {teamName(a.responding_team_id)}
          </div>
          <Pill value={a.status} />
          {manages && a.status === "pending" && (
            <Button
              size="sm"
              onClick={() =>
                act(
                  () => api.post(`/opponent-applications/${a.id}/confirm`),
                  "Confirmed — match created",
                ).then(load)
              }
            >
              Confirm → Match
            </Button>
          )}
        </Card>
      ))}
    </div>
  );
}

// --- matches ------------------------------------------------------------------

function MatchesTab({
  teamId,
  matches,
  teamName,
}: {
  teamId: string;
  matches: Match[];
  teamName: (id: string) => string;
}) {
  const navigate = useNavigate();

  if (matches.length === 0) {
    return <Empty>No matches yet — confirm a responding team to create one.</Empty>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {matches.map((m) => {
        const opponentId = m.team_a_id === teamId ? m.team_b_id : m.team_a_id;
        return (
          <Card
            key={m.id}
            className="flex items-center gap-3.5 px-4 py-3.5"
            onClick={() => navigate(`/matches/${m.id}`)}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold">vs {teamName(opponentId)}</div>
              <div className="mt-0.5 text-xs text-muted">
                {dateLabel(m.date)} · {m.city}
              </div>
            </div>
            <Pill value={m.status} />
          </Card>
        );
      })}
    </div>
  );
}
