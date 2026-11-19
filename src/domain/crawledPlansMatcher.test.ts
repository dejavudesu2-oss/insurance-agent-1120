import test from 'node:test';
import assert from 'node:assert/strict';
import { HK_MARKET_PLANS } from '../data/hkMarketPlans';
import {
  applyCrawledEnrichmentToPlans,
  CRAWLED_AUDIT_REPORT,
  CRAWLED_NEW_VERIFIED_PLANS,
} from '../data/hkCrawledEnrichment';
import {
  auditCrawledCatalogIntegrity,
  getPlanActionableHyperlinks,
  isSuspectBrochurePdfUrl,
  isValidHttpsUrl,
  normalizeInsurerCodeFromCsv,
} from './crawledPlansMatcher';

test('applyCrawledEnrichmentToPlans merges 312 base plans + 14 newly verified crawled plans with zero duplicate IDs', () => {
  const enriched = applyCrawledEnrichmentToPlans(HK_MARKET_PLANS);
  assert.equal(enriched.length, HK_MARKET_PLANS.length + CRAWLED_NEW_VERIFIED_PLANS.length);
  const ids = new Set(enriched.map((p) => p.id));
  assert.equal(ids.size, enriched.length);
  assert.equal(CRAWLED_AUDIT_REPORT.counts.existingCatalogCount, 312);
  assert.equal(CRAWLED_AUDIT_REPORT.counts.matchedAndUpdatedExistingCount, 112);
  assert.equal(CRAWLED_AUDIT_REPORT.counts.newlyImportedFromCsvCount, 14);
});

test('auditCrawledCatalogIntegrity passes 100% across all 326 plans with zero invalid URLs or suspect PDF leaks', () => {
  const enriched = applyCrawledEnrichmentToPlans(HK_MARKET_PLANS);
  const summary = auditCrawledCatalogIntegrity(enriched);
  assert.equal(summary.passed, true);
  assert.deepEqual(summary.invalidUrlViolations, []);
  assert.deepEqual(summary.suspectBrochureLeaks, []);
  assert.ok(summary.crawledMatchedCount >= 120);
  assert.ok(summary.plansWithBrochureOrPolicyPdf >= 100);
  assert.ok(summary.vhisPlansWithStandardPremiumPdf >= 55);
  assert.ok(summary.plansWithPromoFlyerPdf >= 5);
});

test('suspect brochure PDF detector catches mis-scraped non-brochure PDFs and blocks them from UI links', () => {
  assert.equal(isSuspectBrochurePdfUrl('https://www.aia.com.hk/content/dam/hk-wise/pdf/University_Ranking_tc.pdf'), true);
  assert.equal(isSuspectBrochurePdfUrl('https://www.prudential.com.hk/pdf/prmp-leaflet-tc.pdf'), true);
  assert.equal(isSuspectBrochurePdfUrl('https://www.hsbc.com.hk/docs/download-transcript.pdf'), true);
  assert.equal(isSuspectBrochurePdfUrl('https://www.cigna.com.hk/docs/PersonalInformationCollectionStatement_chi.pdf'), true);
  assert.equal(isSuspectBrochurePdfUrl('https://www.fwd.com.hk/docs/Cashless_Facility_for_Outpatient_Colonosopy_and_Gastroscopy_TC.pdf'), true);
  assert.equal(isSuspectBrochurePdfUrl('https://www.bowtie.com.hk/assets/List-of-Designated-Hospitals-in-Mainland-China-Bowtie-Pink-02.pdf'), true);
  assert.equal(isSuspectBrochurePdfUrl('https://www.vhis.gov.hk/doc/certifiedplan/fp/F00045/F00045-01-000-04-PlanDoc-c.pdf'), false);

  const enriched = applyCrawledEnrichmentToPlans(HK_MARKET_PLANS);
  const gpmcp3 = enriched.find((p) => p.id === 'AIA_GPMCP3');
  assert.ok(gpmcp3);
  const gpmcp3Links = getPlanActionableHyperlinks(gpmcp3);
  assert.equal(gpmcp3Links.officialPageUrl, 'https://www.aia.com.hk/zh-hk/products/save/global-power-3');
  assert.equal(gpmcp3Links.brochureOrPolicyPdfUrl, undefined); // University_Ranking_tc.pdf blocked!
  assert.ok(gpmcp3Links.promoFlyerPdfUrl?.includes('Q4-2026-Promo-Leaflet-tc.pdf'));
});

test('VHIS matched plans wire official vhis.gov.hk Policy Doc PDF & Standard Premium PDF while hiding absent promo flyers', () => {
  const enriched = applyCrawledEnrichmentToPlans(HK_MARKET_PLANS);

  const fwdVprime = enriched.find((p) => p.id === 'FWD_VPRIME_VHIS');
  assert.ok(fwdVprime);
  assert.equal(fwdVprime.vhisCertificationNo, 'F00045-01-000-04');
  const fwdLinks = getPlanActionableHyperlinks(fwdVprime);
  assert.equal(fwdLinks.officialPageUrl, 'https://www.fwd.com.hk/zh/vhis/vprime/');
  assert.equal(
    fwdLinks.brochureOrPolicyPdfUrl,
    'https://www.vhis.gov.hk/doc/certifiedplan/fp/F00045/F00045-01-000-04-PlanDoc-c.pdf'
  );
  assert.equal(
    fwdLinks.standardPremiumPdfUrl,
    'https://www.vhis.gov.hk/doc/certifiedplan/fp/F00045/F00045-01-000-04-StandardPremium-Bilingual.pdf'
  );
  assert.equal(fwdLinks.promoFlyerPdfUrl, undefined);

  const bowtiePink = enriched.find((p) => p.id === 'BOWTIE_PINK_VHIS');
  assert.ok(bowtiePink);
  const bowtieLinks = getPlanActionableHyperlinks(bowtiePink);
  assert.equal(bowtieLinks.officialPageUrl, 'https://www.bowtie.com.hk/zh/insurance/vhis/bowtie-pink');
  assert.ok(bowtieLinks.brochureOrPolicyPdfUrl?.includes('vhis.gov.hk/doc/certifiedplan/fp/F00060'));
  assert.ok(bowtieLinks.standardPremiumPdfUrl?.includes('StandardPremium-Bilingual.pdf'));
  assert.equal(bowtieLinks.promoFlyerPdfUrl, undefined);
});

test('normalizeInsurerCodeFromCsv and isValidHttpsUrl handle CSV naming variants safely', () => {
  assert.equal(normalizeInsurerCodeFromCsv('Prudential'), 'PRU');
  assert.equal(normalizeInsurerCodeFromCsv('Sun_Life'), 'SUNLIFE');
  assert.equal(normalizeInsurerCodeFromCsv('BOC_Life'), 'BOCLIFE');
  assert.equal(normalizeInsurerCodeFromCsv('HSBC_Life'), 'HSBC');
  assert.equal(normalizeInsurerCodeFromCsv('CTF_Life'), 'CTFLIFE');
  assert.equal(normalizeInsurerCodeFromCsv('YF_Life'), 'YFLIFE');
  assert.equal(normalizeInsurerCodeFromCsv('China_Life'), 'CHINALIFE');
  assert.equal(normalizeInsurerCodeFromCsv('Blue_Cross'), 'BLUECROSS');
  assert.equal(isValidHttpsUrl('https://www.aia.com.hk/zh-hk/products/save/global-power-3'), true);
  assert.equal(isValidHttpsUrl('http://insecure.example.com'), false);
  assert.equal(isValidHttpsUrl(''), false);
});
