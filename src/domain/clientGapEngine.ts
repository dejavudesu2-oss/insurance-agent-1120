import {
  ClientLead,
  FamilyStageCode,
  InsurancePlan,
  IntermediaryProfile,
  MorningBriefingSlide,
  OccupationRiskClass,
  PlanCategory,
  ProtectionDimensionId,
  TargetProtectionSchemeId,
} from './types';

export const HKD_TO_RMB_RATE = 0.92;
export const HKD_TO_USD_RATE = 1 / 7.8;

export function convertHkdToRmb(amountHkd: number, fxRate = HKD_TO_RMB_RATE): number {
  return Math.round(amountHkd * fxRate);
}

export interface TargetProtectionSchemeMeta {
  id: TargetProtectionSchemeId;
  titleEn: string;
  titleZh: string;
  lockedSummaryEn: string;
  lockedSummaryZh: string;
  baseAnnualPremiumHkd: number;
  baseAnnualPremiumRmb: number;
  descriptionEn: string;
  descriptionZh: string;
  recommendedCategories: PlanCategory[];
  defaultNewCoverageHkd: Record<ProtectionDimensionId, number>;
}

export const TARGET_PROTECTION_SCHEMES: TargetProtectionSchemeMeta[] = [
  {
    id: 'VHIS_HIGH_END',
    titleEn: 'High-End Medical VHIS',
    titleZh: '高端醫療 VHIS',
    lockedSummaryEn: 'Asian Semi-Private Full Cover + Minimally Invasive Surgery',
    lockedSummaryZh: '亞洲半私家房高端醫療及標靶治療防護方案',
    baseAnnualPremiumHkd: 13800,
    baseAnnualPremiumRmb: 12696,
    descriptionEn:
      'Full cover for Asian semi-private rooms, private hospital minimally invasive surgery, and prescribed non-surgical cancer targeted therapy.',
    descriptionZh:
      '全數賠償亞洲半私家房、私家醫院微創手術及訂明非手術癌症標靶治療',
    recommendedCategories: [PlanCategory.HIGH_END_MEDICAL, PlanCategory.VHIS],
    defaultNewCoverageHkd: {
      LIFE_MORTGAGE: 500000,
      PRIVATE_HOSPITAL: 590000,
      CRITICAL_ILLNESS: 300000,
      CANCER_TARGETED: 680000,
      ACCIDENT_INCOME: 800000,
      RETIREMENT_DEMENTIA: 400000,
    },
  },
  {
    id: 'MULTI_CI',
    titleEn: 'Multi-Claim Critical Illness',
    titleZh: '多重危疾保障',
    lockedSummaryEn: 'Early & Major Multi-CI + First 10-Yr +50% Upgrade',
    lockedSummaryZh: '多重危疾保障及癌症 1 年等候期防護方案',
    baseAnnualPremiumHkd: 21600,
    baseAnnualPremiumRmb: 19872,
    descriptionEn:
      'Covers multiple payouts for early & severe critical illnesses, first 10-year +50% bonus cover, and 1-year cancer waiting period support.',
    descriptionZh:
      '涵蓋早期及嚴重危疾多重賠償、首 10 年額外 50% 升級保障及癌症 1 年等候期支援',
    recommendedCategories: [PlanCategory.CRITICAL_ILLNESS],
    defaultNewCoverageHkd: {
      LIFE_MORTGAGE: 1800000,
      PRIVATE_HOSPITAL: 180000,
      CRITICAL_ILLNESS: 1200000,
      CANCER_TARGETED: 720000,
      ACCIDENT_INCOME: 1500000,
      RETIREMENT_DEMENTIA: 900000,
    },
  },
  {
    id: 'FAMILY_COMPREHENSIVE',
    titleEn: 'Family Comprehensive',
    titleZh: '家庭全方位',
    lockedSummaryEn: 'Breadwinner CI + High-End Medical Comprehensive Plan',
    lockedSummaryZh: '家庭支柱危疾＋高端醫療全方位方案',
    baseAnnualPremiumHkd: 29500,
    baseAnnualPremiumRmb: 27140,
    descriptionEn:
      '3-in-1 integration of mortgage life liability, multi-claim critical illness cash pool, and full private hospital medical reimbursement.',
    descriptionZh:
      '整合按揭人壽責任額、多重危疾現金池與私家醫院全數醫療賠償三合一配置',
    recommendedCategories: [
      PlanCategory.CRITICAL_ILLNESS,
      PlanCategory.HIGH_END_MEDICAL,
      PlanCategory.VHIS,
      PlanCategory.TERM_LIFE,
    ],
    defaultNewCoverageHkd: {
      LIFE_MORTGAGE: 6300000,
      PRIVATE_HOSPITAL: 590000,
      CRITICAL_ILLNESS: 1200000,
      CANCER_TARGETED: 720000,
      ACCIDENT_INCOME: 2500000,
      RETIREMENT_DEMENTIA: 1890000,
    },
  },
  {
    id: 'MULTI_FX_LEGACY',
    titleEn: 'Multi-Currency Legacy',
    titleZh: '多元貨幣傳承',
    lockedSummaryEn: 'HKD / CNY / USD Switch, Policy Split & Passive Retirement Flow',
    lockedSummaryZh: '大灣區多元貨幣財富傳承與退休被動現金流方案',
    baseAnnualPremiumHkd: 68000,
    baseAnnualPremiumRmb: 62560,
    descriptionEn:
      'Supports HKD / CNY / USD free currency switching, policy splitting, unlimited insured changes, and passive retirement income stream.',
    descriptionZh:
      '支援 HKD / CNY / USD 貨幣自由轉換、保單分拆、無限次更換受保人及退休被動現金流',
    recommendedCategories: [
      PlanCategory.PARTICIPATING_SAVINGS,
      PlanCategory.QDAP,
      PlanCategory.UNIVERSAL_LIFE,
    ],
    defaultNewCoverageHkd: {
      LIFE_MORTGAGE: 5200000,
      PRIVATE_HOSPITAL: 350000,
      CRITICAL_ILLNESS: 800000,
      CANCER_TARGETED: 500000,
      ACCIDENT_INCOME: 2000000,
      RETIREMENT_DEMENTIA: 3600000,
    },
  },
];

export const FAMILY_STAGE_OPTIONS: Array<{
  code: FamilyStageCode;
  labelEn: string;
  labelZh: string;
}> = [
  { code: 'CHILDCARE_NUCLEAR', labelEn: 'Childcare Nuclear Family', labelZh: '育兒核心家庭' },
  { code: 'SINGLE_YOUNG_PRO', labelEn: 'Single Career Professional', labelZh: '單身專業晉升族' },
  { code: 'NEWLYWED_DUAL', labelEn: 'Newlywed Dual-Income', labelZh: '新婚雙職家庭' },
  { code: 'HNW_CROSSBORDER', labelEn: 'GBA / HNW Legacy Family', labelZh: '大灣區高淨值傳承家庭' },
  { code: 'PRE_RETIREMENT', labelEn: 'Pre-Retirement Wealth Lock', labelZh: '準退休資產鎖定階段' },
];

export const OCCUPATION_RISK_OPTIONS: Array<{
  code: OccupationRiskClass;
  labelEn: string;
  labelZh: string;
  multiplier: number;
}> = [
  {
    code: 'CLASS_1_OFFICE',
    labelEn: 'Class 1 — Indoor Executive / Professional',
    labelZh: '第 1 級 — 室內行政／專業文職',
    multiplier: 1.0,
  },
  {
    code: 'CLASS_2_SUPERVISORY',
    labelEn: 'Class 2 — Outgoing Sales / Site Supervision',
    labelZh: '第 2 級 — 外勤管理／跨境商務',
    multiplier: 1.08,
  },
  {
    code: 'CLASS_3_SKILLED',
    labelEn: 'Class 3 — Technical Field / Engineering',
    labelZh: '第 3 級 — 工程技術／實地運作',
    multiplier: 1.2,
  },
  {
    code: 'CLASS_4_HIGH_RISK',
    labelEn: 'Class 4 — High-Risk Industrial / Aviation',
    labelZh: '第 4 級 — 高危工種／特別核保類別',
    multiplier: 1.38,
  },
];

export interface ProtectionDimensionMeta {
  id: ProtectionDimensionId;
  labelEn: string;
  labelZh: string;
  baseRecommendedTargetHkd: number;
}

export const SIX_PROTECTION_DIMENSIONS: ProtectionDimensionMeta[] = [
  {
    id: 'LIFE_MORTGAGE',
    labelEn: 'Life & Family Mortgage Liability',
    labelZh: '人壽與家庭按揭責任',
    baseRecommendedTargetHkd: 4500000,
  },
  {
    id: 'PRIVATE_HOSPITAL',
    labelEn: 'Private Hospital Surgery & Medical Reimbursement',
    labelZh: '私家醫院手術及醫療實報實銷',
    baseRecommendedTargetHkd: 450000,
  },
  {
    id: 'CRITICAL_ILLNESS',
    labelEn: 'Severe Critical Illness Lump-Sum Cash',
    labelZh: '嚴重危疾一筆過現金賠償',
    baseRecommendedTargetHkd: 1200000,
  },
  {
    id: 'CANCER_TARGETED',
    labelEn: 'Cancer Targeted & Immunotherapy Continuous Support',
    labelZh: '癌症標靶與免疫治療持續支援',
    baseRecommendedTargetHkd: 800000,
  },
  {
    id: 'ACCIDENT_INCOME',
    labelEn: 'Accidental Disability & Income Protection',
    labelZh: '意外傷殘與斷肢收入保障',
    baseRecommendedTargetHkd: 3500000,
  },
  {
    id: 'RETIREMENT_DEMENTIA',
    labelEn: 'Retirement Annuity & Elder Dementia Care Pool',
    labelZh: '退休年金與高齡腦退化照護池',
    baseRecommendedTargetHkd: 1200000,
  },
];

export function getSchemeMeta(schemeId?: TargetProtectionSchemeId): TargetProtectionSchemeMeta {
  return (
    TARGET_PROTECTION_SCHEMES.find((s) => s.id === schemeId) ||
    TARGET_PROTECTION_SCHEMES[2] // FAMILY_COMPREHENSIVE default
  );
}

export interface DimensionGapEvaluationRow {
  dimensionId: ProtectionDimensionId;
  labelEn: string;
  labelZh: string;
  recommendedTargetHkd: number;
  existingCoverHkd: number;
  newProposedCoverHkd: number;
  combinedCoverHkd: number;
  remainingGapHkd: number;
  remainingGapRmb: number;
  existingPct: number;
  newAddedPct: number;
  totalAchievementPct: number;
  isFullyCovered: boolean;
}

export interface SixDimensionGapAuditResult {
  clientId: string;
  schemeMeta: TargetProtectionSchemeMeta;
  loggedPoliciesCount: number;
  totalExistingAnnualPremiumHkd: number;
  totalExistingAnnualPremiumRmb: number;
  overallCompletionPct: number;
  rows: DimensionGapEvaluationRow[];
}

export function evaluateSixDimensionGapAudit(
  lead: ClientLead,
  overrideSchemeId?: TargetProtectionSchemeId,
  customAddedCoverOverride?: Partial<Record<ProtectionDimensionId, number>>
): SixDimensionGapAuditResult {
  const schemeId = overrideSchemeId || lead.targetSchemeId || 'FAMILY_COMPREHENSIVE';
  const schemeMeta = getSchemeMeta(schemeId);
  const existingPolicies = lead.existingPolicies || [];

  const stageTargetMultiplier: Record<FamilyStageCode, Partial<Record<ProtectionDimensionId, number>>> = {
    CHILDCARE_NUCLEAR: {
      LIFE_MORTGAGE: 1.0,
      PRIVATE_HOSPITAL: 1.0,
      CRITICAL_ILLNESS: 1.0,
      CANCER_TARGETED: 1.0,
      ACCIDENT_INCOME: 1.0,
      RETIREMENT_DEMENTIA: 1.0,
    },
    SINGLE_YOUNG_PRO: {
      LIFE_MORTGAGE: 0.45,
      PRIVATE_HOSPITAL: 1.0,
      CRITICAL_ILLNESS: 0.85,
      CANCER_TARGETED: 0.9,
      ACCIDENT_INCOME: 0.75,
      RETIREMENT_DEMENTIA: 0.7,
    },
    NEWLYWED_DUAL: {
      LIFE_MORTGAGE: 0.85,
      PRIVATE_HOSPITAL: 1.0,
      CRITICAL_ILLNESS: 1.0,
      CANCER_TARGETED: 1.0,
      ACCIDENT_INCOME: 0.9,
      RETIREMENT_DEMENTIA: 0.85,
    },
    HNW_CROSSBORDER: {
      LIFE_MORTGAGE: 1.5,
      PRIVATE_HOSPITAL: 1.35,
      CRITICAL_ILLNESS: 1.5,
      CANCER_TARGETED: 1.4,
      ACCIDENT_INCOME: 1.25,
      RETIREMENT_DEMENTIA: 2.5,
    },
    PRE_RETIREMENT: {
      LIFE_MORTGAGE: 0.7,
      PRIVATE_HOSPITAL: 1.2,
      CRITICAL_ILLNESS: 1.1,
      CANCER_TARGETED: 1.2,
      ACCIDENT_INCOME: 0.7,
      RETIREMENT_DEMENTIA: 1.8,
    },
  };

  const familyStage = lead.familyStage || 'CHILDCARE_NUCLEAR';
  const mults = stageTargetMultiplier[familyStage];
  const ageScalar = lead.age >= 48 ? 1.15 : lead.age <= 32 ? 0.92 : 1.0;

  const rows: DimensionGapEvaluationRow[] = SIX_PROTECTION_DIMENSIONS.map((dim) => {
    const dimMult = mults[dim.id] ?? 1.0;
    const rawTarget = dim.baseRecommendedTargetHkd * dimMult * (dim.id === 'PRIVATE_HOSPITAL' ? 1 : ageScalar);
    const recommendedTargetHkd = Math.round(rawTarget / 50000) * 50000;

    const existingCoverHkd = existingPolicies
      .filter((p) => p.dimensionId === dim.id)
      .reduce((acc, p) => acc + Math.max(0, p.coverageAmountHkd), 0);

    const baseNewCover = schemeMeta.defaultNewCoverageHkd[dim.id] ?? 0;
    const newProposedCoverHkd =
      customAddedCoverOverride?.[dim.id] !== undefined
        ? Math.max(0, customAddedCoverOverride[dim.id]!)
        : baseNewCover;

    const combinedCoverHkd = existingCoverHkd + newProposedCoverHkd;
    const remainingGapHkd = Math.max(0, recommendedTargetHkd - combinedCoverHkd);
    const remainingGapRmb = convertHkdToRmb(remainingGapHkd);

    const existingPct = Math.min(100, Math.round((existingCoverHkd / Math.max(1, recommendedTargetHkd)) * 100));
    const totalAchievementPct = Math.min(
      100,
      Math.round((combinedCoverHkd / Math.max(1, recommendedTargetHkd)) * 100)
    );
    const newAddedPct = Math.max(0, totalAchievementPct - existingPct);

    return {
      dimensionId: dim.id,
      labelEn: dim.labelEn,
      labelZh: dim.labelZh,
      recommendedTargetHkd,
      existingCoverHkd,
      newProposedCoverHkd,
      combinedCoverHkd,
      remainingGapHkd,
      remainingGapRmb,
      existingPct,
      newAddedPct,
      totalAchievementPct,
      isFullyCovered: remainingGapHkd === 0,
    };
  });

  const totalExistingAnnualPremiumHkd = existingPolicies.reduce(
    (acc, p) => acc + Math.max(0, p.annualPremiumHkd),
    0
  );
  const overallCompletionPct = Math.round(
    rows.reduce((acc, r) => acc + r.totalAchievementPct, 0) / rows.length
  );

  return {
    clientId: lead.id,
    schemeMeta,
    loggedPoliciesCount: existingPolicies.length,
    totalExistingAnnualPremiumHkd,
    totalExistingAnnualPremiumRmb: convertHkdToRmb(totalExistingAnnualPremiumHkd),
    overallCompletionPct,
    rows,
  };
}

// ============================================================================
// SECTION 04: DUAL-CURRENCY INTERACTIVE CALCULATOR, RIDER BUNDLING & CLAIM SIMULATOR
// ============================================================================

export type BundleRiderId =
  | 'RIDER_SEMI_PRIVATE_VHIS'
  | 'RIDER_CI_EARLY_BOOST'
  | 'RIDER_TERM_MORTGAGE'
  | 'RIDER_ACCIDENT_DISABILITY'
  | 'RIDER_PREMIUM_WAIVER';

export interface BundleRiderSpec {
  id: BundleRiderId;
  titleEn: string;
  titleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  baseAnnualHkd: number;
  dimensionBoostsHkd: Partial<Record<ProtectionDimensionId, number>>;
  vhisTaxEligibleHkd?: number;
}

export const MODULAR_RIDER_OPTIONS: BundleRiderSpec[] = [
  {
    id: 'RIDER_SEMI_PRIVATE_VHIS',
    titleEn: 'Semi-Private Full-Cover VHIS Rider (HK$20k Deductible Bridge)',
    titleZh: '私家醫院半私家房全數賠付 VHIS 醫療附約（銜接團保自付額）',
    descriptionEn: 'Covers HKSH/Gleneagles semi-private ward, surgeon & non-surgical cancer targeted therapy.',
    descriptionZh: '全數賠償養和／港怡半私家房手術室、醫生費及非手術癌症標靶／免疫治療。',
    baseAnnualHkd: 8400,
    dimensionBoostsHkd: {
      PRIVATE_HOSPITAL: 590000,
      CANCER_TARGETED: 320000,
    },
    vhisTaxEligibleHkd: 8000,
  },
  {
    id: 'RIDER_CI_EARLY_BOOST',
    titleEn: 'First 10-Yr +50% Early & Multi-Cancer Waiver Rider',
    titleZh: '首 10 年危疾 +50% 額外賠償及癌症 1 年等候期多重守護附約',
    descriptionEn: 'Boosts lump-sum CI cash pool and unlocks repeated payout for persistent/recurrent cancer.',
    descriptionZh: '首 10 個保單年度額外升級 50% 保額，並支援癌症復發／持續治療 1 年多重賠付。',
    baseAnnualHkd: 5800,
    dimensionBoostsHkd: {
      CRITICAL_ILLNESS: 600000,
      CANCER_TARGETED: 480000,
    },
  },
  {
    id: 'RIDER_TERM_MORTGAGE',
    titleEn: 'Family Mortgage & Education Term Life Hedge Rider',
    titleZh: '家庭按揭責任及子女教育定期人壽對沖附約',
    descriptionEn: 'High-leverage pure term rider locking HK$4.5M+ family debt & income protection.',
    descriptionZh: '以極低槓桿保費鎖定 HK$450 萬+ 家庭樓宇按揭與子女升學安全網。',
    baseAnnualHkd: 3600,
    dimensionBoostsHkd: {
      LIFE_MORTGAGE: 4500000,
    },
  },
  {
    id: 'RIDER_ACCIDENT_DISABILITY',
    titleEn: 'Accidental Dismemberment & Double Income Indemnity Rider',
    titleZh: '意外傷殘、斷肢及雙倍收入替代附約（補足斷肢缺口）',
    descriptionEn: 'Closes the accidental disability income gap with monthly disability income + medical top-up.',
    descriptionZh: '針對意外斷肢及永久傷殘按月派發收入替代現金流，直接補足第 5 維度缺口。',
    baseAnnualHkd: 2900,
    dimensionBoostsHkd: {
      ACCIDENT_INCOME: 2500000,
    },
  },
  {
    id: 'RIDER_PREMIUM_WAIVER',
    titleEn: 'Payor & Early CI Future Premium Waiver Rider',
    titleZh: '受保人早期危疾／身故未來保費雙重豁免附約',
    descriptionEn: 'Waives all remaining base & rider premiums upon diagnosis of early CIS/coronary angioplasty.',
    descriptionZh: '一經確診原位癌、通波仔或嚴重危疾即自動豁免餘下所有基本及附約保費。',
    baseAnnualHkd: 1950,
    dimensionBoostsHkd: {
      RETIREMENT_DEMENTIA: 450000,
    },
  },
];

export type ClaimScenarioId =
  | 'HOSPITAL_MIN_INVASIVE'
  | 'CANCER_TARGETED_24M'
  | 'MAJOR_CI_RECURRENCE'
  | 'ACCIDENT_DISABILITY_LEAVE'
  | 'BREADWINNER_MORTGAGE';

export interface ClaimScenarioPreset {
  id: ClaimScenarioId;
  titleEn: string;
  titleZh: string;
  hospitalOrSettingZh: string;
  hospitalOrSettingEn: string;
  totalMedicalOrIncomeLossHkd: number;
  primaryDimension: ProtectionDimensionId;
  secondaryDimension?: ProtectionDimensionId;
  descriptionZh: string;
  descriptionEn: string;
}

export const CLAIM_SCENARIO_PRESETS: ClaimScenarioPreset[] = [
  {
    id: 'HOSPITAL_MIN_INVASIVE',
    titleEn: 'HKSH / Gleneagles Semi-Private Minimally Invasive Surgery',
    titleZh: '養和／港怡半私家房微創手術及 5 日住院帳單',
    hospitalOrSettingZh: '香港養和醫院 · 半私家房微創手術 + 標靶病理檢驗',
    hospitalOrSettingEn: 'HK Sanatorium & Hospital · Semi-Private Laparoscopic Surgery',
    totalMedicalOrIncomeLossHkd: 320000,
    primaryDimension: 'PRIVATE_HOSPITAL',
    descriptionZh: '包含外科醫生費、麻醉科、手術室及術後複診；一般公司普通房團保限額僅賠約 HK$60,000。',
    descriptionEn: 'Includes surgeon, anaesthetist, OT & post-op; standard group ward plans cap around HK$60k.',
  },
  {
    id: 'CANCER_TARGETED_24M',
    titleEn: 'Early CIS + 24-Month Targeted & Immunotherapy Drugs',
    titleZh: '早期癌症／原位癌兼 24 個月自費標靶及免疫治療',
    hospitalOrSettingZh: '港安／養和日間腫瘤中心 · 非手術自費標靶藥 24 個月',
    hospitalOrSettingEn: 'HKAH Oncology Day Centre · 24-Month Non-Surgical Targeted Drugs',
    totalMedicalOrIncomeLossHkd: 1180000,
    primaryDimension: 'CANCER_TARGETED',
    secondaryDimension: 'CRITICAL_ILLNESS',
    descriptionZh: '公立醫院非安全網自費標靶藥平均每月 HK$45,000+，結合 VHIS 癌症保額及危疾現金池雙重支援。',
    descriptionEn: 'Non-subsidized targeted drugs average HK$45k+/month; supported by both VHIS & CI cash lump sum.',
  },
  {
    id: 'MAJOR_CI_RECURRENCE',
    titleEn: 'Major Heart Attack + Recurrent Cancer (Dual-Claim Stress)',
    titleZh: '急性心肌梗塞＋第 2 次癌症復發雙重危疾停工期',
    hospitalOrSettingZh: '24 個月家庭收入替代 + 康復護理解僱替代成本',
    hospitalOrSettingEn: '24-Month Household Income Replacement + Recovery Care',
    totalMedicalOrIncomeLossHkd: 1650000,
    primaryDimension: 'CRITICAL_ILLNESS',
    secondaryDimension: 'CANCER_TARGETED',
    descriptionZh: '單次賠償保單於首次索償後即時失效；多重危疾配合豁免保費附約於 1 年等候期後再賠 100%。',
    descriptionEn: 'Single-claim plans terminate after claim 1; multi-claim + waiver pays again after cancer waiting period.',
  },
  {
    id: 'ACCIDENT_DISABILITY_LEAVE',
    titleEn: 'Severe Traffic Accident & Temporary Partial Disability',
    titleZh: '嚴重交通意外骨折及 18 個月傷殘收入損失',
    hospitalOrSettingZh: '骨科植入物手術＋物理治療及收入中斷總衝擊',
    hospitalOrSettingEn: 'Orthopaedic Implant Surgery + 18-Mo Disability Income Loss',
    totalMedicalOrIncomeLossHkd: 920000,
    primaryDimension: 'ACCIDENT_INCOME',
    secondaryDimension: 'PRIVATE_HOSPITAL',
    descriptionZh: '一般醫療保險僅賠付手術帳單，不賠停工期間樓宇按揭及家庭生活費，需依靠意外收入保障附約。',
    descriptionEn: 'Medical insurance covers hospital bills only, not lost salary/mortgage during recovery.',
  },
  {
    id: 'BREADWINNER_MORTGAGE',
    titleEn: 'Primary Breadwinner Mortgage & Child Education Protection',
    titleZh: '家庭經濟支柱突發身故（按揭清償＋子女教育金）',
    hospitalOrSettingZh: '港島／九龍住宅餘下按揭 HK$4.2M + 子女升學儲備',
    hospitalOrSettingEn: 'Outstanding HK$4.2M Residential Mortgage + Tuition Reserve',
    totalMedicalOrIncomeLossHkd: 5600000,
    primaryDimension: 'LIFE_MORTGAGE',
    descriptionZh: '確保伴侶與子女無需在樓價波動期被逼賣樓套現，完整保留物業及海外升學計劃。',
    descriptionEn: 'Ensures spouse and children keep the family home and university savings intact.',
  },
];

export interface DualCurrencySimulationResult {
  fxRateHkdToRmb: number;
  basePlanAnnualHkd: number;
  basePlanAnnualRmb: number;
  ridersAnnualHkd: number;
  ridersAnnualRmb: number;
  bundleDiscountPct: number;
  bundleDiscountHkd: number;
  netAnnualPremiumHkd: number;
  netAnnualPremiumRmb: number;
  netAnnualPremiumUsd: number;
  monthlyEquivalentHkd: number;
  monthlyEquivalentRmb: number;
  estimatedTaxSavedHkd: number;
  effectiveAfterTaxAnnualHkd: number;
  effectiveAfterTaxAnnualRmb: number;
  budgetUtilizationPct: number;
  withinClientBudget: boolean;
  totalCombinedDimensionCoverHkd: Record<ProtectionDimensionId, number>;
  scenarioOutcome: {
    scenario: ClaimScenarioPreset;
    totalEventCostHkd: number;
    existingPolicyPayoutHkd: number;
    newBundlePayoutHkd: number;
    totalCoveredHkd: number;
    clientOutOfPocketHkd: number;
    clientOutOfPocketRmb: number;
    surplusCashBufferHkd: number;
  };
}

export function getDefaultRidersForScheme(schemeId?: TargetProtectionSchemeId): BundleRiderId[] {
  switch (schemeId) {
    case 'VHIS_HIGH_END':
      return ['RIDER_SEMI_PRIVATE_VHIS', 'RIDER_PREMIUM_WAIVER'];
    case 'MULTI_CI':
      return ['RIDER_CI_EARLY_BOOST', 'RIDER_PREMIUM_WAIVER'];
    case 'MULTI_FX_LEGACY':
      return ['RIDER_SEMI_PRIVATE_VHIS', 'RIDER_PREMIUM_WAIVER'];
    case 'FAMILY_COMPREHENSIVE':
    default:
      return [
        'RIDER_SEMI_PRIVATE_VHIS',
        'RIDER_CI_EARLY_BOOST',
        'RIDER_TERM_MORTGAGE',
        'RIDER_PREMIUM_WAIVER',
      ];
  }
}

export function calculateDualCurrencyBundleSimulation(params: {
  lead: ClientLead;
  selectedPlan?: InsurancePlan | null;
  selectedRiderIds: BundleRiderId[];
  paymentMode: 'ANNUAL' | 'MONTHLY';
  paymentTermYears: number;
  fxRateHkdToRmb?: number;
  scenarioId: ClaimScenarioId;
}): DualCurrencySimulationResult {
  const fx = params.fxRateHkdToRmb ?? HKD_TO_RMB_RATE;
  const schemeMeta = getSchemeMeta(params.lead.targetSchemeId);
  const ageFactor = Math.max(0.78, Math.min(1.85, 1 + (params.lead.age - 35) * 0.024));
  const smokerFactor = params.lead.isSmoker ? 1.24 : 1.0;
  const riskMeta =
    OCCUPATION_RISK_OPTIONS.find((o) => o.code === params.lead.occupationRiskClass) ||
    OCCUPATION_RISK_OPTIONS[0];

  const effectiveTerm = params.selectedPlan
    ? params.selectedPlan.supportedPaymentTerms.includes(params.paymentTermYears)
      ? params.paymentTermYears
      : params.selectedPlan.supportedPaymentTerms[params.selectedPlan.supportedPaymentTerms.length - 1]
    : params.paymentTermYears;

  const baseFromPlanHkd = params.selectedPlan
    ? Math.round(
        params.selectedPlan.baseRatePer1000UsdAge35Ns *
          7.8 *
          (params.selectedPlan.category === PlanCategory.VHIS ||
          params.selectedPlan.category === PlanCategory.HIGH_END_MEDICAL
            ? 8
            : 12) *
          (effectiveTerm <= 5 ? 1.45 : effectiveTerm >= 20 ? 0.82 : 1.0)
      )
    : schemeMeta.baseAnnualPremiumHkd;

  const basePlanAnnualHkd = Math.round(
    (params.selectedPlan ? Math.max(6800, Math.min(220000, baseFromPlanHkd)) : schemeMeta.baseAnnualPremiumHkd) *
      ageFactor *
      smokerFactor *
      (params.lead.targetSchemeId === 'FAMILY_COMPREHENSIVE' && !params.selectedPlan ? 1 / ageFactor : 1)
  );

  // Keep Daniel's exact base scheme premium stable when using target scheme baseline
  const stabilizedBaseHkd = !params.selectedPlan
    ? Math.round(schemeMeta.baseAnnualPremiumHkd * (params.lead.id === 'lead-daniel-chan' ? 1 : ageFactor) * smokerFactor)
    : basePlanAnnualHkd;

  const activeRiders = MODULAR_RIDER_OPTIONS.filter((r) => params.selectedRiderIds.includes(r.id));
  const ridersRawHkd = activeRiders.reduce((sum, r) => {
    const occMult = r.id === 'RIDER_ACCIDENT_DISABILITY' ? riskMeta.multiplier : 1.0;
    return sum + Math.round(r.baseAnnualHkd * ageFactor * smokerFactor * occMult);
  }, 0);

  // Multi-rider bundling discount: 4% per 2 riders, up to 12%
  const bundleDiscountPct =
    activeRiders.length >= 4 ? 12 : activeRiders.length === 3 ? 9 : activeRiders.length === 2 ? 5 : 0;

  const subtotalBeforeModeHkd = stabilizedBaseHkd + ridersRawHkd;
  const bundleDiscountHkd = Math.round((subtotalBeforeModeHkd * bundleDiscountPct) / 100);
  const annualAfterDiscountHkd = Math.max(0, subtotalBeforeModeHkd - bundleDiscountHkd);
  const modeSurcharge = params.paymentMode === 'MONTHLY' ? 1.04 : 1.0;
  const netAnnualPremiumHkd = Math.round(annualAfterDiscountHkd * modeSurcharge);

  const planVhisTaxCap =
    params.selectedPlan?.category === PlanCategory.VHIS ? Math.min(8000, stabilizedBaseHkd) : 0;
  const vhisTaxCap =
    planVhisTaxCap + activeRiders.reduce((acc, r) => acc + (r.vhisTaxEligibleHkd || 0), 0);
  const schemeQdapBonus =
    params.lead.targetSchemeId === 'MULTI_FX_LEGACY' || params.selectedPlan?.category === PlanCategory.QDAP
      ? Math.min(60000, stabilizedBaseHkd)
      : 0;
  const estimatedTaxSavedHkd = Math.round((Math.min(16000, vhisTaxCap) + schemeQdapBonus) * 0.17);
  const effectiveAfterTaxAnnualHkd = Math.max(0, netAnnualPremiumHkd - estimatedTaxSavedHkd);

  const budgetHkd = params.lead.annualBudgetHkd || 48000;
  const budgetUtilizationPct = Math.round((netAnnualPremiumHkd / Math.max(1, budgetHkd)) * 100);

  // Compute combined coverage across 6 dimensions (existing + locked plan or scheme + toggled riders)
  const existing = params.lead.existingPolicies || [];
  const totalCombinedDimensionCoverHkd: Record<ProtectionDimensionId, number> = {
    LIFE_MORTGAGE: 0,
    PRIVATE_HOSPITAL: 0,
    CRITICAL_ILLNESS: 0,
    CANCER_TARGETED: 0,
    ACCIDENT_INCOME: 0,
    RETIREMENT_DEMENTIA: 0,
  };

  const selectedPlanCategoryBoosts: Record<ProtectionDimensionId, number> | null = params.selectedPlan
    ? {
        LIFE_MORTGAGE:
          params.selectedPlan.category === PlanCategory.TERM_LIFE ||
          params.selectedPlan.category === PlanCategory.UNIVERSAL_LIFE
            ? 5500000
            : params.selectedPlan.category === PlanCategory.PARTICIPATING_SAVINGS
            ? 2600000
            : 1200000,
        PRIVATE_HOSPITAL:
          params.selectedPlan.category === PlanCategory.HIGH_END_MEDICAL
            ? 1200000
            : params.selectedPlan.category === PlanCategory.VHIS
            ? 780000
            : 200000,
        CRITICAL_ILLNESS:
          params.selectedPlan.category === PlanCategory.CRITICAL_ILLNESS ? 1400000 : 300000,
        CANCER_TARGETED:
          params.selectedPlan.category === PlanCategory.HIGH_END_MEDICAL ||
          params.selectedPlan.category === PlanCategory.CRITICAL_ILLNESS
            ? 920000
            : params.selectedPlan.category === PlanCategory.VHIS
            ? 680000
            : 250000,
        ACCIDENT_INCOME:
          params.selectedPlan.category === PlanCategory.GENERAL_GI ? 2200000 : 1200000,
        RETIREMENT_DEMENTIA:
          params.selectedPlan.category === PlanCategory.PARTICIPATING_SAVINGS
            ? 3400000
            : params.selectedPlan.category === PlanCategory.QDAP
            ? 2400000
            : 600000,
      }
    : null;

  for (const dim of SIX_PROTECTION_DIMENSIONS) {
    const existingAmt = existing
      .filter((p) => p.dimensionId === dim.id)
      .reduce((acc, p) => acc + p.coverageAmountHkd, 0);
    const schemeBaseAmt = selectedPlanCategoryBoosts
      ? selectedPlanCategoryBoosts[dim.id]
      : Math.round((schemeMeta.defaultNewCoverageHkd[dim.id] || 0) * 0.65);
    const riderBoostAmt = activeRiders.reduce(
      (acc, r) => acc + (r.dimensionBoostsHkd[dim.id] || 0),
      0
    );
    totalCombinedDimensionCoverHkd[dim.id] = existingAmt + schemeBaseAmt + riderBoostAmt;
  }

  // Scenario simulation
  const scenario =
    CLAIM_SCENARIO_PRESETS.find((s) => s.id === params.scenarioId) || CLAIM_SCENARIO_PRESETS[0];

  const existingPrimary = existing
    .filter((p) => p.dimensionId === scenario.primaryDimension)
    .reduce((acc, p) => acc + p.coverageAmountHkd, 0);

  // If lead has group medical summary note even before manual entry, recognize realistic HK$60k group cap unless explicitly logged
  const baselineGroupMedicalHkd =
    scenario.primaryDimension === 'PRIVATE_HOSPITAL' && existingPrimary === 0 && (params.lead.existingSummaryNote || '').includes('60,000')
      ? 60000
      : existingPrimary;

  const newPlanCapacity =
    totalCombinedDimensionCoverHkd[scenario.primaryDimension] -
    existingPrimary +
    (scenario.secondaryDimension ? Math.round((totalCombinedDimensionCoverHkd[scenario.secondaryDimension] || 0) * 0.4) : 0);

  const existingPolicyPayoutHkd = Math.min(scenario.totalMedicalOrIncomeLossHkd, baselineGroupMedicalHkd);
  const uncoveredAfterExisting = Math.max(0, scenario.totalMedicalOrIncomeLossHkd - existingPolicyPayoutHkd);
  const newBundlePayoutHkd =
    scenario.primaryDimension === 'CRITICAL_ILLNESS' || scenario.primaryDimension === 'LIFE_MORTGAGE'
      ? newPlanCapacity
      : Math.min(uncoveredAfterExisting + Math.round(uncoveredAfterExisting * 0.15), newPlanCapacity);

  const totalCoveredHkd = existingPolicyPayoutHkd + newBundlePayoutHkd;
  const clientOutOfPocketHkd = Math.max(0, scenario.totalMedicalOrIncomeLossHkd - totalCoveredHkd);
  const surplusCashBufferHkd = Math.max(0, totalCoveredHkd - scenario.totalMedicalOrIncomeLossHkd);

  return {
    fxRateHkdToRmb: fx,
    basePlanAnnualHkd: stabilizedBaseHkd,
    basePlanAnnualRmb: convertHkdToRmb(stabilizedBaseHkd, fx),
    ridersAnnualHkd: ridersRawHkd,
    ridersAnnualRmb: convertHkdToRmb(ridersRawHkd, fx),
    bundleDiscountPct,
    bundleDiscountHkd,
    netAnnualPremiumHkd,
    netAnnualPremiumRmb: convertHkdToRmb(netAnnualPremiumHkd, fx),
    netAnnualPremiumUsd: Math.round(netAnnualPremiumHkd * HKD_TO_USD_RATE),
    monthlyEquivalentHkd: Math.round(netAnnualPremiumHkd / 12),
    monthlyEquivalentRmb: convertHkdToRmb(Math.round(netAnnualPremiumHkd / 12), fx),
    estimatedTaxSavedHkd,
    effectiveAfterTaxAnnualHkd,
    effectiveAfterTaxAnnualRmb: convertHkdToRmb(effectiveAfterTaxAnnualHkd, fx),
    budgetUtilizationPct,
    withinClientBudget: netAnnualPremiumHkd <= budgetHkd,
    totalCombinedDimensionCoverHkd,
    scenarioOutcome: {
      scenario,
      totalEventCostHkd: scenario.totalMedicalOrIncomeLossHkd,
      existingPolicyPayoutHkd,
      newBundlePayoutHkd,
      totalCoveredHkd,
      clientOutOfPocketHkd,
      clientOutOfPocketRmb: convertHkdToRmb(clientOutOfPocketHkd, fx),
      surplusCashBufferHkd,
    },
  };
}

export interface DynamicSchemeBenchmark {
  scheme: TargetProtectionSchemeMeta;
  estimatedAnnualHkd: number;
  estimatedAnnualRmb: number;
  monthlyEquivalentHkd: number;
  actuarialBasisEn: string;
  actuarialBasisZh: string;
  matchedRepresentativePlans: InsurancePlan[];
}

const FLAGSHIP_INSURER_PRIORITY: Record<string, number> = {
  AIA: 1,
  FWD: 2,
  MANULIFE: 3,
  PRU: 4,
  AXA: 5,
  SUNLIFE: 6,
  BOWTIE: 7,
  BOCLIFE: 8,
  CHINALIFE: 9,
  FTLIFE: 10,
};

/**
 * Computes transparent, age- and smoker-calibrated annual premium benchmarks for the 4 Target
 * Protection Architectures in Stage 01, paired with real matched representative HK plans so
 * advisors and clients immediately know what each HK$ / RMB figure represents.
 */
export function evaluateDynamicSchemeBenchmarks(params: {
  lead: ClientLead;
  allPlans: InsurancePlan[];
  fxRateHkdToRmb?: number;
}): DynamicSchemeBenchmark[] {
  const { lead, allPlans, fxRateHkdToRmb = HKD_TO_RMB_RATE } = params;
  const clampedAge = Math.max(18, Math.min(80, lead.age || 36));
  const ageDeltaFrom36 = clampedAge - 36;
  const riskAgeFactor = Math.max(0.72, Math.min(2.15, 1 + ageDeltaFrom36 * 0.026));
  const smokerRiskFactor = lead.isSmoker ? 1.24 : 1.0;
  const smokerTextZh = lead.isSmoker ? '吸煙' : '非吸煙';
  const smokerTextEn = lead.isSmoker ? 'Smoker' : 'Non-Smoker';

  return TARGET_PROTECTION_SCHEMES.map((scheme) => {
    const isSavingsLegacy = scheme.id === 'MULTI_FX_LEGACY';
    const rawHkd = isSavingsLegacy
      ? scheme.baseAnnualPremiumHkd * (clampedAge >= 48 ? 1.15 : clampedAge <= 28 ? 0.85 : 1.0)
      : scheme.baseAnnualPremiumHkd * riskAgeFactor * smokerRiskFactor;

    const estimatedAnnualHkd =
      clampedAge === 36 && !lead.isSmoker
        ? scheme.baseAnnualPremiumHkd
        : Math.round(rawHkd / 100) * 100;
    const estimatedAnnualRmb = convertHkdToRmb(estimatedAnnualHkd, fxRateHkdToRmb);

    const basisMap: Record<TargetProtectionSchemeId, { en: string; zh: string }> = {
      VHIS_HIGH_END: {
        en: `Age ${clampedAge} ${smokerTextEn} · Est. Asia Semi-Private High-End VHIS (HK$0–$16k deductible)`,
        zh: `按 ${clampedAge}歲${smokerTextZh}精算 · 亞洲半私家房高端自願醫保代表年費`,
      },
      MULTI_CI: {
        en: `Age ${clampedAge} ${smokerTextEn} · Est. HK$1.2M Multi-Claim CI (15–20yr pay)`,
        zh: `按 ${clampedAge}歲${smokerTextZh}精算 · HK$120萬保額多重危疾（15–20年供）代表年費`,
      },
      FAMILY_COMPREHENSIVE: {
        en: `Age ${clampedAge} ${smokerTextEn} · Est. 3-in-1 Term Life + Multi-CI + Semi-Private VHIS`,
        zh: `按 ${clampedAge}歲${smokerTextZh}精算 · 按揭定壽＋危疾＋半私家醫保三合一組合年費`,
      },
      MULTI_FX_LEGACY: {
        en: `5–10yr Pay Multi-FX Participating Savings Benchmark (USD/HKD/CNY switchable)`,
        zh: `5–10年供款多元貨幣分紅傳承儲蓄建議年供基準（支援轉貨幣／分拆）`,
      },
    };

    const candidates = allPlans
      .filter((p) => scheme.recommendedCategories.includes(p.category))
      .sort((a, b) => {
        const pa = FLAGSHIP_INSURER_PRIORITY[a.insurerCode] ?? 50;
        const pb = FLAGSHIP_INSURER_PRIORITY[b.insurerCode] ?? 50;
        if (pa !== pb) return pa - pb;
        return (b.fulfillmentRatio || 95) - (a.fulfillmentRatio || 95);
      });

    // Pick up to 3 distinct insurers so user sees breadth of market benchmark
    const distinctPlans: InsurancePlan[] = [];
    const seenInsurers = new Set<string>();
    for (const plan of candidates) {
      if (seenInsurers.has(plan.insurerCode)) continue;
      seenInsurers.add(plan.insurerCode);
      distinctPlans.push(plan);
      if (distinctPlans.length >= 3) break;
    }

    return {
      scheme,
      estimatedAnnualHkd,
      estimatedAnnualRmb,
      monthlyEquivalentHkd: Math.round(estimatedAnnualHkd / 12),
      actuarialBasisEn: basisMap[scheme.id].en,
      actuarialBasisZh: basisMap[scheme.id].zh,
      matchedRepresentativePlans: distinctPlans,
    };
  });
}

export type RiderPlanMatchStatus =
  | 'BUILT_IN_MAIN_PLAN'
  | 'RECOMMENDED_COMPLEMENT'
  | 'STANDALONE_ADDON'
  | 'UNMATCHED_SCHEME_MODE';

export interface PlanMatchedRiderQuoteItem {
  spec: BundleRiderSpec;
  checked: boolean;
  annualPremiumHkd: number;
  annualPremiumRmb: number;
  displayTitleEn: string;
  displayTitleZh: string;
  planMatchStatus: RiderPlanMatchStatus;
  matchBadgeEn: string;
  matchBadgeZh: string;
  pricingNoteEn: string;
  pricingNoteZh: string;
}

const DIGITAL_STANDALONE_INSURERS = new Set(['BOWTIE', 'BLUE', 'ZAINSURE', 'ONEDEGREE']);

/**
 * Matches the 5 modular riders against the currently locked anchor plan FIRST,
 * adapting insurer branding, detecting built-in main-plan coverage overlap, and
 * computing exact age/smoker/occupation-scaled rider HKD & RMB premiums.
 */
export function evaluatePlanMatchedRiderQuotes(params: {
  lead: ClientLead;
  selectedPlan?: InsurancePlan | null;
  selectedRiderIds: BundleRiderId[];
  fxRateHkdToRmb?: number;
}): PlanMatchedRiderQuoteItem[] {
  const { lead, selectedPlan, selectedRiderIds, fxRateHkdToRmb = HKD_TO_RMB_RATE } = params;
  const ageFactor = Math.max(0.78, Math.min(1.85, 1 + (lead.age - 35) * 0.024));
  const smokerFactor = lead.isSmoker ? 1.24 : 1.0;
  const riskMeta =
    OCCUPATION_RISK_OPTIONS.find((o) => o.code === lead.occupationRiskClass) ||
    OCCUPATION_RISK_OPTIONS[0];
  const smokerZh = lead.isSmoker ? '吸煙' : '非吸煙';
  const smokerEn = lead.isSmoker ? 'Smoker' : 'Non-Smoker';

  return MODULAR_RIDER_OPTIONS.map((spec) => {
    const occMult = spec.id === 'RIDER_ACCIDENT_DISABILITY' ? riskMeta.multiplier : 1.0;
    const annualPremiumHkd = Math.round(spec.baseAnnualHkd * ageFactor * smokerFactor * occMult);
    const annualPremiumRmb = convertHkdToRmb(annualPremiumHkd, fxRateHkdToRmb);
    const checked = selectedRiderIds.includes(spec.id);

    if (!selectedPlan) {
      return {
        spec,
        checked,
        annualPremiumHkd,
        annualPremiumRmb,
        displayTitleEn: spec.titleEn,
        displayTitleZh: spec.titleZh,
        planMatchStatus: 'UNMATCHED_SCHEME_MODE',
        matchBadgeEn: 'Match Main Plan First to Lock Insurer Rider',
        matchBadgeZh: '建議先配對主約計劃以鎖定保司專屬附約',
        pricingNoteEn: `Age ${lead.age} ${smokerEn} rate`,
        pricingNoteZh: `${lead.age}歲${smokerZh}精算費率`,
      };
    }

    const isDigitalStandalone = DIGITAL_STANDALONE_INSURERS.has(selectedPlan.insurerCode);
    const cat = selectedPlan.category;

    const isBuiltInOverlap =
      (spec.id === 'RIDER_SEMI_PRIVATE_VHIS' &&
        (cat === PlanCategory.HIGH_END_MEDICAL || cat === PlanCategory.VHIS)) ||
      (spec.id === 'RIDER_CI_EARLY_BOOST' && cat === PlanCategory.CRITICAL_ILLNESS) ||
      (spec.id === 'RIDER_TERM_MORTGAGE' && cat === PlanCategory.TERM_LIFE);

    let planMatchStatus: RiderPlanMatchStatus = 'RECOMMENDED_COMPLEMENT';
    let matchBadgeEn = `[${selectedPlan.insurerCode}] Compatible Rider`;
    let matchBadgeZh = `[${selectedPlan.insurerCode}] 同保司直掛附約`;

    if (isBuiltInOverlap) {
      planMatchStatus = 'BUILT_IN_MAIN_PLAN';
      matchBadgeEn = `Main Plan Already Covers (${selectedPlan.insurerCode}) — Optional Top-Up`;
      matchBadgeZh = `主約已內建同類核心保障（可免重複加購／或作倍增升級）`;
    } else if (isDigitalStandalone) {
      planMatchStatus = 'STANDALONE_ADDON';
      matchBadgeEn = `Standalone Pair Policy (${selectedPlan.insurerCode} Digital)`;
      matchBadgeZh = `獨立保單組合配搭（${selectedPlan.insurerNameZh}純網上無捆綁主附約）`;
    } else if (spec.id === 'RIDER_SEMI_PRIVATE_VHIS') {
      matchBadgeEn = `[${selectedPlan.insurerCode}] Unlocks Private Hospital Cashless LOG`;
      matchBadgeZh = `[${selectedPlan.insurerCode} 推薦加掛] 補齊私家醫院半私家房免找數資格`;
    }

    const prefixZh = isDigitalStandalone
      ? `【獨立配搭】`
      : `【${selectedPlan.insurerNameZh}適配】`;
    const prefixEn = isDigitalStandalone
      ? `[Standalone Add-On] `
      : `[${selectedPlan.insurerCode} Rider] `;

    return {
      spec,
      checked,
      annualPremiumHkd,
      annualPremiumRmb,
      displayTitleEn: `${prefixEn}${spec.titleEn}`,
      displayTitleZh: `${prefixZh}${spec.titleZh}`,
      planMatchStatus,
      matchBadgeEn,
      matchBadgeZh,
      pricingNoteEn: `Age ${lead.age} ${smokerEn}${occMult > 1 ? ` · Occ x${occMult}` : ''}`,
      pricingNoteZh: `${lead.age}歲${smokerZh}${occMult > 1 ? ` · 職級 x${occMult}` : ''}精算`,
    };
  });
}

// ============================================================================
// SECTION 07: PERSONALIZED CLIENT OBJECTION ROLEPLAY STUDIO
// ============================================================================

export interface PersonalizedObjectionScript {
  id: string;
  categoryEn: string;
  categoryZh: string;
  clientObjectionEn: string;
  clientObjectionZh: string;
  rootPsychologyEn: string;
  rootPsychologyZh: string;
  advisorScriptEn: string;
  advisorScriptZh: string;
  proofPointsEn: string[];
  proofPointsZh: string[];
  nextClosingActionEn: string;
  nextClosingActionZh: string;
}

export function buildPersonalizedObjectionScripts(params: {
  lead: ClientLead;
  intermediary: IntermediaryProfile;
  plan?: InsurancePlan | null;
}): PersonalizedObjectionScript[] {
  const { lead, intermediary, plan } = params;
  const schemeMeta = getSchemeMeta(lead.targetSchemeId);
  const budgetHkd = lead.annualBudgetHkd || 48000;
  const budgetRmb = convertHkdToRmb(budgetHkd);
  const monthlyBudgetHkd = Math.round(budgetHkd / 12);
  const planNameZh = plan?.nameZh || schemeMeta.titleZh;
  const planNameEn = plan?.nameEn || schemeMeta.titleEn;
  const existingNote =
    lead.existingSummaryNote ||
    '現有基礎保障與私家醫院實報實銷仍有明顯缺口';
  const priorityGoal =
    lead.priorityGoalNote ||
    '全面補足私家醫療、百萬危疾及家庭責任安全網';
  const isMcv = lead.residency === 'MCV';

  return [
    {
      id: 'OBJ_BUDGET_COST',
      categoryEn: 'Budget & Annual Premium',
      categoryZh: '保費預算與每月現金流',
      clientObjectionEn: `"The annual premium looks high right now — can we wait until next bonus season?"`,
      clientObjectionZh: `「${lead.fullNameZh}，呢個方案一年要二、三萬幾，會唔會佔用我太多現金流？我係咪應該等下年出花紅先考慮？」`,
      rootPsychologyEn: `${lead.fullNameEn} (${lead.age}y) anchors on lump-sum annual outflow rather than comparing against their HK$${budgetHkd.toLocaleString()} annual budget and rising age-band rates.`,
      rootPsychologyZh: `客戶（${lead.age} 歲）容易聚焦於單筆年繳金額，而忽略其本身已預留 HK$ ${budgetHkd.toLocaleString()}（約 ¥ ${budgetRmb.toLocaleString()}）年度預算及下個生日年齡保費上調風險。`,
      advisorScriptEn: `"${lead.fullNameEn}, I completely understand protecting monthly cash flow for your family. When we benchmark against your HK$${budgetHkd.toLocaleString()}/yr budget (~HK$${monthlyBudgetHkd.toLocaleString()}/mo), ${planNameEn} actually keeps you comfortably within budget—and using the HK$20,000 deductible VHIS bridge cuts medical premiums by ~38%. Plus locking in at age ${lead.age} avoids next year's age-band step-up and preserves insurability."`,
      advisorScriptZh: `「${lead.fullNameZh}，我非常理解您要兼顧家庭現金流！其實按您設定嘅年度預算 HK$ ${budgetHkd.toLocaleString()}（即每月約 HK$ ${monthlyBudgetHkd.toLocaleString()}），配置『${planNameZh}』完全喺您預算之內；加上我哋運用『公司醫保銜接 HK$20,000 自付額』設計，已經幫您慳咗近 38% 醫保保費。最關鍵係喺 ${lead.age} 歲趁身體健康鎖定核保，唔止慳下年加價，仲能即時達成您『${priorityGoal}』嘅目標。」`,
      proofPointsEn: [
        `Within planned annual budget: HK$${budgetHkd.toLocaleString()} / yr (≈ ¥${budgetRmb.toLocaleString()})`,
        'Group Medical Deductible Bridge saves ~38% vs zero-deductible plans',
        `Locks age-${lead.age} health underwriting & avoids age-band premium increase`,
      ],
      proofPointsZh: [
        `嚴格貼合客戶年度預算 HK$ ${budgetHkd.toLocaleString()}（約 ¥ ${budgetRmb.toLocaleString()}）`,
        '結合自付額銜接設計較零墊底方案節省約 38% 保費，兼享最高 HK$8,000 VHIS 扣稅',
        `趁 ${lead.age} 歲健康狀況良好鎖定標準體核保，防止來年體檢異常被加價或除外`,
      ],
      nextClosingActionEn: 'Open Section 04 Dual-Currency Bundling to toggle monthly vs annual payment & tax relief.',
      nextClosingActionZh: '即時跳轉「04. 雙幣試算」展示扣稅後實際月供淨成本及預算佔比。',
    },
    {
      id: 'OBJ_GROUP_COVER_ENOUGH',
      categoryEn: 'Existing Group Medical / Social Cover',
      categoryZh: '已有公司團保／內地社保足夠',
      clientObjectionEn: `"I already have company medical cover — isn't adding private medical & CI redundant?"`,
      clientObjectionZh: `「我公司已經幫我買咗團體醫保，係咪唔使額外再買高端醫療同埋危疾？」`,
      rootPsychologyEn: `Client sees "covered" in HR benefits handbook without noticing sub-limits (${existingNote}) or job-change termination risk.`,
      rootPsychologyZh: `客戶常因公司福利表顯示「有醫療保障」而低估分項賠償上限風險（現況：${existingNote}）及離職／退休即時失效危機。`,
      advisorScriptEn: `"Having company cover is a great foundation, ${lead.fullNameEn}! Notice what your notes show: ${existingNote}. At HKSH or Gleneagles, a semi-private minimally invasive surgery easily costs HK$280,000–HK$350,000, leaving a ~HK$220,000+ shortfall after group caps. Our design keeps your group cover to absorb the first HK$20,000 deductible while guaranteeing full reimbursement above it—and remains portable even if you switch jobs."`,
      advisorScriptZh: `「${lead.fullNameZh}，有公司團保絕對係好起點！但睇返您現況備註：『${existingNote}』。舉個實例：萬一要喺養和或港怡做半私家房微創手術，總帳單隨時要 HK$ 320,000，團保限額賠完仲要自掏腰包廿幾萬；而癌症標靶藥門診團保更通常唔包。我哋今次幫您設計『用團保墊底＋個人高端醫療全數包底』，無重疊浪費，仲跟足您一世唔受轉工影響！」`,
      proofPointsEn: [
        `Directly addresses existing gap: ${existingNote}`,
        'Private hospital LOG waives HK$40,000–$120,000 admission cash deposit',
        'Guaranteed lifetime renewal to age 100 under HKSAR VHIS rules',
      ],
      proofPointsZh: [
        `針對性拆解現有短板：「${existingNote}」`,
        '配合 06 私院免找數 (LOG) 服務，入院無需自備 HK$ 4–12 萬現金按金',
        '保證續保至 100 歲且終身不設上限，轉工或退休一樣無縫受保',
      ],
      nextClosingActionEn: 'Run the HK$320k HKSH Surgery Simulation in Section 04 or Hospital LOG in Section 06.',
      nextClosingActionZh: '示範「04 理賠情境模擬」HK$32 萬養和手術實報實銷前後對比。',
    },
    {
      id: 'OBJ_DIVIDEND_FULFILLMENT',
      categoryEn: 'GN16 Fulfillment & Guarantees',
      categoryZh: '分紅實現率與非保證回報疑慮',
      clientObjectionEn: `"Insurance savings brochures always show 6.5% IRR — how much is actually guaranteed?"`,
      clientObjectionZh: `「成日聽人講儲蓄單預期回報有 6.5%，但係實際派息會唔會縮水？有幾多真係寫入合約保證？」`,
      rootPsychologyEn: `Sophisticated HK/GBA clients distrust inflated non-guaranteed projections and demand HKIA GN16 historical evidence + downside stress testing.`,
      rootPsychologyZh: `精明客戶重視合約保證與歷史兌現紀錄，憂慮經濟下行時非保證紅利不達標影響「${priorityGoal}」。`,
      advisorScriptEn: `"That's the exact right question under HKIA GL28 & GN16. Under HKIA rules, illustrations are capped at 6.5% USD / 6.0% HKD, and in Section 02 we transparently separate Contract Guaranteed Cash Value from Non-Guaranteed dividends—even stress-testing down to 85% or 75% fulfillment so you never rely on rosy assumptions. As your licensed ${intermediary.role === 'BROKER_TR' ? 'Broker TR' : 'Advisor'} (${intermediary.iaLicenseNo}), I track multi-year GN16 ratios across every cohort."`,
      advisorScriptZh: `「${lead.fullNameZh}，您問得非常專業！根據香港保監局 GL28 及 GN16 指引，所有演示已經嚴格封頂（美元上限 6.5%／港元 6.0%）。我哋系統第 02 頁會將『合約保證現金價值』同『非保證紅利』拆開用雙線顯示，仲可以即時拉動實現率壓力測試跌到 85% 或 75% 俾您睇最壞打算。加上我哋引用保監局公開 GN16 歷年實現率數據，幫您揀出過去連續 5 年穩定維持 98%–102% 嘅王牌系列！」`,
      proofPointsEn: [
        'HKIA GL28 IRR Cap enforced (6.0% HKD / 6.5% Non-HKD)',
        'Live 90% / 85% / 75% dividend fulfillment stress test slider',
        'Guaranteed Breakeven Year explicitly separated from Total Breakeven Year',
      ],
      proofPointsZh: [
        '嚴格執行保監局 GL28 演示封頂（港元 6.0%／非港元 6.5%）',
        '支援 90% / 85% / 75% 分紅實現率即時壓力測試，看清最壞情況',
        '明確區分「合約保證回本年期」與「預期總回本年期」，絕不混淆',
      ],
      nextClosingActionEn: 'Demonstrate the 85% stress-test slider in Section 02 Market Plans.',
      nextClosingActionZh: '於「02 全市場產品比較」現場點擊 85% 壓測按鈕演示保證現金流。',
    },
    {
      id: 'OBJ_SPOUSE_DELAY_OR_CROSSBORDER',
      categoryEn: isMcv ? 'MCV Cross-Border & Claims Convenience' : 'Need to Discuss With Spouse',
      categoryZh: isMcv ? '跨境大灣區來港簽單與理賠便利' : '需要返屋企同配偶商量',
      clientObjectionEn: isMcv
        ? `"I live in the GBA — is coming to HK to sign and claim later inconvenient?"`
        : `"Let me take the brochure home and discuss it with my spouse first."`,
      clientObjectionZh: isMcv
        ? `「我長居大灣區，專登落嚟香港簽單同埋日後理賠、交續期保費會唔會好麻煩？」`
        : `「我仲要返屋企同另一半商量下先決定，你可唔可以留低份小冊子俾我慢慢睇？」`,
      rootPsychologyEn: isMcv
        ? `MCV client worries about HKIA onshore signing compliance, HK bank eDDA autopay, and cross-border claims settlement.`
        : `Polite stall because spouse wasn't part of the gap walkthrough and client fears forgetting numbers when explaining at home.`,
      rootPsychologyZh: isMcv
        ? `大灣區客戶最擔心來港簽單合規手續（入境小白條）、香港銀行扣款及日後內地就醫理賠效率。`
        : `客戶擔心返屋企自己唔識同配偶解釋複雜數字，若只帶走厚重 PDF 小冊子好大機會無下文。`,
      advisorScriptEn: isMcv
        ? `"${lead.fullNameEn}, everything is streamlined for GBA clients: once your HKSAR Entry Slip is scanned at our Tsim Sha Tsui/Central hub, we complete e-KYC and HK bank eDDA setup in under 30 minutes, and mainland Class 3A hospitals are covered directly via cashless/e-claims into your HKD/RMB account."`
        : `"Of course, family decisions should always be made together, ${lead.fullNameEn}! Instead of making you explain a 40-page brochure, let me send you an interactive Client Proposal Microsite link with a Year-by-Year slider and our 6-Gap summary—you and your spouse can inspect every number together tonight on your phone."`,
      advisorScriptZh: isMcv
        ? `「${lead.fullNameZh}，依家大灣區客戶來港簽單已經極之流暢！只要帶齊港澳通行證及入境小白條，我哋喺尖沙咀／中環簽單中心 30 分鐘內即可完成電子核保及香港銀行 eDDA 自動轉賬；日後大灣區三甲醫院治療亦可直接使用手機電子理賠兼免找數結算，非常穩陣。」`
        : `「絕對應該同家人一齊商量，${lead.fullNameZh}！為咗唔想您拎住幾十頁小冊子返去好難解釋，我依家用系統一鍵生成一條『客戶專屬互動建議書微網頁連結』Send 俾您 WhatsApp——入面已經有您嘅 6 大缺口圖同埋滑動退保價值表，今晚您同家人食完飯一齊用手機拉兩下就一清二楚！」`,
      proofPointsEn: isMcv
        ? [
            'Compliant HK onshore Entry Slip e-KYC & eDDA autopay checklist',
            'GBA Class 3A hospital network + multi-currency HKD/CNY/USD payout flexibility',
            'Dual-signature Proposal PDF ready to download immediately after signing',
          ]
        : [
            'Interactive Client Proposal Microsite (?proposal= link) replaces static 40-page PDFs',
            'Real-time Read Receipt alerts advisor which policy year spouse inspected',
            `Reinforces top priority: ${priorityGoal}`,
          ],
      proofPointsZh: isMcv
        ? [
            '系統內置內地訪客「入境小白條」即時合規核驗及香港銀行 eDDA 指引',
            '涵蓋大灣區指定三甲醫院直付及 HKD / CNY / USD 貨幣自由調撥',
            '完成電子雙簽後即時下載雙語建議書 PDF，內容清晰透明',
          ]
        : [
            '以「客戶專屬互動建議書微網頁 (?proposal=)」取代傳統沉悶 PDF 小冊子',
            '顧問即時獲悉客戶同家人最關注邊個保單年度，精準跟進促成',
            `緊扣核心目標：「${priorityGoal}」`,
          ],
      nextClosingActionEn: isMcv
        ? 'Prepare MCV Entry Slip verification in Saved Client Editor / Section 05 STP.'
        : 'Generate & send the IMP-01 Interactive Client Microsite link from Section 09.',
      nextClosingActionZh: isMcv
        ? '前往「建檔客戶編輯 / 05 電子投保」預先核驗 MCV 入境合規條件。'
        : '點擊「09 IMP-01」一鍵生成客戶互動微網頁連結發送給配偶共閱。',
    },
  ];
}

// ============================================================================
// EDITABLE AGENT MORNING PRESENTATION DECK
// ============================================================================

export function createDefaultMorningBriefingDeck(params: {
  lead: ClientLead;
  intermediary: IntermediaryProfile;
  plan?: InsurancePlan | null;
}): MorningBriefingSlide[] {
  const { lead, intermediary, plan } = params;
  const audit = evaluateSixDimensionGapAudit(lead);
  const scheme = audit.schemeMeta;
  const budgetHkd = lead.annualBudgetHkd || 48000;
  const budgetRmb = convertHkdToRmb(budgetHkd);
  const priorityGoal = lead.priorityGoalNote || scheme.lockedSummaryZh;
  const existingNote = lead.existingSummaryNote || '尚未補足私家半私家房全數賠償及多重危疾現金池';
  const remainingGaps = audit.rows.filter((r) => !r.isFullyCovered);
  const topGapLabelZh =
    remainingGaps.length > 0
      ? remainingGaps.map((g) => `${g.labelZh}（尚餘 HK$${g.remainingGapHkd.toLocaleString()}）`).join('；')
      : '六大維度已 100% 足額達標';
  const planTitleZh = plan ? `${plan.insurerNameZh} · ${plan.nameZh}` : scheme.titleZh;
  const planTitleEn = plan ? `${plan.insurerNameEn} · ${plan.nameEn}` : scheme.titleEn;

  return [
    {
      id: 'slide-1-case-overview',
      order: 1,
      badgeEn: 'SLIDE 01 · CLIENT BRIEF',
      badgeZh: '第 01 頁 · 早會個案背景',
      titleEn: `Case Study: ${lead.fullNameEn} (${lead.age}y) — ${scheme.titleEn}`,
      titleZh: `早會實戰個案：${lead.fullNameZh} (${lead.age} 歲) · ${scheme.lockedSummaryZh}`,
      keyMetricLabelEn: 'Target Annual Budget',
      keyMetricLabelZh: '客戶年度預算基準',
      keyMetricValue: `HK$ ${budgetHkd.toLocaleString()} (≈ ¥ ${budgetRmb.toLocaleString()})`,
      bulletsEn: [
        `Client Profile: ${lead.fullNameEn} · Age ${lead.age} · ${lead.residency === 'MCV' ? 'Mainland Visitor (MCV)' : 'HK Resident'} · ${lead.isSmoker ? 'Smoker' : 'Non-Smoker'}`,
        `Existing Baseline: ${existingNote}`,
        `Top Advisory Objective: ${priorityGoal}`,
      ],
      bulletsZh: [
        `客戶輪廓：${lead.fullNameZh}（${lead.age} 歲 · ${lead.roleTagZh || '核心客戶'} · ${lead.residency === 'MCV' ? '內地訪客 MCV' : '香港居民'}）`,
        `既有保障痛點：${existingNote}`,
        `本次面談最優先目標：${priorityGoal}`,
      ],
      speakerNoteEn: `Open morning huddle by framing ${lead.fullNameEn}'s exact life stage and why generic single-product pitches fail here.`,
      speakerNoteZh: `早會開場先鎖定 ${lead.fullNameZh} 的家庭負擔與既有保障盲點，讓團隊明白為何必須以「結構化組合」切入而非單推儲蓄單。`,
    },
    {
      id: 'slide-2-gap-xray',
      order: 2,
      badgeEn: 'SLIDE 02 · 6-GAP RADAR',
      badgeZh: '第 02 頁 · 六大缺口診斷',
      titleEn: `6-Dimension Protection Audit (${audit.overallCompletionPct}% Readiness)`,
      titleZh: `六大防護維度診斷：補強後達成率 ${audit.overallCompletionPct}%`,
      keyMetricLabelEn: 'Existing Policies Logged',
      keyMetricLabelZh: '已盤點既有保單 / 年繳',
      keyMetricValue: `${audit.loggedPoliciesCount} 份 · HK$ ${audit.totalExistingAnnualPremiumHkd.toLocaleString()}`,
      bulletsEn: [
        `Primary Architecture Locked: ${scheme.titleEn} (Base HK$${scheme.baseAnnualPremiumHkd.toLocaleString()}/yr)`,
        `Life & Mortgage Cover: HK$${audit.rows[0].combinedCoverHkd.toLocaleString()} (${audit.rows[0].totalAchievementPct}%)`,
        `Remaining Top-Up Attention: ${remainingGaps.length > 0 ? remainingGaps.map((g) => g.labelEn).join(', ') : 'All 6 Dimensions 100% Covered'}`,
      ],
      bulletsZh: [
        `鎖定方案架構：${scheme.titleZh}（基準方案 HK$ ${scheme.baseAnnualPremiumHkd.toLocaleString()}／年）`,
        `人壽按揭責任達成 HK$ ${audit.rows[0].combinedCoverHkd.toLocaleString()}（${audit.rows[0].totalAchievementPct}%）；私家醫療手術達成 ${audit.rows[1].totalAchievementPct}%`,
        `會面延伸加保提示：${topGapLabelZh}`,
      ],
      speakerNoteEn: `Highlight how stacking existing company medical underneath a VHIS deductible creates zero wasted overlap.`,
      speakerNoteZh: `重點向新人示範如何用「深灰既有保單 + 藍色新配置額度」雙色進度條向客戶一分鐘講清缺口所在。`,
    },
    {
      id: 'slide-3-product-bundle',
      order: 3,
      badgeEn: 'SLIDE 03 · SOLUTION & DUAL FX',
      badgeZh: '第 03 頁 · 主推方案與雙幣整併',
      titleEn: `Recommended Solution: ${planTitleEn}`,
      titleZh: `核心產品與附約整併：${planTitleZh}`,
      keyMetricLabelEn: 'Illustrative Benchmark',
      keyMetricLabelZh: '雙幣計價參考匯率',
      keyMetricValue: `1 HKD = ¥ ${HKD_TO_RMB_RATE.toFixed(2)} CNY`,
      bulletsEn: [
        `Anchor Product: ${planTitleEn} — aligned with HKIA GL28 / GN16 disclosure rules`,
        `Tax Efficiency: VHIS up to HK$8,000/person + QDAP up to HK$60,000/yr IRD deduction`,
        `Private Hospital Cashless LOG: Covers HKSH / Gleneagles semi-private admission without HK$60k+ deposit`,
      ],
      bulletsZh: [
        `主推產品：${planTitleZh}，結合標準化附約整併享有高達 12% 組合費率優惠`,
        `稅務槓桿：符合香港稅務局 IRD Cap. 112 VHIS 扣稅及自付額橋接機制`,
        `私院免找數實力：支援養和、港怡半私家房入院預先批核 (LOG)，免除動輒十數萬現金按金壓力`,
      ],
      speakerNoteEn: `Walk through the dual HKD/RMB calculator in Section 04 so GBA spouses can immediately compare cost in RMB.`,
      speakerNoteZh: `利用第 04 頁「雙幣互動保費試算」即時換算人民幣供款及演練 HK$ 32 萬養和手術理賠，直接拉開與團保的差距。`,
    },
    {
      id: 'slide-4-objection-drill',
      order: 4,
      badgeEn: 'SLIDE 04 · OBJECTION REHEARSAL',
      badgeZh: '第 04 頁 · 實戰異議拆彈',
      titleEn: `Top Anticipated Objection & Golden Rebuttal`,
      titleZh: `早會演練焦點：如何回應「公司團保已足夠／保費預算」`,
      keyMetricLabelEn: 'Advisor Readiness',
      keyMetricLabelZh: '授權顧問身份',
      keyMetricValue: `${intermediary.nameZh} (${intermediary.iaLicenseNo})`,
      bulletsEn: [
        `Objection: "My company group medical already covers hospital bills—why spend extra?"`,
        `Rebuttal: "Group caps ~HK$60k in general ward and stops if you change jobs; VHIS +20k deductible bridges it at 38% lower cost."`,
        `Trust Anchor: Show 85% GN16 stress test & send interactive ?proposal= microsite for spouse review.`,
      ],
      bulletsZh: [
        `預設異議：「我公司已有團保，加多份高端醫療同危疾會唔會好重覆同超預算？」`,
        `黃金金句：「用團保墊底 HK$ 20,000，新單只買大病全數包底部分，慳 38% 保費又跟足一世，轉工照保！」`,
        `信任殺著：即時展示 85% 分紅壓測並發送專屬微網頁連結 (?proposal=)，等配偶夜晚一齊滑動睇數。`,
      ],
      speakerNoteEn: `Have two agents roleplay the rebuttal in pairs for 3 minutes before concluding morning huddle.`,
      speakerNoteZh: `建議早會安排兩位同事用 3 分鐘一對一演練此段異議應對，確保出門見客零卡殼。`,
    },
    {
      id: 'slide-5-action-plan',
      order: 5,
      badgeEn: 'SLIDE 05 · CLOSING ACTION',
      badgeZh: '第 05 頁 · 今日跟進與促單行動',
      titleEn: `Pre-Meeting Checklist & STP Execution Path`,
      titleZh: `今日約見 Checklist 與直通電子投保路線`,
      keyMetricLabelEn: 'KYC / GL30 Status',
      keyMetricLabelZh: '合規與核保前置狀態',
      keyMetricValue: lead.fnaRecord ? 'GL30 FNA Signed ✓' : 'Pending GL30 FNA',
      bulletsEn: [
        `Verify ${lead.residency === 'MCV' ? 'HKSAR Visitor Landing Slip & HK Bank eDDA' : 'HKID & iAM Smart e-KYC'} before STP signature`,
        `Prepare 1-Page Protection Map PDF & interactive client microsite link`,
        `Download stamped bilingual Proposal PDF right after on-screen dual signature`,
      ],
      bulletsZh: [
        `會前核實：確認${lead.residency === 'MCV' ? '入境小白條有效期及香港銀行 eDDA 自動轉賬' : '香港身份證／智方便 (iAM Smart) 核身'}及 GL30 財務分析簽署`,
        `必備物料：匯出並排比較建議書 PDF ＋ 建立手機版建議書連結備用`,
        `即場確認：完成電子雙簽後即時生成雙語建議書 PDF 並遞交核保`,
      ],
      speakerNoteEn: `Close the huddle with concrete same-day next steps and compliance verification.`,
      speakerNoteZh: `總結今日約見目標：完成缺口確認 -> 當場試算雙幣方案 -> 簽署電子投保或發送微網頁追蹤已閱回執！`,
    },
  ];
}
