# Playtest feedback, 14 November 2026

Alexei found the physics convincing, but asked for an easier AI, difficulty settings, menu improvements, clacking sounds, music and PvP. He clarified that online matches are preferred over sharing one device.

Implemented Easy/Normal/Hard profiles, default Easy in the menu, saved preferences, explicit Solo/Online actions and menu return. Original Hard simulation traces and puck physics are preserved. Replaced impact beeps with original speed-sensitive plastic/rail synthesis and added a separately switchable original instrumental loop. Audio stops immediately on master mute and suspends in hidden tabs.

Private rooms now use a Node WebSocket service reusing the simulation, with target-only validated input, fixed steps, identical sequenced snapshots, event batching, disconnect cleanup and mutual post-match rematches. The browser has create/join UI and a separate two-human scene. The existing art PR now contains this feedback pass; no public release was performed.

Verification includes difficulty behaviour/golden trace, audio lifecycle and real Chrome waveform tests, the original physics/control/SDK suite, desktop/touch menu tests, two-browser real-input/private-room proof and real-socket seven-goal completion/rematch/cleanup. Independent review caught online render-depth and landscape lobby overflow defects; both were fixed and visually checked. The wall-sound cooldown now resets between solo matches.

Public hosting and real internet latency/loss, human balance, physical speakers and physical-device play remain separate evidence gaps. See [feedback review](../docs/PLAYTEST_FEEDBACK_20261114.md), [server operations](../docs/PRIVATE_MATCH_SERVER.md) and [audio provenance](../docs/AUDIO_2026-11-14.md).
