import { ANALYSIS } from '../config/scoring';
import { createGrid, cellIndex, isInBounds, type Grid } from './grid';
import type { Camera, PatrolPath, Hazard, Rect, Point } from '../config/targets';

export interface HazardGrid {
  id: string;
  label: string;
  grid: Grid;
}

function rasteriseCameraCone(
  cam: Camera,
  width: number,
  height: number,
): Grid {
  const grid = createGrid(width, height);
  const { cellSize } = ANALYSIS;
  const halfFov = (cam.fov / 2) * (Math.PI / 180);
  const angleRad = cam.angle * (Math.PI / 180);
  const rangeCells = cam.range / cellSize;

  const camCol = Math.floor(cam.position.x / cellSize);
  const camRow = Math.floor(cam.position.y / cellSize);

  const maxR = Math.ceil(rangeCells);
  for (let dr = -maxR; dr <= maxR; dr++) {
    for (let dc = -maxR; dc <= maxR; dc++) {
      const r = camRow + dr;
      const c = camCol + dc;
      if (!isInBounds(grid, c, r)) continue;

      const dist = Math.sqrt(dc * dc + dr * dr);
      if (dist > rangeCells) continue;

      const cellAngle = Math.atan2(dr, dc);
      let angleDiff = cellAngle - angleRad;
      angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

      if (Math.abs(angleDiff) <= halfFov) {
        grid.cells[cellIndex(grid, c, r)] = 1;
      }
    }
  }

  return grid;
}

function rasterisePatrolPath(
  patrol: PatrolPath,
  width: number,
  height: number,
): Grid {
  const grid = createGrid(width, height);
  const { cellSize, patrolBufferCells } = ANALYSIS;

  for (let i = 0; i < patrol.points.length - 1; i++) {
    const a = patrol.points[i];
    const b = patrol.points[i + 1];
    const steps = Math.ceil(
      Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2) / cellSize,
    );
    for (let s = 0; s <= steps; s++) {
      const t = steps === 0 ? 0 : s / steps;
      const px = a.x + (b.x - a.x) * t;
      const py = a.y + (b.y - a.y) * t;
      const col = Math.floor(px / cellSize);
      const row = Math.floor(py / cellSize);
      for (let dr = -patrolBufferCells; dr <= patrolBufferCells; dr++) {
        for (let dc = -patrolBufferCells; dc <= patrolBufferCells; dc++) {
          const nc = col + dc;
          const nr = row + dr;
          if (isInBounds(grid, nc, nr)) {
            grid.cells[cellIndex(grid, nc, nr)] = 1;
          }
        }
      }
    }
  }

  return grid;
}

function rasteriseRect(
  rect: Rect,
  width: number,
  height: number,
): Grid {
  const grid = createGrid(width, height);
  const { cellSize } = ANALYSIS;
  const c0 = Math.floor(rect.x / cellSize);
  const r0 = Math.floor(rect.y / cellSize);
  const c1 = Math.ceil((rect.x + rect.w) / cellSize);
  const r1 = Math.ceil((rect.y + rect.h) / cellSize);

  for (let r = r0; r < r1; r++) {
    for (let c = c0; c < c1; c++) {
      if (isInBounds(grid, c, r)) {
        grid.cells[cellIndex(grid, c, r)] = 1;
      }
    }
  }

  return grid;
}

export function buildHazardGrids(
  cameras: Camera[],
  patrols: PatrolPath[],
  hazards: Hazard[],
  width: number,
  height: number,
): HazardGrid[] {
  const grids: HazardGrid[] = [];

  for (const cam of cameras) {
    grids.push({
      id: cam.id,
      label: `Camera ${cam.id}`,
      grid: rasteriseCameraCone(cam, width, height),
    });
  }

  for (const patrol of patrols) {
    grids.push({
      id: patrol.id,
      label: `Patrol ${patrol.id}`,
      grid: rasterisePatrolPath(patrol, width, height),
    });
  }

  for (const hazard of hazards) {
    grids.push({
      id: hazard.id,
      label: hazard.label,
      grid: rasteriseRect(hazard.zone, width, height),
    });
  }

  return grids;
}

export function buildRoadblockGrids(
  roadblocks: Hazard[],
  width: number,
  height: number,
): HazardGrid[] {
  return roadblocks.map((rb) => ({
    id: rb.id,
    label: rb.label,
    grid: rasteriseRect(rb.zone, width, height),
  }));
}

export interface HazardCrossing {
  hazardId: string;
  hazardLabel: string;
  pathIndex: number;
}

export function detectCrossings(
  path: [number, number][],
  hazardGrids: HazardGrid[],
): HazardCrossing[] {
  const crossings: HazardCrossing[] = [];
  const crossed = new Set<string>();

  for (let i = 0; i < path.length; i++) {
    const [c, r] = path[i];
    for (const hg of hazardGrids) {
      if (crossed.has(hg.id)) continue;
      if (isInBounds(hg.grid, c, r) && hg.grid.cells[cellIndex(hg.grid, c, r)]) {
        crossed.add(hg.id);
        crossings.push({
          hazardId: hg.id,
          hazardLabel: hg.label,
          pathIndex: i,
        });
      }
    }
  }

  return crossings;
}

export function getHazardPosition(
  id: string,
  cameras: Camera[],
  patrols: PatrolPath[],
  hazards: Hazard[],
  roadblocks?: { id: string; zone: Rect }[],
): Point | null {
  const cam = cameras.find((c) => c.id === id);
  if (cam) return cam.position;

  const patrol = patrols.find((p) => p.id === id);
  if (patrol && patrol.points.length > 0) return patrol.points[0];

  const hazard = hazards.find((h) => h.id === id);
  if (hazard) return { x: hazard.zone.x + hazard.zone.w / 2, y: hazard.zone.y + hazard.zone.h / 2 };

  if (roadblocks) {
    const rb = roadblocks.find((r) => r.id === id);
    if (rb) return { x: rb.zone.x + rb.zone.w / 2, y: rb.zone.y + rb.zone.h / 2 };
  }

  return null;
}
