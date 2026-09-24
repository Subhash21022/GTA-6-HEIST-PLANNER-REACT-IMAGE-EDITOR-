import { soundManager } from './soundManager';
import { getPoliceDispatchPool, type PoliceDispatchMessage } from '../config/wantedLevel';

type DispatchListener = (msg: PoliceDispatchMessage, isSpeaking: boolean) => void;

class RadioDispatchController {
  private isActive: boolean = false;
  private currentMessage: PoliceDispatchMessage | null = null;
  private pool: PoliceDispatchMessage[] = [];
  private poolIndex: number = 0;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<DispatchListener> = new Set();
  private isSpeaking: boolean = false;

  public subscribe(listener: DispatchListener): () => void {
    this.listeners.add(listener);
    if (this.currentMessage) {
      listener(this.currentMessage, this.isSpeaking);
    }
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    if (!this.currentMessage) return;
    for (const listener of this.listeners) {
      listener(this.currentMessage, this.isSpeaking);
    }
  }

  public getCurrentMessage(): PoliceDispatchMessage | null {
    return this.currentMessage;
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public start(targetName: string, approach: 'subtle' | 'loud', wantedStars: number): void {
    if (this.isActive) return;
    this.isActive = true;
    this.pool = getPoliceDispatchPool(targetName, approach, wantedStars);
    this.poolIndex = 0;

    // Trigger initial dispatch after a short dramatic pause (1.2s)
    setTimeout(() => {
      if (this.isActive) {
        this.broadcastNext();
      }
    }, 1200);

    // Subsequent radio dispatches every 6.8 seconds
    this.intervalTimer = setInterval(() => {
      if (this.isActive) {
        this.broadcastNext();
      }
    }, 6800);
  }

  public stop(): void {
    this.isActive = false;
    this.isSpeaking = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Safe fallback
      }
    }
  }

  public triggerManualSquelch(): void {
    soundManager.playSfx('radioSquelch', 1.0);
    soundManager.playSfx('policeRadioChirp', 0.85);
  }

  public broadcastNext(): void {
    if (this.pool.length === 0) return;
    const msg = this.pool[this.poolIndex % this.pool.length];
    this.poolIndex++;
    this.currentMessage = msg;
    this.isSpeaking = true;
    this.notify();

    // 1. Play Opening Radio Squelch & CTCSS Beep
    soundManager.playSfx('radioSquelch', 0.9);
    soundManager.playSfx('policeRadioChirp', 0.8);

    // 2. Browser Web Speech Synthesis for police dispatcher voice (radio bandpass styled)
    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      !soundManager.getIsMuted()
    ) {
      try {
        window.speechSynthesis.cancel();
        // Short, punchy radio utterance
        const shortSpeech = `${msg.callsign}: ${msg.message}`;
        const utterance = new SpeechSynthesisUtterance(shortSpeech);
        utterance.rate = 1.18; // Crisp, rapid-fire police radio cadence
        utterance.pitch = msg.urgency === 'critical' ? 1.08 : 0.98;
        utterance.volume = Math.min(1.0, soundManager.getVolume() * 0.95);

        // Try to pick an English voice
        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(
          (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('David') || v.name.includes('Google')),
        ) || voices.find((v) => v.lang.startsWith('en'));
        if (enVoice) {
          utterance.voice = enVoice;
        }

        utterance.onend = () => {
          this.isSpeaking = false;
          this.notify();
          // Trailing Radio Squelch Key-Down
          soundManager.playSfx('radioSquelch', 0.7);
        };

        utterance.onerror = () => {
          this.isSpeaking = false;
          this.notify();
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        // Fallback: reset speaking state after 3 seconds
        setTimeout(() => {
          this.isSpeaking = false;
          this.notify();
        }, 3000);
      }
    } else {
      // Audio muted or unsupported: simulate radio transmission duration
      setTimeout(() => {
        this.isSpeaking = false;
        this.notify();
      }, 3500);
    }
  }
}

export const radioDispatch = new RadioDispatchController();
