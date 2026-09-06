# Playtest Checklist

Run this after gameplay, input, or core-loop changes, and before calling any milestone done. Copy the checklist into the session log or QA note and mark each item.

## Core Loop

- [x] The game starts into something playable, not a menu or blank screen. -- `BootScene` generates textures then goes straight to `MenuScene`, which is a real title screen (not a blank canvas); `GameScene` is playable table on start. Verified by code read, not a running browser.
- [x] The objective is understandable within the first few seconds without instructions. -- `MenuScene` states the win condition and controls in plain text before the match starts.
- [ ] The core action works with every supported input method. -- NOT verified interactively. Pointer-drag and keyboard fallback are both wired in `src/systems/input.ts` and read by `GameScene.updatePlayerPaddle`, but no browser was available in this session to actually drag a paddle or press a key and watch it move.
- [x] Success state triggers correctly and is clearly communicated (code read). -- `onGoal` increments score, fires shake/flash/particles/SFX, and at `MATCH.winScore` (7) transitions to `GameOverScene` with a clear "YOU WIN"/"YOU LOSE" state.
- [x] Failure state triggers correctly and is clearly communicated (code read). -- same path as above for the AI reaching 7 first.
- [x] Restart returns to a clean, correct starting state (code read). -- `GameOverScene` and the mid-round `R` key both call `scene.start("Game")`, which re-runs `create()` and rebuilds `RunState` via `createRunState()`, so no score/state leaks between runs.

## Input and Feel

- [ ] Input responds without perceptible lag. -- NOT verified; no browser session was run.
- [ ] Held keys, rapid presses, and simultaneous inputs behave sensibly. -- NOT verified interactively; keyboard vector logic (`keyboardVector`) sums opposite keys to zero, which is correct on paper but untested in a real browser.
- [x] Controls match `Templates/INPUT_CONTROL_MAP.md`. -- confirmed by reading `src/systems/input.ts` against the map; they match.
- [x] Nothing important depends on an input the map does not document. -- only pointer-drag, arrow/WASD, `R`, and `Space`/click on menu/end screens are wired; all are documented.

## Playfield and UI

- [x] HUD, modals, and overlays never block the core interaction. -- `UIScene` draws score text only in the top ~70px strip, outside the rink (`TABLE.y0 = 70`); the rink itself has no overlay on top of it.
- [ ] The playfield stays legible at the smallest supported window size. -- NOT verified on a real small viewport; `Phaser.Scale.FIT` letterboxes the fixed 960x540 canvas, which should scale cleanly, but this was not screenshotted.
- N/A Pause (if present) -- no pause feature in this pass.
- [x] No UI element traps focus or clicks in a way that breaks play. -- HUD text objects are not interactive (`setInteractive` is never called on them), so no dead click zones.
- N/A Branded HUD/menu safe rectangles -- no raster HUD frame is used; the HUD is plain generated text, so `docs/UI_HOUSING.md`'s contract does not apply this pass.
- N/A UI housing debug guide -- not applicable, see above.

## Stability

- [ ] No console errors during a full loop (start -> play -> win/lose -> restart). -- NOT verified; no browser was run. `npx tsc --noEmit && vite build` (the project's own `verify` script) passes with zero errors, which is the closest available signal.
- [ ] Frame rate stays playable during the busiest expected moment. -- NOT verified; no browser was run.
- [ ] Losing window focus and returning does not break the game state. -- NOT verified.
- [ ] Resizing the window mid-play does not break rendering or input. -- NOT verified; `Phaser.Scale.FIT` should handle this by design, but it was not exercised.

## Evidence and Device Coverage

- [x] The deterministic smoke path was run, or the reason it cannot exist is documented. -- No headless/scripted smoke test exists for this project (none was requested and the template's own smoke-test hooks, if any, were not present in this profile); `window.__GAME_DEBUG__.stepFrames`/`snapshotState` exist for manual console-driven stepping but were not exercised because no browser was available. This gap is tracked in `TODO.md`.
- [ ] Screenshots or a short capture show menu, active play, pause, success/failure, and restart states. -- NOT captured; no browser session was run in this environment.
- N/A debug-guide HUD screenshots -- no raster HUD wrapper is used.
- [ ] Desktop keyboard/pointer behavior was checked at the target viewport. -- NOT verified interactively.
- [ ] Touch controls, safe areas, and orientation were checked on a physical device. -- NOT verified; no device was available.
- [ ] Reduced-motion, muted audio, and focus-loss behavior were checked. -- NOT verified; no reduced-motion toggle exists yet (tracked in `TODO.md`). Audio requires a user gesture to unlock (`sfx.unlock()` on the menu's first click/tap/keydown), which is standard browser-autoplay-policy behavior, verified by code read only.
- [x] Known verification limits are stated rather than inferred away. -- see `Templates/PLAYTEST_REPORT.md` and every NOT-verified line above.

## Result

- Date: 2026-09-06
- Build/commit: local workspace, no repo/commit yet
- Tester: Claude Code (code-level review only; no human or browser playtest was run)
- Verdict: `pass with issues` -- the build/type-check verification passes cleanly and the gameplay logic reads correctly against its own design intent, but the "core loop", "input and feel", and most of "stability"/"evidence" sections above are unverified in a live browser and must be treated as open risk until a human plays it.
- Issues found (file follow-ups in `TODO.md`): human playtest pass on desktop and phone; AI difficulty may need tuning after real play; no reduced-motion toggle; no smoke test.
- Evidence location: none captured (no screenshots/recording); the only evidence is a clean `npm run build` / `./scripts/verify-project.ps1` run and a full source read of every gameplay file.
