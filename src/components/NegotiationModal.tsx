// The post-acceptance negotiation between two teams: a real-time chat (WebSocket) plus a structured
// proposal of kickoff time + pitch. Either captain can propose; the OTHER captain agrees, which
// creates the match. Proposal/agreement events also arrive over the socket so both sides stay live.

import { useCallback, useEffect, useRef, useState } from "react";

import { api, getActingUserId } from "../api/client";
import type { Match, NegotiationMessage, OpponentApplication } from "../api/types";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";
import { dateLabel } from "../lib/format";
import { Button, SectionLabel } from "./ui";

/** ISO datetime -> value for <input type="datetime-local"> (local time, no seconds). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [proposedDate, setProposedDate] = useState(application.proposed_date);
  const [proposedPitch, setProposedPitch] = useState(application.proposed_pitch);
  const [proposedBy, setProposedBy] = useState(application.proposed_by_team_id);
  const [formDate, setFormDate] = useState(toLocalInput(application.proposed_date));
  const [formPitch, setFormPitch] = useState(application.proposed_pitch ?? "");
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const appId = application.id;

  useEffect(() => {
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
        setProposedPitch(evt.proposed_pitch);
        setProposedBy(evt.proposed_by_team_id);
        setFormDate(toLocalInput(evt.proposed_date));
        setFormPitch(evt.proposed_pitch ?? "");
      } else if (evt.type === "agreed") {
        void api.get<Match>(`/matches/${evt.match_id}`).then(onAgreed);
      }
    };
    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = useCallback(() => {
    const body = draft.trim();
    if (!body) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "message", body }));
    else void api.post(`/opponent-applications/${appId}/messages`, { body });
    setDraft("");
  }, [draft, appId]);

  const propose = () => {
    if (!formDate || !formPitch.trim()) return;
    void run(
      () =>
        api.post(`/opponent-applications/${appId}/propose`, {
          date: new Date(formDate).toISOString(),
          pitch: formPitch.trim(),
        }),
      "Proposal sent",
    );
  };

  const agree = () =>
    run(async () => {
      const match = await api.post<Match>(`/opponent-applications/${appId}/agree`);
      onAgreed(match);
    }, "Match scheduled!");

  const canAgree = proposedBy !== null && proposedBy !== myTeamId && !!proposedDate;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-card border border-line bg-white shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line px-5 py-4">
          <div className="text-[15px] font-bold">Match negotiation</div>
          <div className="mt-0.5 text-xs text-muted">
            {teamName(application.responding_team_id)} · agree on date, time & pitch
          </div>
        </div>

        {/* current proposal + agree */}
        <div className="border-b border-line bg-canvas px-5 py-3">
          <SectionLabel>Current proposal</SectionLabel>
          <div className="mt-1 text-[13px] font-semibold text-ink">
            {proposedDate ? dateLabel(proposedDate) : "—"} · {proposedPitch ?? "—"}
          </div>
          <div className="mt-0.5 text-[11px] text-faint">
            {proposedBy
              ? proposedBy === myTeamId
                ? "You proposed this — waiting for the other team to agree."
                : `Proposed by ${teamName(proposedBy)} — you can agree or counter below.`
              : "No proposal yet."}
          </div>
          <Button className="mt-2 !py-2 font-bold" disabled={!canAgree} onClick={agree}>
            Agree &amp; schedule match
          </Button>
        </div>

        {/* chat */}
        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <p className="text-[12.5px] text-faint">
              No messages yet — say hi and sort out the details.
            </p>
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

        <div className="flex items-center gap-2 border-t border-line px-4 py-3">
          <input
            className="field flex-1"
            placeholder="Message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <Button size="sm" onClick={send} disabled={!draft.trim()}>
            Send
          </Button>
        </div>

        {/* propose form */}
        <div className="border-t border-line bg-canvas px-5 py-3">
          <SectionLabel>Propose different terms</SectionLabel>
          <div className="mt-1.5 flex flex-wrap items-end gap-2">
            <input
              type="datetime-local"
              className="field !py-2 !text-[12.5px]"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
            <input
              className="field flex-1 !py-2 !text-[12.5px]"
              placeholder="Pitch / venue"
              value={formPitch}
              onChange={(e) => setFormPitch(e.target.value)}
            />
            <Button size="sm" variant="ghost" onClick={propose} disabled={!formDate || !formPitch.trim()}>
              Propose
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
