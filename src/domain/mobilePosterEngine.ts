import { HK_PRIVATE_HOSPITALS_LOG } from '../data/hkMarketIntelData';
import { HK_MARKET_PLANS } from '../data/hkMarketPlans';
import { generateScannableQrMatrix } from '../utils/qrCodeGenerator';
import { getSchemeMeta, SIX_PROTECTION_DIMENSIONS } from './clientGapEngine';
import { UnifiedDealValuation } from './dealCaseEngine';
import {
  DealHospitalLogMatchSource,
  evaluateDealHospitalLogPass,
} from './hospitalLogMatcher';
import { HospitalLogEntry, InsurancePlan, IntermediaryProfile } from './types';

export type PosterThemeId =
  | 'VICTORIA_MIDNIGHT'
  | 'ARCHIVAL_ALABASTER'
  | 'SWISS_GRID_COBALT'
  | 'CANTON_JADE_HERITAGE';

export interface PosterThemePalette {
  id: PosterThemeId;
  nameZh: string;
  nameEn: string;
  subtitleZh: string;
  subtitleEn: string;
  canvasBgTop: string;
  canvasBgBottom: string;
  headerBg: string;
  headerText: string;
  headerSubtle: string;
  cardBg: string;
  cardBorder: string;
  primaryText: string;
  secondaryText: string;
  accentPrimary: string;
  accentSecondary: string;
  radarExistingFill: string;
  radarExistingStroke: string;
  radarCombinedFill: string;
  radarCombinedStroke: string;
  ticketBg: string;
  ticketBorder: string;
  motifStyle: 'HARBOUR_SKYLINE' | 'MUSEUM_FRAME' | 'SWISS_GRID' | 'JADE_LATTICE';
}

export const POSTER_THEME_PRESETS: Record<PosterThemeId, PosterThemePalette> = {
  VICTORIA_MIDNIGHT: {
    id: 'VICTORIA_MIDNIGHT',
    nameZh: '維港私銀深邃金',
    nameEn: 'Victoria Private Wealth',
    subtitleZh: '深海藍底配香檳金建築線條 · 高端財富管理質感',
    subtitleEn: 'Obsidian navy with champagne gold harbour geometry',
    canvasBgTop: '#08111F',
    canvasBgBottom: '#0F1E36',
    headerBg: '#060D18',
    headerText: '#F8FAFC',
    headerSubtle: '#D4AF37',
    cardBg: '#11223B',
    cardBorder: '#2A4365',
    primaryText: '#F8FAFC',
    secondaryText: '#94A3B8',
    accentPrimary: '#D4AF37',
    accentSecondary: '#2DD4BF',
    radarExistingFill: 'rgba(148, 163, 184, 0.28)',
    radarExistingStroke: '#94A3B8',
    radarCombinedFill: 'rgba(212, 175, 55, 0.28)',
    radarCombinedStroke: '#EAB308',
    ticketBg: '#0B172A',
    ticketBorder: '#D4AF37',
    motifStyle: 'HARBOUR_SKYLINE',
  },
  ARCHIVAL_ALABASTER: {
    id: 'ARCHIVAL_ALABASTER',
    nameZh: '典藏暖白藝廊風',
    nameEn: 'Archival Alabaster',
    subtitleZh: '溫潤藝術紙感配松墨綠與古銅細線 · 知性清爽易讀',
    subtitleEn: 'Warm museum paper with forest ink & antique bronze lines',
    canvasBgTop: '#FBF8F3',
    canvasBgBottom: '#F3EDE2',
    headerBg: '#143326',
    headerText: '#FBF8F3',
    headerSubtle: '#D6CEBE',
    cardBg: '#FFFFFF',
    cardBorder: '#DCD3C4',
    primaryText: '#1C1917',
    secondaryText: '#57534E',
    accentPrimary: '#14532D',
    accentSecondary: '#9A3412',
    radarExistingFill: 'rgba(120, 113, 108, 0.22)',
    radarExistingStroke: '#78716C',
    radarCombinedFill: 'rgba(20, 83, 45, 0.22)',
    radarCombinedStroke: '#15803D',
    ticketBg: '#F7F3EB',
    ticketBorder: '#9A3412',
    motifStyle: 'MUSEUM_FRAME',
  },
  SWISS_GRID_COBALT: {
    id: 'SWISS_GRID_COBALT',
    nameZh: '瑞士精算極簡格線',
    nameEn: 'Swiss Actuarial Grid',
    subtitleZh: '純白現代主義結構格線配國際克萊因藍 · 數據一目了然',
    subtitleEn: 'Modernist typographic grid with cobalt & vermilion blocks',
    canvasBgTop: '#FFFFFF',
    canvasBgBottom: '#F8FAFC',
    headerBg: '#1D4ED8',
    headerText: '#FFFFFF',
    headerSubtle: '#BFDBFE',
    cardBg: '#F8FAFC',
    cardBorder: '#0F172A',
    primaryText: '#0F172A',
    secondaryText: '#475569',
    accentPrimary: '#1D4ED8',
    accentSecondary: '#DC2626',
    radarExistingFill: 'rgba(100, 116, 139, 0.22)',
    radarExistingStroke: '#475569',
    radarCombinedFill: 'rgba(29, 78, 216, 0.22)',
    radarCombinedStroke: '#1D4ED8',
    ticketBg: '#EFF6FF',
    ticketBorder: '#1D4ED8',
    motifStyle: 'SWISS_GRID',
  },
  CANTON_JADE_HERITAGE: {
    id: 'CANTON_JADE_HERITAGE',
    nameZh: '東方翡翠家族傳承',
    nameEn: 'Imperial Jade Heritage',
    subtitleZh: '宮廷翡翠綠配象牙絲絹與回紋邊角 · 大灣區高淨值首選',
    subtitleEn: 'Deep jade & warm silk ivory with geometric lattice corners',
    canvasBgTop: '#FAF6EE',
    canvasBgBottom: '#EFE8D8',
    headerBg: '#064E3B',
    headerText: '#FEFCE8',
    headerSubtle: '#FDE68A',
    cardBg: '#FFFDF9',
    cardBorder: '#C7BCA6',
    primaryText: '#1F2937',
    secondaryText: '#57534E',
    accentPrimary: '#065F46',
    accentSecondary: '#B45309',
    radarExistingFill: 'rgba(120, 113, 108, 0.22)',
    radarExistingStroke: '#78716C',
    radarCombinedFill: 'rgba(6, 95, 70, 0.24)',
    radarCombinedStroke: '#047857',
    ticketBg: '#ECFDF5',
    ticketBorder: '#047857',
    motifStyle: 'JADE_LATTICE',
  },
};

export interface MobilePosterAxisPoint {
  dimensionId: string;
  shortZh: string;
  shortEn: string;
  existingPct: number;
  combinedPct: number;
  combinedCoverManHkd: number; // in 萬 HK$
}

export interface MobilePosterDataModel {
  editionCode: string;
  issueDateText: string;
  clientDisplayNameZh: string;
  clientDisplayNameEn: string;
  clientAge: number;
  residencyLabelZh: string;
  residencyLabelEn: string;
  planHeadlineZh: string;
  planHeadlineEn: string;
  insurerBadge: string;
  overallCompletionPct: number;
  radarAxes: MobilePosterAxisPoint[];
  waterfall: {
    grossAnnualHkd: number;
    bundleDiscountAndTaxSavedHkd: number;
    netAfterTaxAnnualHkd: number;
    netAfterTaxAnnualRmb: number;
    monthlyEquivalentHkd: number;
    monthlyEquivalentRmb: number;
    fxRateHkdToRmb: number;
    riderCount: number;
    withinBudget: boolean;
    budgetUtilizationPct: number;
  };
  hospitalPass: {
    hospitalId: string;
    hospitalNameZh: string;
    hospitalNameEn: string;
    standardCashDepositText: string;
    waivedDepositMidpointHkd: number;
    logDepositHkd: number;
    turnaroundText: string;
    wardTierZh: string;
    wardTierEn: string;
    matchedPlanLabelZh: string;
    matchedPlanLabelEn: string;
    matchSource: DealHospitalLogMatchSource;
    statusHeadlineZh: string;
    statusHeadlineEn: string;
    eligibleForCashlessLog: boolean;
    eligibleForZeroDepositLog: boolean;
  };
  crisisHighlight: {
    scenarioTitleZh: string;
    scenarioTitleEn: string;
    totalBillHkd: number;
    coveredHkd: number;
    clientOutOfPocketHkd: number;
  };
  advisor: {
    nameZh: string;
    nameEn: string;
    licenseNo: string;
    firmName: string;
    customHeadlineNoteZh: string;
  };
  qrMatrix: boolean[][];
  shareUrl: string;
  whatsappCaptionZh: string;
  whatsappCaptionEn: string;
}

export function buildMobilePosterDataModel(params: {
  unifiedDeal: UnifiedDealValuation;
  intermediary: IntermediaryProfile;
  hospitalId?: string;
  anonymizeClient?: boolean;
  customTaglineZh?: string;
  originUrl?: string;
  proposalShareUrl?: string;
  allPlans?: InsurancePlan[];
}): MobilePosterDataModel {
  const {
    unifiedDeal,
    intermediary,
    hospitalId = 'HK-HOSP-01',
    anonymizeClient = false,
    customTaglineZh,
    originUrl = 'https://hkinsurehub.pro',
    proposalShareUrl,
    allPlans = HK_MARKET_PLANS,
  } = params;

  const { lead, anchorPlan, gapAudit, bundleSim, selectedRiderIds } = unifiedDeal;
  const schemeMeta = getSchemeMeta(lead.targetSchemeId);

  const hospital: HospitalLogEntry =
    HK_PRIVATE_HOSPITALS_LOG.find((h) => h.recordId === hospitalId) ||
    HK_PRIVATE_HOSPITALS_LOG[0];

  const logEval = evaluateDealHospitalLogPass({
    anchorPlan,
    selectedRiderIds,
    hospital,
    clientAge: lead.age,
    isSmoker: lead.isSmoker,
    deductibleHkd: unifiedDeal.cart.hospitalDeductibleHkd ?? 0,
    allPlans,
  });

  const shortAxisMap: Record<string, { zh: string; en: string }> = {
    LIFE_MORTGAGE: { zh: '人壽按揭', en: 'Life' },
    PRIVATE_HOSPITAL: { zh: '私院醫療', en: 'Medical' },
    CRITICAL_ILLNESS: { zh: '嚴重危疾', en: 'CI Cash' },
    CANCER_TARGETED: { zh: '癌症標靶', en: 'Oncology' },
    ACCIDENT_INCOME: { zh: '意外收入', en: 'Accident' },
    RETIREMENT_DEMENTIA: { zh: '退休照護', en: 'Retire' },
  };

  const radarAxes: MobilePosterAxisPoint[] = SIX_PROTECTION_DIMENSIONS.map((dim) => {
    const row = gapAudit.rows.find((r) => r.dimensionId === dim.id);
    const existingPct = row ? row.existingPct : 0;
    const combinedPct = row ? row.totalAchievementPct : 0;
    const combinedCoverManHkd = row ? Math.round(row.combinedCoverHkd / 10000) : 0;
    const labels = shortAxisMap[dim.id] || { zh: dim.labelZh.slice(0, 4), en: dim.labelEn.slice(0, 8) };
    return {
      dimensionId: dim.id,
      shortZh: labels.zh,
      shortEn: labels.en,
      existingPct,
      combinedPct,
      combinedCoverManHkd,
    };
  });

  const grossBeforeDiscountAndTax =
    bundleSim.basePlanAnnualHkd + bundleSim.ridersAnnualHkd;
  const netAfterTaxHkd = bundleSim.effectiveAfterTaxAnnualHkd;
  const totalSavedHkd = Math.max(0, grossBeforeDiscountAndTax - netAfterTaxHkd);

  const clientDisplayNameZh = anonymizeClient
    ? `${lead.fullNameZh.slice(0, 1)}貴賓 (${lead.age}歲)`
    : lead.fullNameZh;
  const clientDisplayNameEn = anonymizeClient
    ? `VIP Client (${lead.age}y)`
    : lead.fullNameEn;

  const planHeadlineZh = anchorPlan
    ? `${anchorPlan.insurerNameZh} · ${anchorPlan.nameZh}`
    : schemeMeta.lockedSummaryZh;
  const planHeadlineEn = anchorPlan
    ? `${anchorPlan.insurerNameEn} · ${anchorPlan.nameEn}`
    : schemeMeta.titleEn;

  const shareUrl = proposalShareUrl || `${originUrl.replace(/\/$/, '')}/?section=stage3`;
  const qrMatrix = generateScannableQrMatrix(shareUrl);

  const defaultNoteZh =
    lead.priorityGoalNote ||
    `鎖定${hospital.hospitalNameZh}免找數入院批核，兼享稅務扣減與雙幣靈活配置。`;

  const today = new Date().toISOString().slice(0, 10);
  const editionCode = `HKIP-${lead.age}${lead.residency}-${selectedRiderIds.length}R`;

  const hospitalWhatsappLineZh = logEval.eligibleForCashlessLog
    ? `• 私院免找數通行：${hospital.hospitalNameZh}（已配對 ${logEval.matchedPlanLabelZh} · 入院按金 HK$ ${logEval.logDepositHkd.toLocaleString()}）`
    : `• 私院入院提示：${hospital.hospitalNameZh}（當前主約為非醫療險種，建議加配 VHIS／高端醫療以豁免 ${hospital.cashDepositRangeHkd} 按金）`;

  const hospitalWhatsappLineEn = logEval.eligibleForCashlessLog
    ? `• Private Hospital Cashless LOG: ${hospital.hospitalNameEn} (Matched ${logEval.matchedPlanLabelEn} · Deposit HK$ ${logEval.logDepositHkd.toLocaleString()})`
    : `• Private Hospital Note: ${hospital.hospitalNameEn} (Current plan is non-medical; pair a VHIS/Medical plan to waive ${hospital.cashDepositRangeHkd} deposit)`;

  const whatsappCaptionZh = [
    `【${clientDisplayNameZh} 專屬一頁式保障與雙幣精算摘要】`,
    `• 核心方案：${planHeadlineZh}（含 ${selectedRiderIds.length} 項附約整併）`,
    `• 六軸保障綜合達成率：${gapAudit.overallCompletionPct}%`,
    `• 扣稅及組合優惠後淨年供：HK$ ${netAfterTaxHkd.toLocaleString()}（約 ¥ ${bundleSim.effectiveAfterTaxAnnualRmb.toLocaleString()}｜月均 HK$ ${Math.round(netAfterTaxHkd / 12).toLocaleString()}）`,
    hospitalWhatsappLineZh,
    `• 互動建議書微網：${shareUrl}`,
    `• 持牌顧問：${intermediary.nameZh} (${intermediary.nameEn}) · 保監局牌照 ${intermediary.iaLicenseNo}`,
  ].join('\n');

  const whatsappCaptionEn = [
    `[${clientDisplayNameEn} — 1-Page Executive Protection & Dual-FX Summary]`,
    `• Core Architecture: ${planHeadlineEn} (+${selectedRiderIds.length} modular riders)`,
    `• 6-Axis Protection Score: ${gapAudit.overallCompletionPct}%`,
    `• Net After-Tax Annual Outlay: HK$ ${netAfterTaxHkd.toLocaleString()} (≈ ¥ ${bundleSim.effectiveAfterTaxAnnualRmb.toLocaleString()} | HK$ ${Math.round(netAfterTaxHkd / 12).toLocaleString()}/mo)`,
    hospitalWhatsappLineEn,
    `• Interactive Proposal Link: ${shareUrl}`,
    `• Licensed Advisor: ${intermediary.nameEn} · HKIA Lic ${intermediary.iaLicenseNo}`,
  ].join('\n');

  return {
    editionCode,
    issueDateText: today,
    clientDisplayNameZh,
    clientDisplayNameEn,
    clientAge: lead.age,
    residencyLabelZh: lead.residency === 'MCV' ? '跨境高淨值訪客 (MCV)' : '香港居民 (HKID)',
    residencyLabelEn: lead.residency === 'MCV' ? 'Mainland Visitor (MCV)' : 'HK Resident (HKID)',
    planHeadlineZh,
    planHeadlineEn,
    insurerBadge: anchorPlan ? anchorPlan.insurerCode : 'BESPOKE',
    overallCompletionPct: gapAudit.overallCompletionPct,
    radarAxes,
    waterfall: {
      grossAnnualHkd: grossBeforeDiscountAndTax,
      bundleDiscountAndTaxSavedHkd: totalSavedHkd,
      netAfterTaxAnnualHkd: netAfterTaxHkd,
      netAfterTaxAnnualRmb: bundleSim.effectiveAfterTaxAnnualRmb,
      monthlyEquivalentHkd: Math.round(netAfterTaxHkd / 12),
      monthlyEquivalentRmb: Math.round(bundleSim.effectiveAfterTaxAnnualRmb / 12),
      fxRateHkdToRmb: unifiedDeal.cart.fxRateHkdToRmb,
      riderCount: selectedRiderIds.length,
      withinBudget: bundleSim.withinClientBudget,
      budgetUtilizationPct: bundleSim.budgetUtilizationPct,
    },
    hospitalPass: {
      hospitalId: hospital.recordId,
      hospitalNameZh: hospital.hospitalNameZh,
      hospitalNameEn: hospital.hospitalNameEn,
      standardCashDepositText: hospital.cashDepositRangeHkd,
      waivedDepositMidpointHkd: logEval.waivedDepositMidpointHkd,
      logDepositHkd: logEval.logDepositHkd,
      turnaroundText: hospital.preApprovalTurnaround,
      wardTierZh: logEval.wardTierLabelZh,
      wardTierEn: logEval.wardTierLabelEn,
      matchedPlanLabelZh: logEval.matchedPlanLabelZh,
      matchedPlanLabelEn: logEval.matchedPlanLabelEn,
      matchSource: logEval.matchSource,
      statusHeadlineZh: logEval.statusHeadlineZh,
      statusHeadlineEn: logEval.statusHeadlineEn,
      eligibleForCashlessLog: logEval.eligibleForCashlessLog,
      eligibleForZeroDepositLog: logEval.eligibleForZeroDepositLog,
    },
    crisisHighlight: {
      scenarioTitleZh: bundleSim.scenarioOutcome.scenario.titleZh,
      scenarioTitleEn: bundleSim.scenarioOutcome.scenario.titleEn,
      totalBillHkd: bundleSim.scenarioOutcome.totalEventCostHkd,
      coveredHkd: bundleSim.scenarioOutcome.totalCoveredHkd,
      clientOutOfPocketHkd: bundleSim.scenarioOutcome.clientOutOfPocketHkd,
    },
    advisor: {
      nameZh: intermediary.nameZh,
      nameEn: intermediary.nameEn,
      licenseNo: intermediary.iaLicenseNo,
      firmName: intermediary.firmName,
      customHeadlineNoteZh: (customTaglineZh || defaultNoteZh).trim(),
    },
    qrMatrix,
    shareUrl,
    whatsappCaptionZh,
    whatsappCaptionEn,
  };
}
