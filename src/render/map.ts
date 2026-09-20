import type { GetawayLayout, Point } from '../config/targets';
import { PALETTE, FONTS } from '../config/theme';
import { COPY } from '../config/copy';
import { createCanvas, canvasToDataUrl, getImageData } from '../utils/canvas';

function drawRoads(ctx: CanvasRenderingContext2D, roads: [Point, Point][]): void {
  ctx.strokeStyle = PALETTE.roadGray;
  ctx.lineWidth = 24;
  ctx.lineCap = 'round';
  for (const [a, b] of roads) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.12)';
  ctx.lineWidth = 1;
  for (const [a, b] of roads) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 22;
  ctx.setLineDash([2, 20]);
  for (const [a, b] of roads) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawWater(ctx: CanvasRenderingContext2D, rects: { x: number; y: number; w: number; h: number }[]): void {
  for (const r of rects) {
    ctx.fillStyle = PALETTE.waterBlue;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let y = r.y + 10; y < r.y + r.h; y += 15) {
      ctx.beginPath();
      ctx.moveTo(r.x, y);
      for (let x = r.x; x < r.x + r.w; x += 30) {
        ctx.quadraticCurveTo(x + 15, y - 4, x + 30, y);
      }
      ctx.stroke();
    }
  }
}

function drawBridge(ctx: CanvasRenderingContext2D, from: Point, to: Point, width: number): void {
  ctx.fillStyle = '#2a3a4a';
  ctx.strokeStyle = PALETTE.cyanMuted;
  ctx.lineWidth = 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = (-dy / len) * width / 2;
  const ny = (dx / len) * width / 2;

  ctx.beginPath();
  ctx.moveTo(from.x + nx, from.y + ny);
  ctx.lineTo(to.x + nx, to.y + ny);
  ctx.lineTo(to.x - nx, to.y - ny);
  ctx.lineTo(from.x - nx, from.y - ny);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawBlocks(ctx: CanvasRenderingContext2D, blocks: { x: number; y: number; w: number; h: number }[]): void {
  for (const b of blocks) {
    ctx.fillStyle = PALETTE.blockFill;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  }
}

function drawParks(ctx: CanvasRenderingContext2D, parks: { x: number; y: number; w: number; h: number }[]): void {
  for (const p of parks) {
    ctx.fillStyle = PALETTE.parkGreen;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    for (let i = 0; i < 5; i++) {
      const tx = p.x + (p.w * (i + 1)) / 6;
      const ty = p.y + p.h / 2 + (i % 2 ? -10 : 10);
      ctx.fillStyle = 'rgba(0, 180, 100, 0.3)';
      ctx.beginPath();
      ctx.arc(tx, ty, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStreetNames(
  ctx: CanvasRenderingContext2D,
  names: { pos: Point; label: string; angle: number }[],
): void {
  ctx.font = `10px ${FONTS.mono}`;
  ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
  ctx.textAlign = 'center';
  for (const n of names) {
    ctx.save();
    ctx.translate(n.pos.x, n.pos.y);
    ctx.rotate((n.angle * Math.PI) / 180);
    ctx.fillText(n.label, 0, 0);
    ctx.restore();
  }
}

function drawMapTitleBlock(ctx: CanvasRenderingContext2D, targetName: string, w: number, h: number): void {
  const bx = w - 320;
  const by = h - 100;
  const bw = 300;
  const bh = 80;

  ctx.strokeStyle = PALETTE.cyanMuted;
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, bw, bh);

  ctx.fillStyle = PALETTE.cyan;
  ctx.font = `bold 16px ${FONTS.mono}`;
  ctx.textAlign = 'left';
  ctx.fillText('GETAWAY ROUTE', bx + 10, by + 22);

  ctx.fillStyle = PALETTE.blueprintLabel;
  ctx.font = `12px ${FONTS.mono}`;
  ctx.fillText(COPY.location.toUpperCase(), bx + 10, by + 42);
  ctx.fillText(targetName.toUpperCase(), bx + 10, by + 58);

  ctx.fillStyle = PALETTE.hotPink;
  ctx.font = `bold 11px ${FONTS.mono}`;
  ctx.fillText(COPY.confidential, bx + 10, by + 74);
}

export interface RenderedMap {
  dataUrl: string;
  imageData: ImageData;
}

export function renderGetawayMap(layout: GetawayLayout, targetName: string): RenderedMap {
  const { canvasWidth: w, canvasHeight: h } = layout;
  const [canvas, ctx] = createCanvas(w, h);

  ctx.fillStyle = PALETTE.blueprintBg;
  ctx.fillRect(0, 0, w, h);

  drawWater(ctx, layout.water);
  drawBlocks(ctx, layout.blocks);
  drawParks(ctx, layout.parks);
  drawRoads(ctx, layout.roads);
  drawBridge(ctx, layout.bridge.from, layout.bridge.to, layout.bridge.width);
  drawStreetNames(ctx, layout.streetNames);

  for (const rb of layout.roadblocks) {
    ctx.fillStyle = 'rgba(255, 68, 68, 0.3)';
    ctx.fillRect(rb.zone.x - 10, rb.zone.y - 10, rb.zone.w + 20, rb.zone.h + 20);
    ctx.strokeStyle = PALETTE.roadblock;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(rb.zone.x, rb.zone.y, rb.zone.w, rb.zone.h);
    ctx.setLineDash([]);
    ctx.fillStyle = PALETTE.roadblock;
    ctx.font = `10px ${FONTS.mono}`;
    ctx.textAlign = 'center';
    ctx.fillText(rb.label, rb.zone.x + rb.zone.w / 2, rb.zone.y - 6);
  }

  ctx.fillStyle = PALETTE.entryMarker;
  ctx.font = `bold 12px ${FONTS.mono}`;
  ctx.textAlign = 'center';
  ctx.fillText('START', layout.start.x + layout.start.w / 2, layout.start.y - 8);
  ctx.strokeStyle = PALETTE.entryMarker;
  ctx.lineWidth = 2;
  ctx.strokeRect(layout.start.x, layout.start.y, layout.start.w, layout.start.h);

  ctx.fillStyle = PALETTE.safehouse;
  ctx.font = `bold 12px ${FONTS.mono}`;
  ctx.fillText('SAFEHOUSE', layout.safehouse.x + layout.safehouse.w / 2, layout.safehouse.y - 8);
  ctx.strokeStyle = PALETTE.safehouse;
  ctx.lineWidth = 2;
  ctx.strokeRect(layout.safehouse.x, layout.safehouse.y, layout.safehouse.w, layout.safehouse.h);

  drawMapTitleBlock(ctx, targetName, w, h);

  const imageData = getImageData(canvas, ctx);
  const dataUrl = canvasToDataUrl(canvas);

  return { dataUrl, imageData };
}

export function drawSampleGetawayRoute(
  baseDataUrl: string,
  route: Point[],
  width: number,
  height: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const [canvas, ctx] = createCanvas(width, height);
      ctx.drawImage(img, 0, 0, width, height);

      if (route.length > 1) {
        ctx.strokeStyle = PALETTE.hotPink;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(route[0].x, route[0].y);
        for (let i = 1; i < route.length; i++) {
          ctx.lineTo(route[i].x, route[i].y);
        }
        ctx.stroke();

        ctx.fillStyle = PALETTE.entryMarker;
        ctx.beginPath();
        ctx.arc(route[0].x, route[0].y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = PALETTE.safehouse;
        ctx.beginPath();
        ctx.arc(route[route.length - 1].x, route[route.length - 1].y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      resolve(canvasToDataUrl(canvas));
    };
    img.onerror = () => reject(new Error('Failed to draw sample getaway route'));
    img.src = baseDataUrl;
  });
}
