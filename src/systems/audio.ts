// Original procedural audio, not recordings. Plastic impacts use a broadband
// contact transient and damped shell resonances. Music uses one loop buffer,
// so scene changes cannot accumulate scheduling timers.
const MUTE_KEY = "rokumon-air-hockey:muted";
const MUSIC_KEY = "rokumon-air-hockey:music";
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
function readFlag(key: string, fallback: boolean): boolean {
  try { const v = window.localStorage.getItem(key); return v === null ? fallback : v === "1"; }
  catch { return fallback; }
}
export class SfxSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private mutedFlag = readFlag(MUTE_KEY, false);
  private musicFlag = readFlag(MUSIC_KEY, true);
  private gestureReady = false;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicBuffer: AudioBuffer | null = null;
  private impacts: AudioBuffer[] = [];
  private voices = new Set<AudioScheduledSourceNode>();
  constructor() {
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.suspend();
    });
    if (typeof window !== "undefined") window.addEventListener("pagehide", () => this.suspend());
  }
  get muted(): boolean { return this.mutedFlag; }
  get musicEnabled(): boolean { return this.musicFlag; }
  private persist(key: string, value: boolean): void {
    try { window.localStorage.setItem(key, value ? "1" : "0"); } catch { /* Session-only if blocked. */ }
  }
  toggleMute(): boolean {
    this.mutedFlag = !this.mutedFlag;
    this.persist(MUTE_KEY, this.mutedFlag);
    if (this.master && this.ctx) this.master.gain.setValueAtTime(this.mutedFlag ? 0 : 0.8, this.ctx.currentTime);
    if (this.mutedFlag) this.stopVoices();
    else this.unlock();
    return this.mutedFlag;
  }
  toggleMusic(): boolean {
    this.musicFlag = !this.musicFlag;
    this.persist(MUSIC_KEY, this.musicFlag);
    if (!this.musicFlag) this.stopMusic();
    else this.unlock();
    return this.musicFlag;
  }
  /** Call from click/tap/keydown only. Returning to a tab alone stays silent. */
  unlock(): void {
    if (typeof document !== "undefined" && document.hidden) return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.mutedFlag ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
      this.impacts = Array.from({ length: 6 }, (_, i) => this.makeImpact(i));
    }
    this.gestureReady = true;
    if (this.ctx.state === "suspended") {
      void this.ctx.resume().then(() => this.startMusic()).catch(() => { this.gestureReady = false; });
    } else this.startMusic();
  }
  private suspend(): void {
    this.gestureReady = false;
    this.stopVoices();
    if (this.ctx?.state === "running") void this.ctx.suspend().catch(() => {});
  }
  private audible(): boolean {
    return !!this.ctx && !!this.master && !this.mutedFlag && this.gestureReady
      && this.ctx.state === "running" && !(typeof document !== "undefined" && document.hidden);
  }
  private track(source: AudioScheduledSourceNode, nodes: AudioNode[] = []): void {
    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      nodes.forEach(node => node.disconnect());
    };
  }
  private stopMusic(): void {
    if (!this.musicSource) return;
    const source = this.musicSource;
    this.musicSource = null;
    this.voices.delete(source);
    source.stop();
  }
  private stopVoices(): void {
    this.musicSource = null;
    for (const source of this.voices) source.stop();
    this.voices.clear();
  }
  private makeImpact(variant: number): AudioBuffer {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.075), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const rail = variant >= 3;
    const resonance = (rail ? 2300 : 1450) * (1 + (variant % 3 - 1) * 0.06);
    let previousNoise = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate;
      const noise = Math.random() * 2 - 1;
      const snap = (noise - previousNoise * 0.7) * Math.exp(-t * (rail ? 850 : 620));
      previousNoise = noise;
      const shell = Math.sin(2 * Math.PI * resonance * t) * Math.exp(-t * 145)
        + 0.42 * Math.sin(2 * Math.PI * resonance * 2.37 * t) * Math.exp(-t * 270);
      data[i] = (snap * 0.58 + shell * 0.32) * Math.min(1, t * 12000);
    }
    // Reserve headroom even for coincident random transient peaks.
    let peak = 0;
    for (const sample of data) peak = Math.max(peak, Math.abs(sample));
    if (peak > 0.9) for (let i = 0; i < data.length; i++) data[i] *= 0.9 / peak;
    return buffer;
  }
  private impact(speed: number, rail: boolean): void {
    if (!this.audible() || this.voices.size > 24) return;
    const ctx = this.ctx!;
    const strength = clamp(Math.abs(speed) / 1100, 0, 1);
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = this.impacts[(rail ? 3 : 0) + Math.floor(Math.random() * 3)];
    source.playbackRate.value = 0.94 + Math.random() * 0.12;
    gain.gain.value = (rail ? 0.10 : 0.17) + Math.pow(strength, 0.65) * (rail ? 0.20 : 0.37);
    source.connect(gain).connect(this.master!);
    this.track(source, [gain]);
    source.start();
  }
  wallHit(speed = 450): void { this.impact(speed, true); }
  paddleHit(speed: number): void { this.impact(speed, false); }
  private tone(freq: number, duration: number, gain: number, delay = 0): void {
    if (!this.audible()) return;
    const ctx = this.ctx!;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0, start);
    amp.gain.linearRampToValueAtTime(gain, start + 0.005);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp).connect(this.master!);
    this.track(osc, [amp]);
    osc.start(start);
    osc.stop(start + duration + 0.01);
  }
  goal(): void { [392, 523, 659].forEach((f, i) => this.tone(f, 0.22, 0.13, i * 0.075)); }
  serve(): void { this.tone(660, 0.08, 0.07); }
  matchEnd(win: boolean): void {
    (win ? [523, 659, 784, 1046] : [392, 330, 262]).forEach((f, i) => this.tone(f, 0.28, 0.13, i * 0.13));
  }
  private startMusic(): void {
    if (!this.audible() || !this.musicFlag || this.musicSource) return;
    this.musicBuffer ??= this.composeMusic();
    const source = this.ctx!.createBufferSource();
    const gain = this.ctx!.createGain();
    source.buffer = this.musicBuffer;
    source.loop = true;
    gain.gain.value = 0.21;
    source.connect(gain).connect(this.master!);
    this.track(source, [gain]);
    this.musicSource = source;
    source.start();
  }
  /** Four-bar, 100 BPM original instrumental: soft plucks, bass and brushed pulse. */
  private composeMusic(): AudioBuffer {
    const ctx = this.ctx!;
    const step = 60 / 100 / 4;
    const length = Math.round(ctx.sampleRate * step * 64);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = buffer.getChannelData(0), right = buffer.getChannelData(1);
    const note = (midi: number, at: number, duration: number, volume: number, pan: number, bass = false) => {
      const freq = 440 * 2 ** ((midi - 69) / 12);
      for (let i = 0; i < duration * ctx.sampleRate; i++) {
        const t = i / ctx.sampleRate;
        const env = Math.min(1, t / 0.008) * Math.exp(-t * (bass ? 5 : 7)) * Math.max(0, 1 - t / duration);
        const value = (Math.sin(2 * Math.PI * freq * t) + 0.19 * Math.sin(4 * Math.PI * freq * t)) * env * volume;
        const index = (Math.round(at * ctx.sampleRate) + i) % length;
        left[index] += value * (1 - pan * 0.35);
        right[index] += value * (1 + pan * 0.35);
      }
    };
    const chords = [[60, 63, 67, 70], [56, 60, 63, 67], [63, 67, 70, 74], [58, 62, 65, 69]];
    const pattern = [0, 2, 1, 3, 2, 1];
    for (let bar = 0; bar < 4; bar++) {
      const chord = chords[bar];
      [0, 3, 6, 8, 11, 14].forEach((s, i) => note(chord[pattern[i]] + 12, (bar * 16 + s) * step, 0.65, 0.19, i % 2 ? 0.5 : -0.5));
      [0, 6, 8, 14].forEach(s => note(chord[0] - 24, (bar * 16 + s) * step, 0.42, 0.25, 0, true));
      for (let s = 0; s < 16; s += 2) {
        const at = Math.round((bar * 16 + s) * step * ctx.sampleRate);
        for (let i = 0; i < ctx.sampleRate * 0.12; i++) {
          const t = i / ctx.sampleRate;
          const hat = (Math.random() * 2 - 1) * Math.exp(-t * 140) * (s % 4 ? 0.035 : 0.018);
          const kick = s % 8 === 0 ? Math.sin(2 * Math.PI * (48 * t + 0.9 * (1 - Math.exp(-t * 25)))) * Math.exp(-t * 35) * 0.18 : 0;
          left[(at + i) % length] += hat + kick;
          right[(at + i) % length] += hat + kick;
        }
      }
    }
    return buffer;
  }
}
export const sfx = new SfxSystem();
