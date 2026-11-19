import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Palette,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { HK_PRIVATE_HOSPITALS_LOG } from '../data/hkMarketIntelData';
import { HK_MARKET_PLANS } from '../data/hkMarketPlans';
import { UnifiedDealValuation } from '../domain/dealCaseEngine';
import { evaluateDealHospitalLogPass } from '../domain/hospitalLogMatcher';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  buildMobilePosterDataModel,
  MobilePosterDataModel,
  POSTER_THEME_PRESETS,
  PosterThemeId,
  PosterThemePalette,
} from '../domain/mobilePosterEngine';
import { InsurancePlan, IntermediaryProfile } from '../domain/types';
import { copyTextSafe } from '../utils/clipboardAndDom';
import { ScannableProposalQrSvg } from './ClientMicrositeView';
import { ShareProposalActionButton } from './ShareProposalActionButton';

interface MobileSummaryPosterModalProps {
  open: boolean;
  onClose: () => void;
  unifiedDeal: UnifiedDealValuation;
  intermediary: IntermediaryProfile;
  clientSafeMode?: boolean;
  allPlans?: InsurancePlan[];
  onSelectPlanId?: (planId: string) => void;
  onEnableVhisRider?: () => void;
  proposalShareUrl?: string;
  onNotify?: (msg: string) => void;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Native 1080x1920 High-DPI Graphic Poster Renderer (NOT a web screenshot).
 * Draws bespoke theme vector art, 6-axis hexagonal radar, dual-FX waterfall,
 * perforated private hospital LOG pass, and 13x13 QR code.
 */
function renderMobilePosterPngDataUrl(
  model: MobilePosterDataModel,
  theme: PosterThemePalette,
  isSimplified: boolean
): string {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const tr = (s: string) => (isSimplified ? toSimplifiedChinese(s) : s);

  // 1. Background Canvas Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, theme.canvasBgTop);
  bgGrad.addColorStop(1, theme.canvasBgBottom);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Outer Framing Motif per Theme
  if (theme.motifStyle === 'MUSEUM_FRAME') {
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, W - 56, H - 56);
    ctx.lineWidth = 1;
    ctx.strokeRect(38, 38, W - 76, H - 76);
  } else if (theme.motifStyle === 'JADE_LATTICE') {
    ctx.strokeStyle = theme.accentSecondary;
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 30, W - 60, H - 60);
    // Corner lattice squares
    const corners = [
      [30, 30],
      [W - 78, 30],
      [30, H - 78],
      [W - 78, H - 78],
    ];
    for (const [cx, cy] of corners) {
      ctx.strokeRect(cx, cy, 48, 48);
      ctx.strokeRect(cx + 12, cy + 12, 24, 24);
    }
  } else if (theme.motifStyle === 'SWISS_GRID') {
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    for (let x = 180; x < W; x += 180) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
  }

  // 2. Editorial Header Banner
  const headerX = 52;
  const headerY = 52;
  const headerW = W - 104;
  const headerH = 310;
  drawRoundedRect(ctx, headerX, headerY, headerW, headerH, 28);
  ctx.fillStyle = theme.headerBg;
  ctx.fill();

  // Victoria Harbour architectural silhouette inside header
  if (theme.motifStyle === 'HARBOUR_SKYLINE') {
    ctx.save();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
    ctx.lineWidth = 2;
    // Bank of China geometric X-bracing + IFC + ICC skyline
    const baseLine = headerY + headerH - 18;
    const towers = [
      [700, 140, 44],
      [760, 195, 52],
      [830, 165, 48],
      [895, 225, 56],
      [965, 120, 40],
    ];
    for (const [tx, th, tw] of towers) {
      ctx.strokeRect(tx, baseLine - th, tw, th);
      ctx.beginPath();
      ctx.moveTo(tx, baseLine - th);
      ctx.lineTo(tx + tw, baseLine);
      ctx.moveTo(tx + tw, baseLine - th);
      ctx.lineTo(tx, baseLine);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.fillStyle = theme.headerSubtle;
  ctx.font = '600 22px "Plus Jakarta Sans", "PingFang HK", sans-serif';
  ctx.fillText(
    tr(`HK INSUREHUB PRO · 專屬一頁式精算提案 · ${model.editionCode}`),
    headerX + 44,
    headerY + 62
  );

  ctx.fillStyle = theme.headerText;
  ctx.font = '700 54px "PingFang HK", "Noto Sans TC", sans-serif';
  ctx.fillText(tr(`${model.clientDisplayNameZh} 保障配置總覽`), headerX + 44, headerY + 142);

  ctx.fillStyle = theme.headerSubtle;
  ctx.font = '500 26px "PingFang HK", "Noto Sans TC", sans-serif';
  ctx.fillText(
    tr(`${model.residencyLabelZh} · 投保年齡 ${model.clientAge} 歲 · 簽發日期 ${model.issueDateText}`),
    headerX + 44,
    headerY + 196
  );

  // Plan pill bar inside header
  drawRoundedRect(ctx, headerX + 44, headerY + 224, headerW - 88, 56, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 24px "PingFang HK", "Noto Sans TC", sans-serif';
  const planLine = tr(`核心主約及架構：${model.planHeadlineZh}（+${model.waterfall.riderCount} 項附約）`);
  ctx.fillText(planLine.slice(0, 38), headerX + 64, headerY + 260);

  // 3. Section I: 6-Axis Protection Radar Card
  const sec1Y = 392;
  const sec1H = 510;
  drawRoundedRect(ctx, 52, sec1Y, W - 104, sec1H, 26);
  ctx.fillStyle = theme.cardBg;
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = theme.accentPrimary;
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(tr('I · 六軸保障達成率雷達 (6-AXIS PROTECTION RADAR)'), 92, sec1Y + 54);

  // Score Seal on top right of Section I
  drawRoundedRect(ctx, W - 290, sec1Y + 24, 200, 48, 24);
  ctx.fillStyle = theme.accentPrimary;
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 24px "JetBrains Mono", monospace';
  ctx.fillText(tr(`綜合達成 ${model.overallCompletionPct}%`), W - 270, sec1Y + 56);

  // Draw Hexagonal Radar on Left Half of Section I
  const rCx = 310;
  const rCy = sec1Y + 285;
  const rMax = 155;
  const angles = model.radarAxes.map((_, idx) => -Math.PI / 2 + (idx * Math.PI * 2) / 6);

  // Concentric hexagon rings
  for (const level of [0.33, 0.66, 1.0]) {
    ctx.beginPath();
    angles.forEach((ang, idx) => {
      const px = rCx + Math.cos(ang) * rMax * level;
      const py = rCy + Math.sin(ang) * rMax * level;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.strokeStyle = theme.id === 'VICTORIA_MIDNIGHT' ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.22)';
    ctx.lineWidth = level === 1.0 ? 2 : 1;
    ctx.stroke();
  }

  // Axis spokes + labels
  angles.forEach((ang, idx) => {
    const px = rCx + Math.cos(ang) * rMax;
    const py = rCy + Math.sin(ang) * rMax;
    ctx.beginPath();
    ctx.moveTo(rCx, rCy);
    ctx.lineTo(px, py);
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const lx = rCx + Math.cos(ang) * (rMax + 38);
    const ly = rCy + Math.sin(ang) * (rMax + 28);
    ctx.fillStyle = theme.primaryText;
    ctx.font = '600 20px "PingFang HK", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tr(model.radarAxes[idx].shortZh), lx, ly + 6);
  });
  ctx.textAlign = 'left';

  // Existing Polygon
  ctx.beginPath();
  angles.forEach((ang, idx) => {
    const ratio = Math.max(0.06, model.radarAxes[idx].existingPct / 100);
    const px = rCx + Math.cos(ang) * rMax * ratio;
    const py = rCy + Math.sin(ang) * rMax * ratio;
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fillStyle = theme.radarExistingFill;
  ctx.fill();
  ctx.strokeStyle = theme.radarExistingStroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Combined Polygon
  ctx.beginPath();
  angles.forEach((ang, idx) => {
    const ratio = Math.max(0.1, model.radarAxes[idx].combinedPct / 100);
    const px = rCx + Math.cos(ang) * rMax * ratio;
    const py = rCy + Math.sin(ang) * rMax * ratio;
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fillStyle = theme.radarCombinedFill;
  ctx.fill();
  ctx.strokeStyle = theme.radarCombinedStroke;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Right Half of Section I: 6 Dimension Metric Rows
  model.radarAxes.forEach((ax, idx) => {
    const rowY = sec1Y + 108 + idx * 62;
    ctx.fillStyle = theme.primaryText;
    ctx.font = '600 22px "PingFang HK", sans-serif';
    ctx.fillText(tr(ax.shortZh), 575, rowY + 24);

    ctx.fillStyle = theme.secondaryText;
    ctx.font = '600 21px "JetBrains Mono", monospace';
    ctx.fillText(`HK$${ax.combinedCoverManHkd}${tr('萬')} (${ax.combinedPct}%)`, 730, rowY + 24);

    // Progress bar
    drawRoundedRect(ctx, 575, rowY + 34, 410, 10, 5);
    ctx.fillStyle = theme.id === 'VICTORIA_MIDNIGHT' ? '#1E293B' : '#E2E8F0';
    ctx.fill();

    drawRoundedRect(ctx, 575, rowY + 34, Math.max(18, (410 * ax.combinedPct) / 100), 10, 5);
    ctx.fillStyle = theme.radarCombinedStroke;
    ctx.fill();
  });

  // 4. Section II: Dual-Currency HKD / RMB Waterfall Card
  const sec2Y = 930;
  const sec2H = 365;
  drawRoundedRect(ctx, 52, sec2Y, W - 104, sec2H, 26);
  ctx.fillStyle = theme.cardBg;
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = theme.accentPrimary;
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(tr('II · 雙幣保費優惠與扣稅瀑布 (DUAL-CURRENCY NET WATERFALL)'), 92, sec2Y + 54);

  // 3 Waterfall Columns
  const colW = 290;
  const cols = [
    {
      label: tr('標準年繳總保費'),
      val: `HK$ ${model.waterfall.grossAnnualHkd.toLocaleString()}`,
      sub: tr(`含主約及 ${model.waterfall.riderCount} 項附約`),
      highlight: false,
    },
    {
      label: tr('附約整併及稅務節省'),
      val: `-HK$ ${model.waterfall.bundleDiscountAndTaxSavedHkd.toLocaleString()}`,
      sub: tr('組合折扣 + 薪俸稅扣減'),
      highlight: false,
    },
    {
      label: tr('扣稅後實質淨年供'),
      val: `HK$ ${model.waterfall.netAfterTaxAnnualHkd.toLocaleString()}`,
      sub: `≈ ¥ ${model.waterfall.netAfterTaxAnnualRmb.toLocaleString()} (${tr('匯率')} ${model.waterfall.fxRateHkdToRmb.toFixed(2)})`,
      highlight: true,
    },
  ];

  cols.forEach((c, i) => {
    const cx = 88 + i * (colW + 18);
    const cy = sec2Y + 86;
    drawRoundedRect(ctx, cx, cy, colW, 185, 18);
    ctx.fillStyle = c.highlight
      ? theme.accentPrimary
      : theme.id === 'VICTORIA_MIDNIGHT'
      ? '#0B172A'
      : '#F8FAFC';
    ctx.fill();
    ctx.strokeStyle = c.highlight ? theme.accentPrimary : theme.cardBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = c.highlight ? 'rgba(255,255,255,0.85)' : theme.secondaryText;
    ctx.font = '600 20px "PingFang HK", sans-serif';
    ctx.fillText(c.label, cx + 22, cy + 44);

    ctx.fillStyle = c.highlight ? '#FFFFFF' : theme.primaryText;
    ctx.font = '700 32px "JetBrains Mono", monospace';
    ctx.fillText(c.val, cx + 22, cy + 104);

    ctx.fillStyle = c.highlight ? 'rgba(255,255,255,0.9)' : theme.secondaryText;
    ctx.font = '500 18px "PingFang HK", sans-serif';
    ctx.fillText(c.sub, cx + 22, cy + 150);
  });

  ctx.fillStyle = theme.secondaryText;
  ctx.font = '600 22px "PingFang HK", sans-serif';
  ctx.fillText(
    tr(
      `折合每月淨投入：HK$ ${model.waterfall.monthlyEquivalentHkd.toLocaleString()} / 月（約 ¥ ${model.waterfall.monthlyEquivalentRmb.toLocaleString()} / 月）· 預算佔用率 ${model.waterfall.budgetUtilizationPct}%`
    ),
    92,
    sec2Y + 324
  );

  // 5. Section III: Perforated Private Hospital Cashless LOG Pass Ticket
  const sec3Y = 1324;
  const sec3H = 290;
  drawRoundedRect(ctx, 52, sec3Y, W - 104, sec3H, 26);
  ctx.fillStyle = theme.ticketBg;
  ctx.fill();
  ctx.strokeStyle = theme.ticketBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Ticket side notches
  ctx.fillStyle = theme.canvasBgBottom;
  ctx.beginPath();
  ctx.arc(52, sec3Y + sec3H / 2, 18, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W - 52, sec3Y + sec3H / 2, 18, Math.PI / 2, -Math.PI / 2);
  ctx.fill();

  ctx.fillStyle = theme.accentSecondary;
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    tr('III · 私家醫院免找數入院預批通行證 (CASHLESS LOG ADMISSION PASS)'),
    94,
    sec3Y + 50
  );

  ctx.fillStyle = theme.primaryText;
  ctx.font = '700 34px "PingFang HK", sans-serif';
  ctx.fillText(
    tr(`${model.hospitalPass.hospitalNameZh} · ${model.hospitalPass.wardTierZh}`),
    94,
    sec3Y + 104
  );

  ctx.fillStyle = theme.secondaryText;
  ctx.font = '600 21px "PingFang HK", sans-serif';
  ctx.fillText(
    tr(`配對醫療計劃：${model.hospitalPass.matchedPlanLabelZh.slice(0, 36)}`),
    94,
    sec3Y + 148
  );

  ctx.fillStyle = model.hospitalPass.eligibleForCashlessLog ? theme.accentSecondary : '#D97706';
  ctx.font = '700 22px "PingFang HK", sans-serif';
  ctx.fillText(
    model.hospitalPass.eligibleForCashlessLog
      ? tr(
          `一般自費按金：${model.hospitalPass.standardCashDepositText}  ➔  憑免找數預批按金：HK$ ${model.hospitalPass.logDepositHkd.toLocaleString()}`
        )
      : tr(
          `一般自費入院按金：${model.hospitalPass.standardCashDepositText}（建議加配 VHIS 解鎖 HK$0 免找數）`
        ),
    94,
    sec3Y + 194
  );

  ctx.fillStyle = theme.accentPrimary;
  ctx.font = '600 21px "PingFang HK", sans-serif';
  ctx.fillText(
    tr(
      `理賠壓測（${model.crisisHighlight.scenarioTitleZh} HK$${model.crisisHighlight.totalBillHkd.toLocaleString()}）：預計客戶自付差額 HK$ ${model.crisisHighlight.clientOutOfPocketHkd.toLocaleString()}`
    ),
    94,
    sec3Y + 242
  );

  // 6. Footer: Licensed Advisor Credentials + Real ISO/IEC 18004 Scannable QR Matrix
  const footY = 1644;
  const footH = 224;
  drawRoundedRect(ctx, 52, footY, W - 104, footH, 24);
  ctx.fillStyle = theme.headerBg;
  ctx.fill();

  ctx.fillStyle = theme.headerSubtle;
  ctx.font = '600 20px "PingFang HK", sans-serif';
  ctx.fillText(tr(`顧問重點建議：「${model.advisor.customHeadlineNoteZh.slice(0, 38)}」`), 92, footY + 54);

  ctx.fillStyle = theme.headerText;
  ctx.font = '700 28px "PingFang HK", sans-serif';
  ctx.fillText(
    tr(`專屬持牌顧問：${model.advisor.nameZh} (${model.advisor.nameEn})`),
    92,
    footY + 114
  );

  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = '500 20px "JetBrains Mono", monospace';
  ctx.fillText(
    tr(`HKIA License: ${model.advisor.licenseNo} · 掃描右側 QR 開啟互動建議書`),
    92,
    footY + 162
  );

  // Draw Real Scannable QR Box on right of footer
  const qrBoxSize = 168;
  const qrX = W - 52 - qrBoxSize - 28;
  const qrY = footY + 28;
  drawRoundedRect(ctx, qrX, qrY, qrBoxSize, qrBoxSize, 14);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  const qrModules = Math.max(1, model.qrMatrix.length);
  const quietModules = 2;
  const cell = (qrBoxSize - 12) / (qrModules + quietModules * 2);
  const startQx = qrX + 6 + quietModules * cell;
  const startQy = qrY + 6 + quietModules * cell;
  ctx.fillStyle = '#060D18';
  model.qrMatrix.forEach((row, rIdx) => {
    row.forEach((filled, cIdx) => {
      if (filled) {
        ctx.fillRect(
          Math.round(startQx + cIdx * cell),
          Math.round(startQy + rIdx * cell),
          Math.ceil(cell),
          Math.ceil(cell)
        );
      }
    });
  });

  return canvas.toDataURL('image/png');
}

export const MobileSummaryPosterModal: React.FC<MobileSummaryPosterModalProps> = ({
  open,
  onClose,
  unifiedDeal,
  intermediary,
  clientSafeMode = false,
  allPlans = HK_MARKET_PLANS,
  onSelectPlanId,
  onEnableVhisRider,
  proposalShareUrl,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const [themeId, setThemeId] = useState<PosterThemeId>('VICTORIA_MIDNIGHT');
  const [hospitalId, setHospitalId] = useState<string>('HK-HOSP-01');
  const [anonymizeClient, setAnonymizeClient] = useState<boolean>(clientSafeMode);
  const [customNoteZh, setCustomNoteZh] = useState<string>('');
  const [copiedWhatsapp, setCopiedWhatsapp] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  const theme = POSTER_THEME_PRESETS[themeId];

  const selectedHospital = useMemo(
    () =>
      HK_PRIVATE_HOSPITALS_LOG.find((h) => h.recordId === hospitalId) ||
      HK_PRIVATE_HOSPITALS_LOG[0],
    [hospitalId]
  );

  const liveLogEval = useMemo(
    () =>
      evaluateDealHospitalLogPass({
        anchorPlan: unifiedDeal.anchorPlan,
        selectedRiderIds: unifiedDeal.selectedRiderIds,
        hospital: selectedHospital,
        clientAge: unifiedDeal.lead.age,
        isSmoker: unifiedDeal.lead.isSmoker,
        deductibleHkd: unifiedDeal.cart.hospitalDeductibleHkd ?? 0,
        allPlans,
      }),
    [unifiedDeal, selectedHospital, allPlans]
  );

  const posterModel = useMemo(
    () =>
      buildMobilePosterDataModel({
        unifiedDeal,
        intermediary,
        hospitalId,
        anonymizeClient,
        customTaglineZh: customNoteZh || undefined,
        originUrl: typeof window !== 'undefined' ? window.location.origin : 'https://hkinsurehub.pro',
        proposalShareUrl,
        allPlans,
      }),
    [unifiedDeal, intermediary, hospitalId, anonymizeClient, customNoteZh, proposalShareUrl, allPlans]
  );

  if (!open) return null;

  // Compute SVG radar polygon coordinates for live preview
  const cx = 78;
  const cy = 78;
  const rMax = 54;
  const angles = posterModel.radarAxes.map(
    (_, idx) => -Math.PI / 2 + (idx * Math.PI * 2) / 6
  );
  const existingPoints = angles
    .map((ang, i) => {
      const ratio = Math.max(0.08, posterModel.radarAxes[i].existingPct / 100);
      return `${(cx + Math.cos(ang) * rMax * ratio).toFixed(1)},${(
        cy +
        Math.sin(ang) * rMax * ratio
      ).toFixed(1)}`;
    })
    .join(' ');
  const combinedPoints = angles
    .map((ang, i) => {
      const ratio = Math.max(0.12, posterModel.radarAxes[i].combinedPct / 100);
      return `${(cx + Math.cos(ang) * rMax * ratio).toFixed(1)},${(
        cy +
        Math.sin(ang) * rMax * ratio
      ).toFixed(1)}`;
    })
    .join(' ');

  const handleDownloadPosterPng = () => {
    setDownloading(true);
    try {
      const dataUrl = renderMobilePosterPngDataUrl(
        posterModel,
        theme,
        lang === 'zh-CN'
      );
      if (dataUrl) {
        const link = document.createElement('a');
        const safeName = unifiedDeal.lead.fullNameEn.replace(/\s+/g, '_');
        link.download = `HK_InsureHub_1Page_Poster_${safeName}_${themeId}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onNotify?.(
          t(
            `Downloaded 1080×1920 mobile portrait poster (${theme.nameEn})!`,
            conv(`已下載 1080×1920 高清手機直式提案長圖（${theme.nameZh}）！`)
          )
        );
      }
    } finally {
      window.setTimeout(() => setDownloading(false), 600);
    }
  };

  const handleCopyWhatsappCaption = async () => {
    const caption =
      lang === 'en'
        ? posterModel.whatsappCaptionEn
        : conv(posterModel.whatsappCaptionZh);
    await copyTextSafe(caption);
    setCopiedWhatsapp(true);
    window.setTimeout(() => setCopiedWhatsapp(false), 2200);
    onNotify?.(
      t(
        'Copied 1-Page WhatsApp executive caption to clipboard!',
        conv('已複製配圖 WhatsApp 客戶摘要文案至剪貼簿！')
      )
    );
  };

  const isDarkTheme = themeId === 'VICTORIA_MIDNIGHT';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={t(
        '1-Page Mobile Vertical Summary Poster Studio',
        conv('一頁式手機直式客戶提案海報設計室')
      )}
      data-testid="mobile-poster-studio-modal"
    >
      <div className="my-auto flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-white shadow-2xl">
        {/* Top Studio Bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-5 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <Smartphone className="h-4 w-4 text-teal-400" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-white">
                {t(
                  '1-Page Mobile Portrait Poster Studio (9:16 Bespoke Graphic Design · Not a Web Screenshot)',
                  conv('一頁式手機直式提案長圖設計室（9:16 專屬視覺排版 · 非網頁截圖）')
                )}
              </h2>
              <p className="text-[11px] text-slate-400">
                {t(
                  'Consolidates 6-Axis Gap Radar + Dual-FX HKD/RMB Waterfall + Private Hospital Cashless LOG Pass into a 1080×1920 WhatsApp graphic card.',
                  conv(
                    '自動濃縮「01 六軸缺口雷達 ＋ 03 雙幣保費扣稅瀑布 ＋ 私家醫院免找數通行證」為 1080×1920 高清直式海報，會後 10 秒直發 WhatsApp。'
                  )
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-mobile-poster-modal-btn"
            onClick={onClose}
            aria-label="Close poster studio"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 whitespace-nowrap"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('Close', conv('關閉'))}</span>
          </button>
        </div>

        {/* Main 12-Col Studio Split */}
        <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12">
          {/* Left (5 cols): Theme Switcher, Hospital LOG Pass Selector & Export Controls */}
          <div className="lg:col-span-5 border-b border-slate-200 bg-slate-50 p-4 sm:p-5 lg:border-b-0 lg:border-r space-y-4">
            {/* 1. 4 Graphic Poster Editions */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Palette className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                <span>
                  {t(
                    '1. Choose Graphic Poster Art Direction (4 Themes)',
                    conv('1. 選擇海報視覺設計風格（4 款專屬美術版型）')
                  )}
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(Object.values(POSTER_THEME_PRESETS) as PosterThemePalette[]).map((preset) => {
                  const active = preset.id === themeId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      data-testid={`poster-theme-${preset.id}`}
                      aria-pressed={active}
                      onClick={() => setThemeId(preset.id)}
                      className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? 'border-teal-700 bg-white ring-2 ring-teal-600/20'
                          : 'border-slate-200 bg-white/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {lang === 'en' ? preset.nameEn : conv(preset.nameZh)}
                        </span>
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border border-slate-300"
                          style={{ backgroundColor: preset.headerBg }}
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-slate-500">
                        {lang === 'en' ? preset.subtitleEn : conv(preset.subtitleZh)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Match Medical Plan First + Target Hospital LOG Pass */}
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="space-y-2">
                <label
                  htmlFor="poster-hospital-select"
                  className="block text-xs font-bold text-slate-900"
                >
                  {t(
                    '2. Private Hospital Cashless LOG Pass (Match Plan First → Pick Hospital)',
                    conv('2. 私家醫院免找數預批通行證（先配對醫療計劃 ➔ 再鎖定私院）')
                  )}
                </label>

                {/* Plan-First Eligibility Status & Quick Plan Matcher */}
                <div
                  data-testid="poster-hospital-plan-match-box"
                  className={`rounded-xl border p-2.5 text-xs ${
                    liveLogEval.eligibleForCashlessLog
                      ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950'
                      : 'border-amber-300 bg-amber-50 text-amber-950'
                  }`}
                >
                  <div className="flex items-start gap-1.5 font-bold">
                    {liveLogEval.eligibleForCashlessLog ? (
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
                    ) : (
                      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
                    )}
                    <span>
                      {lang === 'en' ? liveLogEval.statusHeadlineEn : conv(liveLogEval.statusHeadlineZh)}
                    </span>
                  </div>

                  {onSelectPlanId && liveLogEval.recommendedMedicalPlans.length > 0 && (
                    <div className="mt-2 space-y-1.5 border-t border-black/10 pt-2">
                      <div className="text-[10px] font-semibold opacity-85">
                        {liveLogEval.eligibleForCashlessLog
                          ? t('Switch Matched VHIS / High-End Medical Plan:', conv('切換配對不同保司高端醫療／VHIS 計劃：'))
                          : t('Select a Medical Plan First to Unlock HK$0 Cashless LOG:', conv('請先點選配對高端醫療／VHIS 計劃（或加掛附約）以解鎖免找數：'))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {liveLogEval.recommendedMedicalPlans.slice(0, 3).map((opt) => {
                          const isCurrent = unifiedDeal.anchorPlan?.id === opt.plan.id;
                          return (
                            <button
                              key={opt.plan.id}
                              type="button"
                              onClick={() => {
                                onSelectPlanId(opt.plan.id);
                                onNotify?.(
                                  t(
                                    `Matched [${opt.plan.insurerCode}] ${opt.plan.nameEn} for Cashless Hospital LOG Pass.`,
                                    conv(`已配對 [${opt.plan.insurerCode}] ${opt.plan.nameZh}，私家醫院免找數預批通行證已即時生效！`)
                                  )
                                );
                              }}
                              className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                                isCurrent
                                  ? 'border-[#D4AF37] bg-[#0B172A] text-[#F3D37A]'
                                  : 'border-slate-300 bg-white text-slate-800 hover:border-teal-600'
                              }`}
                            >
                              [{opt.plan.insurerCode}] {lang === 'en' ? opt.plan.nameEn : conv(opt.plan.nameZh)} · HK$
                              {opt.annualPremiumHkd.toLocaleString()}/{t('yr', '年')}
                            </button>
                          );
                        })}

                        {!liveLogEval.eligibleForCashlessLog && onEnableVhisRider && (
                          <button
                            type="button"
                            onClick={() => {
                              onEnableVhisRider();
                              onNotify?.(
                                t(
                                  'Attached Semi-Private VHIS Rider — Cashless Hospital LOG Pass unlocked!',
                                  conv('已加掛「半私家房全數賠付 VHIS 附約」，私家醫院免找數通行證已解鎖！')
                                )
                              );
                            }}
                            className="rounded-md bg-teal-700 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
                          >
                            {t('+ Attach VHIS Rider', conv('+ 加掛半私家 VHIS 附約'))}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <select
                  id="poster-hospital-select"
                  value={hospitalId}
                  onChange={(e) => setHospitalId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-teal-600 focus:outline-none"
                >
                  {HK_PRIVATE_HOSPITALS_LOG.map((h) => (
                    <option key={h.recordId} value={h.recordId}>
                      {conv(h.hospitalNameZh)} ({h.hospitalNameEn}) · 免按金 {h.cashDepositRangeHkd}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="poster-custom-note"
                  className="block text-xs font-bold text-slate-800"
                >
                  {t(
                    '3. Advisor Dedication / Key Highlight on Poster',
                    conv('3. 海報底部顧問專屬題記（即時顯示於圖卡）')
                  )}
                </label>
                <input
                  id="poster-custom-note"
                  type="text"
                  value={customNoteZh}
                  onChange={(e) => setCustomNoteZh(e.target.value)}
                  placeholder={conv(posterModel.advisor.customHeadlineNoteZh)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-slate-700">
                  {t('Anonymize Client Surname (VIP Mode)', conv('隱藏客戶全名（顯示為「X貴賓」）'))}
                </span>
                <button
                  type="button"
                  data-testid="poster-anonymize-toggle"
                  aria-pressed={anonymizeClient}
                  onClick={() => setAnonymizeClient((p) => !p)}
                  className={`rounded-lg border px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                    anonymizeClient
                      ? 'border-teal-700 bg-teal-700 text-white'
                      : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {anonymizeClient ? t('VIP Masked ON', conv('已啟用貴賓匿名')) : t('Show Full Name', conv('顯示完整姓名'))}
                </button>
              </div>
            </div>

            {/* 3. Export PNG + Copy WhatsApp Caption */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                data-testid="download-mobile-poster-png-btn"
                onClick={handleDownloadPosterPng}
                disabled={downloading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-xs font-bold text-white hover:bg-teal-800 whitespace-nowrap shadow-sm"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>
                  {downloading
                    ? t('Rendering 1080×1920 Poster...', conv('正在繪製 1080×1920 高清海報...'))
                    : t(
                        'Download 1080×1920 Mobile Portrait PNG',
                        conv('下載 1080×1920 高清手機直式海報 (PNG)')
                      )}
                </span>
              </button>

              <button
                type="button"
                data-testid="copy-poster-whatsapp-btn"
                onClick={handleCopyWhatsappCaption}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
              >
                {copiedWhatsapp ? (
                  <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                <span>
                  {copiedWhatsapp
                    ? t('Copied WhatsApp Summary!', conv('已複製配圖 WhatsApp 文案！'))
                    : t(
                        'Copy Companion WhatsApp Summary Text',
                        conv('一鍵複製配圖 WhatsApp 摘要文案')
                      )}
                </span>
              </button>

              <div className="pt-0.5">
                <ShareProposalActionButton
                  testId="poster-native-share-btn"
                  variant="outline"
                  shareInput={{
                    clientNameZh: unifiedDeal.lead.fullNameZh,
                    clientNameEn: unifiedDeal.lead.fullNameEn,
                    planNameZh: unifiedDeal.anchorPlan?.nameZh || '專屬保障方案',
                    planNameEn: unifiedDeal.anchorPlan?.nameEn || 'Protection Plan',
                    insurerNameZh: unifiedDeal.anchorPlan?.insurerNameZh || '香港保險',
                    insurerCode: unifiedDeal.anchorPlan?.insurerCode || 'HKIA',
                    annualPremiumDisplay: `HK$ ${unifiedDeal.bundleSim.netAnnualPremiumHkd.toLocaleString()}`,
                    proposalUrl: proposalShareUrl,
                    advisorNameZh: intermediary.nameZh,
                    advisorLicenseNo: intermediary.iaLicenseNo,
                    whatsappPhone: unifiedDeal.lead.whatsappPhone,
                  }}
                  getOptionalFile={async () => {
                    const dataUrl = renderMobilePosterPngDataUrl(
                      posterModel,
                      theme,
                      lang === 'zh-CN'
                    );
                    if (!dataUrl) return null;
                    const res = await fetch(dataUrl);
                    const blob = await res.blob();
                    return new File(
                      [blob],
                      `HK_Proposal_Poster_${unifiedDeal.lead.fullNameEn.replace(/\s+/g, '_')}.png`,
                      { type: 'image/png' }
                    );
                  }}
                  onNotify={onNotify}
                />
              </div>
            </div>
          </div>

          {/* Right (7 cols): Live 9:16 Bespoke Graphic Poster Preview Stage */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-900/95 p-4 sm:p-5">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              <span>
                {t(
                  'Live 9:16 Mobile Screen Preview (Designed for iPhone / WhatsApp Full-Screen Reading)',
                  conv('9:16 手機全屏閱讀比例即時預覽（專為 WhatsApp／微信點開即讀設計）')
                )}
              </span>
            </div>

            {/* Bespoke Graphic Poster Artboard */}
            <article
              data-testid="mobile-vertical-poster-artboard"
              style={{
                background: `linear-gradient(180deg, ${theme.canvasBgTop} 0%, ${theme.canvasBgBottom} 100%)`,
                color: theme.primaryText,
              }}
              className="relative w-full max-w-[392px] overflow-hidden rounded-[24px] p-3.5 shadow-2xl ring-1 ring-white/15 space-y-2.5"
            >
              {/* Theme Architectural / Museum Decorative Frame */}
              {theme.motifStyle === 'MUSEUM_FRAME' && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-2 rounded-[18px] border"
                  style={{ borderColor: theme.cardBorder }}
                />
              )}
              {theme.motifStyle === 'JADE_LATTICE' && (
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full opacity-45"
                  viewBox="0 0 400 720"
                  fill="none"
                >
                  <rect x="8" y="8" width="384" height="704" rx="18" stroke={theme.accentSecondary} strokeWidth="1.2" />
                  <rect x="14" y="14" width="22" height="22" stroke={theme.accentSecondary} strokeWidth="1.2" />
                  <rect x="364" y="14" width="22" height="22" stroke={theme.accentSecondary} strokeWidth="1.2" />
                  <rect x="14" y="684" width="22" height="22" stroke={theme.accentSecondary} strokeWidth="1.2" />
                  <rect x="364" y="684" width="22" height="22" stroke={theme.accentSecondary} strokeWidth="1.2" />
                </svg>
              )}

              {/* Poster Header Block with Custom Vector Motif */}
              <div
                style={{ backgroundColor: theme.headerBg, color: theme.headerText }}
                className="relative overflow-hidden rounded-2xl p-3.5"
              >
                {theme.motifStyle === 'HARBOUR_SKYLINE' && (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 360 110"
                    className="pointer-events-none absolute bottom-0 right-0 h-24 w-56 opacity-25"
                    fill="none"
                  >
                    <path
                      d="M170 110V52H192V110M204 110V28L228 14V110M204 28L228 70M228 28L204 70M204 70L228 110M228 70L204 110M242 110V40H268V110M282 110V18H312V110M324 110V58H348V110"
                      stroke="#D4AF37"
                      strokeWidth="1.6"
                    />
                  </svg>
                )}

                <div className="relative z-10 flex items-center justify-between gap-2">
                  <span
                    style={{ color: theme.headerSubtle }}
                    className="font-mono text-[10px] font-semibold tracking-wider"
                  >
                    {posterModel.editionCode} · {posterModel.issueDateText}
                  </span>
                  <span
                    style={{
                      borderColor: theme.headerSubtle,
                      color: theme.headerSubtle,
                    }}
                    className="rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold"
                  >
                    {posterModel.insurerBadge}
                  </span>
                </div>

                <h3 className="relative z-10 mt-1.5 text-lg font-bold tracking-tight">
                  {lang === 'en'
                    ? `${posterModel.clientDisplayNameEn} — Protection Brief`
                    : conv(`${posterModel.clientDisplayNameZh} 專屬保障精算圖卡`)}
                </h3>
                <p
                  style={{ color: theme.headerSubtle }}
                  className="relative z-10 mt-0.5 text-[11px]"
                >
                  {lang === 'en'
                    ? `${posterModel.residencyLabelEn} · Age ${posterModel.clientAge}`
                    : conv(`${posterModel.residencyLabelZh} · 投保年齡 ${posterModel.clientAge} 歲`)}
                </p>

                <div className="relative z-10 mt-2.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white truncate">
                  {lang === 'en' ? posterModel.planHeadlineEn : conv(posterModel.planHeadlineZh)}
                </div>
              </div>

              {/* Section I: 6-Axis Radar + Mini Bars */}
              <div
                style={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                }}
                className="rounded-2xl border p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    style={{ color: theme.accentPrimary }}
                    className="font-mono text-[11px] font-bold"
                  >
                    {t('I · 6-AXIS PROTECTION RADAR', conv('I · 六軸保障達成雷達'))}
                  </span>
                  <span
                    style={{ backgroundColor: theme.accentPrimary }}
                    className="rounded-md px-2 py-0.5 font-mono text-[11px] font-bold text-white tabular-nums"
                  >
                    {posterModel.overallCompletionPct}% {t('Covered', conv('達標'))}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-12 items-center gap-2">
                  <div className="col-span-5 flex justify-center">
                    <svg
                      viewBox="0 0 156 156"
                      className="h-28 w-28 overflow-visible"
                      aria-label="Poster 6-axis protection radar"
                    >
                      {[0.35, 0.7, 1].map((lvl) => (
                        <polygon
                          key={lvl}
                          points={angles
                            .map(
                              (a) =>
                                `${(cx + Math.cos(a) * rMax * lvl).toFixed(1)},${(
                                  cy +
                                  Math.sin(a) * rMax * lvl
                                ).toFixed(1)}`
                            )
                            .join(' ')}
                          fill="none"
                          stroke={isDarkTheme ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.22)'}
                          strokeWidth={lvl === 1 ? 1.2 : 0.8}
                        />
                      ))}
                      <polygon
                        points={existingPoints}
                        fill={theme.radarExistingFill}
                        stroke={theme.radarExistingStroke}
                        strokeWidth="1.2"
                      />
                      <polygon
                        points={combinedPoints}
                        fill={theme.radarCombinedFill}
                        stroke={theme.radarCombinedStroke}
                        strokeWidth="2"
                      />
                    </svg>
                  </div>

                  <div className="col-span-7 space-y-1.5">
                    {posterModel.radarAxes.map((ax) => (
                      <div key={ax.dimensionId} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold">
                            {lang === 'en' ? ax.shortEn : conv(ax.shortZh)}
                          </span>
                          <span
                            style={{ color: theme.secondaryText }}
                            className="font-mono font-bold tabular-nums"
                          >
                            HK${ax.combinedCoverManHkd}萬 · {ax.combinedPct}%
                          </span>
                        </div>
                        <div
                          className="h-1.5 w-full overflow-hidden rounded-full"
                          style={{
                            backgroundColor: isDarkTheme ? '#1E293B' : '#E2E8F0',
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(8, ax.combinedPct)}%`,
                              backgroundColor: theme.radarCombinedStroke,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section II: Dual-FX HKD / RMB Waterfall */}
              <div
                style={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                }}
                className="rounded-2xl border p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span
                    style={{ color: theme.accentPrimary }}
                    className="font-mono text-[11px] font-bold"
                  >
                    {t('II · DUAL-CURRENCY WATERFALL', conv('II · 雙幣保費及稅務優惠瀑布'))}
                  </span>
                  <span
                    style={{ color: theme.secondaryText }}
                    className="font-mono text-[10px] tabular-nums"
                  >
                    +{posterModel.waterfall.riderCount} {t('Riders', conv('附約'))} · 1 HKD = ¥
                    {posterModel.waterfall.fxRateHkdToRmb.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div
                    style={{
                      backgroundColor: isDarkTheme ? '#0B172A' : '#F8FAFC',
                      borderColor: theme.cardBorder,
                    }}
                    className="rounded-xl border p-2"
                  >
                    <div style={{ color: theme.secondaryText }} className="text-[10px]">
                      {t('Gross/yr', conv('原年保費'))}
                    </div>
                    <div className="mt-0.5 font-mono text-xs font-bold tabular-nums">
                      HK${posterModel.waterfall.grossAnnualHkd.toLocaleString()}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: isDarkTheme ? '#0B172A' : '#F8FAFC',
                      borderColor: theme.cardBorder,
                    }}
                    className="rounded-xl border p-2"
                  >
                    <div style={{ color: theme.secondaryText }} className="text-[10px]">
                      {t('Discount+Tax', conv('折扣及扣稅'))}
                    </div>
                    <div className="mt-0.5 font-mono text-xs font-bold text-emerald-500 tabular-nums">
                      -HK${posterModel.waterfall.bundleDiscountAndTaxSavedHkd.toLocaleString()}
                    </div>
                  </div>

                  <div
                    style={{ backgroundColor: theme.accentPrimary }}
                    className="rounded-xl p-2 text-white"
                  >
                    <div className="text-[10px] text-white/85">
                      {t('Net Outlay', conv('實質淨年供'))}
                    </div>
                    <div className="mt-0.5 font-mono text-xs font-bold tabular-nums">
                      HK${posterModel.waterfall.netAfterTaxAnnualHkd.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div
                  style={{ color: theme.secondaryText }}
                  className="flex items-center justify-between pt-0.5 font-mono text-[10px] tabular-nums"
                >
                  <span>
                    ≈ ¥ {posterModel.waterfall.netAfterTaxAnnualRmb.toLocaleString()} / {t('yr', '年')}
                  </span>
                  <span>
                    {t('Monthly:', conv('折合月均：'))} HK${' '}
                    {posterModel.waterfall.monthlyEquivalentHkd.toLocaleString()} (¥{' '}
                    {posterModel.waterfall.monthlyEquivalentRmb.toLocaleString()})
                  </span>
                </div>
              </div>

              {/* Section III: Perforated Private Hospital Cashless LOG Pass */}
              <div
                style={{
                  backgroundColor: theme.ticketBg,
                  borderColor: theme.ticketBorder,
                }}
                className="relative rounded-2xl border-2 border-dashed p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    style={{ color: theme.accentSecondary }}
                    className="font-mono text-[10px] font-bold"
                  >
                    {t('III · CASHLESS HOSPITAL LOG PASS', conv('III · 私院免找數預批通行證'))}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-600">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    <span>{posterModel.hospitalPass.turnaroundText}</span>
                  </span>
                </div>

                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <div className="text-sm font-bold">
                    {lang === 'en'
                      ? posterModel.hospitalPass.hospitalNameEn
                      : conv(posterModel.hospitalPass.hospitalNameZh)}
                  </div>
                  <span
                    style={{ color: theme.secondaryText }}
                    className="text-[10px] font-semibold whitespace-nowrap"
                  >
                    {lang === 'en'
                      ? posterModel.hospitalPass.wardTierEn
                      : conv(posterModel.hospitalPass.wardTierZh)}
                  </span>
                </div>

                <div className="mt-1 text-[10px] font-semibold opacity-90 truncate">
                  {t('Matched Plan:', conv('配對計劃：'))}{' '}
                  {lang === 'en'
                    ? posterModel.hospitalPass.matchedPlanLabelEn
                    : conv(posterModel.hospitalPass.matchedPlanLabelZh)}
                </div>

                <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg bg-black/5 px-2.5 py-1.5 font-mono text-[11px] tabular-nums">
                  {posterModel.hospitalPass.eligibleForCashlessLog ? (
                    <>
                      <span
                        style={{ color: theme.secondaryText }}
                        className="min-w-0 truncate line-through"
                      >
                        {t('Deposit', conv('自費按金'))} {posterModel.hospitalPass.standardCashDepositText}
                      </span>
                      <span className="shrink-0 font-bold text-emerald-500 whitespace-nowrap">
                        ➔ {t('LOG:', conv('免找數按金：'))} HK${' '}
                        {posterModel.hospitalPass.logDepositHkd.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ color: theme.secondaryText }} className="min-w-0 truncate">
                        {t('Deposit', conv('一般按金'))} {posterModel.hospitalPass.standardCashDepositText}
                      </span>
                      <span className="shrink-0 font-bold text-amber-500 whitespace-nowrap">
                        {t('Match VHIS First', conv('待配對醫療計劃'))}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Footer: Licensed Advisor Stamp + Scannable ISO/IEC 18004 QR Code */}
              <div
                style={{ backgroundColor: theme.headerBg, color: theme.headerText }}
                className="flex items-center justify-between gap-3 rounded-2xl p-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <p
                    style={{ color: theme.headerSubtle }}
                    className="truncate text-[10px] italic"
                  >
                    “{conv(posterModel.advisor.customHeadlineNoteZh)}”
                  </p>
                  <div className="truncate text-xs font-bold">
                    {posterModel.advisor.nameZh} · {posterModel.advisor.nameEn}
                  </div>
                  <div className="font-mono text-[10px] text-white/70 tabular-nums">
                    HKIA Lic: {posterModel.advisor.licenseNo} · {t('Scan QR for Proposal', conv('掃碼開互動建議書'))}
                  </div>
                </div>

                <ScannableProposalQrSvg
                  url={posterModel.shareUrl}
                  sizePx={56}
                  ariaLabel="Poster scannable proposal QR code"
                />
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
};
