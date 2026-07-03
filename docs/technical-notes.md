# Avi Words Public Technical Notes

The public client is safe to publish because it contains only app UI, guest
state, Convex function names, local rule engines, and client-visible config.

## Public Config

- `VITE_CONVEX_URL` is client-visible by design.
- No deploy keys, Account AV secrets, signing config, or provider credentials
  belong in this repo.
- V0 does not define Account AV runtime config or connect to Account AV.

## Guest Model

- `guestPlayerId` persists in `localStorage`.
- Nickname is browser-local and can be changed from the Arena header.
- Guest play is valid for Cadena and Sprint Solo.
- Account login is represented only as UI structure for V0.

## Realtime Model

- Cadena rooms are authoritative in Convex when `VITE_CONVEX_URL` is configured.
- Challenge links use `/r/:roomId`.
- Both players must press ready before the countdown starts.
- Local fallback exists only for UI smoke tests and does not synchronize across
  devices.

## Rankings

- Sprint Solo records scores through Convex when configured.
- Leaderboards are separated by game and language.
- Local fallback stores demo scores in browser storage only.
