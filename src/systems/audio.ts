// Procedural WebAudio SFX. No audio files are shipped; every sound is a
// synthesized tone so the game has zero external asset dependencies.
import Phaser from "phaser";

type ToneType = OscillatorType;

const MUTE_KEY = "rokumon-air-hockey:muted";

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false; // Storage blocked (private mode, sandboxed iframe): default to sound on.
  }
}

class SfxSystem {
  private ctx: AudioContext | null = null;
  private mutedFlag = readMuted();

  get muted(): boolean {
    return this.mutedFlag;
  }

  /** Flip mute, remember it for the next visit, and return the new state. */
  toggleMute(): boolean {
    this.mutedFlag = !this.mutedFlag;
    try {
      window.localStorage.setItem(MUTE_KEY, this.mutedFlag ? "1" : "0");
    } catch {
      /* Not persisted when storage is blocked; the toggle still works this session. */
    }
    return this.mutedFlag;
  }

  /** Must be called from a user-gesture handler (click/tap/keydown). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
  }

  private tone(freq: number, durationMs: number, type: ToneType, gain: number): void {
    if (!this.ctx || this.mutedFlag) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.connect(amp).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  }

  wallHit(): void {
    this.tone(320, 60, "triangle", 0.12);
  }

  paddleHit(speed: number): void {
    const freq = Phaser.Math.Clamp(260 + speed * 0.35, 260, 620);
    this.tone(freq, 90, "square", 0.16);
  }

  goal(): void {
    if (!this.ctx) return;
    this.tone(180, 160, "sawtooth", 0.2);
    setTimeout(() => this.tone(120, 260, "sawtooth", 0.2), 90);
  }

  serve(): void {
    this.tone(440, 90, "sine", 0.12);
  }

  matchEnd(win: boolean): void {
    if (win) {
      [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 220, "sine", 0.18), i * 130));
    } else {
      [392, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, 260, "sine", 0.16), i * 150));
    }
  }
}

export const sfx = new SfxSystem();
