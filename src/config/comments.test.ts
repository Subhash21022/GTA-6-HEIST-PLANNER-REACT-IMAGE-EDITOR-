import { describe, it, expect } from 'vitest';
import { getViralComments, generateViralPostMetadata } from './comments';
import { CREW_MEMBERS } from './crew';

describe('getViralComments', () => {
  it('generates comments tailored for loud approach', () => {
    const comments = getViralComments('loud', [], 'OCEAN BANK');
    expect(comments.length).toBeGreaterThan(3);
    expect(comments.some((c) => c.text.includes('cop cars') || c.text.includes('muscle car'))).toBe(true);
  });

  it('generates comments tailored for subtle ghost approach', () => {
    const comments = getViralComments('subtle', [], 'CORAL CASINO');
    expect(comments.length).toBeGreaterThan(3);
    expect(comments.some((c) => c.text.includes('vault') || c.text.includes('alarms'))).toBe(true);
  });

  it('includes hacker crew shoutout when hacker specialist is on the crew', () => {
    const hacker = CREW_MEMBERS.find((c) => c.modifierId === 'hacker')!;
    const comments = getViralComments('loud', [hacker], 'OCEAN BANK');
    expect(comments.some((c) => c.text.includes('traffic light') || c.text.includes('grid'))).toBe(true);
  });

  it('includes driver crew shoutout when driver specialist is on the crew', () => {
    const driver = CREW_MEMBERS.find((c) => c.modifierId === 'driver')!;
    const comments = getViralComments('loud', [driver], 'OCEAN BANK');
    expect(comments.some((c) => c.text.includes('drift') || c.text.includes('counter-steer'))).toBe(true);
  });
});

describe('generateViralPostMetadata', () => {
  it('creates viral social reel metadata with appropriate platform and hashtags', () => {
    const meta = generateViralPostMetadata('OCEAN DRIVE JEWELRY', 'loud', [], 92);
    expect(meta.platform).toBe('ViceGram');
    expect(meta.authorHandle).toContain('@');
    expect(meta.hashtags).toContain('#GTA6');
    expect(meta.initialLikes).toBeGreaterThan(100000);
  });
});
