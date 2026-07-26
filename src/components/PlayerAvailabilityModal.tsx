// Detail wizard shown when clicking a player's availability card or map pin: who they are, what
// they're looking for, a read-only map of where they're discoverable (PlayerAvailability carries
// lat/lng/radius), and — for a captain browsing Discover — actions to invite them.

import L from "leaflet";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Circle, MapContainer, Marker, TileLayer } from "react-leaflet";

import { api } from "../api/client";
import type { PlayerAvailability, User } from "../api/types";
import { useToast } from "../context/Toast";
import { expiresLabel } from "../lib/format";
import type { MyTeam } from "../lib/useMyTeams";
import { Avatar, Button, Pill, SPORT_LABEL, SectionLabel } from "./ui";

const PIN = L.divIcon({
  className: "",
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#147A49;border:3px solid #fff;box-shadow:0 3px 9px rgba(0,0,0,.35);transform:rotate(-45deg)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

export function PlayerAvailabilityModal({
  availability,
  user,
  onClose,
  canInvite = false,
  invitableTeams = [],
  onInvited,
}: {
  availability: PlayerAvailability;
  user: User | null;
  onClose: () => void;
  /** Whether to show invite actions (a captain viewing someone other than themselves). */
  canInvite?: boolean;
  /** Acting user's captain/admin teams whose sport matches this player's. */
  invitableTeams?: MyTeam[];
  onInvited?: () => void;
}) {
  const { run } = useToast();
  const [teamId, setTeamId] = useState("");

  const hasLocation = availability.latitude != null && availability.longitude != null;
  const center: [number, number] = hasLocation
    ? [availability.latitude as number, availability.longitude as number]
    : [0, 0];

  // "Invite for a game" (guest) has no standalone route — guest invites attach to a confirmed
  // match — so it links into a matching team's page where the match/guest flow lives.
  const gameInviteTeamId = invitableTeams[0]?.team.id ?? null;

  const inviteToTeam = () => {
    if (!teamId) return;
    void run(
      () => api.post(`/teams/${teamId}/roster-invitations`, { user_id: availability.user_id }),
      "Invitation sent",
    ).then(() => {
      onInvited?.();
      onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-card border border-line bg-white shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Avatar name={user?.name ?? availability.user_id} size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold">{user?.name ?? "Player"}</div>
            <div className="mt-0.5 text-xs text-muted">
              {SPORT_LABEL[availability.sport]} · {availability.city}
              {availability.country ? ` · ${availability.country}` : ""}
            </div>
          </div>
          <Pill value={availability.status} />
        </div>

        {hasLocation && (
          <div className="relative h-[220px] w-full">
            <MapContainer
              center={center}
              zoom={12}
              scrollWheelZoom={false}
              zoomControl={false}
              attributionControl={false}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
              {availability.radius_km != null && (
                <Circle
                  center={center}
                  radius={availability.radius_km * 1000}
                  pathOptions={{ color: "#147A49", fillColor: "#147A49", fillOpacity: 0.12, weight: 1.5 }}
                />
              )}
              <Marker position={center} icon={PIN} />
            </MapContainer>
            <div className="pointer-events-none absolute left-2 top-2 z-[1000] rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-muted shadow-float">
              Discoverable within {availability.radius_km ?? "?"} km
            </div>
          </div>
        )}

        <div className="px-5 py-4">
          <SectionLabel>Details</SectionLabel>
          <div className="mt-2 flex flex-col gap-1.5 text-[13px] text-ink-2">
            <div>Sport: {SPORT_LABEL[availability.sport]}</div>
            <div>
              City: {availability.city}
              {availability.country ? `, ${availability.country}` : ""}
            </div>
            <div>Expires in {expiresLabel(availability.expires_at)}</div>
            {user?.age != null && <div>Age: {user.age}</div>}
            {user?.favorite_sports?.length ? (
              <div>Favorite sports: {user.favorite_sports.map((s) => SPORT_LABEL[s]).join(", ")}</div>
            ) : null}
          </div>

          {canInvite && (
            <div className="mt-5 border-t border-line pt-4">
              <SectionLabel>Invite</SectionLabel>
              {invitableTeams.length === 0 ? (
                <p className="mt-2 text-[12px] leading-snug text-faint">
                  You need to captain or co-manage a {SPORT_LABEL[availability.sport]} team to
                  invite this player.
                </p>
              ) : (
                <>
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      className="field flex-1 !py-2 !text-[12.5px]"
                      value={teamId}
                      onChange={(e) => setTeamId(e.target.value)}
                    >
                      <option value="">Choose one of your teams…</option>
                      {invitableTeams.map((t) => (
                        <option key={t.team.id} value={t.team.id}>
                          {t.team.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      className="!py-2 font-bold"
                      onClick={inviteToTeam}
                      disabled={!teamId}
                    >
                      Invite to team
                    </Button>
                  </div>
                  {gameInviteTeamId && (
                    <p className="mt-2.5 text-[11.5px] leading-snug text-faint">
                      For a one-off game, invite them as a guest from a confirmed match —{" "}
                      <Link
                        to={`/teams/${gameInviteTeamId}`}
                        className="font-semibold text-brand hover:underline"
                        onClick={onClose}
                      >
                        open your team's matches →
                      </Link>
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
