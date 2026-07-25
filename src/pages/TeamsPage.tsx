import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { Match } from "../api/types";
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
import { useMyTeams, useUsers } from "../lib/useMyTeams";

export function TeamsPage() {
  const { user: acting } = useActingUser();
  const navigate = useNavigate();
  const { teams, allTeams } = useMyTeams(acting);
  const { userName } = useUsers();
  const [matchesByTeam, setMatchesByTeam] = useState<Record<string, Match[]>>({});

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

  const myTeamIds = new Set(teams.map((t) => t.team.id));

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-[26px] font-bold">Teams</h1>
          <p className="text-sm text-muted">Teams you belong to</p>
        </div>
        <Button onClick={() => navigate("/teams/new")} disabled={!acting}>
          + Create team
        </Button>
      </div>

      {!acting ? (
        <Empty>Pick who you're acting as to see your teams.</Empty>
      ) : teams.length === 0 ? (
        <Empty>You're not on any team yet — create one, or apply from Discover.</Empty>
      ) : (
        <div className="flex flex-col gap-2.5">
          {teams.map(({ team, role, members }) => {
            const confirmed = (matchesByTeam[team.id] ?? []).find((m) => m.status === "confirmed");
            let ctaLabel: string;
            let ctaPrimary = true;
            let onCta: () => void;
            let subtitle: string;
            if (confirmed && team.completed) {
              ctaLabel = "View match";
              ctaPrimary = false;
              onCta = () => navigate(`/matches/${confirmed.id}`);
              subtitle = `${SPORT_LABEL[team.sport]} · match confirmed`;
            } else if (team.completed) {
              ctaLabel = "Find opponent";
              onCta = () => navigate(`/teams/${team.id}?tab=opponent`);
              subtitle = `${SPORT_LABEL[team.sport]} · ready for an opponent`;
            } else {
              ctaLabel = "Add players";
              onCta = () => navigate(`/teams/${team.id}?tab=recruiting`);
              subtitle = `${SPORT_LABEL[team.sport]} · recruiting players`;
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
                    {team.is_adhoc && <Pill value="closed" label="ad hoc" />}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">{subtitle}</div>
                </div>
                <AvatarStack
                  names={members.map((m) => userName(m.user_id))}
                  total={members.length}
                />
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

      {allTeams.some((t) => !myTeamIds.has(t.id)) && (
        <div className="mt-10">
          <SectionLabel>Other teams</SectionLabel>
          <div className="flex flex-col gap-2">
            {allTeams
              .filter((t) => !myTeamIds.has(t.id))
              .map((t) => (
                <Card key={t.id} className="flex items-center gap-3 rounded-[10px] px-4 py-3">
                  <SportDot sport={t.sport} size={26} />
                  <Link
                    to={`/teams/${t.id}`}
                    className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink hover:text-brand"
                  >
                    {t.name}
                  </Link>
                  <span className="text-xs text-muted">{SPORT_LABEL[t.sport]}</span>
                  <Pill
                    value={t.completed ? "confirmed" : "open"}
                    label={t.completed ? "Completed roster" : "Recruiting"}
                  />
                </Card>
              ))}
          </div>
        </div>
      )}
    </>
  );
}
