---
type: session-log-index
status: active
mutability: living
---

# Session Logs

Use this folder for durable records of meaningful AI coding sessions.

## Logging Rule

Create or append a session log when a session includes one or more of:

- Architectural or product decisions.
- Multiple files touched.
- Debugging with important findings.
- A handoff another agent or future session will need.
- User feedback that changes project direction.
- Any work that should not be reconstructed from chat history.

Small one-line fixes do not need a session log unless the user asks.

## Logs

- [Controls Repair](2026-10-02-session-log-controls-repair.md)
- [Rokumon Air Hockey first build](2026-09-06-session-log-rokumon-air-hockey-first-build.md)

## Current Themes

- The template's `init-browser-game.ps1` script alone only installs the runnable profile; the full agent contract (`AGENTS.md`, `docs/`, `Templates/`, `personas/`, `Session Logs/`, `scripts/`) has to be present from creating the repo off the template itself.
- Procedural-only art/audio keeps `Templates/ASSET_MANIFEST.json` intentionally empty.
- Phaser 4.2.1's bundled type declarations need `skipLibCheck: true` under `strict` TypeScript.
