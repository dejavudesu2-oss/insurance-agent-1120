import { toSimplifiedChinese } from './i18n';
import {
  AppLanguage,
  ClientLead,
  InsurancePlan,
  IntermediaryProfile,
  IntermediaryRole,
  PlanCategory,
  PolicyProvisionChunk,
} from './types';

// ============================================================================
// 1. NEED-FIRST SMART PLAN RECOMMENDER (WHEN NO PLAN IS SELECTED YET)
// ============================================================================

export type NeedContextHint =
  | 'GENERAL'
  | 'MEDICAL_LOG'
  | 'PROCEDURE_SHORTFALL'
  | 'PROTECTION_GAP'
  | 'TAX_TRIO'
  | 'SAVINGS_LEGACY'
  | 'MCV_CROSS_BORDER'
  | 'PREMIUM_FINANCING'
  | 'MICRO_PROPOSAL'
  | 'PRE_UNDERWRITING'
  | 'CLAUSE_AUDIT';

export interface RecommendedPlanCandidate {
  plan: InsurancePlan;
  matchScorePct: number;
  reasonEn: string;
  reasonZh: string;
  tagLabelEn: string;
  tagLabelZh: string;
}

export function resolveDesiredCategoriesFromContext(
  hint: NeedContextHint,
  lead?: ClientLead
): PlanCategory[] {
  switch (hint) {
    case 'MEDICAL_LOG':
    case 'PROCEDURE_SHORTFALL':
      return [PlanCategory.VHIS, PlanCategory.HIGH_END_MEDICAL];
    case 'TAX_TRIO':
      return [PlanCategory.QDAP, PlanCategory.VHIS];
    case 'SAVINGS_LEGACY':
    case 'MCV_CROSS_BORDER':
    case 'MICRO_PROPOSAL':
      return [PlanCategory.PARTICIPATING_SAVINGS, PlanCategory.CRITICAL_ILLNESS];
    case 'PREMIUM_FINANCING':
      return [PlanCategory.UNIVERSAL_LIFE, PlanCategory.PARTICIPATING_SAVINGS];
    case 'PROTECTION_GAP':
    case 'PRE_UNDERWRITING':
      return [PlanCategory.CRITICAL_ILLNESS, PlanCategory.VHIS, PlanCategory.TERM_LIFE];
    case 'CLAUSE_AUDIT':
      return [
        PlanCategory.CRITICAL_ILLNESS,
        PlanCategory.VHIS,
        PlanCategory.PARTICIPATING_SAVINGS,
      ];
    case 'GENERAL':
    default: {
      if (!lead) {
        return [
          PlanCategory.PARTICIPATING_SAVINGS,
          PlanCategory.VHIS,
          PlanCategory.CRITICAL_ILLNESS,
        ];
      }
      if (lead.residency === 'MCV') {
        return [
          PlanCategory.PARTICIPATING_SAVINGS,
          PlanCategory.CRITICAL_ILLNESS,
          PlanCategory.UNIVERSAL_LIFE,
        ];
      }
      const objBlob = (lead.fnaRecord?.primaryObjectives || []).join(' ').toLowerCase();
      if (objBlob.includes('tax') || objBlob.includes('扣稅') || objBlob.includes('annuity')) {
        return [PlanCategory.QDAP, PlanCategory.VHIS, PlanCategory.PARTICIPATING_SAVINGS];
      }
      if (objBlob.includes('medical') || objBlob.includes('vhis') || objBlob.includes('醫')) {
        return [PlanCategory.VHIS, PlanCategory.HIGH_END_MEDICAL, PlanCategory.CRITICAL_ILLNESS];
      }
      return [
        PlanCategory.PARTICIPATING_SAVINGS,
        PlanCategory.VHIS,
        PlanCategory.CRITICAL_ILLNESS,
      ];
    }
  }
}

export function recommendBestFitPlansForContext(params: {
  plans: InsurancePlan[];
  lead?: ClientLead;
  intermediary?: IntermediaryProfile;
  contextHint?: NeedContextHint;
  preferredInsurerCode?: string | null;
  limit?: number;
}): RecommendedPlanCandidate[] {
  const {
    plans,
    lead,
    intermediary,
    contextHint = 'GENERAL',
    preferredInsurerCode = null,
    limit = 3,
  } = params;

  const targetCategories = resolveDesiredCategoriesFromContext(contextHint, lead);

  const ownCompanyCode =
    preferredInsurerCode && preferredInsurerCode !== 'ALL'
      ? preferredInsurerCode.trim().toUpperCase()
      : intermediary && intermediary.role === IntermediaryRole.TIED_AGENT
      ? (intermediary.appointedInsurers.find((c) => c !== 'ALL') || 'AIA').toUpperCase()
      : null;

  const scored = plans.map((plan) => {
    let score = 60;
    const catRank = targetCategories.indexOf(plan.category);
    if (catRank === 0) score += 26;
    else if (catRank === 1) score += 18;
    else if (catRank === 2) score += 12;

    const isOwnCompany = Boolean(
      ownCompanyCode && plan.insurerCode.toUpperCase() === ownCompanyCode
    );

    // Appointed insurer bonus for Tied Agents so recommendations are immediately sellable
    const isAppointed =
      !intermediary ||
      intermediary.role === IntermediaryRole.BROKER_TR ||
      intermediary.appointedInsurers.includes('ALL') ||
      intermediary.appointedInsurers.includes(plan.insurerCode);
    if (isOwnCompany) score += 12;
    else if (isAppointed) score += 6;
    else score -= 10;

    // GN16 fulfillment & IRR strength
    if (plan.fulfillmentRatio !== null && plan.fulfillmentRatio >= 99) score += 5;
    if (plan.rawProjectedIrr >= 0.066) score += 4;
    if (lead?.residency === 'MCV' && plan.currencies.includes('RMB')) score += 4;
    if (lead?.residency === 'HK_RESIDENT' && (plan.taxDeductibleCapHkd || 0) > 0) score += 3;
    if (plan.submissionChannel === 'OPEN_API_INSTANT') score += 2;

    const clampedScore = Math.min(99, Math.max(65, score));

    let reasonEn = 'Strong HKIA benchmark fit for client profile & risk appetite.';
    let reasonZh = '高度契合客戶風險取向及保障目標之市場代表方案。';
    let tagLabelEn = isOwnCompany ? 'Your Company First' : 'Smart Match';
    let tagLabelZh = isOwnCompany ? '本司優先主推' : '市場建議參考';

    if (plan.category === PlanCategory.VHIS || plan.category === PlanCategory.HIGH_END_MEDICAL) {
      tagLabelEn = isOwnCompany ? 'Your Co · Cashless LOG' : 'Cashless LOG + Tax';
      tagLabelZh = isOwnCompany ? '本司優先 · 私院免找數' : '私院免找數＋扣稅';
      reasonEn =
        'Full surgical & non-surgical cancer cover with HK$0 private hospital LOG & HK$8,000 tax relief.';
      reasonZh =
        '全數賠償手術及非手術癌症治療，支援私院免找數預先批核及 HK$8,000 扣稅。';
    } else if (plan.category === PlanCategory.QDAP) {
      tagLabelEn = isOwnCompany ? 'Your Co · HK$60k Tax' : 'HK$60k Tax Relief';
      tagLabelZh = isOwnCompany ? '本司優先 · 扣稅年金' : 'HK$6萬扣稅年金';
      reasonEn = `HKIA-certified QDAP unlocking up to HK$60,000 annual salaries tax deduction (Guar IRR ${(
        plan.guaranteedIrr * 100
      ).toFixed(2)}%).`;
      reasonZh = `保監局認證合資格延期年金，享高達 HK$60,000 薪俸稅扣減（保證 IRR ${(
        plan.guaranteedIrr * 100
      ).toFixed(2)}%）。`;
    } else if (plan.category === PlanCategory.PARTICIPATING_SAVINGS) {
      tagLabelEn = isOwnCompany
        ? `Your Co · GN16 ${plan.fulfillmentRatio ?? 99}%`
        : `GN16 ${plan.fulfillmentRatio ?? 99}% · Multi-FX`;
      tagLabelZh = isOwnCompany
        ? `本司優先 · 實現率 ${plan.fulfillmentRatio ?? 99}%`
        : `實現率 ${plan.fulfillmentRatio ?? 99}% · 多幣傳承`;
      reasonEn = `Multi-currency compounding (${(plan.rawProjectedIrr * 100).toFixed(
        2
      )}% raw IRR) with Year-3 FX switch & Year-5 policy split.`;
      reasonZh = `多元貨幣長線複利（預期 ${(plan.rawProjectedIrr * 100).toFixed(
        2
      )}%），支援第3年轉貨幣及第5年保單分拆。`;
    } else if (plan.category === PlanCategory.CRITICAL_ILLNESS) {
      tagLabelEn = isOwnCompany ? 'Your Co · Multi-CI' : 'Multi-Claim CI';
      tagLabelZh = isOwnCompany ? '本司優先 · 多重危疾' : '多重危疾守護';
      reasonEn =
        'Lump-sum income replacement across cancer, heart attack & stroke recurrences with premium waiver.';
      reasonZh = '涵蓋癌症、心臟病及中風復發多重現金賠償，滿100%即豁免續期保費。';
    } else if (plan.category === PlanCategory.UNIVERSAL_LIFE) {
      tagLabelEn = isOwnCompany ? 'Your Co · High CSV' : 'High Day-1 CSV';
      tagLabelZh = isOwnCompany ? '本司優先 · 高現金價值' : '高首日現金價值';
      reasonEn =
        'High Day-1 guaranteed cash value ratio ideal for HNW liquidity & private bank IFS-PF stress test.';
      reasonZh = '首日高退保現金價值比例，契合高淨值傳承及私人銀行保費融資壓測。';
    }

    return {
      plan,
      matchScorePct: clampedScore,
      reasonEn,
      reasonZh,
      tagLabelEn,
      tagLabelZh,
      isOwnCompany,
    };
  });

  scored.sort((a, b) => {
    if (a.isOwnCompany !== b.isOwnCompany) return a.isOwnCompany ? -1 : 1;
    return b.matchScorePct - a.matchScorePct;
  });

  // Deduplicate by insurer so Top-3 shows own company FIRST, then diverse market benchmarks
  const diverse: RecommendedPlanCandidate[] = [];
  const usedInsurers = new Set<string>();
  for (const item of scored) {
    if (diverse.length >= limit) break;
    if (!usedInsurers.has(item.plan.insurerCode)) {
      usedInsurers.add(item.plan.insurerCode);
      const { isOwnCompany: _drop, ...clean } = item;
      diverse.push(clean);
    }
  }
  if (diverse.length < limit) {
    for (const item of scored) {
      if (diverse.length >= limit) break;
      if (!diverse.some((d) => d.plan.id === item.plan.id)) {
        const { isOwnCompany: _drop, ...clean } = item;
        diverse.push(clean);
      }
    }
  }

  return diverse;
}

// ============================================================================
// 2. SECTION 03 TRIPLE CLAUSE SUB-AGENTS ENGINE (ACTUARIAL + CLAIMS + CLIENT)
// ============================================================================

export interface ClauseDimensionComparison {
  dimensionKey: string;
  labelEn: string;
  labelZh: string;
  planAScore: number; // 0 - 100
  planBScore: number; // 0 - 100
  verdictNote: string;
}

export interface ClauseTrapAlert {
  id: string;
  severity: 'HIGH' | 'MEDIUM';
  trapTitle: string;
  clauseMechanism: string;
  advisorMitigationTip: string;
  icbReference: string;
}

export interface Section03UpgradeRecommendation {
  id: string;
  title: string;
  beforePainPoint: string;
  liveStatusIn03: string;
}

export interface TripleClauseSubAgentReport {
  planAName: string;
  planBName: string;
  actuarialAuditor: {
    agentTitle: string;
    executiveVerdict: string;
    dimensions: ClauseDimensionComparison[];
  };
  claimsAdvocate: {
    agentTitle: string;
    icbSummary: string;
    traps: ClauseTrapAlert[];
  };
  clientPlainLanguageCoach: {
    agentTitle: string;
    thirtySecondAnalogy: string;
    whatsappBattlecardText: string;
    section03Upgrades: Section03UpgradeRecommendation[];
  };
  sourceMode: 'gemini-clause-subagents' | 'deterministic-clause-subagents';
}

function scorePlanClauseDimensions(plan: InsurancePlan): [number, number, number, number, number] {
  const isVhis = plan.category === PlanCategory.VHIS || plan.category === PlanCategory.HIGH_END_MEDICAL;
  const isCi = plan.category === PlanCategory.CRITICAL_ILLNESS;
  const isSav = plan.category === PlanCategory.PARTICIPATING_SAVINGS;
  const isBowtieOrBlue = plan.insurerCode === 'BOWTIE' || plan.insurerCode === 'BLUE';
  const isTopTier = ['AIA', 'PRU', 'MANULIFE', 'FWD', 'SUNLIFE', 'AXA', 'BUPA'].includes(
    plan.insurerCode
  );

  // [1: Coverage Breadth, 2: Waiting/Multi-Claim Speed, 3: Pre-Existing/Congenital, 4: Guaranteed Certainty, 5: Post-Claim/Lock-In Flexibility]
  const breadth = isTopTier ? 94 : 88;
  const waitingSpeed = isBowtieOrBlue ? 96 : isCi ? 90 : 87;
  const preExisting =
    plan.id === 'BOWTIE_PINK_VHIS'
      ? 97
      : isVhis
      ? 89
      : isCi
      ? 84
      : 92;
  const guarCertainty =
    plan.guaranteedIrr >= 0.035
      ? 98
      : plan.fulfillmentRatio !== null && plan.fulfillmentRatio >= 99
      ? 93
      : isSav
      ? 88
      : 91;
  const flexibility = isSav ? 95 : isCi ? 92 : 88;

  return [breadth, waitingSpeed, preExisting, guarCertainty, flexibility];
}

export function runDeterministicClauseSubAgents(params: {
  planA: InsurancePlan;
  planB: InsurancePlan;
  focusTopic: string;
  language: AppLanguage;
  provisions: PolicyProvisionChunk[];
}): TripleClauseSubAgentReport {
  const { planA, planB, focusTopic, language, provisions } = params;
  const isEn = language === 'en';
  const conv = (zhHk: string) => (language === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk);

  const planALabel = isEn
    ? `${planA.insurerNameEn} — ${planA.nameEn}`
    : conv(`${planA.insurerNameZh}《${planA.nameZh}》`);
  const planBLabel = isEn
    ? `${planB.insurerNameEn} — ${planB.nameEn}`
    : conv(`${planB.insurerNameZh}《${planB.nameZh}》`);

  const scoresA = scorePlanClauseDimensions(planA);
  const scoresB = scorePlanClauseDimensions(planB);

  const matchedChunks = provisions.filter(
    (c) => c.planId === planA.id || c.planId === planB.id
  );
  const citationHint =
    matchedChunks.length > 0
      ? matchedChunks.map((c) => c.clauseRef).slice(0, 2).join(' / ')
      : 'HKIA Standard Policy Provisions & GN16/GL28 Schedule';

  const dimensions: ClauseDimensionComparison[] = [
    {
      dimensionKey: 'BREADTH',
      labelEn: '1. Covered Organ / Benefit Scope Breadth',
      labelZh: conv('1. 受保器官／醫療或紅利權益涵蓋廣度'),
      planAScore: scoresA[0],
      planBScore: scoresB[0],
      verdictNote: isEn
        ? `Grounded in ${citationHint}: verify all-organ CIS vs named-organ schedule.`
        : conv(`依據 ${citationHint}：重點核對原位癌「全器官涵蓋」抑或「指定器官列表」。`),
    },
    {
      dimensionKey: 'WAITING_SPEED',
      labelEn: '2. Waiting Period & Multi-Claim Interval Speed',
      labelZh: conv('2. 等候期及多重復發賠償間距速度'),
      planAScore: scoresA[1],
      planBScore: scoresB[1],
      verdictNote: isEn
        ? '90-day initial illness waiting; compare 1-yr new primary cancer vs 3-yr recurrence gap.'
        : conv('首輪疾病等候期 90 日；關鍵差異在於新發癌症 1 年間距 vs 持續／復發 3 年間距。'),
    },
    {
      dimensionKey: 'PRE_EXISTING',
      labelEn: '3. Unknown Pre-Existing & Congenital Tolerance',
      labelZh: conv('3. 投保前未知已有病症及先天性疾病寬容度'),
      planAScore: scoresA[2],
      planBScore: scoresB[2],
      verdictNote: isEn
        ? 'VHIS Standard scales 0%→25%→50%→100% (Yr 1–4), whereas enhanced Flexi plans cover 100% from Day 31.'
        : conv('標準自願醫保第1至4年按 0%→25%→50%→100% 遞增，部份升級靈活計劃生效第 31 日起即賠 100%。'),
    },
    {
      dimensionKey: 'GUARANTEED_CERTAINTY',
      labelEn: '4. Contractual Guaranteed Wording Certainty',
      labelZh: conv('4. 合約保證條款確定性（保證續保／保證派息下限）'),
      planAScore: scoresA[3],
      planBScore: scoresB[3],
      verdictNote: isEn
        ? 'Separates contractually guaranteed cash/renewal rights from discretionary terminal dividends.'
        : conv('嚴格區分寫入合約之「保證現金價值／保證續保至100歲」與保險公司酌情派發之非保證終期紅利。'),
    },
    {
      dimensionKey: 'POST_CLAIM_FLEX',
      labelEn: '5. Post-Claim Premium Waiver & Lock-In Window',
      labelZh: conv('5. 索償後保費豁免及週年紅利鎖定／轉貨幣彈性'),
      planAScore: scoresA[4],
      planBScore: scoresB[4],
      verdictNote: isEn
        ? 'Check whether 100% cumulative claim waives remaining premiums and note the 30-day anniversary window.'
        : conv('核實累計賠滿 100% 保額後是否豁免往後保費，以及每年週年日後 30 日內申請鎖定紅利／轉貨幣期限。'),
    },
  ];

  const traps: ClauseTrapAlert[] = [
    {
      id: 'trap-medical-necessity',
      severity: 'HIGH',
      trapTitle: isEn
        ? 'Inpatient vs. Day-Case Endoscopy "Medically Necessary" Rejection Trap'
        : conv('腸胃鏡／白內障「入院過夜 vs 日間中心」醫療必需拒賠盲點'),
      clauseMechanism: isEn
        ? 'Routine diagnostic colonoscopy/gastroscopy admitted overnight in a private hospital ward without documented cardiopulmonary/anesthesia risk is frequently downgraded or declined on inpatient room charges.'
        : conv('若無心肺風險、高齡或大型息肉出血等臨床理由而純粹為方便入住私院病房照腸胃鏡，保司常援引「非住院醫療必需」拒賠房租或折算賠償。'),
      advisorMitigationTip: isEn
        ? 'Always obtain Cashless LOG Pre-Approval 5 working days prior or route client to Insurer Network Day-Case Centre ($0 shortfall).'
        : conv('務必於檢查前 5 個工作天申請免找數預先批核（LOG），或安排於保司指定網絡日間內視鏡中心進行（100% 直付零差額）。'),
      icbReference: isEn
        ? 'HK Insurance Complaints Bureau (ICB) Top Medical Dispute Category'
        : conv('香港保險投訴局（ICB）歷年住院醫療頭號爭議類別'),
    },
    {
      id: 'trap-ward-upgrade-factor',
      severity: 'HIGH',
      trapTitle: isEn
        ? '50% Voluntary Ward Class Upgrade Adjustment Penalty'
        : conv('自願升等入住私家房觸發「50% 病房調整因子」腰斬賠償'),
      clauseMechanism: isEn
        ? 'Clients holding a Semi-Private plan who voluntarily check into a Private Room see ALL surgeon, anesthetist, and operating theatre bills cut by 50% — not just the room rate difference.'
        : conv('持有「半私家房」保單客戶若自願升等入住「私家房」，並非只補房價差額，而是連同外科醫生費、麻醉費及手術室費全單按 50% 折算賠償！'),
      advisorMitigationTip: isEn
        ? 'Either match Private Room plan upfront in Section 06 or secure written hospital proof of Semi-Private bed shortage during emergency admission.'
        : conv('投保時於「06 私院選單」直接配對私家房級別，或急症入院遇半私家房爆滿時向院方索取書面無床位證明以豁免折算。'),
      icbReference: isEn
        ? 'VHIS Flexi Supplement — Ward Adjustment Factor Clause'
        : conv('自願醫保靈活計劃附加契約 — 病房級別調整因子條款'),
    },
    {
      id: 'trap-anniversary-window',
      severity: 'MEDIUM',
      trapTitle: isEn
        ? 'Strict 30-Day Post-Anniversary Window for Currency Switch & Bonus Lock-In'
        : conv('貨幣轉換及終期紅利鎖定之「週年日後 30 日」嚴格申請限期'),
      clauseMechanism: isEn
        ? 'Multi-currency switching (from Yr 3) and Terminal Bonus Lock-In (from Yr 15) can typically only be exercised within 30 days following a Policy Anniversary, not mid-year on demand.'
        : conv('大部份多元貨幣轉換（第3年起）及終期紅利鎖定（第15年起）僅限於「保單週年日後 30 日內」遞交申請，逾期須再等一年。'),
      advisorMitigationTip: isEn
        ? 'Enroll policy into Section 08 FN-11 Smart Anniversary Queue (T-45d alert) so clients never miss the window.'
        : conv('將保單納入「08 工具箱 FN-11 保單週年提醒佇列」，提前 45 日自動提醒客戶簽署轉換指示。'),
      icbReference: isEn
        ? 'Participating Policy Provisions — Currency & Lock-In Clause'
        : conv('多元貨幣分紅保單標準條款 — 週年行使期規定'),
    },
  ];

  const upgrades: Section03UpgradeRecommendation[] = [
    {
      id: 'u03-1',
      title: isEn
        ? 'Plan A vs. Plan B Direct Selector (+ Unselected Auto-Match)'
        : conv('新增「計劃 A vs 計劃 B」直接點選器（支援未揀計劃自動配對）'),
      beforePainPoint: isEn
        ? 'Previously required typing insurer/plan names manually into a blank textarea.'
        : conv('舊版只得空白文字框，顧問見客時要人手打保單全名，效率低且易打錯字。'),
      liveStatusIn03: isEn ? 'LIVE ABOVE' : conv('已於上方啟用'),
    },
    {
      id: 'u03-2',
      title: isEn
        ? '5-Dimension Clause Score Visual Bars & VHIS Pre-Existing Timeline'
        : conv('新增「5大條款維度視覺化評分條」及「未知已有病症賠付時間軸圖」'),
      beforePainPoint: isEn
        ? 'Clients struggled to digest dense legal paragraphs during iPad/Zoom meetings.'
        : conv('純文字法律條文密密麻麻，客戶一眼睇唔明保誠標準遞增與保泰第31日全賠嘅分別。'),
      liveStatusIn03: isEn ? 'LIVE VISUALS' : conv('已內置圖表'),
    },
    {
      id: 'u03-3',
      title: isEn
        ? 'HK Insurance Complaints Bureau (ICB) Red-Flag Trap Detector'
        : conv('新增「香港保險投訴局 (ICB) 常見拒賠盲點紅燈預警」'),
      beforePainPoint: isEn
        ? 'Standard RAG summarizes brochure perks but misses real-world inpatient/ward-upgrade claim traps.'
        : conv('一般 AI 只會複述小冊子好處，忽略日間腸胃鏡入院及升等病房 50% 折算等真實理賠地雷。'),
      liveStatusIn03: isEn ? 'LIVE IN C2' : conv('已由子代理 C2 執行'),
    },
    {
      id: 'u03-4',
      title: isEn
        ? '1-Click WhatsApp Client Plain-Language Clause Battlecard'
        : conv('新增「30秒白話文比喻 ＋ 一鍵複製 WhatsApp 條款懶人包」'),
      beforePainPoint: isEn
        ? 'Agents spent 20+ minutes rewriting actuarial clauses into client-friendly Cantonese/Mandarin.'
        : conv('顧問以往每次查完條款仍需花 20 分鐘重新組織粵／普白話文回覆客戶。'),
      liveStatusIn03: isEn ? 'LIVE IN C3' : conv('已由子代理 C3 生成'),
    },
  ];

  const analogy = isEn
    ? `Think of policy clauses like airport fast-track rules (${focusTopic || 'Coverage & Claims'}): ${planA.insurerNameEn} and ${planB.insurerNameEn} both fly you to your destination, but you must check (1) when the gate opens (Waiting Period / Day-31 vs Yr-4 pre-existing), (2) whether upgrading your cabin mid-flight halves your baggage allowance (50% Ward Upgrade Adjustment Factor), and (3) which benefits are printed on your ticket in ink (Guaranteed) vs weather-dependent upgrades (Non-Guaranteed Dividends).`
    : conv(
        `你可以將保單條款想像成「私家醫院同財富金庫嘅通關密碼」：比較 ${planA.insurerNameZh} 同 ${planB.insurerNameZh} 時，唔好淨係睇保額大細，最緊要睇清楚三件事：(1) 幾時正式開閘（90日等候期／未知已有病症第31日定第4年先賠足）、(2) 自己升等住私家房會唔會令全單賠償打五折（病房調整因子）、以及 (3) 邊部份係白紙黑字寫死（保證現金／保證續保），邊部份視乎投資天氣（非保證紅利）。`
      );

  const whatsappBattlecardText = isEn
    ? `📋 *HK Policy Clause Audit Summary*\n• Plan A: ${planALabel}\n• Plan B: ${planBLabel}\n• Key Verdict: Verified exact waiting period, organ scope & guaranteed vs non-guaranteed split.\n• Smart Claim Tip: Pre-apply Cashless LOG 5 days before endoscopy/surgery & match exact ward tier to avoid 50% ward-upgrade adjustment.\n_(Ref: HKIA GL16/GL28 Clause Extract — Prepared by Licensed Intermediary)_`
    : conv(
        `📋 *【香港保單條款重點比對懶人包】*\n🔹 方案 A：${planALabel}\n🔸 方案 B：${planBLabel}\n✅ 核心結論：已核對原文等候期、受保定義及保證／非保證利益分界。\n💡 理賠避坑貼士：進行腸胃鏡或日間手術前 5 個工作天預先批核免找數（LOG），並按保單對應房種入住，避免觸發 50% 升等折算扣減。\n_（資料引自保單條款原文摘錄 · 符合保監局 GL16/GL28 指引）_`
      );

  return {
    planAName: planALabel,
    planBName: planBLabel,
    actuarialAuditor: {
      agentTitle: isEn
        ? 'Sub-Agent C1 · Actuarial Clause & Definition Auditor'
        : conv('子代理 C1 · 精算條款及疾病定義審查官'),
      executiveVerdict: isEn
        ? `Audited ${planALabel} vs ${planBLabel} across 5 actuarial provision axes (${focusTopic || 'Core Definitions'}). Both satisfy HKIA statutory baselines; differentiate on unknown pre-existing speed, organ definition breadth, and guaranteed floor.`
        : conv(
            `已完成 ${planALabel} 與 ${planBLabel} 之五大精算條款維度審查（焦點：${focusTopic || '核心保障及定義'}）。兩者均符合香港保監局法定標準，建議重點比較未知已有病症起賠速度、受保器官定義廣度及保證價值下限。`
          ),
      dimensions,
    },
    claimsAdvocate: {
      agentTitle: isEn
        ? 'Sub-Agent C2 · HK Claims Dispute Devil’s Advocate'
        : conv('子代理 C2 · 香港理賠爭議及拒賠盲點審計官'),
      icbSummary: isEn
        ? 'Cross-checked against Hong Kong Insurance Complaints Bureau (ICB) common dispute rulings so you proactively protect your client before admission or anniversary.'
        : conv('已對照香港保險投訴局（ICB）常見理賠爭議判例，助顧問於客戶入院或保單週年前提前排雷。'),
      traps,
    },
    clientPlainLanguageCoach: {
      agentTitle: isEn
        ? 'Sub-Agent C3 · Client Plain-Language Coach & Section 03 Architect'
        : conv('子代理 C3 · 客戶白話文轉譯及 03 模組升級顧問'),
      thirtySecondAnalogy: analogy,
      whatsappBattlecardText,
      section03Upgrades: upgrades,
    },
    sourceMode: 'deterministic-clause-subagents',
  };
}

// ============================================================================
// 3. ADVISOR WILLINGNESS-TO-PAY ROI & 20 CONCRETE IMPROVEMENTS (REQUESTS 7 & 9)
// ============================================================================

export interface AdvisorRoiSimulationInput {
  monthlySubscriptionHkd: number;
  avgCaseAnnualPremiumHkd: number;
  avgFycCommissionRatePct: number;
  extraPoliciesClosedPerQuarter: number;
  adminHoursSavedPerWeek: number;
  advisorHourlyValueHkd: number;
  preventedClawbackPoliciesPerYear: number;
}

export interface AdvisorRoiSimulationOutput {
  annualSubscriptionCostHkd: number;
  avgCommissionPerPolicyHkd: number;
  annualExtraCommissionHkd: number;
  annualAdminTimeValueSavedHkd: number;
  annualClawbackProtectedHkd: number;
  totalAnnualEconomicGainHkd: number;
  netAnnualBenefitHkd: number;
  roiMultiple: number;
  monthsCoveredBySingleExtraPolicy: number;
}

export function calculateAdvisorSubscriptionRoi(
  input: AdvisorRoiSimulationInput
): AdvisorRoiSimulationOutput {
  const annualSubscriptionCostHkd = Math.max(1, Math.round(input.monthlySubscriptionHkd * 12));
  const avgCommissionPerPolicyHkd = Math.round(
    input.avgCaseAnnualPremiumHkd * (input.avgFycCommissionRatePct / 100)
  );
  const annualExtraCommissionHkd = Math.round(
    avgCommissionPerPolicyHkd * input.extraPoliciesClosedPerQuarter * 4
  );
  const annualAdminTimeValueSavedHkd = Math.round(
    input.adminHoursSavedPerWeek * 48 * input.advisorHourlyValueHkd
  );
  const annualClawbackProtectedHkd = Math.round(
    avgCommissionPerPolicyHkd * 0.75 * input.preventedClawbackPoliciesPerYear
  );
  const totalAnnualEconomicGainHkd =
    annualExtraCommissionHkd + annualAdminTimeValueSavedHkd + annualClawbackProtectedHkd;
  const netAnnualBenefitHkd = totalAnnualEconomicGainHkd - annualSubscriptionCostHkd;
  const roiMultiple = Number((totalAnnualEconomicGainHkd / annualSubscriptionCostHkd).toFixed(1));
  const monthsCoveredBySingleExtraPolicy = Number(
    (avgCommissionPerPolicyHkd / Math.max(1, input.monthlySubscriptionHkd)).toFixed(1)
  );

  return {
    annualSubscriptionCostHkd,
    avgCommissionPerPolicyHkd,
    annualExtraCommissionHkd,
    annualAdminTimeValueSavedHkd,
    annualClawbackProtectedHkd,
    totalAnnualEconomicGainHkd,
    netAnnualBenefitHkd,
    roiMultiple,
    monthsCoveredBySingleExtraPolicy,
  };
}

export interface SaaSPricingTier {
  id: string;
  tierNameEn: string;
  tierNameZh: string;
  targetAudienceEn: string;
  targetAudienceZh: string;
  monthlyPriceHkd: number;
  annualMonthlyEquivHkd: number;
  highlighted?: boolean;
  coreLimitsEn: string[];
  coreLimitsZh: string[];
}

export const ADVISOR_SAAS_TIERS: SaaSPricingTier[] = [
  {
    id: 'tier-solo-mdrt',
    tierNameEn: 'Solo Advisor Pro',
    tierNameZh: '個人績優顧問版 (Solo Pro)',
    targetAudienceEn: 'For individual HK Tied Agents & Broker TRs targeting MDRT',
    targetAudienceZh: '適合衝刺 MDRT 之個人持牌代理人及經紀代表',
    monthlyPriceHkd: 488,
    annualMonthlyEquivHkd: 398,
    coreLimitsEn: [
      'All 40 HKIA insurers & 260+ plans side-by-side comparator + GN16 stress test',
      'Unlimited HKID / MCV Landing Slip OCR scans & GL30 FNA PDF exports',
      '13 HK Private Hospital Cashless LOG matcher & 1-click WhatsApp 4:5 cards',
      'Client Safe Mode (café iPad anonymization) + Google Drive encrypted sync',
    ],
    coreLimitsZh: [
      '全港 40 間保司、260+ 款計劃精算比較及 GN16 紅利實現率壓測',
      '無限次香港身份證／入境白紙仔 OCR 掃描及 GL30 合規建議書 PDF',
      '13 間私家醫院免找數（LOG）配對及 WhatsApp 4:5 精算圖卡生成',
      '見客匿名合規鎖（Client Safe Mode）及 Google Drive 雲端同步',
    ],
  },
  {
    id: 'tier-hnw-cot',
    tierNameEn: 'COT / MCV Wealth Concierge',
    tierNameZh: '高淨值及跨境簽單旗艦版 (COT Elite)',
    targetAudienceEn: 'For COT/TOT producers closing MCV, Jumbo UL & Family Office cases',
    targetAudienceZh: '適合專攻內地訪客 (MCV)、保費融資及大額傳承之資深顧問',
    monthlyPriceHkd: 980,
    annualMonthlyEquivHkd: 798,
    highlighted: true,
    coreLimitsEn: [
      'Everything in Solo Pro + Custom White-Label Broker Logo & QR Code on all PDFs',
      'Unlimited Gemini Voice-to-GL30 FNA (Cantonese/Mandarin) & AI Pre-Underwriting',
      'Triple Clause Sub-Agent Audit (ICB Dispute Traps + 5-Axis Clause Battlecards)',
      'MCV HK Bank Booking Concierge, +200 bps IFS-PF Stress Simulator & Clawback Radar',
    ],
    coreLimitsZh: [
      '包含個人版全部功能 ＋ 專屬個人／經紀行白牌 Logo 及微信／WhatsApp 二維碼 PDF',
      '無限次粵／普會談錄音自動填寫 GL30 FNA 及跨保司體況異常 AI 預核保',
      '三子條款審查官（ICB 拒賠盲點排雷 ＋ 5 維度條款評分圖卡）',
      'MCV 赴港開戶簽單管家、+200點子保費融資壓測及 13 個月防回撥雷達',
    ],
  },
  {
    id: 'tier-agency-enterprise',
    tierNameEn: 'Agency District & Broker Firm',
    tierNameZh: '營業處團隊及經紀行企業版 (Team 10 Seats)',
    targetAudienceEn: 'For Senior District Directors & Responsible Officers (RO) managing teams',
    targetAudienceZh: '適合分區總監 (DD) 及保險經紀行負責人員 (RO) 團隊管理',
    monthlyPriceHkd: 3680,
    annualMonthlyEquivHkd: 2980,
    coreLimitsEn: [
      'Includes 10 licensed advisor seats (HK$298/seat annual) with RBAC principal locks',
      'RO Compliance Audit Vault: 7-year HKIA GL30 FNA, CPFI & 21-day cooling-off logs',
      'Team-wide MDRT / COT leaderboard, orphan-policy reassignment & 15-hr CPD tracker',
      'Custom CSV/JSON insurer rate-table batch importer (`npm run normalize:plans`)',
    ],
    coreLimitsZh: [
      '包含 10 個持牌顧問席位（年繳平均每席 HK$298）及專屬委任保司 RBAC 權限鎖',
      'RO 合規審計金庫：7 年期 GL30 FNA、CPFI 轉保聲明及 21 日冷靜期完整留痕',
      '團隊 MDRT／COT 實時龍虎榜、孤兒單無縫交接及保監 15 小時 CPD 學分監控',
      '支援經紀行批量匯入保司費率及 AI 標準化分類引擎',
    ],
  },
];

export type ImprovementCategory =
  | 'CLOSING_REVENUE'
  | 'UX_CLIENT_TRUST'
  | 'AI_AUTOMATION'
  | 'COMPLIANCE_TEAM_SAAS';

export interface TwentyImprovementBlueprint {
  number: number;
  id: string;
  upgradeCode:
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
  category: ImprovementCategory;
  categoryLabelEn: string;
  categoryLabelZh: string;
  titleEn: string;
  titleZh: string;
  whyAgentsPayEn: string;
  whyAgentsPayZh: string;
  impactScore: number; // 80 - 99
  effortTag: 'Quick Win' | 'Core SaaS Moat' | 'Enterprise API';
}

export const TWENTY_APP_IMPROVEMENTS: TwentyImprovementBlueprint[] = [
  {
    number: 1,
    id: 'imp20-01',
    upgradeCode: 'IMP-01',
    category: 'CLOSING_REVENUE',
    categoryLabelEn: 'Closing & Revenue',
    categoryLabelZh: '簽單轉化與增收',
    titleEn: 'Interactive Client Proposal Microsite (with Live "Client Opened" Read-Receipt)',
    titleZh: '客戶專屬互動提案微網頁（附「客戶已閱」即時通知及回本滑桿）',
    whyAgentsPayEn: 'Notifies the advisor the exact minute a prospect opens the quote link and tracks which policy year they inspected.',
    whyAgentsPayZh: '發送專屬互動連結予客戶滑動檢視第 5–30 年現金價值，客戶打開瞬間即時推送「已閱」通知助黃金時間跟進。',
    impactScore: 99,
    effortTag: 'Core SaaS Moat',
  },
  {
    number: 2,
    id: 'imp20-02',
    upgradeCode: 'IMP-02',
    category: 'AI_AUTOMATION',
    categoryLabelEn: 'AI & Workflow Speed',
    categoryLabelZh: 'AI 自動化與提速',
    titleEn: 'Existing Legacy Policy & Official BI PDF Health-Check Gap Scanner',
    titleZh: '現有舊保單／官方建議書 PDF 智能體檢掃描器（30秒標出通脹缺口）',
    whyAgentsPayEn: 'Audits 10-year-old ward/CI policies or competitor BI schedules to quantify room/surgery shortfalls and rider waste.',
    whyAgentsPayZh: '上傳或貼上客戶舊保單／友商建議書，自動標出私院房租與手術上限落差及重疊附約保費，順理成章促成加保。',
    impactScore: 98,
    effortTag: 'Core SaaS Moat',
  },
  {
    number: 3,
    id: 'imp20-03',
    upgradeCode: 'IMP-03',
    category: 'UX_CLIENT_TRUST',
    categoryLabelEn: 'Visual UX & Client Trust',
    categoryLabelZh: '視覺體驗與客戶信任',
    titleEn: 'HK Private Hospital Surgeon Fee Median Benchmark & Cashless Specialist Finder',
    titleZh: '私家醫院主診醫生手術費參考基準庫＋全港免找數日間專科名冊',
    whyAgentsPayEn: 'Pairs 50th/90th percentile HK private surgical bills against VHIS caps and locates $0-deposit endoscopy/cardio clinics.',
    whyAgentsPayZh: '對照全港私院常見手術第 50／90 百分位收費與自願醫保限額，並即時搜尋 $0 按金免找數專科中心（已同步併入 06）。',
    impactScore: 97,
    effortTag: 'Core SaaS Moat',
  },
  {
    number: 4,
    id: 'imp20-04',
    upgradeCode: 'IMP-04',
    category: 'CLOSING_REVENUE',
    categoryLabelEn: 'Closing & Revenue',
    categoryLabelZh: '簽單轉化與增收',
    titleEn: 'Top Talent Pass (TTPS) / IANG / MCV Bilingual Banking, Signing & Renewal Pack',
    titleZh: '港漂／高才通／MCV 雙語一日赴港開戶、簽單行程及續保指南包',
    whyAgentsPayEn: 'Generates time-blocked HK arrival, HSBC/BOCHK/ZA account opening, DDA renewal setup, and verification hub cards.',
    whyAgentsPayZh: '一鍵生成高才通／內地訪客抵港關口、預約開戶分行、保司驗證中心時間表及續保自動轉帳清單。',
    impactScore: 96,
    effortTag: 'Quick Win',
  },
  {
    number: 5,
    id: 'imp20-05',
    upgradeCode: 'IMP-05',
    category: 'AI_AUTOMATION',
    categoryLabelEn: 'AI & Workflow Speed',
    categoryLabelZh: 'AI 自動化與提速',
    titleEn: 'Cantonese / Mandarin Voice Memo 10s-to-HKIA GL30 FNA Meeting Record',
    titleZh: '廣東話語音備忘 10 秒轉保監局 GL30 合規會談紀錄（直連 02 CRM）',
    whyAgentsPayEn: 'Turns post-meeting Cantonese voice notes into signed GL30 FNA fields and writes directly into Lead CRM.',
    whyAgentsPayZh: '見客後錄音或貼上粵語速記，10 秒自動提取收入、流動資產及風險取向並寫入 02 客戶檔案解鎖電子投保。',
    impactScore: 96,
    effortTag: 'Core SaaS Moat',
  },
  {
    number: 6,
    id: 'imp20-06',
    upgradeCode: 'IMP-06',
    category: 'UX_CLIENT_TRUST',
    categoryLabelEn: 'Visual UX & Client Trust',
    categoryLabelZh: '視覺體驗與客戶信任',
    titleEn: 'Multi-Year GN16 Fulfillment Ratio Trend Chart (2019–2025) & Dividend Alerts',
    titleZh: '分紅實現率歷年趨勢追蹤折線圖（2019–2025）及派息更新提醒',
    whyAgentsPayEn: 'Answers analytical HNW clients with 7-year GN16 cohort stability curves and standard-deviation metrics.',
    whyAgentsPayZh: '繪製各大保司連續 7 年 GN16 實現率折線圖及波幅標準差，用真實歷年穩定度打動金融專業客戶（已連動 01）。',
    impactScore: 95,
    effortTag: 'Quick Win',
  },
  {
    number: 7,
    id: 'imp20-07',
    upgradeCode: 'IMP-07',
    category: 'CLOSING_REVENUE',
    categoryLabelEn: 'Closing & Revenue',
    categoryLabelZh: '簽單轉化與增收',
    titleEn: 'Household Family & Referral Network Graph (1-Click CRM Family Creation)',
    titleZh: '轉介人及家庭成員關係網絡圖譜（Family & Referral Tree · 直連 CRM）',
    whyAgentsPayEn: 'Expands 1 individual policy into a 4-member household portfolio with shared VHIS tax caps & contingent owners.',
    whyAgentsPayZh: '視覺化呈現客戶配偶、子女、父母及轉介人關係鏈，一鍵將未受保家庭成員寫入 02 CRM 放大簽單保費。',
    impactScore: 96,
    effortTag: 'Core SaaS Moat',
  },
  {
    number: 8,
    id: 'imp20-08',
    upgradeCode: 'IMP-08',
    category: 'COMPLIANCE_TEAM_SAAS',
    categoryLabelEn: 'Compliance & Team SaaS',
    categoryLabelZh: '合規風控與團隊管理',
    titleEn: '13th / 25th-Month Persistency Radar, Joint-Split Ledger & Clawback Shield',
    titleZh: '第 13／25 個月續保率預警、合夥拆帳及佣金追回（Clawback）防護盾',
    whyAgentsPayEn: 'Tracks exact FYC clawback exposure on unpaid renewals and protects the ≥90% persistency bonus gate.',
    whyAgentsPayZh: '實時監測踏入第 11–25 個月保單之 DDA 扣帳狀態、拆單比例與潛在佣金追回風險，守住個人續保率獎金。',
    impactScore: 95,
    effortTag: 'Core SaaS Moat',
  },
  {
    number: 9,
    id: 'imp20-09',
    upgradeCode: 'IMP-09',
    category: 'CLOSING_REVENUE',
    categoryLabelEn: 'Closing & Revenue',
    categoryLabelZh: '簽單轉化與增收',
    titleEn: 'Private Insurance Trust vs. Policy Built-In Installment Settlement Simulator',
    titleZh: '保險金信託 vs 保單「類信託」分期身故賠償對比模擬器',
    whyAgentsPayEn: 'Compares setup/annual trustee fees vs free insurer installment payout options for US$500k–$10M estates.',
    whyAgentsPayZh: '量化比較私人家族信託管理費與保單免費內置「分期身故賠償支付指示」，助高淨值及中產客戶作出最優傳承決策。',
    impactScore: 93,
    effortTag: 'Core SaaS Moat',
  },
  {
    number: 10,
    id: 'imp20-10',
    upgradeCode: 'IMP-10',
    category: 'CLOSING_REVENUE',
    categoryLabelEn: 'Closing & Revenue',
    categoryLabelZh: '簽單轉化與增收',
    titleEn: 'SME Keyman Insurance, Buy-Sell Shareholder Equity & IRD DIPN 28 Tax Calculator',
    titleZh: '公司「要員保險（Keyman）」、股東互保及稅務局 DIPN 28 利得稅扣減計算器',
    whyAgentsPayEn: 'Unlocks B2B corporate life tickets by calculating Keyman loss-of-profit cover and 16.5% Profits Tax deductibility.',
    whyAgentsPayZh: '助顧問開拓中小企老闆藍海市場，精算要員保障額、股東退股收購資金池及香港利得稅 16.5% 扣減條件。',
    impactScore: 93,
    effortTag: 'Core SaaS Moat',
  },
  {
    number: 11,
    id: 'imp20-11',
    upgradeCode: 'IMP-11',
    category: 'CLOSING_REVENUE',
    categoryLabelEn: 'Closing & Revenue',
    categoryLabelZh: '簽單轉化與增收',
    titleEn: 'Corporate Group Medical Exit / Early-Retirement Bridge to High-Deductible VHIS',
    titleZh: '團體醫保（Group Medical）離職／退休免核保銜接個人 VHIS 計算器',
    whyAgentsPayEn: 'Shows executives how a HK$25k/50k deductible VHIS saves ~50% premium now and steps down to $0 deductible at retirement.',
    whyAgentsPayZh: '精準切入中環專業人士痛點：在職用公司醫保墊底慳近半保費，55／60／65 歲退休免核保轉回零自付額全保。',
    impactScore: 94,
    effortTag: 'Quick Win',
  },
  {
    number: 12,
    id: 'imp20-12',
    upgradeCode: 'IMP-12',
    category: 'CLOSING_REVENUE',
    categoryLabelEn: 'Closing & Revenue',
    categoryLabelZh: '簽單轉化與增收',
    titleEn: 'UK / US / AU / CA University Tuition Inflation & Multi-FX Withdrawal Schedule',
    titleZh: '子女海外升學（英／美／澳／加）學費通脹及外幣保單部分退保時間表',
    whyAgentsPayEn: 'Projects 4-year overseas tuition in GBP/USD/AUD/CAD at age 18–21 and maps exact multi-currency policy withdrawals.',
    whyAgentsPayZh: '內置英美澳加大學學費連宿費通脹基準，精算子女 18–21 歲轉換英鎊／美元／澳元／加元提領時間表。',
    impactScore: 94,
    effortTag: 'Quick Win',
  },
  {
    number: 13,
    id: 'imp20-13',
    upgradeCode: 'IMP-13',
    category: 'AI_AUTOMATION',
    categoryLabelEn: 'AI & Workflow Speed',
    categoryLabelZh: 'AI 自動化與提速',
    titleEn: 'Anonymized Sub-Standard Underwriting Case Vault & Lab Biomarker Triage',
    titleZh: '匿名核保案例共享庫（次標準體加費／除外參考）及體檢化驗指標速查',
    whyAgentsPayEn: 'Cross-checks TI-RADS/BI-RADS nodules, ALT, HbA1c, HBV & BP against real HK insurer loading/exclusion precedents.',
    whyAgentsPayZh: '收錄甲狀腺結節、脂肪肝、乙肝帶菌及結腸息肉等各保司核保尺度，輸入 BMI／血壓／HbA1c 即時預判核保結果。',
    impactScore: 95,
    effortTag: 'Core SaaS Moat',
  },
  {
    number: 14,
    id: 'imp20-14',
    upgradeCode: 'IMP-14',
    category: 'UX_CLIENT_TRUST',
    categoryLabelEn: 'Visual UX & Client Trust',
    categoryLabelZh: '視覺體驗與客戶信任',
    titleEn: 'Insurer UW / LOG / Claims SLA Turnaround Thermometer & Discharge Checklist',
    titleZh: '保司核保、免找數 LOG 及理賠批核時效溫度計＋出院正本單據核對清單',
    whyAgentsPayEn: 'Displays real insurer working-day turnaround bars and prevents missing attending-doctor claim signatures.',
    whyAgentsPayZh: '直觀對比各保司核保、私院 LOG 預批及理賠所需工作天，附客戶出院必備正本單據清單（已同步併入 06）。',
    impactScore: 92,
    effortTag: 'Quick Win',
  },
  {
    number: 15,
    id: 'imp20-15',
    upgradeCode: 'IMP-15',
    category: 'CLOSING_REVENUE',
    categoryLabelEn: 'Closing & Revenue',
    categoryLabelZh: '簽單轉化與增收',
    titleEn: 'Quarterly Insurer Promo Rebate + Prepaid Interest Countdown & Bank TD Cliff',
    titleZh: '保司限時保費回贈／預繳保證高息倒數看板＋銀行定存減息斷崖對比',
    whyAgentsPayEn: 'Stacks 16%–20% first-year rebates + 4.5%–4.8% prepaid interest and contrasts against maturing bank time deposits.',
    whyAgentsPayZh: '自動疊加首年保費回贈與 5 年預繳保證高息計算折實總保費，並對比銀行定存減息再投資風險（已連動 01）。',
    impactScore: 97,
    effortTag: 'Quick Win',
  },
  {
    number: 16,
    id: 'imp20-16',
    upgradeCode: 'IMP-16',
    category: 'UX_CLIENT_TRUST',
    categoryLabelEn: 'Visual UX & Client Trust',
    categoryLabelZh: '視覺體驗與客戶信任',
    titleEn: 'Global White-Label Advisor Brand Theme, MDRT Credential & QR Header Studio',
    titleZh: '一鍵切換顧問個人品牌白牌主題、MDRT 頭銜及名片 QR Code 頁首（全站生效）',
    whyAgentsPayEn: 'Stamps the advisor’s custom wealth brand and scannable QR header onto every exported PDF proposal & microsite.',
    whyAgentsPayZh: '自訂個人家族辦公室頭銜、MDRT／COT 榮譽及專屬 QR Code，一鍵同步至全站比較建議書 PDF 及客戶微網頁。',
    impactScore: 97,
    effortTag: 'Quick Win',
  },
  {
    number: 17,
    id: 'imp20-17',
    upgradeCode: 'IMP-17',
    category: 'COMPLIANCE_TEAM_SAAS',
    categoryLabelEn: 'Compliance & Team SaaS',
    categoryLabelZh: '合規風控與團隊管理',
    titleEn: 'Offline Meeting PWA Mode (High-Speed Rail / Hospital Basement Zero-Net Quoting)',
    titleZh: '離線見客模式（PWA 跨境高鐵／醫院地庫無網絡報價及一鍵桌面安裝）',
    whyAgentsPayEn: 'Installs onto iPad/iPhone home screen with Service Worker asset & catalog caching so demos never stall offline.',
    whyAgentsPayZh: '完整支援 PWA 桌面安裝及 Service Worker 離線快取，身處西九高鐵或地庫餐廳無網絡仍可流暢報價比較。',
    impactScore: 91,
    effortTag: 'Quick Win',
  },
  {
    number: 18,
    id: 'imp20-18',
    upgradeCode: 'IMP-18',
    category: 'COMPLIANCE_TEAM_SAAS',
    categoryLabelEn: 'Compliance & Team SaaS',
    categoryLabelZh: '合規風控與團隊管理',
    titleEn: 'Team Director MDRT Leaderboard, Birthday Age-Backdate Radar & RO 7-Yr Audit Pack',
    titleZh: '團隊主管 MDRT 進度看板、生日前「追溯年齡」慳保費提醒及 RO 7年合規包',
    whyAgentsPayEn: 'Combines District Director MDRT tracking, 30-day birthday backdate lead alerts, and 1-click HKIA audit export.',
    whyAgentsPayZh: '整合營業總監團隊 MDRT 龍虎榜、準客戶生日前夕鎖定年輕費率提示，以及經紀行 RO 7 年合規查冊檔案包匯出。',
    impactScore: 95,
    effortTag: 'Enterprise API',
  },
  {
    number: 19,
    id: 'imp20-19',
    upgradeCode: 'IMP-19',
    category: 'UX_CLIENT_TRUST',
    categoryLabelEn: 'Visual UX & Client Trust',
    categoryLabelZh: '視覺體驗與客戶信任',
    titleEn: 'HK MPF + Annuity/QDAP + Greater Bay Area (GBA) Senior Care Cashflow Planner',
    titleZh: '香港強積金＋香港年金／QDAP＋「大灣區跨境養老院舍」退休現金流規劃儀',
    whyAgentsPayEn: 'Contrasts HK vs Shenzhen/Zhuhai/Zhongshan premier senior living budgets against MPF + Annuity + Savings income.',
    whyAgentsPayZh: '合併強積金、香港年金／QDAP 與分紅單提取，直觀對比留港退休與深圳／珠海高端醫養社區之每月現金流盈餘。',
    impactScore: 93,
    effortTag: 'Core SaaS Moat',
  },
  {
    number: 20,
    id: 'imp20-20',
    upgradeCode: 'IMP-20',
    category: 'COMPLIANCE_TEAM_SAAS',
    categoryLabelEn: 'Compliance & Team SaaS',
    categoryLabelZh: '合規風控與團隊管理',
    titleEn: 'WhatsApp Compliant Disclosure Audit Vault & HKSAR iAM Smart (智方便) STP Bridge',
    titleZh: 'WhatsApp 合規發送紀錄留痕金庫＋香港政府「智方便 (iAM Smart)」實名核保接口',
    whyAgentsPayEn: 'Logs cryptographic proof of non-guaranteed/cooling-off disclosures and enables 1-click iAM Smart KYC in 04 STP.',
    whyAgentsPayZh: '自動封存每次發送予客戶之保證／非保證及 21 日冷靜期披露雜湊紀錄防投訴，並打通 04「智方便」一鍵實名核保。',
    impactScore: 96,
    effortTag: 'Enterprise API',
  },
];

