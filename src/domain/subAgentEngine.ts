import { toSimplifiedChinese } from './i18n';
import {
  AppLanguage,
  ClientLead,
  DualSubAgentResponse,
  InsurancePlan,
  IntermediaryProfile,
  IntermediaryRole,
  PlanCategory,
} from './types';

function tr(lang: AppLanguage, en: string, zhHk: string): string {
  if (lang === 'en') return en;
  if (lang === 'zh-CN') return toSimplifiedChinese(zhHk);
  return zhHk;
}

/**
 * Generates deterministic, domain-grounded Dual Sub-Agent output:
 * 1) Sub-Agent A: HK Insurance Agent Efficiency & Closing Architect
 * 2) Sub-Agent B: HK / MCV Client Follow-Up Question & Skepticism Simulator
 */
export function buildDeterministicDualSubAgentReport(params: {
  lead: ClientLead;
  plan: InsurancePlan;
  intermediary: IntermediaryProfile;
  language: AppLanguage;
  customFocusPrompt?: string;
}): DualSubAgentResponse {
  const { lead, plan, intermediary, language, customFocusPrompt } = params;

  const missingFna = plan.category !== PlanCategory.VHIS && !lead.fnaRecord;
  const missingHkid = !lead.kycCheck.hkidVerified;
  const missingMcvSlip = lead.residency === 'MCV' && !lead.kycCheck.mcvEntrySlipVerified;
  const isNonAppointed =
    intermediary.role === IntermediaryRole.TIED_AGENT &&
    !intermediary.appointedInsurers.includes('ALL') &&
    !intermediary.appointedInsurers.includes(plan.insurerCode);

  const readinessPoints =
    100 -
    (missingFna ? 35 : 0) -
    (missingHkid ? 25 : 0) -
    (missingMcvSlip ? 25 : 0) -
    (isNonAppointed ? 15 : 0);

  const workflowSteps: DualSubAgentResponse['agentSubAgent']['workflowSteps'] = [];

  if (missingFna) {
    workflowSteps.push({
      id: 'step-fna',
      title: tr(
        language,
        'Complete Digital HKIA GL30 FNA & Risk Profile Now',
        '即時完成保監局 GL30 財務需要分析及風險問卷'
      ),
      rationale: tr(
        language,
        `${lead.fullNameEn} cannot legally sign ${plan.nameEn} without a signed GL30 FNA record. Pre-filling disposable surplus saves 18 mins of paper rework.`,
        `${lead.fullNameZh} 投保長期保單（${plan.nameZh}）前必須簽署 GL30 財務分析，預填收支可節省約 18 分鐘紙本重填時間。`
      ),
      estimatedMinutesSaved: 18,
      targetAction: 'OPEN_FNA',
    });
  }

  if (missingHkid || missingMcvSlip) {
    workflowSteps.push({
      id: 'step-ocr',
      title: tr(
        language,
        lead.residency === 'MCV'
          ? 'Scan MCV HKSAR Entry Landing Slip & ID via Camera OCR'
          : 'Scan HKID Smart Card via Vision OCR Checksum Gate',
        lead.residency === 'MCV'
          ? '以鏡頭 OCR 掃描內地訪客香港入境標籤及證件'
          : '以鏡頭 OCR 掃描香港身份證並自動驗證 Mod-11 校驗碼'
      ),
      rationale: tr(
        language,
        lead.residency === 'MCV'
          ? 'HKIA onshore underwriting requires verified HKSAR arrival date & permitted-stay tag before e-signature.'
          : 'Auto-populates fullNameEn, Chinese name, DOB, and HKID checksum in 5 seconds without manual typos.',
        lead.residency === 'MCV'
          ? '保監局規定內地訪客必須在港簽署保單，掃描入境標籤可即時鎖定在港合規紀錄。'
          : '5 秒自動填入中英文姓名、出生日期及香港身份證號碼，杜絕人手輸入錯誤。'
      ),
      estimatedMinutesSaved: 12,
      targetAction: 'OPEN_OCR',
    });
  }

  if (isNonAppointed) {
    workflowSteps.push({
      id: 'step-safemode',
      title: tr(
        language,
        'Turn On External Client Safe Mode for Competitor Benchmarking',
        '開啟「見客匿名合規鎖」安全比對同業方案'
      ),
      rationale: tr(
        language,
        `As a Tied Agent (${intermediary.iaLicenseNo}), mask ${plan.insurerNameEn} as a neutral Market Peer during tablet comparisons before pivoting to your appointed principal.`,
        `作為專屬代理人（${intermediary.iaLicenseNo}），向客戶展示非委任保司（${plan.insurerNameZh}）比較時應先匿名化處理以符合 GL28 規範。`
      ),
      estimatedMinutesSaved: 10,
      targetAction: 'ENABLE_SAFE_MODE',
    });
  }

  workflowSteps.push({
    id: 'step-hospital-log',
    title: tr(
      language,
      'Verify Private Hospital Cashless LOG & Deductible Options',
      '核對全港 13 間私院免找數按金及自付費選項'
    ),
    rationale: tr(
      language,
      'Show concrete HK$30,000–$70,000 admission deposit waivers at HKSH, Gleneagles, or Matilda to anchor medical value immediately.',
      '即時展示養和、港怡或明德醫院高達 HK$30,000–$70,000 入院按金豁免對比，大幅提升醫療方案說服力。'
    ),
    estimatedMinutesSaved: 9,
    targetAction: 'OPEN_HOSPITAL_LOG',
  });

  workflowSteps.push({
    id: 'step-stp',
    title: tr(
      language,
      'Launch Pre-Validated e-Policy STP & Bilingual PDF Pack',
      '一鍵啟動直通投保確認及雙語建議書電子簽署'
    ),
    rationale: tr(
      language,
      `Auto-generates HKIA-capped illustration (${plan.insurerCode}) with client e-signature and instant bilingual PDF download.`,
      `自動套用保監局演示利率上限，生成連客戶電子簽名嘅正式雙語建議書 PDF 供即時下載留存。`
    ),
    estimatedMinutesSaved: 25,
    targetAction: 'LAUNCH_STP',
  });

  const focusNoteEn = customFocusPrompt?.trim()
    ? ` Focus area addressed: "${customFocusPrompt.trim()}".`
    : '';
  const focusNoteZh = customFocusPrompt?.trim()
    ? ` 已針對重點情境分析：「${customFocusPrompt.trim()}」。`
    : '';

  const predictedQuestions: DualSubAgentResponse['clientSubAgent']['predictedQuestions'] = [
    {
      id: 'q-breakeven',
      question: tr(
        language,
        plan.category === PlanCategory.VHIS
          ? `If I am admitted to Hong Kong Sanatorium or Gleneagles with ${plan.nameEn}, do I really pay HK$0 deposit on admission, or are there surgeon fee shortfalls?`
          : `You mentioned ${plan.nameEn} breaks even around Year 6–7, but what happens if ${plan.insurerNameEn}'s non-guaranteed dividend fulfillment ratio drops below 90%?`,
        plan.category === PlanCategory.VHIS
          ? `如果我買咗「${plan.nameZh}」入養和或者港怡醫院做手術，係咪真係 HK$0 按金免找數出院？外科醫生費會唔會有差額要自己補？`
          : `你話「${plan.nameZh}」預計第 6–7 年回本，但如果「${plan.insurerNameZh}」將來非保證分紅實現率跌穿 90%，我幾時先真正保證回本？`
      ),
      concernCategory: tr(
        language,
        plan.category === PlanCategory.VHIS ? 'Cashless LOG & Reimbursement Shortfall' : 'Guaranteed vs. Non-Guaranteed Return',
        plan.category === PlanCategory.VHIS ? '私院免找數及賠償差額疑慮' : '保證回本與分紅實現率風險'
      ),
      compliantAnswer: tr(
        language,
        plan.category === PlanCategory.VHIS
          ? `With pre-approved Cashless LOG submitted 24–48h before elective admission, the hospital waives the HK$40,000–$60,000 cash deposit for covered ward tiers. Full-cover VHIS Flexi plans reimburse eligible surgeon/anaesthetist fees in full up to the annual limit (subject to your chosen HK$0/$20k/$50k deductible and staying within your plan's designated ward class).`
          : `Under HKIA Charter of Honesty, Total Illustrated Breakeven (~Yr 6–8) includes non-guaranteed bonuses, whereas pure Guaranteed Cash Value breakeven occurs around Year 18–21. ${plan.insurerNameEn}'s historical GN16 fulfillment ratio is ${plan.fulfillmentRatio ?? 98}%, and from Policy Year 15 you can exercise the Dividend Lock-In option to convert market gains into guaranteed cash.`,
        plan.category === PlanCategory.VHIS
          ? `只要於入院前 24–48 小時完成免找數預先批核（LOG），醫院會豁免 HK$40,000–$60,000 現金按金。全數賠償型自願醫保靈活計劃不設手術細項上限，惟須留意所選自付費（$0／$2萬／$5萬）及入住病房級別須與投保計劃匹配，避免病房升級共同保險差額。`
          : `根據保監局披露原則，第 6–8 年屬「預期總回本」（含非保證紅利），而純「保證現金價值回本」一般約在第 18–21 年。${plan.insurerNameZh} 過往 GN16 分紅實現率約為 ${plan.fulfillmentRatio ?? 98}%，且第 15 個保單週年日起可行使「紅利鎖定選項」將非保證紅利轉為保證現金。`
      ),
      citationOrRule: 'HKIA GL28 / GN16 & Cap. 633 LOG Schedule',
    },
    {
      id: 'q-currency-mcv',
      question: tr(
        language,
        lead.residency === 'MCV'
          ? `As a Mainland visitor, how do I pay renewal premiums in Years 2–5 without flying back to Hong Kong every year, and can I switch policy currency to RMB or GBP later?`
          : `If my family relocates or interest rates shift, can I switch ${plan.nameEn}'s currency without medical re-underwriting or losing accumulated bonuses?`,
        lead.residency === 'MCV'
          ? `作為內地訪港客戶，第 2 至第 5 年續期保費點樣交最合規方便？將來仔女去英國或留喺內地，保單可唔可以轉做英鎊或人民幣？`
          : `如果將來息口變化或者屋企人移居海外，「${plan.nameZh}」轉保單貨幣洗唔洗重新驗身核保？會唔會影響已滾存紅利？`
      ),
      concernCategory: tr(
        language,
        lead.residency === 'MCV' ? 'Cross-Border Renewal & FX Mobility' : 'Multi-Currency & Mobility Flexibility',
        lead.residency === 'MCV' ? '跨境續保繳費與多元貨幣配置' : '多元貨幣轉換與海外規劃'
      ),
      compliantAnswer: tr(
        language,
        lead.residency === 'MCV'
          ? `Initial policy signing must take place onshore in Hong Kong with your Immigration Landing Slip verified. For Years 2+, opening a Hong Kong personal bank account (eDDA / FPS / cheque) during your HK visit enables automatic renewal deductions from anywhere. Multi-currency savings plans allow currency switching from Policy Year 3 with zero medical re-underwriting.`
          : `Multi-currency plans support switching across major currencies (USD, HKD, RMB, GBP, CAD, AUD, SGD) starting from Policy Anniversary 3 with zero medical re-underwriting, and Policy Split from Year 5 lets you allocate separate currency policies per child.`,
        lead.residency === 'MCV'
          ? `首期簽署必須親身在香港境內完成並核實入境標籤；訪港期間同步開立香港個人銀行戶口並綁定自動轉賬（eDDA），往後續期保費即可自動扣賬而無須每年來港。多元貨幣計劃由第 3 個保單週年日起可免核保自由轉換人民幣、英鎊或美元。`
          : `多元貨幣儲蓄計劃由第 3 個保單週年日起支援轉換多種主流貨幣（美元、港元、人民幣、英鎊、加元、澳元等），完全無須重新健康核保；第 5 年起更可分拆保單按家庭成員配置不同貨幣。`
      ),
      citationOrRule: 'HKIA MCV Onshore Guideline & Policy Currency Clause',
    },
    {
      id: 'q-tax-liquidity',
      question: tr(
        language,
        `Can I deduct this premium under Hong Kong Salaries Tax, and what is the penalty if I need emergency cash in Year 3?`,
        `呢份保單保費可唔可以扣香港薪俸稅？如果我第 3 年急需現金周轉退保或者提取，會蝕幾多？`
      ),
      concernCategory: tr(language, 'IRD Tax Relief & Early Surrender Liquidity', '稅務扣減資格與早期退保流動性'),
      compliantAnswer: tr(
        language,
        plan.taxDeductibleCapHkd
          ? `Yes! ${plan.nameEn} qualifies under IRD Cap. 112 up to HK$${plan.taxDeductibleCapHkd.toLocaleString()} per taxpayer/insured per year (up to 17% marginal tax savings). For emergency liquidity, avoid early surrender in Years 1–3 where cash value is below premiums paid.`
          : `Standard participating savings & CI plans are not Salaries Tax deductible (unlike VHIS HK$8,000 or QDAP HK$60,000), though death/surrender proceeds are tax-free in HK. Early surrender in Year 3 incurs ~20%–50% principal loss—keep 6 months emergency cash in liquid bank deposits (per GL30 FNA).`,
        plan.taxDeductibleCapHkd
          ? `可以！「${plan.nameZh}」符合香港稅務條例扣稅資格，每年最高可扣減 HK$${plan.taxDeductibleCapHkd.toLocaleString()}（以 17% 邊際稅率計可節省可觀稅款）。至於流動性，首 3 年退保價值低於已繳保費，應保留充裕應急現金。`
          : `一般儲蓄分紅及危疾保單保費不可扣減薪俸稅（自願醫保每年可扣 $8,000、合資格延期年金可扣 $60,000），但香港保單分紅及理賠金均免徵資本增值稅。第 3 年提早退保會招致約 20%–50% 本金損失，故 GL30 財務分析會確保您預留至少 6 個月流動應急資金。`
      ),
      citationOrRule: 'IRD Cap. 112 s.26ZZD & HKIA GL30 Affordability Gate',
    },
    {
      id: 'q-peer-comparison',
      question: tr(
        language,
        `Why should I pick ${plan.insurerNameEn} (${plan.nameEn}) over AXA, Sun Life, BOC Life, or AIA equivalents at the same budget?`,
        `同樣預算下，點解我應該揀「${plan.insurerNameZh} — ${plan.nameZh}」，而唔係比較埋安盛、永明、中銀人壽或者友邦嘅同級計劃？`
      ),
      concernCategory: tr(language, 'Cross-Market Competitive Positioning', '跨保司同級方案橫向比較'),
      compliantAnswer: tr(
        language,
        `Each HK tier-1 carrier optimizes a distinct lever: AXA excels in Dual-Account lock-in & 1,300% CI multi-claim, Sun Life leads in ESG par funds & 10-currency SunGift legacy splitting, BOC Life offers market-leading RMB/USD guaranteed floors, and ${plan.insurerNameEn} stands out on: ${plan.keyHighlightsEn[0]}. Let's review our side-by-side 10/20/30-year table.`,
        `各大保司定位鮮明：安盛強於雙帳戶鎖定及高達 1,300% 危疾多重保、永明主打 ESG 長線分紅及 10 種貨幣星河傳承、中銀人壽具備離岸人民幣／美元高保證底墊，而「${plan.insurerNameZh}」核心優勢在於：${plan.keyHighlightsZh[0]}。我哋可以用系統即時匯出 10／20／30 年並排比較表逐項核對。`
      ),
      citationOrRule: 'HKIA GL28 Fair Comparative Illustration Standard',
    },
  ];

  const agentAppImprovements: DualSubAgentResponse['agentSubAgent']['appImprovements'] = [
    {
      id: 'imp-agent-1',
      sourceSubAgent: 'AGENT_EFFICIENCY',
      moduleTarget: '02. Lead CRM & GL30 FNA',
      title: tr(
        language,
        'One-Tap Policy Anniversary & Dividend Lock-In Alert Queue',
        '保單週年紅利鎖定及續保自動提醒隊列'
      ),
      problemSolved: tr(
        language,
        'Agents manually track Year-3 currency switch and Year-15 terminal bonus lock-in milestones across spreadsheets.',
        '顧問目前需人手記錄客戶第 3 年貨幣轉換及第 15 年終期紅利鎖定時機，容易錯失二次加保與轉介紹機會。'
      ),
      impactMetric: tr(
        language,
        '+28% repeat upsell conversion & ~4.5 hrs/week saved per MDRT advisor',
        '提升 +28% 舊客加保轉化率，每位顧問每週節省約 4.5 小時跟進時間'
      ),
    },
    {
      id: 'imp-agent-2',
      sourceSubAgent: 'AGENT_EFFICIENCY',
      moduleTarget: '01. Market Plans & STP',
      title: tr(
        language,
        'Corporate Group Medical -> VHIS High-Deductible Top-Up Bridge',
        '公司團體醫保銜接高自付費 VHIS 差額計算器'
      ),
      problemSolved: tr(
        language,
        'Executives hesitate to buy personal VHIS because they already have employer medical; showing HK$20k/$50k deductible top-up closes the retirement medical gap at ~50% lower premium.',
        '企業高管常因已有公司醫保而抗拒個人醫保；自動計算 $2萬／$5萬自付費銜接方案可以半價鎖定退休後終身續保權。'
      ),
      impactMetric: tr(
        language,
        'Cuts VHIS objection handling time by 60% during executive reviews',
        '縮短 60% 企業客戶醫保異議處理時間'
      ),
    },
    {
      id: 'imp-agent-3',
      sourceSubAgent: 'AGENT_EFFICIENCY',
      moduleTarget: '04. Auto-Policy STP',
      title: tr(
        language,
        'Pre-Underwriting Medical Loading & Sub-Standard Triage Checklist',
        '投保前常見體況（三高／結節）預審分流清單'
      ),
      problemSolved: tr(
        language,
        'Submitting borderline health cases to strict carriers causes 3-week underwriting delays when simplified-issue carriers (e.g. Chubb / FWD / BOC Life tracks) would accept faster.',
        '將輕微體況個案誤交嚴格核保保司會拖慢 3 週審批；預審分流可即時配對簡化核保通道。'
      ),
      impactMetric: tr(
        language,
        '-40% underwriting counter-offer turnaround delay',
        '減少 40% 核保補交醫療報告來回時間'
      ),
    },
  ];

  const clientAppImprovements: DualSubAgentResponse['clientSubAgent']['appImprovements'] = [
    {
      id: 'imp-client-1',
      sourceSubAgent: 'CLIENT_EXPERIENCE',
      moduleTarget: '01. Market Plans',
      title: tr(
        language,
        'Interactive Dividend Stress-Test Slider (100% vs 85% Fulfillment)',
        '非保證分紅實現率壓力測試滑桿（100% 對比 85% 情境）'
      ),
      problemSolved: tr(
        language,
        'Clients distrust static 6.5% IRR tables; letting them drag fulfillment down to 85% and still see positive long-term yield builds instant trust.',
        '客戶普遍對單一 6.5% 預期回報存疑；讓客戶親手拉動 85% 實現率壓力測試能大幅建立透明度與信任感。'
      ),
      impactMetric: tr(
        language,
        'Eliminates #1 Hong Kong participating savings trust objection',
        '直接化解香港分紅儲蓄險頭號信任疑慮'
      ),
    },
    {
      id: 'imp-client-2',
      sourceSubAgent: 'CLIENT_EXPERIENCE',
      moduleTarget: '06. Market Intel & LOG',
      title: tr(
        language,
        'Private Hospital Procedure Package + Ward Shortfall Visualizer',
        '私院常見手術套餐收費與病房級別賠償對照表'
      ),
      problemSolved: tr(
        language,
        'Clients want to know before admission whether colonoscopy, cataract, or cardiac stent at HKSH/CUHKMC leaves $0 out-of-pocket.',
        '客戶最關心照腸胃鏡、白內障或通波仔入住養和／中大醫院時是否真正零自付額。'
      ),
      impactMetric: tr(
        language,
        'Increases VHIS Flexi upgrade selection over basic Standard plans by +35%',
        '提升 +35% 客戶由標準醫保升級至全數賠償靈活計劃意願'
      ),
    },
    {
      id: 'imp-client-3',
      sourceSubAgent: 'CLIENT_EXPERIENCE',
      moduleTarget: '05. Client Portal Summary',
      title: tr(
        language,
        'One-Page Trilingual (EN / 繁中 / 简中) Family Protection Map PDF',
        '一頁式三語（英／繁／簡）家庭保障缺口全景圖匯出'
      ),
      problemSolved: tr(
        language,
        'Spouses and Mainland family decision-makers struggle to read 40-page actuarial illustrations; a 1-page trilingual summary speeds up household sign-off.',
        '配偶或內地家人難以閱讀 40 頁精算建議書；一頁式三語摘要能加速家庭共同決策。'
      ),
      impactMetric: tr(
        language,
        'Shortens household decision cycle from 14 days to 4 days',
        '將家庭保單決策週期由 14 日縮短至 4 日'
      ),
    },
  ];

  const readyPitchScript = tr(
    language,
    `Hi ${lead.fullNameEn}, based on your age (${lead.age}) and ${lead.residency === 'MCV' ? 'cross-border USD/RMB' : 'Hong Kong'} goals, I benchmarked ${plan.insurerNameEn} — ${plan.nameEn} against AXA, Sun Life, and BOC Life. Key edge: ${plan.keyHighlightsEn[0]}. I've separated Guaranteed vs. Total Breakeven under HKIA GL28 caps and verified Private Hospital Cashless LOG waivers—shall we take 5 minutes to review the 10/20/30-year table together?`,
    `${lead.fullNameZh}您好！根據您 ${lead.age} 歲嘅規劃目標，我已將「${plan.insurerNameZh} — ${plan.nameZh}」與安盛、永明及中銀人壽同級方案完成精算比對。此計劃最大亮點係：${plan.keyHighlightsZh[0]}。我同時按保監局 GL28 上限清晰拆開「保證回本」與「預期總回本」，並核對埋全港 13 間私院免找數按金安排，方便約 5 分鐘同您一齊睇睇份 10／20／30 年比較表嗎？`
  );

  return {
    agentSubAgent: {
      personaTitle: tr(
        language,
        'Sub-Agent 01 · MDRT Insurance Advisor Efficiency Architect',
        '子代理 01 · 百萬圓桌保險顧問效率優化專家'
      ),
      readinessScoreLabel: `${Math.max(20, readinessPoints)}% STP Ready`,
      executiveBrief: tr(
        language,
        `Audited ${lead.fullNameEn}'s pipeline stage (${lead.stage}) for ${plan.insurerNameEn} ${plan.nameEn}.${focusNoteEn} Identified ${workflowSteps.length} high-leverage workflow actions saving ~${workflowSteps.reduce((acc, s) => acc + s.estimatedMinutesSaved, 0)} minutes on compliance & closing.`,
        `已審視客戶 ${lead.fullNameZh}（進度：${lead.stage}）投保「${plan.insurerNameZh} ${plan.nameZh}」之全流程。${focusNoteZh}共識別 ${workflowSteps.length} 個提速步驟，預計每單可節省約 ${workflowSteps.reduce((acc, s) => acc + s.estimatedMinutesSaved, 0)} 分鐘合規與行政時間。`
      ),
      workflowSteps,
      readyPitchScript,
      appImprovements: agentAppImprovements,
    },
    clientSubAgent: {
      personaTitle: tr(
        language,
        `Sub-Agent 02 · Prospective Client Simulator (${lead.fullNameEn}, Age ${lead.age}, ${lead.residency === 'MCV' ? 'MCV' : 'HK Resident'})`,
        `子代理 02 · 準客戶追問及心理模擬器（${lead.fullNameZh}，${lead.age}歲，${lead.residency === 'MCV' ? '內地訪客 MCV' : '香港居民'}）`
      ),
      psychologySummary: tr(
        language,
        `Simulating a ${lead.age}-year-old ${lead.residency === 'MCV' ? 'Mainland cross-border visitor' : 'Hong Kong resident'} evaluating ${plan.nameEn}.${focusNoteEn} Primary skepticism centers on non-guaranteed dividend realism, Year 1–5 liquidity lock-up, private hospital LOG shortfalls, and how this plan compares against AXA, Sun Life, and BOC Life.`,
        `正模擬 ${lead.age} 歲${lead.residency === 'MCV' ? '內地訪港客戶（MCV）' : '香港本地客戶'}審視「${plan.nameZh}」時之真實心理。${focusNoteZh}核心疑慮聚焦於：非保證分紅真實性、首 5 年資金鎖定期、私家醫院免找數有否隱藏自付差額，以及與安盛、永明、中銀人壽同級產品之優劣。`
      ),
      predictedQuestions,
      appImprovements: clientAppImprovements,
    },
    sourceMode: 'deterministic-hk-subagents',
    generatedAtIso: new Date().toISOString(),
  };
}
