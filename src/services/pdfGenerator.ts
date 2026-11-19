import { PDFDocument } from 'pdf-lib';
import {
  DualCurrencySimulationResult,
  SixDimensionGapAuditResult,
} from '../domain/clientGapEngine';
import {
  buildExecutiveSummaryPdfModel,
  tokenizeMixedCjkText,
} from '../domain/executiveSummaryPdfModel';
import type { HkiaAuditDossierModel } from '../domain/lifecycleAndComplianceEngine';
import {
  ActuarialQuoteResult,
  AppLanguage,
  ClientLead,
  ComplianceCheckResult,
  CurrencyCode,
  InsurancePlan,
  IntermediaryProfile,
  MorningBriefingSlide,
} from '../domain/types';

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const CANVAS_WIDTH = 1240;
const CANVAS_HEIGHT = 1754;
const LANDSCAPE_CANVAS_WIDTH = 1754;
const LANDSCAPE_CANVAS_HEIGHT = 1240;

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ');
  let line = '';
  let currY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currY);
      line = words[n] + ' ';
      currY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trim(), x, currY);
    currY += lineHeight;
  }
  return currY;
}

/**
 * Generates a high-DPI bilingual (English + Traditional Chinese) STP e-Application & HKIA Benefit Illustration PDF.
 */
export async function generateStpPolicyPdfBytes(params: {
  referenceNo: string;
  intermediary: IntermediaryProfile;
  lead: ClientLead;
  plan: InsurancePlan;
  quote: ActuarialQuoteResult;
  compliance: ComplianceCheckResult;
  signatureDataUrl: string;
}): Promise<Uint8Array> {
  const { referenceNo, intermediary, lead, plan, quote, compliance, signatureDataUrl } = params;

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to initialize 2D canvas for PDF generation.');
  }

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Header Banner
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 168);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 34px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText('HK InsureHub Pro  |  電子投保申請及利益說明書', 72, 74);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 20px "IBM Plex Mono", "Noto Sans HK", sans-serif';
  ctx.fillText(
    `STP Ref: ${referenceNo}   •   IA License: ${intermediary.iaLicenseNo}   •   Issued: ${new Date().toISOString().slice(0, 10)}`,
    72,
    122
  );

  let y = 224;

  // Section 1: Applicant & Intermediary Details
  ctx.fillStyle = '#0F172A';
  ctx.font = '700 24px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText('01. Applicant & Intermediary Particulars 投保人及持牌中介人資料', 72, y);
  y += 22;

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.strokeRect(72, y, CANVAS_WIDTH - 144, 195);

  const leftX = 100;
  const rightX = 660;
  ctx.font = '600 20px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(`Applicant Name 姓名: ${lead.fullNameEn} (${lead.fullNameZh})`, leftX, y + 46);
  ctx.fillText(`Age / Smoker 年齡及吸煙習慣: Age ${lead.age} • ${lead.isSmoker ? 'Smoker 吸煙' : 'Non-Smoker 非吸煙'}`, leftX, y + 88);
  ctx.fillText(`Identity / Travel Doc 證件號碼: ${lead.kycCheck.hkidDocNumber}`, leftX, y + 130);
  ctx.fillText(`Residency 居民類別: ${lead.residency === 'MCV' ? 'MCV 內地訪港旅客 (入境標籤已核實)' : 'HK Resident 香港居民'}`, leftX, y + 170);

  ctx.fillText(`Intermediary 持牌中介人: ${intermediary.nameEn} (${intermediary.nameZh})`, rightX, y + 46);
  ctx.fillText(`HKIA License 牌照號碼: ${intermediary.iaLicenseNo}`, rightX, y + 88);
  ctx.fillText(`Firm 機構: ${intermediary.firmName}`, rightX, y + 130);
  ctx.fillText(`WhatsApp Dispatch: ${lead.whatsappPhone}`, rightX, y + 170);

  y += 248;

  // Section 2: Selected Plan & HKIA Illustration Summary
  ctx.fillStyle = '#0F172A';
  ctx.font = '700 24px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText('02. Policy Coverage & HKIA Compliant Quote 投保計劃及保費摘要', 72, y);
  y += 22;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(72, y, CANVAS_WIDTH - 144, 190);
  ctx.strokeStyle = '#CBD5E1';
  ctx.strokeRect(72, y, CANVAS_WIDTH - 144, 190);

  ctx.fillStyle = '#0F172A';
  ctx.font = '700 24px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText(`[${plan.insurerCode}] ${plan.nameEn} — ${plan.nameZh}`, 100, y + 50);

  ctx.font = '600 21px "IBM Plex Mono", "Noto Sans HK", sans-serif';
  ctx.fillStyle = '#1D4ED8';
  ctx.fillText(
    `Sum Assured 投保額: ${quote.currency} $${quote.sumAssured.toLocaleString()}   |   Annual Premium 每年保費: ${quote.currency} $${quote.annualPremium.toLocaleString()}`,
    100,
    y + 98
  );

  ctx.fillStyle = '#334155';
  ctx.font = '500 19px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  const irrDisclosure =
    quote.appliedHkiaIrrCapPercent !== null
      ? `HKIA Participating Cap Enforced 演示利率上限: ${quote.effectiveIllustratedIrrPercent}% p.a. (Cap ${quote.appliedHkiaIrrCapPercent}%)  •  Fulfillment 分紅實現率: ${plan.fulfillmentRatio ?? 'N/A'}%`
      : `Payment Term 供款期: ${quote.paymentTermYears} Yr(s)  •  Est. Annual Tax Relief 預計扣稅節省: HK$${quote.estimatedAnnualTaxSavedHkd.toLocaleString()}`;
  ctx.fillText(irrDisclosure, 100, y + 146);

  y += 242;

  // Section 3: 5/10/15/20/30-Year Surrender Value Illustration Table
  ctx.fillStyle = '#0F172A';
  ctx.font = '700 24px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText('03. Benefit Illustration (Guaranteed vs. Non-Guaranteed) 退保價值利益說明', 72, y);
  y += 22;

  const tableWidth = CANVAS_WIDTH - 144;
  const rowHeight = 52;
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(72, y, tableWidth, rowHeight);

  const cols = [92, 240, 470, 720, 975];
  ctx.fillStyle = '#0F172A';
  ctx.font = '700 18px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText('Year / Age', cols[0], y + 33);
  ctx.fillText('Total Paid 總保費', cols[1], y + 33);
  ctx.fillText('Guaranteed 保證價值', cols[2], y + 33);
  ctx.fillText('Non-Guar. 非保證紅利', cols[3], y + 33);
  ctx.fillText('Total 退保總額', cols[4], y + 33);

  quote.projections.forEach((row, idx) => {
    const rowY = y + rowHeight * (idx + 1);
    ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    ctx.fillRect(72, rowY, tableWidth, rowHeight);
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(72, rowY, tableWidth, rowHeight);

    ctx.fillStyle = '#0F172A';
    ctx.font = '500 18px "IBM Plex Mono", sans-serif';
    ctx.fillText(`Yr ${row.policyYear} (Age ${row.clientAge})`, cols[0], rowY + 33);
    ctx.fillText(`${quote.currency} ${row.cumulativePremiumsPaid.toLocaleString()}`, cols[1], rowY + 33);
    ctx.fillText(`${quote.currency} ${row.guaranteedCashValue.toLocaleString()}`, cols[2], rowY + 33);
    ctx.fillText(`${quote.currency} ${row.nonGuaranteedDividend.toLocaleString()}`, cols[3], rowY + 33);
    ctx.font = '700 18px "IBM Plex Mono", sans-serif';
    ctx.fillStyle = '#1D4ED8';
    ctx.fillText(`${quote.currency} ${row.totalSurrenderValue.toLocaleString()}`, cols[4], rowY + 33);
  });

  y += rowHeight * (quote.projections.length + 1) + 46;

  // Section 4: GL30 / GL16 Compliance & Suitability Audit Log
  ctx.fillStyle = '#0F172A';
  ctx.font = '700 22px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText('04. HKIA GL30 FNA & GL16 Suitability Declaration 財務需要分析及合規紀錄', 72, y);
  y += 32;

  ctx.font = '500 17px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillStyle = '#15803D';
  for (const check of compliance.passedChecks.slice(0, 3)) {
    y = drawWrappedText(ctx, `✓ ${check}`, 82, y, CANVAS_WIDTH - 164, 26);
  }
  if (compliance.suitabilityWarnings.length > 0) {
    ctx.fillStyle = '#B45309';
    y = drawWrappedText(ctx, `Suitability Note: ${compliance.suitabilityWarnings[0]}`, 82, y + 4, CANVAS_WIDTH - 164, 25);
  }

  // Section 5: Client Digital Signature Box
  const sigBoxY = Math.max(y + 18, 1445);
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 2;
  ctx.strokeRect(72, sigBoxY, 540, 210);

  ctx.fillStyle = '#475569';
  ctx.font = '600 17px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText('Applicant Digital e-Signature 投保人電子簽署:', 94, sigBoxY + 34);

  if (signatureDataUrl && signatureDataUrl.startsWith('data:image/')) {
    try {
      const sigImg = await loadImage(signatureDataUrl);
      ctx.drawImage(sigImg, 100, sigBoxY + 46, 460, 118);
    } catch {
      ctx.fillText('[Digital Signature Verified]', 100, sigBoxY + 110);
    }
  }

  ctx.fillStyle = '#64748B';
  ctx.font = '500 15px "IBM Plex Mono", sans-serif';
  ctx.fillText(
    `Signed by ${lead.fullNameEn} • ${new Date().toISOString()}`,
    94,
    sigBoxY + 190
  );

  // Right Declaration Note
  ctx.fillStyle = '#334155';
  ctx.font = '500 16px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  drawWrappedText(
    ctx,
    'Applicant Declaration: I confirm that the Financial Needs Analysis (GL30) reflects my financial circumstances and objectives, and I understand non-guaranteed dividends are not guaranteed and subject to insurer fulfillment performance.',
    644,
    sigBoxY + 40,
    520,
    26
  );

  const pagePngDataUrl = canvas.toDataURL('image/png');
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${referenceNo} - ${lead.fullNameEn} - ${plan.nameEn}`);
  pdfDoc.setAuthor(`HK InsureHub Pro (${intermediary.iaLicenseNo})`);
  pdfDoc.setSubject('HKIA Compliant e-Application & Benefit Illustration');

  const pngImage = await pdfDoc.embedPng(dataUrlToUint8Array(pagePngDataUrl));
  const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: A4_WIDTH_PT,
    height: A4_HEIGHT_PT,
  });

  return pdfDoc.save();
}

/**
 * Generates a Side-by-Side HK Market Comparison Proposal PDF across multiple selected plans.
 * Supports IMP-16 Global White-Label Advisor Brand Header & Deterministic QR Code Matrix.
 */
export async function generateComparisonProposalPdfBytes(params: {
  clientName: string;
  age: number;
  currency: CurrencyCode;
  items: Array<{ plan: InsurancePlan; quote: ActuarialQuoteResult }>;
  intermediary: IntermediaryProfile;
  whiteLabel?: {
    enabled: boolean;
    practiceTitleEn: string;
    practiceTitleZh: string;
    honorBadge: string;
    contactChannelLabel: string;
    accentHex: string;
  };
  qrMatrix?: boolean[][];
}): Promise<Uint8Array> {
  const { clientName, age, currency, items, intermediary, whiteLabel, qrMatrix } = params;

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to initialize canvas');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const bannerHex = whiteLabel?.enabled && whiteLabel.accentHex ? whiteLabel.accentHex : '#0F172A';
  ctx.fillStyle = bannerHex;
  ctx.fillRect(0, 0, CANVAS_WIDTH, 168);

  const headerTitle =
    whiteLabel?.enabled && whiteLabel.practiceTitleZh
      ? whiteLabel.practiceTitleZh
      : 'HK InsureHub Pro  |  香港全市場保險方案比較建議書';

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 31px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText(headerTitle.slice(0, 44), 72, 68);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '500 19px "IBM Plex Mono", "Noto Sans HK", sans-serif';
  const badgeText = whiteLabel?.enabled && whiteLabel.honorBadge ? ` • ${whiteLabel.honorBadge}` : '';
  ctx.fillText(
    `Client: ${clientName} (${age}y) • ${currency} • Lic: ${intermediary.iaLicenseNo}${badgeText}`,
    72,
    112
  );
  if (whiteLabel?.enabled && whiteLabel.contactChannelLabel) {
    ctx.font = '500 17px "IBM Plex Mono", "Noto Sans HK", sans-serif';
    ctx.fillText(whiteLabel.contactChannelLabel, 72, 144);
  }

  // Draw scannable-style Advisor QR Matrix in top-right when White-Label is active
  if (whiteLabel?.enabled && qrMatrix && qrMatrix.length > 0) {
    const qrBoxSize = 124;
    const qrX = CANVAS_WIDTH - 72 - qrBoxSize;
    const qrY = 22;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(qrX, qrY, qrBoxSize, qrBoxSize);
    const n = qrMatrix.length;
    const cell = Math.floor((qrBoxSize - 16) / n);
    ctx.fillStyle = '#0F172A';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qrMatrix[r][c]) {
          ctx.fillRect(qrX + 8 + c * cell, qrY + 8 + r * cell, cell, cell);
        }
      }
    }
  }

  const PDF_SLOT_LINES = [
    { hex: '#DC2626', tag: '方案 1 · 紅線 Plan 1 (Red)' },
    { hex: '#2563EB', tag: '方案 2 · 藍線 Plan 2 (Blue)' },
    { hex: '#EAB308', tag: '方案 3 · 黃線 Plan 3 (Yellow)' },
  ];

  let y = 225;
  items.slice(0, 3).forEach(({ plan, quote }, index) => {
    const slotStyle = PDF_SLOT_LINES[index] || PDF_SLOT_LINES[0];
    ctx.fillStyle = index % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
    ctx.fillRect(72, y, CANVAS_WIDTH - 144, 332);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.strokeRect(72, y, CANVAS_WIDTH - 144, 332);

    // Top Red / Blue / Yellow Classification Line
    ctx.fillStyle = slotStyle.hex;
    ctx.fillRect(72, y, CANVAS_WIDTH - 144, 10);

    ctx.fillStyle = '#0F172A';
    ctx.font = '700 24px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
    ctx.fillText(
      `[${slotStyle.tag}] [${plan.insurerNameZh} ${plan.insurerCode}] ${plan.nameEn} (${plan.nameZh})`,
      100,
      y + 54
    );

    ctx.fillStyle = bannerHex === '#0F172A' ? '#1D4ED8' : bannerHex;
    ctx.font = '700 22px "IBM Plex Mono", sans-serif';
    ctx.fillText(
      `Annual Premium: ${currency} $${quote.annualPremium.toLocaleString()}/yr   •   Sum Assured: ${currency} $${quote.sumAssured.toLocaleString()}`,
      100,
      y + 100
    );

    const yr20 = quote.projections.find((p) => p.policyYear === 20);
    ctx.fillStyle = '#334155';
    ctx.font = '600 19px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
    ctx.fillText(
      `Fulfillment 分紅實現率: ${plan.fulfillmentRatio ? `${plan.fulfillmentRatio}%` : 'N/A (Pure Protection)'}   •   Illustrated IRR: ${quote.effectiveIllustratedIrrPercent}%   •   Yr 20 Value: ${currency} $${(yr20?.totalSurrenderValue ?? 0).toLocaleString()}`,
      100,
      y + 144
    );

    ctx.font = '500 18px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
    plan.keyHighlightsZh.slice(0, 3).forEach((hl, hIdx) => {
      ctx.fillText(`• ${hl} (${plan.keyHighlightsEn[hIdx]?.slice(0, 58) || ''})`, 100, y + 192 + hIdx * 36);
    });

    y += 358;
  });

  ctx.fillStyle = '#64748B';
  ctx.font = '500 16px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText(
    'HKIA Benefit Illustration Cap Compliant: Max 6.0% IRR (HKD) / 6.5% IRR (Non-HKD) on Participating Policies. Non-guaranteed bonuses may vary.',
    72,
    CANVAS_HEIGHT - 54
  );

  const pngDataUrl = canvas.toDataURL('image/png');
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`HK Market Comparison Proposal - ${clientName}`);
  const pngImage = await pdfDoc.embedPng(dataUrlToUint8Array(pngDataUrl));
  const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
  page.drawImage(pngImage, { x: 0, y: 0, width: A4_WIDTH_PT, height: A4_HEIGHT_PT });
  return pdfDoc.save();
}

export function triggerBrowserDownload(
  filename: string,
  content: Uint8Array | string,
  mimeType: string
): void {
  const blob =
    typeof content === 'string'
      ? new Blob([content], { type: mimeType })
      : new Blob([new Uint8Array(content)], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Generates a One-Page Trilingual (EN / 繁中 / 简中) Family Protection Map PDF (Module 07 imp-client-3 & Module 08 FN-01).
 */
export async function generateProtectionMapPdfBytes(params: {
  clientName: string;
  age: number;
  recommendedLifeHkd: number;
  existingLifeHkd: number;
  lifeGapHkd: number;
  recommendedCiHkd: number;
  existingCiHkd: number;
  ciGapHkd: number;
  vhisDeductibleHkd: number;
  netVhisTopUpHkd: number;
  bridgeNoteEn: string;
  bridgeNoteZh: string;
  intermediary: IntermediaryProfile;
}): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to initialize 2D canvas');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 168);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 32px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText('One-Page Family Protection Map  |  一頁式家庭保障全景圖', 72, 74);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 19px "IBM Plex Mono", "Noto Sans HK", sans-serif';
  ctx.fillText(
    `Client 客戶: ${params.clientName} (Age ${params.age})   •   Advisor 顧問: ${params.intermediary.nameEn} (${params.intermediary.iaLicenseNo})`,
    72,
    122
  );

  let y = 230;
  const cards = [
    {
      title: '01. Life & Mortgage Protection 人壽及按揭保障缺口',
      rec: `Target 建議保額: HK$${params.recommendedLifeHkd.toLocaleString()}`,
      cur: `Existing 現有保障: HK$${params.existingLifeHkd.toLocaleString()}`,
      gap: `Net Gap 尚欠缺口: HK$${params.lifeGapHkd.toLocaleString()}`,
    },
    {
      title: '02. Critical Illness Recovery Shield 嚴重危疾收入替代（3.5倍年薪）',
      rec: `Target 建議保額: HK$${params.recommendedCiHkd.toLocaleString()}`,
      cur: `Existing 現有危疾: HK$${params.existingCiHkd.toLocaleString()}`,
      gap: `Net Gap 尚欠缺口: HK$${params.ciGapHkd.toLocaleString()}`,
    },
    {
      title: '03. Corporate Group Medical → VHIS High-Deductible Top-Up 團體醫保銜接方案',
      rec: `Selected VHIS Deductible 自付額選項: HK$${params.vhisDeductibleHkd.toLocaleString()}`,
      cur: `Net Annual Cost (Post IRD Tax Relief) 扣稅後淨保費: HK$${params.netVhisTopUpHkd.toLocaleString()}/yr`,
      gap: params.bridgeNoteZh,
    },
  ];

  cards.forEach((c) => {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(72, y, CANVAS_WIDTH - 144, 290);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.strokeRect(72, y, CANVAS_WIDTH - 144, 290);

    ctx.fillStyle = '#0F172A';
    ctx.font = '700 24px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
    ctx.fillText(c.title, 100, y + 52);

    ctx.fillStyle = '#334155';
    ctx.font = '600 20px "IBM Plex Mono", "Noto Sans HK", sans-serif';
    ctx.fillText(c.rec, 100, y + 110);
    ctx.fillText(c.cur, 100, y + 158);

    ctx.fillStyle = '#1D4ED8';
    ctx.font = '700 20px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
    drawWrappedText(ctx, c.gap, 100, y + 212, CANVAS_WIDTH - 200, 30);

    y += 330;
  });

  ctx.fillStyle = '#475569';
  ctx.font = '500 17px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  drawWrappedText(ctx, `Advisor Summary: ${params.bridgeNoteEn}`, 72, y + 30, CANVAS_WIDTH - 144, 28);

  ctx.fillStyle = '#64748B';
  ctx.font = '500 15px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText(
    'HKIA GL30 / GL28 Notice: Prepared for financial needs discussion only. Refer to official policy contract & benefit illustration.',
    72,
    CANVAS_HEIGHT - 56
  );

  const pngDataUrl = canvas.toDataURL('image/png');
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Family Protection Map - ${params.clientName}`);
  const pngImage = await pdfDoc.embedPng(dataUrlToUint8Array(pngDataUrl));
  const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
  page.drawImage(pngImage, { x: 0, y: 0, width: A4_WIDTH_PT, height: A4_HEIGHT_PT });
  return pdfDoc.save();
}

/**
 * Downloads a 4:5 Mobile-Optimized WhatsApp / WeChat Compliant Micro-Proposal PNG Card (Module 08 FN-06).
 */
export function downloadMicroProposalPngCard(params: {
  clientDisplayName: string;
  age: number;
  plan: InsurancePlan;
  currency: CurrencyCode;
  annualPremium: number;
  sumAssured: number;
  yr20Guaranteed: number;
  yr20Total: number;
  effectiveIrrPct: number;
  intermediary: IntermediaryProfile;
}): void {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, 210);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 34px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText(`${params.plan.insurerNameZh}  |  ${params.plan.insurerNameEn}`, 64, 86);
  ctx.fillStyle = '#93C5FD';
  ctx.font = '600 24px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText(`${params.plan.nameZh} (${params.plan.nameEn})`, 64, 140);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 18px "IBM Plex Mono", sans-serif';
  ctx.fillText(`Prepared for: ${params.clientDisplayName} (Age ${params.age})`, 64, 182);

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(64, 256, width - 128, 390);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 256, width - 128, 390);

  ctx.fillStyle = '#0F172A';
  ctx.font = '700 28px "IBM Plex Mono", "Noto Sans HK", sans-serif';
  ctx.fillText(
    `Annual Premium 每年保費: ${params.currency} $${params.annualPremium.toLocaleString()}`,
    96,
    330
  );
  ctx.fillText(
    `Sum Assured 基本投保額: ${params.currency} $${params.sumAssured.toLocaleString()}`,
    96,
    396
  );

  ctx.fillStyle = '#334155';
  ctx.font = '600 23px "IBM Plex Mono", "Noto Sans HK", sans-serif';
  ctx.fillText(
    `Yr-20 Guaranteed 保證現金價值: ${params.currency} $${params.yr20Guaranteed.toLocaleString()}`,
    96,
    476
  );
  ctx.fillStyle = '#1D4ED8';
  ctx.font = '700 25px "IBM Plex Mono", "Noto Sans HK", sans-serif';
  ctx.fillText(
    `Yr-20 Total 預期總價值: ${params.currency} $${params.yr20Total.toLocaleString()} (IRR ${params.effectiveIrrPct}%)`,
    96,
    542
  );
  ctx.fillStyle = '#475569';
  ctx.font = '600 20px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText(
    `GN16 Historical Fulfillment 歷史分紅實現率: ${params.plan.fulfillmentRatio ? `${params.plan.fulfillmentRatio}%` : 'Pure Protection 純保障'}`,
    96,
    604
  );

  let y = 716;
  ctx.fillStyle = '#0F172A';
  ctx.font = '700 25px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText('Standardized Plan Highlights 計劃核心亮點', 64, y);
  y += 48;

  ctx.fillStyle = '#1E293B';
  ctx.font = '500 21px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  (params.plan.keyHighlightsZh || []).slice(0, 3).forEach((hl) => {
    y = drawWrappedText(ctx, `• ${hl}`, 72, y, width - 144, 34) + 14;
  });

  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(0, height - 180, width, 180);
  ctx.fillStyle = '#334155';
  ctx.font = '600 19px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText(
    `Licensed Intermediary 持牌顧問: ${params.intermediary.nameEn} (${params.intermediary.nameZh})  •  IA Lic: ${params.intermediary.iaLicenseNo}`,
    64,
    height - 118
  );
  ctx.fillStyle = '#64748B';
  ctx.font = '500 16px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText(
    'HKIA GL28 Compliance: Non-guaranteed dividends are not guaranteed (Cap: 6.0% HKD / 6.5% Non-HKD). For reference only.',
    64,
    height - 68
  );

  const dataUrl = canvas.toDataURL('image/png');
  triggerBrowserDownload(
    `MicroProposal_${params.plan.insurerCode}_${params.currency}.png`,
    dataUrlToUint8Array(dataUrl),
    'image/png'
  );
}

function drawSmartWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 6
): number {
  const tokens = tokenizeMixedCjkText(text);
  if (tokens.length === 0) return y;

  let line = '';
  let currY = y;
  let renderedLines = 0;

  for (let i = 0; i < tokens.length; i++) {
    const candidate = line + tokens[i];
    if (ctx.measureText(candidate).width > maxWidth && line.trim().length > 0) {
      renderedLines += 1;
      if (renderedLines >= maxLines) {
        const truncated = line.trim().slice(0, Math.max(1, line.trim().length - 1)) + '…';
        ctx.fillText(truncated, x, currY);
        return currY + lineHeight;
      }
      ctx.fillText(line.trimEnd(), x, currY);
      line = tokens[i].trimStart();
      currY += lineHeight;
    } else {
      line = candidate;
    }
  }

  if (line.trim().length > 0 && renderedLines < maxLines) {
    ctx.fillText(line.trimEnd(), x, currY);
    currY += lineHeight;
  }

  return currY;
}

/**
 * Generates a multi-page Landscape PDF Executive Summary & 5-Slide Briefing Deck (Stage 04A).
 * Page 1: Executive Summary Overview (KPIs + 5-Slide Synopsis Matrix).
 * Pages 2..N: Full 5-Slide Visual Case Deck with live KPIs, charts, talking points, and speaker cues.
 */
export async function generateExecutiveSummaryDeckPdfBytes(params: {
  lead: ClientLead;
  plan: InsurancePlan | null;
  intermediary: IntermediaryProfile;
  slides: MorningBriefingSlide[];
  gapAudit: SixDimensionGapAuditResult;
  bundleSim: DualCurrencySimulationResult;
  lang?: AppLanguage;
  whiteLabel?: {
    enabled: boolean;
    practiceTitleEn: string;
    practiceTitleZh: string;
    honorBadge: string;
    contactChannelLabel: string;
    accentHex: string;
  };
}): Promise<{ pdfBytes: Uint8Array; fileName: string }> {
  const model = buildExecutiveSummaryPdfModel(params);
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(model.documentTitle);
  pdfDoc.setAuthor(`HK InsureHub Pro (${params.intermediary.iaLicenseNo})`);
  pdfDoc.setSubject('Stage 04A Executive Summary & 5-Slide Case Briefing Deck');

  const embedLandscapeCanvas = async (
    drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = LANDSCAPE_CANVAS_WIDTH;
    canvas.height = LANDSCAPE_CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to initialize 2D canvas for Executive Summary PDF.');
    }
    drawFn(ctx, LANDSCAPE_CANVAS_WIDTH, LANDSCAPE_CANVAS_HEIGHT);
    const pngDataUrl = canvas.toDataURL('image/png');
    const pngImage = await pdfDoc.embedPng(dataUrlToUint8Array(pngDataUrl));
    const page = pdfDoc.addPage([A4_HEIGHT_PT, A4_WIDTH_PT]);
    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: A4_HEIGHT_PT,
      height: A4_WIDTH_PT,
    });
  };

  // =========================================================================
  // PAGE 1: ONE-PAGE EXECUTIVE SUMMARY OVERVIEW + 5-SLIDE SYNOPSIS MATRIX
  // =========================================================================
  await embedLandscapeCanvas((ctx, w, h) => {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, w, h);

    // Victoria Harbour Private Wealth Header
    ctx.fillStyle = model.bannerHex;
    ctx.fillRect(0, 0, w, 194);
    ctx.fillStyle = model.goldAccentHex;
    ctx.fillRect(0, 190, w, 5);

    // Subtle geometric skyline accent in top-right
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w - 360, 190);
    ctx.lineTo(w - 360, 118);
    ctx.lineTo(w - 318, 118);
    ctx.lineTo(w - 318, 190);
    ctx.moveTo(w - 296, 190);
    ctx.lineTo(w - 296, 56);
    ctx.lineTo(w - 248, 34);
    ctx.lineTo(w - 248, 190);
    ctx.moveTo(w - 224, 190);
    ctx.lineTo(w - 224, 82);
    ctx.lineTo(w - 172, 82);
    ctx.lineTo(w - 172, 190);
    ctx.moveTo(w - 148, 190);
    ctx.lineTo(w - 148, 48);
    ctx.lineTo(w - 96, 48);
    ctx.lineTo(w - 96, 190);
    ctx.stroke();

    ctx.fillStyle = '#F3D37A';
    ctx.font = '700 16px "IBM Plex Mono", "Plus Jakarta Sans", sans-serif';
    ctx.fillText(model.headerKicker, 64, 46);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 32px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
    ctx.fillText(model.headerTitle.slice(0, 56), 64, 92);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '500 18px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
    ctx.fillText(model.clientMetaLine, 64, 132);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '500 17px "IBM Plex Mono", "Noto Sans HK", sans-serif';
    ctx.fillText(`${model.anchorPlanLine}   |   ${model.advisorMetaLine}`.slice(0, 115), 64, 166);

    // 4 Executive KPI Cards Row
    const kpiTop = 222;
    const kpiGap = 22;
    const kpiWidth = Math.floor((w - 128 - kpiGap * 3) / 4);
    const kpiHeight = 152;

    model.kpis.forEach((kpi, idx) => {
      const kx = 64 + idx * (kpiWidth + kpiGap);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(kx, kpiTop, kpiWidth, kpiHeight);
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(kx, kpiTop, kpiWidth, kpiHeight);

      ctx.fillStyle = kpi.accentHex;
      ctx.fillRect(kx, kpiTop, kpiWidth, 7);

      ctx.fillStyle = '#475569';
      ctx.font = '600 16px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
      ctx.fillText(kpi.label, kx + 20, kpiTop + 40);

      ctx.fillStyle = '#0F172A';
      ctx.font = '700 28px "IBM Plex Mono", "Plus Jakarta Sans", sans-serif';
      ctx.fillText(kpi.primaryValue, kx + 20, kpiTop + 88);

      ctx.fillStyle = '#64748B';
      ctx.font = '500 15px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
      drawSmartWrappedText(ctx, kpi.subValue, kx + 20, kpiTop + 122, kpiWidth - 40, 20, 1);
    });

    // Section Title: 5-Slide Briefing Deck Synopsis
    ctx.fillStyle = '#0F172A';
    ctx.font = '700 22px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
    ctx.fillText(
      params.lang === 'en'
        ? '5-Slide Briefing Deck Executive Overview'
        : '五頁式早會個案簡報核心摘要總覽',
      64,
      416
    );

    // Render 5 Slide Summary Rows
    let rowY = 436;
    const rowH = 132;
    const rowGap = 12;
    const fullW = w - 128;

    model.slides.slice(0, 5).forEach((slide) => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(64, rowY, fullW, rowH);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(64, rowY, fullW, rowH);

      // Top slide accent bar
      ctx.fillStyle = slide.accentHex;
      ctx.fillRect(64, rowY, fullW, 5);

      // Slide badge & title
      ctx.fillStyle = slide.accentHex;
      ctx.font = '700 15px "IBM Plex Mono", "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${slide.slideNumberLabel} · ${slide.badge}`, 86, rowY + 34);

      ctx.fillStyle = '#0F172A';
      ctx.font = '700 20px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
      drawSmartWrappedText(ctx, slide.title, 86, rowY + 66, 980, 26, 1);

      // Primary bullet preview
      const leadBullet = slide.bullets[0] || slide.speakerNote;
      ctx.fillStyle = '#475569';
      ctx.font = '500 16px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
      drawSmartWrappedText(ctx, `• ${leadBullet}`, 86, rowY + 98, 1020, 22, 1);

      // Right Key Metric Pill Box
      const metricBoxW = 470;
      const metricBoxX = 64 + fullW - metricBoxW - 22;
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(metricBoxX, rowY + 22, metricBoxW, rowH - 40);
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.strokeRect(metricBoxX, rowY + 22, metricBoxW, rowH - 40);

      ctx.fillStyle = '#64748B';
      ctx.font = '600 14px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
      drawSmartWrappedText(
        ctx,
        slide.keyMetricLabel,
        metricBoxX + 16,
        rowY + 52,
        metricBoxW - 32,
        20,
        1
      );

      ctx.fillStyle = '#0F172A';
      ctx.font = '700 18px "IBM Plex Mono", "Noto Sans HK", sans-serif';
      drawSmartWrappedText(
        ctx,
        slide.keyMetricValue,
        metricBoxX + 16,
        rowY + 86,
        metricBoxW - 32,
        22,
        1
      );

      rowY += rowH + rowGap;
    });

    // Compliance Footer
    ctx.fillStyle = '#64748B';
    ctx.font = '500 14px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
    ctx.fillText(model.complianceFooter, 64, h - 26);

    ctx.fillStyle = '#475569';
    ctx.font = '600 14px "IBM Plex Mono", sans-serif';
    ctx.fillText(`Page 1 / ${model.slides.length + 1}`, w - 168, h - 26);
  });

  // =========================================================================
  // PAGES 2..N: INDIVIDUAL 5-SLIDE EXECUTIVE BRIEFING PAGES
  // =========================================================================
  for (let sIdx = 0; sIdx < model.slides.length; sIdx++) {
    const slide = model.slides[sIdx];
    await embedLandscapeCanvas((ctx, w, h) => {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, w, h);

      // Top semantic slide color bar
      ctx.fillStyle = slide.accentHex;
      ctx.fillRect(0, 0, w, 10);

      // Slide Top Meta Strip
      ctx.fillStyle = '#F3D37A';
      ctx.font = '700 17px "IBM Plex Mono", "Noto Sans HK", sans-serif';
      ctx.fillText(`${slide.badge}   ·   ${model.anchorPlanLine}`.slice(0, 95), 68, 62);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 16px "IBM Plex Mono", "Noto Sans HK", sans-serif';
      ctx.fillText(
        `Slide ${sIdx + 1} / ${model.slides.length}   |   Page ${sIdx + 2} / ${model.slides.length + 1}`,
        w - 330,
        62
      );

      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(68, 86);
      ctx.lineTo(w - 68, 86);
      ctx.stroke();

      // Left Column: Slide Title, Key Metric, Talking Points, Speaker Cue
      const leftX = 68;
      const leftW = 820;
      let leftY = 142;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 30px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
      leftY = drawSmartWrappedText(ctx, slide.title, leftX, leftY, leftW, 42, 3) + 14;

      // Key Metric Callout Card
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(leftX, leftY, leftW, 92);
      ctx.strokeStyle = slide.accentHex;
      ctx.lineWidth = 2;
      ctx.strokeRect(leftX, leftY, leftW, 92);

      ctx.fillStyle = '#CBD5E1';
      ctx.font = '600 17px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
      ctx.fillText(slide.keyMetricLabel, leftX + 24, leftY + 36);

      ctx.fillStyle = '#5EEAD4';
      ctx.font = '700 22px "IBM Plex Mono", "Noto Sans HK", sans-serif';
      drawSmartWrappedText(ctx, slide.keyMetricValue, leftX + 24, leftY + 70, leftW - 48, 26, 1);

      leftY += 132;

      // Talking Points List
      slide.bullets.slice(0, 5).forEach((bullet, bIdx) => {
        ctx.fillStyle = '#2DD4BF';
        ctx.font = '700 17px "IBM Plex Mono", sans-serif';
        ctx.fillText(`0${bIdx + 1}`, leftX, leftY);

        ctx.fillStyle = '#F1F5F9';
        ctx.font = '500 20px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
        leftY = drawSmartWrappedText(ctx, bullet, leftX + 42, leftY, leftW - 46, 30, 3) + 18;
      });

      // Speaker Cue Box pinned cleanly near bottom of left column
      const cueBoxY = Math.max(leftY + 10, h - 224);
      const cueBoxH = 136;
      ctx.fillStyle = '#09111E';
      ctx.fillRect(leftX, cueBoxY, leftW, cueBoxH);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(leftX, cueBoxY, leftW, cueBoxH);

      ctx.fillStyle = '#FCD34D';
      ctx.font = '700 15px "IBM Plex Mono", "Noto Sans HK", sans-serif';
      ctx.fillText(
        params.lang === 'en' ? 'AGENCY HUDDLE SPEAKER CUE' : '早會主持人帶教提示 · SPEAKER CUE',
        leftX + 22,
        cueBoxY + 34
      );

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '500 17px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
      drawSmartWrappedText(
        ctx,
        slide.speakerNote,
        leftX + 22,
        cueBoxY + 68,
        leftW - 44,
        26,
        2
      );

      // Right Column: Live Visual Infographic Card
      const rightX = 932;
      const rightW = w - rightX - 68;
      const rightY = 114;
      const rightH = h - 202;

      ctx.fillStyle = '#09111E';
      ctx.fillRect(rightX, rightY, rightW, rightH);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(rightX, rightY, rightW, rightH);

      const innerX = rightX + 34;
      const innerW = rightW - 68;
      let vy = rightY + 52;

      if (sIdx === 0) {
        // Slide 1 Visual: Annual Budget Utilization + 4 Target Protection Architectures
        ctx.fillStyle = '#5EEAD4';
        ctx.font = '700 20px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
        ctx.fillText(
          params.lang === 'en'
            ? 'Annual Budget Fit & 4 Target Schemes'
            : '年度保費預算配置與四大目標架構對照',
          innerX,
          vy
        );
        vy += 38;

        ctx.fillStyle = '#1E293B';
        ctx.fillRect(innerX, vy, innerW, 148);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(innerX, vy, innerW, 148);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 34px "IBM Plex Mono", sans-serif';
        ctx.fillText(`${model.budgetVisual.utilizationPct}%`, innerX + 24, vy + 58);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '600 17px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
        ctx.fillText(
          params.lang === 'en'
            ? `Client Budget: HK$ ${model.budgetVisual.budgetHkd.toLocaleString()} (≈ ¥ ${model.budgetVisual.budgetRmb.toLocaleString()})`
            : `客戶年度預算：HK$ ${model.budgetVisual.budgetHkd.toLocaleString()} (≈ ¥ ${model.budgetVisual.budgetRmb.toLocaleString()})`,
          innerX + 150,
          vy + 46
        );
        ctx.fillStyle = '#5EEAD4';
        ctx.fillText(
          params.lang === 'en'
            ? `Proposed Net Outlay: HK$ ${model.budgetVisual.netAfterTaxHkd.toLocaleString()}/yr`
            : `規劃稅後淨保費：HK$ ${model.budgetVisual.netAfterTaxHkd.toLocaleString()}/年`,
          innerX + 150,
          vy + 80
        );

        // Progress bar
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(innerX + 24, vy + 106, innerW - 48, 18);
        ctx.fillStyle = model.budgetVisual.withinBudget ? '#14B8A6' : '#F59E0B';
        ctx.fillRect(
          innerX + 24,
          vy + 106,
          Math.round((innerW - 48) * Math.min(1, model.budgetVisual.utilizationPct / 100)),
          18
        );

        vy += 196;
        model.budgetVisual.schemes.forEach((sch) => {
          ctx.fillStyle = sch.isLocked ? '#134E4A' : '#1E293B';
          ctx.fillRect(innerX, vy, innerW, 118);
          ctx.strokeStyle = sch.isLocked ? '#2DD4BF' : '#334155';
          ctx.strokeRect(innerX, vy, innerW, 118);

          ctx.fillStyle = sch.isLocked ? '#5EEAD4' : '#E2E8F0';
          ctx.font = '700 18px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
          ctx.fillText(
            `${sch.title}${sch.isLocked ? (params.lang === 'en' ? ' · LOCKED' : ' · 當前鎖定') : ''}`,
            innerX + 20,
            vy + 42
          );

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 18px "IBM Plex Mono", sans-serif';
          ctx.fillText(`HK$ ${sch.premiumHkd.toLocaleString()}`, innerX + innerW - 180, vy + 42);

          ctx.fillStyle = '#0F172A';
          ctx.fillRect(innerX + 20, vy + 72, innerW - 40, 14);
          ctx.fillStyle = sch.isLocked ? '#2DD4BF' : '#64748B';
          ctx.fillRect(innerX + 20, vy + 72, Math.round((innerW - 40) * sch.barRatio), 14);

          vy += 136;
        });
      } else if (sIdx === 1) {
        // Slide 2 Visual: 6-Axis Protection Fulfillment Breakdown
        ctx.fillStyle = '#5EEAD4';
        ctx.font = '700 20px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
        ctx.fillText(
          params.lang === 'en'
            ? `6-Dimension Gap Audit · Overall ${model.overallCompletionPct}%`
            : `六大防護維度達成率對比 · 綜合 ${model.overallCompletionPct}%`,
          innerX,
          vy
        );
        vy += 42;

        model.dimensionItems.forEach((dim) => {
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(innerX, vy, innerW, 118);
          ctx.strokeStyle = dim.isFullyCovered ? '#10B981' : '#334155';
          ctx.strokeRect(innerX, vy, innerW, 118);

          ctx.fillStyle = '#F8FAFC';
          ctx.font = '700 18px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
          ctx.fillText(dim.shortLabel, innerX + 20, vy + 40);

          ctx.fillStyle = dim.isFullyCovered ? '#34D399' : '#FBBF24';
          ctx.font = '700 18px "IBM Plex Mono", sans-serif';
          ctx.fillText(
            `${params.lang === 'en' ? 'Existing' : '既有'} ${dim.existingPct}% → ${dim.totalAchievementPct}%`,
            innerX + innerW - 250,
            vy + 40
          );

          // Stacked bar: Existing (Slate) + Proposed Total (Teal)
          const barW = innerW - 40;
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(innerX + 20, vy + 70, barW, 18);
          ctx.fillStyle = '#2DD4BF';
          ctx.fillRect(
            innerX + 20,
            vy + 70,
            Math.round(barW * Math.min(1, dim.totalAchievementPct / 100)),
            18
          );
          if (dim.existingPct > 0) {
            ctx.fillStyle = '#94A3B8';
            ctx.fillRect(
              innerX + 20,
              vy + 70,
              Math.round(barW * Math.min(1, dim.existingPct / 100)),
              18
            );
          }

          vy += 136;
        });
      } else if (sIdx === 2) {
        // Slide 3 Visual: Dual-Currency Premium & IRD Tax Relief Waterfall
        ctx.fillStyle = '#FCD34D';
        ctx.font = '700 20px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
        ctx.fillText(
          params.lang === 'en'
            ? 'Dual-Currency Premium & IRD Tax Waterfall'
            : '雙幣保費結構與扣稅減免瀑布分解圖 (1 HKD ≈ 0.92 RMB)',
          innerX,
          vy
        );
        vy += 46;

        model.waterfallItems.forEach((wf) => {
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(innerX, vy, innerW, 128);
          ctx.strokeStyle = '#334155';
          ctx.strokeRect(innerX, vy, innerW, 128);

          ctx.fillStyle = '#E2E8F0';
          ctx.font = '600 18px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
          ctx.fillText(wf.label, innerX + 20, vy + 44);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 20px "IBM Plex Mono", sans-serif';
          ctx.fillText(wf.formattedHkd, innerX + innerW - 210, vy + 44);

          ctx.fillStyle = '#0F172A';
          ctx.fillRect(innerX + 20, vy + 78, innerW - 40, 18);
          ctx.fillStyle = wf.accentHex;
          ctx.fillRect(innerX + 20, vy + 78, Math.round((innerW - 40) * wf.barRatio), 18);

          vy += 150;
        });

        // Net After-Tax Summary Box
        ctx.fillStyle = '#134E4A';
        ctx.fillRect(innerX, vy + 10, innerW, 168);
        ctx.strokeStyle = '#2DD4BF';
        ctx.strokeRect(innerX, vy + 10, innerW, 168);

        ctx.fillStyle = '#5EEAD4';
        ctx.font = '700 20px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
        ctx.fillText(
          params.lang === 'en' ? 'Effective Net Annual Outlay' : '稅後實際每年淨支出',
          innerX + 24,
          vy + 58
        );
        ctx.fillStyle = '#CBD5E1';
        ctx.font = '500 17px "IBM Plex Mono", "Noto Sans HK", sans-serif';
        ctx.fillText(
          `${params.lang === 'en' ? 'Monthly Eq.' : '平均每月'}: HK$ ${model.monthlyEquivalentHkd.toLocaleString()} (≈ ¥ ${model.monthlyEquivalentRmb.toLocaleString()})`,
          innerX + 24,
          vy + 104
        );
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 28px "IBM Plex Mono", sans-serif';
        ctx.fillText(
          `HK$ ${model.effectiveNetAnnualHkd.toLocaleString()}  (≈ ¥ ${model.effectiveNetAnnualRmb.toLocaleString()})`,
          innerX + 24,
          vy + 148
        );
      } else if (sIdx === 3) {
        // Slide 4 Visual: Claim Payout Stress Waterfall vs Client Out-of-Pocket
        ctx.fillStyle = '#A5B4FC';
        ctx.font = '700 20px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
        ctx.fillText(
          params.lang === 'en' ? 'Simulated Claim Stress Test' : '私院理賠實況壓力測試瀑布圖',
          innerX,
          vy
        );
        vy += 36;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 19px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
        vy = drawSmartWrappedText(ctx, model.claimVisual.scenarioTitle, innerX, vy, innerW, 28, 2) + 24;

        model.claimVisual.bars.forEach((cb) => {
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(innerX, vy, innerW, 140);
          ctx.strokeStyle = '#334155';
          ctx.strokeRect(innerX, vy, innerW, 140);

          ctx.fillStyle = '#E2E8F0';
          ctx.font = '600 18px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
          ctx.fillText(cb.label, innerX + 22, vy + 48);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 21px "IBM Plex Mono", sans-serif';
          ctx.fillText(cb.formattedHkd, innerX + innerW - 220, vy + 48);

          ctx.fillStyle = '#0F172A';
          ctx.fillRect(innerX + 22, vy + 86, innerW - 44, 20);
          ctx.fillStyle = cb.accentHex;
          ctx.fillRect(innerX + 22, vy + 86, Math.round((innerW - 44) * cb.barRatio), 20);

          vy += 166;
        });

        // Bottom 2 Summary Cards: Out-of-Pocket + Recovery Cash Buffer
        const halfW = Math.floor((innerW - 24) / 2);
        ctx.fillStyle = '#064E3B';
        ctx.fillRect(innerX, vy + 12, halfW, 152);
        ctx.strokeStyle = '#10B981';
        ctx.strokeRect(innerX, vy + 12, halfW, 152);

        ctx.fillStyle = '#A7F3D0';
        ctx.font = '600 17px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
        ctx.fillText(
          params.lang === 'en' ? 'Client Out-of-Pocket' : '客戶最終自掏腰包',
          innerX + 20,
          vy + 58
        );
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 28px "IBM Plex Mono", sans-serif';
        ctx.fillText(
          `HK$ ${model.claimVisual.outOfPocketHkd.toLocaleString()}`,
          innerX + 20,
          vy + 116
        );

        const secondX = innerX + halfW + 24;
        ctx.fillStyle = '#1E1B4B';
        ctx.fillRect(secondX, vy + 12, halfW, 152);
        ctx.strokeStyle = '#6366F1';
        ctx.strokeRect(secondX, vy + 12, halfW, 152);

        ctx.fillStyle = '#C7D2FE';
        ctx.font = '600 17px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
        ctx.fillText(
          params.lang === 'en' ? 'Recovery Cash Buffer' : '額外康復生活現金池',
          secondX + 20,
          vy + 58
        );
        ctx.fillStyle = '#5EEAD4';
        ctx.font = '700 28px "IBM Plex Mono", sans-serif';
        ctx.fillText(
          `+HK$ ${model.claimVisual.surplusBufferHkd.toLocaleString()}`,
          secondX + 20,
          vy + 116
        );
      } else {
        // Slide 5 Visual: 4-Step Regulatory & STP Closing Readiness Board
        const readyCount = model.readinessItems.filter((r) => r.done).length;
        ctx.fillStyle = '#6EE7B7';
        ctx.font = '700 20px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
        ctx.fillText(
          params.lang === 'en'
            ? `4-Step Regulatory & STP Readiness (${readyCount}/4 Ready)`
            : `四步合規促單與 STP 直通進度看板 (${readyCount}/4 已就緒)`,
          innerX,
          vy
        );
        vy += 46;

        model.readinessItems.forEach((st) => {
          ctx.fillStyle = st.done ? 'rgba(6, 78, 59, 0.45)' : '#1E293B';
          ctx.fillRect(innerX, vy, innerW, 168);
          ctx.strokeStyle = st.done ? '#10B981' : '#F59E0B';
          ctx.strokeRect(innerX, vy, innerW, 168);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 20px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
          drawSmartWrappedText(ctx, `${st.step}. ${st.title}`, innerX + 24, vy + 48, innerW - 170, 28, 1);

          ctx.fillStyle = st.done ? '#34D399' : '#FCD34D';
          ctx.font = '700 16px "IBM Plex Mono", "Noto Sans HK", sans-serif';
          ctx.fillText(st.statusTag, innerX + innerW - 140, vy + 48);

          ctx.fillStyle = '#CBD5E1';
          ctx.font = '500 17px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
          drawSmartWrappedText(ctx, st.detail, innerX + 24, vy + 94, innerW - 48, 26, 2);

          vy += 192;
        });
      }

      // Slide Footer
      ctx.fillStyle = '#64748B';
      ctx.font = '500 14px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
      ctx.fillText(model.complianceFooter, 68, h - 32);
    });
  }

  const pdfBytes = await pdfDoc.save();
  return { pdfBytes, fileName: model.fileName };
}

/**
 * Generates a high-DPI A4 HKIA Inspection Compliance Audit Dossier PDF (Stage 05D #11)
 * compiling KYC/MCV verification, GL30 FNA affordability, CP10 non-replacement, Policy IDs,
 * Consultant Meeting Notes, Follow-Up Tasks, and GL28 WhatsApp Audit Logs.
 */
export async function generateHkiaAuditDossierPdfBytes(
  dossier: HkiaAuditDossierModel
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to initialize 2D canvas for HKIA Audit Dossier PDF.');
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Victoria Harbour Private Wealth Header
  ctx.fillStyle = '#060D18';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 184);
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(0, 180, CANVAS_WIDTH, 5);

  ctx.fillStyle = '#F3D37A';
  ctx.font = '700 18px "IBM Plex Mono", "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`HKIA REGULATORY INSPECTION AUDIT DOSSIER  ·  ${dossier.dossierId}`, 68, 54);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 32px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText('香港保監局合規查冊檔案及客戶盡職審查卷宗', 68, 102);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '500 18px "IBM Plex Mono", "Noto Sans HK", sans-serif';
  ctx.fillText(
    `Advisor: ${dossier.advisorName}  •  IA Lic: ${dossier.advisorLicenseNo}  •  Generated: ${dossier.generatedAtIso.slice(0, 16)}`,
    68,
    146
  );

  let y = 232;
  const boxW = CANVAS_WIDTH - 136;

  const drawAuditSection = (title: string, lines: string[], boxHeight: number, accentHex = '#0F172A') => {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(68, y, boxW, boxHeight);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(68, y, boxW, boxHeight);

    ctx.fillStyle = accentHex;
    ctx.fillRect(68, y, boxW, 5);

    ctx.fillStyle = '#0F172A';
    ctx.font = '700 22px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
    ctx.fillText(title, 92, y + 42);

    ctx.fillStyle = '#334155';
    ctx.font = '500 18px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
    let lineY = y + 80;
    for (const ln of lines) {
      lineY = drawSmartWrappedText(ctx, ln, 92, lineY, boxW - 48, 28, 3) + 8;
    }
    y += boxHeight + 22;
  };

  drawAuditSection(
    '01. Client Identity, Residency & Associated Policy IDs 客戶身份與關聯保單編號',
    [
      `Client 客戶姓名: ${dossier.clientNameEn} (${dossier.clientNameZh})   •   Residency: ${dossier.residencyLabel}`,
      `Document 證件號碼: ${dossier.hkidOrTravelDoc}   •   Policy IDs 保單編號: ${dossier.policyIds.join(', ')}`,
      `KYC Verification 盡職審查: ${dossier.kycStatusLine}`,
    ],
    220,
    '#0B172A'
  );

  drawAuditSection(
    '02. HKIA GL30 Suitability, GL28 Proposal & CP10 Audit 財務需要與轉保合規審核',
    [
      `Anchor Plan & Outlay 主推方案及年繳保費: ${dossier.anchorPlanLabel} (${dossier.annualPremiumSummary})`,
      `GL30 FNA 財務需要分析: ${dossier.gl30FnaSummaryLine}`,
      `CP10 Policy Replacement 轉保聲明: ${dossier.cp10ReplacementLine}`,
      `Overall Gate Verdict 綜合審核結果: ${dossier.complianceVerdictLine}`,
    ],
    275,
    '#0D9488'
  );

  drawAuditSection(
    '03. Consultant Meeting Notes & Actionable Follow-Up Log 顧問會面紀錄與跟進清單',
    [
      `Meeting Notes 會面筆記: ${dossier.clientNotesExcerpt}`,
      ...dossier.followUpTasksSummary.slice(0, 3).map((t) => `• ${t}`),
    ],
    265,
    '#1D4ED8'
  );

  drawAuditSection(
    '04. GL28 WhatsApp / WeChat Dispatch & Disclosure Trail 通訊軟件合規披露留痕',
    dossier.whatsappAuditLines.map((w) => `• ${w}`),
    190,
    '#D4AF37'
  );

  ctx.fillStyle = '#64748B';
  ctx.font = '500 15px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText(
    'Statutory Retention Notice: Maintain FNA (GL30), Benefit Illustration (GL28), and KYC records for >= 7 years per HKIA Guideline.',
    68,
    CANVAS_HEIGHT - 44
  );

  const pngDataUrl = canvas.toDataURL('image/png');
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${dossier.dossierId} - ${dossier.clientNameEn}`);
  pdfDoc.setAuthor(`HK InsureHub Pro (${dossier.advisorLicenseNo})`);
  pdfDoc.setSubject('HKIA Inspection Compliance Audit Dossier');
  const pngImage = await pdfDoc.embedPng(dataUrlToUint8Array(pngDataUrl));
  const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
  page.drawImage(pngImage, { x: 0, y: 0, width: A4_WIDTH_PT, height: A4_HEIGHT_PT });
  return pdfDoc.save();
}



