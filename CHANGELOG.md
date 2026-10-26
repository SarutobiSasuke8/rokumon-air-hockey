# Changelog

All notable changes to this project should be documented here.

## Unreleased

- Relist fixes (2026-10-26): a full match is playable again. Arcade Physics is replaced by a fixed-step simulation with swept collisions (`src/game/physics.ts`, `src/game/sim.ts`), so the mallet stays under the pointer and the puck can no longer leave the table or pass through a mallet. The mallet follows the mouse without a click. A new AI defends with prediction, returns the puck and attacks with bank shots. Whoever concedes serves, and a 7-second possession rule stops a parked puck from stalling a match. Wider goal mouths with posts, a brighter puck, HUD labels off the table edge, a short guard on the result screen, and a "turn your phone sideways" hint on upright phones. New Node physics tests and a Playwright test that plays full matches with mouse and touch input.
- Beta polish: the match pauses when the tab is hidden or the window loses focus (P or Esc by hand too), a remembered sound toggle (M or the SOUND button), a loading line while the bundle loads, the real page title, a meta description and an inline favicon, and the canvas is centred on tall phone screens with page scroll and overscroll locked.
- Initial template setup.
- Added a reusable branded-HUD housing contract: normalized safe insets,
  Phaser containment auditing/debug guides, and screenshot-based QA guidance.
