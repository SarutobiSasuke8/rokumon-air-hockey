# TODO

Use this file for actionable game project work. Keep items concrete.

## Inbox

## Next

- [ ] #task #next Run a real human playtest pass (desktop + phone) against `Templates/PLAYTEST_CHECKLIST.md`; not possible in the build session, no browser was available.
- [ ] #task #next Tune AI reaction delay / speed cap after a human feel pass shows whether it is too easy or too hard.

## Backlog

- [ ] #task Add a deterministic/headless smoke test if this game moves toward a hub or repo.
- [ ] #task Decide whether a second difficulty tier or a local two-player mode is worth adding.
- [ ] #task Add a reduced-motion toggle for camera shake if this ever ships beyond a local prototype.
- [ ] #task Set up a repo and hub entry once the human playtest pass is done (out of scope for this build).

## Done

- [x] #task Define the game goal in `docs/PROJECT_BRIEF.md`.
- [x] #task Choose engine and stack (Phaser 4 + TypeScript + Vite, `phaser-ts` profile).
- [x] #task Replace placeholder commands in `AGENTS.md`.
- [x] #task Define the action map, tuning constants, and asset manifest (`Templates/INPUT_CONTROL_MAP.md`, `Templates/GAMEPLAY_CONSTANTS.md`, `Templates/ASSET_MANIFEST.json` intentionally empty - all art/audio is procedural).
- [x] #task Build the first playable vertical slice (title screen, one playable table, win/lose screen, restart).
- [x] #task Run `./scripts/check-agent-docs.ps1`.
