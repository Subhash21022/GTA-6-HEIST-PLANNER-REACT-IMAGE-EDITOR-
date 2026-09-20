export const ANALYSIS = {
  cellSize: 10,
  changeThreshold: 30,
  inkFraction: 0.15,
  dilationRadius: 1,
  patrolBufferCells: 3,
  vaultReachRadius: 5,
} as const;

export const SCORING_WEIGHTS = {
  completeness: 60,
  stealth: 30,
  efficiency: 10,
} as const;

export const HAZARD_PENALTY = {
  camera: 8,
  patrol: 6,
  roadblock: 10,
} as const;

export type CrewModifierId =
  | 'hacker'
  | 'safecracker'
  | 'insideMan'
  | 'driver'
  | 'muscle'
  | 'face';

export interface CrewModifier {
  id: CrewModifierId;
  description: string;
  apply: (context: ModifierContext) => ModifierContext;
}

export interface ModifierContext {
  cameraCrossings: number;
  patrolCrossings: number;
  roadblockCrossings: number;
  vaultReachRadius: number;
  hazardPenaltyReduction: number;
}

export const CREW_MODIFIERS: Record<CrewModifierId, CrewModifier> = {
  hacker: {
    id: 'hacker',
    description: 'Neutralises up to 2 camera exposures',
    apply: (ctx) => ({ ...ctx, cameraCrossings: Math.max(0, ctx.cameraCrossings - 2) }),
  },
  safecracker: {
    id: 'safecracker',
    description: 'Widens vault detection radius',
    apply: (ctx) => ({ ...ctx, vaultReachRadius: ctx.vaultReachRadius + 4 }),
  },
  insideMan: {
    id: 'insideMan',
    description: 'Reduces patrol crossing penalties by half',
    apply: (ctx) => ({
      ...ctx,
      patrolCrossings: Math.ceil(ctx.patrolCrossings / 2),
    }),
  },
  driver: {
    id: 'driver',
    description: 'Reduces roadblock penalties by half',
    apply: (ctx) => ({
      ...ctx,
      roadblockCrossings: Math.ceil(ctx.roadblockCrossings / 2),
    }),
  },
  muscle: {
    id: 'muscle',
    description: 'Ignores first patrol crossing',
    apply: (ctx) => ({
      ...ctx,
      patrolCrossings: Math.max(0, ctx.patrolCrossings - 1),
    }),
  },
  face: {
    id: 'face',
    description: 'Removes penalty for one hazard of any type',
    apply: (ctx) => ({ ...ctx, hazardPenaltyReduction: ctx.hazardPenaltyReduction + 1 }),
  },
} as const;

export function letterGrade(score: number): string {
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

export function estimatedTake(score: number, baseTake: number): string {
  const multiplier = score / 100;
  const take = Math.round(baseTake * multiplier);
  return `$${take.toLocaleString('en-US')}`;
}

export function isApproved(grade: string): boolean {
  return grade === 'S' || grade === 'A' || grade === 'B';
}
