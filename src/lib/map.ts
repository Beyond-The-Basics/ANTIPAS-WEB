// Shared basemap config so every map renders the same style and a restyle is a one-line change.
//
// CARTO Positron ("light_all") — a clean, minimal light basemap (muted roads, soft labels), the
// same understated look ride-hailing apps like inDrive use. Free, no API key, retina via {r}.
// Swap TILE_URL for another CARTO variant to restyle everything at once:
//   dark:        https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
//   no labels:   https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png
//   colorful:    https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png

export const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
export const TILE_ATTRIBUTION = "&copy; OpenStreetMap &copy; CARTO";
