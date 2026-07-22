import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import { SPORTS, type Sport, type Team } from "../api/types";
import { Badge, Empty, ShortId } from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";

export function TeamsPage() {
  const { user: acting } = useActingUser();
  const { run, notify } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [filter, setFilter] = useState<Sport | "">("");
  const [name, setName] = useState("");
  const [sport, setSport] = useState<Sport>("soccer");

  const load = () => {
    const q = filter ? `?sport=${filter}` : "";
    void run(async () => setTeams(await api.get<Team[]>(`/teams${q}`)));
  };
  useEffect(load, [filter]);

  const create = async () => {
    if (!acting) return notify("Pick an acting user first (top-right)", "error");
    await run(async () => {
      await api.post<Team>("/teams", { name, sport });
      setName("");
      load();
    }, "Team created — you are its captain");
  };

  return (
    <>
      <h1>Teams</h1>

      <div className="card">
        <h2>Create team</h2>
        <p className="hint">The acting user becomes the team captain.</p>
        <div className="row">
          <div>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Falcons" />
          </div>
          <div style={{ flex: "0 0 160px" }}>
            <label>Sport</label>
            <select value={sport} onChange={(e) => setSport(e.target.value as Sport)}>
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <button onClick={create} disabled={!name || !acting}>
              Create
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>All teams ({teams.length})</h2>
          <div style={{ flex: "0 0 180px" }}>
            <label>Filter by sport</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value as Sport | "")}>
              <option value="">all sports</option>
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        {teams.length === 0 ? (
          <Empty>No teams.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Sport</th>
                <th>Completed</th>
                <th>Id</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id}>
                  <td>
                    {t.name}
                    {t.is_adhoc && <span className="badge" style={{ marginLeft: 6 }}>adhoc</span>}
                  </td>
                  <td>{t.sport}</td>
                  <td>{t.completed ? <Badge value="confirmed" /> : <span className="muted">no</span>}</td>
                  <td>
                    <ShortId id={t.id} />
                  </td>
                  <td>
                    <Link to={`/teams/${t.id}`}>
                      <button className="small secondary">Open</button>
                    </Link>
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
