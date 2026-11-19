import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdvisorFollowUpIcs,
  buildExistingPolicySummarySheet,
  buildProposalSharePayload,
  buildSampleExistingPolicies,
  computeFamilyPolicyOverview,
  evaluateInsurerPromos,
  estimateAdvisorFycAndMdrtProgress,
  HK_MDRT_FYC_TARGET_HKD,
} from './advisorToolkitSuiteEngine';
import { ClientLead, InsurancePlan, LeadStage, PlanCategory } from './types';

function makeTestLead(): ClientLead {
  return {
    id: 'lead-test-family',
    fullNameEn: 'Daniel Chan',
    fullNameZh: '陳冠宇',
    age: 36,
    plannedRetirementAge: 65,
    isSmoker: false,
    residency: 'HK_RESIDENT',
    whatsappPhone: '9123 4567',
    email: 'daniel@example.com',
    stage: LeadStage.PROPOSAL_SENT,
    notes: '',
    annualBudgetHkd: 48000,
    birthdayMonthDay: '11-28',
    existingPolicies: buildSampleExistingPolicies('2026-11-14T00:00:00Z'),
    householdMembers: [
      {
        id: 'mem-spouse',
        nameZh: '陳太太',
        nameEn: 'Mrs Chan',
        relation: 'SPOUSE',
        age: 34,
        isSmoker: false,
        vhisEligible: true,
        qdapEligible: true,
        annualPremiumHkd: 22000,
        policySummaryZh: '自願醫保半私家房 ＋ 延期年金',
      },
      {
        id: 'mem-child',
        nameZh: '陳小朋友',
        nameEn: 'Lucas Chan',
        relation: 'CHILD',
        age: 4,
        isSmoker: false,
        vhisEligible: true,
        qdapEligible: false,
        annualPremiumHkd: 9600,
        policySummaryZh: '兒童自願醫保標準／半私家計劃',
      },
    ],
    fnaRecord: null,
    kycCheck: {
      hkidVerified: true,
      hkidDocNumber: 'A123456(3)',
      mcvEntrySlipVerified: false,
    },
    lastContactIso: '2026-11-14T00:00:00Z',
  };
}

const SAMPLE_SAVINGS_PLAN: InsurancePlan = {
  id: 'plan-test-sav',
  insurerCode: 'AIA',
  insurerNameEn: 'AIA Hong Kong',
  insurerNameZh: '友邦香港',
  nameEn: 'Onward Multi-Currency Savings',
  nameZh: '盈御多元貨幣計劃',
  category: PlanCategory.PARTICIPATING_SAVINGS,
  categoryLabelEn: 'Savings',
  categoryLabelZh: '分紅儲蓄',
  currencies: ['USD', 'HKD', 'RMB'],
  fulfillmentRatio: 98,
  rawProjectedIrr: 0.062,
  guaranteedIrr: 0.012,
  baseRatePer1000UsdAge35Ns: 100,
  supportedPaymentTerms: [5, 10],
  taxDeductibleCapHkd: null,
  waitingPeriodText: 'N/A',
  keyHighlightsEn: [],
  keyHighlightsZh: [],
  submissionChannel: 'OPEN_API_INSTANT',
};

test('1. buildProposalSharePayload formats HK phone into wa.me/852 link and includes cooling-off & advisor license', () => {
  const payload = buildProposalSharePayload({
    clientNameZh: '陳冠宇',
    clientNameEn: 'Daniel Chan',
    planNameZh: '盈御多元貨幣計劃',
    planNameEn: 'Onward Multi-Currency Savings',
    insurerNameZh: '友邦香港',
    insurerCode: 'AIA',
    annualPremiumDisplay: 'HK$ 48,000 / 年',
    proposalUrl: 'https://hk-is-pro.web.app/?proposal=ms-123',
    advisorNameZh: '郭志明',
    advisorLicenseNo: 'FB1928',
    whatsappPhone: '9123 4567',
  });

  assert.ok(payload.whatsappWebHref.startsWith('https://wa.me/85291234567?text='));
  assert.ok(payload.textZh.includes('21 日冷靜期'));
  assert.ok(payload.textZh.includes('FB1928'));
  assert.equal(payload.url, 'https://hk-is-pro.web.app/?proposal=ms-123');
});

test('2. computeFamilyPolicyOverview calculates VHIS HK$8k x 3 members + Married QDAP HK$120k cap accurately', () => {
  const lead = makeTestLead();
  const res = computeFamilyPolicyOverview({
    lead,
    selfProposalAnnualHkd: 30000,
    marginalTaxRate: 0.17,
  });

  assert.equal(res.totalMembersCount, 3);
  assert.equal(res.vhisEligibleCount, 3);
  assert.equal(res.maxVhisDeductionCapHkd, 24000);
  assert.equal(res.qdapTaxpayerCount, 2);
  assert.equal(res.maxQdapJointDeductionCapHkd, 120000);
  assert.equal(res.totalEligibleDeductionCapHkd, 144000);
  // Self existing (0 + 14200 + 4600 = 18800) + self proposal (30000) + spouse (22000) + child (9600) = 80400
  assert.equal(res.totalFamilyAnnualPremiumHkd, 80400);
  assert.equal(res.estimatedTaxSavedAt17PctHkd, Math.round(80400 * 0.17));
  assert.ok(res.whatsappFamilySummaryZh.includes('HK$ 24,000'));
});

test('3. evaluateInsurerPromos computes live days remaining, sorts by soonest deadline, and filters high prepay', () => {
  const allActive = evaluateInsurerPromos({
    referenceDateIso: '2026-11-14',
    clientNameZh: '陳先生',
  });
  assert.equal(allActive.length, 6);
  // Prudential deadline 2026-11-20 -> 6 days left -> URGENT_7D and sorted first
  assert.equal(allActive[0].insurerCode, 'PRU');
  assert.equal(allActive[0].daysRemaining, 6);
  assert.equal(allActive[0].urgencyBadge, 'URGENT_7D');
  assert.ok(allActive[0].whatsappPromoAlertZh.includes('尚餘 6 日'));

  const highPrepay = evaluateInsurerPromos({
    referenceDateIso: '2026-11-14',
    filter: 'HIGH_PREPAY',
  });
  assert.ok(highPrepay.every((p) => (p.prepaidInterestPct || 0) >= 4.5));
});

test('4. estimateAdvisorFycAndMdrtProgress computes FYC & MDRT % in advisor mode and hides strictly in clientSafeMode', () => {
  const visible = estimateAdvisorFycAndMdrtProgress({
    clientSafeMode: false,
    activePlan: SAMPLE_SAVINGS_PLAN,
    activeAnnualPremium: 20000, // USD 20,000 = HKD 156,000
    currency: 'USD',
    paymentTermYears: 10, // 34% FYC -> HKD 53,040
    baselineYtdFycHkd: 510000,
  });

  assert.equal(visible.isVisible, true);
  assert.equal(visible.activeDealAnnualHkd, 156000);
  assert.equal(visible.fycRatePct, 34);
  assert.equal(visible.activeDealYear1FycHkd, 53040);
  assert.equal(visible.projectedTotalYtdFycHkd, 563040);
  assert.ok(visible.projectedTotalYtdFycHkd > HK_MDRT_FYC_TARGET_HKD);
  assert.equal(visible.shortfallToMdrtHkd, 0);
  assert.ok(visible.nextMilestoneLabelZh.includes('已達標 MDRT'));

  const hidden = estimateAdvisorFycAndMdrtProgress({
    clientSafeMode: true,
    activePlan: SAMPLE_SAVINGS_PLAN,
    activeAnnualPremium: 20000,
    currency: 'USD',
    paymentTermYears: 10,
  });
  assert.equal(hidden.isVisible, false);
  assert.equal(hidden.activeDealYear1FycHkd, 0);
});

test('5. buildAdvisorFollowUpIcs generates valid RFC 5545 VCALENDAR with 3 VEVENT blocks in ALL_BUNDLE mode', () => {
  const ics = buildAdvisorFollowUpIcs({
    kind: 'ALL_BUNDLE',
    clientNameZh: '陳冠宇',
    clientNameEn: 'Daniel Chan',
    policyNumber: 'HK-POL-77419',
    planNameZh: '家庭全方位保障',
    whatsappPhone: '91234567',
    issueDateIso: '2026-11-14',
    nextRenewalDateIso: '2027-11-14',
    birthdayMonthDay: '11-28',
  });

  assert.equal(ics.eventCount, 3);
  assert.ok(ics.fileName.endsWith('.ics'));
  assert.ok(ics.icsContent.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.icsContent.includes('SUMMARY:【21日冷靜期跟進】陳冠宇 (HK-POL-77419)'));
  assert.ok(ics.icsContent.includes('SUMMARY:【續保前30日提醒】陳冠宇 (HK-POL-77419)'));
  assert.ok(ics.icsContent.includes('SUMMARY:【客戶生日問候】陳冠宇 生日及轉保齡提示'));
  assert.ok(ics.icsContent.includes('RRULE:FREQ=YEARLY'));
  assert.ok(ics.icsContent.trimEnd().endsWith('END:VCALENDAR'));
});

test('6. buildExistingPolicySummarySheet aggregates policies across insurers and flags missing dimensions', () => {
  const lead = makeTestLead();
  const sheet = buildExistingPolicySummarySheet({
    lead,
    advisorNameZh: '郭志明',
    advisorLicenseNo: 'FB1928',
  });

  assert.equal(sheet.totalPoliciesCount, 3);
  assert.equal(sheet.totalAnnualPremiumHkd, 18800);
  assert.equal(sheet.totalCoverageByDimensionHkd.LIFE_MORTGAGE, 1500000);
  assert.equal(sheet.totalCoverageByDimensionHkd.CRITICAL_ILLNESS, 600000);
  assert.ok(sheet.missingDimensionsZh.includes('儲蓄／退休年金'));
  assert.ok(sheet.formattedWhatsappSummaryZh.includes('【陳冠宇 現有保單一覽表】'));
  assert.ok(sheet.printableTextReportZh.includes('Policy Summary Sheet'));
});
