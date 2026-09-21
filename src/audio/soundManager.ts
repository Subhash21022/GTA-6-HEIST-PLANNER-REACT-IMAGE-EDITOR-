// ── GTA 5 SOUND EFFECT SYNTHESIZER & SOUND MANAGER ─────────────────────────
// High-Fidelity Web Audio API Synthesis — Studio-Grade Clarity, Zero Clipping, 100% Offline

export type SoundEffectName =
  | 'hover'
  | 'select'
  | 'back'
  | 'tab'
  | 'pin'
  | 'string'
  | 'targetSelect'
  | 'subtleApproach'
  | 'loudApproach'
  | 'crewSelect'
  | 'stinger'
  | 'missionPassed'
  | 'cashTally'
  | 'cctvSwitch'
  | 'drift'
  | 'backfire'
  | 'cameraShutter'
  | 'error';

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 1.0;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private clarityFilter: BiquadFilterNode | null = null;
  private lastHoverTime: number = 0;
  private lastDriftTime: number = 0;
  private lastExplicitSoundTime: number = 0;
  private listeners: Set<(muted: boolean, volume: number) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const storedMute = localStorage.getItem('gta_sfx_muted');
      if (storedMute !== null) {
        this.isMuted = storedMute === 'true';
      }
      const storedVolume = localStorage.getItem('gta_sfx_volume');
      if (storedVolume !== null) {
        const val = parseFloat(storedVolume);
        if (!isNaN(val) && val >= 0 && val <= 1) {
          this.volume = val === 0 ? 0 : Math.max(val, 0.85);
        }
      }

      // Unlock AudioContext on the first user interaction
      const unlockAudio = () => {
        this.getAudioContext();
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });

      // GTA 5 Menu Navigation Hover blip on interactive buttons & cards
      window.addEventListener(
        'mouseover',
        (e: MouseEvent) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          const interactive = target.closest<HTMLElement>(
            'button, a, [role="button"], .target-card, .crew-card, .approach-card, .tab-btn, .option-btn',
          );
          if (interactive && !interactive.hasAttribute('disabled')) {
            const now = performance.now();
            if (now - this.lastHoverTime > 55) {
              this.lastHoverTime = now;
              this.playSfx('hover', 0.65);
            }
          }
        },
        { passive: true },
      );

      // GTA 5 Menu Select confirm click on buttons
      // Prevents duplicate firing if a custom/explicit sound was already triggered in the button's onClick
      window.addEventListener(
        'click',
        (e: MouseEvent) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          const interactive = target.closest<HTMLElement>('button, [role="button"]');
          if (interactive && !interactive.hasAttribute('disabled')) {
            const customSfx = interactive.getAttribute('data-sfx');
            if (customSfx === 'none') return;
            if (customSfx && customSfx in this) {
              this.playSfx(customSfx as SoundEffectName);
              return;
            }

            // Suppress fallback select click if an explicit sound was triggered by React's handler in this event bubble
            if (performance.now() - this.lastExplicitSoundTime < 60) {
              return;
            }

            if (!customSfx) {
              this.playSfx('select', 0.95);
            }
          }
        },
        { passive: true },
      );

      // Keyboard shortcut: Press 'M' to toggle mute
      window.addEventListener('keydown', (e: KeyboardEvent) => {
        if (
          e.key.toLowerCase() === 'm' &&
          !['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase() || '')
        ) {
          this.toggleMute();
        }
      });
    }
  }

  public getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();

        // 1. Master Gain Node
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

        // 2. High-Frequency Clarity & Exciter Filter (removes muddiness, adds crystal definition)
        this.clarityFilter = this.ctx.createBiquadFilter();
        this.clarityFilter.type = 'highshelf';
        this.clarityFilter.frequency.setValueAtTime(3200, this.ctx.currentTime);
        this.clarityFilter.gain.setValueAtTime(2.2, this.ctx.currentTime);

        // 3. Studio-Grade Master Dynamics Limiter (guarantees zero digital clipping and maximum punchy volume)
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-4, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(10, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.001, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.05, this.ctx.currentTime);

        // Signal Chain: Synthesizers -> masterGain -> clarityFilter -> compressor -> speakers
        this.masterGain.connect(this.clarityFilter);
        this.clarityFilter.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getMasterGain(): GainNode | null {
    this.getAudioContext();
    return this.masterGain;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(newVolume: number): void {
    const clamped = Math.max(0, Math.min(1, Math.round(newVolume * 100) / 100));
    this.volume = clamped;
    if (typeof window !== 'undefined') {
      localStorage.setItem('gta_sfx_volume', String(this.volume));
    }

    // Raising volume when muted unmutes automatically
    if (clamped > 0 && this.isMuted) {
      this.isMuted = false;
      if (typeof window !== 'undefined') {
        localStorage.setItem('gta_sfx_muted', 'false');
      }
    } else if (clamped === 0 && !this.isMuted) {
      this.isMuted = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('gta_sfx_muted', 'true');
      }
    }

    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    }
    this.notifyListeners();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (!this.isMuted && this.volume === 0) {
      this.volume = 1.0;
      if (typeof window !== 'undefined') {
        localStorage.setItem('gta_sfx_volume', String(this.volume));
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('gta_sfx_muted', String(this.isMuted));
    }
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    }
    this.notifyListeners();
    if (!this.isMuted) {
      this.playSfx('select', 1.0);
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    if (this.isMuted === muted) return;
    this.isMuted = muted;
    if (!this.isMuted && this.volume === 0) {
      this.volume = 1.0;
      if (typeof window !== 'undefined') {
        localStorage.setItem('gta_sfx_volume', String(this.volume));
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('gta_sfx_muted', String(this.isMuted));
    }
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    }
    this.notifyListeners();
  }

  public subscribe(listener: (muted: boolean, volume: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.isMuted, this.volume);
    }
  }

  // ── SOUND EFFECT DISPATCHER ────────────────────────────────────────────────
  public playSfx(name: SoundEffectName, volumeScale: number = 1.0): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (name !== 'hover') {
      this.lastExplicitSoundTime = performance.now();
    }

    try {
      switch (name) {
        case 'hover':
          this.synthHover(ctx, volumeScale);
          break;
        case 'select':
          this.synthSelect(ctx, volumeScale);
          break;
        case 'back':
          this.synthBack(ctx, volumeScale);
          break;
        case 'tab':
          this.synthTab(ctx, volumeScale);
          break;
        case 'pin':
          this.synthPin(ctx, volumeScale);
          break;
        case 'string':
          this.synthString(ctx, volumeScale);
          break;
        case 'targetSelect':
          this.synthTargetSelect(ctx, volumeScale);
          break;
        case 'subtleApproach':
          this.synthSubtleApproach(ctx, volumeScale);
          break;
        case 'loudApproach':
          this.synthLoudApproach(ctx, volumeScale);
          break;
        case 'crewSelect':
          this.synthCrewSelect(ctx, volumeScale);
          break;
        case 'stinger':
          this.synthStinger(ctx, volumeScale);
          break;
        case 'missionPassed':
          this.synthMissionPassed(ctx, volumeScale);
          break;
        case 'cashTally':
          this.synthCashTally(ctx, volumeScale);
          break;
        case 'cctvSwitch':
          this.synthCCTVSwitch(ctx, volumeScale);
          break;
        case 'drift':
          this.synthDrift(ctx, volumeScale);
          break;
        case 'backfire':
          this.synthBackfire(ctx, volumeScale);
          break;
        case 'cameraShutter':
          this.synthCameraShutter(ctx, volumeScale);
          break;
        case 'error':
          this.synthError(ctx, volumeScale);
          break;
      }
    } catch {
      // Audio playback restrictions fallback
    }
  }

  // ── PURE & CRISP PROCEDURAL SYNTHESIZERS (BOOSTED VOLUME & HEADROOM) ────────

  // 1. GTA 5 Menu Navigation Hover Blip (Glassy, ultra-crisp 24ms micro-tone)
  private synthHover(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2240, t);
    osc.frequency.exponentialRampToValueAtTime(1680, t + 0.024);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.14 * vol, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.024);

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start(t);
    osc.stop(t + 0.026);
  }

  // 2. GTA 5 Menu Confirm / Select (Crystal-clear dual-tone bell chime)
  private synthSelect(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;

    // Primary bell tone (A6 = 1760 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1760, t);
    gain1.gain.setValueAtTime(0.0001, t);
    gain1.gain.exponentialRampToValueAtTime(0.28 * vol, t + 0.003);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);
    osc1.connect(gain1);
    gain1.connect(this.masterGain || ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.07);

    // Harmonic bell tone (E7 = 2640 Hz, brilliant perfect fifth)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2640, t + 0.012);
    gain2.gain.setValueAtTime(0.0001, t + 0.012);
    gain2.gain.exponentialRampToValueAtTime(0.18 * vol, t + 0.015);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
    osc2.connect(gain2);
    gain2.connect(this.masterGain || ctx.destination);
    osc2.start(t + 0.012);
    osc2.stop(t + 0.08);

    // Micro-transient click (pure sine impulse at 3520 Hz)
    const tick = ctx.createOscillator();
    const tickGain = ctx.createGain();
    tick.type = 'triangle';
    tick.frequency.setValueAtTime(3520, t);
    tickGain.gain.setValueAtTime(0.0001, t);
    tickGain.gain.exponentialRampToValueAtTime(0.14 * vol, t + 0.002);
    tickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.008);
    tick.connect(tickGain);
    tickGain.connect(this.masterGain || ctx.destination);
    tick.start(t);
    tick.stop(t + 0.01);
  }

  // 3. GTA 5 Menu Cancel / Back (Clean, round descending tone)
  private synthBack(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, t);
    osc.frequency.exponentialRampToValueAtTime(360, t + 0.055);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.26 * vol, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start(t);
    osc.stop(t + 0.065);
  }

  // 4. Tab / Section Switch (Crisp, bright swoosh)
  private synthTab(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.035);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.075);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.24 * vol, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start(t);
    osc.stop(t + 0.085);
  }

  // 5. Corkboard Pin (Solid physical thumbtack thud + tap)
  private synthPin(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;

    // Cork punch
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.045);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.42 * vol, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);
    osc.start(t);
    osc.stop(t + 0.055);

    // Pin-head tap
    const tap = ctx.createOscillator();
    const tapGain = ctx.createGain();
    tap.type = 'sine';
    tap.frequency.setValueAtTime(2400, t);
    tapGain.gain.setValueAtTime(0.0001, t);
    tapGain.gain.exponentialRampToValueAtTime(0.22 * vol, t + 0.002);
    tapGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
    tap.connect(tapGain);
    tapGain.connect(this.masterGain || ctx.destination);
    tap.start(t);
    tap.stop(t + 0.015);
  }

  // 6. Red String Connection Snap (Acoustic string pluck)
  private synthString(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.3, t); // D5
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.055); // A4

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.32 * vol, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start(t);
    osc.stop(t + 0.065);
  }

  // 7. Target Recon Scan / Camera Focus Lock (Digital target lock tones + clean shutter)
  private synthTargetSelect(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;

    const playLockTone = (freq: number, start: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.26 * vol, start + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.035);
      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);
      osc.start(start);
      osc.stop(start + 0.04);
    };

    playLockTone(1975.5, t); // B6
    playLockTone(2637.0, t + 0.038); // E7

    // Clean mechanical shutter click
    this.synthCameraShutter(ctx, vol * 0.9);
  }

  // 8. Subtle Approach: Stealth Espionage Sonar Radar Ping
  private synthSubtleApproach(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;

    // Pristine sonar ping at 1480 Hz
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(1480, t);
    pingGain.gain.setValueAtTime(0.0001, t);
    pingGain.gain.exponentialRampToValueAtTime(0.40 * vol, t + 0.006);
    pingGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    ping.connect(pingGain);
    pingGain.connect(this.masterGain || ctx.destination);
    ping.start(t);
    ping.stop(t + 0.46);

    // Low stealth drone
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(75, t);
    sub.frequency.exponentialRampToValueAtTime(45, t + 0.35);
    subGain.gain.setValueAtTime(0.0001, t);
    subGain.gain.exponentialRampToValueAtTime(0.36 * vol, t + 0.01);
    subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    sub.connect(subGain);
    subGain.connect(this.masterGain || ctx.destination);
    sub.start(t);
    sub.stop(t + 0.4);
  }

  // 9. Loud Approach: C4 Beeps + Heavy Punch Breaching Boom
  private synthLoudApproach(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;

    // C4 arming beeps
    const playBeep = (startTime: number) => {
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(2500, startTime);
      bGain.gain.setValueAtTime(0.0001, startTime);
      bGain.gain.exponentialRampToValueAtTime(0.26 * vol, startTime + 0.003);
      bGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.035);
      bOsc.connect(bGain);
      bGain.connect(this.masterGain || ctx.destination);
      bOsc.start(startTime);
      bOsc.stop(startTime + 0.04);
    };
    playBeep(t);
    playBeep(t + 0.08);

    // Deep breaching detonation punch
    const boomT = t + 0.14;
    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(95, boomT);
    boom.frequency.exponentialRampToValueAtTime(32, boomT + 0.5);

    boomGain.gain.setValueAtTime(0.0001, boomT);
    boomGain.gain.exponentialRampToValueAtTime(0.60 * vol, boomT + 0.015);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, boomT + 0.55);

    boom.connect(boomGain);
    boomGain.connect(this.masterGain || ctx.destination);
    boom.start(boomT);
    boom.stop(boomT + 0.6);
  }

  // 10. Crew Selection: Tactical Radio Roger Beep
  private synthCrewSelect(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;

    // Clean VHF radio roger beeps (1318Hz -> 1760Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1318.5, t);
    osc.frequency.setValueAtTime(1760.0, t + 0.035);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.26 * vol, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start(t);
    osc.stop(t + 0.075);
  }

  // 11. GTA 5 Heist Stinger (Sub-bass impact + rich cinematic C minor brass chord)
  private synthStinger(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;

    // Sub-bass drop
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(85, t);
    sub.frequency.exponentialRampToValueAtTime(35, t + 0.85);
    subGain.gain.setValueAtTime(0.0001, t);
    subGain.gain.exponentialRampToValueAtTime(0.58 * vol, t + 0.012);
    subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    sub.connect(subGain);
    subGain.connect(this.masterGain || ctx.destination);
    sub.start(t);
    sub.stop(t + 0.95);

    // Cinematic brass chord (C2, Eb3, G3, C4)
    const freqs = [65.4, 155.6, 196.0, 261.6];
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, t);
      filter.frequency.exponentialRampToValueAtTime(120, t + 0.95);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.26 * vol, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain || ctx.destination);

      osc.start(t);
      osc.stop(t + 1.05);
    }
  }

  // 12. GTA 5 Mission Passed Fanfare (Triumphant 3-Chord Progression)
  private synthMissionPassed(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;

    // Triumphant brass chord sequence: Eb major -> F major -> G major
    const chords = [
      { time: t, freqs: [155.6, 196.0, 233.1, 311.1], dur: 0.38 }, // Eb major
      { time: t + 0.40, freqs: [174.6, 220.0, 261.6, 349.2], dur: 0.38 }, // F major
      { time: t + 0.80, freqs: [196.0, 246.9, 293.7, 392.0], dur: 1.3 }, // G major sustained
    ];

    for (const chord of chords) {
      for (const f of chord.freqs) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, chord.time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(950, chord.time);
        filter.frequency.exponentialRampToValueAtTime(350, chord.time + chord.dur);

        gain.gain.setValueAtTime(0.0001, chord.time);
        gain.gain.exponentialRampToValueAtTime(0.25 * vol, chord.time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, chord.time + chord.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain || ctx.destination);

        osc.start(chord.time);
        osc.stop(chord.time + chord.dur + 0.05);
      }
    }

    // Followed by cash register bell tally
    setTimeout(() => {
      this.playSfx('cashTally', 1.0);
    }, 1150);
  }

  // 13. Cash Register / Money Tally (Crisp ratchet ticks + crystal D7 bell ding)
  private synthCashTally(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;

    // 8 fast, crisp clockwork ticks
    for (let i = 0; i < 8; i++) {
      const tickT = t + i * 0.032;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400 + (i % 2) * 500, tickT);
      gain.gain.setValueAtTime(0.0001, tickT);
      gain.gain.exponentialRampToValueAtTime(0.15 * vol, tickT + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, tickT + 0.016);
      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);
      osc.start(tickT);
      osc.stop(tickT + 0.02);
    }

    // Crystal register bell ding at D7 (2349.3 Hz)
    const bellT = t + 0.28;
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(2349.3, bellT);
    bellGain.gain.setValueAtTime(0.0001, bellT);
    bellGain.gain.exponentialRampToValueAtTime(0.45 * vol, bellT + 0.004);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, bellT + 0.85);

    bellOsc.connect(bellGain);
    bellGain.connect(this.masterGain || ctx.destination);
    bellOsc.start(bellT);
    bellOsc.stop(bellT + 0.9);
  }

  // 14. CCTV Camera Switch (Clean relay pulse + 60Hz hum blip)
  private synthCCTVSwitch(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;

    // Relay pop
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(1400, t);
    click.frequency.exponentialRampToValueAtTime(300, t + 0.025);
    clickGain.gain.setValueAtTime(0.0001, t);
    clickGain.gain.exponentialRampToValueAtTime(0.26 * vol, t + 0.002);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);
    click.connect(clickGain);
    clickGain.connect(this.masterGain || ctx.destination);
    click.start(t);
    click.stop(t + 0.03);

    // 60Hz magnetic blip
    const hum = ctx.createOscillator();
    const humGain = ctx.createGain();
    hum.type = 'sine';
    hum.frequency.setValueAtTime(60, t);
    humGain.gain.setValueAtTime(0.0001, t);
    humGain.gain.exponentialRampToValueAtTime(0.22 * vol, t + 0.004);
    humGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    hum.connect(humGain);
    humGain.connect(this.masterGain || ctx.destination);
    hum.start(t);
    hum.stop(t + 0.055);
  }

  // 15. High-Speed Tire Drift Screech (Clean rubber tire friction squeal)
  public synthDrift(ctx: AudioContext, vol: number): void {
    const now = performance.now();
    if (now - this.lastDriftTime < 280) return;
    this.lastDriftTime = now;

    const t = ctx.currentTime;
    const dur = 0.25;

    // Detuned FM oscillators with bandpass resonance for authentic tire rubber squeal
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1850, t);
    filter.Q.setValueAtTime(2.0, t);

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1720, t);
    osc1.frequency.linearRampToValueAtTime(2050, t + dur * 0.4);
    osc1.frequency.linearRampToValueAtTime(1580, t + dur);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1780, t);
    osc2.frequency.linearRampToValueAtTime(2110, t + dur * 0.4);
    osc2.frequency.linearRampToValueAtTime(1620, t + dur);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25 * vol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + dur + 0.02);
    osc2.stop(t + dur + 0.02);
  }

  // 16. Exhaust Backfire Pop (Acoustic crackle impulse)
  public synthBackfire(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;
    const playCrackle = (delay: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t + delay);
      osc.frequency.exponentialRampToValueAtTime(40, t + delay + 0.035);

      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.40 * vol, t + delay + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.038);

      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);

      osc.start(t + delay);
      osc.stop(t + delay + 0.04);
    };
    playCrackle(0);
    playCrackle(0.042);
  }

  // 17. Camera Shutter Click (Clean mechanical double impulse)
  private synthCameraShutter(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;
    const click = (freq: number, start: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(400, start + 0.016);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.26 * vol, start + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.018);
      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);
      osc.start(start);
      osc.stop(start + 0.02);
    };
    click(2600, t);
    click(1900, t + 0.032);
  }

  // 18. Error / Warning Alert (Warm lowpass-filtered descending double tone)
  private synthError(ctx: AudioContext, vol: number): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.setValueAtTime(120, t + 0.07);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.30 * vol, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start(t);
    osc.stop(t + 0.17);
  }
}

export const soundManager = new SoundManager();

export const playSfx = (name: SoundEffectName, volumeScale?: number): void => {
  soundManager.playSfx(name, volumeScale);
};
