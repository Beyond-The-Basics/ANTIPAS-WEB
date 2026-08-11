import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { api } from "../api/client";
import type {
  GameType,
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
import { BroadcastChallengeModal } from "../components/BroadcastChallengeModal";
import { LineupCard } from "../components/LineupCard";
import { NegotiationModal } from "../components/NegotiationModal";
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
import { CITIES_BY_COUNTRY, type Country, findCity, isCountry } from "../lib/cities";
import { dateLabel, expiresLabel } from "../lib/format";
import { COUNTRIES } from "../lib/reference";

type Tab = "members" | "recruiting" | "opponent" | "matches";

export function TeamDetailPage() {
  const { teamId = "" } = useParams();
  const { user: acting } = useActingUser();
  const { run } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { t } = useTranslation();

  const TABS: { id: Tab; label: string }[] = [
    { id: "members", label: t("teamDetail.tabs.members") },
    { id: "recruiting", label: t("teamDetail.tabs.recruiting") },
    { id: "opponent", label: t("teamDetail.tabs.opponent") },
    { id: "matches", label: t("teamDetail.tabs.matches") },
  ];

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
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [negotiation, setNegotiation] = useState<OpponentApplication | null>(null);

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
      const [t, m, mt, allRoster, rApps, allOpp, oApps, us, ts, gts] = await Promise.all([
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
        api.get<GameType[]>(`/game-types`),
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
      setGameTypes(gts);
    });
  }, [teamId, run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!team) return <Empty>{t("teamDetail.loading")}</Empty>;

  const myRole: TeamRole | null =
    members.find((m) => m.user_id === acting?.id)?.role ?? null;
  const isCaptain = myRole === "captain";
  const manages = isCaptain || myRole === "admin";
  // Someone browsing a team they might join (e.g. from the recruiting map) only sees the roster
  // and lineup — the recruiting / opponent / matches tabs are for the team's own members.
  const isMember = myRole !== null;
  const visibleTabs = isMember ? TABS : TABS.filter((t) => t.id === "members");
  const activeTab: Tab = isMember ? tab : "members";

  const sportGameTypes = gameTypes.filter((g) => g.sport === team.sport);
  const currentGameType = gameTypes.find((g) => g.id === team.game_type_id) ?? null;
  // The captain can mark the team complete once a lineup type is set — there is no minimum-member
  // gate (unfilled positions just show empty on the lineup). Mirrors team_service.update_team.
  const canComplete = currentGameType !== null;
  const completeBlockedReason = !currentGameType ? t("teamDetail.pickLineupFirst") : undefined;

  const act = (fn: () => Promise<unknown>, message: string) => run(fn, message).then(reload);

  return (
    <>
      <Link to="/teams" className="mb-3.5 inline-block text-[13px] text-muted hover:text-ink">
        {t("teamDetail.backToTeams")}
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
                    act(() => api.patch(`/teams/${team.id}`, { name }), t("teamDetail.teamRenamed")).then(
                      () => setRenaming(false),
                    )
                  }
                >
                  {t("teamDetail.save")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setName(team.name);
                    setRenaming(false);
                  }}
                >
                  {t("teamDetail.cancel")}
                </Button>
              </div>
            ) : (
              <h1 className="truncate text-2xl font-bold">{team.name}</h1>
            )}
            <div className="mt-1.5 flex gap-1.5">
              <RolePill role={myRole} />
              <Pill
                value={team.completed ? "confirmed" : "open"}
                label={team.completed ? t("teamDetail.completedRoster") : t("teamDetail.recruitingPill")}
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
                disabled={!team.completed && !canComplete}
                title={!team.completed ? completeBlockedReason : undefined}
                onClick={() =>
                  act(
                    () => api.patch(`/teams/${team.id}`, { completed: !team.completed }),
                    team.completed ? t("teamDetail.markedRecruiting") : t("teamDetail.markedCompleted"),
                  )
                }
              >
                {team.completed ? t("teamDetail.markRecruiting") : t("teamDetail.markCompleted")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRenaming(true)}>
                {t("teamDetail.rename")}
              </Button>
            </>
          )}
          {myRole && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                run(() => api.post(`/teams/${team.id}/leave`), t("teamDetail.leftTeam")).then(() =>
                  navigate("/teams"),
                )
              }
            >
              {t("teamDetail.leaveTeam")}
            </Button>
          )}
        </div>
      </div>

      <AboutTeam team={team} manages={manages} act={act} />

      <Tabs tabs={visibleTabs} active={activeTab} onChange={setTab} />

      {activeTab === "members" && (
        <MembersTab
          team={team}
          members={members}
          manages={manages}
          isCaptain={isCaptain}
          userName={userName}
          act={act}
          sportGameTypes={sportGameTypes}
          currentGameType={currentGameType}
        />
      )}

      {activeTab === "recruiting" && (
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

      {activeTab === "opponent" && (
        <OpponentTab
          team={team}
          currentGameType={currentGameType}
          gameTypes={gameTypes}
          memberCount={members.length}
          searches={opponentSearches}
          apps={opponentApps}
          teamName={teamName}
          manages={manages}
          act={act}
          reload={reload}
          openNegotiation={setNegotiation}
        />
      )}

      {activeTab === "matches" && (
        <MatchesTab teamId={teamId} matches={matches} teamName={teamName} />
      )}

      {negotiation && (
        <NegotiationModal
          application={negotiation}
          myTeamId={team.id}
          teamName={teamName}
          userName={userName}
          onClose={() => setNegotiation(null)}
          onAgreed={(match) => {
            setNegotiation(null);
            void reload();
            navigate(`/matches/${match.id}`);
          }}
        />
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
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(team.description ?? "");
  const [country, setCountry] = useState(team.country);
  const [city, setCity] = useState(team.city ?? "");

  if (editing) {
    return (
      <Card className="mb-5 flex flex-col gap-3 p-4">
        <div>
          <Label>{t("teamDetail.description")}</Label>
          <textarea
            className="field w-full"
            rows={2}
            maxLength={500}
            placeholder={t("teamDetail.descriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Label>{t("teamDetail.country")}</Label>
            <select
              className="field w-full"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setCity("");
              }}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <Label>{t("teamDetail.city")}</Label>
            <select
              className="field w-full"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">{t("common.none")}</option>
              {(isCountry(country) ? CITIES_BY_COUNTRY[country] : []).map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
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
                t("teamDetail.teamInfoUpdated"),
              ).then(() => setEditing(false))
            }
          >
            {t("teamDetail.save")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            {t("teamDetail.cancel")}
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
          {team.description || <span className="text-faint">{t("teamDetail.noDescriptionYet")}</span>}
        </p>
        <p className="mt-1 text-[12px] text-muted">{location}</p>
      </div>
      {manages && (
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          {t("teamDetail.edit")}
        </Button>
      )}
    </Card>
  );
}

// --- members ------------------------------------------------------------------

/** Small onBlur-save numeric field — avoids an API call per keystroke on the roster list. */
function JerseyNumberInput({
  value,
  onSave,
}: {
  value: number | null;
  onSave: (next: number | null) => void;
}) {
  const [local, setLocal] = useState(value?.toString() ?? "");
  useEffect(() => setLocal(value?.toString() ?? ""), [value]);

  const commit = () => {
    const trimmed = local.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next !== value) onSave(next);
  };

  return (
    <input
      className="field w-[52px] !px-2 !py-1.5 text-center !text-[12px]"
      type="number"
      min={0}
      max={99}
      placeholder="#"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}

function LineupSection({
  team,
  members,
  isCaptain,
  sportGameTypes,
  currentGameType,
  userName,
  act,
}: {
  team: Team;
  members: Membership[];
  isCaptain: boolean;
  sportGameTypes: GameType[];
  currentGameType: GameType | null;
  userName: (id: string) => string;
  act: (fn: () => Promise<unknown>, message: string) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);

  return (
    <div className="mb-6">
      {isCaptain && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(picking || !currentGameType) &&
            sportGameTypes.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() =>
                  act(
                    () => api.patch(`/teams/${team.id}`, { game_type_id: g.id }),
                    t("teamDetail.lineupSetTo", { label: g.label }),
                  ).then(() => setPicking(false))
                }
                className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold ${
                  g.id === currentGameType?.id
                    ? "border-brand bg-brand-tint text-brand-deep"
                    : "border-line bg-surface text-muted hover:bg-canvas"
                }`}
              >
                {g.label}
              </button>
            ))}
          {currentGameType && !picking && (
            <Button size="sm" variant="ghost" onClick={() => setPicking(true)}>
              {t("teamDetail.changeLineup")}
            </Button>
          )}
          {picking && currentGameType && (
            <Button size="sm" variant="ghost" onClick={() => setPicking(false)}>
              {t("teamDetail.done")}
            </Button>
          )}
        </div>
      )}
      {!currentGameType && !isCaptain && <Empty>{t("teamDetail.noLineupYet")}</Empty>}
      <LineupCard
        team={team}
        members={members}
        gameType={currentGameType}
        userName={userName}
        editable={isCaptain}
        onReorder={(assignments) =>
          act(() => api.put(`/teams/${team.id}/lineup`, { assignments }), t("teamDetail.lineupUpdated"))
        }
      />
    </div>
  );
}

function MembersTab({
  team,
  members,
  manages,
  isCaptain,
  userName,
  act,
  sportGameTypes,
  currentGameType,
}: {
  team: Team;
  members: Membership[];
  manages: boolean;
  isCaptain: boolean;
  userName: (id: string) => string;
  act: (fn: () => Promise<unknown>, message: string) => Promise<unknown>;
  sportGameTypes: GameType[];
  currentGameType: GameType | null;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <LineupSection
        team={team}
        members={members}
        isCaptain={isCaptain}
        sportGameTypes={sportGameTypes}
        currentGameType={currentGameType}
        userName={userName}
        act={act}
      />

      <SectionLabel>{t("teamDetail.roster")}</SectionLabel>
      {members.length === 0 ? (
        <Empty>{t("teamDetail.noActiveMembers")}</Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => {
            const canManage = manages && m.role !== "captain";
            return (
              <Card key={m.id} className="flex items-center gap-3 rounded-[10px] px-4 py-3">
                <Avatar name={userName(m.user_id)} />
                <div className="flex-1 text-[13.5px] font-semibold">{userName(m.user_id)}</div>
                {manages && (
                  <JerseyNumberInput
                    value={m.jersey_number}
                    onSave={(next) =>
                      act(
                        () =>
                          api.patch(`/teams/${team.id}/members/${m.user_id}/jersey-number`, {
                            jersey_number: next,
                          }),
                        t("teamDetail.jerseyNumberUpdated"),
                      )
                    }
                  />
                )}
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
                      t("teamDetail.roleUpdated"),
                    )
                  }
                >
                  {m.role === "admin" ? t("teamDetail.demoteToMember") : t("teamDetail.promoteToAdmin")}
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
                        t("teamDetail.captaincyTransferred"),
                      )
                    }
                  >
                    {t("teamDetail.makeCaptain")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    act(() => api.del(`/teams/${team.id}/members/${m.user_id}`), t("teamDetail.memberRemoved"))
                  }
                >
                  {t("teamDetail.remove")}
                </Button>
              </>
            )}
          </Card>
        );
      })}
        </div>
      )}
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
  const { t } = useTranslation();
  const [country, setCountry] = useState<Country>(
    isCountry(team.country) ? team.country : (COUNTRIES[0] as Country),
  );
  const [city, setCity] = useState(
    isCountry(team.country) && team.city && findCity(team.country, team.city) ? team.city : "",
  );
  const [publishing, setPublishing] = useState(false);
  const [inviting, setInviting] = useState(false);

  return (
    <div>
      {searches.length === 0 ? (
        <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 px-[18px] py-4">
          <div>
            <div className="text-sm font-semibold">{t("teamDetail.noOpenRosterSearch")}</div>
            <div className="mt-0.5 text-[12.5px] text-muted">
              {t("teamDetail.publishRosterSearchHint")}
            </div>
          </div>
          {manages &&
            (publishing ? (
              <div className="flex flex-none flex-wrap items-center gap-2">
                <select
                  className="field !py-2 !text-[12.5px]"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value as Country);
                    setCity("");
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
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="">{t("teamDetail.selectCity")}</option>
                  {CITIES_BY_COUNTRY[country].map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={!city}
                  onClick={() =>
                    act(
                      () => api.post(`/teams/${team.id}/roster-searches`, { city, country }),
                      t("teamDetail.rosterSearchPublished"),
                    ).then(() => {
                      setPublishing(false);
                    })
                  }
                >
                  {t("teamDetail.publish")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPublishing(false)}>
                  {t("teamDetail.cancel")}
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setPublishing(true)}>
                {t("teamDetail.publishRosterSearch")}
              </Button>
            ))}
        </Card>
      ) : (
        searches.map((s) => (
          <Card key={s.id} className="mb-5 flex items-center justify-between gap-3 px-[18px] py-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold">
                {t("teamDetail.rosterSearchLabel", { city: s.city })} <ShortId id={s.id} />
              </div>
              <div className="mt-0.5 text-[12.5px] text-muted">
                {t("teamDetail.costsCreditExpiresIn", { time: expiresLabel(s.expires_at, t) })}
              </div>
            </div>
            <div className="flex flex-none items-center gap-2">
              <Pill value={s.status} />
              {manages && s.status === "open" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    act(() => api.post(`/roster-searches/${s.id}/close`), t("teamDetail.searchClosed"))
                  }
                >
                  {t("teamDetail.close")}
                </Button>
              )}
            </div>
          </Card>
        ))
      )}

      <SectionLabel>{t("teamDetail.applicants")}</SectionLabel>
      {apps.length === 0 ? (
        <Empty>{t("teamDetail.noRosterApplications")}</Empty>
      ) : (
        <div className="mb-6 flex flex-col gap-2.5">
          {apps.map((a) => (
            <Card key={a.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">{userName(a.user_id)}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {a.direction === "player_applied"
                    ? t("teamDetail.appliedToJoin")
                    : t("teamDetail.invitedByTeam")}
                </div>
              </div>
              <Pill value={a.status} />
              {manages && a.status === "pending" && a.direction === "player_applied" && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      act(() => api.post(`/roster-applications/${a.id}/decline`), t("teamDetail.declined"))
                    }
                  >
                    {t("teamDetail.decline")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      act(
                        () => api.post(`/roster-applications/${a.id}/accept`),
                        t("teamDetail.acceptedMemberAdded"),
                      )
                    }
                  >
                    {t("teamDetail.accept")}
                  </Button>
                </>
              )}
              {manages && a.status === "pending" && a.direction === "team_invited" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    act(
                      () => api.post(`/roster-applications/${a.id}/withdraw`),
                      t("teamDetail.inviteWithdrawn"),
                    )
                  }
                >
                  {t("teamDetail.withdrawInvite")}
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
              {t("teamDetail.done")}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setInviting(true)}>
            {t("teamDetail.invitePlayer")}
          </Button>
        ))}
    </div>
  );
}

// --- find opponent ------------------------------------------------------------

function OpponentTab({
  team,
  currentGameType,
  gameTypes,
  memberCount,
  searches,
  apps,
  teamName,
  manages,
  act,
  reload,
  openNegotiation,
}: {
  team: Team;
  currentGameType: GameType | null;
  gameTypes: GameType[];
  memberCount: number;
  searches: OpponentSearch[];
  apps: OpponentApplication[];
  teamName: (id: string) => string;
  manages: boolean;
  act: (fn: () => Promise<unknown>, message: string) => Promise<unknown>;
  reload: () => Promise<void>;
  openNegotiation: (app: OpponentApplication) => void;
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [wizardOpen, setWizardOpen] = useState(false);

  if (!team.completed) {
    return (
      <div className="rounded-tile border border-dashed border-line p-6 text-[13.5px] leading-relaxed text-muted">
        {t("teamDetail.markCompletedPre")}{" "}
        <strong className="text-ink">{t("teamDetail.completedWord")}</strong>{" "}
        {t("teamDetail.markCompletedPost")}
      </div>
    );
  }

  return (
    <div>
      {wizardOpen && (
        <BroadcastChallengeModal
          team={team}
          gameTypes={gameTypes}
          memberCount={memberCount}
          teamName={teamName}
          onClose={() => setWizardOpen(false)}
          onPublished={() => void reload()}
        />
      )}
      {/* The broadcast CTA is the tab's primary action, so it sits outside the empty state — a
          team that already has a listing (open, withdrawn or expired) must still be able to put
          out another challenge. */}
      {manages && (
        <Card className="mb-5 px-[18px] py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{t("broadcast.trigger")}</div>
              <div className="mt-0.5 text-[12.5px] text-muted">
                {t("broadcast.triggerHint")}
                {currentGameType && (
                  <>
                    {" "}
                    {t("teamDetail.formatFromLineup", { label: currentGameType.label })}
                  </>
                )}
              </div>
            </div>
            <Button size="sm" onClick={() => setWizardOpen(true)}>
              {t("broadcast.trigger")}
            </Button>
          </div>
        </Card>
      )}
      {searches.length === 0 ? (
        <Card className="mb-5 px-[18px] py-4">
          <div className="text-sm font-semibold">{t("teamDetail.noOpenOpponentSearch")}</div>
          <div className="mt-0.5 text-[12.5px] text-muted">
            {t("teamDetail.publishOpponentSearchHint")}
          </div>
        </Card>
      ) : (
        searches.map((s) => (
          <Card key={s.id} className="mb-5 flex items-center justify-between gap-3 px-[18px] py-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold">
                {/* `pitch` is null when the broadcast left the venue for the opponent to pick,
                    so say that rather than trailing a bare separator. */}
                {dateLabel(s.date, language)} · {s.city} ·{" "}
                {s.pitch ?? t("broadcast.opponentChooses")}
              </div>
              <div className="mt-0.5 text-[12.5px] text-muted">
                {t("teamDetail.costsCreditExpiresIn", { time: expiresLabel(s.expires_at, t) })}
              </div>
            </div>
            <div className="flex flex-none items-center gap-2">
              <Pill value={s.status} />
              {manages && s.status === "open" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    act(() => api.post(`/opponent-searches/${s.id}/withdraw`), t("teamDetail.withdrawn"))
                  }
                >
                  {t("teamDetail.withdraw")}
                </Button>
              )}
            </div>
          </Card>
        ))
      )}

      <SectionLabel>{t("teamDetail.respondingTeams")}</SectionLabel>
      <ResponderList
        searches={searches}
        teamName={teamName}
        manages={manages}
        openNegotiation={openNegotiation}
      />

      {apps.length > 0 && (
        <div className="mt-8">
          <SectionLabel>{t("teamDetail.challengesToOthers")}</SectionLabel>
          <div className="flex flex-col gap-2.5">
            {apps.map((a) => (
              <Card key={a.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex-1 text-[13.5px] font-semibold">
                  {t("teamDetail.challengeLabel")} <ShortId id={a.opponent_search_id} />
                </div>
                <Pill
                  value={a.status}
                  label={a.status === "accepted" ? t("teamDetail.negotiating") : undefined}
                />
                {a.status === "accepted" && (
                  <Button size="sm" onClick={() => openNegotiation(a)}>
                    {t("teamDetail.openChat")}
                  </Button>
                )}
                {manages && a.status === "pending" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      act(() => api.post(`/opponent-applications/${a.id}/withdraw`), t("teamDetail.withdrawn"))
                    }
                  >
                    {t("teamDetail.withdraw")}
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
  openNegotiation,
}: {
  searches: OpponentSearch[];
  teamName: (id: string) => string;
  manages: boolean;
  openNegotiation: (app: OpponentApplication) => void;
}) {
  const { run } = useToast();
  const { t } = useTranslation();
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
  if (all.length === 0) return <Empty>{t("teamDetail.noTeamsResponded")}</Empty>;

  return (
    <div className="flex flex-col gap-2.5">
      {all.map((a) => (
        <Card key={a.id} className="flex items-center gap-3 px-4 py-3.5">
          <div className="flex-1 text-[13.5px] font-semibold">
            {teamName(a.responding_team_id)}
          </div>
          <Pill
            value={a.status}
            label={a.status === "accepted" ? t("teamDetail.negotiating") : undefined}
          />
          {manages && a.status === "pending" && (
            <Button
              size="sm"
              onClick={() =>
                run(async () => {
                  const accepted = await api.post<OpponentApplication>(
                    `/opponent-applications/${a.id}/accept`,
                  );
                  await load();
                  openNegotiation(accepted);
                }, t("teamDetail.challengeAccepted"))
              }
            >
              {t("teamDetail.acceptChallenge")}
            </Button>
          )}
          {a.status === "accepted" && (
            <Button size="sm" onClick={() => openNegotiation(a)}>
              {t("teamDetail.openChat")}
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
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  if (matches.length === 0) {
    return <Empty>{t("teamDetail.noMatchesYet")}</Empty>;
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
              <div className="text-[13.5px] font-semibold">
                {t("teamDetail.vsTeam", { team: teamName(opponentId) })}
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {dateLabel(m.date, language)} · {m.city}
              </div>
            </div>
            <Pill value={m.status} />
          </Card>
        );
      })}
    </div>
  );
}
