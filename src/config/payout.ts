import type { CrewMember } from './crew';
import type { Target } from './targets';

export const CREW_DEFAULT_CUT_PERCENT: Record<string, number> = {
  hacker: 12,
  safecracker: 10,
  insideMan: 9,
  driver: 8,
  sniper: 8,
  muscle: 7,
};

export const SYNDICATE_CUT_PERCENT = 10; // Fixed 10% fence fee for Cayman / Leonida money laundering

export interface CrewPayoutCut {
  crewId: string;
  name: string;
  role: string;
  avatar: string;
  percent: number;
  amount: number;
}

export interface HeistPayoutBreakdown {
  targetName: string;
  potentialVaultTake: number;
  grade: string;
  gradeMultiplier: number;
  gradeEfficiencyPct: number;
  actualGrossTake: number;
  syndicatePercent: number;
  syndicateAmount: number;
  crewCuts: CrewPayoutCut[];
  totalCrewPercent: number;
  totalCrewAmount: number;
  playerCutPercent: number;
  playerNetTake: number;
}

export function getGradeMultiplier(grade: string): number {
  switch (grade.toUpperCase()) {
    case 'S':
      return 1.0; // 100% recovery
    case 'A':
      return 0.9; // 90% recovery
    case 'B':
      return 0.75; // 75% recovery
    case 'C':
      return 0.6; // 60% recovery
    case 'D':
      return 0.45; // 45% recovery
    case 'F':
    default:
      return 0.3; // 30% recovery (compromised alarm penalty)
  }
}

export function formatCurrency(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('en-US');
}

/**
 * Calculates the complete loot distribution and financial breakdown.
 */
export function calculatePayout(
  target: Target | null,
  grade: string,
  crew: CrewMember[] = [],
  customCuts: Record<string, number> = {},
): HeistPayoutBreakdown {
  const targetName = target?.name || 'TARGET FACILITY';
  const potentialVaultTake = target?.baseTake || 2_500_000;
  const gradeMultiplier = getGradeMultiplier(grade);
  const gradeEfficiencyPct = Math.round(gradeMultiplier * 100);
  const actualGrossTake = Math.round(potentialVaultTake * gradeMultiplier);

  // Syndicate fence cut
  const syndicatePercent = SYNDICATE_CUT_PERCENT;
  const syndicateAmount = Math.round(actualGrossTake * (syndicatePercent / 100));

  // Itemized crew cuts
  const crewCuts: CrewPayoutCut[] = crew.map((member) => {
    const defaultPct = CREW_DEFAULT_CUT_PERCENT[member.modifierId] ?? 8;
    const percent = customCuts[member.id] !== undefined ? customCuts[member.id] : defaultPct;
    const amount = Math.round(actualGrossTake * (percent / 100));

    return {
      crewId: member.id,
      name: member.name,
      role: member.role,
      avatar: member.portrait,
      percent,
      amount,
    };
  });

  const totalCrewPercent = crewCuts.reduce((sum, c) => sum + c.percent, 0);
  const totalCrewAmount = crewCuts.reduce((sum, c) => sum + c.amount, 0);

  // Remaining loot goes to player / mastermind
  const playerCutPercent = Math.max(0, 100 - syndicatePercent - totalCrewPercent);
  const playerNetTake = Math.max(0, actualGrossTake - syndicateAmount - totalCrewAmount);

  return {
    targetName,
    potentialVaultTake,
    grade,
    gradeMultiplier,
    gradeEfficiencyPct,
    actualGrossTake,
    syndicatePercent,
    syndicateAmount,
    crewCuts,
    totalCrewPercent,
    totalCrewAmount,
    playerCutPercent,
    playerNetTake,
  };
}
