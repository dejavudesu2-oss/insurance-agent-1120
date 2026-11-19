import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_CLIENT_LEADS } from '../data/initialLeads';
import { HK_MARKET_PLANS, INTERMEDIARY_PROFILES } from '../data/hkMarketPlans';
import {
  calculateCompliantQuote,
  evaluateHkiaCompliance,
} from './actuarialEngine';
import {
  buildHkiaAuditDossierModel,
  buildPremiumFinancingSensitivityMatrix,
  buildThreeGenBeneficiaryTree,
  collectLeadPolicyIds,
  evaluateHkiaCpdCompliance,
  evaluateInForceRenewalSummary,
  extractStructuredMeetingNotesDeterministically,
  filterCrmLeadsByQuery,
  formatCrmLastContactLabel,
  INITIAL_CPD_ENTRIES,
  INITIAL_IN_FORCE_POLICIES,
  simulatePartialWithdrawalPlan,
  sortCrmLeads,
} from './lifecycleAndComplianceEngine';
import { IntermediaryRole, LeadStage, PolicyApplicationRecord } from './types';

test('CRM search bar filters leads accurately by English name, Chinese name, and Policy ID', () => {
  const sampleApps: PolicyApplicationRecord[] = [
    {
      id: 'app-1',
      referenceNo: 'STP-2026-99012',
      leadId: 'lead-vanessa-lin',
      clientNameEn: 'Vanessa Lin Ya Ting',
      clientNameZh: '林雅婷',
      whatsappPhone: '+852 6987 6543',
      planId: HK_MARKET_PLANS[0].id,
      insurerCode: 'AIA',
      planNameEn: 'Sample Plan',
      planNameZh: '測試計劃',
      currency: 'HKD',
      sumAssured: 500000,
      paymentTermYears: 10,
      annualPremium: 24000,
      effectiveIrrPercent: 5.5,
      intermediaryLicenseNo: 'FB1928',
      signatureDataUrl: 'data:image/png;base64,iVBOR',
      status: 'INSTANT_ISSUED',
      submissionChannel: 'OPEN_API_INSTANT',
      createdAtIso: '2026-11-12T10:00:00Z',
    },
  ];

  // 1. Collect Policy IDs for Vanessa (In-force + STP ref + Existing policyNumber)
  const vanessa = INITIAL_CLIENT_LEADS.find((l) => l.id === 'lead-vanessa-lin')!;
  const vanessaIds = collectLeadPolicyIds(vanessa, sampleApps, INITIAL_IN_FORCE_POLICIES);
  assert.ok(vanessaIds.includes('HK-POL-2025-33910'));
  assert.ok(vanessaIds.includes('STP-2026-99012'));
  assert.ok(vanessaIds.includes('GRP-CIGNA-3509'));

  // 2. Search by In-Force Policy ID -> returns only Daniel Chan
  const byInForceId = filterCrmLeadsByQuery({
    leads: INITIAL_CLIENT_LEADS,
    query: 'HK-POL-2024-88102',
    applications: sampleApps,
    inForcePolicies: INITIAL_IN_FORCE_POLICIES,
  });
  assert.equal(byInForceId.length, 1);
  assert.equal(byInForceId[0].id, 'lead-daniel-chan');

  // 3. Search by STP Application Reference ID -> returns only Vanessa Lin
  const byStpRef = filterCrmLeadsByQuery({
    leads: INITIAL_CLIENT_LEADS,
    query: 'stp-2026-99012',
    applications: sampleApps,
    inForcePolicies: INITIAL_IN_FORCE_POLICIES,
  });
  assert.equal(byStpRef.length, 1);
  assert.equal(byStpRef[0].id, 'lead-vanessa-lin');

  // 4. Search by Existing Policy Number -> returns Henry Wang
  const byExistingPolNo = filterCrmLeadsByQuery({
    leads: INITIAL_CLIENT_LEADS,
    query: 'CN-PA-992041',
    applications: sampleApps,
    inForcePolicies: INITIAL_IN_FORCE_POLICIES,
  });
  assert.equal(byExistingPolNo.length, 1);
  assert.equal(byExistingPolNo[0].id, 'lead-henry-wang');

  // 5. Search by Simplified Chinese name "陈冠宇" -> matches Traditional "陳冠宇 Daniel"
  const bySimplifiedName = filterCrmLeadsByQuery({
    leads: INITIAL_CLIENT_LEADS,
    query: '陈冠宇',
    applications: sampleApps,
    inForcePolicies: INITIAL_IN_FORCE_POLICIES,
  });
  assert.equal(bySimplifiedName.length, 1);
  assert.equal(bySimplifiedName[0].id, 'lead-daniel-chan');

  // 6. Combined Stage Filter + Name Search
  const stageMismatch = filterCrmLeadsByQuery({
    leads: INITIAL_CLIENT_LEADS,
    query: 'Daniel',
    stageFilter: LeadStage.UNDERWRITING,
    applications: sampleApps,
    inForcePolicies: INITIAL_IN_FORCE_POLICIES,
  });
  assert.equal(stageMismatch.length, 0);
});

test('567 Partial Withdrawal Simulator computes cumulative cash stream and preserves HKIA IRR cap', () => {
  const sim = simulatePartialWithdrawalPlan({
    clientAge: 40,
    currency: 'USD',
    annualPremium: 50000,
    paymentTermYears: 5,
    startWithdrawalYear: 6,
    annualWithdrawalPct: 7, // "567": 5-pay, start Yr 6, withdraw 7% of 250k = USD 17,500/yr
    effectiveIrrPct: 7.2, // Should clamp to HKIA 6.5% cap for USD
  });

  assert.equal(sim.totalPremiumsPaid, 250000);
  assert.equal(sim.annualWithdrawalAmount, 17500);
  assert.equal(sim.effectiveIllustratedIrrPct, 6.5);
  assert.ok(sim.cumulativeWithdrawnByAge85 > 500000);
  assert.ok(sim.allRows.length >= 60);
});

test('2D Premium Financing HIBOR Sensitivity Matrix flags positive carry and margin-call cells', () => {
  const matrix = buildPremiumFinancingSensitivityMatrix({
    totalSinglePremiumUsd: 1000000,
    ltvPct: 80,
    holdingYears: 10,
    day1CsvRatioPct: 82,
  });

  assert.equal(matrix.bankLoanUsd, 800000);
  assert.equal(matrix.clientEquityUsd, 200000);
  assert.equal(matrix.rows.length, 5);
  assert.equal(matrix.rows[0].length, 5);

  // Lowest funding (2.75%) + highest crediting (6.3%) must be positive carry
  const bestCell = matrix.rows[0][4];
  assert.equal(bestCell.isPositiveCarry, true);
  assert.ok(bestCell.netAnnualizedRoePct > 6);

  // Highest funding (5.75%) + lowest crediting (3.8%) at 80% LTV triggers negative spread & margin warning
  const worstCell = matrix.rows[4][0];
  assert.equal(worstCell.isPositiveCarry, false);
  assert.equal(worstCell.marginCallWarning, true);
});

test('3-Generation Beneficiary Tree validates 100% split and policy-split summary', () => {
  const henry = INITIAL_CLIENT_LEADS.find((l) => l.id === 'lead-henry-wang')!;
  const tree = buildThreeGenBeneficiaryTree(henry, HK_MARKET_PLANS[0]);
  assert.equal(tree.totalAllocationPct, 100);
  assert.equal(tree.isAllocationBalanced, true);
  assert.equal(tree.gen3Beneficiaries.length, 3);
  assert.ok(tree.policySplitSummaryZh.includes('分拆'));
});

test('Voice/Transcript extractor parses budget, medical concerns, and follow-up task', () => {
  const daniel = INITIAL_CLIENT_LEADS[0];
  const parsed = extractStructuredMeetingNotesDeterministically(
    '今日同陳生傾過，預算大約 5.5 萬一年，最擔心養和半私家房微創手術唔夠賠，下週補交驗身超聲波報告。',
    daniel,
    '2026-11-14'
  );
  assert.equal(parsed.detectedAnnualBudgetHkd, 55000);
  assert.ok(parsed.detectedConcerns.length >= 2);
  assert.equal(parsed.suggestedFollowUpDueDateIso, '2026-11-17');
  assert.ok(parsed.suggestedFollowUpTitleZh.includes('超聲波報告'));
});

test('In-Force Renewal Summary, HKIA 15h CPD Compliance, and Audit Dossier work deterministically', () => {
  const renewal = evaluateInForceRenewalSummary(INITIAL_IN_FORCE_POLICIES);
  assert.equal(renewal.totalInForceCount, 3);
  assert.equal(renewal.gracePeriodCount, 1);
  assert.equal(renewal.dueSoonCount, 1);

  // Seed CPD has 12 hours (7h Ethics, 5h Technical) -> needs 3 more total hours, 0 more ethics hours
  const initialCpd = evaluateHkiaCpdCompliance(INITIAL_CPD_ENTRIES);
  assert.equal(initialCpd.completedTotalHours, 12);
  assert.equal(initialCpd.completedEthicsHours, 7);
  assert.equal(initialCpd.remainingTotalHours, 3);
  assert.equal(initialCpd.remainingEthicsHours, 0);
  assert.equal(initialCpd.isFullyCompliant, false);

  const fullCpd = evaluateHkiaCpdCompliance([
    ...INITIAL_CPD_ENTRIES,
    {
      id: 'cpd-4',
      titleZh: '保費融資 HIBOR 壓力測試專題',
      titleEn: 'Premium Financing HIBOR Stress Testing',
      provider: 'IFPHK',
      hours: 3,
      category: 'TECHNICAL_ACTUARIAL',
      completedDateIso: '2026-11-10',
      certificateRef: 'HKIA-CPD-2026-8890T',
    },
  ]);
  assert.equal(fullCpd.isFullyCompliant, true);
  assert.equal(fullCpd.completionPct, 100);

  const daniel = INITIAL_CLIENT_LEADS[0];
  const broker = INTERMEDIARY_PROFILES[IntermediaryRole.BROKER_TR];
  const plan = HK_MARKET_PLANS[0];
  const quote = calculateCompliantQuote({
    plan,
    age: daniel.age,
    isSmoker: daniel.isSmoker,
    currency: plan.currencies.includes('HKD') ? 'HKD' : plan.currencies[0],
    sumAssuredInSelectedCurrency: 320000,
    paymentTermYears: plan.supportedPaymentTerms[0] || 10,
  });
  const comp = evaluateHkiaCompliance({
    intermediary: broker,
    lead: daniel,
    plan,
    quote,
  });
  const dossier = buildHkiaAuditDossierModel({
    lead: daniel,
    intermediary: broker,
    anchorPlan: plan,
    annualPremiumHkd: 32000,
    compliance: comp,
    applications: [],
    inForcePolicies: INITIAL_IN_FORCE_POLICIES,
    whatsappAuditLogs: [],
  });
  assert.ok(dossier.policyIds.includes('HK-POL-2024-88102'));
  assert.ok(dossier.complianceVerdictLine.startsWith('PASS'));
});

test('CRM sorting organizes client leads accurately by Stage and Last Contacted date', () => {
  // Seed order: Daniel (FNA_COMPLETED, 2026-11-12T09:30), Vanessa (PROPOSAL_SENT, 2026-11-11T18:05), Henry (UNDERWRITING, 2026-11-11T15:10)
  const byRecentContact = sortCrmLeads(INITIAL_CLIENT_LEADS, 'LAST_CONTACT_DESC');
  assert.deepEqual(
    byRecentContact.map((l) => l.id),
    ['lead-daniel-chan', 'lead-vanessa-lin', 'lead-henry-wang']
  );

  const byOldestContact = sortCrmLeads(INITIAL_CLIENT_LEADS, 'LAST_CONTACT_ASC');
  assert.deepEqual(
    byOldestContact.map((l) => l.id),
    ['lead-henry-wang', 'lead-vanessa-lin', 'lead-daniel-chan']
  );

  const byStageClosingFirst = sortCrmLeads(INITIAL_CLIENT_LEADS, 'STAGE_DESC');
  assert.deepEqual(
    byStageClosingFirst.map((l) => l.stage),
    [LeadStage.UNDERWRITING, LeadStage.PROPOSAL_SENT, LeadStage.FNA_COMPLETED]
  );

  const byStageEarlyFirst = sortCrmLeads(INITIAL_CLIENT_LEADS, 'STAGE_ASC');
  assert.deepEqual(
    byStageEarlyFirst.map((l) => l.stage),
    [LeadStage.FNA_COMPLETED, LeadStage.PROPOSAL_SENT, LeadStage.UNDERWRITING]
  );

  assert.equal(formatCrmLastContactLabel('2026-11-12T09:30:00Z'), '2026-11-12 09:30');
});

