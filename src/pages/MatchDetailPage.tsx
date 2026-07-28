import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import type {
  GuestApplication,
  GuestSearch,
  Match,
  MatchGuestParticipant,
  Membership,
  Team,
  User,
} from "../api/types";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Pill,
  SectionLabel,
  ShortId,
} from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";
import { dateLabel, expiresLabel } from "../lib/format";

export function MatchDetailPage() {
  const { matchId = "" } = useParams();
  const { user: acting } = useActingUser();
  const { run } = useToast();
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searches, setSearches] = useState<GuestSearch[]>([]);
  const [apps, setApps] = useState<Record<string, GuestApplication[]>>({});
  const [guests, setGuests] = useState<MatchGuestParticipant[]>([]);
  /** Which side of the fixture the acting user can act for — null if they're on neither. */
  const [mySide, setMySide] = useState<{ teamId: string; manages: boolean } | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteUser, setInviteUser] = useState("");

  const teamName = useCallback(
    (id: string) => teams.find((t) => t.id === id)?.name ?? id.slice(0, 8),
    [teams],
  );
  const userName = useCallback(
    (id: string) => users.find((u) => u.id === id)?.name ?? id.slice(0, 8),
    [users],
  );

  const reload = useCallback(async () => {
    await run(async () => {
      const [m, ts, us, allSearches, participants] = await Promise.all([
        api.get<Match>(`/matches/${matchId}`),
        api.get<Team[]>(`/teams`),
        api.get<User[]>(`/users`),
        api.get<GuestSearch[]>(`/guest-searches`),
        api.get<MatchGuestParticipant[]>(`/matches/${matchId}/guests`),
      ]);
      setMatch(m);
      setTeams(ts);
      setUsers(us);
      // Browse returns every open guest search; narrow to this fixture.
      const mine = allSearches.filter((s) => s.match_id === matchId);
      setSearches(mine);
      setGuests(participants);

      const perSearch = await Promise.all(
        mine.map((s) =>
          api
            .get<GuestApplication[]>(`/guest-searches/${s.id}/applications`)
            .catch(() => [] as GuestApplication[])
            .then((list) => [s.id, list] as const),
        ),
      );
      setApps(Object.fromEntries(perSearch));

      if (acting) {
        const rosters = await Promise.all(
          [m.team_a_id, m.team_b_id].map((id) =>
            api
              .get<Membership[]>(`/teams/${id}/members`)
              .catch(() => [] as Membership[])
              .then((members) => ({ id, members })),
          ),
        );
        let side: { teamId: string; manages: boolean } | null = null;
        for (const { id, members } of rosters) {
          const me = members.find((x) => x.user_id === acting.id);
          if (me) side = { teamId: id, manages: me.role === "captain" || me.role === "admin" };
        }
        setMySide(side);
      } else {
        setMySide(null);
      }
    });
  }, [matchId, acting, run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!match) return <Empty>{t("matchDetail.loading")}</Empty>;

  const act = (fn: () => Promise<unknown>, message: string) => run(fn, message).then(reload);
  const live = match.status === "confirmed";
  const myOpenSearch = searches.find((s) => s.team_id === mySide?.teamId && s.status === "open");

  return (
    <>
      <Link
        to={`/teams/${mySide?.teamId ?? match.team_a_id}?tab=matches`}
        className="mb-3.5 inline-block text-[13px] text-muted hover:text-ink"
      >
        {t("matchDetail.back")}
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">
            {t("matchDetail.vsTeam", {
              home: teamName(match.team_a_id),
              away: teamName(match.team_b_id),
            })}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            {dateLabel(match.date, language)} · {match.city} · {match.pitch}
          </p>
          <p className="mt-0.5 text-[12.5px] text-faint">
            {t("matchDetail.bookedBy", { team: teamName(match.booked_by_team_id) })}
          </p>
        </div>
        <Pill value={match.status} />
      </div>

      {mySide?.manages && live && (
        <div className="mb-8 flex gap-2">
          <Button
            variant="ghost"
            onClick={() =>
              act(() => api.post(`/matches/${match.id}/played`), t("matchDetail.markedPlayed"))
            }
          >
            {t("matchDetail.markPlayed")}
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              act(() => api.post(`/matches/${match.id}/cancel`), t("matchDetail.matchCancelled"))
            }
          >
            {t("matchDetail.cancelMatch")}
          </Button>
        </div>
      )}

      <SectionLabel>
        {t("matchDetail.guestSearch")}{" "}
        {myOpenSearch ? t("matchDetail.expiresIn", { time: expiresLabel(myOpenSearch.expires_at, t) }) : ""}
      </SectionLabel>

      {searches.length === 0 ? (
        <Card className="mb-5 flex items-center justify-between gap-3 px-[18px] py-4">
          <div>
            <div className="text-sm font-semibold">{t("matchDetail.noGuestSearchOpen")}</div>
            <div className="mt-0.5 text-[12.5px] text-muted">{t("matchDetail.guestSearchHint")}</div>
          </div>
          {mySide?.manages && live && (
            <Button
              size="sm"
              onClick={() =>
                act(
                  () =>
                    api.post(`/matches/${match.id}/guest-searches`, { team_id: mySide.teamId }),
                  t("matchDetail.guestSearchPublished"),
                )
              }
            >
              {t("matchDetail.publishGuestSearch")}
            </Button>
          )}
        </Card>
      ) : (
        <div className="mb-6 flex flex-col gap-4">
          {searches.map((s) => (
            <div key={s.id}>
              <Card className="mb-2.5 flex items-center justify-between gap-3 px-[18px] py-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {teamName(s.team_id)} · {s.city}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-muted">
                    {t("matchDetail.expiresInPlain", { time: expiresLabel(s.expires_at, t) })}{" "}
                    <ShortId id={s.id} />
                  </div>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <Pill value={s.status} />
                  {mySide?.manages && s.team_id === mySide.teamId && s.status === "open" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        act(() => api.post(`/guest-searches/${s.id}/withdraw`), t("matchDetail.withdrawn"))
                      }
                    >
                      {t("matchDetail.withdraw")}
                    </Button>
                  )}
                </div>
              </Card>

              <div className="flex flex-col gap-2.5 ps-1">
                {(apps[s.id] ?? []).length === 0 && (
                  <p className="text-[12.5px] text-faint">{t("matchDetail.noApplicantsYet")}</p>
                )}
                {(apps[s.id] ?? []).map((a) => (
                  <Card key={a.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold">{userName(a.user_id)}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        {a.direction === "player_applied"
                          ? t("matchDetail.appliedAsGuest")
                          : t("matchDetail.invitedAsGuest")}
                      </div>
                    </div>
                    <Pill value={a.status} />
                    {mySide?.manages &&
                      a.status === "pending" &&
                      a.direction === "player_applied" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              act(
                                () => api.post(`/guest-applications/${a.id}/decline`),
                                t("matchDetail.declined"),
                              )
                            }
                          >
                            {t("matchDetail.decline")}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              act(
                                () => api.post(`/guest-applications/${a.id}/accept`),
                                t("matchDetail.acceptedGuestAdded"),
                              )
                            }
                          >
                            {t("matchDetail.accept")}
                          </Button>
                        </>
                      )}
                    {mySide?.manages &&
                      a.status === "pending" &&
                      a.direction === "team_invited" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            act(
                              () => api.post(`/guest-applications/${a.id}/withdraw`),
                              t("matchDetail.inviteWithdrawn"),
                            )
                          }
                        >
                          {t("matchDetail.withdrawInvite")}
                        </Button>
                      )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {mySide?.manages &&
        live &&
        (inviting ? (
          <div className="mb-8 flex items-center gap-2">
            <select
              className="field w-[220px]"
              autoFocus
              value={inviteUser}
              onChange={(e) => setInviteUser(e.target.value)}
            >
              <option value="">{t("matchDetail.pickPlayer")}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <Button
              disabled={!inviteUser}
              onClick={() =>
                act(
                  () =>
                    api.post(`/matches/${match.id}/guest-invitations`, {
                      team_id: mySide.teamId,
                      user_id: inviteUser,
                    }),
                  t("matchDetail.guestInvited"),
                ).then(() => {
                  setInviteUser("");
                  setInviting(false);
                })
              }
            >
              {t("matchDetail.invite")}
            </Button>
            <Button variant="ghost" onClick={() => setInviting(false)}>
              {t("matchDetail.cancel")}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" className="mb-8" onClick={() => setInviting(true)}>
            {t("matchDetail.inviteGuest")}
          </Button>
        ))}

      <SectionLabel>{t("matchDetail.confirmedGuests")}</SectionLabel>
      {guests.length === 0 ? (
        <Empty>{t("matchDetail.noGuestsYet")}</Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {guests.map((g) => (
            <Card key={g.id} className="flex items-center gap-3 rounded-[10px] px-4 py-3">
              <Avatar name={userName(g.user_id)} size={28} />
              <div className="text-[13.5px] font-semibold">{userName(g.user_id)}</div>
              <div className="text-xs text-muted">
                {t("matchDetail.playingFor", { team: teamName(g.team_id) })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-4 text-[11.5px] leading-snug text-faint">
        {t("matchDetail.directInvitesNotePre")} <span className="font-mono">guest_search_id</span>
        {t("matchDetail.directInvitesNotePost")}
      </p>
    </>
  );
}
