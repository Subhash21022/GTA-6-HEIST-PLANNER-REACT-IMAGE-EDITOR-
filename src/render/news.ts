import type { CrewMember } from '../config/crew';
import { PALETTE, FONTS } from '../config/theme';
import { createCanvas, canvasToDataUrl } from '../utils/canvas';
import { renderPortrait } from './portrait';
import { renderCCTVFrame } from './cctv';

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


export async function composeWeazelNews(
  targetName: string,
  codename: string,
  score: number,
  grade: string,
  approved: boolean,
  crew: CrewMember[],
  customPortraits: Record<string, string>,
  reconImage: string | null,
  approach: 'subtle' | 'loud' = 'subtle',
  cctvImage: string | null = null,
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
  ctx.font = `56px ${FONTS.gta}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('WEAZEL NEWS', 30, BANNER_H / 2 + 2);

  // "BREAKING" badge on the right
  const breakingText = 'BREAKING';
  ctx.font = `bold 28px ${FONTS.gta}`;
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

  // Left: CCTV Surveillance / headline photo area
  if (cctvImage) {
    const img = await loadImg(cctvImage);
    ctx.drawImage(img, 0, contentTop, splitX, contentH);
  } else if (reconImage) {
    const img = await loadImg(reconImage);
    if (img.naturalWidth > 0) {
      ctx.drawImage(img, 0, contentTop, splitX, contentH);
    } else {
      ctx.save();
      ctx.translate(0, contentTop);
      renderCCTVFrame(ctx, splitX, contentH, {
        timeMs: 4500,
        cameraIndex: 0,
        approach,
        crew,
        targetName,
      });
      ctx.restore();
    }
  } else {
    ctx.save();
    ctx.translate(0, contentTop);
    renderCCTVFrame(ctx, splitX, contentH, {
      timeMs: 4500,
      cameraIndex: 0,
      approach,
      crew,
      targetName,
    });
    ctx.restore();
  }

  // Subtle gradient overlay on the photo for text legibility
  const photoOverlay = ctx.createLinearGradient(0, contentBottom - 160, 0, contentBottom);
  photoOverlay.addColorStop(0, 'rgba(10, 14, 24, 0)');
  photoOverlay.addColorStop(1, 'rgba(10, 14, 24, 0.85)');
  ctx.fillStyle = photoOverlay;
  ctx.fillRect(0, contentBottom - 160, splitX, 160);

  // Headline text over photo
  ctx.fillStyle = '#fff';
  ctx.font = `52px ${FONTS.gta}`;
  ctx.textAlign = 'left';
  ctx.fillText(targetName.toUpperCase(), 30, contentBottom - 70);

  ctx.fillStyle = PALETTE.cyan;
  ctx.font = `28px ${FONTS.subheading}`;
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
  ctx.fillRect(splitX + 30, scoreY - 35, W - splitX - 60, 60);
  ctx.strokeStyle = PALETTE.cyan;
  ctx.lineWidth = 1;
  ctx.strokeRect(splitX + 30, scoreY - 35, W - splitX - 60, 60);

  ctx.fillStyle = PALETTE.cyan;
  ctx.font = `bold 30px ${FONTS.gta}`;
  ctx.textAlign = 'center';
  ctx.fillText(`SCORE: ${score}`, polaroidCenterX - 70, scoreY + 5);

  ctx.fillStyle = PALETTE.hotPink;
  ctx.font = `bold 30px ${FONTS.gta}`;
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
  const tickerText = approach === 'subtle'
    ? `OPERATION: ${codename.toUpperCase()}  ·  APPROACH: SUBTLE  ·  ZERO ALARMS AT ${targetName.toUpperCase()}  ·  SCORE: ${score} (${grade})  ·  STATUS: ${approved ? 'GHOST EXFILTRATION' : 'ALARM COMPROMISED'}`
    : `BREAKING: C4 BLAST ROCKS ${targetName.toUpperCase()}  ·  APPROACH: LOUD ASSAULT  ·  SCORE: ${score} (${grade})  ·  STATUS: ${approved ? 'ARMORED ESCAPE' : 'SWAT PURSUIT'}`;
  ctx.fillStyle = PALETTE.sand;
  ctx.font = `20px ${FONTS.mono}`;
  ctx.textAlign = 'left';
  ctx.fillText(tickerText, 120, contentBottom + 55);

  // Watermark bottom-right
  ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
  ctx.font = `12px ${FONTS.mono}`;
  ctx.textAlign = 'right';
  ctx.fillText('VICE CITY • LEONIDA', W - 20, H - 10);

  return canvasToDataUrl(canvas);
}

export interface LiveNewsRenderOptions {
  timeMs: number;
  cameraIndex: number;
  approach: 'subtle' | 'loud';
  targetName: string;
  codename: string;
  score: number;
  grade: string;
  approved: boolean;
  crew: CrewMember[];
  rightPanelCanvas?: HTMLCanvasElement | null;
  annotatedFrameImg?: HTMLImageElement | null;
}

/**
 * Creates an offscreen cached canvas for the static right column (suspect polaroids & score).
 */
export async function createNewsRightPanel(
  crew: CrewMember[],
  customPortraits: Record<string, string>,
  score: number,
  grade: string,
): Promise<HTMLCanvasElement> {
  const contentTop = BANNER_H + 3;
  const contentBottom = H - TICKER_H;
  const contentH = contentBottom - contentTop;
  const splitX = Math.round(W * 0.62);
  const panelW = W - splitX;

  const [panelCanvas, ctx] = createCanvas(panelW, contentH);

  // Dark background
  ctx.fillStyle = 'rgba(8, 12, 22, 0.95)';
  ctx.fillRect(0, 0, panelW, contentH);

  // Vertical cyan accent bar on the left edge
  ctx.fillStyle = PALETTE.cyan;
  ctx.fillRect(0, 0, 3, contentH);

  // Header
  ctx.fillStyle = PALETTE.hotPink;
  ctx.font = `32px ${FONTS.heading}`;
  ctx.textAlign = 'center';
  ctx.fillText('SUSPECTS IDENTIFIED', panelW / 2, 45);

  ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
  ctx.fillRect(20, 62, panelW - 40, 1);

  // Draw crew polaroids
  const crewSlice = crew.slice(0, 3);
  const polaroidStartY = 100;
  const polaroidSpacing = 180;
  const centerX = panelW / 2;

  for (let i = 0; i < crewSlice.length; i++) {
    const c = crewSlice[i];
    const portrait = customPortraits[c.id] ?? renderPortrait(c, 120);
    await drawPolaroid(ctx, portrait, c.name, c.role, centerX, polaroidStartY + i * polaroidSpacing);
  }

  // Score badge
  const scoreY = contentH - 80;
  ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
  ctx.fillRect(30, scoreY - 35, panelW - 60, 60);
  ctx.strokeStyle = PALETTE.cyan;
  ctx.lineWidth = 1;
  ctx.strokeRect(30, scoreY - 35, panelW - 60, 60);

  ctx.fillStyle = PALETTE.cyan;
  ctx.font = `bold 28px ${FONTS.gta}`;
  ctx.textAlign = 'center';
  ctx.fillText(`SCORE: ${score}`, centerX - 70, scoreY + 5);

  ctx.fillStyle = PALETTE.hotPink;
  ctx.font = `bold 28px ${FONTS.gta}`;
  ctx.fillText(`GRADE: ${grade}`, centerX + 70, scoreY + 5);

  return panelCanvas;
}

/**
 * Renders a full live television news broadcast frame onto any canvas (1920 x 1080).
 */
export function renderLiveNewsFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: LiveNewsRenderOptions,
): void {
  const {
    timeMs,
    cameraIndex,
    approach,
    targetName,
    codename,
    score,
    grade,
    approved,
    crew,
    rightPanelCanvas,
    annotatedFrameImg,
  } = opts;

  const contentTop = BANNER_H + 3;
  const contentBottom = H - TICKER_H;
  const contentH = contentBottom - contentTop;
  const splitX = Math.round(W * 0.62);

  // 1. Clear background
  ctx.fillStyle = '#0a0e18';
  ctx.fillRect(0, 0, w, h);

  // 2. Render Left Panel: Live CCTV robbery footage
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, contentTop, splitX, contentH);
  ctx.clip();
  ctx.translate(0, contentTop);
  renderCCTVFrame(ctx, splitX, contentH, {
    timeMs,
    cameraIndex,
    approach,
    crew,
    targetName,
    annotatedFrameImg,
  });
  ctx.restore();

  // Overlay gradient on CCTV for headline
  const photoOverlay = ctx.createLinearGradient(0, contentBottom - 140, 0, contentBottom);
  photoOverlay.addColorStop(0, 'rgba(10, 14, 24, 0)');
  photoOverlay.addColorStop(1, 'rgba(10, 14, 24, 0.85)');
  ctx.fillStyle = photoOverlay;
  ctx.fillRect(0, contentBottom - 140, splitX, 140);

  // Target headline in Pricedown GTA font
  ctx.fillStyle = '#fff';
  ctx.font = `50px ${FONTS.gta}`;
  ctx.textAlign = 'left';
  ctx.fillText(targetName.toUpperCase(), 30, contentBottom - 65);

  ctx.fillStyle = PALETTE.cyan;
  ctx.font = `26px ${FONTS.subheading}`;
  ctx.fillText(`OPERATION: ${codename.toUpperCase()} // SURVEILLANCE FEED`, 30, contentBottom - 26);

  // 3. Render Right Panel (Suspects & score)
  if (rightPanelCanvas) {
    ctx.drawImage(rightPanelCanvas, splitX, contentTop);
  }

  // 4. Render Top Banner (WEAZEL NEWS)
  const bannerGrad = ctx.createLinearGradient(0, 0, W, BANNER_H);
  bannerGrad.addColorStop(0, '#b80d42');
  bannerGrad.addColorStop(0.5, PALETTE.hotPink);
  bannerGrad.addColorStop(1, '#b80d42');
  ctx.fillStyle = bannerGrad;
  ctx.fillRect(0, 0, W, BANNER_H);

  ctx.fillStyle = PALETTE.cyan;
  ctx.fillRect(0, BANNER_H, W, 3);

  ctx.fillStyle = '#fff';
  ctx.font = `56px ${FONTS.gta}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('WEAZEL NEWS', 30, BANNER_H / 2 + 2);

  // Blinking "BREAKING" badge
  const breakingBlink = Math.sin(timeMs / 400) > -0.5;
  const breakingText = 'BREAKING';
  ctx.font = `bold 28px ${FONTS.gta}`;
  const breakW = ctx.measureText(breakingText).width + 30;
  ctx.fillStyle = breakingBlink ? '#ffffff' : '#ffd0e0';
  ctx.fillRect(W - breakW - 20, 18, breakW, 44);
  ctx.fillStyle = PALETTE.hotPink;
  ctx.textAlign = 'center';
  ctx.fillText(breakingText, W - breakW / 2 - 20, 42);

  // 5. Render Bottom Ticker Bar
  ctx.fillStyle = '#060a14';
  ctx.fillRect(0, contentBottom, W, TICKER_H);

  ctx.fillStyle = PALETTE.hotPink;
  ctx.fillRect(0, contentBottom, W, 3);

  // "LIVE" badge with pulse
  const livePulse = Math.sin(timeMs / 300) > 0;
  ctx.fillStyle = livePulse ? PALETTE.danger : '#b8142a';
  ctx.fillRect(20, contentBottom + 30, 80, 40);
  ctx.fillStyle = '#fff';
  ctx.font = `bold 22px ${FONTS.mono}`;
  ctx.textAlign = 'center';
  ctx.fillText('LIVE', 60, contentBottom + 55);

  // Smooth scrolling ticker
  const tickerText = approach === 'subtle'
    ? `  ·  BREAKING NEWS: SURVEILLANCE TAPE LEAKED FROM ${targetName.toUpperCase()}  ·  OPERATION: ${codename.toUpperCase()}  ·  APPROACH: THE SUBTLE ROUTE (ZERO ALARMS)  ·  FINAL SCORE: ${score} (${grade})  ·  STATUS: ${approved ? 'GHOST EXFILTRATION CONFIRMED' : 'ALARM TRIPPED'}  ·  POLICE APPEAL FOR INFORMATION  ·  `
    : `  ·  BREAKING NEWS: C4 EXPLOSION DETONATED AT ${targetName.toUpperCase()}  ·  OPERATION: ${codename.toUpperCase()}  ·  APPROACH: THE LOUD ROUTE (KINETIC ASSAULT)  ·  FINAL SCORE: ${score} (${grade})  ·  STATUS: ${approved ? 'ARMORED VEHICLE PURSUIT' : 'SWAT TACTICAL RESPONSE'}  ·  HIGHWAY PATROL ON HIGH ALERT  ·  `;

  ctx.save();
  ctx.beginPath();
  ctx.rect(120, contentBottom, W - 320, TICKER_H);
  ctx.clip();

  ctx.font = `20px ${FONTS.mono}`;
  const fullTickerWidth = ctx.measureText(tickerText).width;
  const scrollOffset = (timeMs * 0.12) % fullTickerWidth;

  ctx.fillStyle = PALETTE.sand;
  ctx.textAlign = 'left';
  ctx.fillText(tickerText, 120 - scrollOffset, contentBottom + 55);
  ctx.fillText(tickerText, 120 - scrollOffset + fullTickerWidth, contentBottom + 55);
  ctx.restore();

  // Watermark bottom-right
  ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
  ctx.font = `12px ${FONTS.mono}`;
  ctx.textAlign = 'right';
  ctx.fillText('VICE CITY • LEONIDA // WEAZEL BROADCAST NETWORK', W - 20, H - 12);
}

