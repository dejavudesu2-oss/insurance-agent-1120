import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  Coins,
  Layers,
  Lock,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  X,
} from 'lucide-react';
import { HK_PRIVATE_HOSPITALS_LOG } from '../data/hkMarketIntelData';
import {
  BundleRiderId,
  CLAIM_SCENARIO_PRESETS,
  ClaimScenarioId,
  evaluateDynamicSchemeBenchmarks,
  evaluatePlanMatchedRiderQuotes,
  getSchemeMeta,
  MODULAR_RIDER_OPTIONS,
  SIX_PROTECTION_DIMENSIONS,
} from '../domain/clientGapEngine';
import { ensureLeadCartDefaults, UnifiedDealValuation } from '../domain/dealCaseEngine';
import {
  filterClaimScenariosForBoughtPlans,
  GuidedStageKey,
  GuidedStepGateResult,
} from '../domain/guidedWorkflowEngine';
import { evaluateDealHospitalLogPass } from '../domain/hospitalLogMatcher';
import { localizePlanStrings, toSimplifiedChinese, useLanguage } from '../domain/i18n';
import { projectInflatedMedicalCost } from '../domain/proEnhancementsEngine';
import {
  ClientLead,
  InsurancePlan,
  IntermediaryProfile,
  MedicalInflationRatePct,
  SavedToolSnapshot,
} from '../domain/types';
import { GuidedStepFooter } from './GuidedStepFooter';
import { Stage3QuickCalculatorsDrawer } from './Stage3QuickCalculatorsDrawer';
import { AllScenariosClaimComparisonChart } from './VisualCharts';

interface DualCurrencySimulatorViewProps {
  leads: ClientLead[];
  selectedLeadId: string;
  onSelectLeadId: (leadId: string) => void;
  onUpdateLead: (leadId: string, updater: (prev: ClientLead) => ClientLead) => void;
  plans: InsurancePlan[];
  selectedPlanId: string;
  onSelectPlanId: (planId: string) => void;
  intermediary: IntermediaryProfile;
  paymentTermYears: number;
  onChangePaymentTermYears: (yrs: number) => void;
  unifiedDeal: UnifiedDealValuation;
  onLaunchStp: () => void;
  onJumpToSection: (section: 'profile' | 'market' | 'subagents') => void;
  onOpenPosterModal?: () => void;
  fxRateStamp?: string;
  onOpenPromoFxConsole?: () => void;
  expressMeetingMode?: boolean;
  step3Confirmed?: boolean;
  onConfirmStep3?: () => void;
  stepGate?: GuidedStepGateResult;
  onGoNextStage?: (next: GuidedStageKey) => void;
  onToggleComboPlan?: (planId: string) => void;
  onNotify?: (msg: string) => void;
}

export const DualCurrencySimulatorView: React.FC<DualCurrencySimulatorViewProps> = ({
  leads,
  selectedLeadId,
  onUpdateLead,
  plans,
  onSelectPlanId,
  onChangePaymentTermYears,
  unifiedDeal,
  onLaunchStp,
  onJumpToSection,
  onOpenPosterModal,
  fxRateStamp,
  onOpenPromoFxConsole,
  expressMeetingMode = false,
  step3Confirmed = false,
  onConfirmStep3,
  stepGate,
  onGoNextStage,
  onToggleComboPlan,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zhHk: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk);
  const [showQuickCalcs, setShowQuickCalcs] = useState(false);

  const activeLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || leads[0],
    [leads, selectedLeadId]
  );

  const explicitPlan = unifiedDeal.anchorPlan;
  const selectedRiders = unifiedDeal.selectedRiderIds;
  const paymentMode = unifiedDeal.cart.paymentMode;
  const cartTermYears = unifiedDeal.cart.paymentTermYears;
  const fxRate = unifiedDeal.cart.fxRateHkdToRmb;
  const sim = unifiedDeal.bundleSim;
  const comboSecondaryPlans = unifiedDeal.comboSecondaryPlans || [];
  const comboNetSecondaryHkd = unifiedDeal.comboNetSecondaryHkd || 0;

  // Strictly match claim stress scenarios to the EXACT insurance plan(s) bought
  const matchedClaimMatrix = useMemo(
    () =>
      filterClaimScenariosForBoughtPlans({
        allScenarios: unifiedDeal.allScenariosComparison,
        anchorPlan: explicitPlan,
        comboSecondaryPlans,
        selectedRiderIds: selectedRiders,
      }),
    [unifiedDeal.allScenariosComparison, explicitPlan, comboSecondaryPlans, selectedRiders]
  );

  const scenarioId: ClaimScenarioId = matchedClaimMatrix.relevantScenarioIds.includes(
    sim.scenarioOutcome.scenario.id
  )
    ? sim.scenarioOutcome.scenario.id
    : matchedClaimMatrix.relevantScenarioIds[0] || sim.scenarioOutcome.scenario.id;

  const activeMatchedComparison = useMemo(
    () =>
      matchedClaimMatrix.relevantScenarios.find((s) => s.scenarioId === scenarioId) ||
      matchedClaimMatrix.relevantScenarios[0] ||
      null,
    [matchedClaimMatrix.relevantScenarios, scenarioId]
  );

  const activeScenarioPreset = useMemo(
    () =>
      CLAIM_SCENARIO_PRESETS.find((sc) => sc.id === scenarioId) || sim.scenarioOutcome.scenario,
    [scenarioId, sim.scenarioOutcome.scenario]
  );

  const medicalInflationPct: MedicalInflationRatePct =
    unifiedDeal.cart.medicalInflationRatePct ?? 0;
  const medicalProjectionYears = unifiedDeal.cart.medicalProjectionYears ?? 15;

  const effectiveEventCostHkd =
    activeMatchedComparison?.totalClaimCostHkd ?? sim.scenarioOutcome.totalEventCostHkd;
  const effectiveExistingPayoutHkd =
    activeMatchedComparison?.existingPayoutHkd ?? sim.scenarioOutcome.existingPolicyPayoutHkd;
  const effectiveNewBundlePayoutHkd =
    activeMatchedComparison?.newBundlePayoutHkd ?? sim.scenarioOutcome.newBundlePayoutHkd;
  const effectiveSurplusBufferHkd = Math.max(
    0,
    effectiveExistingPayoutHkd + effectiveNewBundlePayoutHkd - effectiveEventCostHkd
  );

  const inflatedMed = useMemo(
    () =>
      projectInflatedMedicalCost({
        baseCostTodayHkd: effectiveEventCostHkd,
        existingPayoutHkd: effectiveExistingPayoutHkd,
        newBundlePayoutHkd: effectiveNewBundlePayoutHkd,
        inflationRatePct: medicalInflationPct,
        horizonYears: medicalProjectionYears,
      }),
    [
      effectiveEventCostHkd,
      effectiveExistingPayoutHkd,
      effectiveNewBundlePayoutHkd,
      medicalInflationPct,
      medicalProjectionYears,
    ]
  );

  const schemeMeta = getSchemeMeta(activeLead.targetSchemeId);
  const clientBudgetHkd = activeLead.annualBudgetHkd ?? 48000;

  const matchedSchemeBenchmark = useMemo(() => {
    const all = evaluateDynamicSchemeBenchmarks({
      lead: activeLead,
      allPlans: plans,
      fxRateHkdToRmb: fxRate,
    });
    return all.find((b) => b.scheme.id === schemeMeta.id) || all[0];
  }, [activeLead, plans, fxRate, schemeMeta.id]);

  const planMatchedRiders = useMemo(
    () =>
      evaluatePlanMatchedRiderQuotes({
        lead: activeLead,
        selectedPlan: explicitPlan,
        selectedRiderIds: selectedRiders,
        fxRateHkdToRmb: fxRate,
      }),
    [activeLead, explicitPlan, selectedRiders, fxRate]
  );

  const hospitalLogPass = useMemo(
    () =>
      evaluateDealHospitalLogPass({
        anchorPlan: explicitPlan,
        selectedRiderIds: selectedRiders,
        hospital: HK_PRIVATE_HOSPITALS_LOG[0],
        clientAge: activeLead.age,
        isSmoker: activeLead.isSmoker,
        deductibleHkd: unifiedDeal.cart.hospitalDeductibleHkd ?? 0,
        allPlans: plans,
      }),
    [explicitPlan, selectedRiders, activeLead.age, activeLead.isSmoker, unifiedDeal.cart.hospitalDeductibleHkd, plans]
  );

  const updateCart = (
    updater: (cart: NonNullable<ClientLead['proposalCart']>) => NonNullable<ClientLead['proposalCart']>
  ) => {
    onUpdateLead(activeLead.id, (prev) => {
      const safe = ensureLeadCartDefaults(prev);
      return {
        ...safe,
        proposalCart: updater(safe.proposalCart!),
        lastContactIso: new Date().toISOString(),
      };
    });
  };

  const toggleRider = (riderId: BundleRiderId) => {
    const matchedItem = planMatchedRiders.find((r) => r.spec.id === riderId);
    const riderMeta = matchedItem?.spec || MODULAR_RIDER_OPTIONS.find((r) => r.id === riderId);
    const dynamicHkd = matchedItem?.annualPremiumHkd ?? riderMeta?.baseAnnualHkd ?? 0;
    const willRemove = selectedRiders.includes(riderId);
    updateCart((cart) => {
      const exists = cart.selectedRiderIds.includes(riderId);
      return {
        ...cart,
        selectedRiderIds: exists
          ? cart.selectedRiderIds.filter((id) => id !== riderId)
          : [...cart.selectedRiderIds, riderId],
      };
    });
    if (riderMeta) {
      onNotify?.(
        willRemove
          ? t(
              `Removed rider "${riderMeta.titleEn}" — Stage 01 Radar & Cart updated.`,
              conv(`已移除附約「${riderMeta.titleZh}」，六軸雷達與購物車保費已同步更新。`)
            )
          : t(
              `Added rider "${riderMeta.titleEn}" (+HK$${dynamicHkd.toLocaleString()}) — synced across Stages 01–05.`,
              conv(`已加購附約「${riderMeta.titleZh}」（+HK$${dynamicHkd.toLocaleString()}），已同步更新 01–05。`)
            )
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-slate-900"
            style={{ textWrap: 'balance' }}
          >
            {t(
              '03A. Dual-Currency Proposal Cart, Rider Bundling & Claim Stress Matrix',
              conv('03A. 雙幣互動保費購物車、附約整併與全景理賠壓力測試')
            )}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {t(
              `Live Proposal Cart for ${activeLead.fullNameEn} (${activeLead.age}y) — Toggling riders immediately updates Stage 01 6-Axis Radar, Stage 04 Case Deck, and Stage 05 Bundled STP e-Sign.`,
              conv(
                `「${activeLead.fullNameZh} (${activeLead.age} 歲)」即時提案購物車 — 勾選附約或調整匯率即同步更新 01 六軸缺口雷達、04 個案簡報及 05 連附約電子簽單保費。`
              )
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onJumpToSection('market')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <span>{t('← 02 Change Plan', conv('← 返回 02 更換計劃'))}</span>
          </button>
          {!expressMeetingMode && (
            <button
              type="button"
              data-testid="toggle-stage3-quick-calcs-btn"
              onClick={() => setShowQuickCalcs((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Calculator className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
              <span>
                {showQuickCalcs
                  ? t('Hide Extra Calculators', conv('收起進階計算機'))
                  : t('Optional Calculators', conv('選用進階計算機'))}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showQuickCalcs ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      </div>

      {/* Optional Quick-Calculator Drawer (Collapsed by default so Step 03 stays focused) */}
      {!expressMeetingMode && showQuickCalcs && (
        <Stage3QuickCalculatorsDrawer
          activeLead={activeLead}
          onSaveSnapshotToLead={(snap: SavedToolSnapshot) => {
            onUpdateLead(activeLead.id, (prev) => ({
              ...prev,
              savedSnapshots: [snap, ...(prev.savedSnapshots || [])].slice(0, 20),
            }));
          }}
          onOpenPosterModal={() => onOpenPosterModal?.()}
          onNotify={onNotify}
        />
      )}

      {/* Synced Client, Anchor Plan & Dual FX Controls */}
      <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xs">
        {explicitPlan ? (
          <div
            data-testid="sim-locked-plan-banner"
            className="vh-harbour-surface flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs text-white"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-[#F3D37A]">
                {t('STEP 1 · MATCHED MAIN PLAN:', conv('步驟 1 · 已配對主約計劃：'))}
              </span>
              <span className="font-bold text-white">
                [{explicitPlan.insurerCode}] {localizePlanStrings(explicitPlan, lang).planName}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-teal-300">
                {localizePlanStrings(explicitPlan, lang).categoryLabel}
              </span>
              <span className="text-slate-400">·</span>
              <span className="font-mono text-slate-200 tabular-nums">
                {t('Base Plan:', conv('主約年保費：'))} HK$ {sim.basePlanAnnualHkd.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onJumpToSection('market')}
                className="rounded-md border border-[#D4AF37]/40 bg-[#102038] px-2.5 py-1 text-[11px] font-semibold text-[#F3D37A] hover:bg-[#162B4A] whitespace-nowrap"
              >
                {t('Full 02 Catalog', conv('02 全部產品庫'))}
              </button>
              <button
                type="button"
                onClick={() => onSelectPlanId('')}
                className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap"
              >
                {t('Clear Plan', conv('解除鎖定'))}
              </button>
            </div>
          </div>
        ) : (
          <div
            data-testid="sim-locked-plan-banner"
            className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50/90 px-5 py-2.5 text-xs text-amber-950"
          >
            <span className="font-medium">
              {t(
                `Step 1: Match an anchor insurer plan FIRST below (currently using ${schemeMeta.titleEn} benchmark) so riders & Private Hospital Cashless LOG adapt to the exact insurer.`,
                conv(
                  `步驟 1：請先於下方一鍵配對具體保司主約（目前暫以「${schemeMeta.titleZh}」基準試算），系統將自動適配該保司附約與私院免找數資格！`
                )
              )}
            </span>
            <button
              type="button"
              onClick={() => onJumpToSection('market')}
              className="font-semibold text-teal-900 hover:underline whitespace-nowrap"
            >
              {t('Browse All 237 Plans in 02 →', conv('或前往 02 瀏覽全部計劃 →'))}
            </button>
          </div>
        )}

        {/* Quick Step-1 Anchor Plan Matcher Bar */}
        <div
          data-testid="sim-step1-plan-matcher"
          className="flex flex-col gap-2.5 border-b border-slate-200 bg-slate-50/80 px-5 py-3 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
              {t('Quick Match Plan First:', conv('一鍵配對代表主約：'))}
            </span>
            {matchedSchemeBenchmark?.matchedRepresentativePlans.map((cand) => {
              const active = explicitPlan?.id === cand.id;
              return (
                <button
                  key={cand.id}
                  type="button"
                  onClick={() => {
                    onSelectPlanId(cand.id);
                    onNotify?.(
                      t(
                        `Matched main plan [${cand.insurerCode}] ${cand.nameEn} — riders & LOG pass updated.`,
                        conv(`已配對主約 [${cand.insurerCode}] ${cand.nameZh}，下方附約購物車與免找數通行證已同步適配！`)
                      )
                    );
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'border-[#D4AF37] bg-[#0B172A] text-[#F3D37A]'
                      : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400'
                  }`}
                >
                  [{cand.insurerCode}] {lang === 'en' ? cand.nameEn : conv(cand.nameZh)}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="sim-quick-plan-select" className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">
              {t('Switch Any Plan:', conv('切換其他計劃：'))}
            </label>
            <select
              id="sim-quick-plan-select"
              value={explicitPlan?.id || ''}
              onChange={(e) => {
                const pid = e.target.value;
                onSelectPlanId(pid);
              }}
              className="max-w-[240px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-teal-600 focus:outline-none"
            >
              <option value="">
                {t(`-- Scheme Baseline (${schemeMeta.titleEn}) --`, conv(`-- 架構基準 (${schemeMeta.titleZh}) --`))}
              </option>
              {plans.slice(0, 60).map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.insurerCode}] {lang === 'en' ? p.nameEn : conv(p.nameZh)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Multi-Plan Portfolio Combo Bar (#5) */}
        <div
          data-testid="sim-combo-portfolio-bar"
          className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-indigo-50/40 px-5 py-2.5 text-xs"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-bold text-indigo-900">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('Multi-Plan Portfolio Combo:', conv('多保單協同組合（主約＋互補副約）：'))}</span>
            </span>
            {comboSecondaryPlans.length > 0 ? (
              comboSecondaryPlans.map((cp) => (
                <span
                  key={cp.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-2.5 py-1 font-semibold text-indigo-950"
                >
                  <span>
                    [{cp.insurerCode}] {lang === 'en' ? cp.nameEn : conv(cp.nameZh)}
                  </span>
                  {onToggleComboPlan && (
                    <button
                      type="button"
                      aria-label={`Remove ${cp.nameEn} from combo`}
                      onClick={() => onToggleComboPlan(cp.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </span>
              ))
            ) : (
              <span className="text-slate-600">
                {t(
                  'Single main plan + riders (add a 2nd VHIS or CI base plan for multi-policy discount)',
                  conv('目前為單一主約＋附約（可一鍵配搭互補 VHIS／危疾副約享多保單折扣）')
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {comboNetSecondaryHkd > 0 && (
              <span className="font-mono font-bold text-indigo-800 tabular-nums">
                +HK$ {comboNetSecondaryHkd.toLocaleString()} / {t('yr', '年')}
              </span>
            )}
            <button
              type="button"
              onClick={() => onJumpToSection('market')}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-900 hover:bg-indigo-50 whitespace-nowrap"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              <span>{t('Add Combo Plan in 02', conv('於 02 加配組合保單'))}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">

          <div>
            <label htmlFor="sim-term-select" className="block text-xs font-semibold text-slate-700">
              {t('Payment Term & Mode', conv('供款年期與繳費方式'))}
            </label>
            <div className="mt-1 flex items-center gap-2">
              <select
                id="sim-term-select"
                value={cartTermYears}
                onChange={(e) => {
                  const yrs = Number(e.target.value);
                  onChangePaymentTermYears(yrs);
                  updateCart((cart) => ({ ...cart, paymentTermYears: yrs }));
                }}
                className="flex-1 rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {[5, 10, 15, 20].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr} {t('Years', '年期')}
                  </option>
                ))}
              </select>
              <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => updateCart((cart) => ({ ...cart, paymentMode: 'ANNUAL' }))}
                  className={`rounded-md px-2.5 py-1.5 font-semibold whitespace-nowrap ${
                    paymentMode === 'ANNUAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {t('Annual', '年繳')}
                </button>
                <button
                  type="button"
                  onClick={() => updateCart((cart) => ({ ...cart, paymentMode: 'MONTHLY' }))}
                  className={`rounded-md px-2.5 py-1.5 font-semibold whitespace-nowrap ${
                    paymentMode === 'MONTHLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {t('Monthly', '月繳')}
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="sim-fx-rate" className="block text-xs font-semibold text-slate-700">
                {t('HKD → RMB Live FX Rate', conv('雙幣即時匯率 (1 HKD =)'))}
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-700 tabular-nums">
                  ¥ {fxRate.toFixed(3)}
                </span>
                {onOpenPromoFxConsole && (
                  <button
                    type="button"
                    onClick={onOpenPromoFxConsole}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                  >
                    <Lock className="h-2.5 w-2.5 text-teal-700" aria-hidden="true" />
                    <span>{t('Rate-Lock', conv('牌價鎖定'))}</span>
                  </button>
                )}
              </div>
            </div>
            <input
              id="sim-fx-rate"
              type="range"
              min={0.85}
              max={0.98}
              step={0.005}
              value={fxRate}
              onChange={(e) => {
                const nextFx = Number(e.target.value);
                updateCart((cart) => ({ ...cart, fxRateHkdToRmb: nextFx }));
              }}
              className="mt-2.5 w-full accent-blue-700"
            />
            {fxRateStamp && (
              <div className="mt-1 font-mono text-[10px] text-slate-500 tabular-nums">
                {fxRateStamp}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Dual-Currency Premium Breakdown KPIs + Budget Meter */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 border-t-4 border-t-slate-800 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Coins className="h-3.5 w-3.5 text-slate-800" aria-hidden="true" />
            <span>{t('Bundled Annual Premium (HKD)', conv('整併後年度總保費 (HKD)'))}</span>
          </div>
          <div
            data-testid="sim-net-annual-hkd"
            className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums"
          >
            HK$ {sim.netAnnualPremiumHkd.toLocaleString()}
          </div>
          <div className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
            {t('Monthly:', conv('折合每月：'))} HK$ {sim.monthlyEquivalentHkd.toLocaleString()} / mo
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 border-t-4 border-t-teal-600 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Calculator className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
            <span>{t('RMB / USD Dual Equivalent', conv('人民幣 / 美元雙幣等值'))}</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-teal-800 tabular-nums">
            ¥ {sim.netAnnualPremiumRmb.toLocaleString()}
          </div>
          <div className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
            ≈ USD ${sim.netAnnualPremiumUsd.toLocaleString()} / yr (¥ {sim.monthlyEquivalentRmb.toLocaleString()}/mo)
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 border-t-4 border-t-emerald-600 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-600">
            {t('Bundling Discount & IRD Tax Relief', conv('多附約組合優惠及扣稅節省'))}
          </div>
          <div className="mt-2 font-mono text-xl font-bold text-emerald-700 tabular-nums whitespace-nowrap">
            -{sim.bundleDiscountPct}% · -HK$ {sim.estimatedTaxSavedHkd.toLocaleString()}
          </div>
          <div className="mt-1.5 font-mono text-xs text-slate-600 tabular-nums">
            {t('After-tax net:', conv('扣稅後淨成本：'))} HK${' '}
            {sim.effectiveAfterTaxAnnualHkd.toLocaleString()} (¥{' '}
            {sim.effectiveAfterTaxAnnualRmb.toLocaleString()})
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 border-t-4 border-t-amber-500 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>{t('Client Budget Utilization', conv('客戶預算佔用率'))}</span>
            <span
              className={`font-mono font-bold tabular-nums ${
                sim.withinClientBudget ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {sim.budgetUtilizationPct}%
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all ${
                sim.withinClientBudget ? 'bg-emerald-600' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, sim.budgetUtilizationPct)}%` }}
            />
          </div>
          <div className="mt-2 font-mono text-xs text-slate-600 tabular-nums">
            {sim.withinClientBudget
              ? t(
                  `Within HK$${clientBudgetHkd.toLocaleString()} budget`,
                  conv(`符合 HK$ ${clientBudgetHkd.toLocaleString()} 預算`)
                )
              : t(
                  `Exceeds HK$${clientBudgetHkd.toLocaleString()} budget`,
                  conv(`超出 HK$ ${clientBudgetHkd.toLocaleString()} 預算`)
                )}
          </div>
        </div>
      </div>

      {/* Main Split: Rider Bundling vs Claim Scenario Simulator (PC & iPad Parity) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Left: Plan-Matched Modular Rider Bundling + Cashless Hospital LOG Pass Check */}
        <section className="md:col-span-5 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xs">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-700" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {t(
                    'Step 2 · Plan-Matched Rider Cart (Synced 01–05)',
                    conv('步驟 2 · 模組化附約購物車（先配對主約 · 跨 01–05 同步）')
                  )}
                </h2>
                <p className="text-[11px] text-slate-600">
                  {explicitPlan
                    ? t(
                        `Adapted to [${explicitPlan.insurerCode}] ${explicitPlan.nameEn} · Age ${activeLead.age} rates`,
                        conv(`已按主約 [${explicitPlan.insurerCode}] ${explicitPlan.nameZh} 及 ${activeLead.age} 歲費率智能適配`)
                      )
                    : t(
                        'Match a main plan in Step 1 above to lock insurer-specific rider rules',
                        conv('建議先於上方「步驟 1」點選主約計劃，以檢視同保司附約重疊與直掛資格')
                      )}
                </p>
              </div>
            </div>
            <span className="font-mono text-xs font-semibold text-indigo-800 tabular-nums shrink-0">
              {selectedRiders.length} {t('Active', '項啟用')}
            </span>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-2.5" data-testid="plan-matched-rider-list">
              {planMatchedRiders.map((item) => {
                const { spec: rider, checked } = item;
                const isBuiltIn = item.planMatchStatus === 'BUILT_IN_MAIN_PLAN';
                return (
                  <button
                    key={rider.id}
                    type="button"
                    data-testid={`rider-toggle-${rider.id}`}
                    aria-pressed={checked}
                    onClick={() => toggleRider(rider.id)}
                    className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                      checked
                        ? 'border-blue-700 bg-blue-50/60'
                        : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? 'border-blue-700 bg-blue-700 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" aria-hidden="true" />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900">
                          {lang === 'en' ? item.displayTitleEn : conv(item.displayTitleZh)}
                        </div>
                        <div
                          className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            isBuiltIn
                              ? 'bg-amber-100 text-amber-950'
                              : explicitPlan
                              ? 'bg-teal-50 text-teal-900'
                              : 'bg-slate-200/70 text-slate-700'
                          }`}
                        >
                          {lang === 'en' ? item.matchBadgeEn : conv(item.matchBadgeZh)}
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                          {t(rider.descriptionEn, conv(rider.descriptionZh))}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right font-mono tabular-nums">
                      <div className="text-xs font-bold text-slate-900">
                        +HK$ {item.annualPremiumHkd.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-medium text-slate-500">
                        ≈ ¥ {item.annualPremiumRmb.toLocaleString()}
                      </div>
                      <div className="mt-0.5 text-[10px] text-teal-800">
                        {lang === 'en' ? item.pricingNoteEn : conv(item.pricingNoteZh)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Plan-Matched Private Hospital Cashless LOG Pass Status */}
            <div
              data-testid="sim-hospital-log-pass-card"
              className={`rounded-xl border p-3.5 space-y-2.5 ${
                hospitalLogPass.eligibleForCashlessLog
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-amber-300 bg-amber-50/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {t(
                      'Private Hospital Cashless LOG Pre-Auth Pass',
                      conv('私家醫院免找數預批通行證（按已配對計劃核實）')
                    )}
                  </div>
                  <p
                    className={`mt-0.5 text-[11px] font-semibold ${
                      hospitalLogPass.eligibleForCashlessLog ? 'text-emerald-900' : 'text-amber-900'
                    }`}
                  >
                    {lang === 'en'
                      ? hospitalLogPass.statusHeadlineEn
                      : conv(hospitalLogPass.statusHeadlineZh)}
                  </p>
                </div>
                {onOpenPosterModal && (
                  <button
                    type="button"
                    onClick={onOpenPosterModal}
                    className="rounded-lg bg-[#0B172A] px-2.5 py-1.5 text-[11px] font-semibold text-[#F3D37A] hover:bg-[#162B4A] whitespace-nowrap shrink-0"
                  >
                    {t('9:16 Pass Poster', conv('預覽免找數長圖'))}
                  </button>
                )}
              </div>

              {!hospitalLogPass.eligibleForCashlessLog && (
                <div className="space-y-1.5 border-t border-amber-200/80 pt-2">
                  <div className="text-[10px] font-bold text-amber-950">
                    {t(
                      'Match a Medical Plan First or Attach VHIS Rider to Unlock HK$0 Cashless LOG:',
                      conv('請先配對醫療計劃或加掛 VHIS 附約，方可解鎖私家醫院 HK$ 0 免找數入院：')
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {hospitalLogPass.recommendedMedicalPlans.slice(0, 2).map((opt) => (
                      <button
                        key={opt.plan.id}
                        type="button"
                        onClick={() => {
                          onSelectPlanId(opt.plan.id);
                          onNotify?.(
                            t(
                              `Matched [${opt.plan.insurerCode}] ${opt.plan.nameEn} — Cashless Hospital LOG Pass unlocked!`,
                              conv(
                                `已配對醫療計劃 [${opt.plan.insurerCode}] ${opt.plan.nameZh}，已解鎖私家醫院 HK$ 0 免找數預批通行證！`
                              )
                            )
                          );
                        }}
                        className="rounded-md border border-amber-400 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-900 hover:bg-amber-100 whitespace-nowrap"
                      >
                        {t('Match', conv('配對'))} [{opt.plan.insurerCode}]{' '}
                        {lang === 'en' ? opt.plan.nameEn : conv(opt.plan.nameZh)} · HK$
                        {opt.annualPremiumHkd.toLocaleString()}/{t('yr', '年')}
                      </button>
                    ))}
                    {!selectedRiders.includes('RIDER_SEMI_PRIVATE_VHIS') && (
                      <button
                        type="button"
                        onClick={() => toggleRider('RIDER_SEMI_PRIVATE_VHIS')}
                        className="rounded-md bg-teal-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
                      >
                        {t('+ Attach Semi-Private VHIS Rider', conv('+ 一鍵加掛半私家 VHIS 附約'))}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Live 6-Dimension Combined Coverage Totals */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
              <h3 className="text-xs font-bold text-slate-800">
                {t('Post-Bundling Total Protection Pools (Existing + New)', conv('整併後六大保障總額度（含既有保單）'))}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {SIX_PROTECTION_DIMENSIONS.map((dim) => {
                  const row = unifiedDeal.gapAudit.rows.find((r) => r.dimensionId === dim.id);
                  const combHkd = row ? row.combinedCoverHkd : sim.totalCombinedDimensionCoverHkd[dim.id];
                  return (
                    <div
                      key={dim.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 border border-slate-200"
                    >
                      <span className="truncate text-slate-600">{t(dim.labelEn, conv(dim.labelZh))}</span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums shrink-0">
                        HK$ {Math.round(combHkd / 10000)}萬
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Right: Product-Gated Claim Stress Matrix — ONLY shown when exact insurance plan(s) are selected */}
        {matchedClaimMatrix.hasExactBoughtPlan ? (
          <section
            data-testid="claim-stress-matrix-panel"
            className="md:col-span-7 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-5 py-3.5 text-white">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-teal-400" aria-hidden="true" />
                <h2 className="text-sm font-bold text-white">
                  {t(
                    'All-Crisis Claim Stress Matrix & Payout Simulator',
                    conv('全景理賠危機壓力測試矩陣與賠付明細')
                  )}
                </h2>
              </div>
              <span className="font-mono text-xs font-medium text-teal-300">
                {activeLead.fullNameZh} ({activeLead.age}
                {t('y', '歲')})
              </span>
            </div>
            <div className="p-5 space-y-4">
              {/* Product-matched explanation banner */}
              <div
                data-testid="claim-matrix-matched-banner"
                className="rounded-lg border border-teal-200 bg-teal-50/70 px-3.5 py-2 text-xs font-semibold text-teal-950"
              >
                {t(matchedClaimMatrix.explanationEn, conv(matchedClaimMatrix.explanationZh))}
              </div>

              <AllScenariosClaimComparisonChart
                items={matchedClaimMatrix.relevantScenarios}
                activeScenarioId={scenarioId}
                onSelectScenario={(nextId: ClaimScenarioId) =>
                  updateCart((cart) => ({ ...cart, claimScenarioId: nextId }))
                }
                fxRateHkdToRmb={fxRate}
              />

              <div className="flex flex-wrap gap-1.5">
                {CLAIM_SCENARIO_PRESETS.filter((sc) =>
                  matchedClaimMatrix.relevantScenarioIds.includes(sc.id)
                ).map((sc) => {
                  const active = sc.id === scenarioId;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      data-testid={`claim-scenario-btn-${sc.id}`}
                      aria-pressed={active}
                      onClick={() => updateCart((cart) => ({ ...cart, claimScenarioId: sc.id }))}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {t(sc.titleEn, conv(sc.titleZh))}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Healthcare Inflation Toggle (only for medical/CI hospital scenarios) */}
              {(scenarioId === 'HOSPITAL_MIN_INVASIVE' || scenarioId === 'CANCER_TARGETED_24M') && (
                <div
                  data-testid="medical-inflation-escalator"
                  className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <TrendingUp className="h-4 w-4 text-rose-600 shrink-0" aria-hidden="true" />
                    <div>
                      <div className="font-bold text-slate-900">
                        {t(
                          `HK Private Healthcare Inflation Stress (${medicalProjectionYears}-Yr Horizon)`,
                          conv(`香港私家醫療通脹壓力測試（模擬 ${medicalProjectionYears} 年後帳單膨脹）`)
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {medicalInflationPct === 0
                          ? t('Showing 2026 baseline private hospital charges', conv('目前以 2026 今日私院收費基準計算'))
                          : t(
                              `At ${medicalInflationPct}% p.a., bill rises +HK$${inflatedMed.inflationErosionHkd.toLocaleString()} in ${medicalProjectionYears} yrs`,
                              conv(
                                `按每年 ${medicalInflationPct}% 醫療通脹，${medicalProjectionYears} 年後同款手術帳單將暴增 +HK$ ${inflatedMed.inflationErosionHkd.toLocaleString()}`
                              )
                            )}
                      </p>
                    </div>
                  </div>

                  <div
                    role="group"
                    aria-label="Healthcare inflation rate selector"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-xs shrink-0"
                  >
                    {(
                      [
                        { pct: 0 as MedicalInflationRatePct, labelEn: '0% Today', labelZh: '0% 今日' },
                        { pct: 5 as MedicalInflationRatePct, labelEn: '5% Mild', labelZh: '5% 溫和' },
                        { pct: 7 as MedicalInflationRatePct, labelEn: '7% HK Med', labelZh: '7% 私院通脹' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.pct}
                        type="button"
                        data-testid={`med-inflation-btn-${opt.pct}`}
                        aria-pressed={medicalInflationPct === opt.pct}
                        onClick={() =>
                          updateCart((cart) => ({
                            ...cart,
                            medicalInflationRatePct: opt.pct,
                            medicalProjectionYears: 15,
                          }))
                        }
                        className={`rounded-md px-2.5 py-1 font-mono text-[11px] font-bold whitespace-nowrap tabular-nums ${
                          medicalInflationPct === opt.pct
                            ? opt.pct > 0
                              ? 'bg-rose-700 text-white'
                              : 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t(opt.labelEn, conv(opt.labelZh))}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Scenario Outcome Detail */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                <div>
                  <div className="text-xs font-bold text-blue-700">
                    {t(
                      activeScenarioPreset.hospitalOrSettingEn,
                      conv(activeScenarioPreset.hospitalOrSettingZh)
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {t(
                      activeScenarioPreset.descriptionEn,
                      conv(activeScenarioPreset.descriptionZh)
                    )}
                  </p>
                </div>

                <div className="space-y-2.5 font-mono text-xs tabular-nums">
                  <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-slate-200">
                    <span className="font-sans font-medium text-slate-700">
                      {medicalInflationPct > 0 &&
                      (scenarioId === 'HOSPITAL_MIN_INVASIVE' || scenarioId === 'CANCER_TARGETED_24M')
                        ? t(
                            `Projected Bill in ${medicalProjectionYears} Yrs (@${medicalInflationPct}% p.a.)`,
                            conv(`${medicalProjectionYears} 年後通脹後醫療帳單（@${medicalInflationPct}%/年）`)
                          )
                        : t('Total Hospital / Income Loss (Today)', conv('總醫療帳單／家庭開支需求（今日物價）'))}
                    </span>
                    <span className="font-bold text-slate-900">
                      HK${' '}
                      {(medicalInflationPct > 0 &&
                      (scenarioId === 'HOSPITAL_MIN_INVASIVE' || scenarioId === 'CANCER_TARGETED_24M')
                        ? inflatedMed.projectedFutureBillHkd
                        : effectiveEventCostHkd
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-slate-200">
                    <span className="font-sans font-medium text-slate-700">
                      {t('Existing Policy Payout Only', conv('既有保單／團保可賠付額'))}
                    </span>
                    <span className="font-bold text-slate-700">
                      HK$ {effectiveExistingPayoutHkd.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 border border-blue-200">
                    <span className="font-sans font-semibold text-blue-900">
                      {t('Selected Plan & Riders Payout', conv('已選投保計劃及附約對應賠付'))}
                    </span>
                    <span className="font-bold text-blue-700">
                      +HK$ {effectiveNewBundlePayoutHkd.toLocaleString()}
                    </span>
                  </div>

                  <div
                    className={`flex items-center justify-between rounded-lg px-3.5 py-3 border ${
                      inflatedMed.projectedOutOfPocketHkd === 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-sans font-bold">
                      {inflatedMed.projectedOutOfPocketHkd === 0 ? (
                        <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-amber-700" aria-hidden="true" />
                      )}
                      <span>
                        {inflatedMed.projectedOutOfPocketHkd === 0
                          ? t('Client Out-of-Pocket: HK$0 (Fully Protected)', conv('客戶最終自付金額：HK$ 0（100% 無憂覆蓋）'))
                          : t('Remaining Out-of-Pocket Gap', conv('尚餘客戶自付缺口'))}
                      </span>
                    </div>
                    <span className="font-bold">
                      HK$ {inflatedMed.projectedOutOfPocketHkd.toLocaleString()} (¥{' '}
                      {Math.round(inflatedMed.projectedOutOfPocketHkd * fxRate).toLocaleString()})
                    </span>
                  </div>

                  {medicalInflationPct === 0 && effectiveSurplusBufferHkd > 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 font-sans text-xs text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
                      <span>
                        {t(
                          `Additional cash recovery buffer retained by family: HK$${effectiveSurplusBufferHkd.toLocaleString()}`,
                          conv(
                            `除清償帳單外，客戶家庭額外保留康復／生活緩衝現金：HK$ ${effectiveSurplusBufferHkd.toLocaleString()}`
                          )
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section
            data-testid="claim-matrix-requires-plan-gate"
            className="md:col-span-7 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 p-8 text-center space-y-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <Lock className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h2 className="text-base font-bold text-slate-900">
                {t(
                  'Select an Exact Insurance Plan First',
                  conv('請先揀選具體投保計劃，才會顯示對應理賠測試')
                )}
              </h2>
              <p className="text-xs leading-relaxed text-slate-600">
                {t(
                  'To avoid showing irrelevant claim scenarios, the Claim Stress Matrix & Payout Simulator only displays payouts that directly match the exact insurance plan(s) selected in Step 02.',
                  conv(
                    '為免顯示無關的保障項目，系統只會在您於第 02 步揀選客戶實際投保的具體計劃後，才按該產品種類（例如醫保只顯示住院醫療理賠、儲蓄只顯示退休現金流）自動生成對應的理賠壓力測試。'
                  )
                )}
              </p>
            </div>
            <button
              type="button"
              data-testid="claim-gate-go-stage2-btn"
              onClick={() => onJumpToSection('market')}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-[#F3D37A] hover:bg-slate-800"
            >
              <span>{t('Go to Step 02: Select Insurance Plan', conv('前往第 02 步揀選保險計劃'))}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </section>
        )}
      </div>

      {/* Action-Gated Step 03 Footer */}
      {stepGate && onGoNextStage && (
        <GuidedStepFooter
          gate={stepGate}
          onGoNext={onGoNextStage}
          onGoBack={() => onJumpToSection('market')}
          backLabelZh="返回第 02 步挑選計劃"
          backLabelEn="Back to Step 02"
          showPrimaryAction={Boolean(explicitPlan) && !step3Confirmed}
          primaryActionLabelZh="確認保費與附約配搭"
          primaryActionLabelEn="Confirm Premium & Bundle"
          onPrimaryAction={() => onConfirmStep3?.()}
          testIdPrefix="stage3-guided"
        />
      )}
    </div>
  );
};
