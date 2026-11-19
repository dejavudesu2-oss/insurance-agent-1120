import test from 'node:test';
import assert from 'node:assert/strict';
import { HK_MARKET_PLANS, INTERMEDIARY_PROFILES } from '../data/hkMarketPlans';
import { INITIAL_CLIENT_LEADS } from '../data/initialLeads';
import { IntermediaryRole } from './types';
import {
  buildPersonalizedObjectionScripts,
  calculateDualCurrencyBundleSimulation,
  convertHkdToRmb,
  createDefaultMorningBriefingDeck,
  evaluateSixDimensionGapAudit,
  getDefaultRidersForScheme,
} from './clientGapEngine';

test('convertHkdToRmb uses 0.92 HKD->RMB rate accurately', () => {
  assert.equal(convertHkdToRmb(48000), 44160);
  assert.equal(convertHkdToRmb(13800), 12696);
  assert.equal(convertHkdToRmb(29500), 27140);
});

test('evaluateSixDimensionGapAudit computes Daniel Chan baseline and recalculates dynamically when adding existing policies', () => {
  const daniel = INITIAL_CLIENT_LEADS[0];
  const emptyBaselineAudit = evaluateSixDimensionGapAudit(
    { ...daniel, existingPolicies: [] },
    'FAMILY_COMPREHENSIVE'
  );
  assert.equal(emptyBaselineAudit.loggedPoliciesCount, 0);

  const baseAudit = evaluateSixDimensionGapAudit(daniel, 'FAMILY_COMPREHENSIVE');
  assert.equal(baseAudit.loggedPoliciesCount, 1);
  assert.equal(baseAudit.rows.length, 6);

  const lifeRow = baseAudit.rows.find((r) => r.dimensionId === 'LIFE_MORTGAGE')!;
  const hospRow = baseAudit.rows.find((r) => r.dimensionId === 'PRIVATE_HOSPITAL')!;
  const cancerRow = baseAudit.rows.find((r) => r.dimensionId === 'CANCER_TARGETED')!;
  const accRow = baseAudit.rows.find((r) => r.dimensionId === 'ACCIDENT_INCOME')!;

  assert.equal(lifeRow.recommendedTargetHkd, 4500000);
  assert.equal(lifeRow.isFullyCovered, true);
  assert.equal(hospRow.recommendedTargetHkd, 450000);
  assert.equal(hospRow.isFullyCovered, true);
  assert.equal(cancerRow.remainingGapHkd, 80000);
  assert.equal(cancerRow.remainingGapRmb, 73600);
  assert.equal(accRow.remainingGapHkd, 1000000);
  assert.equal(accRow.remainingGapRmb, 920000);

  // Add an existing accident/disability policy -> gap should close to 0
  const updatedDaniel = {
    ...daniel,
    existingPolicies: [
      ...(daniel.existingPolicies || []),
      {
        id: 'pol-acc-1',
        policyName: 'Company Group Accident',
        dimensionId: 'ACCIDENT_INCOME' as const,
        coverageAmountHkd: 1200000,
        annualPremiumHkd: 0,
        addedAtIso: '2026-11-13T00:00:00Z',
      },
    ],
  };
  const updatedAudit = evaluateSixDimensionGapAudit(updatedDaniel, 'FAMILY_COMPREHENSIVE');
  const updatedAccRow = updatedAudit.rows.find((r) => r.dimensionId === 'ACCIDENT_INCOME')!;
  assert.equal(updatedAudit.loggedPoliciesCount, 2);
  assert.equal(updatedAccRow.existingCoverHkd, 1200000);
  assert.equal(updatedAccRow.remainingGapHkd, 0);
  assert.equal(updatedAccRow.isFullyCovered, true);
});

test('calculateDualCurrencyBundleSimulation calculates HKD/RMB premiums, rider discounts & claim shortfall reduction', () => {
  const daniel = INITIAL_CLIENT_LEADS[0];
  const simNoRiders = calculateDualCurrencyBundleSimulation({
    lead: daniel,
    selectedRiderIds: [],
    paymentMode: 'ANNUAL',
    paymentTermYears: 10,
    scenarioId: 'HOSPITAL_MIN_INVASIVE',
  });
  const simWithBundle = calculateDualCurrencyBundleSimulation({
    lead: daniel,
    selectedRiderIds: getDefaultRidersForScheme('FAMILY_COMPREHENSIVE'),
    paymentMode: 'ANNUAL',
    paymentTermYears: 10,
    scenarioId: 'HOSPITAL_MIN_INVASIVE',
  });

  assert.equal(simNoRiders.bundleDiscountPct, 0);
  assert.equal(simWithBundle.bundleDiscountPct, 12);
  assert.ok(simWithBundle.netAnnualPremiumRmb < simWithBundle.netAnnualPremiumHkd);
  assert.equal(simWithBundle.scenarioOutcome.clientOutOfPocketHkd, 0);
});

test('Personalized objection scripts & editable morning presentation deck track active client context', () => {
  const henry = INITIAL_CLIENT_LEADS[2]; // MCV client
  const broker = INTERMEDIARY_PROFILES[IntermediaryRole.BROKER_TR];
  const plan = HK_MARKET_PLANS[0];

  const scripts = buildPersonalizedObjectionScripts({
    lead: henry,
    intermediary: broker,
    plan,
  });
  assert.equal(scripts.length, 4);
  assert.ok(scripts.some((s) => s.advisorScriptZh.includes(henry.fullNameZh)));
  assert.ok(scripts.some((s) => s.categoryZh.includes('大灣區')));

  const deck = createDefaultMorningBriefingDeck({
    lead: henry,
    intermediary: broker,
    plan,
  });
  assert.equal(deck.length, 5);
  assert.ok(deck[0].titleZh.includes(henry.fullNameZh));
});
