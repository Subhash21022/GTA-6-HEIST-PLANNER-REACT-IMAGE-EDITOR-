import { soundManager } from './soundManager';
import { getPoliceDispatchPool, type PoliceDispatchMessage } from '../config/wantedLevel';
import { voiceManager, identifyPersona, type VoicePersonaMetadata } from './voiceManager';

type DispatchListener = (msg: PoliceDispatchMessage, isSpeaking: boolean, persona: VoicePersonaMetadata) => void;

class RadioDispatchController {
  private isActive: boolean = false;
  private currentMessage: PoliceDispatchMessage | null = null;
  private pool: PoliceDispatchMessage[] = [];
  private poolIndex: number = 0;
  private nextDispatchTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<DispatchListener> = new Set();
  private isSpeaking: boolean = false;
  private targetName: string = 'TARGET FACILITY';
  private approach: 'subtle' | 'loud' = 'subtle';
  private wantedStars: number = 3;

  public subscribe(listener: DispatchListener): () => void {
    this.listeners.add(listener);
    if (this.currentMessage) {
      const persona = voiceManager.getPersonaForMessage(this.currentMessage);
      listener(this.currentMessage, this.isSpeaking, persona);
    }
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    if (!this.currentMessage) return;
    const persona = voiceManager.getPersonaForMessage(this.currentMessage);
    for (const listener of this.listeners) {
      listener(this.currentMessage, this.isSpeaking, persona);
    }
  }

  public getCurrentMessage(): PoliceDispatchMessage | null {
    return this.currentMessage;
  }

  public getCurrentPersona(): VoicePersonaMetadata | null {
    if (!this.currentMessage) return null;
    return voiceManager.getPersonaForMessage(this.currentMessage);
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  private clearNextDispatchTimer(): void {
    if (this.nextDispatchTimer) {
      clearTimeout(this.nextDispatchTimer);
      this.nextDispatchTimer = null;
    }
  }

  private scheduleNextDispatch(delayMs: number = 4200): void {
    this.clearNextDispatchTimer();
    if (!this.isActive) return;

    this.nextDispatchTimer = setTimeout(() => {
      if (this.isActive && !this.isSpeaking) {
        this.broadcastNext();
      }
    }, delayMs);
  }

  public start(targetName: string, approach: 'subtle' | 'loud', wantedStars: number): void {
    if (this.isActive) return;
    this.isActive = true;
    this.targetName = targetName;
    this.approach = approach;
    this.wantedStars = wantedStars;
    this.pool = getPoliceDispatchPool(targetName, approach, wantedStars);
    this.poolIndex = 0;

    // Trigger initial broadcast after a short dramatic pause (1.2s)
    this.scheduleNextDispatch(1200);
  }

  public stop(): void {
    this.isActive = false;
    this.isSpeaking = false;
    this.clearNextDispatchTimer();
    voiceManager.cancel();
  }

  public triggerManualSquelch(): void {
    soundManager.playSfx('radioSquelch', 1.0);
    soundManager.playSfx('policeRadioChirp', 0.85);
  }

  /**
   * Broadcasts the next radio call from the active police dispatch pool,
   * dynamically routed to the actor's distinct human voice persona.
   * Chained naturally so no voice is ever interrupted or cut off halfway!
   */
  public broadcastNext(): void {
    this.clearNextDispatchTimer();
    if (this.pool.length === 0) return;

    const msg = this.pool[this.poolIndex % this.pool.length];
    this.poolIndex++;
    this.currentMessage = msg;
    const personaId = identifyPersona(msg.callsign);

    this.isSpeaking = true;
    this.notify();

    // 1. Play Opening Radio Squelch & CTCSS Beep
    soundManager.playSfx('radioSquelch', 0.9);
    soundManager.playSfx('policeRadioChirp', 0.8);

    // 2. Speak with the distinct human voice persona after opening chirp completes (120ms)
    setTimeout(() => {
      if (!this.isActive) return;
      const spoken = voiceManager.speak(
        personaId,
        msg.message,
        () => {
          this.isSpeaking = true;
          this.notify();
        },
        () => {
          this.isSpeaking = false;
          this.notify();
          // Trailing Radio Squelch Key-Down
          soundManager.playSfx('radioSquelch', 0.7);
          // Chain the next radio call after authentic 4.2 seconds of radio silence!
          this.scheduleNextDispatch(4200);
        },
      );

      if (!spoken) {
        // Audio muted or unsupported: simulate radio transmission duration
        setTimeout(() => {
          this.isSpeaking = false;
          this.notify();
          this.scheduleNextDispatch(4200);
        }, 4000);
      }
    }, 120);
  }

  /**
   * Broadcasts an official Weazel News TV Anchor breaking news report
   * voiced by the charismatic TV news anchor persona with news fanfare.
   */
  public broadcastAnchorReport(): void {
    this.clearNextDispatchTimer();
    const isLoudOrHigh = this.approach === 'loud' || this.wantedStars >= 4;
    const targetUpper = this.targetName.toUpperCase();

    const anchorMsg: PoliceDispatchMessage = {
      id: `weazel-anchor-${Date.now()}`,
      callsign: 'WEAZEL NEWS',
      unit: 'CHANNEL 4 LIVE BROADCAST DESK',
      channel: 'WEAZEL NEWS HD // LIVE AIR',
      message: isLoudOrHigh
        ? `Weazel News special report! Armed mayhem in Vice City as a heavily armed crew hits ${targetUpper}! SWAT Bearcats and interceptors have sealed perimeter routes as Sky-Weazel 4 tracks the escape live!`
        : `Weazel News special report. Vice City authorities are investigating a major security breach at ${targetUpper}. Perimeter alarms were bypassed in a sophisticated heist. Sky-Weazel 4 is tracking fleeing suspects live.`,
      urgency: 'critical',
      timestamp: new Date().toTimeString().slice(0, 8),
    };

    this.currentMessage = anchorMsg;
    this.isSpeaking = true;
    this.notify();

    // 1. Dramatic TV News Breaking Stinger Motif (Web Audio)
    soundManager.playSfx('newsStinger', 1.0);

    // 2. Speak with TV News Anchor persona after stinger completes (460ms)
    setTimeout(() => {
      if (!this.isActive) return;
      const spoken = voiceManager.speak(
        'newsAnchor',
        anchorMsg.message,
        () => {
          this.isSpeaking = true;
          this.notify();
        },
        () => {
          this.isSpeaking = false;
          this.notify();
          // Resume police radio chatter 5.0 seconds after anchor report
          this.scheduleNextDispatch(5000);
        },
      );

      if (!spoken) {
        setTimeout(() => {
          this.isSpeaking = false;
          this.notify();
          this.scheduleNextDispatch(5000);
        }, 4500);
      }
    }, 460);
  }
}

export const radioDispatch = new RadioDispatchController();
