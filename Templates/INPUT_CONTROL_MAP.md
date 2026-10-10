# Input / Control Map

The single source of truth for how the game is controlled. Update this before or with any input change; the playtest checklist verifies against it.

## Primary Controls

| Action | Keyboard | Mouse / Touch | Gamepad (if supported) |
|---|---|---|---|
| Move paddle | Arrow keys / WASD (fixed-speed step) | Hold and drag (mouse button down, or touch) | not supported |
| Primary action (hit puck) | n/a - contact is automatic on overlap | n/a - contact is automatic on overlap | not supported |
| Secondary action | none | none | not supported |
| Pause / menu | none this pass | none this pass | not supported |
| Restart | `R` during play or serving / `Space` on title or end screen | Click / tap on title or end screen | not supported |

## Rules

- Keyboard-first by default; every core action must be reachable without a mouse unless the genre demands otherwise. Air hockey's core action is continuous 2D positioning, so arrow keys/WASD are provided as a full keyboard-only alternative to pointer drag.
- Do not bind core actions to keys that conflict with browser shortcuts (avoid `Ctrl`-combinations for core play).
- Held vs tapped behavior must be deliberate and documented here when it differs: pointer control only updates the paddle target while the pointer is down (drag), matching how a real air hockey mallet is held; keyboard movement is a fixed-speed step per frame while a direction key is held.
- Remapping, if offered, is a later-milestone feature; a stable default map comes first (not offered this pass).

## Notes

- Input model (polled / event-driven / hybrid): hybrid. Pointer position is captured via `pointermove`/`pointerdown` events into a `lastPointer` value; keyboard state is polled every frame via `Phaser.Input.Keyboard.Key.isDown`. Both feed the same per-frame paddle-target logic in `GameScene.updatePlayerPaddle`.
- Pressing a direction key takes over from the pointer and clears its old target. Releasing the key leaves the paddle in place; a new click or drag restores pointer control.
- Dead zones, buffering, or coyote-time decisions: none. The player paddle is hard-clamped to its half of the table (`x > centerX + radius`) and to the table's vertical bounds every frame; there is no buffering on the restart key (`Phaser.Input.Keyboard.JustDown` triggers once per press).
