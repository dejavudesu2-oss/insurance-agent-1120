import assert from 'node:assert/strict';
import test from 'node:test';
import { HK_PRIVATE_HOSPITALS_LOG } from '../data/hkMarketIntelData';
import { HK_MARKET_PLANS, INTERMEDIARY_PROFILES } from '../data/hkMarketPlans';
import { INITIAL_CLIENT_LEADS } from '../data/initialLeads';
import {
  generateScannableQrMatrix,
  generateScannableQrPngDataUrl,
} from '../utils/qrCodeGenerator';
import {
  evaluateDynamicSchemeBenchmarks,
  evaluatePlanMatchedRiderQuotes,
} from './clientGapEngine';
import { resolveUnifiedDealCase } from './dealCaseEngine';
import { evaluateDealHospitalLogPass } from './hospitalLogMatcher';
import { buildMobilePosterDataModel, POSTER_THEME_PRESETS } from './mobilePosterEngine';
import { IntermediaryRole, PlanCategory } from './types';

test('mobilePosterEngine builds all 4 curated graphic themes, real scannable QR matrix, and plan-matched hospital LOG', async () => {
  assert.equal(Object.keys(POSTER_THEME_PRESETS).length, 4);
  assert.equal(POSTER_THEME_PRESETS.VICTORIA_MIDNIGHT.motifStyle, 'HARBOUR_SKYLINE');
  assert.equal(POSTER_THEME_PRESETS.ARCHIVAL_ALABASTER.motifStyle, 'MUSEUM_FRAME');
  assert.equal(POSTER_THEME_PRESETS.SWISS_GRID_COBALT.motifStyle, 'SWISS_GRID');
  assert.equal(POSTER_THEME_PRESETS.CANTON_JADE_HERITAGE.motifStyle, 'JADE_LATTICE');

  const lead = INITIAL_CLIENT_LEADS[0]; // Daniel Chan
  const vhisPlan = HK_MARKET_PLANS.find((p) => p.category === PlanCategory.VHIS)!;
  const unifiedDeal = resolveUnifiedDealCase({
    lead,
    allPlans: HK_MARKET_PLANS,
    explicitSelectedPlanId: vhisPlan.id,
  });

  const model = buildMobilePosterDataModel({
    unifiedDeal,
    intermediary: INTERMEDIARY_PROFILES[IntermediaryRole.BROKER_TR],
    hospitalId: 'HK-HOSP-01',
    anonymizeClient: false,
    proposalShareUrl: 'https://hkinsurehub.pro/?proposal=ms-test-123',
  });

  assert.equal(model.radarAxes.length, 6);
  assert.equal(model.hospitalPass.hospitalNameZh, '香港養和醫院');
  assert.equal(model.hospitalPass.matchSource, 'ANCHOR_MEDICAL_PLAN');
  assert.equal(model.hospitalPass.eligibleForCashlessLog, true);
  assert.equal(model.hospitalPass.logDepositHkd, 0);
  assert.ok(model.waterfall.netAfterTaxAnnualHkd > 0);
  assert.ok(model.waterfall.netAfterTaxAnnualRmb > 0);

  // Real ISO/IEC 18004 QR code matrix (>= 21x21 with 7x7 finder corners)
  assert.ok(model.qrMatrix.length >= 21);
  assert.equal(model.qrMatrix.length, model.qrMatrix[0].length);
  assert.equal(model.qrMatrix[0][0], true);
  assert.equal(model.qrMatrix[0][6], true);

  const pngDataUrl = await generateScannableQrPngDataUrl('https://hkinsurehub.pro/?proposal=ms-test-123');
  assert.ok(pngDataUrl.startsWith('data:image/png;base64,'));

  const anonModel = buildMobilePosterDataModel({
    unifiedDeal,
    intermediary: INTERMEDIARY_PROFILES[IntermediaryRole.BROKER_TR],
    hospitalId: 'HK-HOSP-02',
    anonymizeClient: true,
  });
  assert.ok(anonModel.clientDisplayNameZh.includes('貴賓'));
  assert.equal(anonModel.hospitalPass.hospitalNameZh, '港怡醫院');
});

test('evaluateDealHospitalLogPass enforces plan-first matching when anchor plan is non-medical without VHIS rider', () => {
  const savingsPlan = HK_MARKET_PLANS.find(
    (p) => p.category === PlanCategory.PARTICIPATING_SAVINGS && p.insurerCode === 'MANULIFE'
  )!;
  const hksh = HK_PRIVATE_HOSPITALS_LOG[0];

  const unmatchedEval = evaluateDealHospitalLogPass({
    anchorPlan: savingsPlan,
    selectedRiderIds: ['RIDER_PREMIUM_WAIVER'],
    hospital: hksh,
    clientAge: 36,
    isSmoker: false,
    allPlans: HK_MARKET_PLANS,
  });

  assert.equal(unmatchedEval.matchSource, 'UNMATCHED_NON_MEDICAL');
  assert.equal(unmatchedEval.eligibleForCashlessLog, false);
  assert.ok(unmatchedEval.logDepositHkd > 0);
  assert.ok(unmatchedEval.recommendedMedicalPlans.length > 0);
  // Prioritizes same insurer (MANULIFE) medical plan first when available
  assert.equal(unmatchedEval.recommendedMedicalPlans[0].plan.insurerCode, 'MANULIFE');

  const riderMatchedEval = evaluateDealHospitalLogPass({
    anchorPlan: savingsPlan,
    selectedRiderIds: ['RIDER_SEMI_PRIVATE_VHIS'],
    hospital: hksh,
    clientAge: 36,
    isSmoker: false,
    allPlans: HK_MARKET_PLANS,
  });
  assert.equal(riderMatchedEval.matchSource, 'VHIS_RIDER_ATTACHED');
  assert.equal(riderMatchedEval.eligibleForCashlessLog, true);
  assert.equal(riderMatchedEval.logDepositHkd, 0);
});

test('evaluateDynamicSchemeBenchmarks & evaluatePlanMatchedRiderQuotes scale with client age/smoker and match plans', () => {
  const daniel = INITIAL_CLIENT_LEADS[0]; // 36y non-smoker
  const danielBenchmarks = evaluateDynamicSchemeBenchmarks({
    lead: daniel,
    allPlans: HK_MARKET_PLANS,
  });
  assert.equal(danielBenchmarks.length, 4);
  assert.equal(danielBenchmarks[0].estimatedAnnualHkd, 13800);
  assert.equal(danielBenchmarks[2].estimatedAnnualHkd, 29500);
  assert.ok(danielBenchmarks[0].matchedRepresentativePlans.length >= 2);

  const olderSmokerBenchmarks = evaluateDynamicSchemeBenchmarks({
    lead: { ...daniel, age: 50, isSmoker: true },
    allPlans: HK_MARKET_PLANS,
  });
  assert.ok(olderSmokerBenchmarks[0].estimatedAnnualHkd > danielBenchmarks[0].estimatedAnnualHkd);

  const vhisPlan = HK_MARKET_PLANS.find((p) => p.category === PlanCategory.HIGH_END_MEDICAL)!;
  const deal = resolveUnifiedDealCase({
    lead: daniel,
    allPlans: HK_MARKET_PLANS,
    explicitSelectedPlanId: vhisPlan.id,
  });
  const riderQuotes = evaluatePlanMatchedRiderQuotes({
    lead: daniel,
    selectedPlan: vhisPlan,
    selectedRiderIds: deal.selectedRiderIds,
  });
  assert.equal(riderQuotes.length, 5);
  assert.equal(riderQuotes[0].planMatchStatus, 'BUILT_IN_MAIN_PLAN');

  const checkedSum = riderQuotes
    .filter((q) => q.checked)
    .reduce((acc, q) => acc + q.annualPremiumHkd, 0);
  assert.equal(checkedSum, deal.bundleSim.ridersAnnualHkd);

  const qr = generateScannableQrMatrix('https://hkinsurehub.pro/?proposal=demo');
  assert.ok(qr.length >= 21);
});
