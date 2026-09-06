# Gameplay Constants

Keep all player-facing tuning in named groups. Tune through a human playtest, not by intuition alone.

All values below live in `src/game/constants.ts` (`PUCK`, `PADDLE`, `AI`, `MATCH`, `GOAL`, `TABLE`). This table exists so tuning changes are visible without reading the source.

## Puck Physics (glide and rebound)

| Constant | Value | Why | Verified in |
|---|---:|---|---|
| Puck radius | 13px | small relative to the 480x430 playfield; leaves room to dodge | code read |
| Wall bounce (restitution) | 0.94 | most of the puck's speed survives a rail hit so rebounds stay lively, not dead | code read; `sfx.wallHit()` fires on every wall collider hit |
| Glide damping | 0.9985 per 16.67ms frame (~0.15%/frame) | multiplicative, near-1 damping applied every frame in `applyPuckGlide` so the puck decelerates gradually and glides across the whole table instead of stopping quickly like a rolling ball | code read |
| Max speed | 760 px/s | hard cap via `setMaxVelocity`, applied again after every paddle hit so hits cannot runaway-accelerate the puck past a controllable speed | code read |
| Serve speed | 260 px/s at a random -0.5..0.5 rad angle, alternating side each serve | gentle enough that the receiving side always has a fair first read | code read |

## Paddle Physics (the hit)

| Constant | Value | Why | Verified in |
|---|---:|---|---|
| Paddle radius | 27px | large enough to feel controllable, small enough that misses are possible | code read |
| Hit transfer | 0.85 x the striking paddle's own velocity (estimated from position delta over the previous frame) added to the puck's velocity on collision | this is what makes a fast paddle swing feel like a smack instead of a passive deflection; a stationary paddle still redirects the puck via the Arcade bounce alone | code read in `onPaddleHit` |
| Minimum hit speed (for the SFX pitch floor only) | 180 px/s | keeps even a soft touch audible without implying a soft touch changes puck physics | code read |

## AI Opponent

| Constant | Value | Why | Verified in |
|---|---:|---|---|
| Max speed | 300 px/s | deliberately below what a mouse flick can achieve, so the AI is competitive but beatable, not a wall | code read |
| Reaction delay | 160ms | the AI only re-reads the puck's position/tracks a new target once per 160ms window, matching a believable human reaction lag instead of a frame-perfect tracker | code read in `updateAiPaddle` |
| Home position | table's own-goal side, inset 150px from the back wall, vertically centered | gives the AI a default defensive stance when the puck is in the player's half, instead of camping the goal mouth | code read |
| Advance limit | stays at least 40px back from the center line even when chasing | prevents the AI from crossing into the player's half | code read |

## Match / Feel

| Constant | Value | Why | Verified in |
|---|---:|---|---|
| Win score | 7 | short enough for a quick session, long enough that one lucky bounce doesn't decide the match | code read |
| Serve delay | 1100ms | pause after a goal before the next serve so the goal celebration (shake/flash/particles) reads clearly | code read |
| Goal camera shake | 180ms, 0.008 intensity | noticeable without being disorienting; no reduced-motion toggle exists yet (see Open Questions in `docs/PROJECT_BRIEF.md`) | code read |
| Audio default | on by default; WebAudio context unlocks on the first click/tap/keydown (`sfx.unlock()`), since browsers block autoplay before a user gesture | code read |
