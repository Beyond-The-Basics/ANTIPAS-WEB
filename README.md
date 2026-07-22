# Kickoff API Console (ANTIPAS-WEB)

A lightweight **web client for exercising the Kickoff (ANTIPAS) API** during development — before the
mobile app is wired up. Built with Vite + React + TypeScript.

It is a developer tool, not the product UI. Because the backend auth is currently a stub
(`X-User-Id` header), the console has an **"act as user"** switcher (top-right) that impersonates any
user — perfect for testing multi-user flows like captain/member, invites, and team-vs-team matches.

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

## What it covers

- **Users** — create users, list them, pick the acting user.
- **Teams** — create teams (creator becomes captain), browse/filter by sport, open a team.
- **Team detail** — rename / mark completed / leave; manage members (transfer captain, promote/demote
  admin, remove); publish & close roster searches; invite players; act on roster applications; publish
  & withdraw opponent searches; confirm applicants into a **match**; cancel / mark matches played.
- **Discover** — browse open roster and opponent searches and respond to them; accept/decline invites
  and withdraw your own applications.

## Notes / limitations

- Actions run as the acting user; the API enforces permissions, so a **403 toast** means the acting
  user lacks the required role. This is intended for testing authorization.
- The API has no "list game types" endpoint yet, so publishing an opponent search asks for a
  `game_type_id` to paste (get one from the seeded catalog). Same for listing a team's *closed*
  searches — the browse endpoints only return open listings.

## Layout

```
src/
  api/         fetch client (injects X-User-Id) + TypeScript types
  context/     acting-user + toast providers
  components/  Layout (nav + user switcher), small UI helpers
  pages/       Users, Teams, TeamDetail, Discover
```
