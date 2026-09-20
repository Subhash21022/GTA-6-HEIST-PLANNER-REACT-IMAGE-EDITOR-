import { ANALYSIS } from '../config/scoring';
import { createGrid, cellIndex, type Grid } from './grid';

export function detectInk(
  base: Uint8ClampedArray,
  edited: Uint8ClampedArray,
  width: number,
  height: number,
): Grid {
  const grid = createGrid(width, height);
  const { cellSize, changeThreshold, inkFraction } = ANALYSIS;

  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      let changed = 0;
      let total = 0;
      const x0 = col * cellSize;
      const y0 = row * cellSize;
      const x1 = Math.min(x0 + cellSize, width);
      const y1 = Math.min(y0 + cellSize, height);

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * width + x) * 4;
          const dr = Math.abs(edited[i] - base[i]);
          const dg = Math.abs(edited[i + 1] - base[i + 1]);
          const db = Math.abs(edited[i + 2] - base[i + 2]);
          if (Math.max(dr, dg, db) > changeThreshold) {
            changed++;
          }
          total++;
        }
      }

      if (total > 0 && changed / total > inkFraction) {
        grid.cells[cellIndex(grid, col, row)] = 1;
      }
    }
  }

  return grid;
}
