import { PALETTE } from '../config/theme';

export function drawCamera(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = PALETTE.hotPink;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.hotPink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-size * 0.3, -size * 0.3);
  ctx.lineTo(size * 0.3, -size * 0.3);
  ctx.lineTo(size * 0.4, -size * 0.1);
  ctx.lineTo(-size * 0.4, -size * 0.1);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

export function drawGuard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = PALETTE.warning;
  ctx.beginPath();
  ctx.arc(0, -size * 0.25, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-size * 0.15, -size * 0.05);
  ctx.lineTo(size * 0.15, -size * 0.05);
  ctx.lineTo(size * 0.2, size * 0.3);
  ctx.lineTo(-size * 0.2, size * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawDoor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  horizontal: boolean,
  size: number,
): void {
  ctx.save();
  ctx.strokeStyle = PALETTE.sand;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  if (horizontal) {
    ctx.beginPath();
    ctx.moveTo(x - size / 2, y);
    ctx.lineTo(x + size / 2, y);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x, y - size / 2);
    ctx.lineTo(x, y + size / 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawVault(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  ctx.strokeStyle = PALETTE.vaultMarker;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  ctx.fillStyle = PALETTE.vaultMarker;
  ctx.font = 'bold 14px "Space Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('VAULT', x + w / 2, y + h / 2 + 5);
  ctx.restore();
}

export function drawEntryMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  color: string,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x + 8, y);
  ctx.lineTo(x - 8, y);
  ctx.closePath();
  ctx.fill();

  ctx.font = '11px "Space Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y - 16);
  ctx.restore();
}

export function drawCameraCone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  fov: number,
  range: number,
): void {
  ctx.save();
  const angleRad = (angle * Math.PI) / 180;
  const halfFov = (fov / 2) * (Math.PI / 180);

  ctx.fillStyle = PALETTE.cameraCone;
  ctx.strokeStyle = PALETTE.cameraConeBorder;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angleRad - halfFov, angleRad + halfFov);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawPatrolPath(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
): void {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = PALETTE.patrolPath;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  for (const p of points) {
    drawGuard(ctx, p.x, p.y, 16);
  }
  ctx.restore();
}
