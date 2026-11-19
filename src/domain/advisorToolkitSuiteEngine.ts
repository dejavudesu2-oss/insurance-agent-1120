import {
  ClientLead,
  CurrencyCode,
  ExistingPolicyAuditItem,
  HouseholdMember,
  HouseholdRelation,
  InsurancePlan,
  PlanCategory,
  PolicyApplicationRecord,
  PromoAdminOverride,
  ProtectionDimensionId,
} from './types';

// ============================================================================
// 1. NATIVE MOBILE SHARE & WHATSAPP PAYLOAD BUILDER (Suggestion #1)
// ============================================================================

export interface ProposalSharePayloadInput {
  clientNameZh: string;
  clientNameEn: string;
  planNameZh: string;
  planNameEn: string;
  insurerNameZh: string;
  insurerCode: string;
  annualPremiumDisplay: string;
  proposalUrl?: string;
  advisorNameZh: string;
  advisorLicenseNo: string;
  whatsappPhone?: string;
}

export interface ProposalSharePayload {
  titleZh: string;
  titleEn: string;
  textZh: string;
  textEn: string;
  url: string;
  whatsappWebHref: string;
}

function sanitizePhoneDigits(raw?: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.length === 8) return `852${digits}`;
  return digits;
}

export function buildProposalSharePayload(
  input: ProposalSharePayloadInput
): ProposalSharePayload {
  const safeUrl = input.proposalUrl || 'https://hk-is-pro.web.app';
  const titleZh = `${input.clientNameZh} 專屬保險建議書摘要（${input.insurerCode}）`;
  const titleEn = `${input.clientNameEn} — Insurance Proposal Brief (${input.insurerCode})`;

  const textZh = [
    `${input.clientNameZh} 您好！以下係為你整理好嘅保障及儲蓄方案重點：`,
    `・選用計劃：[${input.insurerNameZh}] ${input.planNameZh}`,
    `・預計每年保費：${input.annualPremiumDisplay}`,
    `・手機版建議書連結：${safeUrl}`,
    `（打開連結即可喺電話睇清每年保證及非保證現金價值；保單享有 21 日冷靜期保障）`,
    `持牌顧問：${input.advisorNameZh}（保監局牌照：${input.advisorLicenseNo}）`,
  ].join('\n');

  const textEn = [
    `Hi ${input.clientNameEn}, here is your personalized Hong Kong insurance summary:`,
    `• Plan: [${input.insurerCode}] ${input.planNameEn}`,
    `• Est. Annual Premium: ${input.annualPremiumDisplay}`,
    `• Mobile Proposal Link: ${safeUrl}`,
    `(Includes 21-day cooling-off protection; Guaranteed & Non-Guaranteed values shown separately.)`,
    `Advisor: ${input.advisorNameZh} (HKIA License: ${input.advisorLicenseNo})`,
  ].join('\n');

  const phoneDigits = sanitizePhoneDigits(input.whatsappPhone);
  const encodedText = encodeURIComponent(textZh);
  const whatsappWebHref = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  return {
    titleZh,
    titleEn,
    textZh,
    textEn,
    url: safeUrl,
    whatsappWebHref,
  };
}

// ============================================================================
// 2. FAMILY POLICY & HK SALARIES TAX DEDUCTION ENGINE (Suggestion #2)
// ============================================================================

export const VHIS_CAP_PER_INSURED_HKD = 8000;
export const QDAP_CAP_PER_TAXPAYER_HKD = 60000;

export interface FamilyMemberComputedRow {
  id: string;
  nameZh: string;
  nameEn: string;
  relationLabelZh: string;
  relationLabelEn: string;
  age: number;
  annualPremiumHkd: number;
  policySummaryZh: string;
  vhisEligible: boolean;
  qdapEligible: boolean;
  vhisCapHkd: number;
}

export interface FamilyPolicyOverviewResult {
  rows: FamilyMemberComputedRow[];
  hasSpouse: boolean;
  totalMembersCount: number;
  vhisEligibleCount: number;
  qdapTaxpayerCount: number;
  totalFamilyAnnualPremiumHkd: number;
  totalFamilyMonthlyPremiumHkd: number;
  familyBudgetHkd: number;
  budgetUtilizationPct: number;
  maxVhisDeductionCapHkd: number;
  maxQdapJointDeductionCapHkd: number;
  totalEligibleDeductionCapHkd: number;
  estimatedTaxSavedAt15PctHkd: number;
  estimatedTaxSavedAt17PctHkd: number;
  netAfterTaxAnnualHkd: number;
  whatsappFamilySummaryZh: string;
}

export function getRelationLabel(relation: HouseholdRelation | 'SELF'): {
  zh: string;
  en: string;
} {
  switch (relation) {
    case 'SELF':
      return { zh: '本人（投保人）', en: 'Self (Policyholder)' };
    case 'SPOUSE':
      return { zh: '配偶', en: 'Spouse' };
    case 'CHILD':
      return { zh: '子女', en: 'Child' };
    case 'PARENT':
      return { zh: '父母／長輩', en: 'Parent' };
  }
}

export function computeFamilyPolicyOverview(params: {
  lead: ClientLead;
  selfProposalAnnualHkd: number;
  marginalTaxRate?: 0.15 | 0.17;
}): FamilyPolicyOverviewResult {
  const { lead, selfProposalAnnualHkd } = params;
  const existingSelfAnnualHkd = (lead.existingPolicies || []).reduce(
    (sum, p) => sum + Math.max(0, Number(p.annualPremiumHkd) || 0),
    0
  );
  const selfAnnualHkd = Math.round(
    existingSelfAnnualHkd + Math.max(0, Number(selfProposalAnnualHkd) || 0)
  );

  const selfRow: FamilyMemberComputedRow = {
    id: 'self-primary',
    nameZh: lead.fullNameZh,
    nameEn: lead.fullNameEn,
    relationLabelZh: '本人（主投保人）',
    relationLabelEn: 'Self (Primary)',
    age: lead.age,
    annualPremiumHkd: selfAnnualHkd,
    policySummaryZh:
      lead.existingPolicies && lead.existingPolicies.length > 0
        ? `現有 ${lead.existingPolicies.length} 份保單 ＋ 新方案預算`
        : '主投保人保障及儲蓄方案',
    vhisEligible: lead.residency === 'HK_RESIDENT',
    qdapEligible: lead.residency === 'HK_RESIDENT',
    vhisCapHkd: lead.residency === 'HK_RESIDENT' ? VHIS_CAP_PER_INSURED_HKD : 0,
  };

  const members: HouseholdMember[] = lead.householdMembers || [];
  const memberRows: FamilyMemberComputedRow[] = members.map((m) => {
    const rel = getRelationLabel(m.relation);
    const defaultPrem =
      typeof m.annualPremiumHkd === 'number'
        ? Math.max(0, m.annualPremiumHkd)
        : m.relation === 'SPOUSE'
        ? 18600
        : m.relation === 'CHILD'
        ? 9800
        : 16400;
    const defaultSummary =
      m.policySummaryZh ||
      (m.relation === 'SPOUSE'
        ? '自願醫保半私家房 ＋ 危疾保障'
        : m.relation === 'CHILD'
        ? '小朋友自願醫保 ＋ 意外醫療'
        : '長輩自願醫保靈活計劃（墊底費）');

    return {
      id: m.id,
      nameZh: m.nameZh,
      nameEn: m.nameEn || m.nameZh,
      relationLabelZh: rel.zh,
      relationLabelEn: rel.en,
      age: m.age,
      annualPremiumHkd: Math.round(defaultPrem),
      policySummaryZh: defaultSummary,
      vhisEligible: Boolean(m.vhisEligible),
      qdapEligible: Boolean(m.qdapEligible && m.relation !== 'CHILD'),
      vhisCapHkd: m.vhisEligible ? VHIS_CAP_PER_INSURED_HKD : 0,
    };
  });

  const rows = [selfRow, ...memberRows];
  const hasSpouse = members.some((m) => m.relation === 'SPOUSE');
  const vhisEligibleCount = rows.filter((r) => r.vhisEligible).length;

  // Under HK IRD rules: QDAP + MPF TVC joint deduction is HK$60,000 per taxpayer,
  // or HK$120,000 for married couples with joint/shared eligible annuity premiums.
  const qdapTaxpayerCount =
    lead.residency === 'HK_RESIDENT'
      ? hasSpouse && members.some((m) => m.relation === 'SPOUSE' && m.qdapEligible)
        ? 2
        : 1
      : 0;

  const maxVhisDeductionCapHkd = vhisEligibleCount * VHIS_CAP_PER_INSURED_HKD;
  const maxQdapJointDeductionCapHkd = qdapTaxpayerCount * QDAP_CAP_PER_TAXPAYER_HKD;
  const totalEligibleDeductionCapHkd =
    maxVhisDeductionCapHkd + maxQdapJointDeductionCapHkd;

  const totalFamilyAnnualPremiumHkd = rows.reduce(
    (sum, r) => sum + r.annualPremiumHkd,
    0
  );
  const totalFamilyMonthlyPremiumHkd = Math.round(totalFamilyAnnualPremiumHkd / 12);

  // Effective deductible amount is capped by actual family annual premium or statutory cap
  const effectiveDeductibleAmountHkd = Math.min(
    totalFamilyAnnualPremiumHkd,
    totalEligibleDeductionCapHkd
  );
  const estimatedTaxSavedAt15PctHkd = Math.round(effectiveDeductibleAmountHkd * 0.15);
  const estimatedTaxSavedAt17PctHkd = Math.round(effectiveDeductibleAmountHkd * 0.17);

  const familyBudgetHkd = Math.max(
    36000,
    (lead.annualBudgetHkd || 48000) + members.length * 15000
  );
  const budgetUtilizationPct = Math.min(
    199,
    Math.round((totalFamilyAnnualPremiumHkd / Math.max(1, familyBudgetHkd)) * 100)
  );

  const activeTaxSaved =
    params.marginalTaxRate === 0.15
      ? estimatedTaxSavedAt15PctHkd
      : estimatedTaxSavedAt17PctHkd;

  const netAfterTaxAnnualHkd = Math.max(
    0,
    totalFamilyAnnualPremiumHkd - activeTaxSaved
  );

  const whatsappFamilySummaryZh = [
    `【${lead.fullNameZh} 家庭保單及扣稅上限總覽】`,
    `・家庭受保人數：共 ${rows.length} 位（${rows.map((r) => r.nameZh).join('、')}）`,
    `・全家每年總保費：HK$ ${totalFamilyAnnualPremiumHkd.toLocaleString()}（平均每月約 HK$ ${totalFamilyMonthlyPremiumHkd.toLocaleString()}）`,
    `・自願醫保 VHIS 扣稅上限：HK$ ${maxVhisDeductionCapHkd.toLocaleString()}（${vhisEligibleCount} 位受保親屬 × HK$8,000）`,
    `・合資格延期年金 QDAP 扣稅上限：HK$ ${maxQdapJointDeductionCapHkd.toLocaleString()}（${qdapTaxpayerCount === 2 ? '夫婦合併上限 HK$120,000' : '個人上限 HK$60,000'}）`,
    `・預計每年最多可慳薪俸稅（17% 邊際稅率）：約 HK$ ${estimatedTaxSavedAt17PctHkd.toLocaleString()}`,
    `・扣稅後全家實質淨年供：約 HK$ ${netAfterTaxAnnualHkd.toLocaleString()}`,
  ].join('\n');

  return {
    rows,
    hasSpouse,
    totalMembersCount: rows.length,
    vhisEligibleCount,
    qdapTaxpayerCount,
    totalFamilyAnnualPremiumHkd,
    totalFamilyMonthlyPremiumHkd,
    familyBudgetHkd,
    budgetUtilizationPct,
    maxVhisDeductionCapHkd,
    maxQdapJointDeductionCapHkd,
    totalEligibleDeductionCapHkd,
    estimatedTaxSavedAt15PctHkd,
    estimatedTaxSavedAt17PctHkd,
    netAfterTaxAnnualHkd,
    whatsappFamilySummaryZh,
  };
}

// ============================================================================
// 3. INSURER QUARTERLY PROMO & PREPAYMENT TRACKER (Suggestion #3)
// ============================================================================

export type PromoFilterKind =
  | 'ALL'
  | 'CLOSING_SOON'
  | 'HIGH_PREPAY'
  | 'SAVINGS'
  | 'MEDICAL_CI';

export interface InsurerQuarterlyPromo {
  id: string;
  insurerCode: string;
  insurerNameZh: string;
  insurerNameEn: string;
  campaignTitleZh: string;
  campaignTitleEn: string;
  focusKind: 'SAVINGS' | 'MEDICAL_CI';
  firstYearRebatePct: number;
  comboExtraRebatePct: number;
  prepaidInterestPct: number | null; // e.g., 4.8 for 4.8% p.a. guaranteed USD prepay
  minAnnualPremiumUsd: number;
  deadlineDateIso: string; // YYYY-MM-DD
  highlightNoteZh: string;
  highlightNoteEn: string;
}

export interface EvaluatedInsurerPromo extends InsurerQuarterlyPromo {
  daysRemaining: number;
  urgencyBadge: 'URGENT_7D' | 'CLOSING_14D' | 'ACTIVE' | 'EXPIRED';
  whatsappPromoAlertZh: string;
}

export const HK_INSURER_QUARTERLY_PROMOS: InsurerQuarterlyPromo[] = [
  {
    id: 'promo-aia-q4',
    insurerCode: 'AIA',
    insurerNameZh: '友邦香港 AIA',
    insurerNameEn: 'AIA Hong Kong',
    campaignTitleZh: '多元貨幣儲蓄及自願醫保本季保費回贈',
    campaignTitleEn: 'Multi-Currency Savings & VHIS Seasonal Rebate',
    focusKind: 'SAVINGS',
    firstYearRebatePct: 16,
    comboExtraRebatePct: 4,
    prepaidInterestPct: 4.8,
    minAnnualPremiumUsd: 10000,
    deadlineDateIso: '2026-11-24',
    highlightNoteZh: '5 年繳預繳保費享每年 4.8% 保證利息；連同醫療投保額外多 4% 回贈',
    highlightNoteEn: '4.8% p.a. guaranteed USD prepay interest + 4% combo bonus with VHIS',
  },
  {
    id: 'promo-pru-q4',
    insurerCode: 'PRU',
    insurerNameZh: '保誠保險 Prudential',
    insurerNameEn: 'Prudential HK',
    campaignTitleZh: '信守明天儲蓄預繳高息及家庭危疾優惠',
    campaignTitleEn: 'Savings Prepayment Lock & Family CI Rebate',
    focusKind: 'SAVINGS',
    firstYearRebatePct: 18,
    comboExtraRebatePct: 3,
    prepaidInterestPct: 5.0,
    minAnnualPremiumUsd: 15000,
    deadlineDateIso: '2026-11-20',
    highlightNoteZh: '指定美金儲蓄預繳享 5.0% 保證年息鎖定；家庭成員同投危疾再減首年保費',
    highlightNoteEn: '5.0% p.a. guaranteed USD prepay interest lock; extra family CI discount',
  },
  {
    id: 'promo-manu-q4',
    insurerCode: 'MANULIFE',
    insurerNameZh: '宏利香港 Manulife',
    insurerNameEn: 'Manulife HK',
    campaignTitleZh: '活耀人生危疾 ＋ 全護航自願醫保雙重回贈',
    campaignTitleEn: 'Critical Illness + VHIS Dual Protection Rebate',
    focusKind: 'MEDICAL_CI',
    firstYearRebatePct: 20,
    comboExtraRebatePct: 5,
    prepaidInterestPct: null,
    minAnnualPremiumUsd: 3000,
    deadlineDateIso: '2026-11-30',
    highlightNoteZh: '危疾連同自願醫保一齊投保最高享首年 25% 保費回贈，兼享扣稅優惠',
    highlightNoteEn: 'Up to 25% combined first-year rebate when pairing CI + VHIS Flexi',
  },
  {
    id: 'promo-sunlife-q4',
    insurerCode: 'SUNLIFE',
    insurerNameZh: '永明金融 Sun Life',
    insurerNameEn: 'Sun Life HK',
    campaignTitleZh: '萬年青星河傳承儲蓄回贈及預繳優惠',
    campaignTitleEn: 'Stellar Legacy Savings Rebate & Prepay Offer',
    focusKind: 'SAVINGS',
    firstYearRebatePct: 15,
    comboExtraRebatePct: 3,
    prepaidInterestPct: 4.6,
    minAnnualPremiumUsd: 10000,
    deadlineDateIso: '2026-12-15',
    highlightNoteZh: '首年高達 15% 保費回贈，5 年期美金預繳保證年利率 4.6%',
    highlightNoteEn: 'Up to 15% FYP rebate + 4.6% p.a. guaranteed USD prepayment rate',
  },
  {
    id: 'promo-fwd-q4',
    insurerCode: 'FWD',
    insurerNameZh: '富衛保險 FWD',
    insurerNameEn: 'FWD Hong Kong',
    campaignTitleZh: '尊衛您醫療 VHIS 及危疾快閃首年折扣',
    campaignTitleEn: 'vPrime VHIS & Crisis Flash First-Year Discount',
    focusKind: 'MEDICAL_CI',
    firstYearRebatePct: 22,
    comboExtraRebatePct: 4,
    prepaidInterestPct: 4.5,
    minAnnualPremiumUsd: 2000,
    deadlineDateIso: '2026-11-21',
    highlightNoteZh: '自願醫保靈活計劃首年高達 3 個月保費回贈，無索償再享續保折扣',
    highlightNoteEn: 'Up to 22% first-year VHIS rebate + no-claim renewal discount',
  },
  {
    id: 'promo-ctf-q4',
    insurerCode: 'CTFLIFE',
    insurerNameZh: '周大福人壽 CTF Life',
    insurerNameEn: 'CTF Life',
    campaignTitleZh: '匠心傳承儲蓄預繳高息鎖定推廣',
    campaignTitleEn: 'Heritage Savings High-Interest Prepay Campaign',
    focusKind: 'SAVINGS',
    firstYearRebatePct: 17,
    comboExtraRebatePct: 3,
    prepaidInterestPct: 4.9,
    minAnnualPremiumUsd: 12000,
    deadlineDateIso: '2026-12-05',
    highlightNoteZh: '預繳全期美金保費享每年 4.9% 保證利息，適合鎖定目前高息環境',
    highlightNoteEn: '4.9% p.a. guaranteed interest on full USD premium prepayment',
  },
];

export function evaluateInsurerPromos(params: {
  promos?: InsurerQuarterlyPromo[];
  overrides?: Record<string, PromoAdminOverride>;
  filter?: PromoFilterKind;
  referenceDateIso?: string;
  clientNameZh?: string;
}): EvaluatedInsurerPromo[] {
  const promos = params.promos || HK_INSURER_QUARTERLY_PROMOS;
  const overrides = params.overrides || {};
  const filter = params.filter || 'ALL';
  const refMs = params.referenceDateIso
    ? new Date(`${params.referenceDateIso.slice(0, 10)}T00:00:00Z`).getTime()
    : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime();

  const evaluated: EvaluatedInsurerPromo[] = [];

  for (const p of promos) {
    const ov = overrides[p.insurerCode];
    if (ov?.archived) continue;

    const rebatePct =
      typeof ov?.customRebatePct === 'number'
        ? ov.customRebatePct
        : p.firstYearRebatePct;
    const prepaidPct =
      ov && ov.customPrepaidRatePct !== undefined
        ? ov.customPrepaidRatePct
        : p.prepaidInterestPct;

    const deadlineMs = new Date(`${p.deadlineDateIso}T00:00:00Z`).getTime();
    const rawDays = Math.ceil((deadlineMs - refMs) / 86400000);
    const daysRemaining =
      typeof ov?.daysRemainingOverride === 'number'
        ? ov.daysRemainingOverride
        : rawDays;

    if (daysRemaining < 0) continue;

    const urgencyBadge: EvaluatedInsurerPromo['urgencyBadge'] =
      daysRemaining <= 7
        ? 'URGENT_7D'
        : daysRemaining <= 14
        ? 'CLOSING_14D'
        : 'ACTIVE';

    const greeting = params.clientNameZh ? `${params.clientNameZh} 您好！` : '您好！';
    const prepayClause =
      prepaidPct !== null
        ? `，另外美金預繳保費仲有每年 ${prepaidPct.toFixed(1)}% 保證利息`
        : '';

    const whatsappPromoAlertZh = `${greeting}順帶提一提你，之前傾過嗰隻【${p.insurerNameZh} — ${p.campaignTitleZh}】今季首年高達 ${rebatePct}% 保費回贈（連同附約最高 +${p.comboExtraRebatePct}%）${prepayClause}，將於 ${p.deadlineDateIso}（尚餘 ${daysRemaining} 日）截止。如果想鎖定埋今季優惠，我幫你預留時間對一對細節？`;

    evaluated.push({
      ...p,
      firstYearRebatePct: rebatePct,
      prepaidInterestPct: prepaidPct,
      daysRemaining,
      urgencyBadge,
      whatsappPromoAlertZh,
    });
  }

  evaluated.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return evaluated.filter((item) => {
    if (filter === 'CLOSING_SOON') return item.daysRemaining <= 14;
    if (filter === 'HIGH_PREPAY') return (item.prepaidInterestPct || 0) >= 4.5;
    if (filter === 'SAVINGS') return item.focusKind === 'SAVINGS';
    if (filter === 'MEDICAL_CI') return item.focusKind === 'MEDICAL_CI';
    return true;
  });
}

// ============================================================================
// 4. ADVISOR-ONLY FYC & MDRT ESTIMATOR (Suggestion #4 — Hidden in Safe Mode)
// ============================================================================

export const HK_MDRT_FYC_TARGET_HKD = 552000;
export const HK_COT_FYC_TARGET_HKD = HK_MDRT_FYC_TARGET_HKD * 3; // 1,656,000
export const HK_TOT_FYC_TARGET_HKD = HK_MDRT_FYC_TARGET_HKD * 6; // 3,312,000

export interface AdvisorCommissionEstimate {
  isVisible: boolean;
  fycRatePct: number;
  renewalYear2RatePct: number;
  activeDealAnnualHkd: number;
  activeDealYear1FycHkd: number;
  activeDealYear2RenewalHkd: number;
  existingYtdFycHkd: number;
  projectedTotalYtdFycHkd: number;
  mdrtTargetHkd: number;
  cotTargetHkd: number;
  totTargetHkd: number;
  mdrtProgressBeforePct: number;
  mdrtProgressAfterPct: number;
  shortfallToMdrtHkd: number;
  nextMilestoneLabelZh: string;
}

export function resolvePlanFycRates(
  category: PlanCategory,
  paymentTermYears: number
): { fycRatePct: number; renewalYear2RatePct: number } {
  switch (category) {
    case PlanCategory.CRITICAL_ILLNESS:
      return {
        fycRatePct: paymentTermYears >= 15 ? 52 : paymentTermYears >= 10 ? 42 : 28,
        renewalYear2RatePct: paymentTermYears >= 10 ? 12 : 6,
      };
    case PlanCategory.VHIS:
    case PlanCategory.HIGH_END_MEDICAL:
      return {
        fycRatePct: 35,
        renewalYear2RatePct: 12,
      };
    case PlanCategory.PARTICIPATING_SAVINGS:
    case PlanCategory.QDAP:
      if (paymentTermYears <= 2) return { fycRatePct: 9, renewalYear2RatePct: 2 };
      if (paymentTermYears <= 5) return { fycRatePct: 22, renewalYear2RatePct: 6 };
      if (paymentTermYears <= 10) return { fycRatePct: 34, renewalYear2RatePct: 10 };
      return { fycRatePct: 45, renewalYear2RatePct: 12 };
    case PlanCategory.UNIVERSAL_LIFE:
      return { fycRatePct: 18, renewalYear2RatePct: 4 };
    case PlanCategory.TERM_LIFE:
      return { fycRatePct: 40, renewalYear2RatePct: 10 };
    case PlanCategory.GENERAL_GI:
    default:
      return { fycRatePct: 15, renewalYear2RatePct: 15 };
  }
}

function toHkdEquivalent(amount: number, currency: CurrencyCode): number {
  if (currency === 'USD') return amount * 7.8;
  if (currency === 'RMB') return amount * 1.08;
  return amount;
}

export function estimateAdvisorFycAndMdrtProgress(params: {
  clientSafeMode: boolean;
  activePlan: InsurancePlan;
  activeAnnualPremium: number;
  currency: CurrencyCode;
  paymentTermYears: number;
  applications?: PolicyApplicationRecord[];
  baselineYtdFycHkd?: number;
}): AdvisorCommissionEstimate {
  if (params.clientSafeMode) {
    return {
      isVisible: false,
      fycRatePct: 0,
      renewalYear2RatePct: 0,
      activeDealAnnualHkd: 0,
      activeDealYear1FycHkd: 0,
      activeDealYear2RenewalHkd: 0,
      existingYtdFycHkd: 0,
      projectedTotalYtdFycHkd: 0,
      mdrtTargetHkd: HK_MDRT_FYC_TARGET_HKD,
      cotTargetHkd: HK_COT_FYC_TARGET_HKD,
      totTargetHkd: HK_TOT_FYC_TARGET_HKD,
      mdrtProgressBeforePct: 0,
      mdrtProgressAfterPct: 0,
      shortfallToMdrtHkd: HK_MDRT_FYC_TARGET_HKD,
      nextMilestoneLabelZh: '已隱藏（見客保密模式）',
    };
  }

  const rates = resolvePlanFycRates(
    params.activePlan.category,
    params.paymentTermYears
  );
  const activeDealAnnualHkd = Math.round(
    toHkdEquivalent(Math.max(0, params.activeAnnualPremium), params.currency)
  );
  const activeDealYear1FycHkd = Math.round(
    activeDealAnnualHkd * (rates.fycRatePct / 100)
  );
  const activeDealYear2RenewalHkd = Math.round(
    activeDealAnnualHkd * (rates.renewalYear2RatePct / 100)
  );

  const recordedAppsFycHkd = (params.applications || []).reduce((sum, app) => {
    const hkd = toHkdEquivalent(app.annualPremium, app.currency);
    const estRate = app.paymentTermYears <= 5 ? 0.22 : 0.36;
    return sum + Math.round(hkd * estRate);
  }, 0);

  // Realistic YTD advisor baseline + recorded workspace STP deals
  const existingYtdFycHkd =
    typeof params.baselineYtdFycHkd === 'number'
      ? Math.max(0, params.baselineYtdFycHkd) + recordedAppsFycHkd
      : 368000 + recordedAppsFycHkd;

  const projectedTotalYtdFycHkd = existingYtdFycHkd + activeDealYear1FycHkd;

  const mdrtProgressBeforePct = Math.min(
    999,
    Number(((existingYtdFycHkd / HK_MDRT_FYC_TARGET_HKD) * 100).toFixed(1))
  );
  const mdrtProgressAfterPct = Math.min(
    999,
    Number(((projectedTotalYtdFycHkd / HK_MDRT_FYC_TARGET_HKD) * 100).toFixed(1))
  );

  const shortfallToMdrtHkd = Math.max(
    0,
    HK_MDRT_FYC_TARGET_HKD - projectedTotalYtdFycHkd
  );

  let nextMilestoneLabelZh = `距離 MDRT 尚差 HK$ ${shortfallToMdrtHkd.toLocaleString()}`;
  if (projectedTotalYtdFycHkd >= HK_TOT_FYC_TARGET_HKD) {
    nextMilestoneLabelZh = '已達成 TOT 頂尖會員標準（6× MDRT）';
  } else if (projectedTotalYtdFycHkd >= HK_COT_FYC_TARGET_HKD) {
    const toTot = HK_TOT_FYC_TARGET_HKD - projectedTotalYtdFycHkd;
    nextMilestoneLabelZh = `已達成 COT 超級會員 · 距離 TOT 尚差 HK$ ${toTot.toLocaleString()}`;
  } else if (projectedTotalYtdFycHkd >= HK_MDRT_FYC_TARGET_HKD) {
    const toCot = HK_COT_FYC_TARGET_HKD - projectedTotalYtdFycHkd;
    nextMilestoneLabelZh = `已達標 MDRT 百萬圓桌 · 距離 COT 尚差 HK$ ${toCot.toLocaleString()}`;
  }

  return {
    isVisible: true,
    fycRatePct: rates.fycRatePct,
    renewalYear2RatePct: rates.renewalYear2RatePct,
    activeDealAnnualHkd,
    activeDealYear1FycHkd,
    activeDealYear2RenewalHkd,
    existingYtdFycHkd,
    projectedTotalYtdFycHkd,
    mdrtTargetHkd: HK_MDRT_FYC_TARGET_HKD,
    cotTargetHkd: HK_COT_FYC_TARGET_HKD,
    totTargetHkd: HK_TOT_FYC_TARGET_HKD,
    mdrtProgressBeforePct,
    mdrtProgressAfterPct,
    shortfallToMdrtHkd,
    nextMilestoneLabelZh,
  };
}

// ============================================================================
// 5. RFC 5545 .ICS FOLLOW-UP CALENDAR GENERATOR (Suggestion #5)
// ============================================================================

export type FollowUpCalendarKind =
  | 'COOLING_OFF_21D'
  | 'RENEWAL_30D'
  | 'CLIENT_BIRTHDAY'
  | 'ALL_BUNDLE';

export interface FollowUpCalendarInput {
  kind: FollowUpCalendarKind;
  clientNameZh: string;
  clientNameEn: string;
  policyNumber?: string;
  planNameZh?: string;
  whatsappPhone?: string;
  issueDateIso?: string; // YYYY-MM-DD (defaults to today)
  nextRenewalDateIso?: string; // YYYY-MM-DD
  birthdayMonthDay?: string; // MM-DD (e.g. '08-18')
}

function escapeIcsText(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function toIcsDateValue(isoDate: string): string {
  return isoDate.slice(0, 10).replace(/-/g, '');
}

function addDaysToIsoDate(isoDate: string, offsetDays: number): string {
  const base = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) {
    return '2026-12-01';
  }
  const shifted = new Date(base.getTime() + offsetDays * 86400000);
  return shifted.toISOString().slice(0, 10);
}

export function buildAdvisorFollowUpIcs(input: FollowUpCalendarInput): {
  fileName: string;
  icsContent: string;
  eventCount: number;
} {
  const todayIso = (input.issueDateIso || new Date().toISOString().slice(0, 10)).slice(
    0,
    10
  );
  const currentYear = Number(todayIso.slice(0, 4)) || 2026;
  const policyTag = input.policyNumber ? ` (${input.policyNumber})` : '';
  const planTag = input.planNameZh || '保單方案';
  const phoneNote = input.whatsappPhone ? ` · WhatsApp: ${input.whatsappPhone}` : '';
  const dtStamp = `${toIcsDateValue(todayIso)}T090000Z`;

  const vevents: string[] = [];

  // Event A: 21-Day Cooling-Off Check-in (Remind on Day 18 before 21-day expiry)
  if (input.kind === 'COOLING_OFF_21D' || input.kind === 'ALL_BUNDLE') {
    const checkInIso = addDaysToIsoDate(todayIso, 18);
    const coolingEndIso = addDaysToIsoDate(todayIso, 21);
    const dtStart = toIcsDateValue(checkInIso);
    const dtEnd = toIcsDateValue(addDaysToIsoDate(checkInIso, 1));
    vevents.push(
      [
        'BEGIN:VEVENT',
        `UID:hkispro-cooling-${dtStart}-${encodeURIComponent(input.clientNameEn)}@hk-is-pro`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:${escapeIcsText(`【21日冷靜期跟進】${input.clientNameZh}${policyTag}`)}`,
        `DESCRIPTION:${escapeIcsText(
          `客戶：${input.clientNameZh} (${input.clientNameEn})${phoneNote}\n計劃：${planTag}\n保單 21 日冷靜期將於 ${coolingEndIso} 屆滿，記得 WhatsApp 關心客戶有冇收到電子保單及解答疑問。`
        )}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT9H',
        'ACTION:DISPLAY',
        'DESCRIPTION:21-Day Cooling-Off Follow-Up',
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n')
    );
  }

  // Event B: 30-Day Pre-Renewal Annual Reminder
  if (input.kind === 'RENEWAL_30D' || input.kind === 'ALL_BUNDLE') {
    const renewalDueIso =
      input.nextRenewalDateIso || addDaysToIsoDate(todayIso, 365);
    const remindIso = addDaysToIsoDate(renewalDueIso, -30);
    const dtStart = toIcsDateValue(remindIso);
    const dtEnd = toIcsDateValue(addDaysToIsoDate(remindIso, 1));
    vevents.push(
      [
        'BEGIN:VEVENT',
        `UID:hkispro-renewal-${dtStart}-${encodeURIComponent(input.clientNameEn)}@hk-is-pro`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        'RRULE:FREQ=YEARLY',
        `SUMMARY:${escapeIcsText(`【續保前30日提醒】${input.clientNameZh}${policyTag}`)}`,
        `DESCRIPTION:${escapeIcsText(
          `客戶：${input.clientNameZh} (${input.clientNameEn})${phoneNote}\n計劃：${planTag}\n續保到期日：${renewalDueIso}。請提前 30 日提醒客戶檢視 eDDA 自動轉帳餘額／匯率及安排年度保單檢視。`
        )}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT9H',
        'ACTION:DISPLAY',
        'DESCRIPTION:30-Day Policy Renewal Reminder',
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n')
    );
  }

  // Event C: Client Birthday Annual Reminder
  if (input.kind === 'CLIENT_BIRTHDAY' || input.kind === 'ALL_BUNDLE') {
    const rawMd =
      input.birthdayMonthDay && /^\d{2}-\d{2}$/.test(input.birthdayMonthDay)
        ? input.birthdayMonthDay
        : '08-18';
    const bdayThisYear = `${currentYear}-${rawMd}`;
    const bdayIso =
      bdayThisYear < todayIso ? `${currentYear + 1}-${rawMd}` : bdayThisYear;
    const dtStart = toIcsDateValue(bdayIso);
    const dtEnd = toIcsDateValue(addDaysToIsoDate(bdayIso, 1));
    vevents.push(
      [
        'BEGIN:VEVENT',
        `UID:hkispro-bday-${dtStart}-${encodeURIComponent(input.clientNameEn)}@hk-is-pro`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        'RRULE:FREQ=YEARLY',
        `SUMMARY:${escapeIcsText(`【客戶生日問候】${input.clientNameZh} 生日及轉保齡提示`)}`,
        `DESCRIPTION:${escapeIcsText(
          `今日係 ${input.clientNameZh} (${input.clientNameEn}) 生日${phoneNote}！記得發送生日祝福，並可溫馨提示生日前後投保年齡（Backdating 追溯保齡）加保優惠。`
        )}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT9H',
        'ACTION:DISPLAY',
        'DESCRIPTION:Client Birthday Greeting',
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n')
    );
  }

  const safeSlug = input.clientNameEn.replace(/[^a-zA-Z0-9]+/g, '_');
  const fileName = `HK_InsureHub_FollowUp_${safeSlug}_${input.kind.toLowerCase()}.ics`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HK InsureHub Pro//Advisor Follow-Up Suite//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...vevents,
    'END:VCALENDAR',
    '',
  ].join('\r\n');

  return {
    fileName,
    icsContent,
    eventCount: vevents.length,
  };
}

// ============================================================================
// 6. EXISTING POLICY 1-PAGE SUMMARY SHEET ENGINE (Suggestion #6)
// ============================================================================

export const DIMENSION_LABELS: Record<
  ProtectionDimensionId,
  { zh: string; en: string }
> = {
  LIFE_MORTGAGE: { zh: '人壽及樓按保障', en: 'Life & Mortgage' },
  PRIVATE_HOSPITAL: { zh: '住院醫療／自願醫保', en: 'Hospital / VHIS' },
  CRITICAL_ILLNESS: { zh: '危疾保障', en: 'Critical Illness' },
  CANCER_TARGETED: { zh: '癌症標靶保障', en: 'Cancer / Oncology' },
  ACCIDENT_INCOME: { zh: '個人意外及停工收入', en: 'Accident & Income' },
  RETIREMENT_DEMENTIA: { zh: '儲蓄／退休年金', en: 'Savings / Annuity' },
};

export interface ExistingPolicySummarySheet {
  totalPoliciesCount: number;
  totalAnnualPremiumHkd: number;
  totalMonthlyEquivalentHkd: number;
  totalCoverageByDimensionHkd: Record<ProtectionDimensionId, number>;
  missingDimensionsZh: string[];
  formattedWhatsappSummaryZh: string;
  printableTextReportZh: string;
}

export function buildSampleExistingPolicies(nowIso?: string): ExistingPolicyAuditItem[] {
  const stamp = nowIso || new Date().toISOString();
  return [
    {
      id: 'sample-pol-group-med',
      policyNumber: 'GRP-HSBC-2023',
      policyName: '公司團體醫療保險（普通房上限）',
      dimensionId: 'PRIVATE_HOSPITAL',
      coverageAmountHkd: 350000,
      annualPremiumHkd: 0,
      limitationNote: '離職或退休即失效；外科手術設分項賠償上限',
      addedAtIso: stamp,
    },
    {
      id: 'sample-pol-early-ci',
      policyNumber: 'AIA-CI-2019-881',
      policyName: '友邦早期買落單次賠付危疾保',
      dimensionId: 'CRITICAL_ILLNESS',
      coverageAmountHkd: 600000,
      annualPremiumHkd: 14200,
      limitationNote: '只賠一次嚴重危疾，索償後保單隨即終止',
      addedAtIso: stamp,
    },
    {
      id: 'sample-pol-term-life',
      policyNumber: 'MANU-TL-2021-402',
      policyName: '宏利定期人壽保障（10年期）',
      dimensionId: 'LIFE_MORTGAGE',
      coverageAmountHkd: 1500000,
      annualPremiumHkd: 4600,
      limitationNote: '無現金價值；尚未完全覆蓋現有樓按餘額',
      addedAtIso: stamp,
    },
  ];
}

export function buildExistingPolicySummarySheet(params: {
  lead: ClientLead;
  advisorNameZh: string;
  advisorLicenseNo: string;
}): ExistingPolicySummarySheet {
  const items = params.lead.existingPolicies || [];

  const totalCoverageByDimensionHkd: Record<ProtectionDimensionId, number> = {
    LIFE_MORTGAGE: 0,
    PRIVATE_HOSPITAL: 0,
    CRITICAL_ILLNESS: 0,
    CANCER_TARGETED: 0,
    ACCIDENT_INCOME: 0,
    RETIREMENT_DEMENTIA: 0,
  };

  let totalAnnualPremiumHkd = 0;

  for (const item of items) {
    const cov = Math.max(0, Number(item.coverageAmountHkd) || 0);
    const prem = Math.max(0, Number(item.annualPremiumHkd) || 0);
    totalAnnualPremiumHkd += prem;
    if (totalCoverageByDimensionHkd[item.dimensionId] !== undefined) {
      totalCoverageByDimensionHkd[item.dimensionId] += cov;
    }
  }

  const totalMonthlyEquivalentHkd = Math.round(totalAnnualPremiumHkd / 12);

  const coreDimensions: ProtectionDimensionId[] = [
    'LIFE_MORTGAGE',
    'PRIVATE_HOSPITAL',
    'CRITICAL_ILLNESS',
    'RETIREMENT_DEMENTIA',
  ];
  const missingDimensionsZh = coreDimensions
    .filter((dim) => totalCoverageByDimensionHkd[dim] <= 0)
    .map((dim) => DIMENSION_LABELS[dim].zh);

  const policyLines =
    items.length === 0
      ? ['（目前未有登記舊保單資料）']
      : items.map((p, idx) => {
          const cat = DIMENSION_LABELS[p.dimensionId]?.zh || '一般保障';
          const numStr = p.policyNumber ? `[${p.policyNumber}] ` : '';
          const noteStr = p.limitationNote ? `｜備註：${p.limitationNote}` : '';
          return `${idx + 1}. ${numStr}${p.policyName}（${cat}）— 保額 HK$${p.coverageAmountHkd.toLocaleString()}｜年費 HK$${p.annualPremiumHkd.toLocaleString()}${noteStr}`;
        });

  const formattedWhatsappSummaryZh = [
    `【${params.lead.fullNameZh} 現有保單一覽表】`,
    `已整合保單數目：共 ${items.length} 份`,
    `現有每年總保費：HK$ ${totalAnnualPremiumHkd.toLocaleString()}（平均每月約 HK$ ${totalMonthlyEquivalentHkd.toLocaleString()}）`,
    '--------------------',
    ...policyLines,
    '--------------------',
    missingDimensionsZh.length > 0
      ? `溫馨提示：目前「${missingDimensionsZh.join('、')}」尚未有獨立保單覆蓋，建議優先檢視。`
      : '四大核心保障類別均已有基礎覆蓋，可定期檢視保額是否追上通脹。',
    `整理顧問：${params.advisorNameZh}（牌照：${params.advisorLicenseNo}）`,
  ].join('\n');

  const printableTextReportZh = [
    '============================================================',
    `HK INSUREHUB PRO · 客戶現有保單整合對照表（Policy Summary Sheet）`,
    `客戶姓名：${params.lead.fullNameZh} (${params.lead.fullNameEn}) · 年齡：${params.lead.age} 歲`,
    `整理顧問：${params.advisorNameZh}（保監局牌照號碼：${params.advisorLicenseNo}）`,
    '============================================================',
    '',
    `一、保費及保額總覽`,
    `・已登記現有保單：${items.length} 份`,
    `・每年保費總支出：HK$ ${totalAnnualPremiumHkd.toLocaleString()}（折合每月約 HK$ ${totalMonthlyEquivalentHkd.toLocaleString()}）`,
    `・人壽及樓按總保額：HK$ ${totalCoverageByDimensionHkd.LIFE_MORTGAGE.toLocaleString()}`,
    `・住院醫療總保額　：HK$ ${totalCoverageByDimensionHkd.PRIVATE_HOSPITAL.toLocaleString()}`,
    `・危疾保障總保額　：HK$ ${totalCoverageByDimensionHkd.CRITICAL_ILLNESS.toLocaleString()}`,
    `・儲蓄／退休總價值：HK$ ${totalCoverageByDimensionHkd.RETIREMENT_DEMENTIA.toLocaleString()}`,
    '',
    `二、各份保單明細及條款留意位`,
    ...policyLines,
    '',
    `三、保障缺口提示`,
    missingDimensionsZh.length > 0
      ? `・尚未覆蓋項目：${missingDimensionsZh.join('、')}`
      : `・各主要範疇均已有保單紀錄，建議每年保單週年覆核一次。`,
    '============================================================',
  ].join('\n');

  return {
    totalPoliciesCount: items.length,
    totalAnnualPremiumHkd,
    totalMonthlyEquivalentHkd,
    totalCoverageByDimensionHkd,
    missingDimensionsZh,
    formattedWhatsappSummaryZh,
    printableTextReportZh,
  };
}
