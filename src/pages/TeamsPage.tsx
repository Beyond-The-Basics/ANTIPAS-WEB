import L from "leaflet";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, TileLayer, ZoomControl, useMap } from "react-leaflet";

import { api } from "../api/client";
import type { Match, RosterSearch, Team } from "../api/types";
import {
  AvatarStack,
  Button,
  Card,
  Empty,
  Pill,
  RolePill,
  SPORT_LABEL,
  SectionLabel,
  SportDot,
} from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";
import { CITIES_BY_COUNTRY, type Country, isCountry } from "../lib/cities";
import { expiresLabel } from "../lib/format";
import { TILE_ATTRIBUTION, TILE_URL } from "../lib/map";
import { COUNTRIES, DEFAULT_COUNTRY } from "../lib/reference";
import { useMyTeams, useUsers } from "../lib/useMyTeams";

const TEAM_PIN = L.divIcon({
  className: "",
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#147A49;border:3px solid #fff;box-shadow:0 3px 9px rgba(0,0,0,.35);transform:rotate(-45deg)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

const DEFAULT_CENTER: [number, number] = [33.5731, -7.5898]; // Casablanca

/** Fly to the chosen city, else fit all recruiting-team pins into view. */
function FrameMap({
  cityCenter,
  points,
}: {
  cityCenter: [number, number] | null;
  points: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    if (cityCenter) map.flyTo(cityCenter, 12);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 12 });
    else if (points.length === 1) map.flyTo(points[0], 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityCenter?.[0], cityCenter?.[1], points.length]);
  return null;
}

/** A recruiting team: its open roster search joined to the team and (when known) coordinates. */
interface Recruiting {
  search: RosterSearch;
  team: Team;
  coords: [number, number] | null;
}

export function TeamsPage() {
  const { user: acting } = useActingUser();
  const navigate = useNavigate();
  const { run } = useToast();
  const { teams, allTeams } = useMyTeams(acting);
  const { userName } = useUsers();
  const { t } = useTranslation();
  const [matchesByTeam, setMatchesByTeam] = useState<Record<string, Match[]>>({});

  const [rosterSearches, setRosterSearches] = useState<RosterSearch[]>([]);
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [cityName, setCityName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    const entries = await Promise.all(
      teams.map(({ team }) =>
        api
          .get<Match[]>(`/teams/${team.id}/matches`)
          .catch(() => [] as Match[])
          .then((m) => [team.id, m] as const),
      ),
    );
    setMatchesByTeam(Object.fromEntries(entries));
  }, [teams]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const loadRecruiting = useCallback(async () => {
    const list = await api.get<RosterSearch[]>(`/roster-searches`).catch(() => [] as RosterSearch[]);
    setRosterSearches(list);
  }, []);

  useEffect(() => {
    void loadRecruiting();
  }, [loadRecruiting]);

  const teamById = useMemo(() => new Map(allTeams.map((t) => [t.id, t])), [allTeams]);

  // Join each open roster search to its team and resolve coordinates from the team's country/city.
  const recruiting = useMemo<Recruiting[]>(() => {
    return rosterSearches
      .filter((s) => s.status === "open")
      .map((search) => {
        const team = teamById.get(search.team_id);
        if (!team) return null;
        // The listing's own country/city (where they're recruiting) drives placement, falling
        // back to the team's base location for older listings that predate the country field.
        const listingCountry = search.country ?? team.country;
        const listingCity = search.city ?? team.city;
        if (listingCountry !== country) return null;
        if (cityName && listingCity !== cityName) return null;
        const city =
          listingCity && isCountry(listingCountry)
            ? CITIES_BY_COUNTRY[listingCountry].find((c) => c.name === listingCity)
            : undefined;
        return {
          search,
          team,
          coords: city ? ([city.lat, city.lng] as [number, number]) : null,
        };
      })
      .filter((r): r is Recruiting => r !== null);
  }, [rosterSearches, teamById, country, cityName]);

  const mappable = useMemo(() => recruiting.filter((r) => r.coords), [recruiting]);
  const cityCenter = useMemo<[number, number] | null>(() => {
    const c = cityName ? CITIES_BY_COUNTRY[country].find((x) => x.name === cityName) : undefined;
    return c ? [c.lat, c.lng] : null;
  }, [cityName, country]);
  const points = useMemo(() => mappable.map((r) => r.coords as [number, number]), [mappable]);
  const initialCenter = cityCenter ?? points[0] ?? DEFAULT_CENTER;

  const apply = (searchId: string) =>
    run(() => api.post(`/roster-searches/${searchId}/applications`), t("teams.appliedToJoin")).then(
      loadRecruiting,
    );

  const myTeamIds = new Set(teams.map((t) => t.team.id));

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-[26px] font-bold">{t("teams.title")}</h1>
          <p className="text-sm text-muted">{t("teams.subtitle")}</p>
        </div>
        <Button onClick={() => navigate("/teams/new")} disabled={!acting}>
          {t("teams.createTeam")}
        </Button>
      </div>

      {!acting ? (
        <Empty>{t("teams.pickActingToSeeTeams")}</Empty>
      ) : teams.length === 0 ? (
        <Empty>{t("teams.noTeamsYet")}</Empty>
      ) : (
        <div className="flex flex-col gap-2.5">
          {teams.map(({ team, role, members }) => {
            const confirmed = (matchesByTeam[team.id] ?? []).find((m) => m.status === "confirmed");
            let ctaLabel: string;
            let ctaPrimary = true;
            let onCta: () => void;
            let subtitle: string;
            if (confirmed && team.completed) {
              ctaLabel = t("teams.viewMatch");
              ctaPrimary = false;
              onCta = () => navigate(`/matches/${confirmed.id}`);
              subtitle = t("teams.subtitleConfirmed", { sport: SPORT_LABEL[team.sport] });
            } else if (team.completed) {
              ctaLabel = t("teams.findOpponent");
              onCta = () => navigate(`/teams/${team.id}?tab=opponent`);
              subtitle = t("teams.subtitleReady", { sport: SPORT_LABEL[team.sport] });
            } else {
              ctaLabel = t("teams.addPlayers");
              onCta = () => navigate(`/teams/${team.id}?tab=recruiting`);
              subtitle = t("teams.subtitleRecruiting", { sport: SPORT_LABEL[team.sport] });
            }

            return (
              <Card
                key={team.id}
                className="flex items-center gap-3.5 rounded-card px-4 py-4"
                onClick={() => navigate(`/teams/${team.id}`)}
              >
                <SportDot sport={team.sport} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold">{team.name}</span>
                    <RolePill role={role} />
                    {team.is_adhoc && <Pill value="closed" label={t("teams.adHoc")} />}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">{subtitle}</div>
                </div>
                <AvatarStack names={members.map((m) => userName(m.user_id))} total={members.length} />
                <Button
                  size="sm"
                  variant={ctaPrimary ? "primary" : "ghost"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCta();
                  }}
                >
                  {ctaLabel}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* --- teams recruiting near a location ------------------------------------ */}
      <div className="mb-3.5 mt-10 flex flex-wrap items-center gap-2.5">
        <SectionLabel>{t("teams.recruitingSection")}</SectionLabel>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <select
            className="field !py-2 !text-[12.5px]"
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
          <select
            className="field !py-2 !text-[12.5px]"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
          >
            <option value="">{t("teams.allCities")}</option>
            {CITIES_BY_COUNTRY[country].map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="relative flex-1 overflow-hidden rounded-card border border-line">
          <MapContainer
            center={initialCenter}
            zoom={12}
            scrollWheelZoom={false}
            zoomControl={false}
            style={{ height: 340, width: "100%" }}
          >
            <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
            <ZoomControl position="bottomleft" />
            <FrameMap cityCenter={cityCenter} points={points} />
            {mappable.map((r) => (
              <Marker
                key={r.search.id}
                position={r.coords as [number, number]}
                icon={TEAM_PIN}
                eventHandlers={{ click: () => setSelectedId(r.search.id) }}
              />
            ))}
          </MapContainer>
          {mappable.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
              <span className="rounded-full bg-surface/95 px-3 py-1.5 text-xs font-semibold text-muted shadow-float">
                {t("teams.noRecruitingPlotted")}
              </span>
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-2 lg:w-80 lg:shrink-0">
          {recruiting.length === 0 ? (
            <Empty>{t("teams.noTeamsRecruitingIn", { place: cityName || country })}</Empty>
          ) : (
            recruiting.map((r) => {
              const mine = myTeamIds.has(r.team.id);
              return (
                <Card
                  key={r.search.id}
                  className={`flex items-center gap-2.5 px-4 py-3 transition ${
                    selectedId === r.search.id ? "border-brand" : ""
                  }`}
                >
                  <SportDot sport={r.team.sport} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">{r.team.name}</div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      {SPORT_LABEL[r.team.sport]} · {r.team.city ?? r.search.city} · expires in{" "}
                      {expiresLabel(r.search.expires_at, t)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/teams/${r.team.id}`)}
                    className="text-[11.5px] font-semibold text-muted hover:text-ink"
                  >
                    {t("teams.view")}
                  </button>
                  {!mine && (
                    <Button size="sm" disabled={!acting} onClick={() => apply(r.search.id)}>
                      {t("teams.apply")}
                    </Button>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
