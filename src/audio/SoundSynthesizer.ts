// Exact procedural sound and music synthesizer from kanto-cup.html

export interface AudioSettingsState {
  m: number;
  s: number;
  p: number;
  on: boolean;
}

const MJ = [0, 2, 4, 5, 7, 9, 11];
const MI = [0, 2, 3, 5, 7, 8, 10];

const MUS: Record<string, { b: number; r: number; s: number[]; p: number[]; c: number[]; w: OscillatorType; d: number }> = {
  menu: { b: 84, r: 57, s: MJ, p: [0, 2, 4, 2, 5, 4, 2, -1, 1, 3, 5, 3, 6, 5, 3, -1], c: [0, 3, 4, 3], w: 'triangle', d: 0 },
  select: { b: 124, r: 60, s: MJ, p: [0, -1, 2, 4, 5, -1, 4, 2, 0, -1, 2, 4, 7, -1, 4, 2], c: [0, 4, 5, 3], w: 'square', d: 1 },
  battle: { b: 148, r: 57, s: MI, p: [0, 0, 2, 0, 3, 0, 2, -1, 4, 4, 3, 2, 0, 2, 3, -1], c: [0, 5, 3, 4], w: 'sawtooth', d: 1 },
  intense: { b: 160, r: 55, s: MI, p: [0, 2, 0, 3, 0, 4, 0, 3, 5, 4, 3, 2, 3, 2, 0, -1], c: [0, 5, 6, 4], w: 'sawtooth', d: 2 },
  semi: { b: 170, r: 55, s: MI, p: [0, 3, 4, 3, 7, 4, 3, 0, 5, 4, 3, 2, 4, 3, 2, 0], c: [0, 6, 5, 4], w: 'sawtooth', d: 2 },
  final: { b: 178, r: 52, s: MI, p: [0, 4, 7, 4, 9, 7, 4, 0, 5, 9, 7, 5, 4, 7, 9, 11], c: [0, 5, 6, 4], w: 'sawtooth', d: 2 },
  victory: { b: 140, r: 60, s: MJ, p: [0, 2, 4, 7, 4, 2, 0, -1, 2, 4, 5, 7, 9, 7, 5, -1], c: [0, 3, 4, 0], w: 'square', d: 1 },
  eliteFour: { b: 184, r: 50, s: MI, p: [0, 3, 5, 6, 7, 6, 5, 3, 0, 5, 7, 8, 10, 8, 7, 5], c: [0, 6, 7, 5], w: 'sawtooth', d: 2 },
  championCeremony: { b: 132, r: 62, s: MJ, p: [0, 4, 7, 12, 11, 9, 7, 4, 5, 7, 9, 12, 14, 12, 9, 7], c: [0, 3, 4, 0], w: 'triangle', d: 1 },
};

const hz = (n: number) => 440 * 2 ** ((n - 69) / 12);
const nt = (m: number, sc: number[], d: number) => m + 12 * Math.floor(d / 7) + sc[((d % 7) + 7) % 7];

export const SV: Record<string, { n: [number, number, BiquadFilterType]; w: OscillatorType; b: number }> = {
  Fi: { n: [1800, 300, 'bandpass'], w: 'sawtooth', b: 90 },
  Wa: { n: [4000, 800, 'highpass'], w: 'sine', b: 300 },
  El: { n: [6000, 2000, 'highpass'], w: 'square', b: 200 },
  Gr: { n: [3000, 1500, 'bandpass'], w: 'triangle', b: 400 },
  Ic: { n: [7000, 3000, 'highpass'], w: 'sine', b: 1200 },
  Fg: { n: [900, 150, 'lowpass'], w: 'square', b: 70 },
  Po: { n: [1500, 500, 'bandpass'], w: 'square', b: 250 },
  Gd: { n: [500, 80, 'lowpass'], w: 'sawtooth', b: 50 },
  Fl: { n: [3500, 700, 'bandpass'], w: 'sine', b: 500 },
  Ps: { n: [2000, 600, 'bandpass'], w: 'sine', b: 350 },
  Bu: { n: [2500, 1200, 'bandpass'], w: 'sawtooth', b: 600 },
  Ro: { n: [700, 120, 'lowpass'], w: 'square', b: 60 },
  Gh: { n: [900, 200, 'lowpass'], w: 'triangle', b: 110 },
  Dr: { n: [1200, 200, 'bandpass'], w: 'sawtooth', b: 80 },
  No: { n: [1500, 300, 'lowpass'], w: 'square', b: 100 },
};

export class AudioEngine {
  private ac: AudioContext | null = null;
  private mg: GainNode | null = null;
  private nb: AudioBuffer | null = null;
  private sg: GainNode | null = null;
  private pg: GainNode | null = null;
  private mu: GainNode | null = null;
  private cur: string | null = null;
  private tmr: number | null = null;
  private mn: GainNode | null = null;
  private mstep = 0;
  private mt = 0;
  private want: string | null = null;

  public SND: { on: boolean; v: number } = { on: true, v: 0.7 };
  public AU: AudioSettingsState = { m: 0.6, s: 0.8, p: 0.6, on: true };

  constructor() {
    try {
      const s = localStorage.getItem('kantoSnd');
      if (s) Object.assign(this.SND, JSON.parse(s));
    } catch {}
    try {
      const a = localStorage.getItem('kcAudio');
      if (a) Object.assign(this.AU, JSON.parse(a));
    } catch {}
  }

  public AC(): AudioContext {
    if (!this.ac) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ac = new AudioCtx();
      this.mg = this.ac.createGain();
      this.mg.connect(this.ac.destination);
      const b = this.ac.createBuffer(1, this.ac.sampleRate, this.ac.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.nb = b;
    }
    if (this.mg) this.mg.gain.value = this.SND.on ? this.SND.v : 0;
    if (this.ac.state === 'suspended') this.ac.resume();
    return this.ac;
  }

  public ctxA(): AudioContext {
    const a = this.AC();
    if (!this.sg) {
      this.sg = a.createGain();
      this.pg = a.createGain();
      this.mu = a.createGain();
      [this.sg, this.pg, this.mu].forEach(g => g.connect(this.mg!));
      this.applyVol();
    }
    return a;
  }

  public applyVol(): void {
    if (this.sg) {
      this.sg.gain.value = this.AU.s;
      this.pg!.gain.value = this.AU.p;
      this.mu!.gain.value = this.AU.m * 0.5;
    }
    try {
      localStorage.setItem('kcAudio', JSON.stringify(this.AU));
    } catch {}
  }

  public swp(f0: number, f1: number, d: number, ty: OscillatorType, v: number, t0: number = 0, dest?: GainNode): void {
    try {
      const a = this.ctxA();
      const t = a.currentTime + t0;
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = ty;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(dest || this.sg!);
      o.start(t);
      o.stop(t + d + 0.02);
    } catch {}
  }

  public beep(f: number, d: number = 0.1, ty: OscillatorType = 'square', v: number = 0.05, t0: number = 0, dest?: GainNode): void {
    this.swp(f, f * 0.999, d, ty, v, t0, dest);
  }

  public nzs(
    d: number,
    f0: number,
    f1: number,
    v: number,
    t0: number = 0,
    q: number = 1,
    ty: BiquadFilterType = 'bandpass',
    dest?: GainNode
  ): void {
    try {
      const a = this.ctxA();
      const t = a.currentTime + t0;
      const n = a.createBufferSource();
      const b = a.createBuffer(1, Math.max(1, (a.sampleRate * d) | 0), a.sampleRate);
      const x = b.getChannelData(0);
      for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1;
      n.buffer = b;
      const f = a.createBiquadFilter();
      const g = a.createGain();
      f.type = ty;
      f.Q.value = q;
      f.frequency.setValueAtTime(f0, t);
      f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + Math.min(0.04, d / 4));
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      n.connect(f).connect(g).connect(dest || this.sg!);
      n.start(t);
    } catch {}
  }

  public sfxA(st: string, mv: any, kind: string, i: number, k: number, crit?: boolean): void {
    const v = SV[mv.t] || SV.No;
    const ls = kind === 'stream' || kind === 'beam';
    const R = Math.random;

    if (st === 'c') {
      if (mv.t === 'El') {
        for (let j = 0; j < 7; j++) this.swp(500 + R() * 1500, 150, 0.07, 'square', 0.05, j * 0.06);
      } else if ('PsGhDr'.includes(mv.t)) {
        this.swp(v.b * 2 * k, v.b * 5 * k, 0.55, v.w, 0.1);
      } else {
        this.nzs(0.5, v.n[1] * k, v.n[0] * 0.5 * k, 0.1 + 0.1 * i, 0, 2, v.n[2]);
      }
    } else if (st === 'l') {
      this.nzs(ls ? 0.9 : kind === 'blast' ? 0.45 : 0.3, v.n[0] * k, v.n[1] * k, 0.14 + 0.08 * i, 0, 1.5, v.n[2]);
      if (mv.t === 'El') {
        for (let j = 0; j < 4; j++) this.swp(2000 * k, 300, 0.06, 'square', 0.07, j * 0.09);
      }
      if (kind === 'leaf') {
        for (let j = 0; j < 5; j++) this.nzs(0.08, 4000, 2000, 0.1, j * 0.07, 3);
      }
    } else {
      this.swp(v.b * (1.5 + i) * k, v.b * 0.3, 0.25 + 0.2 * i, v.w, 0.18 + 0.12 * i);
      this.nzs(0.2 + 0.25 * i, v.n[0] * k, v.n[1] * 0.5, 0.18 + 0.1 * i, 0, 1, v.n[2]);
      if (mv.t === 'Wa' || mv.t === 'Ic') this.nzs(0.25, 6000, 1500, 0.12, 0.04, 1, 'highpass');
      if (crit) this.swp(900, 300, 0.3, 'square', 0.1);
    }
  }

  public cry(speciesId: number, k: string): void {
    try {
      const b = 260 + (speciesId * 53) % 380;
      if (k === 'atk') {
        this.swp(b, b * 1.6, 0.18, 'triangle', 0.5, 0, this.pg!);
        this.swp(b * 1.5, b * 1.1, 0.15, 'square', 0.12, 0.1, this.pg!);
      } else if (k === 'hit') {
        this.swp(b * 1.4, b * 0.7, 0.22, 'sawtooth', 0.25, 0, this.pg!);
      } else if (k === 'faint') {
        this.swp(b, b * 0.35, 0.9, 'triangle', 0.5, 0, this.pg!);
      } else if (k === 'in') {
        this.swp(b * 0.8, b * 1.4, 0.25, 'triangle', 0.4, 0, this.pg!);
      } else if (k === 'win') {
        [0, 0.14, 0.28].forEach((d, j) => this.swp(b * (1 + j * 0.25), b * (1.2 + j * 0.25), 0.14, 'triangle', 0.4, d, this.pg!));
      }
    } catch {}
  }

  private sched(n: string, dest: GainNode): void {
    if (!this.ac) return;
    const a = this.ac;
    const M2 = MUS[n];
    if (!M2) return;
    const q = 60 / M2.b / 2;
    while (this.mt < a.currentTime + 0.5) {
      const b = this.mstep % 16;
      const bar = (this.mstep >> 4) % 4;
      const d = M2.p[b];
      const t = this.mt - a.currentTime;

      if (d >= 0) this.beep(hz(nt(M2.r + 12, M2.s, d + M2.c[bar])), q * 0.9, M2.w, 0.1, t, dest);
      if (b % 4 === 0) this.beep(hz(nt(M2.r - 12, M2.s, M2.c[bar])), q * 3.5, 'triangle', 0.16, t, dest);
      if (M2.d) {
        if (b % 4 === 0) this.swp(140, 40, 0.12, 'sine', 0.25, t, dest);
        if (b % 2 === 1) this.nzs(0.04, 8000, 6000, 0.05, t, 1, 'highpass', dest);
        if (M2.d > 1 && b % 8 === 4) this.nzs(0.12, 3000, 1500, 0.1, t, 1, 'bandpass', dest);
      }
      this.mstep++;
      this.mt += q;
    }
  }

  public music(n: string): void {
    this.want = n;
    if (!this.ac || this.ac.state !== 'running' || this.cur === n) return;
    this.cur = n;
    const a = this.ac;
    if (this.mn) {
      const o = this.mn;
      o.gain.setTargetAtTime(0, a.currentTime, 0.35);
      setTimeout(() => o.disconnect(), 2500);
    }
    const g = a.createGain();
    g.gain.value = 0;
    g.connect(this.mu!);
    g.gain.setTargetAtTime(1, a.currentTime + 0.2, 0.4);
    this.mn = g;
    this.mstep = 0;
    this.mt = a.currentTime + 0.25;
    if (this.tmr) clearInterval(this.tmr);
    this.tmr = window.setInterval(() => this.sched(n, g), 150);
  }

  public unlock(): void {
    this.ctxA();
    setTimeout(() => {
      if (this.want) this.music(this.want);
    }, 60);
  }
}

export const sound = new AudioEngine();
