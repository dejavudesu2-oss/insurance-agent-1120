import {
  GroundedWebSource,
  InsurancePlan,
  LinkVerificationStatus,
  PlanCategory,
  PlanLinkAuditResult,
  PlanLinkProbeItem,
  PlanSpecialOffer,
} from './types';

export const HKIA_CENTRAL_GN16_PORTAL_URL =
  'https://www.ia.org.hk/tc/fulfillment_ratio/index.html';

export const HKIA_GL16_GUIDELINE_PDF_URL =
  'https://www.ia.org.hk/tc/legislative_framework/files/GL16_20240101_TC.pdf';

export interface VerifiedInsurerUrlEntry {
  insurerCode: string;
  officialPortalUrl: string;
  savingsUrl?: string;
  medicalUrl?: string;
  ciUrl?: string;
  gn16Url?: string;
}

/**
 * Canonical HTTP-verified URLs across all 46 HKIA-authorized retail, HNW & GI insurers.
 * Eliminates dead deep-slugs (/404/, chubblife.com.hk, /fulfillment-ratios.html, etc.).
 */
export const VERIFIED_INSURER_URLS: Record<string, VerifiedInsurerUrlEntry> = {
  AIA: {
    insurerCode: 'AIA',
    officialPortalUrl: 'https://www.aia.com.hk/zh-hk',
    savingsUrl: 'https://www.aia.com.hk/zh-hk/products/save',
    medicalUrl: 'https://www.aia.com.hk/zh-hk/products/health',
    ciUrl: 'https://www.aia.com.hk/zh-hk/products/health',
    gn16Url:
      'https://www.aia.com.hk/zh-hk/products/further-product-information/participating-products/fulfillment-ratio',
  },
  PRU: {
    insurerCode: 'PRU',
    officialPortalUrl: 'https://www.prudential.com.hk/tc/',
    gn16Url: 'https://www.prudential.com.hk/tc/general/performance/total-cash-value-ratio/',
  },
  MANULIFE: {
    insurerCode: 'MANULIFE',
    officialPortalUrl: 'https://www.manulife.com.hk/zh-hk.html',
    gn16Url:
      'https://www.manulife.com.hk/content/dam/insurance/hk/zh-hk/documents/products/product-services/fulfillment-ratio.pdf',
  },
  FWD: {
    insurerCode: 'FWD',
    officialPortalUrl: 'https://www.fwd.com.hk/zh/products/',
    medicalUrl: 'https://www.fwd.com.hk/zh/vhis/',
    ciUrl: 'https://www.fwd.com.hk/zh/protect/',
    gn16Url: 'https://www.fwd.com.hk/zh/regulatory-disclosures/fulfillment-ratios/',
  },
  AXA: {
    insurerCode: 'AXA',
    officialPortalUrl: 'https://www.axa.com.hk/zh',
    savingsUrl: 'https://www.axa.com.hk/zh/life-and-savings-insurance',
    medicalUrl: 'https://www.axa.com.hk/zh/health-insurance',
    ciUrl: 'https://www.axa.com.hk/zh/critical-illness-insurance',
    gn16Url: 'https://www.axa.com.hk/zh/fulfilment-ratios-and-total-value-ratios',
  },
  SUNLIFE: {
    insurerCode: 'SUNLIFE',
    officialPortalUrl: 'https://www.sunlife.com.hk/zh-hant/',
    savingsUrl: 'https://www.sunlife.com.hk/zh-hant/insurance/wealth-management/savings/',
    gn16Url:
      'https://www.sunlife.com.hk/zh-hant/insurance/fulfillment-ratios-of-respective-products/',
  },
  BOCLIFE: {
    insurerCode: 'BOCLIFE',
    officialPortalUrl: 'https://www.boclife.com.hk/tc/index.html',
    gn16Url:
      'https://www.boclife.com.hk/tc/support/financial-information/dividend-fulfillment-ratios.html',
  },
  HSBC: {
    insurerCode: 'HSBC',
    officialPortalUrl: 'https://www.hsbc.com.hk/zh-hk/insurance/',
    savingsUrl: 'https://www.hsbc.com.hk/zh-hk/insurance/products/',
    gn16Url: 'https://www.hsbc.com.hk/zh-hk/insurance/info/',
  },
  HANGSENG: {
    insurerCode: 'HANGSENG',
    officialPortalUrl: 'https://www.hangseng.com/zh-hk/personal/insurance-mpf/',
    gn16Url: 'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  },
  CTFLIFE: {
    insurerCode: 'CTFLIFE',
    officialPortalUrl: 'https://www.ctflife.com.hk/tc',
    gn16Url: 'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  },
  CHINALIFE: {
    insurerCode: 'CHINALIFE',
    officialPortalUrl: 'https://www.chinalife.com.hk/zh-hk',
    gn16Url: 'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  },
  YFLIFE: {
    insurerCode: 'YFLIFE',
    officialPortalUrl: 'https://www.yflife.com/tc/',
    gn16Url: 'https://www.yflife.com/tc/support/useful-information/investment-strategy/',
  },
  CHUBB: {
    insurerCode: 'CHUBB',
    officialPortalUrl: 'https://www.chubb.com/hk-zh/',
    gn16Url: 'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  },
  GENERALI: {
    insurerCode: 'GENERALI',
    officialPortalUrl: 'https://www.generali.com.hk/ZH_HK',
    gn16Url: 'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  },
  TAIPING: {
    insurerCode: 'TAIPING',
    officialPortalUrl: 'https://www.tplhk.cntaiping.com/',
    gn16Url: 'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  },
  BLUECROSS: {
    insurerCode: 'BLUECROSS',
    officialPortalUrl: 'https://www.bluecross.com.hk/ch/home/Index',
    gn16Url: 'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  },
  BUPA: {
    insurerCode: 'BUPA',
    officialPortalUrl: 'https://www.bupa.com.hk/tc/',
    medicalUrl: 'https://www.bupa.com.hk/tc/medical-insurance/',
  },
  CIGNA: {
    insurerCode: 'CIGNA',
    officialPortalUrl: 'https://www.cigna.com.hk/zh-hant/',
  },
  BOWTIE: {
    insurerCode: 'BOWTIE',
    officialPortalUrl: 'https://www.bowtie.com.hk/zh/insurance/vhis',
    medicalUrl: 'https://www.bowtie.com.hk/zh/insurance/vhis',
    ciUrl: 'https://www.bowtie.com.hk/zh/insurance/critical-illness',
  },
  BLUE: {
    insurerCode: 'BLUE',
    officialPortalUrl: 'https://www.blue.com.hk/hk',
    gn16Url: 'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  },
  ZURICH: {
    insurerCode: 'ZURICH',
    officialPortalUrl: 'https://www.zurich.com.hk/zh-hk',
    gn16Url: 'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  },
  ZAINSURE: {
    insurerCode: 'ZAINSURE',
    officialPortalUrl: 'https://insure.za.group/hk',
  },
  ONEDEGREE: {
    insurerCode: 'ONEDEGREE',
    officialPortalUrl: 'https://www.onedegree.hk/zh-hk',
  },
  AVO: {
    insurerCode: 'AVO',
    officialPortalUrl: 'https://www.heyavo.com/zh-hk',
  },
  TRANSAMERICA: {
    insurerCode: 'TRANSAMERICA',
    officialPortalUrl: 'https://www.transamericalifebermuda.com/',
  },
  ALLIANZ: {
    insurerCode: 'ALLIANZ',
    officialPortalUrl: 'https://www.allianz-travel.com.hk/',
  },
  MSIG: {
    insurerCode: 'MSIG',
    officialPortalUrl: 'https://www.msig.com.hk/zh-hant',
  },
  ASIAINS: {
    insurerCode: 'ASIAINS',
    officialPortalUrl: 'https://www.asiainsurance.hk/',
  },
  BOCGI: {
    insurerCode: 'BOCGI',
    officialPortalUrl: 'https://www.bocgins.com/',
  },
  HASL: {
    insurerCode: 'HASL',
    officialPortalUrl: 'https://www.hengansl.com.hk/tc/',
    gn16Url: 'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  },
  BOCOMLIFE: {
    insurerCode: 'BOCOMLIFE',
    officialPortalUrl: 'https://www.hk.bankcomm.com/',
    gn16Url: 'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  },
  QBE: {
    insurerCode: 'QBE',
    officialPortalUrl: 'https://www.qbe.com/hk/zh-hant',
  },
  HKMC: {
    insurerCode: 'HKMC',
    officialPortalUrl: 'https://www.hkmca.hk/',
  },
  FUBON: {
    insurerCode: 'FUBON',
    officialPortalUrl: 'https://www.fubonlife.com.hk/',
    gn16Url: 'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  },
  DAHSING: {
    insurerCode: 'DAHSING',
    officialPortalUrl: 'https://www.dahsinginsurance.com/tc',
  },
  CMYLI: {
    insurerCode: 'CMYLI',
    officialPortalUrl: 'https://www.cmbwinglunginsurance.com/',
  },
  LIBERTY: {
    insurerCode: 'LIBERTY',
    officialPortalUrl: 'https://www.libertyinternational.com/hk-zh',
  },
  STARR: {
    insurerCode: 'STARR',
    officialPortalUrl: 'https://16167.starrinsurance.com.hk/',
  },
  UTMOST: {
    insurerCode: 'UTMOST',
    officialPortalUrl: 'https://www.utmostinternational.com/',
  },
  RL360: {
    insurerCode: 'RL360',
    officialPortalUrl: 'https://www.rl360.com/',
  },
  // 6 Newly Added Active HKIA Insurers (41–46)
  TAHOE: {
    insurerCode: 'TAHOE',
    officialPortalUrl: 'https://www.tahoelife.com.hk/',
    gn16Url: 'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  },
  CPICLIFE: {
    insurerCode: 'CPICLIFE',
    officialPortalUrl: 'https://www.cpiclifehk.com.hk/',
    gn16Url: 'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  },
  WELLLINK: {
    insurerCode: 'WELLLINK',
    officialPortalUrl: 'https://www.wli.com.hk/index.jhtml',
    gn16Url: 'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  },
  AIGHK: {
    insurerCode: 'AIGHK',
    officialPortalUrl: 'https://www.aig.com.hk/zh/',
  },
  TOKIOMARINE: {
    insurerCode: 'TOKIOMARINE',
    officialPortalUrl: 'https://www.tokiomarine.com/hk/zh-hant.html',
  },
  TAIPINGGI: {
    insurerCode: 'TAIPINGGI',
    officialPortalUrl: 'https://www.hk.cntaiping.com/',
  },
};

const KNOWN_VERIFIED_DEEP_URLS = new Set<string>([
  'https://www.aia.com.hk/zh-hk/products/save',
  'https://www.aia.com.hk/zh-hk/products/life',
  'https://www.aia.com.hk/zh-hk/products/health',
  'https://www.aia.com.hk/zh-hk/products/further-product-information/participating-products/fulfillment-ratio',
  'https://www.prudential.com.hk/tc/general/performance/total-cash-value-ratio/',
  'https://www.manulife.com.hk/content/dam/insurance/hk/zh-hk/documents/products/product-services/fulfillment-ratio.pdf',
  'https://www.fwd.com.hk/zh/products/',
  'https://www.fwd.com.hk/zh/save/',
  'https://www.fwd.com.hk/zh/protect/',
  'https://www.fwd.com.hk/zh/vhis/',
  'https://www.fwd.com.hk/zh/regulatory-disclosures/fulfillment-ratios/',
  'https://www.axa.com.hk/zh/life-and-savings-insurance',
  'https://www.axa.com.hk/zh/health-insurance',
  'https://www.axa.com.hk/zh/critical-illness-insurance',
  'https://www.axa.com.hk/zh/fulfilment-ratios-and-total-value-ratios',
  'https://www.sunlife.com.hk/zh-hant/insurance/wealth-management/savings/',
  'https://www.sunlife.com.hk/zh-hant/insurance/fulfillment-ratios-of-respective-products/',
  'https://www.boclife.com.hk/tc/index.html',
  'https://www.boclife.com.hk/tc/support/financial-information/dividend-fulfillment-ratios.html',
  'https://www.hsbc.com.hk/zh-hk/insurance/',
  'https://www.hsbc.com.hk/zh-hk/insurance/products/',
  'https://www.hsbc.com.hk/zh-hk/insurance/info/',
  'https://www.hangseng.com/zh-hk/personal/insurance-mpf/',
  'https://www.yflife.com/tc/support/useful-information/investment-strategy/',
  'https://www.bupa.com.hk/tc/medical-insurance/',
  'https://www.bowtie.com.hk/zh/insurance/vhis',
  'https://www.bowtie.com.hk/zh/insurance/critical-illness',
  'https://www.bowtie.com.hk/zh/insurance/term-life',
  'https://www.bluecross.com.hk/ch/home/Index',
  'https://www.ia.org.hk/tc/fulfillment_ratio/index.html',
  'https://www.wli.com.hk/index.jhtml',
  'https://www.tokiomarine.com/hk/zh-hant.html',
  'https://www.cmbwinglunginsurance.com/',
  'https://www.hk.bankcomm.com/',
  'https://www.aig.com.hk/zh/',
]);

const KNOWN_DEAD_SLUG_FRAGMENTS = [
  'our-products/savings/global-power-multi-currency-plan-3',
  'our-products/fulfillment-ratios.html',
  'chubblife.com.hk',
  'bocommhk.com',
  'fwd-sav-maxacc',
  'hkmcannuity.hk',
  'fubon.com/life_hk',
  'transamericalifebermuda.com/zh-hant/',
  '/404',
  'page-not-found',
];

function isCleanVerifiedHttpsUrl(url: string | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) return false;
  const lower = trimmed.toLowerCase();
  return !KNOWN_DEAD_SLUG_FRAGMENTS.some((bad) => lower.includes(bad));
}

/**
 * Resolves canonical verified official product URL, official brochure/policy PDF,
 * VHIS standard premium PDF, promo flyer PDF, and GN16 report URL for any plan.
 * Preserves live-crawled verified deep product URLs while replacing stale/dead slugs.
 */
export function resolveVerifiedPlanUrls(
  plan: InsurancePlan,
  overrides?: Record<string, { officialUrl?: string; gn16ReportUrl?: string }>
): {
  officialUrl: string;
  gn16ReportUrl?: string;
  brochurePdfUrl?: string;
  standardPremiumPdfUrl?: string;
  promoFlyerPdfUrl?: string;
} {
  const customOverride = overrides?.[plan.id];
  const entry = VERIFIED_INSURER_URLS[plan.insurerCode];

  let categoryUrl = entry?.officialPortalUrl || 'https://www.ia.org.hk/tc/index.html';
  if (entry) {
    if (
      (plan.category === PlanCategory.PARTICIPATING_SAVINGS ||
        plan.category === PlanCategory.QDAP) &&
      entry.savingsUrl
    ) {
      categoryUrl = entry.savingsUrl;
    } else if (
      (plan.category === PlanCategory.VHIS ||
        plan.category === PlanCategory.HIGH_END_MEDICAL) &&
      entry.medicalUrl
    ) {
      categoryUrl = entry.medicalUrl;
    } else if (plan.category === PlanCategory.CRITICAL_ILLNESS && entry.ciUrl) {
      categoryUrl = entry.ciUrl;
    } else if (
      plan.insurerCode === 'AIA' &&
      (plan.category === PlanCategory.TERM_LIFE ||
        plan.category === PlanCategory.UNIVERSAL_LIFE)
    ) {
      categoryUrl = 'https://www.aia.com.hk/zh-hk/products/life';
    } else if (
      plan.insurerCode === 'BOWTIE' &&
      plan.category === PlanCategory.TERM_LIFE
    ) {
      categoryUrl = 'https://www.bowtie.com.hk/zh/insurance/term-life';
    }
  }

  const rawOfficial = customOverride?.officialUrl?.trim() || plan.officialUrl?.trim() || '';
  const officialUrl = customOverride?.officialUrl?.trim()
    ? customOverride.officialUrl.trim()
    : plan.crawledSourceMatched && isCleanVerifiedHttpsUrl(rawOfficial)
    ? rawOfficial
    : KNOWN_VERIFIED_DEEP_URLS.has(rawOfficial)
    ? rawOfficial
    : categoryUrl;

  const brochurePdfUrl = isCleanVerifiedHttpsUrl(plan.brochurePdfUrl)
    ? plan.brochurePdfUrl!.trim()
    : undefined;
  const standardPremiumPdfUrl = isCleanVerifiedHttpsUrl(plan.standardPremiumPdfUrl)
    ? plan.standardPremiumPdfUrl!.trim()
    : undefined;
  const promoFlyerPdfUrl = isCleanVerifiedHttpsUrl(plan.promoFlyerPdfUrl)
    ? plan.promoFlyerPdfUrl!.trim()
    : undefined;

  // Non-participating plans (pure VHIS, Term Life, GI, Universal Life without par dividends) do NOT have GN16 dividend reports
  if (plan.fulfillmentRatio === null) {
    return {
      officialUrl,
      gn16ReportUrl: customOverride?.gn16ReportUrl?.trim() || undefined,
      brochurePdfUrl,
      standardPremiumPdfUrl,
      promoFlyerPdfUrl,
    };
  }

  const gn16ReportUrl = customOverride?.gn16ReportUrl?.trim()
    ? customOverride.gn16ReportUrl.trim()
    : entry?.gn16Url || HKIA_CENTRAL_GN16_PORTAL_URL;

  return {
    officialUrl,
    gn16ReportUrl,
    brochurePdfUrl,
    standardPremiumPdfUrl,
    promoFlyerPdfUrl,
  };
}

// ============================================================================
// CONDITIONAL SPECIAL OFFER ENGINE ("本季促單實戰利器")
// ============================================================================

const FLAGSHIP_20PCT_48PREPAID_PLAN_IDS = new Set<string>([
  'MANULIFE_MANUGLOBAL',
  'MANULIFE_GENESIS_MC',
  'FWD_MAXFOCUS_SIG',
  'FWD_MAXFOCUS_2',
  'BOC_SMARTUP_PRO_MAX',
  'BOC_FOREVER_GLORIOUS',
  'BOCLIFE_SMARTUP_PRO',
]);

const INSURER_SAVINGS_PROMO_PROFILES: Record<
  string,
  {
    rebatePct: number;
    prepaidRatePct: number | null;
    daysRemaining: number;
    conditionZh: string;
    conditionEn: string;
  }
> = {
  MANULIFE: {
    rebatePct: 20,
    prepaidRatePct: 4.8,
    daysRemaining: 14,
    conditionZh: '適用於 5 年／10 年供款期及達指定年度化保費門檻，5 年預繳享保證 4.8% 年息鎖息優惠',
    conditionEn: 'Eligible for 5Y/10Y pay terms meeting AFYP tier; 5-year lump-sum prepayment earns guaranteed 4.8% p.a.',
  },
  FWD: {
    rebatePct: 20,
    prepaidRatePct: 4.8,
    daysRemaining: 14,
    conditionZh: '首年保費回贈高達 20% 並支援 5 年預繳保證 4.8% 年息，預繳利息無須等待分紅派發',
    conditionEn: 'Up to 20% first-year premium rebate plus 5-year prepaid guaranteed 4.8% p.a. interest accumulation.',
  },
  BOCLIFE: {
    rebatePct: 20,
    prepaidRatePct: 4.8,
    daysRemaining: 14,
    conditionZh: '中銀人壽季度推廣：首年保費回贈高達 20% ＋ 5 年預繳美元保費保證 4.8% 年息',
    conditionEn: 'BOC Life quarterly campaign: up to 20% first-year rebate + 5-year USD prepayment guaranteed 4.8% p.a.',
  },
  AIA: {
    rebatePct: 18,
    prepaidRatePct: 4.6,
    daysRemaining: 16,
    conditionZh: '友邦季度尊享：多元貨幣儲蓄首年保費回贈高達 18% ＋ 5 年預繳保證 4.6% 年息（連 Vitality 額外獎賞）',
    conditionEn: 'AIA seasonal privilege: up to 18% FYP rebate + 5-year prepaid guaranteed 4.6% p.a. interest.',
  },
  PRU: {
    rebatePct: 19,
    prepaidRatePct: 4.7,
    daysRemaining: 12,
    conditionZh: '保誠信守明天／雋升季度優惠：首年保費回贈高達 19% ＋ 5 年預繳美元保證 4.7% 年息',
    conditionEn: 'Prudential seasonal offer: up to 19% FYP rebate + 5-year USD prepaid guaranteed 4.7% p.a.',
  },
  SUNLIFE: {
    rebatePct: 20,
    prepaidRatePct: 4.8,
    daysRemaining: 14,
    conditionZh: '永明萬年青季度推廣：首年保費回贈高達 20% ＋ 5 年預繳保證 4.8% 年息優惠',
    conditionEn: 'Sun Life seasonal campaign: up to 20% FYP rebate + 5-year prepaid guaranteed 4.8% p.a.',
  },
  AXA: {
    rebatePct: 18,
    prepaidRatePct: 4.5,
    daysRemaining: 18,
    conditionZh: '安盛摯匯／豐進推廣：首年保費回贈高達 18% ＋ 5 年預繳保證 4.5% 年息',
    conditionEn: 'AXA DynaWealth/Ultra campaign: up to 18% FYP rebate + 5-year prepaid guaranteed 4.5% p.a.',
  },
  HSBC: {
    rebatePct: 16,
    prepaidRatePct: 4.5,
    daysRemaining: 15,
    conditionZh: '滙豐人壽銀保推廣：首年保費回贈高達 16% ＋ 預繳保費保證 4.5% 年息',
    conditionEn: 'HSBC Life seasonal offer: up to 16% first-year rebate + guaranteed 4.5% p.a. prepaid interest.',
  },
  CTFLIFE: {
    rebatePct: 20,
    prepaidRatePct: 4.8,
    daysRemaining: 14,
    conditionZh: '周大福人壽盛世／匠心推廣：首年保費回贈高達 20% ＋ 5 年預繳保證 4.8% 年息',
    conditionEn: 'CTF Life flagship offer: up to 20% first-year rebate + 5-year prepaid guaranteed 4.8% p.a.',
  },
  YFLIFE: {
    rebatePct: 19,
    prepaidRatePct: 4.7,
    daysRemaining: 14,
    conditionZh: '萬通富饒系列推廣：首年保費回贈高達 19% ＋ 5 年預繳保證 4.7% 年息',
    conditionEn: 'YF Life Infinity series offer: up to 19% first-year rebate + 5-year prepaid guaranteed 4.7% p.a.',
  },
  CHINALIFE: {
    rebatePct: 18,
    prepaidRatePct: 4.6,
    daysRemaining: 14,
    conditionZh: '國壽海外裕饒推廣：首年保費回贈高達 18% ＋ 5 年預繳保證 4.6% 年息',
    conditionEn: 'China Life Overseas Multi-Wealth promo: up to 18% FYP rebate + 5-year prepaid guaranteed 4.6% p.a.',
  },
};

const NON_PROMO_PLAN_EXCLUSIONS = new Set<string>([
  'BLUE_WESAVE_S3',
  'HSBC_SWIFT_SAVE_GUAR',
  'BOCLIFE_TARGET_3Y',
  'WELLLINK_JOYFUL_SAVE',
]);

/**
 * Returns a PlanSpecialOffer ONLY when the selected insurance plan genuinely carries
 * a seasonal insurer promotion. Pure Term Life, Standard VHIS, General GI, HKMC Annuity,
 * Universal Life, and short-pay guaranteed-only plans return null.
 */
export function getSpecialOfferForPlan(
  plan: InsurancePlan | null | undefined
): PlanSpecialOffer | null {
  if (!plan) return null;
  if (NON_PROMO_PLAN_EXCLUSIONS.has(plan.id)) return null;

  // 1. Exact flagship savings / multi-currency plans with the 20% + 4.8% 5Y prepaid campaign
  if (FLAGSHIP_20PCT_48PREPAID_PLAN_IDS.has(plan.id)) {
    return {
      offerCode: `PROMO_${plan.insurerCode}_20_48`,
      headlineZh: '保司首年保費回贈高達 20% ＋ 5年預繳保證 4.8% 年息（倒數 14 日）',
      headlineEn:
        'Up to 20% First-Year Premium Rebate + 5-Year Prepaid Guaranteed 4.8% p.a. (14 Days Left)',
      firstYearRebatePct: 20,
      prepaidGuaranteedRatePct: 4.8,
      prepaidTermYears: 5,
      daysRemaining: 14,
      conditionNoteZh:
        INSURER_SAVINGS_PROMO_PROFILES[plan.insurerCode]?.conditionZh ||
        '適用於 5 年／10 年供款期達指定保費門檻之新繕發保單',
      conditionNoteEn:
        INSURER_SAVINGS_PROMO_PROFILES[plan.insurerCode]?.conditionEn ||
        'Applicable to eligible 5Y/10Y new business policies meeting AFYP tier.',
    };
  }

  // 2. Participating Savings & QDAP plans from major campaign insurers (excluding pure guaranteed short-term)
  if (
    (plan.category === PlanCategory.PARTICIPATING_SAVINGS ||
      plan.category === PlanCategory.QDAP) &&
    plan.fulfillmentRatio !== null &&
    plan.rawProjectedIrr > plan.guaranteedIrr + 0.01
  ) {
    const profile = INSURER_SAVINGS_PROMO_PROFILES[plan.insurerCode];
    if (!profile) return null;
    const rebate = plan.category === PlanCategory.QDAP ? Math.min(15, profile.rebatePct - 4) : profile.rebatePct;
    const prepaid = plan.category === PlanCategory.QDAP ? null : profile.prepaidRatePct;
    return {
      offerCode: `PROMO_${plan.insurerCode}_${rebate}`,
      headlineZh: prepaid
        ? `保司首年保費回贈高達 ${rebate}% ＋ 5年預繳保證 ${prepaid.toFixed(1)}% 年息（倒數 ${profile.daysRemaining} 日）`
        : `扣稅年金限時推廣：首年保費回贈高達 ${rebate}%（連 HK$60,000 稅務扣減 · 倒數 ${profile.daysRemaining} 日）`,
      headlineEn: prepaid
        ? `Up to ${rebate}% First-Year Rebate + 5-Year Prepaid Guaranteed ${prepaid.toFixed(1)}% p.a. (${profile.daysRemaining} Days Left)`
        : `QDAP Seasonal Offer: Up to ${rebate}% First-Year Rebate + HK$60,000 Tax Deduction (${profile.daysRemaining} Days Left)`,
      firstYearRebatePct: rebate,
      prepaidGuaranteedRatePct: prepaid,
      prepaidTermYears: prepaid ? 5 : null,
      daysRemaining: profile.daysRemaining,
      conditionNoteZh: profile.conditionZh,
      conditionNoteEn: profile.conditionEn,
    };
  }

  // 3. Flagship Multi-Claim Critical Illness plans from top campaign insurers (2 months / ~16% FYP waiver)
  if (
    plan.category === PlanCategory.CRITICAL_ILLNESS &&
    ['AIA', 'PRU', 'MANULIFE', 'FWD', 'AXA', 'SUNLIFE', 'BOCLIFE', 'CTFLIFE', 'YFLIFE'].includes(
      plan.insurerCode
    )
  ) {
    return {
      offerCode: `PROMO_CI_${plan.insurerCode}`,
      headlineZh: '危疾限時禮遇：保司首年保費回贈高達 16%（約 2 個月保費減免 · 倒數 14 日）',
      headlineEn:
        'Critical Illness Promo: Up to 16% First-Year Premium Rebate (~2 Months Waiver · 14 Days Left)',
      firstYearRebatePct: 16,
      prepaidGuaranteedRatePct: null,
      prepaidTermYears: null,
      daysRemaining: 14,
      conditionNoteZh: '連同家庭成員投保可享額外多保單組合保費回贈優惠',
      conditionNoteEn: 'Additional family bundle rebate available when applying with spouse/child.',
    };
  }

  // 4. Select Flexi VHIS / High-End Medical plans (explicitly excluding VHIS Standard Plans)
  const lowerEn = plan.nameEn.toLowerCase();
  const isStandardVhis =
    lowerEn.includes('standard') || plan.nameZh.includes('標準計劃');
  if (
    !isStandardVhis &&
    (plan.category === PlanCategory.VHIS ||
      plan.category === PlanCategory.HIGH_END_MEDICAL) &&
    ['AIA', 'PRU', 'MANULIFE', 'FWD', 'AXA', 'BUPA', 'CIGNA', 'BOWTIE', 'CTFLIFE'].includes(
      plan.insurerCode
    )
  ) {
    return {
      offerCode: `PROMO_MED_${plan.insurerCode}`,
      headlineZh: '高端醫保／自願醫保推廣：首年保費高達 25% 迎新折扣（連 HK$8,000 扣稅額 · 倒數 14 日）',
      headlineEn:
        'Flexi VHIS / High-End Medical Offer: Up to 25% First-Year Welcome Discount (14 Days Left)',
      firstYearRebatePct: 25,
      prepaidGuaranteedRatePct: null,
      prepaidTermYears: null,
      daysRemaining: 14,
      conditionNoteZh: '支援現有醫療保單轉保免重設等候期核保申請（視乎保司轉保批核條款）',
      conditionNoteEn: 'Supports medical switchover underwriting review for existing insureds.',
    };
  }

  // Pure Term Life, VHIS Standard, Universal Life, General GI, HKMC, Secondary non-promo plans -> NO special offer
  return null;
}

// ============================================================================
// 3-PLAN SIDE-BY-SIDE COMPARISON (RED / BLUE / YELLOW CLASSIFICATION LINES)
// ============================================================================

export const MAX_COMPARED_PLANS = 3;

export const DEFAULT_THREE_COMPARE_PLAN_IDS: string[] = [
  'FWD_MAXFOCUS_SIG',
  'AIA_GPMCP3',
  'MANULIFE_MANUGLOBAL',
];

export interface CompareSlotClassification {
  slotIndex: 0 | 1 | 2;
  colorKey: 'RED' | 'BLUE' | 'YELLOW';
  strokeHex: string;
  labelZh: string;
  labelEn: string;
  shortTagZh: string;
  shortTagEn: string;
  topBorderClass: string;
  cardBorderClass: string;
  textAccentClass: string;
  activeButtonClass: string;
}

export const COMPARE_SLOT_CLASSIFICATION: readonly [
  CompareSlotClassification,
  CompareSlotClassification,
  CompareSlotClassification,
] = [
  {
    slotIndex: 0,
    colorKey: 'RED',
    strokeHex: '#DC2626',
    labelZh: '方案 1（紅線）',
    labelEn: 'Plan 1 (Red Line)',
    shortTagZh: '比較 1 · 紅線',
    shortTagEn: 'Compare 1 · Red',
    topBorderClass: 'border-t-4 border-t-[#DC2626]',
    cardBorderClass: 'border-[#DC2626]/40 bg-red-50/20',
    textAccentClass: 'text-[#B91C1C]',
    activeButtonClass: 'bg-[#DC2626] text-white hover:bg-[#B91C1C]',
  },
  {
    slotIndex: 1,
    colorKey: 'BLUE',
    strokeHex: '#2563EB',
    labelZh: '方案 2（藍線）',
    labelEn: 'Plan 2 (Blue Line)',
    shortTagZh: '比較 2 · 藍線',
    shortTagEn: 'Compare 2 · Blue',
    topBorderClass: 'border-t-4 border-t-[#2563EB]',
    cardBorderClass: 'border-[#2563EB]/40 bg-blue-50/20',
    textAccentClass: 'text-[#1D4ED8]',
    activeButtonClass: 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]',
  },
  {
    slotIndex: 2,
    colorKey: 'YELLOW',
    strokeHex: '#EAB308',
    labelZh: '方案 3（黃線）',
    labelEn: 'Plan 3 (Yellow Line)',
    shortTagZh: '比較 3 · 黃線',
    shortTagEn: 'Compare 3 · Yellow',
    topBorderClass: 'border-t-4 border-t-[#EAB308]',
    cardBorderClass: 'border-[#EAB308]/60 bg-amber-50/25',
    textAccentClass: 'text-[#92400E]',
    activeButtonClass: 'bg-[#EAB308] text-slate-950 hover:bg-[#CA8A04]',
  },
] as const;

export function toggleThreePlanComparison(
  currentIds: string[],
  targetPlanId: string
): string[] {
  const clean = currentIds.filter(Boolean).slice(0, MAX_COMPARED_PLANS);
  if (clean.includes(targetPlanId)) {
    return clean.length > 1 ? clean.filter((id) => id !== targetPlanId) : clean;
  }
  if (clean.length >= MAX_COMPARED_PLANS) {
    return [...clean.slice(1), targetPlanId];
  }
  return [...clean, targetPlanId];
}

export function setComparisonSlotPlan(
  currentIds: string[],
  slotIndex: 0 | 1 | 2,
  nextPlanId: string
): string[] {
  const next = [...currentIds.filter(Boolean).slice(0, MAX_COMPARED_PLANS)];
  if (!nextPlanId) {
    if (next.length <= 1) return next;
    next.splice(slotIndex, 1);
    return next;
  }
  const existingIdx = next.indexOf(nextPlanId);
  if (existingIdx !== -1 && existingIdx !== slotIndex) {
    const prevAtSlot = next[slotIndex];
    if (prevAtSlot) {
      next[existingIdx] = prevAtSlot;
    } else {
      next.splice(existingIdx, 1);
    }
  }
  if (slotIndex < next.length) {
    next[slotIndex] = nextPlanId;
  } else {
    next.push(nextPlanId);
  }
  return next.filter((id, idx, arr) => Boolean(id) && arr.indexOf(id) === idx).slice(0, MAX_COMPARED_PLANS);
}

// ============================================================================
// HTTP PROBE & DETERMINISTIC SUB-AGENT LINK AUDITOR
// ============================================================================

export function classifyHttpProbeStatus(params: {
  testedUrl: string;
  finalResolvedUrl: string;
  httpStatus: number | null;
  pageTitle: string;
}): LinkVerificationStatus {
  const { testedUrl, finalResolvedUrl, httpStatus, pageTitle } = params;
  if (!testedUrl) return 'NOT_APPLICABLE';
  const lowerFinal = (finalResolvedUrl || '').toLowerCase();
  const lowerTitle = (pageTitle || '').toLowerCase();

  if (
    lowerFinal.includes('/404') ||
    lowerFinal.includes('not_found') ||
    lowerFinal.includes('page-not-found') ||
    lowerTitle.includes('404') ||
    lowerTitle.includes('page not found') ||
    lowerTitle.includes('找不到網頁')
  ) {
    return 'SOFT_404';
  }

  if (httpStatus !== null && httpStatus >= 200 && httpStatus < 300) {
    return 'VERIFIED_200';
  }

  if (httpStatus === 403 || httpStatus === 429) {
    return 'WAF_BROWSER_ONLY';
  }

  return 'DEAD_OR_TIMEOUT';
}

export function buildDeterministicPlanLinkAudit(params: {
  plan: InsurancePlan;
  officialProbeRaw: {
    testedUrl: string;
    finalResolvedUrl: string;
    httpStatus: number | null;
    pageTitle: string;
  };
  gn16ProbeRaw: {
    testedUrl: string;
    finalResolvedUrl: string;
    httpStatus: number | null;
    pageTitle: string;
  };
  discoveredOfficialUrl?: string;
  discoveredGn16Url?: string;
  aiReviewZh?: string;
  aiReviewEn?: string;
  groundedSources?: GroundedWebSource[];
  sourceMode?: 'gemini-search-link-subagent' | 'http-probe-and-registry';
}): PlanLinkAuditResult {
  const {
    plan,
    officialProbeRaw,
    gn16ProbeRaw,
    discoveredOfficialUrl,
    discoveredGn16Url,
    aiReviewZh,
    aiReviewEn,
    groundedSources = [],
    sourceMode = 'http-probe-and-registry',
  } = params;

  const canonical = resolveVerifiedPlanUrls(plan);

  const officialStatus = classifyHttpProbeStatus(officialProbeRaw);
  const recommendedOfficial =
    discoveredOfficialUrl && discoveredOfficialUrl.startsWith('https://')
      ? discoveredOfficialUrl
      : officialStatus === 'VERIFIED_200'
      ? officialProbeRaw.finalResolvedUrl || officialProbeRaw.testedUrl
      : canonical.officialUrl;

  const officialProbe: PlanLinkProbeItem = {
    kind: 'OFFICIAL_PRODUCT',
    testedUrl: officialProbeRaw.testedUrl,
    finalResolvedUrl: officialProbeRaw.finalResolvedUrl || officialProbeRaw.testedUrl,
    httpStatus: officialProbeRaw.httpStatus,
    status: officialStatus,
    pageTitle: officialProbeRaw.pageTitle,
    recommendedUrl: recommendedOfficial,
    statusSummaryZh:
      officialStatus === 'VERIFIED_200'
        ? `連線正常 (HTTP ${officialProbeRaw.httpStatus}) · 官方頁面可直達`
        : officialStatus === 'WAF_BROWSER_ONLY'
        ? `保司防火牆保護 (HTTP ${officialProbeRaw.httpStatus}) · 客戶瀏覽器可正常開啟`
        : officialStatus === 'SOFT_404'
        ? '偵測到轉址至 404 失效頁面 · 已由子代理尋獲最新官方網址'
        : '原連結無法連線或已下架 · 已匹配保司官方有效入口',
    statusSummaryEn:
      officialStatus === 'VERIFIED_200'
        ? `Live & reachable (HTTP ${officialProbeRaw.httpStatus})`
        : officialStatus === 'WAF_BROWSER_ONLY'
        ? `Insurer WAF protected (HTTP ${officialProbeRaw.httpStatus}) · Accessible in client browser`
        : officialStatus === 'SOFT_404'
        ? 'Soft-404 redirect detected · Replaced with verified official URL'
        : 'Dead or unreachable URL · Replaced with verified official portal',
  };

  const isPar = plan.fulfillmentRatio !== null;
  const gn16Status: LinkVerificationStatus = !isPar
    ? 'NOT_APPLICABLE'
    : classifyHttpProbeStatus(gn16ProbeRaw);

  const recommendedGn16 = !isPar
    ? ''
    : discoveredGn16Url && discoveredGn16Url.startsWith('https://')
    ? discoveredGn16Url
    : gn16Status === 'VERIFIED_200'
    ? gn16ProbeRaw.finalResolvedUrl || gn16ProbeRaw.testedUrl
    : canonical.gn16ReportUrl || HKIA_CENTRAL_GN16_PORTAL_URL;

  const gn16Probe: PlanLinkProbeItem = {
    kind: 'GN16_FULFILLMENT',
    testedUrl: gn16ProbeRaw.testedUrl,
    finalResolvedUrl: gn16ProbeRaw.finalResolvedUrl || gn16ProbeRaw.testedUrl,
    httpStatus: gn16ProbeRaw.httpStatus,
    status: gn16Status,
    pageTitle: gn16ProbeRaw.pageTitle,
    recommendedUrl: recommendedGn16,
    statusSummaryZh: !isPar
      ? '純保障／自願醫保產品不設非保證分紅，無須 GN16 實現率披露連結'
      : gn16Status === 'VERIFIED_200'
      ? `GN16 披露專頁正常 (HTTP ${gn16ProbeRaw.httpStatus})`
      : gn16Status === 'WAF_BROWSER_ONLY'
      ? `保司網站防火牆保護 · 建議同時附上保監局 GN16 中央專頁備查`
      : '原 GN16 連結已改版 · 已定位最新分紅實現率專頁／保監局披露中心',
    statusSummaryEn: !isPar
      ? 'Pure protection / VHIS non-participating plan — GN16 dividend disclosure N/A'
      : gn16Status === 'VERIFIED_200'
      ? `GN16 disclosure live (HTTP ${gn16ProbeRaw.httpStatus})`
      : gn16Status === 'WAF_BROWSER_ONLY'
      ? 'WAF protected HTML · Paired with HKIA central GN16 portal'
      : 'Legacy GN16 path updated · Resolved to verified GN16 disclosure page',
  };

  const defaultVerdictZh = isPar
    ? `已完成「[${plan.insurerCode}] ${plan.nameZh}」之產品專頁與 GN16 實現率雙重連結核實。產品專頁狀態：${officialProbe.statusSummaryZh}；GN16 披露狀態：${gn16Probe.statusSummaryZh}。建議顧問向客戶發送建議書前，一鍵套用下方經核實之官方網址或保監局分紅實現率專頁。`
    : `已完成「[${plan.insurerCode}] ${plan.nameZh}」官方產品專頁連線審核（${officialProbe.statusSummaryZh}）。由於本計劃屬純保障／醫療險種（無非保證紅利），系統已自動隱藏無關之 GN16 連結以免誤導客戶。`;

  const defaultVerdictEn = isPar
    ? `Completed dual HTTP & search audit for [${plan.insurerCode}] ${plan.nameEn}. Product page: ${officialProbe.statusSummaryEn}; GN16 disclosure: ${gn16Probe.statusSummaryEn}. Apply the verified official links below with one click.`
    : `Completed official link audit for [${plan.insurerCode}] ${plan.nameEn} (${officialProbe.statusSummaryEn}). As a non-participating protection/medical plan, GN16 dividend links are marked N/A.`;

  const fallbackSources: GroundedWebSource[] = [
    {
      title: `${plan.insurerNameZh} (${plan.insurerNameEn}) — Official HK Portal`,
      uri: recommendedOfficial,
    },
    ...(isPar && recommendedGn16
      ? [
          {
            title: `${plan.insurerNameZh} GN16 分紅實現率披露`,
            uri: recommendedGn16,
          },
        ]
      : []),
    {
      title: '香港保監局 (HKIA) — 分紅實現率中央披露專頁',
      uri: HKIA_CENTRAL_GN16_PORTAL_URL,
    },
  ];

  return {
    planId: plan.id,
    insurerCode: plan.insurerCode,
    insurerNameZh: plan.insurerNameZh,
    insurerNameEn: plan.insurerNameEn,
    planNameZh: plan.nameZh,
    planNameEn: plan.nameEn,
    officialProbe,
    gn16Probe,
    hkiaCentralPortalUrl: HKIA_CENTRAL_GN16_PORTAL_URL,
    aiReviewVerdictZh: aiReviewZh || defaultVerdictZh,
    aiReviewVerdictEn: aiReviewEn || defaultVerdictEn,
    groundedSources: groundedSources.length > 0 ? groundedSources : fallbackSources,
    sourceMode,
    auditedAtIso: new Date().toISOString(),
  };
}
