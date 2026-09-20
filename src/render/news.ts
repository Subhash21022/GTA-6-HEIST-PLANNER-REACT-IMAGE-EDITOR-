import type { CrewMember } from '../config/crew';
import { PALETTE, FONTS } from '../config/theme';
import { createCanvas, canvasToDataUrl } from '../utils/canvas';
import { renderPortrait } from './portrait';

const W = 1920;
const H = 1080;
const BANNER_H = 80;
const TICKER_H = 100;

const loadImg = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = src;
  });

function drawPolaroid(
  ctx: CanvasRenderingContext2D,
  portraitUrl: string,
  name: string,
  role: string,
  x: number,
  y: number,
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#f0ece0';
      ctx.fillRect(x - 52, y - 52, 104, 130);
      ctx.shadowBlur = 0;
      ctx.drawImage(img, x - 42, y - 42, 84, 84);
      ctx.fillStyle = '#333';
      ctx.font = `11px ${FONTS.typewriter}`;
      ctx.textAlign = 'center';
      ctx.fillText(name, x, y + 58);
      ctx.fillStyle = '#777';
      ctx.font = `9px ${FONTS.mono}`;
      ctx.fillText(role.toUpperCase(), x, y + 72);
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
  ctx.lineWidth = 5;
  ctx.font = `bold 72px ${FONTS.heading}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 50;
  ctx.strokeRect(-w / 2, -50, w, 100);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.8;
  ctx.fillText(text, 0, 4);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export async function composeWeazelNews(
  targetName: string,
  codename: string,
  score: number,
  grade: string,
  approved: boolean,
  crew: CrewMember[],
  customPortraits: Record<string, string>,
  reconImage: string | null,
): Promise<string> {
  const [canvas, ctx] = createCanvas(W, H);

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0a0e18');
  bgGrad.addColorStop(0.5, '#0d1525');
  bgGrad.addColorStop(1, '#0a0e18');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Top banner ────────────────────────────────────────────
  const bannerGrad = ctx.createLinearGradient(0, 0, W, BANNER_H);
  bannerGrad.addColorStop(0, '#b80d42');
  bannerGrad.addColorStop(0.5, PALETTE.hotPink);
  bannerGrad.addColorStop(1, '#b80d42');
  ctx.fillStyle = bannerGrad;
  ctx.fillRect(0, 0, W, BANNER_H);

  // Thin accent line below banner
  ctx.fillStyle = PALETTE.cyan;
  ctx.fillRect(0, BANNER_H, W, 3);

  // "WEAZEL NEWS" logo
  ctx.fillStyle = '#fff';
  ctx.font = `56px ${FONTS.heading}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('WEAZEL NEWS', 30, BANNER_H / 2 + 2);

  // "BREAKING" badge on the right
  const breakingText = 'BREAKING';
  ctx.font = `bold 28px ${FONTS.mono}`;
  const breakW = ctx.measureText(breakingText).width + 30;
  ctx.fillStyle = '#fff';
  ctx.fillRect(W - breakW - 20, 18, breakW, 44);
  ctx.fillStyle = PALETTE.hotPink;
  ctx.textAlign = 'center';
  ctx.fillText(breakingText, W - breakW / 2 - 20, 42);

  // ── Main content area ─────────────────────────────────────
  const contentTop = BANNER_H + 3;
  const contentBottom = H - TICKER_H;
  const contentH = contentBottom - contentTop;
  const splitX = Math.round(W * 0.62);

  // Left: headline photo area
  if (reconImage) {
    const img = await loadImg(reconImage);
    if (img.naturalWidth > 0) {
      ctx.drawImage(img, 0, contentTop, splitX, contentH);
    } else {
      drawPlaceholder(ctx, splitX, contentTop, contentH, targetName);
    }
  } else {
    drawPlaceholder(ctx, splitX, contentTop, contentH, targetName);
  }

  // Subtle gradient overlay on the photo for text legibility
  const photoOverlay = ctx.createLinearGradient(0, contentBottom - 160, 0, contentBottom);
  photoOverlay.addColorStop(0, 'rgba(10, 14, 24, 0)');
  photoOverlay.addColorStop(1, 'rgba(10, 14, 24, 0.85)');
  ctx.fillStyle = photoOverlay;
  ctx.fillRect(0, contentBottom - 160, splitX, 160);

  // Headline text over photo
  ctx.fillStyle = '#fff';
  ctx.font = `48px ${FONTS.heading}`;
  ctx.textAlign = 'left';
  ctx.fillText(targetName.toUpperCase(), 30, contentBottom - 70);

  ctx.fillStyle = PALETTE.cyan;
  ctx.font = `28px ${FONTS.heading}`;
  ctx.fillText(`OPERATION: ${codename.toUpperCase()}`, 30, contentBottom - 30);

  // Right column: dark panel
  ctx.fillStyle = 'rgba(8, 12, 22, 0.92)';
  ctx.fillRect(splitX, contentTop, W - splitX, contentH);

  // Vertical cyan accent bar
  ctx.fillStyle = PALETTE.cyan;
  ctx.fillRect(splitX, contentTop, 3, contentH);

  // Right column header
  ctx.fillStyle = PALETTE.hotPink;
  ctx.font = `32px ${FONTS.heading}`;
  ctx.textAlign = 'center';
  ctx.fillText('SUSPECTS', splitX + (W - splitX) / 2, contentTop + 45);

  ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
  ctx.fillRect(splitX + 20, contentTop + 62, W - splitX - 40, 1);

  // Draw crew polaroids (up to 3)
  const crewSlice = crew.slice(0, 3);
  const polaroidStartY = contentTop + 100;
  const polaroidSpacing = 180;
  const polaroidCenterX = splitX + (W - splitX) / 2;

  for (let i = 0; i < crewSlice.length; i++) {
    const c = crewSlice[i];
    const portrait = customPortraits[c.id] ?? renderPortrait(c, 120);
    await drawPolaroid(
      ctx,
      portrait,
      c.name,
      c.role,
      polaroidCenterX,
      polaroidStartY + i * polaroidSpacing,
    );
  }

  // Score badge in right column
  const scoreY = contentBottom - 80;
  ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
  ctx.fillRect(splitX + 30, scoreY - 30, W - splitX - 60, 60);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(splitX + 30, scoreY - 30, W - splitX - 60, 60);

  ctx.fillStyle = PALETTE.cyan;
  ctx.font = `24px ${FONTS.heading}`;
  ctx.textAlign = 'center';
  ctx.fillText(`SCORE: ${score}`, polaroidCenterX - 40, scoreY + 5);

  const gradeColors: Record<string, string> = {
    S: PALETTE.teal,
    A: PALETTE.success,
    B: PALETTE.cyan,
    C: PALETTE.warning,
    D: PALETTE.sunsetOrange,
    F: PALETTE.danger,
  };
  ctx.fillStyle = gradeColors[grade] ?? PALETTE.danger;
  ctx.font = `bold 28px ${FONTS.heading}`;
  ctx.fillText(`GRADE: ${grade}`, polaroidCenterX + 70, scoreY + 5);

  // ── Bottom ticker bar ─────────────────────────────────────
  ctx.fillStyle = '#060a14';
  ctx.fillRect(0, contentBottom, W, TICKER_H);

  // Thin accent line above ticker
  ctx.fillStyle = PALETTE.hotPink;
  ctx.fillRect(0, contentBottom, W, 3);

  // "LIVE" badge
  ctx.fillStyle = PALETTE.danger;
  ctx.fillRect(20, contentBottom + 30, 80, 40);
  ctx.fillStyle = '#fff';
  ctx.font = `bold 22px ${FONTS.mono}`;
  ctx.textAlign = 'center';
  ctx.fillText('LIVE', 60, contentBottom + 55);

  // Ticker text
  const tickerText = `OPERATION: ${codename.toUpperCase()}  ·  TARGET: ${targetName.toUpperCase()}  ·  SCORE: ${score}  ·  GRADE: ${grade}  ·  STATUS: ${approved ? 'CLEAN GETAWAY' : 'BUSTED'}`;
  ctx.fillStyle = PALETTE.sand;
  ctx.font = `20px ${FONTS.mono}`;
  ctx.textAlign = 'left';
  ctx.fillText(tickerText, 120, contentBottom + 55);

  // Watermark bottom-right
  ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
  ctx.font = `12px ${FONTS.mono}`;
  ctx.textAlign = 'right';
  ctx.fillText('VICE CITY • LEONIDA', W - 20, H - 10);

  // ── Stamp overlay ─────────────────────────────────────────
  if (approved) {
    drawStamp(ctx, 'CLEAN GETAWAY', splitX / 2, (contentTop + contentBottom) / 2, PALETTE.success, -18);
  } else {
    drawStamp(ctx, 'BUSTED', splitX / 2, (contentTop + contentBottom) / 2, PALETTE.danger, 12);
  }

  return canvasToDataUrl(canvas);
}

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  width: number,
  top: number,
  height: number,
  targetName: string,
): void {
  const grad = ctx.createLinearGradient(0, top, 0, top + height);
  grad.addColorStop(0, '#0d1b2a');
  grad.addColorStop(1, '#0a1220');
  ctx.fillStyle = grad;
  ctx.fillRect(0, top, width, height);

  // Crosshatch pattern
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + height);
    ctx.stroke();
  }
  for (let y = top; y < top + height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Target name centered
  ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
  ctx.font = `120px ${FONTS.heading}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(targetName.toUpperCase(), width / 2, top + height / 2);
  ctx.textBaseline = 'alphabetic';
}
