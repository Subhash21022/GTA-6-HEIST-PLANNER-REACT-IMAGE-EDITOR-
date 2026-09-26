import { describe, it, expect } from 'vitest';
import { generateWantedDossier } from './wantedDossier';
import { TARGETS } from './targets';
import { CREW_MEMBERS } from './crew';
import { calculateWantedLevel } from './wantedLevel';
import { calculatePayout } from './payout';

describe('Wanted Dossier Generator', () => {
  const target = TARGETS[0]; // Sable Trust Bank
  const crew = CREW_MEMBERS.slice(0, 3);
  const customCrewPortraits: Record<string, string> = {};

  it('generates a complete criminal profile for subtle approach', () => {
    const wantedInfo = calculateWantedLevel('subtle', null, null, crew);
    const payout = calculatePayout(target, 'S', crew);

    const dossier = generateWantedDossier({
      codename: 'NEON SHADOW',
      target,
      approach: 'subtle',
      crew,
      customCrewPortraits,
      score: 95,
      grade: 'S',
      wantedInfo,
      payoutBreakdown: payout,
    });

    expect(dossier.caseFileNumber).toContain('VCPD-2026-');
    expect(dossier.codename).toBe('NEON SHADOW');
    expect(dossier.targetName).toBe(target.name);
    expect(dossier.suspects).toHaveLength(3);
    expect(dossier.bountyReward).toBeGreaterThan(0);
    expect(dossier.charges.some((c) => c.title.includes('CYBER TERRORISM'))).toBe(true);
    expect(dossier.charges.some((c) => c.title.includes('ARMED GRAND LARCENY'))).toBe(true);
  });

  it('generates military explosive charges for loud kinetic approach', () => {
    const wantedInfo = calculateWantedLevel('loud', null, null, crew);
    const payout = calculatePayout(target, 'A', crew);

    const dossier = generateWantedDossier({
      codename: 'THUNDER BLOW',
      target,
      approach: 'loud',
      crew,
      customCrewPortraits,
      score: 75,
      grade: 'A',
      wantedInfo,
      payoutBreakdown: payout,
    });

    expect(dossier.charges.some((c) => c.title.includes('HIGH EXPLOSIVES'))).toBe(true);
    expect(dossier.charges.some((c) => c.severity === 'CAPITAL FELONY')).toBe(true);
  });

  it('scales bounty reward higher as wanted level stars and loot increase', () => {
    const lowWanted = { stars: 1, title: 'UNDETECTED', statusText: '', threatLevel: 'LOW' as const, dispatchAgency: 'VCPD', color: '#fff', glowColor: '#fff' };
    const maxWanted = { stars: 5, title: 'MAXIMUM PURSUIT', statusText: '', threatLevel: 'MAXIMUM' as const, dispatchAgency: 'SWAT', color: '#f00', glowColor: '#f00' };

    const lowPayout = calculatePayout(target, 'C', crew);
    const highPayout = calculatePayout(target, 'S', crew);

    const dossier1 = generateWantedDossier({
      codename: 'OPERATION A',
      target,
      approach: 'subtle',
      crew,
      customCrewPortraits,
      score: 50,
      grade: 'C',
      wantedInfo: lowWanted,
      payoutBreakdown: lowPayout,
    });

    const dossier5 = generateWantedDossier({
      codename: 'OPERATION A',
      target,
      approach: 'loud',
      crew,
      customCrewPortraits,
      score: 100,
      grade: 'S',
      wantedInfo: maxWanted,
      payoutBreakdown: highPayout,
    });

    expect(dossier5.bountyReward).toBeGreaterThan(dossier1.bountyReward);
    expect(dossier5.charges.some((c) => c.title.includes('FELONY VEHICULAR EVASION'))).toBe(true);
  });
});
