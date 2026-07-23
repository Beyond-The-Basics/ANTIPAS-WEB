import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, ZoomControl } from "react-leaflet";

import { api } from "../api/client";
import { SPORTS, type PlayerAvailability, type Sport } from "../api/types";
import {
  Avatar,
  Button,
  Card,
  Empty,
  PageTitle,
  Pill,
  SPORT_LABEL,
  SectionLabel,
  SportDot,
} from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";
import { expiresLabel } from "../lib/format";
import { useUsers } from "../lib/useMyTeams";

/** Teardrop pin from the prototype, as a divIcon so no marker image assets are bundled. */
const PIN = L.divIcon({
  className: "",
  html: '<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#147A49;border:3px solid #fff;box-shadow:0 3px 9px rgba(0,0,0,.35);transform:rotate(-45deg)"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

const DEFAULT_CENTER: [number, number] = [33.5731, -7.5898]; // Casablanca

export function AvailabilityPage() {
  const { user: acting } = useActingUser();
  const { run, notify } = useToast();
  const { userName } = useUsers();

  const [sport, setSport] = useState<Sport>("soccer");
  const [city, setCity] = useState("");
  const [filterSport, setFilterSport] = useState<Sport | "">("");
  const [filterCity, setFilterCity] = useState("");

  const [all, setAll] = useState<PlayerAvailability[]>([]);
  const [mine, setMine] = useState<PlayerAvailability[]>([]);
  const pinRef = useRef<L.Marker>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterSport) params.set("sport", filterSport);
    if (filterCity) params.set("city", filterCity);
    const q = params.toString() ? `?${params}` : "";
    await run(async () => {
      setAll(await api.get<PlayerAvailability[]>(`/player-availability${q}`));
    });
    if (acting) {
      await run(async () => {
        setMine(await api.get<PlayerAvailability[]>(`/users/me/availability`));
      });
    } else {
      setMine([]);
    }
  }, [filterSport, filterCity, acting, run]);

  useEffect(() => {
    void load();
  }, [load]);

  const publish = async () => {
    if (!acting) return notify("Pick who you're acting as first", "error");
    if (!city) return notify("A city is required", "error");
    await run(
      () => api.post(`/player-availability`, { sport, city }),
      "Availability published",
    ).then(() => {
      setCity("");
      return load();
    });
  };

  const others = useMemo(
    () => all.filter((a) => a.user_id !== acting?.id),
    [all, acting],
  );

  return (
    <>
      <PageTitle
        title="Availability"
        subtitle="See who's free nearby, pick your sport and city, and broadcast — free, no credits"
      />

      <div className="relative mb-6 overflow-hidden rounded-card border border-line">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={12}
          scrollWheelZoom={false}
          // The filter bar sits over the top-left corner, which is Leaflet's default spot for the
          // zoom buttons; move them out from under it.
          zoomControl={false}
          style={{ height: 380, width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap &copy; CARTO"
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <ZoomControl position="bottomleft" />
          <Marker position={DEFAULT_CENTER} icon={PIN} draggable ref={pinRef} />
        </MapContainer>

        <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] flex flex-wrap items-center gap-2">
          <select
            className="field pointer-events-auto !py-2 !text-[12.5px] font-semibold shadow-float"
            value={sport}
            onChange={(e) => setSport(e.target.value as Sport)}
          >
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {SPORT_LABEL[s]}
              </option>
            ))}
          </select>
          <input
            className="field pointer-events-auto w-[150px] !py-2 !text-[12.5px] shadow-float"
            placeholder="City / region"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <Button
            className="pointer-events-auto !py-2.5 !text-[12.5px] font-bold shadow-float"
            onClick={publish}
            disabled={!acting || !city}
          >
            Publish here
          </Button>
        </div>
      </div>

      <p className="mb-8 text-[11.5px] leading-snug text-faint">
        The map is orientation only. <code className="font-mono">PlayerAvailability</code> stores a
        city string and no coordinates, so the pin's position isn't saved and other players can't be
        plotted — the API would need a lat/lng on the availability model first. The design's date and
        team selectors are omitted for the same reason: there are no fields behind them.
      </p>

      <SectionLabel>My broadcasts</SectionLabel>
      {!acting ? (
        <Empty>Pick who you're acting as to see your broadcasts.</Empty>
      ) : mine.length === 0 ? (
        <Empty>None published.</Empty>
      ) : (
        <div className="mb-8 flex flex-col gap-2.5">
          {mine.map((a) => (
            <Card key={a.id} className="flex items-center gap-3 px-4 py-3.5">
              <SportDot sport={a.sport} size={30} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">{SPORT_LABEL[a.sport]}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {a.city} · expires in {expiresLabel(a.expires_at)}
                </div>
              </div>
              <Pill value={a.status} />
              {a.status === "open" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    run(() => api.post(`/player-availability/${a.id}/withdraw`), "Withdrawn").then(
                      load,
                    )
                  }
                >
                  Withdraw
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <div className="mb-3.5 flex items-center gap-2.5">
        <SectionLabel>Other available players</SectionLabel>
        <div className="ml-auto flex gap-2">
          <select
            className="field !py-2 !text-[12.5px] font-semibold"
            value={filterSport}
            onChange={(e) => setFilterSport(e.target.value as Sport | "")}
          >
            <option value="">All sports</option>
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {SPORT_LABEL[s]}
              </option>
            ))}
          </select>
          <input
            className="field w-[140px] !py-2 !text-[12.5px]"
            placeholder="City"
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
          />
        </div>
      </div>

      {others.length === 0 ? (
        <Empty>No open broadcasts found.</Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {others.map((a) => (
            <Card key={a.id} className="flex items-center gap-3 rounded-[10px] px-4 py-3">
              <Avatar name={userName(a.user_id)} size={28} />
              <div className="flex-1 text-[13.5px] font-semibold">{userName(a.user_id)}</div>
              <div className="text-xs text-muted">
                {SPORT_LABEL[a.sport]} · {a.city}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
