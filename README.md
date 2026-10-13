# Rokumon Air Hockey

A single-player browser air hockey game. You play one table against a computer opponent, and the first side to seven goals wins. It is a plain arcade game: there is no betting, no currency and no gambling mechanic of any kind.

It is part of the Rokumon Games family of small browser games.

## Status

Playable prototype. The build, type check and agent-document checks pass. A human feel pass on desktop and on a physical phone has not been done yet, so the AI difficulty and the puck feel are untuned by real play. There is no hub or hosted deployment.

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
| `npm run verify` | Runs the same checks as `build`. This is what CI runs. |

## How to play

- Click, tap or press Space on the title screen to start.
- Your paddle is on the right and the computer's is on the left. Score by sending the puck into the goal in the left wall, and defend the goal in the right wall.
- A goal triggers a short screen shake, a colour flash and a particle burst, then a brief serve delay before the puck is served again.
- The first side to 7 goals wins. The end screen offers a restart with a click, a tap or Space.

## Controls

| Input | Action |
| --- | --- |
| Mouse (hold the button and drag) or touch drag | Move your paddle towards the pointer. |
| Arrow keys or WASD | Move your paddle at a fixed speed (keyboard fallback). |
| R | Restart the match. |
| Space, click or tap | Start from the title screen, or play again from the end screen. |

Known issue on this branch: after you have used the pointer, keyboard movement may stop responding, and R may not restart while a serve is pending. A fix is in open pull request #1 and is not part of `main`.

## How it works

- The table is a landscape 960 by 540 canvas with a goal in each end wall, a centre line and a centre circle.
- The puck glides rather than rolling to a stop. Its speed is damped slightly every frame, it keeps most of its speed on wall bounces, and its speed is capped.
- A moving paddle passes part of its own velocity to the puck on contact, so a fast swing hits harder than a stationary block.
- The opponent only re-reads the puck position at a fixed interval, moves more slowly than a mouse flick, and retreats to a defensive position when the puck is in your half. It is meant to be beatable.
- All tuning values live in `src/game/constants.ts`.
- Game state (score, status, winner) is a plain object kept apart from the Phaser objects that draw it. The game scene updates it and emits a score event that the HUD scene listens for.

## Tech

- [Phaser](https://phaser.io/) 4 with Arcade Physics
- TypeScript
- [Vite](https://vitejs.dev/)
- No test framework is configured.

All visuals are generated at runtime and all sound effects are synthesised with the Web Audio API. The repository ships no image or audio files, and the asset manifest is intentionally empty.

## Project layout

- `src/main.ts`: Phaser game setup.
- `src/scenes/`: title, game, HUD and game-over scenes.
- `src/systems/`: input, audio and debug helpers.
- `src/game/`: constants and run state.
- `docs/`, `Templates/`, `personas/`, `Session Logs/`, `AGENTS.md` and the other agent files: the working agreement and notes from the browser game template this project started from. See `TEMPLATE_NOTES.md`.
- `ROADMAP.md` and `TODO.md`: open work.

## Open work

- A human playtest on desktop and phone, using `Templates/PLAYTEST_CHECKLIST.md`.
- Retuning the opponent's speed and reaction delay once that pass is done.
- Possible later options: a reduced-motion setting for the goal shake, a second difficulty, or local two-player.

## Licence

See `LICENSE`.

## Rokumon hub events

The optional `/hub-bridge.js` SDK receives ready, player score after each goal and gameOver at match end. Missing or broken SDK calls are safe no-ops. The static `dist/` bundle uses relative asset URLs.

- `match-won`: playerScore (number), opponentScore (number), seconds (number). Emitted once when the player reaches 7.

Run `npm test` for forwarding and standalone regression checks.
