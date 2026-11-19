import {
  ClientLead,
  CurrencyCode,
  InForcePolicyRecord,
  LeadStage,
  PolicyApplicationRecord,
  ResidencyType,
  TargetProtectionSchemeId,
} from './types';

export type InsightsResidencyFilter = 'ALL' | ResidencyType;

export interface LeadFunnelStageMetric {
  stage: LeadStage;
  order: number;
  shortLabelZh: string;
  shortLabelEn: string;
  labelZh: string;
  labelEn: string;
  currentCount: number;
  cumulativeReachedCount: number;
  stepConversionRatePct: number;
  topOfFunnelRatePct: number;
  avgAnnualPremiumHkd: number;
  totalStagePremiumHkd: number;
}

export interface ProductPremiumBreakdownRow {
  schemeId: TargetProtectionSchemeId | 'UNSPECIFIED';
  labelZh: string;
  labelEn: string;
  leadCount: number;
  inForceOrUwCount: number;
  closeRatePct: number;
  avgPolicyPremiumHkd: number;
  medianPolicyPremiumHkd: number;
  totalPipelinePremiumHkd: number;
}

export interface ResidencyPremiumComparisonRow {
  residency: ResidencyType;
  labelZh: string;
  labelEn: string;
  leadCount: number;
  avgPolicyPremiumHkd: number;
  conversionToClosePct: number;
  totalPremiumHkd: number;
}

export interface ClientInsightsDashboardModel {
  filter: InsightsResidencyFilter;
  totalLeads: number;
  inForceOrUwLeads: number;
  overallLeadToCloseRatePct: number;
  fnaCompletionRatePct: number;
  proposalToUwRatePct: number;
  avgPolicyPremiumHkd: number;
  closedAvgPolicyPremiumHkd: number;
  medianPolicyPremiumHkd: number;
  highestCasePremiumHkd: number;
  totalAnnualizedPremiumHkd: number;
  mcvLeadSharePct: number;
  funnelMetrics: LeadFunnelStageMetric[];
  schemePremiumBreakdown: ProductPremiumBreakdownRow[];
  residencyComparison: ResidencyPremiumComparisonRow[];
}

const STAGE_ORDER: Record<LeadStage, number> = {
  [LeadStage.NEW]: 0,
  [LeadStage.FNA_COMPLETED]: 1,
  [LeadStage.PROPOSAL_SENT]: 2,
  [LeadStage.UNDERWRITING]: 3,
  [LeadStage.IN_FORCE]: 4,
};

const STAGE_META: Array<{
  stage: LeadStage;
  shortLabelZh: string;
  shortLabelEn: string;
  labelZh: string;
  labelEn: string;
}> = [
  {
    stage: LeadStage.NEW,
    shortLabelZh: '01 新潛客',
    shortLabelEn: '01 New Lead',
    labelZh: '01. 新建潛客 (New Lead)',
    labelEn: '01. New Lead Intake',
  },
  {
    stage: LeadStage.FNA_COMPLETED,
    shortLabelZh: '02 完成 FNA',
    shortLabelEn: '02 FNA Signed',
    labelZh: '02. 完成 GL30 財務分析',
    labelEn: '02. GL30 FNA Completed',
  },
  {
    stage: LeadStage.PROPOSAL_SENT,
    shortLabelZh: '03 已發建議書',
    shortLabelEn: '03 Proposal Sent',
    labelZh: '03. 已發送建議書／微網',
    labelEn: '03. Proposal & Microsite Sent',
  },
  {
    stage: LeadStage.UNDERWRITING,
    shortLabelZh: '04 核保審批',
    shortLabelEn: '04 Underwriting',
    labelZh: '04. 已雙簽遞交核保',
    labelEn: '04. Signed & In Underwriting',
  },
  {
    stage: LeadStage.IN_FORCE,
    shortLabelZh: '05 保單生效',
    shortLabelEn: '05 In-Force',
    labelZh: '05. 保單正式生效 (In-Force)',
    labelEn: '05. Policy Issued & In-Force',
  },
];

const SCHEME_LABELS: Record<
  TargetProtectionSchemeId | 'UNSPECIFIED',
  { labelZh: string; labelEn: string }
> = {
  MULTI_FX_LEGACY: {
    labelZh: '多元貨幣傳承儲蓄',
    labelEn: 'Multi-Currency Savings',
  },
  FAMILY_COMPREHENSIVE: {
    labelZh: '家庭全方位醫療危疾',
    labelEn: 'Family Comprehensive',
  },
  VHIS_HIGH_END: {
    labelZh: '高端自願醫保 VHIS',
    labelEn: 'High-End VHIS Medical',
  },
  MULTI_CI: {
    labelZh: '多重保危疾保障',
    labelEn: 'Multi-Pay Critical Illness',
  },
  UNSPECIFIED: {
    labelZh: '綜合保障配置',
    labelEn: 'General Protection',
  },
};

export function convertPremiumToHkd(
  amount: number,
  currency: CurrencyCode,
  usdToHkd = 7.8,
  hkdToRmb = 0.92
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (currency === 'HKD') return Math.round(amount);
  if (currency === 'USD') return Math.round(amount * usdToHkd);
  if (currency === 'RMB') {
    const safeRmbRate = hkdToRmb > 0 ? hkdToRmb : 0.92;
    return Math.round(amount / safeRmbRate);
  }
  return Math.round(amount);
}

export function resolveLeadAnnualPolicyPremiumHkd(params: {
  lead: ClientLead;
  applications?: PolicyApplicationRecord[];
  inForcePolicies?: InForcePolicyRecord[];
  usdToHkd?: number;
  hkdToRmb?: number;
}): number {
  const {
    lead,
    applications = [],
    inForcePolicies = [],
    usdToHkd = 7.8,
    hkdToRmb = 0.92,
  } = params;

  // 1. Check In-Force policies linked to this lead
  const linkedPolicies = inForcePolicies.filter((p) => p.leadId === lead.id);
  if (linkedPolicies.length > 0) {
    const sum = linkedPolicies.reduce(
      (acc, pol) => acc + convertPremiumToHkd(pol.annualPremium, pol.currency, usdToHkd, hkdToRmb),
      0
    );
    if (sum > 0) return sum;
  }

  // 2. Check signed STP applications linked to this lead
  const linkedApps = applications.filter((a) => a.leadId === lead.id);
  if (linkedApps.length > 0) {
    const latest = linkedApps[0];
    const hkd = convertPremiumToHkd(latest.annualPremium, latest.currency, usdToHkd, hkdToRmb);
    if (hkd > 0) return hkd;
  }

  // 3. Check explicit annualBudgetHkd on lead
  if (typeof lead.annualBudgetHkd === 'number' && lead.annualBudgetHkd > 0) {
    return Math.round(lead.annualBudgetHkd);
  }

  // 4. Derive from proposalCart sumAssuredUsd & paymentTermYears or FNA disposable surplus
  if (lead.proposalCart && lead.proposalCart.sumAssuredUsd > 0) {
    const term = Math.max(5, lead.proposalCart.paymentTermYears || 10);
    const estUsd = Math.round((lead.proposalCart.sumAssuredUsd * 0.16) / (term / 5));
    return convertPremiumToHkd(estUsd, 'USD', usdToHkd, hkdToRmb);
  }

  if (lead.fnaRecord) {
    const monthlySurplus = Math.max(
      2500,
      lead.fnaRecord.monthlyIncomeHkd - lead.fnaRecord.monthlyExpensesHkd
    );
    return Math.round(monthlySurplus * 12 * 0.25);
  }

  return 36000;
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return Math.round(sorted[mid]);
  }
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function roundPct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function buildClientInsightsDashboard(params: {
  leads: ClientLead[];
  applications?: PolicyApplicationRecord[];
  inForcePolicies?: InForcePolicyRecord[];
  filter?: InsightsResidencyFilter;
  usdToHkd?: number;
  hkdToRmb?: number;
}): ClientInsightsDashboardModel {
  const {
    leads,
    applications = [],
    inForcePolicies = [],
    filter = 'ALL',
    usdToHkd = 7.8,
    hkdToRmb = 0.92,
  } = params;

  const filteredLeads =
    filter === 'ALL' ? leads : leads.filter((lead) => lead.residency === filter);

  const leadWithPremium = filteredLeads.map((lead) => ({
    lead,
    stageOrder: STAGE_ORDER[lead.stage] ?? 0,
    premiumHkd: resolveLeadAnnualPolicyPremiumHkd({
      lead,
      applications,
      inForcePolicies,
      usdToHkd,
      hkdToRmb,
    }),
  }));

  const totalLeads = leadWithPremium.length;
  const allPremiums = leadWithPremium.map((item) => item.premiumHkd).filter((v) => v > 0);
  const closedItems = leadWithPremium.filter(
    (item) =>
      item.lead.stage === LeadStage.IN_FORCE || item.lead.stage === LeadStage.UNDERWRITING
  );
  const closedPremiums = closedItems.map((item) => item.premiumHkd).filter((v) => v > 0);

  const totalAnnualizedPremiumHkd = allPremiums.reduce((acc, v) => acc + v, 0);
  const avgPolicyPremiumHkd =
    allPremiums.length > 0 ? Math.round(totalAnnualizedPremiumHkd / allPremiums.length) : 0;
  const closedAvgPolicyPremiumHkd =
    closedPremiums.length > 0
      ? Math.round(closedPremiums.reduce((acc, v) => acc + v, 0) / closedPremiums.length)
      : avgPolicyPremiumHkd;
  const medianPolicyPremiumHkd = computeMedian(allPremiums);
  const highestCasePremiumHkd = allPremiums.length > 0 ? Math.max(...allPremiums) : 0;

  // Build 5-stage funnel with cumulative progression counts
  const funnelMetrics: LeadFunnelStageMetric[] = [];
  STAGE_META.forEach((meta, idx) => {
    const order = STAGE_ORDER[meta.stage];
    const currentItems = leadWithPremium.filter((item) => item.lead.stage === meta.stage);
    const cumulativeItems = leadWithPremium.filter((item) => item.stageOrder >= order);

    const prevCumulativeCount =
      idx === 0 ? cumulativeItems.length : funnelMetrics[idx - 1].cumulativeReachedCount;

    // For stage average premium, prefer current items in stage; if 0, use cumulative items so chart stays informative
    const basisItems = currentItems.length > 0 ? currentItems : cumulativeItems;
    const totalStagePremiumHkd = currentItems.reduce((acc, it) => acc + it.premiumHkd, 0);
    const avgAnnualPremiumHkd =
      basisItems.length > 0
        ? Math.round(basisItems.reduce((acc, it) => acc + it.premiumHkd, 0) / basisItems.length)
        : 0;

    funnelMetrics.push({
      stage: meta.stage,
      order,
      shortLabelZh: meta.shortLabelZh,
      shortLabelEn: meta.shortLabelEn,
      labelZh: meta.labelZh,
      labelEn: meta.labelEn,
      currentCount: currentItems.length,
      cumulativeReachedCount: cumulativeItems.length,
      stepConversionRatePct:
        idx === 0
          ? totalLeads > 0
            ? 100
            : 0
          : roundPct(cumulativeItems.length, prevCumulativeCount),
      topOfFunnelRatePct: roundPct(cumulativeItems.length, totalLeads),
      avgAnnualPremiumHkd,
      totalStagePremiumHkd,
    });
  });

  const reachedFna = funnelMetrics[1]?.cumulativeReachedCount ?? 0;
  const reachedProposal = funnelMetrics[2]?.cumulativeReachedCount ?? 0;
  const reachedUw = funnelMetrics[3]?.cumulativeReachedCount ?? 0;
  const reachedInForce = funnelMetrics[4]?.cumulativeReachedCount ?? 0;

  // Breakdown by TargetProtectionSchemeId
  const schemeOrder: Array<TargetProtectionSchemeId | 'UNSPECIFIED'> = [
    'MULTI_FX_LEGACY',
    'FAMILY_COMPREHENSIVE',
    'VHIS_HIGH_END',
    'MULTI_CI',
    'UNSPECIFIED',
  ];

  const schemePremiumBreakdown: ProductPremiumBreakdownRow[] = schemeOrder
    .map((schemeId) => {
      const matching = leadWithPremium.filter(
        (item) => (item.lead.targetSchemeId || 'UNSPECIFIED') === schemeId
      );
      const prems = matching.map((m) => m.premiumHkd);
      const closedCount = matching.filter(
        (m) => m.lead.stage === LeadStage.IN_FORCE || m.lead.stage === LeadStage.UNDERWRITING
      ).length;
      const total = prems.reduce((acc, v) => acc + v, 0);
      return {
        schemeId,
        labelZh: SCHEME_LABELS[schemeId].labelZh,
        labelEn: SCHEME_LABELS[schemeId].labelEn,
        leadCount: matching.length,
        inForceOrUwCount: closedCount,
        closeRatePct: roundPct(closedCount, matching.length),
        avgPolicyPremiumHkd: matching.length > 0 ? Math.round(total / matching.length) : 0,
        medianPolicyPremiumHkd: computeMedian(prems),
        totalPipelinePremiumHkd: total,
      };
    })
    .filter((row) => row.leadCount > 0)
    .sort((a, b) => b.avgPolicyPremiumHkd - a.avgPolicyPremiumHkd);

  // Residency comparison (always computed across full `leads` so HK vs MCV comparison stays meaningful)
  const residencyTypes: Array<{
    residency: ResidencyType;
    labelZh: string;
    labelEn: string;
  }> = [
    {
      residency: 'HK_RESIDENT',
      labelZh: '本地香港居民 (HK Resident)',
      labelEn: 'Local HK Resident',
    },
    {
      residency: 'MCV',
      labelZh: '跨境高才／內地訪港 (MCV)',
      labelEn: 'Cross-Border / MCV',
    },
  ];

  const residencyComparison: ResidencyPremiumComparisonRow[] = residencyTypes.map((meta) => {
    const group = leads
      .filter((l) => l.residency === meta.residency)
      .map((lead) => ({
        lead,
        premiumHkd: resolveLeadAnnualPolicyPremiumHkd({
          lead,
          applications,
          inForcePolicies,
          usdToHkd,
          hkdToRmb,
        }),
      }));
    const totalPrem = group.reduce((acc, g) => acc + g.premiumHkd, 0);
    const closed = group.filter(
      (g) => g.lead.stage === LeadStage.IN_FORCE || g.lead.stage === LeadStage.UNDERWRITING
    ).length;
    return {
      residency: meta.residency,
      labelZh: meta.labelZh,
      labelEn: meta.labelEn,
      leadCount: group.length,
      avgPolicyPremiumHkd: group.length > 0 ? Math.round(totalPrem / group.length) : 0,
      conversionToClosePct: roundPct(closed, group.length),
      totalPremiumHkd: totalPrem,
    };
  });

  const mcvCount = filteredLeads.filter((l) => l.residency === 'MCV').length;

  return {
    filter,
    totalLeads,
    inForceOrUwLeads: closedItems.length,
    overallLeadToCloseRatePct: roundPct(
      reachedInForce > 0 ? reachedInForce : reachedUw,
      totalLeads
    ),
    fnaCompletionRatePct: roundPct(reachedFna, totalLeads),
    proposalToUwRatePct: roundPct(reachedUw, reachedProposal),
    avgPolicyPremiumHkd,
    closedAvgPolicyPremiumHkd,
    medianPolicyPremiumHkd,
    highestCasePremiumHkd,
    totalAnnualizedPremiumHkd,
    mcvLeadSharePct: roundPct(mcvCount, totalLeads),
    funnelMetrics,
    schemePremiumBreakdown,
    residencyComparison,
  };
}
