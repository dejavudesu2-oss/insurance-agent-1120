import test from 'node:test';
import assert from 'node:assert/strict';
import { HK_MARKET_PLANS } from '../data/hkMarketPlans';
import { INITIAL_CLIENT_LEADS } from '../data/initialLeads';
import { CLAIM_SCENARIO_PRESETS } from './clientGapEngine';
import {
  migrateWorkspaceLeadsV3,
  resolveUnifiedDealCase,
  WORKSPACE_SCHEMA_VERSION,
} from './dealCaseEngine';
import { ClientLead, LeadStage } from './types';

test('migrateWorkspaceLeadsV3 drops legacy v1 placeholder leads and preserves canonical v3 + custom leads', () => {
  const legacyPersisted: ClientLead[] = [
    {
      id: 'lead-lin-xiaomei',
      fullNameEn: 'Lin Xiaomei',
      fullNameZh: '林小美',
      age: 42,
      plannedRetirementAge: 58,
      isSmoker: false,
      residency: 'MCV',
      whatsappPhone: '+86 138',
      email: 'lin@test.cn',
      stage: LeadStage.NEW,
      notes: 'Legacy v1 lead without annualBudgetHkd',
      fnaRecord: null,
      kycCheck: { hkidVerified: true, hkidDocNumber: 'EEP-1', mcvEntrySlipVerified: false },
      lastContactIso: '2026-11-01T00:00:00Z',
    },
    {
      id: 'lead-custom-vip',
      fullNameEn: 'VIP Custom Client',
      fullNameZh: '張自訂客戶',
      age: 45,
      plannedRetirementAge: 65,
      isSmoker: false,
      residency: 'HK_RESIDENT',
      whatsappPhone: '+852 9999 8888',
      email: 'vip@test.hk',
      stage: LeadStage.PROPOSAL_SENT,
      annualBudgetHkd: 95000,
      notes: 'User-created lead',
      fnaRecord: null,
      kycCheck: { hkidVerified: true, hkidDocNumber: 'A123456(3)', mcvEntrySlipVerified: false },
      lastContactIso: '2026-11-12T00:00:00Z',
    },
  ];

  const migrated = migrateWorkspaceLeadsV3(legacyPersisted, INITIAL_CLIENT_LEADS, undefined);

  assert.equal(migrated.some((l) => l.id === 'lead-lin-xiaomei'), false);
  assert.equal(migrated.some((l) => l.id === 'lead-daniel-chan'), true);
  assert.equal(migrated.some((l) => l.id === 'lead-vanessa-lin'), true);
  assert.equal(migrated.some((l) => l.id === 'lead-henry-wang'), true);
  assert.equal(migrated.some((l) => l.id === 'lead-custom-vip'), true);

  const vanessa = migrated.find((l) => l.id === 'lead-vanessa-lin')!;
  assert.equal(vanessa.annualBudgetHkd, 36000);
  assert.ok(vanessa.proposalCart);
  assert.equal(WORKSPACE_SCHEMA_VERSION, 3);
});

test('resolveUnifiedDealCase synchronizes anchor plan + riders identically across Gap Radar, Bundle Sim & Scenarios', () => {
  const daniel = INITIAL_CLIENT_LEADS[0];
  const baseValuation = resolveUnifiedDealCase({
    lead: {
      ...daniel,
      proposalCart: {
        anchorPlanId: '',
        selectedRiderIds: [],
        paymentMode: 'ANNUAL',
        paymentTermYears: 10,
        currency: 'HKD',
        sumAssuredUsd: 100000,
        fxRateHkdToRmb: 0.92,
        claimScenarioId: 'CANCER_TARGETED_24M',
      },
    },
    allPlans: HK_MARKET_PLANS,
  });

  const withRidersAndPlan = resolveUnifiedDealCase({
    lead: {
      ...daniel,
      proposalCart: {
        anchorPlanId: 'BOWTIE_PINK_SEMI',
        selectedRiderIds: ['RIDER_CI_EARLY_BOOST', 'RIDER_TERM_MORTGAGE'],
        paymentMode: 'ANNUAL',
        paymentTermYears: 10,
        currency: 'HKD',
        sumAssuredUsd: 100000,
        fxRateHkdToRmb: 0.92,
        claimScenarioId: 'CANCER_TARGETED_24M',
      },
    },
    allPlans: HK_MARKET_PLANS,
    explicitSelectedPlanId: 'BOWTIE_PINK_SEMI',
  });

  const baseCancer = baseValuation.gapAudit.rows.find(
    (d) => d.dimensionId === 'CANCER_TARGETED'
  )!;
  const boostedCancer = withRidersAndPlan.gapAudit.rows.find(
    (d) => d.dimensionId === 'CANCER_TARGETED'
  )!;

  assert.ok(boostedCancer.newProposedCoverHkd > baseCancer.newProposedCoverHkd);
  assert.ok(withRidersAndPlan.bundleSim.netAnnualPremiumHkd > 0);
  assert.equal(withRidersAndPlan.allScenariosComparison.length, CLAIM_SCENARIO_PRESETS.length);
  assert.equal(withRidersAndPlan.attachedRiderNamesZh.length, 2);
});

test('resetLeadToFactoryDefault restores mutated client lead back to factory preset', async () => {
  const { resetLeadToFactoryDefault } = await import('./dealCaseEngine');
  const mutatedDaniel: ClientLead = {
    ...INITIAL_CLIENT_LEADS[0],
    age: 59,
    annualBudgetHkd: 120000,
    isSmoker: true,
    targetSchemeId: 'MULTI_FX_LEGACY',
  };

  const restored = resetLeadToFactoryDefault(mutatedDaniel, INITIAL_CLIENT_LEADS);
  assert.equal(restored.age, INITIAL_CLIENT_LEADS[0].age);
  assert.equal(restored.annualBudgetHkd, INITIAL_CLIENT_LEADS[0].annualBudgetHkd);
  assert.equal(restored.isSmoker, INITIAL_CLIENT_LEADS[0].isSmoker);
  assert.equal(restored.targetSchemeId, INITIAL_CLIENT_LEADS[0].targetSchemeId);
});

