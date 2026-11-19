import test from 'node:test';
import assert from 'node:assert/strict';
import { HK_MARKET_PLANS } from '../data/hkMarketPlans';
import { HK_GN16_DISCLOSURE_REGISTRY } from '../data/hkMarketIntelData';
import {
  buildDeterministicPlanLinkAudit,
  classifyHttpProbeStatus,
  COMPARE_SLOT_CLASSIFICATION,
  DEFAULT_THREE_COMPARE_PLAN_IDS,
  getSpecialOfferForPlan,
  HKIA_CENTRAL_GN16_PORTAL_URL,
  MAX_COMPARED_PLANS,
  resolveVerifiedPlanUrls,
  setComparisonSlotPlan,
  toggleThreePlanComparison,
} from './planLinksAndOffersEngine';

test('HK_MARKET_PLANS expands to 285+ unique plans across all 46 HKIA retail/HNW/GI insurers', () => {
  assert.ok(
    HK_MARKET_PLANS.length >= 285,
    `Expected >= 285 plans, got ${HK_MARKET_PLANS.length}`
  );

  const uniqueIds = new Set(HK_MARKET_PLANS.map((p) => p.id));
  assert.equal(uniqueIds.size, HK_MARKET_PLANS.length, 'Every plan ID must be unique');

  const insurerCodes = new Set(HK_MARKET_PLANS.map((p) => p.insurerCode));
  assert.equal(insurerCodes.size, 46, `Expected 46 HKIA insurers, got ${insurerCodes.size}`);

  for (const requiredCode of [
    'TAHOE',
    'CPICLIFE',
    'WELLLINK',
    'AIGHK',
    'TOKIOMARINE',
    'TAIPINGGI',
  ]) {
    assert.ok(insurerCodes.has(requiredCode), `Missing newly added insurer ${requiredCode}`);
  }
});

test('All officialUrl & gn16ReportUrl links eliminate dead domains and strip GN16 from non-par plans', () => {
  const knownDeadSubstrings = [
    'chubblife.com.hk',
    'fwd-sav-maxacc',
    '/our-products/fulfillment-ratios.html',
    'hkmcannuity.hk',
    'fubon.com/life_hk',
    'transamericalifebermuda.com/zh-hant/',
  ];

  for (const plan of HK_MARKET_PLANS) {
    assert.ok(
      plan.officialUrl && plan.officialUrl.startsWith('https://'),
      `Plan ${plan.id} missing valid https officialUrl`
    );
    for (const dead of knownDeadSubstrings) {
      assert.equal(
        plan.officialUrl.includes(dead),
        false,
        `Plan ${plan.id} still has dead officialUrl substring ${dead}: ${plan.officialUrl}`
      );
    }

    if (plan.fulfillmentRatio === null) {
      assert.equal(
        plan.gn16ReportUrl,
        undefined,
        `Non-participating plan ${plan.id} should not expose gn16ReportUrl`
      );
    } else {
      assert.ok(
        plan.gn16ReportUrl && plan.gn16ReportUrl.startsWith('https://'),
        `Participating plan ${plan.id} must expose valid https gn16ReportUrl`
      );
      for (const dead of knownDeadSubstrings) {
        assert.equal(
          plan.gn16ReportUrl.includes(dead),
          false,
          `Plan ${plan.id} still has dead gn16ReportUrl substring ${dead}`
        );
      }
    }
  }

  for (const row of HK_GN16_DISCLOSURE_REGISTRY) {
    assert.ok(row.officialUrl.startsWith('https://'));
    assert.equal(row.officialUrl.includes('/our-products/fulfillment-ratios.html'), false);
  }
});

test('getSpecialOfferForPlan strictly returns offer ONLY when selected plan has a seasonal promotion', () => {
  assert.equal(getSpecialOfferForPlan(null), null);
  assert.equal(getSpecialOfferForPlan(undefined), null);

  // Flagship savings plans with exact 20% rebate + 4.8% 5Y prepaid interest
  const manulifeGlobal = HK_MARKET_PLANS.find((p) => p.id === 'MANULIFE_MANUGLOBAL');
  const fwdMaxFocus = HK_MARKET_PLANS.find((p) => p.id === 'FWD_MAXFOCUS_SIG');
  assert.ok(manulifeGlobal && fwdMaxFocus);

  const manuOffer = getSpecialOfferForPlan(manulifeGlobal);
  assert.ok(manuOffer);
  assert.equal(manuOffer.firstYearRebatePct, 20);
  assert.equal(manuOffer.prepaidGuaranteedRatePct, 4.8);
  assert.ok(manuOffer.headlineZh.includes('20%'));
  assert.ok(manuOffer.headlineZh.includes('4.8%'));

  // Non-promotional plans must return null (Term Life, Standard VHIS, Short Guaranteed, Personal GI)
  for (const nonPromoId of [
    'ZURICH_BREEZE_TERM',
    'AIA_VHIS_STANDARD_PLAN',
    'BLUE_WESAVE_S3',
    'WELLLINK_JOYFUL_SAVE',
    'AIGHK_TRAVEL_GUARD_PRO',
  ]) {
    const p = HK_MARKET_PLANS.find((item) => item.id === nonPromoId);
    if (p) {
      assert.equal(
        getSpecialOfferForPlan(p),
        null,
        `Expected ${nonPromoId} to have NO special offer`
      );
    }
  }
});

test('3-Plan comparison maintains max 3 plans and Red / Blue / Yellow line classification', () => {
  assert.equal(MAX_COMPARED_PLANS, 3);
  assert.equal(DEFAULT_THREE_COMPARE_PLAN_IDS.length, 3);
  assert.equal(COMPARE_SLOT_CLASSIFICATION[0].colorKey, 'RED');
  assert.equal(COMPARE_SLOT_CLASSIFICATION[0].strokeHex, '#DC2626');
  assert.equal(COMPARE_SLOT_CLASSIFICATION[1].colorKey, 'BLUE');
  assert.equal(COMPARE_SLOT_CLASSIFICATION[1].strokeHex, '#2563EB');
  assert.equal(COMPARE_SLOT_CLASSIFICATION[2].colorKey, 'YELLOW');
  assert.equal(COMPARE_SLOT_CLASSIFICATION[2].strokeHex, '#EAB308');

  // Toggling a 4th plan into a 3-plan list shifts and keeps max 3
  const afterFourth = toggleThreePlanComparison(
    ['FWD_MAXFOCUS_SIG', 'AIA_GPMCP3', 'MANULIFE_MANUGLOBAL'],
    'PRU_ITRUST'
  );
  assert.deepEqual(afterFourth, ['AIA_GPMCP3', 'MANULIFE_MANUGLOBAL', 'PRU_ITRUST']);

  // Swapping Slot 2 (Yellow) directly updates index 2
  const swappedSlot = setComparisonSlotPlan(afterFourth, 2, 'BOC_SMARTUP_PRO_MAX');
  assert.deepEqual(swappedSlot, [
    'AIA_GPMCP3',
    'MANULIFE_MANUGLOBAL',
    'BOC_SMARTUP_PRO_MAX',
  ]);
});

test('Sub-Agent HTTP link classifier & deterministic audit catch soft-404 redirects and apply overrides', () => {
  assert.equal(
    classifyHttpProbeStatus({
      testedUrl: 'https://www.fwd.com.hk/zh/save/',
      finalResolvedUrl: 'https://www.fwd.com.hk/zh/404/',
      httpStatus: 200,
      pageTitle: '404 Not Found',
    }),
    'SOFT_404'
  );

  assert.equal(
    classifyHttpProbeStatus({
      testedUrl: HKIA_CENTRAL_GN16_PORTAL_URL,
      finalResolvedUrl: HKIA_CENTRAL_GN16_PORTAL_URL,
      httpStatus: 200,
      pageTitle: '保險業監管局 - 分紅實現率',
    }),
    'VERIFIED_200'
  );

  const samplePlan = HK_MARKET_PLANS.find((p) => p.id === 'FWD_MAXFOCUS_SIG')!;
  const audit = buildDeterministicPlanLinkAudit({
    plan: samplePlan,
    officialProbeRaw: {
      testedUrl: 'https://www.fwd.com.hk/zh/savings/dead-slug',
      finalResolvedUrl: 'https://www.fwd.com.hk/zh/404/',
      httpStatus: 200,
      pageTitle: '404',
    },
    gn16ProbeRaw: {
      testedUrl: 'https://www.fwd.com.hk/zh/regulatory-disclosures/fulfillment-ratios/',
      finalResolvedUrl: 'https://www.fwd.com.hk/zh/regulatory-disclosures/fulfillment-ratios/',
      httpStatus: 200,
      pageTitle: '分紅實現率 | 富衛香港',
    },
  });

  assert.equal(audit.officialProbe.status, 'SOFT_404');
  assert.equal(audit.officialProbe.recommendedUrl, 'https://www.fwd.com.hk/zh/products/');
  assert.equal(audit.gn16Probe.status, 'VERIFIED_200');

  const overridden = resolveVerifiedPlanUrls(samplePlan, {
    FWD_MAXFOCUS_SIG: {
      officialUrl: 'https://www.fwd.com.hk/zh/products/',
      gn16ReportUrl: HKIA_CENTRAL_GN16_PORTAL_URL,
    },
  });
  assert.equal(overridden.officialUrl, 'https://www.fwd.com.hk/zh/products/');
  assert.equal(overridden.gn16ReportUrl, HKIA_CENTRAL_GN16_PORTAL_URL);
});
