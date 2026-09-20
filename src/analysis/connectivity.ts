import type { Grid } from './grid';
import { cellIndex, isInBounds, rectToCells } from './grid';
import type { Rect } from '../config/targets';

interface BfsResult {
  visited: Uint8Array;
  parent: Int32Array;
}

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
] as const;

function bfs(grid: Grid, startCells: [number, number][]): BfsResult {
  const visited = new Uint8Array(grid.cols * grid.rows);
  const parent = new Int32Array(grid.cols * grid.rows).fill(-1);
  const queue: [number, number][] = [];

  for (const [c, r] of startCells) {
    if (isInBounds(grid, c, r) && grid.cells[cellIndex(grid, c, r)]) {
      const idx = cellIndex(grid, c, r);
      if (!visited[idx]) {
        visited[idx] = 1;
        queue.push([c, r]);
      }
    }
  }

  let head = 0;
  while (head < queue.length) {
    const [c, r] = queue[head++];
    for (const [dr, dc] of DIRS) {
      const nc = c + dc;
      const nr = r + dr;
      if (!isInBounds(grid, nc, nr)) continue;
      const nIdx = cellIndex(grid, nc, nr);
      if (visited[nIdx] || !grid.cells[nIdx]) continue;
      visited[nIdx] = 1;
      parent[nIdx] = cellIndex(grid, c, r);
      queue.push([nc, nr]);
    }
  }

  return { visited, parent };
}

function zoneCells(zone: Rect, grid: Grid): [number, number][] {
  const [c0, r0, c1, r1] = rectToCells(zone);
  const cells: [number, number][] = [];
  for (let r = r0; r < r1; r++) {
    for (let c = c0; c < c1; c++) {
      if (isInBounds(grid, c, r)) cells.push([c, r]);
    }
  }
  return cells;
}

function findReachedCell(
  visited: Uint8Array,
  zone: Rect,
  grid: Grid,
  radius: number,
): [number, number] | null {
  const [c0, r0, c1, r1] = rectToCells(zone);
  for (let r = r0 - radius; r < r1 + radius; r++) {
    for (let c = c0 - radius; c < c1 + radius; c++) {
      if (isInBounds(grid, c, r) && visited[cellIndex(grid, c, r)]) {
        return [c, r];
      }
    }
  }
  return null;
}

function tracePath(parent: Int32Array, grid: Grid, from: number, to: number): [number, number][] {
  const path: [number, number][] = [];
  let cur = to;
  while (cur !== -1 && cur !== from) {
    const r = Math.floor(cur / grid.cols);
    const c = cur % grid.cols;
    path.unshift([c, r]);
    cur = parent[cur];
  }
  if (cur === from) {
    const r = Math.floor(from / grid.cols);
    const c = from % grid.cols;
    path.unshift([c, r]);
  }
  return path;
}

export interface ConnectivityResult {
  entryReached: boolean;
  entryId: string | null;
  vaultReached: boolean;
  exitReached: boolean;
  exitId: string | null;
  path: [number, number][];
  reason: string;
}

export function analyseConnectivity(
  grid: Grid,
  entries: { id: string; zone: Rect }[],
  vault: Rect,
  exits: { id: string; zone: Rect }[],
  vaultReachRadius: number,
): ConnectivityResult {
  let bestEntry: string | null = null;
  let bestBfs: BfsResult | null = null;
  let bestStartCell: [number, number] | null = null;

  for (const entry of entries) {
    const startCells = zoneCells(entry.zone, grid).filter(
      ([c, r]) => grid.cells[cellIndex(grid, c, r)],
    );
    if (startCells.length === 0) continue;
    const result = bfs(grid, startCells);
    const vaultCell = findReachedCell(result.visited, vault, grid, vaultReachRadius);
    if (vaultCell) {
      bestEntry = entry.id;
      bestBfs = result;
      bestStartCell = startCells[0];
      break;
    }
    if (!bestEntry) {
      bestEntry = entry.id;
      bestBfs = result;
      bestStartCell = startCells[0];
    }
  }

  if (!bestEntry || !bestBfs || !bestStartCell) {
    return {
      entryReached: false,
      entryId: null,
      vaultReached: false,
      exitReached: false,
      exitId: null,
      path: [],
      reason: 'No route touches any entry point',
    };
  }

  const vaultCell = findReachedCell(bestBfs.visited, vault, grid, vaultReachRadius);
  if (!vaultCell) {
    const startIdx = cellIndex(grid, bestStartCell[0], bestStartCell[1]);
    return {
      entryReached: true,
      entryId: bestEntry,
      vaultReached: false,
      exitReached: false,
      exitId: null,
      path: tracePath(bestBfs.parent, grid, startIdx, startIdx),
      reason: 'Route does not reach the vault',
    };
  }

  const startIdx = cellIndex(grid, bestStartCell[0], bestStartCell[1]);
  const vaultIdx = cellIndex(grid, vaultCell[0], vaultCell[1]);
  const pathToVault = tracePath(bestBfs.parent, grid, startIdx, vaultIdx);

  const vaultStartCells: [number, number][] = [vaultCell];
  const bfsFromVault = bfs(grid, vaultStartCells);

  let bestExit: string | null = null;
  let exitCell: [number, number] | null = null;

  for (const exit of exits) {
    const ec = findReachedCell(bfsFromVault.visited, exit.zone, grid, 0);
    if (ec) {
      bestExit = exit.id;
      exitCell = ec;
      break;
    }
  }

  if (!bestExit || !exitCell) {
    return {
      entryReached: true,
      entryId: bestEntry,
      vaultReached: true,
      exitReached: false,
      exitId: null,
      path: pathToVault,
      reason: 'Route reaches the vault but no exit',
    };
  }

  const exitIdx = cellIndex(grid, exitCell[0], exitCell[1]);
  const pathFromVault = tracePath(bfsFromVault.parent, grid, vaultIdx, exitIdx);

  const fullPath = [...pathToVault, ...pathFromVault.slice(1)];

  return {
    entryReached: true,
    entryId: bestEntry,
    vaultReached: true,
    exitReached: true,
    exitId: bestExit,
    path: fullPath,
    reason: 'Route complete: entry to vault to exit',
  };
}

export function analyseGetawayConnectivity(
  grid: Grid,
  start: Rect,
  safehouse: Rect,
): ConnectivityResult {
  const startCells = zoneCells(start, grid).filter(
    ([c, r]) => grid.cells[cellIndex(grid, c, r)],
  );

  if (startCells.length === 0) {
    return {
      entryReached: false,
      entryId: null,
      vaultReached: false,
      exitReached: false,
      exitId: null,
      path: [],
      reason: 'No route touches the start zone',
    };
  }

  const result = bfs(grid, startCells);
  const safeCell = findReachedCell(result.visited, safehouse, grid, 0);

  const startIdx = cellIndex(grid, startCells[0][0], startCells[0][1]);

  if (!safeCell) {
    return {
      entryReached: true,
      entryId: 'start',
      vaultReached: false,
      exitReached: false,
      exitId: null,
      path: tracePath(result.parent, grid, startIdx, startIdx),
      reason: 'Route does not reach the safehouse',
    };
  }

  const safeIdx = cellIndex(grid, safeCell[0], safeCell[1]);
  const path = tracePath(result.parent, grid, startIdx, safeIdx);

  return {
    entryReached: true,
    entryId: 'start',
    vaultReached: true,
    exitReached: true,
    exitId: 'safehouse',
    path,
    reason: 'Route complete: start to safehouse',
  };
}
