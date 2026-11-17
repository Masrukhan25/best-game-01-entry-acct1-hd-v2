// audio.js — synthesized sound effects and a music loop for VOIDLIGHT v2.
// Everything is generated with the Web Audio API: no audio files, no network.
// The engine starts lazily on the first user gesture (browsers block audio
// before that) and keeps a tiny step sequencer running for the music.

/** Note frequencies used by the music sequencer (A minor-ish neon palette). */
const BASS_NOTES = [55.0, 55.0, 65.41, 49.0, 55.0, 82.41, 73.42, 65.41];
const LEAD_NOTES = [440.0, 523.25, 659.25, 880.0, 659.25, 523.25, 440.0, 329.63];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.musicOn = false;
    this.step = 0;
    this.nextStepTime = 0;
    this.timer = null;
  }

  /** Create the context (call from a user gesture). Safe to call repeatedly. */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.16;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  /** A short oscillator blip with an exponential decay. */
  blip(freq, dur, type = 'square', vol = 0.2, slideTo = null, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  /** A filtered noise burst (explosions, hits). */
  noise(dur, vol = 0.3, freq = 1200, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
  }

  /** Named game sound effects. */
  sfx(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'shoot':
        this.blip(880 + Math.random() * 120, 0.07, 'square', 0.08, 320);
        break;
      case 'enemyShoot':
        this.blip(220, 0.09, 'sawtooth', 0.05, 140);
        break;
      case 'hit':
        this.noise(0.08, 0.18, 2400);
        break;
      case 'explode':
        this.noise(0.35, 0.4, 900);
        this.blip(160, 0.3, 'sawtooth', 0.2, 40);
        break;
      case 'bigExplode':
        this.noise(0.7, 0.5, 700);
        this.blip(120, 0.6, 'sawtooth', 0.3, 30);
        this.blip(60, 0.8, 'sine', 0.35, 24, 0.05);
        break;
      case 'hurt':
        this.blip(140, 0.25, 'sawtooth', 0.3, 60);
        this.noise(0.15, 0.25, 500);
        break;
      case 'powerup':
        this.blip(523.25, 0.1, 'sine', 0.2);
        this.blip(659.25, 0.1, 'sine', 0.2, null, 0.08);
        this.blip(880, 0.16, 'sine', 0.22, null, 0.16);
        break;
      case 'upgrade':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.blip(f, 0.14, 'triangle', 0.2, null, i * 0.07));
        break;
      case 'boss':
        this.blip(55, 0.9, 'sawtooth', 0.3, 110);
        this.noise(0.6, 0.2, 300);
        break;
      case 'waveClear':
        [392, 523.25, 659.25].forEach((f, i) => this.blip(f, 0.12, 'triangle', 0.18, null, i * 0.06));
        break;
      case 'gameOver':
        [392, 311, 233, 155].forEach((f, i) => this.blip(f, 0.3, 'sawtooth', 0.2, null, i * 0.22));
        break;
      case 'victory':
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.blip(f, 0.25, 'triangle', 0.22, null, i * 0.12));
        break;
      case 'click':
        this.blip(1200, 0.05, 'square', 0.1, 900);
        break;
      default:
        break;
    }
  }

  /** Start the 132 BPM music loop (bass + lead arp + hats). */
  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.scheduleMusic(), 90);
  }

  stopMusic() {
    this.musicOn = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  scheduleMusic() {
    if (!this.ctx || !this.musicOn || this.muted) return;
    const stepDur = 60 / 132 / 2; // 8th notes at 132 BPM
    while (this.nextStepTime < this.ctx.currentTime + 0.25) {
      const t = this.nextStepTime - this.ctx.currentTime;
      const s = this.step % 32;
      // Bass on the beat (every 4 steps), root notes cycle.
      if (s % 4 === 0) {
        const f = BASS_NOTES[Math.floor(s / 4) % BASS_NOTES.length];
        this.blipAt(f, 0.32, 'sawtooth', 0.1, t, this.musicGain);
      }
      // Lead arp on off-beats.
      if (s % 2 === 1) {
        const f = LEAD_NOTES[(s * 5 + 3) % LEAD_NOTES.length];
        this.blipAt(f, 0.14, 'triangle', 0.05, t, this.musicGain);
      }
      // Hat tick every step (tiny high blip).
      this.blipAt(5200 + (s % 2) * 800, 0.03, 'square', 0.015, t, this.musicGain);
      this.step++;
      this.nextStepTime += stepDur;
    }
  }

  /** A blip routed to a chosen gain node (music bus). */
  blipAt(freq, dur, type, vol, when, dest) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + Math.max(0, when);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(dest || this.sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
}
