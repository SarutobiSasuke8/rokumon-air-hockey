# CrazyGames submission pack

Status: SDK integration in this repo. **Not submitted.** No portal account action has been taken. Submission waits for Alexei.

## What the build does on CrazyGames

`src/integrations/crazygames.ts` loads the CrazyGames HTML5 SDK v3 (`https://sdk.crazygames.com/crazygames-sdk-v3.js`), but only when:

- the page is served from `crazygames.com` or a `*.crazygames.com` host, or
- the URL has `?crazygames=1` (for local testing; the SDK then reports `environment: "local"`).

Everywhere else (the Rokumon hub, itch.io, a plain link) nothing is loaded and every call is a no-op.

| SDK call | When it fires |
|---|---|
| `init()` | Once Phaser has booted |
| `game.gameplayStart()` | When a match starts, and when it resumes from pause |
| `game.gameplayStop()` | On pause (tab hidden, focus lost, P or Esc), at match end, and on restart |
| `game.happytime()` | When the result screen shows a player win |

Start and stop are paired and never sent twice in a row. A blocked script, a failed `init()` or a throwing call never interrupts play.

Not included (each needs a decision first):

- **Ads** (`ad.requestAd("midgame" / "rewarded")`). There is no natural ad break yet. If wanted, the obvious slot is between the result screen and the next match, and audio must be muted while the ad plays.
- **Banners, user accounts, data saving, invite links.**
- **Loading events.** The bundle loads before the SDK, so `loadingStart` and `loadingStop` would cover nothing useful.

## How to test locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173/?crazygames=1`. The console shows the CrazyGames SDK banner, and `window.CrazyGames.SDK.environment` is `"local"`. `npm test` includes `scripts/test-crazygames.mjs` (host detection, no-op without the SDK, failed init, paired start and stop).

## Submission checklist

Technical (build side)

- [x] SDK v3 loaded and initialised only on CrazyGames hosts
- [x] `gameplayStart` / `gameplayStop` around live play, including pause
- [x] `happytime` on a win
- [x] Game pauses when the tab is hidden or the window loses focus
- [x] Sound toggle (M or the SOUND button), remembered between visits
- [x] Works with mouse, keyboard and touch; landscape layout, with a rotate hint on upright phones
- [x] No external links out of the game, no other platform's branding in the build
- [ ] `npm run build` output zipped from `dist/` with relative asset paths. `[CONFIRM: vite base path for the CrazyGames upload]`
- [ ] Bundle size check: the Phaser chunk is over 500 kB minified. Confirm it is within CrazyGames' initial download guidance. `[CONFIRM: current size limit]`
- [ ] Test inside the CrazyGames QA tool / preview after upload

Portal and store (Alexei)

- [ ] Developer account and who submits. `[CONFIRM: account owner]`
- [ ] Game title. `[CONFIRM: "Rokumon Air Hockey" or another name]`
- [ ] Short and long description. `[CONFIRM: store copy]`
- [ ] Category and tags. `[CONFIRM]`
- [ ] Cover and thumbnail images in the sizes the portal asks for. `[CONFIRM: art; the game has no dedicated art yet, see the UI inventory of 12 Nov]`
- [ ] Gameplay video or GIF if the portal asks for one. `[CONFIRM]`
- [ ] Controls text for the listing: "Move your mallet with the mouse or a finger. Arrow keys or WASD also work. First to 7 goals wins." (taken from the in-game menu)
- [ ] Ads decision (see above). `[CONFIRM]`
- [ ] Exclusivity, revenue share and terms accepted by Alexei. `[CONFIRM]`
- [ ] Originality check before any store release (house rule: Google Play Originality Release Gate)

Recommended before submitting: the art pass in the UI inventory. The menu, result screens and table are still procedural placeholders.
