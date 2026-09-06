# Game Brief

This is the project context agents should read before game design, architecture, UI, roadmap, or implementation work.

## Summary

Rokumon Air Hockey is a top-down arcade air hockey game rendered on one Phaser
canvas. The camera is a fixed overhead view of the whole table, landscape,
960x540. The player fantasy is a real arcade air hockey table: fast paddle,
slippery puck, hard rebounds. The core loop is drag/move the paddle, smack the
puck past the AI into the left goal, defend the right goal, first to seven
wins.

## Vibe

- Desired feeling: fast, slippery, satisfying; every hit and goal should feel
  like it landed.
- Reference games / experiences: real coin-operated air hockey tables; classic
  Windows/arcade air hockey ports.
- Anti-vibe: floaty bouncy-ball physics, a puck that rolls to a stop, an AI
  that never misses or telegraphs no reaction at all.
- First impression target: within three seconds of the puck being served, the
  player should feel the glide and the rebound speed.

## User

- Primary player: someone who wants a quick, replayable arcade match, no
  account, no stakes, no tutorial.
- Secondary players: none for this pass (single scene, single difficulty).
- Player skill level: casual to moderately skilled; the AI is tuned to be
  competitive but beatable, not a wall.
- Context of play: a few short rounds in a browser tab, mouse or touch.

## Problem

Explores whether a procedurally-drawn, asset-free Phaser table can still
deliver real arcade air-hockey feel (glide, rebound, impact) purely through
physics tuning and juice (shake, flash, particles, tones), without any art or
audio files.

## Product Promise

Within the first minute a player can see the title screen, start a match,
control their paddle immediately, score or concede at least one goal, and see
the score update with a goal celebration.

## Core Workflows

1. Player starts a run or level and understands the objective.
2. Player performs the core action loop.
3. Player reaches a success, failure, or restart state.

## Success Criteria

- The first screen is playable.
- The core loop is understandable without heavy instruction.
- Input feels responsive.
- HUD does not block the playfield.
- Win/loss/restart flow exists.

## Non-Goals

- No elaborate menus before the core loop works.
- No large content pipeline before one room/level works.
- No multiplayer unless it is the core concept.
- No account system in the prototype.

## Constraints

- Time: single build session.
- Budget: none; procedural art/audio only, no purchased or generated asset files.
- Stack: Phaser 4 + TypeScript + Vite (`phaser-ts` profile), Arcade Physics.
- Deployment target: local workspace only for this pass; no repo, no hub, no hosting.
- Data sensitivity: none; no accounts, no money, no personal data.
- Performance expectations: smooth on a mid-range laptop at 960x540, no dropped frames during normal play.
- Accessibility expectations: keyboard alternative to pointer control (arrow keys / WASD) is provided; no colourblind-safe audit done this pass.

## Platform and Distribution

- Engine / profile: Phaser 4 + TypeScript + Vite, `phaser-ts` profile of the browser-game template, no addons.
- Orientation and virtual resolution: landscape, fixed 960x540 virtual resolution, `Phaser.Scale.FIT` letterboxing.
- Supported inputs: mouse drag, touch drag, and arrow keys / WASD as a keyboard fallback; `R` restarts mid-round for convenience.
- Target browsers / devices: modern desktop and mobile browsers with WebAudio support; not verified on a real device this pass.
- Distribution: standalone, local workspace only. No Games Hub integration in this pass (`src/integrations/hub.ts` is a no-op seam).
- Offline requirement: no.
- Performance budget: not formally measured; the production build is small (Phaser + a few KB of game code) and the scene has no per-frame allocations beyond a handful of vector objects.

## Quality Gates

- Core workflow works end-to-end.
- Loading, empty, and error states exist where relevant.
- UI is responsive across target screen sizes.
- Project commands in `AGENTS.md` are accurate.
- Tests/checks cover the most important changed behavior.
- A playtest checklist has been run before calling the prototype done.

## Technical Notes

- Architecture: five Phaser scenes (Boot, Menu, Game, UI, GameOver). Gameplay
  constants live in `src/game/constants.ts`; run state lives in `src/game/state.ts`.
- Game engine: Phaser 4.2.1, Arcade Physics for the puck body (drag/bounce/max
  velocity), manual position clamping for both paddles.
- Input model: hybrid, pointer-drag primary with a polled keyboard fallback,
  see `Templates/INPUT_CONTROL_MAP.md`.
- Asset model: fully procedural. `BootScene` generates puck/paddle/particle
  textures at runtime with `Graphics.generateTexture`; audio is synthesized
  WebAudio oscillator tones in `src/systems/audio.ts`. No image or sound
  files ship; `Templates/ASSET_MANIFEST.json` is intentionally empty, same
  convention as the sibling project Raging Roulette.
- Save/persistence: none. Score resets on reload; no local storage used.
- Observability/logging: `window.__GAME_DEBUG__` (see `src/systems/debug.ts`)
  exposes `startGame`, `snapshotState`, `stepFrames`, and `setSeed` for manual
  console-driven inspection.
- Simulation / renderer boundary: `RunState` (score, status, winner) is a
  plain serializable object separate from the Phaser game objects that render
  it; `GameScene` mutates state and emits `score-changed` on the shared game
  event emitter for `UIScene` to read.
- Deterministic debug or smoke-test path: `window.__GAME_DEBUG__.stepFrames`
  can advance the Phaser loop by a fixed delta for scripted inspection; no
  headless browser smoke test exists yet (see Open Questions).
- Asset manifest and fallback policy: `Templates/ASSET_MANIFEST.json` /
  `assets/asset-manifest.json` stay empty by design; if placeholder or final
  art is ever added it must get a manifest entry before gameplay code
  references it.
- Save schema version: n/a, no persistence.

## Open Questions

- [x] #task Define the core loop. -- one-paddle-vs-AI air hockey to 7, done.
- [x] #task Choose the engine and rendering stack. -- Phaser 4 + TS + Vite.
- [x] #task Decide the first playable milestone. -- title, one playable table, win/lose screen; built.
- [ ] #task Run a real human playtest pass (desktop + phone) against `Templates/PLAYTEST_CHECKLIST.md`; no browser was available to drive this build session. #next
- [ ] #task Add a headless/deterministic smoke test if this game moves toward a hub or repo.
- [ ] #task Decide whether a second difficulty or a local two-player mode is worth adding later.

## References

- Add inspiration, sketches, asset references, or prototype links.
