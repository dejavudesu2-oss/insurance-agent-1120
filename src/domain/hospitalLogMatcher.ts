import { computeDemographicFactor } from './actuarialEngine';
import {
  HospitalDeductibleHkd,
  HospitalLogEntry,
  HospitalPlanSignupOption,
  HospitalWardTier,
  InsurancePlan,
  PlanCategory,
} from './types';

const WARD_RANK: Record<HospitalWardTier, number> = {
  STANDARD_WARD: 1,
  SEMI_PRIVATE: 2,
  PRIVATE_ROOM: 3,
};

const DEDUCTIBLE_DISCOUNT_FACTOR: Record<HospitalDeductibleHkd, number> = {
  0: 1.0,
  20000: 0.66, // ~34% premium discount when paired with employer group medical
  50000: 0.46, // ~54% premium discount for executive high-deductible top-up
};

/**
 * Infers native ward tier and annual medical limit from a Hong Kong VHIS / Medical plan profile.
 */
export function classifyPlanHospitalTier(plan: InsurancePlan): {
  nativeWardTier: HospitalWardTier;
  annualLimitEn: string;
  annualLimitZh: string;
} {
  const blob = `${plan.id} ${plan.nameEn} ${plan.nameZh} ${plan.keyHighlightsEn.join(' ')}`.toLowerCase();

  if (
    plan.category === PlanCategory.HIGH_END_MEDICAL ||
    blob.includes('ceo') ||
    blob.includes('privilege') ||
    blob.includes('hero') ||
    blob.includes('prestige') ||
    blob.includes('wiseguard pro') ||
    blob.includes('vip') ||
    blob.includes('superior') ||
    blob.includes('global elite') ||
    blob.includes('elite 360') ||
    blob.includes('asia supreme') ||
    blob.includes('pink vhis plan (private')
  ) {
    return {
      nativeWardTier: 'PRIVATE_ROOM',
      annualLimitEn: 'HK$25M–$50M / yr (Private Room Full Cover)',
      annualLimitZh: '每年 HK$2,500萬–5,000萬（私家房全數賠償）',
    };
  }

  if (
    blob.includes('vprime') ||
    blob.includes('pink') ||
    blob.includes('semi-private') ||
    blob.includes('premier flexi') ||
    blob.includes('myflexi') ||
    blob.includes('vital care') ||
    blob.includes('asia elite') ||
    blob.includes('flexi')
  ) {
    return {
      nativeWardTier: 'SEMI_PRIVATE',
      annualLimitEn: 'HK$12M–$20M / yr (Semi-Private)',
      annualLimitZh: '每年 HK$1,200萬–2,000萬（半私家房）',
    };
  }

  return {
    nativeWardTier: 'STANDARD_WARD',
    annualLimitEn: 'HK$420k–$5M / yr (VHIS Standard Ward)',
    annualLimitZh: '每年 HK$42萬–500萬（自願醫保標準普通房）',
  };
}

/**
 * Evaluates which Hong Kong VHIS / High-End Medical plans to sign up for given a target Private Hospital,
 * desired Ward Class (Standard Ward / Semi-Private / Private Room), and Annual Deductible option.
 */
export function evaluateHospitalLogPlanOptions(params: {
  hospital: HospitalLogEntry;
  desiredWard: HospitalWardTier;
  deductibleHkd: HospitalDeductibleHkd;
  clientAge: number;
  isSmoker: boolean;
  plans: InsurancePlan[];
}): HospitalPlanSignupOption[] {
  const { hospital, desiredWard, deductibleHkd, clientAge, isSmoker, plans } = params;
  const vhisPlans = plans.filter(
    (p) =>
      p.category === PlanCategory.VHIS ||
      (p.category === PlanCategory.HIGH_END_MEDICAL &&
        !p.nameEn.toLowerCase().includes('outpatient'))
  );

  const demoFactor = computeDemographicFactor(clientAge, isSmoker, PlanCategory.VHIS);
  const deductibleFactor = DEDUCTIBLE_DISCOUNT_FACTOR[deductibleHkd];

  const evaluated: HospitalPlanSignupOption[] = vhisPlans.map((plan) => {
    const tierInfo = classifyPlanHospitalTier(plan);
    const planRank = WARD_RANK[tierInfo.nativeWardTier];
    const desiredRank = WARD_RANK[desiredWard];

    // Base HK$0-deductible VHIS annual premium calibrated to HK market schedule (~HK$11k–$23k at age 35–38)
    const baseZeroDeductibleHkd = Math.round(
      plan.baseRatePer1000UsdAge35Ns * 100 * 7.8 * demoFactor * 2.75
    );
    const annualPremiumHkd = Math.max(2400, Math.round(baseZeroDeductibleHkd * deductibleFactor));
    const monthlyPremiumHkd = Math.round(annualPremiumHkd / 12);

    const irdTaxSavedHkd =
      plan.taxDeductibleCapHkd !== null
        ? Math.round(Math.min(annualPremiumHkd, plan.taxDeductibleCapHkd) * 0.15)
        : 0;
    const netAnnualCostAfterTaxHkd = Math.max(0, annualPremiumHkd - irdTaxSavedHkd);

    const coversDesiredWardFully = planRank >= desiredRank;

    // Calculate upfront deposit at hospital:
    // If plan covers desired ward & deductible is $0 -> HK$0 deposit via Cashless LOG!
    // If deductible > 0 -> Hospital/Insurer LOG collects up to deductible cap or waives excess above deductible.
    // If client upgrades ward above plan's native room tier -> Hospital collects ward-upgrade co-deposit (~35% of cash deposit).
    let estimatedDepositRequiredHkd = 0;
    if (!coversDesiredWardFully) {
      estimatedDepositRequiredHkd = Math.round(hospital.cashDepositMidpointHkd * 0.4);
    } else if (deductibleHkd > 0) {
      estimatedDepositRequiredHkd = Math.min(deductibleHkd, hospital.cashDepositMidpointHkd);
    }

    const depositWaivedHkd = Math.max(
      0,
      hospital.cashDepositMidpointHkd - estimatedDepositRequiredHkd
    );

    const logStatus: 'FULL_CASHLESS_LOG' | 'WARD_UPGRADE_TOPUP' = coversDesiredWardFully
      ? 'FULL_CASHLESS_LOG'
      : 'WARD_UPGRADE_TOPUP';

    const optionSummaryEn = coversDesiredWardFully
      ? deductibleHkd === 0
        ? `100% Cashless LOG at ${hospital.hospitalNameEn} (${hospital.preApprovalTurnaround}); waives full ${hospital.cashDepositRangeHkd} admission deposit.`
        : `LOG pre-authorized above HK$${deductibleHkd.toLocaleString()} deductible (ideal with corporate medical card); saves ~${Math.round((1 - deductibleFactor) * 100)}% premium.`
      : `Plan covers ${tierInfo.nativeWardTier.replace('_', ' ')} fully; choosing ${desiredWard.replace('_', ' ')} at ${hospital.hospitalNameEn} triggers ward-upgrade co-insurance & ~HK$${estimatedDepositRequiredHkd.toLocaleString()} top-up deposit.`;

    const optionSummaryZh = coversDesiredWardFully
      ? deductibleHkd === 0
        ? `於${hospital.hospitalNameZh}享 100% 免找數入院批核（${hospital.preApprovalTurnaround}），全免 ${hospital.cashDepositRangeHkd} 入院按金。`
        : `超出 HK$${deductibleHkd.toLocaleString()} 自付費部份由保險公司直付（適合配搭公司團體醫保），保費節省約 ${Math.round((1 - deductibleFactor) * 100)}%。`
      : `此計劃原生保障較低病房級別；如於${hospital.hospitalNameZh}入住更高房種須承擔病房升級共同保險及約 HK$${estimatedDepositRequiredHkd.toLocaleString()} 按金差額。`;

    return {
      plan,
      nativeWardTier: tierInfo.nativeWardTier,
      logStatus,
      estimatedDepositRequiredHkd,
      depositWaivedHkd,
      annualPremiumHkd,
      monthlyPremiumHkd,
      irdTaxSavedHkd,
      netAnnualCostAfterTaxHkd,
      annualLimitLabelEn: tierInfo.annualLimitEn,
      annualLimitLabelZh: tierInfo.annualLimitZh,
      optionSummaryEn,
      optionSummaryZh,
    };
  });

  // Sort: FULL_CASHLESS_LOG plans that match desiredWard closely first, then by net annual cost
  return evaluated.sort((a, b) => {
    if (a.logStatus !== b.logStatus) {
      return a.logStatus === 'FULL_CASHLESS_LOG' ? -1 : 1;
    }
    const aTierDelta = Math.abs(WARD_RANK[a.nativeWardTier] - WARD_RANK[desiredWard]);
    const bTierDelta = Math.abs(WARD_RANK[b.nativeWardTier] - WARD_RANK[desiredWard]);
    if (aTierDelta !== bTierDelta) {
      return aTierDelta - bTierDelta;
    }
    return a.netAnnualCostAfterTaxHkd - b.netAnnualCostAfterTaxHkd;
  });
}

export type DealHospitalLogMatchSource =
  | 'ANCHOR_MEDICAL_PLAN'
  | 'VHIS_RIDER_ATTACHED'
  | 'UNMATCHED_NON_MEDICAL';

export interface DealHospitalLogPassEvaluation {
  matchSource: DealHospitalLogMatchSource;
  eligibleForCashlessLog: boolean;
  eligibleForZeroDepositLog: boolean;
  matchedPlanCode: string;
  matchedPlanLabelEn: string;
  matchedPlanLabelZh: string;
  wardTier: HospitalWardTier | 'NONE';
  wardTierLabelEn: string;
  wardTierLabelZh: string;
  logDepositHkd: number;
  waivedDepositMidpointHkd: number;
  statusHeadlineEn: string;
  statusHeadlineZh: string;
  recommendedMedicalPlans: HospitalPlanSignupOption[];
}

/**
 * Plan-First Evaluator for the Private Hospital Cashless LOG Pre-Authorization Pass (`私家醫院免找數預批通行證`).
 * Verifies whether the active anchor plan (or attached VHIS rider) actually qualifies for cashless hospital
 * admission, calculates real ward tier & admission deposit, and surfaces top matched VHIS / High-End Medical
 * plans (prioritizing the client's chosen insurer first) when no medical plan is matched yet.
 */
export function evaluateDealHospitalLogPass(params: {
  anchorPlan: InsurancePlan | null;
  selectedRiderIds: string[];
  hospital: HospitalLogEntry;
  clientAge: number;
  isSmoker: boolean;
  deductibleHkd?: HospitalDeductibleHkd;
  allPlans: InsurancePlan[];
}): DealHospitalLogPassEvaluation {
  const {
    anchorPlan,
    selectedRiderIds,
    hospital,
    clientAge,
    isSmoker,
    deductibleHkd = 0,
    allPlans,
  } = params;

  const allEvaluatedOptions = evaluateHospitalLogPlanOptions({
    hospital,
    desiredWard: 'SEMI_PRIVATE',
    deductibleHkd,
    clientAge,
    isSmoker,
    plans: allPlans,
  });

  // Prioritize same-insurer medical plans first when an anchorPlan is already chosen
  const recommendedMedicalPlans = [...allEvaluatedOptions]
    .sort((a, b) => {
      if (anchorPlan) {
        const aSame = a.plan.insurerCode === anchorPlan.insurerCode ? 0 : 1;
        const bSame = b.plan.insurerCode === anchorPlan.insurerCode ? 0 : 1;
        if (aSame !== bSame) return aSame - bSame;
      }
      if (a.logStatus !== b.logStatus) {
        return a.logStatus === 'FULL_CASHLESS_LOG' ? -1 : 1;
      }
      return a.netAnnualCostAfterTaxHkd - b.netAnnualCostAfterTaxHkd;
    })
    .slice(0, 4);

  const isAnchorMedical =
    anchorPlan !== null &&
    (anchorPlan.category === PlanCategory.HIGH_END_MEDICAL ||
      anchorPlan.category === PlanCategory.VHIS);

  const hasVhisRider = selectedRiderIds.includes('RIDER_SEMI_PRIVATE_VHIS');

  if (isAnchorMedical && anchorPlan) {
    const tierInfo = classifyPlanHospitalTier(anchorPlan);
    const wardLabels: Record<HospitalWardTier, { en: string; zh: string }> = {
      PRIVATE_ROOM: { en: 'Private Room Full Cover', zh: '私家房全數賠償級別' },
      SEMI_PRIVATE: { en: 'Asia Semi-Private Full Cover', zh: '亞洲半私家房全數賠償' },
      STANDARD_WARD: { en: 'VHIS Standard Ward Network', zh: '自願醫保標準普通房級別' },
    };
    const logDepositHkd =
      deductibleHkd > 0 ? Math.min(deductibleHkd, hospital.cashDepositMidpointHkd) : 0;
    const waivedDepositMidpointHkd = Math.max(0, hospital.cashDepositMidpointHkd - logDepositHkd);

    return {
      matchSource: 'ANCHOR_MEDICAL_PLAN',
      eligibleForCashlessLog: true,
      eligibleForZeroDepositLog: logDepositHkd === 0,
      matchedPlanCode: anchorPlan.insurerCode,
      matchedPlanLabelEn: `[${anchorPlan.insurerCode}] ${anchorPlan.nameEn}`,
      matchedPlanLabelZh: `[${anchorPlan.insurerCode}] ${anchorPlan.nameZh}`,
      wardTier: tierInfo.nativeWardTier,
      wardTierLabelEn: wardLabels[tierInfo.nativeWardTier].en,
      wardTierLabelZh: wardLabels[tierInfo.nativeWardTier].zh,
      logDepositHkd,
      waivedDepositMidpointHkd,
      statusHeadlineEn:
        logDepositHkd === 0
          ? `Matched ${anchorPlan.insurerCode} Medical Plan · HK$0 Cashless LOG Deposit`
          : `Matched ${anchorPlan.insurerCode} Medical Plan · LOG Above HK$${logDepositHkd.toLocaleString()} Deductible`,
      statusHeadlineZh:
        logDepositHkd === 0
          ? `已配對 ${anchorPlan.insurerNameZh} 醫療主約 · 免找數入院按金 HK$ 0`
          : `已配對 ${anchorPlan.insurerNameZh} 醫療主約 · 超出自付額 HK$${logDepositHkd.toLocaleString()} 直付免找數`,
      recommendedMedicalPlans,
    };
  }

  if (hasVhisRider) {
    const sameInsurerMed = anchorPlan
      ? recommendedMedicalPlans.find((m) => m.plan.insurerCode === anchorPlan.insurerCode)
      : undefined;
    const labelZh = sameInsurerMed
      ? `[${sameInsurerMed.plan.insurerCode}] ${sameInsurerMed.plan.nameZh}（附約配對）`
      : anchorPlan
      ? `[${anchorPlan.insurerCode}] 半私家房全數賠付 VHIS 附約`
      : '半私家房全數賠付 VHIS 醫療附約';
    const labelEn = sameInsurerMed
      ? `[${sameInsurerMed.plan.insurerCode}] ${sameInsurerMed.plan.nameEn} (Rider Pair)`
      : anchorPlan
      ? `[${anchorPlan.insurerCode}] Semi-Private VHIS Medical Rider`
      : 'Semi-Private Full-Cover VHIS Rider';

    return {
      matchSource: 'VHIS_RIDER_ATTACHED',
      eligibleForCashlessLog: true,
      eligibleForZeroDepositLog: true,
      matchedPlanCode: anchorPlan?.insurerCode || 'VHIS',
      matchedPlanLabelEn: labelEn,
      matchedPlanLabelZh: labelZh,
      wardTier: 'SEMI_PRIVATE',
      wardTierLabelEn: 'Semi-Private Full Cover (via VHIS Rider)',
      wardTierLabelZh: '亞洲半私家房全數賠償（由 VHIS 附約提供）',
      logDepositHkd: 0,
      waivedDepositMidpointHkd: hospital.cashDepositMidpointHkd,
      statusHeadlineEn: `Cashless LOG Active via Attached VHIS Rider · HK$0 Deposit`,
      statusHeadlineZh: `已由「半私家房 VHIS 醫療附約」啟用免找數通行 · 入院按金 HK$ 0`,
      recommendedMedicalPlans,
    };
  }

  // Case C: Non-medical plan (e.g. Savings / CI / Term Life) AND VHIS rider NOT selected!
  return {
    matchSource: 'UNMATCHED_NON_MEDICAL',
    eligibleForCashlessLog: false,
    eligibleForZeroDepositLog: false,
    matchedPlanCode: anchorPlan?.insurerCode || 'UNMATCHED',
    matchedPlanLabelEn: anchorPlan
      ? `[${anchorPlan.insurerCode}] ${anchorPlan.nameEn} (Non-Medical)`
      : 'No Medical / VHIS Plan Matched Yet',
    matchedPlanLabelZh: anchorPlan
      ? `[${anchorPlan.insurerCode}] ${anchorPlan.nameZh}（非醫療住院險種）`
      : '尚未配對醫療／VHIS 計劃',
    wardTier: 'NONE',
    wardTierLabelEn: 'Match a VHIS / High-End Medical Plan First',
    wardTierLabelZh: '請先配對高端醫療／VHIS 計劃或勾選醫療附約',
    logDepositHkd: hospital.cashDepositMidpointHkd,
    waivedDepositMidpointHkd: 0,
    statusHeadlineEn: `Current plan does not include hospital LOG — match a VHIS / Medical plan first to waive ${hospital.cashDepositRangeHkd} deposit.`,
    statusHeadlineZh: `當前主約不含住院免找數 (LOG) — 請先配對下方高端醫療／VHIS 計劃以豁免 ${hospital.cashDepositRangeHkd} 按金`,
    recommendedMedicalPlans,
  };
}

