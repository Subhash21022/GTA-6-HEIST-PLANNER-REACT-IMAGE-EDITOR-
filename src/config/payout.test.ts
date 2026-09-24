import { describe, it, expect } from 'vitest';
import {
  calculatePayout,
  formatCurrency,
  getGradeMultiplier,
  CREW_DEFAULT_CUT_PERCENT,
  SYNDICATE_CUT_PERCENT,
} from './payout';
import { CREW_MEMBERS } from './crew';
import { TARGETS } from './targets';

describe('Payout Calculation Engine', () => {
  const mockTarget = TARGETS[0]; // Sable Trust Bank (baseTake: 2,400,000)
  // Zara (hacker: 12%), Rico (driver: 8%)
  const mockCrew = [CREW_MEMBERS[1], CREW_MEMBERS[0]];

  describe('getGradeMultiplier', () => {
    it('returns 1.0 for S-rank', () => {
      expect(getGradeMultiplier('S')).toBe(1.0);
    });

    it('returns 0.9 for A-rank', () => {
      expect(getGradeMultiplier('A')).toBe(0.9);
    });

    it('returns 0.75 for B-rank', () => {
      expect(getGradeMultiplier('B')).toBe(0.75);
    });

    it('returns 0.6 for C-rank', () => {
      expect(getGradeMultiplier('C')).toBe(0.6);
    });

    it('returns 0.45 for D-rank', () => {
      expect(getGradeMultiplier('D')).toBe(0.45);
    });

    it('returns 0.3 for F-rank or unknown rank', () => {
      expect(getGradeMultiplier('F')).toBe(0.3);
      expect(getGradeMultiplier('UNKNOWN')).toBe(0.3);
    });
  });

  describe('formatCurrency', () => {
    it('formats dollar amount with commas', () => {
      expect(formatCurrency(2400000)).toBe('$2,400,000');
      expect(formatCurrency(152345.67)).toBe('$152,346');
    });
  });

  describe('calculatePayout', () => {
    it('calculates full loot for S-rank with default cuts', () => {
      const breakdown = calculatePayout(mockTarget, 'S', mockCrew);

      expect(breakdown.potentialVaultTake).toBe(2_400_000);
      expect(breakdown.actualGrossTake).toBe(2_400_000);
      expect(breakdown.gradeEfficiencyPct).toBe(100);

      // Syndicate cut: 10% of 2,400,000 = 240,000
      expect(breakdown.syndicatePercent).toBe(SYNDICATE_CUT_PERCENT);
      expect(breakdown.syndicateAmount).toBe(240_000);

      // Zara (hacker: 12% = 288,000)
      // Rico (driver: 8% = 192,000)
      expect(breakdown.crewCuts).toHaveLength(2);
      expect(breakdown.crewCuts[0].percent).toBe(CREW_DEFAULT_CUT_PERCENT.hacker);
      expect(breakdown.crewCuts[0].amount).toBe(288_000);
      expect(breakdown.crewCuts[1].percent).toBe(CREW_DEFAULT_CUT_PERCENT.driver);
      expect(breakdown.crewCuts[1].amount).toBe(192_000);

      expect(breakdown.totalCrewPercent).toBe(20);
      expect(breakdown.totalCrewAmount).toBe(480_000);

      // Player take: 100% - 10% - 20% = 70%
      // Player net take: 2,400,000 - 240,000 - 480,000 = 1,680,000
      expect(breakdown.playerCutPercent).toBe(70);
      expect(breakdown.playerNetTake).toBe(1_680_000);
    });

    it('calculates penalized take for B-rank (75%)', () => {
      const breakdown = calculatePayout(mockTarget, 'B', mockCrew);

      expect(breakdown.potentialVaultTake).toBe(2_400_000);
      expect(breakdown.actualGrossTake).toBe(1_800_000); // 75% of 2.4M
      expect(breakdown.gradeEfficiencyPct).toBe(75);

      // Syndicate: 10% of 1,800,000 = 180,000
      expect(breakdown.syndicateAmount).toBe(180_000);

      // Total crew cuts: 20% of 1,800,000 = 360,000
      expect(breakdown.totalCrewAmount).toBe(360_000);

      // Player net: 1,800,000 - 180,000 - 360,000 = 1,260,000
      expect(breakdown.playerNetTake).toBe(1_260_000);
    });

    it('respects custom crew cut adjustments', () => {
      const customCuts = {
        'zara': 15, // boosted from 12% to 15%
        'rico': 5,  // reduced from 8% to 5%
      };
      const breakdown = calculatePayout(mockTarget, 'S', mockCrew, customCuts);

      expect(breakdown.crewCuts[0].percent).toBe(15);
      expect(breakdown.crewCuts[0].amount).toBe(360_000);
      expect(breakdown.crewCuts[1].percent).toBe(5);
      expect(breakdown.crewCuts[1].amount).toBe(120_000);

      expect(breakdown.totalCrewPercent).toBe(20);
      expect(breakdown.playerCutPercent).toBe(70);
      expect(breakdown.playerNetTake).toBe(1_680_000);
    });

    it('handles fallback when target is null', () => {
      const breakdown = calculatePayout(null, 'S', []);

      expect(breakdown.targetName).toBe('TARGET FACILITY');
      expect(breakdown.potentialVaultTake).toBe(2_500_000);
      expect(breakdown.actualGrossTake).toBe(2_500_000);
      expect(breakdown.crewCuts).toHaveLength(0);
      expect(breakdown.totalCrewAmount).toBe(0);
      expect(breakdown.syndicateAmount).toBe(250_000);
      expect(breakdown.playerNetTake).toBe(2_250_000);
      expect(breakdown.playerCutPercent).toBe(90);
    });
  });
});
