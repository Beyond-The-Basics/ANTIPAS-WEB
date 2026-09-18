// Discover, built to design handoff option 7b ("Kickoff Discover Layouts.dc.html"): one tabbed
// list instead of stacked sections, inline text filters, and one row per listing carrying
// who / when / one fact / one action. Sora for the title, Instrument Sans everywhere else.
//
// Where the design outruns the API, the row shows what the API has rather than inventing it:
// there is no team level, distance, or open-terms field, so the identity line reads sport · city
// and the term column shows when the listing closes.

import L from "leaflet";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, Marker, TileLayer, ZoomControl, useMap } from "react-leaflet";

import { api } from "../api/client";
import {
  SPORTS,
  type GameType,
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
import { Avatar, Button, MenuSelect, Pill, SPORT_LABEL } from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";
import { CITIES_BY_COUNTRY, isCountry, type Country } from "../lib/cities";
import { translateApiError } from "../lib/errors";
import { expiresLabel, kickoffLabel } from "../lib/format";
import { TILE_ATTRIBUTION, TILE_URL } from "../lib/map";
import { COUNTRIES, DEFAULT_COUNTRY } from "../lib/profile";
import { useMyTeams, useUsers } from "../lib/useMyTeams";

type Tab = "matches" | "players" | "teams";
type DateWindow = "any" | "today" | "weekend" | "week";

const TABS: Tab[] = ["matches", "players", "teams"];
const DATE_WINDOWS: DateWindow[] = ["any", "today", "weekend", "week"];
/** Rows shown before "Show all". */
const PAGE_SIZE = 8;

/** Teardrop pin as a divIcon so no marker image assets are bundled. */
const PLAYER_PIN = L.divIcon({
  className: "",
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#147A49;border:3px solid #fff;box-shadow:0 3px 9px rgba(0,0,0,.35);transform:rotate(-45deg)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

const DEFAULT_CENTER: [number, number] = [33.5731, -7.5898]; // Casablanca

/** Fly to the chosen city, otherwise fit every plotted player into view. */
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

/** Whether an ISO kick-off falls inside the chosen window, in the viewer's local time. */
function inDateWindow(iso: string, window: DateWindow): boolean {
  if (window === "any") return true;
  const d = new Date(iso);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const daysFromToday = (n: number) => new Date(startOfToday.getTime() + n * 86_400_000);
  if (window === "today") return d >= startOfToday && d < daysFromToday(1);
  if (window === "week") return d >= startOfToday && d < daysFromToday(7);
  // This weekend: the coming Saturday and Sunday — or just today, if today is Sunday.
  const dow = startOfToday.getDay();
  const saturday = dow === 0 ? daysFromToday(-1) : daysFromToday(6 - dow);
  const monday = new Date(saturday.getTime() + 2 * 86_400_000);
  return d >= (dow === 0 ? startOfToday : saturday) && d < monday;
}

// --- list anatomy ---------------------------------------------------------------------------

/**
 * One listing: avatar · identity · when · term · action. Below ~880px it stacks — identity and
 * when on the first line, term and a full-width action on the second.
 */
function ListingRow({
  name,
  identity,
  identityMeta,
  when,
  whenMeta,
  term,
  termAccent = false,
  action,
}: {
  name: string;
  identity: ReactNode;
  identityMeta: ReactNode;
  when: ReactNode;
  whenMeta: ReactNode;
  term: ReactNode;
  termAccent?: boolean;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3 border-b border-line-2 px-1 py-4 transition-colors hover:bg-canvas/40 min-[880px]:flex-nowrap">
      <div className="flex min-w-0 basis-full flex-wrap items-center gap-x-3.5 gap-y-1.5 min-[560px]:flex-nowrap min-[880px]:flex-1 min-[880px]:basis-auto">
        <Avatar name={name} size={36} />
        <div className="min-w-0 flex-1 min-[880px]:w-[168px] min-[880px]:flex-none">
          <div className="truncate text-sm font-bold">{identity}</div>
          <div className="mt-0.5 truncate text-xs tabular-nums text-muted">{identityMeta}</div>
        </div>
        {/* On a phone the kick-off line drops under the name (indented past the avatar) rather
            than truncating the time away. */}
        <div className="min-w-0 basis-full ps-[50px] min-[560px]:flex-1 min-[560px]:basis-auto min-[560px]:ps-0">
          <div className="truncate text-sm font-semibold tabular-nums">{when}</div>
          <div className="mt-0.5 truncate text-xs tabular-nums text-muted">{whenMeta}</div>
        </div>
      </div>
      <div className="flex w-full items-center gap-3.5 min-[880px]:contents">
        <div
          className={`flex-1 whitespace-nowrap text-[11.5px] font-semibold tabular-nums min-[880px]:w-[92px] min-[880px]:flex-none min-[880px]:text-end ${
            termAccent ? "text-brand-deep" : "text-muted"
          }`}
        >
          {term}
        </div>
        <div className="flex flex-[2] justify-end min-[880px]:flex-none [&>*]:w-full min-[880px]:[&>*]:w-auto">
          {action}
        </div>
      </div>
    </div>
  );
}

/** Loading placeholder at the real row height — no spinner on a blank page. */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3.5 border-b border-line-2 px-1 py-4" aria-hidden>
      <div className="h-9 w-9 flex-none animate-pulse rounded-full bg-chip" />
      <div className="w-[168px] flex-none space-y-2">
        <div className="h-3.5 w-28 animate-pulse rounded bg-chip" />
        <div className="h-3 w-20 animate-pulse rounded bg-chip" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-36 animate-pulse rounded bg-chip" />
        <div className="h-3 w-48 animate-pulse rounded bg-chip" />
      </div>
      <div className="h-8 w-20 flex-none animate-pulse rounded-field bg-chip" />
    </div>
  );
}

function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="px-1 py-12 text-center">
      <div className="text-[15px] font-bold">{title}</div>
      <p className="mx-auto mt-1.5 max-w-[420px] text-[13px] text-muted">{body}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">{children}</div>
    </div>
  );
}

// --- page -----------------------------------------------------------------------------------

export function DiscoverPage() {
  const { user: acting } = useActingUser();
  const { run } = useToast();
  const { users, userName } = useUsers();
  const { teams: myTeams } = useMyTeams(acting);
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const navigate = useNavigate();

  // Tab and filters live in the URL so a view is linkable and survives reload.
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.includes(params.get("tab") as Tab) ? (params.get("tab") as Tab) : "matches";
  const sport = (SPORTS as string[]).includes(params.get("sport") ?? "")
    ? (params.get("sport") as Sport)
    : "";
  const country: Country = isCountry(params.get("country")) ? (params.get("country") as Country) : DEFAULT_COUNTRY;
  const cityName = CITIES_BY_COUNTRY[country].some((c) => c.name === params.get("city"))
    ? (params.get("city") as string)
    : "";
  const dateWindow: DateWindow = DATE_WINDOWS.includes(params.get("when") as DateWindow)
    ? (params.get("when") as DateWindow)
    : "any";
  const showMap = params.get("map") === "1";

  const setParam = useCallback(
    (changes: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(changes)) {
            if (v) next.set(k, v);
            else next.delete(k);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<PlayerAvailability | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rosterSearches, setRosterSearches] = useState<RosterSearch[]>([]);
  const [opponentSearches, setOpponentSearches] = useState<OpponentSearch[]>([]);
  const [guestSearches, setGuestSearches] = useState<GuestSearch[]>([]);
  const [players, setPlayers] = useState<PlayerAvailability[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [myApps, setMyApps] = useState<RosterApplication[]>([]);
  const [myGuestApps, setMyGuestApps] = useState<GuestApplication[]>([]);

  /** `silent` refreshes after an action without flashing the skeleton. */
  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      const query = new URLSearchParams();
      if (sport) query.set("sport", sport);
      if (cityName) query.set("city", cityName);
      const q = query.toString() ? `?${query}` : "";
      // Player availabilities also scope by country; the team listings are city-only.
      const playerQuery = new URLSearchParams(query);
      playerQuery.set("country", country);
      try {
        const [roster, opponent, guest, avail, teamsList, types, rApps, gApps] = await Promise.all([
          api.get<RosterSearch[]>(`/roster-searches${q}`),
          api.get<OpponentSearch[]>(`/opponent-searches${q}`),
          api.get<GuestSearch[]>(`/guest-searches${q}`),
          api.get<PlayerAvailability[]>(`/player-availability?${playerQuery}`),
          api.get<Team[]>(`/teams`),
          api.get<GameType[]>(`/game-types`),
          acting
            ? api.get<RosterApplication[]>(`/users/me/roster-applications`)
            : Promise.resolve([] as RosterApplication[]),
          acting
            ? api.get<GuestApplication[]>(`/users/me/guest-applications`)
            : Promise.resolve([] as GuestApplication[]),
        ]);
        setRosterSearches(roster);
        setOpponentSearches(opponent);
        setGuestSearches(guest);
        setPlayers(avail);
        setTeams(teamsList);
        setGameTypes(types);
        setMyApps(rApps);
        setMyGuestApps(gApps);
      } catch (err) {
        setError(translateApiError(err, t));
      } finally {
        setLoading(false);
      }
    },
    // `t` changes identity on language switch; refetching for that would be wasted work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sport, cityName, country, acting],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // A new tab or filter starts collapsed again.
  useEffect(() => setExpanded(false), [tab, sport, cityName, country, dateWindow]);

  /** Run a row action with its own spinner, then refresh quietly. */
  const act = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusy(key);
    const ok = await run(action, success);
    setBusy(null);
    if (ok) await load(true);
  };

  const teamById = useMemo(() => new Map(teams.map((tm) => [tm.id, tm])), [teams]);
  const teamName = (id: string) => teamById.get(id)?.name ?? id.slice(0, 8);
  const gameTypeLabel = (id: string) => gameTypes.find((g) => g.id === id)?.label;
  const myTeamIds = useMemo(() => new Set(myTeams.map((m) => m.team.id)), [myTeams]);
  const managedTeams = useMemo(
    () => myTeams.filter((m) => m.role === "captain" || m.role === "admin"),
    [myTeams],
  );

  // --- per-tab lists (counts follow every filter, not just the active tab) ---

  const matchRows = useMemo(
    () =>
      opponentSearches
        .filter((s) => inDateWindow(s.date, dateWindow))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [opponentSearches, dateWindow],
  );
  const playerRows = useMemo(
    () => [...players].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [players],
  );
  // Teams recruiting covers both permanent roster spots and one-match guest spots — both are a
  // team asking for a player.
  const teamRows = useMemo(
    () =>
      [
        ...rosterSearches.map((s) => ({ kind: "roster" as const, s })),
        ...guestSearches.map((s) => ({ kind: "guest" as const, s })),
      ]
        .sort((a, b) => a.s.expires_at.localeCompare(b.s.expires_at)),
    [rosterSearches, guestSearches],
  );

  const counts: Record<Tab, number> = {
    matches: matchRows.length,
    players: playerRows.length,
    teams: teamRows.length,
  };
  const total = counts.matches + counts.players + counts.teams;
  const place = cityName || country;
  const activeCount = counts[tab];
  const limit = expanded ? Infinity : PAGE_SIZE;

  // --- header actions ---

  /** "Broadcast a challenge" publishes from a team you run; with none, go make one. */
  const broadcast = () => {
    const team = managedTeams.find((m) => m.team.completed) ?? managedTeams[0];
    navigate(team ? `/teams/${team.team.id}?tab=opponent` : "/teams");
  };

  /** The narrowest active filter, cleared by the empty state's "widen" button. */
  const widen: { label: string; apply: () => void } | null =
    dateWindow !== "any" && tab === "matches"
      ? { label: t("discover.widen.anyDate"), apply: () => setParam({ when: null }) }
      : cityName
        ? { label: t("discover.widen.allCities", { country }), apply: () => setParam({ city: null }) }
        : sport
          ? { label: t("discover.widen.allSports"), apply: () => setParam({ sport: null }) }
          : null;

  // --- map (players tab only, behind a toggle) ---

  const mappablePlayers = useMemo(
    () => playerRows.filter((p) => p.latitude != null && p.longitude != null),
    [playerRows],
  );
  const playerPoints = useMemo<[number, number][]>(
    () => mappablePlayers.map((a) => [a.latitude as number, a.longitude as number]),
    [mappablePlayers],
  );
  const cityCenter = useMemo<[number, number] | null>(() => {
    const city = cityName ? CITIES_BY_COUNTRY[country].find((c) => c.name === cityName) : undefined;
    return city ? [city.lat, city.lng] : null;
  }, [cityName, country]);

  const selectedUser = useMemo(
    () => (selected ? (users.find((u) => u.id === selected.user_id) ?? null) : null),
    [selected, users],
  );
  const invitableFor = (sp: Sport) => managedTeams.filter((m) => m.team.sport === sp);

  // --- rows ---

  const renderMatch = (s: OpponentSearch) => {
    const own = myTeamIds.has(s.team_id);
    const eligible = managedTeams.filter((m) => m.team.sport === s.sport && m.team.id !== s.team_id);
    const key = `match:${s.id}`;
    const challenge = (teamId: string) =>
      act(
        key,
        () => api.post(`/opponent-searches/${s.id}/applications`, { responding_team_id: teamId }),
        t("discover.challengeSent"),
      );
    const format = gameTypeLabel(s.game_type_id);

    let action: ReactNode;
    if (own || !acting || eligible.length === 0) {
      action = (
        <Button
          size="row"
          variant="ghost"
          onClick={() => navigate(`/teams/${s.team_id}${own ? "?tab=opponent" : ""}`)}
        >
          {t("discover.view")}
        </Button>
      );
    } else if (eligible.length === 1) {
      action = (
        <Button
          size="row"
          variant="accent"
          busy={busy === key}
          onClick={() => void challenge(eligible[0].team.id)}
          title={t("discover.challengeAs", { team: eligible[0].team.name })}
        >
          {t("discover.challenge")}
        </Button>
      );
    } else {
      action = (
        <MenuSelect
          ariaLabel={t("discover.pickChallengingTeam")}
          options={eligible.map((m) => ({ value: m.team.id, label: m.team.name }))}
          onChange={(id) => void challenge(id)}
          trigger={({ toggle }) => (
            <Button size="row" variant="accent" busy={busy === key} onClick={toggle}>
              {t("discover.challenge")} <span aria-hidden>▾</span>
            </Button>
          )}
        />
      );
    }

    return (
      <ListingRow
        key={s.id}
        name={teamName(s.team_id)}
        identity={
          <Link to={`/teams/${s.team_id}`} className="text-ink hover:text-brand">
            {teamName(s.team_id)}
          </Link>
        }
        identityMeta={`${SPORT_LABEL[s.sport]} · ${s.city}`}
        when={kickoffLabel(s.date, language)}
        whenMeta={[format, s.pitch || t("discover.pitchOpen")].filter(Boolean).join(" · ")}
        term={t("discover.closesIn", { time: expiresLabel(s.expires_at, t) })}
        termAccent={!own && eligible.length > 0}
        action={action}
      />
    );
  };

  const renderPlayer = (a: PlayerAvailability) => {
    const self = acting?.id === a.user_id;
    const canInvite = !!acting && !self && invitableFor(a.sport).length > 0;
    return (
      <ListingRow
        key={a.id}
        name={userName(a.user_id)}
        identity={userName(a.user_id)}
        identityMeta={SPORT_LABEL[a.sport]}
        when={a.region ? `${a.city} · ${a.region}` : a.city}
        whenMeta={
          a.radius_km != null ? t("discover.withinKm", { km: a.radius_km }) : t("discover.noRadius")
        }
        term={t("discover.closesIn", { time: expiresLabel(a.expires_at, t) })}
        termAccent={canInvite}
        action={
          <Button size="row" variant={canInvite ? "accent" : "ghost"} onClick={() => setSelected(a)}>
            {canInvite ? t("discover.invite") : t("discover.view")}
          </Button>
        }
      />
    );
  };

  const renderTeamListing = (row: (typeof teamRows)[number]) => {
    const { s } = row;
    const team = teamById.get(s.team_id);
    const member = myTeamIds.has(s.team_id);
    const key = `${row.kind}:${s.id}`;
    const alreadyAsked =
      row.kind === "roster"
        ? myApps.some((a) => a.roster_search_id === s.id && a.status === "pending")
        : myGuestApps.some((a) => a.guest_search_id === s.id && a.status === "pending");
    const [apply, done, verb] =
      row.kind === "roster"
        ? [`/roster-searches/${s.id}/applications`, t("discover.applied"), t("discover.apply")]
        : [`/guest-searches/${s.id}/applications`, t("discover.offered"), t("discover.offerToSub")];
    const detailHref = row.kind === "guest" ? `/matches/${(s as GuestSearch).match_id}` : `/teams/${s.team_id}`;

    return (
      <ListingRow
        key={key}
        name={teamName(s.team_id)}
        identity={
          <Link to={`/teams/${s.team_id}`} className="text-ink hover:text-brand">
            {teamName(s.team_id)}
          </Link>
        }
        identityMeta={team ? `${SPORT_LABEL[team.sport]} · ${s.city}` : s.city}
        when={row.kind === "roster" ? t("discover.recruitingPlayers") : t("discover.needsGuest")}
        whenMeta={
          row.kind === "roster" ? t("discover.permanentSpot") : (
            <Link to={detailHref} className="text-muted hover:text-brand">
              {t("discover.oneMatchSpot")}
            </Link>
          )
        }
        term={t("discover.closesIn", { time: expiresLabel(s.expires_at, t) })}
        termAccent={!member && !alreadyAsked && !!acting}
        action={
          member ? (
            <Button size="row" variant="ghost" onClick={() => navigate(detailHref)}>
              {t("discover.view")}
            </Button>
          ) : (
            <Button
              size="row"
              variant={alreadyAsked ? "ghost" : "accent"}
              disabled={!acting || alreadyAsked}
              busy={busy === key}
              title={acting ? undefined : t("discover.pickActingFirst")}
              onClick={() => void act(key, () => api.post(apply), done)}
            >
              {alreadyAsked ? done : verb}
            </Button>
          )
        }
      />
    );
  };

  const sortLabel = {
    matches: t("discover.sort.kickoff"),
    players: t("discover.sort.newest"),
    teams: t("discover.sort.closing"),
  }[tab];

  const rows =
    tab === "matches"
      ? matchRows.slice(0, limit).map(renderMatch)
      : tab === "players"
        ? playerRows.slice(0, limit).map(renderPlayer)
        : teamRows.slice(0, limit).map(renderTeamListing);

  const empty = {
    matches: (
      <EmptyState title={t("discover.empty.matchesTitle")} body={t("discover.empty.matchesBody")}>
        <Button size="row" variant="accent" onClick={broadcast}>
          {t("discover.broadcast")}
        </Button>
        {widen && (
          <Button size="row" variant="ghost" onClick={widen.apply}>
            {widen.label}
          </Button>
        )}
      </EmptyState>
    ),
    players: (
      <EmptyState title={t("discover.empty.playersTitle")} body={t("discover.empty.playersBody")}>
        <Button size="row" variant="accent" onClick={() => navigate("/availability")}>
          {t("discover.publishAvailability")}
        </Button>
        {widen && (
          <Button size="row" variant="ghost" onClick={widen.apply}>
            {widen.label}
          </Button>
        )}
      </EmptyState>
    ),
    teams: (
      <EmptyState title={t("discover.empty.teamsTitle")} body={t("discover.empty.teamsBody")}>
        <Button size="row" variant="accent" onClick={() => navigate("/availability")}>
          {t("discover.publishAvailability")}
        </Button>
        {widen && (
          <Button size="row" variant="ghost" onClick={widen.apply}>
            {widen.label}
          </Button>
        )}
      </EmptyState>
    ),
  }[tab];

  const pendingApps = myApps.length + myGuestApps.length;

  return (
    <div className="font-body text-ink">
      <section className="rounded-panel border border-line bg-surface px-4 pb-8 pt-6 shadow-[0_3px_14px_rgba(0,0,0,.05)] sm:px-[34px] sm:pb-[34px] sm:pt-[30px]">
        {/* Page head */}
        <div className="mb-[26px] flex flex-wrap items-end gap-5">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[30px] font-bold leading-[1.05] tracking-[-0.03em]">
              {t("discover.title")}
            </h1>
            <p className="mt-[7px] text-[13.5px] tabular-nums text-muted">
              {loading && !error ? " " : t("discover.liveListings", { count: total, place })}
            </p>
          </div>
          <Button size="cta" variant="accent" onClick={broadcast}>
            {t("discover.broadcast")}
          </Button>
        </div>

        {/* Tabs + inline filters */}
        <div className="flex flex-wrap items-end gap-x-[22px] border-b border-line-2">
          <div role="tablist" className="-mb-px flex min-w-0 max-w-full gap-[22px] overflow-x-auto">
            {TABS.map((id) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setParam({ tab: id === "matches" ? null : id, map: null })}
                  className={`whitespace-nowrap border-b-2 pb-[11px] text-[13.5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                    active
                      ? "border-brand-deep font-bold text-ink"
                      : `border-transparent font-medium text-muted hover:text-ink ${counts[id] === 0 && !loading ? "opacity-60" : ""}`
                  }`}
                >
                  {t(`discover.tabs.${id}`)}{" "}
                  <span className="font-semibold tabular-nums text-muted">{loading ? "·" : counts[id]}</span>
                </button>
              );
            })}
          </div>
          <div className="order-first flex w-full flex-wrap gap-x-3.5 gap-y-2 pb-3 min-[880px]:order-none min-[880px]:ms-auto min-[880px]:w-auto min-[880px]:pb-[11px]">
            <MenuSelect
              ariaLabel={t("discover.filters.sport")}
              value={sport}
              onChange={(v) => setParam({ sport: v || null })}
              options={[
                { value: "" as Sport | "", label: t("discover.allSports") },
                ...SPORTS.map((s) => ({ value: s as Sport | "", label: SPORT_LABEL[s] })),
              ]}
            />
            <MenuSelect
              ariaLabel={t("discover.filters.country")}
              value={country}
              onChange={(v) => setParam({ country: v === DEFAULT_COUNTRY ? null : v, city: null })}
              options={COUNTRIES.map((c) => ({ value: c as string, label: c }))}
            />
            <MenuSelect
              ariaLabel={t("discover.filters.city")}
              value={cityName}
              onChange={(v) => setParam({ city: v || null })}
              options={[
                { value: "", label: t("discover.allCities") },
                ...CITIES_BY_COUNTRY[country].map((c) => ({ value: c.name, label: c.name })),
              ]}
            />
            {tab === "matches" && (
              <MenuSelect
                ariaLabel={t("discover.filters.when")}
                value={dateWindow}
                onChange={(v) => setParam({ when: v === "any" ? null : v })}
                options={DATE_WINDOWS.map((w) => ({ value: w, label: t(`discover.when.${w}`) }))}
              />
            )}
            {tab === "players" && (
              <button
                type="button"
                aria-pressed={showMap}
                onClick={() => setParam({ map: showMap ? null : "1" })}
                className={`whitespace-nowrap text-[12.5px] hover:text-ink ${showMap ? "font-bold text-brand-deep" : "text-muted"}`}
              >
                {t("discover.map")}
              </button>
            )}
          </div>
        </div>

        {tab === "players" && showMap && !loading && !error && (
          <div className="relative mt-4 overflow-hidden rounded-tile border border-line">
            <MapContainer
              center={cityCenter ?? playerPoints[0] ?? DEFAULT_CENTER}
              zoom={12}
              scrollWheelZoom={false}
              zoomControl={false}
              style={{ height: 320, width: "100%" }}
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
        )}

        {/* List body */}
        <div role="tabpanel" className="mt-1">
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : error ? (
            <div className="flex flex-wrap items-center gap-3 px-1 py-8">
              <span className="text-[13px] text-danger-text">{error}</span>
              <Button size="row" variant="ghost" onClick={() => void load()}>
                {t("discover.retry")}
              </Button>
            </div>
          ) : activeCount === 0 ? (
            empty
          ) : (
            <>
              {rows}
              <div className="flex items-center gap-3 px-1 pt-5">
                <div className="flex-1 text-[12.5px] tabular-nums text-muted">
                  {t("discover.showing", {
                    shown: Math.min(activeCount, limit),
                    total: activeCount,
                    sort: sortLabel,
                  })}
                </div>
                {activeCount > PAGE_SIZE && (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="text-[12.5px] font-bold tabular-nums text-brand-deep hover:underline"
                  >
                    {expanded ? t("discover.showLess") : t("discover.showAll", { count: activeCount })}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Your applications & invites — the only place a player answers roster/guest invites. */}
      {acting && !loading && pendingApps > 0 && (
        <section className="mt-8 rounded-panel border border-line bg-surface px-4 py-6 sm:px-[34px]">
          <h2 className="mb-1 text-[15px] font-bold">{t("discover.myApplications")}</h2>
          {myApps.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 border-b border-line-2 px-1 py-3.5 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">
                  {a.direction === "team_invited"
                    ? t("discover.rosterInvitationFrom", { team: teamName(a.team_id) })
                    : t("discover.rosterApplicationTo", { team: teamName(a.team_id) })}
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {teamById.get(a.team_id) ? SPORT_LABEL[teamById.get(a.team_id)!.sport] : "—"}
                </div>
                {/* Let the player look the team over before answering — the invite banner on the
                    team page carries the same accept/decline actions. */}
                <Link
                  to={`/teams/${a.team_id}`}
                  className="mt-0.5 block text-xs text-muted hover:text-brand"
                >
                  {t("discover.viewTeam")}
                </Link>
              </div>
              <Pill value={a.status} />
              {a.status === "pending" && a.direction === "team_invited" && (
                <>
                  <Button
                    size="row"
                    variant="ghost"
                    busy={busy === `decline:${a.id}`}
                    onClick={() =>
                      void act(`decline:${a.id}`, () => api.post(`/roster-applications/${a.id}/decline`), t("discover.declined"))
                    }
                  >
                    {t("discover.decline")}
                  </Button>
                  <Button
                    size="row"
                    variant="accent"
                    busy={busy === `accept:${a.id}`}
                    onClick={() =>
                      void act(`accept:${a.id}`, () => api.post(`/roster-applications/${a.id}/accept`), t("discover.acceptedJoined"))
                    }
                  >
                    {t("discover.accept")}
                  </Button>
                </>
              )}
              {a.status === "pending" && a.direction === "player_applied" && (
                <Button
                  size="row"
                  variant="ghost"
                  busy={busy === `withdraw:${a.id}`}
                  onClick={() =>
                    void act(`withdraw:${a.id}`, () => api.post(`/roster-applications/${a.id}/withdraw`), t("discover.withdrawn"))
                  }
                >
                  {t("discover.withdraw")}
                </Button>
              )}
            </div>
          ))}
          {myGuestApps.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 border-b border-line-2 px-1 py-3.5 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">
                  {a.direction === "team_invited"
                    ? t("discover.guestInvitationFrom", { team: teamName(a.team_id) })
                    : t("discover.guestOfferTo", { team: teamName(a.team_id) })}
                </div>
                <Link to={`/matches/${a.match_id}`} className="mt-0.5 block text-xs text-muted hover:text-brand">
                  {t("discover.viewMatch")}
                </Link>
              </div>
              <Pill value={a.status} />
              {a.status === "pending" && a.direction === "team_invited" && (
                <>
                  <Button
                    size="row"
                    variant="ghost"
                    busy={busy === `gdecline:${a.id}`}
                    onClick={() =>
                      void act(`gdecline:${a.id}`, () => api.post(`/guest-applications/${a.id}/decline`), t("discover.declined"))
                    }
                  >
                    {t("discover.decline")}
                  </Button>
                  <Button
                    size="row"
                    variant="accent"
                    busy={busy === `gaccept:${a.id}`}
                    onClick={() =>
                      void act(`gaccept:${a.id}`, () => api.post(`/guest-applications/${a.id}/accept`), t("discover.acceptedGuest"))
                    }
                  >
                    {t("discover.accept")}
                  </Button>
                </>
              )}
              {a.status === "pending" && a.direction === "player_applied" && (
                <Button
                  size="row"
                  variant="ghost"
                  busy={busy === `gwithdraw:${a.id}`}
                  onClick={() =>
                    void act(`gwithdraw:${a.id}`, () => api.post(`/guest-applications/${a.id}/withdraw`), t("discover.withdrawn"))
                  }
                >
                  {t("discover.withdraw")}
                </Button>
              )}
            </div>
          ))}
        </section>
      )}

      {selected && (
        <PlayerAvailabilityModal
          availability={selected}
          user={selectedUser}
          canInvite={!!acting && selected.user_id !== acting.id}
          invitableTeams={invitableFor(selected.sport)}
          onInvited={() => void load(true)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
