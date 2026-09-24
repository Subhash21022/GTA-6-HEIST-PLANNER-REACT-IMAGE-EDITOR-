import { describe, it, expect } from 'vitest';
import {
  identifyPersona,
  humanizeSpokenText,
  splitIntoSentences,
  PERSONA_CONFIGS,
  type VoicePersonaId,
} from './voiceManager';

describe('Voice Manager Persona Engine', () => {
  describe('identifyPersona', () => {
    it('identifies VCPD Dispatch', () => {
      expect(identifyPersona('VCPD DISPATCH')).toBe('dispatch');
      expect(identifyPersona('CENTRAL 10')).toBe('dispatch');
    });

    it('identifies Sky-Weazel Air-1', () => {
      expect(identifyPersona('AIR-1 FLIR')).toBe('air1');
      expect(identifyPersona('SKY-WEAZEL GIMBAL')).toBe('air1');
    });

    it('identifies Pursuit Cruiser 2-Bravo', () => {
      expect(identifyPersona('CRUISER 2-BRAVO')).toBe('cruiser');
      expect(identifyPersona('PURSUIT INTERCEPT')).toBe('cruiser');
    });

    it('identifies SWAT Command Bearcat', () => {
      expect(identifyPersona('SWAT COMMAND')).toBe('swat');
      expect(identifyPersona('NOOSE TACTICAL')).toBe('swat');
    });

    it('identifies Unit 4-Delta Patrol', () => {
      expect(identifyPersona('UNIT 4-DELTA')).toBe('patrol');
      expect(identifyPersona('SECTOR PATROL')).toBe('patrol');
    });

    it('identifies Weazel News Anchor', () => {
      expect(identifyPersona('WEAZEL NEWS')).toBe('newsAnchor');
      expect(identifyPersona('CHANNEL 4 ANCHOR DESK')).toBe('newsAnchor');
    });

    it('falls back to dispatch for unknown callsign', () => {
      expect(identifyPersona('UNKNOWN UNIT')).toBe('dispatch');
    });
  });

  describe('splitIntoSentences', () => {
    it('splits long paragraph into discrete sentences by punctuation', () => {
      const paragraph =
        'Weazel News special report! Armed mayhem in Vice City as a heavily armed crew hits VILLA AURELIA! SWAT Bearcats and interceptors have sealed perimeter routes as Sky-Weazel 4 tracks the escape live!';
      const sentences = splitIntoSentences(paragraph);

      expect(sentences).toHaveLength(3);
      expect(sentences[0]).toBe('Weazel News special report!');
      expect(sentences[1]).toBe('Armed mayhem in Vice City as a heavily armed crew hits VILLA AURELIA!');
      expect(sentences[2]).toBe(
        'SWAT Bearcats and interceptors have sealed perimeter routes as Sky-Weazel 4 tracks the escape live!',
      );
    });

    it('handles single sentence without breaking', () => {
      const single = 'PIT maneuver authorized!';
      const sentences = splitIntoSentences(single);
      expect(sentences).toHaveLength(1);
      expect(sentences[0]).toBe('PIT maneuver authorized!');
    });

    it('handles sentences with periods', () => {
      const text = 'Silent alarm trip reported at Sable Trust Bank. Nearby patrol units investigate code 2.';
      const sentences = splitIntoSentences(text);
      expect(sentences).toHaveLength(2);
      expect(sentences[0]).toBe('Silent alarm trip reported at Sable Trust Bank.');
      expect(sentences[1]).toBe('Nearby patrol units investigate code 2.');
    });
  });

  describe('humanizeSpokenText', () => {
    it('naturalizes radio codes and explosives', () => {
      const raw = 'Suspect armed with C4 detonator, 10-43 in progress!';
      const humanized = humanizeSpokenText('dispatch', raw);

      expect(humanized).toContain('C-4 explosive');
      expect(humanized).toContain('ten forty-three');
    });

    it('formats police dispatch preambles for authentic human speech', () => {
      const msg = 'Investigate silent alarm at Sable Trust.';
      const spoken = humanizeSpokenText('dispatch', msg);
      expect(spoken).toContain('Dispatch to all units:');
    });

    it('formats pursuit cruiser callouts', () => {
      const msg = 'Suspect refusing to yield!';
      const spoken = humanizeSpokenText('cruiser', msg);
      expect(spoken).toContain('Cruiser 2-Bravo:');
    });

    it('formats swat tactical commands', () => {
      const msg = 'Deploy spike strips!';
      const spoken = humanizeSpokenText('swat', msg);
      expect(spoken).toContain('SWAT Command, be advised:');
    });
  });

  describe('PERSONA_CONFIGS Differentiations', () => {
    const ids: VoicePersonaId[] = ['dispatch', 'cruiser', 'air1', 'swat', 'patrol', 'newsAnchor'];

    it('defines distinct configurations for each persona', () => {
      ids.forEach((id) => {
        const meta = PERSONA_CONFIGS[id];
        expect(meta).toBeDefined();
        expect(meta.callsign).toBeTruthy();
        expect(meta.voiceDescription).toBeTruthy();
        expect(meta.pitch).toBeGreaterThan(0.5);
        expect(meta.rate).toBeGreaterThan(0.8);
      });
    });

    it('assigns deep voice pitch to SWAT commander', () => {
      expect(PERSONA_CONFIGS.swat.pitch).toBeLessThan(0.85);
    });

    it('assigns high female pitch to police dispatcher', () => {
      expect(PERSONA_CONFIGS.dispatch.pitch).toBeGreaterThan(1.1);
      expect(PERSONA_CONFIGS.dispatch.gender).toBe('female');
    });

    it('assigns rapid breathless pursuit rate to cruiser cop', () => {
      expect(PERSONA_CONFIGS.cruiser.rate).toBeGreaterThanOrEqual(1.20);
    });
  });
});
