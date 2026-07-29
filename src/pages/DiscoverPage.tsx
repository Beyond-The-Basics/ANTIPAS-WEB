import L from "leaflet";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Circle, MapContainer, Marker, TileLayer, ZoomControl, useMap } from "react-leaflet";

import { api } from "../api/client";
import {
  SPORTS,
  type GuestApplication,
  type GuestSearch,
  type OpponentSearch,
  type PlayerAvailability,
  type RosterApplication,
  type RosterSearch,
  type Sport,
  type Team,
} from "../api/types";
import { PlayerAvailabilityModal } from "../components/PlayerAvailabilityModal";
import {
  Avatar,
  Button,
  Card,
  Empty,
  PageTitle,
  Pill,
  RadiusChip,
  SPORT_LABEL,
  SectionLabel,
  TypeDot,
} from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";
import { CITIES_BY_COUNTRY, type Country } from "../lib/cities";
import { dateLabel, expiresLabel } from "../lib/format";
import { TILE_ATTRIBUTION, TILE_URL } from "../lib/map";
import { COUNTRIES, DEFAULT_COUNTRY } from "../lib/profile";
import { useMyTeams, useUsers } from "../lib/useMyTeams";

/** Teardrop pin as a divIcon so no marker image assets are bundled. */
const PLAYER_PIN = L.divIcon({
  className: "",
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#147A49;border:3px solid #fff;box-shadow:0 3px 9px rgba(0,0,0,.35);transform:rotate(-45deg)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

const DEFAULT_CENTER: [number, number] = [33.5731, -7.5898]; // Casablanca

/**
 * Frames the players map: fly to the chosen city when one is picked, otherwise fit all plotted
 * players into view so every pin is visible at once (the "show all players in this country" case).
 */
function FrameMap({
  cityCenter,
  points,
}: {
  cityCenter: [number, number] | null;
  points: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    if (cityCenter) {
      map.flyTo(cityCenter, 12);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 12 });
    } else if (points.length === 1) {
      map.flyTo(points[0], 12);
    }
    // Re-frame when the selection or the set of plotted points changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityCenter?.[0], cityCenter?.[1], points.length]);
  return null;
}

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
  const { users, userName } = useUsers();
  const { teams: myTeams } = useMyTeams(acting);
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const [sport, setSport] = useState<Sport | "">("");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [cityName, setCityName] = useState("");
  const [selected, setSelected] = useState<PlayerAvailability | null>(null);

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
    if (cityName) params.set("city", cityName);
    const q = params.toString() ? `?${params}` : "";
    // Player availabilities also scope by country (the fixed country→city list), so they get an
    // extra param the team/opponent/guest searches (city-only) don't.
    const playerParams = new URLSearchParams(params);
    playerParams.set("country", country);
    const playerQ = `?${playerParams}`;
    await run(async () => {
      const [roster, opponent, guest, avail, teamsList] = await Promise.all([
        api.get<RosterSearch[]>(`/roster-searches${q}`),
        api.get<OpponentSearch[]>(`/opponent-searches${q}`),
        api.get<GuestSearch[]>(`/guest-searches${q}`),
        api.get<PlayerAvailability[]>(`/player-availability${playerQ}`),
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
  }, [sport, cityName, country, acting, run]);

  useEffect(() => {
    void load();
  }, [load]);

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? id.slice(0, 8);
  const teamSport = (id: string) => teams.find((t) => t.id === id)?.sport;

  // Only players with real coordinates can be plotted; the rest still list below the map.
  const mappablePlayers = useMemo(
    () => players.filter((p) => p.latitude != null && p.longitude != null),
    [players],
  );

  const cityCenter = useMemo<[number, number] | null>(() => {
    const city = cityName ? CITIES_BY_COUNTRY[country].find((c) => c.name === cityName) : undefined;
    return city ? [city.lat, city.lng] : null;
  }, [cityName, country]);

  const playerPoints = useMemo<[number, number][]>(
    () => mappablePlayers.map((a) => [a.latitude as number, a.longitude as number]),
    [mappablePlayers],
  );

  const initialCenter = cityCenter ?? playerPoints[0] ?? DEFAULT_CENTER;

  const selectedUser = useMemo(
    () => (selected ? (users.find((u) => u.id === selected.user_id) ?? null) : null),
    [selected, users],
  );

  // Teams the acting user captains/co-manages in the selected player's sport — who they can invite to.
  const invitableTeams = useMemo(() => {
    if (!selected) return [];
    return myTeams.filter(
      (t) => (t.role === "captain" || t.role === "admin") && t.team.sport === selected.sport,
    );
  }, [selected, myTeams]);

  const canInvite = !!acting && !!selected && selected.user_id !== acting.id;

  return (
    <>
      <PageTitle title={t("discover.title")} subtitle={t("discover.subtitle")} />

      <div className="mb-7 flex flex-wrap gap-2.5">
        <select
          className="field font-semibold"
          value={sport}
          onChange={(e) => setSport(e.target.value as Sport | "")}
        >
          <option value="">{t("discover.allSports")}</option>
          {SPORTS.map((s) => (
            <option key={s} value={s}>
              {SPORT_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value as Country);
            setCityName("");
          }}
        >
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="field" value={cityName} onChange={(e) => setCityName(e.target.value)}>
          <option value="">{t("discover.allCities")}</option>
          {CITIES_BY_COUNTRY[country].map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-9 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Quadrant title={t("discover.teamsRecruiting")}>
          {rosterSearches.length === 0 && <Empty>{t("discover.noneFound")}</Empty>}
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
                    {sp ? SPORT_LABEL[sp] : "—"} · {s.city} · expires in {expiresLabel(s.expires_at, t)}
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={!acting}
                  title={acting ? undefined : t("discover.pickActingFirst")}
                  onClick={() =>
                    run(() => api.post(`/roster-searches/${s.id}/applications`), t("discover.applied")).then(
                      load,
                    )
                  }
                >
                  {t("discover.apply")}
                </Button>
              </Row>
            );
          })}
        </Quadrant>

        <Quadrant title={t("discover.teamsSeekingOpponent")}>
          {opponentSearches.length === 0 && <Empty>{t("discover.noneFound")}</Empty>}
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
                  {dateLabel(s.date, language)} · {s.city} · {s.pitch}
                </div>
              </div>
              <div className="flex flex-none items-center gap-2">
                <select
                  className="field !px-2 !py-1.5 !text-[12px]"
                  value={respondAs[s.id] ?? ""}
                  onChange={(e) => setRespondAs((p) => ({ ...p, [s.id]: e.target.value }))}
                >
                  <option value="">{t("discover.respondAsPlaceholder")}</option>
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
                  title={respondAs[s.id] ? undefined : t("discover.pickChallengingTeam")}
                  onClick={() =>
                    run(
                      () =>
                        api.post(`/opponent-searches/${s.id}/applications`, {
                          responding_team_id: respondAs[s.id],
                        }),
                      t("discover.challengeSent"),
                    ).then(load)
                  }
                >
                  {t("discover.challenge")}
                </Button>
              </div>
            </Row>
          ))}
        </Quadrant>

        <Quadrant title={t("discover.teamsNeedingGuest")}>
          {guestSearches.length === 0 && <Empty>{t("discover.noneFound")}</Empty>}
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
                  {s.city} · expires in {expiresLabel(s.expires_at, t)}
                </div>
              </div>
              <Button
                size="sm"
                disabled={!acting}
                title={acting ? undefined : t("discover.pickActingFirst")}
                onClick={() =>
                  run(() => api.post(`/guest-searches/${s.id}/applications`), t("discover.offered")).then(
                    load,
                  )
                }
              >
                {t("discover.offerToSub")}
              </Button>
            </Row>
          ))}
        </Quadrant>

      </div>

      <div className="mb-3 flex items-center gap-2">
        <div className="h-[9px] w-[9px] rounded-[2px] bg-brand" />
        <div className="text-[13px] font-bold">
          {t("discover.availablePlayersIn", { place: cityName || country })}
        </div>
        <span className="text-xs text-muted">{t("discover.clickToInvite")}</span>
      </div>

      <div className="mb-9 flex flex-col gap-4 lg:flex-row">
        <div className="relative flex-1 overflow-hidden rounded-card border border-line">
          <MapContainer
            center={initialCenter}
            zoom={12}
            scrollWheelZoom={false}
            zoomControl={false}
            style={{ height: 360, width: "100%" }}
          >
            <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
            <ZoomControl position="bottomleft" />
            <FrameMap cityCenter={cityCenter} points={playerPoints} />
            {mappablePlayers.map((a) => (
              <Marker
                key={a.id}
                position={[a.latitude as number, a.longitude as number]}
                icon={PLAYER_PIN}
                eventHandlers={{ click: () => setSelected(a) }}
              />
            ))}
          </MapContainer>
          {mappablePlayers.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
              <span className="rounded-full bg-surface/95 px-3 py-1.5 text-xs font-semibold text-muted shadow-float">
                {t("discover.noPlayersPlotted")}
              </span>
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-2 lg:w-80 lg:shrink-0">
          {players.length === 0 ? (
            <Empty>{t("discover.noPlayersHere")}</Empty>
          ) : (
            players.map((a) => (
              <Card
                key={a.id}
                className="flex cursor-pointer items-center gap-2.5 px-4 py-3 transition hover:border-brand"
                onClick={() => setSelected(a)}
              >
                <Avatar name={userName(a.user_id)} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">{userName(a.user_id)}</div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    {SPORT_LABEL[a.sport]} · {a.city}
                  </div>
                </div>
                <RadiusChip km={a.radius_km} />
              </Card>
            ))
          )}
        </div>
      </div>

      {selected && (
        <PlayerAvailabilityModal
          availability={selected}
          user={selectedUser}
          canInvite={canInvite}
          invitableTeams={invitableTeams}
          onInvited={load}
          onClose={() => setSelected(null)}
        />
      )}

      <SectionLabel>{t("discover.myApplications")}</SectionLabel>
      {!acting ? (
        <Empty>{t("discover.pickActingToSeeApps")}</Empty>
      ) : myApps.length + myGuestApps.length === 0 ? (
        <Empty>{t("discover.noneYet")}</Empty>
      ) : (
        <div className="flex flex-col gap-2.5">
          {myApps.map((a) => (
            <Card key={a.id} className="flex items-center gap-3.5 px-4 py-3.5">
              <TypeDot />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">
                  {a.direction === "team_invited"
                    ? t("discover.rosterInvitationFrom", { team: teamName(a.team_id) })
                    : t("discover.rosterApplicationTo", { team: teamName(a.team_id) })}
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
                      run(() => api.post(`/roster-applications/${a.id}/decline`), t("discover.declined")).then(
                        load,
                      )
                    }
                  >
                    {t("discover.decline")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      run(
                        () => api.post(`/roster-applications/${a.id}/accept`),
                        t("discover.acceptedJoined"),
                      ).then(load)
                    }
                  >
                    {t("discover.accept")}
                  </Button>
                </>
              )}
              {a.status === "pending" && a.direction === "player_applied" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    run(() => api.post(`/roster-applications/${a.id}/withdraw`), t("discover.withdrawn")).then(
                      load,
                    )
                  }
                >
                  {t("discover.withdraw")}
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
                    ? t("discover.guestInvitationFrom", { team: teamName(a.team_id) })
                    : t("discover.guestOfferTo", { team: teamName(a.team_id) })}
                </div>
                <Link to={`/matches/${a.match_id}`} className="mt-0.5 block text-xs text-muted">
                  {t("discover.viewMatch")}
                </Link>
              </div>
              <Pill value={a.status} />
              {a.status === "pending" && a.direction === "team_invited" && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      run(() => api.post(`/guest-applications/${a.id}/decline`), t("discover.declined")).then(
                        load,
                      )
                    }
                  >
                    {t("discover.decline")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      run(
                        () => api.post(`/guest-applications/${a.id}/accept`),
                        t("discover.acceptedGuest"),
                      ).then(load)
                    }
                  >
                    {t("discover.accept")}
                  </Button>
                </>
              )}
              {a.status === "pending" && a.direction === "player_applied" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    run(() => api.post(`/guest-applications/${a.id}/withdraw`), t("discover.withdrawn")).then(
                      load,
                    )
                  }
                >
                  {t("discover.withdraw")}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
