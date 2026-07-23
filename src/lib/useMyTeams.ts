import { useCallback, useEffect, useState } from "react";

import { api } from "../api/client";
import type { Membership, Team, TeamRole, User } from "../api/types";

export interface MyTeam {
  team: Team;
  role: TeamRole;
  members: Membership[];
}

/**
 * The teams the acting user belongs to, with their role and roster.
 *
 * The API has no "teams I'm in" endpoint, so this lists every team and reads each roster to find
 * the acting user — an N+1 fan-out. Fine at the scale this console runs at; the moment the backend
 * grows `GET /users/me/teams` this hook should collapse into a single call.
 */
export function useMyTeams(acting: User | null) {
  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const all = await api.get<Team[]>("/teams");
      setAllTeams(all);
      if (!acting) {
        setTeams([]);
        return;
      }
      const rosters = await Promise.all(
        all.map((t) =>
          api
            .get<Membership[]>(`/teams/${t.id}/members`)
            .catch(() => [] as Membership[])
            .then((members) => ({ team: t, members })),
        ),
      );
      const mine: MyTeam[] = [];
      for (const { team, members } of rosters) {
        const me = members.find((m) => m.user_id === acting.id);
        if (me) mine.push({ team, role: me.role, members });
      }
      setTeams(mine);
    } catch {
      setTeams([]);
      setAllTeams([]);
    } finally {
      setLoading(false);
    }
  }, [acting]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { teams, allTeams, loading, reload };
}

/** Resolve user ids to names once, for the many places that render `user_id`. */
export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    api
      .get<User[]>("/users")
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const userName = useCallback(
    (id: string) => users.find((u) => u.id === id)?.name ?? id.slice(0, 8),
    [users],
  );

  return { users, userName };
}
