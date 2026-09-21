import { SCORING_WEIGHTS, HAZARD_PENALTY, CREW_MODIFIERS, letterGrade, estimatedTake, isApproved, ANALYSIS } from '../config/scoring';
import type { CrewModifierId, ModifierContext } from '../config/scoring';
import type { ConnectivityResult } from './connectivity';
import type { HazardCrossing } from './hazards';

export interface Finding {
  message: string;
  type: 'success' | 'warning' | 'error';
}

export interface AnalysisResult {
  score: number;
  grade: string;
  approved: boolean;
  take: string;
  findings: Finding[];
  path: [number, number][];
  crossings: HazardCrossing[];
  connectivity: ConnectivityResult;
  routeLength: number;
}

export function computeScore(
  connectivity: ConnectivityResult,
  crossings: HazardCrossing[],
  crewModifierIds: CrewModifierId[],
  parLength: number,
  baseTake: number,
  isGetaway: boolean,
  approach: 'subtle' | 'loud' = 'subtle',
): AnalysisResult {
  const findings: Finding[] = [];

  let completenessScore = 0;
  if (connectivity.entryReached) {
    completenessScore += 30;
    findings.push({
      message: isGetaway ? 'Route starts from the target' : `Route enters via ${connectivity.entryId}`,
      type: 'success',
    });
  } else {
    findings.push({
      message: isGetaway ? 'Route does not reach the start' : 'Route does not reach any entry',
      type: 'error',
    });
  }

  if (connectivity.vaultReached) {
    completenessScore += 40;
    findings.push({
      message: isGetaway ? 'Route reaches the safehouse' : 'Route reaches the vault',
      type: 'success',
    });
  } else if (connectivity.entryReached) {
    findings.push({
      message: isGetaway ? 'Route does not reach the safehouse' : 'Route does not reach the vault',
      type: 'error',
    });
  }

  if (connectivity.exitReached) {
    completenessScore += 30;
    findings.push({
      message: isGetaway ? 'Escape complete' : `Route exits via ${connectivity.exitId}`,
      type: 'success',
    });
  } else if (connectivity.vaultReached) {
    findings.push({
      message: isGetaway ? 'No clear escape' : 'Route has no exit path',
      type: 'warning',
    });
  }

  let cameraCrossings = 0;
  let patrolCrossings = 0;
  let roadblockCrossings = 0;

  for (const c of crossings) {
    if (c.hazardId.startsWith('C')) cameraCrossings++;
    else if (c.hazardId.startsWith('P')) patrolCrossings++;
    else if (c.hazardId.startsWith('RB')) roadblockCrossings++;
    else cameraCrossings++;
  }

  let modCtx: ModifierContext = {
    cameraCrossings,
    patrolCrossings,
    roadblockCrossings,
    vaultReachRadius: ANALYSIS.vaultReachRadius,
    hazardPenaltyReduction: 0,
  };

  for (const modId of crewModifierIds) {
    const mod = CREW_MODIFIERS[modId];
    if (mod) modCtx = mod.apply(modCtx);
  }

  const effectiveCameras = modCtx.cameraCrossings;
  const effectivePatrols = modCtx.patrolCrossings;
  const effectiveRoadblocks = modCtx.roadblockCrossings;

  let totalHazardPenalty = 0;

  if (approach === 'loud' && !isGetaway) {
    // In Loud Infiltration, cameras are disregarded (alarms triggered by breach)
    // Patrol / SWAT chokepoint confrontations are the primary hazard
    totalHazardPenalty = effectivePatrols * (HAZARD_PENALTY.patrol * 1.5);
  } else {
    // Subtle Infiltration or Getaway: cameras and patrols strictly enforced
    totalHazardPenalty =
      effectiveCameras * HAZARD_PENALTY.camera +
      effectivePatrols * HAZARD_PENALTY.patrol +
      effectiveRoadblocks * HAZARD_PENALTY.roadblock;
  }

  if (modCtx.hazardPenaltyReduction > 0) {
    const penalties = [
      ...Array<number>(effectiveCameras).fill(HAZARD_PENALTY.camera),
      ...Array<number>(effectivePatrols).fill(HAZARD_PENALTY.patrol),
      ...Array<number>(effectiveRoadblocks).fill(HAZARD_PENALTY.roadblock),
    ].sort((a, b) => b - a);

    let removed = 0;
    for (let i = 0; i < Math.min(modCtx.hazardPenaltyReduction, penalties.length); i++) {
      removed += penalties[i];
    }
    totalHazardPenalty = Math.max(0, totalHazardPenalty - removed);
  }

  const stealthScore = Math.max(0, 100 - totalHazardPenalty);

  for (const c of crossings) {
    const isCam = c.hazardId.startsWith('C');
    if (approach === 'loud' && !isGetaway && isCam) {
      findings.push({
        message: `${c.hazardLabel}: camera ignored during loud breach assault`,
        type: 'warning',
      });
      continue;
    }

    const reduced =
      (isCam && effectiveCameras < cameraCrossings) ||
      (c.hazardId.startsWith('P') && effectivePatrols < patrolCrossings) ||
      (c.hazardId.startsWith('RB') && effectiveRoadblocks < roadblockCrossings);
    findings.push({
      message: `${c.hazardLabel}: exposure${reduced ? ' (mitigated by crew)' : ''}`,
      type: reduced ? 'warning' : 'error',
    });
  }

  // Bonus findings for approach execution
  if (approach === 'subtle' && !isGetaway && cameraCrossings === 0 && patrolCrossings === 0 && connectivity.vaultReached) {
    findings.unshift({
      message: '★ GHOST OPERATOR: Zero alarms or surveillance exposures tripped!',
      type: 'success',
    });
  } else if (approach === 'loud' && !isGetaway && connectivity.vaultReached && connectivity.exitReached) {
    findings.unshift({
      message: '★ KINETIC BREACH: Explosive penetration and rapid vault extraction!',
      type: 'success',
    });
  }

  const routeLength = connectivity.path.length;
  const efficiencyRatio = parLength > 0 ? Math.min(1, parLength / Math.max(routeLength, 1)) : 1;
  const efficiencyScore = efficiencyRatio * 100;

  // Approach-weighted composite score
  let rawScore = 0;
  if (approach === 'loud' && !isGetaway) {
    // Loud: 55% Completeness, 20% SWAT Suppression, 25% Speed/Efficiency
    rawScore =
      (completenessScore / 100) * 55 +
      (stealthScore / 100) * 20 +
      (efficiencyScore / 100) * 25;
  } else {
    // Subtle: 60% Completeness, 30% Stealth, 10% Efficiency
    rawScore =
      (completenessScore / 100) * SCORING_WEIGHTS.completeness +
      (stealthScore / 100) * SCORING_WEIGHTS.stealth +
      (efficiencyScore / 100) * SCORING_WEIGHTS.efficiency;
  }

  const score = Math.round(Math.max(0, Math.min(100, rawScore)));
  const grade = letterGrade(score);

  return {
    score,
    grade,
    approved: isApproved(grade),
    take: estimatedTake(score, baseTake),
    findings,
    path: connectivity.path,
    crossings,
    connectivity,
    routeLength,
  };
}
