import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  Copy,
  ExternalLink,
  GitBranch,
  Layers,
  Save,
  ShieldCheck,
} from 'lucide-react';
import {
  buildDefaultFamilySplitBuckets,
  buildPlanMatchedClaimsChecklist,
  ClaimChecklistScenarioId,
  compareMultiCurrencyAndPaymentPerks,
  computeBirthdayBackdateRadar,
  DeductibleTierHkd,
  evaluatePreUnderwritingAndMatchPlans,
  FamilySplitBucketInput,
  HK_PRIVATE_SURGERY_SCENARIOS,
  PowerPackToolId,
  PRE_UW_CONDITION_PROFILES,
  PreUwSeverityTier,
  simulateGroupToVhisDeductibleRelay,
  simulateSavingsPolicySplitTimeline,
} from '../domain/advisorSixPowerPackEngine';
import { calculateCompliantQuote } from '../domain/actuarialEngine';
import { getMatchedPowerPackLabelsForPlan } from '../domain/subAgentPlanLoopsEngine';
import { DEFAULT_LIVE_FX_FEED } from '../domain/proEnhancementsEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  ClientLead,
  CurrencyCode,
  FxRateFeedState,
  HealthImpairmentCode,
  InsurancePlan,
  IntermediaryProfile,
  PlanCategory,
  PromoAdminOverride,
  SavedToolSnapshot,
} from '../domain/types';
import { copyTextSafe } from '../utils/clipboardAndDom';

interface AdvisorSixPowerPackViewProps {
  activeToolId?: PowerPackToolId;
  onChangeActiveToolId?: (toolId: PowerPackToolId) => void;
  leads: ClientLead[];
  selectedLeadId: string;
  onSelectLeadId: (leadId: string) => void;
  activeLead: ClientLead;
  onUpdateLead: (leadId: string, updater: (prev: ClientLead) => ClientLead) => void;
  plans: InsurancePlan[];
  selectedPlanId: string;
  onSelectPlanId: (planId: string) => void;
  intermediary: IntermediaryProfile;
  currency: CurrencyCode;
  sumAssuredUsd: number;
  paymentTermYears: number;
  fxFeed?: FxRateFeedState;
  promoOverrides?: Record<string, PromoAdminOverride>;
  onNotify?: (msg: string) => void;
}

const SIX_POWER_TOOLS_META: Array<{
  id: PowerPackToolId;
  badge: string;
  shortZh: string;
  shortEn: string;
  titleZh: string;
  titleEn: string;
  subtitleZh: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'PRE_UW',
    badge: '01',
    shortZh: '1. 預先核保速查',
    shortEn: '1. Pre-UW Triage',
    titleZh: '常見健康狀況「預先核保（Pre-underwriting）」速查表 ＋ 全產品庫智能配對',
    titleEn: 'HK Pre-Underwriting Triage & Friendly Plan Matcher',
    subtitleZh:
      '涵蓋香港最常見 10 大體檢狀況（甲狀腺／乳房結節、乙肝、三高、濕疹等），列明必備化驗報告、四大險種核保結果及全庫最友善產品配對。',
    icon: Activity,
  },
  {
    id: 'BACKDATE_RADAR',
    badge: '02',
    shortZh: '2. 轉保齡慳保費',
    shortEn: '2. Birthday Lock',
    titleZh: '「即將轉保齡／追溯保齡（Backdate 180日）」慳保費自動提醒名單',
    titleEn: 'Upcoming Birthday & 180-Day Backdate Premium-Saving Radar',
    subtitleZh:
      '自動掃描全線客戶生日及生日前後 180 日追溯窗口，精確計算鎖定年輕一歲（Age N vs N+1）在各款危疾／人壽／醫療計劃可慳總保費。',
    icon: CalendarClock,
  },
  {
    id: 'DEDUCTIBLE_RELAY',
    badge: '03',
    shortZh: '3. 團保墊底接力',
    shortEn: '3. VHIS Relay',
    titleZh: '公司團體醫保 ＋ 自願醫保「墊底費（Deductible）無縫接力」圖解計算機',
    titleEn: 'Employer Group Medical + VHIS Deductible Seamless Relay Calculator',
    subtitleZh:
      '以香港私家醫院真實手術收費圖解「公司團保賠頭段抵銷墊底費 ➔ 個人 VHIS 全數接力尾數 ＝ 實付 $0」，並對比在職慳費與 55/60/65 歲免核保轉回 $0 自付額。',
    icon: Layers,
  },
  {
    id: 'POLICY_SPLIT',
    badge: '04',
    shortZh: '4. 保單分拆傳承',
    shortEn: '4. Policy Split',
    titleZh: '儲蓄單「保單分拆（Policy Split）＋ 無限次轉受保人」跨代傳承時間軸',
    titleEn: 'Multi-Currency Policy Split & Unlimited Change-of-Insured Legacy Timeline',
    subtitleZh:
      '配對全庫多元貨幣分紅儲蓄及萬用壽險，模擬「一張母保單 1 拆 3 份獨立家庭子保單」＋ 獨立轉英鎊／加元升學 ＋ 三代免遺產承辦傳承時間軸。',
    icon: GitBranch,
  },
  {
    id: 'CLAIMS_CHECKLIST',
    badge: '05',
    shortZh: '5. 理賠 Checklist',
    shortEn: '5. Claims Guide',
    titleZh: '入院免找數／日間手術／意外物理治療／危疾理賠文件一鍵 Checklist（即發 WhatsApp）',
    titleEn: '1-Click Plan-Matched Claims & Cashless LOG Checklist (WhatsApp Ready)',
    subtitleZh:
      '自動對齊所選保險公司專屬理賠 App／免找數預批時效、主診醫生必寫醫學字眼及正本收據防伏提醒，一鍵複製發給客戶。',
    icon: ClipboardCheck,
  },
  {
    id: 'PAYMENT_PERKS',
    badge: '06',
    shortZh: '6. 多幣交費優惠',
    shortEn: '6. Payment Perks',
    titleZh: '多幣種交費（USD / HKD / RMB）與香港銀行 eDDA／信用卡／預繳鎖息優惠比較',
    titleEn: 'Multi-Currency Settlement & HK Bank eDDA / Credit Card / Prepay Optimizer',
    subtitleZh:
      '同步實時匯率、保司首年保費回贈及 5 年預繳保證鎖息優惠，橫向比較 6 大交費渠道匯差、行政費及信用卡里數回贈後之「首年實際淨支出」。',
    icon: Coins,
  },
];

export const AdvisorSixPowerPackView: React.FC<AdvisorSixPowerPackViewProps> = ({
  activeToolId: controlledToolId,
  onChangeActiveToolId,
  leads,
  selectedLeadId,
  onSelectLeadId,
  activeLead,
  onUpdateLead,
  plans,
  selectedPlanId,
  onSelectPlanId,
  intermediary,
  currency,
  sumAssuredUsd,
  paymentTermYears,
  fxFeed = DEFAULT_LIVE_FX_FEED,
  promoOverrides = {},
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zhHk: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk);

  const [internalToolId, setInternalToolId] = useState<PowerPackToolId>(
    controlledToolId || 'PRE_UW'
  );
  useEffect(() => {
    if (controlledToolId) setInternalToolId(controlledToolId);
  }, [controlledToolId]);

  const currentToolId = controlledToolId || internalToolId;
  const selectTool = (next: PowerPackToolId) => {
    setInternalToolId(next);
    onChangeActiveToolId?.(next);
  };

  const activePlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || plans[0],
    [plans, selectedPlanId]
  );

  const matchedToolLabels = useMemo(
    () => getMatchedPowerPackLabelsForPlan(activePlan),
    [activePlan]
  );

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyScript = async (key: string, text: string, labelZh: string) => {
    await copyTextSafe(text);
    setCopiedId(key);
    window.setTimeout(() => setCopiedId((curr) => (curr === key ? null : curr)), 2200);
    onNotify?.(
      t(
        `Copied WhatsApp script to clipboard!`,
        conv(`已複製「${labelZh}」廣東話 WhatsApp 訊息，可直接貼上發送畀客人！`)
      )
    );
  };

  // =========================================================================
  // TOOL 1 STATE: PRE-UNDERWRITING
  // =========================================================================
  const [conditionCode, setConditionCode] = useState<HealthImpairmentCode>(() => {
    const code = activeLead.healthTriageCode;
    return code && PRE_UW_CONDITION_PROFILES.some((p) => p.code === code)
      ? code
      : 'THYROID_NODULE';
  });
  const [uwSeverity, setUwSeverity] = useState<PreUwSeverityTier>('MILD_STABLE');

  useEffect(() => {
    const code = activeLead.healthTriageCode;
    if (code && PRE_UW_CONDITION_PROFILES.some((p) => p.code === code)) {
      setConditionCode(code);
    }
  }, [activeLead.id, activeLead.healthTriageCode]);

  const preUwResult = useMemo(
    () =>
      evaluatePreUnderwritingAndMatchPlans({
        conditionCode,
        severity: uwSeverity,
        lead: activeLead,
        activePlan,
        allPlans: plans,
        advisorNameZh: intermediary.nameZh,
      }),
    [conditionCode, uwSeverity, activeLead, activePlan, plans, intermediary.nameZh]
  );

  // =========================================================================
  // TOOL 2 STATE: BIRTHDAY & 180-DAY BACKDATE RADAR
  // =========================================================================
  const [backdateSaHkd, setBackdateSaHkd] = useState<number>(
    Math.max(500000, Math.round(sumAssuredUsd * 7.8))
  );
  const [birthdayInputMmDd, setBirthdayInputMmDd] = useState<string>(
    activeLead.birthdayMonthDay || '11-29'
  );
  useEffect(() => {
    setBirthdayInputMmDd(activeLead.birthdayMonthDay || '11-29');
  }, [activeLead.id, activeLead.birthdayMonthDay]);

  const backdateRows = useMemo(
    () =>
      computeBirthdayBackdateRadar({
        leads,
        activePlan,
        allPlans: plans,
        sumAssuredHkd: backdateSaHkd,
        advisorNameZh: intermediary.nameZh,
      }),
    [leads, activePlan, plans, backdateSaHkd, intermediary.nameZh]
  );

  const activeLeadBackdateRow =
    backdateRows.find((r) => r.lead.id === activeLead.id) || backdateRows[0];

  // =========================================================================
  // TOOL 3 STATE: GROUP MEDICAL + VHIS DEDUCTIBLE RELAY
  // =========================================================================
  const detectedGroupCap = useMemo(() => {
    const found = (activeLead.existingPolicies || []).find(
      (ep) =>
        ep.dimensionId === 'PRIVATE_HOSPITAL' ||
        /團體|group|公司/i.test(ep.policyName)
    );
    return found ? found.coverageAmountHkd : 60000;
  }, [activeLead]);

  const [surgeryScenarioId, setSurgeryScenarioId] = useState<string>(
    HK_PRIVATE_SURGERY_SCENARIOS[0].id
  );
  const [employerGroupCapHkd, setEmployerGroupCapHkd] = useState<number>(detectedGroupCap);
  const [selectedDeductibleHkd, setSelectedDeductibleHkd] = useState<DeductibleTierHkd>(25000);
  const [customSurgeryBillHkd, setCustomSurgeryBillHkd] = useState<string>('');

  useEffect(() => {
    setEmployerGroupCapHkd(detectedGroupCap);
  }, [detectedGroupCap, activeLead.id]);

  const deductibleRelay = useMemo(
    () =>
      simulateGroupToVhisDeductibleRelay({
        lead: activeLead,
        allPlans: plans,
        activePlan,
        scenarioId: surgeryScenarioId,
        customBillHkd: Number(customSurgeryBillHkd) > 0 ? Number(customSurgeryBillHkd) : undefined,
        employerGroupCapHkd,
        selectedDeductibleHkd,
        advisorNameZh: intermediary.nameZh,
      }),
    [
      activeLead,
      plans,
      activePlan,
      surgeryScenarioId,
      customSurgeryBillHkd,
      employerGroupCapHkd,
      selectedDeductibleHkd,
      intermediary.nameZh,
    ]
  );

  // =========================================================================
  // TOOL 4 STATE: POLICY SPLIT + UNLIMITED CHANGE OF INSURED TIMELINE
  // =========================================================================
  const [splitAnnualPrem, setSplitAnnualPrem] = useState<number>(
    currency === 'HKD' ? Math.max(80000, activeLead.annualBudgetHkd || 120000) : 30000
  );
  const [splitTermYears, setSplitTermYears] = useState<5 | 10>(5);
  const [chosenSplitYear, setChosenSplitYear] = useState<5 | 8 | 10>(5);
  const [splitBuckets, setSplitBuckets] = useState<FamilySplitBucketInput[]>(() =>
    buildDefaultFamilySplitBuckets(activeLead)
  );

  useEffect(() => {
    setSplitBuckets(buildDefaultFamilySplitBuckets(activeLead));
  }, [activeLead.id]);

  const splitSimulation = useMemo(
    () =>
      simulateSavingsPolicySplitTimeline({
        lead: activeLead,
        allPlans: plans,
        preferredPlanId: activePlan.id,
        currency,
        annualPremiumInput: splitAnnualPrem,
        paymentTermYears: splitTermYears,
        chosenSplitYear,
        buckets: splitBuckets,
        advisorNameZh: intermediary.nameZh,
      }),
    [
      activeLead,
      plans,
      activePlan.id,
      currency,
      splitAnnualPrem,
      splitTermYears,
      chosenSplitYear,
      splitBuckets,
      intermediary.nameZh,
    ]
  );

  // =========================================================================
  // TOOL 5 STATE: CLAIMS CHECKLIST
  // =========================================================================
  const [claimScenarioId, setClaimScenarioId] =
    useState<ClaimChecklistScenarioId>('PRIVATE_INPATIENT_LOG');
  const [checkedClaimDocs, setCheckedClaimDocs] = useState<Record<string, boolean>>({});

  const claimsChecklist = useMemo(
    () =>
      buildPlanMatchedClaimsChecklist({
        scenarioId: claimScenarioId,
        plan: activePlan,
        lead: activeLead,
        advisorNameZh: intermediary.nameZh,
      }),
    [claimScenarioId, activePlan, activeLead, intermediary.nameZh]
  );

  // =========================================================================
  // TOOL 6 STATE: MULTI-FX & CREDIT CARD / eDDA PERKS
  // =========================================================================
  const baselineQuoteHkd = useMemo(() => {
    const q = calculateCompliantQuote({
      plan: activePlan,
      age: activeLead.age,
      isSmoker: activeLead.isSmoker,
      currency: 'HKD',
      sumAssuredInSelectedCurrency: Math.round(sumAssuredUsd * 7.8),
      paymentTermYears: activePlan.supportedPaymentTerms.includes(paymentTermYears)
        ? paymentTermYears
        : activePlan.supportedPaymentTerms[0] || 10,
    });
    return Math.max(12000, q.annualPremium);
  }, [activePlan, activeLead.age, activeLead.isSmoker, sumAssuredUsd, paymentTermYears]);

  const [paymentBasisHkd, setPaymentBasisHkd] = useState<number>(baselineQuoteHkd);
  const [paymentCurr, setPaymentCurr] = useState<CurrencyCode>(
    activePlan.currencies.includes(currency) ? currency : activePlan.currencies[0] || 'USD'
  );
  const [includePrepay5Y, setIncludePrepay5Y] = useState<boolean>(true);
  const [cardPerkPct, setCardPerkPct] = useState<number>(1.5);

  useEffect(() => {
    setPaymentBasisHkd(baselineQuoteHkd);
    if (activePlan.currencies.includes(currency)) {
      setPaymentCurr(currency);
    } else if (activePlan.currencies[0]) {
      setPaymentCurr(activePlan.currencies[0]);
    }
  }, [baselineQuoteHkd, activePlan, currency]);

  const paymentComparison = useMemo(
    () =>
      compareMultiCurrencyAndPaymentPerks({
        plan: activePlan,
        lead: activeLead,
        selectedCurrency: paymentCurr,
        annualPremiumHkdBasis: paymentBasisHkd,
        includeFiveYearPrepay: includePrepay5Y,
        creditCardCashbackOrMilesPct: cardPerkPct,
        fxFeed,
        promoOverrides,
        advisorNameZh: intermediary.nameZh,
      }),
    [
      activePlan,
      activeLead,
      paymentCurr,
      paymentBasisHkd,
      includePrepay5Y,
      cardPerkPct,
      fxFeed,
      promoOverrides,
      intermediary.nameZh,
    ]
  );

  const activeMeta =
    SIX_POWER_TOOLS_META.find((m) => m.id === currentToolId) || SIX_POWER_TOOLS_META[0];

  const handleSaveCurrentToolSnapshot = () => {
    let headlineMetric = `[${activePlan.insurerCode}] ${activePlan.nameZh}`;
    let advisorNote = activeMeta.subtitleZh;

    if (currentToolId === 'PRE_UW') {
      headlineMetric = `${preUwResult.profile.shortTagZh} · [${activePlan.insurerCode}] ${activePlan.nameZh}`;
      advisorNote = preUwResult.activePlanAssessment.rationaleZh;
    } else if (currentToolId === 'BACKDATE_RADAR') {
      headlineMetric = `保齡 ${activeLeadBackdateRow.youngerInsuranceAge} vs ${activeLeadBackdateRow.olderInsuranceAge}歲 · 全期慳 HK$${activeLeadBackdateRow.selectedPlanSaving.totalTermSavedHkd.toLocaleString()}`;
      advisorNote = activeLeadBackdateRow.statusBadgeZh;
    } else if (currentToolId === 'DEDUCTIBLE_RELAY') {
      headlineMetric = `團保 $${deductibleRelay.employerGroupCapHkd.toLocaleString()} ＋ 墊底費 $${deductibleRelay.selectedDeductibleHkd.toLocaleString()} ➔ 實付 HK$${deductibleRelay.clientNetOutOfPocketHkd.toLocaleString()}`;
      advisorNote = `${deductibleRelay.scenario.titleZh} 無縫接力試算`;
    } else if (currentToolId === 'POLICY_SPLIT') {
      headlineMetric = `[${splitSimulation.selectedPlan.insurerCode}] 第${splitSimulation.chosenSplitYear}年 1拆${splitSimulation.buckets.length} · 30年預期 ${splitSimulation.currency} ${splitSimulation.milestones[3].masterOrCombinedValue.toLocaleString()}`;
      advisorNote = splitSimulation.supportedCurrencyCountLabelZh;
    } else if (currentToolId === 'CLAIMS_CHECKLIST') {
      headlineMetric = `${claimsChecklist.scenarioTitleZh} · ${activePlan.insurerNameZh}`;
      advisorNote = claimsChecklist.insurerChannelZh;
    } else {
      headlineMetric = `${paymentComparison.bestChannel.titleZh} · 首年淨支出 HK$${paymentComparison.bestChannel.netFirstYearEffectiveOutlayHkd.toLocaleString()}`;
      advisorNote = `合共節省 HK$${paymentComparison.bestChannel.totalNetBenefitVsStandardHkd.toLocaleString()}`;
    }

    const snap: SavedToolSnapshot = {
      id: `snap-pp-${Date.now().toString(36)}`,
      toolCode: `POWER-${activeMeta.badge}`,
      toolTitleZh: activeMeta.shortZh,
      toolTitleEn: activeMeta.shortEn,
      headlineMetric,
      advisorNote,
      savedAtIso: new Date().toISOString(),
    };
    onUpdateLead(activeLead.id, (prev) => ({
      ...prev,
      savedSnapshots: [
        snap,
        ...(prev.savedSnapshots || []).filter((s) => s.toolCode !== snap.toolCode),
      ].slice(0, 15),
      lastContactIso: new Date().toISOString(),
    }));
    onNotify?.(
      t(
        `Saved ${activeMeta.shortEn} result to ${activeLead.fullNameEn}'s file!`,
        conv(`已將「${activeMeta.shortZh}」試算結果存入「${activeLead.fullNameZh}」第 01 步客戶檔案！`)
      )
    );
  };

  return (
    <div data-testid="advisor-six-power-pack-view" className="space-y-4">
      {/* 6-Tool Segmented Bar */}
      <nav
        aria-label="Hong Kong Advisor 6 Core Power Tools"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6"
      >
        {SIX_POWER_TOOLS_META.map((item) => {
          const Icon = item.icon;
          const selected = item.id === currentToolId;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`power-tool-tab-${item.id}`}
              aria-pressed={selected}
              onClick={() => selectTool(item.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-colors ${
                selected
                  ? 'border-[#0B172A] bg-[#0B172A] text-[#F3D37A] shadow-xs'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${selected ? 'text-[#F3D37A]' : 'text-teal-700'}`}
              />
              <span className="leading-snug whitespace-nowrap">{t(item.shortEn, conv(item.shortZh))}</span>
            </button>
          );
        })}
      </nav>

      {/* Unified Client + Plan Matcher Context Strip */}
      <section
        aria-label="Synchronized Client and Plan Matcher"
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 xl:flex-row xl:items-center xl:justify-between"
      >
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="powerpack-client-select"
              className="block text-[11px] font-bold text-slate-600"
            >
              {t('Active Client (Synced Stages 01–06)', conv('服務中客戶（全流程同步）'))}
            </label>
            <select
              id="powerpack-client-select"
              value={selectedLeadId}
              onChange={(e) => onSelectLeadId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50/70 px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.fullNameZh} ({l.fullNameEn}) · {l.age}歲 ·{' '}
                  {l.residency === 'MCV' ? 'MCV 訪客' : '香港居民'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="powerpack-plan-select"
                className="block text-[11px] font-bold text-slate-600"
              >
                {t(
                  `Matched Insurance Plan (${plans.length} Plans)`,
                  conv(`配對保險計劃（全庫 ${plans.length} 款實時連動）`)
                )}
              </label>
              {activePlan.officialUrl && (
                <a
                  href={activePlan.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 hover:underline"
                >
                  <span>{t('Official Page', conv('官方產品專頁'))}</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </div>
            <select
              id="powerpack-plan-select"
              data-testid="powerpack-plan-select"
              value={activePlan.id}
              onChange={(e) => onSelectPlanId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50/70 px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.insurerCode}] {lang === 'en' ? p.nameEn : conv(p.nameZh)} ·{' '}
                  {lang === 'en' ? p.categoryLabelEn : conv(p.categoryLabelZh)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 xl:border-t-0 xl:pt-0 shrink-0">
          <span className="text-[11px] font-medium text-slate-500">
            {t('Applicable:', conv('此計劃支援：'))}{' '}
            <strong className="text-slate-800">
              {matchedToolLabels.codes.length}/6 {t('Tools', conv('項神器'))}
            </strong>
          </span>
          <button
            type="button"
            data-testid="powerpack-save-snapshot-btn"
            onClick={handleSaveCurrentToolSnapshot}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('Save Result to Client File', conv('存入客戶檔案 (01A)'))}</span>
          </button>
        </div>
      </section>

      {/* Active Tool Main Workbench Card */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
        <div className="border-b border-slate-100 pb-3.5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-teal-800">
            <span className="font-mono">POWER TOOL #{activeMeta.badge}</span>
            <span>·</span>
            <span>
              [{activePlan.insurerCode}] {lang === 'en' ? activePlan.nameEn : conv(activePlan.nameZh)}
            </span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            {t(activeMeta.titleEn, conv(activeMeta.titleZh))}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
            {conv(activeMeta.subtitleZh)}
          </p>
        </div>

        {/* ================================================================= */}
        {/* 1. PRE-UNDERWRITING QUICK TRIAGE & ALL-PLAN MATCHER               */}
        {/* ================================================================= */}
        {currentToolId === 'PRE_UW' && (
          <div className="space-y-5">
            {/* 10 HK Conditions Selector */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-800">
                {t(
                  'Step 1 · Select Client Health Checkup Finding (10 Common HK Conditions):',
                  conv('第一步 · 點選客戶體檢或病歷狀況（香港最常見 10 大狀況）：')
                )}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRE_UW_CONDITION_PROFILES.map((c) => {
                  const active = c.code === conditionCode;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      data-testid={`pre-uw-cond-${c.code}`}
                      onClick={() => {
                        setConditionCode(c.code);
                        onUpdateLead(activeLead.id, (prev) => ({
                          ...prev,
                          healthTriageCode: c.code,
                        }));
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        active
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                      }`}
                    >
                      {lang === 'en' ? c.labelEn : conv(c.shortTagZh)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3 Severity Tiers */}
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
              {(
                [
                  { id: 'MILD_STABLE', titleZh: '輕微／已穩定控制', tone: 'emerald' },
                  { id: 'MODERATE_MONITORED', titleZh: '中度／定期覆診或服藥', tone: 'amber' },
                  { id: 'UNINVESTIGATED_HIGH', titleZh: '未查清／高風險指標', tone: 'rose' },
                ] as const
              ).map((sev) => {
                const active = uwSeverity === sev.id;
                const desc =
                  lang === 'en'
                    ? preUwResult.profile.severityLabelsEn[sev.id]
                    : conv(preUwResult.profile.severityLabelsZh[sev.id]);
                return (
                  <button
                    key={sev.id}
                    type="button"
                    onClick={() => setUwSeverity(sev.id)}
                    className={`rounded-xl border p-3.5 text-left transition-colors ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold">{conv(sev.titleZh)}</div>
                    <p
                      className={`mt-1 text-[11px] leading-relaxed ${
                        active ? 'text-slate-200' : 'text-slate-600'
                      }`}
                    >
                      {desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Required Reports + Active Plan Assessment */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3 lg:col-span-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-900">
                    {t(
                      'Required eHealth / Clinic Reports Before Submitting',
                      conv('遞單前必備「醫健通／私家化驗報告」清單')
                    )}
                  </h3>
                  <button
                    type="button"
                    data-testid="copy-preuw-whatsapp-btn"
                    onClick={() =>
                      handleCopyScript(
                        'preuw-wa',
                        preUwResult.whatsappRequestScriptZh,
                        '預先核保索取報告 WhatsApp'
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                  >
                    {copiedId === 'preuw-wa' ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>{t('Copy WhatsApp Request', conv('複製索取報告 WhatsApp'))}</span>
                  </button>
                </div>

                <ul className="space-y-2 text-xs leading-relaxed text-slate-700">
                  {(lang === 'en'
                    ? preUwResult.profile.requiredReportsEn
                    : preUwResult.profile.requiredReportsZh
                  ).map((rep, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-0.5 font-mono text-[11px] font-bold text-teal-800">
                        0{idx + 1}.
                      </span>
                      <span>{conv(rep)}</span>
                    </li>
                  ))}
                </ul>

                <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-3 text-[11px] leading-relaxed text-amber-950">
                  <strong className="font-bold">{conv('核保實戰貼士：')}</strong>
                  {lang === 'en'
                    ? preUwResult.profile.advisorCoachingTipEn
                    : conv(preUwResult.profile.advisorCoachingTipZh)}
                </div>
              </div>

              {/* 4 Product Lines Outcome Matrix + Current Active Plan Verdict */}
              <div className="space-y-3 lg:col-span-7">
                <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-900">
                      {conv('當前鎖定計劃預先核保評估：')}[{activePlan.insurerCode}]{' '}
                      {conv(activePlan.nameZh)}
                    </span>
                    <span className="font-mono font-bold text-teal-800">
                      {lang === 'en'
                        ? preUwResult.activePlanAssessment.fitBadgeEn
                        : conv(preUwResult.activePlanAssessment.fitBadgeZh)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-700">
                    {lang === 'en'
                      ? preUwResult.activePlanAssessment.rationaleEn
                      : conv(preUwResult.activePlanAssessment.rationaleZh)}
                  </p>
                  <p className="mt-1 font-mono text-[11px] font-medium text-teal-900">
                    {t(
                      `Standard Basis: HK$${preUwResult.activePlanAssessment.baseAnnualPremiumHkd.toLocaleString()}/yr -> Est. Underwritten: HK$${preUwResult.activePlanAssessment.estimatedUnderwrittenAnnualHkd.toLocaleString()}/yr`,
                      conv(
                        `標準參考年費 HK$${preUwResult.activePlanAssessment.baseAnnualPremiumHkd.toLocaleString()} → 預計核保後年費 HK$${preUwResult.activePlanAssessment.estimatedUnderwrittenAnnualHkd.toLocaleString()}`
                      )
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {(
                    [
                      {
                        labelZh: '自願醫保 VHIS ／ 高端醫療',
                        data: preUwResult.profile.outcomesBySeverity[uwSeverity].medicalVhis,
                      },
                      {
                        labelZh: '危疾保障（一筆過／多重）',
                        data: preUwResult.profile.outcomesBySeverity[uwSeverity].criticalIllness,
                      },
                      {
                        labelZh: '定期壽險 ／ 萬用壽險',
                        data: preUwResult.profile.outcomesBySeverity[uwSeverity].lifeTermUl,
                      },
                      {
                        labelZh: '多元貨幣儲蓄 ／ 扣稅年金 QDAP',
                        data: preUwResult.profile.outcomesBySeverity[uwSeverity].savingsQdap,
                      },
                    ] as const
                  ).map((box) => (
                    <div
                      key={box.labelZh}
                      className="rounded-xl border border-slate-200 bg-white p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-slate-900">{conv(box.labelZh)}</span>
                        <span className="font-mono text-[11px] font-bold text-teal-800">
                          {box.data.loadingPct > 0
                            ? `~+${box.data.loadingPct}%`
                            : box.data.outcome === 'GIO_NO_HEALTH_QUESTIONS'
                            ? 'GIO 免驗身'
                            : box.data.outcome}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600">
                        {lang === 'en' ? box.data.noteEn : conv(box.data.noteZh)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Matched Underwriting-Friendly Plans Across Catalog */}
            <div className="space-y-2.5 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-bold text-slate-900">
                {t(
                  `Best-Matched Friendly Plans in App Catalog for "${preUwResult.profile.labelEn}"`,
                  conv(`針對「${preUwResult.profile.shortTagZh}」全產品庫智能配對最友善計劃（一鍵切換主推）：`)
                )}
              </h3>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
                {preUwResult.matchedFriendlyPlans.map((item) => {
                  const isCurrent = item.plan.id === activePlan.id;
                  return (
                    <div
                      key={item.plan.id}
                      className={`flex flex-col justify-between rounded-xl border p-3 ${
                        isCurrent
                          ? 'border-emerald-600 bg-emerald-50/30'
                          : 'border-slate-200 bg-slate-50/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800">
                            [{item.plan.insurerCode}] {conv(item.plan.categoryLabelZh)}
                          </span>
                          <span className="font-mono font-semibold text-teal-800">
                            {lang === 'en' ? item.fitBadgeEn : conv(item.fitBadgeZh)}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900">
                          {lang === 'en' ? item.plan.nameEn : conv(item.plan.nameZh)}
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-600">
                          {lang === 'en' ? item.rationaleEn : conv(item.rationaleZh)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectPlanId(item.plan.id)}
                        className={`mt-2.5 w-full rounded-lg py-1.5 text-xs font-semibold ${
                          isCurrent
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {isCurrent ? conv('主推鎖定中') : conv('選用此友善計劃')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. UPCOMING BIRTHDAY & 180-DAY BACKDATE PREMIUM-SAVING RADAR      */}
        {/* ================================================================= */}
        {currentToolId === 'BACKDATE_RADAR' && (
          <div className="space-y-5">
            {/* Controls Bar: Active Client Birthday MM-DD + Sum Assured */}
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="backdate-bday-mmdd"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {conv(`${activeLead.fullNameZh} 生日月份日期 (MM-DD)`)}
                </label>
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    id="backdate-bday-mmdd"
                    type="text"
                    value={birthdayInputMmDd}
                    onChange={(e) => setBirthdayInputMmDd(e.target.value)}
                    placeholder="11-29"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (/^\d{2}-\d{2}$/.test(birthdayInputMmDd.trim())) {
                        onUpdateLead(activeLead.id, (prev) => ({
                          ...prev,
                          birthdayMonthDay: birthdayInputMmDd.trim(),
                        }));
                        onNotify?.(conv(`已更新 ${activeLead.fullNameZh} 生日為 ${birthdayInputMmDd.trim()}！`));
                      }
                    }}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                  >
                    {conv('更新')}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="backdate-sa-hkd"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {conv('對比投保額基準 (HKD)')}
                </label>
                <select
                  id="backdate-sa-hkd"
                  value={backdateSaHkd}
                  onChange={(e) => setBackdateSaHkd(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-slate-900"
                >
                  {[800000, 1000000, 1500000, 2000000, 3000000, 5000000].map((sa) => (
                    <option key={sa} value={sa}>
                      HK$ {sa.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col justify-center rounded-lg border border-emerald-200 bg-white px-3.5 py-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  {conv(`${activeLead.fullNameZh} 鎖定年輕一歲總共可慳：`)}
                </span>
                <span className="font-mono text-base font-bold text-emerald-700 tabular-nums">
                  HK$ {activeLeadBackdateRow.selectedPlanSaving.totalTermSavedHkd.toLocaleString()}
                </span>
              </div>
            </div>

            {/* All CRM Leads Radar Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[820px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 pl-3.5 pr-2 font-semibold">{conv('客戶姓名')}</th>
                    <th className="py-2.5 px-2 font-semibold">{conv('生日／窗口狀態')}</th>
                    <th className="py-2.5 px-2 font-semibold text-right">
                      {conv('年輕保齡年費 vs 轉齡後')}
                    </th>
                    <th className="py-2.5 px-2 font-semibold text-right">
                      {conv(`全期總共慳保費 (${activePlan.insurerCode})`)}
                    </th>
                    <th className="py-2.5 pl-2 pr-3.5 font-semibold text-right">
                      {conv('一鍵催單跟進')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backdateRows.map((row) => (
                    <tr
                      key={row.lead.id}
                      className={
                        row.lead.id === activeLead.id ? 'bg-teal-50/40' : 'hover:bg-slate-50'
                      }
                    >
                      <td className="py-3 pl-3.5 pr-2 font-bold text-slate-900">
                        <button
                          type="button"
                          onClick={() => onSelectLeadId(row.lead.id)}
                          className="text-left hover:underline"
                        >
                          {row.lead.fullNameZh} ({row.lead.age}歲)
                        </button>
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`font-semibold ${
                            row.windowStatus === 'UPCOMING_45D'
                              ? 'text-rose-700'
                              : row.windowStatus === 'BACKDATE_180D'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {conv(row.statusBadgeZh)}
                        </span>
                        <div className="font-mono text-[10px] text-slate-400">
                          MM-DD: {row.effectiveBirthdayMmDd}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-700">
                        HK${row.selectedPlanSaving.annualPremiumYoungerHkd.toLocaleString()} vs HK$
                        {row.selectedPlanSaving.annualPremiumOlderHkd.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-emerald-700 tabular-nums">
                        HK$ {row.selectedPlanSaving.totalTermSavedHkd.toLocaleString()}
                        <div className="text-[10px] font-normal text-slate-500">
                          ({row.selectedPlanSaving.paymentTermYears}年供款期計)
                        </div>
                      </td>
                      <td className="py-3 pl-2 pr-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyScript(
                              `bd-${row.lead.id}`,
                              row.whatsappReminderZh,
                              `${row.lead.fullNameZh} 轉保齡慳費提醒`
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          {copiedId === `bd-${row.lead.id}` ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>{conv('複製 WhatsApp 提醒')}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top Plans with Highest Backdate Savings for Active Lead */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-bold text-slate-900">
                {conv(
                  `全產品庫中「${activeLead.fullNameZh}」追溯／鎖定保齡慳費幅度最高代表計劃：`
                )}
              </h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {activeLeadBackdateRow.topMatchedPlans.map((item) => (
                  <button
                    key={item.plan.id}
                    type="button"
                    onClick={() => onSelectPlanId(item.plan.id)}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-left hover:border-teal-500 hover:bg-white"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate text-xs font-bold text-slate-900">
                        [{item.plan.insurerCode}] {conv(item.plan.nameZh)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.youngerAge}歲 vs {item.olderAge}歲 · 每年慳 HK$
                        {item.annualSavedHkd.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      <span className="block text-xs font-bold text-emerald-700 tabular-nums">
                        慳 HK${item.totalTermSavedHkd.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400">{item.paymentTermYears}年計</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 3. CORPORATE GROUP + VHIS DEDUCTIBLE SEAMLESS RELAY CALCULATOR    */}
        {/* ================================================================= */}
        {currentToolId === 'DEDUCTIBLE_RELAY' && (
          <div className="space-y-5">
            {/* Surgery Scenario + Group Cap + Deductible Tier Controls */}
            <div className="grid grid-cols-1 gap-3.5 rounded-xl border border-slate-200 bg-slate-50/80 p-4 lg:grid-cols-3">
              <div>
                <label
                  htmlFor="relay-surgery-select"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {conv('香港私家醫院真實手術收費情境')}
                </label>
                <select
                  id="relay-surgery-select"
                  value={surgeryScenarioId}
                  onChange={(e) => {
                    setSurgeryScenarioId(e.target.value);
                    setCustomSurgeryBillHkd('');
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
                >
                  {HK_PRIVATE_SURGERY_SCENARIOS.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {conv(sc.titleZh)} (HK${sc.estimatedTotalBillHkd.toLocaleString()})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  {conv(deductibleRelay.scenario.typicalBreakdownZh)}
                </p>
              </div>

              <div>
                <label
                  htmlFor="relay-group-cap"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {conv('客戶現有「公司團體醫保」每次手術賠償上限 (HK$)')}
                </label>
                <input
                  id="relay-group-cap"
                  type="number"
                  step={5000}
                  min={0}
                  value={employerGroupCapHkd}
                  onChange={(e) => setEmployerGroupCapHkd(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-900 tabular-nums"
                />
                <p className="mt-1 text-[11px] text-teal-800 font-medium">
                  {conv(
                    `智能建議墊底費：揀 HK$${deductibleRelay.recommendedDeductibleHkd.toLocaleString()} 可做到「零自付無縫接力」！`
                  )}
                </p>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700">
                  {conv('點選個人 VHIS ／ 高端醫保「每年墊底費 (Deductible)」')}
                </span>
                <div className="mt-1 grid grid-cols-5 gap-1">
                  {([0, 16000, 20000, 25000, 50000] as DeductibleTierHkd[]).map((tier) => {
                    const active = selectedDeductibleHkd === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        data-testid={`deductible-tier-${tier}`}
                        onClick={() => setSelectedDeductibleHkd(tier)}
                        className={`rounded-lg border py-1.5 font-mono text-xs font-bold tabular-nums ${
                          active
                            ? 'border-teal-700 bg-teal-700 text-white'
                            : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {tier === 0 ? '$0' : `$${tier / 1000}k`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Visual Horizontal Seamless Relay Diagram */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {conv(
                      `手術總賬單 HK$${deductibleRelay.totalBillHkd.toLocaleString()} · 兩單接力賠償圖解`
                    )}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {deductibleRelay.isSeamlessZeroOutOfPocket
                      ? conv(
                          `公司團保賠償 HK$${deductibleRelay.groupMedicalPayoutHkd.toLocaleString()} 已全數抵銷個人 VHIS 墊底費（HK$${deductibleRelay.selectedDeductibleHkd.toLocaleString()}），客戶自掏荷包 HK$0！`
                        )
                      : conv(
                          `注意：所選墊底費高於公司團保上限，中間尚有 HK$${deductibleRelay.clientNetOutOfPocketHkd.toLocaleString()} 自付差額（可改揀 HK$${deductibleRelay.recommendedDeductibleHkd.toLocaleString()} 消除差額）。`
                        )}
                  </p>
                </div>

                <button
                  type="button"
                  data-testid="copy-relay-whatsapp-btn"
                  onClick={() =>
                    handleCopyScript(
                      'relay-wa',
                      deductibleRelay.whatsappPitchZh,
                      '團保＋VHIS 墊底費接力試算'
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  {copiedId === 'relay-wa' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{conv('複製團保接力 WhatsApp 話術')}</span>
                </button>
              </div>

              {/* Proportional Stacked Bar */}
              <div className="flex h-9 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 font-mono text-xs font-bold text-white">
                {deductibleRelay.groupMedicalPayoutHkd > 0 && (
                  <div
                    style={{
                      width: `${Math.max(
                        12,
                        Math.round(
                          (deductibleRelay.groupMedicalPayoutHkd / deductibleRelay.totalBillHkd) *
                            100
                        )
                      )}%`,
                    }}
                    className="flex items-center justify-center bg-blue-700 px-2 truncate"
                  >
                    團保賠 ${deductibleRelay.groupMedicalPayoutHkd.toLocaleString()}
                  </div>
                )}
                {deductibleRelay.clientNetOutOfPocketHkd > 0 && (
                  <div
                    style={{
                      width: `${Math.max(
                        10,
                        Math.round(
                          (deductibleRelay.clientNetOutOfPocketHkd / deductibleRelay.totalBillHkd) *
                            100
                        )
                      )}%`,
                    }}
                    className="flex items-center justify-center bg-amber-600 px-2 truncate"
                  >
                    自付 ${deductibleRelay.clientNetOutOfPocketHkd.toLocaleString()}
                  </div>
                )}
                {deductibleRelay.personalVhisRelayPayoutHkd > 0 && (
                  <div className="flex flex-1 items-center justify-center bg-teal-700 px-2 truncate">
                    個人 VHIS 接力全賠 ${deductibleRelay.personalVhisRelayPayoutHkd.toLocaleString()}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs pt-1">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <span className="text-slate-500">{conv('若只靠公司團保需自付')}</span>
                  <div className="mt-0.5 font-mono text-sm font-bold text-rose-700 tabular-nums">
                    HK$ {deductibleRelay.withoutPersonalVhisShortfallHkd.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg bg-blue-50/70 p-2.5">
                  <span className="text-slate-600">{conv('公司團保抵銷墊底費')}</span>
                  <div className="mt-0.5 font-mono text-sm font-bold text-blue-800 tabular-nums">
                    HK$ {deductibleRelay.deductibleAbsorbedByGroupHkd.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg bg-teal-50/70 p-2.5">
                  <span className="text-slate-600">{conv('個人 VHIS 接力賠償')}</span>
                  <div className="mt-0.5 font-mono text-sm font-bold text-teal-800 tabular-nums">
                    HK$ {deductibleRelay.personalVhisRelayPayoutHkd.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2.5">
                  <span className="text-slate-700 font-semibold">{conv('客戶最終自掏荷包')}</span>
                  <div className="mt-0.5 font-mono text-sm font-bold text-emerald-800 tabular-nums">
                    HK$ {deductibleRelay.clientNetOutOfPocketHkd.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Matched VHIS & High-End Medical Plans Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[820px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 pl-3.5 pr-2 font-semibold">
                      {conv(`配對醫療／自願醫保計劃 (${deductibleRelay.matchedMedicalPlans.length} 款)`)}
                    </th>
                    <th className="py-2.5 px-2 font-semibold text-right">{conv('$0 墊底費年費')}</th>
                    <th className="py-2.5 px-2 font-semibold text-right">
                      {conv(`揀 $${selectedDeductibleHkd.toLocaleString()} 墊底費年費`)}
                    </th>
                    <th className="py-2.5 px-2 font-semibold text-right">
                      {conv('扣稅後實付 ／ 退休前總共慳')}
                    </th>
                    <th className="py-2.5 pl-2 pr-3.5 font-semibold text-right">{conv('操作')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deductibleRelay.matchedMedicalPlans.slice(0, 12).map((row) => {
                    const isLocked = row.plan.id === activePlan.id;
                    return (
                      <tr
                        key={row.plan.id}
                        className={isLocked ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}
                      >
                        <td className="py-2.5 pl-3.5 pr-2">
                          <div className="font-bold text-slate-900">
                            [{row.plan.insurerCode}] {conv(row.plan.nameZh)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {conv(row.retirementZeroUwStepDownNoteZh)}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-500 tabular-nums">
                          HK$ {row.zeroDeductibleAnnualHkd.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-teal-800 tabular-nums">
                          HK$ {row.selectedDeductibleAnnualHkd.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                          <div className="font-bold text-emerald-700">
                            實付 HK${row.netEffectiveAnnualAfterTaxHkd.toLocaleString()}/年
                          </div>
                          <div className="text-[10px] text-slate-500">
                            在職合共慳 HK${row.workingYearsTotalSavedHkd.toLocaleString()}
                          </div>
                        </td>
                        <td className="py-2.5 pl-2 pr-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onSelectPlanId(row.plan.id)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                              isLocked
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                          >
                            {isLocked ? conv('主推中') : conv('選用此醫保')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 4. POLICY SPLIT + UNLIMITED CHANGE OF INSURED TIMELINE            */}
        {/* ================================================================= */}
        {currentToolId === 'POLICY_SPLIT' && (
          <div className="space-y-5">
            {/* Savings Plan & Split Parameters */}
            <div className="grid grid-cols-1 gap-3.5 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="split-savings-plan"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {conv(`選擇儲蓄／萬用壽險 (${splitSimulation.compatibleSavingsPlans.length} 款)`)}
                </label>
                <select
                  id="split-savings-plan"
                  value={splitSimulation.selectedPlan.id}
                  onChange={(e) => onSelectPlanId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                >
                  {splitSimulation.compatibleSavingsPlans.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      [{sp.insurerCode}] {conv(sp.nameZh)}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-teal-800 font-medium">
                  {conv(
                    `最早第 ${splitSimulation.earliestSplitYearAllowed} 年可分拆 · ${splitSimulation.supportedCurrencyCountLabelZh}`
                  )}
                </span>
              </div>

              <div>
                <label
                  htmlFor="split-annual-prem"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {conv(`每年儲蓄供款 (${currency})`)}
                </label>
                <input
                  id="split-annual-prem"
                  type="number"
                  step={5000}
                  min={10000}
                  value={splitAnnualPrem}
                  onChange={(e) =>
                    setSplitAnnualPrem(Math.max(10000, Number(e.target.value) || 10000))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-900 tabular-nums"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700">
                  {conv('供款年期')}
                </span>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  {([5, 10] as const).map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setSplitTermYears(yr)}
                      className={`rounded-lg border py-1.5 font-mono text-xs font-bold ${
                        splitTermYears === yr
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      {yr} 年供款
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700">
                  {conv('啟動「保單分拆」保單年度')}
                </span>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {([5, 8, 10] as const).map((sYr) => (
                    <button
                      key={sYr}
                      type="button"
                      onClick={() => setChosenSplitYear(sYr)}
                      className={`rounded-lg border py-1.5 font-mono text-xs font-bold ${
                        chosenSplitYear === sYr
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      第 {sYr} 年
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3 Family Split Sleeves Allocator */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {splitSimulation.buckets.map((b, idx) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-900">{conv(b.holderLabelZh)}</span>
                    <span className="font-mono font-bold text-teal-800">{b.allocationPct}%</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {conv('目標貨幣：')}
                    <strong className="font-mono text-slate-800">{b.targetCurrency}</strong> ·{' '}
                    {conv(b.purposeZh)}
                  </p>
                  <input
                    type="range"
                    aria-label={b.holderLabelZh}
                    min={10}
                    max={80}
                    step={5}
                    value={splitBuckets[idx]?.allocationPct ?? b.allocationPct}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSplitBuckets((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, allocationPct: val } : item
                        )
                      );
                    }}
                    className="w-full accent-teal-700"
                  />
                </div>
              ))}
            </div>

            {/* 4-Stage Multi-Generational Split Timeline */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {conv(
                    `總供款本金 ${currency} ${splitSimulation.totalPrincipalPaid.toLocaleString()} · GL28 合規演示回報率 ${splitSimulation.effectiveIllustratedIrrPct}%`
                  )}
                </span>
                <button
                  type="button"
                  data-testid="copy-split-whatsapp-btn"
                  onClick={() =>
                    handleCopyScript(
                      'split-wa',
                      splitSimulation.whatsappLegacySummaryZh,
                      '保單分拆跨代傳承摘要'
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  {copiedId === 'split-wa' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{conv('複製傳承時間軸 WhatsApp')}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                {splitSimulation.milestones.map((ms) => (
                  <div
                    key={ms.policyYear}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="font-bold text-teal-800">
                          YEAR {ms.policyYear}（{ms.clientAge}歲）
                        </span>
                        <span className="font-semibold text-slate-600">
                          {conv(ms.actionBadgeZh)}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">{conv(ms.titleZh)}</h4>
                      <p className="text-[11px] leading-relaxed text-slate-600">
                        {conv(ms.descriptionZh)}
                      </p>
                    </div>

                    <div className="space-y-1.5 border-t border-slate-200 pt-2.5">
                      <div className="flex items-baseline justify-between font-mono text-xs">
                        <span className="text-slate-500">{conv('預期總退保價值')}</span>
                        <span className="font-bold text-slate-900 tabular-nums">
                          {currency} {ms.masterOrCombinedValue.toLocaleString()}
                        </span>
                      </div>
                      {ms.bucketValues.map((bv) => (
                        <div
                          key={bv.id}
                          className="flex items-center justify-between text-[11px] text-slate-600"
                        >
                          <span className="truncate pr-2">
                            {conv(bv.holderLabelZh.split('（')[0])} ({bv.allocationPct}%)
                          </span>
                          <span className="font-mono font-semibold text-teal-800 tabular-nums shrink-0">
                            {currency} {bv.projectedValueInBaseCurrency.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 5. CLAIMS & CASHLESS LOG CHECKLIST (INSTANT WHATSAPP COPY)        */}
        {/* ================================================================= */}
        {currentToolId === 'CLAIMS_CHECKLIST' && (
          <div className="space-y-4">
            {/* 4 Claim Scenarios */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  { id: 'PRIVATE_INPATIENT_LOG', labelZh: '1. 私家醫院入院免找數 (LOG)' },
                  { id: 'DAY_CASE_ENDOSCOPY', labelZh: '2. 日間腸胃鏡／微創小手術' },
                  { id: 'ACCIDENT_OUTPATIENT_PHYSIO', labelZh: '3. 意外門診／物理治療／MRI' },
                  { id: 'CRITICAL_ILLNESS_LUMP_SUM', labelZh: '4. 危疾確診一筆過現金索償' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`claim-scenario-${tab.id}`}
                  onClick={() => setClaimScenarioId(tab.id)}
                  className={`rounded-xl border px-3.5 py-2.5 text-left text-xs font-bold transition-colors ${
                    claimScenarioId === tab.id
                      ? 'border-teal-700 bg-teal-700 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-white'
                  }`}
                >
                  {conv(tab.labelZh)}
                </button>
              ))}
            </div>

            {/* Matched Insurer Channel & Turnaround Banner */}
            <div className="flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50/50 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1 text-xs">
                <div className="font-bold text-slate-900">
                  {conv('專屬遞交渠道：')}
                  <span className="text-teal-900">{conv(claimsChecklist.insurerChannelZh)}</span>
                </div>
                <div className="text-slate-600">
                  {conv('預計處理時效：')}
                  {conv(claimsChecklist.insurerTurnaroundZh)}
                </div>
                <div className="text-[11px] font-medium text-amber-900">
                  {conv(claimsChecklist.planSpecificAlertZh)}
                </div>
              </div>

              <button
                type="button"
                data-testid="copy-claims-checklist-whatsapp-btn"
                onClick={() =>
                  handleCopyScript(
                    'claims-wa',
                    claimsChecklist.whatsappChecklistMessageZh,
                    claimsChecklist.scenarioTitleZh
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B172A] px-4 py-2.5 text-xs font-bold text-[#F3D37A] hover:bg-[#162B4A] whitespace-nowrap shrink-0"
              >
                {copiedId === 'claims-wa' ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span>{conv('一鍵複製個人化 WhatsApp 理賠清單')}</span>
              </button>
            </div>

            {/* Interactive Document Checklist Rows */}
            <div className="space-y-2">
              {claimsChecklist.items.map((item) => {
                const checked = Boolean(checkedClaimDocs[item.id]);
                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-xs transition-colors ${
                      checked
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-slate-200 bg-white hover:bg-slate-50/70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setCheckedClaimDocs((prev) => ({ ...prev, [item.id]: !checked }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-teal-700"
                    />
                    <div className="space-y-0.5">
                      <span className="font-mono text-[10px] font-bold text-teal-800">
                        {item.group === 'CLIENT_DOCS'
                          ? conv('【客戶準備文件】')
                          : item.group === 'DOCTOR_WORDING'
                          ? conv('【主診醫生關鍵字眼】')
                          : conv('【正本收據防伏提醒】')}
                      </span>
                      <p className="whitespace-pre-line leading-relaxed text-slate-800 font-medium">
                        {lang === 'en' ? item.textEn : conv(item.textZh)}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 6. MULTI-CURRENCY & CREDIT CARD / eDDA / PREPAY PERKS OPTIMIZER   */}
        {/* ================================================================= */}
        {currentToolId === 'PAYMENT_PERKS' && (
          <div className="space-y-5">
            {/* Input Bar */}
            <div className="grid grid-cols-1 gap-3.5 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="pay-gross-hkd"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {conv('首年應繳保費基準 (HK$ 等值)')}
                </label>
                <input
                  id="pay-gross-hkd"
                  type="number"
                  step={5000}
                  min={3000}
                  value={paymentBasisHkd}
                  onChange={(e) =>
                    setPaymentBasisHkd(Math.max(3000, Number(e.target.value) || 3000))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-900 tabular-nums"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700">
                  {conv('保單結算貨幣')}
                </span>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {(['USD', 'HKD', 'RMB'] as CurrencyCode[]).map((c) => {
                    const supported = activePlan.currencies.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        disabled={!supported}
                        onClick={() => setPaymentCurr(c)}
                        className={`rounded-lg border py-1.5 font-mono text-xs font-bold ${
                          paymentCurr === c
                            ? 'border-teal-700 bg-teal-700 text-white'
                            : supported
                            ? 'border-slate-300 bg-white text-slate-800'
                            : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="pay-card-rebate"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {conv(`客戶信用卡回贈／里數折算率 (${cardPerkPct.toFixed(1)}%)`)}
                </label>
                <input
                  id="pay-card-rebate"
                  type="range"
                  min={0}
                  max={3}
                  step={0.5}
                  value={cardPerkPct}
                  onChange={(e) => setCardPerkPct(Number(e.target.value))}
                  className="mt-2.5 w-full accent-teal-700"
                />
              </div>

              <div className="flex flex-col justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={includePrepay5Y}
                    onChange={(e) => setIncludePrepay5Y(e.target.checked)}
                    className="h-4 w-4 rounded accent-teal-700"
                  />
                  <span>{conv('疊加 5 年保費預繳保證鎖息優惠')}</span>
                </label>
                <button
                  type="button"
                  data-testid="copy-payment-whatsapp-btn"
                  onClick={() =>
                    handleCopyScript(
                      'payment-wa',
                      paymentComparison.whatsappPaymentSummaryZh,
                      '多幣種及交費優惠攻略'
                    )
                  }
                  className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  {copiedId === 'payment-wa' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{conv('複製交費優惠 WhatsApp')}</span>
                </button>
              </div>
            </div>

            {/* Active Insurer Promo Callout if Available */}
            {paymentComparison.insurerOfferHeadlineZh && (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50/80 px-4 py-3 text-xs text-amber-950">
                <ShieldCheck className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                <div>
                  <strong>{conv('已自動套用當前保司季度優惠：')}</strong>
                  {conv(paymentComparison.insurerOfferHeadlineZh)}（首年保費回贈{' '}
                  {paymentComparison.insurerFirstYearRebatePct}%
                  {paymentComparison.prepaidInterestRatePct
                    ? ` · 預繳保證年息 ${paymentComparison.prepaidInterestRatePct}%`
                    : ''}
                  ）
                </div>
              </div>
            )}

            {/* Multi-Currency FX & GL28 Cap Row */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {paymentComparison.currencyRows.map((cr) => (
                <div
                  key={cr.currency}
                  className={`rounded-xl border p-3.5 space-y-1 ${
                    cr.currency === paymentCurr
                      ? 'border-teal-700 bg-teal-50/30'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-900">
                      {cr.currency} {cr.annualPremiumNative.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {cr.insurerCounterFxSpreadHkd > 0
                        ? `牌價匯差約 HK$${cr.insurerCounterFxSpreadHkd.toLocaleString()}`
                        : '本地港元零匯差'}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-teal-800">
                    {conv(cr.gl28CapLabelZh)}
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    {conv(cr.recommendationZh)}
                  </p>
                </div>
              ))}
            </div>

            {/* 6 HK Payment Channels Ranked Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[840px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 pl-3.5 pr-2 font-semibold">{conv('繳費渠道（按最抵淨支出排序）')}</th>
                    <th className="py-2.5 px-2 font-semibold text-right">{conv('行政費／匯差成本')}</th>
                    <th className="py-2.5 px-2 font-semibold text-right">{conv('銀行／信用卡回贈')}</th>
                    <th className="py-2.5 px-2 font-semibold text-right">{conv('保司回贈＋預繳息')}</th>
                    <th className="py-2.5 pl-2 pr-3.5 font-semibold text-right">
                      {conv('首年實際淨支出 (HK$)')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paymentComparison.paymentChannels.map((ch, idx) => (
                    <tr
                      key={ch.channelId}
                      className={idx === 0 ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}
                    >
                      <td className="py-3 pl-3.5 pr-2">
                        <div className="flex flex-wrap items-center gap-1.5 font-bold text-slate-900">
                          {idx === 0 && (
                            <CheckCircle2
                              className="h-3.5 w-3.5 text-emerald-700 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          <span>{lang === 'en' ? ch.titleEn : conv(ch.titleZh)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {conv(ch.suitabilityBadgeZh)} · {conv(ch.notesZh)}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-rose-700 tabular-nums">
                        +HK$ {(ch.adminOrWireFeeHkd + ch.fxSpreadCostHkd).toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-teal-800 tabular-nums">
                        -HK$ {ch.cardOrBankPerkValueHkd.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-emerald-700 tabular-nums">
                        -HK${' '}
                        {(
                          ch.insurerFirstYearRebateHkd + ch.prepaidGuaranteedInterestYear1Hkd
                        ).toLocaleString()}
                      </td>
                      <td className="py-3 pl-2 pr-3.5 text-right font-mono tabular-nums">
                        <div className="text-sm font-bold text-slate-900">
                          HK$ {ch.netFirstYearEffectiveOutlayHkd.toLocaleString()}
                        </div>
                        {ch.totalNetBenefitVsStandardHkd > 0 && (
                          <div className="text-[10px] font-semibold text-emerald-700">
                            合共慳 HK${ch.totalNetBenefitVsStandardHkd.toLocaleString()}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
