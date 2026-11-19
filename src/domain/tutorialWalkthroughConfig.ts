import type { WorkspaceSection } from '../components/SidebarNav';

export type TutorialTargetSubTab =
  | 'profile'
  | 'crm'
  | 'insights'
  | 'team_coaching'
  | 'market'
  | 'clauses'
  | 'actuarial_lab'
  | 'cart'
  | 'hospital'
  | 'deck'
  | 'microsite'
  | 'stp'
  | 'servicing'
  | 'compliance';

export type TutorialAudienceFilter =
  | 'ALL'
  | 'PREP_CRM'
  | 'COMPARE_ACTUARIAL'
  | 'MEDICAL_PROPOSAL'
  | 'CLOSING_SERVICING';

export interface WorkflowRoiBenchmark {
  id: string;
  phaseZh: string;
  phaseEn: string;
  beforeZh: string;
  beforeEn: string;
  afterZh: string;
  afterEn: string;
  beforeMinutes: number;
  afterMinutes: number;
}

export interface TutorialSubStepItem {
  id: string;
  code: string;
  startSec: number;
  endSec: number;
  formattedStart: string;
  uiControlZh: string;
  uiControlEn: string;
  expectedResultZh: string;
  expectedResultEn: string;
  targetStage: WorkspaceSection;
  targetSubTab?: TutorialTargetSubTab;
  spotlightSelector?: string;
}

export interface TutorialChapterItem {
  id: string;
  stepNumber: string;
  stepBadgeZh: string;
  stepBadgeEn: string;
  audienceGroup: Exclude<TutorialAudienceFilter, 'ALL'>;
  startSec: number;
  endSec: number;
  formattedStart: string;
  durationSec: number;
  titleZh: string;
  titleEn: string;
  traditionalBottleneckZh: string;
  traditionalBottleneckEn: string;
  traditionalMinutes: number;
  optimizedMinutes: number;
  timeComparisonZh: string;
  timeComparisonEn: string;
  cantoneseVoiceScript: string;
  summaryZh: string;
  summaryEn: string;
  subSteps: [TutorialSubStepItem, TutorialSubStepItem, TutorialSubStepItem];
  actionStepsZh: string[];
  actionStepsEn: string[];
  cantoneseProTip: string;
  proTipEn: string;
  keyOutcomeZh: string;
  keyOutcomeEn: string;
  targetStage: WorkspaceSection;
  targetSubTab?: TutorialTargetSubTab;
  opensMemberModal?: boolean;
}

export const CANTONESE_TUTORIAL_VIDEO_PATH =
  '/videos/hk-insurehub-cantonese-tutorial.mp4';
export const CANTONESE_TUTORIAL_VTT_PATH =
  '/videos/hk-insurehub-cantonese-tutorial.vtt';
export const CANTONESE_TUTORIAL_POSTER_PATH =
  '/videos/hk-insurehub-tutorial-poster.jpg';
export const CANTONESE_TUTORIAL_TOTAL_DURATION_SEC = 144;

export const ADVISOR_WORKFLOW_ROI_BENCHMARKS: WorkflowRoiBenchmark[] = [
  {
    id: 'roi-prep',
    phaseZh: '01. 客戶資料同保障缺口',
    phaseEn: '01. Client Info & Coverage Gap',
    beforeZh: '平時自己開 Excel 計缺口＋摷舊紀錄：50 分鐘',
    beforeEn: 'Manual Excel gap math & chat search: 50 min',
    afterZh: '自動計齊全家缺口＋跟進名單排序：3 分鐘',
    afterEn: 'Auto Gap Chart + Sorted Client List: 3 min',
    beforeMinutes: 50,
    afterMinutes: 3,
  },
  {
    id: 'roi-compare',
    phaseZh: '02. 跨公司報價同條款比較',
    phaseEn: '02. Plan Comparison & Clauses',
    beforeZh: '開齊幾間保險公司網打價＋逐頁搵條款：65 分鐘',
    beforeEn: '6 insurer portals + manual clause PDF check: 65 min',
    afterZh: '三款計劃並排對比＋分紅打折測試：3 分鐘',
    afterEn: '3-Plan Side-by-Side + Stress Test: 3 min',
    beforeMinutes: 65,
    afterMinutes: 3,
  },
  {
    id: 'roi-proposal',
    phaseZh: '03. 私院收費參考同出建議書',
    phaseEn: '03. Hospital Fees & Proposal Export',
    beforeZh: '上網搵私家醫院收費＋夜晚自己執簡報：40 分鐘',
    beforeEn: 'Hospital fee lookup + manual slide formatting: 40 min',
    afterZh: '即睇私院免找數＋一鍵出 5 頁 PDF／手機連結：3 分鐘',
    afterEn: 'Hospital Cashless + 1-Click PDF & QR: 3 min',
    beforeMinutes: 40,
    afterMinutes: 3,
  },
  {
    id: 'roi-closing',
    phaseZh: '04. 簽單確認同續保跟進',
    phaseEn: '04. Proposal Sign-Off & Renewals',
    beforeZh: '重填客戶資料、驚漏簽聲明同人手記續保：25 分鐘',
    beforeEn: 'Paper forms, missing signatures & manual logs: 25 min',
    afterZh: '自動帶入資料簽名＋一鍵匯出日曆提醒：3 分鐘',
    afterEn: 'Compliance Checklist + e-Sign & Alerts: 3 min',
    beforeMinutes: 25,
    afterMinutes: 3,
  },
];

export function computeWorkflowEfficiencySummary(
  benchmarks: WorkflowRoiBenchmark[] = ADVISOR_WORKFLOW_ROI_BENCHMARKS
): {
  totalBeforeMinutes: number;
  totalAfterMinutes: number;
  minutesSavedPerCase: number;
  timeSavedPercent: number;
} {
  const totalBeforeMinutes = benchmarks.reduce((sum, b) => sum + b.beforeMinutes, 0);
  const totalAfterMinutes = benchmarks.reduce((sum, b) => sum + b.afterMinutes, 0);
  const minutesSavedPerCase = Math.max(0, totalBeforeMinutes - totalAfterMinutes);
  const timeSavedPercent =
    totalBeforeMinutes > 0
      ? Math.round((minutesSavedPerCase / totalBeforeMinutes) * 100)
      : 0;
  return {
    totalBeforeMinutes,
    totalAfterMinutes,
    minutesSavedPerCase,
    timeSavedPercent,
  };
}

export function formatTutorialTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const CANTONESE_TUTORIAL_CHAPTERS: TutorialChapterItem[] = [
  {
    id: 'ch1',
    stepNumber: '01',
    stepBadgeZh: '第 01 / 08 步',
    stepBadgeEn: 'STEP 01 / 08',
    audienceGroup: 'PREP_CRM',
    startSec: 0,
    endSec: 18,
    formattedStart: '00:00',
    durationSec: 18,
    titleZh: '顧問登入 ＋ 切換保險經紀／單一公司代理身分',
    titleEn: 'Advisor Sign-In & Broker / Agent License Role Setup',
    traditionalBottleneckZh: '常見情況：客戶舊建議書散落唔同電腦，有時又易搞亂經紀同單一公司代理產品範圍',
    traditionalBottleneckEn: 'Common Issue: Scattered client files across devices and manual license checks',
    traditionalMinutes: 15,
    optimizedMinutes: 0.5,
    timeComparisonZh: '15 分鐘搵舊檔 → 5 秒登入即用',
    timeComparisonEn: '15 min file hunt → 5 sec sign-in',
    cantoneseVoiceScript:
      '第一步同大家睇吓點樣登入同揀返自己牌照身分！喺首頁右上角撳「會員登入」，可以揀示範帳號 FB1928 一鍵試用。入到工作台之後，喺左下角可以隨時切換你係「保險經紀（比較全港產品）」定係「單一保險公司代理」，系統會自動幫你對應返可銷售嘅產品範圍！',
    summaryZh:
      '示範點樣登入顧問帳號，並喺工作台左下角揀返保險經紀或單一公司代理身分。',
    summaryEn:
      'Walkthrough of signing in with advisor license FB1928 and switching between whole-market Broker and single-insurer Agent modes.',
    subSteps: [
      {
        id: 'ch1-s1',
        code: '1.1',
        startSec: 0,
        endSec: 6,
        formattedStart: '00:00',
        uiControlZh: '撳右上角「會員登入」→ 揀「郭志明 · FB1928」示範帳號',
        uiControlEn: 'Click "Sign In" → Select "Raymond Kwok · FB1928" demo account',
        expectedResultZh: '自動填好電郵同牌照號碼，即刻試用唔使逐隻字打',
        expectedResultEn: 'Auto-populates advisor credentials accurately',
        targetStage: 'stage1',
        targetSubTab: 'profile',
        spotlightSelector: '[data-testid="sidebar-member-auth-btn"]',
      },
      {
        id: 'ch1-s2',
        code: '1.2',
        startSec: 6,
        endSec: 12,
        formattedStart: '00:06',
        uiControlZh: '撳「登入工作台」打開你嘅個人顧問頁面',
        uiControlEn: 'Click "Sign In" to open your advisor workspace',
        expectedResultZh: '載入個人客戶名單、見客筆記同雲端備份功能',
        expectedResultEn: 'Loads your personal client list, notes, and account settings',
        targetStage: 'stage1',
        targetSubTab: 'profile',
        spotlightSelector: '[data-testid="sidebar-member-auth-btn"]',
      },
      {
        id: 'ch1-s3',
        code: '1.3',
        startSec: 12,
        endSec: 18,
        formattedStart: '00:12',
        uiControlZh: '喺左下角「牌照身分」揀返保險經紀 ／ 保險代理人',
        uiControlEn: 'Switch "License Role" dropdown in the bottom-left sidebar',
        expectedResultZh: '自動按全港經紀或單一公司代理身分顯示可遞交嘅產品',
        expectedResultEn: 'Automatically applies whole-market Broker or single-insurer Agent rules',
        targetStage: 'stage1',
        targetSubTab: 'profile',
        spotlightSelector: '#rbac-role-select',
      },
    ],
    actionStepsZh: [
      '撳右上角「會員登入」，揀「郭志明 · FB1928」示範帳號或入自己電郵登入。',
      '撳「開始使用」入去睇返客戶名單同報價工具。',
      '喺左下角「牌照身分」試吓切換「保險經紀」同「保險代理人」。',
      '右上角客戶選單同建議書資料會跟住一齊更新。',
    ],
    actionStepsEn: [
      'Click "Sign In" in the top bar and sign in with demo license FB1928.',
      'Open the workspace with your personal client list and proposal cart.',
      'Use the bottom-left "License Role" selector to switch between Broker and Agent.',
      'Confirm that product eligibility updates automatically for your selected role.',
    ],
    cantoneseProTip:
      '新同事開工前先喺左下角揀好「經紀／代理」身分，系統就會自動提你邊啲產品可以直接落單，唔怕搞錯。',
    proTipEn:
      'Setting your license role first ensures the app automatically checks product eligibility before you prepare paperwork.',
    keyOutcomeZh: '慳返 15 分鐘搵檔 · 自動對應牌照範圍',
    keyOutcomeEn: 'Saves 15m/meeting · Automatic license check',
    targetStage: 'stage1',
    targetSubTab: 'profile',
    opensMemberModal: false,
  },
  {
    id: 'ch2',
    stepNumber: '02',
    stepBadgeZh: '第 02 / 08 步',
    stepBadgeEn: 'STEP 02 / 08',
    audienceGroup: 'PREP_CRM',
    startSec: 18,
    endSec: 36,
    formattedStart: '00:18',
    durationSec: 18,
    titleZh: '第 01A 步：睇清全家保障缺口、舊保單一覽同記低見客重點',
    titleEn: 'Stage 01A: Check Coverage Gaps, Policy Summary & Follow-Ups',
    traditionalBottleneckZh: '常見情況：見客前要自己開 Excel 計樓按同醫療缺口，傾完返去忙兩日又唔記得個客講過乜',
    traditionalBottleneckEn: 'Old Bottleneck: 45m manual FNA gap spreadsheets and forgotten handwritten meeting notes',
    traditionalMinutes: 45,
    optimizedMinutes: 2,
    timeComparisonZh: '45 分鐘手計 → 2 分鐘睇清缺口兼存檔',
    timeComparisonEn: '45 min manual FNA → 2 min live radar + notes',
    cantoneseVoiceScript:
      '入到第 01A 步，我哋直接睇點樣用！喺頂部揀返客戶「陳冠宇 Daniel」，下面張圖即刻幫你計好供樓人壽、私家醫院、危疾同退休仲差幾多保額，仲可以開埋「家庭保單總覽」同「現有保單一覽表」幫兩公婆計埋扣稅上限！傾完順手喺下面打低客想要半私家房、年預算四萬八，再加埋「星期二發建議書」待辦事項，完全唔怕漏！',
    summaryZh:
      '示範點樣一頁睇清客戶 6 項保障缺口、家庭保單扣稅總覽與舊保單整合表，並即時記低見客筆記同下一步待辦事項。',
    summaryEn:
      'Close-up capture of reading the 6-Axis Gap Radar, typing & saving structured meeting notes, and adding a dated follow-up task.',
    subSteps: [
      {
        id: 'ch2-s1',
        code: '2.1',
        startSec: 18,
        endSec: 24,
        formattedStart: '00:18',
        uiControlZh: '喺頂部揀客戶「陳冠宇 Daniel (36歲)」→ 睇「保障缺口分佈圖」同家庭保單總覽',
        uiControlEn: 'Select client "Daniel Chan (36y)" → Inspect 6-Axis Gap Radar & target scheme',
        expectedResultZh: '即時對比現有保額同建議目標差幾多（港幣列明，一目了然）',
        expectedResultEn: 'Displays exact HKD shortfall across Life, Medical, CI, and Retirement',
        targetStage: 'stage1',
        targetSubTab: 'profile',
        spotlightSelector: '[data-testid="stage1-scheme-benchmarks"]',
      },
      {
        id: 'ch2-s2',
        code: '2.2',
        startSec: 24,
        endSec: 30,
        formattedStart: '00:24',
        uiControlZh: '拉落「見客筆記」寫低客想要嘅病房級別同預算 → 撳「儲存筆記」',
        uiControlEn: 'Type ward preference & HK$48k budget in Client Notes → Click "Save Notes"',
        expectedResultZh: '自動記低更新時間並跟實呢位客，下次打開即刻睇返',
        expectedResultEn: 'Saves timestamped meeting notes directly to Daniel’s CRM record',
        targetStage: 'stage1',
        targetSubTab: 'profile',
        spotlightSelector: '[data-testid="consultant-client-notes-card"]',
      },
      {
        id: 'ch2-s3',
        code: '2.3',
        startSec: 30,
        endSec: 36,
        formattedStart: '00:30',
        uiControlZh: '喺「跟進待辦事項」輸入「星期二發手機版建議書」→ 撳「新增」或匯出日曆 (.ics)',
        uiControlEn: 'Type "Send 14-day QR microsite on Tue" in Follow-Up Tasks → Click Add',
        expectedResultZh: '即時排入待辦清單，仲可以一鍵加落手機日曆提醒自己',
        expectedResultEn: 'Appends actionable follow-up item and syncs to Stage 1B CRM alerts',
        targetStage: 'stage1',
        targetSubTab: 'profile',
        spotlightSelector: '[data-testid="client-followup-tasks-section"]',
      },
    ],
    actionStepsZh: [
      '打開「1A. 客戶資料與保障缺口」，睇返呢位客嘅收入、年齡同各項保障夠唔夠。',
      '點選右邊常見家庭方案，即時比較加保前後補返幾多缺口，亦可整理「現有保單一覽表」。',
      '喺「見客筆記」寫低傾過嘅重點，撳「儲存筆記」。',
      '喺「跟進待辦事項」加返下一步行動，或匯出 .ics 日曆提醒檔。',
    ],
    actionStepsEn: [
      'Open "1A. Profile & 6-Axis Gap Radar" to inspect income, age, and 6-dimension shortfall ratios.',
      'Click target scheme benchmark cards to compare pre- vs. post-proposal coverage.',
      'Type meeting takeaways into the Consultant Client Notes box and click "Save Notes".',
      'Add a concrete next step in Follow-Up Tasks and verify it appears in the checklist.',
    ],
    cantoneseProTip:
      '見客頭 3 分鐘直接畀張保障缺口圖同「現有保單一覽表」個客睇，佢自己見到醫療或危疾差一截，好自然就會問你點樣補返齊！',
    proTipEn:
      'Efficiency Tip: Showing the visual 6-Axis Gap Radar in the first 3 minutes turns passive prospects into engaged buyers.',
    keyOutcomeZh: '慳返 43 分鐘手計 · 見客重點同待辦唔怕漏',
    keyOutcomeEn: 'Saves 43m FNA math · Zero lost meeting notes',
    targetStage: 'stage1',
    targetSubTab: 'profile',
  },
  {
    id: 'ch3',
    stepNumber: '03',
    stepBadgeZh: '第 03 / 08 步',
    stepBadgeEn: 'STEP 03 / 08',
    audienceGroup: 'PREP_CRM',
    startSec: 36,
    endSec: 54,
    formattedStart: '00:36',
    durationSec: 18,
    titleZh: '第 01B 步：客戶跟進名單排序 ＋ 秒查保單編號 (77419)',
    titleEn: 'Stage 01B: Sort Client List by Stage/Date & Search Policy 77419',
    traditionalBottleneckZh: '常見情況：手頭幾十個客靠自己記或者翻睇 WhatsApp，好易漏咗跟進批緊核保嘅客',
    traditionalBottleneckEn: 'Old Bottleneck: Scrolling endless WhatsApp threads and missing hot underwriting follow-ups',
    traditionalMinutes: 35,
    optimizedMinutes: 1,
    timeComparisonZh: '35 分鐘摷對話紀錄 → 3 秒搵齊進度',
    timeComparisonEn: '35 min chat digging → 3 sec triage',
    cantoneseVoiceScript:
      '跟住撳右上角去「1B. 客戶跟進名單」！只要撳一下「按跟進階段排序」，批緊核保同傾緊建議書嘅客即刻排最頂，唔怕漏追；再撳「按最後聯絡日」，就睇到邊位舊客最耐冇聯絡。如果個客突然問單，喺右邊搜尋欄打「77419」，一秒就搵返張保單同財務分析紀錄出嚟！',
    summaryZh:
      '示範點樣用「跟進階段」同「最後聯絡日」排好每日跟進次序，並喺搜尋欄輸入 77419 即刻搵出對應保單。',
    summaryEn:
      'Zoomed-in demonstration of clicking Stage and Last-Contacted sort controls to reorder leads live, then typing 77419 to filter instantly.',
    subSteps: [
      {
        id: 'ch3-s1',
        code: '3.1',
        startSec: 36,
        endSec: 42,
        formattedStart: '00:36',
        uiControlZh: '撳分頁「1B. 客戶跟進名單」→ 撳排序掣「跟進階段（越近簽單排先）」',
        uiControlEn: 'Click tab "1B. CRM Stage Funnel" → Click "Sort by Stage (Closest to Close)"',
        expectedResultZh: '「核保中／已發建議書」嘅客自動排上第一行，方便朝早優先跟進',
        expectedResultEn: 'Reorders pipeline so Underwriting & Proposal-Sent hot deals jump to top',
        targetStage: 'stage1',
        targetSubTab: 'crm',
        spotlightSelector: '[data-testid="crm-sort-stage-btn"]',
      },
      {
        id: 'ch3-s2',
        code: '3.2',
        startSec: 42,
        endSec: 48,
        formattedStart: '00:42',
        uiControlZh: '撳「最後聯絡日（最耐未聯絡排先）」切換次序',
        uiControlEn: 'Click "Last Contacted (Oldest First)" sort toggle button',
        expectedResultZh: '最耐冇搵過嘅舊客排到最前，食完晏可以逐個問候跟進',
        expectedResultEn: 'Surfaces dormant leads needing immediate follow-up outreach',
        targetStage: 'stage1',
        targetSubTab: 'crm',
        spotlightSelector: '[data-testid="crm-sort-last-contact-btn"]',
      },
      {
        id: 'ch3-s3',
        code: '3.3',
        startSec: 48,
        endSec: 54,
        formattedStart: '00:48',
        uiControlZh: '喺搜尋欄輸入保單編號「77419」睇即時結果',
        uiControlEn: 'Type Policy ID "77419" into CRM search input',
        expectedResultZh: '即刻搵出 HK-POL-2025-77419 個案，可以直接打開 FNA 或去簽單頁面',
        expectedResultEn: 'Filters straight to policy HK-POL-2025-77419 with 1-click FNA & STP actions',
        targetStage: 'stage1',
        targetSubTab: 'crm',
        spotlightSelector: '[data-testid="crm-policy-name-search-input"]',
      },
    ],
    actionStepsZh: [
      '喺第 01 步右上角撳「1B. 客戶跟進名單與財務分析」。',
      '撳「跟進階段」排序，睇返邊幾個客正處於核保或傾緊建議書。',
      '再撳「最後聯絡日」，搵返一排冇聯絡嘅熟客做保單檢視。',
      '喺搜尋欄打「77419」或客名，直接打開該客嘅 FNA 或投保進度。',
    ],
    actionStepsEn: [
      'Click the "1B. CRM Stage Funnel, GL30 FNA & OCR" tab at the top right of Stage 01.',
      'Click the "Stage" sort pill to float Underwriting and Proposal-Sent clients to row #1.',
      'Click "Last Contacted" to flip between oldest-contacted dormant leads and recent activity.',
      'Type "77419" in the search box, then test the row action buttons ("GL30 FNA" / "Launch STP").',
    ],
    cantoneseProTip:
      '每日朝早返工先撳「跟進階段」清晒核保補件，下晝再撳「最後聯絡日」搵舊客飲茶做年檢，成單節奏好順！',
    proTipEn:
      'Efficiency Tip: Clear "Sort by Stage" underwriting items at 9:30 AM, then switch to "Last Contacted" after lunch to warm up dormant leads.',
    keyOutcomeZh: '每日慳 35 分鐘搵客 · 熱客舊客都跟得足',
    keyOutcomeEn: 'Saves 35m/day · Zero dropped hot leads',
    targetStage: 'stage1',
    targetSubTab: 'crm',
  },
  {
    id: 'ch4',
    stepNumber: '04',
    stepBadgeZh: '第 04 / 08 步',
    stepBadgeEn: 'STEP 04 / 08',
    audienceGroup: 'COMPARE_ACTUARIAL',
    startSec: 54,
    endSec: 72,
    formattedStart: '00:54',
    durationSec: 18,
    titleZh: '第 02A 步：跨公司三款計劃比較、季度優惠倒數與分紅測試 (85% 壓測)',
    titleEn: 'Stage 02A: 3-Plan Side-by-Side Comparison, Promos & 85% Dividend Test',
    traditionalBottleneckZh: '常見情況：客想睇三間公司儲蓄或危疾對比，要連開幾個網逐份打價再自己抄落 Excel',
    traditionalBottleneckEn: 'Old Bottleneck: Logging into 5–6 insurer portals and manually typing IRR tables into Excel',
    traditionalMinutes: 60,
    optimizedMinutes: 1.5,
    timeComparisonZh: '60 分鐘跨網抄數 → 90 秒並排比較出埋 PDF',
    timeComparisonEn: '60 min portal entry → 90 sec matrix + stress test',
    cantoneseVoiceScript:
      '入到第 02A 步「跨公司產品比較」，90 秒就砌好三間保險公司對照表！上面仲有齊各間公司今季保費回贈同預繳高息截止倒數，自己睇陣時亦會顯示私人佣金同 MDRT 進度（一開見客模式即刻自動收埋）！拉落三方案比較表，撳一下「90% 輕度」再撳「85% 壓測」，就算非保證紅利打折，保證現金價值依然一蚊都唔少，個客睇見自然放心好多！',
    summaryZh:
      '示範點樣篩選跨公司產品、查看本季保費回贈倒數、並排對比紅藍黃三款計劃回報，以及撳 85% 壓測睇清穩陣底線。',
    summaryEn:
      'Full close-up demonstration of filtering plan categories, inspecting the Red/Blue/Yellow 3-plan IRR table, and clicking 90% -> 85% dividend stress buttons.',
    subSteps: [
      {
        id: 'ch4-s1',
        code: '4.1',
        startSec: 54,
        endSec: 60,
        formattedStart: '00:54',
        uiControlZh: '打開「02A. 跨公司產品比較」→ 揀「分紅儲蓄」類別、睇本季回贈優惠及設定供款期',
        uiControlEn: 'Open Stage 02A → Click "Savings" category filter & set Sum Assured / Term',
        expectedResultZh: '由全港 46 間保險公司產品庫篩出合適計劃，同時睇清今季優惠仲剩幾多日',
        expectedResultEn: 'Filters 298+ plans across 46 HK insurers with live GL28 cap validation',
        targetStage: 'stage2',
        targetSubTab: 'market',
        spotlightSelector: '[data-testid="market-locked-plan-strip"]',
      },
      {
        id: 'ch4-s2',
        code: '4.2',
        startSec: 60,
        endSec: 66,
        formattedStart: '01:00',
        uiControlZh: '拉落「紅、藍、黃三方案並排比較表」對比第 10／20／30 年現金價值',
        uiControlEn: 'Scroll into Red / Blue / Yellow 3-Plan Side-by-Side Comparison Matrix',
        expectedResultZh: '三間公司嘅總保費、保證現金、預期總回報同回本年期同場排齊',
        expectedResultEn: 'Aligns Guaranteed Cash Value, Total Projected IRR & Breakeven Year across 3 insurers',
        targetStage: 'stage2',
        targetSubTab: 'market',
        spotlightSelector: '[data-testid="three-plan-comparison-table"]',
      },
      {
        id: 'ch4-s3',
        code: '4.3',
        startSec: 66,
        endSec: 72,
        formattedStart: '01:06',
        uiControlZh: '撳分紅測試掣「90% 輕度」→ 再撳「85% 壓測」睇數字即時變化',
        uiControlEn: 'Click GN16 Dividend Stress buttons "90% Mild" → "85% Stress"',
        expectedResultZh: '非保證紅利即時按 85% 重新計算，而保證現金價值維持 100% 不變',
        expectedResultEn: 'Dynamically recalculates non-guaranteed projections while Guaranteed CV stays 100%',
        targetStage: 'stage2',
        targetSubTab: 'market',
        spotlightSelector: '[data-testid="matrix-stress-btn-85"]',
      },
    ],
    actionStepsZh: [
      '進入左邊「02. 產品比較與條款查詢」，預設打開「2A. 跨公司產品比較」。',
      '揀「分紅儲蓄／危疾／自願醫保」，將最多 3 款計劃加入紅、藍、黃比較格（見客前可順手開「見客保密模式」收起佣金）。',
      '拉落「三方案並排比較表」，搵到右上角分紅實現率測試按鈕。',
      '試吓撳「100% 基準 → 90% 輕度 → 85% 壓測」，再匯出 PDF 或直接分享畀客！',
    ],
    actionStepsEn: [
      'Navigate to Stage 02 -> "2A. Whole-Market Comparator (298 Plans)".',
      'Filter by Savings / CI / VHIS and assign any 3 plans into the Red, Blue, and Yellow slots.',
      'Scroll down to the 3-Plan Side-by-Side Matrix and locate the GN16 Dividend Stress bar.',
      'Click "100% Base -> 90% Mild -> 85% Stress" and watch projected values & IRR recalculate live.',
    ],
    cantoneseProTip:
      '見穩陣型客戶時，主動撳「85% 壓測」畀佢睇邊隻計劃保證成份較高，再提埋今季首年回贈幾時截止，好快就拍板！',
    proTipEn:
      'Efficiency Tip: Clicking "85% Stress" live in front of conservative clients proves downside protection and closes deals in Meeting #1.',
    keyOutcomeZh: '慳返近一個鐘抄數 · 現場釋除分紅疑慮',
    keyOutcomeEn: 'Saves 58m Excel work · Closes in 1st meeting',
    targetStage: 'stage2',
    targetSubTab: 'market',
  },
  {
    id: 'ch5',
    stepNumber: '05',
    stepBadgeZh: '第 05 / 08 步',
    stepBadgeEn: 'STEP 05 / 08',
    audienceGroup: 'COMPARE_ACTUARIAL',
    startSec: 72,
    endSec: 90,
    formattedStart: '01:12',
    durationSec: 18,
    titleZh: '第 02C & 02B 步：退休每年提款、HIBOR 保費融資試算與查條款',
    titleEn: 'Stage 02C & 02B: 5/6/7% Retirement Payout, HIBOR Financing & Clauses',
    traditionalBottleneckZh: '常見情況：客問「每年拎 7% 幾時拎完」或者「早期危疾條款點寫」，要返公司摷幾百頁條款 PDF 先答到',
    traditionalBottleneckEn: 'Old Bottleneck: Delaying deals for days to check 200-page policy PDFs or run HIBOR spreadsheets',
    traditionalMinutes: 40,
    optimizedMinutes: 1,
    timeComparisonZh: '唔使等聽日先覆 → 1 分鐘即場計清答實',
    timeComparisonEn: 'Next-day callback → 60 sec live answer',
    cantoneseVoiceScript:
      '如果個客想計退休長糧或者做保費融資，撳右上角去「2C. 退休提領與保費融資」！一撳每年提款「6%」或者「7%」，下面即刻計出每年有幾多現金袋落袋、去到 85 歲張單仲剩幾多錢；再撳保費融資揀埋貸款成數，連 HIBOR 加息之後仲有冇息差賺都清清楚楚；想去「2B. 條款查詢」對照危疾定義同頁數亦係一秒搞掂！',
    summaryZh:
      '示範喺 2C 試算每年 5%／6%／7% 退休提款、測試 HIBOR 保費融資息差，以及喺 2B 快速查閱保單條款原文。',
    summaryEn:
      'Zoomed-in capture of toggling 5%/6%/7% withdrawal rates in 2C, selecting 80% LTV in the HIBOR Financing Matrix, and auditing clauses in 2B.',
    subSteps: [
      {
        id: 'ch5-s1',
        code: '5.1',
        startSec: 72,
        endSec: 78,
        formattedStart: '01:12',
        uiControlZh: '切換去「2C. 退休提領與保費融資」→ 試撳「每年 5% → 6% → 7%」提款率',
        uiControlEn: 'Open tab "2C. Actuarial Lab" → Click "5% → 6% → 7%" annual withdrawal buttons',
        expectedResultZh: '即時列出每年可拎幾多退休金，同埋各個歲數仲剩低幾多保單價值',
        expectedResultEn: 'Updates annual retirement cashflow payout and remaining policy equity live',
        targetStage: 'stage2',
        targetSubTab: 'actuarial_lab',
        spotlightSelector: '[data-testid="withdrawal-simulator-panel"]',
      },
      {
        id: 'ch5-s2',
        code: '5.2',
        startSec: 78,
        endSec: 84,
        formattedStart: '01:18',
        uiControlZh: '撳「02. 保費融資利率測試」→ 揀銀行貸款比例「80% LTV」',
        uiControlEn: 'Click "02. HIBOR Financing Sensitivity Matrix" → Select "80% LTV"',
        expectedResultZh: '即時睇清唔同 HIBOR 拆息同分紅表現下嘅實際淨回報率',
        expectedResultEn: 'Highlights net leveraged ROE % across HIBOR rates vs. dividend fulfillment',
        targetStage: 'stage2',
        targetSubTab: 'actuarial_lab',
        spotlightSelector: '[data-testid="pf-sensitivity-matrix-panel"]',
      },
      {
        id: 'ch5-s3',
        code: '5.3',
        startSec: 84,
        endSec: 90,
        formattedStart: '01:24',
        uiControlZh: '撳分頁「2B. 保單條款比較與查詢」→ 點選常見問題即睇條款原文',
        uiControlEn: 'Switch to "2B. Clause Audit AI" → Click quick clause comparison preset',
        expectedResultZh: '並列各公司條款重點、章節頁數同淺白廣東話解釋',
        expectedResultEn: 'Displays 5-axis clause scores, exact policy provision citations & plain summary',
        targetStage: 'stage2',
        targetSubTab: 'clauses',
        spotlightSelector: '[data-testid="copilot-audit-active-plan-btn"]',
      },
    ],
    actionStepsZh: [
      '喺第 02 步右上角撳「2C. 退休提領、保費融資與傳承」。',
      '試吓切換每年 5%／6%／7% 提款率同開始歲數，睇吓退保價值變化。',
      '開「02. 保費融資」揀 70%–85% 貸款比例，測試 HIBOR 加息時嘅淨回報。',
      '再撳「2B. 保單條款比較與查詢」，即場核對等候期或危疾定義原文。',
    ],
    actionStepsEn: [
      'Click "2C. 567 Withdrawal, Financing & Legacy" at the top right of Stage 02.',
      'Toggle 5% / 6% / 7% withdrawal rates and start ages to inspect remaining policy equity.',
      'Click sub-tab "02. HIBOR Financing Matrix" and test 70%–85% LTV ratios against borrowing costs.',
      'Open "2B. Clause Audit AI" to run grounded 5-axis policy definition comparisons with page citations.',
    ],
    cantoneseProTip:
      '傾退休儲蓄單時，直接騷畀個客睇「65 歲起每年拎幾多萬使、到 85 歲仲留到幾多錢畀仔女」，好過齋講百分比好多！',
    proTipEn:
      'Efficiency Tip: Answering withdrawal sustainability and HIBOR spread stress tests live eliminates HNW callback delays.',
    keyOutcomeZh: '唔使返公司慢慢查 · 即場答齊退休提款同條款細節',
    keyOutcomeEn: 'Zero callback delay · Instant HNW credibility',
    targetStage: 'stage2',
    targetSubTab: 'actuarial_lab',
  },
  {
    id: 'ch6',
    stepNumber: '06',
    stepBadgeZh: '第 06 / 08 步',
    stepBadgeEn: 'STEP 06 / 08',
    audienceGroup: 'MEDICAL_PROPOSAL',
    startSec: 90,
    endSec: 108,
    formattedStart: '01:30',
    durationSec: 18,
    titleZh: '第 03A & 03B 步：現場配搭醫療附約、查養和免找數與私院手術費',
    titleEn: 'Stage 03A & 03B: Rider Bundling, HK Sanatorium Cashless & Surgeon Fees',
    traditionalBottleneckZh: '常見情況：見客臨時想改墊底費或轉人民幣要返公司重打；客問「去養和做手術夠唔夠賠」又冇實數參考',
    traditionalBottleneckEn: 'Old Bottleneck: Manual RMB FX math and vague answers about private hospital out-of-pocket bills',
    traditionalMinutes: 30,
    optimizedMinutes: 1,
    timeComparisonZh: '30 分鐘查表計匯率 → 1 分鐘即場配搭睇實數',
    timeComparisonEn: '30 min manual lookup → 60 sec simulation',
    cantoneseVoiceScript:
      '跟住去第 03 步！喺「3A. 保費配搭與理賠預估」同個客一齊剔選高端醫療或者危疾附約，右邊港幣同人民幣年保費、扣稅後實付幾錢即刻同步計好！再撳去「3B. 私家醫院免找數與手術費」，揀「養和醫院・半私家房」，即刻睇到入院免按金預批安排，仲有齊香港私院常見手術醫生費中位數畀客參考！',
    summaryZh:
      '示範喺 3A 剔選附約即時計算港幣／人民幣淨保費，並喺 3B 查看養和醫院免找數（LOG）安排同私家醫院手術費參考。',
    summaryEn:
      'Close-up walkthrough of toggling modular riders in 3A to watch HKD/RMB totals update, then verifying HK Sanatorium LOG & P50/P90 surgeon fees in 3B.',
    subSteps: [
      {
        id: 'ch6-s1',
        code: '6.1',
        startSec: 90,
        endSec: 96,
        formattedStart: '01:30',
        uiControlZh: '打開「3A. 保費配搭與理賠預估」→ 剔選想加嘅醫療或危疾附約',
        uiControlEn: 'Open Stage 03A Cart → Toggle Modular Medical / Critical Illness Rider card',
        expectedResultZh: '即時重算港幣（HKD）同人民幣（RMB）扣稅及折扣後實付保費',
        expectedResultEn: 'Instantly recalculates bundled HKD & RMB net annual premiums across Stages 01–05',
        targetStage: 'stage3',
        targetSubTab: 'cart',
        spotlightSelector: '[data-testid="plan-matched-rider-list"]',
      },
      {
        id: 'ch6-s2',
        code: '6.2',
        startSec: 96,
        endSec: 102,
        formattedStart: '01:36',
        uiControlZh: '切換去「3B. 私家醫院免找數與手術費」→ 揀「養和醫院」同病房級別',
        uiControlEn: 'Switch to "3B. Private Hospital LOG" → Select HK Sanatorium & Ward matcher',
        expectedResultZh: '清楚顯示免按金入院預批（LOG）資格、預計自付 $0 同所需文件',
        expectedResultEn: 'Displays Cashless LOG pre-approval pass status and HK$0 out-of-pocket estimate',
        targetStage: 'stage3',
        targetSubTab: 'hospital',
        spotlightSelector: '[data-testid="intel-tab-hospitals"]',
      },
      {
        id: 'ch6-s3',
        code: '6.3',
        startSec: 102,
        endSec: 108,
        formattedStart: '01:42',
        uiControlZh: '撳入「外科手術收費參考」同「扣稅計算」分頁睇真實收費水平',
        uiControlEn: 'Click "Surgeon Fee P50/P90 Benchmarks" & "QDAP/VHIS Tax Center" sub-tabs',
        expectedResultZh: '列出香港私院常見手術實際收費範圍同每年最高可慳幾多薪俸稅',
        expectedResultEn: 'Shows official HK private hospital surgical fee percentiles and annual tax savings',
        targetStage: 'stage3',
        targetSubTab: 'hospital',
        spotlightSelector: '[data-testid="intel-tab-surgeon-sla"]',
      },
    ],
    actionStepsZh: [
      '進入左邊「03. 附約配搭與私院收費」，喺 3A 試吓加減醫療或危疾附約睇保費變化。',
      '切換年繳／月繳或點選「私院通波仔／癌症標靶藥」睇吓保單幫手賠到幾多。',
      '撳右上角「3B. 私家醫院免找數與手術費」，揀養和、港怡或聖保祿睇入院按金要求。',
      '打開「公司醫保接駁自願醫保」分頁，同打工仔客計清點樣用墊底費平買高端醫療。',
    ],
    actionStepsEn: [
      'Open Stage 03 -> "3A. Dual-Currency Cart" and click any rider card to see live HKD/RMB repricing.',
      'Toggle claim stress scenarios (e.g. Oncology / Cardiac) to compare existing vs. new bundle payouts.',
      'Switch to "3B. Hospital LOG" and select HK Sanatorium or Gleneagles to check cashless pre-approval.',
      'Click the Dual-Claim and Surgeon P50/P90 sub-tabs to prove why full-cover VHIS beats group medical alone.',
    ],
    cantoneseProTip:
      '好多中環客覺得有公司醫保就夠，開 3B 畀佢睇吓私院做手術實際收幾錢同公司醫保上限差幾遠，好快就明點解要加份有墊底費嘅自願醫保！',
    proTipEn:
      'Efficiency Tip: Use the Group Medical + Top-Up VHIS Dual-Claim tab to upsell corporate executives with deductibles in under 60 seconds.',
    keyOutcomeZh: '慳返半個鐘查收費 · 現場改單即刻有數睇',
    keyOutcomeEn: 'Saves 29m FX/fee lookup · Boosts VHIS upsells',
    targetStage: 'stage3',
    targetSubTab: 'hospital',
  },
  {
    id: 'ch7',
    stepNumber: '07',
    stepBadgeZh: '第 07 / 08 步',
    stepBadgeEn: 'STEP 07 / 08',
    audienceGroup: 'MEDICAL_PROPOSAL',
    startSec: 108,
    endSec: 126,
    formattedStart: '01:48',
    durationSec: 18,
    titleZh: '第 04A & 04C 步：匯出 5 頁重點簡報 PDF ＋ 手機一鍵分享去 WhatsApp',
    titleEn: 'Stage 04A & 04C: Export 5-Page PDF & One-Tap Share to WhatsApp',
    traditionalBottleneckZh: '常見情況：見完客夜晚仲要花成個鐘執 PowerPoint，WhatsApp 發完份大 PDF 過去又唔知個客有冇開嚟睇',
    traditionalBottleneckEn: 'Old Bottleneck: Spending 45m late at night formatting slides and sending blind PDF attachments',
    traditionalMinutes: 45,
    optimizedMinutes: 0.5,
    timeComparisonZh: '45 分鐘捱夜執簡報 → 30 秒出齊 PDF 同手機連結',
    timeComparisonEn: '45 min slide formatting → 30 sec PDF + QR',
    cantoneseVoiceScript:
      '傾好方案入第 04 步，唔使自己再執 PowerPoint！喺「4A. 5 頁建議書簡報」，頭先揀好嘅缺口同保費已經自動排好 5 頁重點，撳一下就下載到整齊 PDF！再去右上角「4C. 手機版建議書 (QR)」，揀「14 日有效期」，直接撳「一鍵分享至 WhatsApp／WeChat」傳畀個客，佢一打開手機睇過第幾年回報，你即刻收到通知！',
    summaryZh:
      '示範預覽同匯出 5 頁建議書重點 PDF，並喺 4C 產生手機版建議書 QR 連結、一鍵分享去 WhatsApp 及查看客戶閱讀通知。',
    summaryEn:
      'Zoomed-in walkthrough of flipping through the 5-slide visual deck, exporting the PDF summary, and publishing a 14-day QR client microsite.',
    subSteps: [
      {
        id: 'ch7-s1',
        code: '7.1',
        startSec: 108,
        endSec: 114,
        formattedStart: '01:48',
        uiControlZh: '打開「4A. 5 頁建議書簡報」→ 點選第 1–5 頁預覽並撳「匯出重點摘要 PDF」',
        uiControlEn: 'Open Stage 04A → Flip Slide 1–3 cards & click "Generate PDF Executive Summary"',
        expectedResultZh: '自動整合客戶保障缺口同保費數據，即刻下載排版整齊嘅中英對照 PDF',
        expectedResultEn: 'Auto-compiles client radar & cart numbers into an instant boardroom-ready PDF',
        targetStage: 'stage4',
        targetSubTab: 'deck',
        spotlightSelector: '[data-testid="generate-pdf-executive-summary-btn"]',
      },
      {
        id: 'ch7-s2',
        code: '7.2',
        startSec: 114,
        endSec: 120,
        formattedStart: '01:54',
        uiControlZh: '切換去「4C. 手機版建議書 (QR)」→ 揀「14 日」有效期並產生專屬 QR Code',
        uiControlEn: 'Switch to "4C. QR Client Microsite" → Click "14d" expiry button & inspect QR',
        expectedResultZh: '即時產生可以用電話相機直接掃開嘅手機版建議書 QR Code',
        expectedResultEn: 'Generates a scannable proposal QR code locked with FX rate stamp & 14-day expiry',
        targetStage: 'stage4',
        targetSubTab: 'microsite',
        spotlightSelector: '[data-testid="stage4c-qr-generator-card"]',
      },
      {
        id: 'ch7-s3',
        code: '7.3',
        startSec: 120,
        endSec: 126,
        formattedStart: '02:00',
        uiControlZh: '撳「一鍵分享至 WhatsApp／WeChat」或「複製建議書連結」傳畀客戶',
        uiControlEn: 'Click "Share via WhatsApp / Mobile" → Preview mobile client interactive view',
        expectedResultZh: '手機直接彈出 WhatsApp／WeChat 分享選單；客戶打開睇過或揀簽單時間即刻同步通知你',
        expectedResultEn: 'Shares compliant invite link; client views & signing intent sync straight back to CRM',
        targetStage: 'stage4',
        targetSubTab: 'microsite',
        spotlightSelector: '[data-testid="stage4c-publish-copy-btn"]',
      },
    ],
    actionStepsZh: [
      '進入左邊「04. 建議書簡報與手機分享」，喺 4A 預覽自動排好嘅 5 頁重點簡報。',
      '撳「匯出重點摘要 PDF」下載清潔易睇嘅方案摘要。',
      '切換去右上角「4C. 手機版建議書 (QR)」，揀 7 日／14 日／30 日有效期限。',
      '撳「一鍵分享建議書」直接發去客戶 WhatsApp，下面仲可以預覽客戶手機打開嘅畫面！',
    ],
    actionStepsEn: [
      'Open Stage 04 -> "4A. 5-Slide Visual Case Deck" and click slides 1–5 (or Fullscreen Presentation Mode).',
      'Click "Generate PDF Executive Summary" to download the formatted client handout immediately.',
      'Switch to "4C. QR Client Microsite" and choose a 7 / 14 / 30-day link validity window.',
      'Click "Publish & Copy Link" and scroll down to test the live client feedback & read-receipt form.',
    ],
    cantoneseProTip:
      '將手機版建議書條 Link 直接 Share 入個客兩公婆個 WhatsApp 群組，佢哋搭車滑兩滑就睇明重點，仲可以直接喺上面揀埋幾時約簽單！',
    proTipEn:
      'Efficiency Tip: Sharing the mobile QR microsite lets spouses review and confirm preferred signing slots asynchronously.',
    keyOutcomeZh: '唔使捱夜執簡報 · 手機一撳直發 WhatsApp 兼知客睇咗未',
    keyOutcomeEn: 'Zero manual PPT work · Live client read tracking',
    targetStage: 'stage4',
    targetSubTab: 'microsite',
  },
  {
    id: 'ch8',
    stepNumber: '08',
    stepBadgeZh: '第 08 / 08 步',
    stepBadgeEn: 'STEP 08 / 08',
    audienceGroup: 'CLOSING_SERVICING',
    startSec: 126,
    endSec: 144,
    formattedStart: '02:06',
    durationSec: 18,
    titleZh: '第 05 & 06 步：簽單合規核對、電子簽名、匯出日曆提醒與實用計算機',
    titleEn: 'Stage 05 & 06: Compliance Check, e-Signature, Calendar Alerts & Calculators',
    traditionalBottleneckZh: '常見情況：簽單時漏剔聲明要再約個客補簽；簽完單又怕忙起上嚟唔記得 21 日冷靜期、續保同客戶生日',
    traditionalBottleneckEn: 'Old Bottleneck: Rejected applications from missed GL30 checkboxes and manual renewal/CPD tracking',
    traditionalMinutes: 30,
    optimizedMinutes: 3,
    timeComparisonZh: '成套流程由 3 個鐘 → 12 分鐘順暢搞掂！',
    timeComparisonEn: '3 hr manual workflow → 12 min compliant close!',
    cantoneseVoiceScript:
      '最後一步去第 05A「投保確認與電子簽名」！系統自動幫你檢查齊財務負擔能力同三份重要聲明，唔怕漏剔被打回頭；客戶直接喺畫面簽個名就出齊投保確認 PDF！簽完再去 5C 售後跟進，一鍵匯出 .ics 日曆提醒檔入落自己部 iPhone，連 21 日冷靜期、續保前 30 日同客戶生日都自動彈通知提醒你，再加埋第 06 步 32 個扣稅同退休計算機，做單自然事半功倍！',
    summaryZh:
      '示範喺 05A 核對合規清單並完成電子簽名，喺 5C 一鍵匯出續保／冷靜期／生日日曆提醒 (.ics) 與年檢報告，以及使用第 06 步 32 款計算機。',
    summaryEn:
      'Close-up capture of checking the GL30 Affordability Gauge, drawing a live canvas e-signature to generate an STP policy pack, plus 5C servicing & Stage 06 32 tools.',
    subSteps: [
      {
        id: 'ch8-s1',
        code: '8.1',
        startSec: 126,
        endSec: 132,
        formattedStart: '02:06',
        uiControlZh: '打開「5A. 投保確認與電子簽名」→ 核對保費負擔比例同剔齊三項確認聲明',
        uiControlEn: 'Open Stage 05A STP → Verify GL30 Affordability Gauge & 3 statutory checkboxes',
        expectedResultZh: '自動檢查有冇漏填項目（綠燈代表齊全），唔怕漏簽又要麻煩個客補簽',
        expectedResultEn: 'Confirms GL30 liquid-asset ratio passes in green and prevents missing-checkbox rejections',
        targetStage: 'stage5',
        targetSubTab: 'stp',
        spotlightSelector: '[data-testid="gl30-affordability-gauge-card"]',
      },
      {
        id: 'ch8-s2',
        code: '8.2',
        startSec: 132,
        endSec: 138,
        formattedStart: '02:12',
        uiControlZh: '喺「電子簽名板」簽名 → 撳「產生投保確認 PDF 包」',
        uiControlEn: 'Draw signature on Client e-Signature Pad → Click "Generate Paperless STP PDF Pack"',
        expectedResultZh: '即時下載印有參考編號嘅投保確認 PDF，客戶狀態亦自動更新為「核保中」',
        expectedResultEn: 'Generates reference-stamped STP PDF pack and advances client stage to Underwriting',
        targetStage: 'stage5',
        targetSubTab: 'stp',
        spotlightSelector: '[data-testid="stp-signature-canvas"]',
      },
      {
        id: 'ch8-s3',
        code: '8.3',
        startSec: 138,
        endSec: 144,
        formattedStart: '02:18',
        uiControlZh: '切換「5C. 續保、理賠與日曆提醒 (.ics)」及左邊「06. 32 款實用計算機」',
        uiControlEn: 'Inspect "5C. 30-Day Renewal Hub" & Stage 06 "32 Pro Calculators & Practice ROI"',
        expectedResultZh: '一鍵將 21 日冷靜期、續保前 30 日及生日提醒加入手機日曆，隨時用齊 32 款計數工具',
        expectedResultEn: 'Tracks 30-day renewal alerts & active claims alongside 32 HNW tax, trust & pre-UW engines',
        targetStage: 'stage6',
        spotlightSelector: '[data-testid="unified-32-tools-hub"]',
      },
    ],
    actionStepsZh: [
      '進入左邊「05. 投保確認與售後跟進」，確認負擔能力、健康申報同在港簽署項目全部綠燈。',
      '剔齊「利益說明書、財務需要分析、投保申請確認」三項聲明。',
      '喺簽名格用滑鼠或手指簽名，撳「產生投保確認 PDF 包」完成存檔。',
      '去「5C 續保與理賠」一鍵下載 .ics 日曆提醒檔入手機，或去「06. 計算機工具箱」試用 32 款計數工具！',
    ],
    actionStepsEn: [
      'Open Stage 05A and verify green status across GL30 Affordability, Health Triage, and MCV checks.',
      'Confirm all 3 statutory documents (GL28 BI, GL30 FNA, Insurer e-App) are checked.',
      'Sign inside the interactive e-Signature canvas and click "Generate STP Policy PDF Pack".',
      'Explore 5C Renewals / 5D 15h CPD or click Stage 06 in the sidebar to run any of the 32 specialized calculators.',
    ],
    cantoneseProTip:
      '每張單慳返兩個幾鐘打價執表時間，用嚟見多兩個客或者幫舊客做保單年檢，唔使日日捱夜都一樣跑到 MDRT！',
    proTipEn:
      'Efficiency Tip: Reinvesting 2.5+ hours saved per case into two extra client reviews per day compounds into 3x annual MDRT production.',
    keyOutcomeZh: '一次過齊料免補簽 · 自動日曆提醒跟足售後',
    keyOutcomeEn: 'Zero STP rejections · Frees 93% admin time',
    targetStage: 'stage5',
    targetSubTab: 'stp',
  },
];

export function resolveActiveTutorialChapter(
  currentTimeSec: number,
  chapters: TutorialChapterItem[] = CANTONESE_TUTORIAL_CHAPTERS
): TutorialChapterItem {
  if (chapters.length === 0) {
    throw new Error('Tutorial chapters list must not be empty');
  }
  const safeTime = Number.isFinite(currentTimeSec) ? Math.max(0, currentTimeSec) : 0;
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const isLast = i === chapters.length - 1;
    if (safeTime >= ch.startSec && (safeTime < ch.endSec || isLast)) {
      return ch;
    }
  }
  return chapters[chapters.length - 1];
}

export function resolveActiveTutorialSubStep(
  currentTimeSec: number,
  chapter: TutorialChapterItem
): TutorialSubStepItem {
  const safeTime = Number.isFinite(currentTimeSec) ? Math.max(0, currentTimeSec) : 0;
  const list = chapter.subSteps;
  for (let i = 0; i < list.length; i++) {
    const sub = list[i];
    const isLast = i === list.length - 1;
    if (safeTime >= sub.startSec && (safeTime < sub.endSec || isLast)) {
      return sub;
    }
  }
  return list[0];
}

export function getAllTutorialSubSteps(
  chapters: TutorialChapterItem[] = CANTONESE_TUTORIAL_CHAPTERS
): TutorialSubStepItem[] {
  return chapters.flatMap((ch) => ch.subSteps);
}

export function filterTutorialChapters(
  chapters: TutorialChapterItem[],
  audienceFilter: TutorialAudienceFilter,
  searchQuery = ''
): TutorialChapterItem[] {
  const byGroup =
    audienceFilter === 'ALL'
      ? chapters
      : chapters.filter((c) => c.audienceGroup === audienceFilter);

  const q = searchQuery.trim().toLowerCase();
  if (!q) return byGroup;

  return byGroup.filter((c) => {
    const subStepText = c.subSteps
      .map(
        (s) =>
          `${s.code} ${s.uiControlZh} ${s.uiControlEn} ${s.expectedResultZh} ${s.expectedResultEn}`
      )
      .join(' ');
    const haystack = [
      c.stepNumber,
      c.titleZh,
      c.titleEn,
      c.traditionalBottleneckZh,
      c.traditionalBottleneckEn,
      c.timeComparisonZh,
      c.timeComparisonEn,
      c.cantoneseVoiceScript,
      c.summaryZh,
      c.summaryEn,
      c.cantoneseProTip,
      subStepText,
      ...c.actionStepsZh,
      ...c.actionStepsEn,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function computeTutorialProgressPercent(
  currentTimeSec: number,
  totalDurationSec: number = CANTONESE_TUTORIAL_TOTAL_DURATION_SEC
): number {
  if (!Number.isFinite(totalDurationSec) || totalDurationSec <= 0) return 0;
  if (!Number.isFinite(currentTimeSec) || currentTimeSec <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, Number(((currentTimeSec / totalDurationSec) * 100).toFixed(1)))
  );
}
