// Shared basemap config so every map renders the same style and a restyle is a one-line change.
//
// CARTO Dark Matter ("dark_all") — a minimal dark basemap (near-black land, subtle roads/labels).
// Free, no API key, retina via {r}. Swap TILE_URL for another CARTO variant to restyle at once:
//   light:       https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png
//   no labels:   https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png
//   colorful:    https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png

export const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
export const TILE_ATTRIBUTION = "&copy; OpenStreetMap &copy; CARTO";
