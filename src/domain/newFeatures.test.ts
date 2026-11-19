import test from 'node:test';
import assert from 'node:assert/strict';
import { HK_MARKET_PLANS, INTERMEDIARY_PROFILES } from '../data/hkMarketPlans';
import { HKIA_REGISTER_COMPLETENESS_SEGMENTS } from '../data/hkAdditionalMarketPlans';
import { HK_PRIVATE_HOSPITALS_LOG } from '../data/hkMarketIntelData';
import { INITIAL_CLIENT_LEADS } from '../data/initialLeads';
import { INITIAL_POLICY_PROVISIONS } from '../data/policyProvisionsCorpus';
import { evaluateHospitalLogPlanOptions } from './hospitalLogMatcher';
import { localizePlanStrings, pickLangText, toSimplifiedChinese } from './i18n';
import { buildDeterministicDualSubAgentReport } from './subAgentEngine';
import { calculateCompliantQuote } from './actuarialEngine';
import {
  ADVISOR_SAAS_TIERS,
  calculateAdvisorSubscriptionRoi,
  recommendBestFitPlansForContext,
  runDeterministicClauseSubAgents,
  TWENTY_APP_IMPROVEMENTS,
} from './clauseAndMonetizationEngine';
import {
  buildStandardizedInsurancePlan,
  classifyPolicyFeaturesDeterministically,
  parseUnstructuredPlansInput,
} from './planNormalizer';
import {
  analyzePortfolioProtectionGap,
  buildAnniversaryAndFxAlertQueue,
  calculateMdrtProjectionAndPersistency,
  evaluateHkiaCpdAndCpfiCompliance,
  evaluateMcvSigningConcierge,
  evaluateProcedureShortfallAndClaim,
  evaluateSubStandardPreUnderwriting,
  extractGl30FnaFromTranscriptDeterministically,
  optimizeJointTaxTrio,
  simulateMultiCurrencyLegacySplit,
  simulatePremiumFinancingStressTest,
} from './advisoryEngines';
import { IntermediaryRole, PlanCategory } from './types';

test('HK_MARKET_PLANS spans >= 210 unique Hong Kong insurance plans across 40 HKIA insurers and 8 categories', () => {
  const axaPlans = HK_MARKET_PLANS.filter((p) => p.insurerCode === 'AXA');
  const sunLifePlans = HK_MARKET_PLANS.filter((p) => p.insurerCode === 'SUNLIFE');
  const bocLifePlans = HK_MARKET_PLANS.filter((p) => p.insurerCode === 'BOCLIFE');
  const uniqueIds = new Set(HK_MARKET_PLANS.map((p) => p.id));
  const uniqueInsurers = new Set(HK_MARKET_PLANS.map((p) => p.insurerCode));
  const uniqueCategories = new Set(HK_MARKET_PLANS.map((p) => p.category));

  assert.ok(
    HK_MARKET_PLANS.length >= 210,
    `Expected >= 210 HK market plans, got ${HK_MARKET_PLANS.length}`
  );
  assert.equal(
    uniqueIds.size,
    HK_MARKET_PLANS.length,
    'Every HK insurance plan must have a unique id'
  );
  assert.ok(
    uniqueInsurers.size >= 40,
    `Expected >= 40 distinct active HKIA retail/HNW/GI insurers, got ${uniqueInsurers.size}`
  );
  assert.equal(uniqueCategories.size, 8, 'Expected all 8 HK product categories represented');

  // Verify newly added HKIA carriers exist
  for (const code of ['HKMC', 'FUBON', 'DAHSING', 'CMYLI', 'LIBERTY', 'STARR', 'UTMOST', 'RL360']) {
    assert.ok(uniqueInsurers.has(code), `Missing newly added HKIA insurer ${code}`);
  }

  // Verify HKIA 165-entity completeness breakdown
  const totalStatutory = HKIA_REGISTER_COMPLETENESS_SEGMENTS.reduce(
    (acc, s) => acc + s.hkiaStatutoryCount,
    0
  );
  const totalCovered = HKIA_REGISTER_COMPLETENESS_SEGMENTS.reduce(
    (acc, s) => acc + s.inAppCoveredCount,
    0
  );
  assert.equal(totalStatutory, 165);
  assert.equal(totalCovered, uniqueInsurers.size);

  assert.ok(axaPlans.length >= 10, `Expected >= 10 AXA plans, got ${axaPlans.length}`);
  assert.ok(sunLifePlans.length >= 10, `Expected >= 10 Sun Life plans, got ${sunLifePlans.length}`);
  assert.ok(bocLifePlans.length >= 10, `Expected >= 10 BOC Life plans, got ${bocLifePlans.length}`);

  for (const plan of HK_MARKET_PLANS) {
    assert.ok(plan.insurerCode && plan.insurerCode.length > 0, `Missing insurerCode on ${plan.id}`);
    assert.ok(plan.nameEn && plan.nameEn.length > 0, `Missing nameEn on ${plan.id}`);
    assert.ok(plan.nameZh && plan.nameZh.length > 0, `Missing nameZh on ${plan.id}`);
    assert.ok(plan.category, `Missing category on ${plan.id}`);
    assert.ok(
      plan.fulfillmentRatio === null || typeof plan.fulfillmentRatio === 'number',
      `Invalid fulfillmentRatio on ${plan.id}`
    );
    assert.ok(
      Array.isArray(plan.highlights) && plan.highlights.length >= 2,
      `Missing or empty highlights array on ${plan.id}`
    );
  }
});

test('Trilingual i18n helper converts Traditional HK (ZN) to Simplified Chinese (CN) and English (EN) cleanly', () => {
  assert.equal(toSimplifiedChinese('中銀人壽自願醫保靈活計劃'), '中银人寿自愿医保灵活计划');
  assert.equal(toSimplifiedChinese('養和醫院免找數保單條款'), '养和医院免找数保单条款');

  assert.equal(pickLangText('en', 'Market Plans', '全市場產品比較'), 'Market Plans');
  assert.equal(pickLangText('zh-HK', 'Market Plans', '全市場產品比較'), '全市場產品比較');
  assert.equal(pickLangText('zh-CN', 'Market Plans', '全市場產品比較'), '全市场产品比较');

  const sampleBoc = HK_MARKET_PLANS.find((p) => p.id === 'BOC_SMARTUP_PRO')!;
  const cnLocalized = localizePlanStrings(sampleBoc, 'zh-CN');
  assert.equal(cnLocalized.insurerName, '中银人寿');
  assert.equal(cnLocalized.planName, '非凡守护终身寿险计划（智尊版）');
});

test('Hospital LOG Plan Sign-Up Matcher evaluates ward tiers, deductibles, and cashless deposit waivers', () => {
  const hksh = HK_PRIVATE_HOSPITALS_LOG.find((h) => h.recordId === 'HK-HOSP-01')!;

  const privateRoomZeroDed = evaluateHospitalLogPlanOptions({
    hospital: hksh,
    desiredWard: 'PRIVATE_ROOM',
    deductibleHkd: 0,
    clientAge: 38,
    isSmoker: false,
    plans: HK_MARKET_PLANS,
  });

  assert.ok(privateRoomZeroDed.length >= 10, 'Expected at least 10 VHIS plans evaluated');
  const topOption = privateRoomZeroDed[0];
  assert.equal(topOption.logStatus, 'FULL_CASHLESS_LOG');
  assert.equal(topOption.estimatedDepositRequiredHkd, 0);
  assert.equal(topOption.depositWaivedHkd, hksh.cashDepositMidpointHkd);

  const wardUpgradeItems = privateRoomZeroDed.filter(
    (item) => item.logStatus === 'WARD_UPGRADE_TOPUP'
  );
  assert.ok(wardUpgradeItems.length >= 2);
  assert.ok(wardUpgradeItems[0].estimatedDepositRequiredHkd > 0);

  const privateRoom20kDed = evaluateHospitalLogPlanOptions({
    hospital: hksh,
    desiredWard: 'PRIVATE_ROOM',
    deductibleHkd: 20000,
    clientAge: 38,
    isSmoker: false,
    plans: HK_MARKET_PLANS,
  });

  const axaZero = privateRoomZeroDed.find((o) => o.plan.id === 'AXA_WISEGUARD_PRO_VHIS')!;
  const axa20k = privateRoom20kDed.find((o) => o.plan.id === 'AXA_WISEGUARD_PRO_VHIS')!;
  assert.ok(axaZero, 'AXA WiseGuard Pro VHIS must appear in Hospital LOG options');
  assert.ok(
    axa20k.annualPremiumHkd < axaZero.annualPremiumHkd,
    'HK$20k deductible should lower annual premium'
  );
});

test('Dual Sub-Agent Engine produces structured Advisor Efficiency and Client Question outputs across CN/ZN/EN', () => {
  const lead = INITIAL_CLIENT_LEADS[0];
  const plan = HK_MARKET_PLANS.find((p) => p.id === 'SUNLIFE_SUNGIFT_GLOBAL')!;
  const intermediary = INTERMEDIARY_PROFILES[IntermediaryRole.BROKER_TR];

  for (const lang of ['en', 'zh-HK', 'zh-CN'] as const) {
    const report = buildDeterministicDualSubAgentReport({
      lead,
      plan,
      intermediary,
      language: lang,
      customFocusPrompt: 'Compare with AXA FortuneXtra and BOC SmartUp Pro',
    });

    assert.ok(report.agentSubAgent.workflowSteps.length >= 2);
    assert.ok(report.agentSubAgent.appImprovements.length >= 3);
    assert.ok(report.clientSubAgent.predictedQuestions.length >= 4);
    assert.ok(report.clientSubAgent.appImprovements.length >= 3);
  }
});

test('Policy Feature Normalizer classifies Critical Illness, Medical, Savings, and Life plans and generates standardized 3-point highlights', () => {
  const rawBlock = [
    'AIA | On Your Side 2 | 愛伴航2 | Covers 115 critical illnesses, carcinoma-in-situ & stroke recurrence',
    'Bupa | Bupa Hero VHIS | 保柏非凡自願醫保 | HKSAR VHIS semi-private inpatient medical & HK$8,000 tax relief',
    'Sun Life | SunJoy Global | 萬年青星河尊享 | Multi-currency participating wealth accumulation & policy split',
    'BOC Life | i-Care Term | 智守護定期壽險 | Pure level-premium term life death benefit for mortgage hedge',
  ].join('\n');

  const parsed = parseUnstructuredPlansInput(rawBlock);
  assert.equal(parsed.length, 4);

  const normalized = parsed.map((raw, idx) =>
    buildStandardizedInsurancePlan(raw, classifyPolicyFeaturesDeterministically(raw), idx)
  );

  assert.equal(normalized[0].crmStandardCategory, 'Critical Illness');
  assert.equal(normalized[0].category, PlanCategory.CRITICAL_ILLNESS);

  assert.equal(normalized[1].crmStandardCategory, 'Medical');
  assert.equal(normalized[1].category, PlanCategory.VHIS);

  assert.equal(normalized[2].crmStandardCategory, 'Savings');
  assert.equal(normalized[2].category, PlanCategory.PARTICIPATING_SAVINGS);

  assert.equal(normalized[3].crmStandardCategory, 'Life');
  assert.equal(normalized[3].category, PlanCategory.TERM_LIFE);

  for (const p of normalized) {
    assert.equal(p.keyHighlightsEn.length, 3);
    assert.equal(p.keyHighlightsZh.length, 3);
    assert.equal(p.highlights?.length, 3);
    assert.match(p.keyHighlightsEn[0], /^\[[^\]]+\]/);
    assert.match(p.keyHighlightsZh[0], /^【[^】]+】/);
  }
});

test('07 Dividend Fulfillment Stress-Test scales non-guaranteed dividends while keeping guaranteed cash value unchanged', () => {
  const savPlan = HK_MARKET_PLANS.find((p) => p.category === PlanCategory.PARTICIPATING_SAVINGS)!;
  const base100 = calculateCompliantQuote({
    plan: savPlan,
    age: 35,
    isSmoker: false,
    currency: 'USD',
    sumAssuredInSelectedCurrency: 100000,
    paymentTermYears: 10,
    fulfillmentStressPercent: 100,
  });
  const stress80 = calculateCompliantQuote({
    plan: savPlan,
    age: 35,
    isSmoker: false,
    currency: 'USD',
    sumAssuredInSelectedCurrency: 100000,
    paymentTermYears: 10,
    fulfillmentStressPercent: 80,
  });

  const yr20Base = base100.projections.find((r) => r.policyYear === 20)!;
  const yr20Stress = stress80.projections.find((r) => r.policyYear === 20)!;

  assert.equal(yr20Stress.guaranteedCashValue, yr20Base.guaranteedCashValue);
  assert.ok(yr20Stress.nonGuaranteedDividend < yr20Base.nonGuaranteedDividend);
  assert.ok(yr20Stress.totalSurrenderValue < yr20Base.totalSurrenderValue);
});

test('08 Pro Advisory Engines FN-01 through FN-12 produce accurate, HK-compliant outputs', () => {
  // FN-01: Protection gap & VHIS deductible bridge
  const gap = analyzePortfolioProtectionGap({
    annualIncomeHkd: 900000,
    outstandingMortgageHkd: 4000000,
    dependentsCount: 2,
    existingLifeCoverHkd: 2000000,
    existingCiCoverHkd: 500000,
    employerGroupRoomLimitPerDayHkd: 1000,
    employerSurgicalLimitHkd: 30000,
    selectedVhisDeductibleHkd: 20000,
    clientAge: 35,
  });
  assert.equal(gap.recommendedLifeCoverHkd, 13000000);
  assert.equal(gap.lifeProtectionGapHkd, 11000000);
  assert.equal(gap.deductibleBridgeSavingsPct, 38);

  // FN-02: Joint vs Separate Tax Trio
  const tax = optimizeJointTaxTrio({
    selfAnnualAssessableIncomeHkd: 960000,
    spouseAnnualAssessableIncomeHkd: 540000,
    dependentChildrenCount: 1,
    eligibleParents55To59Count: 0,
    eligibleParents60PlusCount: 2,
    selfQdapAndTvcPremiumHkd: 60000,
    spouseQdapAndTvcPremiumHkd: 60000,
    vhisInsuredRelativesCount: 4,
    avgVhisPremiumPerPersonHkd: 8000,
    qdapPreTaxIrrPct: 4.8,
  });
  assert.ok(tax.totalTaxSavedByTrioHkd > 15000);
  assert.ok(tax.postTaxQdapIrrPct > 4.8);

  // FN-03: 567 Withdrawal & multi-child policy split
  const split = simulateMultiCurrencyLegacySplit({
    annualPremiumUsd: 50000,
    paymentTermYears: 5,
    preset: '567_RETIREMENT',
    targetCurrency: 'GBP',
    splitBeneficiariesCount: 2,
    clientCurrentAge: 36,
  });
  assert.equal(split.totalPremiumsUsd, 250000);
  assert.ok(split.cumulativeWithdrawalsUsd > 300000);
  assert.ok(split.perBeneficiaryYear30Usd > 0);

  // FN-04: MCV Concierge
  const mcv = evaluateMcvSigningConcierge({
    annualPremiumUsd: 150000,
    hasHkBankAccount: false,
    entrySlipVerified: true,
  });
  assert.equal(mcv.amlTier, 'ENHANCED_SOW_EDD');

  // FN-05: Premium financing +200 bps stress test
  const pf = simulatePremiumFinancingStressTest({
    totalSinglePremiumUsd: 1000000,
    day1CsvRatioPct: 82,
    bankLtvOnCsvPct: 90,
    fundingBenchmarkPct: 3.7,
    bankSpreadPct: 1.2,
    policyCreditingRatePct: 5.4,
  });
  assert.equal(pf.stressedLoanRatePct, Number((pf.baseLoanRatePct + 2.0).toFixed(2)));
  assert.ok(pf.leveragedStressedIrrPct < pf.leveragedBaseIrrPct);

  // FN-07: Sub-standard pre-underwriting
  const uw = evaluateSubStandardPreUnderwriting({
    conditionCode: 'THYROID_NODULE_TIRADS',
    severityLevel: 'MILD',
  });
  assert.ok(uw.insurerOutcomes.length >= 3);

  // FN-08: Procedure shortfall & dual claim
  const proc = evaluateProcedureShortfallAndClaim({
    procedureId: 'COLONOSCOPY_POLYPECTOMY',
    setting: 'DAY_CASE_NETWORK',
    employerGroupLimitHkd: 10000,
    personalPlanTier: 'VHIS_FLEXI_SMM',
    personalDeductibleHkd: 0,
  });
  assert.equal(proc.estimatedClientOutOfPocketHkd, 0);

  // FN-09: Cantonese-English meeting transcript -> GL30 FNA
  const fna = extractGl30FnaFromTranscriptDeterministically(
    '客戶而家月入 85k，每月開支 38000，流動資產 250 萬，有兩個小朋友，想儲英國升學同買 VHIS。'
  );
  assert.equal(fna.fnaRecord.monthlyIncomeHkd, 85000);
  assert.equal(fna.fnaRecord.dependentsCount, 2);

  // FN-10 & FN-11 & FN-12
  const mdrt = calculateMdrtProjectionAndPersistency({
    applications: [],
    leads: INITIAL_CLIENT_LEADS,
    manualYtdFycHkd: 400000,
    avgFycCommissionRatePct: 32,
  });
  assert.equal(mdrt.hkMdrtFycTargetHkd, 579700);
  assert.equal(mdrt.shortfallToMdrtHkd, 179700);

  const alerts = buildAnniversaryAndFxAlertQueue(
    INITIAL_CLIENT_LEADS,
    INTERMEDIARY_PROFILES[IntermediaryRole.BROKER_TR]
  );
  assert.equal(alerts.length, 4);

  const cpd = evaluateHkiaCpdAndCpfiCompliance({
    ethicsCpdHours: 3.5,
    technicalProductCpdHours: 9.0,
    regTechComplianceCpdHours: 3.0,
    existingPolicyPaidPremiumsHkd: 300000,
    existingPolicyCurrentCsvHkd: 180000,
    isReplacingExistingLifeOrMedical: true,
  });
  assert.equal(cpd.isCpdCompliant, true);
  assert.equal(cpd.cpfiSurrenderLossHkd, 120000);
});

test('Need-First Smart Plan Recommender handles unselected plan state across contexts & RBAC', () => {
  const lead = INITIAL_CLIENT_LEADS[0];
  const broker = INTERMEDIARY_PROFILES[IntermediaryRole.BROKER_TR];
  const tiedAia = INTERMEDIARY_PROFILES[IntermediaryRole.TIED_AGENT];

  const medRecs = recommendBestFitPlansForContext({
    plans: HK_MARKET_PLANS,
    lead,
    intermediary: broker,
    contextHint: 'MEDICAL_LOG',
    limit: 3,
  });
  assert.equal(medRecs.length, 3);
  assert.equal(new Set(medRecs.map((r) => r.plan.insurerCode)).size, 3);
  assert.ok(
    medRecs[0].plan.category === PlanCategory.VHIS ||
      medRecs[0].plan.category === PlanCategory.HIGH_END_MEDICAL
  );

  const taxRecs = recommendBestFitPlansForContext({
    plans: HK_MARKET_PLANS,
    lead,
    intermediary: broker,
    contextHint: 'TAX_TRIO',
    limit: 3,
  });
  assert.equal(taxRecs[0].plan.category, PlanCategory.QDAP);

  const tiedRecs = recommendBestFitPlansForContext({
    plans: HK_MARKET_PLANS,
    lead,
    intermediary: tiedAia,
    contextHint: 'PROTECTION_GAP',
    limit: 3,
  });
  assert.equal(tiedRecs[0].plan.insurerCode, 'AIA');
});

test('Section 03 Triple Clause Sub-Agents & 16-clause corpus + Section 09 Advisor ROI & 20 Improvements', () => {
  assert.ok(
    INITIAL_POLICY_PROVISIONS.length >= 16,
    `Expected >= 16 indexed HK policy clauses, got ${INITIAL_POLICY_PROVISIONS.length}`
  );

  const planA = HK_MARKET_PLANS.find((p) => p.id === 'PRU_VHIS_VIP') || HK_MARKET_PLANS[0];
  const planB = HK_MARKET_PLANS.find((p) => p.id === 'BOWTIE_PINK_VHIS') || HK_MARKET_PLANS[1];

  for (const lang of ['zh-HK', 'zh-CN', 'en'] as const) {
    const audit = runDeterministicClauseSubAgents({
      planA,
      planB,
      focusTopic: 'VHIS Unknown Pre-Existing & Ward Upgrade',
      language: lang,
      provisions: INITIAL_POLICY_PROVISIONS,
    });
    assert.equal(audit.actuarialAuditor.dimensions.length, 5);
    assert.equal(audit.claimsAdvocate.traps.length, 3);
    assert.equal(audit.clientPlainLanguageCoach.section03Upgrades.length, 4);
    assert.ok(audit.clientPlainLanguageCoach.whatsappBattlecardText.length > 40);
  }

  const roi = calculateAdvisorSubscriptionRoi({
    monthlySubscriptionHkd: 798,
    avgCaseAnnualPremiumHkd: 95000,
    avgFycCommissionRatePct: 35,
    extraPoliciesClosedPerQuarter: 1.5,
    adminHoursSavedPerWeek: 5,
    advisorHourlyValueHkd: 450,
    preventedClawbackPoliciesPerYear: 1,
  });
  assert.ok(roi.monthsCoveredBySingleExtraPolicy > 40);
  assert.ok(roi.roiMultiple > 20);
  assert.equal(ADVISOR_SAAS_TIERS.length, 3);
  assert.equal(TWENTY_APP_IMPROVEMENTS.length, 20);
});


