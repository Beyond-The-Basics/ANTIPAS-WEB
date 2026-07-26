import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";

import { api } from "../api/client";
import { PlayerAvailabilityModal } from "../components/PlayerAvailabilityModal";
import { SPORTS, type PlayerAvailability, type Sport } from "../api/types";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Label,
  PageTitle,
  Pill,
  RadiusChip,
  SPORT_LABEL,
  SectionLabel,
  SportDot,
} from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";
import { CITIES_BY_COUNTRY, type Country, findCity, isCountry } from "../lib/cities";
import { expiresLabel } from "../lib/format";
import { TILE_ATTRIBUTION, TILE_URL } from "../lib/map";
import { COUNTRIES, DEFAULT_COUNTRY } from "../lib/profile";
import { useUsers } from "../lib/useMyTeams";

/** Teardrop pin from the prototype, as a divIcon so no marker image assets are bundled. */
const PIN = L.divIcon({
  className: "",
  html: '<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#147A49;border:3px solid #fff;box-shadow:0 3px 9px rgba(0,0,0,.35);transform:rotate(-45deg)"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

const DEFAULT_CENTER: [number, number] = [33.5731, -7.5898]; // Casablanca
const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 50;
const DEFAULT_RADIUS_KM = 10;

function ClickToPlace({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Recenters the map only when `target` changes (a city pick), not on every pin drag. */
function RecenterOnCityMatch({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 13);
  }, [target, map]);
  return null;
}

export function AvailabilityPage() {
  const { user: acting } = useActingUser();
  const { run, notify } = useToast();
  const { users, userName } = useUsers();

  // --- publish side ----------------------------------------------------------
  const [sport, setSport] = useState<Sport>("soccer");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [cityName, setCityName] = useState("");
  const [position, setPosition] = useState<[number, number]>(DEFAULT_CENTER);
  const [recenterTarget, setRecenterTarget] = useState<[number, number] | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);

  // --- search side -----------------------------------------------------------
  const [filterSport, setFilterSport] = useState<Sport | "">("");
  const [searchCountry, setSearchCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [searchCityName, setSearchCityName] = useState("");
  const [searchRadiusKm, setSearchRadiusKm] = useState(15);

  const [all, setAll] = useState<PlayerAvailability[]>([]);
  const [mine, setMine] = useState<PlayerAvailability[]>([]);
  const [selected, setSelected] = useState<PlayerAvailability | null>(null);
  const pinRef = useRef<L.Marker>(null);

  const movePin = useCallback((lat: number, lng: number) => setPosition([lat, lng]), []);

  // Prefill from the player's saved location (set the first time they published, or edited here
  // since republishing updates the saved default) so returning reuses it. Also seed the
  // country/city dropdowns from the saved profile when they match the fixed lists.
  useEffect(() => {
    if (acting?.latitude != null && acting?.longitude != null) {
      setPosition([acting.latitude, acting.longitude]);
    }
    if (acting?.radius_km != null) setRadiusKm(acting.radius_km);
    if (isCountry(acting?.country)) {
      setCountry(acting.country);
      if (acting?.city && findCity(acting.country, acting.city)) setCityName(acting.city);
    }
  }, [acting]);

  const pickCity = useCallback((nextCountry: Country, name: string) => {
    setCityName(name);
    const city = findCity(nextCountry, name);
    if (city) {
      setPosition([city.lat, city.lng]);
      setRecenterTarget([city.lat, city.lng]);
    }
  }, []);

  const [locating, setLocating] = useState(false);
  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) return notify("Geolocation isn't available in this browser", "error");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const here: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(here);
        setRecenterTarget(here);
      },
      () => {
        setLocating(false);
        notify("Couldn't get your location — pick a city or drag the pin instead", "error");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [notify]);

  const searchCenter = useMemo(() => {
    if (!searchCityName) return null;
    const city = findCity(searchCountry, searchCityName);
    return city ? ([city.lat, city.lng] as [number, number]) : null;
  }, [searchCountry, searchCityName]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterSport) params.set("sport", filterSport);
    if (searchCenter) {
      params.set("search_lat", String(searchCenter[0]));
      params.set("search_lng", String(searchCenter[1]));
      params.set("search_radius_km", String(searchRadiusKm));
    }
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
  }, [filterSport, searchCenter, searchRadiusKm, acting, run]);

  useEffect(() => {
    void load();
  }, [load]);

  const publish = async () => {
    if (!acting) return notify("Pick who you're acting as first", "error");
    if (!cityName) return notify("Choose your city first", "error");
    await run(
      () =>
        api.post(`/player-availability`, {
          sport,
          city: cityName,
          country,
          latitude: position[0],
          longitude: position[1],
          radius_km: radiusKm,
        }),
      "Availability published",
    ).then(() => load());
  };

  const others = useMemo(() => all.filter((a) => a.user_id !== acting?.id), [all, acting]);

  const selectedUser = useMemo(
    () => (selected ? (users.find((u) => u.id === selected.user_id) ?? null) : null),
    [selected, users],
  );

  return (
    <>
      <PageTitle
        title="Availability"
        subtitle="See who's free nearby, pick your sport and city, and broadcast — free, no credits"
      />

      <div className="mb-6 flex flex-col gap-4 lg:flex-row">
        <div className="relative flex-1 overflow-hidden rounded-card border border-line">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={12}
            scrollWheelZoom={false}
            style={{ height: 380, width: "100%" }}
          >
            <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
            <ZoomControl position="bottomleft" />
            <ClickToPlace onMove={movePin} />
            <RecenterOnCityMatch target={recenterTarget} />
            <Circle
              center={position}
              radius={radiusKm * 1000}
              pathOptions={{ color: "#147A49", fillColor: "#147A49", fillOpacity: 0.12, weight: 1.5 }}
            />
            <Marker
              position={position}
              icon={PIN}
              draggable
              ref={pinRef}
              eventHandlers={{
                dragend: () => {
                  const m = pinRef.current;
                  if (m) {
                    const { lat, lng } = m.getLatLng();
                    movePin(lat, lng);
                  }
                },
              }}
            />
          </MapContainer>
        </div>

        <Card className="flex w-full flex-col gap-3.5 p-4 lg:w-72 lg:shrink-0">
          <div>
            <Label>Sport</Label>
            <select
              className="field mt-1 w-full !text-[13px] font-semibold"
              value={sport}
              onChange={(e) => setSport(e.target.value as Sport)}
            >
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {SPORT_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Country</Label>
            <select
              className="field mt-1 w-full !text-[13px]"
              value={country}
              onChange={(e) => {
                const next = e.target.value as Country;
                setCountry(next);
                setCityName("");
              }}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>City</Label>
            <select
              className="field mt-1 w-full !text-[13px]"
              value={cityName}
              onChange={(e) => pickCity(country, e.target.value)}
            >
              <option value="">Select a city…</option>
              {CITIES_BY_COUNTRY[country].map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-faint">
              Picking a city drops the pin there — drag it to fine-tune your exact spot.
            </div>
            <button
              type="button"
              onClick={useMyLocation}
              className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:underline disabled:opacity-60"
              disabled={locating}
            >
              📍 {locating ? "Locating…" : "Use my current location"}
            </button>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <Label>Radius</Label>
              <span className="text-[12px] font-bold text-ink">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min={MIN_RADIUS_KM}
              max={MAX_RADIUS_KM}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="mt-2 h-1.5 w-full cursor-pointer accent-brand"
            />
          </div>

          <Button
            className="mt-1 w-full !py-2.5 font-bold"
            onClick={publish}
            disabled={!acting || !cityName}
          >
            Publish here
          </Button>
        </Card>
      </div>

      <p className="mb-8 text-[11.5px] leading-snug text-faint">
        {acting?.latitude != null
          ? "Showing your saved location from a previous broadcast — pick a city or drag the pin, change the radius, and publish again to update it."
          : "Choose your country and city to place the pin, drag it to fine-tune, then pick how far around you want to be discoverable."}{" "}
        The date and team selectors from the design are omitted — there are no fields behind them
        yet.
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
                  {a.city}
                  {a.country ? ` · ${a.country}` : ""} · expires in {expiresLabel(a.expires_at)}
                </div>
              </div>
              <RadiusChip km={a.radius_km} />
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

      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <SectionLabel>Find available players</SectionLabel>
        <div className="ml-auto flex flex-wrap items-center gap-2">
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
          <select
            className="field !py-2 !text-[12.5px]"
            value={searchCountry}
            onChange={(e) => {
              setSearchCountry(e.target.value as Country);
              setSearchCityName("");
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
            value={searchCityName}
            onChange={(e) => setSearchCityName(e.target.value)}
          >
            <option value="">Anywhere</option>
            {CITIES_BY_COUNTRY[searchCountry].map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {searchCenter && (
        <div className="mb-3.5 flex items-center gap-2.5 rounded-tile border border-line bg-canvas px-3.5 py-2">
          <span className="text-[11px] font-semibold text-muted">Within</span>
          <input
            type="range"
            min={MIN_RADIUS_KM}
            max={MAX_RADIUS_KM}
            value={searchRadiusKm}
            onChange={(e) => setSearchRadiusKm(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer accent-brand"
          />
          <span className="whitespace-nowrap text-[11px] font-bold text-ink">
            {searchRadiusKm} km of {searchCityName}
          </span>
        </div>
      )}

      {others.length === 0 ? (
        <Empty>
          {searchCenter
            ? `No players available within ${searchRadiusKm} km of ${searchCityName}.`
            : "No open broadcasts found."}
        </Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {others.map((a) => (
            <Card
              key={a.id}
              className="flex cursor-pointer items-center gap-3 rounded-[10px] px-4 py-3 transition hover:border-brand"
              onClick={() => setSelected(a)}
            >
              <Avatar name={userName(a.user_id)} size={28} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">{userName(a.user_id)}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {SPORT_LABEL[a.sport]} · {a.city}
                  {a.country ? ` · ${a.country}` : ""}
                </div>
              </div>
              <RadiusChip km={a.radius_km} />
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <PlayerAvailabilityModal
          availability={selected}
          user={selectedUser}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
