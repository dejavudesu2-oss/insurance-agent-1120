import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  Loader2,
  Mic,
  Sparkles,
  Wrench,
} from 'lucide-react';
import {
  calculateCompliantQuote,
  FX_RATES_FROM_USD,
} from '../domain/actuarialEngine';
import {
  analyzePortfolioProtectionGap,
  buildAnniversaryAndFxAlertQueue,
  buildMicroProposalText,
  calculateMdrtProjectionAndPersistency,
  evaluateHkiaCpdAndCpfiCompliance,
  evaluateMcvSigningConcierge,
  evaluateProcedureShortfallAndClaim,
  evaluateSubStandardPreUnderwriting,
  HK_SURGICAL_PROCEDURES,
  LegacyTargetCurrency,
  optimizeJointTaxTrio,
  PreUnderwritingConditionCode,
  simulateMultiCurrencyLegacySplit,
  simulatePremiumFinancingStressTest,
  WithdrawalPreset,
} from '../domain/advisoryEngines';
import { localizePlanStrings, toSimplifiedChinese, useLanguage } from '../domain/i18n';
import { copyTextSafe } from '../utils/clipboardAndDom';
import {
  ClientLead,
  CurrencyCode,
  FnaRecord,
  HospitalDeductibleHkd,
  InsurancePlan,
  IntermediaryProfile,
  LeadStage,
  PolicyApplicationRecord,
} from '../domain/types';
import {
  downloadMicroProposalPngCard,
  generateProtectionMapPdfBytes,
  triggerBrowserDownload,
} from '../services/pdfGenerator';
import { recommendBestFitPlansForContext } from '../domain/clauseAndMonetizationEngine';
import {
  CoverageGapComparisonBars,
  LegacyWithdrawalBarChart,
  MdrtMilestoneProgressTrack,
  StackedBillWaterfallBar,
} from './VisualCharts';

export type FeaturePillarId =
  | 'ALL'
  | 'ACTUARIAL_TAX'
  | 'MCV_HNW'
  | 'UNDERWRITING_CLAIMS'
  | 'MDRT_RETENTION';

export type AdvisoryFunctionCode =
  | 'FN-01'
  | 'FN-02'
  | 'FN-03'
  | 'FN-04'
  | 'FN-05'
  | 'FN-06'
  | 'FN-07'
  | 'FN-08'
  | 'FN-09'
  | 'FN-10'
  | 'FN-11'
  | 'FN-12';

export interface SuggestedFunctionBlueprint {
  id: string;
  code: AdvisoryFunctionCode;
  pillar: Exclude<FeaturePillarId, 'ALL'>;
  pillarLabelEn: string;
  pillarLabelZh: string;
  titleEn: string;
  titleZh: string;
  impactMetricEn: string;
  impactMetricZh: string;
  complianceTag: string;
  summaryEn: string;
  summaryZh: string;
}

export const SUGGESTED_HK_FUNCTIONS: SuggestedFunctionBlueprint[] = [
  {
    id: 'roadmap-fn-01',
    code: 'FN-01',
    pillar: 'ACTUARIAL_TAX',
    pillarLabelEn: 'Wealth, Tax & Actuarial Closing',
    pillarLabelZh: '財富精算、扣稅及促成工具',
    titleEn: 'Existing Policy Portfolio X-Ray, Group Medical → VHIS Bridge & 1-Page PDF',
    titleZh: '現有保單體檢 X-Ray、公司醫保銜接計算機及一頁式家庭保障圖 PDF',
    impactMetricEn: '+38% Cross-Sell Conversion',
    impactMetricZh: '加保轉化率提升 +38%',
    complianceTag: 'HKIA GL30 FNA',
    summaryEn:
      'Maps Life (10x income + mortgage) & Critical Illness (3.5x income) gaps, bridges Employer Group Medical into $20k/$50k deductible VHIS, and exports a 1-Page Protection Map PDF.',
    summaryZh:
      '精算人壽及危疾保障缺口、公司團體醫保銜接高自付額 VHIS 節省保費比例，並一鍵匯出一頁式家庭保障全景圖 PDF。',
  },
  {
    id: 'roadmap-fn-02',
    code: 'FN-02',
    pillar: 'ACTUARIAL_TAX',
    pillarLabelEn: 'Wealth, Tax & Actuarial Closing',
    pillarLabelZh: '財富精算、扣稅及促成工具',
    titleEn: '"Tax Trio" (VHIS + QDAP + MPF TVC) Joint vs. Separate Tax Optimizer',
    titleZh: '「扣稅三寶」夫婦合併 vs 分開評稅及稅後 IRR 精算模擬器',
    impactMetricEn: 'Up to HK$23,000+ Tax Saved/yr',
    impactMetricZh: '每年精準節省高達 HK$23,000+ 稅款',
    complianceTag: 'HK IRD Cap. 112',
    summaryEn:
      'Compares Separate vs. Joint Salaries Tax assessment across 2%–17% progressive brackets vs. 15% standard tax and computes post-tax QDAP IRR uplift.',
    summaryZh:
      '對比夫婦分開評稅與合併評稅、集中高收入一方申報多份父母子女 VHIS 及計算退稅後真實 Post-Tax IRR 回報提升。',
  },
  {
    id: 'roadmap-fn-03',
    code: 'FN-03',
    pillar: 'ACTUARIAL_TAX',
    pillarLabelEn: 'Wealth, Tax & Actuarial Closing',
    pillarLabelZh: '財富精算、扣稅及促成工具',
    titleEn: 'Multi-Currency Policy Split & "567 / 568" 3-Generation Legacy Simulator',
    titleZh: '多元貨幣保單分拆、「567／568 提領」及留學三代傳承模擬器',
    impactMetricEn: '2.4x Larger Savings Ticket',
    impactMetricZh: '儲蓄單平均保費提升 2.4 倍',
    complianceTag: 'HKIA GL28 Cap',
    summaryEn:
      'Simulates 5-6-7 / 5-6-8 passive withdrawals, Years 15–18 overseas university tuition drawdowns, currency switching (USD/GBP/CAD/AUD/RMB), and multi-child policy splitting.',
    summaryZh:
      '動態模擬熱門「567／568 提領」、海外大學學費提領、英鎊／加元／澳元／人民幣轉換及保單分拆予多名子女後之淨現金價值。',
  },
  {
    id: 'roadmap-fn-04',
    code: 'FN-04',
    pillar: 'MCV_HNW',
    pillarLabelEn: 'MCV Cross-Border & HNW Concierge',
    pillarLabelZh: '內地訪客 (MCV) 及高淨值服務',
    titleEn: 'Mainland Visitor (MCV) HK Signing, Bank Booking & eDDA Renewal Concierge',
    titleZh: '內地訪客 (MCV) 赴港簽單、港卡預約開戶及 eDDA 續保繳費管家',
    impactMetricEn: '-65% MCV Admin Friction',
    impactMetricZh: '減少 65% 跨境簽單補件與斷供',
    complianceTag: 'HKIA MCV / AML',
    summaryEn:
      'Checks HKSAR Landing Slip onshore compliance, BOCHK/HSBC/ZA Bank booking timelines, AML/EDD source-of-wealth tiering, and cross-border renewal FX fees.',
    summaryZh:
      '核驗入境處白紙仔境內簽署規定、中銀／滙豐／眾安開戶預約、大額保費 AML 財力證明分級及續期繳費手續費對比。',
  },
  {
    id: 'roadmap-fn-05',
    code: 'FN-05',
    pillar: 'MCV_HNW',
    pillarLabelEn: 'MCV Cross-Border & HNW Concierge',
    pillarLabelZh: '內地訪客 (MCV) 及高淨值服務',
    titleEn: 'Premium Financing Leverage & Mandatory +200 bps Stress-Test Simulator',
    titleZh: '私人銀行保費融資利差及金管局／保監局 +200 點子加息壓測儀',
    impactMetricEn: 'HNW Ticket > US$1M',
    impactMetricZh: '專攻百萬美元高淨值大單',
    complianceTag: 'HKMA / IA IFS-PF',
    summaryEn:
      'Calculates Day-1 CSV LTV leverage vs. cash purchase and runs the mandatory +200 bps HIBOR/SOFR rate-hike stress test required on IFS-PF disclosures.',
    summaryZh:
      '精算首日退保價值貸款成數槓桿效應，並執行監管規定《保費融資重要資料聲明書》必須披露之 +200 點子加息壓力測試。',
  },
  {
    id: 'roadmap-fn-06',
    code: 'FN-06',
    pillar: 'MCV_HNW',
    pillarLabelEn: 'MCV Cross-Border & HNW Concierge',
    pillarLabelZh: '內地訪客 (MCV) 及高淨值服務',
    titleEn: '1-Click WhatsApp / WeChat Compliant Micro-Proposal Card & PNG Generator',
    titleZh: 'WhatsApp／微信一鍵客製化合規精算摘要及 4:5 圖卡生成器',
    impactMetricEn: '3x Faster Client Reply',
    impactMetricZh: '客戶訊息回覆率提升 3 倍',
    complianceTag: 'GL28 Safe Mode',
    summaryEn:
      'Generates trilingual WhatsApp/WeChat text and downloadable 4:5 PNG micro-proposal cards with Client Safe Mode anonymization and IA license watermark.',
    summaryZh:
      '一鍵產出繁／簡／英三語 WhatsApp／微信文字摘要及可下載 4:5 手機精算圖卡（支援匿名鎖及保監牌照浮水印）。',
  },
  {
    id: 'roadmap-fn-07',
    code: 'FN-07',
    pillar: 'UNDERWRITING_CLAIMS',
    pillarLabelEn: 'Pre-Underwriting & Claims AI',
    pillarLabelZh: '智能預核保及理賠管家',
    titleEn: 'Sub-Standard Health (TI-RADS / BI-RADS / Three-Highs) AI Pre-Underwriting',
    titleZh: '體況異常（甲狀腺／乳腺結節／三高／乙肝）跨保司 AI 預核保引擎',
    impactMetricEn: '-50% Declined / Postponed Risk',
    impactMetricZh: '減少 50% 正式拒保或延期紀錄',
    complianceTag: 'Medical UW Triage',
    summaryEn:
      'Evaluates TI-RADS, BI-RADS, Fatty Liver, Hypertension, HBV Carrier & BMI across HK insurers + live Gemini Chief Underwriter second opinion.',
    summaryZh:
      '遞交正式投保前預判各大香港保司對結節、脂肪肝、乙肝及高血壓之核保尺度（加費 vs 除外），並附 Gemini 核保總監即時建議。',
  },
  {
    id: 'roadmap-fn-08',
    code: 'FN-08',
    pillar: 'UNDERWRITING_CLAIMS',
    pillarLabelEn: 'Pre-Underwriting & Claims AI',
    pillarLabelZh: '智能預核保及理賠管家',
    titleEn: 'Day-Case Endoscopy / Hospital Procedure Shortfall & Dual-Claim Concierge',
    titleZh: '日間腸胃鏡／私院手術賠償差額及「團體醫保 → VHIS」雙重索償管家',
    impactMetricEn: '99% First-Time Claim Approval',
    impactMetricZh: '首次理賠齊件批核率達 99%',
    complianceTag: 'HKFI Claims Best Practice',
    summaryEn:
      'Checks Day-Case Network vs. Hospital Inpatient medical necessity and coordinates Group Medical 1st claim → Personal VHIS 2nd residual claim.',
    summaryZh:
      '即時核對日間手術中心與入院「醫療必需」審批風險，並生成公司團體醫保優先索償、個人 VHIS 餘額無縫報銷步驟。',
  },
  {
    id: 'roadmap-fn-09',
    code: 'FN-09',
    pillar: 'UNDERWRITING_CLAIMS',
    pillarLabelEn: 'Pre-Underwriting & Claims AI',
    pillarLabelZh: '智能預核保及理賠管家',
    titleEn: 'Cantonese / Mandarin Meeting Audio & Transcript → Auto-GL30 FNA Filler',
    titleZh: '港式粵語夾英文／普通話會談錄音及逐字稿 → 自動填寫 GL30 FNA',
    impactMetricEn: 'Saves 45 mins / Client Meeting',
    impactMetricZh: '每次見客節省 45 分鐘文書輸入',
    complianceTag: 'PDPO PICS + GL30',
    summaryEn:
      'Transcribes audio or mixed Cantonese-English / Mandarin meeting notes via Gemini and writes verified GL30 FNA records directly into Lead CRM.',
    summaryZh:
      '於確認 PDPO 收集個人資料聲明後，透過 Gemini 自動從粵／普會談紀錄提取月入、流動資產及風險取向，一鍵寫入客戶 CRM 檔案。',
  },
  {
    id: 'roadmap-fn-10',
    code: 'FN-10',
    pillar: 'MDRT_RETENTION',
    pillarLabelEn: 'MDRT Agency & Renewal Management',
    pillarLabelZh: 'MDRT 業績管理及續保合規',
    titleEn: 'MDRT / COT / TOT Commission Progress & 13/25-Month Persistency Radar',
    titleZh: 'MDRT／COT／TOT 佣金進度及 13／25 個月續保率防回撥儀表板',
    impactMetricEn: 'Real-Time MDRT Pace & Zero Clawback',
    impactMetricZh: '實時追蹤 MDRT 進度並防範佣金回撥',
    complianceTag: 'Persistency Gate',
    summaryEn:
      'Tracks live HK MDRT (HK$579,700 FYC), COT & TOT progress from issued STP policies + weighted CRM pipeline and flags 13-month clawback risks.',
    summaryZh:
      '串聯已簽發保單及 CRM 銷售漏斗實時統計香港區 MDRT／COT／TOT 進度，並預警 13 個月續保斷供回撥風險。',
  },
  {
    id: 'roadmap-fn-11',
    code: 'FN-11',
    pillar: 'MDRT_RETENTION',
    pillarLabelEn: 'MDRT Agency & Renewal Management',
    pillarLabelZh: 'MDRT 業績管理及續保合規',
    titleEn: 'Smart Policy Anniversary, Yr-3 FX Switch & Yr-15 Bonus Lock-In Queue',
    titleZh: '保單週年續保、第3年貨幣轉換、第15年紅利鎖定及稅季提醒佇列',
    impactMetricEn: '+96% Renewal Retention Rate',
    impactMetricZh: '續保留存率提升至 96%+',
    complianceTag: 'Client Servicing',
    summaryEn:
      'Actionable queue of upcoming renewals, Year-3 currency conversion windows, Year-15 terminal bonus lock-ins, and April BIR60 tax certificate dispatches.',
    summaryZh:
      '集中列出即將到期續保、第 3 週年貨幣轉換及保單分拆、第 15 週年終期紅利鎖定及 4 月報稅證明書一鍵 WhatsApp 發送佇列。',
  },
  {
    id: 'roadmap-fn-12',
    code: 'FN-12',
    pillar: 'MDRT_RETENTION',
    pillarLabelEn: 'MDRT Agency & Renewal Management',
    pillarLabelZh: 'MDRT 業績管理及續保合規',
    titleEn: 'HKIA Annual 15-Hour CPD Ledger, 21-Day Cooling-Off & CPFI Auditor',
    titleZh: '保監局年度 15 小時 CPD 學分帳本、21日冷靜期及轉保 CPFI 審計器',
    impactMetricEn: '100% HKIA Audit Readiness',
    impactMetricZh: '100% 符合保監局合規審查標準',
    complianceTag: 'HKIA GL24 / CPFI',
    summaryEn:
      'Audits mandatory 15 CPD hours (incl. min 3 Ethics hours), 21-day cooling-off delivery timestamps, and CPFI policy-replacement surrender losses.',
    summaryZh:
      '核對保監局每年 15 小時 CPD（含最少 3 小時道德／規例必修科）、21 日冷靜期簽收及《客戶保障聲明書（CPFI）》退保損失。',
  },
];

const PILLAR_FILTERS: Array<{
  id: FeaturePillarId;
  labelEn: string;
  labelZh: string;
}> = [
  { id: 'ALL', labelEn: 'All 12 Live Tools', labelZh: '全部 12 項實戰工具' },
  { id: 'ACTUARIAL_TAX', labelEn: 'Wealth & Tax', labelZh: '財富精算及扣稅' },
  { id: 'MCV_HNW', labelEn: 'MCV & HNW', labelZh: '內地訪客及高淨值' },
  { id: 'UNDERWRITING_CLAIMS', labelEn: 'AI Pre-UW & Voice FNA', labelZh: '預核保、理賠及語音FNA' },
  { id: 'MDRT_RETENTION', labelEn: 'MDRT & HKIA CPD', labelZh: 'MDRT 業績及合規' },
];

interface FeatureLabViewProps {
  prioritizedIds: string[];
  onTogglePrioritize: (id: string) => void;
  totalPlansCount: number;
  totalInsurersCount: number;
  leads: ClientLead[];
  selectedLeadId: string;
  onSelectLeadId: (leadId: string) => void;
  onUpdateLead: (leadId: string, updater: (prev: ClientLead) => ClientLead) => void;
  plans: InsurancePlan[];
  selectedPlanId: string;
  onSelectPlanId: (planId: string) => void;
  applications: PolicyApplicationRecord[];
  intermediary: IntermediaryProfile;
  currency: CurrencyCode;
  sumAssuredUsd: number;
  paymentTermYears: number;
  clientSafeMode: boolean;
  onToggleClientSafeMode: () => void;
  activeModuleCode?: AdvisoryFunctionCode;
  onSelectModuleCode?: (code: AdvisoryFunctionCode) => void;
  embeddedSingleTool?: boolean;
}

export const FeatureLabView: React.FC<FeatureLabViewProps> = ({
  prioritizedIds,
  onTogglePrioritize,
  totalPlansCount,
  totalInsurersCount,
  leads,
  selectedLeadId,
  onSelectLeadId,
  onUpdateLead,
  plans,
  selectedPlanId,
  onSelectPlanId,
  applications,
  intermediary,
  currency,
  sumAssuredUsd,
  paymentTermYears,
  clientSafeMode,
  onToggleClientSafeMode,
  activeModuleCode = 'FN-01',
  onSelectModuleCode,
  embeddedSingleTool = false,
}) => {
  const { lang, t } = useLanguage();
  const [pillarFilter, setPillarFilter] = useState<FeaturePillarId>('ALL');
  const [selectedCode, setSelectedCode] = useState<AdvisoryFunctionCode>(activeModuleCode);

  useEffect(() => {
    setSelectedCode(activeModuleCode);
  }, [activeModuleCode]);

  const selectModule = (code: AdvisoryFunctionCode) => {
    setSelectedCode(code);
    onSelectModuleCode?.(code);
  };

  const activeLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || leads[0],
    [leads, selectedLeadId]
  );
  const needMatchedPlans = useMemo(
    () =>
      recommendBestFitPlansForContext({
        plans,
        lead: activeLead,
        intermediary,
        contextHint: 'MICRO_PROPOSAL',
        limit: 3,
      }),
    [plans, activeLead, intermediary]
  );
  const activePlan = useMemo(
    () =>
      (selectedPlanId ? plans.find((p) => p.id === selectedPlanId) : undefined) ||
      needMatchedPlans[0]?.plan ||
      plans[0],
    [plans, selectedPlanId, needMatchedPlans]
  );

  // ---------------- FN-01 State ----------------
  const [fn01IncomeHkd, setFn01IncomeHkd] = useState<number>(
    (activeLead?.fnaRecord?.monthlyIncomeHkd || 75000) * 12
  );
  const [fn01MortgageHkd, setFn01MortgageHkd] = useState<number>(4200000);
  const [fn01ExistingLifeHkd, setFn01ExistingLifeHkd] = useState<number>(2000000);
  const [fn01ExistingCiHkd, setFn01ExistingCiHkd] = useState<number>(800000);
  const [fn01GroupSurgHkd, setFn01GroupSurgHkd] = useState<number>(30000);
  const [fn01Deductible, setFn01Deductible] = useState<HospitalDeductibleHkd>(20000);
  const [exportingMapPdf, setExportingMapPdf] = useState(false);

  const fn01Result = useMemo(
    () =>
      analyzePortfolioProtectionGap({
        annualIncomeHkd: fn01IncomeHkd,
        outstandingMortgageHkd: fn01MortgageHkd,
        dependentsCount: activeLead?.fnaRecord?.dependentsCount ?? 2,
        existingLifeCoverHkd: fn01ExistingLifeHkd,
        existingCiCoverHkd: fn01ExistingCiHkd,
        employerGroupRoomLimitPerDayHkd: 1000,
        employerSurgicalLimitHkd: fn01GroupSurgHkd,
        selectedVhisDeductibleHkd: fn01Deductible,
        clientAge: activeLead?.age ?? 36,
      }),
    [
      fn01IncomeHkd,
      fn01MortgageHkd,
      activeLead,
      fn01ExistingLifeHkd,
      fn01ExistingCiHkd,
      fn01GroupSurgHkd,
      fn01Deductible,
    ]
  );

  // ---------------- FN-02 State ----------------
  const [fn02SelfInc, setFn02SelfInc] = useState<number>(960000);
  const [fn02SpouseInc, setFn02SpouseInc] = useState<number>(540000);
  const [fn02Children, setFn02Children] = useState<number>(1);
  const [fn02Parents60, setFn02Parents60] = useState<number>(2);
  const [fn02SelfQdap, setFn02SelfQdap] = useState<number>(60000);
  const [fn02SpouseQdap, setFn02SpouseQdap] = useState<number>(60000);
  const [fn02VhisCount, setFn02VhisCount] = useState<number>(4);
  const [fn02AvgVhis, setFn02AvgVhis] = useState<number>(8500);

  const fn02Result = useMemo(
    () =>
      optimizeJointTaxTrio({
        selfAnnualAssessableIncomeHkd: fn02SelfInc,
        spouseAnnualAssessableIncomeHkd: fn02SpouseInc,
        dependentChildrenCount: fn02Children,
        eligibleParents55To59Count: 0,
        eligibleParents60PlusCount: fn02Parents60,
        selfQdapAndTvcPremiumHkd: fn02SelfQdap,
        spouseQdapAndTvcPremiumHkd: fn02SpouseQdap,
        vhisInsuredRelativesCount: fn02VhisCount,
        avgVhisPremiumPerPersonHkd: fn02AvgVhis,
        qdapPreTaxIrrPct: 4.85,
      }),
    [
      fn02SelfInc,
      fn02SpouseInc,
      fn02Children,
      fn02Parents60,
      fn02SelfQdap,
      fn02SpouseQdap,
      fn02VhisCount,
      fn02AvgVhis,
    ]
  );

  // ---------------- FN-03 State ----------------
  const [fn03AnnualUsd, setFn03AnnualUsd] = useState<number>(50000);
  const [fn03Preset, setFn03Preset] = useState<WithdrawalPreset>('567_RETIREMENT');
  const [fn03TargetCcy, setFn03TargetCcy] = useState<LegacyTargetCurrency>('GBP');
  const [fn03SplitCount, setFn03SplitCount] = useState<number>(2);

  const fn03Result = useMemo(
    () =>
      simulateMultiCurrencyLegacySplit({
        annualPremiumUsd: fn03AnnualUsd,
        paymentTermYears: 5,
        preset: fn03Preset,
        targetCurrency: fn03TargetCcy,
        splitBeneficiariesCount: fn03SplitCount,
        clientCurrentAge: activeLead?.age ?? 36,
      }),
    [fn03AnnualUsd, fn03Preset, fn03TargetCcy, fn03SplitCount, activeLead]
  );

  // ---------------- FN-04 State ----------------
  const [fn04AnnualUsd, setFn04AnnualUsd] = useState<number>(120000);
  const [fn04HasHkBank, setFn04HasHkBank] = useState<boolean>(false);
  const fn04Result = useMemo(
    () =>
      evaluateMcvSigningConcierge({
        annualPremiumUsd: fn04AnnualUsd,
        hasHkBankAccount: fn04HasHkBank,
        entrySlipVerified: Boolean(activeLead?.kycCheck.mcvEntrySlipVerified),
      }),
    [fn04AnnualUsd, fn04HasHkBank, activeLead]
  );

  // ---------------- FN-05 State ----------------
  const [fn05SinglePremUsd, setFn05SinglePremUsd] = useState<number>(1000000);
  const [fn05BenchmarkPct, setFn05BenchmarkPct] = useState<number>(3.65);
  const [fn05SpreadPct, setFn05SpreadPct] = useState<number>(1.15);
  const [fn05CreditingPct, setFn05CreditingPct] = useState<number>(5.35);

  const fn05Result = useMemo(
    () =>
      simulatePremiumFinancingStressTest({
        totalSinglePremiumUsd: fn05SinglePremUsd,
        day1CsvRatioPct: 82,
        bankLtvOnCsvPct: 90,
        fundingBenchmarkPct: fn05BenchmarkPct,
        bankSpreadPct: fn05SpreadPct,
        policyCreditingRatePct: fn05CreditingPct,
      }),
    [fn05SinglePremUsd, fn05BenchmarkPct, fn05SpreadPct, fn05CreditingPct]
  );

  // ---------------- FN-06 State ----------------
  const [copiedMicro, setCopiedMicro] = useState(false);
  const fn06Quote = useMemo(() => {
    const fx = FX_RATES_FROM_USD[currency];
    const term = activePlan.supportedPaymentTerms.includes(paymentTermYears)
      ? paymentTermYears
      : activePlan.supportedPaymentTerms[0] || 10;
    return calculateCompliantQuote({
      plan: activePlan,
      age: activeLead?.age ?? 35,
      isSmoker: activeLead?.isSmoker ?? false,
      currency,
      sumAssuredInSelectedCurrency: Math.round(sumAssuredUsd * fx),
      paymentTermYears: term,
    });
  }, [activePlan, activeLead, currency, sumAssuredUsd, paymentTermYears]);

  const fn06Yr20 = fn06Quote.projections.find((p) => p.policyYear === 20);
  const fn06Text = useMemo(
    () =>
      buildMicroProposalText({
        lead: activeLead,
        plan: activePlan,
        currency,
        annualPremium: fn06Quote.annualPremium,
        sumAssured: fn06Quote.sumAssured,
        yr20TotalValue: fn06Yr20?.totalSurrenderValue ?? 0,
        yr20GuaranteedValue: fn06Yr20?.guaranteedCashValue ?? 0,
        effectiveIrrPct: fn06Quote.effectiveIllustratedIrrPercent,
        intermediary,
        clientSafeMode,
        lang,
      }),
    [activeLead, activePlan, currency, fn06Quote, fn06Yr20, intermediary, clientSafeMode, lang]
  );

  // ---------------- FN-07 State ----------------
  const [fn07Condition, setFn07Condition] =
    useState<PreUnderwritingConditionCode>('THYROID_NODULE_TIRADS');
  const [fn07Severity, setFn07Severity] = useState<'MILD' | 'MODERATE' | 'BORDERLINE_HIGH'>('MILD');
  const [fn07Notes, setFn07Notes] = useState('TI-RADS 2 benign cystic nodule 6mm, normal TSH/FT4');
  const [fn07AiOpinion, setFn07AiOpinion] = useState<string | null>(null);
  const [fn07Loading, setFn07Loading] = useState(false);

  const fn07Matrix = useMemo(
    () =>
      evaluateSubStandardPreUnderwriting({
        conditionCode: fn07Condition,
        severityLevel: fn07Severity,
      }),
    [fn07Condition, fn07Severity]
  );

  const runFn07AiSecondOpinion = async () => {
    setFn07Loading(true);
    try {
      const res = await fetch('/api/ai/pre-underwrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conditionCode: fn07Condition,
          severityLevel: fn07Severity,
          clinicalNotes: fn07Notes,
          language: lang,
        }),
      });
      const data = await res.json();
      setFn07AiOpinion(data?.aiSecondOpinion || null);
    } catch {
      setFn07AiOpinion(t(fn07Matrix.submissionTipEn, fn07Matrix.submissionTipZh));
    } finally {
      setFn07Loading(false);
    }
  };

  // ---------------- FN-08 State ----------------
  const [fn08ProcId, setFn08ProcId] = useState<string>(HK_SURGICAL_PROCEDURES[0].id);
  const [fn08Setting, setFn08Setting] = useState<
    'DAY_CASE_NETWORK' | 'HOSPITAL_STANDARD_WARD' | 'HOSPITAL_PRIVATE_ROOM'
  >('DAY_CASE_NETWORK');
  const [fn08EmpCap, setFn08EmpCap] = useState<number>(20000);

  const fn08Result = useMemo(
    () =>
      evaluateProcedureShortfallAndClaim({
        procedureId: fn08ProcId,
        setting: fn08Setting,
        employerGroupLimitHkd: fn08EmpCap,
        personalPlanTier: 'VHIS_FLEXI_SMM',
        personalDeductibleHkd: 20000,
      }),
    [fn08ProcId, fn08Setting, fn08EmpCap]
  );

  // ---------------- FN-09 State ----------------
  const [fn09PicsConsent, setFn09PicsConsent] = useState<boolean>(true);
  const [fn09Transcript, setFn09Transcript] = useState<string>(
    '顧問：陳生你好，今日同你做返保監 GL30 FNA 財務分析。客戶：我而家月入 85k 左右，供樓連屋企每月開支大約 38,000 蚊，銀行流動現金存款有 250 萬港幣。屋企有太太同兩個小朋友，主要想幫小朋友儲英國升學 education fund，同埋買返份 VHIS 自願醫保扣稅兼去養和睇症免找數，風險取向算 Balanced 穩健增長。'
  );
  const [fn09Busy, setFn09Busy] = useState(false);
  const [fn09Extracted, setFn09Extracted] = useState<{
    fnaRecord: FnaRecord;
    extractedSummaryNotes: string;
    sourceMode: string;
  } | null>(null);
  const [fn09SavedBanner, setFn09SavedBanner] = useState(false);

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fn09PicsConsent) return;
    setFn09Busy(true);
    try {
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/ai/voice-fna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64,
          audioMimeType: file.type || 'audio/webm',
        }),
      });
      const data = await res.json();
      if (data?.fnaRecord) {
        setFn09Extracted(data);
        if (data.transcriptUsed) setFn09Transcript(data.transcriptUsed);
      }
    } finally {
      setFn09Busy(false);
    }
  };

  const runFn09ExtractFna = async () => {
    if (!fn09PicsConsent || !fn09Transcript.trim()) return;
    setFn09Busy(true);
    setFn09SavedBanner(false);
    try {
      const res = await fetch('/api/ai/voice-fna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: fn09Transcript }),
      });
      const data = await res.json();
      if (data?.fnaRecord) {
        setFn09Extracted(data);
      }
    } finally {
      setFn09Busy(false);
    }
  };

  const applyFn09ToActiveLead = () => {
    if (!fn09Extracted || !activeLead) return;
    onUpdateLead(activeLead.id, (prev) => ({
      ...prev,
      stage: prev.stage === LeadStage.NEW ? LeadStage.FNA_COMPLETED : prev.stage,
      fnaRecord: fn09Extracted.fnaRecord,
      notes: `${fn09Extracted.extractedSummaryNotes}\n${prev.notes}`.trim(),
      lastContactIso: new Date().toISOString(),
    }));
    setFn09SavedBanner(true);
  };

  // ---------------- FN-10 State ----------------
  const [fn10YtdFycHkd, setFn10YtdFycHkd] = useState<number>(412000);
  const [fn10CommRatePct, setFn10CommRatePct] = useState<number>(32);

  const fn10Result = useMemo(
    () =>
      calculateMdrtProjectionAndPersistency({
        applications,
        leads,
        manualYtdFycHkd: fn10YtdFycHkd,
        avgFycCommissionRatePct: fn10CommRatePct,
      }),
    [applications, leads, fn10YtdFycHkd, fn10CommRatePct]
  );

  // ---------------- FN-11 State ----------------
  const [copiedAlertId, setCopiedAlertId] = useState<string | null>(null);
  const fn11Alerts = useMemo(
    () => buildAnniversaryAndFxAlertQueue(leads, intermediary),
    [leads, intermediary]
  );

  // ---------------- FN-12 State ----------------
  const [fn12EthicsHrs, setFn12EthicsHrs] = useState<number>(3.5);
  const [fn12TechHrs, setFn12TechHrs] = useState<number>(8.5);
  const [fn12RegHrs, setFn12RegHrs] = useState<number>(3.0);
  const [fn12Replacing, setFn12Replacing] = useState<boolean>(true);
  const [fn12OldPaidHkd, setFn12OldPaidHkd] = useState<number>(320000);
  const [fn12OldCsvHkd, setFn12OldCsvHkd] = useState<number>(198000);

  const fn12Result = useMemo(
    () =>
      evaluateHkiaCpdAndCpfiCompliance({
        ethicsCpdHours: fn12EthicsHrs,
        technicalProductCpdHours: fn12TechHrs,
        regTechComplianceCpdHours: fn12RegHrs,
        existingPolicyPaidPremiumsHkd: fn12OldPaidHkd,
        existingPolicyCurrentCsvHkd: fn12OldCsvHkd,
        isReplacingExistingLifeOrMedical: fn12Replacing,
      }),
    [fn12EthicsHrs, fn12TechHrs, fn12RegHrs, fn12OldPaidHkd, fn12OldCsvHkd, fn12Replacing]
  );

  const visibleFunctions = useMemo(() => {
    if (pillarFilter === 'ALL') return SUGGESTED_HK_FUNCTIONS;
    return SUGGESTED_HK_FUNCTIONS.filter((fn) => fn.pillar === pillarFilter);
  }, [pillarFilter]);

  const activeBlueprint =
    SUGGESTED_HK_FUNCTIONS.find((f) => f.code === selectedCode) || SUGGESTED_HK_FUNCTIONS[0];

  return (
    <div className="space-y-6">
      {!embeddedSingleTool && (
        <>
          {/* Header */}
          <div className="border-b border-slate-200 pb-5">
            <h1
              className="text-2xl font-bold tracking-tight text-slate-900"
              style={{ textWrap: 'balance' }}
            >
              {t(
                'Pro Advisory Workbench — All 12 Hong Kong InsurTech Modules Live (FN-01 to FN-12)',
                '香港保險實戰工具箱 — 12 項高價值精算、核保、跨境及 MDRT 功能全面啟用'
              )}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              {t(
                `Connected to your ${totalPlansCount}-plan / ${totalInsurersCount}-insurer HK catalog & Need-First Context Bar above · Select any FN-01–FN-12 module below to run live calculations, Gemini AI triage, and PDF/PNG exports.`,
                `已串聯上方「需求優先智能配對欄」、${totalInsurersCount} 間保司共 ${totalPlansCount} 款香港保險計劃及客戶系統 · 點選下方 FN-01 至 FN-12 工具即可進行實時精算與匯出。`
              )}
            </p>
            <span className="sr-only" data-client-sync={ Boolean(onSelectLeadId) ? 'ready' : 'idle' } />
          </div>

          {/* Quick 12-Module Tab Bar */}
          <div
            role="tablist"
            aria-label="Select live advisory tool FN-01 through FN-12"
            className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-3"
          >
            {SUGGESTED_HK_FUNCTIONS.map((fn) => {
              const active = fn.code === selectedCode;
              return (
                <button
                  key={fn.code}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectModule(fn.code)}
                  className={`rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-blue-700 text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {fn.code}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* LIVE INTERACTIVE WORKBENCH FOR ACTIVE MODULE */}
      <section
        id="live-advisory-workbench"
        aria-label={`Live Advisory Workbench ${activeBlueprint.code}`}
        className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
      >
        <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-bold text-blue-700">{activeBlueprint.code}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-slate-700">
                {t(activeBlueprint.pillarLabelEn, activeBlueprint.pillarLabelZh)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{activeBlueprint.complianceTag}</span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {t(activeBlueprint.titleEn, activeBlueprint.titleZh)}
            </h2>
          </div>
          <span className="font-mono text-xs font-semibold text-emerald-700 whitespace-nowrap">
            {t('LIVE INTERACTIVE ENGINE', '實時精算引擎已啟動')}
          </span>
        </div>

        {/* ==================== FN-01 ==================== */}
        {selectedCode === 'FN-01' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Annual Income (HKD)', '個人年薪 (HKD)')}
                </label>
                <input
                  type="number"
                  step={50000}
                  value={fn01IncomeHkd}
                  onChange={(e) => setFn01IncomeHkd(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Mortgage Debt (HKD)', '未償還按揭 (HKD)')}
                </label>
                <input
                  type="number"
                  step={200000}
                  value={fn01MortgageHkd}
                  onChange={(e) => setFn01MortgageHkd(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Existing Life (HKD)', '現有人壽保額 (HKD)')}
                </label>
                <input
                  type="number"
                  step={200000}
                  value={fn01ExistingLifeHkd}
                  onChange={(e) => setFn01ExistingLifeHkd(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Existing CI (HKD)', '現有危疾保額 (HKD)')}
                </label>
                <input
                  type="number"
                  step={100000}
                  value={fn01ExistingCiHkd}
                  onChange={(e) => setFn01ExistingCiHkd(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Group Medical Cap', '公司團體手術上限')}
                </label>
                <input
                  type="number"
                  step={5000}
                  value={fn01GroupSurgHkd}
                  onChange={(e) => setFn01GroupSurgHkd(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('VHIS Deductible', 'VHIS 銜接自付額')}
                </label>
                <select
                  value={fn01Deductible}
                  onChange={(e) => setFn01Deductible(Number(e.target.value) as HospitalDeductibleHkd)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                >
                  <option value={0}>HK$0</option>
                  <option value={20000}>HK$20,000</option>
                  <option value={50000}>HK$50,000</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="text-xs text-slate-500">
                  {t('Life & Mortgage Gap (10x + Debt)', '人壽及按揭保障缺口')}
                </span>
                <p className="mt-1 font-mono text-xl font-bold text-rose-700 tabular-nums">
                  HK${fn01Result.lifeProtectionGapHkd.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-600 tabular-nums">
                  {t('Funded:', '已覆蓋：')} {fn01Result.lifeCoverageRatioPct}% / HK$
                  {fn01Result.recommendedLifeCoverHkd.toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="text-xs text-slate-500">
                  {t('Critical Illness Gap (3.5x Income)', '嚴重危疾收入替代缺口')}
                </span>
                <p className="mt-1 font-mono text-xl font-bold text-amber-800 tabular-nums">
                  HK${fn01Result.ciProtectionGapHkd.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-600 tabular-nums">
                  {t('Funded:', '已覆蓋：')} {fn01Result.ciCoverageRatioPct}% / HK$
                  {fn01Result.recommendedCiCoverHkd.toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="text-xs text-slate-500">
                  {t('Group Medical → VHIS Net Cost', '扣稅及自付額折讓後淨保費')}
                </span>
                <p className="mt-1 font-mono text-xl font-bold text-emerald-700 tabular-nums">
                  HK${fn01Result.netTopUpAnnualCostHkd.toLocaleString()}/yr (-
                  {fn01Result.deductibleBridgeSavingsPct}%)
                </p>
                <p className="mt-1 text-xs text-slate-600 tabular-nums">
                  {t('Saves', '每年慳')} HK${fn01Result.annualPremiumSavedHkd.toLocaleString()} + IRD HK$
                  {fn01Result.irdTaxReliefHkd.toLocaleString()}
                </p>
              </div>
            </div>

            <CoverageGapComparisonBars
              existingLifeHkd={fn01ExistingLifeHkd}
              recommendedLifeHkd={fn01Result.recommendedLifeCoverHkd}
              existingCiHkd={fn01ExistingCiHkd}
              recommendedCiHkd={fn01Result.recommendedCiCoverHkd}
            />

            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-slate-700">
                {t(fn01Result.employerBridgeVerdictEn, fn01Result.employerBridgeVerdictZh)}
              </p>
              <button
                type="button"
                disabled={exportingMapPdf}
                onClick={async () => {
                  setExportingMapPdf(true);
                  try {
                    const bytes = await generateProtectionMapPdfBytes({
                      clientName: `${activeLead.fullNameEn} (${activeLead.fullNameZh})`,
                      age: activeLead.age,
                      recommendedLifeHkd: fn01Result.recommendedLifeCoverHkd,
                      existingLifeHkd: fn01ExistingLifeHkd,
                      lifeGapHkd: fn01Result.lifeProtectionGapHkd,
                      recommendedCiHkd: fn01Result.recommendedCiCoverHkd,
                      existingCiHkd: fn01ExistingCiHkd,
                      ciGapHkd: fn01Result.ciProtectionGapHkd,
                      vhisDeductibleHkd: fn01Deductible,
                      netVhisTopUpHkd: fn01Result.netTopUpAnnualCostHkd,
                      bridgeNoteEn: fn01Result.employerBridgeVerdictEn,
                      bridgeNoteZh: fn01Result.employerBridgeVerdictZh,
                      intermediary,
                    });
                    triggerBrowserDownload(
                      `Family_Protection_Map_${activeLead.fullNameEn.replace(/\s+/g, '_')}.pdf`,
                      bytes,
                      'application/pdf'
                    );
                  } finally {
                    setExportingMapPdf(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {exportingMapPdf
                    ? t('Generating PDF...', '生成 PDF 中...')
                    : t('Download 1-Page Family Protection Map PDF', '下載一頁式家庭保障圖 PDF')}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ==================== FN-02 ==================== */}
        {selectedCode === 'FN-02' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Self Income (HKD)', '本人年薪 (HKD)')}
                </label>
                <input
                  type="number"
                  step={50000}
                  value={fn02SelfInc}
                  onChange={(e) => setFn02SelfInc(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Spouse Income (HKD)', '配偶年薪 (HKD)')}
                </label>
                <input
                  type="number"
                  step={50000}
                  value={fn02SpouseInc}
                  onChange={(e) => setFn02SpouseInc(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Children / Parents 60+', '子女／長者父母數')}
                </label>
                <div className="mt-1 flex gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={fn02Children}
                    onChange={(e) => setFn02Children(Number(e.target.value) || 0)}
                    className="w-1/2 rounded-lg border border-slate-300 px-2 py-2 font-mono text-xs font-semibold tabular-nums"
                  />
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={fn02Parents60}
                    onChange={(e) => setFn02Parents60(Number(e.target.value) || 0)}
                    className="w-1/2 rounded-lg border border-slate-300 px-2 py-2 font-mono text-xs font-semibold tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Self QDAP+TVC', '本人 QDAP+TVC')}
                </label>
                <input
                  type="number"
                  step={10000}
                  value={fn02SelfQdap}
                  onChange={(e) => setFn02SelfQdap(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Spouse QDAP+TVC', '配偶 QDAP+TVC')}
                </label>
                <input
                  type="number"
                  step={10000}
                  value={fn02SpouseQdap}
                  onChange={(e) => setFn02SpouseQdap(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('VHIS Headcount × Avg', 'VHIS 人數 × 人均')}
                </label>
                <div className="mt-1 flex gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={fn02VhisCount}
                    onChange={(e) => setFn02VhisCount(Number(e.target.value) || 0)}
                    className="w-14 rounded-lg border border-slate-300 px-2 py-2 font-mono text-xs font-semibold tabular-nums"
                  />
                  <input
                    type="number"
                    step={1000}
                    value={fn02AvgVhis}
                    onChange={(e) => setFn02AvgVhis(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 font-mono text-xs font-semibold tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-4">
              <div>
                <span className="text-xs text-slate-500">{t('Separate Assessment Tax', '夫婦分開評稅應繳')}</span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  HK${fn02Result.separateTaxAfterTrioHkd.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">{t('Joint Assessment Tax', '夫婦合併評稅應繳')}</span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  HK${fn02Result.jointTaxAfterTrioHkd.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">{t('Total Annual Tax Saved', '扣稅三寶全年慳稅')}</span>
                <p className="mt-1 font-mono text-xl font-bold text-emerald-700 tabular-nums">
                  HK${fn02Result.totalTaxSavedByTrioHkd.toLocaleString()} (
                  {fn02Result.effectiveRebatePctOnContributions}%)
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">{t('Post-Tax QDAP IRR', '計及退稅後真實 IRR')}</span>
                <p className="mt-1 font-mono text-xl font-bold text-blue-700 tabular-nums">
                  {fn02Result.postTaxQdapIrrPct}% p.a.
                </p>
              </div>
            </div>

            <p className="rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3 text-xs leading-relaxed text-slate-800">
              {t(fn02Result.allocationRecommendationEn, fn02Result.allocationRecommendationZh)}
            </p>
          </div>
        )}

        {/* ==================== FN-03 ==================== */}
        {selectedCode === 'FN-03' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('5-Pay Annual Premium (USD)', '5年繳每年保費 (USD)')}
                </label>
                <input
                  type="number"
                  step={10000}
                  value={fn03AnnualUsd}
                  onChange={(e) => setFn03AnnualUsd(Math.max(5000, Number(e.target.value) || 10000))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Withdrawal Rule', '提領現金流方案')}
                </label>
                <select
                  value={fn03Preset}
                  onChange={(e) => setFn03Preset(e.target.value as WithdrawalPreset)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                >
                  <option value="567_RETIREMENT">{t('5-6-7 Rule (7%/yr from Yr 6)', '熱門 567 提領（第6年起每年7%）')}</option>
                  <option value="568_LEGACY">{t('5-6-8 Rule (8%/yr from Yr 6)', '進階 568 提領（第6年起每年8%）')}</option>
                  <option value="EDU_18_21_PLUS_65">{t('Overseas Uni Yr 15–18 + Retirement', '海外大學留學金＋退休長糧')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Policy Currency Switch', '轉換目標外幣')}
                </label>
                <select
                  value={fn03TargetCcy}
                  onChange={(e) => setFn03TargetCcy(e.target.value as LegacyTargetCurrency)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-semibold"
                >
                  {(['GBP', 'CAD', 'AUD', 'USD', 'HKD', 'RMB'] as LegacyTargetCurrency[]).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Split Sub-Policies (Children)', '保單分拆份數（傳承子女）')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={fn03SplitCount}
                  onChange={(e) => setFn03SplitCount(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
            </div>

            <LegacyWithdrawalBarChart rows={fn03Result.rows} />

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[680px] border-collapse text-left font-mono text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-sans text-slate-600">
                    <th className="py-2.5 pl-4 pr-3 font-semibold">{t('Policy Yr / Age', '保單年度／年齡')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t('Annual Withdrawal (USD)', '當年提領 (USD)')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      {t(`Converted (${fn03TargetCcy})`, `折算目標外幣 (${fn03TargetCcy})`)}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t('Remaining Total CSV', '提領後剩餘總價值')}</th>
                    <th className="py-2.5 pl-3 pr-4 font-semibold text-right">
                      {t(`Per Child Split (÷${fn03SplitCount})`, `每份分拆子保單 (÷${fn03SplitCount})`)}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fn03Result.rows.map((r) => (
                    <tr key={r.policyYear}>
                      <td className="py-2 pl-4 pr-3 font-semibold text-slate-900">
                        Yr {r.policyYear} (Age {r.clientAge})
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-700">
                        USD ${r.annualWithdrawalUsd.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700">
                        {fn03TargetCcy} {r.convertedWithdrawalTarget.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-blue-700">
                        USD ${r.remainingTotalCsvUsd.toLocaleString()}
                      </td>
                      <td className="py-2 pl-3 pr-4 text-right text-slate-800">
                        USD ${r.perChildSplitValueUsd.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== FN-04 ==================== */}
        {selectedCode === 'FN-04' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Target Annual Premium (USD)', '擬投保每年保費 (USD)')}
                </label>
                <input
                  type="number"
                  step={25000}
                  value={fn04AnnualUsd}
                  onChange={(e) => setFn04AnnualUsd(Math.max(5000, Number(e.target.value) || 10000))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={fn04HasHkBank}
                    onChange={(e) => setFn04HasHkBank(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span>{t('Client already holds HK Bank Account', '客戶已持有香港銀行戶口（港卡）')}</span>
                </label>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                <span className="text-[11px] text-slate-500">{t('AML / Compliance Tier', '反洗錢盡職審查級別')}</span>
                <p className="font-mono text-sm font-bold text-blue-700">{fn04Result.amlTier}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4 space-y-2">
                <h3 className="text-xs font-bold text-slate-900">
                  {t('Onshore HK Signing & SoW Document Checklist', '赴港境內簽署及財力證明必備清單')}
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {(lang === 'en' ? fn04Result.requiredDocsEn : fn04Result.requiredDocsZh).map(
                    (doc, i) => (
                      <li key={i}>• {lang === 'zh-CN' ? toSimplifiedChinese(doc) : doc}</li>
                    )
                  )}
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 space-y-2">
                <h3 className="text-xs font-bold text-slate-900">
                  {t('HK Bank Booking & Cross-Border Renewal Fee Comparison', '香港開戶預約及續期繳費手續費對比')}
                </h3>
                <div className="space-y-2 text-xs">
                  {fn04Result.renewalChannels.map((ch, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="font-medium text-slate-800">{t(ch.channelEn, ch.channelZh)}</span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        USD ${ch.estimatedAnnualFeeUsd.toLocaleString()} ({ch.fxFeePct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== FN-05 ==================== */}
        {selectedCode === 'FN-05' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Single Premium (USD)', '整付總保費 (USD)')}
                </label>
                <input
                  type="number"
                  step={100000}
                  value={fn05SinglePremUsd}
                  onChange={(e) => setFn05SinglePremUsd(Math.max(200000, Number(e.target.value) || 500000))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('HIBOR / SOFR Funding (%)', '銀行資金成本 (%)')}
                </label>
                <input
                  type="number"
                  step={0.1}
                  value={fn05BenchmarkPct}
                  onChange={(e) => setFn05BenchmarkPct(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Private Bank Spread (%)', '私人銀行利差 (%)')}
                </label>
                <input
                  type="number"
                  step={0.05}
                  value={fn05SpreadPct}
                  onChange={(e) => setFn05SpreadPct(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Policy Crediting Rate (%)', '萬用險／分紅派息率 (%)')}
                </label>
                <input
                  type="number"
                  step={0.1}
                  value={fn05CreditingPct}
                  onChange={(e) => setFn05CreditingPct(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-4">
              <div>
                <span className="text-xs text-slate-500">{t('Client Cash Outlay', '客戶自付本金')}</span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  USD ${fn05Result.clientOutOfPocketEquityUsd.toLocaleString()} ({fn05Result.effectiveLeverageMultiple}x)
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">{t('Cash Unleveraged IRR', '全額現金投保 IRR')}</span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-800 tabular-nums">
                  {fn05Result.unleveragedIrrPct}%
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">
                  {t(`Base Financed IRR (${fn05Result.baseLoanRatePct}%)`, `基準融資槓桿 IRR (${fn05Result.baseLoanRatePct}%)`)}
                </span>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums">
                  {fn05Result.leveragedBaseIrrPct}%
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">
                  {t(`+200 bps Stressed IRR (${fn05Result.stressedLoanRatePct}%)`, `+200點子壓測 IRR (${fn05Result.stressedLoanRatePct}%)`)}
                </span>
                <p className="mt-1 font-mono text-lg font-bold text-amber-800 tabular-nums">
                  {fn05Result.leveragedStressedIrrPct}%
                </p>
              </div>
            </div>

            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950">
              {t(fn05Result.stressVerdictEn, fn05Result.stressVerdictZh)}
            </p>
          </div>
        )}

        {/* ==================== FN-06 ==================== */}
        {selectedCode === 'FN-06' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <select
                aria-label="Select plan for WhatsApp micro-proposal or use Need-First Auto-Match"
                value={selectedPlanId}
                onChange={(e) => onSelectPlanId(e.target.value)}
                className="max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
              >
                <option value="">
                  {t(
                    `No Plan Locked — Auto-Using Best Match (${activePlan.nameEn})`,
                    `尚未鎖定計劃 — 自動採用智能配對首選（${activePlan.nameZh}）`
                  )}
                </option>
                {plans.map((p) => {
                  const loc = localizePlanStrings(p, lang);
                  return (
                    <option key={p.id} value={p.id}>
                      [{p.insurerCode}] {loc.planName}
                    </option>
                  );
                })}
              </select>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleClientSafeMode}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {clientSafeMode
                    ? t('Safe Mode Anonymized ON', '匿名見客模式：開啟')
                    : t('Toggle Client Safe Mode', '切換匿名見客模式')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await copyTextSafe(fn06Text);
                    setCopiedMicro(true);
                    window.setTimeout(() => setCopiedMicro(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  {copiedMicro ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedMicro ? t('Copied Text!', '已複製文字！') : t('Copy WhatsApp / WeChat Text', '複製 WhatsApp／微信文案')}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadMicroProposalPngCard({
                      clientDisplayName: clientSafeMode ? 'Valued Client' : activeLead.fullNameEn,
                      age: activeLead.age,
                      plan: activePlan,
                      currency,
                      annualPremium: fn06Quote.annualPremium,
                      sumAssured: fn06Quote.sumAssured,
                      yr20Guaranteed: fn06Yr20?.guaranteedCashValue ?? 0,
                      yr20Total: fn06Yr20?.totalSurrenderValue ?? 0,
                      effectiveIrrPct: fn06Quote.effectiveIllustratedIrrPercent,
                      intermediary,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t('Download 4:5 PNG Card', '下載 4:5 手機精算圖卡')}</span>
                </button>
              </div>
            </div>

            <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-sans text-xs leading-relaxed text-slate-800">
              {fn06Text}
            </pre>
          </div>
        )}

        {/* ==================== FN-07 ==================== */}
        {selectedCode === 'FN-07' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Sub-Standard Condition', '體檢異常項目')}
                </label>
                <select
                  value={fn07Condition}
                  onChange={(e) => {
                    setFn07Condition(e.target.value as PreUnderwritingConditionCode);
                    setFn07AiOpinion(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                >
                  <option value="THYROID_NODULE_TIRADS">{t('Thyroid Nodule (TI-RADS)', '甲狀腺結節 (TI-RADS)')}</option>
                  <option value="BREAST_NODULE_BIRADS">{t('Breast Nodule / Cyst (BI-RADS)', '乳腺結節／水囊 (BI-RADS)')}</option>
                  <option value="FATTY_LIVER_ELEVATED_ALT">{t('Fatty Liver / Elevated ALT', '脂肪肝／肝酵素偏高')}</option>
                  <option value="MILD_HYPERTENSION">{t('Mild Hypertension', '輕度高血壓')}</option>
                  <option value="HBV_INACTIVE_CARRIER">{t('HBV Inactive Carrier', '乙型肝炎帶菌（肝功正常）')}</option>
                  <option value="ELEVATED_BMI_URIC_ACID">{t('Elevated BMI / Uric Acid', '體重指標 BMI／尿酸偏高')}</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Clinical Severity', '指標嚴重程度')}
                </label>
                <select
                  value={fn07Severity}
                  onChange={(e) => setFn07Severity(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                >
                  <option value="MILD">{t('Mild / Grade 1–2', '輕微／1–2級穩定')}</option>
                  <option value="MODERATE">{t('Moderate / Grade 3', '中度／3級需追蹤')}</option>
                  <option value="BORDERLINE_HIGH">{t('Borderline High / Grade 4a', '邊緣偏高／4a級')}</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Ultrasound / Lab Note', '臨床化驗備註')}
                </label>
                <input
                  type="text"
                  value={fn07Notes}
                  onChange={(e) => setFn07Notes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div className="flex items-end md:col-span-2">
                <button
                  type="button"
                  disabled={fn07Loading}
                  onClick={runFn07AiSecondOpinion}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
                >
                  {fn07Loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  <span>{t('AI Underwriter', 'AI 核保意見')}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 pl-4 pr-3 font-semibold">{t('HK Insurer', '香港保司')}</th>
                    <th className="py-2.5 px-3 font-semibold">{t('VHIS / Medical Decision', '醫療／自願醫保預判')}</th>
                    <th className="py-2.5 px-3 font-semibold">{t('Critical Illness Decision', '危疾保障預判')}</th>
                    <th className="py-2.5 pl-3 pr-4 font-semibold text-right">{t('Est. Loading', '預計加價')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fn07Matrix.insurerOutcomes.map((o) => (
                    <tr key={o.insurerCode}>
                      <td className="py-2.5 pl-4 pr-3 font-bold text-slate-900">
                        {t(o.insurerNameEn, o.insurerNameZh)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{t(o.medicalDecisionEn, o.medicalDecisionZh)}</td>
                      <td className="py-2.5 px-3 text-slate-700">{t(o.ciDecisionEn, o.ciDecisionZh)}</td>
                      <td className="py-2.5 pl-3 pr-4 text-right font-mono font-bold text-blue-700 tabular-nums">
                        {o.estimatedLoadingPct === 0 ? 'Standard 0%' : `+${o.estimatedLoadingPct}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
              <strong className="text-slate-900">{t('Underwriting Strategy:', '核保實戰建議：')}</strong>{' '}
              {fn07AiOpinion || t(fn07Matrix.submissionTipEn, fn07Matrix.submissionTipZh)}
            </div>
          </div>
        )}

        {/* ==================== FN-08 ==================== */}
        {selectedCode === 'FN-08' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Procedure', '選擇手術或內視鏡')}
                </label>
                <select
                  value={fn08ProcId}
                  onChange={(e) => setFn08ProcId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                >
                  {HK_SURGICAL_PROCEDURES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {t(p.nameEn, p.nameZh)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Clinical Setting', '進行地點')}
                </label>
                <select
                  value={fn08Setting}
                  onChange={(e) => setFn08Setting(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                >
                  <option value="DAY_CASE_NETWORK">{t('Day-Case Endoscopy Centre', '指定網絡日間中心')}</option>
                  <option value="HOSPITAL_STANDARD_WARD">{t('Hospital Inpatient Ward', '私院住院普通／半私家房')}</option>
                  <option value="HOSPITAL_PRIVATE_ROOM">{t('Hospital Private Room', '私院住院私家房')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Employer Group Medical Cap (HKD)', '公司團體醫保手術上限 (HKD)')}
                </label>
                <input
                  type="number"
                  step={5000}
                  value={fn08EmpCap}
                  onChange={(e) => setFn08EmpCap(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-4">
              <div>
                <span className="text-xs text-slate-500">{t('Estimated Bill', '預計總收費')}</span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  HK${fn08Result.totalEstimatedBillHkd.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">{t('1st: Group Medical', '公司醫保先賠')}</span>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums">
                  HK${fn08Result.step1EmployerGroupPaidHkd.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">{t('2nd: Personal VHIS ($20k Ded.)', '個人 VHIS 餘額賠付')}</span>
                <p className="mt-1 font-mono text-lg font-bold text-blue-700 tabular-nums">
                  HK${fn08Result.step2PersonalMedicalPaidHkd.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">{t('Client Out-of-Pocket', '客戶實付差額')}</span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  HK${fn08Result.estimatedClientOutOfPocketHkd.toLocaleString()}
                </p>
              </div>
            </div>

            <StackedBillWaterfallBar
              totalBillHkd={fn08Result.totalEstimatedBillHkd}
              employerPaidHkd={fn08Result.step1EmployerGroupPaidHkd}
              personalVhisPaidHkd={fn08Result.step2PersonalMedicalPaidHkd}
              outOfPocketHkd={fn08Result.estimatedClientOutOfPocketHkd}
            />

            <p className="text-xs leading-relaxed text-amber-950 rounded-lg border border-amber-200 bg-amber-50 p-3">
              {t(fn08Result.medicalNecessityAlertEn, fn08Result.medicalNecessityAlertZh)}
            </p>
          </div>
        )}

        {/* ==================== FN-09 ==================== */}
        {selectedCode === 'FN-09' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={fn09PicsConsent}
                  onChange={(e) => setFn09PicsConsent(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>
                  {t(
                    'PDPO Cap. 486 PICS Confirmed: Client consented to voice/transcript GL30 FNA extraction',
                    '已確認個人資料私隱條例（PDPO PICS）客戶同意將會議對話轉錄為 GL30 財務需要分析'
                  )}
                </span>
              </label>

              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Mic className="h-3.5 w-3.5 text-blue-700" />
                <span>{t('Upload Audio (.webm/.mp3/.wav)', '上載粵／普錄音檔')}</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  className="sr-only"
                />
              </label>
            </div>

            <textarea
              rows={3}
              value={fn09Transcript}
              onChange={(e) => setFn09Transcript(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 text-xs leading-relaxed text-slate-900"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFn09Transcript(
                      '顾问：周小姐您好，跟您核对一下香港保监 GL30 财务需求。客户：我现在月薪 12 万港币左右，每月家庭支出 45,000，流动现金存款大概 350 万，家里有一个小孩，风险偏好 Growth 进取型，想配置美元分红储蓄做小孩海外留学和退休养老。'
                    )
                  }
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  {t('Load Mandarin MCV Sample', '載入普通話 MCV 會談範例')}
                </button>
              </div>

              <button
                type="button"
                disabled={!fn09PicsConsent || fn09Busy}
                onClick={runFn09ExtractFna}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {fn09Busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>{t('Extract GL30 FNA via Gemini', '提取結構化 GL30 FNA 數據')}</span>
              </button>
            </div>

            {fn09Extracted && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 font-mono text-xs lg:grid-cols-4 tabular-nums">
                  <div>
                    <span className="font-sans text-slate-500">{t('Monthly Income', '每月收入')}</span>
                    <p className="font-bold text-slate-900">
                      HK${fn09Extracted.fnaRecord.monthlyIncomeHkd.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-sans text-slate-500">{t('Monthly Expenses', '每月開支')}</span>
                    <p className="font-bold text-slate-900">
                      HK${fn09Extracted.fnaRecord.monthlyExpensesHkd.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-sans text-slate-500">{t('Liquid Assets', '流動資產')}</span>
                    <p className="font-bold text-slate-900">
                      HK${fn09Extracted.fnaRecord.liquidAssetsHkd.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-sans text-slate-500">{t('Risk / Dependents', '風險取向／受養人')}</span>
                    <p className="font-bold text-blue-700">
                      {fn09Extracted.fnaRecord.riskTolerance} · {fn09Extracted.fnaRecord.dependentsCount}p
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-700">{fn09Extracted.extractedSummaryNotes}</p>
                <div className="flex items-center justify-between gap-3">
                  {fn09SavedBanner ? (
                    <span className="text-xs font-bold text-emerald-800">
                      ✓ {t(`Saved GL30 FNA into ${activeLead.fullNameEn}'s CRM profile!`, `已成功寫入 ${activeLead.fullNameZh} 之 CRM 檔案並解鎖 STP 投保！`)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">
                      {t(`Target CRM Record: ${activeLead.fullNameEn}`, `目標寫入客戶：${activeLead.fullNameZh}`)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={applyFn09ToActiveLead}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>{t('Write FNA & Minutes to Lead CRM', '一鍵寫入客戶 CRM 並簽署 GL30')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== FN-10 ==================== */}
        {selectedCode === 'FN-10' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Baseline Issued YTD FYC (HKD)', '本年度已發單累計首年佣金 FYC (HKD)')}
                </label>
                <input
                  type="number"
                  step={20000}
                  value={fn10YtdFycHkd}
                  onChange={(e) => setFn10YtdFycHkd(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Blended First-Year Commission Rate (%)', '平均首年佣金率 FYC (%)')}
                </label>
                <input
                  type="number"
                  min={10}
                  max={65}
                  value={fn10CommRatePct}
                  onChange={(e) => setFn10CommRatePct(Number(e.target.value) || 30)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-4">
              <div>
                <span className="text-xs text-slate-500">{t('HK MDRT Target (FYC)', '香港區 MDRT 佣金門檻')}</span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  HK${fn10Result.hkMdrtFycTargetHkd.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">{t('Earned FYC (+STP Issued)', '目前已達標 FYC')}</span>
                <p className="mt-1 font-mono text-lg font-bold text-blue-700 tabular-nums">
                  HK${fn10Result.earnedIssuedFycHkd.toLocaleString()} ({fn10Result.mdrtProgressPct}%)
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">{t('Shortfall to MDRT', '尚欠 MDRT 差額')}</span>
                <p className="mt-1 font-mono text-lg font-bold text-amber-800 tabular-nums">
                  HK${fn10Result.shortfallToMdrtHkd.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">{t('13m / 25m Persistency', '13／25 個月續保率')}</span>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums">
                  {fn10Result.persistency13MonthPct}% / {fn10Result.persistency25MonthPct}%
                </p>
              </div>
            </div>

            <MdrtMilestoneProgressTrack
              earnedFycHkd={fn10Result.earnedIssuedFycHkd}
              mdrtTargetHkd={fn10Result.hkMdrtFycTargetHkd}
            />

            <div className="rounded-lg border border-slate-200 p-4 space-y-2 text-xs">
              <div className="font-bold text-slate-900">
                {t(
                  `13-Month Persistency Clawback Watchlist (At-Risk FYC: HK$${fn10Result.clawbackExposureHkd.toLocaleString()})`,
                  `13 個月續保佣金回撥預警名單（受影響佣金：HK$${fn10Result.clawbackExposureHkd.toLocaleString()}）`
                )}
              </div>
              {fn10Result.atRiskPolicies.map((pol) => (
                <div key={pol.policyRef} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                  <span>
                    <strong className="font-mono">{pol.policyRef}</strong> · {pol.clientName} · {pol.planName}
                  </span>
                  <span className="font-mono font-semibold text-rose-700 tabular-nums">
                    Due in {pol.dueDaysRemaining}d · Clawback HK${pol.fycAtRiskHkd.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== FN-11 ==================== */}
        {selectedCode === 'FN-11' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {fn11Alerts.map((al) => (
              <article key={al.id} className="flex flex-col justify-between rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">
                      {al.clientNameEn} ({al.clientNameZh})
                    </span>
                    <span className="font-mono font-bold text-amber-700 tabular-nums">
                      T-{al.urgencyDays}d
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {t(al.actionTitleEn, al.actionTitleZh)}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">{al.policySummary}</p>
                  <p className="rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-700">
                    {lang === 'en'
                      ? al.whatsappTemplateEn
                      : lang === 'zh-CN'
                      ? toSimplifiedChinese(al.whatsappTemplateZh)
                      : al.whatsappTemplateZh}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const msg =
                      lang === 'en'
                        ? al.whatsappTemplateEn
                        : lang === 'zh-CN'
                        ? toSimplifiedChinese(al.whatsappTemplateZh)
                        : al.whatsappTemplateZh;
                    await copyTextSafe(msg);
                    setCopiedAlertId(al.id);
                    window.setTimeout(() => setCopiedAlertId(null), 2000);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  {copiedAlertId === al.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                      <span>{t('Copied Reminder!', '已複製提醒訊息！')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>{t('Copy Personalized WhatsApp', '一鍵複製個人化 WhatsApp')}</span>
                    </>
                  )}
                </button>
              </article>
            ))}
          </div>
        )}

        {/* ==================== FN-12 ==================== */}
        {selectedCode === 'FN-12' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Ethics CPD (Min 3h)', '道德／規例必修 (≥3h)')}
                </label>
                <input
                  type="number"
                  step={0.5}
                  min={0}
                  value={fn12EthicsHrs}
                  onChange={(e) => setFn12EthicsHrs(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Product CPD Hours', '產品精算 CPD 時數')}
                </label>
                <input
                  type="number"
                  step={0.5}
                  min={0}
                  value={fn12TechHrs}
                  onChange={(e) => setFn12TechHrs(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('AML / RegTech CPD', '反洗錢及合規時數')}
                </label>
                <input
                  type="number"
                  step={0.5}
                  min={0}
                  value={fn12RegHrs}
                  onChange={(e) => setFn12RegHrs(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={fn12Replacing}
                    onChange={(e) => setFn12Replacing(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span>{t('Policy Replacement (CPFI)', '涉及轉保／退舊買新')}</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Old Paid Prem (HKD)', '舊單已繳總保費')}
                </label>
                <input
                  type="number"
                  step={20000}
                  value={fn12OldPaidHkd}
                  onChange={(e) => setFn12OldPaidHkd(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Old Surrender CSV', '舊單退保價值')}
                </label>
                <input
                  type="number"
                  step={20000}
                  value={fn12OldCsvHkd}
                  onChange={(e) => setFn12OldCsvHkd(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="text-xs text-slate-500">{t('HKIA GL24 Annual CPD Status', '保監局年度 CPD 達標狀態')}</span>
                <p
                  className={`mt-1 font-mono text-lg font-bold tabular-nums ${
                    fn12Result.isCpdCompliant ? 'text-emerald-700' : 'text-amber-800'
                  }`}
                >
                  {fn12Result.loggedTotalHours} / {fn12Result.totalRequiredHours} hrs (Ethics:{' '}
                  {fn12Result.loggedEthicsHours}h)
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="text-xs text-slate-500">{t('CPFI Surrender Loss', '轉保即時現金價值損失')}</span>
                <p className="mt-1 font-mono text-lg font-bold text-rose-700 tabular-nums">
                  HK${fn12Result.cpfiSurrenderLossHkd.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="text-xs text-slate-500">{t('21-Day Cooling-Off Gate', '21 日冷靜期送達追蹤')}</span>
                <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                  {applications.length > 0
                    ? `${applications.length} Active STP Sign-Off(s)`
                    : t('Ready for New Policy Delivery', '自動記錄電子保單交付時間戳')}
                </p>
              </div>
            </div>

            <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-800">
              {t(fn12Result.cpfiVerdictEn, fn12Result.cpfiVerdictZh)}
            </p>
          </div>
        )}
      </section>

      {!embeddedSingleTool && (
        <>
          {/* Pillar Filter + All 12 Module Directory Cards */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div
              role="group"
              aria-label="Filter functions by advisory pillar"
              className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
            >
              {PILLAR_FILTERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPillarFilter(p.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    pillarFilter === p.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t(p.labelEn, p.labelZh)}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-500 tabular-nums">
              {t(
                `All ${SUGGESTED_HK_FUNCTIONS.length} functions active · Click any card to load in workbench`,
                `全部 ${SUGGESTED_HK_FUNCTIONS.length} 項實戰工具已啟用 · 點擊卡片切換上方工作台`
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visibleFunctions.map((fn) => {
              const isSelected = fn.code === selectedCode;
              const isPinned = prioritizedIds.includes(fn.id);
              return (
                <article
                  key={fn.id}
                  className={`flex flex-col justify-between rounded-xl border bg-white p-5 transition-colors ${
                    isSelected
                      ? 'border-blue-700 ring-1 ring-blue-700/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 text-xs text-slate-500">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 pt-1">
                        <span className="font-mono font-semibold text-blue-700">{fn.code}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-700">
                          {t(fn.pillarLabelEn, fn.pillarLabelZh)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-[11px]">{fn.complianceTag}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onTogglePrioritize(fn.id)}
                        aria-pressed={isPinned}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-900 whitespace-nowrap shrink-0"
                      >
                        {isPinned ? t('★ Pinned', '★ 已釘選') : t('☆ Pin', '☆ 釘選')}
                      </button>
                    </div>

                    <h3 className="mt-2 text-base font-bold text-slate-900">
                      {t(fn.titleEn, fn.titleZh)}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {t(fn.summaryEn, fn.summaryZh)}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="font-mono font-semibold text-slate-700 tabular-nums">
                      {t(fn.impactMetricEn, fn.impactMetricZh)}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        selectModule(fn.code);
                        document
                          .getElementById('live-advisory-workbench')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        isSelected
                          ? 'bg-blue-700 text-white'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {isSelected
                          ? t('Active in Workbench', '上方工作台使用中')
                          : t('Open Live Tool', '打開實戰工具')}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
