import type { CrewMember } from '../config/crew';
import { createCanvas, canvasToDataUrl } from '../utils/canvas';

export function renderPortrait(member: CrewMember, size: number = 120): string {
  const [canvas, ctx] = createCanvas(size, size);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  ctx.fillStyle = member.colors.primary;
  ctx.fillRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.3);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(1, member.colors.rim + '40');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#2a2a4a';
  ctx.beginPath();
  ctx.ellipse(cx, cy * 0.85, r * 0.35, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2a2a4a';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.45, cy * 1.05);
  ctx.quadraticCurveTo(cx - r * 0.5, cy + r * 0.8, cx - r * 0.25, cy + r);
  ctx.lineTo(cx + r * 0.25, cy + r);
  ctx.quadraticCurveTo(cx + r * 0.5, cy + r * 0.8, cx + r * 0.45, cy * 1.05);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = member.colors.rim;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = member.colors.rim;
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.ellipse(cx, cy * 0.85, r * 0.37, r * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - r * 0.47, cy * 1.05);
  ctx.quadraticCurveTo(cx - r * 0.52, cy + r * 0.8, cx - r * 0.27, cy + r);
  ctx.lineTo(cx + r * 0.27, cy + r);
  ctx.quadraticCurveTo(cx + r * 0.52, cy + r * 0.8, cx + r * 0.47, cy * 1.05);
  ctx.stroke();

  ctx.shadowBlur = 0;

  ctx.strokeStyle = member.colors.accent;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(cx - r * 0.12, cy * 0.78, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + r * 0.12, cy * 0.78, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  return canvasToDataUrl(canvas);
}
