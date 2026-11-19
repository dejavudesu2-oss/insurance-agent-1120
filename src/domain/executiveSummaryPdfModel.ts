import {
  convertHkdToRmb,
  DualCurrencySimulationResult,
  SixDimensionGapAuditResult,
  TARGET_PROTECTION_SCHEMES,
} from './clientGapEngine';
import { toSimplifiedChinese } from './i18n';
import {
  AppLanguage,
  ClientLead,
  InsurancePlan,
  IntermediaryProfile,
  LeadStage,
  MorningBriefingSlide,
} from './types';

export interface ExecutiveSummaryKpiCard {
  label: string;
  primaryValue: string;
  subValue: string;
  accentHex: string;
}

export interface ExecutiveSummarySlideRenderItem {
  index: number;
  slideNumberLabel: string;
  badge: string;
  title: string;
  keyMetricLabel: string;
  keyMetricValue: string;
  bullets: string[];
  speakerNote: string;
  accentHex: string;
}

export interface ExecutiveSummaryDimensionItem {
  dimensionId: string;
  shortLabel: string;
  existingPct: number;
  totalAchievementPct: number;
  isFullyCovered: boolean;
}

export interface ExecutiveSummaryWaterfallItem {
  label: string;
  formattedHkd: string;
  barRatio: number;
  accentHex: string;
}

export interface ExecutiveSummaryClaimBarItem {
  label: string;
  formattedHkd: string;
  barRatio: number;
  accentHex: string;
}

export interface ExecutiveSummaryReadinessItem {
  step: string;
  done: boolean;
  title: string;
  detail: string;
  statusTag: string;
}

export interface ExecutiveSummaryDeckPdfModel {
  fileName: string;
  documentTitle: string;
  headerKicker: string;
  headerTitle: string;
  clientMetaLine: string;
  advisorMetaLine: string;
  anchorPlanLine: string;
  issuedDateIso: string;
  bannerHex: string;
  goldAccentHex: string;
  kpis: ExecutiveSummaryKpiCard[];
  slides: ExecutiveSummarySlideRenderItem[];
  budgetVisual: {
    budgetHkd: number;
    budgetRmb: number;
    netAfterTaxHkd: number;
    utilizationPct: number;
    withinBudget: boolean;
    schemes: Array<{
      id: string;
      title: string;
      premiumHkd: number;
      isLocked: boolean;
      barRatio: number;
    }>;
  };
  dimensionItems: ExecutiveSummaryDimensionItem[];
  overallCompletionPct: number;
  waterfallItems: ExecutiveSummaryWaterfallItem[];
  effectiveNetAnnualHkd: number;
  effectiveNetAnnualRmb: number;
  monthlyEquivalentHkd: number;
  monthlyEquivalentRmb: number;
  claimVisual: {
    scenarioTitle: string;
    outOfPocketHkd: number;
    surplusBufferHkd: number;
    bars: ExecutiveSummaryClaimBarItem[];
  };
  readinessItems: ExecutiveSummaryReadinessItem[];
  complianceFooter: string;
}

const SLIDE_ACCENT_HEX = ['#0D9488', '#E11D48', '#D97706', '#4F46E5', '#059669'];

const SHORT_AXIS_ZH: Record<string, string> = {
  LIFE_MORTGAGE: '人壽按揭責任',
  PRIVATE_HOSPITAL: '私院手術實銷',
  CRITICAL_ILLNESS: '嚴重危疾現金',
  CANCER_TARGETED: '癌症標靶治療',
  ACCIDENT_INCOME: '意外傷殘收入',
  RETIREMENT_DEMENTIA: '退休腦退化池',
};

const SHORT_AXIS_EN: Record<string, string> = {
  LIFE_MORTGAGE: 'Life & Mortgage',
  PRIVATE_HOSPITAL: 'Private Hospital',
  CRITICAL_ILLNESS: 'Major CI Cash',
  CANCER_TARGETED: 'Targeted Cancer',
  ACCIDENT_INCOME: 'Accident Income',
  RETIREMENT_DEMENTIA: 'Retirement Pool',
};

/**
 * Tokenizes mixed English + CJK text into wrap-friendly segments so HTML5 2D canvas
 * wraps both space-delimited Latin words and continuous Chinese characters cleanly.
 */
export function tokenizeMixedCjkText(text: string): string[] {
  if (!text) return [];
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const rawTokens =
    normalized.match(/[\u3400-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]|[^\s\u3400-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]+\s?|\s+/g) ||
    [normalized];
  return rawTokens.filter((tok) => tok.length > 0);
}

export function buildExecutiveSummaryPdfModel(params: {
  lead: ClientLead;
  plan: InsurancePlan | null;
  intermediary: IntermediaryProfile;
  slides: MorningBriefingSlide[];
  gapAudit: SixDimensionGapAuditResult;
  bundleSim: DualCurrencySimulationResult;
  lang?: AppLanguage;
  issuedDateIso?: string;
  whiteLabel?: {
    enabled: boolean;
    practiceTitleEn: string;
    practiceTitleZh: string;
    honorBadge: string;
    contactChannelLabel: string;
    accentHex: string;
  };
}): ExecutiveSummaryDeckPdfModel {
  const {
    lead,
    plan,
    intermediary,
    slides,
    gapAudit,
    bundleSim,
    lang = 'zh-HK',
    issuedDateIso = new Date().toISOString().slice(0, 10),
    whiteLabel,
  } = params;

  const isEn = lang === 'en';
  const conv = (zhHk: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk);
  const pick = (en: string, zhHk: string) => (isEn ? en : conv(zhHk));

  const safeClientSlug = (lead.fullNameEn || 'Client')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const fileName = `Executive_Summary_Deck_${safeClientSlug || 'Client'}.pdf`;

  const bannerHex =
    whiteLabel?.enabled && whiteLabel.accentHex ? whiteLabel.accentHex : '#0B172A';
  const goldAccentHex = '#D4AF37';

  const headerTitle =
    whiteLabel?.enabled && (isEn ? whiteLabel.practiceTitleEn : whiteLabel.practiceTitleZh)
      ? isEn
        ? whiteLabel.practiceTitleEn
        : conv(whiteLabel.practiceTitleZh)
      : pick(
          `Executive Briefing Summary — ${lead.fullNameEn} (${lead.age}y)`,
          `早會個案簡報與高管執行摘要 — ${lead.fullNameZh} (${lead.fullNameEn} · ${lead.age}歲)`
        );

  const headerKicker = pick(
    'HK INSUREHUB PRO · 5-SLIDE EXECUTIVE CASE BRIEFING DECK',
    'HK INSUREHUB PRO · 五頁式個案簡報執行摘要 (STAGE 04A)'
  );

  const residencyLabel =
    lead.residency === 'MCV'
      ? pick('MCV Cross-Border Visitor', 'MCV 訪港跨境客戶')
      : pick('HK Resident', '香港本地居民');

  const clientMetaLine = pick(
    `Client: ${lead.fullNameEn} (${lead.fullNameZh}) · Age ${lead.age} · ${residencyLabel} · Annual Budget HK$${(lead.annualBudgetHkd ?? 48000).toLocaleString()}`,
    `客戶：${lead.fullNameZh} (${lead.fullNameEn}) · ${lead.age} 歲 · ${residencyLabel} · 年度預算 HK$${(lead.annualBudgetHkd ?? 48000).toLocaleString()}`
  );

  const badgeSuffix =
    whiteLabel?.enabled && whiteLabel.honorBadge ? ` · ${whiteLabel.honorBadge}` : '';
  const advisorMetaLine = pick(
    `Advisor: ${intermediary.nameEn} (${intermediary.nameZh}) · HKIA Lic: ${intermediary.iaLicenseNo}${badgeSuffix} · Issued: ${issuedDateIso}`,
    `持牌顧問：${intermediary.nameZh} (${intermediary.nameEn}) · 保監局牌照：${intermediary.iaLicenseNo}${badgeSuffix} · 日期：${issuedDateIso}`
  );

  const anchorPlanLine = plan
    ? pick(
        `Locked Anchor Plan: [${plan.insurerCode}] ${plan.nameEn} (${plan.nameZh})`,
        `已鎖定主推計劃：[${plan.insurerCode}] ${plan.nameZh} (${plan.nameEn})`
      )
    : pick(
        `Target Protection Architecture: ${gapAudit.schemeMeta.titleEn}`,
        `目標保障架構：${gapAudit.schemeMeta.titleZh}`
      );

  const budgetHkd = Math.max(10000, lead.annualBudgetHkd ?? 48000);
  const budgetRmb = convertHkdToRmb(budgetHkd);
  const utilizationPct = Math.round((bundleSim.effectiveAfterTaxAnnualHkd / budgetHkd) * 100);

  const kpis: ExecutiveSummaryKpiCard[] = [
    {
      label: pick('6-Axis Protection Fulfillment', '六大防護維度綜合達成率'),
      primaryValue: `${gapAudit.overallCompletionPct}%`,
      subValue: pick(
        `${gapAudit.rows.filter((r) => r.isFullyCovered).length}/6 dimensions at 100%`,
        `6 大維度中 ${gapAudit.rows.filter((r) => r.isFullyCovered).length} 項已足額達標`
      ),
      accentHex: '#0D9488',
    },
    {
      label: pick('Effective Net Post-Tax Outlay', '稅後實際每年淨保費支出'),
      primaryValue: `HK$ ${bundleSim.effectiveAfterTaxAnnualHkd.toLocaleString()}`,
      subValue: `≈ ¥ ${bundleSim.effectiveAfterTaxAnnualRmb.toLocaleString()} (${pick('Tax saved', '扣稅省')} HK$${bundleSim.estimatedTaxSavedHkd.toLocaleString()})`,
      accentHex: '#2563EB',
    },
    {
      label: pick('Annual Budget Utilization', '客戶年度保費預算佔比'),
      primaryValue: `${utilizationPct}%`,
      subValue: pick(
        `Cap HK$ ${budgetHkd.toLocaleString()} · ${bundleSim.withinClientBudget ? 'Within Budget' : 'Above Cap'}`,
        `預算 HK$ ${budgetHkd.toLocaleString()} · ${bundleSim.withinClientBudget ? '符合預算內' : '高於原預算'}`
      ),
      accentHex: bundleSim.withinClientBudget ? '#059669' : '#D97706',
    },
    {
      label: pick('Simulated Claim Out-of-Pocket', '私院理賠實測客戶自付額'),
      primaryValue: `HK$ ${bundleSim.scenarioOutcome.clientOutOfPocketHkd.toLocaleString()}`,
      subValue: pick(
        `Recovery Buffer +HK$ ${bundleSim.scenarioOutcome.surplusCashBufferHkd.toLocaleString()}`,
        `額外康復現金池 +HK$ ${bundleSim.scenarioOutcome.surplusCashBufferHkd.toLocaleString()}`
      ),
      accentHex: '#4F46E5',
    },
  ];

  const normalizedSlides: ExecutiveSummarySlideRenderItem[] = slides.map((s, idx) => {
    const rawBullets = isEn ? s.bulletsEn : s.bulletsZh;
    return {
      index: idx,
      slideNumberLabel: `0${idx + 1}`,
      badge: isEn ? s.badgeEn : conv(s.badgeZh),
      title: isEn ? s.titleEn : conv(s.titleZh),
      keyMetricLabel: isEn ? s.keyMetricLabelEn : conv(s.keyMetricLabelZh),
      keyMetricValue: s.keyMetricValue,
      bullets: rawBullets.map((b) => (isEn ? b : conv(b))),
      speakerNote: isEn ? s.speakerNoteEn : conv(s.speakerNoteZh),
      accentHex: SLIDE_ACCENT_HEX[idx % SLIDE_ACCENT_HEX.length],
    };
  });

  const dimensionItems: ExecutiveSummaryDimensionItem[] = gapAudit.rows.map((r) => ({
    dimensionId: r.dimensionId,
    shortLabel: isEn
      ? SHORT_AXIS_EN[r.dimensionId] || r.labelEn
      : conv(SHORT_AXIS_ZH[r.dimensionId] || r.labelZh),
    existingPct: r.existingPct,
    totalAchievementPct: r.totalAchievementPct,
    isFullyCovered: r.isFullyCovered,
  }));

  const grossDenom = Math.max(1, bundleSim.basePlanAnnualHkd + bundleSim.ridersAnnualHkd);
  const waterfallItems: ExecutiveSummaryWaterfallItem[] = [
    {
      label: pick('1. Base Plan Annual Premium', '1. 主約基準年繳保費'),
      formattedHkd: `HK$ ${bundleSim.basePlanAnnualHkd.toLocaleString()}`,
      barRatio: Math.max(0.06, Math.min(1, bundleSim.basePlanAnnualHkd / grossDenom)),
      accentHex: '#0284C7',
    },
    {
      label: pick('2. Modular Protection Riders', '2. 自選醫療／危疾／按揭附約'),
      formattedHkd: `+HK$ ${bundleSim.ridersAnnualHkd.toLocaleString()}`,
      barRatio: Math.max(0.06, Math.min(1, bundleSim.ridersAnnualHkd / grossDenom)),
      accentHex: '#6366F1',
    },
    {
      label: pick(
        `3. Multi-Rider Bundle Discount (${bundleSim.bundleDiscountPct}%)`,
        `3. 組合附約整併折扣 (${bundleSim.bundleDiscountPct}%)`
      ),
      formattedHkd: `-HK$ ${bundleSim.bundleDiscountHkd.toLocaleString()}`,
      barRatio: Math.max(0.05, Math.min(1, bundleSim.bundleDiscountHkd / grossDenom)),
      accentHex: '#10B981',
    },
    {
      label: pick('4. Est. VHIS / QDAP IRD Tax Relief', '4. 預估薪俸稅扣稅節省 (IRD)'),
      formattedHkd: `-HK$ ${bundleSim.estimatedTaxSavedHkd.toLocaleString()}`,
      barRatio: Math.max(0.05, Math.min(1, bundleSim.estimatedTaxSavedHkd / grossDenom)),
      accentHex: '#F59E0B',
    },
  ];

  const maxClaimCost = Math.max(
    bundleSim.scenarioOutcome.totalEventCostHkd,
    bundleSim.scenarioOutcome.totalCoveredHkd,
    1
  );

  const claimBars: ExecutiveSummaryClaimBarItem[] = [
    {
      label: pick('Total Private Hospital / Event Cost', '私院帳單／停工總財務衝擊'),
      formattedHkd: `HK$ ${bundleSim.scenarioOutcome.totalEventCostHkd.toLocaleString()}`,
      barRatio: Math.max(0.06, Math.min(1, bundleSim.scenarioOutcome.totalEventCostHkd / maxClaimCost)),
      accentHex: '#E11D48',
    },
    {
      label: pick('Existing Group / Old Policy Payout', '客戶既有團保／舊保單賠付'),
      formattedHkd: `HK$ ${bundleSim.scenarioOutcome.existingPolicyPayoutHkd.toLocaleString()}`,
      barRatio: Math.max(
        0.04,
        Math.min(1, bundleSim.scenarioOutcome.existingPolicyPayoutHkd / maxClaimCost)
      ),
      accentHex: '#64748B',
    },
    {
      label: pick('New Proposed Plan + Riders Payout', '本次新規劃主約＋附約賠付'),
      formattedHkd: `HK$ ${bundleSim.scenarioOutcome.newBundlePayoutHkd.toLocaleString()}`,
      barRatio: Math.max(
        0.06,
        Math.min(1, bundleSim.scenarioOutcome.newBundlePayoutHkd / maxClaimCost)
      ),
      accentHex: '#0D9488',
    },
  ];

  const fnaReady = Boolean(lead.fnaRecord);
  const kycReady =
    lead.residency === 'MCV'
      ? Boolean(lead.kycCheck.hkidVerified && lead.kycCheck.mcvEntrySlipVerified)
      : Boolean(lead.kycCheck.hkidVerified);
  const planLocked = Boolean(plan);
  const stpIssued =
    lead.stage === LeadStage.UNDERWRITING || lead.stage === LeadStage.IN_FORCE;

  const readinessItems: ExecutiveSummaryReadinessItem[] = [
    {
      step: '01',
      done: fnaReady,
      title: pick('HKIA GL30 Suitability FNA', '保監局 GL30 財務需要分析 (FNA)'),
      detail: fnaReady
        ? pick(
            `Signed · Risk profile: ${lead.fnaRecord?.riskTolerance || 'BALANCED'}`,
            `已完成簽署 · 風險取向 ${lead.fnaRecord?.riskTolerance || 'BALANCED'}`
          )
        : pick('Pending digital GL30 FNA signature', '待補簽數位 GL30 財務分析表'),
      statusTag: fnaReady ? pick('READY', '已完成') : pick('ACTION', '待辦'),
    },
    {
      step: '02',
      done: kycReady,
      title:
        lead.residency === 'MCV'
          ? pick('MCV Landing Slip & Travel Doc KYC', 'MCV 入境白紙仔及雙證件核實')
          : pick('HKID / iAM Smart e-KYC Check', '香港身份證／智方便 e-KYC 核實'),
      detail: kycReady
        ? pick('Identity & onshore status verified', '證件與在港合規狀態已核實')
        : pick('Complete Vision OCR / iAM Smart check', '需於簽單前完成 OCR 掃描或智方便認證'),
      statusTag: kycReady ? pick('READY', '已完成') : pick('ACTION', '待辦'),
    },
    {
      step: '03',
      done: planLocked || Boolean(lead.targetSchemeId),
      title: planLocked
        ? pick(
            `Locked Plan: [${plan!.insurerCode}] ${plan!.nameEn}`,
            `已鎖定主推計劃：[${plan!.insurerCode}] ${plan!.nameZh}`
          )
        : pick(
            `Target Scheme: ${gapAudit.schemeMeta.titleEn}`,
            `目標保障架構：${gapAudit.schemeMeta.titleZh}`
          ),
      detail: pick(
        `Net After-Tax HK$ ${bundleSim.effectiveAfterTaxAnnualHkd.toLocaleString()}/yr`,
        `稅後淨保費 HK$ ${bundleSim.effectiveAfterTaxAnnualHkd.toLocaleString()} (≈ ¥ ${bundleSim.effectiveAfterTaxAnnualRmb.toLocaleString()})`
      ),
      statusTag: pick('READY', '已鎖定'),
    },
    {
      step: '04',
      done: stpIssued,
      title: pick('Stage 05 Dual e-Signature STP Submission', '第 05 步雙重電子簽名 STP 直通遞交'),
      detail: stpIssued
        ? pick('Submitted to underwriting / In-Force', '已進入核保／保單生效階段')
        : pick('Ready to launch STP e-Application', '準備就緒：一鍵帶入客戶與計劃發起電子投保'),
      statusTag: stpIssued ? pick('ISSUED', '已遞交') : pick('READY TO SIGN', '可簽署'),
    },
  ];

  const activeTargetId = lead.targetSchemeId || 'FAMILY_COMPREHENSIVE';
  const schemes = TARGET_PROTECTION_SCHEMES.map((sch) => ({
    id: sch.id,
    title: isEn ? sch.titleEn : conv(sch.titleZh),
    premiumHkd: sch.baseAnnualPremiumHkd,
    isLocked: sch.id === activeTargetId,
    barRatio: Math.min(1, sch.baseAnnualPremiumHkd / 68000),
  }));

  return {
    fileName,
    documentTitle: `Executive Summary & 5-Slide Case Deck - ${lead.fullNameEn}`,
    headerKicker,
    headerTitle,
    clientMetaLine,
    advisorMetaLine,
    anchorPlanLine,
    issuedDateIso,
    bannerHex,
    goldAccentHex,
    kpis,
    slides: normalizedSlides,
    budgetVisual: {
      budgetHkd,
      budgetRmb,
      netAfterTaxHkd: bundleSim.effectiveAfterTaxAnnualHkd,
      utilizationPct,
      withinBudget: bundleSim.withinClientBudget,
      schemes,
    },
    dimensionItems,
    overallCompletionPct: gapAudit.overallCompletionPct,
    waterfallItems,
    effectiveNetAnnualHkd: bundleSim.effectiveAfterTaxAnnualHkd,
    effectiveNetAnnualRmb: bundleSim.effectiveAfterTaxAnnualRmb,
    monthlyEquivalentHkd: bundleSim.monthlyEquivalentHkd,
    monthlyEquivalentRmb: bundleSim.monthlyEquivalentRmb,
    claimVisual: {
      scenarioTitle: isEn
        ? bundleSim.scenarioOutcome.scenario.titleEn
        : conv(bundleSim.scenarioOutcome.scenario.titleZh),
      outOfPocketHkd: bundleSim.scenarioOutcome.clientOutOfPocketHkd,
      surplusBufferHkd: bundleSim.scenarioOutcome.surplusCashBufferHkd,
      bars: claimBars,
    },
    readinessItems,
    complianceFooter: pick(
      'HKIA GL28 / GL30 Compliance Note: Executive case briefing prepared for advisory review. Non-guaranteed dividends are subject to insurer fulfillment ratios (Cap: 6.0% HKD / 6.5% Non-HKD).',
      '香港保監局 GL28／GL30 合規聲明：本執行摘要及五頁簡報僅供內部早會研討及財務需要分析參考，非保證紅利受保司分紅實現率影響（演示上限：港元 6.0%／非港元 6.5%）。'
    ),
  };
}
