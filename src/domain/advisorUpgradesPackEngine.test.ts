import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_CLIENT_LEADS } from '../data/initialLeads';
import {
  HK_LEGACY_POLICY_PRESETS,
  buildAnnualPolicyReviewModel,
  buildLegacyVsUpgradeDiff,
  computeAgencyMdrtCoachingSummary,
  computeClientInteractivePreview,
  evaluateMicrositeReadIntentAlerts,
} from './advisorUpgradesPackEngine';

test('Suggestion #2: buildLegacyVsUpgradeDiff produces 6 structured rows, multiplier & WhatsApp script', () => {
  const preset = HK_LEGACY_POLICY_PRESETS[0];
  const report = buildLegacyVsUpgradeDiff({
    preset,
    lead: INITIAL_CLIENT_LEADS[0],
    deductibleHkd: 20000,
  });

  assert.equal(report.rows.length, 6);
  assert.ok(report.coverageMultiplier > 100);
  assert.ok(report.redGapCount >= 3);
  assert.ok(report.estimatedVhisTaxSavedHkd > 0);
  assert.ok(report.whatsappDiffScriptZh.includes(INITIAL_CLIENT_LEADS[0].fullNameZh));
  assert.equal(report.auditItemForRadar.dimensionId, 'PRIVATE_HOSPITAL');
});

test('Suggestion #3: computeClientInteractivePreview scales annual premium & Yr20/30 cash value properly', () => {
  const term5 = computeClientInteractivePreview({
    clientAge: 38,
    paymentTermYears: 5,
    sumAssuredUsd: 100000,
    vhisDeductibleHkd: 20000,
    withdrawalRatePct: 6,
  });
  const term10 = computeClientInteractivePreview({
    clientAge: 38,
    paymentTermYears: 10,
    sumAssuredUsd: 100000,
    vhisDeductibleHkd: 20000,
    withdrawalRatePct: 6,
  });

  assert.ok(term5.savingsAnnualPremiumHkd > term10.savingsAnnualPremiumHkd);
  assert.ok(term5.projectedCashValueYr30Hkd > term5.projectedCashValueYr20Hkd);
  assert.ok(term5.gapClosureAfterPct > term5.gapClosureBeforePct);
  assert.ok(term5.annualRetirementPayoutHkd > 0);
});

test('Suggestion #4: evaluateMicrositeReadIntentAlerts sorts by dwell time and flags HOT_CLOSING >= 45s', () => {
  const alerts = evaluateMicrositeReadIntentAlerts([
    {
      id: 's1',
      leadId: 'l1',
      clientNameZh: '陳大文',
      clientNameEn: 'Chan Tai Man',
      whatsappPhone: '+85291234567',
      planNameZh: '充裕未來',
      focusSection: 'HOSPITAL_LOG',
      dwellSeconds: 18,
      deviceLabel: 'iPhone 16 Pro',
      openedAtIso: '2026-11-14T08:00:00Z',
    },
    {
      id: 's2',
      leadId: 'l2',
      clientNameZh: '林太',
      clientNameEn: 'Mrs Lam',
      whatsappPhone: '+85298887777',
      planNameZh: '雋陞傳承',
      focusSection: 'DIVIDEND_STRESS_85',
      dwellSeconds: 68,
      deviceLabel: 'iPad Air',
      openedAtIso: '2026-11-14T09:00:00Z',
    },
  ]);

  assert.equal(alerts[0].id, 's2');
  assert.equal(alerts[0].heatTier, 'HOT_CLOSING');
  assert.ok(alerts[0].whatsappScriptZh.includes('85%'));
  assert.equal(alerts[1].heatTier, 'GLANCE');
});

test('Suggestion #5: buildAnnualPolicyReviewModel incorporates life events and GN16 ratio', () => {
  const model = buildAnnualPolicyReviewModel({
    lead: INITIAL_CLIENT_LEADS[0],
    policy: {
      id: 'pol-1',
      policyId: 'AIA-778899',
      leadId: INITIAL_CLIENT_LEADS[0].id,
      clientNameZh: INITIAL_CLIENT_LEADS[0].fullNameZh,
      clientNameEn: INITIAL_CLIENT_LEADS[0].fullNameEn,
      insurerCode: 'AIA',
      planNameZh: '充裕未來·盈尚',
      planNameEn: 'Abundant Future',
      currency: 'USD',
      annualPremium: 12000,
      nextDueDateIso: '2026-12-15',
      graceEndsIso: '2027-01-14',
      status: 'DUE_SOON',
      fxRateLocked: true,
      splitEligible: true,
    },
    lifeEvents: ['NEWBORN', 'MORTGAGE'],
    gn16FulfillmentPct: 101,
    medicalInflationPct: 7,
  });

  assert.ok(model.newProtectionGapHkd >= 5700000);
  assert.ok(model.actionRecommendationsZh.length >= 3);
  assert.ok(model.whatsappInviteZh.includes('AIA-778899'));
});

test('Suggestion #6: computeAgencyMdrtCoachingSummary builds 5-member roster with MDRT progress', () => {
  const summary = computeAgencyMdrtCoachingSummary({
    activeAdvisorNameZh: '王志明',
    activeAdvisorNameEn: 'Alex Wong',
    activeAdvisorLicense: 'IA-TR-88291',
    leads: INITIAL_CLIENT_LEADS,
    applications: [],
    micrositeReceiptsCount: 2,
  });

  assert.equal(summary.advisors.length, 5);
  assert.ok(summary.teamTotalFycHkd > 2000000);
  assert.ok(summary.advisors.some((a) => a.trackStatus === 'COACHING_PRIORITY'));
  assert.ok(summary.advisors.some((a) => a.trackStatus === 'COT_TOT_TRACK'));
});
