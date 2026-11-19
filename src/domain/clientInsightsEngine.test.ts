import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_CLIENT_LEADS } from '../data/initialLeads';
import {
  buildClientInsightsDashboard,
  convertPremiumToHkd,
  resolveLeadAnnualPolicyPremiumHkd,
} from './clientInsightsEngine';
import { InForcePolicyRecord, LeadStage } from './types';

test('convertPremiumToHkd converts HKD, USD, and RMB accurately', () => {
  assert.equal(convertPremiumToHkd(50000, 'HKD'), 50000);
  assert.equal(convertPremiumToHkd(10000, 'USD', 7.8), 78000);
  assert.equal(convertPremiumToHkd(92000, 'RMB', 7.8, 0.92), 100000);
  assert.equal(convertPremiumToHkd(0, 'USD'), 0);
});

test('buildClientInsightsDashboard computes monotonic cumulative funnel & conversion rates', () => {
  const samplePolicies: InForcePolicyRecord[] = [
    {
      id: 'pol-test-1',
      policyId: 'AIA-88102',
      leadId: INITIAL_CLIENT_LEADS[0].id,
      clientNameZh: INITIAL_CLIENT_LEADS[0].fullNameZh,
      clientNameEn: INITIAL_CLIENT_LEADS[0].fullNameEn,
      insurerCode: 'AIA',
      planNameZh: '尊顯自願醫保',
      planNameEn: 'VHIS Privilege',
      currency: 'USD',
      annualPremium: 15000,
      nextDueDateIso: '2026-12-01',
      graceEndsIso: '2026-12-31',
      status: 'ACTIVE',
      fxRateLocked: true,
      splitEligible: true,
    },
  ];

  const model = buildClientInsightsDashboard({
    leads: INITIAL_CLIENT_LEADS,
    inForcePolicies: samplePolicies,
    filter: 'ALL',
  });

  assert.equal(model.totalLeads, INITIAL_CLIENT_LEADS.length);
  assert.equal(model.funnelMetrics.length, 5);
  assert.equal(model.funnelMetrics[0].stage, LeadStage.NEW);
  assert.equal(model.funnelMetrics[0].cumulativeReachedCount, INITIAL_CLIENT_LEADS.length);
  assert.equal(model.funnelMetrics[0].topOfFunnelRatePct, 100);

  for (let i = 1; i < model.funnelMetrics.length; i += 1) {
    assert.ok(
      model.funnelMetrics[i].cumulativeReachedCount <=
        model.funnelMetrics[i - 1].cumulativeReachedCount,
      'Cumulative funnel counts must be monotonically non-increasing'
    );
    assert.ok(
      model.funnelMetrics[i].stepConversionRatePct >= 0 &&
        model.funnelMetrics[i].stepConversionRatePct <= 100
    );
  }

  assert.ok(model.avgPolicyPremiumHkd > 0, 'Average policy premium must be positive');
  assert.ok(model.schemePremiumBreakdown.length >= 2, 'Product scheme breakdown populated');
  assert.equal(model.residencyComparison.length, 2);
});

test('resolveLeadAnnualPolicyPremiumHkd prioritizes in-force policies over annualBudgetHkd', () => {
  const lead = INITIAL_CLIENT_LEADS[0];
  const fromBudget = resolveLeadAnnualPolicyPremiumHkd({ lead });
  assert.equal(fromBudget, lead.annualBudgetHkd);

  const fromInForce = resolveLeadAnnualPolicyPremiumHkd({
    lead,
    inForcePolicies: [
      {
        id: 'p1',
        policyId: 'PRU-999',
        leadId: lead.id,
        clientNameZh: lead.fullNameZh,
        clientNameEn: lead.fullNameEn,
        insurerCode: 'PRU',
        planNameZh: '信守明天',
        planNameEn: 'EG2',
        currency: 'USD',
        annualPremium: 20000,
        nextDueDateIso: '2026-12-10',
        graceEndsIso: '2027-01-09',
        status: 'ACTIVE',
        fxRateLocked: false,
        splitEligible: true,
      },
    ],
    usdToHkd: 7.8,
  });
  assert.equal(fromInForce, 156000);
});

test('buildClientInsightsDashboard filters cleanly by residency MCV vs HK_RESIDENT', () => {
  const mcvOnly = buildClientInsightsDashboard({
    leads: INITIAL_CLIENT_LEADS,
    filter: 'MCV',
  });
  const hkOnly = buildClientInsightsDashboard({
    leads: INITIAL_CLIENT_LEADS,
    filter: 'HK_RESIDENT',
  });
  assert.equal(mcvOnly.totalLeads + hkOnly.totalLeads, INITIAL_CLIENT_LEADS.length);
  assert.equal(mcvOnly.mcvLeadSharePct, 100);
  assert.equal(hkOnly.mcvLeadSharePct, 0);
});
