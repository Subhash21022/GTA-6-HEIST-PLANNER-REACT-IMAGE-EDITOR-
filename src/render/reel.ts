import type { CrewMember } from '../config/crew';
import { FONTS } from '../config/theme';
import { renderCCTVFrame } from './cctv';
import type { CitizenComment, ViralPostMetadata } from '../config/comments';
import { createCanvas } from '../utils/canvas';

export const REEL_W = 1080;
export const REEL_H = 1920;

export interface ReelOptions {
  timeMs: number;
  cameraIndex: number;
  approach: 'subtle' | 'loud';
  crew: CrewMember[];
  targetName: string;
  codename: string;
  score: number;
  grade: string;
  metadata: ViralPostMetadata;
  comments: CitizenComment[];
  likesCount: number;
  isLiked?: boolean;
  annotatedReelImg?: HTMLImageElement | null;
}

// Offscreen buffer for base 16:9 pursuit footage before cropping into 9:16 vertical format
let cachedCctvCanvas: HTMLCanvasElement | null = null;
let cachedCctvCtx: CanvasRenderingContext2D | null = null;

function getCctvBuffer(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  if (!cachedCctvCanvas || !cachedCctvCtx) {
    const [c, ctx] = createCanvas(1920, 1080);
    cachedCctvCanvas = c;
    cachedCctvCtx = ctx;
  }
  return [cachedCctvCanvas, cachedCctvCtx];
}

/**
 * Renders a full 9:16 vertical smartphone reel (ViceGram / Bleeter) frame (1080 x 1920).
 */
export function renderReelFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: ReelOptions,
): void {
  const {
    timeMs,
    cameraIndex,
    approach,
    crew,
    targetName,
    metadata,
    comments,
    likesCount,
    isLiked = false,
    annotatedReelImg,
  } = opts;

  // 1. If user edited the reel frame in React Image Editor, display evidence still
  if (annotatedReelImg) {
    ctx.drawImage(annotatedReelImg, 0, 0, w, h);
    drawSmartphoneChrome(ctx, w, h, timeMs, true);
    return;
  }

  // 2. Render 16:9 pursuit scene onto offscreen buffer
  const [cctvCanvas, cctvCtx] = getCctvBuffer();
  renderCCTVFrame(cctvCtx, 1920, 1080, {
    timeMs,
    cameraIndex,
    approach,
    crew,
    targetName,
  });

  // 3. Draw blurred ambiance backdrop (full screen fill)
  ctx.save();
  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, w, h);

  // Center vertical crop: Zoom 16:9 frame to fill 9:16 height
  // Scale factor: h / 1080 = 1920 / 1080 = 1.777
  const scale = h / 1080;
  const scaledW = 1920 * scale; // ~3413
  // Center horizontally with slight cinematic pan
  const t = timeMs / 1000;
  const panOffset = Math.sin(t * 0.8) * 80;
  const drawX = (w - scaledW) / 2 + panOffset;

  ctx.drawImage(cctvCanvas, drawX, 0, scaledW, h);

  // 4. Cinematic Vignettes & Gradients for social media readability
  // Top header gradient (dark to transparent)
  const topGrad = ctx.createLinearGradient(0, 0, 0, 360);
  topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  topGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.45)');
  topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, w, 360);

  // Bottom caption & comment gradient (dark to transparent)
  const botGrad = ctx.createLinearGradient(0, h - 820, 0, h);
  botGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  botGrad.addColorStop(0.35, 'rgba(4, 7, 16, 0.65)');
  botGrad.addColorStop(1, 'rgba(2, 4, 10, 0.95)');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, h - 820, w, 820);

  // Right column vignette for buttons
  const rightGrad = ctx.createLinearGradient(w - 220, 0, w, 0);
  rightGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  rightGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
  ctx.fillStyle = rightGrad;
  ctx.fillRect(w - 220, 0, 220, h);

  ctx.restore();

  // 5. Draw Smartphone UI Elements
  drawSmartphoneChrome(ctx, w, h, timeMs, false);

  // 6. Draw ViceGram Social Header
  drawSocialHeader(ctx, w, timeMs, metadata);

  // 7. Draw Right-Side Interaction Column
  drawSocialActionColumn(ctx, w, h, timeMs, likesCount, isLiked, metadata);

  // 8. Draw Bottom Metadata & Caption
  drawSocialCaptionArea(ctx, w, h, metadata);

  // 9. Draw Live Floating Citizen Comments Stream
  drawFloatingCommentsStream(ctx, h, timeMs, comments);

  // 10. Draw Bottom Scrubber / Story Progress Bar
  drawStoryProgressBar(ctx, w, h, timeMs);
}

// ── SMARTPHONE OS STATUS BAR & DYNAMIC ISLAND ────────────────────────────────
function drawSmartphoneChrome(
  ctx: CanvasRenderingContext2D,
  w: number,
  _h: number,
  timeMs: number,
  _isEvidenceStill: boolean,
): void {
  ctx.save();

  // Clock (e.g. 9:41 or live tick)
  const date = new Date(1789972800000 + timeMs);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  ctx.fillStyle = '#ffffff';
  ctx.font = `600 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(`${hours}:${minutes}`, 72, 64);

  // Dynamic Island / Pill camera cutout
  const pillW = 210;
  const pillH = 48;
  const pillX = (w - pillW) / 2;
  const pillY = 32;
  const pillRadius = 24;

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, pillRadius);
  ctx.fill();

  // Camera lens shimmer
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.arc(pillX + 34, pillY + pillH / 2, 7, 0, Math.PI * 2);
  ctx.fill();

  // System Icons (5G, Wi-Fi, Battery)
  const iconsX = w - 170;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 22px -apple-system, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('5G', iconsX - 25, 62);

  // Battery icon
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(iconsX, 44, 46, 22);
  ctx.fillRect(iconsX + 48, 50, 4, 10);
  ctx.fillStyle = '#22c55e'; // Green 100%
  ctx.fillRect(iconsX + 4, 48, 38, 14);

  ctx.restore();
}

// ── SOCIAL HEADER (VICEGRAM LOGO & LIVE VIEWER COUNT) ───────────────────────
function drawSocialHeader(
  ctx: CanvasRenderingContext2D,
  w: number,
  timeMs: number,
  metadata: ViralPostMetadata,
): void {
  ctx.save();

  // App Logo (ViceGram / Bleeter gradient)
  const logoGrad = ctx.createLinearGradient(54, 130, 260, 130);
  logoGrad.addColorStop(0, '#ff007f');
  logoGrad.addColorStop(0.5, '#ff2d78');
  logoGrad.addColorStop(1, '#ff8800');

  ctx.fillStyle = logoGrad;
  ctx.font = `italic bold 44px ${FONTS.gta}`;
  ctx.textAlign = 'left';
  ctx.fillText(metadata.platform.toUpperCase(), 54, 142);

  // Subtitle / Leonida tag
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.font = `bold 16px ${FONTS.mono}`;
  ctx.fillText('LEONIDA LIVE REELS // FEED', 54, 170);

  // 🔴 LIVE Badge with pulsating viewer count
  const liveX = w - 240;
  const liveY = 114;
  const isPulsing = Math.sin(timeMs / 300) > 0;

  // Pill backdrop
  ctx.fillStyle = 'rgba(255, 18, 117, 0.28)';
  ctx.strokeStyle = '#ff1275';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(liveX, liveY, 180, 44, 22);
  ctx.fill();
  ctx.stroke();

  // Blinking red dot
  ctx.fillStyle = isPulsing ? '#ff1464' : '#ffffff';
  ctx.shadowColor = '#ff1464';
  ctx.shadowBlur = isPulsing ? 12 : 4;
  ctx.beginPath();
  ctx.arc(liveX + 22, liveY + 22, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 18px ${FONTS.mono}`;
  ctx.textAlign = 'left';
  ctx.fillText('LIVE', liveX + 36, liveY + 28);

  ctx.fillStyle = '#00f0ff';
  ctx.font = `bold 16px ${FONTS.mono}`;
  ctx.fillText(metadata.liveViewers, liveX + 90, liveY + 28);

  ctx.restore();
}

// ── RIGHT ACTION COLUMN (HEART, COMMENTS, REPOSTS, VINYL DISC) ─────────────
function drawSocialActionColumn(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeMs: number,
  likesCount: number,
  isLiked: boolean,
  metadata: ViralPostMetadata,
): void {
  ctx.save();
  const colX = w - 90;
  const startY = h - 720;
  const spacing = 100;

  // 1. Author Avatar
  ctx.save();
  ctx.fillStyle = metadata.authorAvatarColor;
  ctx.beginPath();
  ctx.arc(colX, startY, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 26px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(metadata.authorName[0], colX, startY);

  // Pink "+" follow badge
  ctx.fillStyle = '#ff1464';
  ctx.beginPath();
  ctx.arc(colX, startY + 34, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 18px sans-serif`;
  ctx.fillText('+', colX, startY + 34);
  ctx.restore();

  // 2. Heart Like Button
  const heartY = startY + spacing;
  ctx.save();
  const heartScale = isLiked ? 1.0 + Math.sin(timeMs / 180) * 0.08 : 1.0;
  ctx.translate(colX, heartY);
  ctx.scale(heartScale, heartScale);

  ctx.font = '44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (isLiked) {
    ctx.fillStyle = '#ff1464';
    ctx.shadowColor = '#ff1464';
    ctx.shadowBlur = 18;
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
  }
  ctx.fillText('❤️', 0, 0);
  ctx.restore();

  // Likes Counter
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 19px ${FONTS.mono}`;
  ctx.textAlign = 'center';
  const displayLikes = isLiked
    ? `${((likesCount + 1) / 1000).toFixed(1)}K`
    : `${(likesCount / 1000).toFixed(1)}K`;
  ctx.fillText(displayLikes, colX, heartY + 40);

  // 3. Comment Bubble Button
  const commentY = heartY + spacing;
  ctx.font = '40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('💬', colX, commentY);

  ctx.font = `bold 19px ${FONTS.mono}`;
  ctx.fillText(metadata.commentsCount, colX, commentY + 40);

  // 4. Share / Bleet Button
  const shareY = commentY + spacing;
  ctx.font = '40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🔁', colX, shareY);

  ctx.font = `bold 19px ${FONTS.mono}`;
  ctx.fillText(metadata.sharesCount, colX, shareY + 40);

  // 5. Spinning Vinyl Record
  const vinylY = shareY + spacing + 20;
  const rotation = (timeMs / 1000) * 2.2;

  ctx.save();
  ctx.translate(colX, vinylY);
  ctx.rotate(rotation);

  // Outer black vinyl ring
  ctx.fillStyle = '#11131a';
  ctx.beginPath();
  ctx.arc(0, 0, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner neon center label
  ctx.fillStyle = '#ff007f';
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Floating music notes
  const noteFloat = (timeMs / 25) % 80;
  ctx.fillStyle = `rgba(0, 240, 255, ${Math.max(0, 1 - noteFloat / 80)})`;
  ctx.font = '20px sans-serif';
  ctx.fillText('♫', colX - 44, vinylY - noteFloat);

  ctx.restore();
}

// ── BOTTOM CAPTION & METADATA ────────────────────────────────────────────────
function drawSocialCaptionArea(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  metadata: ViralPostMetadata,
): void {
  ctx.save();
  const leftX = 54;
  const maxW = w - 240;
  let textY = h - 450;

  // Author Handle & Verified Badge
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 28px ${FONTS.subheading}`;
  ctx.textAlign = 'left';
  ctx.fillText(metadata.authorHandle, leftX, textY);

  const handleWidth = ctx.measureText(metadata.authorHandle).width;
  if (metadata.authorVerified) {
    // Verified checkmark pill
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(leftX + handleWidth + 18, textY - 9, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', leftX + handleWidth + 18, textY - 9);
  }

  // Viral Caption (Multi-line wrap)
  textY += 40;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = `23px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const words = metadata.caption.split(' ');
  let line = '';
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxW && n > 0) {
      ctx.fillText(line, leftX, textY);
      line = words[n] + ' ';
      textY += 34;
      lineCount++;
      if (lineCount >= 2) break; // Limit to 2 lines for clean UI
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, leftX, textY);

  // Hashtags in neon cyan
  textY += 34;
  ctx.fillStyle = '#00f0ff';
  ctx.font = `bold 21px ${FONTS.mono}`;
  ctx.fillText(metadata.hashtags.slice(0, 4).join(' '), leftX, textY);

  // Audio track marquee
  textY += 38;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = `19px ${FONTS.mono}`;
  ctx.fillText(`♫ ${metadata.musicTrack}`, leftX, textY);

  ctx.restore();
}

// ── LIVE FLOATING CITIZEN COMMENTS STREAM ────────────────────────────────────
function drawFloatingCommentsStream(
  ctx: CanvasRenderingContext2D,
  h: number,
  timeMs: number,
  comments: CitizenComment[],
): void {
  if (!comments || comments.length === 0) return;

  ctx.save();
  const leftX = 54;
  const startY = h - 220;
  const commentH = 50;
  const spacing = 58;

  // Cycle comments based on timeMs (every 2.6 seconds)
  const step = Math.floor(timeMs / 2600);
  const visibleCount = Math.min(2, comments.length);

  for (let i = 0; i < visibleCount; i++) {
    const idx = (step + i) % comments.length;
    const item = comments[idx];
    const yPos = startY + i * spacing;

    // Glassmorphic pill container
    const textMeasure = ctx.measureText(`${item.handle}: ${item.text}`).width;
    const pillW = Math.min(textMeasure + 75, 840);

    ctx.fillStyle = 'rgba(12, 18, 30, 0.72)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(leftX, yPos - 32, pillW, commentH, 25);
    ctx.fill();
    ctx.stroke();

    // User avatar dot
    ctx.fillStyle = item.avatarColor;
    ctx.beginPath();
    ctx.arc(leftX + 22, yPos - 7, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 13px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.avatarInitial, leftX + 22, yPos - 7);

    // Comment Handle
    ctx.fillStyle = '#ffe600';
    ctx.font = `bold 16px ${FONTS.subheading}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(item.handle, leftX + 44, yPos);

    const handleW = ctx.measureText(item.handle).width;

    // Comment text
    ctx.fillStyle = '#ffffff';
    ctx.font = `16px -apple-system, sans-serif`;
    let msg = item.text;
    if (ctx.measureText(msg).width > pillW - handleW - 60) {
      msg = msg.slice(0, 48) + '...';
    }
    ctx.fillText(msg, leftX + 52 + handleW, yPos);
  }

  ctx.restore();
}

// ── BOTTOM STORY PROGRESS BAR & HOME INDICATOR ──────────────────────────────
function drawStoryProgressBar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeMs: number,
): void {
  ctx.save();

  // Progress Bar
  const loopDuration = 10000;
  const progress = (timeMs % loopDuration) / loopDuration;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(0, h - 8, w, 8);

  const fillGrad = ctx.createLinearGradient(0, h - 8, w, h - 8);
  fillGrad.addColorStop(0, '#ff007f');
  fillGrad.addColorStop(0.5, '#00f0ff');
  fillGrad.addColorStop(1, '#ff8800');
  ctx.fillStyle = fillGrad;
  ctx.fillRect(0, h - 8, w * progress, 8);

  // White rounded home indicator pill bar
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect((w - 280) / 2, h - 28, 280, 8, 4);
  ctx.fill();

  ctx.restore();
}
