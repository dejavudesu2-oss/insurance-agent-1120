import test from 'node:test';
import assert from 'node:assert/strict';
import { HK_MARKET_PLANS } from '../data/hkMarketPlans';
import { INITIAL_CLIENT_LEADS } from '../data/initialLeads';
import { DEFAULT_LIVE_FX_FEED } from './proEnhancementsEngine';
import {
  buildDefaultFamilySplitBuckets,
  buildPlanMatchedClaimsChecklist,
  compareMultiCurrencyAndPaymentPerks,
  computeBirthdayBackdateRadar,
  evaluatePreUnderwritingAndMatchPlans,
  PRE_UW_CONDITION_PROFILES,
  simulateGroupToVhisDeductibleRelay,
  simulateSavingsPolicySplitTimeline,
} from './advisorSixPowerPackEngine';
import { PlanCategory } from './types';

test('Tool 1 (Pre-Underwriting) evaluates all 10 HK conditions and matches friendly plans across HK_MARKET_PLANS', () => {
  assert.equal(PRE_UW_CONDITION_PROFILES.length, 10);

  const lead = INITIAL_CLIENT_LEADS[1]; // Vanessa Lin
  const activePlan = HK_MARKET_PLANS.find((p) => p.id === 'AIA_CEO_VHIS')!;

  const res = evaluatePreUnderwritingAndMatchPlans({
    conditionCode: 'THYROID_NODULE',
    severity: 'MODERATE_MONITORED',
    lead,
    activePlan,
    allPlans: HK_MARKET_PLANS,
  });

  assert.equal(res.profile.code, 'THYROID_NODULE');
  assert.ok(res.profile.requiredReportsZh.length >= 2);
  assert.equal(res.activePlanAssessment.plan.id, 'AIA_CEO_VHIS');
  assert.ok(res.matchedFriendlyPlans.length >= 6);
  assert.ok(res.whatsappRequestScriptZh.includes(lead.fullNameZh));
});

test('Tool 2 (Birthday & 180-Day Backdate Radar) flags upcoming 45d and post-birthday 180d leads with exact savings', () => {
  const activePlan = HK_MARKET_PLANS.find((p) => p.id === 'AIA_OYS2_CI')!;

  const radar = computeBirthdayBackdateRadar({
    leads: INITIAL_CLIENT_LEADS,
    activePlan,
    allPlans: HK_MARKET_PLANS,
    sumAssuredHkd: 1500000,
    referenceDateIso: '2026-11-14',
  });

  assert.equal(radar.length, INITIAL_CLIENT_LEADS.length);

  // Henry Wang birthday 11-29 -> 15 days away -> UPCOMING_45D
  const henryRow = radar.find((r) => r.lead.id === 'lead-henry-wang')!;
  assert.equal(henryRow.windowStatus, 'UPCOMING_45D');
  assert.equal(henryRow.daysUntilNextBirthday, 15);
  assert.ok(henryRow.selectedPlanSaving.totalTermSavedHkd > 0);

  // Vanessa Lin birthday 09-18 -> 57 days elapsed -> BACKDATE_180D
  const vanessaRow = radar.find((r) => r.lead.id === 'lead-vanessa-lin')!;
  assert.equal(vanessaRow.windowStatus, 'BACKDATE_180D');
  assert.ok(vanessaRow.remainingBackdateDays > 100);
  assert.ok(vanessaRow.topMatchedPlans.length >= 4);
});

test('Tool 3 (Corporate Group + VHIS Deductible Seamless Relay) computes HK$0 out-of-pocket when group cap >= deductible', () => {
  const daniel = INITIAL_CLIENT_LEADS[0]; // Has HK$60,000 group medical

  const relay = simulateGroupToVhisDeductibleRelay({
    lead: daniel,
    allPlans: HK_MARKET_PLANS,
    scenarioId: 'HKSH_LAPAROSCOPIC_GALLBLADDER', // HK$148,000 bill
    employerGroupCapHkd: 60000,
    selectedDeductibleHkd: 50000,
  });

  assert.equal(relay.totalBillHkd, 148000);
  assert.equal(relay.groupMedicalPayoutHkd, 60000);
  assert.equal(relay.deductibleAbsorbedByGroupHkd, 50000);
  assert.equal(relay.personalVhisRelayPayoutHkd, 88000);
  assert.equal(relay.clientNetOutOfPocketHkd, 0);
  assert.equal(relay.isSeamlessZeroOutOfPocket, true);
  assert.ok(relay.matchedMedicalPlans.length >= 25);
  assert.ok(relay.matchedMedicalPlans[0].annualPremiumSavedHkd > 0);
});

test('Tool 4 (Savings Policy Split + Unlimited Change of Insured Timeline) projects 100% bucket allocation across 4 milestones', () => {
  const henry = INITIAL_CLIENT_LEADS[2]; // Has 2 children Leo & Chloe
  const buckets = buildDefaultFamilySplitBuckets(henry);
  assert.equal(buckets.length, 3);

  const sim = simulateSavingsPolicySplitTimeline({
    lead: henry,
    allPlans: HK_MARKET_PLANS,
    preferredPlanId: 'AIA_GLOBAL_POWER_INCOME_3',
    currency: 'USD',
    annualPremiumInput: 50000,
    paymentTermYears: 5,
    chosenSplitYear: 5,
    buckets,
  });

  assert.equal(sim.selectedPlan.category, PlanCategory.PARTICIPATING_SAVINGS);
  assert.equal(sim.earliestSplitYearAllowed, 3);
  assert.equal(sim.milestones.length, 4);
  assert.ok(sim.effectiveIllustratedIrrPct <= 6.5);

  const yr30 = sim.milestones[3];
  assert.equal(yr30.policyYear, 30);
  assert.ok(yr30.masterOrCombinedValue > sim.totalPrincipalPaid);
});

test('Tool 5 (Claims Checklist) and Tool 6 (Multi-FX & Payment Perks) adapt dynamically to any plan in HK_MARKET_PLANS', () => {
  const lead = INITIAL_CLIENT_LEADS[0];
  const manulifePlan = HK_MARKET_PLANS.find((p) => p.id === 'MANULIFE_MANUGLOBAL')!;

  const checklist = buildPlanMatchedClaimsChecklist({
    scenarioId: 'PRIVATE_INPATIENT_LOG',
    plan: manulifePlan,
    lead,
    advisorNameZh: '林顧問',
  });
  assert.ok(checklist.insurerChannelZh.includes('Manulife'));
  assert.ok(checklist.items.length >= 4);
  assert.ok(checklist.whatsappChecklistMessageZh.includes(lead.fullNameZh));

  const payment = compareMultiCurrencyAndPaymentPerks({
    plan: manulifePlan,
    lead,
    selectedCurrency: 'USD',
    annualPremiumHkdBasis: 150000,
    includeFiveYearPrepay: true,
    creditCardCashbackOrMilesPct: 1.5,
    fxFeed: DEFAULT_LIVE_FX_FEED,
  });

  assert.equal(payment.insurerFirstYearRebatePct, 20);
  assert.equal(payment.prepaidInterestRatePct, 4.8);
  assert.equal(payment.paymentChannels.length, 6);
  assert.ok(payment.bestChannel.netFirstYearEffectiveOutlayHkd < 150000);
});
