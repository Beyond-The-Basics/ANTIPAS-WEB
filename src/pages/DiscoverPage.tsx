import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import {
  SPORTS,
  type GuestApplication,
  type GuestSearch,
  type OpponentSearch,
  type RosterApplication,
  type RosterSearch,
  type Sport,
  type Team,
} from "../api/types";
import {
  Avatar,
  Button,
  Card,
  Empty,
  PageTitle,
  Pill,
  SPORT_LABEL,
  SectionLabel,
  TypeDot,
} from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";
import { dateLabel, expiresLabel } from "../lib/format";
import { useUsers } from "../lib/useMyTeams";
import type { PlayerAvailability } from "../api/types";

function Quadrant({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="h-[9px] w-[9px] rounded-[2px] bg-brand" />
        <div className="text-[13px] font-bold">{title}</div>
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <Card className="flex items-center justify-between gap-2.5 px-4 py-3.5">{children}</Card>
  );
}

export function DiscoverPage() {
  const { user: acting } = useActingUser();
  const { run } = useToast();
  const { userName } = useUsers();

  const [sport, setSport] = useState<Sport | "">("");
  const [city, setCity] = useState("");

  const [rosterSearches, setRosterSearches] = useState<RosterSearch[]>([]);
  const [opponentSearches, setOpponentSearches] = useState<OpponentSearch[]>([]);
  const [guestSearches, setGuestSearches] = useState<GuestSearch[]>([]);
  const [players, setPlayers] = useState<PlayerAvailability[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [myApps, setMyApps] = useState<RosterApplication[]>([]);
  const [myGuestApps, setMyGuestApps] = useState<GuestApplication[]>([]);
  const [respondAs, setRespondAs] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (sport) params.set("sport", sport);
    if (city) params.set("city", city);
    const q = params.toString() ? `?${params}` : "";
    await run(async () => {
      const [roster, opponent, guest, avail, teamsList] = await Promise.all([
        api.get<RosterSearch[]>(`/roster-searches${q}`),
        api.get<OpponentSearch[]>(`/opponent-searches${q}`),
        api.get<GuestSearch[]>(`/guest-searches${q}`),
        api.get<PlayerAvailability[]>(`/player-availability${q}`),
        api.get<Team[]>(`/teams`),
      ]);
      setRosterSearches(roster);
      setOpponentSearches(opponent);
      setGuestSearches(guest);
      setPlayers(avail);
      setTeams(teamsList);
    });
    if (acting) {
      await run(async () => {
        const [rApps, gApps] = await Promise.all([
          api.get<RosterApplication[]>(`/users/me/roster-applications`),
          api.get<GuestApplication[]>(`/users/me/guest-applications`),
        ]);
        setMyApps(rApps);
        setMyGuestApps(gApps);
      });
    } else {
      setMyApps([]);
      setMyGuestApps([]);
    }
  }, [sport, city, acting, run]);

  useEffect(() => {
    void load();
  }, [load]);

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? id.slice(0, 8);
  const teamSport = (id: string) => teams.find((t) => t.id === id)?.sport;

  return (
    <>
      <PageTitle
        title="Discover"
        subtitle="Find teams, opponents, guests, and players near you"
      />

      <div className="mb-7 flex gap-2.5">
        <select
          className="field font-semibold"
          value={sport}
          onChange={(e) => setSport(e.target.value as Sport | "")}
        >
          <option value="">All sports</option>
          {SPORTS.map((s) => (
            <option key={s} value={s}>
              {SPORT_LABEL[s]}
            </option>
          ))}
        </select>
        <input
          className="field w-[180px]"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <Button onClick={() => void load()}>Search</Button>
      </div>

      <div className="mb-9 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Quadrant title="Teams recruiting">
          {rosterSearches.length === 0 && <Empty>None found.</Empty>}
          {rosterSearches.map((s) => {
            const sp = teamSport(s.team_id);
            return (
              <Row key={s.id}>
                <div className="min-w-0">
                  <Link
                    to={`/teams/${s.team_id}`}
                    className="text-[13.5px] font-semibold text-ink hover:text-brand"
                  >
                    {teamName(s.team_id)}
                  </Link>
                  <div className="mt-0.5 text-xs text-muted">
                    {sp ? SPORT_LABEL[sp] : "—"} · {s.city} · expires in {expiresLabel(s.expires_at)}
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={!acting}
                  title={acting ? undefined : "Pick who you're acting as first"}
                  onClick={() =>
                    run(() => api.post(`/roster-searches/${s.id}/applications`), "Applied").then(load)
                  }
                >
                  Apply
                </Button>
              </Row>
            );
          })}
        </Quadrant>

        <Quadrant title="Teams seeking an opponent">
          {opponentSearches.length === 0 && <Empty>None found.</Empty>}
          {opponentSearches.map((s) => (
            <Row key={s.id}>
              <div className="min-w-0">
                <Link
                  to={`/teams/${s.team_id}`}
                  className="text-[13.5px] font-semibold text-ink hover:text-brand"
                >
                  {teamName(s.team_id)}
                </Link>
                <div className="mt-0.5 text-xs text-muted">
                  {dateLabel(s.date)} · {s.city} · {s.pitch}
                </div>
              </div>
              <div className="flex flex-none items-center gap-2">
                <select
                  className="field !px-2 !py-1.5 !text-[12px]"
                  value={respondAs[s.id] ?? ""}
                  onChange={(e) => setRespondAs((p) => ({ ...p, [s.id]: e.target.value }))}
                >
                  <option value="">as…</option>
                  {teams
                    .filter((t) => t.sport === s.sport && t.id !== s.team_id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
                <Button
                  size="sm"
                  disabled={!respondAs[s.id]}
                  title={respondAs[s.id] ? undefined : "Pick which of your teams is challenging"}
                  onClick={() =>
                    run(
                      () =>
                        api.post(`/opponent-searches/${s.id}/applications`, {
                          responding_team_id: respondAs[s.id],
                        }),
                      "Challenge sent",
                    ).then(load)
                  }
                >
                  Challenge
                </Button>
              </div>
            </Row>
          ))}
        </Quadrant>

        <Quadrant title="Teams needing a guest">
          {guestSearches.length === 0 && <Empty>None found.</Empty>}
          {guestSearches.map((s) => (
            <Row key={s.id}>
              <div className="min-w-0">
                <Link
                  to={`/matches/${s.match_id}`}
                  className="text-[13.5px] font-semibold text-ink hover:text-brand"
                >
                  {teamName(s.team_id)}
                </Link>
                <div className="mt-0.5 text-xs text-muted">
                  {s.city} · expires in {expiresLabel(s.expires_at)}
                </div>
              </div>
              <Button
                size="sm"
                disabled={!acting}
                title={acting ? undefined : "Pick who you're acting as first"}
                onClick={() =>
                  run(() => api.post(`/guest-searches/${s.id}/applications`), "Offered").then(load)
                }
              >
                Offer to sub
              </Button>
            </Row>
          ))}
        </Quadrant>

        <Quadrant title="Available players">
          {players.length === 0 && <Empty>None found.</Empty>}
          {players.map((a) => (
            <Row key={a.id}>
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={userName(a.user_id)} />
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold">{userName(a.user_id)}</div>
                  <div className="mt-0.5 text-xs text-muted">
                    {SPORT_LABEL[a.sport]} · {a.city}
                  </div>
                </div>
              </div>
              <Pill value={a.status} />
            </Row>
          ))}
          {players.length > 0 && (
            <p className="text-[11.5px] leading-snug text-faint">
              The design shows an “Invite” action here, but the API has no route to invite against a
              broadcast — guest invites attach to an already-confirmed match. Invite these players
              from the match page instead.
            </p>
          )}
        </Quadrant>
      </div>

      <SectionLabel>My applications &amp; invites</SectionLabel>
      {!acting ? (
        <Empty>Pick who you're acting as to see your applications.</Empty>
      ) : myApps.length + myGuestApps.length === 0 ? (
        <Empty>None yet.</Empty>
      ) : (
        <div className="flex flex-col gap-2.5">
          {myApps.map((a) => (
            <Card key={a.id} className="flex items-center gap-3.5 px-4 py-3.5">
              <TypeDot />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">
                  {a.direction === "team_invited"
                    ? `Roster invitation from ${teamName(a.team_id)}`
                    : `Roster application to ${teamName(a.team_id)}`}
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {teamSport(a.team_id) ? SPORT_LABEL[teamSport(a.team_id)!] : "—"}
                </div>
              </div>
              <Pill value={a.status} />
              {a.status === "pending" && a.direction === "team_invited" && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      run(() => api.post(`/roster-applications/${a.id}/decline`), "Declined").then(load)
                    }
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      run(
                        () => api.post(`/roster-applications/${a.id}/accept`),
                        "Accepted — you joined",
                      ).then(load)
                    }
                  >
                    Accept
                  </Button>
                </>
              )}
              {a.status === "pending" && a.direction === "player_applied" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    run(() => api.post(`/roster-applications/${a.id}/withdraw`), "Withdrawn").then(load)
                  }
                >
                  Withdraw
                </Button>
              )}
            </Card>
          ))}
          {myGuestApps.map((a) => (
            <Card key={a.id} className="flex items-center gap-3.5 px-4 py-3.5">
              <TypeDot />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">
                  {a.direction === "team_invited"
                    ? `Guest invitation from ${teamName(a.team_id)}`
                    : `Guest offer to ${teamName(a.team_id)}`}
                </div>
                <Link to={`/matches/${a.match_id}`} className="mt-0.5 block text-xs text-muted">
                  View the match
                </Link>
              </div>
              <Pill value={a.status} />
              {a.status === "pending" && a.direction === "team_invited" && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      run(() => api.post(`/guest-applications/${a.id}/decline`), "Declined").then(load)
                    }
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      run(
                        () => api.post(`/guest-applications/${a.id}/accept`),
                        "Accepted — you're a guest in this match",
                      ).then(load)
                    }
                  >
                    Accept
                  </Button>
                </>
              )}
              {a.status === "pending" && a.direction === "player_applied" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    run(() => api.post(`/guest-applications/${a.id}/withdraw`), "Withdrawn").then(load)
                  }
                >
                  Withdraw
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
