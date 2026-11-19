import assert from 'node:assert/strict';
import test from 'node:test';
import { HK_MARKET_PLANS, INTERMEDIARY_PROFILES } from '../data/hkMarketPlans';
import { INITIAL_CLIENT_LEADS } from '../data/initialLeads';
import { resolveUnifiedDealCase } from './dealCaseEngine';
import {
  deriveProposalSummarySectionsForBoughtPlans,
  evaluateGuidedStepGate,
  filterClaimScenariosForBoughtPlans,
  partitionPlansByAgentCompany,
  resolveAgentCompanyCode,
} from './guidedWorkflowEngine';
import { IntermediaryRole, PlanCategory } from './types';

test('resolveAgentCompanyCode & partitionPlansByAgentCompany put agent company plans strictly FIRST, then others', () => {
  const tiedAia = INTERMEDIARY_PROFILES[IntermediaryRole.TIED_AGENT];
  assert.equal(resolveAgentCompanyCode(tiedAia), 'AIA');

  const wrapped = HK_MARKET_PLANS.map((plan) => ({ plan }));
  const partitioned = partitionPlansByAgentCompany(wrapped, 'AIA');

  assert.equal(partitioned.activeCompanyCode, 'AIA');
  assert.ok(partitioned.ownCompanyItems.length > 0, 'Should find AIA plans');
  assert.ok(partitioned.otherCompanyItems.length > 0, 'Should find other insurers as suggestions');
  assert.equal(
    partitioned.orderedItems.length,
    HK_MARKET_PLANS.length,
    'Should preserve total plan count'
  );
  // Every own-company item must precede every other-company item
  for (let i = 0; i < partitioned.ownCompanyItems.length; i++) {
    assert.equal(partitioned.orderedItems[i].plan.insurerCode, 'AIA');
  }
  assert.notEqual(
    partitioned.orderedItems[partitioned.ownCompanyItems.length].plan.insurerCode,
    'AIA'
  );

  // Preferred company override works for Brokers too
  const broker = INTERMEDIARY_PROFILES[IntermediaryRole.BROKER_TR];
  assert.equal(resolveAgentCompanyCode(broker), null);
  assert.equal(resolveAgentCompanyCode(broker, 'PRU'), 'PRU');
  const pruFirst = partitionPlansByAgentCompany(wrapped, 'PRU');
  assert.equal(pruFirst.orderedItems[0].plan.insurerCode, 'PRU');
});

test('evaluateGuidedStepGate strictly blocks Next Step until current step action is taken', () => {
  const lead = INITIAL_CLIENT_LEADS[0];
  const aiaPlan = HK_MARKET_PLANS.find((p) => p.insurerCode === 'AIA')!;

  // Step 1: blocked before clicking confirm, unlocked after confirm
  const s1Blocked = evaluateGuidedStepGate({
    activeSection: 'stage1',
    expressMeetingMode: false,
    activeLead: lead,
    anchorPlan: null,
    step1Confirmed: false,
    step3Confirmed: false,
    step4Confirmed: false,
    step5Signed: false,
  });
  assert.equal(s1Blocked.canAdvance, false);
  assert.equal(s1Blocked.nextSection, 'stage2');

  const s1Ready = evaluateGuidedStepGate({
    activeSection: 'stage1',
    expressMeetingMode: false,
    activeLead: lead,
    anchorPlan: null,
    step1Confirmed: true,
    step3Confirmed: false,
    step4Confirmed: false,
    step5Signed: false,
  });
  assert.equal(s1Ready.canAdvance, true);

  // Step 2: blocked when anchorPlan is null, unlocked only after exact plan selected
  const s2Blocked = evaluateGuidedStepGate({
    activeSection: 'stage2',
    expressMeetingMode: false,
    activeLead: lead,
    anchorPlan: null,
    step1Confirmed: true,
    step3Confirmed: false,
    step4Confirmed: false,
    step5Signed: false,
  });
  assert.equal(s2Blocked.canAdvance, false);

  const s2Ready = evaluateGuidedStepGate({
    activeSection: 'stage2',
    expressMeetingMode: false,
    activeLead: lead,
    anchorPlan: aiaPlan,
    step1Confirmed: true,
    step3Confirmed: false,
    step4Confirmed: false,
    step5Signed: false,
  });
  assert.equal(s2Ready.canAdvance, true);
  assert.equal(s2Ready.nextSection, 'stage3');

  // Step 3: requires exact plan AND step3Confirmed
  const s3Blocked = evaluateGuidedStepGate({
    activeSection: 'stage3',
    expressMeetingMode: false,
    activeLead: lead,
    anchorPlan: aiaPlan,
    step1Confirmed: true,
    step3Confirmed: false,
    step4Confirmed: false,
    step5Signed: false,
  });
  assert.equal(s3Blocked.canAdvance, false);

  const s3Ready = evaluateGuidedStepGate({
    activeSection: 'stage3',
    expressMeetingMode: false,
    activeLead: lead,
    anchorPlan: aiaPlan,
    step1Confirmed: true,
    step3Confirmed: true,
    step4Confirmed: false,
    step5Signed: false,
  });
  assert.equal(s3Ready.canAdvance, true);
  assert.equal(s3Ready.nextSection, 'stage4');
});

test('filterClaimScenariosForBoughtPlans hides matrix when no plan bought and filters strictly by bought product category', () => {
  const lead = INITIAL_CLIENT_LEADS[0];
  const dealNoPlan = resolveUnifiedDealCase({
    lead,
    allPlans: HK_MARKET_PLANS,
    explicitSelectedPlanId: '',
  });

  const locked = filterClaimScenariosForBoughtPlans({
    allScenarios: dealNoPlan.allScenariosComparison,
    anchorPlan: null,
  });
  assert.equal(locked.hasExactBoughtPlan, false);
  assert.equal(locked.relevantScenarios.length, 0);

  // VHIS medical plan -> ONLY hospital/cancer medical scenarios (not mortgage/breadwinner or accident)
  const vhisPlan = HK_MARKET_PLANS.find((p) => p.category === PlanCategory.VHIS)!;
  const vhisFiltered = filterClaimScenariosForBoughtPlans({
    allScenarios: dealNoPlan.allScenariosComparison,
    anchorPlan: vhisPlan,
    selectedRiderIds: [],
  });
  assert.equal(vhisFiltered.hasExactBoughtPlan, true);
  assert.deepEqual(vhisFiltered.relevantScenarioIds, [
    'HOSPITAL_MIN_INVASIVE',
    'CANCER_TARGETED_24M',
  ]);

  // Pure Participating Savings plan -> ONLY wealth/breadwinner reserve scenario
  const savingsPlan = HK_MARKET_PLANS.find(
    (p) => p.category === PlanCategory.PARTICIPATING_SAVINGS
  )!;
  const savingsFiltered = filterClaimScenariosForBoughtPlans({
    allScenarios: dealNoPlan.allScenariosComparison,
    anchorPlan: savingsPlan,
    selectedRiderIds: [],
  });
  assert.equal(savingsFiltered.hasExactBoughtPlan, true);
  assert.deepEqual(savingsFiltered.relevantScenarioIds, ['BREADWINNER_MORTGAGE']);

  // Combo: VHIS + Critical Illness -> medical + major CI recurrence (no breadwinner mortgage)
  const ciPlan = HK_MARKET_PLANS.find((p) => p.category === PlanCategory.CRITICAL_ILLNESS)!;
  const comboFiltered = filterClaimScenariosForBoughtPlans({
    allScenarios: dealNoPlan.allScenariosComparison,
    anchorPlan: vhisPlan,
    comboSecondaryPlans: [ciPlan],
    selectedRiderIds: [],
  });
  assert.ok(comboFiltered.relevantScenarioIds.includes('HOSPITAL_MIN_INVASIVE'));
  assert.ok(comboFiltered.relevantScenarioIds.includes('CANCER_TARGETED_24M'));
  assert.ok(comboFiltered.relevantScenarioIds.includes('MAJOR_CI_RECURRENCE'));
  assert.equal(comboFiltered.relevantScenarioIds.includes('BREADWINNER_MORTGAGE'), false);
});

test('deriveProposalSummarySectionsForBoughtPlans gates Stage 05 confirmation summary and tailors sections to exact bought plan', () => {
  // No plan bought -> hidden
  const empty = deriveProposalSummarySectionsForBoughtPlans({ anchorPlan: null });
  assert.equal(empty.hasExactBoughtPlan, false);
  assert.equal(empty.showGl28SurrenderTable, false);

  // VHIS Medical -> medical summary + tax deduction, NO GL28 savings surrender table!
  const vhisPlan = HK_MARKET_PLANS.find((p) => p.category === PlanCategory.VHIS)!;
  const vhisSummary = deriveProposalSummarySectionsForBoughtPlans({
    anchorPlan: vhisPlan,
  });
  assert.equal(vhisSummary.hasExactBoughtPlan, true);
  assert.equal(vhisSummary.showMedicalHospitalSummary, true);
  assert.equal(vhisSummary.showTaxDeductionSummary, true);
  assert.equal(vhisSummary.showGl28SurrenderTable, false);

  // Participating Savings -> GL28 surrender table shown, NO medical hospital summary!
  const savingsPlan = HK_MARKET_PLANS.find(
    (p) => p.category === PlanCategory.PARTICIPATING_SAVINGS
  )!;
  const savingsSummary = deriveProposalSummarySectionsForBoughtPlans({
    anchorPlan: savingsPlan,
  });
  assert.equal(savingsSummary.hasExactBoughtPlan, true);
  assert.equal(savingsSummary.showGl28SurrenderTable, true);
  assert.equal(savingsSummary.showMedicalHospitalSummary, false);

  // Pure Term Life -> Term schedule shown, NO GL28 surrender table!
  const termPlan = HK_MARKET_PLANS.find((p) => p.category === PlanCategory.TERM_LIFE)!;
  const termSummary = deriveProposalSummarySectionsForBoughtPlans({
    anchorPlan: termPlan,
  });
  assert.equal(termSummary.hasExactBoughtPlan, true);
  assert.equal(termSummary.showTermLifeSummary, true);
  assert.equal(termSummary.showGl28SurrenderTable, false);

  // General GI -> GI schedule shown, NO GL28 surrender table!
  const giPlan = HK_MARKET_PLANS.find((p) => p.category === PlanCategory.GENERAL_GI)!;
  const giSummary = deriveProposalSummarySectionsForBoughtPlans({
    anchorPlan: giPlan,
  });
  assert.equal(giSummary.hasExactBoughtPlan, true);
  assert.equal(giSummary.showGeneralGiSummary, true);
  assert.equal(giSummary.showGl28SurrenderTable, false);
});
