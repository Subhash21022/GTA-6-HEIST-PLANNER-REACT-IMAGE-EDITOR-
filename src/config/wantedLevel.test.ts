import { describe, it, expect } from 'vitest';
import { calculateWantedLevel, getPoliceDispatchPool } from './wantedLevel';
import { CREW_MEMBERS } from './crew';
import type { AnalysisResult } from '../analysis/scoring';

function makeMockResult(crossings: { hazardId: string; hazardLabel: string; pathIndex: number }[], score = 90): AnalysisResult {
  return {
    score,
    grade: 'A',
    approved: true,
    take: '$1,000,000',
    findings: [],
    path: [[0, 0], [1, 1]],
    crossings,
    connectivity: { entryReached: true, exitReached: true, vaultReached: true, entryId: 'E1', exitId: 'X1', path: [], reason: 'Plan complete' },
    routeLength: 10,
  };
}

describe('calculateWantedLevel', () => {
  const hacker = CREW_MEMBERS.find((c) => c.modifierId === 'hacker')!;
  const muscle = CREW_MEMBERS.find((c) => c.modifierId === 'muscle')!;

  it('assigns 1 Star for Subtle approach with zero camera or guard crossings', () => {
    const infil = makeMockResult([]);
    const getaway = makeMockResult([]);
    const wanted = calculateWantedLevel('subtle', infil, getaway, []);

    expect(wanted.stars).toBe(1);
    expect(wanted.threatLevel).toBe('LOW');
    expect(wanted.title).toContain('1 STAR');
    expect(wanted.statusText).toContain('GHOST OPERATOR');
  });

  it('assigns 2 Stars for Subtle approach with 1-2 camera detections', () => {
    const infil = makeMockResult([
      { hazardId: 'cam-01', hazardLabel: 'Camera 01', pathIndex: 5 },
    ]);
    const getaway = makeMockResult([]);
    const wanted = calculateWantedLevel('subtle', infil, getaway, []);

    expect(wanted.stars).toBe(2);
    expect(wanted.threatLevel).toBe('MEDIUM');
    expect(wanted.title).toContain('2 STARS');
  });

  it('assigns 3 Stars for Subtle approach with guard alerts or many cameras', () => {
    const infil = makeMockResult([
      { hazardId: 'patrol-01', hazardLabel: 'Patrol Guard A', pathIndex: 4 },
    ]);
    const getaway = makeMockResult([]);
    const wanted = calculateWantedLevel('subtle', infil, getaway, []);

    expect(wanted.stars).toBe(3);
    expect(wanted.threatLevel).toBe('HIGH');
  });

  it('nullifies camera detections if Hacker crew member is equipped', () => {
    const infil = makeMockResult([
      { hazardId: 'cam-01', hazardLabel: 'Camera 01', pathIndex: 5 },
    ]);
    const getaway = makeMockResult([]);
    const wantedWithHacker = calculateWantedLevel('subtle', infil, getaway, [hacker]);

    expect(wantedWithHacker.stars).toBe(1);
  });

  it('nullifies guard alerts if Muscle crew member is equipped', () => {
    const infil = makeMockResult([
      { hazardId: 'patrol-01', hazardLabel: 'Patrol Guard A', pathIndex: 4 },
    ]);
    const getaway = makeMockResult([]);
    const wantedWithMuscle = calculateWantedLevel('subtle', infil, getaway, [muscle]);

    expect(wantedWithMuscle.stars).toBe(1);
  });

  it('assigns 4 Stars for Loud C4 approach by default', () => {
    const infil = makeMockResult([]);
    const getaway = makeMockResult([], 95);
    const wanted = calculateWantedLevel('loud', infil, getaway, []);

    expect(wanted.stars).toBe(4);
    expect(wanted.threatLevel).toBe('EXTREME');
    expect(wanted.title).toContain('4 STARS');
  });

  it('escalates to 5 Stars Maximum Tactical Manhunt if roadblocks hit or getaway score drops', () => {
    const infil = makeMockResult([]);
    const getaway = makeMockResult([
      { hazardId: 'rb-01', hazardLabel: 'VCPD Roadblock', pathIndex: 3 },
      { hazardId: 'rb-02', hazardLabel: 'Spike Strip Checkpoint', pathIndex: 7 },
    ], 70);
    const wanted = calculateWantedLevel('loud', infil, getaway, []);

    expect(wanted.stars).toBe(5);
    expect(wanted.threatLevel).toBe('MAXIMUM');
    expect(wanted.title).toContain('5 STARS');
  });
});

describe('getPoliceDispatchPool', () => {
  it('returns appropriate dispatches for subtle approach', () => {
    const pool = getPoliceDispatchPool('VICE CITY EXCHANGE', 'subtle', 1);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool[0].channel).toBeDefined();
    expect(pool[0].callsign).toBeDefined();
    expect(pool[0].message).toContain('VICE CITY EXCHANGE');
  });

  it('returns tactical SWAT and PIT authorization dispatches for loud 5-star approach', () => {
    const pool = getPoliceDispatchPool('OCEAN BANK VAULT', 'loud', 5);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.some((msg) => msg.callsign.includes('DISPATCH') || msg.callsign.includes('AIR-1'))).toBe(true);
  });
});
