import { FONTS } from '../config/theme';
import { createCanvas, canvasToDataUrl } from '../utils/canvas';
import { formatCurrency, type HeistPayoutBreakdown } from '../config/payout';

export const RECEIPT_W = 680;
export const RECEIPT_H = 920;

const loadImg = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = src;
  });

/**
 * Renders the official Bank of Leonida Wire Transfer Slip / Settlement Invoice.
 */
export async function renderWireTransferReceipt(
  breakdown: HeistPayoutBreakdown,
  codename: string,
): Promise<string> {
  const [canvas, ctx] = createCanvas(RECEIPT_W, RECEIPT_H);

  // 1. Parchment paper background with subtle security gradient
  const bgGrad = ctx.createLinearGradient(0, 0, RECEIPT_W, RECEIPT_H);
  bgGrad.addColorStop(0, '#f9f6ee');
  bgGrad.addColorStop(0.5, '#f4efe2');
  bgGrad.addColorStop(1, '#ece5d3');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, RECEIPT_W, RECEIPT_H);

  // Security microprint double border
  ctx.strokeStyle = '#2b313d';
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, RECEIPT_W - 36, RECEIPT_H - 36);

  ctx.strokeStyle = 'rgba(43, 49, 61, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, RECEIPT_W - 48, RECEIPT_H - 48);

  // Corner security rosettes / notches
  const drawCorner = (x: number, y: number) => {
    ctx.fillStyle = '#2b313d';
    ctx.fillRect(x - 5, y - 5, 10, 10);
  };
  drawCorner(24, 24);
  drawCorner(RECEIPT_W - 24, 24);
  drawCorner(24, RECEIPT_H - 24);
  drawCorner(RECEIPT_W - 24, RECEIPT_H - 24);

  // 2. Bank of Leonida Header & Emblem
  ctx.fillStyle = '#11151c';
  ctx.font = `bold 22px ${FONTS.gta}`;
  ctx.textAlign = 'center';
  ctx.fillText('BANK OF LEONIDA • OFFSHORE CLEARING', RECEIPT_W / 2, 64);

  ctx.fillStyle = '#4b5563';
  ctx.font = `bold 12px ${FONTS.mono}`;
  ctx.fillText('CAYMAN ISLANDS WIRE SETTLEMENT & LAUNDERING DISPATCH', RECEIPT_W / 2, 84);
  ctx.fillText('NON-NEGOTIABLE • CONFIDENTIAL HEIST PAYOUT SLIP', RECEIPT_W / 2, 100);

  // Horizontal divider
  ctx.strokeStyle = '#11151c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(36, 114);
  ctx.lineTo(RECEIPT_W - 36, 114);
  ctx.stroke();

  // 3. Metadata box
  const startY = 142;
  const leftCol = 44;
  const rightCol = RECEIPT_W - 44;

  ctx.font = `bold 13px ${FONTS.mono}`;
  ctx.fillStyle = '#374151';
  ctx.textAlign = 'left';
  ctx.fillText('REF NUMBER:', leftCol, startY);
  ctx.fillStyle = '#111827';
  ctx.fillText(`VC-WIRE-${Math.abs(codename.split('').reduce((a, b) => a + b.charCodeAt(0), 1000))}-X9`, leftCol + 115, startY);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#374151';
  ctx.fillText('STATUS: FUNDS CLEARED', rightCol, startY);

  const row2Y = startY + 28;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#374151';
  ctx.fillText('BENEFICIARY:', leftCol, row2Y);
  ctx.fillStyle = '#b80d42';
  ctx.font = `bold 15px ${FONTS.gta}`;
  ctx.fillText(`OPERATION ${codename.toUpperCase()} (MASTERMIND)`, leftCol + 115, row2Y);

  const row3Y = row2Y + 28;
  ctx.font = `bold 13px ${FONTS.mono}`;
  ctx.fillStyle = '#374151';
  ctx.fillText('TARGET:', leftCol, row3Y);
  ctx.fillStyle = '#111827';
  ctx.fillText(breakdown.targetName.toUpperCase(), leftCol + 115, row3Y);

  ctx.textAlign = 'right';
  ctx.fillStyle = breakdown.grade === 'S' || breakdown.grade === 'A' ? '#059669' : '#dc2626';
  ctx.fillText(`RATING: GRADE ${breakdown.grade} (${breakdown.gradeEfficiencyPct}% EFFICIENCY)`, rightCol, row3Y);

  // Divider
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(36, row3Y + 16);
  ctx.lineTo(RECEIPT_W - 36, row3Y + 16);
  ctx.stroke();

  // 4. Financial Itemized Ledger
  let itemY = row3Y + 44;

  const drawLedgerRow = (
    label: string,
    val: string,
    isDeduction = false,
    bold = false,
    color = '#1f2937',
  ) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.font = bold ? `bold 14px ${FONTS.mono}` : `13px ${FONTS.mono}`;
    ctx.fillText(label, leftCol, itemY);

    ctx.textAlign = 'right';
    ctx.fillStyle = isDeduction ? '#b91c1c' : color;
    ctx.fillText(val, rightCol, itemY);

    itemY += 28;
  };

  drawLedgerRow('POTENTIAL VAULT ESTIMATE', formatCurrency(breakdown.potentialVaultTake));
  drawLedgerRow(
    `EXECUTION RECOVERY (GRADE ${breakdown.grade})`,
    `${breakdown.gradeEfficiencyPct}%`,
    false,
    true,
    '#059669',
  );
  drawLedgerRow('ACTUAL GROSS RECOVERED', formatCurrency(breakdown.actualGrossTake), false, true);

  // Subtle divider
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.moveTo(36, itemY - 10);
  ctx.lineTo(RECEIPT_W - 36, itemY - 10);
  ctx.stroke();

  // Deductions header
  ctx.textAlign = 'left';
  ctx.font = `bold 12px ${FONTS.mono}`;
  ctx.fillStyle = '#6b7280';
  ctx.fillText('DEDUCTIONS & SPECIALIST CUTS:', leftCol, itemY + 4);
  itemY += 26;

  // Syndicate fee
  drawLedgerRow(
    `SYNDICATE FENCE & LAUNDERING (${breakdown.syndicatePercent}%)`,
    `-${formatCurrency(breakdown.syndicateAmount)}`,
    true,
  );

  // Crew cuts
  for (const c of breakdown.crewCuts) {
    drawLedgerRow(
      `${c.name.toUpperCase()} (${c.role.toUpperCase()} — ${c.percent}%)`,
      `-${formatCurrency(c.amount)}`,
      true,
    );
  }

  // Heavy divider before net total
  itemY += 6;
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(36, itemY);
  ctx.lineTo(RECEIPT_W - 36, itemY);
  ctx.stroke();
  itemY += 24;

  // 5. Final Mastermind Net Payout Banner Box
  const bannerBoxY = itemY;
  const bannerBoxH = 92;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(leftCol - 8, bannerBoxY, RECEIPT_W - (leftCol * 2) + 16, bannerBoxH);
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(leftCol - 8, bannerBoxY, RECEIPT_W - (leftCol * 2) + 16, bannerBoxH);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#00f0ff';
  ctx.font = `bold 13px ${FONTS.mono}`;
  ctx.fillText('MASTERMIND NET TAKE', leftCol + 10, bannerBoxY + 30);

  ctx.font = `bold 11px ${FONTS.mono}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(`SHARE: ${breakdown.playerCutPercent}% OF NET GROSS`, leftCol + 10, bannerBoxY + 54);
  ctx.fillText('WIRED TO OFFSHORE ACCOUNT', leftCol + 10, bannerBoxY + 74);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#10b981';
  ctx.font = `bold 38px ${FONTS.gta}`;
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 10;
  ctx.fillText(formatCurrency(breakdown.playerNetTake), rightCol - 10, bannerBoxY + 58);
  ctx.shadowBlur = 0;

  // 6. Security Barcode & Disclaimer at bottom
  const barcodeY = RECEIPT_H - 120;
  ctx.fillStyle = '#111827';

  // Procedural barcode bars
  let bx = leftCol;
  while (bx < rightCol - 120) {
    const barW = (bx % 7 === 0 || bx % 11 === 0) ? 3 : 1.5;
    ctx.fillRect(bx, barcodeY, barW, 40);
    bx += barW + ((bx % 5 === 0) ? 4 : 2);
  }

  // QR mock square
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2;
  ctx.strokeRect(rightCol - 85, barcodeY, 40, 40);
  ctx.fillRect(rightCol - 80, barcodeY + 5, 10, 10);
  ctx.fillRect(rightCol - 65, barcodeY + 5, 10, 10);
  ctx.fillRect(rightCol - 80, barcodeY + 20, 10, 10);

  ctx.font = `9px ${FONTS.mono}`;
  ctx.fillStyle = '#6b7280';
  ctx.textAlign = 'center';
  ctx.fillText(
    'FUNDS ROUTED THROUGH CAYMANS FINANCIAL CENTER • DISCREET NON-TRACEABLE LEDGER • VC FINANCE CORP',
    RECEIPT_W / 2,
    RECEIPT_H - 52,
  );

  // 7. Angled Rubber Stamp across receipt
  ctx.save();
  ctx.translate(RECEIPT_W / 2 + 30, RECEIPT_H / 2 + 10);
  ctx.rotate(-0.15); // -8.5 degrees

  const stampApproved = breakdown.grade !== 'F';
  ctx.strokeStyle = stampApproved ? 'rgba(5, 150, 105, 0.75)' : 'rgba(220, 38, 38, 0.75)';
  ctx.lineWidth = 4;
  ctx.strokeRect(-210, -32, 420, 64);

  ctx.fillStyle = stampApproved ? 'rgba(5, 150, 105, 0.82)' : 'rgba(220, 38, 38, 0.82)';
  ctx.font = `bold 26px ${FONTS.gta}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    stampApproved ? 'FUNDS CLEARED // LAUNDERED' : 'HEIST COMPROMISED // PENALTY',
    0,
    0,
  );
  ctx.restore();

  return canvasToDataUrl(canvas);
}

/**
 * Stamps the Wire Transfer Receipt onto the 1920x1080 Mission Briefing Board.
 */
export async function stampReceiptOnBriefingBoard(
  baseBriefingImgUrl: string,
  breakdown: HeistPayoutBreakdown,
  codename: string,
): Promise<string> {
  const [canvas, ctx] = createCanvas(1920, 1080);

  // 1. Draw base briefing board
  const baseImg = await loadImg(baseBriefingImgUrl);
  ctx.drawImage(baseImg, 0, 0, 1920, 1080);

  // 2. Generate receipt data URL and load as image
  const receiptDataUrl = await renderWireTransferReceipt(breakdown, codename);
  const receiptImg = await loadImg(receiptDataUrl);

  // 3. Stamp receipt at a stylish tilted angle onto the right-hand evidence clipboard area
  ctx.save();
  const stampX = 1260;
  const stampY = 160;
  const stampW = 540;
  const stampH = 730;

  ctx.translate(stampX + stampW / 2, stampY + stampH / 2);
  ctx.rotate(-0.06); // -3.4 degrees tilt

  // Realistic drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetX = 10;
  ctx.shadowOffsetY = 15;

  ctx.drawImage(receiptImg, -stampW / 2, -stampH / 2, stampW, stampH);

  // Top paperclip / red pushpin
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(0, -stampH / 2 + 16, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-3, -stampH / 2 + 13, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  return canvasToDataUrl(canvas);
}
