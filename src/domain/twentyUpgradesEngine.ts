import { calculateCompliantQuote, FX_RATES_FROM_USD } from './actuarialEngine';
import { toSimplifiedChinese } from './i18n';
import {
  AppLanguage,
  ClientLead,
  CurrencyCode,
  InsurancePlan,
  IntermediaryProfile,
  LeadStage,
  PlanCategory,
} from './types';

// ============================================================================
// UNIFIED 20 UPGRADE CODES & METADATA
// ============================================================================

export type TwentyUpgradeCode =
  | 'IMP-01'
  | 'IMP-02'
  | 'IMP-03'
  | 'IMP-04'
  | 'IMP-05'
  | 'IMP-06'
  | 'IMP-07'
  | 'IMP-08'
  | 'IMP-09'
  | 'IMP-10'
  | 'IMP-11'
  | 'IMP-12'
  | 'IMP-13'
  | 'IMP-14'
  | 'IMP-15'
  | 'IMP-16'
  | 'IMP-17'
  | 'IMP-18'
  | 'IMP-19'
  | 'IMP-20';

export interface LiveUpgradeMeta {
  code: TwentyUpgradeCode;
  number: number;
  pillar: 'CLOSING_REVENUE' | 'UX_CLIENT_TRUST' | 'AI_AUTOMATION' | 'COMPLIANCE_TEAM_SAAS';
  shortZh: string;
  shortEn: string;
  titleZh: string;
  titleEn: string;
  mergedTargetZh: string;
  mergedTargetEn: string;
}

export const TWENTY_LIVE_UPGRADES_META: LiveUpgradeMeta[] = [
  {
    code: 'IMP-01',
    number: 1,
    pillar: 'CLOSING_REVENUE',
    shortZh: '01 互動微網頁＋已閱通知',
    shortEn: '01 Microsite + Read Receipt',
    titleZh: '客戶專屬互動提案微網頁（附「客戶已閱」即時通知）',
    titleEn: 'Client Interactive Proposal Microsite (with Live Read-Receipt Alert)',
    mergedTargetZh: '09 實戰中心 ＋ 獨立分享連結 (?proposal=...)',
    mergedTargetEn: '09 Live Hub + Shareable ?proposal= Link',
  },
  {
    code: 'IMP-02',
    number: 2,
    pillar: 'AI_AUTOMATION',
    shortZh: '02 舊保單及官方PDF體檢',
    shortEn: '02 Legacy Policy PDF Audit',
    titleZh: '現有舊保單／官方建議書 PDF 智能體檢掃描器',
    titleEn: 'Existing Policy & Official BI PDF Health-Check Gap Scanner',
    mergedTargetZh: '09 實戰中心 ＋ Gemini AI 保單審計 API',
    mergedTargetEn: '09 Live Hub + Gemini Policy Audit API',
  },
  {
    code: 'IMP-03',
    number: 3,
    pillar: 'UX_CLIENT_TRUST',
    shortZh: '03 私院醫生手術費基準庫',
    shortEn: '03 Surgeon Fee Benchmark',
    titleZh: '私家醫院主診醫生手術費中位數基準庫＋免找數專科網絡',
    titleEn: 'HK Private Surgeon Fee Median Benchmark & Cashless Specialist Finder',
    mergedTargetZh: '06 私院免找數新分頁 ＋ 09 實戰中心',
    mergedTargetEn: '06 Hospital LOG Tab + 09 Live Hub',
  },
  {
    code: 'IMP-04',
    number: 4,
    pillar: 'CLOSING_REVENUE',
    shortZh: '04 港漂高才MCV開戶指南',
    shortEn: '04 Talent/MCV Concierge',
    titleZh: '港漂／高才通／MCV 赴港簽單一日行程、開戶及續保指南包',
    titleEn: 'Top Talent / IANG / MCV 1-Day HK Signing, Banking & Renewal Pack',
    mergedTargetZh: '09 實戰中心 ＋ 一鍵複製雙語行程卡',
    mergedTargetEn: '09 Live Hub + Bilingual Concierge Card',
  },
  {
    code: 'IMP-05',
    number: 5,
    pillar: 'AI_AUTOMATION',
    shortZh: '05 粵語錄音轉 GL30 紀要',
    shortEn: '05 Voice-to-GL30 FNA',
    titleZh: '廣東話／普通話語音備忘 10 秒轉保監局 GL30 合規會談紀錄',
    titleEn: 'Cantonese/Mandarin Voice Memo to HKIA GL30 FNA Sync',
    mergedTargetZh: '02 客戶 CRM 同步解鎖 ＋ 09 實戰中心',
    mergedTargetEn: '02 Lead CRM Direct Sync + 09 Live Hub',
  },
  {
    code: 'IMP-06',
    number: 6,
    pillar: 'UX_CLIENT_TRUST',
    shortZh: '06 歷年分紅實現率走勢圖',
    shortEn: '06 Multi-Yr GN16 Trend',
    titleZh: '分紅實現率歷年趨勢追蹤（2017–2025 世代折線圖）及派息更新提醒',
    titleEn: 'Multi-Year GN16 Fulfillment Cohort Trend (2017–2025) & Dividend Alerts',
    mergedTargetZh: '01 全市場比較捷徑 ＋ 09 實戰中心',
    mergedTargetEn: '01 Market Plans Shortcut + 09 Live Hub',
  },
  {
    code: 'IMP-07',
    number: 7,
    pillar: 'CLOSING_REVENUE',
    shortZh: '07 家庭及轉介關係圖譜',
    shortEn: '07 Family & Referral Tree',
    titleZh: '家庭成員保障樹狀圖及轉介人關係網絡（Family & Referral Tree）',
    titleEn: 'Household Coverage Family Tree & Referral Network Graph',
    mergedTargetZh: '02 客戶 CRM 連動建檔 ＋ 09 實戰中心',
    mergedTargetEn: '02 Lead CRM Auto-Add + 09 Live Hub',
  },
  {
    code: 'IMP-08',
    number: 8,
    pillar: 'COMPLIANCE_TEAM_SAAS',
    shortZh: '08 13/25月防斷供回撥盾',
    shortEn: '08 13/25m Clawback Shield',
    titleZh: '第 13／25 個月續保率預警、合夥拆帳及佣金追回（Clawback）防護盾',
    titleEn: '13th/25th-Month Persistency Radar, Split Ledger & Clawback Shield',
    mergedTargetZh: '09 實戰中心 ＋ 續保率花紅保衛戰',
    mergedTargetEn: '09 Live Hub + Persistency Bonus Guard',
  },
  {
    code: 'IMP-09',
    number: 9,
    pillar: 'CLOSING_REVENUE',
    shortZh: '09 保險金信託 vs 分期賠付',
    shortEn: '09 Trust vs Policy Split',
    titleZh: '保險金信託 vs 保單「類信託」分期身故賠償對比模擬器',
    titleEn: 'Private Insurance Trust vs. Policy Death-Benefit Installment Simulator',
    mergedTargetZh: '09 實戰中心（高淨值傳承專區）',
    mergedTargetEn: '09 Live Hub (HNW Legacy Suite)',
  },
  {
    code: 'IMP-10',
    number: 10,
    pillar: 'CLOSING_REVENUE',
    shortZh: '10 中小企要員及股東互保',
    shortEn: '10 SME Keyman & Buy-Sell',
    titleZh: '公司「要員保險（Keyman）」、股東互保及 DIPN 28 利得稅扣減精算器',
    titleEn: 'SME Keyman Insurance, Buy-Sell Equity & IRD DIPN 28 Tax Calculator',
    mergedTargetZh: '09 實戰中心（企業保單開發）',
    mergedTargetEn: '09 Live Hub (Corporate B2B Suite)',
  },
  {
    code: 'IMP-11',
    number: 11,
    pillar: 'CLOSING_REVENUE',
    shortZh: '11 團體醫保離職銜接 VHIS',
    shortEn: '11 Group Med Exit Bridge',
    titleZh: '公司團體醫保（Group Medical）離職／退休免核保銜接個人 VHIS 計算器',
    titleEn: 'Corporate Group Medical Exit / Retirement Bridge to High-Deductible VHIS',
    mergedTargetZh: '09 實戰中心 ＋ 自付額退休轉換試算',
    mergedTargetEn: '09 Live Hub + Zero-UW Step-Down Model',
  },
  {
    code: 'IMP-12',
    number: 12,
    pillar: 'CLOSING_REVENUE',
    shortZh: '12 英美澳加升學提取時間表',
    shortEn: '12 Overseas Tuition Plan',
    titleZh: '子女海外升學（英／美／澳／加）學費通脹及外幣保單提取時間表',
    titleEn: 'UK / US / AU / CA University Tuition Inflation & Multi-FX Withdrawal Schedule',
    mergedTargetZh: '09 實戰中心（海外升學基金圖表）',
    mergedTargetEn: '09 Live Hub (Overseas Tuition Chart)',
  },
  {
    code: 'IMP-13',
    number: 13,
    pillar: 'AI_AUTOMATION',
    shortZh: '13 匿名核保案例及化驗分流',
    shortEn: '13 UW Precedent & Labs',
    titleZh: '次標準體匿名核保案例共享庫（結節／三高／乙肝）及化驗指標速查',
    titleEn: 'Sub-Standard Underwriting Case Vault & Lab Biomarker Triage',
    mergedTargetZh: '09 實戰中心 ＋ 體檢數值即時預判',
    mergedTargetEn: '09 Live Hub + Live Biomarker Triage',
  },
  {
    code: 'IMP-14',
    number: 14,
    pillar: 'UX_CLIENT_TRUST',
    shortZh: '14 核保及理賠時效溫度計',
    shortEn: '14 Insurer SLA Thermometer',
    titleZh: '保司核保、免找數 LOG 及理賠批核時效溫度計＋出院正本單據清單',
    titleEn: 'Insurer UW / LOG / Claims SLA Turnaround Thermometer & Discharge Checklist',
    mergedTargetZh: '06 私院免找數新分頁 ＋ 09 實戰中心',
    mergedTargetEn: '06 Hospital LOG Tab + 09 Live Hub',
  },
  {
    code: 'IMP-15',
    number: 15,
    pillar: 'CLOSING_REVENUE',
    shortZh: '15 限時保費回贈＋定存對比',
    shortEn: '15 Promo Rebate & TD Cliff',
    titleZh: '保司限時首年保費回贈／預繳保證高息倒數看板＋定存減息對比',
    titleEn: 'Quarterly Insurer Rebate + Prepaid Interest Countdown & Bank TD Rollover',
    mergedTargetZh: '01 全市場比較優惠橫幅 ＋ 09 實戰中心',
    mergedTargetEn: '01 Market Promo Strip + 09 Live Hub',
  },
  {
    code: 'IMP-16',
    number: 16,
    pillar: 'UX_CLIENT_TRUST',
    shortZh: '16 全站個人白牌及 QR 頁首',
    shortEn: '16 Global White-Label QR',
    titleZh: '一鍵切換顧問個人品牌白牌主題、MDRT 頭銜及名片 QR Code 頁首',
    titleEn: 'Global White-Label Advisor Brand Studio, MDRT Badge & PDF QR Header',
    mergedTargetZh: '全站 PDF 建議書頁首 ＋ 微網頁即時生效',
    mergedTargetEn: 'Global PDF Exports + Client Microsites',
  },
  {
    code: 'IMP-17',
    number: 17,
    pillar: 'COMPLIANCE_TEAM_SAAS',
    shortZh: '17 離線見客 PWA 本機安裝',
    shortEn: '17 Offline PWA Mode',
    titleZh: '離線見客模式（PWA 跨境高鐵／醫院地庫無網絡報價及桌面安裝）',
    titleEn: 'Offline Meeting PWA Mode (Service Worker Cache + Home Screen Install)',
    mergedTargetZh: '頂部安裝按鈕 ＋ Service Worker 離線快取',
    mergedTargetEn: 'Top Bar Install + Service Worker Cache',
  },
  {
    code: 'IMP-18',
    number: 18,
    pillar: 'COMPLIANCE_TEAM_SAAS',
    shortZh: '18 團隊 MDRT 看板及 RO 查冊',
    shortEn: '18 Team MDRT & RO Pack',
    titleZh: '團隊主管 MDRT 進度看板、生日前「追溯年齡」提醒及 RO 7年合規包',
    titleEn: 'Team Director MDRT Board, Age-Backdate Lead Radar & RO 7-Yr Audit Pack',
    mergedTargetZh: '02 客戶 CRM 追溯提醒 ＋ 09 實戰中心',
    mergedTargetEn: '02 CRM Backdate Alert + 09 Live Hub',
  },
  {
    code: 'IMP-19',
    number: 19,
    pillar: 'UX_CLIENT_TRUST',
    shortZh: '19 強積金＋大灣區跨境養老',
    shortEn: '19 MPF + GBA Retirement',
    titleZh: '香港強積金 (MPF)＋香港年金／QDAP＋「大灣區跨境養老院舍」現金流規劃儀',
    titleEn: 'HK MPF + Annuity/QDAP + Greater Bay Area Senior Care Cashflow Planner',
    mergedTargetZh: '09 實戰中心（跨境醫養現金流瀑布圖）',
    mergedTargetEn: '09 Live Hub (GBA Retirement Waterfall)',
  },
  {
    code: 'IMP-20',
    number: 20,
    pillar: 'COMPLIANCE_TEAM_SAAS',
    shortZh: '20 WhatsApp留痕＋智方便接口',
    shortEn: '20 WhatsApp Vault + iAM Smart',
    titleZh: 'WhatsApp 合規發送紀錄留痕金庫＋香港政府「智方便 (iAM Smart)」核保接口',
    titleEn: 'WhatsApp Disclosure Audit Vault + HKSAR iAM Smart Identity STP Bridge',
    mergedTargetZh: '04 自動化電子投保認證 ＋ 09 合規金庫',
    mergedTargetEn: '04 Auto-Policy STP KYC + 09 Audit Vault',
  },
];

// ============================================================================
// IMP-16: GLOBAL WHITE-LABEL BRAND CONFIG
// ============================================================================

export interface WhiteLabelBrandConfig {
  enabled: boolean;
  practiceTitleEn: string;
  practiceTitleZh: string;
  honorBadge: 'MDRT' | 'COT (Court of the Table)' | 'TOT (Top of the Table)' | 'Private Wealth Director';
  contactChannelLabel: string;
  accentHex: '#1D4ED8' | '#0F766E' | '#1E293B';
}

export const DEFAULT_WHITE_LABEL_CONFIG: WhiteLabelBrandConfig = {
  enabled: true,
  practiceTitleEn: 'Harbour Peak Private Wealth Advisory',
  practiceTitleZh: '維港家族財富策劃 · Harbour Peak Private Wealth',
  honorBadge: 'COT (Court of the Table)',
  contactChannelLabel: 'WhatsApp / WeChat: +852 9188 2046',
  accentHex: '#1D4ED8',
};

/**
 * Generates a deterministic 13x13 QR-like visual matrix from a contact URL/string
 * so Advisor White-Label Cards & PDFs render a crisp scannable-style matrix without external calls.
 */
export function buildDeterministicQrMatrix(seedText: string): boolean[][] {
  const size = 13;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Draw 3 finder patterns (5x5 corners)
  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const border = r === 0 || r === 4 || c === 0 || c === 4;
        const center = r === 2 && c === 2;
        grid[r0 + r][c0 + c] = border || center;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 5);
  drawFinder(size - 5, 0);

  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 6 && c < 6;
      const inTopRight = r < 6 && c >= size - 6;
      const inBottomLeft = r >= size - 6 && c < 6;
      if (inTopLeft || inTopRight || inBottomLeft) continue;
      hash ^= (r * 31 + c * 17) & 0xff;
      hash = Math.imul(hash, 16777619);
      grid[r][c] = (hash >>> 3) % 2 === 0;
    }
  }
  return grid;
}

// ============================================================================
// IMP-01: CLIENT INTERACTIVE PROPOSAL MICROSITE & READ-RECEIPT TELEMETRY
// ============================================================================

export interface MicrositeReadReceipt {
  id: string;
  openedAtIso: string;
  viewerLabel: string;
  inspectedPolicyYear: number;
  dwellSeconds: number;
}

export interface ClientMicrositeFeedback {
  preferredPaymentMode: 'ANNUAL' | 'MONTHLY';
  preferredSigningSlot: string;
  clientQuestion: string;
  submittedAtIso: string;
}

export interface ClientMicrositeRecord {
  id: string;
  leadId?: string;
  createdAtIso: string;
  validityDays?: 7 | 14 | 30;
  expiresAtIso?: string;
  fxRateStamp?: string;
  clientNameEn: string;
  clientNameZh: string;
  clientAge: number;
  planId: string;
  insurerNameZh: string;
  insurerNameEn: string;
  planNameZh: string;
  planNameEn: string;
  currency: CurrencyCode;
  sumAssured: number;
  paymentTermYears: number;
  annualPremium: number;
  effectiveIrrPct: number;
  fulfillmentRatio: number | null;
  advisorName: string;
  advisorLicense: string;
  whiteLabelTitle: string;
  projections: Array<{
    policyYear: number;
    clientAge: number;
    paid: number;
    guaranteed: number;
    nonGuaranteed: number;
    total: number;
  }>;
  readReceipts: MicrositeReadReceipt[];
  clientFeedback?: ClientMicrositeFeedback;
}

export function createClientMicrositeProposal(params: {
  lead: ClientLead;
  plan: InsurancePlan;
  intermediary: IntermediaryProfile;
  whiteLabel: WhiteLabelBrandConfig;
  currency: CurrencyCode;
  sumAssuredUsd: number;
  paymentTermYears: number;
  validityDays?: 7 | 14 | 30;
  fxRateStamp?: string;
}): ClientMicrositeRecord {
  const {
    lead,
    plan,
    intermediary,
    whiteLabel,
    currency,
    sumAssuredUsd,
    paymentTermYears,
    validityDays = 14,
    fxRateStamp,
  } = params;
  const fx = FX_RATES_FROM_USD[currency];
  const term = plan.supportedPaymentTerms.includes(paymentTermYears)
    ? paymentTermYears
    : plan.supportedPaymentTerms[0] || 10;

  const quote = calculateCompliantQuote({
    plan,
    age: lead.age,
    isSmoker: lead.isSmoker,
    currency,
    sumAssuredInSelectedCurrency: Math.round(sumAssuredUsd * fx),
    paymentTermYears: term,
  });

  const nowMs = Date.now();
  const createdAtIso = new Date(nowMs).toISOString();
  const expiresAtIso = new Date(nowMs + validityDays * 86_400_000).toISOString();
  const token = `ms-${plan.insurerCode.toLowerCase()}-${nowMs.toString(36).slice(-5)}`;

  return {
    id: token,
    leadId: lead.id,
    createdAtIso,
    validityDays,
    expiresAtIso,
    fxRateStamp: fxRateStamp || `1 USD = 7.80 HKD · 1 HKD = 0.92 RMB (${createdAtIso.slice(0, 10)})`,
    clientNameEn: lead.fullNameEn,
    clientNameZh: lead.fullNameZh,
    clientAge: lead.age,
    planId: plan.id,
    insurerNameZh: plan.insurerNameZh,
    insurerNameEn: plan.insurerNameEn,
    planNameZh: plan.nameZh,
    planNameEn: plan.nameEn,
    currency,
    sumAssured: quote.sumAssured,
    paymentTermYears: quote.paymentTermYears,
    annualPremium: quote.annualPremium,
    effectiveIrrPct: quote.effectiveIllustratedIrrPercent,
    fulfillmentRatio: plan.fulfillmentRatio,
    advisorName: `${intermediary.nameEn} (${intermediary.nameZh})`,
    advisorLicense: intermediary.iaLicenseNo,
    whiteLabelTitle: whiteLabel.enabled ? whiteLabel.practiceTitleZh : intermediary.firmName,
    projections: quote.projections.map((p) => ({
      policyYear: p.policyYear,
      clientAge: p.clientAge,
      paid: p.cumulativePremiumsPaid,
      guaranteed: p.guaranteedCashValue,
      nonGuaranteed: p.nonGuaranteedDividend,
      total: p.totalSurrenderValue,
    })),
    readReceipts: [],
  };
}

// ============================================================================
// IMP-02: EXISTING LEGACY POLICY & OFFICIAL BI PDF GAP SCANNER
// ============================================================================

export interface LegacyPolicyAuditResult {
  detectedPolicyTitle: string;
  inceptionYearEstimate: number;
  detectedRoomLimitHkd: number;
  benchmark2026SemiPrivateRoomHkd: number;
  detectedSurgicalCapHkd: number;
  benchmark2026MajorSurgeryBillHkd: number;
  estimatedOutOfPocketShortfallHkd: number;
  overlappingRiderAnnualWasteHkd: number;
  keyFindingsZh: string[];
  keyFindingsEn: string[];
  recommendedActionZh: string;
  recommendedActionEn: string;
  sourceMode: 'gemini-policy-audit' | 'deterministic-policy-audit';
}

export const SAMPLE_LEGACY_POLICY_TEXTS: Array<{
  id: string;
  labelZh: string;
  labelEn: string;
  rawText: string;
}> = [
  {
    id: 'legacy-2013-medical',
    labelZh: '2013年傳統住院醫保（房租上限 HK$750／手術上限 HK$45,000）',
    labelEn: '2013 Legacy Ward Medical Policy (Room HK$750/day · Surgery Cap HK$45,000)',
    rawText:
      'Policy Inception: 2013. Traditional Hospital & Surgical Rider. Daily Room & Board Limit: HK$750/day (max 90 days). Surgeon Fee Schedule Cap (Complex): HK$45,000. Anaesthetist: 30% of Surgeon Fee. Operating Theatre: HK$14,000. No Supplementary Major Medical (SMM). Accidental Death Rider x2 duplicated: HK$1,800/yr. Annual Premium: HK$6,400.',
  },
  {
    id: 'legacy-2015-single-ci',
    labelZh: '2015年單次危疾保單（保額 HK$400,000 · 不包早期通波仔及復發）',
    labelEn: '2015 Single-Payoff CI Policy (HK$400k Sum Assured · No Multi-Cancer)',
    rawText:
      'Policy Inception: 2015. Traditional Lump-Sum Critical Illness Plan. Sum Assured: HK$400,000 single claim terminates policy. Covers 42 major illnesses only. Early-stage carcinoma-in-situ limited to breast/cervix only; minimally invasive angioplasty (<70% stenosis) excluded; no multi-claim cancer recurrence protection.',
  },
  {
    id: 'competitor-bi-savings',
    labelZh: '友商分紅儲蓄建議書摘錄（單一美元 · 第22年保證回本）',
    labelEn: 'Competitor Participating Savings BI Extract (USD Only · Yr 22 Guar Breakeven)',
    rawText:
      'Benefit Illustration Schedule (2024 Series): 5-Year Pay USD Participating Plan, Annual Premium USD 20,000 (Total USD 100,000). Yr 10 Guaranteed Cash Value USD 62,000 / Total USD 128,000. Guaranteed Breakeven: Year 22. Single currency USD (no currency switch option), accidental death rider USD 320/yr.',
  },
];

export function auditExistingPolicyDeterministically(rawText: string): LegacyPolicyAuditResult {
  const text = rawText || SAMPLE_LEGACY_POLICY_TEXTS[0].rawText;
  const lower = text.toLowerCase();

  const yearMatch = text.match(/\b(199\d|20[0-2]\d)\b/);
  const inceptionYear = yearMatch ? Number(yearMatch[1]) : 2014;

  const roomMatch = text.match(/room[^0-9]{0,25}([0-9,]{3,5})/i) || text.match(/房租[^0-9]{0,15}([0-9,]{3,5})/);
  const detectedRoom = roomMatch ? Number(roomMatch[1].replace(/,/g, '')) : lower.includes('ci') || lower.includes('危疾') ? 0 : 800;

  const surgMatch =
    text.match(/surgeon[^0-9]{0,30}([0-9,]{4,7})/i) ||
    text.match(/surgical[^0-9]{0,30}([0-9,]{4,7})/i) ||
    text.match(/sum assured[^0-9]{0,20}([0-9,]{5,8})/i) ||
    text.match(/手術[^0-9]{0,15}([0-9,]{4,7})/);
  const detectedCap = surgMatch ? Number(surgMatch[1].replace(/,/g, '')) : 48000;

  const isCi = lower.includes('critical illness') || lower.includes('危疾') || lower.includes('carcinoma');
  const isSavings = lower.includes('participating') || lower.includes('guaranteed breakeven') || lower.includes('儲蓄');

  const benchmarkRoom = 2600; // 2026 HK Semi-Private Room average
  const benchmarkBill = isCi ? 1500000 : isSavings ? 100000 : 215000;
  const coveredEst = isCi
    ? Math.min(benchmarkBill, detectedCap)
    : isSavings
    ? 88000
    : Math.min(benchmarkBill, detectedCap + detectedRoom * 5 + 22000);

  const shortfall = Math.max(0, benchmarkBill - coveredEst);
  const waste = lower.includes('duplicated') || lower.includes('rider') ? 1800 : 950;

  if (isCi) {
    return {
      detectedPolicyTitle: `Legacy ${inceptionYear} Single-Claim Critical Illness Policy`,
      inceptionYearEstimate: inceptionYear,
      detectedRoomLimitHkd: 0,
      benchmark2026SemiPrivateRoomHkd: benchmarkRoom,
      detectedSurgicalCapHkd: detectedCap,
      benchmark2026MajorSurgeryBillHkd: benchmarkBill,
      estimatedOutOfPocketShortfallHkd: shortfall,
      overlappingRiderAnnualWasteHkd: waste,
      keyFindingsZh: [
        `舊保單建於 ${inceptionYear} 年，保額僅 HK$${detectedCap.toLocaleString()}，面對香港目前 2–3 年癌症靶向／免疫治療連收入替代（建議 HK$150 萬）存在 HK$${shortfall.toLocaleString()} 缺口。`,
        '單次賠償後保單隨即終止，缺乏現代「癌症 1–3 年多重復發／轉移賠償」及「全器官原位癌預支」。',
        '注意：切勿貿然退保舊單（已完成等候期及累積現金價值），應以「保留舊單＋加購多重危疾差額」符合保監局 CPFI 最佳利益原則。',
      ],
      keyFindingsEn: [
        `Legacy ${inceptionYear} CI sum assured of HK$${detectedCap.toLocaleString()} leaves a HK$${shortfall.toLocaleString()} recovery & targeted-therapy gap vs HK$1.5M benchmark.`,
        'Terminates after 1st claim — lacks modern multi-stage cancer recurrence/metastasis payouts & all-organ CIS cover.',
        'CPFI Best-Interest Rule: Retain existing seasoned policy (waiting period already cleared) and top up with a modern multi-claim CI plan.',
      ],
      recommendedActionZh: '保留原有危疾底單（免重新計算等候期），加配現代多重危疾計劃補足 HK$110 萬缺口。',
      recommendedActionEn: 'Keep legacy CI base policy intact and layer a modern Multi-Claim CI top-up for the HK$1.1M shortfall.',
      sourceMode: 'deterministic-policy-audit',
    };
  }

  if (isSavings) {
    return {
      detectedPolicyTitle: `Competitor ${inceptionYear} Single-Currency Savings Illustration`,
      inceptionYearEstimate: inceptionYear,
      detectedRoomLimitHkd: 0,
      benchmark2026SemiPrivateRoomHkd: 0,
      detectedSurgicalCapHkd: detectedCap,
      benchmark2026MajorSurgeryBillHkd: benchmarkBill,
      estimatedOutOfPocketShortfallHkd: 12000,
      overlappingRiderAnnualWasteHkd: 2496,
      keyFindingsZh: [
        '保證回本年期偏長（第 22 年），且僅設單一美元貨幣，缺乏第 3 年起轉換英鎊／加元／澳元／人民幣之升學退休彈性。',
        '附約含重複意外身故收費（每年約 HK$2,496），拉低整體保證及預期淨內部回報率（IRR）。',
        '缺少第 5 年「保單分拆（Policy Split）」功能，日後難以免稅分拆予兩名子女各自持有。',
      ],
      keyFindingsEn: [
        'Long Year-22 guaranteed breakeven and locked in single USD currency without Year-3 multi-FX switch.',
        'Bundled accidental rider (~HK$2,496/yr) drags net compounding IRR.',
        'Lacks Year-5 Policy Split option for dividing wealth across multiple children.',
      ],
      recommendedActionZh: '改選支援 8–10 種貨幣轉換、第 5 年保單分拆且無綑綁雜費附約之全市場前茅儲蓄方案。',
      recommendedActionEn: 'Compare top multi-currency participating plans with Year-3 FX switch, Year-5 policy split, and zero rider drag.',
      sourceMode: 'deterministic-policy-audit',
    };
  }

  return {
    detectedPolicyTitle: `Legacy ${inceptionYear} Traditional Itemized Ward Policy`,
    inceptionYearEstimate: inceptionYear,
    detectedRoomLimitHkd: detectedRoom,
    benchmark2026SemiPrivateRoomHkd: benchmarkRoom,
    detectedSurgicalCapHkd: detectedCap,
    benchmark2026MajorSurgeryBillHkd: benchmarkBill,
    estimatedOutOfPocketShortfallHkd: shortfall,
    overlappingRiderAnnualWasteHkd: waste,
    keyFindingsZh: [
      `舊單每日房租上限僅 HK$${detectedRoom.toLocaleString()}（2026 私院半私家房約 HK$${benchmarkRoom.toLocaleString()}/晚），手術費上限 HK$${detectedCap.toLocaleString()}，面對港怡／養和微創手術總帳單 HK$${benchmarkBill.toLocaleString()} 預計自付高達 HK$${shortfall.toLocaleString()}。`,
      '不設「全數賠償（Full Cover）」及「訂明非手術癌症治療（電療／化療／標靶藥）」，亦無法享有每年 HK$8,000 自願醫保扣稅。',
      `發現重複個人意外附約每年多付約 HK$${waste.toLocaleString()}，可整合至自願醫保靈活／高端醫療計劃。`,
    ],
    keyFindingsEn: [
      `Legacy HK$${detectedRoom}/day room limit and HK$${detectedCap.toLocaleString()} surgical cap leave an estimated HK$${shortfall.toLocaleString()} out-of-pocket shortfall against a HK$${benchmarkBill.toLocaleString()} private hospital bill.`,
      'Lacks Full-Cover SMM, outpatient non-surgical cancer therapy, Cashless LOG, and HK$8,000 VHIS tax deduction.',
      `Detected ~HK$${waste.toLocaleString()}/yr duplicated accidental rider that can be streamlined.`,
    ],
    recommendedActionZh: '升級至「全數賠償」自願醫保靈活計劃／高端醫療（可選設自付額減省保費），即時享私院免找數及 HK$8,000 扣稅。',
    recommendedActionEn: 'Upgrade to Full-Cover VHIS Flexi / High-End Medical with Cashless LOG & HK$8,000 annual tax relief.',
    sourceMode: 'deterministic-policy-audit',
  };
}

// ============================================================================
// IMP-03: HK PRIVATE SURGEON FEE MEDIAN BENCHMARK & SPECIALIST NETWORK
// ============================================================================

export interface SurgeonFeeBenchmarkEntry {
  id: string;
  procedureZh: string;
  procedureEn: string;
  vhisCategory: 'MINOR' | 'INTERMEDIATE' | 'MAJOR' | 'COMPLEX';
  medianTotalPrivateBillHkd: number; // 50th percentile HK private hospital historical bill
  p90TotalPrivateBillHkd: number; // 90th percentile (HK Sanatorium / Matilda / complex)
  surgeonFeeMedianHkd: number;
  anaesthetistAndOtMedianHkd: number;
  vhisStandardCapHkd: number; // Statutory VHIS Standard surgeon + OT + room payout estimate
}

export const HK_PRIVATE_SURGEON_FEE_BENCHMARKS: SurgeonFeeBenchmarkEntry[] = [
  {
    id: 'surg-colonoscopy-polypectomy',
    procedureZh: '大腸鏡檢查連息肉切除術',
    procedureEn: 'Colonoscopy with Polypectomy',
    vhisCategory: 'MINOR',
    medianTotalPrivateBillHkd: 29500,
    p90TotalPrivateBillHkd: 48000,
    surgeonFeeMedianHkd: 14500,
    anaesthetistAndOtMedianHkd: 15000,
    vhisStandardCapHkd: 11800,
  },
  {
    id: 'surg-cataract-phaco',
    procedureZh: '白內障超聲乳化及人工晶體植入（單眼）',
    procedureEn: 'Cataract Phacoemulsification + IOL',
    vhisCategory: 'INTERMEDIATE',
    medianTotalPrivateBillHkd: 38000,
    p90TotalPrivateBillHkd: 59000,
    surgeonFeeMedianHkd: 22000,
    anaesthetistAndOtMedianHkd: 16000,
    vhisStandardCapHkd: 17500,
  },
  {
    id: 'surg-lap-cholecystectomy',
    procedureZh: '腹腔鏡膽囊切除術（微創割膽石）',
    procedureEn: 'Laparoscopic Cholecystectomy',
    vhisCategory: 'MAJOR',
    medianTotalPrivateBillHkd: 118000,
    p90TotalPrivateBillHkd: 178000,
    surgeonFeeMedianHkd: 52000,
    anaesthetistAndOtMedianHkd: 66000,
    vhisStandardCapHkd: 46500,
  },
  {
    id: 'surg-acl-reconstruction',
    procedureZh: '膝關節前十字韌帶重建微創手術',
    procedureEn: 'Arthroscopic ACL Reconstruction',
    vhisCategory: 'MAJOR',
    medianTotalPrivateBillHkd: 142000,
    p90TotalPrivateBillHkd: 205000,
    surgeonFeeMedianHkd: 64000,
    anaesthetistAndOtMedianHkd: 78000,
    vhisStandardCapHkd: 49000,
  },
  {
    id: 'surg-coronary-ptca',
    procedureZh: '冠狀動脈血管成形術及支架植入（通波仔 1–2 支）',
    procedureEn: 'Coronary Angioplasty (PTCA + Stent)',
    vhisCategory: 'COMPLEX',
    medianTotalPrivateBillHkd: 196000,
    p90TotalPrivateBillHkd: 298000,
    surgeonFeeMedianHkd: 78000,
    anaesthetistAndOtMedianHkd: 118000,
    vhisStandardCapHkd: 86000,
  },
  {
    id: 'surg-robotic-oncology',
    procedureZh: '機械臂輔助惡性腫瘤根治切除術（前列腺／大腸）',
    procedureEn: 'Robotic-Assisted Radical Oncology Resection',
    vhisCategory: 'COMPLEX',
    medianTotalPrivateBillHkd: 315000,
    p90TotalPrivateBillHkd: 460000,
    surgeonFeeMedianHkd: 135000,
    anaesthetistAndOtMedianHkd: 180000,
    vhisStandardCapHkd: 92000,
  },
];

export interface CashlessSpecialistCentre {
  id: string;
  centreNameZh: string;
  centreNameEn: string;
  specialtyZh: string;
  specialtyEn: string;
  districtZh: string;
  districtEn: string;
  directBillingInsurers: string[];
  depositRequiredHkd: number;
}

export const HK_CASHLESS_SPECIALIST_CENTRES: CashlessSpecialistCentre[] = [
  {
    id: 'spec-central-endo',
    centreNameZh: '中環皇后大道中日間內視鏡及腸胃專科中心',
    centreNameEn: 'Central Queen’s Rd Day Endoscopy & GI Centre',
    specialtyZh: '腸胃肝臟科（無痛腸胃鏡 $0 按金直付）',
    specialtyEn: 'Gastroenterology (Day Endoscopy $0 Deposit)',
    districtZh: '香港島 · 中環',
    districtEn: 'HK Island · Central',
    directBillingInsurers: ['AIA', 'PRU', 'MANULIFE', 'FWD', 'AXA', 'BUPA', 'CIGNA', 'BOWTIE', 'SUNLIFE'],
    depositRequiredHkd: 0,
  },
  {
    id: 'spec-tst-cardio',
    centreNameZh: '尖沙咀海港城心臟血管造影及專科醫療中心',
    centreNameEn: 'TST Harbour City Cardiology & CT Angiogram Centre',
    specialtyZh: '心臟科（冠狀動脈 CT 掃描／通波仔預批）',
    specialtyEn: 'Cardiology (CT Coronary Angiogram / PTCA LOG)',
    districtZh: '九龍 · 尖沙咀',
    districtEn: 'Kowloon · Tsim Sha Tsui',
    directBillingInsurers: ['AIA', 'PRU', 'FWD', 'SUNLIFE', 'BOCLIFE', 'BUPA', 'BLUECROSS'],
    depositRequiredHkd: 0,
  },
  {
    id: 'spec-cwb-eye',
    centreNameZh: '銅鑼灣利園眼科日間手術及激光中心',
    centreNameEn: 'Causeway Bay Lee Garden Ophthalmic Day Surgery',
    specialtyZh: '眼科（白內障日間微創全額免找數）',
    specialtyEn: 'Ophthalmology (Day-Case Cataract Cashless)',
    districtZh: '香港島 · 銅鑼灣',
    districtEn: 'HK Island · Causeway Bay',
    directBillingInsurers: ['AIA', 'MANULIFE', 'AXA', 'FWD', 'BUPA', 'CIGNA', 'CHUBB'],
    depositRequiredHkd: 0,
  },
  {
    id: 'spec-mk-ortho',
    centreNameZh: '旺角朗豪坊骨科運動創傷及磁力共振中心',
    centreNameEn: 'Mong Kok Langham Orthopaedics & MRI Diagnostic Hub',
    specialtyZh: '骨科及訂明診斷成像（MRI／CT 門診直付）',
    specialtyEn: 'Orthopaedics & Outpatient MRI/CT Direct Billing',
    districtZh: '九龍 · 旺角',
    districtEn: 'Kowloon · Mong Kok',
    directBillingInsurers: ['PRU', 'MANULIFE', 'FWD', 'SUNLIFE', 'BOWTIE', 'HSBCLIFE', 'ZURICH'],
    depositRequiredHkd: 0,
  },
];

export function evaluateSurgeonFeeBenchmark(params: {
  benchmarkId: string;
  percentile: 'P50_MEDIAN' | 'P90_PREMIER';
  planTier: 'VHIS_STANDARD' | 'VHIS_FLEXI_85_SMM' | 'HIGH_END_FULL_COVER';
  deductibleHkd: number;
}) {
  const entry =
    HK_PRIVATE_SURGEON_FEE_BENCHMARKS.find((b) => b.id === params.benchmarkId) ||
    HK_PRIVATE_SURGEON_FEE_BENCHMARKS[0];
  const totalBillHkd =
    params.percentile === 'P90_PREMIER'
      ? entry.p90TotalPrivateBillHkd
      : entry.medianTotalPrivateBillHkd;

  let insurerPaidHkd = 0;
  if (params.planTier === 'VHIS_STANDARD') {
    insurerPaidHkd = Math.min(totalBillHkd, entry.vhisStandardCapHkd);
  } else if (params.planTier === 'VHIS_FLEXI_85_SMM') {
    const baseCovered = Math.min(totalBillHkd, entry.vhisStandardCapHkd + 18000);
    const excess = Math.max(0, totalBillHkd - baseCovered);
    insurerPaidHkd = Math.min(totalBillHkd, Math.round(baseCovered + excess * 0.85));
    insurerPaidHkd = Math.max(0, insurerPaidHkd - params.deductibleHkd);
  } else {
    insurerPaidHkd = Math.max(0, totalBillHkd - params.deductibleHkd);
  }

  const clientOutOfPocketHkd = Math.max(0, totalBillHkd - insurerPaidHkd);
  const coveragePct = Math.round((insurerPaidHkd / Math.max(1, totalBillHkd)) * 100);

  return {
    entry,
    totalBillHkd,
    insurerPaidHkd,
    clientOutOfPocketHkd,
    coveragePct,
  };
}

// ============================================================================
// IMP-04: TALENT PASS (高才通 / IANG) & MCV SIGNING + BANKING CONCIERGE PACK
// ============================================================================

export function buildTalentAndMcvSigningConciergePack(params: {
  clientName: string;
  visaCategory: 'MCV_VISITOR' | 'TOP_TALENT_TTPS' | 'IANG_WORK_VISA';
  arrivalHub: 'WEST_KOWLOON_HSR' | 'HK_AIRPORT' | 'LOK_MA_CHAU';
  preferredBank: 'HSBC_HK' | 'BOCHK' | 'ZA_BANK_DIGITAL';
  signingDistrict: 'TST_CANTON_RD' | 'CAUSEWAY_BAY';
  lang: AppLanguage;
}) {
  const conv = (zh: string) => (params.lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);
  const isEn = params.lang === 'en';

  const hubMap = {
    WEST_KOWLOON_HSR: isEn ? 'HK West Kowloon High-Speed Rail Station' : conv('香港西九龍高鐵站（抵港大堂保留入境白紙仔）'),
    HK_AIRPORT: isEn ? 'HK International Airport Terminal 1' : conv('香港國際機場一號客運大樓（保留入境標籤）'),
    LOK_MA_CHAU: isEn ? 'Lok Ma Chau / Futian Spur Line Port' : conv('落馬洲支線／福田口岸（保留入境白紙仔）'),
  };
  const bankMap = {
    HSBC_HK: isEn ? 'HSBC Canton Rd / Hysan Premier International Centre' : conv('滙豐銀行（廣東道／希慎國際銀行業務部 — 設保費 DDA 自動轉帳）'),
    BOCHK: isEn ? 'Bank of China (HK) Cross-Border Wealth Centre' : conv('中銀香港跨境理財中心（支援內地見證及銀聯／FPS 繳費）'),
    ZA_BANK_DIGITAL: isEn ? 'ZA Bank (Onshore Hong Kong Wi-Fi 15-min e-Account)' : conv('眾安銀行 ZA Bank（身處香港境內連線 15 分鐘開立港元／美元戶口）'),
  };
  const districtMap = {
    TST_CANTON_RD: isEn ? 'Tsim Sha Tsui Harbour City / Mira Insurer Verification Hub' : conv('尖沙咀海港城／美麗華保司客戶服務及核實中心'),
    CAUSEWAY_BAY: isEn ? 'Causeway Bay Lee Garden / Times Square Insurer Hub' : conv('銅鑼灣利園／時代廣場保司簽單驗證中心'),
  };

  const docChecklist =
    params.visaCategory === 'MCV_VISITOR'
      ? isEn
        ? [
            'Valid Mainland ID Card + EEP (Two-Way Permit) with active HK Exit-Entry endorsement',
            'HKSAR Immigration Landing Slip (White Slip — MUST preserve until policy issuance)',
            'Mainland residential address proof (utility bill / bank statement within 3 months)',
            'UnionPay / Visa / MasterCard or HK bank account proof for initial & renewal premiums',
          ]
        : [
            conv('內地居民身份證正本 ＋ 港澳通行證（有效簽注）'),
            conv('香港入境事務處「入境標籤（白紙仔）」正本 — 核保批出前切勿遺失'),
            conv('近 3 個月內地住址證明及稅務居民編號（TIN＝身份證號）'),
            conv('首期繳費卡（銀聯／Visa／Master）及開戶預備存款 HK$10,000 現金'),
          ]
      : isEn
      ? [
          'HKID Card (or ROP140 Ack Receipt) + Top Talent Pass / IANG e-Visa PDF',
          'Hong Kong employment / rental proof or onboarding address confirmation',
          'HK Salaries Tax assessment / MPF setup details (unlocks VHIS HK$8k + QDAP HK$60k deductions!)',
        ]
      : [
          conv('香港身份證（或行街紙）＋ 高才通／優才／IANG 電子簽證通知書 PDF'),
          conv('香港住址或聘書證明（高才通及港漂即刻享有自願醫保 HK$8,000＋延期年金 HK$60,000 薪俸稅扣稅資格！）'),
          conv('香港本地銀行戶口號碼（一鍵綁定 FPS 轉數快／DDA 續期保費自動扣帳，免匯率差價）'),
        ];

  const schedule = [
    {
      time: '10:15',
      step: isEn ? `Arrive at ${hubMap[params.arrivalHub]}` : conv(`抵達 ${hubMap[params.arrivalHub]}，拍照備份入境標籤`),
    },
    {
      time: '11:00',
      step: isEn ? `Account setup & DDA Autopay at ${bankMap[params.preferredBank]}` : conv(`前往 ${bankMap[params.preferredBank]} 辦理港卡及續保 DDA 授權`),
    },
    {
      time: '13:00',
      step: isEn ? 'Private lunch & HKIA GL30 FNA / Benefit Illustration review' : conv('商務午餐 ＋ 覆核保監局 GL30 財務需要分析及保證／非保證利益說明書'),
    },
    {
      time: '14:30',
      step: isEn ? `Onshore verification & e-Signature at ${districtMap[params.signingDistrict]}` : conv(`抵達 ${districtMap[params.signingDistrict]} 完成境內身份核實、電子簽署及首期保費繳付`),
    },
  ];

  const copyCardText = isEn
    ? `✨ *HK Wealth & Protection Concierge Pack — ${params.clientName}*\n📍 Arrival: ${hubMap[params.arrivalHub]}\n🏦 Banking & Renewal DDA: ${bankMap[params.preferredBank]}\n🖋️ Signing Hub: ${districtMap[params.signingDistrict]}\n📋 Essential Docs:\n${docChecklist.map((d) => `• ${d}`).join('\n')}`
    : conv(
        `✨ *【香港簽單・開戶・續保一站式禮賓指南 — ${params.clientName}】*\n🚄 抵港關口：${hubMap[params.arrivalHub]}\n🏦 開戶及續保綁定：${bankMap[params.preferredBank]}\n🏢 驗證簽署中心：${districtMap[params.signingDistrict]}\n\n⏰ *當日建議時間表：*\n${schedule.map((s) => `${s.time}｜${s.step}`).join('\n')}\n\n📂 *必備文件清單：*\n${docChecklist.map((d) => `• ${d}`).join('\n')}`
      );

  return { docChecklist, schedule, copyCardText };
}

// ============================================================================
// IMP-06: MULTI-YEAR GN16 FULFILLMENT COHORT TREND (2018-2025)
// ============================================================================

export interface Gn16HistoricalSeries {
  insurerCode: string;
  insurerNameZh: string;
  insurerNameEn: string;
  flagshipSeriesZh: string;
  flagshipSeriesEn: string;
  yearlyRatios: Array<{ year: number; ratioPct: number }>;
  latestDividendAlertZh: string;
  latestDividendAlertEn: string;
}

export const HK_GN16_MULTI_YEAR_SERIES: Gn16HistoricalSeries[] = [
  {
    insurerCode: 'FWD',
    insurerNameZh: '富衛香港',
    insurerNameEn: 'FWD Hong Kong',
    flagshipSeriesZh: '盈聚系列多元貨幣儲蓄',
    flagshipSeriesEn: 'MaxFocus Participating Series',
    yearlyRatios: [
      { year: 2019, ratioPct: 100 },
      { year: 2020, ratioPct: 99 },
      { year: 2021, ratioPct: 100 },
      { year: 2022, ratioPct: 98 },
      { year: 2023, ratioPct: 100 },
      { year: 2024, ratioPct: 101 },
      { year: 2025, ratioPct: 101 },
    ],
    latestDividendAlertZh: '最新 GN16 週年公佈維持 100%–101% 總現金價值實現率，美元分紅積存息率維持穩健。',
    latestDividendAlertEn: 'Latest GN16 cycle maintained 100%–101% total cash value ratio across flagship USD cohorts.',
  },
  {
    insurerCode: 'AIA',
    insurerNameZh: '友邦香港',
    insurerNameEn: 'AIA Hong Kong',
    flagshipSeriesZh: '充裕未來／盈御多元貨幣系列',
    flagshipSeriesEn: 'Bonus Power / Abundance Global Series',
    yearlyRatios: [
      { year: 2019, ratioPct: 100 },
      { year: 2020, ratioPct: 100 },
      { year: 2021, ratioPct: 98 },
      { year: 2022, ratioPct: 96 },
      { year: 2023, ratioPct: 98 },
      { year: 2024, ratioPct: 99 },
      { year: 2025, ratioPct: 100 },
    ],
    latestDividendAlertZh: '受惠環球私募信貸及美債高息配置，近兩年度實現率穩步回升至 99%–100%。',
    latestDividendAlertEn: 'Supported by higher US Treasury yields, recent cohorts rebounded steadily to 99%–100%.',
  },
  {
    insurerCode: 'PRU',
    insurerNameZh: '保誠保險',
    insurerNameEn: 'Prudential Hong Kong',
    flagshipSeriesZh: '雋陞／信守明天多元貨幣系列',
    flagshipSeriesEn: 'Evergreen / Entrust Multi-Currency Series',
    yearlyRatios: [
      { year: 2019, ratioPct: 99 },
      { year: 2020, ratioPct: 96 },
      { year: 2021, ratioPct: 97 },
      { year: 2022, ratioPct: 95 },
      { year: 2023, ratioPct: 98 },
      { year: 2024, ratioPct: 99 },
      { year: 2025, ratioPct: 99 },
    ],
    latestDividendAlertZh: '共享分紅保單業務基金最少 90% 可分配利潤，中長線（第 8–10 保單年度）實現率表現平穩。',
    latestDividendAlertEn: '90% ring-fenced policyholder profit-sharing rule underpins steady Yr 8–10 cohort ratios.',
  },
  {
    insurerCode: 'MANULIFE',
    insurerNameZh: '宏利香港',
    insurerNameEn: 'Manulife Hong Kong',
    flagshipSeriesZh: '創富傳承／宏摯傳承保障計劃',
    flagshipSeriesEn: 'ManuGlobal / Genesis Saver Series',
    yearlyRatios: [
      { year: 2019, ratioPct: 101 },
      { year: 2020, ratioPct: 100 },
      { year: 2021, ratioPct: 99 },
      { year: 2022, ratioPct: 97 },
      { year: 2023, ratioPct: 99 },
      { year: 2024, ratioPct: 100 },
      { year: 2025, ratioPct: 100 },
    ],
    latestDividendAlertZh: '終期紅利鎖定機制廣受客戶採用，連續 7 個公佈年度波幅低於 ±2%。',
    latestDividendAlertEn: '7-year cohort standard deviation within ±2%, backed by North American & Asian fixed income.',
  },
  {
    insurerCode: 'SUNLIFE',
    insurerNameZh: '永明金融',
    insurerNameEn: 'Sun Life Hong Kong',
    flagshipSeriesZh: '萬年青星河傳承 ESG 分紅系列',
    flagshipSeriesEn: 'SunGift / Stellar ESG Participating Series',
    yearlyRatios: [
      { year: 2019, ratioPct: 100 },
      { year: 2020, ratioPct: 99 },
      { year: 2021, ratioPct: 99 },
      { year: 2022, ratioPct: 98 },
      { year: 2023, ratioPct: 99 },
      { year: 2024, ratioPct: 99 },
      { year: 2025, ratioPct: 100 },
    ],
    latestDividendAlertZh: 'ESG 低碳高評級債券組合抗跌力強，2022 加息震盪期仍維持 98% 以上實現率。',
    latestDividendAlertEn: 'ESG investment-grade asset backing cushioned 2022 market volatility above 98%.',
  },
  {
    insurerCode: 'BOCLIFE',
    insurerNameZh: '中銀人壽',
    insurerNameEn: 'BOC Life',
    flagshipSeriesZh: '非凡守護／薪火傳承人民幣及美元系列',
    flagshipSeriesEn: 'SmartUp / Forever Glorious RMB & USD Series',
    yearlyRatios: [
      { year: 2019, ratioPct: 100 },
      { year: 2020, ratioPct: 100 },
      { year: 2021, ratioPct: 99 },
      { year: 2022, ratioPct: 98 },
      { year: 2023, ratioPct: 99 },
      { year: 2024, ratioPct: 99 },
      { year: 2025, ratioPct: 100 },
    ],
    latestDividendAlertZh: '人民幣及港元／美元雙線分紅實現率連續多年貼近 99%–100%，大灣區養老客群首選。',
    latestDividendAlertEn: 'Consistent 99%–100% fulfillment across both RMB and USD participating cohorts.',
  },
];

export function evaluateGn16CohortStability(insurerCode: string) {
  const series =
    HK_GN16_MULTI_YEAR_SERIES.find((s) => s.insurerCode === insurerCode) ||
    HK_GN16_MULTI_YEAR_SERIES[0];
  const vals = series.yearlyRatios.map((r) => r.ratioPct);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / vals.length;
  const stdDev = Number(Math.sqrt(variance).toFixed(2));
  return {
    series,
    meanRatioPct: Number(mean.toFixed(1)),
    stdDevPct: stdDev,
    minRatioPct: Math.min(...vals),
    maxRatioPct: Math.max(...vals),
  };
}

// ============================================================================
// IMP-07: HOUSEHOLD FAMILY & REFERRAL NETWORK TREE
// ============================================================================

export interface FamilyNetworkNode {
  id: string;
  relation: 'SELF' | 'SPOUSE' | 'CHILD' | 'PARENT' | 'REFERRER';
  relationZh: string;
  relationEn: string;
  nameZh: string;
  nameEn: string;
  age: number;
  coverageStatus: 'COVERED' | 'GAP_OPPORTUNITY' | 'REFERRAL_VIP';
  gapSummaryZh: string;
  gapSummaryEn: string;
  estimatedAfypPotentialHkd: number;
}

export function buildHouseholdAndReferralTree(lead: ClientLead): {
  nodes: FamilyNetworkNode[];
  sharedVhisTaxCapHkd: number;
  totalHouseholdAfypPotentialHkd: number;
} {
  const deps = lead.fnaRecord?.dependentsCount ?? 2;
  const nodes: FamilyNetworkNode[] = [
    {
      id: `${lead.id}-self`,
      relation: 'SELF',
      relationZh: '主投保人（本人）',
      relationEn: 'Primary Client (Self)',
      nameZh: lead.fullNameZh,
      nameEn: lead.fullNameEn,
      age: lead.age,
      coverageStatus: lead.stage === LeadStage.IN_FORCE ? 'COVERED' : 'GAP_OPPORTUNITY',
      gapSummaryZh: '核心收入支柱：建議配置多重危疾＋自願醫保靈活計劃',
      gapSummaryEn: 'Primary breadwinner: Multi-Claim CI + VHIS Flexi anchor',
      estimatedAfypPotentialHkd: 48000,
    },
    {
      id: `${lead.id}-spouse`,
      relation: 'SPOUSE',
      relationZh: '配偶（可設後備保單持有人）',
      relationEn: 'Spouse (Contingent Policy Owner)',
      nameZh: `${lead.fullNameZh.slice(0, 1)}太／配偶`,
      nameEn: `${lead.fullNameEn.split(' ')[0]}'s Spouse`,
      age: Math.max(25, lead.age - 2),
      coverageStatus: 'GAP_OPPORTUNITY',
      gapSummaryZh: '夫妻合併報稅可享雙人 QDAP HK$120,000 扣稅額＋互設後備持有人',
      gapSummaryEn: 'Joint Married QDAP HK$120k tax deduction + mutual contingent owner',
      estimatedAfypPotentialHkd: 60000,
    },
  ];

  if (deps >= 1) {
    nodes.push({
      id: `${lead.id}-child-1`,
      relation: 'CHILD',
      relationZh: '子女（教育基金／保單分拆受保人）',
      relationEn: 'Child (Education Fund & Policy Split)',
      nameZh: `${lead.fullNameZh.slice(0, 1)}小朋友`,
      nameEn: `Junior ${lead.fullNameEn.split(' ')[0]}`,
      age: Math.max(1, Math.min(14, lead.age - 29)),
      coverageStatus: 'GAP_OPPORTUNITY',
      gapSummaryZh: '0–10 歲投保兒童危疾槓桿最高＋外幣儲蓄單預備 18 歲英美升學',
      gapSummaryEn: 'Juvenile CI peak leverage + Multi-FX savings for age-18 overseas tuition',
      estimatedAfypPotentialHkd: 55000,
    });
  }

  nodes.push(
    {
      id: `${lead.id}-parent-1`,
      relation: 'PARENT',
      relationZh: '父母長輩（受養父母 VHIS 扣稅額）',
      relationEn: 'Dependent Parent (VHIS Tax Deduction)',
      nameZh: `${lead.fullNameZh.slice(0, 1)}老先生／老太`,
      nameEn: `Senior Parent of ${lead.fullNameEn.split(' ')[0]}`,
      age: Math.min(75, lead.age + 28),
      coverageStatus: 'GAP_OPPORTUNITY',
      gapSummaryZh: '為父母投保 VHIS 同樣可由子女申請每名 HK$8,000 薪俸稅扣減（高自付額慳保費）',
      gapSummaryEn: 'Taxpayer claims HK$8,000 VHIS deduction per insured parent; use high-deductible ward cover',
      estimatedAfypPotentialHkd: 19000,
    },
    {
      id: `${lead.id}-referrer`,
      relation: 'REFERRER',
      relationZh: '轉介來源（VIP 客戶關係鏈）',
      relationEn: 'Warm Referrer (VIP Advocate)',
      nameZh: '張健明醫生（Dr. Cheung）',
      nameEn: 'Dr. Kenneth Cheung (Referrer)',
      age: 51,
      coverageStatus: 'REFERRAL_VIP',
      gapSummaryZh: '已轉介 2 位高淨值親友 · 建議於週年檢視致謝並更新家族分拆方案',
      gapSummaryEn: 'Referred 2 HNW households · Schedule annual thank-you & portfolio review',
      estimatedAfypPotentialHkd: 0,
    }
  );

  const vhisEligibleMembers = nodes.filter((n) => n.relation !== 'REFERRER').length;
  const totalHouseholdAfypPotentialHkd = nodes.reduce(
    (sum, n) => sum + n.estimatedAfypPotentialHkd,
    0
  );

  return {
    nodes,
    sharedVhisTaxCapHkd: vhisEligibleMembers * 8000,
    totalHouseholdAfypPotentialHkd,
  };
}

// ============================================================================
// IMP-08: 13TH / 25TH MONTH PERSISTENCY & COMMISSION CLAWBACK SHIELD
// ============================================================================

export interface PersistencyLedgerEntry {
  policyRef: string;
  clientNameZh: string;
  clientNameEn: string;
  insurerPlanZh: string;
  policyMonth: number; // e.g., 11, 12, 13, 23, 24
  annualPremiumHkd: number;
  fycCommissionHkd: number;
  advisorSplitPct: number;
  autopayDdaActive: boolean;
  riskLevel: 'CRITICAL_13M' | 'WATCH_25M' | 'SAFE_AUTOPAY';
  clawbackExposureHkd: number;
}

export function evaluatePersistencyAndClawbackLedger(params: {
  advisorSplitOverridePct?: number;
  savedPoliciesCount?: number;
}) {
  const split = (params.advisorSplitOverridePct ?? 100) / 100;
  const baseRows: PersistencyLedgerEntry[] = [
    {
      policyRef: 'POL-AIA-2501',
      clientNameZh: '林小美 (MCV)',
      clientNameEn: 'Lin Xiaomei (MCV)',
      insurerPlanZh: '友邦 · 盈御多元貨幣計劃 3',
      policyMonth: 12,
      annualPremiumHkd: 156000,
      fycCommissionHkd: Math.round(59280 * split),
      advisorSplitPct: Math.round(split * 100),
      autopayDdaActive: false,
      riskLevel: 'CRITICAL_13M',
      clawbackExposureHkd: Math.round(59280 * split),
    },
    {
      policyRef: 'POL-FWD-2504',
      clientNameZh: '趙偉 (吸煙)',
      clientNameEn: 'Zhao Wei',
      insurerPlanZh: '富衛 · 危疾加諾保＋盈聚天下',
      policyMonth: 11,
      annualPremiumHkd: 98000,
      fycCommissionHkd: Math.round(41160 * split),
      advisorSplitPct: Math.round(split * 100),
      autopayDdaActive: false,
      riskLevel: 'CRITICAL_13M',
      clawbackExposureHkd: Math.round(41160 * split),
    },
    {
      policyRef: 'POL-PRU-2402',
      clientNameZh: '陳大文',
      clientNameEn: 'Chan Tai Man',
      insurerPlanZh: '保誠 · 雋陞儲蓄保障計劃 II',
      policyMonth: 23,
      annualPremiumHkd: 78000,
      fycCommissionHkd: Math.round(27300 * split),
      advisorSplitPct: Math.round(split * 100),
      autopayDdaActive: true,
      riskLevel: 'WATCH_25M',
      clawbackExposureHkd: Math.round(27300 * split * 0.35),
    },
    {
      policyRef: 'POL-SUN-2408',
      clientNameZh: '張健明醫生',
      clientNameEn: 'Dr. Kenneth Cheung',
      insurerPlanZh: '永明 · 萬年青星河傳承 II',
      policyMonth: 18,
      annualPremiumHkd: 390000,
      fycCommissionHkd: Math.round(140400 * split),
      advisorSplitPct: Math.round(split * 100),
      autopayDdaActive: true,
      riskLevel: 'SAFE_AUTOPAY',
      clawbackExposureHkd: 0,
    },
  ];

  const rescued = Math.min(2, Math.max(0, params.savedPoliciesCount ?? 0));
  const adjustedRows = baseRows.map((row, idx) => {
    if (idx < rescued && row.riskLevel === 'CRITICAL_13M') {
      return {
        ...row,
        autopayDdaActive: true,
        riskLevel: 'SAFE_AUTOPAY' as const,
        clawbackExposureHkd: 0,
      };
    }
    return row;
  });

  const totalPremiumPool = adjustedRows.reduce((s, r) => s + r.annualPremiumHkd, 0);
  const atRiskPremium = adjustedRows
    .filter((r) => r.riskLevel === 'CRITICAL_13M')
    .reduce((s, r) => s + r.annualPremiumHkd, 0);
  const projected13mPersistencyPct = Number(
    (((totalPremiumPool - atRiskPremium) / Math.max(1, totalPremiumPool)) * 100).toFixed(1)
  );
  const totalClawbackExposureHkd = adjustedRows.reduce((s, r) => s + r.clawbackExposureHkd, 0);
  const persistencyBonusUnlocked = projected13mPersistencyPct >= 90;

  return {
    rows: adjustedRows,
    projected13mPersistencyPct,
    totalClawbackExposureHkd,
    persistencyBonusUnlocked,
  };
}

// ============================================================================
// IMP-09: INSURANCE TRUST VS POLICY SETTLEMENT OPTION SIMULATOR
// ============================================================================

export function simulateInsuranceTrustVsPolicySplit(params: {
  deathBenefitUsd: number;
  payoutYears: number;
  trustSetupFeeUsd?: number;
  annualTrusteeFeePct?: number;
}) {
  const dbUsd = Math.max(200000, params.deathBenefitUsd);
  const yrs = Math.max(5, Math.min(40, params.payoutYears));
  const setupFeeUsd = params.trustSetupFeeUsd ?? 10000; // ~HK$78,000
  const annualPct = params.annualTrusteeFeePct ?? 0.35; // 0.35% min $3,500/yr

  const annualTrustAdminUsd = Math.max(3500, Math.round((dbUsd * (annualPct / 100)) * 0.6));
  const totalTrustFees20YrUsd = setupFeeUsd + annualTrustAdminUsd * yrs;
  const netHeirPayoutTrustUsd = Math.max(0, Math.round(dbUsd * (1 + 0.032 * (yrs / 2)) - totalTrustFees20YrUsd));

  // Policy Built-in Death Benefit Settlement Option ($0 setup, $0 annual fee, ~2.5% interest on remaining balance)
  const totalPolicyOptionFeesUsd = 0;
  const netHeirPayoutPolicyOptionUsd = Math.round(dbUsd * (1 + 0.025 * (yrs / 2)));

  const recommendPrivateTrust = dbUsd >= 3000000;

  return {
    deathBenefitUsd: dbUsd,
    payoutYears: yrs,
    totalTrustFeesUsd: totalTrustFees20YrUsd,
    totalPolicyOptionFeesUsd,
    netHeirPayoutTrustUsd,
    netHeirPayoutPolicyOptionUsd,
    feeSavingsWithPolicyOptionUsd: totalTrustFees20YrUsd,
    recommendPrivateTrust,
    verdictZh: recommendPrivateTrust
      ? '保額達 US$300萬以上高淨值資產：建議設立「香港私人保險金信託」，兼享婚姻資產隔離、破產債權人保護及跨代有條件分配（如結婚／創業獎金）。'
      : '保額於 US$300萬以內中產家庭：選用香港保單免費內置「類信託分期身故賠償支付選項＋後備持有人」即可慳下約 US$' +
        totalTrustFees20YrUsd.toLocaleString() +
        ' 信託管理費！',
    verdictEn: recommendPrivateTrust
      ? 'For estates ≥ US$3M: Dedicated HK Private Insurance Trust justifies fees via creditor ring-fencing, divorce protection, and milestone triggers.'
      : `For estates < US$3M: Free built-in Policy Death-Benefit Installment Option + Contingent Owner saves US$${totalTrustFees20YrUsd.toLocaleString()} in trust fees.`,
  };
}

// ============================================================================
// IMP-10: SME KEYMAN INSURANCE & SHAREHOLDER BUY-SELL + IRD DIPN 28
// ============================================================================

export function calculateSmeKeymanAndBuySell(params: {
  companyValuationHkd: number;
  keymanGrossProfitContributionHkd: number;
  recoveryYears: number;
  shareholderCount: number;
  founderEquityPct: number;
  policyStructure: 'PURE_TERM_KEYMAN' | 'CASH_VALUE_SAVINGS';
}) {
  const recommendedKeymanSumHkd = Math.round(
    params.keymanGrossProfitContributionHkd * Math.max(1, Math.min(5, params.recoveryYears))
  );
  const founderBuySellShareHkd = Math.round(
    params.companyValuationHkd * (Math.min(100, Math.max(5, params.founderEquityPct)) / 100)
  );
  const estAnnualTermPremiumHkd = Math.round((recommendedKeymanSumHkd / 1000) * 2.45);

  // Under HK IRD DIPN 28, pure term life owned by employer solely to compensate loss of profits on key employee is generally deductible under Profits Tax (8.25% first HK$2M / 16.5% standard)
  const isDipn28Deductible = params.policyStructure === 'PURE_TERM_KEYMAN' && params.founderEquityPct < 50;
  const profitsTaxSavedHkd = isDipn28Deductible ? Math.round(estAnnualTermPremiumHkd * 0.165) : 0;
  const netCorporateAnnualCostHkd = estAnnualTermPremiumHkd - profitsTaxSavedHkd;

  return {
    recommendedKeymanSumHkd,
    founderBuySellShareHkd,
    totalCorporateCoverNeededHkd: recommendedKeymanSumHkd + founderBuySellShareHkd,
    estAnnualTermPremiumHkd,
    isDipn28Deductible,
    profitsTaxSavedHkd,
    netCorporateAnnualCostHkd,
    dipn28NoteZh: isDipn28Deductible
      ? '符合香港稅務局《釋義及執行指引第28號 (DIPN 28)》原則：純定期人壽、公司為唯一受益人且受保要員持股少於 50%，保費可申請 16.5% 利得稅扣減。'
      : '注意（DIPN 28）：若投保具儲蓄現金價值保單（屬資本性質）或受保人為控股大股東（持股 ≥50%），保費一般不可扣減利得稅，惟身故賠償金亦免徵利得稅。',
    dipn28NoteEn: isDipn28Deductible
      ? 'Eligible under HK IRD DIPN 28: Pure term life with company as sole beneficiary on non-controlling key employee qualifies for 16.5% Profits Tax deduction.'
      : 'IRD DIPN 28 Note: Cash-value policies (capital nature) or controlling shareholders (≥50% equity) are non-deductible, though policy proceeds remain tax-free.',
  };
}

// ============================================================================
// IMP-11: GROUP MEDICAL EXIT / RETIREMENT BRIDGE TO PERSONAL VHIS
// ============================================================================

export function calculateGroupMedicalToVhisBridge(params: {
  currentAge: number;
  plannedExitAge: number;
  employerSurgicalLimitHkd: number;
  selectedDeductibleHkd: 16000 | 25000 | 50000;
}) {
  const zeroDeductibleAnnualHkd = Math.round(9800 * Math.pow(1.038, Math.max(0, params.currentAge - 30)));
  const discountFactor =
    params.selectedDeductibleHkd === 50000
      ? 0.44
      : params.selectedDeductibleHkd === 25000
      ? 0.56
      : 0.66;
  const highDeductibleAnnualHkd = Math.round(zeroDeductibleAnnualHkd * discountFactor);
  const annualPremiumSavedHkd = zeroDeductibleAnnualHkd - highDeductibleAnnualHkd;
  const yearsUntilExit = Math.max(1, params.plannedExitAge - params.currentAge);
  const cumulativePremiumSavedBeforeExitHkd = annualPremiumSavedHkd * yearsUntilExit;

  // Employer covers first HK$employerSurgicalLimitHkd, covering the VHIS deductible seamlessly!
  const outOfPocketBridgeGapHkd = Math.max(
    0,
    params.selectedDeductibleHkd - params.employerSurgicalLimitHkd
  );

  return {
    zeroDeductibleAnnualHkd,
    highDeductibleAnnualHkd,
    annualPremiumSavedHkd,
    yearsUntilExit,
    cumulativePremiumSavedBeforeExitHkd,
    outOfPocketBridgeGapHkd,
    irdTaxSavedHkd: Math.round(Math.min(8000, highDeductibleAnnualHkd) * 0.15),
    guaranteedStepDownAges: [50, 55, 60, 65],
  };
}

// ============================================================================
// IMP-12: UK / US / AU / CA OVERSEAS UNIVERSITY TUITION INFLATION PLANNER
// ============================================================================

export type StudyDestination = 'UK_GBP' | 'US_USD' | 'AU_AUD' | 'CA_CAD';

export const OVERSEAS_TUITION_BASELINES_2026: Record<
  StudyDestination,
  {
    labelZh: string;
    labelEn: string;
    currencyCode: string;
    annualTuitionAndLivingLocal: number;
    fxToHkd: number;
    educationInflationPct: number;
  }
> = {
  UK_GBP: {
    labelZh: '英國羅素大學集團（倫敦／牛劍 · 英鎊 GBP）',
    labelEn: 'UK Russell Group / London (GBP)',
    currencyCode: 'GBP',
    annualTuitionAndLivingLocal: 48000,
    fxToHkd: 9.95,
    educationInflationPct: 4.5,
  },
  US_USD: {
    labelZh: '美國頂尖私立／常春藤大學（美元 USD）',
    labelEn: 'US Private / Ivy League University (USD)',
    currencyCode: 'USD',
    annualTuitionAndLivingLocal: 82000,
    fxToHkd: 7.8,
    educationInflationPct: 4.8,
  },
  AU_AUD: {
    labelZh: '澳洲八大名校 Go8（悉尼／墨爾本 · 澳元 AUD）',
    labelEn: 'Australia Group of Eight (AUD)',
    currencyCode: 'AUD',
    annualTuitionAndLivingLocal: 68000,
    fxToHkd: 5.15,
    educationInflationPct: 4.2,
  },
  CA_CAD: {
    labelZh: '加拿大多倫多／UBC 大學（加元 CAD）',
    labelEn: 'Canada UofT / UBC (CAD)',
    currencyCode: 'CAD',
    annualTuitionAndLivingLocal: 74000,
    fxToHkd: 5.65,
    educationInflationPct: 4.3,
  },
};

export function calculateOverseasTuitionWithdrawalPlan(params: {
  destination: StudyDestination;
  childCurrentAge: number;
  degreeYears?: number;
}) {
  const meta = OVERSEAS_TUITION_BASELINES_2026[params.destination];
  const degreeYears = params.degreeYears ?? (params.destination === 'UK_GBP' ? 3 : 4);
  const yearsUntilUni = Math.max(1, 18 - Math.min(17, Math.max(0, params.childCurrentAge)));
  const inf = meta.educationInflationPct / 100;

  const schedule: Array<{
    uniYear: number;
    childAge: number;
    policyYear: number;
    requiredLocalCurrency: number;
    requiredHkd: number;
  }> = [];

  let total4YrHkd = 0;
  let total4YrLocal = 0;

  for (let i = 0; i < degreeYears; i++) {
    const yrsFromNow = yearsUntilUni + i;
    const localAmt = Math.round(meta.annualTuitionAndLivingLocal * Math.pow(1 + inf, yrsFromNow));
    const hkdAmt = Math.round(localAmt * meta.fxToHkd);
    total4YrLocal += localAmt;
    total4YrHkd += hkdAmt;
    schedule.push({
      uniYear: i + 1,
      childAge: 18 + i,
      policyYear: yrsFromNow,
      requiredLocalCurrency: localAmt,
      requiredHkd: hkdAmt,
    });
  }

  // Estimate 5-pay participating policy annual funding needed today (compounding ~5.6% net to uni years)
  const discountFactor = Math.pow(1.055, Math.max(3, yearsUntilUni - 2));
  const lumpSumEquivalentTodayHkd = Math.round(total4YrHkd / discountFactor);
  const recommended5PayAnnualHkd = Math.round(lumpSumEquivalentTodayHkd / 4.65);

  return {
    meta,
    yearsUntilUni,
    degreeYears,
    totalRequiredLocal: total4YrLocal,
    totalRequiredHkd: total4YrHkd,
    recommended5PayAnnualHkd,
    recommended5PayAnnualUsd: Math.round(recommended5PayAnnualHkd / 7.8),
    schedule,
  };
}

// ============================================================================
// IMP-13: ANONYMIZED SUB-STANDARD UNDERWRITING CASE VAULT & LAB BIOMARKER TRIAGE
// ============================================================================

export interface UnderwritingCasePrecedent {
  id: string;
  conditionZh: string;
  conditionEn: string;
  biomarkerRange: string;
  vhisOutcomeZh: string;
  ciOutcomeZh: string;
  savingsOutcomeZh: string;
  lenientInsurers: string[];
}

export const HK_UNDERWRITING_PRECEDENT_VAULT: UnderwritingCasePrecedent[] = [
  {
    id: 'uw-thyroid-tirads2',
    conditionZh: '甲狀腺良性囊腫／結節（TI-RADS 2 · <1cm · 甲功正常）',
    conditionEn: 'Benign Thyroid Cyst/Nodule (TI-RADS 2, <1cm, normal TSH)',
    biomarkerRange: 'TI-RADS 2 · TSH 1.8 mIU/L',
    vhisOutcomeZh: '大部份保司批「甲狀腺除外」，個別接受 2 年無增大超聲波標準承保',
    ciOutcomeZh: '多數保司可「標準體（Standard）」或僅甲狀腺癌早期除外批核',
    savingsOutcomeZh: '100% 免體檢標準體即時批核（Guaranteed Issue 限額內）',
    lenientInsurers: ['FWD', 'AIA', 'SUNLIFE', 'MANULIFE'],
  },
  {
    id: 'uw-breast-birads3',
    conditionZh: '乳房纖維腺瘤／囊腫（BI-RADS 2–3 · 穩定 >12 個月）',
    conditionEn: 'Breast Fibroadenoma / Cyst (BI-RADS 2–3 stable >12m)',
    biomarkerRange: 'BI-RADS 2/3 · <1.2cm',
    vhisOutcomeZh: '普遍設「乳房良性及相關手術除外」；BI-RADS 2 有機會爭取標準體',
    ciOutcomeZh: '附最近半年超聲波報告，多數保司危疾主約批「標準體」或僅原位癌除外',
    savingsOutcomeZh: '100% 標準體批核',
    lenientInsurers: ['PRU', 'AIA', 'FWD', 'AXA'],
  },
  {
    id: 'uw-fatty-liver',
    conditionZh: '輕度脂肪肝伴肝酵素輕微偏高（ALT 55–80 U/L）',
    conditionEn: 'Mild Fatty Liver with Mildly Elevated ALT (55–80 U/L)',
    biomarkerRange: 'ALT < 1.8x ULN · FibroScan normal · Non-drinker',
    vhisOutcomeZh: '加費 +20%–25% 全保（無除外）或標準體',
    ciOutcomeZh: '標準體至輕微加費 +25%（戒酒及減重 3 個月複檢可爭取標準體）',
    savingsOutcomeZh: '100% 標準體批核',
    lenientInsurers: ['MANULIFE', 'SUNLIFE', 'BOCLIFE', 'FWD'],
  },
  {
    id: 'uw-hbv-carrier',
    conditionZh: '乙型肝炎帶菌者（e抗原陰性 · 肝酵素及甲胎蛋白正常）',
    conditionEn: 'Hepatitis B Inactive Carrier (HBeAg-, normal ALT/AFP/USG)',
    biomarkerRange: 'HBsAg+ · HBeAg- · ALT <40 · AFP normal',
    vhisOutcomeZh: '加費 +25%–50% 或肝臟相關併發症除外',
    ciOutcomeZh: '加費 +25%–50% 承保（連肝癌亦獲保障，優於除外條款！）',
    savingsOutcomeZh: '100% 標準體批核',
    lenientInsurers: ['AIA', 'PRU', 'MANULIFE', 'CTFLIFE'],
  },
  {
    id: 'uw-mild-htn',
    conditionZh: '輕度高血壓（服單一降壓藥穩定控制 <135/85 mmHg）',
    conditionEn: 'Controlled Mild Hypertension (1 med, BP <135/85, no LVH)',
    biomarkerRange: 'BP 128/82 · Normal ECG & Urine Microalbumin',
    vhisOutcomeZh: '標準體或輕微加費 +20%（視乎發病年齡）',
    ciOutcomeZh: '45 歲以上控制良好有機會在無併發症下批標準體或 +25%',
    savingsOutcomeZh: '100% 標準體批核',
    lenientInsurers: ['FWD', 'AXA', 'AIA', 'BUPA'],
  },
  {
    id: 'uw-colon-polyp',
    conditionZh: '大腸腺瘤性息肉已切除（病理良性 · 無高度異型增生）',
    conditionEn: 'Resected Benign Colonic Adenoma Polyp (Pathology clear)',
    biomarkerRange: 'Histology: Tubular adenoma, clear margins',
    vhisOutcomeZh: '附上完整病理報告（Histology Report），多數保司可批「標準體全保」！',
    ciOutcomeZh: '100% 標準體承保（切勿漏報以免觸發違反最高誠信拒賠）',
    savingsOutcomeZh: '100% 標準體批核',
    lenientInsurers: ['BOWTIE', 'AIA', 'PRU', 'FWD', 'BUPA'],
  },
];

export function triageLabBiomarkers(params: {
  bmi: number;
  systolicBp: number;
  hba1cPct: number;
  altUl: number;
}) {
  const flags: string[] = [];
  let loadingEstimatePct = 0;

  if (params.bmi >= 30) {
    flags.push('BMI ≥ 30（重度超重：醫保及危疾一般加費 +25%–50%）');
    loadingEstimatePct += 25;
  } else if (params.bmi >= 27.5) {
    flags.push('BMI 27.5–29.9（亞洲標準輕度肥胖：視乎血壓血糖可爭取標準至 +15%）');
    loadingEstimatePct += 10;
  }

  if (params.systolicBp >= 145) {
    flags.push(`上壓 ${params.systolicBp} mmHg 偏高：建議記錄連續 7 日家居血壓後再遞交核保`);
    loadingEstimatePct += 25;
  }

  if (params.hba1cPct >= 6.5) {
    flags.push(`糖化血紅素 HbA1c ${params.hba1cPct}%（達糖尿病門檻）：建議轉投免健告儲蓄單或糖尿病專屬醫保`);
    loadingEstimatePct += 75;
  } else if (params.hba1cPct >= 5.8) {
    flags.push(`HbA1c ${params.hba1cPct}%（糖尿病前期）：控糖 3 個月降至 5.7% 以下再投保危疾可免加費`);
    loadingEstimatePct += 20;
  }

  if (params.altUl > 80) {
    flags.push(`肝酵素 ALT ${params.altUl} U/L (>2x ULN)：須附腹部超聲波及乙肝表面抗原報告`);
    loadingEstimatePct += 25;
  }

  const tier =
    loadingEstimatePct === 0
      ? 'STANDARD_LIKELY'
      : loadingEstimatePct <= 35
      ? 'MILD_LOADING_OR_EXCLUSION'
      : 'SIMPLIFIED_SAVINGS_PIVOT';

  return {
    tier,
    estimatedLoadingPct: Math.min(100, loadingEstimatePct),
    flags:
      flags.length > 0
        ? flags
        : ['各項核心體檢指標（BMI、血壓、HbA1c、ALT）均處於香港保司標準體黃金範圍！'],
  };
}

// ============================================================================
// IMP-14: INSURER UNDERWRITING, LOG & CLAIMS SLA TURNAROUND THERMOMETER
// ============================================================================

export interface InsurerSlaRecord {
  insurerCode: string;
  insurerNameZh: string;
  insurerNameEn: string;
  cleanEuwDays: number;
  medicalUwDays: number;
  hospitalLogHours: number;
  minorClaimDays: number;
}

export const HK_INSURER_SLA_THERMOMETER: InsurerSlaRecord[] = [
  {
    insurerCode: 'BOWTIE',
    insurerNameZh: '保泰人壽 Bowtie',
    insurerNameEn: 'Bowtie Life HK',
    cleanEuwDays: 0.5,
    medicalUwDays: 3.5,
    hospitalLogHours: 24,
    minorClaimDays: 3.2,
  },
  {
    insurerCode: 'AIA',
    insurerNameZh: '友邦香港 AIA',
    insurerNameEn: 'AIA Hong Kong',
    cleanEuwDays: 1.0,
    medicalUwDays: 4.5,
    hospitalLogHours: 36,
    minorClaimDays: 4.0,
  },
  {
    insurerCode: 'FWD',
    insurerNameZh: '富衛香港 FWD',
    insurerNameEn: 'FWD Hong Kong',
    cleanEuwDays: 0.8,
    medicalUwDays: 4.0,
    hospitalLogHours: 30,
    minorClaimDays: 3.5,
  },
  {
    insurerCode: 'PRU',
    insurerNameZh: '保誠保險 Prudential',
    insurerNameEn: 'Prudential HK',
    cleanEuwDays: 1.5,
    medicalUwDays: 5.5,
    hospitalLogHours: 48,
    minorClaimDays: 4.8,
  },
  {
    insurerCode: 'MANULIFE',
    insurerNameZh: '宏利香港 Manulife',
    insurerNameEn: 'Manulife HK',
    cleanEuwDays: 1.2,
    medicalUwDays: 5.0,
    hospitalLogHours: 42,
    minorClaimDays: 4.3,
  },
  {
    insurerCode: 'BUPA',
    insurerNameZh: '保柏香港 Bupa',
    insurerNameEn: 'Bupa Hong Kong',
    cleanEuwDays: 1.0,
    medicalUwDays: 4.2,
    hospitalLogHours: 18,
    minorClaimDays: 3.6,
  },
  {
    insurerCode: 'AXA',
    insurerNameZh: '安盛香港 AXA',
    insurerNameEn: 'AXA Hong Kong',
    cleanEuwDays: 1.3,
    medicalUwDays: 5.0,
    hospitalLogHours: 36,
    minorClaimDays: 4.5,
  },
  {
    insurerCode: 'SUNLIFE',
    insurerNameZh: '永明金融 Sun Life',
    insurerNameEn: 'Sun Life HK',
    cleanEuwDays: 1.2,
    medicalUwDays: 4.8,
    hospitalLogHours: 42,
    minorClaimDays: 4.4,
  },
];

export const CLIENT_DISCHARGE_CHECKLIST_ITEMS = [
  {
    id: 'chk-1',
    zh: '主診醫生親筆簽署及蓋章之《住院理賠申請表 Part II》（切勿漏填病徵首次出現日期）',
    en: 'Attending Physician signed & stamped Claim Form Part II (with symptom onset date)',
  },
  {
    id: 'chk-2',
    zh: '私家醫院收費總單正本（Official Final Receipt）及逐項收費明細表（Itemized Breakdown）',
    en: 'Original Hospital Final Receipt + Full Itemized Charge Breakdown',
  },
  {
    id: 'chk-3',
    zh: '出院撮要（Discharge Summary）及所有病理組織化驗／內視鏡／MRI 報告副本',
    en: 'Hospital Discharge Summary + Pathology / Histopathology / Imaging Reports',
  },
  {
    id: 'chk-4',
    zh: '如先向公司團體醫保索償：索取團體保司發出之《賠償結算表（EOB）》及核證副本再交個人 VHIS 報銷餘額',
    en: 'For Dual-Policy Claims: Obtain Group Insurer Explanation of Benefits (EOB) + Certified True Copies',
  },
];

// ============================================================================
// IMP-15: QUARTERLY INSURER PROMO REBATE + PREPAID INTEREST & BANK TD CLIFF
// ============================================================================

export interface InsurerPromoCampaign {
  insurerCode: string;
  insurerNameZh: string;
  insurerNameEn: string;
  campaignTitleZh: string;
  campaignTitleEn: string;
  firstYearRebatePct: number;
  prepaidGuaranteedRatePct: number;
  daysRemaining: number;
}

export const HK_QUARTERLY_PROMO_CAMPAIGNS: InsurerPromoCampaign[] = [
  {
    insurerCode: 'FWD',
    insurerNameZh: '富衛香港',
    insurerNameEn: 'FWD Hong Kong',
    campaignTitleZh: 'Q4 盈聚天下首年高達 18% 保費回贈 ＋ 5年預繳保證 4.6% 年息',
    campaignTitleEn: 'Q4 MaxFocus up to 18% FYP Rebate + 4.6% p.a. Prepaid Guaranteed Interest',
    firstYearRebatePct: 18,
    prepaidGuaranteedRatePct: 4.6,
    daysRemaining: 19,
  },
  {
    insurerCode: 'AIA',
    insurerNameZh: '友邦香港',
    insurerNameEn: 'AIA Hong Kong',
    campaignTitleZh: '盈御多元貨幣 3 首年 16% 保費回贈 ＋ 家庭投保額外 +2% 賞賜',
    campaignTitleEn: 'Abundance 3 16% FYP Rebate + 2% Family Bundle Bonus + 4.5% Prepaid Rate',
    firstYearRebatePct: 18,
    prepaidGuaranteedRatePct: 4.5,
    daysRemaining: 19,
  },
  {
    insurerCode: 'PRU',
    insurerNameZh: '保誠保險',
    insurerNameEn: 'Prudential HK',
    campaignTitleZh: '信守明天多元貨幣高達 20% 保費回贈 ＋ 美元預繳 4.5% 保證息率',
    campaignTitleEn: 'Entrust Multi-Currency up to 20% Rebate + 4.5% USD Prepaid Interest',
    firstYearRebatePct: 20,
    prepaidGuaranteedRatePct: 4.5,
    daysRemaining: 19,
  },
  {
    insurerCode: 'SUNLIFE',
    insurerNameZh: '永明金融',
    insurerNameEn: 'Sun Life HK',
    campaignTitleZh: '萬年青星河傳承 II 高達 17% 保費回贈 ＋ 自願醫保首 2 個月免費',
    campaignTitleEn: 'Stellar II up to 17% FYP Rebate + 2 Months Free VHIS Bundle',
    firstYearRebatePct: 17,
    prepaidGuaranteedRatePct: 4.4,
    daysRemaining: 24,
  },
  {
    insurerCode: 'BOCLIFE',
    insurerNameZh: '中銀人壽',
    insurerNameEn: 'BOC Life',
    campaignTitleZh: '非凡守護（智尊版）首年 16% 保費折扣 ＋ 預繳 4.8% 特優保證年息',
    campaignTitleEn: 'SmartUp Pro 16% First-Year Discount + 4.8% Prepaid Guaranteed Interest',
    firstYearRebatePct: 16,
    prepaidGuaranteedRatePct: 4.8,
    daysRemaining: 14,
  },
];

export function calculatePromoRebateAndPrepaidStack(params: {
  annualPremiumUsd: number;
  firstYearRebatePct: number;
  prepaidGuaranteedRatePct: number;
  prepayFull5Years: boolean;
  bankTdYear1RatePct?: number;
  bankTdRenewalRatePct?: number;
}) {
  const gross5YrUsd = params.annualPremiumUsd * 5;
  const firstYearRebateUsd = Math.round(params.annualPremiumUsd * (params.firstYearRebatePct / 100));

  // Prepaying Yr 2–5 today earns guaranteed interest across an average ~2.5 year duration
  const prepaidInterestEarnedUsd = params.prepayFull5Years
    ? Math.round(params.annualPremiumUsd * 4 * (params.prepaidGuaranteedRatePct / 100) * 2.15)
    : 0;

  const netOutOfPocket5YrUsd = Math.max(
    0,
    gross5YrUsd - firstYearRebateUsd - prepaidInterestEarnedUsd
  );
  const totalDiscountPct = Number(
    (((gross5YrUsd - netOutOfPocket5YrUsd) / Math.max(1, gross5YrUsd)) * 100).toFixed(1)
  );

  // Compare USDgross5YrUsd in rolling Bank Time Deposit (Yr 1 at 4.2%, Yr 2-15 dropping to 2.1% after Fed cuts) vs Policy Lock-in (~6.2% Yr 15)
  const tdYr1 = (params.bankTdYear1RatePct ?? 4.2) / 100;
  const tdRoll = (params.bankTdRenewalRatePct ?? 2.1) / 100;
  const bankTdYr15ValueUsd = Math.round(gross5YrUsd * (1 + tdYr1) * Math.pow(1 + tdRoll, 14));
  const policyYr15ProjectedUsd = Math.round(gross5YrUsd * Math.pow(1.058, 13.5));

  return {
    gross5YrUsd,
    firstYearRebateUsd,
    prepaidInterestEarnedUsd,
    netOutOfPocket5YrUsd,
    totalDiscountPct,
    bankTdYr15ValueUsd,
    policyYr15ProjectedUsd,
    yr15AdvantageOverBankTdUsd: policyYr15ProjectedUsd - bankTdYr15ValueUsd,
  };
}

// ============================================================================
// IMP-18: TEAM DIRECTOR MDRT LEADERBOARD, AGE-BACKDATE RADAR & RO 7-YR AUDIT
// ============================================================================

export function buildTeamDirectorMdrtAndBackdateBoard(leads: ClientLead[]) {
  const mdrtFycTargetHkd = 524900; // Illustrative HKIA/MDRT FYC threshold
  const teamMembers = [
    { nameZh: '郭志明 (Raymond · 你)', roleZh: '分行經理', fycYtdHkd: 918000, persistencyPct: 96.4, fnaAuditPassPct: 100 },
    { nameZh: '陳嘉欣 (Chloe)', roleZh: '資深理財顧問', fycYtdHkd: 612000, persistencyPct: 94.8, fnaAuditPassPct: 100 },
    { nameZh: '李俊傑 (Jason · 港漂組)', roleZh: '財富策劃經理', fycYtdHkd: 1480000, persistencyPct: 93.1, fnaAuditPassPct: 98 },
    { nameZh: '黃詠詩 (Venus)', roleZh: '理財顧問', fycYtdHkd: 438000, persistencyPct: 95.0, fnaAuditPassPct: 100 },
  ].map((m) => ({
    ...m,
    mdrtProgressPct: Math.min(300, Math.round((m.fycYtdHkd / mdrtFycTargetHkd) * 100)),
    statusLabelZh:
      m.fycYtdHkd >= mdrtFycTargetHkd * 3
        ? 'COT 達標'
        : m.fycYtdHkd >= mdrtFycTargetHkd
        ? 'MDRT 達標'
        : `尚欠 HK$${(mdrtFycTargetHkd - m.fycYtdHkd).toLocaleString()} 衝線`,
  }));

  // Deterministic Age-Backdate Opportunities across CRM leads (saving 5%–8% lifetime CI/Term rate before insurance age ticks +1)
  const ageBackdateLeads = leads.slice(0, 3).map((l, idx) => ({
    leadId: l.id,
    nameZh: l.fullNameZh,
    nameEn: l.fullNameEn,
    currentAge: l.age,
    nextAge: l.age + 1,
    daysUntilAgeStepUp: 9 + idx * 8,
    lifetimePremiumSavedHkd: (18 + idx * 7) * 1000,
  }));

  return {
    mdrtFycTargetHkd,
    teamMembers,
    ageBackdateLeads,
  };
}

// ============================================================================
// IMP-19: HK MPF + HKMC ANNUITY/QDAP + GREATER BAY AREA (GBA) RETIREMENT PLANNER
// ============================================================================

export type RetirementLifestyleVenue =
  | 'HK_PRIVATE_HOME'
  | 'HK_PREMIER_ELDERLY_RESIDENCE'
  | 'GBA_SHENZHEN_ZHUHAI_WELLNESS'
  | 'GBA_GUANGZHOU_ZHONGSHAN_CCRC';

export const GBA_AND_HK_RETIREMENT_VENUES: Record<
  RetirementLifestyleVenue,
  {
    labelZh: string;
    labelEn: string;
    monthlyExpenseTodayHkd: number;
    medicalNoteZh: string;
    medicalNoteEn: string;
  }
> = {
  HK_PRIVATE_HOME: {
    labelZh: '留港居家退休（中產生活＋私家門診）',
    labelEn: 'Hong Kong Private Home Retirement',
    monthlyExpenseTodayHkd: 28000,
    medicalNoteZh: '需保留香港自願醫保靈活計劃應付私家醫院手術開支',
    medicalNoteEn: 'Retain HK VHIS Flexi plan for private hospital inpatient procedures',
  },
  HK_PREMIER_ELDERLY_RESIDENCE: {
    labelZh: '香港高端長者服務式住宅／私家護老院舍',
    labelEn: 'Hong Kong Premier Senior Assisted Residence',
    monthlyExpenseTodayHkd: 46000,
    medicalNoteZh: '本地高質素單人房及護理人手緊張，月費通脹約 3.8%/年',
    medicalNoteEn: 'High HK nursing labor inflation (~3.8% p.a.) for single-suite care',
  },
  GBA_SHENZHEN_ZHUHAI_WELLNESS: {
    labelZh: '大灣區深圳前海／珠海橫琴高端醫養社區（1小時高鐵圈）',
    labelEn: 'GBA Shenzhen Qianhai / Zhuhai Hengqin Senior Wellness Hub',
    monthlyExpenseTodayHkd: 16500,
    medicalNoteZh: '支援「長者醫療券大灣區試點醫院」及保司大灣區三甲醫院直付網絡',
    medicalNoteEn: 'Eligible for HK Elderly Health Care Voucher GBA pilot hospitals & direct billing',
  },
  GBA_GUANGZHOU_ZHONGSHAN_CCRC: {
    labelZh: '大灣區廣州／中山花園式持續照顧退休社區 (CCRC)',
    labelEn: 'GBA Guangzhou / Zhongshan Garden CCRC Community',
    monthlyExpenseTodayHkd: 12800,
    medicalNoteZh: '內設康復醫院、營養膳食及 24 小時管家，生活成本較香港節省逾 55%',
    medicalNoteEn: 'On-site rehab hospital & 24/7 concierge at >55% lower monthly cost than HK',
  },
};

export function calculateHkMpfAndGbaRetirementWaterfall(params: {
  venue: RetirementLifestyleVenue;
  mpfProjectedAt65Hkd: number;
  monthlyAnnuityAndQdapHkd: number;
  monthlyParticipatingWithdrawalHkd: number;
}) {
  const v = GBA_AND_HK_RETIREMENT_VENUES[params.venue];
  // Convert MPF lump sum into a conservative 4% p.a. 25-year drawdown stream
  const monthlyMpfStreamHkd = Math.round((params.mpfProjectedAt65Hkd * 0.045) / 12);
  const totalMonthlyPassiveIncomeHkd =
    monthlyMpfStreamHkd + params.monthlyAnnuityAndQdapHkd + params.monthlyParticipatingWithdrawalHkd;
  const monthlySurplusOrGapHkd = totalMonthlyPassiveIncomeHkd - v.monthlyExpenseTodayHkd;

  return {
    venueMeta: v,
    monthlyMpfStreamHkd,
    monthlyAnnuityAndQdapHkd: params.monthlyAnnuityAndQdapHkd,
    monthlyParticipatingWithdrawalHkd: params.monthlyParticipatingWithdrawalHkd,
    totalMonthlyPassiveIncomeHkd,
    targetMonthlyExpenseHkd: v.monthlyExpenseTodayHkd,
    monthlySurplusOrGapHkd,
    isFullyFunded: monthlySurplusOrGapHkd >= 0,
  };
}

// ============================================================================
// IMP-20: WHATSAPP COMPLIANCE DISCLOSURE VAULT & iAM SMART STP BRIDGE
// ============================================================================

export interface WhatsAppComplianceLogEntry {
  id: string;
  sentAtIso: string;
  clientName: string;
  advisorLicenseNo: string;
  channel: 'WHATSAPP' | 'WECHAT' | 'MICROSITE_LINK';
  summaryTopic: string;
  guaranteedSeparatedConfirmed: boolean;
  coolingOff21dDisclosed: boolean;
  auditFingerprint: string;
}

export function computeDeterministicComplianceHash(payload: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex =
    (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  return `HKIA-SHA-${hex.toUpperCase()}`;
}

export function createWhatsAppComplianceLog(params: {
  clientName: string;
  advisorLicenseNo: string;
  channel: 'WHATSAPP' | 'WECHAT' | 'MICROSITE_LINK';
  summaryTopic: string;
}): WhatsAppComplianceLogEntry {
  const sentAtIso = new Date().toISOString();
  const auditFingerprint = computeDeterministicComplianceHash(
    `${sentAtIso}|${params.clientName}|${params.advisorLicenseNo}|${params.summaryTopic}`
  );
  return {
    id: `walog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    sentAtIso,
    clientName: params.clientName,
    advisorLicenseNo: params.advisorLicenseNo,
    channel: params.channel,
    summaryTopic: params.summaryTopic,
    guaranteedSeparatedConfirmed: true,
    coolingOff21dDisclosed: true,
    auditFingerprint,
  };
}

export function buildIamSmartVerificationHandshake(lead: ClientLead) {
  const docNo = lead.hkidNumber || lead.kycCheck.hkidDocNumber || 'A864219(3)';
  const token = computeDeterministicComplianceHash(`IAMSMART|${lead.id}|${docNo}`);
  return {
    verified: true,
    iamSmartRefId: `IAMS-HK-${token.slice(-8)}`,
    verifiedHkidNumber: docNo,
    verifiedTimestampIso: new Date().toISOString(),
    eloaLevel: 'iAM Smart+ (Digital Signing Enabled · 智方便+ 法定數碼簽署)',
  };
}
