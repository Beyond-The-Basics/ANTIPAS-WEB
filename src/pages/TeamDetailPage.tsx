import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

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
import { Badge, Empty, ShortId } from "../components/ui";
import { useToast } from "../context/Toast";

export function TeamDetailPage() {
  const { teamId = "" } = useParams();
  const { run } = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [rosterSearches, setRosterSearches] = useState<RosterSearch[]>([]);
  const [rosterApps, setRosterApps] = useState<RosterApplication[]>([]);
  const [opponentSearches, setOpponentSearches] = useState<OpponentSearch[]>([]);
  const [opponentApps, setOpponentApps] = useState<OpponentApplication[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const userName = useCallback(
    (id: string) => users.find((u) => u.id === id)?.name ?? id.slice(0, 8),
    [users],
  );
  const teamName = useCallback(
    (id: string) => (id === teamId ? team?.name : undefined) ?? id.slice(0, 8),
    [team, teamId],
  );

  const reload = useCallback(async () => {
    await run(async () => {
      const [t, m, mt, allRoster, rApps, allOpp, oApps, us] = await Promise.all([
        api.get<Team>(`/teams/${teamId}`),
        api.get<Membership[]>(`/teams/${teamId}/members`),
        api.get<Match[]>(`/teams/${teamId}/matches`),
        api.get<RosterSearch[]>(`/roster-searches`),
        api.get<RosterApplication[]>(`/teams/${teamId}/roster-applications`),
        api.get<OpponentSearch[]>(`/opponent-searches`),
        api.get<OpponentApplication[]>(`/teams/${teamId}/opponent-applications`),
        api.get<User[]>(`/users`),
      ]);
      setTeam(t);
      setMembers(m);
      setMatches(mt);
      setRosterSearches(allRoster.filter((s) => s.team_id === teamId));
      setRosterApps(rApps);
      setOpponentSearches(allOpp.filter((s) => s.team_id === teamId));
      setOpponentApps(oApps);
      setUsers(us);
    });
  }, [teamId, run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!team) return <Empty>Loading team…</Empty>;

  return (
    <>
      <p>
        <Link to="/teams">← Teams</Link>
      </p>
      <h1>
        {team.name} <span className="muted">· {team.sport}</span>{" "}
        {team.completed ? <Badge value="confirmed" /> : <span className="badge">not completed</span>}
      </h1>

      <TeamActions team={team} onDone={reload} />
      <MembersSection
        team={team}
        members={members}
        userName={userName}
        onDone={reload}
      />
      <RosterSection
        teamId={teamId}
        searches={rosterSearches}
        apps={rosterApps}
        users={users}
        userName={userName}
        onDone={reload}
      />
      <OpponentSection
        teamId={teamId}
        searches={opponentSearches}
        apps={opponentApps}
        teamName={teamName}
        onDone={reload}
      />
      <MatchesSection teamId={teamId} matches={matches} teamName={teamName} onDone={reload} />
    </>
  );
}

// --- team-level actions -------------------------------------------------------

function TeamActions({ team, onDone }: { team: Team; onDone: () => Promise<void> }) {
  const { run } = useToast();
  const [name, setName] = useState(team.name);

  return (
    <div className="card">
      <h2>Team actions</h2>
      <div className="row">
        <div>
          <label>Rename</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <button
            className="secondary"
            onClick={() => run(() => api.patch(`/teams/${team.id}`, { name }), "Team updated").then(onDone)}
          >
            Save name
          </button>
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <button
            disabled={team.completed}
            onClick={() =>
              run(() => api.patch(`/teams/${team.id}`, { completed: true }), "Marked completed").then(onDone)
            }
          >
            Mark completed
          </button>
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <button
            className="danger"
            onClick={() => run(() => api.post(`/teams/${team.id}/leave`), "Left team").then(onDone)}
          >
            Leave (as acting user)
          </button>
        </div>
      </div>
      <p className="hint">
        Completion gates opponent search (Flow 2). Actions run as the acting user — the backend
        enforces captain/admin permissions, so a 403 here means the acting user lacks the role.
      </p>
    </div>
  );
}

// --- members ------------------------------------------------------------------

function MembersSection({
  team,
  members,
  userName,
  onDone,
}: {
  team: Team;
  members: Membership[];
  userName: (id: string) => string;
  onDone: () => Promise<void>;
}) {
  const { run } = useToast();

  return (
    <div className="card">
      <h2>Members ({members.length})</h2>
      {members.length === 0 ? (
        <Empty>No active members.</Empty>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>
                  {userName(m.user_id)} <ShortId id={m.user_id} />
                </td>
                <td>
                  <Badge value={m.role} />
                </td>
                <td>
                  <div className="actions">
                    {m.role !== "captain" && (
                      <>
                        <button
                          className="small secondary"
                          onClick={() =>
                            run(
                              () =>
                                api.post(`/teams/${team.id}/transfer-captain`, {
                                  new_captain_user_id: m.user_id,
                                }),
                              "Captaincy transferred",
                            ).then(onDone)
                          }
                        >
                          Make captain
                        </button>
                        <button
                          className="small secondary"
                          onClick={() =>
                            run(
                              () =>
                                api.patch(`/teams/${team.id}/members/${m.user_id}/role`, {
                                  role: (m.role === "admin" ? "member" : "admin") as TeamRole,
                                }),
                              "Role updated",
                            ).then(onDone)
                          }
                        >
                          {m.role === "admin" ? "Demote to member" : "Promote to admin"}
                        </button>
                        <button
                          className="small danger"
                          onClick={() =>
                            run(
                              () => api.del(`/teams/${team.id}/members/${m.user_id}`),
                              "Member removed",
                            ).then(onDone)
                          }
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// --- roster (recruiting) ------------------------------------------------------

function RosterSection({
  teamId,
  searches,
  apps,
  users,
  userName,
  onDone,
}: {
  teamId: string;
  searches: RosterSearch[];
  apps: RosterApplication[];
  users: User[];
  userName: (id: string) => string;
  onDone: () => Promise<void>;
}) {
  const { run } = useToast();
  const [city, setCity] = useState("");
  const [inviteUser, setInviteUser] = useState("");

  return (
    <div className="card">
      <h2>Recruiting (roster)</h2>
      <div className="grid2">
        <div>
          <label>Publish a roster search — city</label>
          <div className="row">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Casablanca" />
            <div style={{ flex: "0 0 auto" }}>
              <button
                disabled={!city}
                onClick={() =>
                  run(
                    () => api.post(`/teams/${teamId}/roster-searches`, { city }),
                    "Roster search published",
                  ).then(() => {
                    setCity("");
                    return onDone();
                  })
                }
              >
                Publish
              </button>
            </div>
          </div>
        </div>
        <div>
          <label>Invite a player directly</label>
          <div className="row">
            <select value={inviteUser} onChange={(e) => setInviteUser(e.target.value)}>
              <option value="">— pick a user —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <div style={{ flex: "0 0 auto" }}>
              <button
                disabled={!inviteUser}
                onClick={() =>
                  run(
                    () => api.post(`/teams/${teamId}/roster-invitations`, { user_id: inviteUser }),
                    "Invite sent",
                  ).then(() => {
                    setInviteUser("");
                    return onDone();
                  })
                }
              >
                Invite
              </button>
            </div>
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 18 }}>Open roster searches ({searches.length})</h2>
      {searches.length === 0 ? (
        <Empty>None open. (Closed searches aren't listed by the API.)</Empty>
      ) : (
        <table>
          <thead>
            <tr>
              <th>City</th>
              <th>Status</th>
              <th>Id</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {searches.map((s) => (
              <tr key={s.id}>
                <td>{s.city}</td>
                <td>
                  <Badge value={s.status} />
                </td>
                <td>
                  <ShortId id={s.id} />
                </td>
                <td>
                  <button
                    className="small danger"
                    onClick={() =>
                      run(() => api.post(`/roster-searches/${s.id}/close`), "Search closed").then(onDone)
                    }
                  >
                    Close
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ marginTop: 18 }}>Applications to this team ({apps.length})</h2>
      {apps.length === 0 ? (
        <Empty>No roster applications yet.</Empty>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Direction</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id}>
                <td>
                  {userName(a.user_id)} <ShortId id={a.user_id} />
                </td>
                <td className="muted">{a.direction}</td>
                <td>
                  <Badge value={a.status} />
                </td>
                <td>
                  <div className="actions">
                    {a.status === "pending" && a.direction === "player_applied" && (
                      <>
                        <button
                          className="small"
                          onClick={() =>
                            run(
                              () => api.post(`/roster-applications/${a.id}/accept`),
                              "Accepted — member added",
                            ).then(onDone)
                          }
                        >
                          Accept
                        </button>
                        <button
                          className="small secondary"
                          onClick={() =>
                            run(() => api.post(`/roster-applications/${a.id}/decline`), "Declined").then(onDone)
                          }
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {a.status === "pending" && a.direction === "team_invited" && (
                      <button
                        className="small danger"
                        onClick={() =>
                          run(() => api.post(`/roster-applications/${a.id}/withdraw`), "Invite withdrawn").then(
                            onDone,
                          )
                        }
                      >
                        Withdraw invite
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// --- opponent (Flow 2) --------------------------------------------------------

function OpponentSection({
  teamId,
  searches,
  apps,
  teamName,
  onDone,
}: {
  teamId: string;
  searches: OpponentSearch[];
  apps: OpponentApplication[];
  teamName: (id: string) => string;
  onDone: () => Promise<void>;
}) {
  const { run, notify } = useToast();
  const [gameTypeId, setGameTypeId] = useState("");
  const [city, setCity] = useState("");
  const [pitch, setPitch] = useState("");
  const [date, setDate] = useState("");
  const [applicants, setApplicants] = useState<Record<string, OpponentApplication[]>>({});

  const loadApplicants = async (searchId: string) => {
    await run(async () => {
      const list = await api.get<OpponentApplication[]>(`/opponent-searches/${searchId}/applications`);
      setApplicants((prev) => ({ ...prev, [searchId]: list }));
    });
  };

  const publish = async () => {
    if (!gameTypeId) return notify("A game_type_id is required (see hint)", "error");
    await run(
      () =>
        api.post(`/teams/${teamId}/opponent-searches`, {
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
      return onDone();
    });
  };

  return (
    <div className="card">
      <h2>Find an opponent (Flow 2)</h2>
      <p className="hint">
        Requires the team to be <b>completed</b>. Terms are fixed at publish (accept/reject only).
        There is no list-game-types endpoint yet — paste a <span className="mono">game_type_id</span>{" "}
        (seeded via <span className="mono">make seed</span>).
      </p>
      <div className="row">
        <div>
          <label>game_type_id</label>
          <input value={gameTypeId} onChange={(e) => setGameTypeId(e.target.value)} placeholder="uuid" />
        </div>
        <div>
          <label>City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Casablanca" />
        </div>
        <div>
          <label>Pitch</label>
          <input value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="Stade X" />
        </div>
        <div style={{ flex: "0 0 160px" }}>
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <button disabled={!gameTypeId || !city || !pitch || !date} onClick={publish}>
            Publish
          </button>
        </div>
      </div>

      <h2 style={{ marginTop: 18 }}>Open opponent searches ({searches.length})</h2>
      {searches.length === 0 ? (
        <Empty>None open.</Empty>
      ) : (
        searches.map((s) => (
          <div key={s.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 10 }}>
            <div className="row">
              <div style={{ flex: 1 }}>
                {s.city} · {s.pitch} · {s.date} <Badge value={s.status} /> <ShortId id={s.id} />
              </div>
              <div style={{ flex: "0 0 auto" }}>
                <button className="small secondary" onClick={() => loadApplicants(s.id)}>
                  View applicants
                </button>
              </div>
              <div style={{ flex: "0 0 auto" }}>
                <button
                  className="small danger"
                  onClick={() =>
                    run(() => api.post(`/opponent-searches/${s.id}/withdraw`), "Withdrawn").then(onDone)
                  }
                >
                  Withdraw
                </button>
              </div>
            </div>
            {applicants[s.id] && (
              <table style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Responding team</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applicants[s.id].length === 0 && (
                    <tr>
                      <td colSpan={3} className="muted">
                        No applicants.
                      </td>
                    </tr>
                  )}
                  {applicants[s.id].map((a) => (
                    <tr key={a.id}>
                      <td>
                        {teamName(a.responding_team_id)} <ShortId id={a.responding_team_id} />
                      </td>
                      <td>
                        <Badge value={a.status} />
                      </td>
                      <td>
                        {a.status === "pending" && (
                          <button
                            className="small"
                            onClick={() =>
                              run(
                                () => api.post(`/opponent-applications/${a.id}/confirm`),
                                "Confirmed — match created",
                              ).then(onDone)
                            }
                          >
                            Confirm → match
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))
      )}

      <h2 style={{ marginTop: 18 }}>This team's applications to others ({apps.length})</h2>
      {apps.length === 0 ? (
        <Empty>None sent.</Empty>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Search</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id}>
                <td>
                  <ShortId id={a.opponent_search_id} />
                </td>
                <td>
                  <Badge value={a.status} />
                </td>
                <td>
                  {a.status === "pending" && (
                    <button
                      className="small danger"
                      onClick={() =>
                        run(() => api.post(`/opponent-applications/${a.id}/withdraw`), "Withdrawn").then(onDone)
                      }
                    >
                      Withdraw
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// --- matches ------------------------------------------------------------------

function MatchesSection({
  teamId,
  matches,
  teamName,
  onDone,
}: {
  teamId: string;
  matches: Match[];
  teamName: (id: string) => string;
  onDone: () => Promise<void>;
}) {
  const { run } = useToast();

  return (
    <div className="card">
      <h2>Matches ({matches.length})</h2>
      {matches.length === 0 ? (
        <Empty>No matches yet — confirm an opponent application to create one.</Empty>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Opponent</th>
              <th>When / where</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => {
              const opponentId = m.team_a_id === teamId ? m.team_b_id : m.team_a_id;
              return (
                <tr key={m.id}>
                  <td>
                    {teamName(opponentId)} <ShortId id={opponentId} />
                  </td>
                  <td className="muted">
                    {m.date} · {m.city} · {m.pitch}
                  </td>
                  <td>
                    <Badge value={m.status} />
                  </td>
                  <td>
                    {m.status === "confirmed" && (
                      <div className="actions">
                        <button
                          className="small"
                          onClick={() =>
                            run(() => api.post(`/matches/${m.id}/played`), "Marked played").then(onDone)
                          }
                        >
                          Played
                        </button>
                        <button
                          className="small danger"
                          onClick={() =>
                            run(() => api.post(`/matches/${m.id}/cancel`), "Cancelled").then(onDone)
                          }
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
