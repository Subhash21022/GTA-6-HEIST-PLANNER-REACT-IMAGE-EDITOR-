import type { CrewMember } from '../config/crew';
import { PALETTE, FONTS } from '../config/theme';
import { COPY } from '../config/copy';
import { createCanvas, canvasToDataUrl } from '../utils/canvas';
import { renderPortrait } from './portrait';

type PortraitMap = Record<string, string>;

const BOARD_W = 1920;
const BOARD_H = 1080;

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const grad = ctx.createLinearGradient(0, 0, BOARD_W, BOARD_H);
  grad.addColorStop(0, '#1a1025');
  grad.addColorStop(0.5, '#0f1520');
  grad.addColorStop(1, '#0a0e18');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);

  ctx.strokeStyle = 'rgba(0, 212, 255, 0.04)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < BOARD_W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BOARD_H);
    ctx.stroke();
  }
  for (let y = 0; y < BOARD_H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(BOARD_W, y);
    ctx.stroke();
  }
}

function drawTapeStrip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  angle: number,
  text: string,
): void {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.fillStyle = 'rgba(255, 45, 120, 0.15)';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = PALETTE.hotPink;
  ctx.lineWidth = 1;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = PALETTE.hotPink;
  ctx.font = `bold 14px ${FONTS.mono}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawPhotoFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  angle: number,
): void {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12);
  ctx.shadowBlur = 0;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.strokeStyle = PALETTE.cyanMuted;
  ctx.lineWidth = 1;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawPolaroid(
  ctx: CanvasRenderingContext2D,
  portraitUrl: string,
  name: string,
  role: string,
  x: number,
  y: number,
  angle: number,
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#f0ece0';
      ctx.fillRect(-55, -55, 110, 140);
      ctx.shadowBlur = 0;
      ctx.drawImage(img, -45, -45, 90, 90);
      ctx.fillStyle = '#333';
      ctx.font = `12px ${FONTS.typewriter}`;
      ctx.textAlign = 'center';
      ctx.fillText(name, 0, 65);
      ctx.fillStyle = '#777';
      ctx.font = `10px ${FONTS.mono}`;
      ctx.fillText(role, 0, 80);
      ctx.restore();
      resolve();
    };
    img.onerror = () => resolve();
    img.src = portraitUrl;
  });
}

function drawStamp(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  angle: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.font = `bold 64px ${FONTS.heading}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 40;
  ctx.strokeRect(-w / 2, -45, w, 90);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.fillText(text, 0, 4);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export async function composeBriefingBoard(
  targetName: string,
  codename: string,
  infiltrationDataUrl: string | null,
  getawayDataUrl: string | null,
  crew: CrewMember[],
  grade: string,
  approved: boolean,
  take: string,
  customPortraits: PortraitMap = {},
  reconImage: string | null = null,
): Promise<string> {
  const [canvas, ctx] = createCanvas(BOARD_W, BOARD_H);
  drawBackground(ctx);

  ctx.fillStyle = PALETTE.cyan;
  ctx.font = `72px ${FONTS.heading}`;
  ctx.textAlign = 'left';
  ctx.fillText(targetName.toUpperCase(), 60, 90);

  ctx.fillStyle = PALETTE.hotPink;
  ctx.font = `36px ${FONTS.heading}`;
  ctx.fillText(`OPERATION: ${codename.toUpperCase()}`, 60, 135);

  ctx.fillStyle = PALETTE.textSecondary;
  ctx.font = `18px ${FONTS.mono}`;
  ctx.fillText(COPY.location.toUpperCase(), 60, 165);

  const loadImg = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(img);
      img.src = src;
    });

  if (infiltrationDataUrl) {
    const img = await loadImg(infiltrationDataUrl);
    drawPhotoFrame(ctx, img, 60, 200, 560, 350, -1.5);
  }

  if (getawayDataUrl) {
    const img = await loadImg(getawayDataUrl);
    drawPhotoFrame(ctx, img, 660, 210, 560, 350, 1);
  }

  const portraitStartX = 1320;
  const portraitY = 260;
  const angles = [-5, 2, -3];
  for (let i = 0; i < crew.length; i++) {
    const portrait = customPortraits[crew[i].id] ?? renderPortrait(crew[i], 120);
    await drawPolaroid(
      ctx,
      portrait,
      crew[i].name,
      crew[i].role,
      portraitStartX + (i % 2) * 130,
      portraitY + i * 160,
      angles[i % angles.length],
    );
  }

  if (reconImage) {
    const reconImg = await loadImg(reconImage);
    drawPhotoFrame(ctx, reconImg, 60, 580, 280, 175, 2);
    drawTapeStrip(ctx, 80, 570, 120, 22, -3, 'RECON INTEL');
  }

  const stampColor = approved ? PALETTE.success : PALETTE.danger;
  const stampText = approved ? COPY.approved : COPY.compromised;
  drawStamp(ctx, stampText, 960, 660, stampColor, -8);

  ctx.fillStyle = PALETTE.sand;
  ctx.font = `28px ${FONTS.heading}`;
  ctx.textAlign = 'center';
  ctx.fillText(`GRADE: ${grade}`, 960, 740);

  ctx.fillStyle = PALETTE.teal;
  ctx.font = `24px ${FONTS.heading}`;
  ctx.fillText(`ESTIMATED TAKE: ${take}`, 960, 780);

  drawTapeStrip(ctx, 1600, 20, 240, 30, 12, COPY.confidential);

  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `10px ${FONTS.mono}`;
  ctx.textAlign = 'center';
  ctx.fillText(COPY.disclaimer, BOARD_W / 2, BOARD_H - 15);

  return canvasToDataUrl(canvas);
}
