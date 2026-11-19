import { resolveVerifiedPlanUrls } from './planLinksAndOffersEngine';
import { InsurancePlan, PlanCategory } from './types';

/**
 * Suspect PDF filenames observed in live-crawled ALL_COMPANY_PLANS_DETAIL.csv
 * that are NOT actual main product brochures (e.g., university ranking flyers,
 * privacy statements, colonoscopy cashless notices, hospital lists, promo flyers).
 */
export const SUSPECT_BROCHURE_PDF_PATTERNS: readonly string[] = [
  'university_ranking',
  'prmp-leaflet',
  'download-transcript',
  'personalinformationcollectionstatement',
  'cashless_facility_for_outpatient_colonosopy',
  'list-of-designated-hospitals',
  'dementia-leaflet',
  'product-offers-terms',
  'interim-owner-option',
  'future-wishes-arrangement',
  'clientoffer',
  'premium-schedule',
  'premium-table',
];

export function isValidHttpsUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname && parsed.hostname.includes('.'));
  } catch {
    return false;
  }
}

export function isSuspectBrochurePdfUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const lower = url.trim().toLowerCase();
  return SUSPECT_BROCHURE_PDF_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function normalizeInsurerCodeFromCsv(rawInsurer: string): string {
  const cleaned = (rawInsurer || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const map: Record<string, string> = {
    AIA: 'AIA',
    PRUDENTIAL: 'PRU',
    PRU: 'PRU',
    SUN_LIFE: 'SUNLIFE',
    SUNLIFE: 'SUNLIFE',
    BOC_LIFE: 'BOCLIFE',
    BOCLIFE: 'BOCLIFE',
    YF_LIFE: 'YFLIFE',
    YFLIFE: 'YFLIFE',
    HSBC_LIFE: 'HSBC',
    HSBC: 'HSBC',
    CTF_LIFE: 'CTFLIFE',
    CTFLIFE: 'CTFLIFE',
    CIGNA: 'CIGNA',
    BLUE_CROSS: 'BLUECROSS',
    BLUECROSS: 'BLUECROSS',
    CHINA_LIFE: 'CHINALIFE',
    CHINALIFE: 'CHINALIFE',
    FWD: 'FWD',
    BOWTIE: 'BOWTIE',
    MANULIFE: 'MANULIFE',
    AXA: 'AXA',
    BUPA: 'BUPA',
    CHUBB: 'CHUBB',
    ZURICH: 'ZURICH',
    TAIPING: 'TAIPING',
    ALLIANZ: 'ALLIANZ',
    ASIA_INSURANCE: 'ASIAINS',
    BOCG: 'BOCGI',
    LIBERTY: 'LIBERTY',
    MSIG: 'MSIG',
    WELL_LINK: 'WELLLINK',
    DAH_SING: 'DAHSING',
    AVO: 'AVO',
    ZA_LIFE: 'ZAINSURE',
    BOLTTECH: 'BOLTTECH',
  };
  return map[cleaned] || cleaned;
}

export interface PlanActionableHyperlinks {
  officialPageUrl: string;
  brochureOrPolicyPdfUrl?: string;
  brochureLinkLabelZh: string;
  brochureLinkLabelEn: string;
  standardPremiumPdfUrl?: string;
  promoFlyerPdfUrl?: string;
  gn16ReportUrl?: string;
  hasCrawledDirectLinks: boolean;
}

/**
 * Returns the standardized, safe clickable hyperlinks for every product card
 * and 1v1 / 3-Way comparison view:
 * 1. 官方產品專頁 (Product_URL)
 * 2. 官方產品小冊子 / 保單條款 (Official_Brochure_PDF_URL or VHIS Policy_Doc_PDF_URL)
 * 3. 官方標準保費表 (Standard_Premium_PDF_URL — VHIS plans only)
 * 4. 最新推廣單張 (Promo_Flyer_PDF_URL — only when genuinely present)
 */
export function getPlanActionableHyperlinks(
  plan: InsurancePlan,
  overrides?: Record<string, { officialUrl?: string; gn16ReportUrl?: string }>
): PlanActionableHyperlinks {
  const resolved = resolveVerifiedPlanUrls(plan, overrides);
  const rawBrochure = resolved.brochurePdfUrl;
  const safeBrochure =
    rawBrochure && isValidHttpsUrl(rawBrochure) && !isSuspectBrochurePdfUrl(rawBrochure)
      ? rawBrochure
      : undefined;

  const isVhis = plan.category === PlanCategory.VHIS || Boolean(plan.vhisCertificationNo);
  const safeStandardPremium =
    isVhis && isValidHttpsUrl(resolved.standardPremiumPdfUrl)
      ? resolved.standardPremiumPdfUrl
      : undefined;
  const safePromoFlyer = isValidHttpsUrl(resolved.promoFlyerPdfUrl)
    ? resolved.promoFlyerPdfUrl
    : undefined;

  const isVhisPolicyDoc = Boolean(safeBrochure && safeBrochure.includes('vhis.gov.hk'));

  return {
    officialPageUrl: resolved.officialUrl,
    brochureOrPolicyPdfUrl: safeBrochure,
    brochureLinkLabelZh: isVhisPolicyDoc ? '官方保單條款 (PDF)' : '官方產品小冊子 (PDF)',
    brochureLinkLabelEn: isVhisPolicyDoc ? 'Official Policy Doc (PDF)' : 'Official Brochure (PDF)',
    standardPremiumPdfUrl: safeStandardPremium,
    promoFlyerPdfUrl: safePromoFlyer,
    gn16ReportUrl: resolved.gn16ReportUrl,
    hasCrawledDirectLinks: Boolean(
      plan.crawledSourceMatched || safeBrochure || safeStandardPremium || safePromoFlyer
    ),
  };
}

export interface CrawledCatalogIntegritySummary {
  totalPlans: number;
  crawledMatchedCount: number;
  plansWithBrochureOrPolicyPdf: number;
  vhisPlansWithStandardPremiumPdf: number;
  plansWithPromoFlyerPdf: number;
  invalidUrlViolations: string[];
  suspectBrochureLeaks: string[];
  passed: boolean;
}

export function auditCrawledCatalogIntegrity(
  plans: InsurancePlan[]
): CrawledCatalogIntegritySummary {
  let crawledMatchedCount = 0;
  let plansWithBrochureOrPolicyPdf = 0;
  let vhisPlansWithStandardPremiumPdf = 0;
  let plansWithPromoFlyerPdf = 0;
  const invalidUrlViolations: string[] = [];
  const suspectBrochureLeaks: string[] = [];

  for (const plan of plans) {
    if (plan.crawledSourceMatched) crawledMatchedCount += 1;
    const links = getPlanActionableHyperlinks(plan);
    if (!isValidHttpsUrl(links.officialPageUrl)) {
      invalidUrlViolations.push(`${plan.id}: invalid officialPageUrl (${links.officialPageUrl})`);
    }
    if (links.brochureOrPolicyPdfUrl) {
      plansWithBrochureOrPolicyPdf += 1;
      if (isSuspectBrochurePdfUrl(links.brochureOrPolicyPdfUrl)) {
        suspectBrochureLeaks.push(`${plan.id}: suspect brochure leaked (${links.brochureOrPolicyPdfUrl})`);
      }
    }
    if (links.standardPremiumPdfUrl) {
      vhisPlansWithStandardPremiumPdf += 1;
    }
    if (links.promoFlyerPdfUrl) {
      plansWithPromoFlyerPdf += 1;
    }
  }

  return {
    totalPlans: plans.length,
    crawledMatchedCount,
    plansWithBrochureOrPolicyPdf,
    vhisPlansWithStandardPremiumPdf,
    plansWithPromoFlyerPdf,
    invalidUrlViolations,
    suspectBrochureLeaks,
    passed: invalidUrlViolations.length === 0 && suspectBrochureLeaks.length === 0,
  };
}
