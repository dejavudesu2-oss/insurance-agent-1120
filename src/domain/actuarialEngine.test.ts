import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCompliantQuote,
  calculateIrdSalariesTaxRelief,
  calculatePracticeBreakEven,
  evaluateHkiaCompliance,
  formatPlanForClientSafeMode,
  HKIA_IRR_CAP_HKD,
  HKIA_IRR_CAP_NON_HKD,
} from './actuarialEngine';
import {
  ClientLead,
  InsurancePlan,
  IntermediaryProfile,
  IntermediaryRole,
  LeadStage,
  PlanCategory,
} from './types';

const sampleParPlan: InsurancePlan = {
  id: 'FWD_MAXFOCUS',
  insurerCode: 'FWD',
  insurerNameEn: 'FWD Hong Kong',
  insurerNameZh: '富衛香港',
  nameEn: 'MaxFocus Signature Savings',
  nameZh: '盈聚天下壽險計劃',
  category: PlanCategory.PARTICIPATING_SAVINGS,
  categoryLabelEn: 'Participating Savings',
  categoryLabelZh: '儲蓄分紅壽險',
  currencies: ['USD', 'HKD', 'RMB'],
  fulfillmentRatio: 101,
  rawProjectedIrr: 0.071, // 7.1% raw before HKIA cap
  guaranteedIrr: 0.012,
  baseRatePer1000UsdAge35Ns: 50,
  supportedPaymentTerms: [5, 10, 15, 20],
  taxDeductibleCapHkd: null,
  waitingPeriodText: 'Immediate death cover',
  keyHighlightsEn: ['8 currencies switch'],
  keyHighlightsZh: ['8種保單貨幣轉換'],
  submissionChannel: 'OPEN_API_INSTANT',
};

const sampleQdapPlan: InsurancePlan = {
  ...sampleParPlan,
  id: 'AXA_QDAP',
  insurerCode: 'AXA',
  category: PlanCategory.QDAP,
  rawProjectedIrr: 0.052,
  taxDeductibleCapHkd: 60000,
};

const brokerProfile: IntermediaryProfile = {
  id: 'i-broker',
  nameEn: 'Raymond Kwok',
  nameZh: '郭志明',
  iaLicenseNo: 'FB1928',
  firmName: 'Harbour Wealth Insurance Brokers Ltd.',
  role: IntermediaryRole.BROKER_TR,
  appointedInsurers: ['ALL'],
  avatarUrl: '',
};

const tiedAgentProfile: IntermediaryProfile = {
  ...brokerProfile,
  id: 'i-agent',
  iaLicenseNo: 'FA8402',
  role: IntermediaryRole.TIED_AGENT,
  appointedInsurers: ['AIA'],
};

const compliantHkLead: ClientLead = {
  id: 'l-1',
  fullNameEn: 'Chan Tai Man',
  fullNameZh: '陳大文',
  age: 35,
  plannedRetirementAge: 65,
  isSmoker: false,
  residency: 'HK_RESIDENT',
  whatsappPhone: '+852 9123 4567',
  email: 'tmchan@example.hk',
  stage: LeadStage.FNA_COMPLETED,
  notes: '',
  fnaRecord: {
    monthlyIncomeHkd: 68000,
    monthlyExpensesHkd: 28000,
    liquidAssetsHkd: 950000,
    dependentsCount: 2,
    riskTolerance: 'BALANCED',
    primaryObjectives: ['Wealth Accumulation', 'Family Protection'],
    postRetirementSourceNote: 'MPF & rental yield',
    signedAtIso: '2026-11-10T10:00:00Z',
  },
  kycCheck: {
    hkidVerified: true,
    hkidDocNumber: 'A123456(7)',
    mcvEntrySlipVerified: false,
  },
  lastContactIso: '2026-11-10T10:00:00Z',
};

test('HKIA Illustration Rate Cap clamps 7.1% participating plan to 6.5% in USD and 6.0% in HKD, and separates Guaranteed vs Total Breakeven', () => {
  const usdQuote = calculateCompliantQuote({
    plan: sampleParPlan,
    age: 35,
    isSmoker: false,
    currency: 'USD',
    sumAssuredInSelectedCurrency: 100000,
    paymentTermYears: 10,
  });

  assert.equal(usdQuote.rawIrrPercent, 7.1);
  assert.equal(usdQuote.appliedHkiaIrrCapPercent, +(HKIA_IRR_CAP_NON_HKD * 100).toFixed(2));
  assert.equal(usdQuote.effectiveIllustratedIrrPercent, 6.5);
  assert.ok(usdQuote.breakevenYear !== null && usdQuote.breakevenYear <= 8);
  assert.ok(
    usdQuote.guaranteedBreakevenYear !== null &&
      usdQuote.guaranteedBreakevenYear >= 18 &&
      usdQuote.guaranteedBreakevenYear > usdQuote.breakevenYear
  );

  const hkdQuote = calculateCompliantQuote({
    plan: sampleParPlan,
    age: 35,
    isSmoker: false,
    currency: 'HKD',
    sumAssuredInSelectedCurrency: 780000,
    paymentTermYears: 10,
  });

  assert.equal(hkdQuote.appliedHkiaIrrCapPercent, +(HKIA_IRR_CAP_HKD * 100).toFixed(2));
  assert.equal(hkdQuote.effectiveIllustratedIrrPercent, 6.0);
  assert.equal(hkdQuote.projections.length, 5);
  assert.ok(hkdQuote.projections[4].totalSurrenderValue > hkdQuote.totalPremiumsPaid);
});

test('QDAP tax deduction estimates up to HK$60,000 cap at 15% standard tax rate', () => {
  const qdapQuote = calculateCompliantQuote({
    plan: sampleQdapPlan,
    age: 40,
    isSmoker: false,
    currency: 'HKD',
    sumAssuredInSelectedCurrency: 800000,
    paymentTermYears: 10,
  });

  assert.equal(qdapQuote.estimatedAnnualTaxSavedHkd, 9000); // 60,000 * 15% = HK$9,000 max annual tax saved
  assert.equal(qdapQuote.effectiveIllustratedIrrPercent, 5.2); // 5.2% is under 6.0% HKD cap
});

test('IRD Cap. 112 s.26ZZD progressive tax calculator enforces HK$120,000 married QDAP + HK$8,000 per VHIS member at 17% top marginal band', () => {
  const relief = calculateIrdSalariesTaxRelief({
    annualNetChargeableIncomeHkd: 480000,
    filingStatus: 'MARRIED_JOINT',
    qdapAnnualPremiumHkd: 150000, // Capped at HK$120,000 for married joint
    vhisInsuredCount: 2, // 2 * HK$8,000 = HK$16,000 cap
    vhisTotalPremiumHkd: 22000,
  });

  assert.equal(relief.marginalRatePercent, 17);
  assert.equal(relief.eligibleQdapDeductionHkd, 120000);
  assert.equal(relief.eligibleVhisDeductionHkd, 16000);
  assert.equal(relief.totalEligibleDeductionHkd, 136000);
  assert.equal(relief.annualTaxSavedHkd, Math.round(136000 * 0.17)); // HK$23,120 saved
});

test('InsurIntel cost_model.json v4.0.0 break-even calculator matches audited golden targets (12 lean / 206 full seats; 1 lean / 17 full teams)', () => {
  const result = calculatePracticeBreakEven({
    leanFixedOverheadHkd: 2000,
    founderSalaryHkd: 35000,
    advisorProMonthlyPriceHkd: 199,
    agencyTeamMonthlyPriceHkd: 2480,
    agencyTeamSeats: 15,
    stripePercentageRate: 0.034,
    stripeFixedFeeHkd: 2.35,
    variableCostPerSeatHkd: 10.0,
    monthlyChurnPercent: 5,
  });

  assert.equal(result.advisorProNetPerSeatHkd, 179.88);
  assert.equal(result.advisorProLeanBreakEvenSeats, 12);
  assert.equal(result.advisorProFullBreakEvenSeats, 206);
  assert.equal(result.agencyTeamNetPerUnitHkd, 2243.33);
  assert.equal(result.agencyTeamLeanBreakEvenUnits, 1);
  assert.equal(result.agencyTeamFullBreakEvenUnits, 17);
  assert.equal(result.monthlyChurnReplacementSeats, 11);
});

test('External Client Safe Mode masks non-appointed competitor names while keeping Tied Agent appointed principal visible', () => {
  const aiaPlan: InsurancePlan = {
    ...sampleParPlan,
    id: 'AIA_GPMCP3',
    insurerCode: 'AIA',
    insurerNameEn: 'AIA Hong Kong',
    insurerNameZh: '友邦香港',
  };

  const maskedCompetitor = formatPlanForClientSafeMode(sampleParPlan, 1, true, tiedAgentProfile);
  assert.equal(maskedCompetitor.isAnonymized, true);
  assert.equal(maskedCompetitor.displayInsurerZh, '同業保司 B');

  const ownPrincipal = formatPlanForClientSafeMode(aiaPlan, 0, true, tiedAgentProfile);
  assert.equal(ownPrincipal.isAnonymized, false);
  assert.equal(ownPrincipal.displayInsurerZh, '友邦香港');
});

test('RBAC blocks Tied Agent from submitting non-appointed insurer while allowing Broker TR', () => {
  const quote = calculateCompliantQuote({
    plan: sampleParPlan,
    age: 35,
    isSmoker: false,
    currency: 'USD',
    sumAssuredInSelectedCurrency: 100000,
    paymentTermYears: 10,
  });

  const brokerCheck = evaluateHkiaCompliance({
    intermediary: brokerProfile,
    lead: compliantHkLead,
    plan: sampleParPlan,
    quote,
  });
  assert.equal(brokerCheck.canSubmitStp, true);
  assert.equal(brokerCheck.blockingReasons.length, 0);

  const tiedCheck = evaluateHkiaCompliance({
    intermediary: tiedAgentProfile,
    lead: compliantHkLead,
    plan: sampleParPlan, // FWD plan, while tied agent is AIA-only
    quote,
  });
  assert.equal(tiedCheck.canCompareBenchmark, true);
  assert.equal(tiedCheck.canSubmitStp, false);
  assert.ok(tiedCheck.blockingReasons.some((msg) => msg.includes('RBAC')));
});

test('GL30 FNA gate, MCV Landing Slip gate, and GL16 retirement horizon warning trigger accurately', () => {
  const mcvLeadUnverified: ClientLead = {
    ...compliantHkLead,
    id: 'l-mcv',
    age: 50,
    plannedRetirementAge: 60,
    residency: 'MCV',
    fnaRecord: null,
    kycCheck: {
      hkidVerified: true,
      hkidDocNumber: 'E88392011',
      mcvEntrySlipVerified: false,
    },
  };

  const quote20Yr = calculateCompliantQuote({
    plan: sampleParPlan,
    age: 50,
    isSmoker: false,
    currency: 'USD',
    sumAssuredInSelectedCurrency: 100000,
    paymentTermYears: 20, // Ends at age 70 > planned retirement 60
  });

  const result = evaluateHkiaCompliance({
    intermediary: brokerProfile,
    lead: mcvLeadUnverified,
    plan: sampleParPlan,
    quote: quote20Yr,
  });

  assert.equal(result.canSubmitStp, false);
  assert.ok(result.blockingReasons.some((r) => r.includes('GL30')));
  assert.ok(result.blockingReasons.some((r) => r.includes('入境標籤')));
  assert.ok(result.suitabilityWarnings.some((w) => w.includes('GL16')));
});
