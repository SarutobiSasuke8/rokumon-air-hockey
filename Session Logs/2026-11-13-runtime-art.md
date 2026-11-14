# Runtime art pass, 13 November 2026

## Summary and trigger

Alexei asked for new in-game art and an Air Hockey art sweep. Four new generated raster masters now support the table, mallets and puck; the menu, result screen and HUD share that treatment. This is a source review candidate, not a public release.

## Starting state and decisions

Work began from origin/main at 2f5f344 in the linked runtime-art-20261113 worktree. The primary checkout and unrelated CrazyGames PR were preserved. The game already had working mouse/touch play and match tests. Those mechanics and collision dimensions remain unchanged.

The table and cyan mallet were rendered and inspected before producing the related coral mallet and ivory puck. Full PNG masters, exact prompts and export hashes remain in assets/source and the asset manifest. Only 177,650 bytes of WebP art ship. Per-texture procedural fallbacks remain available.

## Files and verification

Boot preloads art; src/art/table.ts draws the frame and native markings; gameplay sets the original sprite display sizes explicitly; Menu, GameOver and UI use the shared treatment. The hub smoke test waits for Menu after texture loading and checks all four nested art requests.

- npm run verify passed: 12 input/restart checks, SDK checks, 57 physics/rules/AI checks, 12 seeded headless matches, TypeScript and Vite build.
- Final npm run build and npm run test:browser passed. Nested hub checks passed with and without SDK. Complete browser matches: desktop 6-7 (4,525 turns), phone landscape 7-5 (6,993 turns), phone portrait 7-1 (5,973 turns). Results, restart, SDK goal totals and real-time control all passed. Desktop uses mouse and phone profiles use emulated touch through real pointer events; match simulation uses the existing deterministic tick harness.
- Loaded and deliberately missing assets retain 30px puck / 58px mallet display sizes and centred anchors. Three final viewport captures have no page exceptions.
- A separate read-only reviewer found no actionable issue with rendering, source boundaries or geometry.

## Open threads and lessons

Human creative review and physical-device play remain pending. The existing rotate-phone prompt is retained for portrait. No release or deployment is claimed. Canvas creation precedes asynchronous texture preload, so boot tests must wait for the interactive scene rather than canvas alone.

## References

- [Art, source and before/after evidence](../docs/ART_PASS_20261113.md)
- [Asset manifest](../assets/asset-manifest.json)
- Local review: http://127.0.0.1:5189/
