// An interactive map for picking a city, used when publishing an opponent search. Reuses the pin
// styling AvailabilityPage already established — but unlike that page's pin (purely decorative,
// since PlayerAvailability has no lat/lng to persist), this one actually resolves to something
// real: dropping or dragging the pin reverse-geocodes the coordinates to a city name via
// Nominatim (OpenStreetMap's free, keyless geocoding API — same no-auth, low-cost approach as the
// CARTO tile layer already in use) and fills the city field with it. Still just a `city: string`
// under the hood — no lat/lng is stored — so this is a nicer input method, not new persistence.

import L from "leaflet";
import { useCallback, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, ZoomControl, useMapEvents } from "react-leaflet";

const PIN = L.divIcon({
  className: "",
  html: '<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#147A49;border:3px solid #fff;box-shadow:0 3px 9px rgba(0,0,0,.35);transform:rotate(-45deg)"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

const DEFAULT_CENTER: [number, number] = [33.5731, -7.5898]; // Casablanca

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  // accept-language=en: some regions (Morocco included) return the local address with multiple
  // scripts concatenated into one string (e.g. Latin + Tifinagh + Arabic) when no language is
  // requested — forcing English keeps the city field a single clean name.
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1&accept-language=en`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const address = data?.address ?? {};
    return (
      address.city ??
      address.town ??
      address.village ??
      address.municipality ??
      address.county ??
      (typeof data?.display_name === "string" ? data.display_name.split(",")[0] : null)
    );
  } catch {
    return null;
  }
}

function ClickToPlace({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPicker({
  onCityResolved,
}: {
  onCityResolved: (city: string) => void;
}) {
  const [position, setPosition] = useState<[number, number]>(DEFAULT_CENTER);
  const [resolving, setResolving] = useState(false);
  const markerRef = useRef<L.Marker>(null);

  const moveTo = useCallback(async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    setResolving(true);
    const city = await reverseGeocode(lat, lng);
    setResolving(false);
    if (city) onCityResolved(city);
  }, [onCityResolved]);

  return (
    <div className="relative overflow-hidden rounded-tile border border-line">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={11}
        scrollWheelZoom={false}
        zoomControl={false}
        style={{ height: 220, width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap &copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="bottomleft" />
        <ClickToPlace onMove={moveTo} />
        <Marker
          position={position}
          icon={PIN}
          draggable
          ref={markerRef}
          eventHandlers={{
            dragend: () => {
              const m = markerRef.current;
              if (m) {
                const { lat, lng } = m.getLatLng();
                void moveTo(lat, lng);
              }
            },
          }}
        />
      </MapContainer>
      <div className="pointer-events-none absolute left-2 top-2 z-[1000] rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-muted shadow-float">
        {resolving ? "Locating…" : "Drag the pin or click the map"}
      </div>
    </div>
  );
}
