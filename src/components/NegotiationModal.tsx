// The post-acceptance negotiation between two teams: a structured "match challenge" card (date,
// time range, pitch — matching the Kickoff Design mockup) plus a real-time chat (WebSocket) kept
// below the fold. Either captain can counter the current offer; the OTHER captain agrees, which
// creates the match. Proposal/agreement events also arrive over the socket so both sides stay live.

import type { TFunction } from "i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { api, getActingUserId } from "../api/client";
import type {
  Match,
  NegotiationMessage,
  NegotiationProposal,
  OpponentApplication,
  OpponentSearch,
} from "../api/types";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";
import { fullDateLabel, relativeTime, timeOnlyLabel, timeRangeLabel } from "../lib/format";
import { Avatar, Button, SectionLabel } from "./ui";

/** ISO datetime -> {date: "2026-08-08", time: "18:30"} in local time, for the two split inputs. */
function splitLocal(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** Recombine a date + time pair (both in local time) back into an ISO string, or null if incomplete. */
function combineLocal(date: string, time: string): string | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Diffs one offer against the previous one to produce the Offer History line — this summary is
 * built client-side; the backend only stores immutable snapshots. */
function summarizeProposal(
  entry: NegotiationProposal,
  older: NegotiationProposal | undefined,
  proposerLabel: string,
  language: string,
  t: TFunction,
): string {
  if (!older) {
    return t("negotiation.proposedSentence", {
      proposer: proposerLabel,
      date: fullDateLabel(entry.date, language),
      time: timeOnlyLabel(entry.date, language),
    });
  }
  const changes: string[] = [];
  if (entry.date.slice(0, 10) !== older.date.slice(0, 10)) {
    changes.push(t("negotiation.movedDateTo", { date: fullDateLabel(entry.date, language) }));
  }
  if (
    timeOnlyLabel(entry.date, language) !== timeOnlyLabel(older.date, language) ||
    entry.end_date !== older.end_date
  ) {
    changes.push(
      t("negotiation.movedTimeTo", { time: timeRangeLabel(entry.date, entry.end_date, language) }),
    );
  }
  if (entry.pitch !== older.pitch || entry.pitch_address !== older.pitch_address) {
    changes.push(t("negotiation.movedPitchTo", { pitch: entry.pitch }));
  }
  return changes.length > 0
    ? t("negotiation.counteredWithChanges", { proposer: proposerLabel, changes: changes.join(", ") })
    : t("negotiation.counteredNoChanges", { proposer: proposerLabel });
}

export function NegotiationModal({
  application,
  myTeamId,
  teamName,
  userName,
  onClose,
  onAgreed,
}: {
  application: OpponentApplication;
  myTeamId: string;
  teamName: (id: string) => string;
  userName: (id: string) => string;
  onClose: () => void;
  onAgreed: (match: Match) => void;
}) {
  const { user: acting } = useActingUser();
  const { run } = useToast();
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const [search, setSearch] = useState<OpponentSearch | null>(null);
  const [proposals, setProposals] = useState<NegotiationProposal[]>([]);
  const [proposedDate, setProposedDate] = useState(application.proposed_date);
  const [proposedEndDate, setProposedEndDate] = useState(application.proposed_end_date);
  const [proposedPitch, setProposedPitch] = useState(application.proposed_pitch);
  const [proposedPitchAddress, setProposedPitchAddress] = useState(application.proposed_pitch_address);
  const [proposedBy, setProposedBy] = useState(application.proposed_by_team_id);

  const [editing, setEditing] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formPitch, setFormPitch] = useState("");
  const [formPitchAddress, setFormPitchAddress] = useState("");

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const appId = application.id;

  const refreshProposals = useCallback(() => {
    void api
      .get<NegotiationProposal[]>(`/opponent-applications/${appId}/proposals`)
      .then(setProposals)
      .catch(() => {});
  }, [appId]);

  useEffect(() => {
    void api
      .get<OpponentSearch>(`/opponent-searches/${application.opponent_search_id}`)
      .then(setSearch)
      .catch(() => setSearch(null));
    refreshProposals();
    void api
      .get<NegotiationMessage[]>(`/opponent-applications/${appId}/messages`)
      .then(setMessages)
      .catch(() => setMessages([]));

    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(
      `${proto}://${location.host}/api/v1/ws/negotiations/${appId}?user_id=${getActingUserId() ?? ""}`,
    );
    wsRef.current = ws;
    ws.onmessage = (e) => {
      const evt = JSON.parse(e.data);
      if (evt.type === "message") {
        setMessages((prev) =>
          prev.some((m) => m.id === evt.id)
            ? prev
            : [
                ...prev,
                {
                  id: evt.id,
                  opponent_application_id: appId,
                  sender_user_id: evt.sender_user_id,
                  body: evt.body,
                  created_at: evt.created_at,
                },
              ],
        );
      } else if (evt.type === "proposal") {
        setProposedDate(evt.proposed_date);
        setProposedEndDate(evt.proposed_end_date);
        setProposedPitch(evt.proposed_pitch);
        setProposedPitchAddress(evt.proposed_pitch_address);
        setProposedBy(evt.proposed_by_team_id);
        setEditing(false);
        refreshProposals();
      } else if (evt.type === "agreed") {
        void api.get<Match>(`/matches/${evt.match_id}`).then(onAgreed);
      }
    };
    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  useEffect(() => {
    if (chatOpen) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, chatOpen]);

  const send = useCallback(() => {
    const body = draft.trim();
    if (!body) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "message", body }));
    else void api.post(`/opponent-applications/${appId}/messages`, { body });
    setDraft("");
  }, [draft, appId]);

  const startEdit = () => {
    const { date, time } = splitLocal(proposedDate);
    const { time: endTime } = splitLocal(proposedEndDate);
    setFormDate(date);
    setFormStartTime(time);
    setFormEndTime(endTime);
    setFormPitch(proposedPitch ?? "");
    setFormPitchAddress(proposedPitchAddress ?? "");
    setEditing(true);
  };

  const submitCounter = () => {
    const date = combineLocal(formDate, formStartTime);
    const endDate = formEndTime ? combineLocal(formDate, formEndTime) : null;
    if (!date || !formPitch.trim()) return;
    void run(async () => {
      const updated = await api.post<OpponentApplication>(`/opponent-applications/${appId}/propose`, {
        date,
        end_date: endDate,
        pitch: formPitch.trim(),
        pitch_address: formPitchAddress.trim() || null,
      });
      setProposedDate(updated.proposed_date);
      setProposedEndDate(updated.proposed_end_date);
      setProposedPitch(updated.proposed_pitch);
      setProposedPitchAddress(updated.proposed_pitch_address);
      setProposedBy(updated.proposed_by_team_id);
      refreshProposals();
      setEditing(false);
    }, t("negotiation.counterOfferSent"));
  };

  const agree = () =>
    run(async () => {
      const match = await api.post<Match>(`/opponent-applications/${appId}/agree`);
      onAgreed(match);
    }, t("negotiation.matchScheduled"));

  const canAgree = proposedBy !== null && proposedBy !== myTeamId && !!proposedDate && !editing;

  const homeId = search?.team_id ?? null;
  const awayId = application.responding_team_id;
  const homeName = homeId ? teamName(homeId) : "…";
  const awayName = teamName(awayId);

  const latestProposal = proposals[proposals.length - 1];
  const proposedByName = proposedBy ? teamName(proposedBy) : null;
  const proposedByMe = proposedBy === myTeamId;

  const historyDesc = [...proposals].reverse();

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-card border border-line bg-white shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto">
          {/* header */}
          <div className="bg-gradient-to-br from-brand to-brand-deep px-5 py-5 text-white">
            <div className="flex items-center justify-between">
              <div className="text-[11.5px] font-bold uppercase tracking-[.08em] text-white/70">
                {t("negotiation.matchChallenge")}
              </div>
              <span className="whitespace-nowrap rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-bold">
                {application.status === "accepted"
                  ? t("negotiation.negotiating")
                  : t(`status.${application.status}`)}
              </span>
            </div>
            <div className="mt-1 text-[22px] font-bold leading-tight">
              {t("negotiation.vsTeam", { home: homeName, away: awayName })}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex">
                <div className="ring-2 ring-brand-deep" style={{ marginRight: -10, borderRadius: 999 }}>
                  <Avatar name={homeName} size={30} />
                </div>
                <div className="ring-2 ring-brand-deep" style={{ borderRadius: 999 }}>
                  <Avatar name={awayName} size={30} />
                </div>
              </div>
              <div className="text-[12.5px] text-white/85">{t("negotiation.bothCaptainsAgree")}</div>
            </div>
          </div>

          <div className="px-5 py-4">
            {/* current offer banner */}
            {proposedByName && (
              <div className="mb-4 flex items-center gap-2.5 rounded-tile border border-amber-200 bg-amber-50 px-3.5 py-2.5">
                <Avatar name={proposedByName} size={26} />
                <div className="text-[12.5px] text-amber-900">
                  <strong className="font-bold">
                    {proposedByMe ? t("negotiation.you") : proposedByName}
                  </strong>{" "}
                  {t("negotiation.proposedTheseTerms")}
                  {latestProposal && <> · {relativeTime(latestProposal.created_at, t)}</>}
                </div>
              </div>
            )}

            {!editing ? (
              <div className="flex flex-col gap-3">
                <OfferRow
                  label={t("negotiation.date")}
                  icon="📅"
                  value={fullDateLabel(proposedDate, language)}
                  highlight
                  onEdit={startEdit}
                  editLabel={t("negotiation.edit")}
                />
                <OfferRow
                  label={t("negotiation.time")}
                  icon="⏰"
                  value={timeRangeLabel(proposedDate, proposedEndDate, language)}
                  onEdit={startEdit}
                  editLabel={t("negotiation.edit")}
                />
                <OfferRow
                  label={t("negotiation.pitch")}
                  icon="📍"
                  value={proposedPitch ?? "—"}
                  sub={proposedPitchAddress ?? undefined}
                  onEdit={startEdit}
                  editLabel={t("negotiation.edit")}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <SectionLabel>{t("negotiation.date")}</SectionLabel>
                  <input
                    type="date"
                    className="field w-full"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
                <div>
                  <SectionLabel>{t("negotiation.time")}</SectionLabel>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      className="field flex-1"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                    />
                    <span className="text-muted">–</span>
                    <input
                      type="time"
                      className="field flex-1"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <SectionLabel>{t("negotiation.pitch")}</SectionLabel>
                  <input
                    className="field mb-2 w-full"
                    placeholder={t("negotiation.venueName")}
                    value={formPitch}
                    onChange={(e) => setFormPitch(e.target.value)}
                  />
                  <input
                    className="field w-full"
                    placeholder={t("negotiation.addressOptional")}
                    value={formPitchAddress}
                    onChange={(e) => setFormPitchAddress(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* offer history */}
            {historyDesc.length > 0 && (
              <div className="mt-5 border-t border-line pt-4">
                <SectionLabel>{t("negotiation.offerHistory")}</SectionLabel>
                <div className="flex flex-col gap-2">
                  {historyDesc.map((entry, i) => {
                    const older = historyDesc[i + 1];
                    const mine = entry.proposed_by_team_id === myTeamId;
                    const proposerLabel = mine ? t("negotiation.you") : teamName(entry.proposed_by_team_id);
                    return (
                      <div key={entry.id} className="flex items-start gap-2 text-[12.5px]">
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 flex-none rounded-full ${
                            mine ? "bg-brand" : "bg-amber-500"
                          }`}
                        />
                        <div>
                          <span className="text-ink">
                            {summarizeProposal(entry, older, proposerLabel, language, t)}
                          </span>{" "}
                          <span className="text-faint">· {relativeTime(entry.created_at, t)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* chat, collapsed by default — the mockup doesn't show it, but it's real, working
               negotiation functionality (accept -> chat -> propose -> agree). */}
            <div className="mt-5 border-t border-line pt-4">
              <button
                className="text-[12.5px] font-bold text-muted hover:text-ink"
                onClick={() => setChatOpen((o) => !o)}
              >
                {chatOpen ? t("negotiation.hideChat") : t("negotiation.showChat")}
              </button>
              {chatOpen && (
                <div className="mt-3">
                  <div ref={scrollRef} className="max-h-48 space-y-2 overflow-y-auto">
                    {messages.length === 0 ? (
                      <p className="text-[12.5px] text-faint">{t("negotiation.noMessagesYet")}</p>
                    ) : (
                      messages.map((m) => {
                        const mine = m.sender_user_id === acting?.id;
                        return (
                          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-[13px] ${
                                mine ? "bg-brand text-white" : "bg-canvas text-ink"
                              }`}
                            >
                              {!mine && (
                                <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                                  {userName(m.sender_user_id)}
                                </div>
                              )}
                              {m.body}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      className="field flex-1"
                      placeholder={t("negotiation.messagePlaceholder")}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && send()}
                    />
                    <Button size="sm" onClick={send} disabled={!draft.trim()}>
                      {t("negotiation.send")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center gap-2.5 border-t border-line px-5 py-3.5">
          {editing ? (
            <>
              <Button variant="ghost" className="flex-1" onClick={() => setEditing(false)}>
                {t("negotiation.cancel")}
              </Button>
              <Button
                className="flex-[2] font-bold"
                onClick={submitCounter}
                disabled={!formDate || !formStartTime || !formPitch.trim()}
              >
                {t("negotiation.sendCounterOffer")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="flex-1" onClick={startEdit}>
                {t("negotiation.counter")}
              </Button>
              <Button className="flex-[2] font-bold" disabled={!canAgree} onClick={agree}>
                {t("negotiation.acceptConfirmMatch")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OfferRow({
  label,
  icon,
  value,
  sub,
  highlight,
  onEdit,
  editLabel,
}: {
  label: string;
  icon: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  onEdit: () => void;
  editLabel: string;
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div
        className={`flex items-center justify-between gap-3 rounded-tile border px-3.5 py-3 ${
          highlight ? "border-brand bg-brand-tint/40" : "border-line"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="text-[17px] leading-none">{icon}</span>
          <div className="min-w-0">
            <div className="truncate text-[14.5px] font-bold text-ink">{value}</div>
            {sub && <div className="truncate text-[12px] text-muted">{sub}</div>}
          </div>
        </div>
        <button className="flex-none text-[12.5px] font-bold text-brand hover:text-brand-dark" onClick={onEdit}>
          {editLabel}
        </button>
      </div>
    </div>
  );
}
