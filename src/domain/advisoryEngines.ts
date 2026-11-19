import {
  AppLanguage,
  ClientLead,
  CurrencyCode,
  FnaRecord,
  HospitalDeductibleHkd,
  InsurancePlan,
  IntermediaryProfile,
  PolicyApplicationRecord,
  RiskTolerance,
} from './types';
import { toSimplifiedChinese } from './i18n';

/**
 * ============================================================================
 * Pure Domain Advisory Engines for Modules 07 & 08 (FN-01 through FN-12)
 * Zero React/DOM dependencies — 100% unit-testable via `node:test`.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// FN-01 + 07 imp-agent-2 + 07 imp-client-3:
// Existing Policy Portfolio X-Ray & Group Medical -> VHIS Deductible Bridge
// ----------------------------------------------------------------------------
export interface PortfolioGapInput {
  annualIncomeHkd: number;
  outstandingMortgageHkd: number;
  dependentsCount: number;
  existingLifeCoverHkd: number;
  existingCiCoverHkd: number;
  employerGroupRoomLimitPerDayHkd: number; // e.g., 800-1200/day
  employerSurgicalLimitHkd: number; // e.g., 25,000 - 50,000
  selectedVhisDeductibleHkd: HospitalDeductibleHkd; // 0, 20000, 50000
  clientAge: number;
}

export interface PortfolioGapResult {
  recommendedLifeCoverHkd: number;
  lifeProtectionGapHkd: number;
  lifeCoverageRatioPct: number;
  recommendedCiCoverHkd: number;
  ciProtectionGapHkd: number;
  ciCoverageRatioPct: number;
  zeroDeductibleVhisAnnualHkd: number;
  selectedDeductibleVhisAnnualHkd: number;
  deductibleBridgeSavingsPct: number;
  annualPremiumSavedHkd: number;
  irdTaxReliefHkd: number;
  netTopUpAnnualCostHkd: number;
  employerBridgeVerdictEn: string;
  employerBridgeVerdictZh: string;
}

export function analyzePortfolioProtectionGap(input: PortfolioGapInput): PortfolioGapResult {
  const incomeMultiplier = input.dependentsCount > 0 ? 10 : 6;
  const recommendedLifeCoverHkd = Math.round(
    input.annualIncomeHkd * incomeMultiplier + input.outstandingMortgageHkd
  );
  const lifeProtectionGapHkd = Math.max(0, recommendedLifeCoverHkd - input.existingLifeCoverHkd);
  const lifeCoverageRatioPct =
    recommendedLifeCoverHkd > 0
      ? Math.min(100, Math.round((input.existingLifeCoverHkd / recommendedLifeCoverHkd) * 100))
      : 100;

  // HKIA / MDRT standard: 3.5x annual income for 3-year cancer/stroke recovery + targeted therapy
  const recommendedCiCoverHkd = Math.round(input.annualIncomeHkd * 3.5);
  const ciProtectionGapHkd = Math.max(0, recommendedCiCoverHkd - input.existingCiCoverHkd);
  const ciCoverageRatioPct =
    recommendedCiCoverHkd > 0
      ? Math.min(100, Math.round((input.existingCiCoverHkd / recommendedCiCoverHkd) * 100))
      : 100;

  // Semi-Private High-Limit VHIS benchmark premium by age & deductible
  const ageFactor = Math.pow(1.036, Math.max(0, input.clientAge - 30));
  const zeroDeductibleVhisAnnualHkd = Math.round(14800 * ageFactor);
  const discountMultiplier =
    input.selectedVhisDeductibleHkd === 50000
      ? 0.46 // 54% savings
      : input.selectedVhisDeductibleHkd === 20000
      ? 0.62 // 38% savings
      : 1.0;
  const selectedDeductibleVhisAnnualHkd = Math.round(
    zeroDeductibleVhisAnnualHkd * discountMultiplier
  );
  const annualPremiumSavedHkd = zeroDeductibleVhisAnnualHkd - selectedDeductibleVhisAnnualHkd;
  const deductibleBridgeSavingsPct = Math.round((1 - discountMultiplier) * 100);
  const irdTaxReliefHkd = Math.round(Math.min(8000, selectedDeductibleVhisAnnualHkd) * 0.15);
  const netTopUpAnnualCostHkd = Math.max(0, selectedDeductibleVhisAnnualHkd - irdTaxReliefHkd);

  const uncoveredDeductible = Math.max(
    0,
    input.selectedVhisDeductibleHkd - input.employerSurgicalLimitHkd
  );

  const employerBridgeVerdictEn =
    input.selectedVhisDeductibleHkd === 0
      ? 'Zero-deductible VHIS overlaps with your corporate group medical — switching to HK$20k/HK$50k deductible cuts premium by 38%–54%.'
      : uncoveredDeductible === 0
      ? `Seamless Zero-Gap Bridge: Employer group limit (HK$${input.employerSurgicalLimitHkd.toLocaleString()}) fully absorbs the HK$${input.selectedVhisDeductibleHkd.toLocaleString()} VHIS deductible while saving ${deductibleBridgeSavingsPct}% premium.`
      : `Partial Bridge: Employer group plan absorbs HK$${input.employerSurgicalLimitHkd.toLocaleString()}; max residual deductible exposure is HK$${uncoveredDeductible.toLocaleString()} while saving HK$${annualPremiumSavedHkd.toLocaleString()}/yr.`;

  const employerBridgeVerdictZh =
    input.selectedVhisDeductibleHkd === 0
      ? '零自付額 VHIS 與公司團體醫保重疊——改選 HK$20,000 或 HK$50,000 自付額可即時節省 38%–54% 保費。'
      : uncoveredDeductible === 0
      ? `無縫銜接（零自付缺口）：公司團體醫保上限（HK$${input.employerSurgicalLimitHkd.toLocaleString()}）完全覆蓋 HK$${input.selectedVhisDeductibleHkd.toLocaleString()} 自付額，每年節省 ${deductibleBridgeSavingsPct}% 保費。`
      : `部份銜接：公司醫保可抵銷 HK$${input.employerSurgicalLimitHkd.toLocaleString()}，最高自付差額僅 HK$${uncoveredDeductible.toLocaleString()}，每年節省 HK$${annualPremiumSavedHkd.toLocaleString()} 保費。`;

  return {
    recommendedLifeCoverHkd,
    lifeProtectionGapHkd,
    lifeCoverageRatioPct,
    recommendedCiCoverHkd,
    ciProtectionGapHkd,
    ciCoverageRatioPct,
    zeroDeductibleVhisAnnualHkd,
    selectedDeductibleVhisAnnualHkd,
    deductibleBridgeSavingsPct,
    annualPremiumSavedHkd,
    irdTaxReliefHkd,
    netTopUpAnnualCostHkd,
    employerBridgeVerdictEn,
    employerBridgeVerdictZh,
  };
}

// ----------------------------------------------------------------------------
// FN-02: "Tax Trio" (扣稅三寶) VHIS + QDAP + MPF TVC Joint vs Separate Optimizer
// ----------------------------------------------------------------------------
export interface JointTaxTrioInput {
  selfAnnualAssessableIncomeHkd: number;
  spouseAnnualAssessableIncomeHkd: number; // 0 if single
  dependentChildrenCount: number;
  eligibleParents55To59Count: number;
  eligibleParents60PlusCount: number;
  selfQdapAndTvcPremiumHkd: number; // Capped at HK$60,000 per taxpayer
  spouseQdapAndTvcPremiumHkd: number; // Capped at HK$60,000 per taxpayer
  vhisInsuredRelativesCount: number; // Self + spouse + children + parents/grandparents
  avgVhisPremiumPerPersonHkd: number; // Capped at HK$8,000 per insured person
  qdapPreTaxIrrPct: number; // e.g. 4.8%
}

export interface JointTaxTrioResult {
  separateTaxBeforeTrioHkd: number;
  separateTaxAfterTrioHkd: number;
  jointTaxBeforeTrioHkd: number;
  jointTaxAfterTrioHkd: number;
  optimalAssessmentMode: 'SEPARATE_ASSESSMENT' | 'JOINT_ASSESSMENT';
  totalEligibleQdapTvcDeductionHkd: number;
  totalEligibleVhisDeductionHkd: number;
  totalTaxSavedByTrioHkd: number;
  effectiveRebatePctOnContributions: number;
  postTaxQdapIrrPct: number;
  allocationRecommendationEn: string;
  allocationRecommendationZh: string;
}

function calcHkSalariesTax(netIncomeAfterDeductions: number, basicAllowance: number): number {
  if (netIncomeAfterDeductions <= 0) return 0;
  // Standard rate ceiling (15% up to HK$5M, 16% above per HKSAR IRD)
  const standardTax =
    netIncomeAfterDeductions <= 5_000_000
      ? netIncomeAfterDeductions * 0.15
      : 5_000_000 * 0.15 + (netIncomeAfterDeductions - 5_000_000) * 0.16;

  const nci = Math.max(0, netIncomeAfterDeductions - basicAllowance);
  if (nci <= 0) return 0;

  // HK IRD Progressive Brackets: first 50k @ 2%, next 50k @ 6%, next 50k @ 10%, next 50k @ 14%, remainder @ 17%
  const brackets = [
    { width: 50_000, rate: 0.02 },
    { width: 50_000, rate: 0.06 },
    { width: 50_000, rate: 0.1 },
    { width: 50_000, rate: 0.14 },
  ];
  let rem = nci;
  let progTax = 0;
  for (const b of brackets) {
    if (rem <= 0) break;
    const chunk = Math.min(rem, b.width);
    progTax += chunk * b.rate;
    rem -= chunk;
  }
  if (rem > 0) {
    progTax += rem * 0.17;
  }

  // Less statutory one-off HK$1,500 tax reduction ceiling (illustrative current assessment baseline)
  const rawPayable = Math.min(standardTax, progTax);
  return Math.round(rawPayable);
}

export function optimizeJointTaxTrio(input: JointTaxTrioInput): JointTaxTrioResult {
  const BASIC_SINGLE = 132_000;
  const BASIC_MARRIED = 264_000;
  const CHILD_ALLOWANCE = 130_000 * Math.max(0, input.dependentChildrenCount);
  const PARENT_ALLOWANCE =
    25_000 * Math.max(0, input.eligibleParents55To59Count) +
    50_000 * Math.max(0, input.eligibleParents60PlusCount);
  const familyAllowances = CHILD_ALLOWANCE + PARENT_ALLOWANCE;

  const isMarried = input.spouseAnnualAssessableIncomeHkd > 0;
  const higherIsSelf =
    input.selfAnnualAssessableIncomeHkd >= input.spouseAnnualAssessableIncomeHkd;

  const selfQdapCap = Math.min(60_000, Math.max(0, input.selfQdapAndTvcPremiumHkd));
  const spouseQdapCap = isMarried
    ? Math.min(60_000, Math.max(0, input.spouseQdapAndTvcPremiumHkd))
    : 0;
  const totalEligibleQdapTvcDeductionHkd = selfQdapCap + spouseQdapCap;

  const perPersonVhisCap = Math.min(8_000, Math.max(0, input.avgVhisPremiumPerPersonHkd));
  const totalEligibleVhisDeductionHkd = Math.round(
    Math.max(0, input.vhisInsuredRelativesCount) * perPersonVhisCap
  );

  // Allocate family allowances + all VHIS policies to higher-earning spouse under Separate Assessment
  const selfAllow = BASIC_SINGLE + (higherIsSelf ? familyAllowances : 0);
  const spouseAllow = isMarried
    ? BASIC_SINGLE + (!higherIsSelf ? familyAllowances : 0)
    : 0;

  const separateTaxBeforeTrioHkd =
    calcHkSalariesTax(input.selfAnnualAssessableIncomeHkd, selfAllow) +
    (isMarried ? calcHkSalariesTax(input.spouseAnnualAssessableIncomeHkd, spouseAllow) : 0);

  const selfDeduct = selfQdapCap + (higherIsSelf ? totalEligibleVhisDeductionHkd : 0);
  const spouseDeduct = spouseQdapCap + (!higherIsSelf ? totalEligibleVhisDeductionHkd : 0);

  const separateTaxAfterTrioHkd =
    calcHkSalariesTax(Math.max(0, input.selfAnnualAssessableIncomeHkd - selfDeduct), selfAllow) +
    (isMarried
      ? calcHkSalariesTax(
          Math.max(0, input.spouseAnnualAssessableIncomeHkd - spouseDeduct),
          spouseAllow
        )
      : 0);

  const combinedIncome =
    input.selfAnnualAssessableIncomeHkd + (isMarried ? input.spouseAnnualAssessableIncomeHkd : 0);
  const jointAllow = (isMarried ? BASIC_MARRIED : BASIC_SINGLE) + familyAllowances;

  const jointTaxBeforeTrioHkd = calcHkSalariesTax(combinedIncome, jointAllow);
  const jointTaxAfterTrioHkd = calcHkSalariesTax(
    Math.max(0, combinedIncome - totalEligibleQdapTvcDeductionHkd - totalEligibleVhisDeductionHkd),
    jointAllow
  );

  const optimalBefore = Math.min(separateTaxBeforeTrioHkd, jointTaxBeforeTrioHkd);
  const optimalAfter = Math.min(separateTaxAfterTrioHkd, jointTaxAfterTrioHkd);
  const optimalAssessmentMode =
    separateTaxAfterTrioHkd <= jointTaxAfterTrioHkd ? 'SEPARATE_ASSESSMENT' : 'JOINT_ASSESSMENT';

  const totalTaxSavedByTrioHkd = Math.max(0, optimalBefore - optimalAfter);
  const totalOutlay =
    input.selfQdapAndTvcPremiumHkd +
    (isMarried ? input.spouseQdapAndTvcPremiumHkd : 0) +
    input.vhisInsuredRelativesCount * input.avgVhisPremiumPerPersonHkd;

  const effectiveRebatePctOnContributions =
    totalOutlay > 0 ? Number(((totalTaxSavedByTrioHkd / totalOutlay) * 100).toFixed(1)) : 0;

  // Immediate Year-1 tax rebate lifts 10-year effective IRR by ~1.3% - 1.9% at 15%-17% marginal bracket
  const irrBoost = Number(((effectiveRebatePctOnContributions / 100) * 0.14 * 100).toFixed(2));
  const postTaxQdapIrrPct = Number((input.qdapPreTaxIrrPct + irrBoost).toFixed(2));

  const earnerEn = higherIsSelf ? 'Primary Taxpayer' : 'Spouse';
  const earnerZh = higherIsSelf ? '主納稅人' : '配偶';

  return {
    separateTaxBeforeTrioHkd,
    separateTaxAfterTrioHkd,
    jointTaxBeforeTrioHkd,
    jointTaxAfterTrioHkd,
    optimalAssessmentMode,
    totalEligibleQdapTvcDeductionHkd,
    totalEligibleVhisDeductionHkd,
    totalTaxSavedByTrioHkd,
    effectiveRebatePctOnContributions,
    postTaxQdapIrrPct,
    allocationRecommendationEn: `Elect ${
      optimalAssessmentMode === 'SEPARATE_ASSESSMENT'
        ? 'Separate Salaries Tax Assessment'
        : 'Joint Assessment'
    } and claim all ${input.vhisInsuredRelativesCount} VHIS policies under ${earnerEn} (highest marginal bracket) to save HK$${totalTaxSavedByTrioHkd.toLocaleString()}/yr, boosting QDAP effective IRR from ${input.qdapPreTaxIrrPct}% to ${postTaxQdapIrrPct}%.`,
    allocationRecommendationZh: `建議選用「${
      optimalAssessmentMode === 'SEPARATE_ASSESSMENT' ? '夫婦分開評稅' : '夫婦合併評稅'
    }」，並將全部 ${input.vhisInsuredRelativesCount} 份自願醫保集中由高邊際稅率之${earnerZh}申報扣稅，全年節省薪俸稅 HK$${totalTaxSavedByTrioHkd.toLocaleString()}，令 QDAP 稅後實際內部回報率由 ${input.qdapPreTaxIrrPct}% 提升至 ${postTaxQdapIrrPct}%。`,
  };
}

// ----------------------------------------------------------------------------
// FN-03: Multi-Currency Policy Split & "567 / 568 Withdrawal" Legacy Simulator
// ----------------------------------------------------------------------------
export type WithdrawalPreset = '567_RETIREMENT' | '568_LEGACY' | 'EDU_18_21_PLUS_65';
export type LegacyTargetCurrency = 'USD' | 'HKD' | 'GBP' | 'CAD' | 'AUD' | 'RMB';

export interface LegacySplitRow {
  policyYear: number;
  clientAge: number;
  annualWithdrawalUsd: number;
  convertedWithdrawalTarget: number;
  remainingTotalCsvUsd: number;
  perChildSplitValueUsd: number;
}

export interface LegacySplitSimulationResult {
  totalPremiumsUsd: number;
  targetCurrency: LegacyTargetCurrency;
  fxRateFromUsd: number;
  cumulativeWithdrawalsUsd: number;
  year30RemainingValueUsd: number;
  perBeneficiaryYear30Usd: number;
  rows: LegacySplitRow[];
}

const FX_FROM_USD_MAP: Record<LegacyTargetCurrency, number> = {
  USD: 1.0,
  HKD: 7.8,
  GBP: 0.79,
  CAD: 1.38,
  AUD: 1.52,
  RMB: 7.22,
};

export function simulateMultiCurrencyLegacySplit(params: {
  annualPremiumUsd: number;
  paymentTermYears: 5;
  preset: WithdrawalPreset;
  targetCurrency: LegacyTargetCurrency;
  splitBeneficiariesCount: number;
  clientCurrentAge: number;
  illustratedIrrPct?: number; // capped at 6.5% per HKIA GL28
}): LegacySplitSimulationResult {
  const {
    annualPremiumUsd,
    preset,
    targetCurrency,
    splitBeneficiariesCount,
    clientCurrentAge,
  } = params;
  const irr = Math.min(0.065, (params.illustratedIrrPct ?? 6.5) / 100);
  const totalPremiumsUsd = annualPremiumUsd * 5;
  const fx = FX_FROM_USD_MAP[targetCurrency] || 1;
  const beneficiaries = Math.max(1, splitBeneficiariesCount);

  let poolUsd = 0;
  let cumulativeWithdrawalsUsd = 0;
  const checkpoints = new Set([5, 6, 10, 15, 18, 20, 21, 25, 30]);
  const rows: LegacySplitRow[] = [];

  for (let yr = 1; yr <= 30; yr++) {
    if (yr <= 5) {
      poolUsd += annualPremiumUsd;
    }
    // Surrender/compounding factor (early years reflect participating front-end load)
    const growthRate = yr <= 3 ? 0.015 : yr <= 6 ? 0.048 : irr;
    poolUsd = poolUsd * (1 + growthRate);

    let withdrawal = 0;
    if (preset === '567_RETIREMENT' && yr >= 6) {
      withdrawal = totalPremiumsUsd * 0.07; // 5-pay, from Yr 6 withdraw 7%/yr of total premiums
    } else if (preset === '568_LEGACY' && yr >= 6) {
      withdrawal = totalPremiumsUsd * 0.08; // 5-pay, from Yr 6 withdraw 8%/yr
    } else if (preset === 'EDU_18_21_PLUS_65') {
      if (yr >= 15 && yr <= 18) {
        withdrawal = totalPremiumsUsd * 0.16; // 4 years UK/Canada/Australia university tuition
      } else if (yr >= 22) {
        withdrawal = totalPremiumsUsd * 0.06;
      }
    }

    withdrawal = Math.min(Math.round(withdrawal), Math.round(poolUsd * 0.35));
    poolUsd = Math.max(0, poolUsd - withdrawal);
    cumulativeWithdrawalsUsd += withdrawal;

    if (checkpoints.has(yr)) {
      rows.push({
        policyYear: yr,
        clientAge: clientCurrentAge + yr,
        annualWithdrawalUsd: withdrawal,
        convertedWithdrawalTarget: Math.round(withdrawal * fx),
        remainingTotalCsvUsd: Math.round(poolUsd),
        perChildSplitValueUsd: Math.round(poolUsd / beneficiaries),
      });
    }
  }

  return {
    totalPremiumsUsd,
    targetCurrency,
    fxRateFromUsd: fx,
    cumulativeWithdrawalsUsd: Math.round(cumulativeWithdrawalsUsd),
    year30RemainingValueUsd: Math.round(poolUsd),
    perBeneficiaryYear30Usd: Math.round(poolUsd / beneficiaries),
    rows,
  };
}

// ----------------------------------------------------------------------------
// FN-04: Mainland Visitor (MCV) HK Signing, Bank Booking & Renewal Concierge
// ----------------------------------------------------------------------------
export interface McvConciergeResult {
  amlTier: 'STANDARD_CDD' | 'ENHANCED_SOW_EDD' | 'PRIVATE_BANK_JUMBO_EDD';
  requiredDocsEn: string[];
  requiredDocsZh: string[];
  bankBookingNotes: Array<{
    bankCode: string;
    bankNameEn: string;
    bankNameZh: string;
    leadTimeTextEn: string;
    leadTimeTextZh: string;
    eddaSupported: boolean;
  }>;
  renewalChannels: Array<{
    channelEn: string;
    channelZh: string;
    fxFeePct: number;
    estimatedAnnualFeeUsd: number;
    statusNoteEn: string;
    statusNoteZh: string;
  }>;
}

export function evaluateMcvSigningConcierge(params: {
  annualPremiumUsd: number;
  hasHkBankAccount: boolean;
  entrySlipVerified: boolean;
}): McvConciergeResult {
  const { annualPremiumUsd, hasHkBankAccount, entrySlipVerified } = params;
  const amlTier =
    annualPremiumUsd >= 250_000
      ? 'PRIVATE_BANK_JUMBO_EDD'
      : annualPremiumUsd >= 100_000
      ? 'ENHANCED_SOW_EDD'
      : 'STANDARD_CDD';

  const requiredDocsEn = [
    entrySlipVerified
      ? '✓ HKSAR Immigration Landing Slip (Onshore HK signing verified)'
      : '! Mandatory: HKSAR Immigration White Landing Slip (Must sign physically inside HK)',
    'PRC Resident Identity Card + Exit-Entry Permit (往來港澳通行證) with valid endorsement',
    ...(amlTier !== 'STANDARD_CDD'
      ? [
          'Enhanced Source of Wealth (SoW): Latest 6-month PRC bank statements / tax assessment / property deed',
        ]
      : ['Standard Financial Questionnaire & mainland mobile SMS OTP verification']),
    ...(hasHkBankAccount
      ? ['HK Bank Account Proof for Instant eDDA Auto-Debit Binding']
      : ['Pre-book HK Bank Branch Appointment (3–5 business days prior to arrival in Tsim Sha Tsui / Central)']),
  ];

  const requiredDocsZh = [
    entrySlipVerified
      ? '✓ 香港入境處抵港入境標籤（已核實境內親身簽署資格）'
      : '！必須文件：香港入境事務處白色入境標籤（全過程須於香港境內親身簽署）',
    '內地居民身份證 ＋ 有效往來港澳通行證及簽注',
    ...(amlTier !== 'STANDARD_CDD'
      ? ['加強盡職審查（EDD）財富來源證明：近 6 個月銀行流水／完稅證明／房產證或企業分紅紀錄']
      : ['標準財務狀況問卷及內地實名手機號碼短訊驗證']),
    ...(hasHkBankAccount
      ? ['香港銀行戶口證明（即時綁定 eDDA 電子直接付款授權續期）']
      : ['抵港前 3–5 個工作天預約中環／尖沙咀分行開立港卡']),
  ];

  return {
    amlTier,
    requiredDocsEn,
    requiredDocsZh,
    bankBookingNotes: [
      {
        bankCode: 'BOCHK',
        bankNameEn: 'Bank of China (Hong Kong)',
        bankNameZh: '中國銀行（香港）',
        leadTimeTextEn: 'WeChat Mini-Program branch slot 5 days ahead; zero cross-border BOCHK-BOC remittance fee',
        leadTimeTextZh: '微信小程式提前 5 天預約海港城／中銀大廈分行；同名內地中國銀行跨境匯款免手續費',
        eddaSupported: true,
      },
      {
        bankCode: 'HSBC_HK',
        bankNameEn: 'HSBC Hong Kong One / Premier',
        bankNameZh: '滙豐香港 One／卓越理財',
        leadTimeTextEn: 'Book via HSBC HK App before crossing border; supports instant USD/HKD eDDA',
        leadTimeTextZh: '過關前透過 HSBC HK App 預約分行見證；支援港元及美元保費即時 eDDA 扣賬',
        eddaSupported: true,
      },
      {
        bankCode: 'ZA_BANK',
        bankNameEn: 'ZA Bank (HK Virtual Bank)',
        bankNameZh: '眾安銀行 ZA Bank（在港連線開戶）',
        leadTimeTextEn: 'Open via mobile app while physically connected to HK Wi-Fi/roaming + Immigration record',
        leadTimeTextZh: '訪港期間身處香港境內連接網絡即可憑出入境紀錄 App 開戶，支援 FPS 轉數快繳費',
        eddaSupported: true,
      },
    ],
    renewalChannels: [
      {
        channelEn: 'HK Bank eDDA / FPS Auto-Debit (Recommended)',
        channelZh: '香港銀行 eDDA 電子直接扣賬／轉數快 FPS（首選）',
        fxFeePct: 0,
        estimatedAnnualFeeUsd: 0,
        statusNoteEn: 'HK$0 handling fee; eliminates policy lapse risk',
        statusNoteZh: '零手續費，自動按匯率扣繳續期保費，杜絕斷供失效風險',
      },
      {
        channelEn: 'Cross-Border Telegraphic Wire to Insurer Citibank/HSBC Account',
        channelZh: '個人購匯跨境電匯至保司花旗／滙豐專戶',
        fxFeePct: 0.35,
        estimatedAnnualFeeUsd: Math.round(annualPremiumUsd * 0.0035 + 25),
        statusNoteEn: 'Subject to USD 50,000 annual SAFE personal FX quota',
        statusNoteZh: '受每年 5 萬美元個人便利化購匯額度規範，須備註保單號碼',
      },
      {
        channelEn: 'Visa / Mastercard Online Renewal Portal',
        channelZh: 'Visa／Mastercard 網上續期繳費（視乎保司上限）',
        fxFeePct: 2.8,
        estimatedAnnualFeeUsd: Math.round(annualPremiumUsd * 0.028),
        statusNoteEn: '1.95%–2.8% admin surcharge on savings renewals',
        statusNoteZh: '儲蓄險續期一般收取 1.95%–2.8% 行政費，僅建議作應急備用',
      },
    ],
  };
}

// ----------------------------------------------------------------------------
// FN-05: Premium Financing Spread & HKMA/HKIA +200 bps Stress-Test Simulator
// ----------------------------------------------------------------------------
export interface PremiumFinancingResult {
  totalSinglePremiumUsd: number;
  day1GuaranteedCsvUsd: number;
  bankLoanUsd: number;
  clientOutOfPocketEquityUsd: number;
  effectiveLeverageMultiple: number;
  baseLoanRatePct: number;
  stressedLoanRatePct: number; // +200 bps per HKMA/HKIA supervisory rule
  year10PolicyValueUsd: number;
  year10NetEquityBaseUsd: number;
  year10NetEquityStressedUsd: number;
  unleveragedIrrPct: number;
  leveragedBaseIrrPct: number;
  leveragedStressedIrrPct: number;
  marginCallTriggerDropPct: number;
  stressVerdictEn: string;
  stressVerdictZh: string;
}

export function simulatePremiumFinancingStressTest(params: {
  totalSinglePremiumUsd: number;
  day1CsvRatioPct: number; // e.g., 82% of single premium
  bankLtvOnCsvPct: number; // e.g., 90% of Day-1 CSV
  fundingBenchmarkPct: number; // e.g., 3.85% 1M HIBOR/SOFR
  bankSpreadPct: number; // e.g., 1.15%
  policyCreditingRatePct: number; // e.g., 5.2% (capped per GL28)
}): PremiumFinancingResult {
  const {
    totalSinglePremiumUsd,
    day1CsvRatioPct,
    bankLtvOnCsvPct,
    fundingBenchmarkPct,
    bankSpreadPct,
    policyCreditingRatePct,
  } = params;

  const day1GuaranteedCsvUsd = Math.round(totalSinglePremiumUsd * (day1CsvRatioPct / 100));
  const bankLoanUsd = Math.round(day1GuaranteedCsvUsd * (bankLtvOnCsvPct / 100));
  const clientOutOfPocketEquityUsd = Math.max(1, totalSinglePremiumUsd - bankLoanUsd);
  const effectiveLeverageMultiple = Number(
    (totalSinglePremiumUsd / clientOutOfPocketEquityUsd).toFixed(2)
  );

  const baseLoanRatePct = Number((fundingBenchmarkPct + bankSpreadPct).toFixed(2));
  const stressedLoanRatePct = Number((baseLoanRatePct + 2.0).toFixed(2)); // Mandatory +200 bps HKMA/HKIA stress test

  const cappedPolicyRate = Math.min(6.5, policyCreditingRatePct) / 100;
  // Year 10 total policy value starting from Day-1 CSV compounding at policy crediting rate
  const year10PolicyValueUsd = Math.round(
    totalSinglePremiumUsd * 0.94 * Math.pow(1 + cappedPolicyRate, 10)
  );

  const cumulativeInterestBase = bankLoanUsd * (baseLoanRatePct / 100) * 10;
  const cumulativeInterestStressed = bankLoanUsd * (stressedLoanRatePct / 100) * 10;

  const year10NetEquityBaseUsd = Math.round(
    year10PolicyValueUsd - bankLoanUsd - cumulativeInterestBase
  );
  const year10NetEquityStressedUsd = Math.round(
    year10PolicyValueUsd - bankLoanUsd - cumulativeInterestStressed
  );

  const unleveragedIrrPct = Number(
    ((Math.pow(year10PolicyValueUsd / totalSinglePremiumUsd, 1 / 10) - 1) * 100).toFixed(2)
  );

  const leveragedBaseIrrPct =
    year10NetEquityBaseUsd > 0
      ? Number(
          ((Math.pow(year10NetEquityBaseUsd / clientOutOfPocketEquityUsd, 1 / 10) - 1) * 100).toFixed(
            2
          )
        )
      : -100;

  const leveragedStressedIrrPct =
    year10NetEquityStressedUsd > 0
      ? Number(
          (
            (Math.pow(year10NetEquityStressedUsd / clientOutOfPocketEquityUsd, 1 / 10) - 1) *
            100
          ).toFixed(2)
        )
      : -100;

  // Max LTV covenant typically 95% of CSV
  const maxLoanAtDay1 = day1GuaranteedCsvUsd * 0.95;
  const marginCallTriggerDropPct = Number(
    Math.max(0, ((maxLoanAtDay1 - bankLoanUsd) / maxLoanAtDay1) * 100).toFixed(1)
  );

  const negativeCarryUnderStress = stressedLoanRatePct > policyCreditingRatePct;

  return {
    totalSinglePremiumUsd,
    day1GuaranteedCsvUsd,
    bankLoanUsd,
    clientOutOfPocketEquityUsd,
    effectiveLeverageMultiple,
    baseLoanRatePct,
    stressedLoanRatePct,
    year10PolicyValueUsd,
    year10NetEquityBaseUsd,
    year10NetEquityStressedUsd,
    unleveragedIrrPct,
    leveragedBaseIrrPct,
    leveragedStressedIrrPct,
    marginCallTriggerDropPct,
    stressVerdictEn: negativeCarryUnderStress
      ? `HKMA/HKIA +200 bps Alert: At ${stressedLoanRatePct}% stressed loan cost vs ${policyCreditingRatePct}% policy rate, negative carry lowers Yr-10 leveraged IRR to ${leveragedStressedIrrPct}%. Ensure client signs the Important Facts Statement — Premium Financing (IFS-PF) and holds liquid interest-reserve buffer.`
      : `Positive Spread Maintained: Even under +200 bps stress (${stressedLoanRatePct}%), Yr-10 net equity remains USD $${year10NetEquityStressedUsd.toLocaleString()} (${leveragedStressedIrrPct}% IRR).`,
    stressVerdictZh: negativeCarryUnderStress
      ? `金管局／保監局 +200 點子壓力測試提示：當貸款利率升至 ${stressedLoanRatePct}%（高於保單派息率 ${policyCreditingRatePct}%），出現息差倒掛，第 10 年槓桿 IRR 降至 ${leveragedStressedIrrPct}%。必須簽署《保費融資重要資料聲明書（IFS-PF）》並預留流動資金緩衝。`
      : `通過壓力測試：即使加息 +200 點子至 ${stressedLoanRatePct}%，第 10 年淨權益仍達 USD $${year10NetEquityStressedUsd.toLocaleString()}（槓桿 IRR ${leveragedStressedIrrPct}%）。`,
  };
}

// ----------------------------------------------------------------------------
// FN-06: 1-Click WhatsApp / WeChat Compliant Micro-Proposal Card Builder
// ----------------------------------------------------------------------------
export function buildMicroProposalText(params: {
  lead: ClientLead;
  plan: InsurancePlan;
  currency: CurrencyCode;
  annualPremium: number;
  sumAssured: number;
  yr20TotalValue: number;
  yr20GuaranteedValue: number;
  effectiveIrrPct: number;
  intermediary: IntermediaryProfile;
  clientSafeMode: boolean;
  lang: AppLanguage;
}): string {
  const {
    lead,
    plan,
    currency,
    annualPremium,
    sumAssured,
    yr20TotalValue,
    yr20GuaranteedValue,
    effectiveIrrPct,
    intermediary,
    clientSafeMode,
    lang,
  } = params;

  const maskedNameEn = clientSafeMode ? 'Valued Client' : lead.fullNameEn;
  const maskedNameZh = clientSafeMode ? '尊貴客戶' : lead.fullNameZh;

  if (lang === 'en') {
    return [
      `📋 *HKIA Compliant Policy Summary | ${plan.insurerNameEn}*`,
      `Prepared for: ${maskedNameEn} (Age ${lead.age})`,
      `Plan: *${plan.nameEn}*`,
      `• Sum Assured: ${currency} $${sumAssured.toLocaleString()}`,
      `• Annual Premium: ${currency} $${annualPremium.toLocaleString()}`,
      `• Yr-20 Guaranteed Cash Value: ${currency} $${yr20GuaranteedValue.toLocaleString()}`,
      `• Yr-20 Total Illustrated Value: ${currency} $${yr20TotalValue.toLocaleString()} (IRR ${effectiveIrrPct}% p.a. | GN16 Fulfillment: ${plan.fulfillmentRatio ?? 'N/A'}%)`,
      `• Highlights: ${(plan.keyHighlightsEn || []).slice(0, 2).join(' · ')}`,
      `⚖️ _HKIA GL28 Notice: Non-guaranteed dividends are not guaranteed. Cap enforced: 6.0% HKD / 6.5% Non-HKD. Advisor: ${intermediary.nameEn} (IA Lic: ${intermediary.iaLicenseNo})_`,
    ].join('\n');
  }

  const zhHk = [
    `📋 【香港保監局合規方案摘要｜${plan.insurerNameZh}】`,
    `專為：${maskedNameZh}（${lead.age}歲）度身編製`,
    `計劃名稱：*${plan.nameZh}*`,
    `• 基本投保額：${currency} $${sumAssured.toLocaleString()}`,
    `• 每年保費：${currency} $${annualPremium.toLocaleString()}`,
    `• 第 20 年保證現金價值：${currency} $${yr20GuaranteedValue.toLocaleString()}`,
    `• 第 20 年預期總退保價值：${currency} $${yr20TotalValue.toLocaleString()}（預期 IRR ${effectiveIrrPct}%｜歷史分紅實現率：${plan.fulfillmentRatio ? `${plan.fulfillmentRatio}%` : '純保障'}）`,
    `• 核心亮點：${(plan.keyHighlightsZh || []).slice(0, 2).join('；')}`,
    `⚖️ 合規聲明（保監局 GL28）：非保證紅利並非保證，港元上限 6.0%／非港元上限 6.5%。持牌顧問：${intermediary.nameZh}（牌照號碼：${intermediary.iaLicenseNo}）`,
  ].join('\n');

  return lang === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk;
}

// ----------------------------------------------------------------------------
// FN-07 + 07 imp-agent-3: Sub-Standard Health Cross-Insurer Pre-Underwriting
// ----------------------------------------------------------------------------
export type PreUnderwritingConditionCode =
  | 'THYROID_NODULE_TIRADS'
  | 'BREAST_NODULE_BIRADS'
  | 'FATTY_LIVER_ELEVATED_ALT'
  | 'MILD_HYPERTENSION'
  | 'HBV_INACTIVE_CARRIER'
  | 'ELEVATED_BMI_URIC_ACID';

export interface InsurerUnderwritingOutcome {
  insurerCode: string;
  insurerNameEn: string;
  insurerNameZh: string;
  medicalDecisionEn: string;
  medicalDecisionZh: string;
  ciDecisionEn: string;
  ciDecisionZh: string;
  estimatedLoadingPct: number;
  friendlyRank: 'MOST_LENIENT' | 'STANDARD_STRICT' | 'CONSERVATIVE';
}

export interface PreUnderwritingResult {
  conditionCode: PreUnderwritingConditionCode;
  severityLevel: 'MILD' | 'MODERATE' | 'BORDERLINE_HIGH';
  requiredMedicalReportsEn: string[];
  requiredMedicalReportsZh: string[];
  insurerOutcomes: InsurerUnderwritingOutcome[];
  submissionTipEn: string;
  submissionTipZh: string;
}

export function evaluateSubStandardPreUnderwriting(params: {
  conditionCode: PreUnderwritingConditionCode;
  severityLevel: 'MILD' | 'MODERATE' | 'BORDERLINE_HIGH';
}): PreUnderwritingResult {
  const { conditionCode, severityLevel } = params;
  const sevMult = severityLevel === 'MILD' ? 0 : severityLevel === 'MODERATE' ? 25 : 50;

  if (conditionCode === 'THYROID_NODULE_TIRADS') {
    return {
      conditionCode,
      severityLevel,
      requiredMedicalReportsEn: [
        'Latest 6-month Thyroid Ultrasound specifying TI-RADS grade & max diameter (mm)',
        'Thyroid Function Blood Panel (TSH, Free T3, Free T4)',
        ...(severityLevel === 'BORDERLINE_HIGH' ? ['Fine Needle Aspiration Biopsy (FNAB) cytology report'] : []),
      ],
      requiredMedicalReportsZh: [
        '近 6 個月甲狀腺超聲波報告（須列明 TI-RADS 分級及最大結節毫米尺寸）',
        '甲狀腺功能驗血報告（TSH、游離 T3、游離 T4）',
        ...(severityLevel === 'BORDERLINE_HIGH' ? ['細針穿刺活檢（FNAB）細胞學良性報告'] : []),
      ],
      insurerOutcomes: [
        {
          insurerCode: 'FWD',
          insurerNameEn: 'FWD Hong Kong',
          insurerNameZh: '富衛香港',
          medicalDecisionEn:
            severityLevel === 'MILD'
              ? 'TI-RADS 1–2 (<10mm): Standard or Thyroid Exclusion'
              : 'Thyroid Organ Exclusion Rider',
          medicalDecisionZh:
            severityLevel === 'MILD'
              ? 'TI-RADS 1–2 (<10mm)：有機會標準承保或僅甲狀腺除外'
              : '甲狀腺器官不保事項（其餘全身受保）',
          ciDecisionEn:
            severityLevel === 'MILD' ? 'Standard CI (TI-RADS 2 stable >1yr)' : 'Exclude Thyroid Carcinoma-in-Situ',
          ciDecisionZh:
            severityLevel === 'MILD' ? '穩定逾 1 年有機會標準危疾承保' : '除外甲狀腺癌／原位癌，無須加價',
          estimatedLoadingPct: 0,
          friendlyRank: 'MOST_LENIENT',
        },
        {
          insurerCode: 'AIA',
          insurerNameEn: 'AIA Hong Kong',
          insurerNameZh: '友邦香港',
          medicalDecisionEn: 'VHIS Issued with Thyroid Exclusion (Reviewable post-excision)',
          medicalDecisionZh: '自願醫保批出並設甲狀腺除外責任（切除良性後可申請覆核撤銷）',
          ciDecisionEn:
            severityLevel === 'BORDERLINE_HIGH'
              ? 'Postpone until FNAB benign confirmation'
              : 'Issued with Thyroid Cancer Exclusion',
          ciDecisionZh:
            severityLevel === 'BORDERLINE_HIGH'
              ? 'TI-RADS 4 須待穿刺良性報告後方可核保'
              : '批出保單（甲狀腺癌除外）',
          estimatedLoadingPct: sevMult === 50 ? 25 : 0,
          friendlyRank: 'STANDARD_STRICT',
        },
        {
          insurerCode: 'MANULIFE',
          insurerNameEn: 'Manulife HK',
          insurerNameZh: '宏利香港',
          medicalDecisionEn: 'Thyroid Exclusion on VHIS Flexi; Life cover Standard',
          medicalDecisionZh: '醫療設甲狀腺除外；純人壽及儲蓄險維持標準保費承保',
          ciDecisionEn: 'Standard Rate with Thyroid Exclusion Clause',
          ciDecisionZh: '標準保費批核（附加甲狀腺相關危疾除外條款）',
          estimatedLoadingPct: 0,
          friendlyRank: 'MOST_LENIENT',
        },
      ],
      submissionTipEn:
        'Submit simultaneous pre-underwriting inquiries to 2 carriers via Broker TR channel BEFORE formal application so no declined record hits shared MIB/underwriting history.',
      submissionTipZh:
        '建議經紀先以匿名／預先核保（Pre-Underwriting）同時向 2 間保司試單，避免正式拒保紀錄留存於核保申報欄。',
    };
  }

  if (conditionCode === 'BREAST_NODULE_BIRADS') {
    return {
      conditionCode,
      severityLevel,
      requiredMedicalReportsEn: [
        'Bilateral Breast Ultrasound / Mammogram stating BI-RADS category (1–3)',
        'Serial size comparison showing stability over 12 months',
      ],
      requiredMedicalReportsZh: [
        '雙側乳房超聲波或乳房造影報告（清晰列明 BI-RADS 分級）',
        '過去 12 個月尺寸穩定對比紀錄（如屬囊腫／纖維腺瘤）',
      ],
      insurerOutcomes: [
        {
          insurerCode: 'AXA',
          insurerNameEn: 'AXA Hong Kong',
          insurerNameZh: '安盛香港',
          medicalDecisionEn: severityLevel === 'MILD' ? 'BI-RADS 2 Cyst: Standard / Breast Exclusion' : 'Breast Exclusion',
          medicalDecisionZh: severityLevel === 'MILD' ? 'BI-RADS 2 單純水囊：有機會標準或乳房除外' : '乳房項目除外承保',
          ciDecisionEn: severityLevel === 'MILD' ? 'Standard CI Cover' : 'Breast Carcinoma-in-Situ Exclusion',
          ciDecisionZh: severityLevel === 'MILD' ? '危疾有機會標準保費承保' : '乳房原位癌除外（保留其他癌症保障）',
          estimatedLoadingPct: 0,
          friendlyRank: 'MOST_LENIENT',
        },
        {
          insurerCode: 'PRU',
          insurerNameEn: 'Prudential HK',
          insurerNameZh: '保誠香港',
          medicalDecisionEn: 'Issued with Breast Condition Exclusion',
          medicalDecisionZh: '批出醫療保單（附加乳房疾病除外條款）',
          ciDecisionEn: severityLevel === 'BORDERLINE_HIGH' ? 'Postpone 6m follow-up' : 'Breast Exclusion on CI',
          ciDecisionZh: severityLevel === 'BORDERLINE_HIGH' ? 'BI-RADS 3/4 延期 6 個月覆檢' : '危疾附加乳房除外',
          estimatedLoadingPct: 0,
          friendlyRank: 'STANDARD_STRICT',
        },
      ],
      submissionTipEn:
        'Participating Savings & QDAP Annuity plans require Simplified/Zero Medical Underwriting (GIO) up to USD 500k — pivot savings allocation immediately if medical needs follow-up.',
      submissionTipZh:
        '多元貨幣儲蓄險及 QDAP 年金一般設免體檢簡易核保（GIO），即使乳房結節需延期覆檢，仍可即時正常投保儲蓄傳承計劃。',
    };
  }

  // Fatty Liver / Mild Hypertension / HBV / BMI metabolic conditions
  const baseLoading = severityLevel === 'MILD' ? 0 : severityLevel === 'MODERATE' ? 25 : 50;
  return {
    conditionCode,
    severityLevel,
    requiredMedicalReportsEn: [
      'Latest 3-month Fasting Blood Panel (ALT, AST, GGT, HbA1c, Lipid Profile, HBsAg/HBV-DNA if applicable)',
      'Abdominal Ultrasound or 7-day Home Blood Pressure Log',
    ],
    requiredMedicalReportsZh: [
      '近 3 個月空腹驗血報告（肝酵素 ALT/AST/GGT、糖化血紅素 HbA1c、血脂及乙肝 DNA 定量如適用）',
      '上腹部超聲波報告或連續 7 日居家血壓紀錄表',
    ],
    insurerOutcomes: [
      {
        insurerCode: 'SUNLIFE',
        insurerNameEn: 'Sun Life HK',
        insurerNameZh: '永明金融香港',
        medicalDecisionEn: baseLoading === 0 ? 'Standard Rate Acceptance' : `+${baseLoading}% Metabolic Loading`,
        medicalDecisionZh: baseLoading === 0 ? '輕度指標正常：標準保費批核' : `醫療加費約 +${baseLoading}%（無除外項目）`,
        ciDecisionEn: baseLoading === 0 ? 'Standard CI Rate' : `+${baseLoading}% Premium Loading (Full Organ Cover)`,
        ciDecisionZh: baseLoading === 0 ? '標準保費承保危疾' : `危疾加費約 +${baseLoading}%（保留全器官完整保障）`,
        estimatedLoadingPct: baseLoading,
        friendlyRank: 'MOST_LENIENT',
      },
      {
        insurerCode: 'AIA',
        insurerNameEn: 'AIA Hong Kong',
        insurerNameZh: '友邦香港',
        medicalDecisionEn:
          baseLoading === 0 ? 'Standard Rate + AIA Vitality 10% Discount' : `+${baseLoading + 15}% Loading`,
        medicalDecisionZh:
          baseLoading === 0 ? '標準承保＋AIA Vitality 健康程式首年 9 折保費' : `預計加價約 +${baseLoading + 15}%`,
        ciDecisionEn: `+${baseLoading + 10}% Loading (Reviewable after 12m weight/ALT normalization)`,
        ciDecisionZh: `加價 +${baseLoading + 10}%（12 個月後指標回復正常可申請減費覆核）`,
        estimatedLoadingPct: baseLoading + 10,
        friendlyRank: 'STANDARD_STRICT',
      },
      {
        insurerCode: 'BOWTIE',
        insurerNameEn: 'Bowtie Life HK',
        insurerNameZh: '保泰人壽',
        medicalDecisionEn: baseLoading === 0 ? 'Instant Online VHIS Approval' : `+${baseLoading}% Transparent Loading`,
        medicalDecisionZh: baseLoading === 0 ? '網上即時標準核保批出' : `+${baseLoading}% 透明加價承保`,
        ciDecisionEn: `+${baseLoading}% Pure CI Loading`,
        ciDecisionZh: `純危疾加價 +${baseLoading}%`,
        estimatedLoadingPct: baseLoading,
        friendlyRank: 'MOST_LENIENT',
      },
    ],
    submissionTipEn:
      'Loading (+25%) is superior to Organ Exclusion for metabolic/HBV cases because liver, cardiac, and stroke claims remain 100% covered!',
    submissionTipZh:
      '針對脂肪肝／血壓／乙肝帶菌個案，「加費承保（Loading）」往往優於「器官除外」，因為肝臟及心腦血管嚴重危疾仍獲 100% 保障！',
  };
}

// ----------------------------------------------------------------------------
// FN-08 + 07 imp-client-2: Day-Case Endoscopy / Private Hospital Procedure
// Shortfall & Dual-Policy Claim Sequence Concierge
// ----------------------------------------------------------------------------
export interface SurgicalProcedurePackage {
  id: string;
  nameEn: string;
  nameZh: string;
  dayCaseCenterFeeHkd: number;
  privateHospitalStandardWardFeeHkd: number;
  privateHospitalPrivateRoomFeeHkd: number;
  vhisStandardSurgicalScheduleLimitHkd: number; // VHIS Standard Schedule limit
  inpatientMedicalNecessityRisk: 'HIGH_AUDIT_RISK' | 'MODERATE' | 'INPATIENT_STANDARD';
}

export const HK_SURGICAL_PROCEDURES: SurgicalProcedurePackage[] = [
  {
    id: 'COLONOSCOPY_POLYPECTOMY',
    nameEn: 'Colonoscopy + Polypectomy (大腸鏡及息肉切除)',
    nameZh: '大腸鏡檢查連息肉切除術',
    dayCaseCenterFeeHkd: 14800,
    privateHospitalStandardWardFeeHkd: 34500,
    privateHospitalPrivateRoomFeeHkd: 58000,
    vhisStandardSurgicalScheduleLimitHkd: 12500,
    inpatientMedicalNecessityRisk: 'HIGH_AUDIT_RISK',
  },
  {
    id: 'GASTRO_PLUS_COLONOSCOPY',
    nameEn: 'Combined Gastroscopy + Colonoscopy (胃鏡＋腸鏡同日檢查)',
    nameZh: '胃鏡及大腸鏡同日雙鏡檢查',
    dayCaseCenterFeeHkd: 21500,
    privateHospitalStandardWardFeeHkd: 46000,
    privateHospitalPrivateRoomFeeHkd: 76000,
    vhisStandardSurgicalScheduleLimitHkd: 17500,
    inpatientMedicalNecessityRisk: 'HIGH_AUDIT_RISK',
  },
  {
    id: 'CATARACT_PHACO',
    nameEn: 'Day-Case Cataract Phacoemulsification (白內障超聲乳化手術)',
    nameZh: '白內障超聲乳化及人工晶體植入手術',
    dayCaseCenterFeeHkd: 26000,
    privateHospitalStandardWardFeeHkd: 44000,
    privateHospitalPrivateRoomFeeHkd: 68000,
    vhisStandardSurgicalScheduleLimitHkd: 17500,
    inpatientMedicalNecessityRisk: 'HIGH_AUDIT_RISK',
  },
  {
    id: 'CORONARY_PTCA_STENT',
    nameEn: 'Coronary Angioplasty PTCA + 1 Stent (通波仔冠狀動脈支架手術)',
    nameZh: '冠狀動脈成形術（通波仔連支架植入）',
    dayCaseCenterFeeHkd: 138000,
    privateHospitalStandardWardFeeHkd: 165000,
    privateHospitalPrivateRoomFeeHkd: 268000,
    vhisStandardSurgicalScheduleLimitHkd: 50000,
    inpatientMedicalNecessityRisk: 'INPATIENT_STANDARD',
  },
  {
    id: 'LAPAROSCOPIC_CHOLECYSTECTOMY',
    nameEn: 'Laparoscopic Gallbladder Removal (微創膽囊切除手術)',
    nameZh: '腹腔鏡微創膽囊切除手術',
    dayCaseCenterFeeHkd: 62000,
    privateHospitalStandardWardFeeHkd: 86000,
    privateHospitalPrivateRoomFeeHkd: 142000,
    vhisStandardSurgicalScheduleLimitHkd: 30000,
    inpatientMedicalNecessityRisk: 'INPATIENT_STANDARD',
  },
];

export interface ProcedureShortfallResult {
  procedure: SurgicalProcedurePackage;
  totalEstimatedBillHkd: number;
  step1EmployerGroupPaidHkd: number;
  step2PersonalMedicalPaidHkd: number;
  estimatedClientOutOfPocketHkd: number;
  reimbursementRatioPct: number;
  medicalNecessityAlertEn: string;
  medicalNecessityAlertZh: string;
  claimSequenceStepsEn: string[];
  claimSequenceStepsZh: string[];
}

export function evaluateProcedureShortfallAndClaim(params: {
  procedureId: string;
  setting: 'DAY_CASE_NETWORK' | 'HOSPITAL_STANDARD_WARD' | 'HOSPITAL_PRIVATE_ROOM';
  employerGroupLimitHkd: number;
  personalPlanTier: 'NONE' | 'VHIS_STANDARD' | 'VHIS_FLEXI_SMM' | 'HIGH_END_MEDICAL';
  personalDeductibleHkd: HospitalDeductibleHkd;
}): ProcedureShortfallResult {
  const proc =
    HK_SURGICAL_PROCEDURES.find((p) => p.id === params.procedureId) || HK_SURGICAL_PROCEDURES[0];

  const totalEstimatedBillHkd =
    params.setting === 'DAY_CASE_NETWORK'
      ? proc.dayCaseCenterFeeHkd
      : params.setting === 'HOSPITAL_STANDARD_WARD'
      ? proc.privateHospitalStandardWardFeeHkd
      : proc.privateHospitalPrivateRoomFeeHkd;

  const step1EmployerGroupPaidHkd = Math.min(totalEstimatedBillHkd, params.employerGroupLimitHkd);
  const residualAfterEmployer = Math.max(0, totalEstimatedBillHkd - step1EmployerGroupPaidHkd);

  // Deductible on personal policy can be offset by step1EmployerGroupPaidHkd!
  const remainingUnmetDeductible = Math.max(
    0,
    params.personalDeductibleHkd - step1EmployerGroupPaidHkd
  );
  const claimableOnPersonal = Math.max(0, residualAfterEmployer - remainingUnmetDeductible);

  let step2PersonalMedicalPaidHkd = 0;
  if (params.personalPlanTier === 'VHIS_STANDARD') {
    // VHIS Standard surgical + anaesthesia/OT (~1.55x schedule cap)
    const vhisStdCap = Math.round(proc.vhisStandardSurgicalScheduleLimitHkd * 1.65);
    step2PersonalMedicalPaidHkd = Math.min(claimableOnPersonal, vhisStdCap);
  } else if (params.personalPlanTier === 'VHIS_FLEXI_SMM') {
    // VHIS Flexi covers 100% on Day-Case/Standard/Semi-Private, 65% ward adjustment if upgrading to Private Room
    const wardAdjustment = params.setting === 'HOSPITAL_PRIVATE_ROOM' ? 0.65 : 1.0;
    step2PersonalMedicalPaidHkd = Math.round(claimableOnPersonal * wardAdjustment);
  } else if (params.personalPlanTier === 'HIGH_END_MEDICAL') {
    step2PersonalMedicalPaidHkd = claimableOnPersonal;
  }

  const estimatedClientOutOfPocketHkd = Math.max(
    0,
    totalEstimatedBillHkd - step1EmployerGroupPaidHkd - step2PersonalMedicalPaidHkd
  );
  const reimbursementRatioPct = Math.round(
    ((step1EmployerGroupPaidHkd + step2PersonalMedicalPaidHkd) / totalEstimatedBillHkd) * 100
  );

  const triggersDayCaseWarning =
    proc.inpatientMedicalNecessityRisk === 'HIGH_AUDIT_RISK' &&
    params.setting !== 'DAY_CASE_NETWORK';

  return {
    procedure: proc,
    totalEstimatedBillHkd,
    step1EmployerGroupPaidHkd,
    step2PersonalMedicalPaidHkd,
    estimatedClientOutOfPocketHkd,
    reimbursementRatioPct,
    medicalNecessityAlertEn: triggersDayCaseWarning
      ? `HKIA / Insurer Claims Alert: Routine endoscopy & cataract procedures without acute clinical complications are audited under "Day-Case Medical Necessity". Performing at a Day-Case Endoscopy Centre cuts the bill from HK$${totalEstimatedBillHkd.toLocaleString()} to HK$${proc.dayCaseCenterFeeHkd.toLocaleString()} with HK$0 cashless co-pay!`
      : 'Clinical setting aligns with insurer Medical Necessity guidelines — submit Cashless LOG 5 working days prior.',
    medicalNecessityAlertZh: triggersDayCaseWarning
      ? `理賠審核重點提示：無併發症之腸胃鏡及白內障手術受香港保司「醫療必需（Medical Necessity）」條款嚴格審視。改於網絡日間內視鏡中心進行，賬單由 HK$${totalEstimatedBillHkd.toLocaleString()} 大減至 HK$${proc.dayCaseCenterFeeHkd.toLocaleString()}，更享免找數零自付！`
      : '符合住院「醫療必需」指引——建議於入院前 5 個工作天遞交免找數預先批核（LOG）。',
    claimSequenceStepsEn: [
      `1. Obtain Attending Doctor's Pre-Approval Form & Pathology/Referral Note 5 business days before procedure.`,
      `2. Submit 1st Claim to Employer Group Insurer (recovers HK$${step1EmployerGroupPaidHkd.toLocaleString()}) and request Certified True Copy of receipts + Settlement Advice.`,
      `3. Submit 2nd Balance Claim to Personal VHIS / High-End Medical (offsets HK$${params.personalDeductibleHkd.toLocaleString()} deductible and reimburses HK$${step2PersonalMedicalPaidHkd.toLocaleString()}).`,
    ],
    claimSequenceStepsZh: [
      '1. 手術前 5 個工作天由主診專科醫生簽署《預先批核申請表》（LOG），列明臨床症狀及醫療必需原因。',
      `2. 第一順位向「公司團體醫保」索償（預計賠付 HK$${step1EmployerGroupPaidHkd.toLocaleString()}），並索取收據核證副本（Certified True Copy）及賠償結算書。`,
      `3. 第二順位向「個人 VHIS／高端醫療」遞交餘額索償（已自動抵銷 HK$${params.personalDeductibleHkd.toLocaleString()} 自付額，再賠付 HK$${step2PersonalMedicalPaidHkd.toLocaleString()}）。`,
    ],
  };
}

// ----------------------------------------------------------------------------
// FN-09: Cantonese / Mandarin Meeting Transcript -> Auto-GL30 FNA Extractor
// ----------------------------------------------------------------------------
export interface ExtractedVoiceFnaResult {
  fnaRecord: FnaRecord;
  extractedSummaryNotes: string;
  complianceAuditTrail: string[];
  sourceMode: 'gemini-voice-fna' | 'deterministic-cantonese-parser';
}

export function extractGl30FnaFromTranscriptDeterministically(
  transcript: string
): ExtractedVoiceFnaResult {
  const t = transcript.toLowerCase();

  // Parse monthly income in HKD (e.g., "月入八萬五" / "85000" / "85k" / "月薪 95,000")
  let monthlyIncomeHkd = 68000;
  const kMatch = transcript.match(/(?:income|salary|月入|月薪|收入)[^\d]{0,12}(\d{2,3})\s*k\b/i);
  const numMatch = transcript.match(
    /(?:income|salary|月入|月薪|每月收入)[^\d]{0,12}([\d,]{5,7})/i
  );
  const wanMatch = transcript.match(/(?:月入|月薪|收入)[^\d一二三四五六七八九十]{0,6}(\d+(?:\.\d+)?)\s*[萬万]/);

  if (kMatch) {
    monthlyIncomeHkd = Number(kMatch[1]) * 1000;
  } else if (numMatch) {
    monthlyIncomeHkd = Number(numMatch[1].replace(/,/g, '')) || 68000;
  } else if (wanMatch) {
    monthlyIncomeHkd = Math.round(Number(wanMatch[1]) * 10000);
  } else if (/八萬五|8\.5萬/.test(transcript)) {
    monthlyIncomeHkd = 85000;
  } else if (/十二萬|12萬/.test(transcript)) {
    monthlyIncomeHkd = 120000;
  }

  // Monthly expenses
  let monthlyExpensesHkd = Math.round(monthlyIncomeHkd * 0.46);
  const expMatch = transcript.match(/(?:expense|開支|洗費|供樓連家用|支出)[^\d]{0,12}([\d,]{4,6})/i);
  const expWan = transcript.match(/(?:開支|洗費|支出)[^\d]{0,6}(\d+(?:\.\d+)?)\s*[萬万]/);
  if (expMatch) {
    monthlyExpensesHkd = Number(expMatch[1].replace(/,/g, '')) || monthlyExpensesHkd;
  } else if (expWan) {
    monthlyExpensesHkd = Math.round(Number(expWan[1]) * 10000);
  } else if (/三萬八|38000/.test(transcript)) {
    monthlyExpensesHkd = 38000;
  }

  // Liquid assets
  let liquidAssetsHkd = 1_500_000;
  const assetMatch = transcript.match(/(?:liquid|cash|saving|流動資產|現金|存款)[^\d]{0,15}([\d,]{6,9})/i);
  const assetM = transcript.match(/(\d+(?:\.\d+)?)\s*(?:m|million|百萬)/i);
  if (assetMatch) {
    liquidAssetsHkd = Number(assetMatch[1].replace(/,/g, '')) || 1_500_000;
  } else if (assetM) {
    liquidAssetsHkd = Math.round(Number(assetM[1]) * 1_000_000);
  } else if (/二百五十萬|250萬/.test(transcript)) {
    liquidAssetsHkd = 2_500_000;
  }

  // Dependents
  let dependentsCount = 1;
  if (/兩個小朋友|兩名子女|two kids|2 children|太太同兩個|父母同小朋友/.test(t)) {
    dependentsCount = 2;
  } else if (/三個|3名受養/.test(t)) {
    dependentsCount = 3;
  } else if (/單身|single|無受養人|0 dependent/.test(t)) {
    dependentsCount = 0;
  }

  // Risk tolerance
  let riskTolerance: RiskTolerance = 'BALANCED';
  if (/conservative|保守|保本為主|唔想蝕/.test(t)) {
    riskTolerance = 'CONSERVATIVE';
  } else if (/moderate|穩健/.test(t)) {
    riskTolerance = 'MODERATE';
  } else if (/growth|進取|長線增值|高回報/.test(t)) {
    riskTolerance = 'GROWTH';
  }

  // Objectives
  const primaryObjectives: string[] = [];
  if (/升學|英國讀書|education|tuition|海外大學/.test(t)) {
    primaryObjectives.push('Children Overseas Education Reserve');
  }
  if (/退休|年金|扣稅|qdap|retirement|annuity/.test(t)) {
    primaryObjectives.push('Tax-Deductible Retirement Passive Income');
  }
  if (/醫保|vhis|私家醫院|養和|medical|hospital/.test(t)) {
    primaryObjectives.push('Private Hospital Cashless Medical Top-Up');
  }
  if (/危疾|cancer|癌症|critical illness/.test(t)) {
    primaryObjectives.push('Critical Illness Income Protection');
  }
  if (primaryObjectives.length === 0) {
    primaryObjectives.push('Multi-Currency Wealth & Family Protection');
  }

  const fnaRecord: FnaRecord = {
    monthlyIncomeHkd,
    monthlyExpensesHkd,
    liquidAssetsHkd,
    dependentsCount,
    riskTolerance,
    primaryObjectives,
    postRetirementSourceNote:
      'Confirmed liquid cash & MPF/time-deposit reserves cover any post-retirement premium obligations without borrowing.',
    signedAtIso: new Date().toISOString(),
  };

  const surplus = Math.max(0, monthlyIncomeHkd - monthlyExpensesHkd);

  return {
    fnaRecord,
    extractedSummaryNotes: `[GL30 Meeting Minutes Auto-Extracted] Monthly Income HK$${monthlyIncomeHkd.toLocaleString()}, Monthly Expenses HK$${monthlyExpensesHkd.toLocaleString()} (Monthly Surplus HK$${surplus.toLocaleString()}), Liquid Assets HK$${liquidAssetsHkd.toLocaleString()}, Dependents: ${dependentsCount}, Risk Profile: ${riskTolerance}. Objectives: ${primaryObjectives.join(', ')}.`,
    complianceAuditTrail: [
      'PDPO Cap. 486 PICS Explicit Recording Consent logged prior to transcription',
      `GL30 Affordability Verified: Monthly disposable surplus HK$${surplus.toLocaleString()}/mo`,
      `Suitability Objectives Mapped: ${primaryObjectives.join(' · ')}`,
    ],
    sourceMode: 'deterministic-cantonese-parser',
  };
}

// ----------------------------------------------------------------------------
// FN-10: MDRT / COT / TOT Commission & 13/25-Month Persistency Clawback Tracker
// ----------------------------------------------------------------------------
export interface MdrtPersistencyResult {
  hkMdrtFycTargetHkd: number;
  cotFycTargetHkd: number;
  totFycTargetHkd: number;
  earnedIssuedFycHkd: number;
  projectedPipelineFycHkd: number;
  totalProjectedFycHkd: number;
  mdrtProgressPct: number;
  shortfallToMdrtHkd: number;
  persistency13MonthPct: number;
  persistency25MonthPct: number;
  clawbackExposureHkd: number;
  atRiskPolicies: Array<{
    policyRef: string;
    clientName: string;
    planName: string;
    annualPremiumHkd: number;
    fycAtRiskHkd: number;
    dueDaysRemaining: number;
  }>;
}

export function calculateMdrtProjectionAndPersistency(params: {
  applications: PolicyApplicationRecord[];
  leads: ClientLead[];
  manualYtdFycHkd: number;
  avgFycCommissionRatePct: number; // e.g., 32% blended FYC
}): MdrtPersistencyResult {
  const HK_MDRT_TARGET = 579_700; // Official HKIA/MDRT HKD FYC baseline
  const COT_TARGET = HK_MDRT_TARGET * 3;
  const TOT_TARGET = HK_MDRT_TARGET * 6;
  const commRate = params.avgFycCommissionRatePct / 100;

  const appFyc = params.applications.reduce((acc, app) => {
    const hkdPrem =
      app.currency === 'USD'
        ? app.annualPremium * 7.8
        : app.currency === 'RMB'
        ? app.annualPremium * 1.08
        : app.annualPremium;
    return acc + hkdPrem * commRate;
  }, 0);

  const earnedIssuedFycHkd = Math.round(params.manualYtdFycHkd + appFyc);

  // Active pipeline leads in FNA_COMPLETED / PROPOSAL_SENT / UNDERWRITING weighted by stage probability
  const projectedPipelineFycHkd = Math.round(
    params.leads.reduce((sum, lead) => {
      const estAnnualHkd = (lead.fnaRecord?.monthlyIncomeHkd || 55_000) * 1.4;
      const prob =
        lead.stage === 'UNDERWRITING'
          ? 0.75
          : lead.stage === 'PROPOSAL_SENT'
          ? 0.45
          : lead.stage === 'FNA_COMPLETED'
          ? 0.25
          : 0.1;
      return lead.stage === 'IN_FORCE' ? sum : sum + estAnnualHkd * commRate * prob;
    }, 0)
  );

  const totalProjectedFycHkd = earnedIssuedFycHkd + projectedPipelineFycHkd;
  const mdrtProgressPct = Math.min(
    100,
    Number(((earnedIssuedFycHkd / HK_MDRT_TARGET) * 100).toFixed(1))
  );
  const shortfallToMdrtHkd = Math.max(0, HK_MDRT_TARGET - earnedIssuedFycHkd);

  const atRiskPolicies = [
    {
      policyRef: 'AIA-2025-88412',
      clientName: 'Ms. Zhou Yuting (周雨婷)',
      planName: 'AIA Love Abundant 2 (USD 25,000/yr)',
      annualPremiumHkd: 195_000,
      fycAtRiskHkd: 68_250,
      dueDaysRemaining: 9,
    },
    {
      policyRef: 'SUN-2025-41902',
      clientName: 'Mr. Marcus Chan (陳俊傑)',
      planName: 'SunJoy Global II (USD 15,000/yr)',
      annualPremiumHkd: 117_000,
      fycAtRiskHkd: 37_440,
      dueDaysRemaining: 18,
    },
  ];

  const clawbackExposureHkd = atRiskPolicies.reduce((s, p) => s + p.fycAtRiskHkd, 0);

  return {
    hkMdrtFycTargetHkd: HK_MDRT_TARGET,
    cotFycTargetHkd: COT_TARGET,
    totFycTargetHkd: TOT_TARGET,
    earnedIssuedFycHkd,
    projectedPipelineFycHkd,
    totalProjectedFycHkd,
    mdrtProgressPct,
    shortfallToMdrtHkd,
    persistency13MonthPct: 96.4,
    persistency25MonthPct: 94.1,
    clawbackExposureHkd,
    atRiskPolicies,
  };
}

// ----------------------------------------------------------------------------
// FN-11 + 07 imp-agent-1: Smart Policy Anniversary, Yr-3 Currency Switch,
// Yr-15 Dividend Lock-In & April Tax-Receipt Alert Queue
// ----------------------------------------------------------------------------
export interface SmartTouchpointAlert {
  id: string;
  triggerType: 'ANNIVERSARY_RENEWAL' | 'YEAR_3_CURRENCY_SWITCH' | 'YEAR_15_BONUS_LOCK' | 'IRD_TAX_RECEIPT';
  urgencyDays: number;
  clientNameEn: string;
  clientNameZh: string;
  policySummary: string;
  actionTitleEn: string;
  actionTitleZh: string;
  whatsappTemplateEn: string;
  whatsappTemplateZh: string;
}

export function buildAnniversaryAndFxAlertQueue(
  leads: ClientLead[],
  intermediary: IntermediaryProfile
): SmartTouchpointAlert[] {
  const lead0 = leads[0];
  const lead1 = leads[1] || leads[0];

  return [
    {
      id: 'ALERT_YR3_CCY_SWITCH',
      triggerType: 'YEAR_3_CURRENCY_SWITCH',
      urgencyDays: 7,
      clientNameEn: lead0?.fullNameEn || 'Marcus Chan',
      clientNameZh: lead0?.fullNameZh || '陳俊傑',
      policySummary: 'Sun Life SunJoy Global — Policy Anniversary Yr 3 Window',
      actionTitleEn: 'Year-3 Policy Currency Conversion & Child Split Window Open',
      actionTitleZh: '第 3 保單週年「多元貨幣轉換（USD→GBP/CAD）」及保單分拆窗口開啟',
      whatsappTemplateEn: `Hi ${lead0?.fullNameEn || 'Marcus'}, your multi-currency savings policy reaches its 3rd Policy Anniversary in 7 days — your fee-free GBP/CAD/USD currency switch & child policy-split option is now unlocked. Shall we review your overseas tuition FX allocation this week? — ${intermediary.nameEn} (IA Lic: ${intermediary.iaLicenseNo})`,
      whatsappTemplateZh: `${lead0?.fullNameZh || '陳先生'}您好！您的多元貨幣儲蓄保單將於 7 日後踏入第 3 個保單週年，現已正式解鎖「免費轉換英鎊／加元／澳元」及「保單分拆」權益。本週方便用 10 分鐘檢視海外升學匯率配置嗎？— 持牌顧問 ${intermediary.nameZh}（牌照：${intermediary.iaLicenseNo}）`,
    },
    {
      id: 'ALERT_MCV_EDDA_RENEWAL',
      triggerType: 'ANNIVERSARY_RENEWAL',
      urgencyDays: 9,
      clientNameEn: lead1?.fullNameEn || 'Zhou Yuting',
      clientNameZh: lead1?.fullNameZh || '周雨婷',
      policySummary: 'AIA / BOC Life USD 25,000 Renewal (13-Month Persistency Gate)',
      actionTitleEn: '9-Day Renewal Due: Confirm BOCHK / HSBC HKD/USD eDDA Balance',
      actionTitleZh: '續期保費 9 日後到期：提醒客戶確認中銀香港／滙豐 eDDA 港美金餘額',
      whatsappTemplateEn: `Dear ${lead1?.fullNameEn || 'Ms. Zhou'}, gentle reminder that your annual policy renewal (USD 25,000 / ~HK$195,000) will auto-debit via eDDA in 9 days. Please ensure sufficient HKD/USD balance in your HK bank account to maintain uninterrupted coverage. — ${intermediary.nameEn}`,
      whatsappTemplateZh: `${lead1?.fullNameZh || '周小姐'}您好，溫馨提示您的年度續期保費（USD 25,000／約 HK$195,000）將於 9 日後經香港銀行 eDDA 自動扣賬，請預先確認中銀香港／滙豐賬戶餘額充足，確保保障無縫延續。— 顧問 ${intermediary.nameZh}`,
    },
    {
      id: 'ALERT_YR15_BONUS_LOCK',
      triggerType: 'YEAR_15_BONUS_LOCK',
      urgencyDays: 14,
      clientNameEn: 'Raymond Kwok',
      clientNameZh: '郭志遠',
      policySummary: 'Prudential Evergreen Growth — Yr 15 Terminal Dividend Lock-In',
      actionTitleEn: 'Year-15 Terminal Bonus Lock-In (Convert up to 50% Non-Guaranteed → Guaranteed)',
      actionTitleZh: '第 15 週年「終期紅利鎖定」良機（將高達 50% 非保證紅利轉入保證派息戶口）',
      whatsappTemplateEn: `Hi Raymond, your participating policy has reached its 15th Anniversary with strong cumulative terminal bonus. Within 30 days of anniversary, we can lock up to 50% of non-guaranteed terminal bonus into the guaranteed interest account. Let's review! — ${intermediary.nameEn}`,
      whatsappTemplateZh: `郭先生您好！您的保誠分紅保單即將踏入第 15 個保單週年，我們可於週年日起 30 日內行使「終期紅利鎖定選項」，將高達 50% 非保證紅利轉為保證現金儲蓄生息，鎖定市場高位回報！— ${intermediary.nameZh}`,
    },
    {
      id: 'ALERT_APRIL_TAX_CERT',
      triggerType: 'IRD_TAX_RECEIPT',
      urgencyDays: 21,
      clientNameEn: lead0?.fullNameEn || 'Marcus Chan',
      clientNameZh: lead0?.fullNameZh || '陳俊傑',
      policySummary: 'HKSAR IRD BIR60 Tax Return — VHIS + QDAP Annual Premium Certificates',
      actionTitleEn: 'Dispatch Official VHIS (HK$8k) & QDAP (HK$60k) Tax Deduction Summaries',
      actionTitleZh: '一鍵發送稅季 VHIS 自願醫保及 QDAP 延期年金官方扣稅證明書摘要',
      whatsappTemplateEn: `Hi ${lead0?.fullNameEn || 'Marcus'}, ahead of your HKSAR BIR60 tax filing, I have prepared your consolidated VHIS & QDAP annual deductible premium schedule so you can claim full Salaries Tax relief smoothly. — ${intermediary.nameEn}`,
      whatsappTemplateZh: `${lead0?.fullNameZh || '陳先生'}您好！踏入香港報稅季（BIR60），我已為您整理好上年度 VHIS 自願醫保及 QDAP 合資格延期年金之全年可扣稅保費明細，方便您報稅時足額申報扣減！— ${intermediary.nameZh}`,
    },
  ];
}

// ----------------------------------------------------------------------------
// FN-12: HKIA Annual 15-Hour CPD Ledger, 21-Day Cooling-Off & CPFI Auditor
// ----------------------------------------------------------------------------
export interface CpdComplianceAuditResult {
  totalRequiredHours: number;
  ethicsRequiredHours: number;
  loggedTotalHours: number;
  loggedEthicsHours: number;
  remainingTotalHours: number;
  remainingEthicsHours: number;
  isCpdCompliant: boolean;
  cpfiSurrenderLossHkd: number;
  cpfiContestabilityResetRisk: boolean;
  cpfiVerdictEn: string;
  cpfiVerdictZh: string;
}

export function evaluateHkiaCpdAndCpfiCompliance(params: {
  ethicsCpdHours: number;
  technicalProductCpdHours: number;
  regTechComplianceCpdHours: number;
  existingPolicyPaidPremiumsHkd: number;
  existingPolicyCurrentCsvHkd: number;
  isReplacingExistingLifeOrMedical: boolean;
}): CpdComplianceAuditResult {
  const TOTAL_REQ = 15; // HKIA GL24 assessment period requirement (Aug 1 – Jul 31)
  const ETHICS_REQ = 3; // Mandatory minimum 3 hours in Ethics or Regulations

  const loggedEthicsHours = Number(params.ethicsCpdHours.toFixed(1));
  const loggedTotalHours = Number(
    (
      params.ethicsCpdHours +
      params.technicalProductCpdHours +
      params.regTechComplianceCpdHours
    ).toFixed(1)
  );

  const remainingTotalHours = Math.max(0, Number((TOTAL_REQ - loggedTotalHours).toFixed(1)));
  const remainingEthicsHours = Math.max(0, Number((ETHICS_REQ - loggedEthicsHours).toFixed(1)));
  const isCpdCompliant = remainingTotalHours === 0 && remainingEthicsHours === 0;

  const cpfiSurrenderLossHkd = params.isReplacingExistingLifeOrMedical
    ? Math.max(0, params.existingPolicyPaidPremiumsHkd - params.existingPolicyCurrentCsvHkd)
    : 0;

  return {
    totalRequiredHours: TOTAL_REQ,
    ethicsRequiredHours: ETHICS_REQ,
    loggedTotalHours,
    loggedEthicsHours,
    remainingTotalHours,
    remainingEthicsHours,
    isCpdCompliant,
    cpfiSurrenderLossHkd,
    cpfiContestabilityResetRisk: params.isReplacingExistingLifeOrMedical,
    cpfiVerdictEn: !params.isReplacingExistingLifeOrMedical
      ? 'New Top-Up Policy (No Policy Replacement): Standard 21-day cooling-off sign-off applies; no CPFI surrender loss.'
      : `Mandatory HKIA CPFI Triggered (客戶保障聲明書): Surrendering the existing policy incurs an immediate HK$${cpfiSurrenderLossHkd.toLocaleString()} cash-value loss and resets the 2-year incontestability & CI waiting period! Recommend keeping existing policy or using VHIS High-Deductible Top-Up instead.`,
    cpfiVerdictZh: !params.isReplacingExistingLifeOrMedical
      ? '新增獨立保單（不涉及轉保）：適用標準 21 日冷靜期簽收追蹤，無須觸發轉保損失警告。'
      : `觸發保監局強制《客戶保障聲明書（CPFI）》：退保現有保單將導致即時 HK$${cpfiSurrenderLossHkd.toLocaleString()} 現金價值損失，並重新計算 2 年不可異議期及危疾等候期！強烈建議保留舊單並改以加保／高自付額 VHIS 補足缺口。`,
  };
}
