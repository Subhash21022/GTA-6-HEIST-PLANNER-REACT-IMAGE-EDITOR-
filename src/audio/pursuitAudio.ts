import { soundManager } from './soundManager';

/**
 * Controller for continuous atmospheric pursuit audio (News Chopper rotor blades & police sirens).
 * Pure sine & triangle synthesis with zero static hiss, zero clipping, and clean routing.
 */
class PursuitAudioController {
  private isPlaying: boolean = false;
  private busGain: GainNode | null = null;
  private chopperGain: GainNode | null = null;
  private sirenGain: GainNode | null = null;
  private chopperLfo: OscillatorNode | null = null;
  private chopperOsc: OscillatorNode | null = null;
  private chopperFilter: BiquadFilterNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenLfo: OscillatorNode | null = null;
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
      // Dedicated bus gain connected directly to soundManager's master signal chain
      this.busGain = ctx.createGain();
      const initialVol = soundManager.getIsMuted() ? 0 : 1.0;
      this.busGain.gain.setValueAtTime(0.0001, t);
      this.busGain.gain.exponentialRampToValueAtTime(Math.max(initialVol, 0.0001), t + 0.15);

      if (masterGain) {
        this.busGain.connect(masterGain);
      } else {
        this.busGain.connect(ctx.destination);
      }

      // Automatically mute/unmute pursuit ambience with soundManager state
      this.unsubscribeMute = soundManager.subscribe((muted) => {
        if (!this.busGain || !ctx) return;
        const now = ctx.currentTime;
        if (muted) {
          this.busGain.gain.setValueAtTime(0, now);
        } else {
          this.busGain.gain.setValueAtTime(0.0001, now);
          this.busGain.gain.exponentialRampToValueAtTime(1.0, now + 0.15);
        }
      });

      // 1. News Chopper Rotor Blades Synthesizer (16 Hz rhythmic rotor beat)
      // Deep 44 Hz sub-bass carrier filtered through lowpass 110 Hz (pure cinematic thumping, NO hiss)
      this.chopperOsc = ctx.createOscillator();
      this.chopperOsc.type = 'triangle';
      this.chopperOsc.frequency.setValueAtTime(44, t);

      this.chopperFilter = ctx.createBiquadFilter();
      this.chopperFilter.type = 'lowpass';
      this.chopperFilter.frequency.setValueAtTime(110, t);

      // Subdued ambient rotor volume
      this.chopperGain = ctx.createGain();
      this.chopperGain.gain.setValueAtTime(0.022, t);

      // 16 Hz rotor blade modulation LFO (smooth sine amplitude pulsing)
      this.chopperLfo = ctx.createOscillator();
      this.chopperLfo.type = 'sine';
      this.chopperLfo.frequency.setValueAtTime(16, t);

      const chopperLfoGain = ctx.createGain();
      chopperLfoGain.gain.setValueAtTime(0.015, t);

      this.chopperLfo.connect(chopperLfoGain);
      chopperLfoGain.connect(this.chopperGain.gain);

      this.chopperOsc.connect(this.chopperFilter);
      this.chopperFilter.connect(this.chopperGain);
      this.chopperGain.connect(this.busGain);

      this.chopperOsc.start(t);
      this.chopperLfo.start(t);

      // 2. Distant Police Siren Synthesizer (Pure sine wailing between 720 Hz and 920 Hz)
      this.sirenOsc = ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.setValueAtTime(820, t);

      this.sirenLfo = ctx.createOscillator();
      this.sirenLfo.type = 'sine';
      this.sirenLfo.frequency.setValueAtTime(0.75, t); // 0.75 Hz slow wailing cycle

      const sirenLfoGain = ctx.createGain();
      sirenLfoGain.gain.setValueAtTime(100, t); // +/- 100 Hz frequency deviation
      this.sirenLfo.connect(sirenLfoGain);
      sirenLfoGain.connect(this.sirenOsc.frequency);

      const sirenFilter = ctx.createBiquadFilter();
      sirenFilter.type = 'bandpass';
      sirenFilter.frequency.setValueAtTime(820, t);
      sirenFilter.Q.setValueAtTime(4.0, t);

      this.sirenGain = ctx.createGain();
      this.sirenGain.gain.setValueAtTime(0.011, t); // Pure, soft background ambience

      this.sirenOsc.connect(sirenFilter);
      sirenFilter.connect(this.sirenGain);
      this.sirenGain.connect(this.busGain);

      this.sirenOsc.start(t);
      this.sirenLfo.start(t);
    } catch {
      // Audio playback restrictions fallback
    }
  }

  public updateFrame(isDrifting: boolean, _isBraking: boolean, hasExhaustFlames: boolean): void {
    if (!this.isPlaying) return;

    // Trigger drift tire screech on transition into power slide
    if (isDrifting && !this.lastDriftTriggered) {
      soundManager.playSfx('drift', 0.85);
      this.lastDriftTriggered = true;
    } else if (!isDrifting) {
      this.lastDriftTriggered = false;
    }

    // Trigger exhaust backfire crackle
    if (hasExhaustFlames && !this.lastFlameTriggered) {
      soundManager.playSfx('backfire', 0.75);
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
        this.busGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      }

      setTimeout(() => {
        try {
          this.chopperLfo?.stop();
          this.chopperLfo?.disconnect();
          this.chopperOsc?.stop();
          this.chopperOsc?.disconnect();
          this.chopperFilter?.disconnect();
          this.sirenOsc?.stop();
          this.sirenOsc?.disconnect();
          this.sirenLfo?.stop();
          this.sirenLfo?.disconnect();
          this.chopperGain?.disconnect();
          this.sirenGain?.disconnect();
          this.busGain?.disconnect();
        } catch {}
      }, 140);
    } catch {}
  }
}

export const pursuitAudio = new PursuitAudioController();
