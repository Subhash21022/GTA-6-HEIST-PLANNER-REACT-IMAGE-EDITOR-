import type { CrewMember } from '../config/crew';
import { FONTS } from '../config/theme';

export interface CCTVOptions {
  timeMs: number;
  cameraIndex: number; // 0 = Sky-Weazel Chopper Chase, 1 = Highway Intercept, 2 = Vault CCTV
  approach: 'subtle' | 'loud';
  crew: CrewMember[];
  targetName: string;
  annotatedFrameImg?: HTMLImageElement | null;
}

export const CCTV_CAMERAS = [
  { id: 'cam-01', label: 'CAM 01', name: 'SKY-WEAZEL LIVE PURSUIT (NEWS CHOPPER)' },
  { id: 'cam-02', label: 'CAM 02', name: 'HIGHWAY INTERCEPT (TRAFFIC CAM)' },
  { id: 'cam-03', label: 'CAM 03', name: 'HIGH-SECURITY VAULT (CCTV ARCHIVE)' },
] as const;

/**
 * Render an authentic CCTV / News broadcast frame onto any 2D canvas context.
 */
export function renderCCTVFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: CCTVOptions,
): void {
  const { timeMs, cameraIndex, approach, crew, targetName, annotatedFrameImg } = opts;
  const t = timeMs / 1000;

  // If user has saved an annotated freeze-frame from the React Image Editor, display it with CCTV HUD
  if (annotatedFrameImg) {
    ctx.drawImage(annotatedFrameImg, 0, 0, w, h);
    drawScanlines(ctx, w, h);
    drawVignette(ctx, w, h);
    drawCCTVHUD(ctx, w, h, timeMs, cameraIndex, approach, targetName, crew, true);
    return;
  }

  // Base background clear
  ctx.fillStyle = '#06090e';
  ctx.fillRect(0, 0, w, h);

  // Render specific camera scene
  if (cameraIndex === 0) {
    renderCam01NewsChopperChase(ctx, w, h, t, approach, crew);
  } else if (cameraIndex === 1) {
    renderCam02HighwayIntercept(ctx, w, h, t, approach, crew);
  } else {
    renderCam03Vault(ctx, w, h, t, approach, crew);
  }

  // Lighting & Surveillance post-processing
  drawAtmosphere(ctx, w, h, t, approach);
  drawScanlines(ctx, w, h);
  drawNoise(ctx, w, h, t);
  drawVignette(ctx, w, h);

  // HUD & Telemetry Overlays
  drawCCTVHUD(ctx, w, h, timeMs, cameraIndex, approach, targetName, crew, false);
}

// ── ROAD CURVE & PERSPECTIVE HELPERS ─────────────────────────────────────────
function getRoadCurveY(x: number, w: number, curveAmp: number): number {
  if (Math.abs(curveAmp) < 0.001) return 0;
  return Math.sin((x / w) * Math.PI) * curveAmp;
}

function getRoadCurveSlope(x: number, w: number, curveAmp: number): number {
  if (Math.abs(curveAmp) < 0.001) return 0;
  const dy = getRoadCurveY(x + 20, w, curveAmp) - getRoadCurveY(x - 20, w, curveAmp);
  return Math.atan2(dy, 40);
}

// ── PURSUIT TURN & CAMERA SHAKE KINEMATICS ──────────────────────────────────
interface PursuitState {
  roadCurve: number;
  susX: number;
  susY: number;
  susAngle: number;
  susSteer: number;
  isBraking: boolean;
  isDrifting: boolean;
  smokeIntensity: number;
  speedMph: number;
  gForce: number;
  hudStatus: string;
  p1X: number;
  p1Y: number;
  p1Angle: number;
  p1Steer: number;
  p1Drifting: boolean;
  p2X: number;
  p2Y: number;
  p2Angle: number;
  p3X: number;
  p3Y: number;
  p3Angle: number;
  camShakeX: number;
  camShakeY: number;
  camRoll: number;
  camZoom: number;
}

function calculatePursuitState(
  ct: number,
  t: number,
  w: number,
  roadY: number,
  _roadH: number,
  laneH: number,
): PursuitState {
  let roadCurve = 0;
  let susLane = 2.1;
  let susYaw = 0;
  let susSteer = 0;
  let isBraking = false;
  let isDrifting = false;
  let smokeIntensity = 0;
  let speedMph = 124;
  let gForce = 0.22;
  let hudStatus = 'TRACKING // LEONA FREEWAY';
  let turnLurchX = 0;
  let turnLurchY = 0;
  let turnBankRoll = 0;
  let turnZoom = 0;

  // 1. STRAIGHTAWAY & WEAVE (0.0 to 3.0s)
  if (ct < 3.0) {
    roadCurve = 0;
    susLane = 2.1 + Math.sin(ct * 2.8) * 0.45;
    susYaw = Math.cos(ct * 2.8) * 0.05;
    susSteer = Math.cos(ct * 2.8) * 0.12;
    speedMph = Math.round(124 + Math.sin(ct * 2.0) * 4);
    gForce = 0.25 + Math.abs(Math.sin(ct * 2.8)) * 0.2;
    hudStatus = 'TRACKING // HIGHWAY 104 EAST';
  }
  // 2. CORNER ENTRY & BRAKE TAP (3.0 to 3.3s)
  else if (ct < 3.3) {
    const entryT = (ct - 3.0) / 0.3;
    roadCurve = Math.sin(entryT * Math.PI * 0.5) * 40;
    susLane = 2.1 + entryT * 0.3;
    susYaw = -0.08;
    susSteer = 0.32;
    isBraking = true;
    smokeIntensity = 0.18;
    speedMph = Math.round(124 - entryT * 22);
    gForce = 0.88;
    hudStatus = 'APEX APPROACH // HARD BRAKING';
    turnLurchX = -14 * entryT;
    turnLurchY = 10 * entryT;
    turnBankRoll = -0.018 * entryT;
    turnZoom = 0.012;
  }
  // 3. THE BIG POWER SLIDE / DRIFT (3.3 to 6.0s)
  else if (ct < 6.0) {
    const driftT = (ct - 3.3) / 2.7; // 0 to 1
    const driftCurveEnv = Math.sin(driftT * Math.PI);
    roadCurve = 115 * driftCurveEnv;
    susLane = 2.4 + driftCurveEnv * 1.15; // slides wide across lane 3.5
    susYaw = driftCurveEnv * 0.45; // ~25.8° sideways drift yaw!
    susSteer = -driftCurveEnv * 0.38; // counter-steering into opposite lock!
    isDrifting = true;
    smokeIntensity = driftCurveEnv * 0.95;
    speedMph = Math.round(96 + driftT * 24);
    gForce = 1.35 + driftCurveEnv * 0.9; // up to 2.25G!
    hudStatus = 'EVASIVE DRIFT // 2.25G LATERAL';
    turnLurchX = driftCurveEnv * 36;
    turnLurchY = -driftCurveEnv * 30;
    turnBankRoll = -driftCurveEnv * 0.054; // ~3.1° helicopter banking!
    turnZoom = driftCurveEnv * 0.038;
  }
  // 4. COUNTER-STEER RECOVERY & SURGE (6.0 to 7.4s)
  else if (ct < 7.4) {
    const recovT = (ct - 6.0) / 1.4; // 0 to 1
    roadCurve = 0;
    susYaw = -Math.sin(recovT * Math.PI * 2) * 0.16 * (1 - recovT);
    susSteer = -susYaw * 0.75;
    susLane = 3.2 - recovT * 0.9;
    smokeIntensity = Math.max(0, 0.45 * (1 - recovT * 2.5));
    speedMph = Math.round(120 + recovT * 14); // surges to 134 MPH
    gForce = 0.55 * (1 - recovT);
    hudStatus = 'EXHAUST BOOST // SURGING 134 MPH';
    turnLurchX = (1 - recovT) * 14;
    turnLurchY = (1 - recovT) * -8;
    turnBankRoll = (1 - recovT) * -0.015;
  }
  // 5. CHICANE / S-TURN EVASION (7.4 to 9.4s)
  else if (ct < 9.4) {
    const sT = (ct - 7.4) / 2.0;
    const sWave = Math.sin(sT * Math.PI * 2);
    roadCurve = sWave * 32;
    susLane = 2.3 - sWave * 0.75;
    susYaw = -sWave * 0.26;
    susSteer = sWave * 0.22;
    isDrifting = Math.abs(sWave) > 0.55;
    smokeIntensity = Math.abs(sWave) * 0.5;
    speedMph = Math.round(130 - Math.abs(sWave) * 8);
    gForce = 1.15 * Math.abs(sWave);
    hudStatus = 'CHICANE EVASION // TRAFFIC DIVE';
    turnLurchX = sWave * 18;
    turnLurchY = -sWave * 12;
    turnBankRoll = sWave * 0.024;
    turnZoom = 0.016;
  }
  // 6. SETTLE (9.4 to 10.0s)
  else {
    const settleT = (ct - 9.4) / 0.6;
    roadCurve = 0;
    susLane = 2.3 - settleT * 0.2;
    susYaw = 0;
    susSteer = 0;
    speedMph = 124;
    gForce = 0.2;
    hudStatus = 'TRACKING // HIGHWAY 104 EAST';
  }

  // Suspect Car X & Y coordinates
  const susBaseX = w * 0.54 + Math.sin(t * 1.2) * 25;
  const susCurveY = getRoadCurveY(susBaseX, w, roadCurve);
  const susY = roadY + 12 + susLane * laneH + susCurveY;
  const roadSlope = getRoadCurveSlope(susBaseX, w, roadCurve);
  const totalSusAngle = roadSlope + susYaw;

  // Police Cruisers Coordinates (Delayed sampling behind suspect)
  // Cruiser 1 (Direct Tail Chaser)
  const p1T = (ct - 0.32 + 10.0) % 10.0;
  const p1Drifting = isDrifting;
  const p1Lane = ct >= 3.3 && ct < 6.0 ? susLane - 0.28 : 2.2 + Math.sin(p1T * 2.8) * 0.4;
  const p1BaseX = w * 0.28 + Math.sin(t * 1.5) * 15;
  const p1CurveY = getRoadCurveY(p1BaseX, w, roadCurve);
  const p1Y = roadY + 12 + p1Lane * laneH + p1CurveY;
  const p1Slope = getRoadCurveSlope(p1BaseX, w, roadCurve);
  const p1Angle = p1Slope + (isDrifting ? 0.32 : Math.cos(p1T * 2.8) * 0.06);
  const p1Steer = isDrifting ? -0.25 : Math.cos(p1T * 2.8) * 0.12;

  // Cruiser 2 (Outside Lane Flanker)
  const p2BaseX = w * 0.12 + Math.cos(t * 1.3) * 20;
  const p2CurveY = getRoadCurveY(p2BaseX, w, roadCurve);
  const p2Lane = ct >= 3.3 && ct < 6.0 ? susLane + 0.38 : 1.2 + Math.sin(t * 1.8) * 0.2;
  const p2Y = roadY + 12 + p2Lane * laneH + p2CurveY;
  const p2Slope = getRoadCurveSlope(p2BaseX, w, roadCurve);
  const p2Angle = p2Slope + (isDrifting ? 0.18 : 0);

  // Cruiser 3 (Loud route reinforcement)
  const p3BaseX = w * 0.04 + Math.sin(t * 1.1) * 15;
  const p3CurveY = getRoadCurveY(p3BaseX, w, roadCurve);
  const p3Y = roadY + 12 + 3.2 * laneH + p3CurveY;
  const p3Slope = getRoadCurveSlope(p3BaseX, w, roadCurve);
  const p3Angle = p3Slope;

  // ── NEWS CHOPPER SHAKY CAMERA & GIMBAL VIBRATIONS ──
  // Rotor mechanical high-frequency multi-sine jitter (28-73 Hz)
  const vibX = Math.sin(t * 31.4) * 2.8 + Math.cos(t * 47.9) * 1.8 + Math.sin(t * 73.1) * 1.0;
  const vibY = Math.cos(t * 29.3) * 2.5 + Math.sin(t * 53.1) * 1.7 + Math.cos(t * 67.4) * 0.9;

  // Atmospheric turbulence & wind gust drift (handheld gimbal feel)
  const turbX = Math.sin(t * 1.6) * 14 + Math.cos(t * 0.9) * 9;
  const turbY = Math.cos(t * 1.3) * 10 + Math.sin(t * 0.6) * 7;

  const camShakeX = vibX + turbX + turnLurchX;
  const camShakeY = vibY + turbY + turnLurchY;
  const camRoll = (Math.sin(t * 1.1) * 0.007) + turnBankRoll;
  const camZoom = 1.05 + Math.sin(t * 1.4) * 0.012 + turnZoom;

  return {
    roadCurve,
    susX: susBaseX,
    susY,
    susAngle: totalSusAngle,
    susSteer,
    isBraking,
    isDrifting,
    smokeIntensity,
    speedMph,
    gForce,
    hudStatus,
    p1X: p1BaseX,
    p1Y,
    p1Angle,
    p1Steer,
    p1Drifting,
    p2X: p2BaseX,
    p2Y,
    p2Angle,
    p3X: p3BaseX,
    p3Y,
    p3Angle,
    camShakeX,
    camShakeY,
    camRoll,
    camZoom,
  };
}

// ── ROAD SURFACE WITH DYNAMIC CURVATURE ──────────────────────────────────────
function drawRoadCurved(
  ctx: CanvasRenderingContext2D,
  w: number,
  roadY: number,
  roadH: number,
  laneCount: number,
  laneH: number,
  laneScroll: number,
  lightScroll: number,
  roadCurve: number,
): void {
  // 1. Asphalt Surface Polygon following road curve
  const asphaltGrad = ctx.createLinearGradient(0, roadY, 0, roadY + roadH);
  asphaltGrad.addColorStop(0, '#101520');
  asphaltGrad.addColorStop(0.5, '#161c28');
  asphaltGrad.addColorStop(1, '#0e121a');

  ctx.beginPath();
  ctx.moveTo(-60, roadY + getRoadCurveY(-60, w, roadCurve));
  for (let x = -60; x <= w + 60; x += 30) {
    ctx.lineTo(x, roadY + getRoadCurveY(x, w, roadCurve));
  }
  ctx.lineTo(w + 60, roadY + roadH + getRoadCurveY(w + 60, w, roadCurve));
  for (let x = w + 60; x >= -60; x -= 30) {
    ctx.lineTo(x, roadY + roadH + getRoadCurveY(x, w, roadCurve));
  }
  ctx.closePath();
  ctx.fillStyle = asphaltGrad;
  ctx.fill();

  // 2. Road Shoulders (upper & lower)
  ctx.fillStyle = '#1c2434';
  ctx.beginPath();
  ctx.moveTo(-60, roadY + getRoadCurveY(-60, w, roadCurve));
  for (let x = -60; x <= w + 60; x += 30) {
    ctx.lineTo(x, roadY + getRoadCurveY(x, w, roadCurve));
  }
  for (let x = w + 60; x >= -60; x -= 30) {
    ctx.lineTo(x, roadY + 12 + getRoadCurveY(x, w, roadCurve));
  }
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-60, roadY + roadH - 12 + getRoadCurveY(-60, w, roadCurve));
  for (let x = -60; x <= w + 60; x += 30) {
    ctx.lineTo(x, roadY + roadH - 12 + getRoadCurveY(x, w, roadCurve));
  }
  for (let x = w + 60; x >= -60; x -= 30) {
    ctx.lineTo(x, roadY + roadH + getRoadCurveY(x, w, roadCurve));
  }
  ctx.closePath();
  ctx.fill();

  // 3. Steel Guardrails with reflective markers
  ctx.strokeStyle = '#2a3b50';
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let x = -60; x <= w + 60; x += 30) {
    const gy = roadY - 3 + getRoadCurveY(x, w, roadCurve);
    if (x === -60) ctx.moveTo(x, gy);
    else ctx.lineTo(x, gy);
  }
  ctx.stroke();

  ctx.beginPath();
  for (let x = -60; x <= w + 60; x += 30) {
    const gy = roadY + roadH + 1 + getRoadCurveY(x, w, roadCurve);
    if (x === -60) ctx.moveTo(x, gy);
    else ctx.lineTo(x, gy);
  }
  ctx.stroke();

  // 4. Curved Dashed Lane Markings
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  for (let l = 1; l < laneCount; l++) {
    const baseDividerY = roadY + 12 + l * laneH;
    for (let x = -100; x < w + 140; x += 100) {
      const dashX = x - laneScroll;
      const dashY = baseDividerY + getRoadCurveY(dashX, w, roadCurve);
      const slope = getRoadCurveSlope(dashX, w, roadCurve);

      ctx.save();
      ctx.translate(dashX, dashY);
      ctx.rotate(slope);
      ctx.fillRect(-24, -2, 48, 4);
      ctx.restore();
    }
  }

  // 5. Overhead Streetlights casting light pools on road
  const lightSpacing = 450;
  for (let x = -lightSpacing; x < w + lightSpacing; x += lightSpacing) {
    const lx = x - lightScroll;
    const ly = roadY + roadH * 0.5 + getRoadCurveY(lx, w, roadCurve);
    const lightGrad = ctx.createRadialGradient(lx, ly, 30, lx, ly, 180);
    lightGrad.addColorStop(0, 'rgba(255, 245, 180, 0.09)');
    lightGrad.addColorStop(1, 'rgba(255, 245, 180, 0)');
    ctx.fillStyle = lightGrad;
    ctx.beginPath();
    ctx.arc(lx, ly, 180, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── CIVILIAN TRAFFIC (FOLLOWS ROAD CURVATURE) ────────────────────────────────
function drawCivilianTraffic(
  ctx: CanvasRenderingContext2D,
  w: number,
  roadY: number,
  laneH: number,
  t: number,
  roadCurve: number,
): void {
  // Yellow Vice City Taxi in Lane 1 (top)
  const taxiX = w + 140 - ((t * 480) % (w + 550));
  const taxiY = roadY + 12 + 0.5 * laneH + getRoadCurveY(taxiX, w, roadCurve);
  const taxiAngle = getRoadCurveSlope(taxiX, w, roadCurve);
  drawCivilianCar(ctx, taxiX, taxiY, 'taxi', taxiAngle);

  // Blue Sedan in Lane 4 (bottom)
  const sedanX = w + 280 - ((t * 540 + 200) % (w + 650));
  const sedanY = roadY + 12 + 3.5 * laneH + getRoadCurveY(sedanX, w, roadCurve);
  const sedanAngle = getRoadCurveSlope(sedanX, w, roadCurve);
  drawCivilianCar(ctx, sedanX, sedanY, 'sedan', sedanAngle);
}

// ── TIRE SKID MARKS (DRIFT ON ASPHALT) ───────────────────────────────────────
function drawSkidMarks(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  carW: number,
  intensity: number,
  t: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const skidLen = 70 + intensity * 65;
  const halfW = carW / 2 - 5;
  const alpha = Math.min(0.72, intensity * 0.7);

  ctx.strokeStyle = `rgba(10, 14, 22, ${alpha})`;
  ctx.lineWidth = 5 + intensity * 3.5;
  ctx.lineCap = 'round';

  // Left tire mark
  ctx.beginPath();
  ctx.moveTo(-16, -halfW);
  ctx.lineTo(-16 - skidLen, -halfW + Math.sin(t * 12) * 2);
  ctx.stroke();

  // Right tire mark
  ctx.beginPath();
  ctx.moveTo(-16, halfW);
  ctx.lineTo(-16 - skidLen, halfW - Math.sin(t * 12) * 2);
  ctx.stroke();

  ctx.restore();
}

// ── BILLOWING TIRE SMOKE PUFFS ──────────────────────────────────────────────
function drawTireSmoke(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  intensity: number,
  t: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const numPuffs = 12;
  for (let i = 0; i < numPuffs; i++) {
    const seed = i * 37.3 + Math.floor(t * 22) * 11.9;
    const progress = (i / numPuffs);
    const px = -25 - progress * (90 + intensity * 50);
    const side = i % 2 === 0 ? -16 : 16;
    const py = side + Math.sin(seed) * 14 * progress;
    const radius = 8 + progress * 28;
    const alpha = (1 - progress) * (0.42 * intensity);

    const grad = ctx.createRadialGradient(px, py, 2, px, py, radius);
    grad.addColorStop(0, `rgba(235, 240, 250, ${alpha})`);
    grad.addColorStop(0.6, `rgba(200, 212, 228, ${alpha * 0.5})`);
    grad.addColorStop(1, 'rgba(180, 195, 210, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ── NEWS CHOPPER SEARCHLIGHT ────────────────────────────────────────────────
function drawSearchlight(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle * 0.4);
  const searchlightGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, 180);
  searchlightGrad.addColorStop(0, 'rgba(255, 255, 240, 0.42)');
  searchlightGrad.addColorStop(0.55, 'rgba(255, 255, 240, 0.14)');
  searchlightGrad.addColorStop(1, 'rgba(255, 255, 240, 0)');
  ctx.fillStyle = searchlightGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── SCENE 1: SKY-WEAZEL NEWS CHOPPER HIGH-SPEED POLICE PURSUIT ───────────────
function renderCam01NewsChopperChase(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  approach: 'subtle' | 'loud',
  crew: CrewMember[],
): void {
  const skyH = h * 0.28;
  const roadY = skyH;
  const roadH = h * 0.62;
  const laneCount = 4;
  const laneH = (roadH - 24) / laneCount;
  const laneScroll = (t * 1500) % 100;
  const lightSpacing = 450;
  const lightScroll = (t * 1500) % lightSpacing;

  // 1. Calculate Pursuit Physics, Drift Turning, and Shaky Camera Movement
  const cycleLen = 10.0;
  const ct = t % cycleLen;
  const p = calculatePursuitState(ct, t, w, roadY, roadH, laneH);

  // 2. Apply News Chopper Shaky Camera & Gimbal Vibration Transform
  ctx.save();
  ctx.translate(w * 0.5 + p.camShakeX, h * 0.5 + p.camShakeY);
  ctx.rotate(p.camRoll);
  ctx.scale(p.camZoom, p.camZoom);
  ctx.translate(-w * 0.5, -h * 0.5);

  // World Layer: Distant Vice City Skyline with Parallax
  drawCitySkyline(ctx, w, skyH, t, p.roadCurve);

  // Highway Curved Asphalt Surface & Markings
  drawRoadCurved(ctx, w, roadY, roadH, laneCount, laneH, laneScroll, lightScroll, p.roadCurve);

  // Civilian Traffic
  drawCivilianTraffic(ctx, w, roadY, laneH, t, p.roadCurve);

  // Rubber Skid Marks on Asphalt
  if (p.isDrifting || p.smokeIntensity > 0.08) {
    drawSkidMarks(ctx, p.susX, p.susY, p.susAngle, 48, p.smokeIntensity, t);
  }
  if (p.p1Drifting) {
    drawSkidMarks(ctx, p.p1X, p.p1Y, p.p1Angle, 46, 0.6, t);
  }

  // Tire Smoke Puffs during Drift
  if (p.smokeIntensity > 0.05) {
    drawTireSmoke(ctx, p.susX, p.susY, p.susAngle, p.smokeIntensity, t);
  }

  // Million-Candlepower Searchlight Tracking Suspect
  drawSearchlight(ctx, p.susX, p.susY, p.susAngle);

  // Police Cruisers in Aggressive Pursuit
  drawPoliceCruiser(ctx, p.p1X, p.p1Y, p.p1Angle, t, 1, p.p1Steer, p.p1Drifting);
  drawPoliceCruiser(ctx, p.p2X, p.p2Y, p.p2Angle, t + 0.5, 2, 0, false);
  if (approach === 'loud') {
    drawPoliceCruiser(ctx, p.p3X, p.p3Y, p.p3Angle, t + 0.25, 3, 0, false);
  }

  // Suspect Getaway Car (Drifting with counter-steer, brake lights, exhaust flames)
  drawSuspectCar(ctx, p.susX, p.susY, p.susAngle, t, approach === 'loud', p.susSteer, p.isBraking, p.isDrifting);

  ctx.restore(); // Restore camera shake transform before drawing broadcast HUD

  // 3. News Chopper HUD Target Lock Reticle (Screen Space tracking with gyro lag)
  const driverName = crew.find((c) => c.role.toLowerCase().includes('driver'))?.name || crew[0]?.name || 'SUSPECT';
  const screenSusX = w * 0.5 + (p.susX - w * 0.5) * p.camZoom + p.camShakeX;
  const screenSusY = h * 0.5 + (p.susY - h * 0.5) * p.camZoom + p.camShakeY;

  drawChopperTargetLock(ctx, screenSusX, screenSusY, 130, 60, driverName, p.speedMph, t, p.gForce, p.hudStatus);
}

// ── SCENE 2: HIGHWAY TRAFFIC INTERCEPT (ROADSIDE CCTV CAM) ──────────────────
function renderCam02HighwayIntercept(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  approach: 'subtle' | 'loud',
  crew: CrewMember[],
): void {
  // Roadside overhead surveillance perspective looking down on expressway curve
  ctx.fillStyle = '#080d16';
  ctx.fillRect(0, 0, w, h);

  // Curved highway
  const roadY = h * 0.25;
  const roadH = h * 0.65;
  ctx.fillStyle = '#111722';
  ctx.fillRect(0, roadY, w, roadH);

  // Road lane lines
  const laneScroll = (t * 1800) % 90;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  for (let l = 1; l < 3; l++) {
    const ly = roadY + l * (roadH / 3);
    for (let x = -90; x < w + 90; x += 90) {
      ctx.fillRect(x - laneScroll, ly - 2, 45, 4);
    }
  }

  // Cars blasting through the fixed surveillance frame at blistering speed
  const cycleTime = 2.4;
  const progress = (t % cycleTime) / cycleTime;

  // Suspect vehicle speeding across screen
  const susX = -120 + progress * (w + 300);
  const susY = roadY + roadH * 0.45;
  drawSuspectCar(ctx, susX, susY, 0, t, approach === 'loud');

  // Police cruiser 1 blasting right behind
  const p1X = susX - 160;
  const p1Y = roadY + roadH * 0.48;
  if (p1X > -150 && p1X < w + 150) {
    drawPoliceCruiser(ctx, p1X, p1Y, 0, t, 1);
  }

  // Police cruiser 2 blasting adjacent
  const p2X = susX - 280;
  const p2Y = roadY + roadH * 0.25;
  if (p2X > -150 && p2X < w + 150) {
    drawPoliceCruiser(ctx, p2X, p2Y, 0, t + 0.3, 2);
  }

  // Overhead gantry speed radar box
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(w * 0.05, h * 0.12, 340, 50);
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(w * 0.05, h * 0.12, 340, 50);

  ctx.fillStyle = '#ff2244';
  ctx.font = `bold 13px ${FONTS.mono}`;
  ctx.fillText('SPEED RADAR 14-B // VIOLATION DETECTED', w * 0.05 + 12, h * 0.12 + 22);
  ctx.fillStyle = '#ffffff';
  ctx.font = `12px ${FONTS.mono}`;
  ctx.fillText('RECORDED SPEED: 128 MPH (LIMIT: 65 MPH)', w * 0.05 + 12, h * 0.12 + 40);
  ctx.restore();

  // Target lock on suspect
  if (susX > 50 && susX < w - 50) {
    const driverName = crew.find((c) => c.role.toLowerCase().includes('driver'))?.name || crew[0]?.name || 'SUSPECT';
    drawChopperTargetLock(ctx, susX, susY, 120, 52, driverName, 128, t);
  }
}

// ── SCENE 3: HIGH-SECURITY VAULT (CCTV ARCHIVE) ─────────────────────────────
function renderCam03Vault(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  approach: 'subtle' | 'loud',
  crew: CrewMember[],
): void {
  // Vault interior back wall with safety deposit boxes
  ctx.fillStyle = '#080d14';
  ctx.fillRect(0, 0, w, h);

  // Safety deposit box grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  const boxW = w * 0.08;
  const boxH = h * 0.07;
  for (let x = w * 0.05; x < w * 0.45; x += boxW) {
    for (let y = h * 0.15; y < h * 0.75; y += boxH) {
      ctx.strokeRect(x, y, boxW - 4, boxH - 4);
    }
  }

  // Massive circular vault door on the right
  const doorX = w * 0.72;
  const doorY = h * 0.45;
  const doorR = h * 0.35;

  ctx.fillStyle = '#141e2b';
  ctx.beginPath();
  ctx.arc(doorX, doorY, doorR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#283c54';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Vault spokes
  ctx.strokeStyle = '#1e2c3c';
  ctx.lineWidth = 4;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    ctx.beginPath();
    ctx.moveTo(doorX, doorY);
    ctx.lineTo(doorX + Math.cos(a + t * 0.2) * (doorR - 15), doorY + Math.sin(a + t * 0.2) * (doorR - 15));
    ctx.stroke();
  }

  // Central locking wheel
  ctx.fillStyle = '#0c141e';
  ctx.beginPath();
  ctx.arc(doorX, doorY, doorR * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = approach === 'subtle' ? '#00f0ff' : '#ff2d78';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (approach === 'subtle') {
    // Night-vision green cast
    ctx.fillStyle = 'rgba(0, 255, 120, 0.05)';
    ctx.fillRect(0, 0, w, h);

    // Laser tripwire grid guarding the vault
    ctx.strokeStyle = 'rgba(255, 45, 120, 0.45)';
    ctx.lineWidth = 1.5;
    const l1 = Math.sin(t * 1.5) * 20;
    ctx.beginPath();
    ctx.moveTo(w * 0.4, h * 0.2 + l1);
    ctx.lineTo(w * 0.65, h * 0.75 - l1);
    ctx.stroke();

    // Operative cracking the lock mechanism
    const sus1X = w * 0.54 + Math.sin(t * 0.5) * 3;
    const sus1Y = h * 0.38;
    drawSuspectSilhouette(ctx, sus1X, sus1Y, 60, 125, 'stand');

    const member1 = crew[1] || crew[0] || { name: 'SAFE SPECIALIST', role: 'SAFECRACKER' };
    drawTrackingBox(ctx, sus1X - 10, sus1Y - 10, 80, 140, member1.name, member1.role, 95.8, t);
  } else {
    // LOUD ROUTE: Thermal lance & red alert
    const alertCycle = Math.sin(t * 10);
    if (alertCycle > 0) {
      ctx.fillStyle = 'rgba(255, 30, 50, 0.2)';
      ctx.fillRect(0, 0, w, h);
    }

    // Shower of sparks from the thermal lance
    drawExplosionSparks(ctx, doorX - doorR * 0.6, doorY, t * 2, 40);

    // Heavy operative burning the vault hinges
    const sus1X = doorX - doorR * 0.85;
    const sus1Y = h * 0.38;
    drawSuspectSilhouette(ctx, sus1X, sus1Y, 75, 135, 'assault');

    const member1 = crew[0] || { name: 'ASSAULT OPERATIVE', role: 'MUSCLE' };
    drawTrackingBox(ctx, sus1X - 15, sus1Y - 10, 95, 145, member1.name, member1.role, 99.2, t);

    // Duffel bags of cash on the floor
    ctx.fillStyle = '#0f1822';
    ctx.fillRect(w * 0.28, h * 0.65, 50, 30);
    ctx.fillStyle = '#22c55e';
    ctx.font = `bold 10px ${FONTS.mono}`;
    ctx.fillText('$ LOOT', w * 0.29, h * 0.64);
  }
}

// ── VEHICLE DRAWING ROUTINES ────────────────────────────────────────────────
function drawSuspectCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  t: number,
  isLoud: boolean,
  steerAngle: number = 0,
  isBraking: boolean = false,
  isDrifting: boolean = false,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const carL = 108;
  const carW = 48;

  // Shadow on asphalt
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(-carL / 2 - 4, -carW / 2 + 4, carL + 8, carW + 4);

  // 4 Tires with Counter-Steer / Turn Angle on front wheels
  // Rear tires
  ctx.fillStyle = '#0f141d';
  ctx.fillRect(-carL / 2 + 18, -carW / 2 - 2, 22, 7);
  ctx.fillRect(-carL / 2 + 18, carW / 2 - 5, 22, 7);

  // Front tires (steered)
  ctx.save();
  ctx.translate(carL / 2 - 24, -carW / 2 + 1);
  ctx.rotate(steerAngle);
  ctx.fillStyle = '#0f141d';
  ctx.fillRect(-11, -3, 22, 7);
  ctx.restore();

  ctx.save();
  ctx.translate(carL / 2 - 24, carW / 2 - 1);
  ctx.rotate(steerAngle);
  ctx.fillStyle = '#0f141d';
  ctx.fillRect(-11, -4, 22, 7);
  ctx.restore();

  // Red LED Taillight Trails streaming behind the car
  const trailGrad = ctx.createLinearGradient(-carL / 2 - 55, 0, -carL / 2, 0);
  trailGrad.addColorStop(0, 'rgba(255, 20, 60, 0)');
  trailGrad.addColorStop(1, isBraking ? 'rgba(255, 10, 50, 0.95)' : 'rgba(255, 20, 60, 0.85)');
  ctx.fillStyle = trailGrad;
  ctx.fillRect(-carL / 2 - 55, -carW / 2 + 6, 55, 8);
  ctx.fillRect(-carL / 2 - 55, carW / 2 - 14, 55, 8);

  // Twin exhaust flame bursts (spitting during drift kickdown or boost)
  if (isDrifting || Math.sin(t * 8) > 0.4) {
    ctx.fillStyle = '#ff6600';
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur = 12;
    ctx.fillRect(-carL / 2 - 22, -carW / 2 + 9, 20, 6);
    ctx.fillRect(-carL / 2 - 22, carW / 2 - 15, 20, 6);
    // Cyan inner flame core
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(-carL / 2 - 14, -carW / 2 + 10, 10, 4);
    ctx.fillRect(-carL / 2 - 14, carW / 2 - 14, 10, 4);
    ctx.shadowBlur = 0;
  }

  // Matte Black Aerodynamic Body (Gauntlet Hellfire)
  ctx.fillStyle = '#111620';
  ctx.beginPath();
  ctx.roundRect(-carL / 2, -carW / 2, carL, carW, 8);
  ctx.fill();
  ctx.strokeStyle = '#1e2838';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Centrifugal Body Roll Highlight
  const rollOffset = isDrifting ? Math.sin(angle) * 3 : 0;

  // Roof & Tinted Windshield
  ctx.fillStyle = '#0a0d14';
  ctx.beginPath();
  ctx.roundRect(-carL / 2 + 24, -carW / 2 + 6 + rollOffset, carL - 48, carW - 12, 6);
  ctx.fill();

  // Hood vents
  ctx.fillStyle = '#1c2432';
  ctx.fillRect(carL / 2 - 28, -8 + rollOffset, 14, 16);

  // Rear spoiler
  ctx.fillStyle = isLoud ? '#ff2d78' : '#080a10';
  ctx.fillRect(-carL / 2 - 4, -carW / 2 + 2, 8, carW - 4);

  // Headlights
  ctx.fillStyle = '#fff4cc';
  ctx.fillRect(carL / 2 - 4, -carW / 2 + 4, 4, 8);
  ctx.fillRect(carL / 2 - 4, carW / 2 - 12, 4, 8);

  // Brake Lights / Taillight Glow
  if (isBraking) {
    ctx.fillStyle = '#ff1133';
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = 18;
    ctx.fillRect(-carL / 2 - 2, -carW / 2 + 4, 4, 10);
    ctx.fillRect(-carL / 2 - 2, carW / 2 - 14, 4, 10);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawPoliceCruiser(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  t: number,
  unitNum: number,
  steerAngle: number = 0,
  _isDrifting: boolean = false,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const carL = 104;
  const carW = 46;

  // Shadow on asphalt
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(-carL / 2 - 4, -carW / 2 + 4, carL + 8, carW + 4);

  // Tires
  ctx.fillStyle = '#0c1018';
  ctx.fillRect(-carL / 2 + 18, -carW / 2 - 2, 20, 6);
  ctx.fillRect(-carL / 2 + 18, carW / 2 - 4, 20, 6);

  // Front tires with steer angle
  ctx.save();
  ctx.translate(carL / 2 - 24, -carW / 2 + 1);
  ctx.rotate(steerAngle);
  ctx.fillStyle = '#0c1018';
  ctx.fillRect(-10, -3, 20, 6);
  ctx.restore();

  ctx.save();
  ctx.translate(carL / 2 - 24, carW / 2 - 1);
  ctx.rotate(steerAngle);
  ctx.fillStyle = '#0c1018';
  ctx.fillRect(-10, -3, 20, 6);
  ctx.restore();

  // Forward High-Beam Headlight Cones projecting forward into the pursuit
  const beamGrad = ctx.createLinearGradient(carL / 2, 0, carL / 2 + 160, 0);
  beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
  beamGrad.addColorStop(0.7, 'rgba(255, 255, 240, 0.12)');
  beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(carL / 2, -carW / 2 + 6);
  ctx.lineTo(carL / 2 + 160, -carW / 2 - 25);
  ctx.lineTo(carL / 2 + 160, carW / 2 + 25);
  ctx.lineTo(carL / 2, carW / 2 - 6);
  ctx.closePath();
  ctx.fill();

  // Cruiser Body: Black hood & trunk
  ctx.fillStyle = '#0d1118';
  ctx.beginPath();
  ctx.roundRect(-carL / 2, -carW / 2, carL, carW, 6);
  ctx.fill();
  ctx.strokeStyle = '#1e2636';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // White Doors & White Roof (Classic Police Livery)
  ctx.fillStyle = '#edf2f7';
  ctx.fillRect(-carL / 2 + 26, -carW / 2 + 2, carL - 52, carW - 4);

  // Windshield & Rear glass
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-carL / 2 + 28, -carW / 2 + 6, carL - 56, carW - 12);

  // Roof center panel
  ctx.fillStyle = '#edf2f7';
  ctx.fillRect(-carL / 2 + 42, -carW / 2 + 8, carL - 84, carW - 16);

  // Front push bumper (Bullbar)
  ctx.fillStyle = '#334155';
  ctx.fillRect(carL / 2 - 2, -carW / 2 + 8, 4, carW - 16);

  // "POLICE" marking on doors
  ctx.fillStyle = '#0f172a';
  ctx.font = `bold 8px ${FONTS.mono}`;
  ctx.textAlign = 'center';
  ctx.fillText(`VCPD ${unitNum}`, 0, carW / 2 - 2);

  // ── High-Intensity LED Lightbar Strobes (14 Hz Alternating Red & Blue) ──
  const strobeSpeed = t * 24;
  const leftRed = Math.sin(strobeSpeed) > 0;
  const rightBlue = !leftRed;

  const barX = 2;
  const barY = 0;
  const barW = 10;
  const barH = carW - 14;

  // Lightbar frame
  ctx.fillStyle = '#020617';
  ctx.fillRect(barX - barW / 2, barY - barH / 2, barW, barH);

  // Red LED strobe
  const redColor = leftRed ? '#ff0033' : '#4a0814';
  ctx.fillStyle = redColor;
  ctx.fillRect(barX - barW / 2 + 1, barY - barH / 2 + 1, barW - 2, barH / 2 - 2);
  if (leftRed) {
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = 16;
    ctx.fillRect(barX - barW / 2 + 1, barY - barH / 2 + 1, barW - 2, barH / 2 - 2);
    ctx.shadowBlur = 0;
  }

  // Blue LED strobe
  const blueColor = rightBlue ? '#0077ff' : '#081c4a';
  ctx.fillStyle = blueColor;
  ctx.fillRect(barX - barW / 2 + 1, barY + 1, barW - 2, barH / 2 - 2);
  if (rightBlue) {
    ctx.shadowColor = '#0077ff';
    ctx.shadowBlur = 16;
    ctx.fillRect(barX - barW / 2 + 1, barY + 1, barW - 2, barH / 2 - 2);
    ctx.shadowBlur = 0;
  }

  // Ambient pulsating reflection on road pavement around cruiser
  const ambientSiren = ctx.createRadialGradient(0, 0, 10, 0, 0, 110);
  ambientSiren.addColorStop(0, leftRed ? 'rgba(255, 0, 50, 0.38)' : 'rgba(0, 110, 255, 0.38)');
  ambientSiren.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ambientSiren;
  ctx.beginPath();
  ctx.arc(0, 0, 110, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCivilianCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: 'taxi' | 'sedan',
  angle: number = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const carL = 98;
  const carW = 44;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(-carL / 2 - 4, -carW / 2 + 4, carL + 8, carW + 4);

  // Body color
  ctx.fillStyle = type === 'taxi' ? '#eab308' : '#334155';
  ctx.beginPath();
  ctx.roundRect(-carL / 2, -carW / 2, carL, carW, 6);
  ctx.fill();
  ctx.strokeStyle = type === 'taxi' ? '#ca8a04' : '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Glass
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-carL / 2 + 22, -carW / 2 + 5, carL - 44, carW - 10, 4);
  ctx.fill();

  // Roof
  ctx.fillStyle = type === 'taxi' ? '#facc15' : '#475569';
  ctx.fillRect(-carL / 2 + 36, -carW / 2 + 8, carL - 72, carW - 16);

  // Taxi roof sign
  if (type === 'taxi') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6, -carW / 2 + 14, 12, 16);
    ctx.fillStyle = '#000';
    ctx.font = `bold 6px ${FONTS.mono}`;
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, -carW / 2 + 24);
  }

  // Red brake lights
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-carL / 2 - 2, -carW / 2 + 4, 3, 6);
  ctx.fillRect(-carL / 2 - 2, carW / 2 - 10, 3, 6);

  ctx.restore();
}

// ── DISTANT SKYLINE DRAWING (WITH CURVATURE PARALLAX) ───────────────────────
function drawCitySkyline(
  ctx: CanvasRenderingContext2D,
  w: number,
  skyH: number,
  _t: number,
  roadCurve: number = 0,
): void {
  // Night sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, skyH);
  skyGrad.addColorStop(0, '#040710');
  skyGrad.addColorStop(0.7, '#070e1c');
  skyGrad.addColorStop(1, '#0c1728');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, skyH);

  // Ocean bay strip
  ctx.fillStyle = '#060d18';
  ctx.fillRect(0, skyH - 18, w, 18);

  // Neon buildings silhouette with slight banking parallax shift
  const parallaxShift = -roadCurve * 0.28;
  const bldgWidths = [45, 60, 35, 70, 50, 80, 40, 65, 55, 75, 40, 60, 50, 80, 45, 65, 70, 45, 55];
  let bx = parallaxShift - 30;
  for (let i = 0; i < bldgWidths.length && bx < w + 60; i++) {
    const bw = bldgWidths[i];
    const bh = 40 + ((i * 37) % (skyH - 60));
    const by = skyH - 18 - bh;

    ctx.fillStyle = i % 2 === 0 ? '#0b1322' : '#080e1a';
    ctx.fillRect(bx, by, bw - 4, bh);

    // Glowing building window dots
    ctx.fillStyle = i % 3 === 0 ? 'rgba(0, 240, 255, 0.45)' : 'rgba(255, 230, 160, 0.4)';
    for (let wx = bx + 6; wx < bx + bw - 10; wx += 10) {
      for (let wy = by + 8; wy < by + bh - 10; wy += 14) {
        if ((wx + wy) % 5 !== 0) {
          ctx.fillRect(wx, wy, 3, 4);
        }
      }
    }

    // Aviation beacon warning light on tall buildings
    if (bh > skyH * 0.6) {
      ctx.fillStyle = '#ff2244';
      ctx.fillRect(bx + bw / 2 - 2, by - 4, 3, 3);
    }

    bx += bw;
  }
}

// ── NEWS CHOPPER TARGET LOCK RETICLE ─────────────────────────────────────────
function drawChopperTargetLock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  driverName: string,
  speedMph: number,
  _t: number,
  gForce: number = 0.85,
  hudStatus: string = 'RADAR TARGET // TRACKED',
): void {
  ctx.save();
  const bracketLen = 16;
  const isHighG = gForce > 1.2;
  const color = isHighG ? '#ff2d78' : '#00f0ff';

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  // Bounding corners around target vehicle
  const halfW = w / 2 + 14;
  const halfH = h / 2 + 10;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(x - halfW, y - halfH + bracketLen);
  ctx.lineTo(x - halfW, y - halfH);
  ctx.lineTo(x - halfW + bracketLen, y - halfH);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + halfW - bracketLen, y - halfH);
  ctx.lineTo(x + halfW, y - halfH);
  ctx.lineTo(x + halfW, y - halfH + bracketLen);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x - halfW, y + halfH - bracketLen);
  ctx.lineTo(x - halfW, y + halfH);
  ctx.lineTo(x - halfW + bracketLen, y + halfH);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + halfW - bracketLen, y + halfH);
  ctx.lineTo(x + halfW, y + halfH);
  ctx.lineTo(x + halfW, y + halfH - bracketLen);
  ctx.stroke();

  // Gyro gimbal center reticle crosshair
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 22, y);
  ctx.lineTo(x - 6, y);
  ctx.moveTo(x + 6, y);
  ctx.lineTo(x + 22, y);
  ctx.moveTo(x, y - 22);
  ctx.lineTo(x, y - 6);
  ctx.moveTo(x, y + 6);
  ctx.lineTo(x, y + 22);
  ctx.stroke();

  // Target Information Tag (Speed + G-Force telemetry)
  ctx.fillStyle = 'rgba(2, 6, 14, 0.88)';
  ctx.fillRect(x - halfW, y - halfH - 26, 290, 22);
  ctx.fillStyle = color;
  ctx.font = `bold 11px ${FONTS.mono}`;
  ctx.textAlign = 'left';
  ctx.fillText(`TARGET LOCKED: ${speedMph} MPH // G-FORCE: ${gForce.toFixed(2)}G`, x - halfW + 6, y - halfH - 11);

  // Status & Driver name tag
  ctx.fillStyle = 'rgba(2, 6, 14, 0.88)';
  ctx.fillRect(x - halfW, y + halfH + 4, 280, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 11px ${FONTS.heading}`;
  ctx.fillText(`SUSPECT: ${driverName.toUpperCase()}`, x - halfW + 6, y + halfH + 17);
  ctx.fillStyle = color;
  ctx.font = `9px ${FONTS.mono}`;
  ctx.fillText(hudStatus, x - halfW + 6, y + halfH + 28);

  ctx.restore();
}

// ── SUSPECT SILHOUETTE DRAWING (FOR VAULT) ───────────────────────────────────
function drawSuspectSilhouette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pose: 'stand' | 'crouch' | 'run' | 'assault',
): void {
  ctx.save();
  ctx.fillStyle = '#080d14';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 10;

  // Head with balaclava/hood
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.16, h * 0.14, 0, Math.PI * 2);
  ctx.fill();

  // Torso / tactical vest
  ctx.beginPath();
  if (pose === 'crouch') {
    ctx.roundRect(x + w * 0.2, y + h * 0.3, w * 0.6, h * 0.45, 6);
  } else if (pose === 'run') {
    ctx.roundRect(x + w * 0.25, y + h * 0.28, w * 0.55, h * 0.42, 6);
  } else {
    ctx.roundRect(x + w * 0.18, y + h * 0.26, w * 0.64, h * 0.45, 6);
  }
  ctx.fill();

  // Legs
  ctx.lineWidth = w * 0.22;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#080d14';
  ctx.beginPath();
  if (pose === 'crouch') {
    ctx.moveTo(x + w * 0.35, y + h * 0.7);
    ctx.lineTo(x + w * 0.25, y + h * 0.95);
    ctx.moveTo(x + w * 0.65, y + h * 0.7);
    ctx.lineTo(x + w * 0.75, y + h * 0.95);
  } else if (pose === 'run') {
    ctx.moveTo(x + w * 0.35, y + h * 0.7);
    ctx.lineTo(x + w * 0.1, y + h * 0.95);
    ctx.moveTo(x + w * 0.65, y + h * 0.7);
    ctx.lineTo(x + w * 0.85, y + h * 0.9);
  } else {
    ctx.moveTo(x + w * 0.35, y + h * 0.7);
    ctx.lineTo(x + w * 0.35, y + h * 0.98);
    ctx.moveTo(x + w * 0.65, y + h * 0.7);
    ctx.lineTo(x + w * 0.65, y + h * 0.98);
  }
  ctx.stroke();

  // Duffel bag or tool
  ctx.fillStyle = '#142030';
  ctx.fillRect(x + w * 0.55, y + h * 0.45, w * 0.35, h * 0.25);

  ctx.restore();
}

function drawTrackingBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  name: string,
  role: string,
  confidence: number,
  t: number,
): void {
  ctx.save();
  const bracketLen = 14;
  const isAlert = Math.sin(t * 4) > 0.5;
  const color = isAlert ? '#00f0ff' : '#ff2d78';

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  // Top-left corner
  ctx.beginPath();
  ctx.moveTo(x, y + bracketLen);
  ctx.lineTo(x, y);
  ctx.lineTo(x + bracketLen, y);
  ctx.stroke();

  // Top-right corner
  ctx.beginPath();
  ctx.moveTo(x + w - bracketLen, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + bracketLen);
  ctx.stroke();

  // Bottom-left corner
  ctx.beginPath();
  ctx.moveTo(x, y + h - bracketLen);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + bracketLen, y + h);
  ctx.stroke();

  // Bottom-right corner
  ctx.beginPath();
  ctx.moveTo(x + w - bracketLen, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - bracketLen);
  ctx.stroke();

  // Header tag: Match confidence
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(x, y - 22, w + 30, 20);
  ctx.fillStyle = color;
  ctx.font = `bold 10px ${FONTS.mono}`;
  ctx.textAlign = 'left';
  ctx.fillText(`[MATCH ${confidence.toFixed(1)}%]`, x + 4, y - 8);

  // Footer tag: Suspect Name & Role
  const tagH = 26;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(x, y + h + 4, w + 45, tagH);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 11px ${FONTS.heading}`;
  ctx.fillText(name.toUpperCase(), x + 4, y + h + 17);
  ctx.fillStyle = color;
  ctx.font = `9px ${FONTS.mono}`;
  ctx.fillText(role.toUpperCase(), x + 4, y + h + 27);

  ctx.restore();
}

function drawExplosionSparks(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  count: number,
): void {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const seed = i * 137.5;
    const angle = (seed + t * 50) % (Math.PI * 2);
    const dist = ((t * 120 + seed) % 80);
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist * 0.7 + dist * 0.3;

    const size = (1 - dist / 80) * 3.5;
    ctx.fillStyle = i % 2 === 0 ? '#ffea00' : '#ff4500';
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(0.5, size), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── CCTV / NEWS BROADCAST HUD ───────────────────────────────────────────────
function drawCCTVHUD(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeMs: number,
  cameraIndex: number,
  approach: 'subtle' | 'loud',
  targetName: string,
  _crew: CrewMember[],
  isFreezeFrame: boolean,
): void {
  ctx.save();

  // Blinking LIVE / REC dot
  const recBlink = Math.floor(timeMs / 500) % 2 === 0;
  if (recBlink && !isFreezeFrame) {
    ctx.fillStyle = '#ff2244';
    ctx.beginPath();
    ctx.arc(28, 28, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur = 10;
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 14px ${FONTS.mono}`;
  ctx.textAlign = 'left';
  ctx.fillText(isFreezeFrame ? 'EVIDENCE STILL' : cameraIndex === 0 ? 'SKY-WEAZEL LIVE' : 'REC', 44, 33);

  // Camera Name & Mode
  const cam = CCTV_CAMERAS[cameraIndex] || CCTV_CAMERAS[0];
  ctx.fillStyle = '#00f0ff';
  ctx.font = `bold 13px ${FONTS.mono}`;
  ctx.fillText(`${cam.label} — ${cam.name}`, 180, 33);

  // Live Timestamp ticking (YYYY-MM-DD HH:MM:SS.ms)
  const now = new Date(1789972800000 + timeMs);
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8);
  const msStr = String(Math.floor(timeMs % 1000)).padStart(3, '0');
  const fullTimestamp = `${dateStr}  ${timeStr}.${msStr} EST`;

  ctx.fillStyle = '#f0ece0';
  ctx.font = `bold 13px ${FONTS.mono}`;
  ctx.textAlign = 'right';
  ctx.fillText(fullTimestamp, w - 24, 33);

  // Center crosshair / gyro gimbal
  if (cameraIndex === 0) {
    const t = timeMs / 1000;
    const cx = w / 2;
    const cy = h / 2;
    const bankAngle = Math.sin(t * 1.1) * 0.05;

    // Artificial horizon pitch line with bank tilt
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(bankAngle);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-60, 0);
    ctx.lineTo(-20, 0);
    ctx.moveTo(20, 0);
    ctx.lineTo(60, 0);
    ctx.stroke();

    // Pitch ladder rungs
    ctx.strokeRect(-40, -40, 80, 80);
    ctx.restore();

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy);
    ctx.lineTo(cx + 30, cy);
    ctx.moveTo(cx, cy - 30);
    ctx.lineTo(cx, cy + 30);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 240, 255, 0.75)';
    ctx.font = `10px ${FONTS.mono}`;
    ctx.fillText('FLIR HD 36X GIMBAL', cx + 55, cy - 35);
    ctx.fillText('ALT: 1,180 FT // GYRO-STAB', cx + 55, cy - 20);
    ctx.fillText(`AZ: ${Math.round(180 + Math.sin(t * 0.8) * 12)}° // TRACKING`, cx + 55, cy - 5);
  }

  // Bottom-left info
  ctx.textAlign = 'left';
  ctx.font = `11px ${FONTS.mono}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText(`WEAZEL NEWS 4 BROADCAST NETWORK // POLICE PURSUIT DESK`, 24, h - 28);
  ctx.fillStyle = '#00f0ff';
  ctx.fillText(`PURSUIT OF ${targetName.toUpperCase()} SUSPECTS • APPROACH: ${approach.toUpperCase()}`, 24, h - 14);

  // Bottom-right archive ID
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText(`FEED: SKY-WEAZEL GIMBAL 4K // BROADCAST LINK`, w - 24, h - 28);
  ctx.fillStyle = '#ff2d78';
  ctx.fillText('ACTIVE HIGHWAY PURSUIT // VCPD UNITS ENGAGED', w - 24, h - 14);

  ctx.restore();
}

// ── SHADERS ─────────────────────────────────────────────────────────────────
function drawAtmosphere(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  _t: number,
  approach: 'subtle' | 'loud',
): void {
  if (approach === 'subtle') {
    ctx.fillStyle = 'rgba(0, 240, 255, 0.025)';
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = 'rgba(255, 45, 120, 0.02)';
    ctx.fillRect(0, 0, w, h);
  }
}

function drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
  for (let y = 0; y < h; y += 4) {
    ctx.fillRect(0, y, w, 1.5);
  }
  ctx.restore();
}

function drawNoise(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  if (Math.sin(t * 12) > 0.95) {
    ctx.save();
    const glitchY = (Math.sin(t * 53) * 0.5 + 0.5) * h;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.fillRect(0, glitchY, w, 10);
    ctx.restore();
  }
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.max(w, h) * 0.65;
  const grad = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
