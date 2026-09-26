import { FONTS } from '../config/theme';
import { createCanvas, canvasToDataUrl } from '../utils/canvas';
import type { WantedDossierData } from '../config/wantedDossier';

export const WANTED_W = 1920;
export const WANTED_H = 1080;

const loadImg = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = src;
  });

export type WantedPosterStyle = 'evidence' | 'poster';

/**
 * Draws a realistic forensic fingerprint whorl onto the canvas
 */
function drawFingerprint(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(25, 30, 45, 0.75)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';

  for (let r = 8; r < radius; r += 5) {
    ctx.beginPath();
    const startAngle = Math.PI * 0.15;
    const endAngle = Math.PI * 1.85;
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.stroke();

    // Occasional ridge breaks
    if (r % 10 === 0) {
      ctx.beginPath();
      ctx.arc(cx + 3, cy - 2, r - 2, startAngle + 0.3, endAngle - 0.4);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Draws red rubber stamp marks
 */
function drawRubberStamp(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  angleRad: number,
  color = '#cc1133',
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleRad);

  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.font = `900 24px ${FONTS.typewriter}`;
  const textW = ctx.measureText(text).width;
  const padX = 16;
  const padY = 8;

  ctx.strokeRect(-textW / 2 - padX, -18 - padY, textW + padX * 2, 36 + padY * 2);

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);

  // Subtle ink distressing
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-textW / 2 - padX + 2, -18 - padY + 2, textW + padX * 2 - 4, 36 + padY * 2 - 4);

  ctx.restore();
}

/**
 * Draws yellow police crime scene tape across corners
 */
function drawCrimeSceneTape(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.save();
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  ctx.translate(x1, y1);
  ctx.rotate(angle);

  // Yellow banner
  ctx.fillStyle = '#f5c518';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.fillRect(0, -18, len, 36);

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#11151c';
  ctx.font = `900 15px ${FONTS.mono}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const step = 280;
  for (let x = 70; x < len; x += step) {
    ctx.fillText('POLICE LINE DO NOT CROSS // VCPD CRIME SCENE', x, 0);
  }

  // Black stripes along edges
  ctx.fillStyle = '#11151c';
  ctx.fillRect(0, -18, len, 3);
  ctx.fillRect(0, 15, len, 3);

  ctx.restore();
}

/**
 * Mode 1: FBI & VCPD Evidence Locker Corkboard (1920x1080)
 */
async function renderEvidenceCorkboard(
  ctx: CanvasRenderingContext2D,
  data: WantedDossierData,
  w: number,
  h: number,
) {
  // 1. Corkboard Texture Background
  const corkGrad = ctx.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, w * 0.75);
  corkGrad.addColorStop(0, '#382a1d');
  corkGrad.addColorStop(0.5, '#281c13');
  corkGrad.addColorStop(1, '#181009');
  ctx.fillStyle = corkGrad;
  ctx.fillRect(0, 0, w, h);

  // Fine cork noise stippling
  ctx.fillStyle = 'rgba(210, 160, 100, 0.04)';
  for (let i = 0; i < 600; i++) {
    const rx = Math.random() * w;
    const ry = Math.random() * h;
    const s = 1 + Math.random() * 3;
    ctx.fillRect(rx, ry, s, s);
  }

  // 2. Main Center-Left Manila Case File Folder
  const folderX = 40;
  const folderY = 40;
  const folderW = 1080;
  const folderH = 990;

  // Folder drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 15;
  ctx.fillStyle = '#e8d9b5'; // Manila folder paper
  ctx.fillRect(folderX, folderY, folderW, folderH);

  ctx.shadowColor = 'transparent';

  // Folder header tab
  ctx.fillStyle = '#d6c498';
  ctx.fillRect(folderX, folderY - 24, 320, 26);
  ctx.fillStyle = '#3a2e1d';
  ctx.font = `bold 12px ${FONTS.mono}`;
  ctx.fillText(`CASE FILE: #${data.caseFileNumber}`, folderX + 16, folderY - 8);

  // Folder Header & Federal Seals
  ctx.fillStyle = '#1c1b18';
  ctx.font = `900 28px ${FONTS.gta}`;
  ctx.fillText('VICE CITY POLICE DEPARTMENT • MAJOR CRIMES DIVISION', folderX + 40, folderY + 50);

  ctx.font = `bold 13px ${FONTS.mono}`;
  ctx.fillStyle = '#6e5f4a';
  ctx.fillText(`JOINT TACTICAL INVESTIGATION DOSSIER // LEONIDA STATE ATTORNEY // BOLO NOTICE`, folderX + 40, folderY + 74);

  ctx.strokeStyle = '#b8a67d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(folderX + 40, folderY + 90);
  ctx.lineTo(folderX + folderW - 40, folderY + 90);
  ctx.stroke();

  // Top Case Metadata Bar
  ctx.fillStyle = '#222';
  ctx.font = `bold 14px ${FONTS.typewriter}`;
  ctx.fillText(`OPERATION CODENAME: [ ${data.codename.toUpperCase()} ]`, folderX + 40, folderY + 120);
  ctx.fillText(`TARGET HIT: ${data.targetName.toUpperCase()}`, folderX + 40, folderY + 144);
  ctx.fillText(`HEIST MODUS OPERANDI: ${data.approach.toUpperCase()} INFILTRATION`, folderX + 40, folderY + 168);

  ctx.fillStyle = '#b01020';
  ctx.font = `900 16px ${FONTS.typewriter}`;
  ctx.fillText(`TOTAL ASSETS LOOTED: ${data.totalStolenFormatted}`, folderX + 620, folderY + 120);
  ctx.fillText(`FEDERAL BOUNTY REWARD: ${data.bountyRewardFormatted}`, folderX + 620, folderY + 144);
  ctx.fillText(`WANTED STATUS: ⭐ ${data.wantedStars} STARS (${data.threatLevel})`, folderX + 620, folderY + 168);

  ctx.strokeStyle = '#b8a67d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(folderX + 40, folderY + 185);
  ctx.lineTo(folderX + folderW - 40, folderY + 185);
  ctx.stroke();

  // 3. Suspect Lineup Mugshots (Polaroid Style inside Manila Folder)
  const mugshotAreaY = folderY + 205;
  const numSuspects = Math.min(4, data.suspects.length);
  const cardW = 230;
  const cardH = 340;
  const cardGap = 20;

  for (let i = 0; i < numSuspects; i++) {
    const s = data.suspects[i];
    const cx = folderX + 40 + i * (cardW + cardGap);
    const cy = mugshotAreaY;

    // Polaroid card paper
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#fcfbfa';
    ctx.fillRect(cx, cy, cardW, cardH);
    ctx.shadowColor = 'transparent';

    // Pushpin at top center
    ctx.fillStyle = i % 2 === 0 ? '#cc1133' : '#0077cc';
    ctx.beginPath();
    ctx.arc(cx + cardW / 2, cy + 8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + cardW / 2 - 2, cy + 6, 2, 0, Math.PI * 2);
    ctx.fill();

    // Portrait box (with height measurement lines in background)
    const imgX = cx + 14;
    const imgY = cy + 20;
    const imgW = cardW - 28;
    const imgH = 195;

    // Inmate height chart background
    ctx.fillStyle = '#e8edf2';
    ctx.fillRect(imgX, imgY, imgW, imgH);
    ctx.strokeStyle = 'rgba(100, 120, 140, 0.4)';
    ctx.lineWidth = 1;
    for (let hLine = 0; hLine < imgH; hLine += 18) {
      ctx.beginPath();
      ctx.moveTo(imgX, imgY + hLine);
      ctx.lineTo(imgX + imgW, imgY + hLine);
      ctx.stroke();
    }

    // Load and draw suspect mugshot
    const portraitImg = await loadImg(s.portrait);
    if (portraitImg.width > 0) {
      ctx.drawImage(portraitImg, imgX, imgY, imgW, imgH);
    }

    // High contrast black-and-white booking overlay effect
    ctx.fillStyle = 'rgba(15, 20, 35, 0.12)';
    ctx.fillRect(imgX, imgY, imgW, imgH);

    // Inmate booking number bar at chest level
    ctx.fillStyle = 'rgba(15, 20, 30, 0.9)';
    ctx.fillRect(imgX + 8, imgY + imgH - 32, imgW - 16, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 11px ${FONTS.mono}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${s.bookingNumber} • VCPD`, imgX + imgW / 2, imgY + imgH - 15);
    ctx.textAlign = 'left';

    // Polaroid bottom text
    ctx.fillStyle = '#1c1b18';
    ctx.font = `900 15px ${FONTS.gta}`;
    ctx.fillText(s.name.toUpperCase(), cx + 14, cy + 235);

    ctx.font = `bold 11px ${FONTS.mono}`;
    ctx.fillStyle = '#b01020';
    ctx.fillText(`ALIAS: "${s.alias}"`, cx + 14, cy + 252);

    ctx.fillStyle = '#555';
    ctx.font = `11px ${FONTS.mono}`;
    ctx.fillText(`ROLE: ${s.role.toUpperCase()}`, cx + 14, cy + 268);
    ctx.fillText(`HT: ${s.height} | WT: ${s.weight}`, cx + 14, cy + 284);

    // Status badge
    ctx.fillStyle = s.status === 'PRIMARY TARGET' ? '#b01020' : '#d97706';
    ctx.fillRect(cx + 14, cy + 296, cardW - 28, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 10px ${FONTS.mono}`;
    ctx.textAlign = 'center';
    ctx.fillText(s.status, cx + cardW / 2, cy + 310);
    ctx.textAlign = 'left';
  }

  // 4. Procedural Criminal Charges & Indictment Section
  const indictmentY = mugshotAreaY + cardH + 24;
  ctx.fillStyle = '#1c1b18';
  ctx.font = `900 18px ${FONTS.typewriter}`;
  ctx.fillText('CRIMINAL INDICTMENT & ACTIVE FELONY COUNTS:', folderX + 40, indictmentY);

  ctx.strokeStyle = '#b8a67d';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(folderX + 40, indictmentY + 8);
  ctx.lineTo(folderX + folderW - 40, indictmentY + 8);
  ctx.stroke();

  let chargeY = indictmentY + 28;
  data.charges.forEach((ch, idx) => {
    if (chargeY > folderY + folderH - 45) return;

    ctx.fillStyle = '#991122';
    ctx.font = `bold 13px ${FONTS.mono}`;
    ctx.fillText(`[COUNT ${idx + 1}]  ${ch.code} — ${ch.title}`, folderX + 40, chargeY);

    ctx.fillStyle = '#2b2a27';
    ctx.font = `12px ${FONTS.typewriter}`;
    ctx.fillText(`   ${ch.description}`, folderX + 40, chargeY + 16);

    chargeY += 36;
  });

  // Folder Footer stamp
  drawRubberStamp(ctx, 'CONFIDENTIAL', folderX + folderW - 130, folderY + folderH - 55, -0.15, '#b01020');
  drawRubberStamp(ctx, 'EXHIBIT A', folderX + 110, folderY + folderH - 55, 0.12, '#1e40af');

  // 5. Right-Hand Evidence Board Area (1160px to 1880px)
  const rightX = 1160;

  // A. Large Official "WANTED BY VCPD" Notice Card
  const noticeY = 40;
  const noticeW = 720;
  const noticeH = 460;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#f8f4eb'; // Aged legal parchment
  ctx.fillRect(rightX, noticeY, noticeW, noticeH);
  ctx.shadowColor = 'transparent';

  // Double border
  ctx.strokeStyle = '#181b22';
  ctx.lineWidth = 4;
  ctx.strokeRect(rightX + 12, noticeY + 12, noticeW - 24, noticeH - 24);
  ctx.lineWidth = 1;
  ctx.strokeRect(rightX + 18, noticeY + 18, noticeW - 36, noticeH - 36);

  // Top Stars
  ctx.fillStyle = '#181b22';
  ctx.font = `20px ${FONTS.gta}`;
  ctx.textAlign = 'center';
  ctx.fillText('★ ★ ★  VICE CITY POLICE DEPARTMENT  ★ ★ ★', rightX + noticeW / 2, noticeY + 44);

  // Big WANTED headline
  ctx.fillStyle = '#a80c1e';
  ctx.font = `900 68px ${FONTS.gta}`;
  ctx.fillText('WANTED', rightX + noticeW / 2, noticeY + 104);

  ctx.fillStyle = '#181b22';
  ctx.font = `bold 16px ${FONTS.mono}`;
  ctx.fillText('DEAD OR ALIVE • MAJOR CRIMES TASK FORCE', rightX + noticeW / 2, noticeY + 128);

  // Big Bounty Callout Box
  ctx.fillStyle = '#181b22';
  ctx.fillRect(rightX + 36, noticeY + 144, noticeW - 72, 70);

  ctx.fillStyle = '#f5c518';
  ctx.font = `bold 16px ${FONTS.mono}`;
  ctx.fillText('REWARD FOR INFORMATION LEADING TO CAPTURE:', rightX + noticeW / 2, noticeY + 168);

  ctx.font = `900 38px ${FONTS.gta}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(data.bountyRewardFormatted, rightX + noticeW / 2, noticeY + 204);

  // Warning text
  ctx.fillStyle = '#222';
  ctx.font = `bold 12px ${FONTS.typewriter}`;
  ctx.fillText('SUSPECTS SHOULD BE CONSIDERED ARMED AND EXTREMELY DANGEROUS.', rightX + noticeW / 2, noticeY + 236);

  // BOLO text wrap
  ctx.fillStyle = '#444';
  ctx.font = `12px ${FONTS.typewriter}`;
  ctx.fillText(`INVESTIGATING: ${data.investigatingUnit}`, rightX + noticeW / 2, noticeY + 264);
  ctx.fillText(`LEAD: ${data.leadInvestigator}`, rightX + noticeW / 2, noticeY + 284);
  ctx.fillText(`LAST SEEN: ${data.lastKnownLocation}`, rightX + noticeW / 2, noticeY + 304);

  // B. Forensic Fingerprint Card (Pinned to corkboard)
  const fpCardX = rightX + 40;
  const fpCardY = noticeY + 328;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(fpCardX, fpCardY, 190, 110);
  ctx.strokeStyle = '#bbb';
  ctx.strokeRect(fpCardX, fpCardY, 190, 110);

  ctx.fillStyle = '#222';
  ctx.font = `bold 9px ${FONTS.mono}`;
  ctx.textAlign = 'left';
  ctx.fillText('FORENSIC LATENT PRINT', fpCardX + 10, fpCardY + 18);
  ctx.fillText('MATCH CONFIRMED: 98.4%', fpCardX + 10, fpCardY + 30);
  drawFingerprint(ctx, fpCardX + 135, fpCardY + 62, 34);

  // Red stamp on Wanted poster
  drawRubberStamp(ctx, 'ACTIVE BOLO', rightX + noticeW - 140, noticeY + 380, -0.22, '#cc1133');

  // C. Lower Evidence Dossier: Vehicle & Tactical Intercept Report
  const reportY = 530;
  const reportW = 720;
  const reportH = 500;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#ece8dd';
  ctx.fillRect(rightX, reportY, reportW, reportH);
  ctx.shadowColor = 'transparent';

  // Report Header
  ctx.fillStyle = '#1c1b18';
  ctx.font = `900 20px ${FONTS.gta}`;
  ctx.textAlign = 'left';
  ctx.fillText('VCPD FORENSIC CRIME LAB • INCIDENT ASSESSMENT', rightX + 30, reportY + 40);

  ctx.strokeStyle = '#b8a67d';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rightX + 30, reportY + 54);
  ctx.lineTo(rightX + reportW - 30, reportY + 54);
  ctx.stroke();

  // Field notes
  ctx.fillStyle = '#222';
  ctx.font = `13px ${FONTS.typewriter}`;
  ctx.fillText(`• GETAWAY INTEL:`, rightX + 30, reportY + 84);
  ctx.fillStyle = '#444';
  ctx.font = `12px ${FONTS.mono}`;
  ctx.fillText(`${data.getawayIntel}`, rightX + 45, reportY + 106);

  ctx.fillStyle = '#222';
  ctx.font = `13px ${FONTS.typewriter}`;
  ctx.fillText(`• TACTICAL THREAT PROFILE:`, rightX + 30, reportY + 144);
  ctx.fillStyle = '#991122';
  ctx.font = `bold 12px ${FONTS.mono}`;
  ctx.fillText(`THREAT LEVEL: ${data.threatLevel} // AUTHORIZED RESPONSE: CODE 3 SWAT INTERCEPT`, rightX + 45, reportY + 166);

  ctx.fillStyle = '#222';
  ctx.font = `13px ${FONTS.typewriter}`;
  ctx.fillText(`• SUSPECT OPERATIONAL SPECIALTIES:`, rightX + 30, reportY + 204);

  let specY = reportY + 226;
  data.suspects.slice(0, 3).forEach((s) => {
    ctx.fillStyle = '#333';
    ctx.font = `bold 11px ${FONTS.mono}`;
    ctx.fillText(`${s.name} (${s.role}):`, rightX + 45, specY);
    ctx.font = `11px ${FONTS.typewriter}`;
    ctx.fillStyle = '#555';
    ctx.fillText(s.specialtyWarning, rightX + 45, specY + 16);
    specY += 34;
  });

  // Red Investigation Conspiracy Strings (Connecting Suspects to Target)
  ctx.save();
  ctx.strokeStyle = 'rgba(230, 20, 40, 0.85)';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 3;

  // String 1: Manila folder header to Wanted Notice
  ctx.beginPath();
  ctx.moveTo(folderX + 400, folderY + 120);
  ctx.bezierCurveTo(900, 80, 1100, 120, rightX + 180, noticeY + 200);
  ctx.stroke();

  // String 2: Suspect #1 to crime report
  ctx.beginPath();
  ctx.moveTo(folderX + 160, mugshotAreaY + 10);
  ctx.bezierCurveTo(800, 360, 1000, 580, rightX + 100, reportY + 60);
  ctx.stroke();
  ctx.restore();

  // 6. Yellow Crime Scene Tape on Bottom Corners
  drawCrimeSceneTape(ctx, -40, h - 80, 380, h + 40);
  drawCrimeSceneTape(ctx, w - 360, h + 40, w + 40, h - 100);
}

/**
 * Mode 2: Vintage 80s VCPD "WANTED: ARMED & DANGEROUS" Poster (1920x1080)
 */
async function renderVintageWantedPoster(
  ctx: CanvasRenderingContext2D,
  data: WantedDossierData,
  w: number,
  h: number,
) {
  // 1. Aged Distressed Parchment Background
  const parchmentGrad = ctx.createLinearGradient(0, 0, w, h);
  parchmentGrad.addColorStop(0, '#ebd8b2');
  parchmentGrad.addColorStop(0.5, '#dfc89f');
  parchmentGrad.addColorStop(1, '#cbb286');
  ctx.fillStyle = parchmentGrad;
  ctx.fillRect(0, 0, w, h);

  // Grunge vignette around borders
  const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(60, 40, 20, 0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Thick Vintage Woodblock Frame
  ctx.strokeStyle = '#181b22';
  ctx.lineWidth = 14;
  ctx.strokeRect(36, 36, w - 72, h - 72);

  ctx.lineWidth = 3;
  ctx.strokeRect(58, 58, w - 116, h - 116);

  // Corner security flourishes
  ctx.fillStyle = '#181b22';
  ctx.fillRect(52, 52, 16, 16);
  ctx.fillRect(w - 68, 52, 16, 16);
  ctx.fillRect(52, h - 68, 16, 16);
  ctx.fillRect(w - 68, h - 68, 16, 16);

  // Top Banner
  ctx.textAlign = 'center';
  ctx.font = `bold 24px ${FONTS.gta}`;
  ctx.fillText('★  VICE CITY POLICE DEPARTMENT • SPECIAL INVESTIGATIVE BULLETIN  ★', w / 2, 105);

  // Massive WANTED Headline
  ctx.font = `900 110px ${FONTS.gta}`;
  ctx.fillStyle = '#181b22';
  ctx.fillText('WANTED', w / 2, 210);

  ctx.font = `900 24px ${FONTS.gta}`;
  ctx.fillStyle = '#8f0d1a';
  ctx.fillText('DEAD OR ALIVE • CONSIDERED ARMED & EXTREMELY DANGEROUS', w / 2, 244);

  // Huge Bounty Ribbon
  ctx.fillStyle = '#181b22';
  ctx.fillRect(180, 265, w - 360, 68);
  ctx.fillStyle = '#f5c518';
  ctx.font = `bold 16px ${FONTS.mono}`;
  ctx.fillText('OFFICIAL REWARD FOR ARREST OR RELIABLE CONVICTION INFORMATION:', w / 2, 290);
  ctx.font = `900 38px ${FONTS.gta}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(data.bountyRewardFormatted, w / 2, 322);

  // Suspect Mugshot Row (Up to 4 suspects)
  const mugshotsY = 360;
  const numSuspects = Math.min(4, data.suspects.length);
  const cardW = 320;
  const cardH = 340;
  const spacing = 36;
  const totalMugshotsW = numSuspects * cardW + (numSuspects - 1) * spacing;
  const startX = (w - totalMugshotsW) / 2;

  for (let i = 0; i < numSuspects; i++) {
    const s = data.suspects[i];
    const mx = startX + i * (cardW + spacing);
    const my = mugshotsY;

    // Inmate frame
    ctx.strokeStyle = '#181b22';
    ctx.lineWidth = 3;
    ctx.strokeRect(mx, my, cardW, cardH);

    // Height measurement backdrop
    const imgX = mx + 10;
    const imgY = my + 10;
    const imgW = cardW - 20;
    const imgH = 240;

    ctx.fillStyle = '#d5cbb8';
    ctx.fillRect(imgX, imgY, imgW, imgH);
    ctx.strokeStyle = 'rgba(24, 27, 34, 0.3)';
    ctx.lineWidth = 1;
    for (let hLine = 0; hLine < imgH; hLine += 20) {
      ctx.beginPath();
      ctx.moveTo(imgX, imgY + hLine);
      ctx.lineTo(imgX + imgW, imgY + hLine);
      ctx.stroke();
    }

    // Draw mugshot
    const mugImg = await loadImg(s.portrait);
    if (mugImg.width > 0) {
      ctx.drawImage(mugImg, imgX, imgY, imgW, imgH);
    }

    // Inmate number plate
    ctx.fillStyle = '#181b22';
    ctx.fillRect(imgX + 16, imgY + imgH - 34, imgW - 32, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 13px ${FONTS.mono}`;
    ctx.fillText(`${s.bookingNumber} • VCPD`, imgX + imgW / 2, imgY + imgH - 15);

    // Details below mugshot
    ctx.fillStyle = '#181b22';
    ctx.font = `900 18px ${FONTS.gta}`;
    ctx.fillText(s.name.toUpperCase(), mx + cardW / 2, my + 276);

    ctx.font = `bold 12px ${FONTS.mono}`;
    ctx.fillStyle = '#8f0d1a';
    ctx.fillText(`ALIAS: "${s.alias}"`, mx + cardW / 2, my + 296);

    ctx.font = `12px ${FONTS.typewriter}`;
    ctx.fillStyle = '#333';
    ctx.fillText(`ROLE: ${s.role.toUpperCase()} • HT: ${s.height}`, mx + cardW / 2, my + 316);
    ctx.fillText(`STATUS: ${s.status}`, mx + cardW / 2, my + 332);
  }

  // Criminal Profile & Indictment Box
  const profileY = mugshotsY + cardH + 24;
  ctx.fillStyle = '#181b22';
  ctx.font = `900 20px ${FONTS.gta}`;
  ctx.fillText('CRIMINAL INDICTMENT & OFFENSE SUMMARY', w / 2, profileY);

  ctx.strokeStyle = '#181b22';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(220, profileY + 10);
  ctx.lineTo(w - 220, profileY + 10);
  ctx.stroke();

  ctx.font = `13px ${FONTS.typewriter}`;
  ctx.fillStyle = '#222';
  ctx.fillText(`OPERATION: ${data.codename.toUpperCase()}  |  TARGET HIT: ${data.targetName.toUpperCase()}  |  HEIST TAKE: ${data.totalStolenFormatted}`, w / 2, profileY + 34);

  // Charges bullets
  let cY = profileY + 60;
  data.charges.slice(0, 3).forEach((ch, idx) => {
    ctx.font = `bold 13px ${FONTS.mono}`;
    ctx.fillStyle = '#8f0d1a';
    ctx.fillText(`[CHARGE ${idx + 1}] ${ch.code} — ${ch.title}`, w / 2, cY);
    ctx.font = `12px ${FONTS.typewriter}`;
    ctx.fillStyle = '#333';
    ctx.fillText(ch.description, w / 2, cY + 18);
    cY += 40;
  });

  // Footer Caution & Signatures
  ctx.font = `bold 12px ${FONTS.mono}`;
  ctx.fillStyle = '#181b22';
  ctx.fillText(data.boloNotice, w / 2, h - 80);

  // Official Stamp
  drawRubberStamp(ctx, 'WANTED BY VCPD', 260, h - 120, -0.15, '#8f0d1a');
  drawRubberStamp(ctx, 'LEONIDA STATE POLICE', w - 260, h - 120, 0.12, '#181b22');
}

/**
 * Main Entry Point: Renders the Wanted Poster / Evidence Board to data URL
 */
export async function renderWantedPoster(
  data: WantedDossierData,
  style: WantedPosterStyle = 'evidence',
): Promise<string> {
  const [canvas, ctx] = createCanvas(WANTED_W, WANTED_H);

  if (style === 'evidence') {
    await renderEvidenceCorkboard(ctx, data, WANTED_W, WANTED_H);
  } else {
    await renderVintageWantedPoster(ctx, data, WANTED_W, WANTED_H);
  }

  return canvasToDataUrl(canvas);
}
