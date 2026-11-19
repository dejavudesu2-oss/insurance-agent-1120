import { ClaimScenarioId } from './clientGapEngine';
import { ScenarioComparisonItem } from './dealCaseEngine';
import {
  ClientLead,
  InsurancePlan,
  IntermediaryProfile,
  IntermediaryRole,
  PlanCategory,
} from './types';

export type GuidedStageKey = 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5' | 'stage6';

export interface AgentCompanyOption {
  code: string;
  nameZh: string;
  nameEn: string;
}

export const AGENT_COMPANY_OPTIONS: AgentCompanyOption[] = [
  { code: 'AIA', nameZh: '友邦香港 (AIA)', nameEn: 'AIA Hong Kong' },
  { code: 'PRU', nameZh: '保誠香港 (Prudential)', nameEn: 'Prudential HK' },
  { code: 'FWD', nameZh: '富衛香港 (FWD)', nameEn: 'FWD Hong Kong' },
  { code: 'MANULIFE', nameZh: '宏利香港 (Manulife)', nameEn: 'Manulife HK' },
  { code: 'SUNLIFE', nameZh: '永明金融 (Sun Life)', nameEn: 'Sun Life HK' },
  { code: 'AXA', nameZh: '安盛香港 (AXA)', nameEn: 'AXA Hong Kong' },
  { code: 'BOCLIFE', nameZh: '中銀人壽 (BOC Life)', nameEn: 'BOC Life' },
  { code: 'HSBC', nameZh: '滙豐保險 (HSBC Life)', nameEn: 'HSBC Life' },
  { code: 'CTFLIFE', nameZh: '周大福人壽 (CTF Life)', nameEn: 'CTF Life' },
  { code: 'CHUBB', nameZh: '安達人壽 (Chubb)', nameEn: 'Chubb Life HK' },
  { code: 'BUPA', nameZh: '保柏香港 (Bupa)', nameEn: 'Bupa Hong Kong' },
  { code: 'ZURICH', nameZh: '蘇黎世保險 (Zurich)', nameEn: 'Zurich HK' },
  { code: 'GENERALI', nameZh: '忠意保險 (Generali)', nameEn: 'Generali HK' },
  { code: 'YFLIFE', nameZh: '萬通保險 (YF Life)', nameEn: 'YF Life' },
  { code: 'TAIPING', nameZh: '中國太平 (China Taiping)', nameEn: 'China Taiping HK' },
];

export function resolveAgentCompanyOption(code: string | null | undefined): AgentCompanyOption | null {
  if (!code || code === 'ALL') return null;
  const upper = code.trim().toUpperCase();
  return (
    AGENT_COMPANY_OPTIONS.find((opt) => opt.code === upper) || {
      code: upper,
      nameZh: upper,
      nameEn: upper,
    }
  );
}

/**
 * Resolves the agent's primary/affiliated insurance company code so own-company
 * products are always presented first before suggesting other market insurers.
 */
export function resolveAgentCompanyCode(
  intermediary: IntermediaryProfile | null | undefined,
  preferredCompanyCode?: string | null
): string | null {
  if (preferredCompanyCode && preferredCompanyCode !== 'ALL') {
    return preferredCompanyCode.trim().toUpperCase();
  }
  if (!intermediary) return null;
  const specificAppointed = (intermediary.appointedInsurers || []).find(
    (code) => Boolean(code) && code !== 'ALL'
  );
  if (specificAppointed) {
    return specificAppointed.trim().toUpperCase();
  }
  // If Broker has a firm name matching an insurer, or fallback to null (all market)
  if (intermediary.role === IntermediaryRole.TIED_AGENT) {
    return 'AIA';
  }
  return null;
}

export interface PartitionedMarketPlans<T> {
  activeCompanyCode: string | null;
  activeCompanyNameZh: string | null;
  activeCompanyNameEn: string | null;
  ownCompanyItems: T[];
  otherCompanyItems: T[];
  orderedItems: T[];
}

/**
 * Partitions & sorts plans so the agent's own company products appear FIRST,
 * followed by other insurers as market suggestions.
 */
export function partitionPlansByAgentCompany<T extends { plan: InsurancePlan }>(
  items: T[],
  agentCompanyCode: string | null
): PartitionedMarketPlans<T> {
  const companyOpt = resolveAgentCompanyOption(agentCompanyCode);
  if (!companyOpt) {
    return {
      activeCompanyCode: null,
      activeCompanyNameZh: null,
      activeCompanyNameEn: null,
      ownCompanyItems: [],
      otherCompanyItems: items,
      orderedItems: items,
    };
  }

  const ownCompanyItems: T[] = [];
  const otherCompanyItems: T[] = [];

  for (const item of items) {
    if (item.plan.insurerCode.toUpperCase() === companyOpt.code) {
      ownCompanyItems.push(item);
    } else {
      otherCompanyItems.push(item);
    }
  }

  return {
    activeCompanyCode: companyOpt.code,
    activeCompanyNameZh: companyOpt.nameZh,
    activeCompanyNameEn: companyOpt.nameEn,
    ownCompanyItems,
    otherCompanyItems,
    orderedItems: [...ownCompanyItems, ...otherCompanyItems],
  };
}

export interface StepChecklistItem {
  id: string;
  labelZh: string;
  labelEn: string;
  done: boolean;
}

export interface GuidedStepGateResult {
  stepNumber: number;
  totalSteps: number;
  stepTitleZh: string;
  stepTitleEn: string;
  requiredActionZh: string;
  requiredActionEn: string;
  canAdvance: boolean;
  nextSection: GuidedStageKey | null;
  nextCtaZh: string;
  nextCtaEn: string;
  blockingHintZh: string;
  blockingHintEn: string;
  checklist: StepChecklistItem[];
}

/**
 * Evaluates whether the current step's required action(s) are completed so the
 * "Next Step" button only appears / unlocks once the user finishes the current move.
 */
export function evaluateGuidedStepGate(params: {
  activeSection: GuidedStageKey;
  expressMeetingMode: boolean;
  activeLead: ClientLead | null | undefined;
  anchorPlan: InsurancePlan | null;
  step1Confirmed: boolean;
  step3Confirmed: boolean;
  step4Confirmed: boolean;
  step5Signed: boolean;
}): GuidedStepGateResult {
  const {
    activeSection,
    expressMeetingMode,
    activeLead,
    anchorPlan,
    step1Confirmed,
    step3Confirmed,
    step4Confirmed,
    step5Signed,
  } = params;

  const hasValidProfile = Boolean(
    activeLead &&
      activeLead.fullNameZh.trim().length > 0 &&
      activeLead.age >= 18 &&
      activeLead.age <= 80 &&
      (activeLead.annualBudgetHkd ?? 0) >= 6000
  );
  const hasSelectedPlan = Boolean(anchorPlan);
  const totalSteps = expressMeetingMode ? 4 : 5;

  if (activeSection === 'stage1') {
    const checklist: StepChecklistItem[] = [
      {
        id: 'profile_valid',
        labelZh: '填妥客戶姓名、年齡及年度預算',
        labelEn: 'Enter client name, age & annual budget',
        done: hasValidProfile,
      },
      {
        id: 'step1_confirm',
        labelZh: '點擊「確認客戶資料」鎖定今次方案方向',
        labelEn: 'Click "Confirm Client Profile" to lock direction',
        done: hasValidProfile && step1Confirmed,
      },
    ];
    const canAdvance = hasValidProfile && step1Confirmed;
    return {
      stepNumber: 1,
      totalSteps,
      stepTitleZh: '第 1 步：確認客戶基本資料與保障目標',
      stepTitleEn: 'Step 1: Confirm Client Profile & Goal',
      requiredActionZh: '請先核對上方客戶資料，然後點擊「確認客戶資料」即可解鎖下一步。',
      requiredActionEn: 'Review client details above and click "Confirm Client Profile" to unlock the next step.',
      canAdvance,
      nextSection: 'stage2',
      nextCtaZh: '下一步：02 挑選保險計劃',
      nextCtaEn: 'Next: 02 Select Insurance Plan',
      blockingHintZh: hasValidProfile
        ? '請先點擊下方「確認客戶資料」按鈕，完成本步後就會出現「下一步」按鈕。'
        : '請先填妥客戶姓名、年齡（18–80 歲）及年預算（HK$6,000 以上）。',
      blockingHintEn: hasValidProfile
        ? 'Click "Confirm Client Profile" below to reveal the Next Step button.'
        : 'Enter valid client name, age (18–80), and annual budget first.',
      checklist,
    };
  }

  if (activeSection === 'stage2') {
    const checklist: StepChecklistItem[] = [
      {
        id: 'plan_selected',
        labelZh: anchorPlan
          ? `已揀選投保計劃：[${anchorPlan.insurerCode}] ${anchorPlan.nameZh}`
          : '從下方清單點擊「揀選此計劃」鎖定客戶投保產品',
        labelEn: anchorPlan
          ? `Selected plan: [${anchorPlan.insurerCode}] ${anchorPlan.nameEn}`
          : 'Click "Select This Plan" on a product card below',
        done: hasSelectedPlan,
      },
    ];
    return {
      stepNumber: 2,
      totalSteps,
      stepTitleZh: '第 2 步：挑選客戶投保的保險計劃',
      stepTitleEn: 'Step 2: Select Exact Insurance Plan',
      requiredActionZh: '先睇本司主推產品，再按需要參考其他保司；揀定至少 1 個具體計劃即可進入下一步。',
      requiredActionEn: 'Review your company products first, then other market suggestions, and select at least 1 exact plan.',
      canAdvance: hasSelectedPlan,
      nextSection: 'stage3',
      nextCtaZh: '下一步：03 保費配搭與理賠預估',
      nextCtaEn: 'Next: 03 Premium & Claim Preview',
      blockingHintZh: '請先點擊任一產品卡上的「揀選此計劃」，選定投保產品後會即時解鎖下一步。',
      blockingHintEn: 'Select an insurance plan from the list first to unlock the Next Step button.',
      checklist,
    };
  }

  if (activeSection === 'stage3') {
    const checklist: StepChecklistItem[] = [
      {
        id: 'plan_selected',
        labelZh: anchorPlan
          ? `主計劃：[${anchorPlan.insurerCode}] ${anchorPlan.nameZh}`
          : '請先返回第 02 步揀選具體保險計劃',
        labelEn: anchorPlan
          ? `Main Plan: [${anchorPlan.insurerCode}] ${anchorPlan.nameEn}`
          : 'Return to Step 02 to select an exact plan first',
        done: hasSelectedPlan,
      },
      {
        id: 'step3_confirm',
        labelZh: '核對保費、附約及對應理賠預估，點擊「確認配搭方案」',
        labelEn: 'Review premium, riders & matched claims, then click "Confirm Bundle"',
        done: hasSelectedPlan && step3Confirmed,
      },
    ];
    const canAdvance = hasSelectedPlan && step3Confirmed;
    const nextSection: GuidedStageKey = expressMeetingMode ? 'stage5' : 'stage4';
    return {
      stepNumber: 3,
      totalSteps,
      stepTitleZh: '第 3 步：核對保費配搭與對應理賠測試',
      stepTitleEn: 'Step 3: Configure Riders & Matched Claim Test',
      requiredActionZh: '按客戶實際已選計劃核對供款年期、附約及理賠賠付，然後點擊「確認配搭方案」。',
      requiredActionEn: 'Confirm payment term, riders, and matched claim payouts, then click "Confirm Bundle".',
      canAdvance,
      nextSection,
      nextCtaZh: expressMeetingMode
        ? '下一步：05 投保確認與簽署'
        : '下一步：04 製作建議書簡報',
      nextCtaEn: expressMeetingMode
        ? 'Next: 05 Policy Confirmation & Sign'
        : 'Next: 04 Proposal Presentation',
      blockingHintZh: !hasSelectedPlan
        ? '尚未選定具體保險計劃，請先返回第 02 步揀選計劃。'
        : '核對好保費及附約後，請點擊「確認配搭方案」即可解鎖下一步。',
      blockingHintEn: !hasSelectedPlan
        ? 'No plan selected yet. Please pick a plan in Step 02 first.'
        : 'Click "Confirm Bundle" once satisfied to unlock the Next Step button.',
      checklist,
    };
  }

  if (activeSection === 'stage4') {
    const checklist: StepChecklistItem[] = [
      {
        id: 'plan_selected',
        labelZh: anchorPlan
          ? `建議書主計劃：[${anchorPlan.insurerCode}] ${anchorPlan.nameZh}`
          : '請先於第 02 步揀選具體計劃',
        labelEn: anchorPlan
          ? `Proposal Plan: [${anchorPlan.insurerCode}] ${anchorPlan.nameEn}`
          : 'Select an exact plan in Step 02 first',
        done: hasSelectedPlan,
      },
      {
        id: 'step4_confirm',
        labelZh: '預覽簡報／PDF 或分享連結後，點擊「確認建議書已備妥」',
        labelEn: 'Review proposal slides/PDF and click "Confirm Proposal Ready"',
        done: hasSelectedPlan && step4Confirmed,
      },
    ];
    const canAdvance = hasSelectedPlan && step4Confirmed;
    return {
      stepNumber: 4,
      totalSteps,
      stepTitleZh: '第 4 步：製作及確認客戶建議書',
      stepTitleEn: 'Step 4: Review & Confirm Client Proposal',
      requiredActionZh: '確認建議書內容無誤後，點擊「確認建議書已備妥」進入最終簽署確認。',
      requiredActionEn: 'Verify the proposal presentation and click "Confirm Proposal Ready" to proceed to signing.',
      canAdvance,
      nextSection: 'stage5',
      nextCtaZh: '下一步：05 正式投保確認與簽署',
      nextCtaEn: 'Next: 05 Official Confirmation & Sign-Off',
      blockingHintZh: !hasSelectedPlan
        ? '請先於第 02 步揀選具體保險計劃。'
        : '點擊「確認建議書已備妥」後就會出現「下一步：05 正式投保確認」。',
      blockingHintEn: !hasSelectedPlan
        ? 'Select an exact insurance plan in Step 02 first.'
        : 'Click "Confirm Proposal Ready" to unlock Step 05.',
      checklist,
    };
  }

  if (activeSection === 'stage5') {
    const checklist: StepChecklistItem[] = [
      {
        id: 'plan_selected',
        labelZh: anchorPlan
          ? `確認投保計劃：[${anchorPlan.insurerCode}] ${anchorPlan.nameZh}`
          : '尚未揀選具體投保計劃',
        labelEn: anchorPlan
          ? `Confirmed Plan: [${anchorPlan.insurerCode}] ${anchorPlan.nameEn}`
          : 'No exact plan selected yet',
        done: hasSelectedPlan,
      },
      {
        id: 'step5_signed',
        labelZh: '完成客戶電子簽署並生成投保確認書',
        labelEn: 'Complete client e-signature & issue confirmation',
        done: hasSelectedPlan && step5Signed,
      },
    ];
    return {
      stepNumber: expressMeetingMode ? 4 : 5,
      totalSteps,
      stepTitleZh: '第 5 步：正式投保確認書與電子簽署',
      stepTitleEn: 'Step 5: Official Confirmation & e-Signature',
      requiredActionZh: '按實際已選計劃核對利益說明摘要，完成法定文件確認及雙重簽署。',
      requiredActionEn: 'Review the product-matched benefit summary, statutory declarations, and dual signature.',
      canAdvance: hasSelectedPlan && step5Signed,
      nextSection: null,
      nextCtaZh: '已完成今次投保流程 ✓',
      nextCtaEn: 'Application Flow Completed ✓',
      blockingHintZh: !hasSelectedPlan
        ? '請先於第 02 步揀選具體保險計劃，系統才會顯示對應的正式投保確認書。'
        : '請完成下方 3 份法定確認及電子簽署。',
      blockingHintEn: !hasSelectedPlan
        ? 'Select an exact insurance plan in Step 02 first to generate the confirmation summary.'
        : 'Complete the statutory acknowledgments and electronic signature below.',
      checklist,
    };
  }

  // Stage 6: Optional specialist toolbox
  return {
    stepNumber: totalSteps,
    totalSteps,
    stepTitleZh: '附加進階計算機工具箱（選用）',
    stepTitleEn: 'Optional Specialist Calculators',
    requiredActionZh: '此處為高淨值扣稅、信託及核保等進階工具，可隨時返回主流程。',
    requiredActionEn: 'Optional specialist calculators — return to the guided workflow anytime.',
    canAdvance: true,
    nextSection: 'stage1',
    nextCtaZh: '返回第 01 步客戶資料',
    nextCtaEn: 'Return to Step 01 Client Profile',
    blockingHintZh: '',
    blockingHintEn: '',
    checklist: [],
  };
}

export interface ProductMatchedClaimMatrixResult {
  hasExactBoughtPlan: boolean;
  boughtPlans: InsurancePlan[];
  coveredCategories: PlanCategory[];
  relevantScenarioIds: ClaimScenarioId[];
  relevantScenarios: ScenarioComparisonItem[];
  matchedPlanNamesZh: string;
  matchedPlanNamesEn: string;
  explanationZh: string;
  explanationEn: string;
}

/**
 * Strictly gates and filters the Claim Stress Matrix ("全景理賠危機壓力測試矩陣與賠付明細"):
 * - Hidden/locked when NO exact plan is selected/bought yet (`anchorPlan === null`).
 * - When exact plan(s) ARE bought, shows ONLY claim scenarios relevant to those exact
 *   bought plan categories + explicitly attached riders.
 */
export function filterClaimScenariosForBoughtPlans(params: {
  allScenarios: ScenarioComparisonItem[];
  anchorPlan: InsurancePlan | null;
  comboSecondaryPlans?: InsurancePlan[];
  selectedRiderIds?: string[];
}): ProductMatchedClaimMatrixResult {
  const {
    allScenarios,
    anchorPlan,
    comboSecondaryPlans = [],
    selectedRiderIds = [],
  } = params;

  if (!anchorPlan) {
    return {
      hasExactBoughtPlan: false,
      boughtPlans: [],
      coveredCategories: [],
      relevantScenarioIds: [],
      relevantScenarios: [],
      matchedPlanNamesZh: '',
      matchedPlanNamesEn: '',
      explanationZh: '尚未揀選實際投保計劃。請先於第 02 步揀選具體保險計劃，系統才會按所買產品自動顯示對應的理賠壓力測試。',
      explanationEn: 'No insurance plan selected yet. Pick an exact plan in Step 02 first to generate product-matched claim scenarios.',
    };
  }

  const boughtPlans: InsurancePlan[] = [
    anchorPlan,
    ...comboSecondaryPlans.filter((p) => p && p.id !== anchorPlan.id),
  ];

  const coveredCategories = Array.from(new Set(boughtPlans.map((p) => p.category)));
  const relevantIds = new Set<ClaimScenarioId>();

  for (const plan of boughtPlans) {
    switch (plan.category) {
      case PlanCategory.VHIS:
      case PlanCategory.HIGH_END_MEDICAL:
        relevantIds.add('HOSPITAL_MIN_INVASIVE');
        relevantIds.add('CANCER_TARGETED_24M');
        break;
      case PlanCategory.CRITICAL_ILLNESS:
        relevantIds.add('CANCER_TARGETED_24M');
        relevantIds.add('MAJOR_CI_RECURRENCE');
        break;
      case PlanCategory.TERM_LIFE:
        relevantIds.add('BREADWINNER_MORTGAGE');
        relevantIds.add('ACCIDENT_DISABILITY_LEAVE');
        break;
      case PlanCategory.UNIVERSAL_LIFE:
      case PlanCategory.PARTICIPATING_SAVINGS:
      case PlanCategory.QDAP:
        relevantIds.add('BREADWINNER_MORTGAGE');
        break;
      case PlanCategory.GENERAL_GI:
        relevantIds.add('ACCIDENT_DISABILITY_LEAVE');
        break;
    }
  }

  // Also include scenarios directly covered by explicitly attached riders
  for (const riderId of selectedRiderIds) {
    if (riderId === 'RIDER_SEMI_PRIVATE_VHIS' || riderId === 'RIDER_CANCER_TARGETED') {
      relevantIds.add('HOSPITAL_MIN_INVASIVE');
      relevantIds.add('CANCER_TARGETED_24M');
    }
    if (riderId === 'RIDER_EARLY_CI_EXTRA') {
      relevantIds.add('MAJOR_CI_RECURRENCE');
    }
    if (riderId === 'RIDER_ACCIDENT_INCOME') {
      relevantIds.add('ACCIDENT_DISABILITY_LEAVE');
    }
    if (riderId === 'RIDER_RETIREMENT_ANNUITY') {
      relevantIds.add('BREADWINNER_MORTGAGE');
    }
  }

  const relevantScenarioIds = Array.from(relevantIds);
  const relevantScenarios = allScenarios.filter((item) =>
    relevantIds.has(item.scenarioId)
  );

  const matchedPlanNamesZh = boughtPlans
    .map((p) => `[${p.insurerCode}] ${p.nameZh}`)
    .join(' ＋ ');
  const matchedPlanNamesEn = boughtPlans
    .map((p) => `[${p.insurerCode}] ${p.nameEn}`)
    .join(' + ');

  return {
    hasExactBoughtPlan: true,
    boughtPlans,
    coveredCategories,
    relevantScenarioIds,
    relevantScenarios,
    matchedPlanNamesZh,
    matchedPlanNamesEn,
    explanationZh: `已按客戶實際已選計劃（${matchedPlanNamesZh}）自動篩選，僅顯示與所買保障對應的 ${relevantScenarios.length} 項理賠測試情境。`,
    explanationEn: `Filtered strictly to ${relevantScenarios.length} claim scenario(s) matching the selected plan(s): ${matchedPlanNamesEn}.`,
  };
}

export interface ProductMatchedProposalSummaryResult {
  hasExactBoughtPlan: boolean;
  boughtPlans: InsurancePlan[];
  showGl28SurrenderTable: boolean;
  showMedicalHospitalSummary: boolean;
  showCriticalIllnessSummary: boolean;
  showTermLifeSummary: boolean;
  showGeneralGiSummary: boolean;
  showTaxDeductionSummary: boolean;
  primarySummaryTitleZh: string;
  primarySummaryTitleEn: string;
  taxDeductionCapHkd: number;
}

/**
 * Strictly gates and tailors "正式投保方案確認書及利益說明摘要" in Stage 05:
 * - Only shown when exact insurance plan(s) are selected (`anchorPlan !== null`).
 * - Shows ONLY the benefit sections corresponding to the exact product category(ies) bought
 *   (e.g., GL28 cash-value surrender table ONLY for Savings/QDAP/UL/Par-CI plans; Medical LOG
 *   summary ONLY for VHIS/High-End Medical; CI multi-claim summary ONLY for CI; Term summary
 *   ONLY for Term/UL; GI summary ONLY for General Insurance).
 */
export function deriveProposalSummarySectionsForBoughtPlans(params: {
  anchorPlan: InsurancePlan | null;
  comboSecondaryPlans?: InsurancePlan[];
  selectedRiderIds?: string[];
}): ProductMatchedProposalSummaryResult {
  const { anchorPlan, comboSecondaryPlans = [], selectedRiderIds = [] } = params;

  if (!anchorPlan) {
    return {
      hasExactBoughtPlan: false,
      boughtPlans: [],
      showGl28SurrenderTable: false,
      showMedicalHospitalSummary: false,
      showCriticalIllnessSummary: false,
      showTermLifeSummary: false,
      showGeneralGiSummary: false,
      showTaxDeductionSummary: false,
      primarySummaryTitleZh: '尚未選定具體投保計劃',
      primarySummaryTitleEn: 'No Insurance Plan Selected',
      taxDeductionCapHkd: 0,
    };
  }

  const boughtPlans: InsurancePlan[] = [
    anchorPlan,
    ...comboSecondaryPlans.filter((p) => p && p.id !== anchorPlan.id),
  ];

  const categories = new Set(boughtPlans.map((p) => p.category));

  const showGl28SurrenderTable = boughtPlans.some(
    (p) =>
      p.category === PlanCategory.PARTICIPATING_SAVINGS ||
      p.category === PlanCategory.QDAP ||
      p.category === PlanCategory.UNIVERSAL_LIFE ||
      (p.category === PlanCategory.CRITICAL_ILLNESS && p.fulfillmentRatio !== null)
  );

  const showMedicalHospitalSummary =
    categories.has(PlanCategory.VHIS) ||
    categories.has(PlanCategory.HIGH_END_MEDICAL) ||
    selectedRiderIds.includes('RIDER_SEMI_PRIVATE_VHIS');

  const showCriticalIllnessSummary =
    categories.has(PlanCategory.CRITICAL_ILLNESS) ||
    selectedRiderIds.includes('RIDER_EARLY_CI_EXTRA') ||
    selectedRiderIds.includes('RIDER_CANCER_TARGETED');

  const showTermLifeSummary =
    categories.has(PlanCategory.TERM_LIFE) || categories.has(PlanCategory.UNIVERSAL_LIFE);

  const showGeneralGiSummary = categories.has(PlanCategory.GENERAL_GI);

  const taxDeductionCapHkd = boughtPlans.reduce(
    (sum, p) => sum + (p.taxDeductibleCapHkd || 0),
    0
  );
  const showTaxDeductionSummary = taxDeductionCapHkd > 0;

  let primarySummaryTitleZh = '正式投保方案確認書及對應保障摘要';
  let primarySummaryTitleEn = 'OFFICIAL PROPOSAL CONFIRMATION & MATCHED BENEFIT SUMMARY';

  if (showGl28SurrenderTable && !showMedicalHospitalSummary && !showCriticalIllnessSummary) {
    primarySummaryTitleZh = '正式投保方案確認書及 GL28 利益說明摘要（儲蓄／年金／萬用壽險）';
    primarySummaryTitleEn = 'OFFICIAL PROPOSAL CONFIRMATION & GL28 BENEFIT ILLUSTRATION';
  } else if (showMedicalHospitalSummary && !showGl28SurrenderTable && !showCriticalIllnessSummary) {
    primarySummaryTitleZh = '正式投保方案確認書及醫療保障摘要（自願醫保／高端醫療）';
    primarySummaryTitleEn = 'OFFICIAL PROPOSAL CONFIRMATION & MEDICAL BENEFIT SUMMARY';
  } else if (showCriticalIllnessSummary && !showMedicalHospitalSummary) {
    primarySummaryTitleZh = '正式投保方案確認書及危疾賠償摘要';
    primarySummaryTitleEn = 'OFFICIAL PROPOSAL CONFIRMATION & CRITICAL ILLNESS SUMMARY';
  } else if (showTermLifeSummary && !showGl28SurrenderTable) {
    primarySummaryTitleZh = '正式投保方案確認書及定期人壽保障摘要';
    primarySummaryTitleEn = 'OFFICIAL PROPOSAL CONFIRMATION & TERM LIFE SCHEDULE';
  } else if (showGeneralGiSummary && boughtPlans.length === 1) {
    primarySummaryTitleZh = '正式投保方案確認書及一般保險保障細則摘要';
    primarySummaryTitleEn = 'OFFICIAL PROPOSAL CONFIRMATION & GENERAL INSURANCE SCHEDULE';
  }

  return {
    hasExactBoughtPlan: true,
    boughtPlans,
    showGl28SurrenderTable,
    showMedicalHospitalSummary,
    showCriticalIllnessSummary,
    showTermLifeSummary,
    showGeneralGiSummary,
    showTaxDeductionSummary,
    primarySummaryTitleZh,
    primarySummaryTitleEn,
    taxDeductionCapHkd,
  };
}
