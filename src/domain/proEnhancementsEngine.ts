import {
  calculateCompliantQuote,
  FX_RATES_FROM_USD,
  HKIA_IRR_CAP_HKD,
  HKIA_IRR_CAP_NON_HKD,
} from './actuarialEngine';
import { derivePlanSyncProfile } from './crmAndCatalogTaxonomy';
import { toSimplifiedChinese } from './i18n';
import { getSpecialOfferForPlan } from './planLinksAndOffersEngine';
import { TWENTY_LIVE_UPGRADES_META, TwentyUpgradeCode } from './twentyUpgradesEngine';
import {
  ClientLead,
  CurrencyCode,
  ExistingPolicyAuditItem,
  FxRateFeedState,
  HealthImpairmentCode,
  HouseholdMember,
  InsurancePlan,
  McvCrossBorderChecklist,
  MedicalInflationRatePct,
  PlanCategory,
  PlanSpecialOffer,
  PromoAdminOverride,
  ProtectionDimensionId,
  TeamLibraryItem,
} from './types';

// ============================================================================
// #3. GLOBAL COMMAND PALETTE (Cmd/Ctrl + K) SEARCH ENGINE
// ============================================================================

export interface CommandPaletteItem {
  id: string;
  kind: 'STAGE' | 'CLIENT' | 'PLAN' | 'TOOL';
  titleZh: string;
  titleEn: string;
  subtitleZh: string;
  subtitleEn: string;
  badge: string;
  targetSection?: 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5' | 'stage6';
  targetSubTab?: string;
  leadId?: string;
  planId?: string;
  toolCode?: TwentyUpgradeCode;
}

const STAGE_NAV_COMMANDS: CommandPaletteItem[] = [
  {
    id: 'nav-01a',
    kind: 'STAGE',
    titleZh: '01A · 客戶基本資料、家庭視圖與六軸缺口雷達',
    titleEn: '01A · Client Profile, Household View & 6-Axis Gap Radar',
    subtitleZh: '管理客戶年齡、預算、家庭成員及舊保單智能掃描',
    subtitleEn: 'Configure client profile, household tax caps & existing policy OCR audit',
    badge: 'Stage 01A',
    targetSection: 'stage1',
    targetSubTab: 'PROFILE_GAP',
  },
  {
    id: 'nav-01b',
    kind: 'STAGE',
    titleZh: '01B · 建檔客戶銷售管線 CRM 與已閱追蹤',
    titleEn: '01B · Saved Client Pipeline CRM & Read Receipts',
    subtitleZh: '檢視客戶進度、GL30 財務分析及微網頁開啟紀錄',
    subtitleEn: 'Pipeline funnel, GL30 FNA status & live microsite read receipts',
    badge: 'Stage 01B',
    targetSection: 'stage1',
    targetSubTab: 'CRM_PIPELINE',
  },
  {
    id: 'nav-02a',
    kind: 'STAGE',
    titleZh: '02A · 全市場 237 款保險產品比較與紅藍黃三方案',
    titleEn: '02A · 237 HK Market Plans & 3-Plan Comparison',
    subtitleZh: '多保單組合打包、百歲現金流曲線及三方案比較 PDF',
    subtitleEn: 'Multi-plan combo builder, Age-100 IRR curve & 3-plan PDF export',
    badge: 'Stage 02A',
    targetSection: 'stage2',
    targetSubTab: 'CATALOG',
  },
  {
    id: 'nav-02b',
    kind: 'STAGE',
    titleZh: '02B · 保單條款智能審核與五維雷達',
    titleEn: '02B · Policy Clause AI Auditor & 5-Axis Radar',
    subtitleZh: '逐條比對原位癌、等候期與精神健康條款細節',
    subtitleEn: 'Compare waiting periods, carcinoma-in-situ & policy definitions',
    badge: 'Stage 02B',
    targetSection: 'stage2',
    targetSubTab: 'CLAUSES',
  },
  {
    id: 'nav-02c',
    kind: 'STAGE',
    titleZh: '02C · 567 提領退休現金流、保費融資 HIBOR 矩陣與三代傳承樹',
    titleEn: '02C · Partial Withdrawal ("567"), HIBOR Matrix & 3-Gen Legacy Tree',
    subtitleZh: '模擬百歲提領餘額、雙維度息差壓測及三代保單分拆受益人比例',
    subtitleEn: 'Interactive withdrawal curve, 2D HIBOR ROE sensitivity & 3-gen split tree',
    badge: 'Stage 02C',
    targetSection: 'stage2',
    targetSubTab: 'ACTUARIAL_LAB',
  },
  {
    id: 'nav-03a',
    kind: 'STAGE',
    titleZh: '03A · 雙幣提案購物車、附約整併與醫療通脹壓測',
    titleEn: '03A · Dual-FX Rider Cart & Medical Inflation Stress Test',
    subtitleZh: '模擬 0% / 5% / 7% 私院醫療通脹及理賠自付缺口',
    subtitleEn: 'Simulate 0%/5%/7% HK medical inflation & modular riders',
    badge: 'Stage 03A',
    targetSection: 'stage3',
    targetSubTab: 'DUAL_CART',
  },
  {
    id: 'nav-03b',
    kind: 'STAGE',
    titleZh: '03B · 全港 13 間私家醫院免找數預批網絡',
    titleEn: '03B · 13 HK Private Hospitals Cashless LOG Registry',
    subtitleZh: '查詢養和、港怡、仁安免按金入院資格與主診醫生基準費',
    subtitleEn: 'Matilda, Gleneagles, HKSH cashless LOG & surgeon fee benchmarks',
    badge: 'Stage 03B',
    targetSection: 'stage3',
    targetSubTab: 'HOSPITAL_LOG',
  },
  {
    id: 'nav-04a',
    kind: 'STAGE',
    titleZh: '04A · 早會 5 頁視覺化個案簡報與團隊共享庫',
    titleEn: '04A · 5-Slide Pitch Deck & Agency Team Library',
    subtitleZh: '一鍵匯出高管摘要 PDF 及複製團隊王牌案例',
    subtitleEn: 'Export 5-slide Executive Summary PDF & clone MDRT team cases',
    badge: 'Stage 04A',
    targetSection: 'stage4',
    targetSubTab: 'DECK',
  },
  {
    id: 'nav-04b',
    kind: 'STAGE',
    titleZh: '04B · 客戶常見問題與應對話術庫',
    titleEn: '04B · Client Q&A & Objection Script Library',
    subtitleZh: '常見問題解答、團隊常用話術庫及跟進重點',
    subtitleEn: 'Client Q&A scripts, team talking points & follow-up checklist',
    badge: 'Stage 04B',
    targetSection: 'stage4',
    targetSubTab: 'OBJECTIONS',
  },
  {
    id: 'nav-04c',
    kind: 'STAGE',
    titleZh: '04C · 手機版建議書連結、QR Code 與 WhatsApp 摘要',
    titleEn: '04C · Mobile Proposal Link, QR Code & WhatsApp Summary',
    subtitleZh: '設定 7/14/30 日有效期限並一鍵複製發送訊息',
    subtitleEn: 'Publish expiring proposal link, scan QR & copy WhatsApp/WeChat text',
    badge: 'Stage 04C',
    targetSection: 'stage4',
    targetSubTab: 'MICROSITE',
  },
  {
    id: 'nav-05a',
    kind: 'STAGE',
    titleZh: '05A · 投保確認與電子簽署遞交',
    titleEn: '05A · Proposal Confirmation & E-Signature',
    subtitleZh: '核對負擔能力、健康申報、勾選 3 份聲明並簽名遞交',
    subtitleEn: 'Verify GL30 suitability, health triage, 3 declarations & dual e-sign',
    badge: 'Stage 05A',
    targetSection: 'stage5',
    targetSubTab: 'STP_SIGN',
  },
  {
    id: 'nav-05b',
    kind: 'STAGE',
    titleZh: '05B · Google Drive 雲端備份',
    titleEn: '05B · Google Drive Cloud Backup',
    subtitleZh: '同步已簽署建議書 PDF 與客戶紀錄至個人 Google Drive',
    subtitleEn: 'Backup signed proposal PDFs and workspace records to Google Drive',
    badge: 'Stage 05B',
    targetSection: 'stage5',
    targetSubTab: 'DRIVE_VAULT',
  },
  {
    id: 'nav-05c',
    kind: 'STAGE',
    titleZh: '05C · 保單續保寬限期日曆、私院免找數理賠看板與保單批註',
    titleEn: '05C · Policy Renewal Calendar, Cashless Claims Kanban & Endorsements',
    subtitleZh: '追蹤 30 日寬限期、入院前預批 LOG 進度與轉貨幣／保單分拆批註',
    subtitleEn: 'Track 30-day grace renewals, hospital LOG claims & currency/split servicing',
    badge: 'Stage 05C',
    targetSection: 'stage5',
    targetSubTab: 'SERVICING',
  },
  {
    id: 'nav-05d',
    kind: 'STAGE',
    titleZh: '05D · 保監局 15 小時 CPD 學分、一鍵合規審計卷宗與團隊交接',
    titleEn: '05D · HKIA 15h CPD Tracker, Audit Dossier PDF & Team Handover',
    subtitleZh: '追蹤 3 小時道德必修學分、匯出查冊合規卷宗 PDF 及跨職能核保交接',
    subtitleEn: 'Track statutory CPD hours, export HKIA audit PDF & multi-role case handover',
    badge: 'Stage 05D',
    targetSection: 'stage5',
    targetSubTab: 'COMPLIANCE',
  },
  {
    id: 'nav-06',
    kind: 'STAGE',
    titleZh: '06 · 32 項香港保險專項精算與稅務工具庫',
    titleEn: '06 · 32 Specialized HK Actuarial & Tax Calculators',
    subtitleZh: '扣稅三寶、要員保險、保險金信託、海外升學及大灣區養老',
    subtitleEn: 'IRD tax trio, SME keyman, trust vs split, tuition & GBA retirement',
    badge: 'Stage 06',
    targetSection: 'stage6',
  },
];

export function searchGlobalCommandPalette(params: {
  query: string;
  leads: ClientLead[];
  plans: InsurancePlan[];
  limitPerGroup?: number;
}): CommandPaletteItem[] {
  const { query, leads, plans, limitPerGroup = 6 } = params;
  const qRaw = query.trim().toLowerCase();
  const qSimp = toSimplifiedChinese(query.trim()).toLowerCase();

  const matchesText = (haystack: string): boolean => {
    if (!qRaw) return true;
    const lower = haystack.toLowerCase();
    const simp = toSimplifiedChinese(haystack).toLowerCase();
    return lower.includes(qRaw) || simp.includes(qSimp);
  };

  const matchedStages = STAGE_NAV_COMMANDS.filter((c) =>
    matchesText(`${c.badge} ${c.titleZh} ${c.titleEn} ${c.subtitleZh} ${c.subtitleEn}`)
  ).slice(0, qRaw ? limitPerGroup : 5);

  const matchedClients: CommandPaletteItem[] = leads
    .filter((l) => {
      const policyRefs = (l.existingPolicies || [])
        .map((ep) => `${ep.policyNumber || ''} ${ep.id}`)
        .join(' ');
      return matchesText(
        `${l.fullNameZh} ${l.fullNameEn} ${l.roleTagZh || ''} ${l.whatsappPhone} ${l.residency} ${l.hkidNumber || ''} ${policyRefs} ${l.clientNotes || ''}`
      );
    })
    .slice(0, limitPerGroup)
    .map((l) => ({
      id: `lead-${l.id}`,
      kind: 'CLIENT',
      titleZh: `${l.fullNameZh} (${l.fullNameEn})`,
      titleEn: `${l.fullNameEn} (${l.fullNameZh})`,
      subtitleZh: `${l.age} 歲 · 年度預算 HK$${(l.annualBudgetHkd ?? 48000).toLocaleString()} · ${
        l.residency === 'MCV' ? 'MCV 訪港客戶' : '香港居民'
      }`,
      subtitleEn: `Age ${l.age} · Budget HK$${(l.annualBudgetHkd ?? 48000).toLocaleString()} · ${l.residency}`,
      badge: l.stage,
      leadId: l.id,
      targetSection: 'stage1',
      targetSubTab: 'PROFILE_GAP',
    }));

  const matchedTools: CommandPaletteItem[] = TWENTY_LIVE_UPGRADES_META.filter((m) =>
    matchesText(`${m.code} ${m.shortZh} ${m.shortEn} ${m.titleZh} ${m.titleEn}`)
  )
    .slice(0, qRaw ? limitPerGroup : 4)
    .map((m) => ({
      id: `tool-${m.code}`,
      kind: 'TOOL',
      titleZh: `${m.shortZh} — ${m.titleZh}`,
      titleEn: `${m.shortEn} — ${m.titleEn}`,
      subtitleZh: m.mergedTargetZh,
      subtitleEn: m.mergedTargetEn,
      badge: m.code,
      toolCode: m.code,
      targetSection: 'stage6',
    }));

  const matchedPlans: CommandPaletteItem[] = plans
    .filter((p) =>
      matchesText(
        `${p.insurerCode} ${p.insurerNameZh} ${p.insurerNameEn} ${p.nameZh} ${p.nameEn} ${p.categoryLabelZh} ${p.categoryLabelEn}`
      )
    )
    .slice(0, qRaw ? limitPerGroup + 2 : 5)
    .map((p) => ({
      id: `plan-${p.id}`,
      kind: 'PLAN',
      titleZh: `[${p.insurerCode}] ${p.nameZh}`,
      titleEn: `[${p.insurerCode}] ${p.nameEn}`,
      subtitleZh: `${p.insurerNameZh} · ${p.categoryLabelZh}${
        p.fulfillmentRatio !== null ? ` · 實現率 ${p.fulfillmentRatio}%` : ''
      }`,
      subtitleEn: `${p.insurerNameEn} · ${p.categoryLabelEn}${
        p.fulfillmentRatio !== null ? ` · GN16 ${p.fulfillmentRatio}%` : ''
      }`,
      badge: p.insurerCode,
      planId: p.id,
      targetSection: 'stage2',
      targetSubTab: 'CATALOG',
    }));

  return [...matchedStages, ...matchedClients, ...matchedPlans, ...matchedTools];
}

// ============================================================================
// #5. MULTI-PLAN PORTFOLIO BUNDLING ("COMBO BUILDER")
// ============================================================================

export interface PortfolioComboPlanQuote {
  plan: InsurancePlan;
  annualPremiumHkd: number;
  annualPremiumRmb: number;
  annualPremiumUsd: number;
  dimensionBoostsHkd: Record<ProtectionDimensionId, number>;
}

export interface PortfolioComboValuation {
  secondaryItems: PortfolioComboPlanQuote[];
  comboGrossSecondaryHkd: number;
  multiPolicyDiscountPct: number;
  comboNetSecondaryHkd: number;
  comboNetSecondaryRmb: number;
  comboNetSecondaryUsd: number;
  additiveDimensionBoostsHkd: Record<ProtectionDimensionId, number>;
}

export function toggleComboSecondaryPlan(
  currentComboIds: string[],
  anchorPlanId: string,
  targetPlanId: string
): string[] {
  const clean = currentComboIds.filter((id) => Boolean(id) && id !== anchorPlanId);
  if (clean.includes(targetPlanId)) {
    return clean.filter((id) => id !== targetPlanId);
  }
  if (targetPlanId === anchorPlanId) {
    return clean;
  }
  // Allow up to 2 secondary complementary base plans (total 3 base plans with anchor)
  if (clean.length >= 2) {
    return [clean[1], targetPlanId];
  }
  return [...clean, targetPlanId];
}

export function evaluatePortfolioCombo(params: {
  lead: ClientLead;
  anchorPlan: InsurancePlan | null;
  comboPlanIds: string[];
  allPlans: InsurancePlan[];
  paymentTermYears: number;
  fxRateHkdToRmb: number;
}): PortfolioComboValuation {
  const { lead, anchorPlan, comboPlanIds, allPlans, paymentTermYears, fxRateHkdToRmb } = params;
  const emptyBoosts: Record<ProtectionDimensionId, number> = {
    LIFE_MORTGAGE: 0,
    PRIVATE_HOSPITAL: 0,
    CRITICAL_ILLNESS: 0,
    CANCER_TARGETED: 0,
    ACCIDENT_INCOME: 0,
    RETIREMENT_DEMENTIA: 0,
  };

  const uniqueIds = Array.from(new Set(comboPlanIds)).filter(
    (id) => Boolean(id) && id !== anchorPlan?.id
  ).slice(0, 2);

  if (uniqueIds.length === 0) {
    return {
      secondaryItems: [],
      comboGrossSecondaryHkd: 0,
      multiPolicyDiscountPct: 0,
      comboNetSecondaryHkd: 0,
      comboNetSecondaryRmb: 0,
      comboNetSecondaryUsd: 0,
      additiveDimensionBoostsHkd: emptyBoosts,
    };
  }

  const secondaryItems: PortfolioComboPlanQuote[] = [];
  const additiveDimensionBoostsHkd = { ...emptyBoosts };

  for (const pid of uniqueIds) {
    const plan = allPlans.find((p) => p.id === pid);
    if (!plan) continue;
    const sync = derivePlanSyncProfile(plan, lead);
    // Size secondary plan thoughtfully by category (Medical uses standard tariff, CI uses HK$600k, Savings uses HK$350k, Term uses HK$2M)
    const targetSaHkd =
      plan.category === PlanCategory.VHIS || plan.category === PlanCategory.HIGH_END_MEDICAL
        ? 500_000
        : plan.category === PlanCategory.CRITICAL_ILLNESS
        ? 600_000
        : plan.category === PlanCategory.TERM_LIFE
        ? 2_000_000
        : 390_000;
    const term = plan.supportedPaymentTerms.includes(paymentTermYears)
      ? paymentTermYears
      : plan.supportedPaymentTerms[0] || 10;
    const quoteHkd = calculateCompliantQuote({
      plan,
      age: lead.age,
      isSmoker: lead.isSmoker,
      currency: 'HKD',
      sumAssuredInSelectedCurrency: targetSaHkd,
      paymentTermYears: term,
    });
    const annualHkd = quoteHkd.annualPremium;
    const boosts: Record<ProtectionDimensionId, number> = sync
      ? {
          LIFE_MORTGAGE: Math.round(sync.dimensionCoverageBoostsHkd.LIFE_MORTGAGE * 0.65),
          PRIVATE_HOSPITAL: Math.round(sync.dimensionCoverageBoostsHkd.PRIVATE_HOSPITAL * 0.8),
          CRITICAL_ILLNESS: Math.round(sync.dimensionCoverageBoostsHkd.CRITICAL_ILLNESS * 0.7),
          CANCER_TARGETED: Math.round(sync.dimensionCoverageBoostsHkd.CANCER_TARGETED * 0.75),
          ACCIDENT_INCOME: Math.round(sync.dimensionCoverageBoostsHkd.ACCIDENT_INCOME * 0.65),
          RETIREMENT_DEMENTIA: Math.round(sync.dimensionCoverageBoostsHkd.RETIREMENT_DEMENTIA * 0.7),
        }
      : { ...emptyBoosts };

    for (const k of Object.keys(emptyBoosts) as ProtectionDimensionId[]) {
      additiveDimensionBoostsHkd[k] += boosts[k];
    }

    secondaryItems.push({
      plan,
      annualPremiumHkd: annualHkd,
      annualPremiumRmb: Math.round(annualHkd * fxRateHkdToRmb),
      annualPremiumUsd: Math.round(annualHkd / FX_RATES_FROM_USD.HKD),
      dimensionBoostsHkd: boosts,
    });
  }

  const comboGrossSecondaryHkd = secondaryItems.reduce((acc, item) => acc + item.annualPremiumHkd, 0);
  const totalPlansCount = (anchorPlan ? 1 : 0) + secondaryItems.length;
  const multiPolicyDiscountPct = totalPlansCount >= 3 ? 5 : totalPlansCount === 2 ? 3 : 0;
  const comboNetSecondaryHkd = Math.round(
    comboGrossSecondaryHkd * (1 - multiPolicyDiscountPct / 100)
  );

  return {
    secondaryItems,
    comboGrossSecondaryHkd,
    multiPolicyDiscountPct,
    comboNetSecondaryHkd,
    comboNetSecondaryRmb: Math.round(comboNetSecondaryHkd * fxRateHkdToRmb),
    comboNetSecondaryUsd: Math.round(comboNetSecondaryHkd / FX_RATES_FROM_USD.HKD),
    additiveDimensionBoostsHkd,
  };
}

// ============================================================================
// #6. WHOLE-FAMILY HOUSEHOLD VIEW & SHARED TAX CAP CALCULATOR
// ============================================================================

export interface HouseholdSummaryResult {
  totalInsuredLives: number;
  vhisEligibleCount: number;
  combinedVhisDeductionCapHkd: number;
  hasMarriedSpouseQdap: boolean;
  combinedQdapDeductionCapHkd: number;
  maxAnnualIrdTaxSavedAt17PctHkd: number;
  estimatedFamilyMedicalPoolMultiplier: number;
  members: HouseholdMember[];
}

export function evaluateHouseholdSummary(lead: ClientLead): HouseholdSummaryResult {
  const members = Array.isArray(lead.householdMembers) ? lead.householdMembers : [];
  const vhisRelatives = members.filter((m) => m.vhisEligible).length;
  const vhisEligibleCount = 1 + vhisRelatives; // Primary insured + eligible relatives
  const combinedVhisDeductionCapHkd = vhisEligibleCount * 8_000;

  const hasMarriedSpouseQdap = members.some((m) => m.relation === 'SPOUSE' && m.qdapEligible);
  const combinedQdapDeductionCapHkd = hasMarriedSpouseQdap ? 120_000 : 60_000;

  const totalDeductionBase = combinedVhisDeductionCapHkd + combinedQdapDeductionCapHkd;
  const maxAnnualIrdTaxSavedAt17PctHkd = Math.round(totalDeductionBase * 0.17);

  return {
    totalInsuredLives: 1 + members.length,
    vhisEligibleCount,
    combinedVhisDeductionCapHkd,
    hasMarriedSpouseQdap,
    combinedQdapDeductionCapHkd,
    maxAnnualIrdTaxSavedAt17PctHkd,
    estimatedFamilyMedicalPoolMultiplier: Number((1 + members.length * 0.65).toFixed(2)),
    members,
  };
}

// ============================================================================
// #7. LIFELONG AGE-TO-100 CASH-VALUE & IRR PROJECTION CURVE
// ============================================================================

export interface LifelongProjectionPoint {
  policyYear: number;
  clientAge: number;
  cumulativePaid: number;
  guaranteedCashValue: number;
  nonGuaranteedDividend: number;
  totalSurrenderValue: number;
  impliedAnnualizedIrrPct: number;
}

export interface LifelongProjectionCurveResult {
  hasCashValue: boolean;
  issueAge: number;
  maxPolicyYear: number;
  dividendRealizationPct: number;
  guaranteedBreakevenYear: number | null;
  guaranteedBreakevenAge: number | null;
  totalBreakevenYear: number | null;
  totalBreakevenAge: number | null;
  age65Value: number;
  age85Value: number;
  age100Value: number;
  irrAtAge85Pct: number;
  irrAtAge100Pct: number;
  points: LifelongProjectionPoint[];
}

export function buildLifelongProjectionCurve(params: {
  plan: InsurancePlan;
  age: number;
  isSmoker: boolean;
  currency: CurrencyCode;
  sumAssuredInSelectedCurrency: number;
  paymentTermYears: number;
  dividendRealizationPct?: number;
}): LifelongProjectionCurveResult {
  const {
    plan,
    age,
    isSmoker,
    currency,
    sumAssuredInSelectedCurrency,
    paymentTermYears,
    dividendRealizationPct = 100,
  } = params;

  const safeAge = Math.min(80, Math.max(1, Math.round(age)));
  const maxPolicyYear = Math.max(30, 100 - safeAge);
  const baseQuote = calculateCompliantQuote({
    plan,
    age: safeAge,
    isSmoker,
    currency,
    sumAssuredInSelectedCurrency,
    paymentTermYears,
  });

  const isPureProtection =
    plan.category === PlanCategory.VHIS ||
    plan.category === PlanCategory.HIGH_END_MEDICAL ||
    plan.category === PlanCategory.TERM_LIFE ||
    plan.category === PlanCategory.GENERAL_GI;

  if (isPureProtection) {
    return {
      hasCashValue: false,
      issueAge: safeAge,
      maxPolicyYear,
      dividendRealizationPct,
      guaranteedBreakevenYear: null,
      guaranteedBreakevenAge: null,
      totalBreakevenYear: null,
      totalBreakevenAge: null,
      age65Value: 0,
      age85Value: 0,
      age100Value: 0,
      irrAtAge85Pct: 0,
      irrAtAge100Pct: 0,
      points: [],
    };
  }

  const annualPremium = baseQuote.annualPremium;
  const term = baseQuote.paymentTermYears;
  const totalPremiumsPaid = baseQuote.totalPremiumsPaid;

  const capDecimal =
    plan.category === PlanCategory.PARTICIPATING_SAVINGS || plan.category === PlanCategory.QDAP
      ? currency === 'HKD'
        ? HKIA_IRR_CAP_HKD
        : HKIA_IRR_CAP_NON_HKD
      : plan.rawProjectedIrr;
  const effectiveIrr = Math.min(plan.rawProjectedIrr, capDecimal);
  const guarIrr = plan.guaranteedIrr;
  const stressRatio = Math.max(0.5, Math.min(1.2, dividendRealizationPct / 100));

  const points: LifelongProjectionPoint[] = [];
  let guaranteedBreakevenYear: number | null = null;
  let totalBreakevenYear: number | null = null;

  for (let yr = 1; yr <= maxPolicyYear; yr++) {
    const paidYears = Math.min(yr, term);
    const cumulativePaid = annualPremium * paidYears;
    const midDuration = Math.max(0.5, yr - (paidYears - 1) / 2);

    const earlyPenalty =
      yr <= 2 ? 0.14 : yr <= 4 ? 0.42 : yr < term ? 0.68 : yr < 8 ? 0.86 : 1.0;
    const guarPenalty =
      yr <= 2 ? 0.08 : yr <= 5 ? 0.46 : yr <= 10 ? 0.72 : yr <= 15 ? 0.89 : 0.98;

    const rawTotal = cumulativePaid * Math.pow(1 + effectiveIrr, midDuration) * earlyPenalty;
    const guarCv = Math.round(cumulativePaid * Math.pow(1 + guarIrr, midDuration) * guarPenalty);
    const baseNonGuar = Math.max(0, Math.round(rawTotal) - guarCv);
    const stressedDiv = Math.round(baseNonGuar * stressRatio);
    const totalVal = guarCv + stressedDiv;

    if (guaranteedBreakevenYear === null && yr >= term && guarCv >= totalPremiumsPaid) {
      guaranteedBreakevenYear = yr;
    }
    if (totalBreakevenYear === null && yr >= Math.min(5, term) && totalVal >= cumulativePaid && yr >= term) {
      totalBreakevenYear = yr;
    }

    const impliedIrr =
      cumulativePaid > 0 && totalVal > cumulativePaid && midDuration >= 1
        ? Number(((Math.pow(totalVal / cumulativePaid, 1 / midDuration) - 1) * 100).toFixed(2))
        : 0;

    points.push({
      policyYear: yr,
      clientAge: safeAge + yr,
      cumulativePaid,
      guaranteedCashValue: guarCv,
      nonGuaranteedDividend: stressedDiv,
      totalSurrenderValue: totalVal,
      impliedAnnualizedIrrPct: impliedIrr,
    });
  }

  const findByAge = (targetAge: number) =>
    points.find((p) => p.clientAge === targetAge) || points[points.length - 1];

  const row65 = findByAge(Math.max(safeAge + 10, 65));
  const row85 = findByAge(Math.max(safeAge + 15, 85));
  const row100 = points[points.length - 1];

  return {
    hasCashValue: true,
    issueAge: safeAge,
    maxPolicyYear,
    dividendRealizationPct,
    guaranteedBreakevenYear,
    guaranteedBreakevenAge: guaranteedBreakevenYear !== null ? safeAge + guaranteedBreakevenYear : null,
    totalBreakevenYear,
    totalBreakevenAge: totalBreakevenYear !== null ? safeAge + totalBreakevenYear : null,
    age65Value: row65?.totalSurrenderValue ?? 0,
    age85Value: row85?.totalSurrenderValue ?? 0,
    age100Value: row100?.totalSurrenderValue ?? 0,
    irrAtAge85Pct: row85?.impliedAnnualizedIrrPct ?? 0,
    irrAtAge100Pct: row100?.impliedAnnualizedIrrPct ?? 0,
    points,
  };
}

// ============================================================================
// #8. DYNAMIC HEALTHCARE INFLATION & MEDICAL COST ESCALATION
// ============================================================================

export interface InflatedMedicalProjection {
  baseCostTodayHkd: number;
  inflationRatePct: MedicalInflationRatePct;
  horizonYears: number;
  projectedFutureBillHkd: number;
  inflationErosionHkd: number;
  totalCoveragePoolHkd: number;
  projectedOutOfPocketHkd: number;
  projectedFundedPct: number;
}

export function projectInflatedMedicalCost(params: {
  baseCostTodayHkd: number;
  existingPayoutHkd: number;
  newBundlePayoutHkd: number;
  inflationRatePct: MedicalInflationRatePct;
  horizonYears: number;
}): InflatedMedicalProjection {
  const {
    baseCostTodayHkd,
    existingPayoutHkd,
    newBundlePayoutHkd,
    inflationRatePct,
    horizonYears,
  } = params;
  const safeYears = inflationRatePct === 0 ? 0 : Math.max(0, horizonYears);
  const multiplier = Math.pow(1 + inflationRatePct / 100, safeYears);
  const projectedFutureBillHkd = Math.round(baseCostTodayHkd * multiplier);
  const inflationErosionHkd = Math.max(0, projectedFutureBillHkd - baseCostTodayHkd);
  const totalCoveragePoolHkd = existingPayoutHkd + newBundlePayoutHkd;
  const projectedOutOfPocketHkd = Math.max(0, projectedFutureBillHkd - totalCoveragePoolHkd);
  const projectedFundedPct = Math.min(
    100,
    Math.round((Math.min(projectedFutureBillHkd, totalCoveragePoolHkd) / Math.max(1, projectedFutureBillHkd)) * 100)
  );

  return {
    baseCostTodayHkd,
    inflationRatePct,
    horizonYears: safeYears,
    projectedFutureBillHkd,
    inflationErosionHkd,
    totalCoveragePoolHkd,
    projectedOutOfPocketHkd,
    projectedFundedPct,
  };
}

// ============================================================================
// #14. FORMAL HKIA GL30 FNA AFFORDABILITY & SUITABILITY GAUGE
// ============================================================================

export interface Gl30AffordabilityGaugeResult {
  status: 'GREEN_COMFORTABLE' | 'AMBER_STRETCH' | 'RED_UNAFFORDABLE';
  hasSignedFna: boolean;
  monthlyDisposableSurplusHkd: number;
  annualDisposableSurplusHkd: number;
  liquidAssetsHkd: number;
  proposedAnnualPremiumHkd: number;
  disposableRatioPct: number;
  liquidBufferYears: number;
  statusLabelZh: string;
  statusLabelEn: string;
  advisoryNoteZh: string;
  advisoryNoteEn: string;
}

export function evaluateGl30AffordabilityGauge(
  lead: ClientLead,
  proposedAnnualPremiumHkd: number
): Gl30AffordabilityGaugeResult {
  const fna = lead.fnaRecord;
  const monthlySurplus = fna
    ? Math.max(0, fna.monthlyIncomeHkd - fna.monthlyExpensesHkd)
    : Math.round(((lead.annualBudgetHkd ?? 48_000) * 2.8) / 12);
  const annualSurplus = monthlySurplus * 12;
  const liquidAssets = fna ? fna.liquidAssetsHkd : Math.max(300_000, (lead.annualBudgetHkd ?? 48_000) * 8);

  const safePrem = Math.max(1, proposedAnnualPremiumHkd);
  const disposableRatioPct =
    annualSurplus > 0 ? Math.round((safePrem / annualSurplus) * 100) : 100;
  const liquidBufferYears = Number((liquidAssets / safePrem).toFixed(1));

  if (disposableRatioPct <= 35 && liquidBufferYears >= 3) {
    return {
      status: 'GREEN_COMFORTABLE',
      hasSignedFna: Boolean(fna),
      monthlyDisposableSurplusHkd: monthlySurplus,
      annualDisposableSurplusHkd: annualSurplus,
      liquidAssetsHkd: liquidAssets,
      proposedAnnualPremiumHkd,
      disposableRatioPct,
      liquidBufferYears,
      statusLabelZh: 'GL30 負擔能力優良（綠燈通過）',
      statusLabelEn: 'GL30 Affordability Healthy (Green)',
      advisoryNoteZh: `年繳保費佔可支配盈餘 ${disposableRatioPct}%（低於保監局 35% 警戒線），流動資產足以覆蓋 ${liquidBufferYears} 年保費。`,
      advisoryNoteEn: `Annual premium uses ${disposableRatioPct}% of disposable surplus (<=35% threshold) with ${liquidBufferYears}x liquid asset buffer.`,
    };
  }

  if (disposableRatioPct <= 50 && liquidBufferYears >= 1.5) {
    return {
      status: 'AMBER_STRETCH',
      hasSignedFna: Boolean(fna),
      monthlyDisposableSurplusHkd: monthlySurplus,
      annualDisposableSurplusHkd: annualSurplus,
      liquidAssetsHkd: liquidAssets,
      proposedAnnualPremiumHkd,
      disposableRatioPct,
      liquidBufferYears,
      statusLabelZh: 'GL30 保費佔比偏高（黃燈提醒）',
      statusLabelEn: 'GL30 Elevated Surplus Ratio (Amber)',
      advisoryNoteZh: `年繳保費佔可支配盈餘 ${disposableRatioPct}%（介乎 36%–50%），建議拉長供款期至 15/20 年或記錄流動資金儲備來源。`,
      advisoryNoteEn: `Annual premium represents ${disposableRatioPct}% of surplus (36%–50%). Consider extending pay term or documenting liquid reserve funding.`,
    };
  }

  return {
    status: 'RED_UNAFFORDABLE',
    hasSignedFna: Boolean(fna),
    monthlyDisposableSurplusHkd: monthlySurplus,
    annualDisposableSurplusHkd: annualSurplus,
    liquidAssetsHkd: liquidAssets,
    proposedAnnualPremiumHkd,
    disposableRatioPct,
    liquidBufferYears,
    statusLabelZh: 'GL30 超逾負擔能力上限（紅燈需補充資金聲明）',
    statusLabelEn: 'GL30 Exceeds Surplus Threshold (Red Justification Required)',
    advisoryNoteZh: `年繳保費佔每月盈餘高達 ${disposableRatioPct}%（超逾 50%），按保監局 GL30 指引須調低保額或簽署流動資產支付保費補充說明。`,
    advisoryNoteEn: `Annual premium exceeds 50% of disposable surplus (${disposableRatioPct}%). Reduce sum assured or attach GL30 liquid-asset source justification.`,
  };
}

// ============================================================================
// #15. PRE-UNDERWRITING MEDICAL IMPAIRMENT TRIAGE
// ============================================================================

export interface HealthTriageAssessment {
  code: HealthImpairmentCode;
  labelZh: string;
  labelEn: string;
  verdictCode: 'STANDARD_ISSUE' | 'SUB_STANDARD_LOADING' | 'ORGAN_EXCLUSION' | 'MEDICAL_REPORT_REQUIRED';
  verdictBadgeZh: string;
  verdictBadgeEn: string;
  expectedTermsZh: string;
  expectedTermsEn: string;
  requiredDocsZh: string;
  requiredDocsEn: string;
  instantIssueAllowed: boolean;
}

export const HEALTH_IMPAIRMENT_OPTIONS: Array<{
  code: HealthImpairmentCode;
  labelZh: string;
  labelEn: string;
}> = [
  { code: 'STANDARD_HEALTH', labelZh: '標準健康體（無慢性病／結節紀錄）', labelEn: 'Standard Clean Health (No Impairments)' },
  { code: 'THYROID_NODULE', labelZh: '甲狀腺結節 (TI-RADS 2–3 良性隨訪)', labelEn: 'Thyroid Nodule (TI-RADS 2–3 Benign)' },
  { code: 'ELEVATED_BMI', labelZh: '體重指標偏高 (BMI 28.5–31 輕度肥胖)', labelEn: 'Elevated BMI (28.5–31 Mild Obesity)' },
  { code: 'HYPERTENSION_CONTROLLED', labelZh: '已受控高血壓（單一降壓藥穩定 <135/85）', labelEn: 'Controlled Hypertension (Single Med <135/85)' },
  { code: 'HEP_B_CARRIER', labelZh: '乙型肝炎帶菌者（肝酵素 ALT/AST 正常）', labelEn: 'Hepatitis B Carrier (Normal Liver Enzymes)' },
  { code: 'BREAST_CYST_BENIGN', labelZh: '乳腺囊腫／纖維瘤 (BI-RADS 2 良性)', labelEn: 'Benign Breast Cyst / Fibroadenoma (BI-RADS 2)' },
];

export function evaluateQuickHealthTriage(
  code: HealthImpairmentCode | undefined,
  planCategory?: PlanCategory
): HealthTriageAssessment {
  const safeCode: HealthImpairmentCode = code || 'STANDARD_HEALTH';
  const isPureSavings =
    planCategory === PlanCategory.PARTICIPATING_SAVINGS || planCategory === PlanCategory.QDAP;

  if (safeCode === 'STANDARD_HEALTH') {
    return {
      code: safeCode,
      labelZh: '標準健康體',
      labelEn: 'Standard Health',
      verdictCode: 'STANDARD_ISSUE',
      verdictBadgeZh: '標準體核保通過（支援直通批核）',
      verdictBadgeEn: 'Standard Acceptance (Instant STP Ready)',
      expectedTermsZh: '預期標準費率承保，無附加保費（Loading）及無不保事項（Exclusion）。',
      expectedTermsEn: 'Standard rates expected with zero loading and zero organ exclusions.',
      requiredDocsZh: '免體檢（達免體檢保額上限內），僅需標準健康申報',
      requiredDocsEn: 'Non-medical limit eligible; standard health declaration only',
      instantIssueAllowed: true,
    };
  }

  if (isPureSavings) {
    return {
      code: safeCode,
      labelZh: HEALTH_IMPAIRMENT_OPTIONS.find((o) => o.code === safeCode)?.labelZh || safeCode,
      labelEn: HEALTH_IMPAIRMENT_OPTIONS.find((o) => o.code === safeCode)?.labelEn || safeCode,
      verdictCode: 'STANDARD_ISSUE',
      verdictBadgeZh: '儲蓄／年金簡易核保（免驗身標準承保）',
      verdictBadgeEn: 'GIO / Simplified Savings Acceptance',
      expectedTermsZh: '儲蓄分紅及扣稅年金屬簡易核保（GIO），一般既往結節／三高不影響標準費率批核。',
      expectedTermsEn: 'Participating savings & QDAP use simplified underwriting; pre-existing minor conditions typically clear at standard rates.',
      requiredDocsZh: '無須提交超聲波或驗血報告',
      requiredDocsEn: 'No medical ultrasound or blood reports required',
      instantIssueAllowed: true,
    };
  }

  switch (safeCode) {
    case 'THYROID_NODULE':
      return {
        code: safeCode,
        labelZh: '甲狀腺結節 (TI-RADS 2–3)',
        labelEn: 'Thyroid Nodule (TI-RADS 2–3)',
        verdictCode: 'ORGAN_EXCLUSION',
        verdictBadgeZh: '預期甲狀腺局部除外（危疾或標準／+25%）',
        verdictBadgeEn: 'Likely Thyroid Exclusion (VHIS) / Standard-to-+25% (CI)',
        expectedTermsZh: '醫療險一般作「甲狀腺疾病除外」批核；危疾險若 TI-RADS 2 且 <1cm 有機會標準體或甲狀腺癌除外。',
        expectedTermsEn: 'Medical VHIS typically issues with thyroid exclusion; Critical Illness may offer standard or thyroid carcinoma exclusion if TI-RADS 2 <1cm.',
        requiredDocsZh: '近 6–12 個月甲狀腺超聲波報告及甲功三項 (TSH/FT3/FT4)',
        requiredDocsEn: 'Recent 6–12m thyroid ultrasound report + TSH/FT3/FT4 panel',
        instantIssueAllowed: false,
      };
    case 'ELEVATED_BMI':
      return {
        code: safeCode,
        labelZh: '體重指標偏高 (BMI 28.5–31)',
        labelEn: 'Elevated BMI (28.5–31)',
        verdictCode: 'SUB_STANDARD_LOADING',
        verdictBadgeZh: '預期標準體至 +25% 加費（Loading）',
        verdictBadgeEn: 'Expected Standard to +25% Premium Loading',
        expectedTermsZh: '若血壓、空腹血糖及血脂正常，部分保司可批標準體；否則危疾／醫療一般加費 +20% 至 +35%。',
        expectedTermsEn: 'Standard possible if BP, HbA1c & lipids are normal; otherwise +20% to +35% loading on CI/Medical.',
        requiredDocsZh: '近 1 年體檢身高體重、血壓及空腹血糖／血脂紀錄',
        requiredDocsEn: 'Height/weight check, BP reading & fasting glucose/lipid profile',
        instantIssueAllowed: false,
      };
    case 'HYPERTENSION_CONTROLLED':
      return {
        code: safeCode,
        labelZh: '已受控高血壓',
        labelEn: 'Controlled Hypertension',
        verdictCode: 'SUB_STANDARD_LOADING',
        verdictBadgeZh: '預期 +25% 至 +50% 加費承保',
        verdictBadgeEn: 'Expected +25% to +50% Loading',
        expectedTermsZh: '單一藥物控制良好且無左心室肥厚或蛋白尿，危疾與醫療多以 +25%–50% 加費承保。',
        expectedTermsEn: 'Well-controlled on monotherapy without end-organ changes typically clears at +25%–50% loading.',
        requiredDocsZh: '主診醫生血壓隨訪紀錄、靜態心電圖 (ECG) 及尿常規',
        requiredDocsEn: 'Attending physician BP log, resting ECG & urinalysis',
        instantIssueAllowed: false,
      };
    case 'HEP_B_CARRIER':
      return {
        code: safeCode,
        labelZh: '乙肝帶菌者（肝功正常）',
        labelEn: 'Hep B Carrier (Normal LFT)',
        verdictCode: 'SUB_STANDARD_LOADING',
        verdictBadgeZh: '預期 +25%–50% 加費（須附肝超聲波）',
        verdictBadgeEn: 'Expected +25%–50% Loading (Liver US Required)',
        expectedTermsZh: 'e抗原陰性、HBV-DNA 低載量及肝臟超聲波無硬化跡象者，一般可獲 +25%–50% 加費批核。',
        expectedTermsEn: 'HBeAg-negative with low HBV-DNA and normal liver ultrasound generally clears with +25%–50% loading.',
        requiredDocsZh: '近 6 個月肝功能 (ALT/AST)、AFP 甲胎蛋白、HBV-DNA 及腹部超聲波',
        requiredDocsEn: 'Recent 6m LFT (ALT/AST), AFP, HBV-DNA viral load & liver ultrasound',
        instantIssueAllowed: false,
      };
    case 'BREAST_CYST_BENIGN':
    default:
      return {
        code: safeCode,
        labelZh: '乳腺囊腫／纖維瘤 (BI-RADS 2)',
        labelEn: 'Benign Breast Cyst (BI-RADS 2)',
        verdictCode: 'ORGAN_EXCLUSION',
        verdictBadgeZh: '預期乳房良性病變除外／危疾有機標準體',
        verdictBadgeEn: 'Breast Benign Exclusion (VHIS) / Standard Possible (CI)',
        expectedTermsZh: 'BI-RADS 2 單純囊腫於危疾險常可獲標準體承保；醫療實報實銷一般對既往乳房囊腫設局部除外。',
        expectedTermsEn: 'BI-RADS 2 simple cysts often clear Critical Illness at standard rates; VHIS Medical typically excludes pre-existing breast cyst surgery.',
        requiredDocsZh: '近 6–12 個月乳房超聲波或乳房造影 (Mammogram) 報告',
        requiredDocsEn: 'Recent 6–12m breast ultrasound or mammogram report',
        instantIssueAllowed: false,
      };
  }
}

// ============================================================================
// #16. AUTOMATED MCV CROSS-BORDER COMPLIANCE CHECKLIST
// ============================================================================

export interface McvChecklistEvaluation {
  applicable: boolean;
  checklist: McvCrossBorderChecklist;
  completedCount: number;
  totalCount: number;
  allCleared: boolean;
  items: Array<{
    key: keyof McvCrossBorderChecklist;
    titleZh: string;
    titleEn: string;
    descZh: string;
    descEn: string;
    checked: boolean;
  }>;
}

export function evaluateMcvCrossBorderReadiness(lead: ClientLead): McvChecklistEvaluation {
  const applicable = lead.residency === 'MCV';
  const checklist: McvCrossBorderChecklist = {
    landingSlipVerified:
      lead.mcvChecklist?.landingSlipVerified ?? Boolean(lead.kycCheck.mcvEntrySlipVerified),
    hkBankEddaReady: lead.mcvChecklist?.hkBankEddaReady ?? true,
    safeFxQuotaDeclared: lead.mcvChecklist?.safeFxQuotaDeclared ?? true,
    onshoreHksarSigned: lead.mcvChecklist?.onshoreHksarSigned ?? true,
  };

  const items: McvChecklistEvaluation['items'] = [
    {
      key: 'landingSlipVerified',
      titleZh: '香港入境處「入境標籤 (Landing Slip)」核實',
      titleEn: 'HKSAR Immigration Landing Slip Verified',
      descZh: '確認投保人正身處香港境內並留存有效逗留期限標籤影本',
      descEn: 'Confirms lawful onshore presence in HKSAR on application date',
      checked: checklist.landingSlipVerified,
    },
    {
      key: 'hkBankEddaReady',
      titleZh: '香港個人銀行戶口及續期 eDDA 自動轉帳',
      titleEn: 'HK Retail Bank Account & Renewal eDDA Setup',
      descZh: '確保第 2 年起續期保費可經中銀香港／滙豐等港銀 eDDA 自動扣帳',
      descEn: 'Ensures seamless Year-2+ renewal debit via BOCHK / HSBC HK eDDA',
      checked: checklist.hkBankEddaReady,
    },
    {
      key: 'safeFxQuotaDeclared',
      titleZh: '外管局每年 USD 50,000 便利化購匯合規聲明',
      titleEn: 'SAFE USD $50,000 Annual FX Quota Declaration',
      descZh: '確認保費資金來源合法且符合跨境個人經常項目／合規匯款規定',
      descEn: 'Confirms compliant cross-border remittance & source of funds',
      checked: checklist.safeFxQuotaDeclared,
    },
    {
      key: 'onshoreHksarSigned',
      titleZh: '香港境內親身簽署認證（嚴禁跨境代簽）',
      titleEn: 'Physical Onshore HKSAR Signing Attestation',
      descZh: '符合香港保監局內地訪港旅客（MCV）全流程在港合規銷售指引',
      descEn: 'Complies with HKIA onshore solicitation & signing rules for MCV clients',
      checked: checklist.onshoreHksarSigned,
    },
  ];

  const completedCount = items.filter((i) => i.checked).length;
  return {
    applicable,
    checklist,
    completedCount,
    totalCount: items.length,
    allCleared: !applicable || completedCount === items.length,
    items,
  };
}

// ============================================================================
// #10. ONE-TAP WHATSAPP / WECHAT FORMATTED PITCH COPY BUILDER
// ============================================================================

export function buildFormattedMessengerPitch(params: {
  channel: 'WHATSAPP_ZH_HK' | 'WECHAT_ZH_CN' | 'WHATSAPP_EN';
  clientNameZh: string;
  clientNameEn: string;
  planTitleZh: string;
  planTitleEn: string;
  comboTitlesZh?: string[];
  annualPremiumHkd: number;
  annualPremiumRmb: number;
  monthlyHkd: number;
  fxRateHkdToRmb: number;
  fxUpdatedDate: string;
  specialOfferHeadlineZh?: string | null;
  proposalShareUrl: string;
  expiresDateText: string;
  advisorName: string;
  advisorLicense: string;
}): string {
  const {
    channel,
    clientNameZh,
    clientNameEn,
    planTitleZh,
    planTitleEn,
    comboTitlesZh = [],
    annualPremiumHkd,
    annualPremiumRmb,
    monthlyHkd,
    fxRateHkdToRmb,
    fxUpdatedDate,
    specialOfferHeadlineZh,
    proposalShareUrl,
    expiresDateText,
    advisorName,
    advisorLicense,
  } = params;

  const comboLineZh =
    comboTitlesZh.length > 0 ? `\n➕ 協同組合計劃：${comboTitlesZh.join(' ＋ ')}` : '';

  if (channel === 'WHATSAPP_EN') {
    return [
      `Hi ${clientNameEn}, thank you for our review today! Here is your personalized HK Insurance Executive Proposal:`,
      ``,
      `• Recommended Plan: ${planTitleEn}`,
      `• Annual Premium: HK$ ${annualPremiumHkd.toLocaleString()} (~HK$ ${monthlyHkd.toLocaleString()}/mo | ~RMB ¥${annualPremiumRmb.toLocaleString()})`,
      `• Reference FX Rate: 1 HKD = ${fxRateHkdToRmb.toFixed(3)} RMB (Stamped ${fxUpdatedDate})`,
      specialOfferHeadlineZh ? `• Active Campaign: Seasonal First-Year Rebate Eligible` : '',
      ``,
      `Interactive Mobile Proposal (Valid until ${expiresDateText}):`,
      `${proposalShareUrl}`,
      ``,
      `Prepared by ${advisorName} (HKIA Lic: ${advisorLicense})`,
      `*Subject to policy provisions & HKIA GL28/GN16 benefit illustration disclosures.*`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  const rawZh = [
    `${clientNameZh} 你好！多謝今日抽空傾偈，幫你整理好《保障及儲蓄方案摘要》方便參考：`,
    ``,
    `▪ 建議計劃：${planTitleZh}${comboLineZh}`,
    `▪ 每年總保費：HK$ ${annualPremiumHkd.toLocaleString()}（平均每月約 HK$ ${monthlyHkd.toLocaleString()}｜約 ¥ ${annualPremiumRmb.toLocaleString()}）`,
    `▪ 參考匯率：1 HKD = ¥ ${fxRateHkdToRmb.toFixed(3)}（更新日期：${fxUpdatedDate}）`,
    specialOfferHeadlineZh ? `▪ 本季保費優惠：${specialOfferHeadlineZh}` : '',
    ``,
    `手機版建議書連結（有效期至 ${expiresDateText}，撳入去可隨時睇返各年度保證及預期價值）：`,
    `${proposalShareUrl}`,
    ``,
    `持牌保險顧問：${advisorName}（保監局牌照：${advisorLicense}）`,
    `註：以上數字按香港保監局 GL28/GN16 標準演示，非保證紅利並非保證，新保單享有 21 日冷靜期。`,
  ]
    .filter(Boolean)
    .join('\n');

  return channel === 'WECHAT_ZH_CN' ? toSimplifiedChinese(rawZh) : rawZh;
}

// ============================================================================
// #13. DETERMINISTIC POLICY SCHEDULE OCR / TEXT EXTRACTOR (STAGE 01B)
// ============================================================================

export function parseDeterministicLegacyPolicyText(
  rawText: string
): Omit<ExistingPolicyAuditItem, 'id' | 'addedAtIso'> {
  const clean = rawText.trim();
  const lower = clean.toLowerCase();

  let dimensionId: ProtectionDimensionId = 'PRIVATE_HOSPITAL';
  if (
    lower.includes('critical') ||
    clean.includes('危疾') ||
    clean.includes('重疾') ||
    clean.includes('倍保安')
  ) {
    dimensionId = 'CRITICAL_ILLNESS';
  } else if (
    lower.includes('cancer') ||
    clean.includes('標靶') ||
    clean.includes('癌症') ||
    clean.includes('腫瘤')
  ) {
    dimensionId = 'CANCER_TARGETED';
  } else if (
    lower.includes('term') ||
    lower.includes('mortgage') ||
    clean.includes('定期人壽') ||
    clean.includes('人壽') ||
    clean.includes('按揭')
  ) {
    dimensionId = 'LIFE_MORTGAGE';
  } else if (lower.includes('accident') || clean.includes('意外') || clean.includes('傷殘')) {
    dimensionId = 'ACCIDENT_INCOME';
  } else if (
    lower.includes('annuity') ||
    lower.includes('qdap') ||
    clean.includes('年金') ||
    clean.includes('退休')
  ) {
    dimensionId = 'RETIREMENT_DEMENTIA';
  }

  // Extract numbers that look like coverage amounts vs annual premiums
  const rawNums = Array.from(clean.matchAll(/(?:HK\$|USD|RMB|¥|\$)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,8})/gi))
    .map((m) => Number(m[1].replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);

  const sortedDesc = [...rawNums].sort((a, b) => b - a);
  const coverageAmountHkd =
    sortedDesc[0] && sortedDesc[0] >= 30_000
      ? sortedDesc[0]
      : dimensionId === 'CRITICAL_ILLNESS'
      ? 500_000
      : dimensionId === 'LIFE_MORTGAGE'
      ? 1_500_000
      : 120_000;

  const smallerPremium = rawNums.find((n) => n >= 1_200 && n <= 95_000 && n !== coverageAmountHkd);
  const isGroupPolicy = clean.includes('團體') || clean.includes('公司醫保') || lower.includes('group');
  const annualPremiumHkd = isGroupPolicy ? 0 : smallerPremium ?? 6_800;

  const firstLine = clean.split(/\r?\n/)[0]?.slice(0, 42).trim();
  const policyName =
    firstLine && firstLine.length >= 4
      ? firstLine
      : isGroupPolicy
      ? '公司團體醫療保單 (OCR 匯入)'
      : '客戶既有個人保單 (OCR 掃描匯入)';

  const limitationNote = isGroupPolicy
    ? '普通房外科分項賠償上限、離職即終止保障，缺乏私家半私家房全數賠付'
    : dimensionId === 'CRITICAL_ILLNESS'
    ? '早期舊式單次賠付危疾，缺乏癌症 1 年等候期多重支援及持續標靶藥保障'
    : '舊款分項限額制保單，面對 2026 私家醫院微創手術費存在自付差額';

  return {
    policyName,
    dimensionId,
    coverageAmountHkd,
    annualPremiumHkd,
    limitationNote,
  };
}

// ============================================================================
// #18 & #19. LIVE FX RATE FEED & PROMO ADMIN OVERRIDE RESOLVER
// ============================================================================

export const DEFAULT_LIVE_FX_FEED: FxRateFeedState = {
  usdToHkd: 7.785,
  hkdToRmb: 0.923,
  usdToRmb: 7.186,
  updatedAtIso: '2026-11-13T09:30:00.000Z',
  sourceLabel: 'HKMA / Interbank Mid-Market Reference',
  rateLocked: false,
};

export function formatFxRateStamp(feed: FxRateFeedState): string {
  const datePart = feed.updatedAtIso.slice(0, 10);
  return `1 USD = ${feed.usdToHkd.toFixed(3)} HKD · 1 HKD = ¥${feed.hkdToRmb.toFixed(3)} (${datePart}${
    feed.rateLocked ? ' · LOCKED' : ''
  })`;
}

export function resolveSpecialOfferWithAdminOverride(
  plan: InsurancePlan | null | undefined,
  overrides?: Record<string, PromoAdminOverride>
): PlanSpecialOffer | null {
  const baseOffer = getSpecialOfferForPlan(plan);
  if (!plan || !baseOffer) return null;

  const ov = overrides?.[plan.insurerCode];
  if (!ov) return baseOffer;

  const days =
    typeof ov.daysRemainingOverride === 'number'
      ? ov.daysRemainingOverride
      : baseOffer.daysRemaining;

  // Automatically hide expired or archived campaigns
  if (ov.archived || days <= 0) {
    return null;
  }

  const rebate =
    typeof ov.customRebatePct === 'number' && ov.customRebatePct > 0
      ? ov.customRebatePct
      : baseOffer.firstYearRebatePct;
  const prepaid =
    ov.customPrepaidRatePct !== undefined
      ? ov.customPrepaidRatePct
      : baseOffer.prepaidGuaranteedRatePct;

  return {
    ...baseOffer,
    firstYearRebatePct: rebate,
    prepaidGuaranteedRatePct: prepaid,
    daysRemaining: days,
    headlineZh: prepaid
      ? `保司首年保費回贈高達 ${rebate}% ＋ 5年預繳保證 ${prepaid.toFixed(1)}% 年息（倒數 ${days} 日）`
      : `保司限時推廣：首年保費回贈高達 ${rebate}%（倒數 ${days} 日）`,
    headlineEn: prepaid
      ? `Up to ${rebate}% First-Year Rebate + 5-Year Prepaid Guaranteed ${prepaid.toFixed(1)}% p.a. (${days} Days Left)`
      : `Limited Insurer Campaign: Up to ${rebate}% First-Year Rebate (${days} Days Left)`,
  };
}

// ============================================================================
// #20. AGENCY TEAM LIBRARY SEED TEMPLATES (SHARED CASE DECKS & BATTLECARDS)
// ============================================================================

export const INITIAL_TEAM_LIBRARY_ITEMS: TeamLibraryItem[] = [
  {
    id: 'team-deck-core-family',
    kind: 'CASE_DECK',
    titleZh: '【COT 實戰範本】36歲雙職育兒家庭：團保銜接半私家 VHIS ＋ 400萬按揭對沖',
    titleEn: '[COT Case Deck] Age 36 Dual-Income Family: Group Med Bridge to Semi-Private VHIS + HK$4M Mortgage Hedge',
    summaryZh: '專為擁有公司普通房醫保的中產父母設計，用自付額選項節省 42% 保費並鎖定養和免找數通行證。',
    summaryEn: 'Tailored for corporate executives with group ward cover; cuts VHIS premium by 42% via deductible bridge while unlocking HKSH cashless LOG.',
    authorName: 'Vivian Lau (COT · District Director)',
    authorLicense: 'IA-FA9281',
    tags: ['VHIS 銜接團保', '育兒核心家庭', '私院免找數'],
    cloneCount: 48,
    createdAtIso: '2026-11-05T08:00:00.000Z',
  },
  {
    id: 'team-deck-mcv-legacy',
    kind: 'CASE_DECK',
    titleZh: '【TOT 私銀範本】大灣區企業主：5年預繳鎖息 4.8% ＋ 保單分拆三代傳承',
    titleEn: '[TOT HNW Deck] GBA Business Owner: 5Y Prepaid 4.8% Rate-Lock + Multi-Currency Policy Split',
    summaryZh: '針對美元定存減息週期，對比銀行定存再投資風險與多元貨幣保單「類信託」無限次更換受保人優勢。',
    summaryEn: 'Contrasts USD time-deposit rollover cliff against multi-currency participating policy splitting and unlimited insured changes.',
    authorName: 'Marcus Cheng (TOT · Private Wealth VP)',
    authorLicense: 'IA-FB3310',
    tags: ['MCV 高淨值', '多元貨幣分拆', '5年預繳鎖息'],
    cloneCount: 63,
    createdAtIso: '2026-11-08T10:15:00.000Z',
  },
  {
    id: 'team-obj-bank-td',
    kind: 'OBJECTION_SCRIPT',
    titleZh: '【拆彈王牌】「而家美金定存仲有 4 厘幾，點解要鎖資金買儲蓄保？」',
    titleEn: '[Top Battlecard] "Why lock money in Par Savings when USD bank deposits still pay ~4%?"',
    summaryZh: '以「短息再投資懸崖 vs 30年複利鎖定＋貨幣自由轉換」三步曲化解定存異議。',
    summaryEn: '3-step rebuttal framing short-term deposit reinvestment risk vs. multi-decade compounding and currency switching.',
    authorName: 'Rachel Ho (MDRT Honor Roll)',
    authorLicense: 'IA-FA7742',
    tags: ['定存對比', '減息週期', '儲蓄分紅'],
    cloneCount: 91,
    createdAtIso: '2026-11-09T14:00:00.000Z',
    objectionCategoryZh: '銀行定存比較異議',
    objectionPromptZh: '客戶質疑：「美金定期存款靈活又有息收，儲蓄保前幾年退保會蝕本！」',
    objectionReplyZh:
      '完全理解！銀行定存最適合放 6–12 個月應急錢，但定存最大風險係「減息再投資風險」——當聯儲局減息，下年續期可能跌回 2%。我哋今日配置嘅多元貨幣方案，除咗首年享高達 20% 回贈＋5年預繳保證 4.8% 鎖息外，更重要係為子女教育同退休鎖定未來 20–30 年約 6%–6.5% 長線複利，仲可以隨時轉做英鎊、加元或人民幣！',
    objectionReplyEn:
      'Bank time deposits are great for 6–12 month emergency cash, but face steep rollover rate cuts once central banks ease. Allocating medium-to-long-term capital here locks in a 5-year 4.8% prepaid rate today plus multi-decade ~6.5% HKIA-compliant compounding with free GBP/CAD/RMB switching.',
  },
  {
    id: 'team-obj-group-med',
    kind: 'OBJECTION_SCRIPT',
    titleZh: '【拆彈王牌】「公司已經包咗醫療保險，等退休先買個人 VHIS 啦！」',
    titleEn: '[Top Battlecard] "My employer already covers medical — I will buy personal VHIS at retirement!"',
    summaryZh: '點破「60歲三高結節拒保風險」與「HK$50,000 高自付額銜接法」，用極低保費鎖定終身保證續保權。',
    summaryEn: 'Addresses age-60 uninsurability risk using a High-Deductible VHIS bridge that converts to HK$0 deductible at retirement without medical underwriting.',
    authorName: 'Kelvin Tse (MDRT · Senior Manager)',
    authorLicense: 'IA-FA6109',
    tags: ['公司團保迷思', '高自付額銜接', '保證續保'],
    cloneCount: 77,
    createdAtIso: '2026-11-10T11:20:00.000Z',
    objectionCategoryZh: '公司團保迷思',
    objectionPromptZh: '客戶認為：「我有公司醫保唔使自己出錢，等 60 歲退休先買都未遲。」',
    objectionReplyZh:
      '呢個係最多專業主管後悔嘅盲點：第一，公司團保普通房上限通常得 5–6 萬，私家醫院做個微創或標靶藥動輒 25–40 萬；第二，等到 55–60 歲退休時一旦有血壓高或甲狀腺結節，保司就會加費甚至除外！最聰明做法係趁而家健康，揀「HK$50,000 自付額」高端 VHIS——用公司團保包底墊付自付額，您每年淨保費平近一半仲可以扣稅，而且鎖定 55/60 歲「免核保轉回 $0 自付額」權利！',
    objectionReplyEn:
      'Corporate group plans cap ward surgical benefits around HK$50k–60k and terminate the day you retire—when nodules or hypertension may trigger exclusions. By pairing a HK$50,000-deductible High-End VHIS today, your company policy covers the deductible, your premium drops ~45% with IRD tax relief, and you lock in a guaranteed zero-underwriting step-down to $0 deductible at retirement.',
  },
];

// ============================================================================
// STAGE 05A STATUTORY SIGN-OFF EXPLAINER METADATA
// ============================================================================

export interface StatutorySignOffDocSpec {
  id: 'DOC_GL28_BI' | 'DOC_GL30_FNA' | 'DOC_INSURER_EAPP';
  stepBadge: string;
  titleZh: string;
  titleEn: string;
  purposeZh: string;
  purposeEn: string;
  signerRoleZh: string;
  signerRoleEn: string;
}

export const STP_STATUTORY_DOCUMENTS_EXPLAINER: StatutorySignOffDocSpec[] = [
  {
    id: 'DOC_GL28_BI',
    stepBadge: '文件 1 · 保監局 GL28',
    titleZh: '《利益說明書及分紅實現率風險確認書》',
    titleEn: 'Benefit Illustration & Non-Guaranteed Dividend Disclosure (HKIA GL28)',
    purposeZh: '確認客戶已清楚檢視「保證現金價值」與「非保證預期紅利」之分別，並知悉 21 日冷靜期權益。',
    purposeEn: 'Confirms the applicant reviewed Guaranteed vs. Non-Guaranteed surrender values and understands the 21-day cooling-off right.',
    signerRoleZh: '保單持有人（投保人）確認',
    signerRoleEn: 'Policyholder Acknowledgment',
  },
  {
    id: 'DOC_GL30_FNA',
    stepBadge: '文件 2 · 保監局 GL30',
    titleZh: '《財務需要分析（FNA）及保費負擔能力聲明》',
    titleEn: 'Financial Needs Analysis & Premium Affordability Declaration (HKIA GL30)',
    purposeZh: '確認所選主約、組合計劃及附約符合家庭保障目標，且年繳保費在可支配收入／流動資產可負擔範圍內。',
    purposeEn: 'Confirms the selected base plan, combo & riders match stated objectives and fit disposable surplus / liquid reserves.',
    signerRoleZh: '投保人及持牌顧問雙重確認',
    signerRoleEn: 'Joint Applicant & Advisor Sign-Off',
  },
  {
    id: 'DOC_INSURER_EAPP',
    stepBadge: '文件 3 · 保司直通核保',
    titleZh: '《電子投保申請書及健康申報核保授權》',
    titleEn: 'Electronic Policy Application & Underwriting Authorization',
    purposeZh: '授權將已壓印電子簽名之投保包裹直通遞交保險公司核保部（標準健康體可即時批核出單，次標準體進入核保隊列）。',
    purposeEn: 'Authorizes direct Straight-Through Processing (STP) submission to the insurer for instant policy issue or medical underwriting review.',
    signerRoleZh: '投保人授權遞交',
    signerRoleEn: 'Applicant Submission Consent',
  },
];
