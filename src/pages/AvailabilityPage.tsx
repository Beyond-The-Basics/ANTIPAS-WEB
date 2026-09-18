import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Circle, MapContainer, Marker, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";

import { api } from "../api/client";
import { SPORTS, type PlayerAvailability, type Sport } from "../api/types";
import {
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
  const { t } = useTranslation();

  // --- publish side ----------------------------------------------------------
  const [sport, setSport] = useState<Sport>("soccer");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [cityName, setCityName] = useState("");
  const [position, setPosition] = useState<[number, number]>(DEFAULT_CENTER);
  const [recenterTarget, setRecenterTarget] = useState<[number, number] | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);

  const [mine, setMine] = useState<PlayerAvailability[]>([]);
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
    if (!navigator.geolocation) return notify(t("availability.geolocationUnavailable"), "error");
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
        notify(t("availability.geolocationFailed"), "error");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [notify, t]);

  const load = useCallback(async () => {
    if (!acting) {
      setMine([]);
      return;
    }
    await run(async () => {
      setMine(await api.get<PlayerAvailability[]>(`/users/me/availability`));
    });
  }, [acting, run]);

  useEffect(() => {
    void load();
  }, [load]);

  const publish = async () => {
    if (!acting) return notify(t("availability.pickActingFirst"), "error");
    if (!cityName) return notify(t("availability.chooseCityFirst"), "error");
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
      t("availability.availabilityPublished"),
    ).then(() => load());
  };

  // A withdrawn broadcast is no longer doing anything, so it drops out of the list rather than
  // lingering as a greyed-out row. Expiry is the same story once the worker sets it.
  const activeMine = useMemo(() => mine.filter((a) => a.status === "open"), [mine]);

  return (
    <>
      <PageTitle title={t("availability.title")} subtitle={t("availability.subtitle")} />

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
            <Label>{t("availability.sport")}</Label>
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
            <Label>{t("availability.country")}</Label>
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
            <Label>{t("availability.city")}</Label>
            <select
              className="field mt-1 w-full !text-[13px]"
              value={cityName}
              onChange={(e) => pickCity(country, e.target.value)}
            >
              <option value="">{t("availability.selectCity")}</option>
              {CITIES_BY_COUNTRY[country].map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-faint">{t("availability.pinHint")}</div>
            <button
              type="button"
              onClick={useMyLocation}
              className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:underline disabled:opacity-60"
              disabled={locating}
            >
              📍 {locating ? t("availability.locating") : t("availability.useMyLocation")}
            </button>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <Label>{t("availability.radius")}</Label>
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
            {t("availability.publishHere")}
          </Button>
        </Card>
      </div>

      <p className="mb-8 text-[11.5px] leading-snug text-faint">
        {acting?.latitude != null
          ? t("availability.savedLocationNote")
          : t("availability.chooseLocationNote")}{" "}
        {t("availability.omittedFieldsNote")}
      </p>

      <SectionLabel>{t("availability.myBroadcasts")}</SectionLabel>
      {!acting ? (
        <Empty>{t("availability.pickActingToSeeBroadcasts")}</Empty>
      ) : activeMine.length === 0 ? (
        <Empty>{t("availability.nonePublished")}</Empty>
      ) : (
        <div className="mb-8 flex flex-col gap-2.5">
          {activeMine.map((a) => (
            <Card key={a.id} className="flex items-center gap-3 px-4 py-3.5">
              <SportDot sport={a.sport} size={30} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">{SPORT_LABEL[a.sport]}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {a.city}
                  {a.country ? ` · ${a.country}` : ""}{" "}
                  {t("availability.expiresIn", { time: expiresLabel(a.expires_at, t) })}
                </div>
              </div>
              <RadiusChip km={a.radius_km} />
              <Pill value={a.status} />
              {a.status === "open" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    run(
                      () => api.post(`/player-availability/${a.id}/withdraw`),
                      t("availability.withdrawn"),
                    ).then(load)
                  }
                >
                  {t("availability.withdraw")}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
