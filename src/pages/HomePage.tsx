import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type {
  GuestApplication,
  Match,
  OpponentApplication,
  RosterApplication,
} from "../api/types";
import { Card, Empty, Pill, SectionLabel, TypeDot } from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";
import { dateLabel } from "../lib/format";
import { useMyTeams, useUsers } from "../lib/useMyTeams";

interface Request {
  key: string;
  title: string;
  subtitle: string;
  actions: { label: string; successMessage: string; primary?: boolean; run: () => Promise<unknown> }[];
}

export function HomePage() {
  const { user: acting } = useActingUser();
  const { run } = useToast();
  const navigate = useNavigate();
  const { teams, allTeams, reload: reloadTeams } = useMyTeams(acting);
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { userName } = useUsers();

  const [matches, setMatches] = useState<Match[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);

  const teamName = useCallback(
    (id: string) => allTeams.find((t) => t.id === id)?.name ?? id.slice(0, 8),
    [allTeams],
  );

  const load = useCallback(async () => {
    if (!acting || teams.length === 0) {
      setMatches([]);
    }
    if (!acting) {
      setRequests([]);
      return;
    }

    // No aggregate "my matches" endpoint exists — fan out over the teams I'm in.
    const perTeam = await Promise.all(
      teams.map(({ team, role }) =>
        Promise.all([
          api.get<Match[]>(`/teams/${team.id}/matches`).catch(() => [] as Match[]),
          api
            .get<RosterApplication[]>(`/teams/${team.id}/roster-applications`)
            .catch(() => [] as RosterApplication[]),
          api
            .get<OpponentApplication[]>(`/teams/${team.id}/opponent-applications`)
            .catch(() => [] as OpponentApplication[]),
        ]).then(([m, r, o]) => ({ team, role, matches: m, roster: r, opponent: o })),
      ),
    );

    const seen = new Set<string>();
    const upcoming: Match[] = [];
    for (const { matches: ms } of perTeam) {
      for (const m of ms) {
        if (m.status === "confirmed" && !seen.has(m.id)) {
          seen.add(m.id);
          upcoming.push(m);
        }
      }
    }
    upcoming.sort((a, b) => a.date.localeCompare(b.date));
    setMatches(upcoming);

    const [myRoster, myGuest] = await Promise.all([
      api
        .get<RosterApplication[]>("/users/me/roster-applications")
        .catch(() => [] as RosterApplication[]),
      api
        .get<GuestApplication[]>("/users/me/guest-applications")
        .catch(() => [] as GuestApplication[]),
    ]);

    const items: Request[] = [];

    const decline = (run: () => Promise<unknown>) => ({
      label: t("home.decline"),
      successMessage: t("home.declined"),
      run,
    });
    const accept = (run: () => Promise<unknown>) => ({
      label: t("home.accept"),
      successMessage: t("home.accepted"),
      primary: true,
      run,
    });
    const withdraw = (run: () => Promise<unknown>) => ({
      label: t("home.withdraw"),
      successMessage: t("home.withdrawn"),
      run,
    });

    // Inbound to teams I help run.
    for (const { team, role, roster, opponent } of perTeam) {
      const manages = role === "captain" || role === "admin";
      if (!manages) continue;
      for (const a of roster) {
        if (a.status !== "pending" || a.direction !== "player_applied") continue;
        items.push({
          key: `roster-${a.id}`,
          title: t("home.rosterWantsToJoin", { user: userName(a.user_id), team: team.name }),
          subtitle: t("home.rosterApplication"),
          actions: [
            decline(() => api.post(`/roster-applications/${a.id}/decline`)),
            accept(() => api.post(`/roster-applications/${a.id}/accept`)),
          ],
        });
      }
      for (const a of opponent) {
        if (a.status !== "pending") continue;
        items.push({
          key: `opp-${a.id}`,
          title: t("home.opponentWantsToPlay", {
            team: teamName(a.responding_team_id),
            yourTeam: team.name,
          }),
          subtitle: t("home.opponentApplication"),
          actions: [
            {
              label: t("home.confirm"),
              successMessage: t("home.confirmed"),
              primary: true,
              run: () => api.post(`/opponent-applications/${a.id}/confirm`),
            },
          ],
        });
      }
    }

    // Inbound to me personally, plus my own outstanding asks.
    for (const a of myRoster) {
      if (a.status !== "pending") continue;
      if (a.direction === "team_invited") {
        items.push({
          key: `my-roster-${a.id}`,
          title: t("home.rosterInvited", { team: teamName(a.team_id) }),
          subtitle: t("home.rosterInvitation"),
          actions: [
            decline(() => api.post(`/roster-applications/${a.id}/decline`)),
            accept(() => api.post(`/roster-applications/${a.id}/accept`)),
          ],
        });
      } else {
        items.push({
          key: `my-roster-${a.id}`,
          title: t("home.youAppliedTo", { team: teamName(a.team_id) }),
          subtitle: t("home.awaitingResponse"),
          actions: [withdraw(() => api.post(`/roster-applications/${a.id}/withdraw`))],
        });
      }
    }
    for (const a of myGuest) {
      if (a.status !== "pending") continue;
      if (a.direction === "team_invited") {
        items.push({
          key: `my-guest-${a.id}`,
          title: t("home.guestInvited", { team: teamName(a.team_id) }),
          subtitle: t("home.guestInvitation"),
          actions: [
            decline(() => api.post(`/guest-applications/${a.id}/decline`)),
            accept(() => api.post(`/guest-applications/${a.id}/accept`)),
          ],
        });
      } else {
        items.push({
          key: `my-guest-${a.id}`,
          title: t("home.youOfferedGuest", { team: teamName(a.team_id) }),
          subtitle: t("home.awaitingResponse"),
          actions: [withdraw(() => api.post(`/guest-applications/${a.id}/withdraw`))],
        });
      }
    }

    setRequests(items);
  }, [acting, teams, teamName, userName, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = (fn: () => Promise<unknown>, message: string) =>
    run(fn, message).then(() => reloadTeams().then(load));

  if (!acting) {
    return (
      <>
        <h1 className="mb-1 text-[26px] font-bold">{t("home.title")}</h1>
        <p className="mb-7 text-sm text-muted">{t("home.noActingSubtitle")}</p>
        <Empty>{t("home.nobodySelected")}</Empty>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-1 text-[26px] font-bold">{t("home.title")}</h1>
      <p className="mb-7 text-sm text-muted">
        {t("home.greeting", { name: acting.name.split(" ")[0] })}
      </p>

      <div className="flex items-start gap-7">
        <div className="min-w-0 flex-[1.5]">
          <SectionLabel>{t("home.upcomingMatches")}</SectionLabel>
          {matches.length === 0 ? (
            <Empty>{t("home.noMatches")}</Empty>
          ) : (
            <div className="flex flex-col gap-4">
              {matches.map((m) => (
                <Card
                  key={m.id}
                  className="overflow-hidden rounded-card"
                  onClick={() => navigate(`/matches/${m.id}`)}
                >
                  <div className="flex h-[78px] items-center justify-center bg-stripe px-[18px] text-center text-[15px] font-extrabold leading-tight tracking-[.02em] text-white">
                    {`${teamName(m.team_a_id)} vs ${teamName(m.team_b_id)}`.toUpperCase()}
                  </div>
                  <div className="flex items-center justify-between gap-3 px-[18px] py-4">
                    <div className="min-w-0">
                      <div className="text-sm font-bold">{dateLabel(m.date, language)}</div>
                      <div className="mt-0.5 text-[12.5px] text-muted">
                        {m.pitch} · {m.city}
                      </div>
                    </div>
                    <Pill value={m.status} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="w-72 flex-none pt-[34px]">
          <SectionLabel>{t("home.requests", { count: requests.length })}</SectionLabel>
          {requests.length === 0 ? (
            <Empty>{t("home.noRequests")}</Empty>
          ) : (
            <div className="flex flex-col gap-3">
              {requests.map((r) => (
                <Card key={r.key} className="px-[15px] py-3.5">
                  <div className="mb-3 flex items-start gap-2.5">
                    <div className="pt-[5px]">
                      <TypeDot />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold leading-snug">{r.title}</div>
                      <div className="mt-0.5 text-[11.5px] text-muted">{r.subtitle}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {r.actions.map((a) => (
                      <button
                        key={a.label}
                        onClick={() => act(a.run, a.successMessage)}
                        className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold ${
                          a.primary
                            ? "border-none bg-brand text-white hover:bg-brand-dark"
                            : "border border-line bg-white text-ink-2 hover:bg-canvas"
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
