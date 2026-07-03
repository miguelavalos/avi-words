# Avi Words

Avi Words is a web-only realtime word-game prototype for Apps AV.

V0 is intentionally guest-first. Players can create a 1v1 challenge link,
share it through WhatsApp, Mail, or copy/paste, and play the Cadena word duel
in realtime when `VITE_CONVEX_URL` points to the private Convex functions.

## Included

- React + Vite web app.
- ES/EN language switcher.
- Guest nickname persisted in the browser.
- Login entry point as prepared UI only; no Account AV runtime.
- Arena lobby with four game cards:
  - Cadena: 1v1 realtime challenge by link.
  - Sprint Solo: 60 second solo word sprint with leaderboard.
  - Retador: coming soon.
  - Palabra Bomba: coming soon.
- Web Share API plus clipboard fallback for challenge links.
- Convex client references for realtime rooms and leaderboards.
- Local fallback for UI and rule smoke testing when Convex is not configured.

## Not Included

- Account AV login.
- Paid providers.
- Production deploy commands.
- Native app, Expo, EAS, App Store Connect, or TestFlight.
- Private Convex deployment config or credentials.
- Private Avi visual assets.

## Install

```bash
cd public/avi-words
pnpm install
```

## Run Web

```bash
pnpm run web
```

The dev server uses `http://127.0.0.1:8098`.

## Verify

```bash
pnpm run verify
pnpm run build
```

## Convex Realtime

Set a public Convex URL before starting Vite:

```bash
VITE_CONVEX_URL=https://your-dev-deployment.convex.cloud pnpm run web
```

The private Convex functions live in:

```text
private/avalsys-suite/convex/aviWords.ts
```

Deployment, namespace creation, and production preview are controlled by
private AVALSYS runbooks. This public app deliberately does not include those
commands.
