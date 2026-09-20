import { describe, it, expect } from 'vitest';
import { detectInk } from './ink';
import { dilate, createGrid, cellIndex } from './grid';
import { analyseConnectivity, analyseGetawayConnectivity } from './connectivity';
import { buildHazardGrids, detectCrossings } from './hazards';
import { computeScore } from './scoring';
import { ANALYSIS } from '../config/scoring';

function makeImageData(w: number, h: number, fill: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill;
    data[i + 1] = fill;
    data[i + 2] = fill;
    data[i + 3] = 255;
  }
  return data;
}

function paintRect(
  data: Uint8ClampedArray,
  w: number,
  x: number,
  y: number,
  rw: number,
  rh: number,
  color: number,
): void {
  for (let row = y; row < y + rh && row < Math.sqrt(data.length / 4); row++) {
    for (let col = x; col < x + rw && col < w; col++) {
      const i = (row * w + col) * 4;
      data[i] = color;
      data[i + 1] = color;
      data[i + 2] = color;
    }
  }
}

describe('detectInk', () => {
  it('detects changed cells between base and edited images', () => {
    const w = 100;
    const h = 100;
    const base = makeImageData(w, h, 20);
    const edited = makeImageData(w, h, 20);
    paintRect(edited, w, 10, 10, 20, 20, 200);

    const grid = detectInk(base, edited, w, h);
    const { cellSize } = ANALYSIS;
    const col = Math.floor(15 / cellSize);
    const row = Math.floor(15 / cellSize);
    expect(grid.cells[cellIndex(grid, col, row)]).toBe(1);
  });

  it('returns empty grid when images are identical', () => {
    const w = 100;
    const h = 100;
    const base = makeImageData(w, h, 50);
    const edited = makeImageData(w, h, 50);

    const grid = detectInk(base, edited, w, h);
    const hasInk = grid.cells.some((v) => v !== 0);
    expect(hasInk).toBe(false);
  });
});

describe('dilate', () => {
  it('expands inked cells by one cell in all directions', () => {
    const grid = createGrid(50, 50);
    const centerCol = 2;
    const centerRow = 2;
    grid.cells[cellIndex(grid, centerCol, centerRow)] = 1;

    const dilated = dilate(grid);

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        expect(dilated.cells[cellIndex(dilated, centerCol + dc, centerRow + dr)]).toBe(1);
      }
    }
  });
});

describe('connectivity', () => {
  it('finds complete path through entry -> vault -> exit', () => {
    const size = 100;
    const grid = createGrid(size, size);
    const cs = ANALYSIS.cellSize;

    for (let x = 10; x < 90; x++) {
      const col = Math.floor(x / cs);
      const row = Math.floor(50 / cs);
      grid.cells[cellIndex(grid, col, row)] = 1;
    }

    const result = analyseConnectivity(
      grid,
      [{ id: 'E1', zone: { x: 5, y: 45, w: 15, h: 15 } }],
      { x: 40, y: 45, w: 20, h: 15 },
      [{ id: 'X1', zone: { x: 80, y: 45, w: 15, h: 15 } }],
      ANALYSIS.vaultReachRadius,
    );

    expect(result.entryReached).toBe(true);
    expect(result.vaultReached).toBe(true);
    expect(result.exitReached).toBe(true);
    expect(result.path.length).toBeGreaterThan(0);
  });

  it('reports incomplete when route does not reach vault', () => {
    const size = 200;
    const grid = createGrid(size, size);
    const cs = ANALYSIS.cellSize;

    for (let x = 10; x < 30; x++) {
      const col = Math.floor(x / cs);
      const row = Math.floor(50 / cs);
      grid.cells[cellIndex(grid, col, row)] = 1;
    }

    const result = analyseConnectivity(
      grid,
      [{ id: 'E1', zone: { x: 5, y: 45, w: 15, h: 15 } }],
      { x: 150, y: 45, w: 20, h: 15 },
      [{ id: 'X1', zone: { x: 180, y: 45, w: 10, h: 15 } }],
      ANALYSIS.vaultReachRadius,
    );

    expect(result.entryReached).toBe(true);
    expect(result.vaultReached).toBe(false);
  });
});

describe('getaway connectivity', () => {
  it('finds path from start to safehouse', () => {
    const size = 100;
    const grid = createGrid(size, size);
    const cs = ANALYSIS.cellSize;

    for (let x = 10; x < 90; x++) {
      const col = Math.floor(x / cs);
      const row = Math.floor(50 / cs);
      grid.cells[cellIndex(grid, col, row)] = 1;
    }

    const result = analyseGetawayConnectivity(
      grid,
      { x: 5, y: 45, w: 15, h: 15 },
      { x: 80, y: 45, w: 15, h: 15 },
    );

    expect(result.entryReached).toBe(true);
    expect(result.vaultReached).toBe(true);
    expect(result.exitReached).toBe(true);
  });
});

describe('hazard detection', () => {
  it('counts camera crossings on the route', () => {
    const w = 200;
    const h = 200;
    const hazardGrids = buildHazardGrids(
      [{ id: 'C1', position: { x: 100, y: 100 }, angle: 0, fov: 90, range: 80 }],
      [],
      [],
      w,
      h,
    );

    const path: [number, number][] = [];
    const cs = ANALYSIS.cellSize;
    for (let x = 80; x < 150; x += cs) {
      path.push([Math.floor(x / cs), Math.floor(100 / cs)]);
    }

    const crossings = detectCrossings(path, hazardGrids);
    expect(crossings.length).toBeGreaterThanOrEqual(1);
    expect(crossings[0].hazardId).toBe('C1');
  });
});

describe('scoring', () => {
  it('gives full completeness score for a complete route', () => {
    const connectivity = {
      entryReached: true,
      entryId: 'E1',
      vaultReached: true,
      exitReached: true,
      exitId: 'X1',
      path: Array.from({ length: 50 }, (_, i): [number, number] => [i, 5]),
      reason: 'Complete',
    };

    const result = computeScore(connectivity, [], [], 50, 1000000, false);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.grade).toMatch(/^[SA]$/);
    expect(result.approved).toBe(true);
  });

  it('penalises hazard crossings', () => {
    const connectivity = {
      entryReached: true,
      entryId: 'E1',
      vaultReached: true,
      exitReached: true,
      exitId: 'X1',
      path: Array.from({ length: 50 }, (_, i): [number, number] => [i, 5]),
      reason: 'Complete',
    };

    const crossings = [
      { hazardId: 'C1', hazardLabel: 'Camera C1', pathIndex: 10 },
      { hazardId: 'C2', hazardLabel: 'Camera C2', pathIndex: 20 },
      { hazardId: 'P1', hazardLabel: 'Patrol P1', pathIndex: 30 },
    ];

    const clean = computeScore(connectivity, [], [], 50, 1000000, false);
    const dirty = computeScore(connectivity, crossings, [], 50, 1000000, false);
    expect(dirty.score).toBeLessThan(clean.score);
  });

  it('hacker modifier neutralises camera crossings', () => {
    const connectivity = {
      entryReached: true,
      entryId: 'E1',
      vaultReached: true,
      exitReached: true,
      exitId: 'X1',
      path: Array.from({ length: 50 }, (_, i): [number, number] => [i, 5]),
      reason: 'Complete',
    };

    const crossings = [
      { hazardId: 'C1', hazardLabel: 'Camera C1', pathIndex: 10 },
      { hazardId: 'C2', hazardLabel: 'Camera C2', pathIndex: 20 },
    ];

    const withoutHacker = computeScore(connectivity, crossings, [], 50, 1000000, false);
    const withHacker = computeScore(connectivity, crossings, ['hacker'], 50, 1000000, false);
    expect(withHacker.score).toBeGreaterThan(withoutHacker.score);
  });

  it('is deterministic', () => {
    const connectivity = {
      entryReached: true,
      entryId: 'E1',
      vaultReached: true,
      exitReached: true,
      exitId: 'X1',
      path: Array.from({ length: 80 }, (_, i): [number, number] => [i, 5]),
      reason: 'Complete',
    };

    const a = computeScore(connectivity, [], ['hacker', 'driver'], 80, 2000000, false);
    const b = computeScore(connectivity, [], ['hacker', 'driver'], 80, 2000000, false);
    expect(a.score).toBe(b.score);
    expect(a.grade).toBe(b.grade);
  });
});
