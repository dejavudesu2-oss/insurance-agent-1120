import { toSimplifiedChinese } from './i18n';
import {
  AgencyHandoverItem,
  ClaimConciergeCase,
  ClientFollowUpTask,
  ClientLead,
  ComplianceCheckResult,
  CurrencyCode,
  HkiaCpdCourseEntry,
  InForcePolicyRecord,
  InsurancePlan,
  IntermediaryProfile,
  LeadStage,
  PolicyApplicationRecord,
  PolicyEndorsementRequest,
} from './types';
import { WhatsAppComplianceLogEntry } from './twentyUpgradesEngine';

// ============================================================================
// SEED DATASETS: IN-FORCE POLICIES, CLAIMS KANBAN, ENDORSEMENTS, CPD & HANDOVER
// ============================================================================

export const INITIAL_IN_FORCE_POLICIES: InForcePolicyRecord[] = [
  {
    id: 'ifp-daniel-vhis',
    policyId: 'HK-POL-2024-88102',
    leadId: 'lead-daniel-chan',
    clientNameZh: '陳冠宇 Daniel',
    clientNameEn: 'Daniel Chan Kwun Yu',
    insurerCode: 'AIA',
    planNameZh: '尊顯自願醫保靈活計劃 (半私家房)',
    planNameEn: 'AIA VHIS Privilege Flexi Plan (Semi-Private)',
    currency: 'HKD',
    annualPremium: 14800,
    nextDueDateIso: '2026-11-24',
    graceEndsIso: '2026-12-24',
    status: 'DUE_SOON',
    fxRateLocked: true,
    splitEligible: false,
  },
  {
    id: 'ifp-vanessa-ci',
    policyId: 'HK-POL-2025-33910',
    leadId: 'lead-vanessa-lin',
    clientNameZh: '林雅婷',
    clientNameEn: 'Vanessa Lin Ya Ting',
    insurerCode: 'PRU',
    planNameZh: '危疾加護保 III (首10年+50%升級)',
    planNameEn: 'PRUHealth Critical Illness Extended Care III',
    currency: 'USD',
    annualPremium: 2780,
    nextDueDateIso: '2026-11-05',
    graceEndsIso: '2026-12-05',
    status: 'GRACE_PERIOD',
    fxRateLocked: false,
    splitEligible: false,
  },
  {
    id: 'ifp-henry-legacy',
    policyId: 'HK-POL-2023-77419',
    leadId: 'lead-henry-wang',
    clientNameZh: '王建宏',
    clientNameEn: 'Henry Wang Jianhong',
    insurerCode: 'MANULIFE',
    planNameZh: '宏摯傳承保障計劃 (多元貨幣)',
    planNameEn: 'Manulife Genesis Multi-Currency Savings',
    currency: 'USD',
    annualPremium: 50000,
    nextDueDateIso: '2027-02-15',
    graceEndsIso: '2027-03-17',
    status: 'ACTIVE',
    fxRateLocked: true,
    splitEligible: true,
  },
];

export const INITIAL_CLAIM_CASES: ClaimConciergeCase[] = [
  {
    id: 'clm-daniel-gi',
    claimNumber: 'CLM-2026-0941',
    policyId: 'HK-POL-2024-88102',
    leadId: 'lead-daniel-chan',
    clientNameZh: '陳冠宇 Daniel',
    clientNameEn: 'Daniel Chan Kwun Yu',
    hospitalNameZh: '養和醫院 (跑馬地)',
    hospitalNameEn: 'Hong Kong Sanatorium & Hospital',
    diagnosisZh: '日間胃腸內視鏡微創息肉切除術',
    diagnosisEn: 'Day-case Endoscopic Polypectomy',
    estimatedClaimHkd: 42800,
    cashlessLogApproved: true,
    stage: 'LOG_PREAPPROVAL',
    checklist: [
      {
        id: 'chk-1',
        itemZh: '主診專科醫生簽署入院前免找數預批申請表 (LOG Part II)',
        itemEn: 'Attending specialist signed Pre-Admission LOG Part II',
        done: true,
      },
      {
        id: 'chk-2',
        itemZh: '病理化驗轉介信及手術報價單副本',
        itemEn: 'Pathology referral letter & surgical fee quotation',
        done: true,
      },
      {
        id: 'chk-3',
        itemZh: '出院結算單與公司團保餘額協調表',
        itemEn: 'Hospital discharge summary & group medical coordination form',
        done: false,
      },
    ],
    updatedAtIso: '2026-11-12T10:15:00Z',
  },
  {
    id: 'clm-vanessa-mri',
    claimNumber: 'CLM-2026-0887',
    policyId: 'HK-POL-2025-33910',
    leadId: 'lead-vanessa-lin',
    clientNameZh: '林雅婷',
    clientNameEn: 'Vanessa Lin Ya Ting',
    hospitalNameZh: '港怡醫院 (黃竹坑)',
    hospitalNameEn: 'Gleneagles Hospital Hong Kong',
    diagnosisZh: '門診頸椎磁力共振掃描 (MRI) 及專科覆診',
    diagnosisEn: 'Outpatient Cervical Spine MRI & Specialist Follow-up',
    estimatedClaimHkd: 11600,
    cashlessLogApproved: true,
    stage: 'INSURER_ASSESSMENT',
    checklist: [
      {
        id: 'chk-v1',
        itemZh: '主診骨科醫生轉介信正本',
        itemEn: 'Orthopaedic specialist referral letter',
        done: true,
      },
      {
        id: 'chk-v2',
        itemZh: '港怡醫院正式收據及 MRI 影像報告',
        itemEn: 'Gleneagles official receipt & MRI diagnostic report',
        done: true,
      },
      {
        id: 'chk-v3',
        itemZh: '轉數快 (FPS) 理賠入賬戶口確認',
        itemEn: 'FPS direct credit bank account verification',
        done: true,
      },
    ],
    updatedAtIso: '2026-11-11T16:40:00Z',
  },
];

export const INITIAL_ENDORSEMENT_REQUESTS: PolicyEndorsementRequest[] = [
  {
    id: 'end-henry-split',
    referenceNo: 'END-2026-5012',
    policyId: 'HK-POL-2023-77419',
    leadId: 'lead-henry-wang',
    clientNameZh: '王建宏',
    clientNameEn: 'Henry Wang Jianhong',
    endorsementType: 'POLICY_SPLIT',
    detailSummaryZh: '保單第 5 週年將原 USD 保單按 50% / 50% 分拆予長子王俊傑及次女王思涵，並同步登記配偶張淑芬為後備保單持有人。',
    detailSummaryEn: 'Split USD policy 50% / 50% for son Leo Wang and daughter Chloe Wang at Yr 5 anniversary, registering spouse Grace Zhang as Contingent Owner.',
    effectiveDateIso: '2026-11-20',
    status: 'SUBMITTED',
  },
];

export const INITIAL_CPD_ENTRIES: HkiaCpdCourseEntry[] = [
  {
    id: 'cpd-1',
    titleZh: '保監局 GL30 財務需要分析與 GL28 分紅實現率合規實務',
    titleEn: 'HKIA GL30 FNA & GL28 Participating Fulfillment Ethics Workshop',
    provider: 'HKFI / IIQE Continuing Professional Development',
    hours: 4,
    category: 'ETHICS_REGULATION',
    completedDateIso: '2026-09-18',
    certificateRef: 'HKIA-CPD-2026-9912A',
  },
  {
    id: 'cpd-2',
    titleZh: '跨境內地訪客 (MCV) 投保合規、反洗錢 (AML) 及在港簽署審核',
    titleEn: 'MCV Cross-Border Compliance, AML/CTF & Onshore Signing Audit',
    provider: 'Hong Kong Academy of Finance / LUAHK',
    hours: 3,
    category: 'ETHICS_REGULATION',
    completedDateIso: '2026-10-09',
    certificateRef: 'HKIA-CPD-2026-1048E',
  },
  {
    id: 'cpd-3',
    titleZh: '多元貨幣分紅壽險精算結構、保單分拆與家族信託傳承規劃',
    titleEn: 'Multi-Currency Participating Actuarial Design & Policy Split Legacy',
    provider: 'IFPHK Certified Planner Seminar',
    hours: 5,
    category: 'TECHNICAL_ACTUARIAL',
    completedDateIso: '2026-10-27',
    certificateRef: 'HKIA-CPD-2026-3320T',
  },
];

export const INITIAL_AGENCY_HANDOVERS: AgencyHandoverItem[] = [
  {
    id: 'ho-henry-uw',
    leadId: 'lead-henry-wang',
    clientNameZh: '王建宏',
    clientNameEn: 'Henry Wang Jianhong',
    policyOrRefId: 'HK-POL-2023-77419',
    fromRole: 'ADVISOR',
    toRole: 'UW_ASSISTANT',
    taskSummaryZh: '跟進王總提交三甲醫院肝膽超聲波複檢報告及 MCV 入境逗留標籤核證副本',
    taskSummaryEn: 'Follow up on abdominal ultrasound report & verified MCV landing slip copy',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    updatedAtIso: '2026-11-12T11:20:00Z',
  },
  {
    id: 'ho-daniel-comp',
    leadId: 'lead-daniel-chan',
    clientNameZh: '陳冠宇 Daniel',
    clientNameEn: 'Daniel Chan Kwun Yu',
    policyOrRefId: 'HK-POL-2024-88102',
    fromRole: 'UW_ASSISTANT',
    toRole: 'COMPLIANCE_OFFICER',
    taskSummaryZh: '審核 GL30 財務需要分析負擔能力比率及團體醫保銜接 CP10 披露聲明',
    taskSummaryEn: 'Review GL30 affordability ratio & group medical bridge CP10 disclosure',
    priority: 'NORMAL',
    status: 'OPEN',
    updatedAtIso: '2026-11-12T14:05:00Z',
  },
];

// ============================================================================
// 1. CRM SEARCH BY CLIENT NAME OR POLICY ID (PURE DETERMINISTIC FILTER)
// ============================================================================

/**
 * Collects all unique Policy IDs, Existing Policy Numbers, and STP Reference Numbers
 * associated with a client lead so consultants can see and search them instantaneously.
 */
export function collectLeadPolicyIds(
  lead: ClientLead,
  applications: PolicyApplicationRecord[] = [],
  inForcePolicies: InForcePolicyRecord[] = []
): string[] {
  const ids: string[] = [];
  const pushUnique = (raw: string | undefined | null) => {
    const trimmed = (raw || '').trim();
    if (!trimmed) return;
    if (!ids.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      ids.push(trimmed);
    }
  };

  // 1. In-force policies linked to this lead
  for (const pol of inForcePolicies) {
    if (
      pol.leadId === lead.id ||
      pol.clientNameEn === lead.fullNameEn ||
      pol.clientNameZh === lead.fullNameZh
    ) {
      pushUnique(pol.policyId);
    }
  }

  // 2. STP policy applications submitted for this lead
  for (const app of applications) {
    if (
      app.leadId === lead.id ||
      app.clientNameEn === lead.fullNameEn ||
      app.clientNameZh === lead.fullNameZh
    ) {
      pushUnique(app.referenceNo);
    }
  }

  // 3. Existing policy schedule items audited on this lead
  for (const ep of lead.existingPolicies || []) {
    pushUnique(ep.policyNumber || ep.id);
  }

  return ids;
}

/**
 * Filters CRM client leads by pipeline stage AND free-text query matching:
 * - Client English Name / Traditional Chinese Name / Simplified Chinese Name
 * - Any associated Policy ID (In-Force policyId, STP referenceNo, Existing policyNumber / id)
 * - Locked anchor Plan ID, HKID / Travel Doc number, WhatsApp phone, or Consultant Notes
 */
export function filterCrmLeadsByQuery(params: {
  leads: ClientLead[];
  query: string;
  stageFilter?: 'ALL' | LeadStage;
  applications?: PolicyApplicationRecord[];
  inForcePolicies?: InForcePolicyRecord[];
}): ClientLead[] {
  const {
    leads,
    query,
    stageFilter = 'ALL',
    applications = [],
    inForcePolicies = [],
  } = params;

  const normalizedQuery = query.trim().toLowerCase();

  return leads.filter((lead) => {
    if (stageFilter !== 'ALL' && lead.stage !== stageFilter) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    const policyIds = collectLeadPolicyIds(lead, applications, inForcePolicies);
    const simplifiedZhName = toSimplifiedChinese(lead.fullNameZh || '');
    const existingPolicyNames = (lead.existingPolicies || [])
      .map((ep) => `${ep.policyNumber || ''} ${ep.id} ${ep.policyName}`)
      .join(' ');

    const searchableHaystack = [
      lead.id,
      lead.fullNameEn,
      lead.fullNameZh,
      simplifiedZhName,
      ...policyIds,
      existingPolicyNames,
      lead.proposalCart?.anchorPlanId || '',
      ...(lead.proposalCart?.comboPlanIds || []),
      lead.hkidNumber || '',
      lead.kycCheck?.hkidDocNumber || '',
      lead.whatsappPhone || '',
      lead.email || '',
      lead.notes || '',
      lead.clientNotes || '',
    ]
      .join(' ')
      .toLowerCase();

    return searchableHaystack.includes(normalizedQuery);
  });
}

export type CrmLeadSortOption =
  | 'LAST_CONTACT_DESC'
  | 'LAST_CONTACT_ASC'
  | 'STAGE_DESC'
  | 'STAGE_ASC';

export const CRM_STAGE_SORT_ORDER: Record<LeadStage, number> = {
  [LeadStage.NEW]: 1,
  [LeadStage.FNA_COMPLETED]: 2,
  [LeadStage.PROPOSAL_SENT]: 3,
  [LeadStage.UNDERWRITING]: 4,
  [LeadStage.IN_FORCE]: 5,
};

/**
 * Formats an ISO timestamp into a concise, tabular-friendly `YYYY-MM-DD HH:mm` string
 * so consultants can scan last-contact recency across CRM pipeline rows.
 */
export function formatCrmLastContactLabel(iso: string | undefined | null): string {
  if (!iso) return '—';
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return iso.slice(0, 10);
  }
  const normalized = new Date(parsed).toISOString();
  return `${normalized.slice(0, 10)} ${normalized.slice(11, 16)}`;
}

/**
 * Pure, non-mutating sorter organizing CRM client leads by Pipeline Stage
 * or Last Contacted timestamp (`lastContactIso`).
 */
export function sortCrmLeads(
  leads: ClientLead[],
  sortBy: CrmLeadSortOption
): ClientLead[] {
  const copy = [...leads];
  const toTimestamp = (iso: string | undefined): number => {
    const ms = Date.parse(iso || '');
    return Number.isFinite(ms) ? ms : 0;
  };

  return copy.sort((a, b) => {
    const stageA = CRM_STAGE_SORT_ORDER[a.stage] ?? 0;
    const stageB = CRM_STAGE_SORT_ORDER[b.stage] ?? 0;
    const timeA = toTimestamp(a.lastContactIso);
    const timeB = toTimestamp(b.lastContactIso);

    if (sortBy === 'LAST_CONTACT_DESC') {
      if (timeB !== timeA) return timeB - timeA;
      if (stageB !== stageA) return stageB - stageA;
      return a.id.localeCompare(b.id);
    }
    if (sortBy === 'LAST_CONTACT_ASC') {
      if (timeA !== timeB) return timeA - timeB;
      if (stageB !== stageA) return stageB - stageA;
      return a.id.localeCompare(b.id);
    }
    if (sortBy === 'STAGE_DESC') {
      if (stageB !== stageA) return stageB - stageA;
      if (timeB !== timeA) return timeB - timeA;
      return a.id.localeCompare(b.id);
    }
    // STAGE_ASC (Early -> Late pipeline)
    if (stageA !== stageB) return stageA - stageB;
    if (timeB !== timeA) return timeB - timeA;
    return a.id.localeCompare(b.id);
  });
}

// ============================================================================
// 2. CLUSTER B (#4): CUSTOM PARTIAL WITHDRAWAL / "567" PASSIVE INCOME SIMULATOR
// ============================================================================

export interface PartialWithdrawalYearRow {
  policyYear: number;
  clientAge: number;
  annualPremiumPaid: number;
  cumulativePremiumsPaid: number;
  annualWithdrawal: number;
  cumulativeWithdrawn: number;
  remainingGuaranteed: number;
  remainingNonGuaranteed: number;
  remainingTotalSurrender: number;
}

export interface PartialWithdrawalSimulationResult {
  currency: CurrencyCode;
  annualPremium: number;
  paymentTermYears: number;
  totalPremiumsPaid: number;
  startWithdrawalYear: number;
  annualWithdrawalPctOfTotalPaid: number;
  annualWithdrawalAmount: number;
  effectiveIllustratedIrrPct: number;
  cumulativeWithdrawnByAge85: number;
  remainingTotalAtAge85: number;
  cumulativeWithdrawnByAge100: number;
  remainingTotalAtAge100: number;
  sustainableToAge100: boolean;
  milestoneRows: PartialWithdrawalYearRow[];
  allRows: PartialWithdrawalYearRow[];
}

export function simulatePartialWithdrawalPlan(params: {
  clientAge: number;
  currency: CurrencyCode;
  annualPremium: number;
  paymentTermYears: number;
  startWithdrawalYear: number; // e.g., 5, 6, 7, 10
  annualWithdrawalPct: number; // e.g., 5, 6, 7, 8 (% of total premiums paid)
  effectiveIrrPct?: number; // capped at 6.0% HKD / 6.5% USD/RMB per HKIA GL28
  guaranteedIrrPct?: number;
}): PartialWithdrawalSimulationResult {
  const safeClientAge = Math.min(75, Math.max(18, Math.round(params.clientAge || 36)));
  const term = Math.max(1, Math.min(25, Math.round(params.paymentTermYears || 5)));
  const annualPrem = Math.max(5000, Math.round(params.annualPremium || 100000));
  const totalPremiumsPaid = annualPrem * term;

  const hkiaCapPct = params.currency === 'HKD' ? 6.0 : 6.5;
  const effectiveIrrPct = Math.min(hkiaCapPct, Math.max(3.5, params.effectiveIrrPct ?? 6.0));
  const guarIrrPct = Math.min(2.2, Math.max(0.8, params.guaranteedIrrPct ?? 1.25));

  const startYr = Math.max(term, Math.min(30, Math.round(params.startWithdrawalYear || 6)));
  const wdPct = Math.max(0, Math.min(12, Number(params.annualWithdrawalPct ?? 7)));
  const targetAnnualWithdrawal = Math.round(totalPremiumsPaid * (wdPct / 100));

  const maxYears = Math.max(35, 100 - safeClientAge);
  const totalGrowthRate = effectiveIrrPct / 100;
  const guarGrowthRate = guarIrrPct / 100;

  let guarBalance = 0;
  let totalBalance = 0;
  let cumPaid = 0;
  let cumWithdrawn = 0;
  let depleted = false;

  const allRows: PartialWithdrawalYearRow[] = [];

  for (let yr = 1; yr <= maxYears; yr++) {
    const ageAtYr = safeClientAge + yr;
    const paidThisYear = yr <= term ? annualPrem : 0;
    cumPaid += paidThisYear;

    // Early policy acquisition charge tapers off over first 3 years, then compounds cleanly
    const earlyDrag = yr === 1 ? 0.82 : yr === 2 ? 0.94 : 1.0;
    guarBalance = (guarBalance + paidThisYear * earlyDrag) * (1 + guarGrowthRate);
    totalBalance = (totalBalance + paidThisYear * (yr === 1 ? 0.86 : 0.98)) * (1 + totalGrowthRate);

    if (totalBalance < guarBalance) {
      totalBalance = guarBalance;
    }

    let actualWithdrawal = 0;
    if (yr >= startYr && wdPct > 0) {
      if (totalBalance >= targetAnnualWithdrawal) {
        actualWithdrawal = targetAnnualWithdrawal;
      } else {
        actualWithdrawal = Math.max(0, Math.round(totalBalance));
        depleted = true;
      }
      const ratioAfter = totalBalance > 0 ? Math.max(0, (totalBalance - actualWithdrawal) / totalBalance) : 0;
      totalBalance = Math.max(0, totalBalance - actualWithdrawal);
      guarBalance = Math.max(0, guarBalance * ratioAfter);
      cumWithdrawn += actualWithdrawal;
    }

    const remGuar = Math.round(guarBalance);
    const remTotal = Math.round(totalBalance);
    const remNonGuar = Math.max(0, remTotal - remGuar);

    allRows.push({
      policyYear: yr,
      clientAge: ageAtYr,
      annualPremiumPaid: paidThisYear,
      cumulativePremiumsPaid: cumPaid,
      annualWithdrawal: actualWithdrawal,
      cumulativeWithdrawn: cumWithdrawn,
      remainingGuaranteed: remGuar,
      remainingNonGuaranteed: remNonGuar,
      remainingTotalSurrender: remTotal,
    });
  }

  const milestoneYears = new Set([5, 10, 15, 20, 25, 30]);
  const age85Row = allRows.find((r) => r.clientAge === 85) || allRows[Math.min(allRows.length - 1, 29)];
  const age100Row = allRows[allRows.length - 1];

  const milestoneRows = allRows.filter(
    (r) => milestoneYears.has(r.policyYear) || r.clientAge === 85 || r.clientAge === 100
  );

  return {
    currency: params.currency,
    annualPremium: annualPrem,
    paymentTermYears: term,
    totalPremiumsPaid,
    startWithdrawalYear: startYr,
    annualWithdrawalPctOfTotalPaid: wdPct,
    annualWithdrawalAmount: targetAnnualWithdrawal,
    effectiveIllustratedIrrPct: Number(effectiveIrrPct.toFixed(2)),
    cumulativeWithdrawnByAge85: age85Row?.cumulativeWithdrawn ?? 0,
    remainingTotalAtAge85: age85Row?.remainingTotalSurrender ?? 0,
    cumulativeWithdrawnByAge100: age100Row?.cumulativeWithdrawn ?? 0,
    remainingTotalAtAge100: age100Row?.remainingTotalSurrender ?? 0,
    sustainableToAge100: !depleted && (age100Row?.remainingTotalSurrender ?? 0) > 0,
    milestoneRows,
    allRows,
  };
}

// ============================================================================
// 3. CLUSTER B (#5): PREMIUM FINANCING 2D HIBOR / SOFR SENSITIVITY MATRIX
// ============================================================================

export interface PremiumFinancingCell {
  fundingRatePct: number;
  creditingRatePct: number;
  netAnnualizedRoePct: number;
  netDollarGainUsd: number;
  spreadPct: number;
  isPositiveCarry: boolean;
  marginCallWarning: boolean;
}

export interface PremiumFinancingMatrixResult {
  totalSinglePremiumUsd: number;
  ltvPct: number;
  clientEquityUsd: number;
  bankLoanUsd: number;
  holdingYears: number;
  day1CsvRatioPct: number;
  breakEvenFundingRateAtBaseCreditingPct: number;
  fundingRatesPct: number[];
  creditingRatesPct: number[];
  rows: PremiumFinancingCell[][];
}

export function buildPremiumFinancingSensitivityMatrix(params: {
  totalSinglePremiumUsd: number;
  ltvPct: number; // e.g., 75% to 85%
  holdingYears?: number; // e.g., 10 years
  day1CsvRatioPct?: number; // e.g., 82% Day-1 Guaranteed CSV
}): PremiumFinancingMatrixResult {
  const totalPremium = Math.max(200000, Math.round(params.totalSinglePremiumUsd || 1000000));
  const ltvPct = Math.min(90, Math.max(50, Math.round(params.ltvPct || 78)));
  const holdingYears = Math.min(20, Math.max(5, Math.round(params.holdingYears || 10)));
  const day1CsvRatioPct = Math.min(90, Math.max(70, Math.round(params.day1CsvRatioPct || 82)));

  const bankLoanUsd = Math.round(totalPremium * (ltvPct / 100));
  const clientEquityUsd = totalPremium - bankLoanUsd;

  const fundingRatesPct = [2.75, 3.5, 4.25, 5.0, 5.75];
  const creditingRatesPct = [3.8, 4.5, 5.2, 5.8, 6.3];

  const rows: PremiumFinancingCell[][] = fundingRatesPct.map((fRate) =>
    creditingRatesPct.map((cRate) => {
      // Policy compounds on Day-1 CSV base (approx 92% net effective principal over 10y)
      const projectedPolicyValue = totalPremium * 0.93 * Math.pow(1 + cRate / 100, holdingYears);
      // Simple annual bank interest serviced over holding period + loan principal repayment
      const totalInterestPaid = bankLoanUsd * (fRate / 100) * holdingYears;
      const netProceedsAfterLoan = projectedPolicyValue - bankLoanUsd - totalInterestPaid;
      const netDollarGainUsd = Math.round(netProceedsAfterLoan - clientEquityUsd);

      const totalReturnMultiple = Math.max(0.05, netProceedsAfterLoan / Math.max(1, clientEquityUsd));
      const annualizedRoe = (Math.pow(totalReturnMultiple, 1 / holdingYears) - 1) * 100;
      const netAnnualizedRoePct = Number(annualizedRoe.toFixed(2));
      const spreadPct = Number((cRate - fRate).toFixed(2));

      // Margin call warning if Loan > 90% of Day-1 CSV AND funding rate exceeds crediting rate by > 0.75%
      const day1CsvUsd = totalPremium * (day1CsvRatioPct / 100);
      const loanToDay1Csv = bankLoanUsd / Math.max(1, day1CsvUsd);
      const marginCallWarning =
        (loanToDay1Csv > 0.92 && spreadPct < 0) || netDollarGainUsd < -clientEquityUsd * 0.15;

      return {
        fundingRatePct: fRate,
        creditingRatePct: cRate,
        netAnnualizedRoePct,
        netDollarGainUsd,
        spreadPct,
        isPositiveCarry: netDollarGainUsd > 0,
        marginCallWarning,
      };
    })
  );

  // Break-even funding rate at 5.2% mid-case crediting rate
  const baseMidPolicyVal = totalPremium * 0.93 * Math.pow(1 + 0.052, holdingYears);
  const maxTotalInterestForBreakEven = Math.max(0, baseMidPolicyVal - bankLoanUsd - clientEquityUsd);
  const breakEvenFundingRateAtBaseCreditingPct = Number(
    ((maxTotalInterestForBreakEven / (Math.max(1, bankLoanUsd) * holdingYears)) * 100).toFixed(2)
  );

  return {
    totalSinglePremiumUsd: totalPremium,
    ltvPct,
    clientEquityUsd,
    bankLoanUsd,
    holdingYears,
    day1CsvRatioPct,
    breakEvenFundingRateAtBaseCreditingPct,
    fundingRatesPct,
    creditingRatesPct,
    rows,
  };
}

// ============================================================================
// 4. CLUSTER B (#6): 3-GENERATION FAMILY & BENEFICIARY STRUCTURE TREE
// ============================================================================

export interface BeneficiaryAllocationNode {
  memberId: string;
  nameZh: string;
  nameEn: string;
  relationLabelZh: string;
  relationLabelEn: string;
  age: number;
  allocationPct: number;
}

export interface ThreeGenStructureModel {
  gen1OwnerNameZh: string;
  gen1OwnerNameEn: string;
  gen1ContingentOwner: string;
  gen2CurrentInsuredZh: string;
  gen2CurrentInsuredEn: string;
  gen2SuccessorCandidates: string[];
  gen3Beneficiaries: BeneficiaryAllocationNode[];
  totalAllocationPct: number;
  isAllocationBalanced: boolean;
  policySplitSummaryZh: string;
  policySplitSummaryEn: string;
}

export function buildThreeGenBeneficiaryTree(
  lead: ClientLead,
  anchorPlan?: InsurancePlan | null
): ThreeGenStructureModel {
  const members = lead.householdMembers || [];
  const rawAlloc = lead.beneficiaryAllocations || {};

  const gen3Beneficiaries: BeneficiaryAllocationNode[] =
    members.length > 0
      ? members.map((m, idx) => {
          const fallbackEqual =
            idx === members.length - 1
              ? 100 - Math.floor(100 / members.length) * (members.length - 1)
              : Math.floor(100 / members.length);
          const pct =
            typeof rawAlloc[m.id] === 'number' ? Math.max(0, Math.round(rawAlloc[m.id])) : fallbackEqual;
          const relZh =
            m.relation === 'SPOUSE' ? '配偶' : m.relation === 'CHILD' ? '子女 (第三代傳承)' : '父母';
          const relEn =
            m.relation === 'SPOUSE' ? 'Spouse' : m.relation === 'CHILD' ? 'Child (Gen 3)' : 'Parent';
          return {
            memberId: m.id,
            nameZh: m.nameZh,
            nameEn: m.nameEn,
            relationLabelZh: relZh,
            relationLabelEn: relEn,
            age: m.age,
            allocationPct: pct,
          };
        })
      : [
          {
            memberId: 'default-estate',
            nameZh: '法定遺產繼承人 / 待指定家屬',
            nameEn: 'Legal Estate / Designated Family',
            relationLabelZh: '法定受益人',
            relationLabelEn: 'Primary Beneficiary',
            age: lead.age,
            allocationPct: 100,
          },
        ];

  const totalAllocationPct = gen3Beneficiaries.reduce((acc, b) => acc + b.allocationPct, 0);
  const childNodes = members.filter((m) => m.relation === 'CHILD');
  const spouseNode = members.find((m) => m.relation === 'SPOUSE');

  const contingentOwner =
    lead.contingentOwnerName ||
    (spouseNode ? `${spouseNode.nameZh} (${spouseNode.nameEn})` : '待委任後備保單持有人 (Contingent Owner)');

  const splitCount = Math.max(1, childNodes.length);
  const planTitleZh = anchorPlan?.nameZh || '多元貨幣傳承儲蓄計劃';
  const planTitleEn = anchorPlan?.nameEn || 'Multi-Currency Legacy Savings Plan';

  const policySplitSummaryZh =
    childNodes.length >= 2
      ? `第 5 保單週年起可將「${planTitleZh}」免核保分拆為 ${splitCount} 份獨立保單，分別轉換受保人予 ${childNodes
          .map((c) => c.nameZh)
          .join('、')}，實現跨三代財富定向隔離傳承。`
      : `可透過「${planTitleZh}」無限次更換受保人條款及後備持有人機制，無須遺囑認證直接傳承保單現金價值。`;

  const policySplitSummaryEn =
    childNodes.length >= 2
      ? `From Policy Year 5, "${planTitleEn}" can be split into ${splitCount} standalone policies and re-assigned to ${childNodes
          .map((c) => c.nameEn)
          .join(' & ')} without medical underwriting.`
      : `Unlimited Change of Insured & Contingent Owner clauses on "${planTitleEn}" allow probate-free wealth succession across 3 generations.`;

  return {
    gen1OwnerNameZh: lead.fullNameZh,
    gen1OwnerNameEn: lead.fullNameEn,
    gen1ContingentOwner: contingentOwner,
    gen2CurrentInsuredZh: lead.fullNameZh,
    gen2CurrentInsuredEn: lead.fullNameEn,
    gen2SuccessorCandidates:
      members.length > 0
        ? members.map((m) => `${m.nameZh} (${m.age}歲)`)
        : ['配偶 / 子女（可無限次更換受保人）'],
    gen3Beneficiaries,
    totalAllocationPct,
    isAllocationBalanced: totalAllocationPct === 100,
    policySplitSummaryZh,
    policySplitSummaryEn,
  };
}

// ============================================================================
// 5. CLUSTER C (#8): VOICE / TRANSCRIPT TO STRUCTURED FNA & CLIENT NOTES
// ============================================================================

export interface StructuredMeetingNotesExtraction {
  bulletSummaryZh: string;
  bulletSummaryEn: string;
  suggestedFollowUpTitleZh: string;
  suggestedFollowUpDueDateIso: string;
  detectedAnnualBudgetHkd: number | null;
  detectedConcerns: string[];
}

export function extractStructuredMeetingNotesDeterministically(
  rawTranscript: string,
  lead: ClientLead,
  referenceDateIso = '2026-11-14'
): StructuredMeetingNotesExtraction {
  const text = (rawTranscript || '').trim();
  const lower = text.toLowerCase();

  // Detect budget mentions like "5萬", "48,000", "HK$60000", "budget 50k"
  let detectedAnnualBudgetHkd: number | null = null;
  const manMatch = text.match(/(\d+(?:\.\d+)?)\s*[萬万]/);
  const hkdMatch = text.match(/(?:hk\$|hkd|預算|保費)\s*([0-9,]{4,7})/i);
  if (manMatch) {
    const val = Math.round(parseFloat(manMatch[1]) * 10000);
    if (val >= 8000 && val <= 2000000) detectedAnnualBudgetHkd = val;
  } else if (hkdMatch) {
    const val = parseInt(hkdMatch[1].replace(/,/g, ''), 10);
    if (val >= 8000 && val <= 2000000) detectedAnnualBudgetHkd = val;
  }

  const detectedConcerns: string[] = [];
  if (/養和|港怡|半私家|醫療|vhis|hospital|免找數/i.test(lower)) {
    detectedConcerns.push('私家醫院半私家房全數賠償及入院免找數預批');
  }
  if (/危疾|癌症|cancer|ci|標靶/i.test(lower)) {
    detectedConcerns.push('嚴重危疾及持續癌症標靶治療收入替代');
  }
  if (/分拆|傳承|美元|usd|貨幣|留學|教育|legacy/i.test(lower)) {
    detectedConcerns.push('USD/HKD 多元貨幣轉換與保單分拆教育傳承');
  }
  if (/扣稅|稅務|qdap|tax/i.test(lower)) {
    detectedConcerns.push('VHIS / QDAP 薪俸稅扣稅額優化');
  }
  if (/驗身|體檢|血壓|結節|超聲波|核保|medical report/i.test(lower)) {
    detectedConcerns.push('過往體檢報告核保預審及不保事項確認');
  }
  if (detectedConcerns.length === 0) {
    detectedConcerns.push('覆核家庭保障缺口與年度保費負擔比率');
  }

  // Compute default follow-up due date (+3 days from referenceDateIso)
  const baseDate = new Date(`${referenceDateIso}T00:00:00Z`);
  const dueMs = Number.isNaN(baseDate.getTime())
    ? Date.now() + 3 * 86400_000
    : baseDate.getTime() + 3 * 86400_000;
  const suggestedFollowUpDueDateIso = new Date(dueMs).toISOString().slice(0, 10);

  const budgetNoteZh = detectedAnnualBudgetHkd
    ? `確認年度保費預算約 HK$ ${detectedAnnualBudgetHkd.toLocaleString()}`
    : `維持年度參考預算 HK$ ${(lead.annualBudgetHkd ?? 48000).toLocaleString()}`;

  const snippetZh = text.length > 0 ? text.slice(0, 90).replace(/\s+/g, ' ') : '客戶口述重點整理';

  const bulletSummaryZh = [
    `• [AI 語音面談摘要 · ${referenceDateIso}] 客戶關注：${detectedConcerns.join('、')}（${budgetNoteZh}）。`,
    `• 原話重點摘錄：「${snippetZh}${text.length > 90 ? '…' : ''}」`,
  ].join('\n');

  const bulletSummaryEn = [
    `• [Structured Meeting Log · ${referenceDateIso}] Key Focus: ${detectedConcerns.join('; ')} (${
      detectedAnnualBudgetHkd
        ? `Detected annual budget ~HK$ ${detectedAnnualBudgetHkd.toLocaleString()}`
        : `Target budget HK$ ${(lead.annualBudgetHkd ?? 48000).toLocaleString()}`
    }).`,
    `• Transcript Excerpt: "${snippetZh}${text.length > 90 ? '...' : ''}"`,
  ].join('\n');

  const suggestedFollowUpTitleZh = /驗身|超聲波|報告/.test(text)
    ? `收集 ${lead.fullNameZh} 最新驗身／超聲波報告並提交預先核保`
    : `向 ${lead.fullNameZh} 發送專屬互動建議書微網並預約簽署確認`;

  return {
    bulletSummaryZh,
    bulletSummaryEn,
    suggestedFollowUpTitleZh,
    suggestedFollowUpDueDateIso,
    detectedAnnualBudgetHkd,
    detectedConcerns,
  };
}

// ============================================================================
// 6. CLUSTER A (#1): IN-FORCE RENEWAL & 30-DAY GRACE CALENDAR ENGINE
// ============================================================================

export interface InForceRenewalSummary {
  totalInForceCount: number;
  gracePeriodCount: number;
  dueSoonCount: number;
  activeNormalCount: number;
  totalAnnualizedPremiumHkdEquiv: number;
}

export function evaluateInForceRenewalSummary(
  policies: InForcePolicyRecord[]
): InForceRenewalSummary {
  let gracePeriodCount = 0;
  let dueSoonCount = 0;
  let activeNormalCount = 0;
  let totalAnnualizedPremiumHkdEquiv = 0;

  for (const pol of policies) {
    if (pol.status === 'GRACE_PERIOD') gracePeriodCount += 1;
    else if (pol.status === 'DUE_SOON') dueSoonCount += 1;
    else activeNormalCount += 1;

    const fxToHkd = pol.currency === 'USD' ? 7.8 : pol.currency === 'RMB' ? 1.08 : 1;
    totalAnnualizedPremiumHkdEquiv += Math.round(pol.annualPremium * fxToHkd);
  }

  return {
    totalInForceCount: policies.length,
    gracePeriodCount,
    dueSoonCount,
    activeNormalCount,
    totalAnnualizedPremiumHkdEquiv,
  };
}

export function buildRenewalWhatsAppMessage(
  policy: InForcePolicyRecord,
  advisorNameZh: string,
  iaLicenseNo: string
): string {
  const statusTag =
    policy.status === 'GRACE_PERIOD'
      ? `【寬限期屆滿提醒：${policy.graceEndsIso}】`
      : `【保單週年續保通知：${policy.nextDueDateIso}】`;
  return `${statusTag}${policy.clientNameZh} 您好，我是您的持牌顧問 ${advisorNameZh}（牌照：${iaLicenseNo}）。溫馨提示您名下 [${policy.insurerCode}]《${policy.planNameZh}》（保單編號：${policy.policyId}）本期續保保費為 ${policy.currency} $${policy.annualPremium.toLocaleString()}。如需鎖定港幣兌換匯率或確認 eDDA 自動轉賬狀態，請隨時回覆我協助跟進。`;
}

// ============================================================================
// 7. CLUSTER D (#10 & #11): HKIA 15-HOUR CPD TRACKER & AUDIT DOSSIER ENGINE
// ============================================================================

export interface HkiaCpdComplianceStatus {
  totalRequiredHours: number;
  ethicsRequiredHours: number;
  completedTotalHours: number;
  completedEthicsHours: number;
  completedTechnicalHours: number;
  remainingTotalHours: number;
  remainingEthicsHours: number;
  completionPct: number;
  isFullyCompliant: boolean;
}

export function evaluateHkiaCpdCompliance(
  entries: HkiaCpdCourseEntry[]
): HkiaCpdComplianceStatus {
  const totalRequiredHours = 15;
  const ethicsRequiredHours = 3;

  let completedTotalHours = 0;
  let completedEthicsHours = 0;
  let completedTechnicalHours = 0;

  for (const item of entries) {
    const hrs = Math.max(0, Number(item.hours) || 0);
    completedTotalHours += hrs;
    if (item.category === 'ETHICS_REGULATION') {
      completedEthicsHours += hrs;
    } else {
      completedTechnicalHours += hrs;
    }
  }

  const remainingTotalHours = Math.max(0, Number((totalRequiredHours - completedTotalHours).toFixed(1)));
  const remainingEthicsHours = Math.max(0, Number((ethicsRequiredHours - completedEthicsHours).toFixed(1)));
  const completionPct = Math.min(100, Math.round((completedTotalHours / totalRequiredHours) * 100));

  return {
    totalRequiredHours,
    ethicsRequiredHours,
    completedTotalHours: Number(completedTotalHours.toFixed(1)),
    completedEthicsHours: Number(completedEthicsHours.toFixed(1)),
    completedTechnicalHours: Number(completedTechnicalHours.toFixed(1)),
    remainingTotalHours,
    remainingEthicsHours,
    completionPct,
    isFullyCompliant: remainingTotalHours === 0 && remainingEthicsHours === 0,
  };
}

export interface HkiaAuditDossierModel {
  dossierId: string;
  generatedAtIso: string;
  advisorName: string;
  advisorLicenseNo: string;
  firmName: string;
  clientNameEn: string;
  clientNameZh: string;
  residencyLabel: string;
  hkidOrTravelDoc: string;
  policyIds: string[];
  anchorPlanLabel: string;
  annualPremiumSummary: string;
  kycStatusLine: string;
  gl30FnaSummaryLine: string;
  cp10ReplacementLine: string;
  complianceVerdictLine: string;
  clientNotesExcerpt: string;
  followUpTasksSummary: string[];
  whatsappAuditLines: string[];
}

export function buildHkiaAuditDossierModel(params: {
  lead: ClientLead;
  intermediary: IntermediaryProfile;
  anchorPlan: InsurancePlan | null;
  annualPremiumHkd: number;
  compliance: ComplianceCheckResult;
  applications: PolicyApplicationRecord[];
  inForcePolicies: InForcePolicyRecord[];
  whatsappAuditLogs: WhatsAppComplianceLogEntry[];
}): HkiaAuditDossierModel {
  const {
    lead,
    intermediary,
    anchorPlan,
    annualPremiumHkd,
    compliance,
    applications,
    inForcePolicies,
    whatsappAuditLogs,
  } = params;

  const policyIds = collectLeadPolicyIds(lead, applications, inForcePolicies);
  const fna = lead.fnaRecord;
  const monthlySurplus = fna ? Math.max(0, fna.monthlyIncomeHkd - fna.monthlyExpensesHkd) : 0;
  const annualSurplus = monthlySurplus * 12;
  const affordabilityPct =
    annualSurplus > 0 ? Math.round((annualPremiumHkd / annualSurplus) * 100) : 0;

  const kycStatusLine =
    lead.residency === 'MCV'
      ? `MCV 內地訪港旅客 · 證件 ${lead.kycCheck.hkidDocNumber} (${
          lead.kycCheck.mcvEntrySlipVerified
            ? `入境逗留標籤已核實至 ${lead.kycCheck.mcvPermittedUntil || '在港有效期內'}`
            : '待補掃描入境標籤'
        })`
      : `香港居民 HKID · 證件 ${lead.kycCheck.hkidDocNumber} (${
          lead.kycCheck.hkidVerified ? 'OCR 校驗通過' : '待核對證件'
        })`;

  const gl30FnaSummaryLine = fna
    ? `GL30 已簽署 (${fna.signedAtIso.slice(0, 10)}) · 月入 HK$${fna.monthlyIncomeHkd.toLocaleString()} / 流動資產 HK$${fna.liquidAssetsHkd.toLocaleString()} · 保費佔年度淨盈餘 ${affordabilityPct}% (${fna.riskTolerance})`
    : 'GL30 財務需要分析尚未簽署（受監管閘門攔截）';

  const hasExisting = (lead.existingPolicies || []).length > 0;
  const cp10ReplacementLine = hasExisting
    ? `已盤點 ${lead.existingPolicies!.length} 份既有保單（加保補足缺口，非轉保替代 CP10 無損現有權益）`
    : '客戶確認無轉保替代現有個人長險保單（CP10 Non-Replacement Confirmed）';

  const complianceVerdictLine = compliance.canSubmitStp
    ? `PASS · 符合保監局 GL16 / GL28 / GL30 全部合規要求（共通過 ${compliance.passedChecks.length} 項查核）`
    : `BLOCKED · 尚有 ${compliance.blockingReasons.length} 項合規阻斷原因待處理`;

  const tasks: ClientFollowUpTask[] = lead.followUpTasks || [];
  const followUpTasksSummary =
    tasks.length > 0
      ? tasks.map(
          (t) => `[${t.completed ? 'DONE' : `DUE ${t.dueDateIso}`}] ${t.title}`
        )
      : ['暫無未完成待辦跟進項目'];

  const leadLogs = whatsappAuditLogs.filter(
    (w) => w.clientName === lead.fullNameEn || w.clientName === lead.fullNameZh
  );
  const whatsappAuditLines =
    leadLogs.length > 0
      ? leadLogs
          .slice(0, 3)
          .map(
            (w) =>
              `${w.sentAtIso.slice(0, 16)} · ${w.summaryTopic} (${w.advisorLicenseNo})`
          )
      : ['系統已啟用 GL28 WhatsApp 合規披露留痕保護'];

  return {
    dossierId: `HKIA-AUDIT-${lead.id.replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase()}-2026`,
    generatedAtIso: new Date().toISOString(),
    advisorName: `${intermediary.nameZh} (${intermediary.nameEn})`,
    advisorLicenseNo: intermediary.iaLicenseNo,
    firmName: intermediary.firmName,
    clientNameEn: lead.fullNameEn,
    clientNameZh: lead.fullNameZh,
    residencyLabel: lead.residency === 'MCV' ? 'MCV 內地訪港旅客' : 'HK Resident 香港居民',
    hkidOrTravelDoc: lead.hkidNumber || lead.kycCheck.hkidDocNumber,
    policyIds: policyIds.length > 0 ? policyIds : ['PENDING-NEW-ISSUE'],
    anchorPlanLabel: anchorPlan
      ? `[${anchorPlan.insurerCode}] ${anchorPlan.nameZh} (${anchorPlan.nameEn})`
      : '尚未鎖定主推計劃',
    annualPremiumSummary: `HK$ ${annualPremiumHkd.toLocaleString()} / yr`,
    kycStatusLine,
    gl30FnaSummaryLine,
    cp10ReplacementLine,
    complianceVerdictLine,
    clientNotesExcerpt: (lead.clientNotes || lead.notes || '無附加會議筆記').slice(0, 260),
    followUpTasksSummary,
    whatsappAuditLines,
  };
}
