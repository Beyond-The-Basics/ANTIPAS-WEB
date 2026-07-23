# Kickoff Web Client (ANTIPAS-WEB)

The **web client for Kickoff (ANTIPAS)**, built to the Claude Design prototype
(`Kickoff Web Client.dc.html`). Vite + React + TypeScript + Tailwind.

It replaces the earlier developer console: same API coverage, but the product's own UI — light
theme, green `#147A49` brand, card-based screens. Because backend auth is still a stub
(`X-User-Id` header), the profile chip in the top-right doubles as an **"act as user"** switcher, so
multi-user flows (captain/member, invites, team-vs-team) can still be exercised end to end.

## Prerequisites

- Node 18+ and the **backend running** on `http://localhost:8000` (see the ANTIPAS-BACKEND repo:
  `make test-instance`, or `docker compose up -d postgres && uvicorn app.main:app`). Seed reference
  data (`make seed`) so game types exist for opponent searches.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
```

Requests to `/api/*` are proxied to the backend, so there are **no CORS changes needed** on the API.
Point at a different backend with `VITE_API_TARGET=http://host:port npm run dev`.

```bash
npm run build   # type-check + production build to dist/
npm run preview # serve the production build
```

## Screens

- **Home** — your upcoming confirmed matches, and a Requests rail: roster and opponent applications
  waiting on teams you captain or admin, invitations addressed to you, and your own outstanding
  applications (withdrawable).
- **Discover** — four quadrants (teams recruiting, teams seeking an opponent, teams needing a guest,
  available players) with sport/city filters, plus your applications and invites.
- **Teams** — your teams as cards with role, roster avatars and a next-step CTA; create a team;
  browse teams you're not on.
- **Team detail** — tabs for Members / Recruiting / Find opponent / Matches. Rename, mark completed,
  leave; transfer captain, promote/demote, remove; publish & close roster searches, invite players,
  act on applications; publish & withdraw opponent searches and confirm a responder into a match.
- **Match detail** — mark played / cancel, the full guest flow (publish a guest search, invite a
  player, accept/decline applicants), and confirmed guests.
- **Availability** — map, publish a free "available for `<sport>` in `<city>`" broadcast, withdraw
  your own, browse everyone else's.
- **Profile** — avatar, verification state, sports derived from your teams, editable name/email via
  `/users/me`, and a bootstrap "create a user" affordance.

## Where the design outruns the API

The prototype was drawn against the real schema, but a few things in it have no backing endpoint.
These are rendered as blanks or omitted rather than filled with sample data:

- **Ratings, strikes and the reputation breakdown** (punctuality / sportsmanship / communication)
  don't exist on the API. The Profile panel shows empty bars and says so.
- **The availability map is orientation only.** `PlayerAvailability` stores a city string and no
  coordinates, so the pin isn't persisted and other players can't be plotted. The design's date and
  team selectors on that screen are omitted for the same reason — no fields behind them.
- **No "invite against a broadcast" route.** Discover lists available players without the design's
  Invite button; guest invites attach to a confirmed match, so that happens from Match detail.
- **No aggregate "my teams" or "my matches" endpoint.** `useMyTeams` lists all teams and reads each
  roster to find you — an N+1 fan-out that should collapse into one call if
  `GET /users/me/teams` ever lands. Home does the same for matches.
- **Credits** are backend stubs (`charge_publish`), so "costs 1 credit" is descriptive copy only;
  no balance is shown.
- **No list-game-types endpoint**, so publishing an opponent search still asks for a `game_type_id`
  to paste from the seeded catalog. Browse endpoints only return *open* listings, so closed searches
  aren't listable either.

Otherwise coverage is unchanged: every backend route is called except six single-item `GET`s whose
data the list endpoints already return in full.

## Notes

- Actions run as the acting user; the API enforces permissions, so a **403 toast** means that user
  lacks the required role. Role-gated controls are also hidden client-side.
- Tailwind is pinned to **v3** — v4's `@tailwindcss/oxide` requires Node ≥ 20 and this project
  targets Node 18. The palette lives in `tailwind.config.js`, lifted from the prototype.
- Leaflet markers use `divIcon`, so no marker image assets are bundled.

## Layout

```
src/
  api/         fetch client (injects X-User-Id) + TypeScript types
  context/     acting-user + toast providers
  lib/         date/expiry formatting, my-teams fan-out hook
  components/  Layout (nav + profile chip), design primitives (ui.tsx)
  pages/       Home, Discover, Teams, TeamDetail, MatchDetail, Availability, Profile
```
