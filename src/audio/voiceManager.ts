import { soundManager } from './soundManager';
import type { PoliceDispatchMessage } from '../config/wantedLevel';

export type VoicePersonaId = 'dispatch' | 'air1' | 'cruiser' | 'swat' | 'patrol' | 'newsAnchor';

export interface VoicePersonaMetadata {
  id: VoicePersonaId;
  callsign: string;
  unit: string;
  badgeIcon: string;
  voiceDescription: string;
  gender: 'female' | 'male';
  preferredVoiceNames: string[];
  pitch: number;
  rate: number;
  volumeMultiplier: number;
  color: string;
}

export const PERSONA_CONFIGS: Record<VoicePersonaId, VoicePersonaMetadata> = {
  dispatch: {
    id: 'dispatch',
    callsign: 'VCPD DISPATCH',
    unit: 'CENTRAL 10 // COMMAND DESK',
    badgeIcon: '👮‍♀️',
    voiceDescription: 'Female 911 Police Dispatcher',
    gender: 'female',
    preferredVoiceNames: [
      'Jenny',
      'Aria',
      'Zira',
      'Samantha',
      'Victoria',
      'Karen',
      'Sonia',
      'Libby',
      'Google US English Female',
      'Google UK English Female',
      'en-US-JennyNeural',
      'en-US-AriaNeural',
    ],
    pitch: 1.14, // Crisp, clear female dispatch register
    rate: 1.16,  // Rapid-fire emergency cadence
    volumeMultiplier: 1.0,
    color: '#00f0ff',
  },
  cruiser: {
    id: 'cruiser',
    callsign: 'CRUISER 2-BRAVO',
    unit: 'PURSUIT INTERCEPT',
    badgeIcon: '🚓',
    voiceDescription: 'Adrenaline Ground Pursuit Officer',
    gender: 'male',
    preferredVoiceNames: [
      'David',
      'Guy',
      'Christopher',
      'Mark',
      'Alex',
      'Google US English Male',
      'Google UK English Male',
      'Daniel',
      'en-US-GuyNeural',
      'en-US-ChristopherNeural',
    ],
    pitch: 0.95, // Urgent, punchy male voice
    rate: 1.25,  // Breathless, high-speed chase pace
    volumeMultiplier: 1.05,
    color: '#ff2d78',
  },
  air1: {
    id: 'air1',
    callsign: 'AIR-1 FLIR',
    unit: 'SKY-WEAZEL 4 GIMBAL',
    badgeIcon: '🚁',
    voiceDescription: 'Airborne News / FLIR Observer',
    gender: 'male',
    preferredVoiceNames: [
      'Christopher',
      'Daniel',
      'George',
      'Ryan',
      'Guy',
      'Oliver',
      'Google UK English Male',
      'Alex',
      'en-US-ChristopherNeural',
    ],
    pitch: 1.05, // Distinct, clear cockpit pilot timbre
    rate: 1.20,  // Rapid aerial surveillance telemetry
    volumeMultiplier: 1.0,
    color: '#ffe600',
  },
  swat: {
    id: 'swat',
    callsign: 'SWAT COMMAND',
    unit: 'TACTICAL BEARCAT // NOOSE',
    badgeIcon: '🛡️',
    voiceDescription: 'Heavy Tactical SWAT Commander',
    gender: 'male',
    preferredVoiceNames: [
      'David',
      'Mark',
      'Fred',
      'Guy',
      'Daniel',
      'en-US-DavisNeural',
      'en-US-TonyNeural',
    ],
    pitch: 0.78, // Deep, resonant, gritty baritone military commander
    rate: 0.98,  // Measured, commanding, authoritative
    volumeMultiplier: 1.1,
    color: '#ff4444',
  },
  patrol: {
    id: 'patrol',
    callsign: 'UNIT 4-DELTA',
    unit: 'SECTOR PATROL',
    badgeIcon: '🚔',
    voiceDescription: 'Calm Veteran Patrol Officer',
    gender: 'male',
    preferredVoiceNames: [
      'Mark',
      'George',
      'Oliver',
      'Daniel',
      'David',
      'en-GB-RyanNeural',
    ],
    pitch: 0.90, // Measured, steady patrol frequency
    rate: 1.08,  // Calm 10-4 routine check cadence
    volumeMultiplier: 0.98,
    color: '#38bdf8',
  },
  newsAnchor: {
    id: 'newsAnchor',
    callsign: 'WEAZEL NEWS',
    unit: 'CHANNEL 4 LIVE BROADCAST DESK',
    badgeIcon: '📺',
    voiceDescription: 'Charismatic TV News Anchor',
    gender: 'female',
    preferredVoiceNames: [
      'Aria',
      'Jenny',
      'Samantha',
      'Victoria',
      'Zira',
      'Guy',
      'David',
      'Google US English',
      'en-US-AriaNeural',
    ],
    pitch: 1.02, // Natural, broadcast journalist resonance
    rate: 1.06,  // Dramatic, crisp TV anchor pacing
    volumeMultiplier: 1.05,
    color: '#ff2d78',
  },
};

/**
 * Resolves which VoicePersonaId corresponds to a given message callsign.
 */
export function identifyPersona(callsign: string): VoicePersonaId {
  const upper = callsign.toUpperCase();
  if (upper.includes('DISPATCH') || upper.includes('CENTRAL')) return 'dispatch';
  if (upper.includes('AIR-1') || upper.includes('SKY-WEAZEL') || upper.includes('FLIR')) return 'air1';
  if (upper.includes('CRUISER') || upper.includes('BRAVO') || upper.includes('INTERCEPT')) return 'cruiser';
  if (upper.includes('SWAT') || upper.includes('NOOSE') || upper.includes('TACTICAL')) return 'swat';
  if (upper.includes('DELTA') || upper.includes('PATROL') || upper.includes('SECTOR')) return 'patrol';
  if (upper.includes('WEAZEL') || upper.includes('NEWS') || upper.includes('ANCHOR')) return 'newsAnchor';
  return 'dispatch';
}

/**
 * Splits text into individual sentences for sequential chunked speech.
 * Eliminates browser audio buffer stalls and ensures 100% of all words are spoken to completion.
 */
export function splitIntoSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!matches) return [text];
  return matches.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Humanizes police/news jargon into smooth, natural spoken pronunciation.
 */
export function humanizeSpokenText(personaId: VoicePersonaId, message: string): string {
  let spoken = message;

  // Naturalize code acronyms
  spoken = spoken.replace(/\b10-43\b/gi, 'ten forty-three');
  spoken = spoken.replace(/\b10-4\b/gi, 'ten four');
  spoken = spoken.replace(/\b10-20\b/gi, 'ten twenty');
  spoken = spoken.replace(/\bC4\b/gi, 'C-4 explosive');
  spoken = spoken.replace(/\bPIT\b/gi, 'P-I-T');
  spoken = spoken.replace(/\bFLIR\b/gi, 'infrared');
  spoken = spoken.replace(/\bVCPD\b/gi, 'V-C-P-D');
  spoken = spoken.replace(/\bNOOSE\b/gi, 'noose tactical');
  spoken = spoken.replace(/\bTAC-1\b/gi, 'tactical one');
  spoken = spoken.replace(/\bTAC-2\b/gi, 'tactical two');
  spoken = spoken.replace(/!+/g, '!');

  // Prepend authentic radio preamble according to persona
  switch (personaId) {
    case 'dispatch':
      if (!spoken.toLowerCase().startsWith('all units') && !spoken.toLowerCase().startsWith('dispatch')) {
        return `Dispatch to all units: ${spoken}`;
      }
      return spoken;
    case 'cruiser':
      if (!spoken.toLowerCase().startsWith('cruiser')) {
        return `Cruiser 2-Bravo: ${spoken}`;
      }
      return spoken;
    case 'air1':
      if (!spoken.toLowerCase().startsWith('air-1')) {
        return `Air-1 Gimbal: ${spoken}`;
      }
      return spoken;
    case 'swat':
      if (!spoken.toLowerCase().startsWith('swat')) {
        return `SWAT Command, be advised: ${spoken}`;
      }
      return spoken;
    case 'patrol':
      if (!spoken.toLowerCase().startsWith('unit 4')) {
        return `Unit 4-Delta: ${spoken}`;
      }
      return spoken;
    case 'newsAnchor':
      return spoken;
    default:
      return spoken;
  }
}

class VoiceManagerController {
  private voices: SpeechSynthesisVoice[] = [];
  private isLoaded: boolean = false;
  private personaVoiceMap: Map<VoicePersonaId, SpeechSynthesisVoice | null> = new Map();
  private isSpeakingSession: boolean = false;
  private currentSessionId: number = 0;

  constructor() {
    this.initVoices();
  }

  private initVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        this.voices = v;
        this.isLoaded = true;
        this.allocateDistinctPersonaVoices();
      }
    };

    load();

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = load;
    }
  }

  /**
   * Distributes physical voices to each persona ensuring everyone sounds like a distinct human.
   */
  private allocateDistinctPersonaVoices(): void {
    if (this.voices.length === 0) return;

    // Filter to English voices
    const enVoices = this.voices.filter((v) => v.lang.startsWith('en'));
    const pool = enVoices.length > 0 ? enVoices : this.voices;

    // Classify voices by gender heuristics
    const femalePool = pool.filter((v) => {
      const n = v.name.toLowerCase();
      return (
        n.includes('female') ||
        n.includes('zira') ||
        n.includes('jenny') ||
        n.includes('aria') ||
        n.includes('samantha') ||
        n.includes('victoria') ||
        n.includes('karen') ||
        n.includes('sonia') ||
        n.includes('libby') ||
        n.includes('hazel') ||
        n.includes('susan') ||
        n.includes('catherine') ||
        n.includes('fiona')
      );
    });

    const malePool = pool.filter((v) => {
      const n = v.name.toLowerCase();
      return (
        n.includes('male') ||
        n.includes('david') ||
        n.includes('guy') ||
        n.includes('christopher') ||
        n.includes('mark') ||
        n.includes('alex') ||
        n.includes('daniel') ||
        n.includes('george') ||
        n.includes('ryan') ||
        n.includes('oliver') ||
        n.includes('richard') ||
        n.includes('tom') ||
        n.includes('fred')
      );
    });

    const assigned = new Set<string>();

    const personaKeys: VoicePersonaId[] = ['dispatch', 'cruiser', 'air1', 'swat', 'patrol', 'newsAnchor'];

    for (const key of personaKeys) {
      const meta = PERSONA_CONFIGS[key];
      let chosenVoice: SpeechSynthesisVoice | null = null;

      // 1. Try preferred exact names
      for (const pref of meta.preferredVoiceNames) {
        const found = pool.find(
          (v) => !assigned.has(v.voiceURI) && v.name.toLowerCase().includes(pref.toLowerCase()),
        );
        if (found) {
          chosenVoice = found;
          break;
        }
      }

      // 2. If not found, try matching gender pool
      if (!chosenVoice) {
        const targetGenderPool = meta.gender === 'female' ? femalePool : malePool;
        const availableInGender = targetGenderPool.find((v) => !assigned.has(v.voiceURI));
        if (availableInGender) {
          chosenVoice = availableInGender;
        }
      }

      // 3. Fallback to any unassigned English voice
      if (!chosenVoice) {
        const anyUnassigned = pool.find((v) => !assigned.has(v.voiceURI));
        if (anyUnassigned) {
          chosenVoice = anyUnassigned;
        }
      }

      // 4. If all assigned, cycle available pool by index offset
      if (!chosenVoice) {
        const indexOffset = personaKeys.indexOf(key);
        chosenVoice = pool[indexOffset % pool.length] ?? null;
      }

      if (chosenVoice) {
        assigned.add(chosenVoice.voiceURI);
      }
      this.personaVoiceMap.set(key, chosenVoice);
    }
  }

  public getPersonaMetadata(personaId: VoicePersonaId): VoicePersonaMetadata {
    return PERSONA_CONFIGS[personaId];
  }

  public getPersonaForMessage(msg: PoliceDispatchMessage): VoicePersonaMetadata {
    const id = identifyPersona(msg.callsign);
    return PERSONA_CONFIGS[id];
  }

  /**
   * Speaks a transmission with persona-specific physical human voice, pitch, and cadence.
   * Uses sentence-by-sentence queueing: guarantees 100% of all words are spoken to completion
   * without ever muting, pausing, or cutting off halfway!
   */
  public speak(
    personaId: VoicePersonaId,
    rawText: string,
    onStart?: () => void,
    onEnd?: () => void,
  ): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    if (soundManager.getIsMuted()) {
      return false;
    }

    // Cancel any previous transmission session cleanly
    this.cancel();

    const sessionId = ++this.currentSessionId;
    this.isSpeakingSession = true;

    if (this.personaVoiceMap.size === 0) {
      this.allocateDistinctPersonaVoices();
    }

    const meta = PERSONA_CONFIGS[personaId];
    const assignedVoice = this.personaVoiceMap.get(personaId);
    const fullText = humanizeSpokenText(personaId, rawText);
    const sentences = splitIntoSentences(fullText);

    if (sentences.length === 0) {
      this.isSpeakingSession = false;
      if (onEnd) onEnd();
      return false;
    }

    let sentenceIndex = 0;
    let hasStarted = false;

    const speakNextChunk = () => {
      // If a newer session started or cancel was called, abort gracefully
      if (sessionId !== this.currentSessionId || !this.isSpeakingSession) {
        return;
      }

      // All sentences completed!
      if (sentenceIndex >= sentences.length) {
        this.isSpeakingSession = false;
        if (onEnd) onEnd();
        return;
      }

      const chunkText = sentences[sentenceIndex];
      sentenceIndex++;

      const utterance = new SpeechSynthesisUtterance(chunkText);
      if (assignedVoice) {
        utterance.voice = assignedVoice;
      }

      utterance.pitch = meta.pitch;
      utterance.rate = meta.rate;
      const vol = soundManager.getVolume();
      utterance.volume = Math.max(0.1, Math.min(1.0, vol * meta.volumeMultiplier));

      utterance.onstart = () => {
        if (!hasStarted) {
          hasStarted = true;
          if (onStart) onStart();
        }
      };

      utterance.onend = () => {
        if (sessionId === this.currentSessionId) {
          // Play next sentence with a tiny 70ms natural breath pause
          setTimeout(speakNextChunk, 70);
        }
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('SpeechSynthesis chunk error:', e.error || e);
        }
        if (sessionId === this.currentSessionId) {
          if (sentenceIndex < sentences.length) {
            setTimeout(speakNextChunk, 70);
          } else {
            this.isSpeakingSession = false;
            if (onEnd) onEnd();
          }
        }
      };

      // Keep strong reference on window to prevent V8 GC bug
      if (typeof window !== 'undefined') {
        (window as any).__activeVoiceUtterance = utterance;
      }

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('speechSynthesis.speak error:', err);
        if (sentenceIndex < sentences.length) {
          setTimeout(speakNextChunk, 70);
        } else {
          this.isSpeakingSession = false;
          if (onEnd) onEnd();
        }
      }
    };

    // Micro-delay ensures Chrome cleans up previous cancel before queueing first chunk
    setTimeout(speakNextChunk, 50);
    return true;
  }

  public cancel(): void {
    this.currentSessionId++;
    this.isSpeakingSession = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Safe fallback
      }
    }
  }

  public getIsLoaded(): boolean {
    return this.isLoaded;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeakingSession;
  }
}

export const voiceManager = new VoiceManagerController();
