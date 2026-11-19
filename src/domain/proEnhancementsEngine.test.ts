import assert from 'node:assert/strict';
import test from 'node:test';
import { HK_MARKET_PLANS } from '../data/hkMarketPlans';
import { INITIAL_CLIENT_LEADS } from '../data/initialLeads';
import {
  buildFormattedMessengerPitch,
  buildLifelongProjectionCurve,
  evaluateGl30AffordabilityGauge,
  evaluateHouseholdSummary,
  evaluateMcvCrossBorderReadiness,
  evaluatePortfolioCombo,
  evaluateQuickHealthTriage,
  parseDeterministicLegacyPolicyText,
  projectInflatedMedicalCost,
  resolveSpecialOfferWithAdminOverride,
  searchGlobalCommandPalette,
  STP_STATUTORY_DOCUMENTS_EXPLAINER,
  toggleComboSecondaryPlan,
} from './proEnhancementsEngine';
import { PlanCategory } from './types';

test('Command Palette searches stages, clients, 237 plans, and tools cleanly', () => {
  const results = searchGlobalCommandPalette({
    query: 'Daniel',
    leads: INITIAL_CLIENT_LEADS,
    plans: HK_MARKET_PLANS,
  });
  assert.ok(results.some((r) => r.kind === 'CLIENT' && r.titleEn.includes('Daniel')));

  const planResults = searchGlobalCommandPalette({
    query: 'MANULIFE',
    leads: INITIAL_CLIENT_LEADS,
    plans: HK_MARKET_PLANS,
  });
  assert.ok(planResults.some((r) => r.kind === 'PLAN' && r.badge === 'MANULIFE'));
});

test('Multi-Plan Portfolio Combo Builder caps at 2 secondary plans and applies multi-policy discount', () => {
  const anchor = HK_MARKET_PLANS.find((p) => p.category === PlanCategory.PARTICIPATING_SAVINGS)!;
  const vhis = HK_MARKET_PLANS.find((p) => p.category === PlanCategory.VHIS)!;
  const ci = HK_MARKET_PLANS.find((p) => p.category === PlanCategory.CRITICAL_ILLNESS)!;
  const term = HK_MARKET_PLANS.find((p) => p.category === PlanCategory.TERM_LIFE)!;

  let comboIds: string[] = [];
  comboIds = toggleComboSecondaryPlan(comboIds, anchor.id, vhis.id);
  comboIds = toggleComboSecondaryPlan(comboIds, anchor.id, ci.id);
  comboIds = toggleComboSecondaryPlan(comboIds, anchor.id, term.id);
  assert.equal(comboIds.length, 2);
  assert.ok(!comboIds.includes(anchor.id));

  const valuation = evaluatePortfolioCombo({
    lead: INITIAL_CLIENT_LEADS[0],
    anchorPlan: anchor,
    comboPlanIds: comboIds,
    allPlans: HK_MARKET_PLANS,
    paymentTermYears: 10,
    fxRateHkdToRmb: 0.92,
  });
  assert.equal(valuation.secondaryItems.length, 2);
  assert.equal(valuation.multiPolicyDiscountPct, 5);
  assert.ok(valuation.comboNetSecondaryHkd < valuation.comboGrossSecondaryHkd);
});

test('Whole-Family Household View aggregates VHIS HK$8,000/person and Married QDAP HK$120,000 caps', () => {
  const leadWithFamily = {
    ...INITIAL_CLIENT_LEADS[0],
    householdMembers: [
      {
        id: 'm1',
        nameZh: '陳太太',
        nameEn: 'Mrs Chan',
        relation: 'SPOUSE' as const,
        age: 34,
        isSmoker: false,
        vhisEligible: true,
        qdapEligible: true,
      },
      {
        id: 'm2',
        nameZh: '陳小寶',
        nameEn: 'Baby Chan',
        relation: 'CHILD' as const,
        age: 4,
        isSmoker: false,
        vhisEligible: true,
        qdapEligible: false,
      },
    ],
  };
  const summary = evaluateHouseholdSummary(leadWithFamily);
  assert.equal(summary.totalInsuredLives, 3);
  assert.equal(summary.vhisEligibleCount, 3);
  assert.equal(summary.combinedVhisDeductionCapHkd, 24_000);
  assert.equal(summary.combinedQdapDeductionCapHkd, 120_000);
  assert.equal(summary.maxAnnualIrdTaxSavedAt17PctHkd, Math.round(144_000 * 0.17));
});

test('Lifelong Age-to-100 Cash-Value & IRR Curve projects through Age 100 and responds to dividend stress', () => {
  const parPlan = HK_MARKET_PLANS.find((p) => p.category === PlanCategory.PARTICIPATING_SAVINGS)!;
  const curve100 = buildLifelongProjectionCurve({
    plan: parPlan,
    age: 36,
    isSmoker: false,
    currency: 'USD',
    sumAssuredInSelectedCurrency: 100_000,
    paymentTermYears: 5,
    dividendRealizationPct: 100,
  });
  const curve75 = buildLifelongProjectionCurve({
    plan: parPlan,
    age: 36,
    isSmoker: false,
    currency: 'USD',
    sumAssuredInSelectedCurrency: 100_000,
    paymentTermYears: 5,
    dividendRealizationPct: 75,
  });

  assert.equal(curve100.hasCashValue, true);
  assert.equal(curve100.points[curve100.points.length - 1].clientAge, 100);
  assert.ok(curve100.age100Value > curve75.age100Value);
  // Guaranteed cash value at Age 100 remains identical under non-guaranteed dividend stress
  assert.equal(
    curve100.points[curve100.points.length - 1].guaranteedCashValue,
    curve75.points[curve75.points.length - 1].guaranteedCashValue
  );
});

test('Medical Inflation Escalator compounds HK private hospital bills accurately over 15 years', () => {
  const today = projectInflatedMedicalCost({
    baseCostTodayHkd: 320_000,
    existingPayoutHkd: 60_000,
    newBundlePayoutHkd: 300_000,
    inflationRatePct: 0,
    horizonYears: 15,
  });
  assert.equal(today.projectedFutureBillHkd, 320_000);
  assert.equal(today.projectedOutOfPocketHkd, 0);

  const inflated7Pct = projectInflatedMedicalCost({
    baseCostTodayHkd: 320_000,
    existingPayoutHkd: 60_000,
    newBundlePayoutHkd: 300_000,
    inflationRatePct: 7,
    horizonYears: 15,
  });
  assert.ok(inflated7Pct.projectedFutureBillHkd > 850_000);
  assert.ok(inflated7Pct.projectedOutOfPocketHkd > 490_000);
});

test('GL30 Affordability Gauge, Health Triage, MCV Checklist, Promo Expiry & OCR Policy Parser behave deterministically', () => {
  const lead = INITIAL_CLIENT_LEADS[0];
  const greenGauge = evaluateGl30AffordabilityGauge(lead, 42_000);
  assert.equal(greenGauge.status, 'GREEN_COMFORTABLE');

  const redGauge = evaluateGl30AffordabilityGauge(lead, 480_000);
  assert.equal(redGauge.status, 'RED_UNAFFORDABLE');

  const thyroidVhis = evaluateQuickHealthTriage('THYROID_NODULE', PlanCategory.VHIS);
  assert.equal(thyroidVhis.verdictCode, 'ORGAN_EXCLUSION');
  assert.equal(thyroidVhis.instantIssueAllowed, false);

  const thyroidSavings = evaluateQuickHealthTriage('THYROID_NODULE', PlanCategory.PARTICIPATING_SAVINGS);
  assert.equal(thyroidSavings.verdictCode, 'STANDARD_ISSUE');
  assert.equal(thyroidSavings.instantIssueAllowed, true);

  const mcvLead = INITIAL_CLIENT_LEADS.find((l) => l.residency === 'MCV') || {
    ...lead,
    residency: 'MCV' as const,
  };
  const mcvState = evaluateMcvCrossBorderReadiness(mcvLead);
  assert.equal(mcvState.applicable, true);
  assert.equal(mcvState.totalCount, 4);

  const promoPlan = HK_MARKET_PLANS.find((p) => p.id === 'MANULIFE_MANUGLOBAL')!;
  const activePromo = resolveSpecialOfferWithAdminOverride(promoPlan, {});
  assert.ok(activePromo !== null);
  const expiredPromo = resolveSpecialOfferWithAdminOverride(promoPlan, {
    MANULIFE: { insurerCode: 'MANULIFE', archived: false, daysRemainingOverride: 0, updatedAtIso: '2026-11-13' },
  });
  assert.equal(expiredPromo, null);

  const parsedPolicy = parseDeterministicLegacyPolicyText(
    '公司團體醫保 Bupa Group Ward Plan\n外科手術上限 HK$ 60,000'
  );
  assert.equal(parsedPolicy.dimensionId, 'PRIVATE_HOSPITAL');
  assert.equal(parsedPolicy.coverageAmountHkd, 60_000);
  assert.equal(parsedPolicy.annualPremiumHkd, 0);

  const pitch = buildFormattedMessengerPitch({
    channel: 'WECHAT_ZH_CN',
    clientNameZh: '王建宏',
    clientNameEn: 'Wang Jianhong',
    planTitleZh: '[MANULIFE] 宏摯傳承保障計劃',
    planTitleEn: '[MANULIFE] ManuGlobal',
    annualPremiumHkd: 68_000,
    annualPremiumRmb: 62_560,
    monthlyHkd: 5_667,
    fxRateHkdToRmb: 0.92,
    fxUpdatedDate: '2026-11-13',
    proposalShareUrl: 'https://example.com/?proposal=ms-123',
    expiresDateText: '2026-11-27',
    advisorName: 'Alex Cheung',
    advisorLicense: 'FA8829',
  });
  assert.ok(pitch.includes('ms-123'));
  assert.equal(STP_STATUTORY_DOCUMENTS_EXPLAINER.length, 3);
});

test('Client Notes persist per client, survive v3 workspace migration (including intentional clear), and match Command Palette', async () => {
  const { migrateWorkspaceLeadsV3, resetLeadToFactoryDefault, WORKSPACE_SCHEMA_VERSION } = await import(
    './dealCaseEngine'
  );

  // 1. Seed leads each carry distinct consultant meeting notes
  assert.ok((INITIAL_CLIENT_LEADS[0].clientNotes || '').includes('中環咖啡廳'));
  assert.ok((INITIAL_CLIENT_LEADS[1].clientNotes || '').includes('太古廣場'));
  assert.ok((INITIAL_CLIENT_LEADS[2].clientNotes || '').includes('西九龍高鐵'));

  // 2. Pre-existing v3 persisted lead missing clientNotes backfills from canonical seed
  const legacyPersistedWithoutNotes = INITIAL_CLIENT_LEADS.map((l, idx) =>
    idx === 0 ? { ...l, clientNotes: undefined } : l
  );
  const migratedBackfill = migrateWorkspaceLeadsV3(
    legacyPersistedWithoutNotes,
    INITIAL_CLIENT_LEADS,
    WORKSPACE_SCHEMA_VERSION
  );
  assert.ok((migratedBackfill[0].clientNotes || '').includes('中環咖啡廳'));

  // 3. Consultant-edited notes AND intentionally cleared ("") notes are strictly preserved
  const editedNote = '2026-11-13 面談確認：週五下午 3 點攜帶滙豐本票簽署';
  const customPersisted = INITIAL_CLIENT_LEADS.map((l, idx) => {
    if (idx === 0) return { ...l, clientNotes: editedNote, clientNotesUpdatedAtIso: '2026-11-13T10:00:00Z' };
    if (idx === 1) return { ...l, clientNotes: '' };
    return l;
  });
  const migratedCustom = migrateWorkspaceLeadsV3(
    customPersisted,
    INITIAL_CLIENT_LEADS,
    WORKSPACE_SCHEMA_VERSION
  );
  assert.equal(migratedCustom[0].clientNotes, editedNote);
  assert.equal(migratedCustom[1].clientNotes, '');

  // 4. Command Palette finds client by unique keyword inside clientNotes
  const paletteHits = searchGlobalCommandPalette({
    query: '滙豐本票',
    leads: migratedCustom,
    plans: HK_MARKET_PLANS,
  });
  assert.ok(paletteHits.some((item) => item.kind === 'CLIENT' && item.leadId === 'lead-daniel-chan'));

  // 5. Factory reset restores seed clientNotes cleanly
  const restoredDaniel = resetLeadToFactoryDefault(migratedCustom[0], INITIAL_CLIENT_LEADS);
  assert.equal(restoredDaniel.clientNotes, INITIAL_CLIENT_LEADS[0].clientNotes);
});

