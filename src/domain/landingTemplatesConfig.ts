import { CurrencyCode } from './types';

export type LandingTemplateId =
  | 'T1_DAYLIGHT_FINTECH'
  | 'T2_ARCHIVAL_BROADSHEET'
  | 'T3_SWISS_INTERNATIONAL'
  | 'T4_FAMILY_OFFICE_CINEMA'
  | 'T5_SPATIAL_KINETIC_3D';

export const DEFAULT_PRODUCTION_LANDING_TEMPLATE: LandingTemplateId =
  'T4_FAMILY_OFFICE_CINEMA';

export const LANDING_TEMPLATE_STORAGE_KEY = 'hk_insurehub_selected_landing_template_v2';

export interface LandingTemplateMeta {
  id: LandingTemplateId;
  shortCode: string;
  pillLabelEn: string;
  pillLabelZh: string;
  nameEn: string;
  nameZh: string;
  studioReferenceEn: string;
  studioReferenceZh: string;
  summaryEn: string;
  summaryZh: string;
  canvasHex: string;
  surfaceHex: string;
  accentHex: string;
  isLightTheme: boolean;
}

export const LANDING_TEMPLATES_CATALOG: LandingTemplateMeta[] = [
  {
    id: 'T1_DAYLIGHT_FINTECH',
    shortCode: '01',
    pillLabelEn: 'Daylight',
    pillLabelZh: '清爽白底',
    nameEn: 'Daylight Product Studio',
    nameZh: '日間清爽白底版',
    studioReferenceEn: 'Stripe · Mercury · Ramp',
    studioReferenceZh: '清爽淺色介面',
    summaryEn:
      'Crisp daylight white canvas with an interactive multi-tab workbench preview window, live KPI strip, and sunlit studio imagery.',
    summaryZh:
      '白底藍字設計，首頁直接預覽跨公司比較表、客戶名單同保障缺口圖，清晰易睇。',
    canvasHex: '#F8FAFC',
    surfaceHex: '#FFFFFF',
    accentHex: '#1D4ED8',
    isLightTheme: true,
  },
  {
    id: 'T2_ARCHIVAL_BROADSHEET',
    shortCode: '02',
    pillLabelEn: 'Editorial',
    pillLabelZh: '書刊風格',
    nameEn: 'Archival Wealth Monograph',
    nameZh: '柔和米白書刊版',
    studioReferenceEn: 'Monocle · Financial Times · Lombard Odier',
    studioReferenceZh: '財經書刊排版',
    summaryEn:
      'Warm archival cotton paper (#F6F2EA), terracotta editorial ink, high-contrast serif masthead, drop-cap essay, and Leica Central photography.',
    summaryZh:
      '柔和米白底色配襯線字體同中環街景相片，感覺斯文穩重，啱晒同熟客慢慢傾。',
    canvasHex: '#F6F2EA',
    surfaceHex: '#EFE9DC',
    accentHex: '#9A3412',
    isLightTheme: true,
  },
  {
    id: 'T3_SWISS_INTERNATIONAL',
    shortCode: '03',
    pillLabelEn: 'Swiss Grid',
    pillLabelZh: '簡約方格',
    nameEn: 'Zurich Architectural Grid',
    nameZh: '簡約方格數據版',
    studioReferenceEn: 'Swiss International Style · Bauhaus',
    studioReferenceZh: '簡約直線方格',
    summaryEn:
      'Stark gallery white with exposed 1.5px jet-black structural rules, monumental grotesque numerals, Swiss vermilion accents, and live 3-plan matrix.',
    summaryZh:
      '純白底色配清楚黑線同大字體數字，三款計劃回報並排一目了然。',
    canvasHex: '#FFFFFF',
    surfaceHex: '#F4F4F5',
    accentHex: '#DC2626',
    isLightTheme: true,
  },
  {
    id: 'T4_FAMILY_OFFICE_CINEMA',
    shortCode: '04',
    pillLabelEn: 'Cinema',
    pillLabelZh: '維港黃昏',
    nameEn: 'Harbour Family Office Cinema',
    nameZh: '維港黃昏專業顧問版',
    studioReferenceEn: 'Aman · Sotheby’s · Architectural Digest',
    studioReferenceZh: '中環維港實景配暖米白版面',
    summaryEn:
      'Full-bleed golden-hour photograph of a high-floor Central boardroom overlooking Victoria Harbour paired with warm travertine & bronze sections.',
    summaryZh:
      '以中環望維港黃昏會議室相片開場，下面配暖米白底色、2 分鐘廣東話教學片同常見客戶個案。',
    canvasHex: '#141210',
    surfaceHex: '#F5EFE6',
    accentHex: '#C59B5F',
    isLightTheme: false,
  },
  {
    id: 'T5_SPATIAL_KINETIC_3D',
    shortCode: '05',
    pillLabelEn: 'Spatial 3D',
    pillLabelZh: '3D 互動',
    nameEn: 'Spatial 3D Horological Lab',
    nameZh: '3D 動態回報展示版',
    studioReferenceEn: 'Awwwards WebGL · Linear · Three.js',
    studioReferenceZh: '3D 立體圖表展示',
    summaryEn:
      'Interactive 12-part Three.js Horological Wealth Astrolabe & Parametric Yield Wave with exploded-calibre camera choreography and 30-year IRR curve.',
    summaryZh:
      '以 3D 立體模型配合 30 年預期回報曲線，適合展示長線儲蓄增長。',
    canvasHex: '#050810',
    surfaceHex: '#080E1A',
    accentHex: '#DFBD69',
    isLightTheme: false,
  },
];

export function resolveInitialLandingTemplate(
  searchQuery: string,
  storedValue: string | null
): LandingTemplateId {
  const validIds = new Set<LandingTemplateId>(LANDING_TEMPLATES_CATALOG.map((t) => t.id));
  const shortMap: Record<string, LandingTemplateId> = {
    '1': 'T1_DAYLIGHT_FINTECH',
    t1: 'T1_DAYLIGHT_FINTECH',
    daylight: 'T1_DAYLIGHT_FINTECH',
    '2': 'T2_ARCHIVAL_BROADSHEET',
    t2: 'T2_ARCHIVAL_BROADSHEET',
    editorial: 'T2_ARCHIVAL_BROADSHEET',
    '3': 'T3_SWISS_INTERNATIONAL',
    t3: 'T3_SWISS_INTERNATIONAL',
    swiss: 'T3_SWISS_INTERNATIONAL',
    '4': 'T4_FAMILY_OFFICE_CINEMA',
    t4: 'T4_FAMILY_OFFICE_CINEMA',
    cinema: 'T4_FAMILY_OFFICE_CINEMA',
    '5': 'T5_SPATIAL_KINETIC_3D',
    t5: 'T5_SPATIAL_KINETIC_3D',
    '3d': 'T5_SPATIAL_KINETIC_3D',
  };

  if (searchQuery) {
    try {
      const params = new URLSearchParams(
        searchQuery.startsWith('?') ? searchQuery : `?${searchQuery}`
      );
      const rawParam = (params.get('template') || '').trim();
      if (validIds.has(rawParam as LandingTemplateId)) {
        return rawParam as LandingTemplateId;
      }
      const mapped = shortMap[rawParam.toLowerCase()];
      if (mapped) return mapped;
    } catch {
      // ignore malformed query string
    }
  }

  if (storedValue && validIds.has(storedValue as LandingTemplateId)) {
    return storedValue as LandingTemplateId;
  }

  return DEFAULT_PRODUCTION_LANDING_TEMPLATE;
}

export interface SandboxMandateOption {
  leadId: 'lead-henry-wang' | 'lead-daniel-chan' | 'lead-vanessa-lin';
  clientEn: string;
  clientZh: string;
  profileEn: string;
  profileZh: string;
  schemeEn: string;
  schemeZh: string;
  annualHkd: number;
  termYears: number;
  guaranteedRate: number;
  nonGuaranteedRate: number;
  gapCoveragePct: number;
  hospitalTierEn: string;
  hospitalTierZh: string;
}

export const LANDING_SANDBOX_MANDATES: SandboxMandateOption[] = [
  {
    leadId: 'lead-henry-wang',
    clientEn: 'Henry Wang · Age 52',
    clientZh: '王建宏 · 52 歲（企業老闆）',
    profileEn: 'Cross-Border Legacy & Retirement Income',
    profileZh: '多元貨幣保單分拆傳承 ＋ 退休每年定期提款',
    schemeEn: '5-Pay Multi-Currency Participating Savings',
    schemeZh: '5 年供款多元貨幣儲蓄計劃（美金／港幣／人民幣）',
    annualHkd: 390000,
    termYears: 5,
    guaranteedRate: 0.0135,
    nonGuaranteedRate: 0.0515,
    gapCoveragePct: 96,
    hospitalTierEn: 'Asia Private Ward · Cashless LOG Pre-Approved',
    hospitalTierZh: '亞洲私家房全數賠償 · 入院免找數安排',
  },
  {
    leadId: 'lead-daniel-chan',
    clientEn: 'Daniel Chan · Age 36',
    clientZh: '陳冠宇 · 36 歲（有小朋友家庭）',
    profileEn: 'HK$4.5M Mortgage Cover + Semi-Private VHIS',
    profileZh: '450 萬供樓人壽保障 ＋ 養和／港怡半私家房醫療',
    schemeEn: '10-Pay Family Comprehensive 3-in-1 Portfolio',
    schemeZh: '10 年供款一家大細人壽＋危疾＋自願醫保組合',
    annualHkd: 48000,
    termYears: 10,
    guaranteedRate: 0.0115,
    nonGuaranteedRate: 0.0465,
    gapCoveragePct: 92,
    hospitalTierEn: 'HK Sanitarium / Gleneagles Semi-Private $0 Out-of-Pocket',
    hospitalTierZh: '養和／港怡半私家房做手術全數包晒，唔使自己貼錢',
  },
  {
    leadId: 'lead-vanessa-lin',
    clientEn: 'Vanessa Lin · Age 31',
    clientZh: '林雅婷 · 31 歲（中環上班族）',
    profileEn: 'VHIS Tax Deduction + Multi-Claim CI (+50% Boost)',
    profileZh: '自願醫保慳稅計劃 ＋ 多重危疾保障（首 10 年多送 50% 保額）',
    schemeEn: '15-Pay Multi-CI + Flexi VHIS Top-Up',
    schemeZh: '15 年供款多重危疾 ＋ 設有墊底費自願醫保（接駁公司醫保）',
    annualHkd: 36000,
    termYears: 15,
    guaranteedRate: 0.0105,
    nonGuaranteedRate: 0.0425,
    gapCoveragePct: 94,
    hospitalTierEn: 'Group Med Deductible Bridge + HK$8,000 Tax Cap',
    hospitalTierZh: '夾返公司醫療保險墊底費，每年仲可以扣稅最多 HK$8,000',
  },
];

const FX_DIVISOR_MAP: Record<CurrencyCode, { rateFromHkd: number; symbol: string }> = {
  HKD: { rateFromHkd: 1, symbol: 'HK$' },
  USD: { rateFromHkd: 1 / 7.8, symbol: 'US$' },
  RMB: { rateFromHkd: 0.92, symbol: '¥' },
};

export function computeLandingActuarialSandbox(
  mandate: SandboxMandateOption,
  currency: CurrencyCode,
  dividendStressPct: 100 | 90 | 85
) {
  const fx = FX_DIVISOR_MAP[currency];
  const annualContribution = Math.round(mandate.annualHkd * fx.rateFromHkd);
  const totalPrincipal = annualContribution * mandate.termYears;
  const stressedNonGuaranteedRate =
    mandate.nonGuaranteedRate * (dividendStressPct / 100);
  // Enforce HKIA GL28 participating illustration cap: 6.0% HKD, 6.5% Non-HKD
  const gl28Cap = currency === 'HKD' ? 0.06 : 0.065;
  const totalEffectiveRate = Math.min(
    gl28Cap,
    mandate.guaranteedRate + stressedNonGuaranteedRate
  );

  const points: Array<{
    year: number;
    paidIn: number;
    guaranteed: number;
    projected: number;
  }> = [];

  let guarAccum = 0;
  let projAccum = 0;
  let breakevenYear = 8;
  let foundBreakeven = false;

  for (let yr = 1; yr <= 30; yr++) {
    const premThisYear = yr <= mandate.termYears ? annualContribution : 0;
    const earlySurrenderFactor = yr === 1 ? 0.18 : yr === 2 ? 0.52 : yr < 5 ? 0.78 : 1;
    guarAccum = (guarAccum + premThisYear) * (1 + mandate.guaranteedRate);
    projAccum = (projAccum + premThisYear) * (1 + totalEffectiveRate);

    const guaranteedVal = Math.round(
      guarAccum * (yr < mandate.termYears ? earlySurrenderFactor : 0.94)
    );
    const projectedVal = Math.round(
      Math.max(
        guaranteedVal,
        projAccum * (yr < 4 ? earlySurrenderFactor + 0.12 : 1)
      )
    );
    const cumulativePaid = annualContribution * Math.min(yr, mandate.termYears);

    if (!foundBreakeven && yr >= mandate.termYears && projectedVal >= cumulativePaid) {
      breakevenYear = yr;
      foundBreakeven = true;
    }

    points.push({
      year: yr,
      paidIn: cumulativePaid,
      guaranteed: guaranteedVal,
      projected: projectedVal,
    });
  }

  const yr20 = points[19];
  const yr30 = points[29];
  return {
    fxSymbol: fx.symbol,
    annualContribution,
    totalPrincipal,
    effectiveIrrPct: (totalEffectiveRate * 100).toFixed(2),
    gl28CapPct: (gl28Cap * 100).toFixed(1),
    breakevenYear,
    year20Projected: yr20.projected,
    year20Guaranteed: yr20.guaranteed,
    year30Projected: yr30.projected,
    year20Multiple: (yr20.projected / Math.max(1, totalPrincipal)).toFixed(2),
    points,
  };
}
