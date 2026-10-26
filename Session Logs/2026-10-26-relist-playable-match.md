# Relist fixes: playable full match, 2026-10-26

Goal: make Air Hockey functional for relisting as a public beta after the 23 October playtest found it "not functional" (rokumon-games issue #30).

## What was broken (seen in headless Chromium on main ec6ae17)

- The player's mallet did not stay under the pointer. Arcade bodies were moved with `setPosition` plus `updateFromGameObject`, and the body's previous position was stale, so the drawn mallet jumped 30 to 60 px around the pointer each frame and ran off screen (x of -449 and 1433 seen). 98% of sampled frames had it outside its half.
- The puck left the table (x of -5682, y of 4627 seen) and the match then sat in "playing" for ever with no way to score.
- The mallet only followed the mouse while the button was held, so plain mouse movement did nothing.
- The puck was drawn near-black on a dark-blue table.
- On an upright phone the table was a thin strip with no hint, and the AI/YOU labels overlapped the table edge.

## What changed

- Physics, AI and match rules moved into Phaser-free modules (`src/game/physics.ts`, `ai.ts`, `sim.ts`) at 240 Hz with substeps and swept mallet contacts. GameScene now only feeds input, draws, plays sound and reports to the SDK.
- AI tuned with headless matches against a scripted player at three strengths (`scripts/lib/headless-match.mjs`): a slow player wins about a quarter of matches, a medium one most, a fast one all.
- Conceder serves; 7-second possession rule; goal half-height 85 to 100 with round posts.
- Pointer input reads `pointer.x`/`pointer.y` (updated on the DOM event) instead of `worldX`/`worldY` (updated on the next game step).
- Test hooks: `?seed`, `?speed`, `?manual=1` with `__GAME_DEBUG__.tick()`.

## Verification

- `npm run verify`: input, SDK, 57 physics/rules/AI checks, 12 headless matches, build.
- `node scripts/hub-smoke.mjs`: boot smoke with and without SDK, then full matches on desktop (mouse), Pixel 7 landscape and iPhone 13 portrait (touch), result screen, restart, SDK calls, and a real-time control check.

## Open

- Human feel pass on a physical phone; AI difficulty from beta feedback.
