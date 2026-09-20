import { ANALYSIS } from '../config/scoring';
import type { Point, Rect } from '../config/targets';

export interface Grid {
  cols: number;
  rows: number;
  cells: Uint8Array;
}

export function createGrid(width: number, height: number): Grid {
  const cols = Math.ceil(width / ANALYSIS.cellSize);
  const rows = Math.ceil(height / ANALYSIS.cellSize);
  return { cols, rows, cells: new Uint8Array(cols * rows) };
}

export function cellIndex(grid: Grid, col: number, row: number): number {
  return row * grid.cols + col;
}

export function isInBounds(grid: Grid, col: number, row: number): boolean {
  return col >= 0 && col < grid.cols && row >= 0 && row < grid.rows;
}

export function pointToCell(p: Point): [number, number] {
  return [
    Math.floor(p.x / ANALYSIS.cellSize),
    Math.floor(p.y / ANALYSIS.cellSize),
  ];
}

export function rectToCells(rect: Rect): [number, number, number, number] {
  const c0 = Math.floor(rect.x / ANALYSIS.cellSize);
  const r0 = Math.floor(rect.y / ANALYSIS.cellSize);
  const c1 = Math.ceil((rect.x + rect.w) / ANALYSIS.cellSize);
  const r1 = Math.ceil((rect.y + rect.h) / ANALYSIS.cellSize);
  return [c0, r0, c1, r1];
}

export function dilate(grid: Grid): Grid {
  const out = createGrid(grid.cols * ANALYSIS.cellSize, grid.rows * ANALYSIS.cellSize);
  out.cols = grid.cols;
  out.rows = grid.rows;
  out.cells = new Uint8Array(grid.cols * grid.rows);
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (grid.cells[cellIndex(grid, c, r)]) {
        for (let dr = -ANALYSIS.dilationRadius; dr <= ANALYSIS.dilationRadius; dr++) {
          for (let dc = -ANALYSIS.dilationRadius; dc <= ANALYSIS.dilationRadius; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (isInBounds(grid, nc, nr)) {
              out.cells[cellIndex(out, nc, nr)] = 1;
            }
          }
        }
      }
    }
  }
  return out;
}
