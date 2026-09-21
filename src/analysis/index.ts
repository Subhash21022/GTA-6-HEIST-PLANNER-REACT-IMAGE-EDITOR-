import { detectInk } from './ink';
import { dilate } from './grid';
import { analyseConnectivity, analyseGetawayConnectivity } from './connectivity';
import { buildHazardGrids, buildRoadblockGrids, detectCrossings } from './hazards';
import { computeScore, type AnalysisResult } from './scoring';
import type { TargetLayout, GetawayLayout } from '../config/targets';
import type { CrewModifierId } from '../config/scoring';
import { ANALYSIS } from '../config/scoring';

export type { AnalysisResult } from './scoring';

export function analyseInfiltration(
  baseData: Uint8ClampedArray,
  editedData: Uint8ClampedArray,
  layout: TargetLayout,
  crewModifierIds: CrewModifierId[],
  approach: 'subtle' | 'loud' = 'subtle',
): AnalysisResult {
  const inkGrid = detectInk(baseData, editedData, layout.canvasWidth, layout.canvasHeight);
  const dilated = dilate(inkGrid);

  const vaultRadius = ANALYSIS.vaultReachRadius +
    (crewModifierIds.includes('safecracker') ? 4 : 0);

  const connectivity = analyseConnectivity(
    dilated,
    layout.entries,
    layout.vault,
    layout.exits,
    vaultRadius,
  );

  const hazardGrids = buildHazardGrids(
    layout.cameras,
    layout.patrols,
    layout.hazards,
    layout.canvasWidth,
    layout.canvasHeight,
  );

  const crossings = detectCrossings(connectivity.path, hazardGrids);

  return computeScore(
    connectivity,
    crossings,
    crewModifierIds,
    layout.parLength,
    0,
    false,
    approach,
  );
}

export function analyseGetaway(
  baseData: Uint8ClampedArray,
  editedData: Uint8ClampedArray,
  layout: GetawayLayout,
  crewModifierIds: CrewModifierId[],
): AnalysisResult {
  const inkGrid = detectInk(baseData, editedData, layout.canvasWidth, layout.canvasHeight);
  const dilated = dilate(inkGrid);

  const connectivity = analyseGetawayConnectivity(
    dilated,
    layout.start,
    layout.safehouse,
  );

  const hazardGrids = buildRoadblockGrids(
    layout.roadblocks,
    layout.canvasWidth,
    layout.canvasHeight,
  );

  const crossings = detectCrossings(connectivity.path, hazardGrids);

  return computeScore(
    connectivity,
    crossings,
    crewModifierIds,
    layout.parLength,
    0,
    true,
  );
}
