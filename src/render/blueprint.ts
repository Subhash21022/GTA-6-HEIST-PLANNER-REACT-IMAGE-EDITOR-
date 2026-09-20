import type { TargetLayout, Point } from '../config/targets';
import { PALETTE, FONTS } from '../config/theme';
import { COPY } from '../config/copy';
import { createCanvas, canvasToDataUrl, getImageData } from '../utils/canvas';
import { drawCamera, drawDoor, drawVault, drawEntryMarker, drawCameraCone, drawPatrolPath } from './glyphs';

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.strokeStyle = PALETTE.blueprintGrid;
  ctx.lineWidth = 0.5;
  const step = 40;
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawWalls(ctx: CanvasRenderingContext2D, walls: [Point, Point][]): void {
  for (const [a, b] of walls) {
    const isLong = Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 400;
    ctx.strokeStyle = isLong ? PALETTE.blueprintWall : PALETTE.blueprintWallAlt;
    ctx.lineWidth = isLong ? 2.5 : 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function drawRoomLabels(ctx: CanvasRenderingContext2D, rooms: { label: string; rect: { x: number; y: number; w: number; h: number } }[]): void {
  ctx.font = `13px ${FONTS.mono}`;
  ctx.fillStyle = PALETTE.blueprintLabel;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const room of rooms) {
    ctx.fillText(
      room.label.toUpperCase(),
      room.rect.x + room.rect.w / 2,
      room.rect.y + room.rect.h / 2,
    );
  }
}

function drawTitleBlock(
  ctx: CanvasRenderingContext2D,
  targetName: string,
  w: number,
  h: number,
): void {
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
  ctx.fillText(targetName.toUpperCase(), bx + 10, by + 22);

  ctx.fillStyle = PALETTE.blueprintLabel;
  ctx.font = `12px ${FONTS.mono}`;
  ctx.fillText(COPY.location.toUpperCase(), bx + 10, by + 42);
  ctx.fillText('SCALE: 1:200', bx + 10, by + 58);

  ctx.fillStyle = PALETTE.hotPink;
  ctx.font = `bold 11px ${FONTS.mono}`;
  ctx.fillText(COPY.confidential, bx + 10, by + 74);
}

function drawGrain(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 8;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
}

export interface RenderedBlueprint {
  dataUrl: string;
  imageData: ImageData;
}

export function renderBlueprint(layout: TargetLayout, targetName: string): RenderedBlueprint {
  const { canvasWidth: w, canvasHeight: h } = layout;
  const [canvas, ctx] = createCanvas(w, h);

  ctx.fillStyle = PALETTE.blueprintBg;
  ctx.fillRect(0, 0, w, h);
  drawGrid(ctx, w, h);
  drawWalls(ctx, layout.walls);

  for (const door of layout.doors) {
    drawDoor(ctx, door.x, door.y, door.horizontal, 30);
  }

  drawRoomLabels(ctx, layout.rooms);
  drawVault(ctx, layout.vault.x, layout.vault.y, layout.vault.w, layout.vault.h);

  for (const cam of layout.cameras) {
    drawCameraCone(ctx, cam.position.x, cam.position.y, cam.angle, cam.fov, cam.range);
    drawCamera(ctx, cam.position.x, cam.position.y, 18);
  }

  for (const patrol of layout.patrols) {
    drawPatrolPath(ctx, patrol.points);
  }

  for (const entry of layout.entries) {
    drawEntryMarker(
      ctx,
      entry.zone.x + entry.zone.w / 2,
      entry.zone.y + entry.zone.h / 2,
      entry.label,
      PALETTE.entryMarker,
    );
  }

  for (const exit of layout.exits) {
    drawEntryMarker(
      ctx,
      exit.zone.x + exit.zone.w / 2,
      exit.zone.y + exit.zone.h / 2,
      exit.label,
      PALETTE.exitMarker,
    );
  }

  for (const hazard of layout.hazards) {
    ctx.strokeStyle = PALETTE.danger;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(hazard.zone.x, hazard.zone.y, hazard.zone.w, hazard.zone.h);
    ctx.setLineDash([]);
    ctx.fillStyle = PALETTE.danger;
    ctx.font = `10px ${FONTS.mono}`;
    ctx.textAlign = 'center';
    ctx.fillText(
      hazard.label,
      hazard.zone.x + hazard.zone.w / 2,
      hazard.zone.y - 4,
    );
  }

  drawTitleBlock(ctx, targetName, w, h);
  drawGrain(ctx, w, h);

  const imageData = getImageData(canvas, ctx);
  const dataUrl = canvasToDataUrl(canvas);

  return { dataUrl, imageData };
}

export function drawSampleRoute(
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

        ctx.fillStyle = PALETTE.exitMarker;
        ctx.beginPath();
        ctx.arc(route[route.length - 1].x, route[route.length - 1].y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      resolve(canvasToDataUrl(canvas));
    };
    img.onerror = () => reject(new Error('Failed to draw sample route'));
    img.src = baseDataUrl;
  });
}
