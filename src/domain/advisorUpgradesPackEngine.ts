import {
  ClientLead,
  ExistingPolicyAuditItem,
  InForcePolicyRecord,
  InsurancePlan,
  LeadStage,
  PolicyApplicationRecord,
  ProtectionDimensionId,
} from './types';

// ============================================================================
// SUGGESTION #2: LEGACY POLICY PHOTO-TO-DIFF ENGINE
// ============================================================================

export type LegacyDiffStatus = 'RED_GAP' | 'AMBER_LIMIT' | 'GREEN_UPGRADED';

export interface LegacyPolicyPreset {
  id: string;
  badgeZh: string;
  badgeEn: string;
  policyNameZh: string;
  policyNameEn: string;
  insurerHintZh: string;
  dimensionId: ProtectionDimensionId;
  wardTierZh: string;
  wardTierEn: string;
  annualLimitHkd: number;
  lifetimeLimitLabelZh: string;
  cashlessLogSupported: boolean;
  cancerFullCover: boolean;
  portableAfterJobLeave: boolean;
  annualPremiumHkd: number;
  limitationSummaryZh: string;
  limitationSummaryEn: string;
}

export interface LegacyVsUpgradeDiffRow {
  id: string;
  dimensionLabelZh: string;
  dimensionLabelEn: string;
  legacyValueZh: string;
  legacyValueEn: string;
  upgradeValueZh: string;
  upgradeValueEn: string;
  status: LegacyDiffStatus;
  impactNoteZh: string;
  impactNoteEn: string;
}

export interface LegacyVsUpgradeDiffReport {
  legacyTitleZh: string;
  legacyTitleEn: string;
  upgradeTitleZh: string;
  upgradeTitleEn: string;
  legacyAnnualLimitHkd: number;
  upgradeAnnualLimitHkd: number;
  coverageMultiplier: number;
  legacyAnnualPremiumHkd: number;
  upgradeNetAnnualPremiumHkd: number;
  estimatedVhisTaxSavedHkd: number;
  annualPremiumDeltaHkd: number;
  redGapCount: number;
  rows: LegacyVsUpgradeDiffRow[];
  auditItemForRadar: ExistingPolicyAuditItem;
  whatsappDiffScriptZh: string;
}

export const HK_LEGACY_POLICY_PRESETS: LegacyPolicyPreset[] = [
  {
    id: 'CORP_GROUP_MED_60K',
    badgeZh: '打工仔常見 · 公司團體醫保',
    badgeEn: 'Corporate Group Medical',
    policyNameZh: '僱主團體醫療計劃（普通大房 Sub-limit 制）',
    policyNameEn: 'Corporate Group Medical (Standard Ward Sub-limit)',
    insurerHintZh: '團體醫保常見結構',
    dimensionId: 'PRIVATE_HOSPITAL',
    wardTierZh: '私院普通房（設外科手術分項上限 HK$22,000）',
    wardTierEn: 'Standard Ward (Surgeon sub-limit HK$22,000)',
    annualLimitHkd: 60000,
    lifetimeLimitLabelZh: '跟隨在職期（離職／裁員／退休即歸零）',
    cashlessLogSupported: false,
    cancerFullCover: false,
    portableAfterJobLeave: false,
    annualPremiumHkd: 0,
    limitationSummaryZh: '設分項賠償上限、不包標靶藥全數賠償，轉工或退休即失去核保資格。',
    limitationSummaryEn: 'Strict surgical sub-limits, excludes targeted cancer therapy, terminates upon leaving employer.',
  },
  {
    id: 'OLD_INDIVIDUAL_MED_80K',
    badgeZh: '10 年前舊單 · 傳統分項住院保',
    badgeEn: '2014 Legacy Individual Medical',
    policyNameZh: '2014 傳統個人住院醫療單（非自願醫保分項制）',
    policyNameEn: '2014 Legacy Itemized Hospital Plan (Non-VHIS)',
    insurerHintZh: '傳統舊世代個人住院單',
    dimensionId: 'PRIVATE_HOSPITAL',
    wardTierZh: '普通大房（入住半私家房觸發 50% 病房折算）',
    wardTierEn: 'General Ward (50% proration if Semi-Private)',
    annualLimitHkd: 80000,
    lifetimeLimitLabelZh: '終身賠償上限 HK$800,000',
    cashlessLogSupported: false,
    cancerFullCover: false,
    portableAfterJobLeave: true,
    annualPremiumHkd: 5400,
    limitationSummaryZh: '非 VHIS 無扣稅額，複雜手術主刀費僅賠約 45%，須先自付 HK$60,000 按金入院。',
    limitationSummaryEn: 'No VHIS tax relief, covers ~45% of complex surgeon fees, requires upfront hospital cash deposit.',
  },
  {
    id: 'LEGACY_SINGLE_CI_400K',
    badgeZh: '舊款單次危疾 · 保額追唔上通脹',
    badgeEn: 'Legacy Single-Pay Critical Illness',
    policyNameZh: '舊款單次賠償危疾保（HK$400,000 固定保額）',
    policyNameEn: 'Legacy Single-Claim CI (HK$400,000 Fixed SA)',
    insurerHintZh: '早期單次賠償危疾結構',
    dimensionId: 'CRITICAL_ILLNESS',
    wardTierZh: '不適用（一筆過現金賠償，索償 1 次即終止）',
    wardTierEn: 'Lump-sum only (Terminates after 1st major claim)',
    annualLimitHkd: 400000,
    lifetimeLimitLabelZh: '單次 100% 賠償後整份保單終止',
    cashlessLogSupported: false,
    cancerFullCover: false,
    portableAfterJobLeave: true,
    annualPremiumHkd: 9800,
    limitationSummaryZh: '單次索償後無法再買新危疾；不設癌症持續津貼及中風／心臟病多重復發保障。',
    limitationSummaryEn: 'Terminates after first claim; no ongoing cancer income or recurrent stroke/cardiac cover.',
  },
];

export function buildLegacyVsUpgradeDiff(params: {
  preset: LegacyPolicyPreset;
  lead?: ClientLead;
  upgradePlan?: InsurancePlan | null;
  deductibleHkd?: 0 | 20000 | 50000;
}): LegacyVsUpgradeDiffReport {
  const { preset, lead, upgradePlan, deductibleHkd = 20000 } = params;
  const age = lead?.age ?? 36;

  const isCi = preset.dimensionId === 'CRITICAL_ILLNESS';
  const upgradeTitleZh = upgradePlan
    ? `[${upgradePlan.insurerCode}] ${upgradePlan.nameZh}`
    : isCi
    ? '多重保危疾加護方案（高達 500% 多重賠償）'
    : `高端自願醫保 VHIS 靈活計劃（HK$${deductibleHkd.toLocaleString()} 自付費）`;
  const upgradeTitleEn = upgradePlan
    ? `[${upgradePlan.insurerCode}] ${upgradePlan.nameEn}`
    : isCi
    ? 'Multi-Pay Critical Illness Shield (Up to 500% Total Cover)'
    : `High-End VHIS Flexi Medical (HK$${deductibleHkd.toLocaleString()} Deductible)`;

  const upgradeAnnualLimitHkd = isCi ? 2000000 : 10000000;
  const baseVhisPrem =
    deductibleHkd === 50000 ? 6900 : deductibleHkd === 20000 ? 9600 : 18400;
  const grossUpgradePrem = isCi
    ? Math.round(16800 * (1 + Math.max(0, age - 32) * 0.025))
    : Math.round(baseVhisPrem * (1 + Math.max(0, age - 32) * 0.028));

  const estimatedVhisTaxSavedHkd = isCi ? 0 : Math.min(8000, grossUpgradePrem) * 0.15;
  const upgradeNetAnnualPremiumHkd = Math.max(
    0,
    Math.round(grossUpgradePrem - estimatedVhisTaxSavedHkd)
  );
  const coverageMultiplier =
    preset.annualLimitHkd > 0
      ? Math.round((upgradeAnnualLimitHkd / preset.annualLimitHkd) * 10) / 10
      : 100;

  const rows: LegacyVsUpgradeDiffRow[] = [
    {
      id: 'row-limit',
      dimensionLabelZh: isCi ? '最高累計危疾賠償額' : '每年醫療賠償總上限',
      dimensionLabelEn: isCi ? 'Maximum Cumulative CI Benefit' : 'Annual Medical Benefit Limit',
      legacyValueZh: `HK$${preset.annualLimitHkd.toLocaleString()}（${preset.lifetimeLimitLabelZh}）`,
      legacyValueEn: `HK$${preset.annualLimitHkd.toLocaleString()}`,
      upgradeValueZh: isCi
        ? `HK$${upgradeAnnualLimitHkd.toLocaleString()}（癌症／心腦血管多重復發保障）`
        : `HK$${upgradeAnnualLimitHkd.toLocaleString()}／年 · 終身無上限（每年自動還原）`,
      upgradeValueEn: `HK$${upgradeAnnualLimitHkd.toLocaleString()} (${coverageMultiplier}x)`,
      status: 'RED_GAP',
      impactNoteZh: `保額即時提升 ${coverageMultiplier} 倍，消除私家醫院大手術爆煲自付差額。`,
      impactNoteEn: `Boosts protection ceiling by ${coverageMultiplier}x against private hospital inflation.`,
    },
    {
      id: 'row-ward',
      dimensionLabelZh: isCi ? '原位癌／早期危疾預支' : '受保病房級別與分項賠償',
      dimensionLabelEn: isCi ? 'Early-Stage CI Advance' : 'Ward Tier & Surgical Itemization',
      legacyValueZh: preset.wardTierZh,
      legacyValueEn: preset.wardTierEn,
      upgradeValueZh: isCi
        ? '預支後保費豁免，主保額保留作日後嚴重危疾索償'
        : '半私家房全數賠償（外科醫生費、麻醉師費、手術室費無分項上限）',
      upgradeValueEn: isCi
        ? 'Early claim waives future premiums while preserving core cover'
        : 'Semi-Private Full Cover (Zero surgical sub-limits)',
      status: 'RED_GAP',
      impactNoteZh: isCi
        ? '避免索償一次後淪為「裸奔」無保障狀態。'
        : '杜絕「買咗醫保仲要自己補幾萬蚊醫生費」嘅理賠落差。',
      impactNoteEn: 'Eliminates surgical sub-limit shortfalls.',
    },
    {
      id: 'row-log',
      dimensionLabelZh: '私家醫院免找數入院批核 (Cashless LOG)',
      dimensionLabelEn: 'Private Hospital Cashless Admission (LOG)',
      legacyValueZh: preset.cashlessLogSupported
        ? '支援基本網絡門診'
        : '不支援（入院須先碌卡付 HK$50k–$100k 按金）',
      legacyValueEn: preset.cashlessLogSupported ? 'Basic network' : 'No (Upfront deposit required)',
      upgradeValueZh: isCi
        ? '確診即批一筆過應急現金（毋須醫療單據實報實銷）'
        : '支援養和／港怡／聖保祿／仁安免按金入院預批（最快 2–3 工作天）',
      upgradeValueEn: 'Full Cashless LOG pre-approval at major HK private hospitals',
      status: preset.cashlessLogSupported ? 'AMBER_LIMIT' : 'RED_GAP',
      impactNoteZh: '緊急入院唔使動用家庭流動現金或碌爆信用卡額度。',
      impactNoteEn: 'Protects household cashflow at hospital admission.',
    },
    {
      id: 'row-cancer',
      dimensionLabelZh: '癌症電療、化療、標靶藥及免疫治療',
      dimensionLabelEn: 'Oncology Targeted Therapy & Immunotherapy',
      legacyValueZh: preset.cancerFullCover ? '設年度上限' : '不包門診標靶藥或設極低分項上限',
      legacyValueEn: preset.cancerFullCover ? 'Capped' : 'Excluded or minimal sub-limit',
      upgradeValueZh: isCi
        ? '包持續癌症現金津貼（每月派發生活費支援休養）'
        : '全數賠償非手術癌症治療（電療、化療、標靶藥及基因檢測）',
      upgradeValueEn: 'Full cover for non-surgical oncology & targeted drugs',
      status: 'RED_GAP',
      impactNoteZh: '香港私家標靶藥每月動輒 HK$35,000–$60,000，屬於最關鍵缺口。',
      impactNoteEn: 'Covers HK$35k–$60k/month targeted oncology medication.',
    },
    {
      id: 'row-portability',
      dimensionLabelZh: '離職／退休延續性與保證續保至 100 歲',
      dimensionLabelEn: 'Job Portability & Guaranteed Renewal to Age 100',
      legacyValueZh: preset.portableAfterJobLeave
        ? '個人持有（惟舊單條款不包未知已有病症）'
        : '離職／轉工／65 歲退休當日即時失效，屆時有病歷未必買到新單',
      legacyValueEn: preset.portableAfterJobLeave
        ? 'Individual policy (legacy exclusions)'
        : 'Terminates upon leaving company or retirement',
      upgradeValueZh: '個人終身契約 · 保證續保至 100 歲（不因索償紀錄加個人保費）',
      upgradeValueEn: 'Guaranteed lifelong renewal to Age 100 regardless of claims',
      status: preset.portableAfterJobLeave ? 'AMBER_LIMIT' : 'RED_GAP',
      impactNoteZh: !isCi
        ? `配合 HK$${deductibleHkd.toLocaleString()} 自付費對接公司醫保，在職慳最多 52% 保費，退休可免核保轉零自付費！`
        : '趁健康鎖定標準體核保資格。',
      impactNoteEn: 'Locks insurability while healthy with seamless retirement step-down.',
    },
    {
      id: 'row-cost',
      dimensionLabelZh: '每年淨保費支出與稅務局 S.29 扣稅優惠',
      dimensionLabelEn: 'Net Annual Cost & IRD Tax Deduction',
      legacyValueZh: `HK$${preset.annualPremiumHkd.toLocaleString()}／年（扣稅 HK$0）`,
      legacyValueEn: `HK$${preset.annualPremiumHkd.toLocaleString()}/yr (HK$0 tax relief)`,
      upgradeValueZh: !isCi
        ? `扣稅後淨保費約 HK$${upgradeNetAnnualPremiumHkd.toLocaleString()}／年（每日約 HK$${Math.round(upgradeNetAnnualPremiumHkd / 365)} · 已扣減稅務優惠約 HK$${Math.round(estimatedVhisTaxSavedHkd).toLocaleString()}）`
        : `HK$${upgradeNetAnnualPremiumHkd.toLocaleString()}／年（鎖定均衡保費，供完保障終身）`,
      upgradeValueEn: `Net HK$${upgradeNetAnnualPremiumHkd.toLocaleString()}/yr`,
      status: 'GREEN_UPGRADED',
      impactNoteZh: '用極低每日成本將潛在百萬醫療／危疾財務風險轉嫁保司。',
      impactNoteEn: 'Transfers seven-figure medical risk for pennies on the dollar.',
    },
  ];

  const redGapCount = rows.filter((r) => r.status === 'RED_GAP').length;
  const clientName = lead?.fullNameZh || '貴客';

  const whatsappDiffScriptZh =
    `【${clientName} 現有舊單 vs 升級方案一頁體檢報告】\n` +
    `剛幫您將現有「${preset.policyNameZh}」逐條比對最新升級方案「${upgradeTitleZh}」，發現 ${redGapCount} 個關鍵理賠缺口：\n` +
    `1️⃣ 保額上限：由 HK$${preset.annualLimitHkd.toLocaleString()} 提升至 HK$${upgradeAnnualLimitHkd.toLocaleString()}（放大 ${coverageMultiplier} 倍）\n` +
    `2️⃣ 手術與標靶藥：舊單設嚴格分項上限，升級後全數賠償外科費及門診標靶藥\n` +
    `3️⃣ 入院體驗：升級支援養和／港怡等私院「免找數入院批核 (Cashless LOG)」，免先付幾萬蚊按金\n` +
    `💡 扣稅後每年淨保費僅約 HK$${upgradeNetAnnualPremiumHkd.toLocaleString()}（每日約 HK$${Math.round(upgradeNetAnnualPremiumHkd / 365)}）。我已經將紅綠燈對比表整理好，方便今晚 5 分鐘同您過一過嗎？`;

  return {
    legacyTitleZh: preset.policyNameZh,
    legacyTitleEn: preset.policyNameEn,
    upgradeTitleZh,
    upgradeTitleEn,
    legacyAnnualLimitHkd: preset.annualLimitHkd,
    upgradeAnnualLimitHkd,
    coverageMultiplier,
    legacyAnnualPremiumHkd: preset.annualPremiumHkd,
    upgradeNetAnnualPremiumHkd,
    estimatedVhisTaxSavedHkd: Math.round(estimatedVhisTaxSavedHkd),
    annualPremiumDeltaHkd: upgradeNetAnnualPremiumHkd - preset.annualPremiumHkd,
    redGapCount,
    rows,
    auditItemForRadar: {
      id: `legacy-diff-${preset.id}-${Date.now()}`,
      policyName: preset.policyNameZh,
      dimensionId: preset.dimensionId,
      coverageAmountHkd: preset.annualLimitHkd,
      annualPremiumHkd: preset.annualPremiumHkd,
      limitationNote: preset.limitationSummaryZh,
      addedAtIso: new Date().toISOString(),
    },
    whatsappDiffScriptZh,
  };
}

// ============================================================================
// SUGGESTION #3: IPAD CLIENT-FACING PRESENTATION LOCK CALCULATOR
// ============================================================================

export interface ClientLockInteractiveParams {
  clientAge: number;
  paymentTermYears: 5 | 10 | 15 | 20;
  sumAssuredUsd: number;
  vhisDeductibleHkd: 0 | 20000 | 50000;
  withdrawalRatePct: 5 | 6 | 7;
  fxUsdToHkd?: number;
  fxHkdToRmb?: number;
}

export interface ClientLockInteractiveResult {
  savingsAnnualPremiumHkd: number;
  vhisAnnualPremiumHkd: number;
  irdTaxSavedHkd: number;
  totalNetAnnualHkd: number;
  totalNetMonthlyHkd: number;
  totalNetAnnualRmb: number;
  gapClosureBeforePct: number;
  gapClosureAfterPct: number;
  projectedCashValueYr20Hkd: number;
  projectedCashValueYr30Hkd: number;
  annualRetirementPayoutHkd: number;
  cashlessDepositWaivedHkd: number;
}

export function computeClientInteractivePreview(
  params: ClientLockInteractiveParams
): ClientLockInteractiveResult {
  const {
    clientAge,
    paymentTermYears,
    sumAssuredUsd,
    vhisDeductibleHkd,
    withdrawalRatePct,
    fxUsdToHkd = 7.8,
    fxHkdToRmb = 0.92,
  } = params;

  const clampedUsd = Math.max(20000, sumAssuredUsd);
  const sumAssuredHkd = Math.round(clampedUsd * fxUsdToHkd);

  // Realistic participating/multi-line annual premium scaling by payment term
  const totalPaidFactor =
    paymentTermYears === 5
      ? 1.0
      : paymentTermYears === 10
      ? 1.08
      : paymentTermYears === 15
      ? 1.15
      : 1.22;
  const savingsTotalPaidHkd = Math.round(sumAssuredHkd * totalPaidFactor);
  const savingsAnnualPremiumHkd = Math.round(savingsTotalPaidHkd / paymentTermYears);

  const ageFactor = 1 + Math.max(0, clientAge - 30) * 0.026;
  const rawVhisHkd =
    vhisDeductibleHkd === 50000 ? 6600 : vhisDeductibleHkd === 20000 ? 9400 : 17800;
  const vhisAnnualPremiumHkd = Math.round(rawVhisHkd * ageFactor);
  const irdTaxSavedHkd = Math.round(Math.min(8000, vhisAnnualPremiumHkd) * 0.15);

  const totalNetAnnualHkd = savingsAnnualPremiumHkd + vhisAnnualPremiumHkd - irdTaxSavedHkd;
  const totalNetMonthlyHkd = Math.round(totalNetAnnualHkd / 12);
  const totalNetAnnualRmb = Math.round(totalNetAnnualHkd * fxHkdToRmb);

  //HKIA GL28 capped ~5.95%–6.2% illustrated growth over 20y / 30y
  const avgDurationOffset = (paymentTermYears - 1) / 2;
  const effYrs20 = Math.max(6, 20 - avgDurationOffset);
  const effYrs30 = Math.max(16, 30 - avgDurationOffset);

  const projectedCashValueYr20Hkd = Math.round(savingsTotalPaidHkd * Math.pow(1.056, effYrs20));
  const projectedCashValueYr30Hkd = Math.round(savingsTotalPaidHkd * Math.pow(1.061, effYrs30));
  const annualRetirementPayoutHkd = Math.round(
    projectedCashValueYr20Hkd * (withdrawalRatePct / 100)
  );

  const gapClosureBeforePct = 28;
  const saBoost = Math.min(48, Math.round((clampedUsd / 150000) * 38));
  const medBoost = vhisDeductibleHkd <= 20000 ? 24 : 20;
  const gapClosureAfterPct = Math.min(98, gapClosureBeforePct + saBoost + medBoost);

  return {
    savingsAnnualPremiumHkd,
    vhisAnnualPremiumHkd,
    irdTaxSavedHkd,
    totalNetAnnualHkd,
    totalNetMonthlyHkd,
    totalNetAnnualRmb,
    gapClosureBeforePct,
    gapClosureAfterPct,
    projectedCashValueYr20Hkd,
    projectedCashValueYr30Hkd,
    annualRetirementPayoutHkd,
    cashlessDepositWaivedHkd: vhisDeductibleHkd === 0 ? 80000 : 60000,
  };
}

// ============================================================================
// SUGGESTION #4: QR MICROSITE READ-INTENT ALERTS + AUTO WHATSAPP SCRIPTS
// ============================================================================

export type MicrositeFocusSectionKey =
  | 'DIVIDEND_STRESS_85'
  | 'HIBOR_FINANCING'
  | 'WITHDRAWAL_567'
  | 'HOSPITAL_LOG';

export type IntentHeatTier = 'HOT_CLOSING' | 'WARM_REVIEW' | 'GLANCE';

export interface MicrositeIntentSession {
  id: string;
  leadId: string;
  clientNameZh: string;
  clientNameEn: string;
  whatsappPhone: string;
  planNameZh: string;
  focusSection: MicrositeFocusSectionKey;
  dwellSeconds: number;
  deviceLabel: string;
  openedAtIso: string;
}

export interface EvaluatedIntentAlert extends MicrositeIntentSession {
  heatTier: IntentHeatTier;
  heatBadgeZh: string;
  sectionLabelZh: string;
  psychologyHintZh: string;
  whatsappScriptZh: string;
}

const SECTION_META: Record<
  MicrositeFocusSectionKey,
  {
    labelZh: string;
    psychologyHintZh: string;
    buildScript: (nameZh: string, planZh: string, secs: number) => string;
  }
> = {
  DIVIDEND_STRESS_85: {
    labelZh: 'GN16 85% 分紅實現率壓力測試表',
    psychologyHintZh: '客戶非常關注非保證紅利波動及保證回本年期，宜主動提供過往 5 年 GN16 官網實現率數據定心丸。',
    buildScript: (nameZh, planZh, secs) =>
      `${nameZh} 您好！見您剛才打開咗「${planZh}」互動建議書（留意到您重點睇緊 85% 分紅實現率壓測同保證現金價值，停留咗約 ${secs} 秒）。其實即使極端情況下非保證紅利打 85 折，合約保證現金價值依然 100% 寫入保單條款鎖死，唔受市況影響。我順手 Cap 埋保司官網最新 GN16 過去 5 年真實分紅實現率紀錄俾您參考，今晚傾 3 分鐘同您拆解下？`,
  },
  HIBOR_FINANCING: {
    labelZh: '保費融資 HIBOR 息率敏感度矩陣',
    psychologyHintZh: '高淨值客戶正衡量槓桿息差與加息風險，宜即時補充雙重紅利鎖定及免補倉安全邊際。',
    buildScript: (nameZh, planZh, secs) =>
      `${nameZh} 您好！見您剛才檢視緊「${planZh}」建議書入面嘅 HIBOR 息率壓力矩陣（約 ${secs} 秒）。現時私人銀行／零售銀行保費融資息口回落空間唔錯，而且方案支援首日高保證退保價值，即使 HIBOR 短期波動 1% 亦唔會輕易觸發補倉線。需唔需要我發埋最新兩間銀行嘅融資預批息率表俾您對比？`,
  },
  WITHDRAWAL_567: {
    labelZh: '退休「567」自製長糧被動現金流曲線',
    psychologyHintZh: '客戶重視退休後每年穩定提取現金流而唔蠶食傳承本金，適合切入保單分拆及後備持有人功能。',
    buildScript: (nameZh, planZh, secs) =>
      `${nameZh} 您好！留意到您剛才喺「${planZh}」互動微網重點睇緊退休被動提領現金流模擬（約 ${secs} 秒）。呢個計劃最大優勢係第 6／7 年起可以靈活提取紅利自製長糧，同時支援「保單分拆＋後備保單持有人」，自己嘆退休之餘剩餘價值可以零遺囑認證傳承俾小朋友。想唔想試下調校去您理想退休年齡再出多一版數字？`,
  },
  HOSPITAL_LOG: {
    labelZh: '養和／港怡私家醫院免找數入院 (Cashless LOG)',
    psychologyHintZh: '客戶最關心真正入院時「使唔使自己先墊支幾萬蚊」及主刀醫生網絡名單。',
    buildScript: (nameZh, planZh, secs) =>
      `${nameZh} 您好！見您剛才打開咗「${planZh}」建議書嘅私家醫院免找數入院批核頁面（約 ${secs} 秒）。只要入院前 2–3 個工作天交醫生轉介信，養和、港怡、聖保祿同仁安都可以由保司直接出信免按金入院，出院直結唔使自己先碌卡墊支。我發埋一份「門診腸胃鏡 vs 住院手術免找數流程懶人圖」俾您留底備用吖！`,
  },
};

export function evaluateMicrositeReadIntentAlerts(
  sessions: MicrositeIntentSession[]
): EvaluatedIntentAlert[] {
  return [...sessions]
    .sort((a, b) => b.dwellSeconds - a.dwellSeconds)
    .map((s) => {
      const heatTier: IntentHeatTier =
        s.dwellSeconds >= 45
          ? 'HOT_CLOSING'
          : s.dwellSeconds >= 20
          ? 'WARM_REVIEW'
          : 'GLANCE';
      const heatBadgeZh =
        heatTier === 'HOT_CLOSING'
          ? '🔥 高意向成交訊號 (≥45s)'
          : heatTier === 'WARM_REVIEW'
          ? '⚡ 深度閱讀中 (20–44s)'
          : '👀 初步瀏覽 (<20s)';
      const meta = SECTION_META[s.focusSection];
      return {
        ...s,
        heatTier,
        heatBadgeZh,
        sectionLabelZh: meta.labelZh,
        psychologyHintZh: meta.psychologyHintZh,
        whatsappScriptZh: meta.buildScript(s.clientNameZh, s.planNameZh, s.dwellSeconds),
      };
    });
}

// ============================================================================
// SUGGESTION #5: 1-CLICK ANNUAL POLICY REVIEW REPORT MODEL
// ============================================================================

export type AnnualReviewLifeEvent = 'MARRIAGE' | 'NEWBORN' | 'MORTGAGE' | 'PROMOTION';

export interface AnnualPolicyReviewModel {
  reportRefNo: string;
  reviewDateIso: string;
  clientNameZh: string;
  clientNameEn: string;
  policyNumber: string;
  insurerCode: string;
  planNameZh: string;
  planNameEn: string;
  annualPremiumDisplay: string;
  gn16FulfillmentPct: number;
  medicalInflationPct: number;
  selectedLifeEvents: AnnualReviewLifeEvent[];
  protectionHealthScore: number;
  newProtectionGapHkd: number;
  actionRecommendationsZh: string[];
  actionRecommendationsEn: string[];
  whatsappInviteZh: string;
}

const LIFE_EVENT_GAP_MAP: Record<
  AnnualReviewLifeEvent,
  {
    deltaGapHkd: number;
    recZh: string;
    recEn: string;
    labelZh: string;
  }
> = {
  MARRIAGE: {
    deltaGapHkd: 800000,
    labelZh: '新婚組建家庭',
    recZh: '更新保單受益人分配比例，並互設配偶為後備保單持有人，善用已婚合併報稅 VHIS／QDAP 扣稅額。',
    recEn: 'Update beneficiary allocations, cross-assign spouse as contingent owner, and optimize joint VHIS/QDAP tax deductions.',
  },
  NEWBORN: {
    deltaGapHkd: 1500000,
    labelZh: '迎接新生兒／添丁',
    recZh: '於出生後 15–30 日黃金窗口為BB投保自願醫保及兒童危疾，並利用「保單分拆」建立教育基金保單。',
    recEn: 'Enroll newborn in VHIS & Juvenile CI within 30 days and set up a split education policy.',
  },
  MORTGAGE: {
    deltaGapHkd: 4200000,
    labelZh: '置業上車／轉按加按',
    recZh: '按揭未償還本金帶來大額家庭負債缺口，建議加配低保費定期人壽 (Term Life) 對沖供樓風險。',
    recEn: 'Offset outstanding mortgage liability with cost-effective Term Life protection.',
  },
  PROMOTION: {
    deltaGapHkd: 900000,
    labelZh: '升職加薪／轉職高薪',
    recZh: '因應收入及稅階上升至 15%–17%，建議用盡每年 HK$60,000 合資格延期年金 QDAP 及 VHIS 扣稅上限。',
    recEn: 'Maximize HK$60,000 QDAP + VHIS tax relief cap at 15%–17% marginal tax rate.',
  },
};

export function buildAnnualPolicyReviewModel(params: {
  lead?: ClientLead;
  policy: InForcePolicyRecord;
  lifeEvents: AnnualReviewLifeEvent[];
  gn16FulfillmentPct: number;
  medicalInflationPct: number;
}): AnnualPolicyReviewModel {
  const { lead, policy, lifeEvents, gn16FulfillmentPct, medicalInflationPct } = params;
  const dateStr = new Date().toISOString().slice(0, 10);

  let newProtectionGapHkd = Math.round(medicalInflationPct * 65000);
  const actionRecommendationsZh: string[] = [];
  const actionRecommendationsEn: string[] = [];

  lifeEvents.forEach((ev) => {
    const item = LIFE_EVENT_GAP_MAP[ev];
    newProtectionGapHkd += item.deltaGapHkd;
    actionRecommendationsZh.push(item.recZh);
    actionRecommendationsEn.push(item.recEn);
  });

  if (gn16FulfillmentPct >= 98) {
    actionRecommendationsZh.push(
      `最新公佈 GN16 分紅實現率達 ${gn16FulfillmentPct}%（表現穩健），滿第 10 個保單週年可考慮執行「終期紅利鎖定」轉入保證戶口賺取積存息率。`
    );
    actionRecommendationsEn.push(
      `Latest GN16 fulfillment ratio stands at ${gn16FulfillmentPct}%; consider Terminal Bonus Lock-In at policy anniversary.`
    );
  } else {
    actionRecommendationsZh.push(
      `最新 GN16 分紅實現率為 ${gn16FulfillmentPct}%，建議檢視長線退休提取節奏並維持保單生效以獲取終期紅利平滑補償。`
    );
    actionRecommendationsEn.push(
      `Latest GN16 fulfillment is ${gn16FulfillmentPct}%; review long-term withdrawal pacing and smoothing buffer.`
    );
  }

  if (medicalInflationPct >= 6) {
    actionRecommendationsZh.push(
      `香港私家醫院醫療通脹約 ${medicalInflationPct}%／年，建議核實住院保障是否已升級至全數賠償且無外科分項上限。`
    );
    actionRecommendationsEn.push(
      `HK private hospital inflation is ~${medicalInflationPct}%/yr; verify zero surgical sub-limits on medical cover.`
    );
  }

  const rawScore = 94 - lifeEvents.length * 9 - (medicalInflationPct >= 8 ? 5 : 0);
  const protectionHealthScore = Math.max(52, Math.min(98, rawScore));

  const eventLabels =
    lifeEvents.length > 0
      ? lifeEvents.map((e) => LIFE_EVENT_GAP_MAP[e].labelZh).join('、')
      : '年度例行保單增值及醫療通脹檢視';

  const clientZh = lead?.fullNameZh || policy.clientNameZh;
  const whatsappInviteZh =
    `【${clientZh} 保單週年體檢報告已備妥 📄】\n` +
    `轉眼您份「[${policy.insurerCode}] ${policy.planNameZh}」（保單編號：${policy.policyId}）即將踏入週年續保期（到期日：${policy.nextDueDateIso}）。\n` +
    `我已經為您生成好今年嘅《1 頁紙年度保障及 GN16 資產檢視報告》：\n` +
    `✅ 最新 GN16 分紅實現率追蹤：${gn16FulfillmentPct}%\n` +
    `✅ 人生階段與通脹檢視重點：${eventLabels}\n` +
    `✅ 保障健康評分：${protectionHealthScore}/100 分\n` +
    `報告 PDF 我一陣直接 Send 俾您過目，呢個禮拜四或五晏晝飲杯咖啡 15 分鐘同您做個年度 Update 好嗎？`;

  return {
    reportRefNo: `REV-${policy.policyId.replace(/[^A-Z0-9]/gi, '').slice(-5)}-${dateStr.replace(/-/g, '')}`,
    reviewDateIso: dateStr,
    clientNameZh: clientZh,
    clientNameEn: lead?.fullNameEn || policy.clientNameEn,
    policyNumber: policy.policyId,
    insurerCode: policy.insurerCode,
    planNameZh: policy.planNameZh,
    planNameEn: policy.planNameEn,
    annualPremiumDisplay: `${policy.currency} $${policy.annualPremium.toLocaleString()}/yr`,
    gn16FulfillmentPct,
    medicalInflationPct,
    selectedLifeEvents: lifeEvents,
    protectionHealthScore,
    newProtectionGapHkd,
    actionRecommendationsZh,
    actionRecommendationsEn,
    whatsappInviteZh,
  };
}

// ============================================================================
// SUGGESTION #6: AGENCY LEADER MDRT COACHING DASHBOARD ENGINE
// ============================================================================

export type MdrtTrackStatus =
  | 'COT_TOT_TRACK'
  | 'MDRT_QUALIFIED'
  | 'MDRT_SPRINT'
  | 'COACHING_PRIORITY';

export interface AgencyAdvisorKpiRow {
  advisorId: string;
  nameZh: string;
  nameEn: string;
  iaLicenseNo: string;
  tierTitleZh: string;
  weeklyFnaCount: number;
  qrMicrositeSentCount: number;
  qrOpenRatePct: number;
  uwConversionRatePct: number;
  ytdFycHkd: number;
  mdrtProgressPct: number;
  cotProgressPct: number;
  trackStatus: MdrtTrackStatus;
  coachingActionZh: string;
}

export interface AgencyMdrtCoachingSummary {
  mdrtTargetFycHkd: number;
  cotTargetFycHkd: number;
  totTargetFycHkd: number;
  teamTotalFycHkd: number;
  teamAvgQrOpenRatePct: number;
  teamMdrtOnTrackCount: number;
  coachingPriorityCount: number;
  advisors: AgencyAdvisorKpiRow[];
}

export const MDRT_2026_FYC_HKD = 600000;
export const COT_2026_FYC_HKD = 1800000;
export const TOT_2026_FYC_HKD = 3600000;

export function computeAgencyMdrtCoachingSummary(params: {
  activeAdvisorNameZh: string;
  activeAdvisorNameEn: string;
  activeAdvisorLicense: string;
  leads: ClientLead[];
  applications: PolicyApplicationRecord[];
  micrositeReceiptsCount: number;
}): AgencyMdrtCoachingSummary {
  const {
    activeAdvisorNameZh,
    activeAdvisorNameEn,
    activeAdvisorLicense,
    leads,
    applications,
    micrositeReceiptsCount,
  } = params;

  const fnaDoneCount = leads.filter((l) => l.fnaRecord !== null).length;
  const uwOrClosedCount = leads.filter(
    (l) => l.stage === LeadStage.UNDERWRITING || l.stage === LeadStage.IN_FORCE
  ).length;
  const liveSent = Math.max(4, leads.filter((l) => l.stage !== LeadStage.NEW).length);
  const liveOpenPct = Math.min(
    96,
    Math.round(((Math.max(3, micrositeReceiptsCount + 3)) / liveSent) * 100)
  );
  const liveUwPct = Math.min(
    88,
    Math.round((Math.max(2, uwOrClosedCount + applications.length) / liveSent) * 100)
  );
  const liveFycHkd =
    498000 +
    applications.reduce((acc, app) => acc + Math.round(app.annualPremium * 0.35 * 7.8), 0);

  const rawRoster: Array<Omit<AgencyAdvisorKpiRow, 'mdrtProgressPct' | 'cotProgressPct' | 'trackStatus'>> = [
    {
      advisorId: 'adv-self',
      nameZh: `${activeAdvisorNameZh}（本帳號實時數據）`,
      nameEn: `${activeAdvisorNameEn} (Live Seat)`,
      iaLicenseNo: activeAdvisorLicense,
      tierTitleZh: '資深分區財富管理總監',
      weeklyFnaCount: Math.max(4, fnaDoneCount),
      qrMicrositeSentCount: liveSent,
      qrOpenRatePct: liveOpenPct,
      uwConversionRatePct: liveUwPct,
      ytdFycHkd: liveFycHkd,
      coachingActionZh:
        liveFycHkd >= MDRT_2026_FYC_HKD
          ? '已穩達 MDRT 門檻！建議聚焦高才通多元貨幣保單分拆個案衝刺 3x COT。'
          : `距離 MDRT 尚欠 HK$${(MDRT_2026_FYC_HKD - liveFycHkd).toLocaleString()} FYC，跟進高意向 QR 微網客戶即可達標。`,
    },
    {
      advisorId: 'adv-2',
      nameZh: '林芷晴 Tiffany Lam',
      nameEn: 'Tiffany Lam',
      iaLicenseNo: 'IA-TR-90418',
      tierTitleZh: '聯席理財策劃經理 (COT 衝刺)',
      weeklyFnaCount: 7,
      qrMicrositeSentCount: 14,
      qrOpenRatePct: 86,
      uwConversionRatePct: 57,
      ytdFycHkd: 1590000,
      coachingActionZh: 'QR 微網 85% 壓測打開率冠絕全組，請邀請於早會分享高淨值儲蓄鎖利話術。',
    },
    {
      advisorId: 'adv-3',
      nameZh: '張子軒 Marcus Cheung',
      nameEn: 'Marcus Cheung',
      iaLicenseNo: 'IA-TR-91852',
      tierTitleZh: '高級財富管理顧問',
      weeklyFnaCount: 5,
      qrMicrositeSentCount: 11,
      qrOpenRatePct: 73,
      uwConversionRatePct: 45,
      ytdFycHkd: 645000,
      coachingActionZh: '已跨越 1x MDRT 基準線，可透過舊客週年保單檢視加配自願醫保提升件數。',
    },
    {
      advisorId: 'adv-4',
      nameZh: '黃凱琳 Karen Wong',
      nameEn: 'Karen Wong',
      iaLicenseNo: 'IA-AG-93210',
      tierTitleZh: '財富管理顧問',
      weeklyFnaCount: 4,
      qrMicrositeSentCount: 9,
      qrOpenRatePct: 67,
      uwConversionRatePct: 33,
      ytdFycHkd: 462000,
      coachingActionZh: '建議書打開率高但核保遞交偏慢，主管宜陪同使用 iPad 純淨同屏模式臨門促成。',
    },
    {
      advisorId: 'adv-5',
      nameZh: '何俊傑 Jason Ho',
      nameEn: 'Jason Ho',
      iaLicenseNo: 'IA-AG-95104',
      tierTitleZh: '新晉理財顧問 (入職 8 個月)',
      weeklyFnaCount: 2,
      qrMicrositeSentCount: 4,
      qrOpenRatePct: 42,
      uwConversionRatePct: 22,
      ytdFycHkd: 215000,
      coachingActionZh: '需優先督導：本週 FNA 數不足 3 份，安排練習「舊單影相紅綠燈對比」切入中產醫保客。',
    },
  ];

  const advisors: AgencyAdvisorKpiRow[] = rawRoster.map((row) => {
    const mdrtProgressPct = Math.round((row.ytdFycHkd / MDRT_2026_FYC_HKD) * 1000) / 10;
    const cotProgressPct = Math.round((row.ytdFycHkd / COT_2026_FYC_HKD) * 1000) / 10;
    const trackStatus: MdrtTrackStatus =
      row.ytdFycHkd >= COT_2026_FYC_HKD * 0.8
        ? 'COT_TOT_TRACK'
        : row.ytdFycHkd >= MDRT_2026_FYC_HKD
        ? 'MDRT_QUALIFIED'
        : row.ytdFycHkd >= MDRT_2026_FYC_HKD * 0.7
        ? 'MDRT_SPRINT'
        : 'COACHING_PRIORITY';

    return {
      ...row,
      mdrtProgressPct,
      cotProgressPct,
      trackStatus,
    };
  });

  const teamTotalFycHkd = advisors.reduce((acc, a) => acc + a.ytdFycHkd, 0);
  const teamAvgQrOpenRatePct = Math.round(
    advisors.reduce((acc, a) => acc + a.qrOpenRatePct, 0) / advisors.length
  );
  const teamMdrtOnTrackCount = advisors.filter(
    (a) => a.trackStatus !== 'COACHING_PRIORITY'
  ).length;
  const coachingPriorityCount = advisors.filter(
    (a) => a.trackStatus === 'COACHING_PRIORITY'
  ).length;

  return {
    mdrtTargetFycHkd: MDRT_2026_FYC_HKD,
    cotTargetFycHkd: COT_2026_FYC_HKD,
    totTargetFycHkd: TOT_2026_FYC_HKD,
    teamTotalFycHkd,
    teamAvgQrOpenRatePct,
    teamMdrtOnTrackCount,
    coachingPriorityCount,
    advisors,
  };
}
