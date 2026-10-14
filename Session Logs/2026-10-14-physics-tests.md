# Physics checks, 2026-10-14

Tests exercise shipped scene methods without a renderer; scoring, bounds and speed caps verified. Existing nested browser smoke passed. No gameplay changes or tuning. Stacked on API PR #4.

## 14 October 2026 morning: reconcile merged API dependency

Merged origin/main db9b621 into the original physics-test branch after API PR #4 was squash-merged and PR #5 retargeted to main. Resolved README and package.json by retaining the added physics test command and documentation alongside main's SDK checks. npm run verify passed mixed-input, optional SDK, first-to-7 and duplicate-goal checks, 16 paddle-bound cases and 3 collision caps, plus typecheck/build. Nested keyboard boot passed with and without SDK; fresh screenshot inspected and kept locally in C:/tmp/asv-20261014-restack-evidence/air-hockey. Original committed captures remain unchanged. No gameplay retuning, history rewrite, merge to main or deployment.
