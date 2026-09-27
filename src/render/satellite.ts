import { FONTS } from '../config/theme';
import { createCanvas, canvasToDataUrl, getImageData } from '../utils/canvas';
import type { Target } from '../config/targets';

export const SATELLITE_W = 1920;
export const SATELLITE_H = 1080;

export type SatelliteSpectrum = 'optical' | 'flir' | 'nvg' | 'wireframe';

export interface SatelliteRenderResult {
  dataUrl: string;
  imageData: ImageData;
}

interface Projection {
  scale: number;
  offsetX: number;
  offsetY: number;
  px: (x: number) => number;
  py: (y: number) => number;
  pw: (w: number) => number;
  ph: (h: number) => number;
}

function getProjection(target: Target): Projection {
  const scale = 0.8;
  const offsetX = (SATELLITE_W - target.layout.canvasWidth * scale) / 2;
  const offsetY = (SATELLITE_H - target.layout.canvasHeight * scale) / 2;
  return {
    scale,
    offsetX,
    offsetY,
    px: (x: number) => offsetX + x * scale,
    py: (y: number) => offsetY + y * scale,
    pw: (w: number) => w * scale,
    ph: (h: number) => h * scale,
  };
}

/**
 * Renders high-resolution 1920x1080 military satellite orthophoto for a target across 4 optical spectrums.
 * Each target displays its OWN distinctive architectural blueprint layout, rooms, vault, and surrounding terrain.
 */
export function renderSatelliteOrthophoto(
  target: Target,
  spectrum: SatelliteSpectrum = 'flir',
  cloudDrift: number = 0,
): SatelliteRenderResult {
  const [canvas, ctx] = createCanvas(SATELLITE_W, SATELLITE_H);
  const proj = getProjection(target);

  // 1. BASE BACKGROUND: SATELLITE GROUND TERRAIN & SURROUNDING GEOGRAPHY
  drawSatelliteTerrain(ctx, target, spectrum, cloudDrift, proj);

  // 2. TARGET STRUCTURE, ARCHITECTURAL BLUEPRINT ROOMS, WALLS & VAULT
  drawTargetBlueprintStructure(ctx, target, spectrum, proj);

  // 3. MULTI-SPECTRAL ATMOSPHERIC & SENSOR OVERLAYS
  drawSpectrumSensorEffects(ctx, spectrum);

  // 4. MILITARY ORBITAL HUD & TELEMETRY OVERLAY
  drawSatelliteMilitaryHUD(ctx, target, spectrum);

  return {
    dataUrl: canvasToDataUrl(canvas),
    imageData: getImageData(canvas, ctx),
  };
}

/**
 * Renders the ground geography, surrounding streets, water, and district blocks from target.getaway.
 */
function drawSatelliteTerrain(
  ctx: CanvasRenderingContext2D,
  target: Target,
  spectrum: SatelliteSpectrum,
  cloudDrift: number,
  proj: Projection,
) {
  const getaway = target.getaway;

  // Base ground color palette by spectrum
  if (spectrum === 'optical') {
    // True Color Optical: Urban Vice City asphalt roads & landscape
    ctx.fillStyle = '#1e242d';
    ctx.fillRect(0, 0, SATELLITE_W, SATELLITE_H);

    // City Blocks / Parking Areas
    ctx.fillStyle = '#26303d';
    for (const b of getaway.blocks) {
      ctx.fillRect(proj.px(b.x), proj.py(b.y), proj.pw(b.w), proj.ph(b.h));
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(proj.px(b.x), proj.py(b.y), proj.pw(b.w), proj.ph(b.h));
    }

    // Parks, Lawns & Tropical Vegetation
    for (const p of getaway.parks) {
      const parkGrad = ctx.createLinearGradient(
        proj.px(p.x),
        proj.py(p.y),
        proj.px(p.x + p.w),
        proj.py(p.y + p.h),
      );
      parkGrad.addColorStop(0, '#15803d');
      parkGrad.addColorStop(1, '#166534');
      ctx.fillStyle = parkGrad;
      ctx.fillRect(proj.px(p.x), proj.py(p.y), proj.pw(p.w), proj.ph(p.h));

      // Palm tree clusters
      ctx.fillStyle = '#14532d';
      const treeCount = Math.max(3, Math.floor((p.w * p.h) / 8000));
      for (let i = 0; i < treeCount; i++) {
        const tx = proj.px(p.x) + 20 + ((i * 47) % (proj.pw(p.w) - 40));
        const ty = proj.py(p.y) + 20 + ((i * 73) % (proj.ph(p.h) - 40));
        ctx.beginPath();
        ctx.arc(tx, ty, 10 + (i % 3) * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Water Bodies (Ocean, Marina, Coastal Canals)
    for (const w of getaway.water) {
      const waterGrad = ctx.createLinearGradient(
        proj.px(w.x),
        proj.py(w.y),
        proj.px(w.x + w.w),
        proj.py(w.y + w.h),
      );
      waterGrad.addColorStop(0, '#0284c7');
      waterGrad.addColorStop(0.4, '#06b6d4');
      waterGrad.addColorStop(1, '#0e7490');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(proj.px(w.x), proj.py(w.y), proj.pw(w.w), proj.ph(w.h));

      // Shoreline sandy beach / seawall
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.strokeRect(proj.px(w.x), proj.py(w.y), proj.pw(w.w), proj.ph(w.h));
    }

    // Streets and Avenues
    for (const road of getaway.roads) {
      const [p1, p2] = road;
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 26;
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(proj.px(p1.x), proj.py(p1.y));
      ctx.lineTo(proj.px(p2.x), proj.py(p2.y));
      ctx.stroke();

      // Yellow double center line
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(proj.px(p1.x), proj.py(p1.y));
      ctx.lineTo(proj.px(p2.x), proj.py(p2.y));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Street Names Stenciled on Roadways
    ctx.font = `bold 11px ${FONTS.mono}`;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const s of getaway.streetNames) {
      ctx.save();
      ctx.translate(proj.px(s.pos.x), proj.py(s.pos.y));
      ctx.rotate((s.angle * Math.PI) / 180);
      ctx.fillText(s.label, 0, 0);
      ctx.restore();
    }
  } else if (spectrum === 'flir') {
    // Thermal FLIR: Cold ambient indigo ground
    ctx.fillStyle = '#050813';
    ctx.fillRect(0, 0, SATELLITE_W, SATELLITE_H);

    // Warm asphalt roads (retained daytime thermal heat)
    for (const road of getaway.roads) {
      const [p1, p2] = road;
      ctx.strokeStyle = '#141d2e';
      ctx.lineWidth = 28;
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(proj.px(p1.x), proj.py(p1.y));
      ctx.lineTo(proj.px(p2.x), proj.py(p2.y));
      ctx.stroke();
    }

    // Water Bodies (Absorbs thermal radiation - cold black)
    ctx.fillStyle = '#010308';
    for (const w of getaway.water) {
      ctx.fillRect(proj.px(w.x), proj.py(w.y), proj.pw(w.w), proj.ph(w.h));
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(proj.px(w.x), proj.py(w.y), proj.pw(w.w), proj.ph(w.h));
    }
  } else if (spectrum === 'nvg') {
    // Gen-4 Night Vision: Deep night green ambient base
    ctx.fillStyle = '#02180c';
    ctx.fillRect(0, 0, SATELLITE_W, SATELLITE_H);

    ctx.fillStyle = '#064e3b';
    for (const b of getaway.blocks) {
      ctx.fillRect(proj.px(b.x), proj.py(b.y), proj.pw(b.w), proj.ph(b.h));
    }

    for (const road of getaway.roads) {
      const [p1, p2] = road;
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.moveTo(proj.px(p1.x), proj.py(p1.y));
      ctx.lineTo(proj.px(p2.x), proj.py(p2.y));
      ctx.stroke();
    }
  } else {
    // Electromagnetic Wireframe: Pure tactical radar black with coordinate grid
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, SATELLITE_W, SATELLITE_H);

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < SATELLITE_W; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, SATELLITE_H);
      ctx.stroke();
    }
    for (let y = 0; y < SATELLITE_H; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SATELLITE_W, y);
      ctx.stroke();
    }

    // District road network vectors
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 2;
    for (const road of getaway.roads) {
      const [p1, p2] = road;
      ctx.beginPath();
      ctx.moveTo(proj.px(p1.x), proj.py(p1.y));
      ctx.lineTo(proj.px(p2.x), proj.py(p2.y));
      ctx.stroke();
    }
  }

  // Drifting atmospheric clouds in optical mode
  if (spectrum === 'optical') {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.filter = 'blur(28px)';
    const cx = (cloudDrift * 30) % (SATELLITE_W + 400) - 200;
    ctx.beginPath();
    ctx.ellipse(cx, 320, 360, 140, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Draws the target building's architectural blueprint layout, rooms, walls, vault, doors, cameras, and guards.
 * This ensures EVERY target has its OWN distinct blueprint faithfully rendered in every spectrum.
 */
function drawTargetBlueprintStructure(
  ctx: CanvasRenderingContext2D,
  target: Target,
  spectrum: SatelliteSpectrum,
  proj: Projection,
) {
  const layout = target.layout;

  // ── 1. BUILDING PERIMETER DROP SHADOW & FOUNDATION PLINTH ──
  ctx.save();
  const allX = layout.rooms.map((r) => r.rect.x);
  const allY = layout.rooms.map((r) => r.rect.y);
  const allR = layout.rooms.map((r) => r.rect.x + r.rect.w);
  const allB = layout.rooms.map((r) => r.rect.y + r.rect.h);
  const minX = Math.min(...allX);
  const minY = Math.min(...allY);
  const maxX = Math.max(...allR);
  const maxY = Math.max(...allB);

  const bX = proj.px(minX - 25);
  const bY = proj.py(minY - 25);
  const bW = proj.pw(maxX - minX + 50);
  const bH = proj.ph(maxY - minY + 50);

  if (spectrum === 'optical') {
    // High-altitude sun drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(bX + 24, bY + 24, bW, bH);

    // Architectural perimeter foundation
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bX, bY, bW, bH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.strokeRect(bX, bY, bW, bH);
  } else if (spectrum === 'flir') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bX, bY, bW, bH);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bX, bY, bW, bH);
  } else if (spectrum === 'nvg') {
    ctx.fillStyle = '#052e16';
    ctx.fillRect(bX, bY, bW, bH);
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bX, bY, bW, bH);
  } else {
    ctx.fillStyle = 'rgba(0, 240, 255, 0.03)';
    ctx.fillRect(bX, bY, bW, bH);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bX, bY, bW, bH);
  }
  ctx.restore();

  // ── 2. INDIVIDUAL BLUEPRINT ROOM FLOORS (Distinct Colors, Tiles & Features) ──
  layout.rooms.forEach((room) => {
    const rx = proj.px(room.rect.x);
    const ry = proj.py(room.rect.y);
    const rw = proj.pw(room.rect.w);
    const rh = proj.ph(room.rect.h);
    const labelLower = room.label.toLowerCase();

    ctx.save();
    if (spectrum === 'optical') {
      // ☀️ TRUE COLOR OPTICAL: Authentic interior blueprint finishes visible from satellite skylight
      if (labelLower.includes('vault') || labelLower.includes('counting') || labelLower.includes('panic')) {
        // High-security vault floor with reinforced steel & hazard stripes
        ctx.fillStyle = '#334155';
        ctx.fillRect(rx, ry, rw, rh);

        // Hazard border
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.strokeRect(rx + 4, ry + 4, rw - 8, rh - 8);
      } else if (labelLower.includes('lobby') || labelLower.includes('floor') || labelLower.includes('hall')) {
        // Grand Lobby / Gaming Floor / Main Hall: Polished ivory marble tiles
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(rx, ry, rw, rh);

        // Subtle tile grid
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        const step = 28;
        for (let x = rx; x <= rx + rw; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, ry);
          ctx.lineTo(x, ry + rh);
          ctx.stroke();
        }
      } else if (labelLower.includes('pool') || labelLower.includes('garden')) {
        if (labelLower.includes('pool')) {
          // Pool: sparkling turquoise water
          const poolGrad = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
          poolGrad.addColorStop(0, '#06b6d4');
          poolGrad.addColorStop(1, '#0284c7');
          ctx.fillStyle = poolGrad;
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.strokeRect(rx, ry, rw, rh);
        } else {
          // Garden: emerald lawn
          ctx.fillStyle = '#16a34a';
          ctx.fillRect(rx, ry, rw, rh);
        }
      } else if (labelLower.includes('vip') || labelLower.includes('bedroom')) {
        // VIP Lounge / Master Suite: Luxury dark carpeting
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(rx, ry, rw, rh);
      } else {
        // Corridors, Kitchen, Staff: Industrial slate
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(rx, ry, rw, rh);
      }

      // Optical blueprint room boundary
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rx, ry, rw, rh);
    } else if (spectrum === 'flir') {
      // 🔥 FLIR THERMAL: Calibrated interior thermal heat distribution
      if (labelLower.includes('vault') || labelLower.includes('panic')) {
        ctx.fillStyle = '#0284c7'; // Heavy insulated cold steel
      } else if (labelLower.includes('counting') || labelLower.includes('security') || labelLower.includes('floor')) {
        ctx.fillStyle = '#7c2d12'; // Heat generated by computers, counts & occupancy
      } else {
        ctx.fillStyle = '#0f172a'; // Cold structural space
      }
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rx, ry, rw, rh);
    } else if (spectrum === 'nvg') {
      // 👁️ NVG NIGHT VISION: Phosphor night green
      ctx.fillStyle = '#052e16';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rx, ry, rw, rh);
    } else {
      // ⚡ EM WIREFRAME: Transparent tactical CAD cell
      ctx.fillStyle = 'rgba(0, 240, 255, 0.04)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, ry, rw, rh);
    }

    // ── Room Label Typography Badge ──
    const labelX = rx + rw / 2;
    const labelY = ry + rh / 2;

    if (spectrum === 'optical') {
      // Optical: High-contrast pill badge with clear readable font
      ctx.font = `bold 11px ${FONTS.mono}`;
      const textWidth = ctx.measureText(room.label.toUpperCase()).width;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(labelX - textWidth / 2 - 8, labelY - 10, textWidth + 16, 20);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(labelX - textWidth / 2 - 8, labelY - 10, textWidth + 16, 20);

      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(room.label.toUpperCase(), labelX, labelY);
    } else if (spectrum === 'flir') {
      ctx.font = `bold 11px ${FONTS.mono}`;
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(room.label.toUpperCase(), labelX, labelY);
    } else if (spectrum === 'nvg') {
      ctx.font = `bold 11px ${FONTS.mono}`;
      ctx.fillStyle = '#86efac';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(room.label.toUpperCase(), labelX, labelY);
    } else {
      ctx.font = `bold 10px ${FONTS.mono}`;
      ctx.fillStyle = '#00f0ff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(room.label.toUpperCase(), labelX, labelY);
    }
    ctx.restore();
  });

  // ── 3. ARCHITECTURAL BLUEPRINT WALLS (target.layout.walls) ──
  ctx.save();
  for (const [a, b] of layout.walls) {
    const isLong = Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 350;
    if (spectrum === 'optical') {
      // Structural walls: Heavy dark slate with cyan core
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = isLong ? 6 : 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(proj.px(a.x), proj.py(a.y));
      ctx.lineTo(proj.px(b.x), proj.py(b.y));
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(proj.px(a.x), proj.py(a.y));
      ctx.lineTo(proj.px(b.x), proj.py(b.y));
      ctx.stroke();
    } else if (spectrum === 'flir') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = isLong ? 4 : 2.5;
      ctx.beginPath();
      ctx.moveTo(proj.px(a.x), proj.py(a.y));
      ctx.lineTo(proj.px(b.x), proj.py(b.y));
      ctx.stroke();
    } else if (spectrum === 'nvg') {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = isLong ? 4 : 2.5;
      ctx.beginPath();
      ctx.moveTo(proj.px(a.x), proj.py(a.y));
      ctx.lineTo(proj.px(b.x), proj.py(b.y));
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = isLong ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(proj.px(a.x), proj.py(a.y));
      ctx.lineTo(proj.px(b.x), proj.py(b.y));
      ctx.stroke();

      // Node joints
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(proj.px(a.x), proj.py(a.y), 3, 0, Math.PI * 2);
      ctx.arc(proj.px(b.x), proj.py(b.y), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // ── 4. VAULT ENCLOSURE & PRIMARY HEIST TARGET (target.layout.vault) ──
  ctx.save();
  const vx = proj.px(layout.vault.x);
  const vy = proj.py(layout.vault.y);
  const vw = proj.pw(layout.vault.w);
  const vh = proj.ph(layout.vault.h);

  if (spectrum === 'optical') {
    // Reinforced steel vault chamber
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(vx, vy, vw, vh);

    // Hazard caution borders
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 4;
    ctx.strokeRect(vx, vy, vw, vh);

    // Center vault door wheel
    ctx.beginPath();
    ctx.arc(vx + vw / 2, vy + vh / 2, Math.min(vw, vh) * 0.28, 0, Math.PI * 2);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = `bold 12px ${FONTS.gta}`;
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🔒 VAULT // ${target.vaultType.toUpperCase()}`, vx + vw / 2, vy + 18);
  } else if (spectrum === 'flir') {
    // Thermal cold mass
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(vx, vy, vw, vh);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(vx, vy, vw, vh);

    ctx.font = `bold 12px ${FONTS.mono}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('COLD STEEL VAULT [-8°C]', vx + vw / 2, vy + vh / 2);
  } else if (spectrum === 'nvg') {
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3;
    ctx.strokeRect(vx, vy, vw, vh);

    ctx.font = `bold 12px ${FONTS.mono}`;
    ctx.fillStyle = '#4ade80';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`VAULT: ${target.vaultType.toUpperCase()}`, vx + vw / 2, vy + vh / 2);
  } else {
    // Wireframe: Magenta subterranean chamber
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 3;
    ctx.strokeRect(vx, vy, vw, vh);

    ctx.font = `bold 12px ${FONTS.mono}`;
    ctx.fillStyle = '#ff007f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SUBTERRANEAN VAULT [LEVEL -2]', vx + vw / 2, vy + vh / 2);
  }
  ctx.restore();

  // ── 5. ACCESS DOORS & INGRESS/EGRESS PORTALS ──
  ctx.save();
  for (const d of layout.doors) {
    const dx = proj.px(d.x);
    const dy = proj.py(d.y);
    ctx.strokeStyle = spectrum === 'optical' ? '#22c55e' : spectrum === 'nvg' ? '#4ade80' : '#00f0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (d.horizontal) {
      ctx.moveTo(dx - 12, dy);
      ctx.lineTo(dx + 12, dy);
    } else {
      ctx.moveTo(dx, dy - 12);
      ctx.lineTo(dx, dy + 12);
    }
    ctx.stroke();
  }

  // Entry Points (Ingress)
  for (const e of layout.entries) {
    const ex = proj.px(e.zone.x);
    const ey = proj.py(e.zone.y);
    ctx.fillStyle = '#22c55e';
    ctx.font = `bold 10px ${FONTS.mono}`;
    ctx.fillText(`[INGRESS: ${e.label.toUpperCase()}]`, ex, ey - 4);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.strokeRect(ex, ey, proj.pw(e.zone.w), proj.ph(e.zone.h));
  }

  // Exit Points (Egress)
  for (const x of layout.exits) {
    const xx = proj.px(x.zone.x);
    const xy = proj.py(x.zone.y);
    ctx.fillStyle = '#ef4444';
    ctx.font = `bold 10px ${FONTS.mono}`;
    ctx.fillText(`[EGRESS: ${x.label.toUpperCase()}]`, xx, xy - 4);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(xx, xy, proj.pw(x.zone.w), proj.ph(x.zone.h));
  }
  ctx.restore();

  // ── 6. SECURITY CAMERAS & SURVEILLANCE FOV CONES (target.layout.cameras) ──
  ctx.save();
  for (const cam of layout.cameras) {
    const cx = proj.px(cam.position.x);
    const cy = proj.py(cam.position.y);
    const rad = (cam.angle * Math.PI) / 180;
    const fovHalf = ((cam.fov / 2) * Math.PI) / 180;
    const range = cam.range * proj.scale;

    // Surveillance Sweep Cone
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, range, rad - fovHalf, rad + fovHalf);
    ctx.closePath();

    if (spectrum === 'optical') {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Camera lens pip
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (spectrum === 'flir') {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (spectrum === 'nvg') {
      ctx.fillStyle = 'rgba(74, 222, 128, 0.22)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = spectrum === 'optical' ? '#eab308' : '#00f0ff';
    ctx.font = `bold 9px ${FONTS.mono}`;
    ctx.fillText(cam.id, cx + 8, cy - 8);
  }
  ctx.restore();

  // ── 7. PATROLLING SECURITY GUARDS (target.layout.patrols) ──
  ctx.save();
  layout.patrols.forEach((patrol, idx) => {
    // Draw patrol route waypoints
    if (patrol.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(proj.px(patrol.points[0].x), proj.py(patrol.points[0].y));
      for (let i = 1; i < patrol.points.length; i++) {
        ctx.lineTo(proj.px(patrol.points[i].x), proj.py(patrol.points[i].y));
      }
      ctx.strokeStyle = spectrum === 'optical' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Guard initial blip position
    const pt = patrol.points[0];
    const gx = proj.px(pt.x);
    const gy = proj.py(pt.y);

    if (spectrum === 'optical') {
      // Optical: Tactical armed guard blip with uniform
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(gx, gy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.font = `bold 9px ${FONTS.mono}`;
      ctx.fillText(`GUARD #${idx + 1}`, gx + 10, gy - 8);
    } else if (spectrum === 'flir') {
      // FLIR: Human body heat signature (white hot core with thermal corona)
      const grad = ctx.createRadialGradient(gx, gy, 1, gx, gy, 24);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#00f0ff');
      grad.addColorStop(0.7, '#ff5500');
      grad.addColorStop(1, 'rgba(255, 80, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#00f0ff';
      ctx.font = `bold 9px ${FONTS.mono}`;
      ctx.fillText(`GUARD #${idx + 1} (37.2°C)`, gx + 12, gy - 8);
    } else if (spectrum === 'nvg') {
      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.arc(gx, gy, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(134, 239, 172, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gx - 10, gy - 10, 20, 20);
    } else {
      ctx.fillStyle = '#ff0044';
      ctx.beginPath();
      ctx.arc(gx, gy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff0044';
      ctx.strokeRect(gx - 10, gy - 10, 20, 20);
    }
  });
  ctx.restore();

  // ── 8. HAZARD GRIDS (Laser grids, motion sensors) ──
  ctx.save();
  for (const h of layout.hazards) {
    const hx = proj.px(h.zone.x);
    const hy = proj.py(h.zone.y);
    const hw = proj.pw(h.zone.w);
    const hh = proj.ph(h.zone.h);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(hx, hy, hw, hh);

    // Hazard stripes
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.fillRect(hx, hy, hw, hh);

    ctx.fillStyle = '#ef4444';
    ctx.font = `bold 9px ${FONTS.mono}`;
    ctx.fillText(`⚠️ ${h.label.toUpperCase()}`, hx, hy - 4);
  }
  ctx.restore();

  // ── 9. FACILITY HEADER STENCIL ──
  ctx.save();
  ctx.font = `bold 22px ${FONTS.heading}`;
  ctx.fillStyle =
    spectrum === 'optical'
      ? '#f8fafc'
      : spectrum === 'flir'
      ? '#38bdf8'
      : spectrum === 'nvg'
      ? '#4ade80'
      : '#00f0ff';
  ctx.textAlign = 'left';
  ctx.fillText(
    `FACILITY: ${target.name.toUpperCase()} // ${target.vaultType.toUpperCase()}`,
    bX,
    bY - 14,
  );
  ctx.restore();
}

/**
 * Renders optical noise, scanlines, phosphor bloom, or thermal color bars according to selected spectrum.
 */
function drawSpectrumSensorEffects(ctx: CanvasRenderingContext2D, spectrum: SatelliteSpectrum) {
  if (spectrum === 'flir') {
    // Subtle horizontal scan lines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let y = 0; y < SATELLITE_H; y += 4) {
      ctx.fillRect(0, y, SATELLITE_W, 1.5);
    }

    // Thermal color spectrum calibration bar on bottom right
    const barX = SATELLITE_W - 240;
    const barY = SATELLITE_H - 120;
    const barW = 180;
    const barH = 14;

    const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    barGrad.addColorStop(0, '#020408'); // Cold (-10°C)
    barGrad.addColorStop(0.25, '#1e293b');
    barGrad.addColorStop(0.5, '#00f0ff');
    barGrad.addColorStop(0.75, '#ff5500');
    barGrad.addColorStop(1, '#ffffff'); // White hot (+65°C)
    ctx.fillStyle = barGrad;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.font = `bold 10px ${FONTS.mono}`;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('COLD (0°C)', barX, barY - 6);
    ctx.textAlign = 'right';
    ctx.fillText('WHITE HOT (+65°C)', barX + barW, barY - 6);
  } else if (spectrum === 'nvg') {
    // Night vision circular photocathode vignette
    const vignette = ctx.createRadialGradient(
      SATELLITE_W / 2,
      SATELLITE_H / 2,
      SATELLITE_H * 0.4,
      SATELLITE_W / 2,
      SATELLITE_H / 2,
      SATELLITE_W * 0.6,
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 10, 2, 0.85)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, SATELLITE_W, SATELLITE_H);

    // Green scanlines
    ctx.fillStyle = 'rgba(34, 197, 94, 0.05)';
    for (let y = 0; y < SATELLITE_H; y += 3) {
      ctx.fillRect(0, y, SATELLITE_W, 1);
    }
  } else if (spectrum === 'wireframe') {
    // Pulse grid scan line
    const scanY = (Date.now() / 20) % SATELLITE_H;
    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.fillRect(0, scanY, SATELLITE_W, 4);
  }
}

/**
 * Renders military satellite HUD, targeting reticles, orbital ephemeris, and classification watermarks.
 */
function drawSatelliteMilitaryHUD(
  ctx: CanvasRenderingContext2D,
  target: Target,
  spectrum: SatelliteSpectrum,
) {
  const primaryColor =
    spectrum === 'flir'
      ? '#00f0ff'
      : spectrum === 'nvg'
      ? '#4ade80'
      : spectrum === 'wireframe'
      ? '#ff007f'
      : '#f8fafc';

  // 1. TOP HEADER BANNER
  ctx.save();
  ctx.font = `bold 16px ${FONTS.mono}`;
  ctx.fillStyle = primaryColor;
  ctx.textAlign = 'left';
  ctx.fillText('USA-245 // KH-12 "KEYHOLE" ORBITAL RECONNAISSANCE SATELLITE', 50, 48);

  ctx.font = `12px ${FONTS.mono}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(
    `ORBIT: LEO-7 (420.8 KM) • INCLINATION: 56.4° • GROUND RESOLUTION: 0.12M/PX • FOCAL: 2400MM`,
    50,
    72,
  );

  // Classification Header
  ctx.textAlign = 'right';
  ctx.font = `bold 14px ${FONTS.mono}`;
  ctx.fillStyle = '#ef4444';
  ctx.fillText('TOP SECRET // NOFORN // ORBITAL TASK FORCE 141', SATELLITE_W - 50, 48);

  ctx.font = `bold 12px ${FONTS.mono}`;
  ctx.fillStyle = primaryColor;
  ctx.fillText(`SENSOR SPECTRUM: [${spectrum.toUpperCase()}]`, SATELLITE_W - 50, 72);
  ctx.restore();

  // 2. CENTRAL GYRO-STABILIZED TARGETING RETICLE
  ctx.save();
  const cX = SATELLITE_W / 2;
  const cY = SATELLITE_H / 2;

  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1.5;

  // Outer segmented targeting ring
  ctx.beginPath();
  ctx.arc(cX, cY, 140, 0, Math.PI * 2);
  ctx.stroke();

  // Crosshair ticks
  ctx.beginPath();
  // Left
  ctx.moveTo(cX - 180, cY);
  ctx.lineTo(cX - 150, cY);
  // Right
  ctx.moveTo(cX + 150, cY);
  ctx.lineTo(cX + 180, cY);
  // Top
  ctx.moveTo(cX, cY - 180);
  ctx.lineTo(cX, cY - 150);
  // Bottom
  ctx.moveTo(cX, cY + 150);
  ctx.lineTo(cX, cY + 180);
  ctx.stroke();

  // Center target pip
  ctx.beginPath();
  ctx.arc(cX, cY, 4, 0, Math.PI * 2);
  ctx.fillStyle = primaryColor;
  ctx.fill();

  // Corner HUD Brackets
  const pad = 35;
  const bLen = 45;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(pad, pad + bLen);
  ctx.lineTo(pad, pad);
  ctx.lineTo(pad + bLen, pad);
  // Top-right
  ctx.moveTo(SATELLITE_W - pad - bLen, pad);
  ctx.lineTo(SATELLITE_W - pad, pad);
  ctx.lineTo(SATELLITE_W - pad, pad + bLen);
  // Bottom-left
  ctx.moveTo(pad, SATELLITE_H - pad - bLen);
  ctx.lineTo(pad, pad);
  ctx.lineTo(pad + bLen, SATELLITE_H - pad);
  // Bottom-right
  ctx.moveTo(SATELLITE_W - pad - bLen, SATELLITE_H - pad);
  ctx.lineTo(SATELLITE_W - pad, SATELLITE_H - pad);
  ctx.lineTo(SATELLITE_W - pad, SATELLITE_H - pad - bLen);
  ctx.stroke();

  // 3. BOTTOM TELEMETRY FOOTER
  ctx.font = `bold 13px ${FONTS.mono}`;
  ctx.fillStyle = primaryColor;
  ctx.textAlign = 'left';
  ctx.fillText(
    `GEO-LOC: 25°46'18.2"N 80°11'30.5"W • TARGET: ${target.name.toUpperCase()} • GUARDS: ${target.guardCount} • CAMERAS: ${target.cameraCount}`,
    50,
    SATELLITE_H - 45,
  );

  ctx.font = `11px ${FONTS.mono}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.fillText(
    'TACTICAL ADVICE: ANNOTATE STRUCTURAL FAULTS, EMP JAMMER NODES & SNIPER OVERWATCH IN REACT IMAGE EDITOR',
    50,
    SATELLITE_H - 24,
  );

  ctx.textAlign = 'right';
  ctx.font = `bold 14px ${FONTS.gta}`;
  ctx.fillStyle = '#ffd700';
  ctx.fillText(
    `POTENTIAL TAKE: $${target.baseTake.toLocaleString()} // INTEL BONUS: +$250,000`,
    SATELLITE_W - 50,
    SATELLITE_H - 45,
  );
  ctx.restore();
}
