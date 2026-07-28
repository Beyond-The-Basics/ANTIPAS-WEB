# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The **web client for the Kickoff App** (ANTIPAS) — a sports matchmaking service (soccer/tennis/paddle).
It talks to the sibling repo `../ANTIPAS-BACKEND`. The product spec and data model live in `../ANTIPAS`
(`SPEC.md`, `DATA_MODEL.md`); treat those as the source of truth for domain decisions.

This is the client, not a developer console — despite `TECH_STACK.md` naming React Native, client work
happens here. The UI is built to the Claude Design prototype
(`claude.ai/design/p/d86b90f1-306f-4fdc-8371-d09d79e270a9`, file `Kickoff Web Client.dc.html`).

## Workflow

**Same rules as ANTIPAS-BACKEND.** `main` is protected by convention — never commit to it directly.

1. Branch off `main`: `feat/<topic>` for features, `docs/<topic>` for documentation, `fix/<topic>` for
   fixes.
2. Commit with an imperative subject ("Add match detail screen"), body explaining *why*.
3. Open a pull request against `main`.
4. CI must pass (`.github/workflows/ci.yml` — type-check, then build).
5. **Squash merge**, so `main` stays linear and each commit carries its PR number — matching the
   backend's history (`Add PlayerAvailability (individual broadcast) (#6)`).

There is no test suite yet, so CI runs type-check + build only. Adding one should also add a `test`
job to CI, mirroring the backend's lint/test/build shape.

## Commands

```bash
npm install
npm run dev        # http://localhost:3000, proxies /api/* to the backend
npm run typecheck  # tsc -b
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
```

Needs the **backend running** on `http://localhost:8000` (`make test-instance` in ANTIPAS-BACKEND).
Point elsewhere with `VITE_API_TARGET=http://host:port npm run dev`. The Vite proxy means no CORS
changes are needed on the API.

**WSL2 + `/mnt/c` needs a polling watcher.** This repo lives on a Windows drive; inotify events
don't cross the 9p mount, so without `server.watch.usePolling` (set in `vite.config.ts`) the
watcher never fires. Vite keeps serving the module it transformed at startup and edits appear to do
nothing — including edits you make to fix a bug you're staring at. If HMR ever looks dead, check
that setting before doubting the code.

## Architecture

Vite + React 18 + TypeScript + Tailwind v3 + react-router v6.

- `src/api/client.ts` — thin fetch wrapper. **The single auth seam**: it injects an `X-User-Id` header
  read from localStorage, matching the backend's `get_current_user_stub`. When the backend swaps to
  Firebase, only this file changes (send `Authorization: Bearer <token>`).
- `src/api/types.ts` — TypeScript mirrors of the backend's Pydantic `Read` schemas. Keep in sync.
- `src/context/ActingUser.tsx` — who you're acting as, resolved through `/users/me`.
- `src/context/Toast.tsx` — `run(action, successMessage)` wraps every mutation; API errors surface as
  toasts, so a 403 means the acting user lacks the role.
- `src/components/ui.tsx` — design primitives (`Pill`, `RolePill`, `Avatar`, `AvatarStack`, `SportDot`,
  `Card`, `Button`, `Tabs`, …). Ported from the prototype's inline style helpers so the palette lives
  in one place. **Add new visual primitives here, not inline in pages.**
- `src/lib/` — `format.ts` (date/expiry labels), `useMyTeams.ts` (the my-teams fan-out, see below).
- `src/pages/` — Home, Discover, Teams, TeamDetail, MatchDetail, Availability, Profile.
- `tailwind.config.js` — the Kickoff palette lifted verbatim from the prototype. Use the semantic
  names (`brand`, `canvas`, `line`, `muted`, `chip`) rather than raw hex.

**Tailwind is pinned to v3.** v4's `@tailwindcss/oxide` requires Node >= 20 and this project targets
Node 18; on 18 the native binary silently fails to install and the build breaks.

## Multi-language

**Every feature must ship aligned with the multi-language implementation.** A feature is not done
until its strings exist in all three locales — this is part of building it, not follow-up polish, and
an English-only screen is an incomplete screen.

- **Three locales, always together**: `src/locales/en.json`, `fr.json`, `ar.json`. Arabic is **Darija
  in Arabic script** (informal, matching the register already in `ar.json`) — not formal MSA. Add
  every new key to all three files in the same change that introduces the UI.
- **No hardcoded user-facing strings.** Everything renders through `t()` (`react-i18next`).
  Interpolate with `{{named}}` placeholders rather than concatenating translated fragments, and use
  `Intl.*` (e.g. `ListFormat`, date formatting in `src/lib/format.ts`) for anything where the
  connective grammar itself is locale-dependent.
- **RTL is not optional.** Arabic sets `dir="rtl"` on `<html>`, so use Tailwind's *logical*
  utilities — `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`/`text-start`/`text-end` — never the physical
  `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-`/`text-left`/`text-right`. v3 supports these natively.
- **Enum labels** (`SPORT_LABEL`, `STATUS_LABEL` in `ui.tsx`, `ATHLETIC_TRAITS` in `lib/profile.ts`)
  resolve through i18n lazily — a `Proxy` for the lookups, getters for the trait list — so call sites
  read like plain objects while still re-resolving per language. Extend that pattern rather than
  threading a `t` through every consumer.
- **Wiring**: `src/i18n.ts` (init), `src/context/Language.tsx` (locale persisted on the `User` via the
  backend's `locale` field), `src/components/LanguageSwitcher.tsx`, and `src/lib/errors.ts`
  (`translateApiError` — backend messages are mapped client-side; the API is not localized).
- **Verify in all three**, not just English: check the key sets match across the locale files, and
  walk any new screen once in French and once in Arabic to confirm nothing leaks untranslated and RTL
  doesn't break the layout.

## Where the design outruns the API

The prototype was drawn against the real schema, but parts of it have no endpoint behind them. These
render as blanks or are omitted — **do not fill them with sample data**:

- **Ratings, strikes, reputation breakdown** — no fields on the API. Profile shows empty bars.
- **Availability map** — `PlayerAvailability` has a city string and no coordinates, so the pin isn't
  persisted and other players can't be plotted. The design's date and team selectors on that screen
  are omitted for the same reason.
- **"Invite against a broadcast"** — no such route; guest invites attach to a confirmed match, so
  that action lives on Match detail.
- **Credits** — `charge_publish` is a backend stub, so "costs 1 credit" is descriptive copy only.
- **No list-game-types endpoint** — publishing an opponent search asks for a `game_type_id` pasted
  from the seeded catalog.
- **No aggregate endpoints** — there is no `GET /users/me/teams` or `/users/me/matches`, so
  `useMyTeams` lists all teams and reads each roster to find you (N+1). Home does the same for
  matches. Collapse both into single calls if those endpoints ever land.

When a screen can't be built, the cause is usually a missing endpoint rather than missing UI — check
the backend's router before assuming otherwise.
