import assert from 'node:assert/strict';
import test from 'node:test';
import { HK_MARKET_PLANS } from '../data/hkMarketPlans';
import { INITIAL_CLIENT_LEADS } from '../data/initialLeads';
import { LeadStage, PlanCategory } from './types';
import {
  computeLeadStageSummary,
  derivePlanSyncProfile,
  filterUnifiedAdvisoryTools,
  TOOL_USE_CASE_CATEGORIES,
  UNIFIED_32_TOOLS_DIRECTORY,
} from './crmAndCatalogTaxonomy';

test('computeLeadStageSummary computes exact stage counts, percentages, and budget totals from leads state', () => {
  const summary = computeLeadStageSummary(INITIAL_CLIENT_LEADS);
  assert.equal(summary.totalLeads, INITIAL_CLIENT_LEADS.length);
  assert.equal(summary.stages.length, 5);

  const sumOfStageCounts = summary.stages.reduce((acc, s) => acc + s.count, 0);
  assert.equal(sumOfStageCounts, INITIAL_CLIENT_LEADS.length);

  const sumOfStageBudgets = summary.stages.reduce((acc, s) => acc + s.totalAnnualBudgetHkd, 0);
  assert.equal(sumOfStageBudgets, summary.totalAnnualBudgetHkd);

  // Verify stage progression mutation updates counts deterministically
  const mutatedLeads = INITIAL_CLIENT_LEADS.map((lead, idx) =>
    idx === 0 ? { ...lead, stage: LeadStage.IN_FORCE } : lead
  );
  const afterConvert = computeLeadStageSummary(mutatedLeads);
  const inForceBucket = afterConvert.stages.find((s) => s.stage === LeadStage.IN_FORCE);
  assert.ok(inForceBucket);
  assert.equal(inForceBucket.count, summary.convertedCount + 1);
});

test('UNIFIED_32_TOOLS_DIRECTORY classifies all 12 FN tools and all 20 IMP tools with zero duplicates', () => {
  assert.equal(UNIFIED_32_TOOLS_DIRECTORY.length, 32);

  const badges = UNIFIED_32_TOOLS_DIRECTORY.map((t) => t.codeBadge);
  const uniqueBadges = new Set(badges);
  assert.equal(uniqueBadges.size, 32);

  for (let i = 1; i <= 12; i++) {
    const fnCode = `FN-${String(i).padStart(2, '0')}`;
    assert.equal(uniqueBadges.has(fnCode), true, `Missing ${fnCode}`);
  }
  for (let i = 1; i <= 20; i++) {
    const impCode = `IMP-${String(i).padStart(2, '0')}`;
    assert.equal(uniqueBadges.has(impCode), true, `Missing ${impCode}`);
  }

  // Every non-ALL category has at least 4 tools and sums to 32
  const nonAllCategories = TOOL_USE_CASE_CATEGORIES.filter((c) => c.id !== 'ALL');
  assert.equal(nonAllCategories.length, 5);
  let totalCategorized = 0;
  for (const cat of nonAllCategories) {
    const items = filterUnifiedAdvisoryTools({ category: cat.id, searchQuery: '' });
    assert.equal(items.length >= 4, true, `Category ${cat.id} should have >= 4 tools`);
    totalCategorized += items.length;
  }
  assert.equal(totalCategorized, 32);

  // Search filter works
  const taxMatches = filterUnifiedAdvisoryTools({ category: 'ALL', searchQuery: 'VHIS' });
  assert.equal(taxMatches.length >= 2, true);
});

test('derivePlanSyncProfile maps VHIS, CI, and Savings plans to distinct cross-section sync settings', () => {
  assert.equal(derivePlanSyncProfile(null), null);

  const vhisPlan = HK_MARKET_PLANS.find((p) => p.category === PlanCategory.VHIS);
  const ciPlan = HK_MARKET_PLANS.find((p) => p.category === PlanCategory.CRITICAL_ILLNESS);
  const savingsPlan = HK_MARKET_PLANS.find(
    (p) => p.category === PlanCategory.PARTICIPATING_SAVINGS
  );

  assert.ok(vhisPlan && ciPlan && savingsPlan);

  const vhisSync = derivePlanSyncProfile(vhisPlan, INITIAL_CLIENT_LEADS[0]);
  const ciSync = derivePlanSyncProfile(ciPlan, INITIAL_CLIENT_LEADS[0]);
  const savSync = derivePlanSyncProfile(savingsPlan, INITIAL_CLIENT_LEADS[0]);

  assert.ok(vhisSync && ciSync && savSync);
  assert.equal(vhisSync.isVhisTaxEligible, true);
  assert.equal(vhisSync.suggestedScenarioId, 'HOSPITAL_MIN_INVASIVE');
  assert.equal(
    vhisSync.dimensionCoverageBoostsHkd.PRIVATE_HOSPITAL >
      savSync.dimensionCoverageBoostsHkd.PRIVATE_HOSPITAL,
    true
  );
  assert.equal(
    ciSync.dimensionCoverageBoostsHkd.CRITICAL_ILLNESS >
      vhisSync.dimensionCoverageBoostsHkd.CRITICAL_ILLNESS,
    true
  );
  assert.equal(
    savSync.dimensionCoverageBoostsHkd.RETIREMENT_DEMENTIA >
      vhisSync.dimensionCoverageBoostsHkd.RETIREMENT_DEMENTIA,
    true
  );
  assert.equal(ciSync.copilotAuditQuestionZh.includes(ciPlan.nameZh), true);
});
