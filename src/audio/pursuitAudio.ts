import { soundManager } from './soundManager';

/**
 * Helper to create a stereo panner with graceful fallback
 */
function createPanner(ctx: AudioContext, pan: number): AudioNode {
  if (ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime);
    return panner;
  }
  return ctx.createGain();
}

/**
 * Controller for atmospheric multi-car police pursuit audio.
 * Real-time randomized, desynchronized multi-cruiser sirens + news chopper + tactical air horn.
 */
class PursuitAudioController {
  private isPlaying: boolean = false;
  private busGain: GainNode | null = null;

  // Chopper nodes
  private chopperGain: GainNode | null = null;
  private chopperLfo: OscillatorNode | null = null;
  private chopperOsc: OscillatorNode | null = null;
  private chopperFilter: BiquadFilterNode | null = null;

  // Cruiser 1: Primary Pursuit (Classic Wail Siren)
  private c1Osc: OscillatorNode | null = null;
  private c1Lfo: OscillatorNode | null = null;
  private c1LfoGain: GainNode | null = null;
  private c1Filter: BiquadFilterNode | null = null;
  private c1Gain: GainNode | null = null;

  // Cruiser 2: Pursuit Flanker (Aggressive Rapid Yelp Siren)
  private c2Osc: OscillatorNode | null = null;
  private c2Lfo: OscillatorNode | null = null;
  private c2LfoGain: GainNode | null = null;
  private c2Filter: BiquadFilterNode | null = null;
  private c2Gain: GainNode | null = null;

  // Cruiser 3: Tactical Reinforcement (Piercer / Hi-Lo Siren)
  private c3Osc: OscillatorNode | null = null;
  private c3Lfo: OscillatorNode | null = null;
  private c3LfoGain: GainNode | null = null;
  private c3Filter: BiquadFilterNode | null = null;
  private c3Gain: GainNode | null = null;

  // Randomization & event state
  private lastRandomizeTime: number = 0;
  private nextRandomizeInterval: number = 2800; // ms
  private lastHornTime: number = 0;
  private nextHornInterval: number = 9000; // ms
  private lastDriftTriggered: boolean = false;
  private lastFlameTriggered: boolean = false;
  private unsubscribeMute: (() => void) | null = null;

  public start(): void {
    if (this.isPlaying) return;
    const ctx = soundManager.getAudioContext();
    if (!ctx) return;

    this.isPlaying = true;
    const t = ctx.currentTime;
    const masterGain = soundManager.getMasterGain();

    try {
      // 1. Master Pursuit Bus Gain connected to soundManager's limiter & clarity chain
      this.busGain = ctx.createGain();
      const initialVol = soundManager.getIsMuted() ? 0 : 1.0;
      this.busGain.gain.setValueAtTime(0.0001, t);
      this.busGain.gain.exponentialRampToValueAtTime(Math.max(initialVol, 0.0001), t + 0.25);

      if (masterGain) {
        this.busGain.connect(masterGain);
      } else {
        this.busGain.connect(ctx.destination);
      }

      // Automatically mute/unmute pursuit audio with soundManager
      this.unsubscribeMute = soundManager.subscribe((muted, vol) => {
        if (!this.busGain || !ctx) return;
        const now = ctx.currentTime;
        if (muted || vol === 0) {
          this.busGain.gain.setValueAtTime(0, now);
        } else {
          this.busGain.gain.setValueAtTime(0.0001, now);
          this.busGain.gain.exponentialRampToValueAtTime(1.0, now + 0.15);
        }
      });

      // ── 2. SKY-WEAZEL NEWS CHOPPER ROTOR WASH ─────────────────────────────
      // Sub-bass 44 Hz carrier modulated by 16 Hz sine LFO, filtered at 115 Hz
      this.chopperOsc = ctx.createOscillator();
      this.chopperOsc.type = 'triangle';
      this.chopperOsc.frequency.setValueAtTime(44, t);

      this.chopperFilter = ctx.createBiquadFilter();
      this.chopperFilter.type = 'lowpass';
      this.chopperFilter.frequency.setValueAtTime(115, t);

      this.chopperGain = ctx.createGain();
      this.chopperGain.gain.setValueAtTime(0.055, t); // Solid, audible rotor wash

      this.chopperLfo = ctx.createOscillator();
      this.chopperLfo.type = 'sine';
      this.chopperLfo.frequency.setValueAtTime(16, t);

      const chopperLfoGain = ctx.createGain();
      chopperLfoGain.gain.setValueAtTime(0.035, t);

      this.chopperLfo.connect(chopperLfoGain);
      chopperLfoGain.connect(this.chopperGain.gain);

      this.chopperOsc.connect(this.chopperFilter);
      this.chopperFilter.connect(this.chopperGain);
      this.chopperGain.connect(this.busGain);

      this.chopperOsc.start(t);
      this.chopperLfo.start(t);

      // ── 3. CRUISER 1: LEAD PURSUIT (Classic "Wail" Siren) ────────────────
      // Long wail sweeping between ~560 Hz and 980 Hz (0.43 Hz cycle ~2.3s)
      this.c1Osc = ctx.createOscillator();
      this.c1Osc.type = 'sine';
      this.c1Osc.frequency.setValueAtTime(760, t);

      this.c1Lfo = ctx.createOscillator();
      this.c1Lfo.type = 'sine';
      this.c1Lfo.frequency.setValueAtTime(0.43, t);

      this.c1LfoGain = ctx.createGain();
      this.c1LfoGain.gain.setValueAtTime(210, t);
      this.c1Lfo.connect(this.c1LfoGain);
      this.c1LfoGain.connect(this.c1Osc.frequency);

      this.c1Filter = ctx.createBiquadFilter();
      this.c1Filter.type = 'bandpass';
      this.c1Filter.frequency.setValueAtTime(780, t);
      this.c1Filter.Q.setValueAtTime(2.6, t);

      this.c1Gain = ctx.createGain();
      this.c1Gain.gain.setValueAtTime(0.065, t); // Loud, clear pursuit lead

      const c1Pan = createPanner(ctx, -0.35); // Panned left
      this.c1Osc.connect(this.c1Filter);
      this.c1Filter.connect(this.c1Gain);
      this.c1Gain.connect(c1Pan);
      c1Pan.connect(this.busGain);

      this.c1Osc.start(t);
      this.c1Lfo.start(t);

      // ── 4. CRUISER 2: FLANKER PURSUIT (Aggressive "Yelp" Siren) ──────────
      // Fast rapid oscillation between ~820 Hz and 1340 Hz (2.75 Hz cycle)
      this.c2Osc = ctx.createOscillator();
      this.c2Osc.type = 'triangle';
      this.c2Osc.frequency.setValueAtTime(1080, t);

      this.c2Lfo = ctx.createOscillator();
      this.c2Lfo.type = 'sine';
      this.c2Lfo.frequency.setValueAtTime(2.75, t);

      this.c2LfoGain = ctx.createGain();
      this.c2LfoGain.gain.setValueAtTime(260, t);
      this.c2Lfo.connect(this.c2LfoGain);
      this.c2LfoGain.connect(this.c2Osc.frequency);

      this.c2Filter = ctx.createBiquadFilter();
      this.c2Filter.type = 'bandpass';
      this.c2Filter.frequency.setValueAtTime(1080, t);
      this.c2Filter.Q.setValueAtTime(2.8, t);

      this.c2Gain = ctx.createGain();
      this.c2Gain.gain.setValueAtTime(0.055, t);

      const c2Pan = createPanner(ctx, 0.45); // Panned right
      this.c2Osc.connect(this.c2Filter);
      this.c2Filter.connect(this.c2Gain);
      this.c2Gain.connect(c2Pan);
      c2Pan.connect(this.busGain);

      this.c2Osc.start(t);
      this.c2Lfo.start(t);

      // ── 5. CRUISER 3: TACTICAL UNIT (Piercer / Dual-Tone Siren) ─────────
      // Piercing warble siren at 1.42 Hz cycle (incommensurate prime speed)
      this.c3Osc = ctx.createOscillator();
      this.c3Osc.type = 'sine';
      this.c3Osc.frequency.setValueAtTime(920, t);

      this.c3Lfo = ctx.createOscillator();
      this.c3Lfo.type = 'sine';
      this.c3Lfo.frequency.setValueAtTime(1.42, t);

      this.c3LfoGain = ctx.createGain();
      this.c3LfoGain.gain.setValueAtTime(180, t);
      this.c3Lfo.connect(this.c3LfoGain);
      this.c3LfoGain.connect(this.c3Osc.frequency);

      this.c3Filter = ctx.createBiquadFilter();
      this.c3Filter.type = 'bandpass';
      this.c3Filter.frequency.setValueAtTime(920, t);
      this.c3Filter.Q.setValueAtTime(3.0, t);

      this.c3Gain = ctx.createGain();
      this.c3Gain.gain.setValueAtTime(0.048, t);

      const c3Pan = createPanner(ctx, -0.08); // Near center
      this.c3Osc.connect(this.c3Filter);
      this.c3Filter.connect(this.c3Gain);
      this.c3Gain.connect(c3Pan);
      c3Pan.connect(this.busGain);

      this.c3Osc.start(t);
      this.c3Lfo.start(t);

      this.lastRandomizeTime = performance.now();
      this.lastHornTime = performance.now();
    } catch {
      // Audio playback restrictions fallback
    }
  }

  /**
   * Tactical Police Air Horn Blip (Classic GTA 5 police pursuit horn)
   */
  public playPoliceAirHorn(): void {
    if (!this.isPlaying || !this.busGain) return;
    const ctx = soundManager.getAudioContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const dur = 0.22;

      // Dual detuned square/saw oscillators for brassy pneumatic horn punch
      const horn1 = ctx.createOscillator();
      const horn2 = ctx.createOscillator();
      const hornGain = ctx.createGain();
      const hornFilter = ctx.createBiquadFilter();

      horn1.type = 'sawtooth';
      horn1.frequency.setValueAtTime(375, t);
      horn1.frequency.exponentialRampToValueAtTime(360, t + dur);

      horn2.type = 'sawtooth';
      horn2.frequency.setValueAtTime(460, t);
      horn2.frequency.exponentialRampToValueAtTime(445, t + dur);

      hornFilter.type = 'lowpass';
      hornFilter.frequency.setValueAtTime(750, t);
      hornFilter.frequency.exponentialRampToValueAtTime(450, t + dur);

      hornGain.gain.setValueAtTime(0.0001, t);
      hornGain.gain.exponentialRampToValueAtTime(0.085, t + 0.015);
      hornGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      horn1.connect(hornFilter);
      horn2.connect(hornFilter);
      hornFilter.connect(hornGain);
      hornGain.connect(this.busGain);

      horn1.start(t);
      horn2.start(t);
      horn1.stop(t + dur + 0.02);
      horn2.stop(t + dur + 0.02);
    } catch {}
  }

  /**
   * Frame update called from ResultScreen render loop.
   * Dynamically randomizes siren pitch sweeps, speeds, and triggers maneuvers.
   */
  public updateFrame(isDrifting: boolean, isBraking: boolean, hasExhaustFlames: boolean): void {
    if (!this.isPlaying) return;
    const now = performance.now();
    const ctx = soundManager.getAudioContext();

    // ── DYNAMIC RANDOMIZATION & DESYNCHRONIZATION ──
    // Periodically shift siren frequencies and speeds so no cruiser stays locked in a repetitive cycle
    if (ctx && now - this.lastRandomizeTime > this.nextRandomizeInterval) {
      this.lastRandomizeTime = now;
      this.nextRandomizeInterval = 2500 + Math.random() * 3000; // 2.5s - 5.5s

      const t = ctx.currentTime;

      // Randomize Cruiser 1 (Wail): shift cycle speed and center frequency
      if (this.c1Lfo && this.c1Osc && this.c1LfoGain) {
        const randSpeed = 0.38 + Math.random() * 0.18; // 0.38 - 0.56 Hz
        const randPitch = 730 + (Math.random() * 100 - 50); // 680 - 780 Hz
        const randDev = 190 + Math.random() * 60; // 190 - 250 Hz
        this.c1Lfo.frequency.linearRampToValueAtTime(randSpeed, t + 1.2);
        this.c1Osc.frequency.linearRampToValueAtTime(randPitch, t + 1.2);
        this.c1LfoGain.gain.linearRampToValueAtTime(randDev, t + 1.2);
      }

      // Randomize Cruiser 2 (Yelp): shift yelp rate between fast and hyper-yelp
      if (this.c2Lfo && this.c2Osc && this.c2LfoGain) {
        const randYelpSpeed = Math.random() > 0.3 ? 2.4 + Math.random() * 1.0 : 3.6; // 2.4 - 3.6 Hz
        const randYelpPitch = 1040 + (Math.random() * 120 - 60);
        this.c2Lfo.frequency.linearRampToValueAtTime(randYelpSpeed, t + 0.8);
        this.c2Osc.frequency.linearRampToValueAtTime(randYelpPitch, t + 0.8);
      }

      // Randomize Cruiser 3: alternate between Hi-Lo (1.2 Hz) and Piercer (4.2 Hz)
      if (this.c3Lfo && this.c3Osc) {
        const isPiercer = Math.random() > 0.6;
        const randC3Speed = isPiercer ? 4.2 : 1.35 + Math.random() * 0.3;
        this.c3Lfo.frequency.linearRampToValueAtTime(randC3Speed, t + 0.9);
      }
    }

    // Occasional tactical police horn blip (every 9-16s or on hard braking)
    if (isBraking && now - this.lastHornTime > 4000) {
      this.lastHornTime = now;
      this.playPoliceAirHorn();
    } else if (now - this.lastHornTime > this.nextHornInterval) {
      this.lastHornTime = now;
      this.nextHornInterval = 8000 + Math.random() * 8000;
      this.playPoliceAirHorn();
    }

    // Trigger drift tire screech on transition into power slide
    if (isDrifting && !this.lastDriftTriggered) {
      soundManager.playSfx('drift', 1.0);
      this.lastDriftTriggered = true;
    } else if (!isDrifting) {
      this.lastDriftTriggered = false;
    }

    // Trigger exhaust backfire crackle
    if (hasExhaustFlames && !this.lastFlameTriggered) {
      soundManager.playSfx('backfire', 0.9);
      this.lastFlameTriggered = true;
    } else if (!hasExhaustFlames) {
      this.lastFlameTriggered = false;
    }
  }

  public stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.unsubscribeMute) {
      this.unsubscribeMute();
      this.unsubscribeMute = null;
    }

    try {
      const ctx = soundManager.getAudioContext();
      if (this.busGain && ctx) {
        const t = ctx.currentTime;
        this.busGain.gain.setValueAtTime(Math.max(this.busGain.gain.value, 0.0001), t);
        this.busGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      }

      setTimeout(() => {
        try {
          // Stop chopper
          this.chopperLfo?.stop();
          this.chopperLfo?.disconnect();
          this.chopperOsc?.stop();
          this.chopperOsc?.disconnect();
          this.chopperFilter?.disconnect();
          this.chopperGain?.disconnect();

          // Stop cruiser 1
          this.c1Osc?.stop();
          this.c1Osc?.disconnect();
          this.c1Lfo?.stop();
          this.c1Lfo?.disconnect();
          this.c1LfoGain?.disconnect();
          this.c1Filter?.disconnect();
          this.c1Gain?.disconnect();

          // Stop cruiser 2
          this.c2Osc?.stop();
          this.c2Osc?.disconnect();
          this.c2Lfo?.stop();
          this.c2Lfo?.disconnect();
          this.c2LfoGain?.disconnect();
          this.c2Filter?.disconnect();
          this.c2Gain?.disconnect();

          // Stop cruiser 3
          this.c3Osc?.stop();
          this.c3Osc?.disconnect();
          this.c3Lfo?.stop();
          this.c3Lfo?.disconnect();
          this.c3LfoGain?.disconnect();
          this.c3Filter?.disconnect();
          this.c3Gain?.disconnect();

          this.busGain?.disconnect();
        } catch {}
      }, 180);
    } catch {}
  }
}

export const pursuitAudio = new PursuitAudioController();
