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
  approach: 'subtle' | 'loud' = 'subtle',
): void {
  const bx = w - 340;
  const by = h - 110;
  const bw = 320;
  const bh = 95;

  ctx.strokeStyle = approach === 'subtle' ? PALETTE.cyanMuted : PALETTE.hotPink;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx, by, bw, bh);

  ctx.fillStyle = approach === 'subtle' ? PALETTE.cyan : PALETTE.hotPink;
  ctx.font = `bold 16px ${FONTS.mono}`;
  ctx.textAlign = 'left';
  ctx.fillText(targetName.toUpperCase(), bx + 10, by + 22);

  ctx.fillStyle = PALETTE.blueprintLabel;
  ctx.font = `12px ${FONTS.mono}`;
  ctx.fillText(COPY.location.toUpperCase(), bx + 10, by + 40);
  ctx.fillText('SCALE: 1:200', bx + 10, by + 56);

  ctx.fillStyle = approach === 'subtle' ? PALETTE.teal : PALETTE.hotPink;
  ctx.font = `bold 12px ${FONTS.mono}`;
  ctx.fillText(`APPROACH: ${approach.toUpperCase()} ROUTE`, bx + 10, by + 74);

  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 10px ${FONTS.mono}`;
  ctx.fillText(COPY.confidential, bx + 10, by + 90);
}

export function drawApproachOverlays(
  ctx: CanvasRenderingContext2D,
  layout: TargetLayout,
  approach: 'subtle' | 'loud',
): void {
  ctx.save();
  const v = layout.vault;
  if (approach === 'subtle') {
    // Ventilation and stealth markers
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(v.x - 120, v.y - 70, 100, 36);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.fillRect(v.x - 120, v.y - 70, 100, 36);
    ctx.fillStyle = PALETTE.cyan;
    ctx.font = `bold 10px ${FONTS.mono}`;
    ctx.textAlign = 'center';
    ctx.fillText('VENT ACCESS', v.x - 70, v.y - 48);

    // Keycard hack station
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 10px ${FONTS.mono}`;
    ctx.fillText('⚡ KEYCARD BYPASS', v.x + v.w / 2, v.y - 10);
  } else {
    // Loud assault: C4 breach and SWAT intercept
    const breachX = v.x + v.w + 10;
    const breachY = v.y + v.h / 2 - 25;
    ctx.strokeStyle = PALETTE.danger;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(breachX, breachY, 70, 50);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 42, 68, 0.2)';
    ctx.fillRect(breachX, breachY, 70, 50);

    ctx.fillStyle = '#ff2a44';
    ctx.font = `bold 10px ${FONTS.mono}`;
    ctx.textAlign = 'center';
    ctx.fillText('💣 C4 BREACH', breachX + 35, breachY + 20);
    ctx.fillText('WEAK POINT', breachX + 35, breachY + 34);

    // Blast radius arc
    ctx.strokeStyle = 'rgba(255, 100, 0, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(breachX + 35, breachY + 25, 55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // SWAT intercept warning in lobby
    const lobby = layout.rooms[0]?.rect;
    if (lobby) {
      ctx.strokeStyle = 'rgba(255, 42, 68, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(lobby.x + 15, lobby.y + 15, lobby.w - 30, lobby.h - 30);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255, 42, 68, 0.08)';
      ctx.fillRect(lobby.x + 15, lobby.y + 15, lobby.w - 30, lobby.h - 30);

      ctx.fillStyle = PALETTE.danger;
      ctx.font = `bold 11px ${FONTS.mono}`;
      ctx.textAlign = 'center';
      ctx.fillText('🚨 SWAT INTERCEPT CHOKEPOINT', lobby.x + lobby.w / 2, lobby.y + 35);
    }
  }
  ctx.restore();
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

export function renderBlueprint(
  layout: TargetLayout,
  targetName: string,
  approach: 'subtle' | 'loud' = 'subtle',
): RenderedBlueprint {
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

  drawApproachOverlays(ctx, layout, approach);
  drawTitleBlock(ctx, targetName, w, h, approach);
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
