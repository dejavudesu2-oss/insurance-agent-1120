import test from 'node:test';
import assert from 'node:assert/strict';
import { HK_MARKET_PLANS } from '../data/hkMarketPlans';
import {
  hasStaleOrInvalidUrlPattern,
  isPlanAlreadyInCatalog,
  runSubagentHyperlinkReviewFixLoop,
  runSubagentMissingPlansLoop,
} from './subAgentPlanLoopsEngine';
import { InsurancePlan, PlanCategory } from './types';

test('Baseline HK_MARKET_PLANS passes 3-Subagent Hyperlink Review & Fix Loop at 100% readiness', () => {
  assert.ok(
    HK_MARKET_PLANS.length >= 310,
    `Expected >= 310 plans after adding flagship 2026 plans, got ${HK_MARKET_PLANS.length}`
  );

  const report = runSubagentHyperlinkReviewFixLoop({
    allPlans: HK_MARKET_PLANS,
  });

  assert.equal(report.totalAuditedPlans, HK_MARKET_PLANS.length);
  assert.equal(report.issuesDetectedCount, 0, 'Baseline catalog should have zero broken links');
  assert.equal(report.postFixReadyPct, 100);
  assert.equal(report.subagentSteps.length, 3);

  for (const row of report.rows) {
    assert.equal(
      hasStaleOrInvalidUrlPattern(row.afterOfficialUrl),
      false,
      `Plan ${row.planId} has invalid officialUrl ${row.afterOfficialUrl}`
    );
    assert.ok(row.matchedToolCodes.length >= 2, `Plan ${row.planId} must match Power Pack tools`);
    if (row.isParticipating) {
      assert.ok(
        row.afterGn16Url && row.afterGn16Url.startsWith('https://'),
        `Participating plan ${row.planId} must have valid GN16 URL`
      );
    } else {
      assert.equal(row.afterGn16Url, undefined);
      assert.equal(row.finalGn16Status, 'NOT_APPLICABLE');
    }
  }
});

test('Subagent Hyperlink Fix Loop detects broken/404 URLs and extraneous non-par GN16 links and repairs them', () => {
  const samplePar: InsurancePlan = {
    ...HK_MARKET_PLANS.find((p) => p.id === 'AIA_GPMCP3')!,
    officialUrl: 'https://www.aia.com.hk/zh-hk/our-products/savings/global-power-multi-currency-plan-3',
    gn16ReportUrl: 'https://www.aia.com.hk/zh-hk/our-products/fulfillment-ratios.html',
  };
  const sampleVhis: InsurancePlan = {
    ...HK_MARKET_PLANS.find((p) => p.id === 'AIA_CEO_VHIS')!,
    officialUrl: 'https://www.aia.com.hk/zh-hk/404',
    gn16ReportUrl: 'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  };

  const report = runSubagentHyperlinkReviewFixLoop({
    allPlans: [samplePar, sampleVhis],
  });

  assert.equal(report.issuesDetectedCount, 2);
  assert.equal(report.autoFixedCount, 2);
  assert.equal(report.postFixReadyPct, 100);
  assert.equal(
    report.verifiedOverrides.AIA_GPMCP3.officialUrl,
    'https://www.aia.com.hk/zh-hk/products/save'
  );
  assert.equal(report.verifiedOverrides.AIA_CEO_VHIS.gn16ReportUrl, undefined);
});

test('Subagent Missing-Plan Search, Review & Import Loop surfaces unadded plans, caps IRR at GL28, and skips imported ones', () => {
  const firstRun = runSubagentMissingPlansLoop({
    existingPlans: HK_MARKET_PLANS,
  });

  assert.ok(firstRun.approvedReadyCount >= 12, 'Should discover >= 12 unadded HK plans');
  assert.equal(firstRun.subagentSteps.length, 3);

  for (const cand of firstRun.candidates) {
    assert.equal(
      isPlanAlreadyInCatalog(cand.plan, HK_MARKET_PLANS),
      false,
      `Discovered plan ${cand.plan.id} must not already be in HK_MARKET_PLANS`
    );
    assert.equal(cand.actuarialReviewPassed, true);
    assert.equal(cand.hyperlinkReviewPassed, true);
    assert.ok(cand.plan.officialUrl?.startsWith('https://'));
    if (
      cand.plan.category === PlanCategory.PARTICIPATING_SAVINGS ||
      cand.plan.category === PlanCategory.QDAP
    ) {
      assert.ok(
        cand.plan.rawProjectedIrr <= 0.065,
        `GL28 cap must be enforced on ${cand.plan.id}, got ${cand.plan.rawProjectedIrr}`
      );
    }
    assert.ok(cand.matchedPowerPackToolsZh.length >= 2);
  }

  // Simulate importing the first 3 discovered plans -> next loop run must skip them!
  const importedThree = firstRun.candidates.slice(0, 3).map((c) => c.plan);
  const secondRun = runSubagentMissingPlansLoop({
    existingPlans: [...HK_MARKET_PLANS, ...importedThree],
  });
  assert.equal(secondRun.approvedReadyCount, firstRun.approvedReadyCount - 3);
  assert.ok(secondRun.alreadyInAppSkippedCount >= 3);
});
