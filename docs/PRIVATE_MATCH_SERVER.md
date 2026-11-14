# Private online matches

The browser needs the separate Node match service for private online play. Solo play remains entirely local. The service owns the simulation, scores and match result; clients send mallet targets only. This implementation is prepared and tested locally, not deployed publicly.

## Local setup

Use Node 22 or later from the repository root:

```sh
npm ci
npm run match:server
```

In another terminal, run `npm run dev` or `npm run preview` after building. Vite proxies `/match` to `ws://127.0.0.1:8089`. Two browsers can create and join the same six-character private room code. A host waits until the second player joins; there is no public room listing. Refreshing or closing either participant ends the room.

The service defaults to `127.0.0.1:8089`. `GET /health` returns a small JSON health response. WebSocket upgrades use `/match` (`/` is also accepted for a dedicated service hostname).

## Hosting the service

Run this as a persistent Node service with WebSocket support, alongside the static web build. A static hosting deployment alone does not run the match service. Install with **`npm ci` including dev dependencies**: the service reuses the game's TypeScript simulation through `scripts/lib/load-ts.mjs`, so the installed `typescript` package and `src/game` files are required at runtime. Do not use `npm ci --omit=dev` for this service.

Configure these environment variables in the service manager:

| Variable | Default | Purpose |
| --- | --- | --- |
| `MATCH_HOST` | `127.0.0.1` | Bind address; use `0.0.0.0` inside a container or where required by the host. |
| `MATCH_PORT` | `8089` | Service port. |
| `MATCH_ALLOWED_ORIGINS` | Empty | Comma-separated exact browser origins allowed to connect, such as `https://games.example.com`. Empty permits all origins for local development. |

Put the service behind HTTPS/WSS. Either proxy the website's `/match` route to this service with WebSocket upgrade support, or set `VITE_MATCH_SERVER_URL=wss://your-match-service.example.com/match` **before building the browser client**. The Vite variable is baked into the client build; it is not a secret. The default client endpoint uses its current website origin and `/match`. The local Vite proxy is a development/preview feature and is not included in the static build.

Keep a match on one service instance: rooms live in memory, so multiple instances require sticky routing for both participants to the same instance or a future shared-room architecture. A restart ends existing rooms. Set the reverse proxy's WebSocket idle timeout longer than the 15-second server ping interval. SIGTERM/SIGINT closes rooms and the listener cleanly.

## Protocol and behaviour

Messages are JSON text frames. Client requests:

```json
{"type":"create"}
{"type":"join","code":"ABC234"}
{"type":"input","x":700,"y":285}
{"type":"rematch"}
```

Joining is case-insensitive. A socket may belong to one room, with two participants maximum. The host controls the right mallet, protocol side `player`; the guest controls the left mallet, protocol side `ai` (the existing simulation's left-side name, not an AI opponent in online mode). Clients cannot select their side or submit scores.

The server sends `{type:"room",code,side,status:"waiting"|"playing"}` before the first state. Waiting hosts receive no state. About 30 times a second both players receive the same `{type:"state",seq,tick,round,world:{run,puck,player,ai},events:[...]}`. Sequence numbers increase across rematches; `tick` resets for each round. Physics runs at the existing 240 Hz fixed step. Every simulation event since the previous broadcast is included, including goals and match completion.

Rematch requests are rejected while a match is live. After completion, both participants must request a rematch before scores reset. A single vote does not restart the match. Disconnect sends `{type:"closed",reason:"opponent-disconnected"}` to the remaining player and removes the code. Other closure reasons are `room-expired` and `server-shutdown`. Invalid requests return `{type:"error",message}`.

## Resource limits

The service uses cryptographically random six-character codes, up to 128 rooms and 256 connections. Codes are invitations, not user accounts or persistent authentication. Input targets are finite-number validated, clamped to the assigned half, and limited to 60 messages/second with a burst of 6; control requests are limited to 2/second with a burst of 4. Frames are limited to 2 KiB. Slow connections exceeding 256 KiB of queued outgoing data are closed. Repeated invalid messages close the offending connection. Pings run every 15 seconds; peers without activity/pong for 45 seconds are removed. Waiting or completed rooms expire after 10 minutes without match activity.

## Verification

`node scripts/test-match-server.mjs` uses real WebSocket clients on ephemeral local ports. It covers room assignment and capacity, no waiting-room states, identical sequences across both clients, clamped human targets, rejection of score injection and live rematches, seven actual goals and a shared completed result, lossless event batching, mutual post-match rematch, disconnect, expiry and missed-pong cleanup. The scoring test drives ordinary input messages through the real physics; it has no score injection or server debug hook.

`node scripts/test-difficulty.mjs` covers reaction delays, movement caps, aim/defence error and reproducible traces. The original hard/default simulation trace remains unchanged. `npm run test:experience` adds browser controls and two-client rendering evidence. None of these checks deploy the service.
