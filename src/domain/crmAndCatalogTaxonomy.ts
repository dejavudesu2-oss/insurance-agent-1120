import type { AdvisoryFunctionCode } from '../components/FeatureLabView';
import type { TwentyUpgradeCode } from './twentyUpgradesEngine';
import type { ClaimScenarioId } from './clientGapEngine';
import {
  ClientLead,
  HospitalWardTier,
  InsurancePlan,
  LeadStage,
  PlanCategory,
  ProtectionDimensionId,
} from './types';

// ============================================================================
// 1. LEAD CRM STAGE SUMMARY DASHBOARD ENGINE
// ============================================================================

export type StageAccentTone = 'slate' | 'teal' | 'indigo' | 'amber' | 'emerald';

export interface LeadStageBucketSummary {
  stage: LeadStage;
  stepCode: string;
  shortLabelEn: string;
  shortLabelZh: string;
  crmAliasEn: string;
  subLabelEn: string;
  subLabelZh: string;
  count: number;
  sharePct: number;
  totalAnnualBudgetHkd: number;
  accentTone: StageAccentTone;
}

export interface LeadPipelineSummaryMetrics {
  totalLeads: number;
  totalAnnualBudgetHkd: number;
  fnaCompletedCount: number;
  mcvCount: number;
  quotedOrBeyondCount: number;
  convertedCount: number;
  conversionRatePct: number;
  stages: LeadStageBucketSummary[];
}

export const PIPELINE_STAGE_DEFINITIONS: Array<{
  stage: LeadStage;
  stepCode: string;
  shortLabelEn: string;
  shortLabelZh: string;
  crmAliasEn: string;
  subLabelEn: string;
  subLabelZh: string;
  accentTone: StageAccentTone;
}> = [
  {
    stage: LeadStage.NEW,
    stepCode: '01',
    shortLabelEn: 'Prospect',
    shortLabelZh: '新潛在客戶',
    crmAliasEn: 'Prospect · New Lead',
    subLabelEn: 'Initial discovery & KYC',
    subLabelZh: '待首次訪談與證件核實',
    accentTone: 'slate',
  },
  {
    stage: LeadStage.FNA_COMPLETED,
    stepCode: '02',
    shortLabelEn: 'FNA Signed',
    shortLabelZh: '已完成財務分析',
    crmAliasEn: 'Qualified · GL30 FNA',
    subLabelEn: 'HKIA GL30 suitability ready',
    subLabelZh: '已簽署 GL30 財務分析',
    accentTone: 'teal',
  },
  {
    stage: LeadStage.PROPOSAL_SENT,
    stepCode: '03',
    shortLabelEn: 'Quoted',
    shortLabelZh: '已發送報價建議',
    crmAliasEn: 'Quoted · Proposal Sent',
    subLabelEn: 'Illustration & comparison shared',
    subLabelZh: '已發送雙幣建議書比較',
    accentTone: 'indigo',
  },
  {
    stage: LeadStage.UNDERWRITING,
    stepCode: '04',
    shortLabelEn: 'Applied',
    shortLabelZh: '核保審批中',
    crmAliasEn: 'Applied · Underwriting',
    subLabelEn: 'Submitted to insurer UW',
    subLabelZh: '已遞交電子投保待批核',
    accentTone: 'amber',
  },
  {
    stage: LeadStage.IN_FORCE,
    stepCode: '05',
    shortLabelEn: 'Converted',
    shortLabelZh: '保單已生效',
    crmAliasEn: 'Converted · In-Force',
    subLabelEn: 'Issued & active servicing',
    subLabelZh: '正式簽發並納入續保管理',
    accentTone: 'emerald',
  },
];

export function computeLeadStageSummary(leads: ClientLead[]): LeadPipelineSummaryMetrics {
  const totalLeads = leads.length;
  const totalAnnualBudgetHkd = leads.reduce(
    (sum, lead) => sum + Math.max(0, lead.annualBudgetHkd ?? 48000),
    0
  );

  const stages: LeadStageBucketSummary[] = PIPELINE_STAGE_DEFINITIONS.map((def) => {
    const matching = leads.filter((l) => l.stage === def.stage);
    const count = matching.length;
    const sharePct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
    const bucketBudget = matching.reduce(
      (sum, l) => sum + Math.max(0, l.annualBudgetHkd ?? 48000),
      0
    );

    return {
      ...def,
      count,
      sharePct,
      totalAnnualBudgetHkd: bucketBudget,
    };
  });

  const convertedCount = leads.filter((l) => l.stage === LeadStage.IN_FORCE).length;
  const quotedOrBeyondCount = leads.filter(
    (l) =>
      l.stage === LeadStage.PROPOSAL_SENT ||
      l.stage === LeadStage.UNDERWRITING ||
      l.stage === LeadStage.IN_FORCE
  ).length;

  return {
    totalLeads,
    totalAnnualBudgetHkd,
    fnaCompletedCount: leads.filter((l) => Boolean(l.fnaRecord)).length,
    mcvCount: leads.filter((l) => l.residency === 'MCV').length,
    quotedOrBeyondCount,
    convertedCount,
    conversionRatePct: totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0,
    stages,
  };
}

// ============================================================================
// 2. CROSS-SECTION SELECTED PLAN INTERACTIVITY PROFILE (02 -> 07)
// ============================================================================

export interface SelectedPlanSyncProfile {
  planId: string;
  insurerCode: string;
  category: PlanCategory;
  personalMedicalTier: 'HIGH_END_MEDICAL' | 'VHIS_FLEXI_SMM' | 'VHIS_STANDARD';
  recommendedWard: HospitalWardTier;
  isVhisTaxEligible: boolean;
  isQdapTaxEligible: boolean;
  suggestedScenarioId: ClaimScenarioId;
  dimensionCoverageBoostsHkd: Record<ProtectionDimensionId, number>;
  copilotAuditQuestionZh: string;
  copilotAuditQuestionEn: string;
}

export function derivePlanSyncProfile(
  plan: InsurancePlan | null | undefined,
  lead?: ClientLead | null
): SelectedPlanSyncProfile | null {
  if (!plan) return null;

  const blob = `${plan.nameEn} ${plan.nameZh} ${(plan.highlights || []).join(' ')}`.toLowerCase();
  const clientLabelZh = lead ? `（針對 ${lead.fullNameZh} ${lead.age}歲）` : '';
  const clientLabelEn = lead ? ` (for ${lead.fullNameEn}, age ${lead.age})` : '';

  let personalMedicalTier: SelectedPlanSyncProfile['personalMedicalTier'] = 'VHIS_FLEXI_SMM';
  let recommendedWard: HospitalWardTier = 'SEMI_PRIVATE';

  if (plan.category === PlanCategory.HIGH_END_MEDICAL) {
    personalMedicalTier = 'HIGH_END_MEDICAL';
    recommendedWard =
      blob.includes('private room') || blob.includes('私家房') || blob.includes('尊尚')
        ? 'PRIVATE_ROOM'
        : 'SEMI_PRIVATE';
  } else if (plan.category === PlanCategory.VHIS) {
    if (blob.includes('standard') || blob.includes('標準計劃')) {
      personalMedicalTier = 'VHIS_STANDARD';
      recommendedWard = 'STANDARD_WARD';
    } else {
      personalMedicalTier = 'VHIS_FLEXI_SMM';
      recommendedWard = blob.includes('私家房') ? 'PRIVATE_ROOM' : 'SEMI_PRIVATE';
    }
  }

  let suggestedScenarioId: ClaimScenarioId = 'HOSPITAL_MIN_INVASIVE';
  if (plan.category === PlanCategory.CRITICAL_ILLNESS) {
    suggestedScenarioId = blob.includes('cancer') || blob.includes('癌')
      ? 'CANCER_TARGETED_24M'
      : 'MAJOR_CI_RECURRENCE';
  } else if (
    plan.category === PlanCategory.TERM_LIFE ||
    plan.category === PlanCategory.UNIVERSAL_LIFE ||
    plan.category === PlanCategory.PARTICIPATING_SAVINGS ||
    plan.category === PlanCategory.QDAP
  ) {
    suggestedScenarioId = 'BREADWINNER_MORTGAGE';
  }

  const boosts: Record<ProtectionDimensionId, number> = {
    LIFE_MORTGAGE: 500000,
    PRIVATE_HOSPITAL: 200000,
    CRITICAL_ILLNESS: 250000,
    CANCER_TARGETED: 250000,
    ACCIDENT_INCOME: 800000,
    RETIREMENT_DEMENTIA: 400000,
  };

  switch (plan.category) {
    case PlanCategory.HIGH_END_MEDICAL:
      boosts.PRIVATE_HOSPITAL = 1200000;
      boosts.CANCER_TARGETED = 950000;
      break;
    case PlanCategory.VHIS:
      boosts.PRIVATE_HOSPITAL = personalMedicalTier === 'VHIS_STANDARD' ? 420000 : 780000;
      boosts.CANCER_TARGETED = personalMedicalTier === 'VHIS_STANDARD' ? 350000 : 680000;
      break;
    case PlanCategory.CRITICAL_ILLNESS:
      boosts.CRITICAL_ILLNESS = 1350000;
      boosts.CANCER_TARGETED = 880000;
      boosts.LIFE_MORTGAGE = 1500000;
      break;
    case PlanCategory.PARTICIPATING_SAVINGS:
      boosts.RETIREMENT_DEMENTIA = 3200000;
      boosts.LIFE_MORTGAGE = 2600000;
      break;
    case PlanCategory.QDAP:
      boosts.RETIREMENT_DEMENTIA = 2400000;
      boosts.LIFE_MORTGAGE = 1200000;
      break;
    case PlanCategory.TERM_LIFE:
    case PlanCategory.UNIVERSAL_LIFE:
      boosts.LIFE_MORTGAGE = 5800000;
      boosts.ACCIDENT_INCOME = 2200000;
      break;
    default:
      boosts.ACCIDENT_INCOME = 1800000;
      break;
  }

  const copilotAuditQuestionZh = `請針對主推計劃「${plan.insurerNameZh} — ${plan.nameZh}」${clientLabelZh}，深入審核其等候期、核心保障定義、潛在理賠限制（如醫療必需、病房折算或貨幣轉換鎖定期）並與香港同業代表計劃作條款比對。`;
  const copilotAuditQuestionEn = `Audit the policy provisions of "${plan.insurerNameEn} — ${plan.nameEn}"${clientLabelEn}, focusing on waiting periods, core benefit definitions, claim exclusions/ward adjustment traps, and benchmark against HK market peers.`;

  return {
    planId: plan.id,
    insurerCode: plan.insurerCode,
    category: plan.category,
    personalMedicalTier,
    recommendedWard,
    isVhisTaxEligible: plan.category === PlanCategory.VHIS,
    isQdapTaxEligible: plan.category === PlanCategory.QDAP,
    suggestedScenarioId,
    dimensionCoverageBoostsHkd: boosts,
    copilotAuditQuestionZh,
    copilotAuditQuestionEn,
  };
}

// ============================================================================
// 3. UNIFIED 32-TOOL USE-CASE CLASSIFICATION DIRECTORY (SECTION 09)
// ============================================================================

export type ToolUseCaseCategoryId =
  | 'ALL'
  | 'CLIENT_ACQUISITION_KYC'
  | 'MEDICAL_CLAIMS_UW'
  | 'WEALTH_TAX_LEGACY'
  | 'CROSS_BORDER_SME'
  | 'MDRT_COMPLIANCE_BRAND';

export type UnifiedToolEngineRef =
  | { engine: 'FN'; code: AdvisoryFunctionCode; pinId: string }
  | { engine: 'IMP'; code: TwentyUpgradeCode; pinId: string };

export interface UnifiedAdvisoryToolItem {
  uid: string;
  category: Exclude<ToolUseCaseCategoryId, 'ALL'>;
  ref: UnifiedToolEngineRef;
  codeBadge: string;
  titleZh: string;
  titleEn: string;
  whenToUseZh: string;
  whenToUseEn: string;
  deliverableZh: string;
  deliverableEn: string;
}

export interface ToolUseCaseCategoryMeta {
  id: ToolUseCaseCategoryId;
  stepCode: string;
  titleZh: string;
  titleEn: string;
  subtitleZh: string;
  subtitleEn: string;
  accentTone: 'slate' | 'indigo' | 'teal' | 'amber' | 'violet' | 'emerald';
}

export const TOOL_USE_CASE_CATEGORIES: ToolUseCaseCategoryMeta[] = [
  {
    id: 'ALL',
    stepCode: '32',
    titleZh: '全部 32 項實戰工具總覽',
    titleEn: 'All 32 Advisory Tools',
    subtitleZh: '按 5 大顧問實戰場景系統化分類',
    subtitleEn: 'Classified across 5 advisor workflow stages',
    accentTone: 'slate',
  },
  {
    id: 'CLIENT_ACQUISITION_KYC',
    stepCode: 'A',
    titleZh: '客戶開發、語音建檔與轉介',
    titleEn: 'Client Acquisition, Voice KYC & CRM',
    subtitleZh: '微網頁追蹤、WhatsApp 圖卡、粵語轉 FNA、家庭樹',
    subtitleEn: 'Microsites, 4:5 cards, Cantonese FNA & family tree',
    accentTone: 'indigo',
  },
  {
    id: 'MEDICAL_CLAIMS_UW',
    stepCode: 'B',
    titleZh: '醫療免找數、理賠差額與預核保',
    titleEn: 'Medical LOG, Claims & Pre-Underwriting',
    subtitleZh: '舊單體檢、醫生費中位數、結節三高預核保、雙單索償',
    subtitleEn: 'Policy X-ray, surgeon benchmarks, AI UW & dual claims',
    accentTone: 'teal',
  },
  {
    id: 'WEALTH_TAX_LEGACY',
    stepCode: 'C',
    titleZh: '儲蓄分紅、扣稅三寶與保費融資',
    titleEn: 'Wealth, Tax Trio, Legacy & Financing',
    subtitleZh: '567提領、留學提取、GN16走勢、回贈鎖息、保費融資',
    subtitleEn: '567 split, tuition FX, GN16 trend, rebates & HIBOR PF',
    accentTone: 'amber',
  },
  {
    id: 'CROSS_BORDER_SME',
    stepCode: 'D',
    titleZh: '跨境 MCV、大灣區養老與企業保單',
    titleEn: 'MCV Cross-Border, GBA & SME Keyman',
    subtitleZh: '高才/MCV開戶簽單、大灣區養老院舍、股東要員保',
    subtitleEn: 'MCV banking concierge, GBA retirement & Keyman tax',
    accentTone: 'violet',
  },
  {
    id: 'MDRT_COMPLIANCE_BRAND',
    stepCode: 'E',
    titleZh: 'MDRT 業績、防斷供續保與合規白牌',
    titleEn: 'MDRT Pace, Persistency & White-Label',
    subtitleZh: '13月防回撥、週年轉貨幣、CPD審計、白牌QR、離線PWA',
    subtitleEn: 'Clawback guard, renewals, HKIA CPD, QR brand & PWA',
    accentTone: 'emerald',
  },
];

export const UNIFIED_32_TOOLS_DIRECTORY: UnifiedAdvisoryToolItem[] = [
  // ==================== A. CLIENT_ACQUISITION_KYC (6) ====================
  {
    uid: 'tool-imp-01',
    category: 'CLIENT_ACQUISITION_KYC',
    ref: { engine: 'IMP', code: 'IMP-01', pinId: 'imp-1' },
    codeBadge: 'IMP-01',
    titleZh: '客戶專屬互動提案微網頁（附「客戶已閱」通知）',
    titleEn: 'Interactive Proposal Microsite + Live Read Receipt',
    whenToUseZh: '見客後發送專屬連結，追蹤客戶重點查看哪個保單年度',
    whenToUseEn: 'Share interactive proposal URL and track client policy-year dwell time',
    deliverableZh: '獨立分享連結 (?proposal=) ＋ 已閱時間紀錄',
    deliverableEn: 'Shareable microsite URL + read-receipt log',
  },
  {
    uid: 'tool-fn-06',
    category: 'CLIENT_ACQUISITION_KYC',
    ref: { engine: 'FN', code: 'FN-06', pinId: 'roadmap-fn-06' },
    codeBadge: 'FN-06',
    titleZh: 'WhatsApp／微信一鍵合規精算摘要及 4:5 圖卡生成器',
    titleEn: '1-Click WhatsApp / WeChat 4:5 Micro-Proposal PNG Card',
    whenToUseZh: '潛在客戶未肯睇幾十頁 PDF 時，發送一頁手機精算圖卡破冰',
    whenToUseEn: 'Send mobile-native 4:5 summary card with GL28 Safe Mode',
    deliverableZh: '繁簡英三語文案 ＋ 可下載 4:5 PNG 圖卡',
    deliverableEn: 'Trilingual copy + downloadable 4:5 PNG card',
  },
  {
    uid: 'tool-imp-05',
    category: 'CLIENT_ACQUISITION_KYC',
    ref: { engine: 'IMP', code: 'IMP-05', pinId: 'imp-5' },
    codeBadge: 'IMP-05',
    titleZh: '廣東話／普通話語音備忘 10 秒轉 GL30 合規紀要',
    titleEn: '10s Cantonese/Mandarin Voice Memo → GL30 FNA Sync',
    whenToUseZh: '見完客搭車途中口述重點，即時結構化寫入客戶 CRM 檔案',
    whenToUseEn: 'Convert post-meeting voice memo directly into signed GL30 FNA',
    deliverableZh: '自動填妥月入／流動資產／風險取向並解鎖 STP',
    deliverableEn: 'Structured FNA record synced to Lead CRM',
  },
  {
    uid: 'tool-fn-09',
    category: 'CLIENT_ACQUISITION_KYC',
    ref: { engine: 'FN', code: 'FN-09', pinId: 'roadmap-fn-09' },
    codeBadge: 'FN-09',
    titleZh: '粵語夾英文／普通話長篇會談逐字稿 → 自動填寫 FNA',
    titleEn: 'Meeting Audio & Transcript → PDPO-Compliant FNA Filler',
    whenToUseZh: '處理完整會談錄音或長篇對話筆記，連同 PDPO 聲明留痕',
    whenToUseEn: 'Extract full household FNA fields with PDPO PICS audit trail',
    deliverableZh: 'PDPO 合規核對 ＋ CRM 財務分析一鍵入庫',
    deliverableEn: 'PDPO PICS log + auto-populated CRM FNA',
  },
  {
    uid: 'tool-imp-07',
    category: 'CLIENT_ACQUISITION_KYC',
    ref: { engine: 'IMP', code: 'IMP-07', pinId: 'imp-7' },
    codeBadge: 'IMP-07',
    titleZh: '家庭成員保障樹狀圖及轉介人關係網絡',
    titleEn: 'Household Coverage Family Tree & Referral Graph',
    whenToUseZh: '盤點配偶、子女及父母保單缺口，挖掘全家加保與轉介紹機會',
    whenToUseEn: 'Map spouse, children & parents to uncover household cross-sell gaps',
    deliverableZh: '家庭成員缺口圖譜 ＋ 一鍵新增家庭成員至 CRM',
    deliverableEn: 'Visual household tree + 1-click CRM lead creation',
  },
  {
    uid: 'tool-imp-20',
    category: 'CLIENT_ACQUISITION_KYC',
    ref: { engine: 'IMP', code: 'IMP-20', pinId: 'imp-20' },
    codeBadge: 'IMP-20',
    titleZh: 'WhatsApp 合規發送留痕金庫＋「智方便 (iAM Smart)」接口',
    titleEn: 'WhatsApp Disclosure Audit Vault + HKSAR iAM Smart KYC',
    whenToUseZh: '發送建議書留存監管證據，並為香港居民完成政府數碼實名認證',
    whenToUseEn: 'Log compliant WhatsApp dispatches & verify HKSAR iAM Smart identity',
    deliverableZh: '不可篡改發送紀錄編號 ＋ iAM Smart 實名簽章',
    deliverableEn: 'Audit hash log + verified e-KYC status',
  },

  // ==================== B. MEDICAL_CLAIMS_UW (8) ====================
  {
    uid: 'tool-fn-01',
    category: 'MEDICAL_CLAIMS_UW',
    ref: { engine: 'FN', code: 'FN-01', pinId: 'roadmap-fn-01' },
    codeBadge: 'FN-01',
    titleZh: '現有保單體檢 X-Ray、團保銜接 VHIS 及一頁保障圖 PDF',
    titleEn: 'Existing Policy X-Ray, Group → VHIS Bridge & 1-Page PDF',
    whenToUseZh: '量化客戶 10 倍年薪人壽與危疾缺口，並計算高自付額 VHIS 省費比例',
    whenToUseEn: 'Quantify Life/CI gaps, Group Medical deductible bridge & export PDF',
    deliverableZh: '一頁式家庭保障全景圖 PDF 下載',
    deliverableEn: '1-Page Family Protection Map PDF',
  },
  {
    uid: 'tool-imp-02',
    category: 'MEDICAL_CLAIMS_UW',
    ref: { engine: 'IMP', code: 'IMP-02', pinId: 'imp-2' },
    codeBadge: 'IMP-02',
    titleZh: '現有舊保單／官方建議書 PDF 智能體檢掃描器',
    titleEn: 'Legacy Policy & Official BI PDF Gap Scanner',
    whenToUseZh: '客戶手持 5–10 年前舊醫療或單次危疾單，快速揪出分項上限盲點',
    whenToUseEn: 'Scan legacy policy wording to expose surgical sub-limits & single-CI traps',
    deliverableZh: '舊單條款紅黃綠風險報告 ＋ 升級補強建議',
    deliverableEn: 'Clause vulnerability report + upgrade bridge',
  },
  {
    uid: 'tool-imp-11',
    category: 'MEDICAL_CLAIMS_UW',
    ref: { engine: 'IMP', code: 'IMP-11', pinId: 'imp-11' },
    codeBadge: 'IMP-11',
    titleZh: '公司團體醫保離職／退休免核保銜接個人 VHIS 計算器',
    titleEn: 'Corporate Group Medical Exit / Retirement Bridge Calculator',
    whenToUseZh: '說服已有公司醫保的中高管趁健康鎖定 55/60/65 歲免核保轉零自付權',
    whenToUseEn: 'Model $16k/$25k/$50k deductible VHIS with zero-UW retirement step-down',
    deliverableZh: '在職省保費試算 ＋ 退休轉 HK$0 自付額對比表',
    deliverableEn: 'Working-years savings + retirement zero-deductible projection',
  },
  {
    uid: 'tool-fn-08',
    category: 'MEDICAL_CLAIMS_UW',
    ref: { engine: 'FN', code: 'FN-08', pinId: 'roadmap-fn-08' },
    codeBadge: 'FN-08',
    titleZh: '日間腸胃鏡／私院手術差額及「團保 → VHIS」雙重索償管家',
    titleEn: 'Day-Case vs Inpatient Shortfall & Dual-Claim Concierge',
    whenToUseZh: '客戶準備照腸胃鏡或做微創手術，預先核對醫療必需條款與索償次序',
    whenToUseEn: 'Prevent inpatient endoscopy rejection & sequence Group -> VHIS claims',
    deliverableZh: '帳單瀑布拆解圖 ＋ 雙保單無縫報銷步驟清單',
    deliverableEn: 'Bill waterfall breakdown + 2-policy claim checklist',
  },
  {
    uid: 'tool-imp-03',
    category: 'MEDICAL_CLAIMS_UW',
    ref: { engine: 'IMP', code: 'IMP-03', pinId: 'imp-3' },
    codeBadge: 'IMP-03',
    titleZh: '私家醫院主診醫生手術費中位數基準庫＋免找數專科網絡',
    titleEn: 'HK Private Surgeon Fee Median (P50/P90) & Cashless Centres',
    whenToUseZh: '用真實養和／港怡 P50/P90 手術收費數據，證明標準醫保賠償不足',
    whenToUseEn: 'Benchmark P50/P90 private surgeon bills & locate $0-deposit specialist centres',
    deliverableZh: '手術收費差額對比 ＋ 全港免找數日間中心名冊',
    deliverableEn: 'P50/P90 fee gap audit + cashless day-centre directory',
  },
  {
    uid: 'tool-imp-14',
    category: 'MEDICAL_CLAIMS_UW',
    ref: { engine: 'IMP', code: 'IMP-14', pinId: 'imp-14' },
    codeBadge: 'IMP-14',
    titleZh: '保司核保、免找數 LOG 及理賠時效溫度計＋出院清單',
    titleEn: 'Insurer UW / LOG / Claims SLA Thermometer & Discharge Pack',
    whenToUseZh: '客戶比較各保司批 LOG 速度，或出院前核對必備正本收據與病理報告',
    whenToUseEn: 'Compare insurer LOG turnaround days & share client discharge checklist',
    deliverableZh: '跨保司服務時效評級 ＋ 一鍵複製出院索償清單',
    deliverableEn: 'Insurer SLA comparison + copyable discharge checklist',
  },
  {
    uid: 'tool-fn-07',
    category: 'MEDICAL_CLAIMS_UW',
    ref: { engine: 'FN', code: 'FN-07', pinId: 'roadmap-fn-07' },
    codeBadge: 'FN-07',
    titleZh: '體況異常（甲狀腺／乳腺結節／三高／乙肝）AI 預核保引擎',
    titleEn: 'Sub-Standard Health (TI-RADS / BI-RADS / HBV) AI Pre-UW',
    whenToUseZh: '遞交正式投保前預判各保司加費或除外尺度，避免留下拒保紀錄',
    whenToUseEn: 'Pre-assess nodules, fatty liver, hypertension & HBV across insurers',
    deliverableZh: '跨保司核保結論預判 ＋ Gemini 核保總監第二意見',
    deliverableEn: 'Insurer UW outcome matrix + AI Chief UW memo',
  },
  {
    uid: 'tool-imp-13',
    category: 'MEDICAL_CLAIMS_UW',
    ref: { engine: 'IMP', code: 'IMP-13', pinId: 'imp-13' },
    codeBadge: 'IMP-13',
    titleZh: '次標準體匿名核保案例共享庫及驗血化驗指標分流器',
    titleEn: 'Sub-Standard UW Precedent Vault & Lab Biomarker Triage',
    whenToUseZh: '輸入客戶 BMI、血壓、HbA1c、ALT 肝酵素數值即時判斷標準體機會',
    whenToUseEn: 'Input live BMI, BP, HbA1c & ALT values to triage standard vs rated offer',
    deliverableZh: '化驗指標紅綠燈評級 ＋ 真實核保批核先例參考',
    deliverableEn: 'Biomarker risk triage + real HK underwriting precedents',
  },

  // ==================== C. WEALTH_TAX_LEGACY (7) ====================
  {
    uid: 'tool-fn-02',
    category: 'WEALTH_TAX_LEGACY',
    ref: { engine: 'FN', code: 'FN-02', pinId: 'roadmap-fn-02' },
    codeBadge: 'FN-02',
    titleZh: '「扣稅三寶」(VHIS+QDAP+TVC) 夫婦合併 vs 分開評稅精算器',
    titleEn: '"Tax Trio" Joint vs. Separate Salaries Tax & Post-Tax IRR',
    whenToUseZh: '每年 1–3 月稅季促單，精算夫婦如何分配扣稅額慳盡 HK$23,000+ 薪俸稅',
    whenToUseEn: 'Optimize spouse separate vs joint filing & compute post-tax QDAP IRR',
    deliverableZh: '最佳報稅分配方案 ＋ 退稅後真實 IRR 提升幅度',
    deliverableEn: 'Optimal filing split + post-tax IRR uplift',
  },
  {
    uid: 'tool-fn-03',
    category: 'WEALTH_TAX_LEGACY',
    ref: { engine: 'FN', code: 'FN-03', pinId: 'roadmap-fn-03' },
    codeBadge: 'FN-03',
    titleZh: '多元貨幣保單分拆、「567／568 提領」及三代傳承模擬器',
    titleEn: 'Multi-Currency Policy Split & "567 / 568" Legacy Simulator',
    whenToUseZh: '展示儲蓄單每年被動提領現金流、轉英鎊／加元及分拆保單予多名子女',
    whenToUseEn: 'Simulate 567/568 passive drawdowns, FX switch & multi-child policy split',
    deliverableZh: '提領後剩餘現金價值曲線 ＋ 每名子女分拆份額',
    deliverableEn: 'Post-withdrawal CSV trajectory + per-child split table',
  },
  {
    uid: 'tool-imp-12',
    category: 'WEALTH_TAX_LEGACY',
    ref: { engine: 'IMP', code: 'IMP-12', pinId: 'imp-12' },
    codeBadge: 'IMP-12',
    titleZh: '子女海外升學（英／美／澳／加）學費通脹及提取時間表',
    titleEn: 'UK / US / AU / CA University Tuition Inflation & FX Schedule',
    whenToUseZh: '為育兒家庭規劃 18–21 歲四年海外大學學費連生活費之精準供款目標',
    whenToUseEn: 'Project 5% tuition inflation across GBP/USD/AUD/CAD & 4-yr university drawdowns',
    deliverableZh: '四國升學總預算通脹預測 ＋ 18–21 歲外幣提領表',
    deliverableEn: '4-year overseas tuition budget + FX withdrawal schedule',
  },
  {
    uid: 'tool-imp-06',
    category: 'WEALTH_TAX_LEGACY',
    ref: { engine: 'IMP', code: 'IMP-06', pinId: 'imp-6' },
    codeBadge: 'IMP-06',
    titleZh: '分紅實現率歷年趨勢追蹤（2017–2025 世代折線圖）',
    titleEn: 'Multi-Year GN16 Fulfillment Cohort Trend (2017–2025)',
    whenToUseZh: '客戶質疑非保證紅利會否「畫大餅」時，用過去 8 年真實派發穩定度釋疑',
    whenToUseEn: 'Prove insurer dividend consistency across 2017–2025 GN16 cohorts',
    deliverableZh: '歷年實現率平均波幅評級 ＋ 客戶安心解說摘要',
    deliverableEn: 'Cohort stability score + historical GN16 series',
  },
  {
    uid: 'tool-imp-15',
    category: 'WEALTH_TAX_LEGACY',
    ref: { engine: 'IMP', code: 'IMP-15', pinId: 'imp-15' },
    codeBadge: 'IMP-15',
    titleZh: '保司限時首年回贈＋5年預繳保證高息 vs 銀行定存減息對比',
    titleEn: 'Quarterly Rebate + Prepaid Guaranteed Interest vs Bank TD Cliff',
    whenToUseZh: '季末臨門一腳促單，量化首年回贈疊加預繳鎖息跑贏定存續期減息之總收益',
    whenToUseEn: 'Stack FYP rebate + 4.8% prepaid lock-in against falling bank TD renewal rates',
    deliverableZh: '回贈＋預繳淨賺總額 vs 銀行定存收益差額表',
    deliverableEn: 'Rebate + prepaid interest gain vs TD rollover comparison',
  },
  {
    uid: 'tool-fn-05',
    category: 'WEALTH_TAX_LEGACY',
    ref: { engine: 'FN', code: 'FN-05', pinId: 'roadmap-fn-05' },
    codeBadge: 'FN-05',
    titleZh: '私人銀行保費融資利差及金管局 +200 點子加息壓測儀',
    titleEn: 'Premium Financing Leverage & Mandatory +200 bps Stress Test',
    whenToUseZh: '服務百萬美元高淨值客戶，計算首日退保價值貸款槓桿及監管加息壓測',
    whenToUseEn: 'Model Day-1 CSV LTV leverage & HKMA/IA IFS-PF +200 bps rate stress test',
    deliverableZh: '槓桿 IRR vs 全額現金對比 ＋ IFS-PF 合規壓測結果',
    deliverableEn: 'Leveraged IRR vs cash + IFS-PF +200 bps disclosure check',
  },
  {
    uid: 'tool-imp-09',
    category: 'WEALTH_TAX_LEGACY',
    ref: { engine: 'IMP', code: 'IMP-09', pinId: 'imp-9' },
    codeBadge: 'IMP-09',
    titleZh: '私人銀行保險金信託 vs 保單「類信託」分期賠付對比器',
    titleEn: 'Private Insurance Trust vs. Policy Installment Settlement',
    whenToUseZh: '高淨值客戶擔心後人一次過揮霍賠償或婚變分產，比較零成本保單分期選項',
    whenToUseEn: 'Compare costly private family trust setup fees vs $0-fee policy installment option',
    deliverableZh: '20 年信託管理費節省金額 ＋ 資產隔離比較矩陣',
    deliverableEn: '20-yr trust fee savings + creditor/divorce protection matrix',
  },

  // ==================== D. CROSS_BORDER_SME (4) ====================
  {
    uid: 'tool-fn-04',
    category: 'CROSS_BORDER_SME',
    ref: { engine: 'FN', code: 'FN-04', pinId: 'roadmap-fn-04' },
    codeBadge: 'FN-04',
    titleZh: '內地訪客 (MCV) 赴港簽單、港卡開戶及 eDDA 續保繳費管家',
    titleEn: 'MCV HK Signing, Bank Account Booking & eDDA Renewal Concierge',
    whenToUseZh: '內地客戶赴港前核驗入境白紙仔、大額 AML 財力文件及續期免手續費扣帳',
    whenToUseEn: 'Verify onshore landing slip rules, AML source-of-wealth & eDDA renewal FX',
    deliverableZh: '赴港簽單合規清單 ＋ 續期繳費渠道成本比較',
    deliverableEn: 'MCV onshore compliance checklist + renewal channel comparison',
  },
  {
    uid: 'tool-imp-04',
    category: 'CROSS_BORDER_SME',
    ref: { engine: 'IMP', code: 'IMP-04', pinId: 'imp-4' },
    codeBadge: 'IMP-04',
    titleZh: '港漂／高才通／MCV 赴港簽單一日行程、開戶及指南包',
    titleEn: 'Top Talent / IANG / MCV 1-Day HK Signing & Banking Itinerary',
    whenToUseZh: '客戶由西九龍高鐵或機場抵港，一鍵發送海港城／銅鑼灣簽單連開戶時間表',
    whenToUseEn: 'Generate hour-by-hour HSR/Airport arrival -> HSBC/BOCHK -> signing itinerary',
    deliverableZh: '可一鍵複製微信／WhatsApp 雙語貴賓接待行程卡',
    deliverableEn: 'Copyable WeChat/WhatsApp VIP signing & banking itinerary',
  },
  {
    uid: 'tool-imp-19',
    category: 'CROSS_BORDER_SME',
    ref: { engine: 'IMP', code: 'IMP-19', pinId: 'imp-19' },
    codeBadge: 'IMP-19',
    titleZh: '香港強積金 (MPF)＋年金／QDAP＋大灣區跨境養老院舍規劃儀',
    titleEn: 'HK MPF + Annuity/QDAP + Greater Bay Area Senior Care Planner',
    whenToUseZh: '準退休客戶比較留港私家護老院與深圳／珠海高端康養社區之每月現金流缺口',
    whenToUseEn: 'Compare HK private care homes vs Shenzhen/Zhuhai wellness communities',
    deliverableZh: '退休三支柱現金流瀑布圖 ＋ 跨境醫療直付配套評估',
    deliverableEn: '3-pillar retirement cashflow waterfall + GBA care comparison',
  },
  {
    uid: 'tool-imp-10',
    category: 'CROSS_BORDER_SME',
    ref: { engine: 'IMP', code: 'IMP-10', pinId: 'imp-10' },
    codeBadge: 'IMP-10',
    titleZh: '中小企「要員保險 (Keyman)」、股東互保及利得稅扣減精算器',
    titleEn: 'SME Keyman Insurance, Buy-Sell Equity & DIPN 28 Tax Calculator',
    whenToUseZh: '開發企業主客戶，計算創辦人突發事故之股權回購資金及 DIPN 28 扣稅條件',
    whenToUseEn: 'Size Keyman profit cover, Buy-Sell shareholder liquidity & IRD DIPN 28 tax deductibility',
    deliverableZh: '企業要員保額建議 ＋ 16.5% 利得稅扣減合規指引',
    deliverableEn: 'Keyman & Buy-Sell sizing + DIPN 28 corporate tax audit',
  },

  // ==================== E. MDRT_COMPLIANCE_BRAND (7) ====================
  {
    uid: 'tool-fn-10',
    category: 'MDRT_COMPLIANCE_BRAND',
    ref: { engine: 'FN', code: 'FN-10', pinId: 'roadmap-fn-10' },
    codeBadge: 'FN-10',
    titleZh: 'MDRT／COT／TOT 佣金進度及 13／25 個月續保防回撥看板',
    titleEn: 'MDRT / COT / TOT Commission Pace & Persistency Dashboard',
    whenToUseZh: '實時統計已簽保單與漏斗加權 FYC 距離香港區 MDRT 門檻之差距',
    whenToUseEn: 'Track issued FYC + weighted pipeline against HK MDRT/COT/TOT thresholds',
    deliverableZh: 'MDRT 達標進度條 ＋ 13 個月續保斷供風險預警',
    deliverableEn: 'MDRT milestone tracker + 13-month persistency alert',
  },
  {
    uid: 'tool-imp-08',
    category: 'MDRT_COMPLIANCE_BRAND',
    ref: { engine: 'IMP', code: 'IMP-08', pinId: 'imp-8' },
    codeBadge: 'IMP-08',
    titleZh: '第 13／25 個月續保率預警、合夥拆帳及佣金追回防護盾',
    titleEn: '13th/25th-Month Persistency Radar, Split Ledger & Clawback Shield',
    whenToUseZh: '監控寬限期將屆保單，精算救回一張斷供單可守住多少已發放佣金與年終花紅',
    whenToUseEn: 'Protect earned FYC & persistency bonus by rescuing grace-period policies',
    deliverableZh: '防追回金額試算 ＋ 合夥分佣淨額對帳表',
    deliverableEn: 'Clawback exposure ledger + split-commission net payout',
  },
  {
    uid: 'tool-imp-18',
    category: 'MDRT_COMPLIANCE_BRAND',
    ref: { engine: 'IMP', code: 'IMP-18', pinId: 'imp-18' },
    codeBadge: 'IMP-18',
    titleZh: '團隊主管 MDRT 進度看板、生日前「追溯年齡」雷達及 RO 包',
    titleEn: 'Team Director MDRT Board, Age-Backdate Radar & RO 7-Yr Pack',
    whenToUseZh: '篩查即將踏入生日前後可「Backdate 追溯保費」促單之客戶及匯出 RO 查冊包',
    whenToUseEn: 'Spot clients eligible for birthday age-backdating & export 7-yr RO audit pack',
    deliverableZh: '生日追溯促單名單 ＋ 營業處團隊業績與合規匯總',
    deliverableEn: 'Birthday backdate lead queue + RO compliance pack',
  },
  {
    uid: 'tool-fn-11',
    category: 'MDRT_COMPLIANCE_BRAND',
    ref: { engine: 'FN', code: 'FN-11', pinId: 'roadmap-fn-11' },
    codeBadge: 'FN-11',
    titleZh: '保單週年續保、第3年轉貨幣、第15年紅利鎖定及稅季提醒佇列',
    titleEn: 'Policy Anniversary, Yr-3 FX Switch & Yr-15 Bonus Lock-In Queue',
    whenToUseZh: '系統化跟進老客戶週年服務、4 月報稅證明書及紅利鎖定黃金窗口',
    whenToUseEn: 'Automate client servicing touchpoints for FX switch, bonus lock-in & tax certs',
    deliverableZh: '客戶週年待辦佇列 ＋ 一鍵複製跟進訊息',
    deliverableEn: 'Prioritized servicing queue + ready WhatsApp script',
  },
  {
    uid: 'tool-fn-12',
    category: 'MDRT_COMPLIANCE_BRAND',
    ref: { engine: 'FN', code: 'FN-12', pinId: 'roadmap-fn-12' },
    codeBadge: 'FN-12',
    titleZh: '保監局年度 15 小時 CPD 學分帳本、21日冷靜期及轉保 CPFI 審計',
    titleEn: 'HKIA 15-Hr CPD Ledger, 21-Day Cooling-Off & CPFI Auditor',
    whenToUseZh: '續牌前核對最少 3 小時道德必修 CPD，或審視轉保退保損失披露是否合規',
    whenToUseEn: 'Audit 15 CPD hours (incl. 3 Ethics hrs), cooling-off & CPFI replacement loss',
    deliverableZh: 'CPD 續牌合規狀態 ＋ CPFI 轉保退保損失審計表',
    deliverableEn: 'HKIA CPD readiness check + CPFI surrender loss audit',
  },
  {
    uid: 'tool-imp-16',
    category: 'MDRT_COMPLIANCE_BRAND',
    ref: { engine: 'IMP', code: 'IMP-16', pinId: 'imp-16' },
    codeBadge: 'IMP-16',
    titleZh: '全站顧問個人家族辦公室白牌主題、MDRT 頭銜及 QR 頁首',
    titleEn: 'Global White-Label Practice Brand, MDRT Badge & PDF QR Header',
    whenToUseZh: '自訂匯出 PDF 與微網頁之團隊頭銜、MDRT/COT 榮譽及聯絡二維碼',
    whenToUseEn: 'Customize practice header, MDRT honor badge & QR code across all exports',
    deliverableZh: '全站 PDF 建議書及微網頁品牌頁首即時生效',
    deliverableEn: 'Live white-label header applied to PDFs & microsites',
  },
  {
    uid: 'tool-imp-17',
    category: 'MDRT_COMPLIANCE_BRAND',
    ref: { engine: 'IMP', code: 'IMP-17', pinId: 'imp-17' },
    codeBadge: 'IMP-17',
    titleZh: '離線見客模式（PWA 跨境高鐵／醫院地庫無網絡報價安裝）',
    titleEn: 'Offline Meeting PWA Mode (Service Worker + Home Screen Install)',
    whenToUseZh: '於西九高鐵跨境段或私院地庫訊號微弱時，預先快取全套報價與客戶資料',
    whenToUseEn: 'Cache catalog & client workspace for zero-signal HSR or hospital meetings',
    deliverableZh: '本機離線資料快照 ＋ iPad／手機桌面 App 安裝',
    deliverableEn: 'Offline workspace snapshot + installable PWA status',
  },
];

export function filterUnifiedAdvisoryTools(params: {
  category: ToolUseCaseCategoryId;
  searchQuery: string;
  pinnedOnly?: boolean;
  pinnedIds?: string[];
}): UnifiedAdvisoryToolItem[] {
  const q = params.searchQuery.trim().toLowerCase();
  const pinnedSet = new Set(params.pinnedIds || []);

  return UNIFIED_32_TOOLS_DIRECTORY.filter((item) => {
    if (params.category !== 'ALL' && item.category !== params.category) {
      return false;
    }
    if (params.pinnedOnly && !pinnedSet.has(item.ref.pinId)) {
      return false;
    }
    if (!q) return true;
    const blob = `${item.codeBadge} ${item.titleZh} ${item.titleEn} ${item.whenToUseZh} ${item.whenToUseEn} ${item.deliverableZh} ${item.deliverableEn}`.toLowerCase();
    return blob.includes(q);
  });
}
