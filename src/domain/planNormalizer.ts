import {
  CrmStandardCategory,
  CurrencyCode,
  InsurancePlan,
  PlanCategory,
} from './types';

export interface RawImportedPlanInput {
  id?: string;
  insurerCode?: string;
  insurerNameEn?: string;
  insurerNameZh?: string;
  nameEn?: string;
  nameZh?: string;
  rawCategoryText?: string;
  rawFeaturesText?: string;
  currencies?: string[];
  fulfillmentRatio?: number | null;
  rawProjectedIrr?: number;
  guaranteedIrr?: number;
  supportedPaymentTerms?: number[];
  waitingPeriodText?: string;
  highlights?: string[];
  keyHighlightsEn?: string[];
  keyHighlightsZh?: string[];
  officialUrl?: string;
}

export interface NormalizedPlanClassification {
  crmStandardCategory: CrmStandardCategory;
  planCategory: PlanCategory;
  categoryLabelEn: string;
  categoryLabelZh: string;
  standardizedHighlightsEn: [string, string, string];
  standardizedHighlightsZh: [string, string, string];
  confidenceReason: string;
}

export const CATEGORY_TAXONOMY_META: Record<
  PlanCategory,
  {
    crmStandardCategory: CrmStandardCategory;
    labelEn: string;
    labelZh: string;
    defaultRate: number;
    defaultIrr: number;
    defaultGuaranteedIrr: number;
    defaultTerms: number[];
    defaultCurrencies: CurrencyCode[];
    taxDeductibleCapHkd: number | null;
    defaultFulfillment: number | null;
  }
> = {
  [PlanCategory.PARTICIPATING_SAVINGS]: {
    crmStandardCategory: 'Savings',
    labelEn: 'Participating Savings',
    labelZh: '儲蓄分紅壽險',
    defaultRate: 49.2,
    defaultIrr: 0.065,
    defaultGuaranteedIrr: 0.0125,
    defaultTerms: [5, 10, 15],
    defaultCurrencies: ['USD', 'HKD', 'RMB'],
    taxDeductibleCapHkd: null,
    defaultFulfillment: 99,
  },
  [PlanCategory.CRITICAL_ILLNESS]: {
    crmStandardCategory: 'Critical Illness',
    labelEn: 'Critical Illness',
    labelZh: '多重危疾保障',
    defaultRate: 23.0,
    defaultIrr: 0.046,
    defaultGuaranteedIrr: 0.01,
    defaultTerms: [10, 15, 20, 25],
    defaultCurrencies: ['USD', 'HKD'],
    taxDeductibleCapHkd: null,
    defaultFulfillment: 98,
  },
  [PlanCategory.VHIS]: {
    crmStandardCategory: 'Medical',
    labelEn: 'VHIS Certified Medical',
    labelZh: '自願醫保認可計劃',
    defaultRate: 6.2,
    defaultIrr: 0,
    defaultGuaranteedIrr: 0,
    defaultTerms: [1],
    defaultCurrencies: ['HKD', 'USD'],
    taxDeductibleCapHkd: 8000,
    defaultFulfillment: null,
  },
  [PlanCategory.HIGH_END_MEDICAL]: {
    crmStandardCategory: 'Medical',
    labelEn: 'High-End & Outpatient Medical',
    labelZh: '高端醫療及門診',
    defaultRate: 9.8,
    defaultIrr: 0,
    defaultGuaranteedIrr: 0,
    defaultTerms: [1],
    defaultCurrencies: ['HKD', 'USD'],
    taxDeductibleCapHkd: null,
    defaultFulfillment: null,
  },
  [PlanCategory.QDAP]: {
    crmStandardCategory: 'Tax Annuity',
    labelEn: 'QDAP Tax Annuity',
    labelZh: '合資格延期年金',
    defaultRate: 46.2,
    defaultIrr: 0.048,
    defaultGuaranteedIrr: 0.021,
    defaultTerms: [5, 10],
    defaultCurrencies: ['HKD', 'USD'],
    taxDeductibleCapHkd: 60000,
    defaultFulfillment: 100,
  },
  [PlanCategory.UNIVERSAL_LIFE]: {
    crmStandardCategory: 'Life',
    labelEn: 'Universal Life / HNW',
    labelZh: '萬用壽險 / 財富傳承',
    defaultRate: 31.5,
    defaultIrr: 0.046,
    defaultGuaranteedIrr: 0.022,
    defaultTerms: [5, 10],
    defaultCurrencies: ['USD'],
    taxDeductibleCapHkd: null,
    defaultFulfillment: null,
  },
  [PlanCategory.TERM_LIFE]: {
    crmStandardCategory: 'Life',
    labelEn: 'Pure Term Life',
    labelZh: '純人壽定期保障',
    defaultRate: 2.3,
    defaultIrr: 0,
    defaultGuaranteedIrr: 0,
    defaultTerms: [10, 15, 20, 25],
    defaultCurrencies: ['HKD', 'USD'],
    taxDeductibleCapHkd: null,
    defaultFulfillment: null,
  },
  [PlanCategory.GENERAL_GI]: {
    crmStandardCategory: 'General Insurance',
    labelEn: 'Travel, Home & General GI',
    labelZh: '旅遊家居及一般保險',
    defaultRate: 1.8,
    defaultIrr: 0,
    defaultGuaranteedIrr: 0,
    defaultTerms: [1],
    defaultCurrencies: ['HKD'],
    taxDeductibleCapHkd: null,
    defaultFulfillment: null,
  },
};

export function mapPlanCategoryToCrmStandard(cat: PlanCategory): CrmStandardCategory {
  return CATEGORY_TAXONOMY_META[cat]?.crmStandardCategory ?? 'Savings';
}

/**
 * Deterministic Hong Kong policy feature analyzer & highlight standardizer.
 * Serves both as the fast local classifier and resilient fallback for Gemini API normalization.
 */
export function classifyPolicyFeaturesDeterministically(
  input: RawImportedPlanInput
): NormalizedPlanClassification {
  const combinedBlob = [
    input.nameEn || '',
    input.nameZh || '',
    input.rawCategoryText || '',
    input.rawFeaturesText || '',
    input.waitingPeriodText || '',
    ...(input.highlights || []),
    ...(input.keyHighlightsEn || []),
    ...(input.keyHighlightsZh || []),
  ]
    .join(' ')
    .toLowerCase();

  let planCategory: PlanCategory = PlanCategory.PARTICIPATING_SAVINGS;
  let confidenceReason = 'Matched multi-currency / dividend accumulation savings signals';

  if (
    /qdap|deferred annuity|延期年金|扣稅年金|合資格延期年金/.test(combinedBlob)
  ) {
    planCategory = PlanCategory.QDAP;
    confidenceReason = 'Detected IA-certified QDAP deferred annuity & HK$60,000 tax relief features';
  } else if (
    /travel|旅遊|maid|domestic helper|家傭|外傭|home insurance|家居|火險|pet|寵物|motor|汽車|personal accident|個人意外/.test(
      combinedBlob
    )
  ) {
    planCategory = PlanCategory.GENERAL_GI;
    confidenceReason = 'Detected General Insurance (Travel / Helper / Home / Pet / PA) coverage features';
  } else if (
    /vhis|自願醫保|voluntary health/.test(combinedBlob)
  ) {
    planCategory = PlanCategory.VHIS;
    confidenceReason = 'Detected HKSAR Health Bureau VHIS certified medical features & HK$8,000 tax relief';
  } else if (
    /medical|hospital|inpatient|outpatient|dental|clinic|global health|醫療|住院|門診|牙科|私家房|半私家/.test(
      combinedBlob
    ) &&
    !/critical illness|危疾|cancer multi|多重危疾/.test(combinedBlob)
  ) {
    planCategory = PlanCategory.HIGH_END_MEDICAL;
    confidenceReason = 'Detected inpatient/outpatient medical reimbursement & direct-billing network features';
  } else if (
    /critical illness|ci\b|crisis|cancer|stroke|heart attack|carcinoma|危疾|嚴重疾病|原位癌|中風|心臟病/.test(
      combinedBlob
    )
  ) {
    planCategory = PlanCategory.CRITICAL_ILLNESS;
    confidenceReason = 'Detected critical illness lump-sum & major organ condition protection features';
  } else if (
    /universal life|iul|indexed universal|crediting rate|premium financing|萬用壽險|指數萬用|保費融資|派息率/.test(
      combinedBlob
    )
  ) {
    planCategory = PlanCategory.UNIVERSAL_LIFE;
    confidenceReason = 'Detected Universal Life crediting account & HNW estate/financing structure';
  } else if (
    /term life|pure life|定期壽險|定期人壽|純人壽|level premium life/.test(combinedBlob)
  ) {
    planCategory = PlanCategory.TERM_LIFE;
    confidenceReason = 'Detected pure term life death-benefit protection without savings accumulation';
  } else {
    planCategory = PlanCategory.PARTICIPATING_SAVINGS;
  }

  const meta = CATEGORY_TAXONOMY_META[planCategory];
  const insurerEn = input.insurerNameEn || input.insurerCode || 'HK Authorized Insurer';
  const insurerZh = input.insurerNameZh || input.insurerCode || '香港獲授權保司';

  // Build standardized 3-tier CRM highlights if raw highlights lack standardized structure
  const rawEn = (input.keyHighlightsEn && input.keyHighlightsEn.length > 0
    ? input.keyHighlightsEn
    : input.highlights || []
  ).map((s) => s.trim()).filter(Boolean);
  const rawZh = (input.keyHighlightsZh || []).map((s) => s.trim()).filter(Boolean);

  const defaultTemplates: Record<
    PlanCategory,
    { en: [string, string, string]; zh: [string, string, string] }
  > = {
    [PlanCategory.PARTICIPATING_SAVINGS]: {
      en: [
        `[Core Return] Long-term participating wealth accumulation by ${insurerEn} subject to HKIA GL28 illustration caps (6.0% HKD / 6.5% Non-HKD)`,
        '[Flexibility] Multi-currency conversion, partial withdrawal & policy-split options for multi-generational legacy planning',
        '[CRM Suitability] Ideal for education funding, retirement passive cashflow & cross-border asset succession (GL30 FNA required)',
      ],
      zh: [
        `【核心回報】由${insurerZh}承保之長線分紅儲蓄計劃，嚴格遵守保監局 GL28 演示上限（港元 6.0%／非港元 6.5%）`,
        '【靈活傳承】支援多元貨幣轉換、保單分拆及定期提領現金流，靈活配合三代財富傳承',
        '【客戶定位】適合籌備子女海外升學基金及退休長糧規劃（須完成 GL30 財務需要分析）',
      ],
    },
    [PlanCategory.CRITICAL_ILLNESS]: {
      en: [
        `[Core Protection] Lump-sum Critical Illness & early-stage condition cover by ${insurerEn} protecting household income`,
        '[Multi-Claim Mechanics] Supports cancer, stroke & cardiac recurrence protection with future premium waiver after major claim',
        '[CRM Suitability] Core family income-replacement shield bridging 3–5x annual salary recovery gap',
      ],
      zh: [
        `【核心保障】由${insurerZh}提供一筆過嚴重及早期危疾應急現金賠償，守護家庭收入來源`,
        '【多重守護】針對癌症、中風及心臟病提供持續保障，首次嚴重索償後豁免往後保費',
        '【客戶定位】填補年收入 3–5 倍康復期收入缺口之核心家庭保障配置',
      ],
    },
    [PlanCategory.VHIS]: {
      en: [
        `[Core Medical] HKSAR Health Bureau certified VHIS plan by ${insurerEn} with guaranteed renewal up to age 100`,
        '[Hospital Network] Covers unknown pre-existing conditions, diagnostic imaging (CT/MRI/PET) & non-surgical cancer therapy',
        '[Tax & LOG] Qualifies for up to HK$8,000 annual IRD Salaries Tax deduction per insured relative + Private Hospital LOG support',
      ],
      zh: [
        `【核心醫療】由${insurerZh}承保之醫務衞生局認可自願醫保計劃，保證續保至 100 歲`,
        '【保障範圍】涵蓋未知投保前已有病症、訂明診斷成像檢測（CT／MRI／PET）及非手術癌症治療',
        '【扣稅及免找數】每名受保親屬享高達 HK$8,000 薪俸稅扣減，並支援私家醫院免找數預批',
      ],
    },
    [PlanCategory.HIGH_END_MEDICAL]: {
      en: [
        `[Core Medical] High-limit inpatient & surgical reimbursement by ${insurerEn} across private semi-private/private rooms`,
        '[Direct Billing] Cashless Letter of Guarantee (LOG) & clinical medical card access across Hong Kong & regional hospitals',
        '[CRM Suitability] Ideal for executives, expats & families seeking zero-sub-limit private hospital protection',
      ],
      zh: [
        `【核心醫療】由${insurerZh}提供高保額私家醫院半私家房／私家房全數住院及手術保障`,
        '【直付網絡】配備入院免找數預先批核（LOG）及專科／門診醫療網絡支援',
        '【客戶定位】適合企業高管及追求養和／港怡／明德全數保障之家庭客戶',
      ],
    },
    [PlanCategory.QDAP]: {
      en: [
        `[Core Annuity] HKIA-certified Qualifying Deferred Annuity Policy (QDAP) by ${insurerEn} providing guaranteed monthly retirement income`,
        '[Payout Transparency] Clearly discloses Guaranteed IRR floor alongside non-guaranteed terminal/monthly annuity dividends',
        '[Tax Relief] Eligible for up to HK$60,000 annual HK Salaries Tax deduction per taxpayer (HK$120,000 for married couples)',
      ],
      zh: [
        `【核心年金】由${insurerZh}承保之保監局認證合資格延期年金（QDAP），派發穩定每月退休保證年金`,
        '【回報透明】清晰列明保證內部回報率底線及非保證年金紅利結構',
        '【稅務優惠】每位納稅人每年最高享 HK$60,000 薪俸稅扣減（夫婦合併最高 HK$120,000）',
      ],
    },
    [PlanCategory.UNIVERSAL_LIFE]: {
      en: [
        `[Core Structure] High-sum-assured USD Universal Life policy by ${insurerEn} with transparent crediting interest rate`,
        '[Liquidity & Collateral] High Day-1 guaranteed cash value ratio compatible with private bank collateral & trust ownership',
        '[CRM Suitability] Tailored for HNW estate equalization, key-person business cover & interest-spread planning',
      ],
      zh: [
        `【核心結構】由${insurerZh}承保之高額美元萬用壽險，採用透明派息率及保證最低派息底線機制`,
        '【資產流動性】首日高保證現金價值比率，兼容私人銀行保單融資抵押及家族信託架構',
        '【客戶定位】專為高淨值人士資產傳承、遺產流動性及企業要員保障而設',
      ],
    },
    [PlanCategory.TERM_LIFE]: {
      en: [
        `[Core Life] Pure high-leverage Term Life protection by ${insurerEn} with level premiums across fixed coverage horizon`,
        '[Renewability] Guaranteed renewal & conversion privilege without medical re-underwriting prior to specified age',
        '[CRM Suitability] Cost-effective mortgage hedge & breadwinner 10x-income family protection',
      ],
      zh: [
        `【核心人壽】由${insurerZh}提供純人壽高槓桿定期保障，供款期內保費維持均衡不變`,
        '【續保保證】保證續保並設免核保轉換終身壽險權利，鎖定健康核保資格',
        '【客戶定位】極高性價比對沖樓宇按揭負債及家庭經濟支柱 10 倍年薪保障缺口',
      ],
    },
    [PlanCategory.GENERAL_GI]: {
      en: [
        `[Core GI Protection] Annual / single-event General Insurance protection by ${insurerEn} for everyday Hong Kong lifestyle risks`,
        '[Fast Claims] Digital e-policy issuance & streamlined online claim settlement for medical, liability & property loss',
        '[CRM Cross-Sell] High-frequency household touchpoint door-opener (Travel, Domestic Helper EC, Home & Pet)',
      ],
      zh: [
        `【核心一般險】由${insurerZh}承保之香港日常及家庭風險保障（旅遊／外傭勞保／家居／寵物／意外）`,
        '【極速理賠】支援即時簽發電子保單及網上快速索償審批服務',
        '【客戶經營】高頻率家庭保單切入點，協助顧問建立全天候客戶關係及交叉銷售',
      ],
    },
  };

  const prefixesEn = ['[Coverage] ', '[Features] ', '[Suitability] '] as const;
  const prefixesZh = ['【核心保障】', '【產品亮點】', '【適用客群】'] as const;

  const ensurePrefix = (text: string, prefix: string) => {
    if (/^(\[[^\]]+\]|【[^】]+】)/.test(text.trim())) return text.trim();
    return `${prefix}${text.trim()}`;
  };

  const standardizedHighlightsEn: [string, string, string] = [
    rawEn[0]
      ? ensurePrefix(rawEn[0], prefixesEn[0])
      : defaultTemplates[planCategory].en[0],
    rawEn[1]
      ? ensurePrefix(rawEn[1], prefixesEn[1])
      : defaultTemplates[planCategory].en[1],
    rawEn[2]
      ? ensurePrefix(rawEn[2], prefixesEn[2])
      : defaultTemplates[planCategory].en[2],
  ];

  const standardizedHighlightsZh: [string, string, string] = [
    rawZh[0]
      ? ensurePrefix(rawZh[0], prefixesZh[0])
      : defaultTemplates[planCategory].zh[0],
    rawZh[1]
      ? ensurePrefix(rawZh[1], prefixesZh[1])
      : defaultTemplates[planCategory].zh[1],
    rawZh[2]
      ? ensurePrefix(rawZh[2], prefixesZh[2])
      : defaultTemplates[planCategory].zh[2],
  ];

  return {
    crmStandardCategory: meta.crmStandardCategory,
    planCategory,
    categoryLabelEn: meta.labelEn,
    categoryLabelZh: meta.labelZh,
    standardizedHighlightsEn,
    standardizedHighlightsZh,
    confidenceReason,
  };
}

/**
 * Parses unstructured text, CSV lines, or JSON array into RawImportedPlanInput items.
 */
export function parseUnstructuredPlansInput(rawInput: string): RawImportedPlanInput[] {
  const trimmed = rawInput.trim();
  if (!trimmed) return [];

  // 1. Try JSON object or array
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.plans)
        ? parsed.plans
        : [parsed];
      return arr
        .filter((item: any) => item && typeof item === 'object')
        .map((item: any) => ({
          id: item.id ? String(item.id) : undefined,
          insurerCode: item.insurerCode || item.insurer || undefined,
          insurerNameEn: item.insurerNameEn || item.insurer || undefined,
          insurerNameZh: item.insurerNameZh || undefined,
          nameEn: item.nameEn || item.planName || item.name || 'Imported HK Plan',
          nameZh: item.nameZh || item.planNameZh || item.nameEn || '匯入香港保險計劃',
          rawCategoryText: item.category ? String(item.category) : undefined,
          rawFeaturesText:
            item.features ||
            item.description ||
            item.rawFeaturesText ||
            (Array.isArray(item.highlights) ? item.highlights.join('; ') : ''),
          currencies: Array.isArray(item.currencies) ? item.currencies : undefined,
          fulfillmentRatio:
            typeof item.fulfillmentRatio === 'number' ? item.fulfillmentRatio : undefined,
          rawProjectedIrr:
            typeof item.rawProjectedIrr === 'number' ? item.rawProjectedIrr : undefined,
          guaranteedIrr:
            typeof item.guaranteedIrr === 'number' ? item.guaranteedIrr : undefined,
          supportedPaymentTerms: Array.isArray(item.supportedPaymentTerms)
            ? item.supportedPaymentTerms
            : undefined,
          waitingPeriodText: item.waitingPeriodText,
          highlights: Array.isArray(item.highlights) ? item.highlights : undefined,
          keyHighlightsEn: Array.isArray(item.keyHighlightsEn) ? item.keyHighlightsEn : undefined,
          keyHighlightsZh: Array.isArray(item.keyHighlightsZh) ? item.keyHighlightsZh : undefined,
          officialUrl: item.officialUrl,
        }));
    } catch {
      // Fall through to line/paragraph parser
    }
  }

  // 2. Parse line-by-line or paragraph blocks separated by blank lines / pipes
  const blocks = trimmed
    .split(/\n\s*\n|\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 6 && !line.startsWith('#'));

  return blocks.slice(0, 25).map((line, index) => {
    // Format supported: "Insurer | Plan Name EN | Plan Name ZH | Policy features..."
    const parts = line.split(/\s*\|\s*|\t/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      return {
        insurerNameEn: parts[0],
        insurerCode: parts[0].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12),
        nameEn: parts[1],
        nameZh: parts[2],
        rawFeaturesText: parts.slice(3).join(' — ') || line,
      };
    }
    return {
      insurerCode: 'HKINS',
      insurerNameEn: 'HK Authorized Insurer',
      insurerNameZh: '香港獲授權保司',
      nameEn: line.slice(0, 64),
      nameZh: line.slice(0, 64),
      rawFeaturesText: line,
      id: `IMPORTED_RAW_${index + 1}`,
    };
  });
}

/**
 * Merges a RawImportedPlanInput and NormalizedPlanClassification into a clean, CRM-consistent InsurancePlan.
 */
export function buildStandardizedInsurancePlan(
  raw: RawImportedPlanInput,
  classification: NormalizedPlanClassification,
  index = 0
): InsurancePlan {
  const meta = CATEGORY_TAXONOMY_META[classification.planCategory];
  const code =
    String(raw.insurerCode || raw.insurerNameEn || 'HKINS')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 12) || 'HKINS';
  const slug =
    String(raw.nameEn || `PLAN_${index + 1}`)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24) || `PLAN_${index + 1}`;

  const validCurrs = (raw.currencies || []).filter((c): c is CurrencyCode =>
    ['USD', 'HKD', 'RMB'].includes(c)
  );

  return {
    id: raw.id || `NORM_${code}_${slug}`,
    insurerCode: code,
    insurerNameEn: raw.insurerNameEn || code,
    insurerNameZh: raw.insurerNameZh || raw.insurerNameEn || '香港獲授權保司',
    nameEn: raw.nameEn || 'Standardized HK Insurance Plan',
    nameZh: raw.nameZh || raw.nameEn || '標準化香港保險計劃',
    category: classification.planCategory,
    categoryLabelEn: classification.categoryLabelEn,
    categoryLabelZh: classification.categoryLabelZh,
    crmStandardCategory: classification.crmStandardCategory,
    currencies: validCurrs.length > 0 ? validCurrs : meta.defaultCurrencies,
    fulfillmentRatio:
      raw.fulfillmentRatio !== undefined ? raw.fulfillmentRatio : meta.defaultFulfillment,
    rawProjectedIrr:
      typeof raw.rawProjectedIrr === 'number' ? raw.rawProjectedIrr : meta.defaultIrr,
    guaranteedIrr:
      typeof raw.guaranteedIrr === 'number' ? raw.guaranteedIrr : meta.defaultGuaranteedIrr,
    baseRatePer1000UsdAge35Ns: meta.defaultRate,
    supportedPaymentTerms:
      raw.supportedPaymentTerms && raw.supportedPaymentTerms.length > 0
        ? raw.supportedPaymentTerms
        : meta.defaultTerms,
    taxDeductibleCapHkd: meta.taxDeductibleCapHkd,
    waitingPeriodText:
      raw.waitingPeriodText || 'Standardized under HKIA policy schedule & CRM taxonomy',
    highlights: [...classification.standardizedHighlightsEn],
    keyHighlightsEn: [...classification.standardizedHighlightsEn],
    keyHighlightsZh: [...classification.standardizedHighlightsZh],
    submissionChannel: 'SMART_ACROFORM_STP',
    officialUrl: raw.officialUrl,
    provenanceTier: 'LIVE_SEARCH_GROUNDED',
    normalizedAtIso: new Date().toISOString(),
  };
}
