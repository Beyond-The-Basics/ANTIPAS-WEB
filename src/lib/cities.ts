// Curated country → cities reference data with coordinates. Mirrors the fixed-list philosophy in
// `profile.ts` (COUNTRIES): a closed set keeps published locations queryable and free of the drift
// free-text would cause ("Casablanca" vs "casa" vs "Casa"). Each city carries lat/lng so selecting
// one can drop the map pin without a network geocode. Coordinates are city-center approximations.

import { COUNTRIES } from "./profile";

export type Country = (typeof COUNTRIES)[number];

export interface City {
  name: string;
  lat: number;
  lng: number;
}

export const CITIES_BY_COUNTRY: Record<Country, City[]> = {
  Morocco: [
    { name: "Casablanca", lat: 33.5731, lng: -7.5898 },
    { name: "Rabat", lat: 34.0209, lng: -6.8416 },
    { name: "Marrakech", lat: 31.6295, lng: -7.9811 },
    { name: "Fes", lat: 34.0181, lng: -5.0078 },
    { name: "Tangier", lat: 35.7595, lng: -5.834 },
    { name: "Agadir", lat: 30.4278, lng: -9.5981 },
    { name: "Meknes", lat: 33.8935, lng: -5.5473 },
    { name: "Oujda", lat: 34.6867, lng: -1.9114 },
    { name: "Kenitra", lat: 34.261, lng: -6.5802 },
    { name: "Tetouan", lat: 35.5785, lng: -5.3684 },
    { name: "Safi", lat: 32.2994, lng: -9.2372 },
    { name: "El Jadida", lat: 33.2549, lng: -8.5069 },
    { name: "Nador", lat: 35.1681, lng: -2.9287 },
    { name: "Beni Mellal", lat: 32.3373, lng: -6.3498 },
    { name: "Mohammedia", lat: 33.6866, lng: -7.383 },
    { name: "Khouribga", lat: 32.8811, lng: -6.9063 },
    { name: "Settat", lat: 33.001, lng: -7.6166 },
    { name: "Larache", lat: 35.1932, lng: -6.1557 },
  ],
  France: [
    { name: "Paris", lat: 48.8566, lng: 2.3522 },
    { name: "Marseille", lat: 43.2965, lng: 5.3698 },
    { name: "Lyon", lat: 45.764, lng: 4.8357 },
    { name: "Toulouse", lat: 43.6047, lng: 1.4442 },
    { name: "Nice", lat: 43.7102, lng: 7.262 },
    { name: "Nantes", lat: 47.2184, lng: -1.5536 },
    { name: "Strasbourg", lat: 48.5734, lng: 7.7521 },
    { name: "Montpellier", lat: 43.6108, lng: 3.8767 },
    { name: "Bordeaux", lat: 44.8378, lng: -0.5792 },
    { name: "Lille", lat: 50.6292, lng: 3.0573 },
  ],
  Spain: [
    { name: "Madrid", lat: 40.4168, lng: -3.7038 },
    { name: "Barcelona", lat: 41.3874, lng: 2.1686 },
    { name: "Valencia", lat: 39.4699, lng: -0.3763 },
    { name: "Seville", lat: 37.3891, lng: -5.9845 },
    { name: "Zaragoza", lat: 41.6488, lng: -0.8891 },
    { name: "Malaga", lat: 36.7213, lng: -4.4214 },
    { name: "Murcia", lat: 37.9922, lng: -1.1307 },
    { name: "Bilbao", lat: 43.263, lng: -2.935 },
    { name: "Alicante", lat: 38.3452, lng: -0.481 },
    { name: "Granada", lat: 37.1773, lng: -3.5986 },
  ],
  Portugal: [
    { name: "Lisbon", lat: 38.7223, lng: -9.1393 },
    { name: "Porto", lat: 41.1579, lng: -8.6291 },
    { name: "Braga", lat: 41.5454, lng: -8.4265 },
    { name: "Coimbra", lat: 40.2033, lng: -8.4103 },
    { name: "Faro", lat: 37.0194, lng: -7.9304 },
    { name: "Funchal", lat: 32.6669, lng: -16.9241 },
    { name: "Aveiro", lat: 40.6405, lng: -8.6538 },
    { name: "Setubal", lat: 38.5244, lng: -8.8882 },
  ],
  "United States": [
    { name: "New York", lat: 40.7128, lng: -74.006 },
    { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
    { name: "Chicago", lat: 41.8781, lng: -87.6298 },
    { name: "Houston", lat: 29.7604, lng: -95.3698 },
    { name: "Austin", lat: 30.2672, lng: -97.7431 },
    { name: "Dallas", lat: 32.7767, lng: -96.797 },
    { name: "Miami", lat: 25.7617, lng: -80.1918 },
    { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
    { name: "Seattle", lat: 47.6062, lng: -122.3321 },
    { name: "Boston", lat: 42.3601, lng: -71.0589 },
    { name: "Atlanta", lat: 33.749, lng: -84.388 },
    { name: "Denver", lat: 39.7392, lng: -104.9903 },
  ],
  "United Kingdom": [
    { name: "London", lat: 51.5074, lng: -0.1278 },
    { name: "Manchester", lat: 53.4808, lng: -2.2426 },
    { name: "Birmingham", lat: 52.4862, lng: -1.8904 },
    { name: "Liverpool", lat: 53.4084, lng: -2.9916 },
    { name: "Leeds", lat: 53.8008, lng: -1.5491 },
    { name: "Glasgow", lat: 55.8642, lng: -4.2518 },
    { name: "Edinburgh", lat: 55.9533, lng: -3.1883 },
    { name: "Bristol", lat: 51.4545, lng: -2.5879 },
    { name: "Cardiff", lat: 51.4816, lng: -3.1791 },
    { name: "Newcastle", lat: 54.9783, lng: -1.6178 },
  ],
  Germany: [
    { name: "Berlin", lat: 52.52, lng: 13.405 },
    { name: "Munich", lat: 48.1351, lng: 11.582 },
    { name: "Hamburg", lat: 53.5511, lng: 9.9937 },
    { name: "Cologne", lat: 50.9375, lng: 6.9603 },
    { name: "Frankfurt", lat: 50.1109, lng: 8.6821 },
    { name: "Stuttgart", lat: 48.7758, lng: 9.1829 },
    { name: "Dusseldorf", lat: 51.2277, lng: 6.7735 },
    { name: "Leipzig", lat: 51.3397, lng: 12.3731 },
    { name: "Dortmund", lat: 51.5136, lng: 7.4653 },
    { name: "Dresden", lat: 51.0504, lng: 13.7373 },
  ],
  Belgium: [
    { name: "Brussels", lat: 50.8503, lng: 4.3517 },
    { name: "Antwerp", lat: 51.2194, lng: 4.4025 },
    { name: "Ghent", lat: 51.0543, lng: 3.7174 },
    { name: "Charleroi", lat: 50.4108, lng: 4.4446 },
    { name: "Liege", lat: 50.6326, lng: 5.5797 },
    { name: "Bruges", lat: 51.2093, lng: 3.2247 },
    { name: "Namur", lat: 50.4674, lng: 4.872 },
  ],
  Netherlands: [
    { name: "Amsterdam", lat: 52.3676, lng: 4.9041 },
    { name: "Rotterdam", lat: 51.9244, lng: 4.4777 },
    { name: "The Hague", lat: 52.0705, lng: 4.3007 },
    { name: "Utrecht", lat: 52.0907, lng: 5.1214 },
    { name: "Eindhoven", lat: 51.4416, lng: 5.4697 },
    { name: "Groningen", lat: 53.2194, lng: 6.5665 },
    { name: "Tilburg", lat: 51.5555, lng: 5.0913 },
    { name: "Almere", lat: 52.3508, lng: 5.2647 },
  ],
  "United Arab Emirates": [
    { name: "Dubai", lat: 25.2048, lng: 55.2708 },
    { name: "Abu Dhabi", lat: 24.4539, lng: 54.3773 },
    { name: "Sharjah", lat: 25.3463, lng: 55.4209 },
    { name: "Al Ain", lat: 24.1302, lng: 55.8023 },
    { name: "Ajman", lat: 25.4052, lng: 55.5136 },
    { name: "Ras Al Khaimah", lat: 25.7895, lng: 55.9432 },
    { name: "Fujairah", lat: 25.1288, lng: 56.3265 },
  ],
  Tunisia: [
    { name: "Tunis", lat: 36.8065, lng: 10.1815 },
    { name: "Sfax", lat: 34.7406, lng: 10.7603 },
    { name: "Sousse", lat: 35.8256, lng: 10.6369 },
    { name: "Kairouan", lat: 35.6781, lng: 10.0963 },
    { name: "Bizerte", lat: 37.2744, lng: 9.8739 },
    { name: "Gabes", lat: 33.8815, lng: 10.0982 },
    { name: "Ariana", lat: 36.8625, lng: 10.1956 },
    { name: "Monastir", lat: 35.778, lng: 10.8262 },
  ],
  Algeria: [
    { name: "Algiers", lat: 36.7538, lng: 3.0588 },
    { name: "Oran", lat: 35.6969, lng: -0.6331 },
    { name: "Constantine", lat: 36.365, lng: 6.6147 },
    { name: "Annaba", lat: 36.9, lng: 7.7667 },
    { name: "Blida", lat: 36.4703, lng: 2.8277 },
    { name: "Batna", lat: 35.5559, lng: 6.1741 },
    { name: "Setif", lat: 36.1898, lng: 5.4108 },
    { name: "Sidi Bel Abbes", lat: 35.1878, lng: -0.6308 },
    { name: "Biskra", lat: 34.85, lng: 5.7333 },
    { name: "Tlemcen", lat: 34.8828, lng: -1.3167 },
  ],
  Egypt: [
    { name: "Cairo", lat: 30.0444, lng: 31.2357 },
    { name: "Alexandria", lat: 31.2001, lng: 29.9187 },
    { name: "Giza", lat: 30.0131, lng: 31.2089 },
    { name: "Shubra El Kheima", lat: 30.1286, lng: 31.2422 },
    { name: "Port Said", lat: 31.2653, lng: 32.3019 },
    { name: "Suez", lat: 29.9668, lng: 32.5498 },
    { name: "Luxor", lat: 25.6872, lng: 32.6396 },
    { name: "Mansoura", lat: 31.0409, lng: 31.3785 },
    { name: "Tanta", lat: 30.7865, lng: 31.0004 },
    { name: "Aswan", lat: 24.0889, lng: 32.8998 },
  ],
  Canada: [
    { name: "Toronto", lat: 43.6532, lng: -79.3832 },
    { name: "Montreal", lat: 45.5017, lng: -73.5673 },
    { name: "Vancouver", lat: 49.2827, lng: -123.1207 },
    { name: "Calgary", lat: 51.0447, lng: -114.0719 },
    { name: "Ottawa", lat: 45.4215, lng: -75.6972 },
    { name: "Edmonton", lat: 53.5461, lng: -113.4938 },
    { name: "Winnipeg", lat: 49.8951, lng: -97.1384 },
    { name: "Quebec City", lat: 46.8139, lng: -71.208 },
    { name: "Hamilton", lat: 43.2557, lng: -79.8711 },
    { name: "Halifax", lat: 44.6488, lng: -63.5752 },
  ],
};

/** True when `value` is one of the fixed COUNTRIES (narrows a stored profile string). */
export function isCountry(value: string | null | undefined): value is Country {
  return value != null && value in CITIES_BY_COUNTRY;
}

/** Look up a city's coordinates within a country, by name. */
export function findCity(country: Country, name: string): City | undefined {
  return CITIES_BY_COUNTRY[country].find((c) => c.name === name);
}
