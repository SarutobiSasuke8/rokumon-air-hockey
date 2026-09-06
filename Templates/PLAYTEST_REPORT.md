---
title: Playtest Report - Rokumon Air Hockey, initial build
date: 2026-09-06
build: local workspace, no repo/commit yet
stage_under_review: Stage 2, Playable Core (candidate)
---

# Playtest Report - Rokumon Air Hockey, initial build

## Scope

- Main question: does the freshly built playable slice hold together end to end (title -> match -> win/lose -> restart), and is the physics tuning sound on paper?
- Build / commit: local workspace at this session's HEAD of the working tree; no git repo exists for this project yet.
- Tester: Claude Code, code-level review and `npm run build` / `./scripts/verify-project.ps1` only. No human played the game and no browser was driven in this environment.
- Device, browser, and viewport: none. This environment did not have a way to load and interact with the built page.
- Input method: not exercised; reasoned about from source only.

## Evidence

- Deterministic smoke path: unavailable. No headless/scripted browser smoke test exists in this project. `window.__GAME_DEBUG__` (`startGame`, `snapshotState`, `stepFrames`, `setSeed`) exists as a manual console-driven hook but was never invoked because no browser was available.
- Screenshots / recording: none captured.
- Console / network errors: unknown; the app was never loaded in a browser this session.
- Approximate frame rate or performance observation: not measured. `npm run build` produces one ~1.39MB (362KB gzip) bundle, dominated by Phaser itself; the game's own per-frame code allocates a small number of plain objects per frame (`aiTarget`, `prevPlayer`/`prevAi`) and does no per-frame texture generation, so there is no obvious performance red flag on paper, but this is not a substitute for measuring real frame timing.

## Findings

| Severity | What the player sees | Reproduction | Likely owner | Follow-up |
|---|---|---|---|---|
| Unknown (untested) | Whether paddle-drag actually feels responsive and whether the AI's 300px/s cap / 160ms reaction delay feels fair rather than sluggish or too easy | Play a full match on desktop and phone | Alexei / next session with a browser | `TODO.md`: human playtest pass |
| Low | No reduced-motion option for the 180ms/0.008-intensity goal camera shake | Score any goal | design | `TODO.md`: add toggle if this ships beyond a local prototype |
| Low | No headless smoke test exists, so regressions in the physics tuning would only be caught by a human playtest or by reading the diff | N/A | QA/CI | `TODO.md`: add a smoke test if this moves toward a hub or repo |

## Checklist Result

- Core loop: pass on code-level review (state machine, scoring, win/lose, restart all trace correctly through `GameScene`/`GameOverScene`); not exercised live.
- Input and feel: unverified; both input paths (`pointer`, `keyboard`) are wired correctly in the source but no perceptible-lag or feel judgment can be made without playing it.
- Playfield and UI: pass on code-level review; HUD (`UIScene`) is confined to a strip above the rink boundary (`TABLE.y0 = 70`) so it structurally cannot overlap the playfield; not screenshotted.
- Stability: unverified; no browser session, no console-error check, no resize/focus-loss check.
- Mobile / accessibility: unverified; touch input is wired the same as mouse (pointer events), but no physical device was tested.

## Verdict

`pass with issues`

The build compiles clean (`tsc --noEmit` and `vite build` both succeed via `npm run build` / `./scripts/verify-project.ps1`), and every gameplay file was read end-to-end and cross-checked against the constants and the intended design (glide/bounce/AI-reaction feel). That is a code-correctness pass, not a human feel pass. Do not treat this as evidence the game is fun or well-tuned to play -- only that it is wired together correctly and should run.

## Next Action

Run a real human playtest (desktop mouse + a phone/touch device) against `Templates/PLAYTEST_CHECKLIST.md`, capture screenshots of menu/play/goal/end states, and re-tune `AI.maxSpeed` / `AI.reactionDelayMs` in `src/game/constants.ts` if the opponent feels too easy or too hard. No repo or hub integration should happen before that pass, per this build's scope.
