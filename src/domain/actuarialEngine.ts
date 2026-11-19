import {
  ActuarialQuoteResult,
  ClientLead,
  ComplianceCheckResult,
  CurrencyCode,
  InsurancePlan,
  IntermediaryProfile,
  IntermediaryRole,
  IrdTaxReliefResult,
  PlanCategory,
  PracticeBreakEvenResult,
  SurrenderProjectionRow,
} from './types';

export const HKIA_IRR_CAP_HKD = 0.06; // 6.0% max for HKD participating policies (HKIA 1 July 2025 Cap)
export const HKIA_IRR_CAP_NON_HKD = 0.065; // 6.5% max for USD/RMB & other non-HKD participating policies

export const FX_RATES_FROM_USD: Record<CurrencyCode, number> = {
  USD: 1,
  HKD: 7.8,
  RMB: 7.2,
};

const HK_STANDARD_TAX_MARGINAL_RATE = 0.15; // 15% standard / progressive estimate for VHIS & QDAP tax relief

/**
 * Calculates age & smoker actuarial multiplier relative to age-35 non-smoker baseline.
 */
export function computeDemographicFactor(
  age: number,
  isSmoker: boolean,
  category: PlanCategory
): number {
  const clampedAge = Math.max(18, Math.min(80, age));
  const ageDelta = clampedAge - 35;

  // Savings/QDAP/Universal Life scale gently with age; pure protection/medical/CI scale steeper; GI is flat/mild
  const perYearSlope =
    category === PlanCategory.GENERAL_GI
      ? 0.002
      : category === PlanCategory.PARTICIPATING_SAVINGS ||
        category === PlanCategory.QDAP ||
        category === PlanCategory.UNIVERSAL_LIFE
      ? 0.006
      : 0.028;

  const ageMultiplier = Math.max(
    0.62,
    1 + ageDelta * perYearSlope + (ageDelta > 15 && category !== PlanCategory.GENERAL_GI ? (ageDelta - 15) * 0.012 : 0)
  );

  const smokerMultiplier =
    isSmoker &&
    (category === PlanCategory.CRITICAL_ILLNESS ||
      category === PlanCategory.TERM_LIFE ||
      category === PlanCategory.VHIS ||
      category === PlanCategory.HIGH_END_MEDICAL ||
      category === PlanCategory.UNIVERSAL_LIFE)
      ? 1.35
      : 1.0;

  return ageMultiplier * smokerMultiplier;
}

/**
 * Adjusts annual premium rate based on payment horizon length relative to a 20-year baseline.
 */
export function computePaymentTermFactor(paymentTermYears: number, category: PlanCategory): number {
  if (
    category === PlanCategory.VHIS ||
    category === PlanCategory.HIGH_END_MEDICAL ||
    category === PlanCategory.GENERAL_GI
  ) {
    return 1.0; // VHIS, High-End Medical & General Insurance are annually renewable
  }
  const safeTerm = Math.max(3, paymentTermYears);
  // Shorter payment term concentrates total funding into fewer years
  return +(20 / safeTerm).toFixed(4) * 0.88 + 0.12;
}

/**
 * Computes HKIA-compliant quote, participating IRR cap enforcement, tax savings,
 * separate Guaranteed vs Total Breakeven years, and 5/10/15/20/30-yr projections.
 */
export function calculateCompliantQuote(params: {
  plan: InsurancePlan;
  age: number;
  isSmoker: boolean;
  currency: CurrencyCode;
  sumAssuredInSelectedCurrency: number;
  paymentTermYears: number;
  fulfillmentStressPercent?: number;
}): ActuarialQuoteResult {
  const {
    plan,
    age,
    isSmoker,
    currency,
    sumAssuredInSelectedCurrency,
    paymentTermYears,
    fulfillmentStressPercent = 100,
  } = params;
  const stressRatio = Math.max(0, Math.min(1.3, fulfillmentStressPercent / 100));
  const fx = FX_RATES_FROM_USD[currency];
  const sumAssuredUsd = sumAssuredInSelectedCurrency / fx;

  const demoFactor = computeDemographicFactor(age, isSmoker, plan.category);
  const termFactor = computePaymentTermFactor(paymentTermYears, plan.category);

  const isAnnualRenewable =
    plan.category === PlanCategory.VHIS ||
    plan.category === PlanCategory.HIGH_END_MEDICAL ||
    plan.category === PlanCategory.GENERAL_GI;

  // For General Insurance (Travel / Home / Helper / Pet / PA), baseRatePer1000UsdAge35Ns represents realistic package rate anchored to $100k USD baseline
  const effectiveBasisUsd =
    plan.category === PlanCategory.GENERAL_GI ? 100000 : sumAssuredUsd;

  const rawAnnualUsd =
    (effectiveBasisUsd / 1000) * plan.baseRatePer1000UsdAge35Ns * demoFactor * termFactor;
  const annualPremium = Math.max(80, Math.round(rawAnnualUsd * fx));
  const monthlyEquivalent = Math.max(7, Math.round(annualPremium / 12));

  const effectiveTerm =
    plan.category === PlanCategory.GENERAL_GI
      ? 1
      : isAnnualRenewable
      ? 20
      : paymentTermYears;
  const totalPremiumsPaid = annualPremium * effectiveTerm;

  // Enforce HKIA Participating Policy Benefit Illustration Rate Cap (GL28 / 1 July 2025 Cap)
  const isParPolicy =
    plan.category === PlanCategory.PARTICIPATING_SAVINGS || plan.category === PlanCategory.QDAP;
  const capDecimal = isParPolicy
    ? currency === 'HKD'
      ? HKIA_IRR_CAP_HKD
      : HKIA_IRR_CAP_NON_HKD
    : null;

  const effectiveIrrDecimal =
    capDecimal !== null ? Math.min(plan.rawProjectedIrr, capDecimal) : plan.rawProjectedIrr;

  // VHIS / QDAP HK Salaries Tax Deduction Relief Estimate (in HKD)
  const annualPremiumHkd =
    currency === 'HKD' ? annualPremium : Math.round((annualPremium / fx) * FX_RATES_FROM_USD.HKD);
  const estimatedAnnualTaxSavedHkd =
    plan.taxDeductibleCapHkd !== null
      ? Math.round(
          Math.min(annualPremiumHkd, plan.taxDeductibleCapHkd) * HK_STANDARD_TAX_MARGINAL_RATE
        )
      : 0;

  // Build projections for Years 5, 10, 15, 20, 30
  const hasCashValue =
    plan.category === PlanCategory.PARTICIPATING_SAVINGS ||
    plan.category === PlanCategory.QDAP ||
    plan.category === PlanCategory.UNIVERSAL_LIFE ||
    plan.category === PlanCategory.CRITICAL_ILLNESS;

  const computeGuaranteedFactorAtYear = (year: number): number => {
    if (plan.category === PlanCategory.UNIVERSAL_LIFE) {
      return year < 5
        ? 0.72 + year * 0.04
        : Math.min(1.55, 0.92 + (year - 5) * Math.max(0.018, plan.guaranteedIrr));
    }
    return year < 8
      ? 0.48 + year * 0.04
      : Math.min(1.38, 0.82 + (year - 8) * Math.max(0.015, plan.guaranteedIrr * 1.3));
  };

  const milestoneYears = [5, 10, 15, 20, 30];
  let breakevenYear: number | null = null;
  let guaranteedBreakevenYear: number | null = null;

  const projections: SurrenderProjectionRow[] = milestoneYears.map((year) => {
    const paidYears = isAnnualRenewable ? year : Math.min(year, paymentTermYears);
    const cumulativePremiumsPaid = annualPremium * paidYears;

    if (!hasCashValue) {
      return {
        policyYear: year,
        clientAge: age + year,
        cumulativePremiumsPaid,
        guaranteedCashValue: 0,
        nonGuaranteedDividend: 0,
        totalSurrenderValue: 0,
      };
    }

    const avgCapitalDuration = Math.max(1, year - paidYears * 0.42);
    const guaranteedFactor = computeGuaranteedFactorAtYear(year);
    const guaranteedCashValue = Math.round(cumulativePremiumsPaid * guaranteedFactor);

    const compoundedTotal = Math.round(
      cumulativePremiumsPaid * Math.pow(1 + effectiveIrrDecimal, avgCapitalDuration * 0.82)
    );
    const earlySurrenderRatio =
      plan.category === PlanCategory.CRITICAL_ILLNESS
        ? 0.45
        : plan.category === PlanCategory.UNIVERSAL_LIFE
        ? 0.86
        : 0.78;
    const baselineTotal =
      year <= 5
        ? Math.round(cumulativePremiumsPaid * earlySurrenderRatio)
        : Math.max(guaranteedCashValue, compoundedTotal);
    const baselineNonGuaranteed = Math.max(0, baselineTotal - guaranteedCashValue);
    const nonGuaranteedDividend = Math.round(baselineNonGuaranteed * stressRatio);
    const totalSurrenderValue =
      year <= 5 && baselineTotal <= guaranteedCashValue
        ? baselineTotal
        : guaranteedCashValue + nonGuaranteedDividend;

    return {
      policyYear: year,
      clientAge: age + year,
      cumulativePremiumsPaid,
      guaranteedCashValue,
      nonGuaranteedDividend,
      totalSurrenderValue,
    };
  });

  if (hasCashValue) {
    for (let yr = 1; yr <= 30; yr++) {
      const paidYears = Math.min(yr, paymentTermYears);
      const paid = annualPremium * paidYears;
      const dur = Math.max(1, yr - paidYears * 0.42);
      const guarVal = Math.round(paid * computeGuaranteedFactorAtYear(yr));
      const earlyRatio =
        plan.category === PlanCategory.CRITICAL_ILLNESS
          ? 0.45
          : plan.category === PlanCategory.UNIVERSAL_LIFE
          ? 0.86
          : 0.78;
      const baseTot =
        yr <= 5
          ? Math.round(paid * earlyRatio)
          : Math.max(guarVal, Math.round(paid * Math.pow(1 + effectiveIrrDecimal, dur * 0.82)));
      const nonGuar = Math.round(Math.max(0, baseTot - guarVal) * stressRatio);
      const totalVal = yr <= 5 && baseTot <= guarVal ? baseTot : guarVal + nonGuar;

      if (breakevenYear === null && totalVal >= paid) {
        breakevenYear = yr;
      }
      if (guaranteedBreakevenYear === null && guarVal >= paid) {
        guaranteedBreakevenYear = yr;
      }
    }
  }

  return {
    planId: plan.id,
    currency,
    fxRateFromUsd: fx,
    sumAssured: sumAssuredInSelectedCurrency,
    paymentTermYears: effectiveTerm,
    annualPremium,
    monthlyEquivalent,
    totalPremiumsPaid,
    rawIrrPercent: +(plan.rawProjectedIrr * 100).toFixed(2),
    appliedHkiaIrrCapPercent: capDecimal !== null ? +(capDecimal * 100).toFixed(2) : null,
    effectiveIllustratedIrrPercent: +(effectiveIrrDecimal * 100).toFixed(2),
    estimatedAnnualTaxSavedHkd,
    breakevenYear,
    guaranteedBreakevenYear,
    projections,
  };
}

/**
 * Hong Kong Inland Revenue Ordinance (Cap. 112) s.26ZZD & DIPN 57 Salaries Tax Deduction Calculator.
 * Supports progressive tax bands (2% / 6% / 10% / 14% / 17%), Single HK$60,000 vs Married HK$120,000 QDAP cap,
 * and HK$8,000 per insured relative for VHIS.
 */
export function calculateIrdSalariesTaxRelief(params: {
  annualNetChargeableIncomeHkd: number;
  filingStatus: 'SINGLE' | 'MARRIED_JOINT';
  qdapAnnualPremiumHkd: number;
  vhisInsuredCount: number;
  vhisTotalPremiumHkd: number;
}): IrdTaxReliefResult {
  const {
    annualNetChargeableIncomeHkd,
    filingStatus,
    qdapAnnualPremiumHkd,
    vhisInsuredCount,
    vhisTotalPremiumHkd,
  } = params;

  const qdapCap = filingStatus === 'MARRIED_JOINT' ? 120000 : 60000;
  const eligibleQdapDeductionHkd = Math.max(0, Math.min(qdapAnnualPremiumHkd, qdapCap));

  const vhisMaxCap = Math.max(0, Math.floor(vhisInsuredCount)) * 8000;
  const eligibleVhisDeductionHkd = Math.max(0, Math.min(vhisTotalPremiumHkd, vhisMaxCap));

  const totalEligibleDeductionHkd = eligibleQdapDeductionHkd + eligibleVhisDeductionHkd;

  // Progressive tax bands on Net Chargeable Income (HKD):
  // First $50,000 @ 2%, Next $50,000 @ 6%, Next $50,000 @ 10%, Next $50,000 @ 14%, Remainder @ 17%
  const computeProgressiveTax = (chargeable: number): number => {
    let rem = Math.max(0, chargeable);
    let tax = 0;
    const bands: Array<[number, number]> = [
      [50000, 0.02],
      [50000, 0.06],
      [50000, 0.1],
      [50000, 0.14],
    ];
    for (const [width, rate] of bands) {
      if (rem <= 0) break;
      const slice = Math.min(rem, width);
      tax += slice * rate;
      rem -= slice;
    }
    if (rem > 0) {
      tax += rem * 0.17;
    }
    return tax;
  };

  const marginalRatePercent =
    annualNetChargeableIncomeHkd > 200000
      ? 17
      : annualNetChargeableIncomeHkd > 150000
      ? 14
      : annualNetChargeableIncomeHkd > 100000
      ? 10
      : annualNetChargeableIncomeHkd > 50000
      ? 6
      : 2;

  const beforeTax = computeProgressiveTax(annualNetChargeableIncomeHkd);
  const afterTax = computeProgressiveTax(
    Math.max(0, annualNetChargeableIncomeHkd - totalEligibleDeductionHkd)
  );
  const annualTaxSavedHkd = Math.round(beforeTax - afterTax);

  return {
    filingStatus,
    marginalRatePercent,
    eligibleQdapDeductionHkd,
    eligibleVhisDeductionHkd,
    totalEligibleDeductionHkd,
    annualTaxSavedHkd,
    statutoryReference: 'Inland Revenue Ordinance (Cap. 112) s.26ZZD & DIPN No. 57 [SOURCED-STRICT]',
  };
}

/**
 * Practice SaaS Unit Economics & Break-Even Calculator (InsurIntel cost_model.json v4.0.0 [ASSUMPTION]).
 */
export function calculatePracticeBreakEven(params: {
  leanFixedOverheadHkd: number;
  founderSalaryHkd: number;
  advisorProMonthlyPriceHkd: number;
  agencyTeamMonthlyPriceHkd: number;
  agencyTeamSeats: number;
  stripePercentageRate: number;
  stripeFixedFeeHkd: number;
  variableCostPerSeatHkd: number;
  monthlyChurnPercent: number;
}): PracticeBreakEvenResult {
  const {
    leanFixedOverheadHkd,
    founderSalaryHkd,
    advisorProMonthlyPriceHkd,
    agencyTeamMonthlyPriceHkd,
    agencyTeamSeats,
    stripePercentageRate,
    stripeFixedFeeHkd,
    variableCostPerSeatHkd,
    monthlyChurnPercent,
  } = params;

  const fullFixedHkd = leanFixedOverheadHkd + founderSalaryHkd;

  const advisorStripeFee =
    advisorProMonthlyPriceHkd * stripePercentageRate + stripeFixedFeeHkd;
  const advisorProNetPerSeatHkd = +(
    advisorProMonthlyPriceHkd -
    advisorStripeFee -
    variableCostPerSeatHkd
  ).toFixed(2);

  const advisorProLeanBreakEvenSeats = Math.ceil(
    leanFixedOverheadHkd / Math.max(1, advisorProNetPerSeatHkd)
  );
  const advisorProFullBreakEvenSeats = Math.ceil(
    fullFixedHkd / Math.max(1, advisorProNetPerSeatHkd)
  );

  const teamStripeFee = agencyTeamMonthlyPriceHkd * stripePercentageRate + stripeFixedFeeHkd;
  const teamVariableCost = agencyTeamSeats * variableCostPerSeatHkd;
  const agencyTeamNetPerUnitHkd = +(
    agencyTeamMonthlyPriceHkd -
    teamStripeFee -
    teamVariableCost
  ).toFixed(2);

  const agencyTeamLeanBreakEvenUnits = Math.ceil(
    leanFixedOverheadHkd / Math.max(1, agencyTeamNetPerUnitHkd)
  );
  const agencyTeamFullBreakEvenUnits = Math.ceil(
    fullFixedHkd / Math.max(1, agencyTeamNetPerUnitHkd)
  );

  const monthlyChurnReplacementSeats = Math.ceil(
    advisorProFullBreakEvenSeats * (Math.max(0, monthlyChurnPercent) / 100)
  );

  return {
    advisorProNetPerSeatHkd,
    advisorProLeanBreakEvenSeats,
    advisorProFullBreakEvenSeats,
    agencyTeamNetPerUnitHkd,
    agencyTeamLeanBreakEvenUnits,
    agencyTeamFullBreakEvenUnits,
    monthlyChurnReplacementSeats,
  };
}

/**
 * InsurIntel HK External Presentation Safe Mode Lock (外部展示合規鎖):
 * Masks competitor insurer & product names into neutral benchmark labels during external client meetings
 * unless the intermediary is directly appointed for that principal.
 */
export function formatPlanForClientSafeMode(
  plan: InsurancePlan,
  insurerMapIndex: number,
  clientSafeMode: boolean,
  intermediary: IntermediaryProfile
): {
  displayInsurerEn: string;
  displayInsurerZh: string;
  displayPlanEn: string;
  displayPlanZh: string;
  isAnonymized: boolean;
} {
  if (!clientSafeMode) {
    return {
      displayInsurerEn: plan.insurerNameEn,
      displayInsurerZh: plan.insurerNameZh,
      displayPlanEn: plan.nameEn,
      displayPlanZh: plan.nameZh,
      isAnonymized: false,
    };
  }

  // Tied Agent keeps their own appointed principal visible; Broker or non-appointed competitors become neutral Insurer A/B/C
  const isOwnPrincipal =
    intermediary.role === IntermediaryRole.TIED_AGENT &&
    intermediary.appointedInsurers.includes(plan.insurerCode);

  if (isOwnPrincipal) {
    return {
      displayInsurerEn: plan.insurerNameEn,
      displayInsurerZh: plan.insurerNameZh,
      displayPlanEn: plan.nameEn,
      displayPlanZh: plan.nameZh,
      isAnonymized: false,
    };
  }

  const alpha = String.fromCharCode(65 + (insurerMapIndex % 26));
  const suffix = insurerMapIndex >= 26 ? `${Math.floor(insurerMapIndex / 26)}` : '';
  const codeLabel = `${alpha}${suffix}`;

  return {
    displayInsurerEn: `Market Peer ${codeLabel}`,
    displayInsurerZh: `同業保司 ${codeLabel}`,
    displayPlanEn: `${plan.categoryLabelEn} Benchmark (${codeLabel})`,
    displayPlanZh: `${plan.categoryLabelZh}市場基準方案 (${codeLabel})`,
    isAnonymized: true,
  };
}

/**
 * Evaluates all HKIA regulatory gates (RBAC Principal Restriction, GL30 FNA, GL16 Retirement Suitability, MCV Onshore).
 */
export function evaluateHkiaCompliance(params: {
  intermediary: IntermediaryProfile;
  lead: ClientLead;
  plan: InsurancePlan;
  quote: ActuarialQuoteResult;
}): ComplianceCheckResult {
  const { intermediary, lead, plan, quote } = params;
  const blockingReasons: string[] = [];
  const suitabilityWarnings: string[] = [];
  const passedChecks: string[] = [];

  // 1. RBAC Check: Brokers represent client across all insurers; Tied Agents restricted to appointed principals
  const isAppointed =
    intermediary.role === IntermediaryRole.BROKER_TR ||
    intermediary.appointedInsurers.includes('ALL') ||
    intermediary.appointedInsurers.includes(plan.insurerCode);

  if (!isAppointed) {
    blockingReasons.push(
      `HKIA Tied-Agent RBAC Restriction: License ${intermediary.iaLicenseNo} is appointed only for [${intermediary.appointedInsurers.join(', ')}]. Market comparison is permitted for internal benchmarking, but e-Application submission for ${plan.insurerNameEn} is locked.`
    );
  } else {
    passedChecks.push(
      intermediary.role === IntermediaryRole.BROKER_TR
        ? `Broker Technical Representative (${intermediary.iaLicenseNo}) authorized for whole-of-market placement.`
        : `Tied Agent principal appointment verified for ${plan.insurerNameEn}.`
    );
  }

  // 2. GL30 Mandatory Financial Needs Analysis (FNA) Check for Long-Term Life / CI / Savings / QDAP / UL
  const isPureMedicalOrGi =
    plan.category === PlanCategory.VHIS ||
    plan.category === PlanCategory.HIGH_END_MEDICAL ||
    plan.category === PlanCategory.GENERAL_GI;
  const requiresGl30Fna = !isPureMedicalOrGi;
  if (requiresGl30Fna && !lead.fnaRecord) {
    blockingReasons.push(
      `HKIA Guideline GL30 Block: Signed Financial Needs Analysis (FNA) & Risk Profile Questionnaire (RPQ) must be completed for ${lead.fullNameEn} (${lead.fullNameZh}) prior to generating a long-term policy application.`
    );
  } else if (lead.fnaRecord) {
    passedChecks.push(
      `GL30 Financial Needs Analysis signed (${lead.fnaRecord.riskTolerance} risk profile).`
    );

    // Affordability Ratio Check (GL30 Budget Suitability)
    const monthlyPremHkd =
      quote.currency === 'HKD'
        ? quote.monthlyEquivalent
        : Math.round((quote.monthlyEquivalent / quote.fxRateFromUsd) * FX_RATES_FROM_USD.HKD);
    const monthlySurplus = Math.max(
      1,
      lead.fnaRecord.monthlyIncomeHkd - lead.fnaRecord.monthlyExpensesHkd
    );
    if (monthlyPremHkd > monthlySurplus * 0.5) {
      suitabilityWarnings.push(
        `GL30 Affordability Alert: Monthly premium equivalent (HK$${monthlyPremHkd.toLocaleString()}) exceeds 50% of declared monthly disposable surplus (HK$${monthlySurplus.toLocaleString()}). Liquid asset buffer (HK$${lead.fnaRecord.liquidAssetsHkd.toLocaleString()}) will be cited in underwriting justification.`
      );
    }
  } else {
    passedChecks.push(
      'Standalone Medical / General Insurance plan exempted from long-term GL30 investment FNA.'
    );
  }

  // 3. HKID / Identity KYC Check
  if (!lead.kycCheck.hkidVerified) {
    blockingReasons.push(
      `PDPO / AML e-KYC Incomplete: Identity document (${lead.residency === 'MCV' ? 'Passport / Exit-Entry Permit' : 'HKID'}) has not been verified for ${lead.fullNameEn}.`
    );
  } else {
    passedChecks.push(`Identity document verified (${lead.kycCheck.hkidDocNumber}).`);
  }

  // 4. Cross-Border MCV Onshore Verification (HK Immigration Landing Slip 入境標籤)
  if (lead.residency === 'MCV') {
    if (!lead.kycCheck.mcvEntrySlipVerified) {
      blockingReasons.push(
        `HKIA Cross-Border MCV Block: Hong Kong Immigration Department Landing Slip (入境標籤) must be scanned and verified to prove onshore signing within HKSAR.`
      );
    } else {
      passedChecks.push(
        `MCV Onshore Signing Verified: HK Immigration Landing Slip (入境標籤) valid through ${lead.kycCheck.mcvPermittedUntil || 'verified stay'}.`
      );
    }
  }

  // 5. GL16 Section 7.4 Suitability Check: Payment Term Exceeding Planned Retirement Age
  if (!isPureMedicalOrGi) {
    const ageAtEndOfPayment = lead.age + quote.paymentTermYears;
    if (ageAtEndOfPayment > lead.plannedRetirementAge) {
      const hasPostRetireNote = Boolean(lead.fnaRecord?.postRetirementSourceNote?.trim());
      suitabilityWarnings.push(
        `GL16 Sec 7.4 Retirement Horizon Alert: Premium payment ends at age ${ageAtEndOfPayment}, exceeding client's planned retirement age (${lead.plannedRetirementAge}). ${
          hasPostRetireNote
            ? `Documented post-retirement funding source: "${lead.fnaRecord?.postRetirementSourceNote}".`
            : 'Ensure post-retirement source of funds is documented in FNA.'
        }`
      );
    }
  }

  return {
    canSubmitStp: blockingReasons.length === 0,
    canCompareBenchmark: true,
    blockingReasons,
    suitabilityWarnings,
    passedChecks,
  };
}
