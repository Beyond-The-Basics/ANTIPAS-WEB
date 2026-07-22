import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import { SPORTS, type OpponentSearch, type RosterApplication, type RosterSearch, type Sport, type Team } from "../api/types";
import { Badge, Empty, ShortId } from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";

export function DiscoverPage() {
  const { user: acting } = useActingUser();
  const { run } = useToast();

  const [sport, setSport] = useState<Sport | "">("");
  const [city, setCity] = useState("");
  const [rosterSearches, setRosterSearches] = useState<RosterSearch[]>([]);
  const [opponentSearches, setOpponentSearches] = useState<OpponentSearch[]>([]);
  const [myApps, setMyApps] = useState<RosterApplication[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [respondAs, setRespondAs] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (sport) params.set("sport", sport);
    if (city) params.set("city", city);
    const q = params.toString() ? `?${params}` : "";
    await run(async () => {
      const [roster, opponent, teamsList] = await Promise.all([
        api.get<RosterSearch[]>(`/roster-searches${q}`),
        api.get<OpponentSearch[]>(`/opponent-searches${q}`),
        api.get<Team[]>(`/teams`),
      ]);
      setRosterSearches(roster);
      setOpponentSearches(opponent);
      setTeams(teamsList);
    });
    if (acting) {
      await run(async () =>
        setMyApps(await api.get<RosterApplication[]>(`/users/me/roster-applications`)),
      );
    } else {
      setMyApps([]);
    }
  }, [sport, city, acting, run]);

  useEffect(() => {
    void load();
  }, [load]);

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? id.slice(0, 8);

  return (
    <>
      <h1>Discover</h1>

      <div className="card">
        <div className="row">
          <div style={{ flex: "0 0 180px" }}>
            <label>Sport</label>
            <select value={sport} onChange={(e) => setSport(e.target.value as Sport | "")}>
              <option value="">all sports</option>
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="(any)" />
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <button className="secondary" onClick={() => void load()}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Open roster searches ({rosterSearches.length})</h2>
        <p className="hint">Apply as the acting user to join a team's roster.</p>
        {rosterSearches.length === 0 ? (
          <Empty>None found.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th>City</th>
                <th>Id</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rosterSearches.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/teams/${s.team_id}`}>{teamName(s.team_id)}</Link>
                  </td>
                  <td>{s.city}</td>
                  <td>
                    <ShortId id={s.id} />
                  </td>
                  <td>
                    <button
                      className="small"
                      disabled={!acting}
                      onClick={() =>
                        run(
                          () => api.post(`/roster-searches/${s.id}/applications`),
                          "Applied",
                        ).then(load)
                      }
                    >
                      Apply
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Open opponent searches ({opponentSearches.length})</h2>
        <p className="hint">Respond as a team you manage (must be completed &amp; same sport).</p>
        {opponentSearches.length === 0 ? (
          <Empty>None found.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th>Sport</th>
                <th>When / where</th>
                <th>Respond as</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {opponentSearches.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/teams/${s.team_id}`}>{teamName(s.team_id)}</Link>
                  </td>
                  <td>{s.sport}</td>
                  <td className="muted">
                    {s.date} · {s.city} · {s.pitch}
                  </td>
                  <td>
                    <select
                      value={respondAs[s.id] ?? ""}
                      onChange={(e) => setRespondAs((p) => ({ ...p, [s.id]: e.target.value }))}
                    >
                      <option value="">— team —</option>
                      {teams
                        .filter((t) => t.sport === s.sport && t.id !== s.team_id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className="small"
                      disabled={!respondAs[s.id]}
                      onClick={() =>
                        run(
                          () =>
                            api.post(`/opponent-searches/${s.id}/applications`, {
                              responding_team_id: respondAs[s.id],
                            }),
                          "Application sent",
                        ).then(load)
                      }
                    >
                      Apply
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>My roster applications &amp; invites ({myApps.length})</h2>
        {!acting ? (
          <Empty>Pick an acting user to see their applications.</Empty>
        ) : myApps.length === 0 ? (
          <Empty>None.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th>Direction</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {myApps.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link to={`/teams/${a.team_id}`}>{teamName(a.team_id)}</Link>
                  </td>
                  <td className="muted">{a.direction}</td>
                  <td>
                    <Badge value={a.status} />
                  </td>
                  <td>
                    <div className="actions">
                      {a.status === "pending" && a.direction === "team_invited" && (
                        <>
                          <button
                            className="small"
                            onClick={() =>
                              run(
                                () => api.post(`/roster-applications/${a.id}/accept`),
                                "Invite accepted — you joined",
                              ).then(load)
                            }
                          >
                            Accept invite
                          </button>
                          <button
                            className="small secondary"
                            onClick={() =>
                              run(() => api.post(`/roster-applications/${a.id}/decline`), "Declined").then(load)
                            }
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {a.status === "pending" && a.direction === "player_applied" && (
                        <button
                          className="small danger"
                          onClick={() =>
                            run(() => api.post(`/roster-applications/${a.id}/withdraw`), "Withdrawn").then(load)
                          }
                        >
                          Withdraw
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
    </>
  );
}
