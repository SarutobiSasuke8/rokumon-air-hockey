# Gameplay Constants

Keep all player-facing tuning in named groups. Tune through a human playtest, not by intuition alone.

All values below live in `src/game/constants.ts` (`PUCK`, `PADDLE`, `AI`, `MATCH`, `GOAL`, `TABLE`, `SIM`). This table exists so tuning changes are visible without reading the source.

## Puck Physics (glide and rebound)

| Constant | Value | Why | Verified in |
|---|---:|---|---|
| Puck radius | 13px | small relative to the 440x430 half-table; leaves room to dodge | code read |
| Wall restitution | 0.9 | most of the puck's speed survives a rail hit so rebounds stay lively | `scripts/test-physics.mjs` wall fuzz |
| Glide friction | 0.32 per second (exponential) | the puck glides across the whole table instead of stopping like a rolling ball | headless matches |
| Max speed | 1100 px/s | fast enough to beat a defender with a good shot, slow enough to read; applied after every mallet contact | `scripts/test-physics.mjs` |
| Serve | puck waits still on the conceding side, 150px from the centre line, for 900ms | the side that conceded gets a fair first touch | `scripts/test-physics.mjs` rules checks |
| Physics rate | 240 Hz, each step split so nothing moves more than half a puck radius | prevents tunnelling through walls and mallets | 20,000 px/s puck and 900 px swing checks |

## Mallet Physics (the hit)

| Constant | Value | Why | Verified in |
|---|---:|---|---|
| Mallet radius | 27px | large enough to feel controllable, small enough that misses are possible | code read |
| Mallet restitution | 0.85 | mallets act as heavy objects: a swing adds its speed, a still mallet blocks with a firm rebound | `scripts/test-physics.mjs` |
| Player mallet max speed | 3200 px/s | the mallet chases the pointer fast enough to feel 1:1 but a flick is spread over steps, so the hit speed is real | `scripts/test-controls.mjs` |
| Keyboard speed | 520 px/s | fallback control | `scripts/test-controls.mjs` |

## AI Opponent

| Constant | Value | Why | Verified in |
|---|---:|---|---|
| Max speed | 680 px/s | well below a mouse flick, so it is competitive but beatable | headless matches against scripted players at three strengths |
| Reaction | re-reads the puck every 120ms | believable lag instead of a frame-perfect tracker | code read |
| Aim error | +/-70px around the goal centre, straight or banked off a side wall | its shots vary, so it can score but also miss | headless matches |
| Guard line | 46px in front of its goal line, predicting banked shots | a defensive stance that steps into the puck to return it | headless matches |
| Strike speed | attacks a puck on its side slower than 560 px/s | stops it from swiping at shots it can only block | code read |

## Match / Feel

| Constant | Value | Why | Verified in |
|---|---:|---|---|
| Win score | 7 | short enough for a quick session, long enough that one lucky bounce doesn't decide the match | browser match test |
| Goal mouth | 200px tall (half-height 100) with round posts | enough goals that a match lasts about 2 to 4 minutes | headless matches |
| Possession limit | 7 seconds in one half, then the puck passes to the other side | a parked puck can never stall a match | `scripts/test-physics.mjs` |
| End delay | 1400ms after the winning goal, then the result screen (input ignored for its first 600ms) | lets the goal celebration read; avoids an accidental restart | browser match test |
| Goal camera shake | 180ms, 0.008 intensity | noticeable without being disorienting; no reduced-motion toggle exists yet (see Open Questions in `docs/PROJECT_BRIEF.md`) | code read |
| Audio default | on by default; WebAudio context unlocks on the first click/tap/keydown (`sfx.unlock()`), since browsers block autoplay before a user gesture | code read |
