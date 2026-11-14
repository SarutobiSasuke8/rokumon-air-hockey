# Air Hockey playtest response, 14 November 2026

Alexei liked the physical feel, found the opponent too difficult, and requested online PvP, a better menu, realistic clacks and music. This pass preserves the original puck, wall, goal and mallet physics.

## Player changes

- Easy is the new solo default. Normal adds pace. Hard preserves the previous opponent exactly, including its seeded random trace. Profiles change reaction delay, movement cap and aim/defensive error rather than puck behaviour.
- The menu has explicit Solo and Online buttons, saved difficulty, clear instructions, master sound and separate music controls. Decorative clicks no longer start a match. Results and the solo HUD let players return to the menu.
- Private rooms pair two browser clients. The host controls cyan/right; the guest controls coral/left. A Node WebSocket service owns both mallets' movement limits, puck physics, goals and match end. Clients send target coordinates only. Identical numbered snapshots are broadcast at 30 Hz, with accumulated events. Both players must request a rematch after completion. Leaving closes the room.
- Original synthesised plastic-impact transients replace the old electronic hit tones. Rail and mallet sounds differ and respond to impact speed. An original instrumental loop sits underneath; it has a separate saved switch. Master mute immediately stops all voices. Hidden tabs suspend audio until a new gesture.

## Evidence and limits

- [Menu and phone captures](evidence/menu-20261114/): pointer/keyboard choices, persistence, blocked-storage fallback, audio controls and explicit scene transitions. Landscape lobby scrolls to its code/status and Back button.
- [Two-browser captures](evidence/online-20261114/): host/guest controls, shared authoritative state and opponent departure. Sprites and result overlays have explicit depths above the rink art.
- [Audio provenance and checks](AUDIO_2026-11-14.md); [12-second audition](evidence/audio-20261114/arcade-clacks-and-music.wav). The audition is a controlled render, not a gameplay recording. It peaks at 0.3365 with no clipping. Physical-speaker listening is not claimed.
- Difficulty checks retain a golden trace of the old Hard opponent and verify actual reaction delays, speed caps and seeded error. The existing physics suite remains unchanged.
- The WebSocket tests use real clients to exercise input validation, shared state, a seven-goal finish, event batching, mutual rematch and cleanup. Browser tests use real mouse input in separate sessions.

This is a local review build. Public match-service hosting, real internet latency/loss testing, physical-device feel and human audio/balance review remain outstanding. Online rendering interpolates server snapshots; it does not claim latency-free local prediction. The public Rokumon bundle is unchanged.

## Comparable games

Digital air hockey is an established category. [Glow Hockey](https://play.google.com/store/apps/details?id=com.natenai.glowhockey) advertises four difficulty levels; [Air Hockey on Steam](https://store.steampowered.com/app/750330/Air_Hockey/) advertises online PvP. These are feature comparisons checked on 14 November 2026, not evidence of their player counts or commercial performance. This game's product focus is readable physical table play, approachable solo practice and simple private matches.
