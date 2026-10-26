# Rokumon Air Hockey

A single-player browser air hockey game. You play one table against a computer opponent, and the first side to seven goals wins. It is a plain arcade game: there is no betting, no currency and no gambling mechanic of any kind.

It is part of the Rokumon Games family of small browser games.

## Status

Public beta candidate (October 2026). A full match plays to completion on desktop (mouse or keyboard) and on phones (touch), and an automated browser test plays whole matches on both. The AI is tuned against scripted players, not yet against many people, so difficulty may still move after beta feedback.

## Run it

You need Node.js 22 or later (the CI workflow uses 22).

```bash
npm install
npm run dev
```

Vite prints a local address to open in a browser.

Other scripts, as defined in `package.json`:

| Command | What it does |
| --- | --- |
| `npm run build` | Type checks with `tsc --noEmit`, then builds with Vite into `dist/`. |
| `npm run preview` | Serves the built `dist/` folder locally. |
| `npm test` | Node checks: input, Rokumon SDK, physics edge cases, rules and 12 headless seeded matches. |
| `npm run verify` | `npm test`, then `build`. This is what CI runs. |
| `npm run test:browser` | After a build: boots the static bundle in Chromium, then plays full matches with real mouse input (desktop) and touch input (two phone viewports). CI runs this as `node scripts/hub-smoke.mjs`. |

## How to play

- Click, tap or press Space on the title screen to start.
- Your mallet is on the right (cyan) and the computer's is on the left (pink). Score in the pink goal on the left wall, and defend the cyan goal on the right.
- Whoever concedes gets the puck: it waits, blinking, on their side for under a second, then goes live.
- If the puck sits in one half for 7 seconds, it passes to the other side (a notice shows at the bottom).
- A goal triggers a short screen shake, a colour flash and a particle burst.
- The first side to 7 goals wins. The end screen offers a restart with a click, a tap or Space.

## Controls

| Input | Action |
| --- | --- |
| Mouse (just move it, no click needed) or touch drag | Your mallet follows the pointer, up to a fast but finite speed. |
| Arrow keys or WASD | Move your mallet at a fixed speed. The next mouse move takes control back. |
| R | Restart the match. |
| P or Esc | Pause or resume. The match also pauses by itself when the tab is hidden or the window loses focus; tap, click or press Space to resume. |
| M, or the SOUND button top right | Turn sound effects on or off. The choice is remembered on this device. |
| Space, click or tap | Start from the title screen, or play again from the end screen. |

## How it works

- The table is a landscape 960 by 540 canvas with a goal in each end wall, a centre line and a centre circle.
- The match runs in `src/game/sim.ts` at a fixed 240 steps a second, with no Phaser imports. The game scene feeds it the pointer or keyboard target, then draws the result, plays sound and reports to the Rokumon SDK.
- Puck physics (`src/game/physics.ts`): each step is split so nothing moves more than half a puck radius at a time, and mallet contacts are solved as a swept circle test in the mallet's frame. A fast puck or a fast swing cannot pass through a mallet, and the puck cannot leave the table except through a goal mouth. Mallets act as heavy objects, so a swing hits harder than a block. The goal mouths have round posts.
- The opponent (`src/game/ai.ts`) re-reads the puck every 120 ms, moves at a capped speed, predicts bank shots when defending, steps into the puck to return it, and attacks with straight or banked shots at a randomly offset aim point. It is meant to be beatable.
- All tuning values live in `src/game/constants.ts`.
- Test-only query flags: `?seed=N` (repeatable kick-off and AI aim), `?speed=K` (run 1 to 8 times faster) and `?manual=1` (the match only advances through `window.__GAME_DEBUG__.tick()`, which the browser test uses).

## Tech

- [Phaser](https://phaser.io/) 4 for rendering and input (no Phaser physics engine)
- TypeScript
- [Vite](https://vitejs.dev/)
- Plain Node scripts and Playwright for tests (no test framework).

All visuals are generated at runtime and all sound effects are synthesised with the Web Audio API. The repository ships no image or audio files, and the asset manifest is intentionally empty.

## Project layout

- `src/main.ts`: Phaser game setup.
- `src/scenes/`: title, game, HUD and game-over scenes.
- `src/systems/`: input, audio and debug helpers.
- `src/game/`: constants, run state, physics, AI and the match simulation (no Phaser imports).
- `docs/`, `Templates/`, `personas/`, `Session Logs/`, `AGENTS.md` and the other agent files: the working agreement and notes from the browser game template this project started from. See `TEMPLATE_NOTES.md`.
- `ROADMAP.md` and `TODO.md`: open work.

## Open work

- Beta feedback on AI difficulty (`AI` in `src/game/constants.ts`).
- On a phone held upright the table is small; the page asks the player to turn the phone sideways. A portrait table layout is not built.
- Possible later options: a reduced-motion setting for the goal shake, a second difficulty, or local two-player.

## Licence

See `LICENSE`.

## Rokumon hub events

The optional `/hub-bridge.js` SDK receives ready, player score after each goal and gameOver at match end. Missing or broken SDK calls are safe no-ops. The static `dist/` bundle uses relative asset URLs.

- `match-won`: playerScore (number), opponentScore (number), seconds (number). Emitted once when the player reaches 7.

Run `npm test` for forwarding and standalone regression checks.

## Automated physics checks

`npm test` runs the Node checks: swept-collision cases (pucks up to 20,000 px/s against a mallet, mallet swings of 900 px in one step), a 600-shot wall fuzz at three frame rates, goal mouths and posts, a puck pinned against a wall, mallet bounds, scoring to 7 with a single match-over, the 7-second rule, and 12 headless seeded matches against a scripted player. `node scripts/hub-smoke.mjs` boots the static build in Chromium with and without the SDK, then runs `scripts/test-match-browser.mjs`: three full matches with real mouse and touch input on desktop and phone viewports, the result screen, restart and SDK calls, plus a real-time control check. Both run in game.yml on PRs. Set `SCREENSHOT_DIR` to keep screenshots. These checks do not replace a human judgement of feel.
