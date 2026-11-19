import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  ExternalLink,
  EyeOff,
  FileCheck,
  Search,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import {
  calculateIrdSalariesTaxRelief,
  calculatePracticeBreakEven,
} from '../domain/actuarialEngine';
import { evaluateHospitalLogPlanOptions } from '../domain/hospitalLogMatcher';
import {
  evaluateProcedureShortfallAndClaim,
  HK_SURGICAL_PROCEDURES,
} from '../domain/advisoryEngines';
import { derivePlanSyncProfile } from '../domain/crmAndCatalogTaxonomy';
import { localizePlanStrings, toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  ClientLead,
  HospitalDeductibleHkd,
  HospitalWardTier,
  InsurancePlan,
} from '../domain/types';
import {
  DEFAULT_PRACTICE_COST_MODEL,
  DH_PHF_OFFICIAL_REGISTRY_URL,
  HK_GN16_DISCLOSURE_REGISTRY,
  HK_PRIVATE_HOSPITALS_LOG,
} from '../data/hkMarketIntelData';
import { StackedBillWaterfallBar } from './VisualCharts';
import { SurgeonAndSlaBenchmarksPanel } from './TwentyUpgradesHub';
import { scrollToElementSmooth } from '../utils/clipboardAndDom';

interface MarketIntelViewProps {
  clientSafeMode: boolean;
  onToggleClientSafeMode: () => void;
  totalCatalogPlansCount: number;
  plans: InsurancePlan[];
  activeLead: ClientLead;
  comparedPlanIds: string[];
  onToggleComparePlan: (planId: string) => void;
  onSignupPlanInStp: (planId: string) => void;
  selectedPlanId?: string;
  onSelectPlanId?: (planId: string) => void;
  initialTab?: IntelTab;
  onNotify?: (msg: string) => void;
}

export type IntelTab =
  | 'hospitals'
  | 'procedures_claims'
  | 'surgeon_sla'
  | 'gn16_tax'
  | 'provenance_roi';

export const MarketIntelView: React.FC<MarketIntelViewProps> = ({
  clientSafeMode,
  onToggleClientSafeMode,
  totalCatalogPlansCount,
  plans,
  activeLead,
  comparedPlanIds,
  onToggleComparePlan,
  onSignupPlanInStp,
  selectedPlanId = '',
  onSelectPlanId,
  initialTab = 'hospitals',
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<IntelTab>(initialTab);
  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const syncedPlan = useMemo(
    () => (selectedPlanId ? plans.find((p) => p.id === selectedPlanId) || null : null),
    [plans, selectedPlanId]
  );

  // Procedure Shortfall & Dual-Policy Claim Concierge State (07 imp-client-2 / 08 FN-08)
  const [procId, setProcId] = useState<string>(HK_SURGICAL_PROCEDURES[0].id);
  const [procSetting, setProcSetting] = useState<
    'DAY_CASE_NETWORK' | 'HOSPITAL_STANDARD_WARD' | 'HOSPITAL_PRIVATE_ROOM'
  >('HOSPITAL_STANDARD_WARD');
  const [employerGroupLimitHkd, setEmployerGroupLimitHkd] = useState<number>(25000);
  const [personalTier, setPersonalTier] = useState<
    'NONE' | 'VHIS_STANDARD' | 'VHIS_FLEXI_SMM' | 'HIGH_END_MEDICAL'
  >('VHIS_FLEXI_SMM');
  const [procDeductibleHkd, setProcDeductibleHkd] = useState<HospitalDeductibleHkd>(20000);

  // Tab 1: Hospital LOG Plan Sign-Up Matcher & Filter State
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(
    HK_PRIVATE_HOSPITALS_LOG[0].recordId
  );
  const [desiredWard, setDesiredWard] = useState<HospitalWardTier>('SEMI_PRIVATE');
  const [deductibleHkd, setDeductibleHkd] = useState<HospitalDeductibleHkd>(0);
  const [showAllLogPlans, setShowAllLogPlans] = useState<boolean>(false);

  const [districtFilter, setDistrictFilter] = useState<
    'ALL' | 'HK_ISLAND' | 'KOWLOON' | 'NEW_TERRITORIES'
  >('ALL');
  const [hospitalSearch, setHospitalSearch] = useState('');

  // Tab 2: IRD Cap. 112 s.26ZZD Tax Calculator & GN16 Search State
  const [netChargeableIncomeHkd, setNetChargeableIncomeHkd] = useState<number>(480000);
  const [filingStatus, setFilingStatus] = useState<'SINGLE' | 'MARRIED_JOINT'>('MARRIED_JOINT');
  const [qdapAnnualPremiumHkd, setQdapAnnualPremiumHkd] = useState<number>(120000);
  const [vhisInsuredCount, setVhisInsuredCount] = useState<number>(2);
  const [vhisTotalPremiumHkd, setVhisTotalPremiumHkd] = useState<number>(18000);
  const [gn16Search, setGn16Search] = useState('');

  // Auto-calibrate Section 06 medical & tax controls whenever selectedPlanId changes
  React.useEffect(() => {
    if (!syncedPlan) return;
    const syncProf = derivePlanSyncProfile(syncedPlan, activeLead);
    if (!syncProf) return;
    setPersonalTier(syncProf.personalMedicalTier);
    setDesiredWard(syncProf.recommendedWard);
    if (syncProf.isVhisTaxEligible) {
      setProcDeductibleHkd(0);
    }
  }, [syncedPlan?.id]);

  // Tab 3: Practice Cost & Break-Even Calculator State
  const [advisorPriceHkd, setAdvisorPriceHkd] = useState<number>(
    DEFAULT_PRACTICE_COST_MODEL.advisorProMonthlyPriceHkd
  );
  const [teamPriceHkd, setTeamPriceHkd] = useState<number>(
    DEFAULT_PRACTICE_COST_MODEL.agencyTeamMonthlyPriceHkd
  );
  const [founderSalaryHkd, setFounderSalaryHkd] = useState<number>(
    DEFAULT_PRACTICE_COST_MODEL.founderSalaryHkd
  );
  const [monthlyChurnPct, setMonthlyChurnPct] = useState<number>(
    DEFAULT_PRACTICE_COST_MODEL.defaultChurnPercent
  );

  const activeHospital = useMemo(
    () =>
      HK_PRIVATE_HOSPITALS_LOG.find((h) => h.recordId === selectedHospitalId) ||
      HK_PRIVATE_HOSPITALS_LOG[0],
    [selectedHospitalId]
  );

  const hospitalSignupOptions = useMemo(
    () =>
      evaluateHospitalLogPlanOptions({
        hospital: activeHospital,
        desiredWard,
        deductibleHkd,
        clientAge: activeLead?.age ?? 35,
        isSmoker: activeLead?.isSmoker ?? false,
        plans,
      }),
    [activeHospital, desiredWard, deductibleHkd, activeLead, plans]
  );

  const visibleHospitalSignupOptions = showAllLogPlans
    ? hospitalSignupOptions
    : hospitalSignupOptions.slice(0, 6);

  const filteredHospitals = useMemo(() => {
    const q = hospitalSearch.trim().toLowerCase();
    return HK_PRIVATE_HOSPITALS_LOG.filter((h) => {
      if (districtFilter !== 'ALL' && h.district !== districtFilter) return false;
      if (!q) return true;
      const raw = `${h.hospitalNameZh} ${h.hospitalNameEn} ${h.recordId} ${h.auditNote}`;
      return `${raw} ${toSimplifiedChinese(raw)}`.toLowerCase().includes(q);
    });
  }, [districtFilter, hospitalSearch]);

  const filteredGn16 = useMemo(() => {
    const q = gn16Search.trim().toLowerCase();
    if (!q) return HK_GN16_DISCLOSURE_REGISTRY;
    return HK_GN16_DISCLOSURE_REGISTRY.filter((item) => {
      const raw = `${item.insurerNameZh} ${item.insurerNameEn} ${item.productSeriesZh} ${item.productSeriesEn}`;
      return `${raw} ${toSimplifiedChinese(raw)}`.toLowerCase().includes(q);
    });
  }, [gn16Search]);

  const taxRelief = useMemo(
    () =>
      calculateIrdSalariesTaxRelief({
        annualNetChargeableIncomeHkd: netChargeableIncomeHkd,
        filingStatus,
        qdapAnnualPremiumHkd,
        vhisInsuredCount,
        vhisTotalPremiumHkd,
      }),
    [
      netChargeableIncomeHkd,
      filingStatus,
      qdapAnnualPremiumHkd,
      vhisInsuredCount,
      vhisTotalPremiumHkd,
    ]
  );

  const practiceBreakEven = useMemo(
    () =>
      calculatePracticeBreakEven({
        leanFixedOverheadHkd: DEFAULT_PRACTICE_COST_MODEL.leanFixedOverheadHkd,
        founderSalaryHkd,
        advisorProMonthlyPriceHkd: advisorPriceHkd,
        agencyTeamMonthlyPriceHkd: teamPriceHkd,
        agencyTeamSeats: DEFAULT_PRACTICE_COST_MODEL.agencyTeamSeats,
        stripePercentageRate: DEFAULT_PRACTICE_COST_MODEL.stripePercentageRate,
        stripeFixedFeeHkd: DEFAULT_PRACTICE_COST_MODEL.stripeFixedFeeHkd,
        variableCostPerSeatHkd: DEFAULT_PRACTICE_COST_MODEL.variableCostPerSeatHkd,
        monthlyChurnPercent: monthlyChurnPct,
      }),
    [advisorPriceHkd, teamPriceHkd, founderSalaryHkd, monthlyChurnPct]
  );

  const procShortfall = useMemo(
    () =>
      evaluateProcedureShortfallAndClaim({
        procedureId: procId,
        setting: procSetting,
        employerGroupLimitHkd,
        personalPlanTier: personalTier,
        personalDeductibleHkd: procDeductibleHkd,
      }),
    [procId, procSetting, employerGroupLimitHkd, personalTier, procDeductibleHkd]
  );

  const formatWardLabel = (tier: HospitalWardTier) => {
    if (tier === 'PRIVATE_ROOM') return t('Private Room', '私家房');
    if (tier === 'SEMI_PRIVATE') return t('Semi-Private', '半私家房');
    return t('Standard Ward', '普通房');
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
              'Private Hospital Cashless LOG Plan Matcher, GN16 & Tax Hub',
              '全港私家醫院免找數（LOG）選單配對、GN16 實現率及扣稅中心'
            )}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {t(
              'Compare which VHIS / medical plan to sign up for across ward classes & deductibles at all 13 Cap. 633 private hospitals, plus official GN16 portals & IRD Cap. 112 tax relief.',
              '按心儀私家醫院、病房級別（普通房／半私家／私家房）及自付費選項，即時評估邊份醫保可享 HK$0 免找數入院並一鍵投保。'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleClientSafeMode}
          aria-pressed={clientSafeMode}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            clientSafeMode
              ? 'border-amber-600 bg-amber-50 text-amber-900'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {clientSafeMode
              ? t('Client Safe Mode ON', '匿名見客模式已開啟')
              : t('Enable Client Safe Mode', '開啟見客匿名鎖')}
          </span>
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Market intelligence modules"
        className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
      >
        <button
          type="button"
          role="tab"
          data-testid="intel-tab-hospitals"
          aria-selected={activeTab === 'hospitals'}
          onClick={() => setActiveTab('hospitals')}
          className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 ${
            activeTab === 'hospitals'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {t('Private Hospital LOG & Plan Options', '13間私院免找數及投保方案選擇')}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          data-testid="intel-tab-procedures-claims"
          aria-selected={activeTab === 'procedures_claims'}
          onClick={() => setActiveTab('procedures_claims')}
          className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 ${
            activeTab === 'procedures_claims'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('Procedure Shortfall & Dual Claim', '手術賠償差額及雙保單索償')}</span>
        </button>

        <button
          type="button"
          role="tab"
          data-testid="intel-tab-surgeon-sla"
          aria-selected={activeTab === 'surgeon_sla'}
          onClick={() => setActiveTab('surgeon_sla')}
          className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 ${
            activeTab === 'surgeon_sla'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {t('Surgeon Fee Median & SLA (IMP-03/14)', '醫生手術費中位數及核保時效')}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          data-testid="intel-tab-gn16-tax"
          aria-selected={activeTab === 'gn16_tax'}
          onClick={() => setActiveTab('gn16_tax')}
          className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 ${
            activeTab === 'gn16_tax'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('GN16 Registry & IRD Tax', 'GN16 實現率及扣稅計算')}</span>
        </button>

        <button
          type="button"
          role="tab"
          data-testid="intel-tab-provenance-roi"
          aria-selected={activeTab === 'provenance_roi'}
          onClick={() => setActiveTab('provenance_roi')}
          className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 ${
            activeTab === 'provenance_roi'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('Provenance & Practice ROI', '數據出處審計及損益')}</span>
        </button>
      </div>

      {/* MERGED IMP-03 & IMP-14 TAB: SURGEON FEE MEDIAN BENCHMARK + INSURER SLA THERMOMETER */}
      {activeTab === 'surgeon_sla' && <SurgeonAndSlaBenchmarksPanel mode="BOTH" />}

      {/* TAB 1B: PROCEDURE SHORTFALL VISUALIZER & DUAL-POLICY CLAIM SEQUENCE (07 imp-client-2 + 08 FN-08) */}
      {activeTab === 'procedures_claims' && (
        <section
          aria-label="Private Hospital Procedure Shortfall Visualizer and Dual-Policy Claim Concierge"
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
        >
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">
              {t(
                'Private Hospital Surgical Package Shortfall & Dual-Policy Claim Sequence (07 + FN-08)',
                '常見私家手術賠償差額透視器及「公司醫保 → 個人 VHIS」雙重索償管家'
              )}
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              {t(
                'Compares Day-Case Network Centre vs. Hospital Inpatient medical-necessity rules and calculates exact out-of-pocket co-pay after coordinating Employer Group Medical + Personal VHIS.',
                '即時對比「指定日間內視鏡／手術中心」與「私家醫院住院病房」之醫療必需審批差異，並精算公司團體醫保抵銷個人 VHIS 自付額後之真實自付差額。'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label htmlFor="intel-proc-select" className="block text-xs font-semibold text-slate-700">
                {t('Surgical / Diagnostic Procedure', '選擇常見私家手術／內視鏡檢查')}
              </label>
              <select
                id="intel-proc-select"
                value={procId}
                onChange={(e) => setProcId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                {HK_SURGICAL_PROCEDURES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {t(p.nameEn, p.nameZh)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="intel-proc-setting" className="block text-xs font-semibold text-slate-700">
                {t('Admission Setting', '進行地點／病房級別')}
              </label>
              <select
                id="intel-proc-setting"
                value={procSetting}
                onChange={(e) => setProcSetting(e.target.value as any)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                <option value="DAY_CASE_NETWORK">
                  {t('Day-Case Network Centre', '網絡日間手術中心')}
                </option>
                <option value="HOSPITAL_STANDARD_WARD">
                  {t('Hospital Standard/Semi Ward', '私院普通／半私家房')}
                </option>
                <option value="HOSPITAL_PRIVATE_ROOM">
                  {t('Hospital Private Room', '私院私家房（升等）')}
                </option>
              </select>
            </div>

            <div>
              <label htmlFor="intel-emp-limit" className="block text-xs font-semibold text-slate-700">
                {t('Employer Group Cap (HKD)', '公司團體醫保上限 (HKD)')}
              </label>
              <input
                id="intel-emp-limit"
                type="number"
                step={5000}
                min={0}
                value={employerGroupLimitHkd}
                onChange={(e) => setEmployerGroupLimitHkd(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold text-slate-900 tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="intel-personal-tier" className="block text-xs font-semibold text-slate-700">
                {t('Personal VHIS / Medical Tier', '個人醫保級別及自付額')}
              </label>
              <div className="mt-1.5 flex gap-1.5">
                <select
                  id="intel-personal-tier"
                  value={personalTier}
                  onChange={(e) => setPersonalTier(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-900"
                >
                  <option value="NONE">{t('None', '無個人醫保')}</option>
                  <option value="VHIS_STANDARD">{t('VHIS Standard', '自願醫保標準')}</option>
                  <option value="VHIS_FLEXI_SMM">{t('VHIS Flexi Full', '靈活全數保障')}</option>
                  <option value="HIGH_END_MEDICAL">{t('High-End Private', '高端私家房')}</option>
                </select>
                <select
                  aria-label="Personal VHIS Deductible HKD"
                  value={procDeductibleHkd}
                  onChange={(e) => setProcDeductibleHkd(Number(e.target.value) as HospitalDeductibleHkd)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-2 font-mono text-xs font-semibold text-slate-900 tabular-nums"
                >
                  <option value={0}>$0</option>
                  <option value={20000}>$20k</option>
                  <option value={50000}>$50k</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-4">
            <div>
              <span className="text-xs text-slate-500">{t('Estimated Total Bill', '預計手術總收費')}</span>
              <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                HK${procShortfall.totalEstimatedBillHkd.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500">
                {t('1st: Employer Group Paid', '第一順位：公司醫保賠付')}
              </span>
              <p className="mt-1 font-mono text-xl font-bold text-emerald-700 tabular-nums">
                HK${procShortfall.step1EmployerGroupPaidHkd.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500">
                {t('2nd: Personal VHIS Paid', '第二順位：個人 VHIS 賠付')}
              </span>
              <p className="mt-1 font-mono text-xl font-bold text-blue-700 tabular-nums">
                HK${procShortfall.step2PersonalMedicalPaidHkd.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500">
                {t('Client Out-of-Pocket Shortfall', '客戶最終自付差額')}
              </span>
              <p
                className={`mt-1 font-mono text-xl font-bold tabular-nums ${
                  procShortfall.estimatedClientOutOfPocketHkd === 0
                    ? 'text-emerald-700'
                    : 'text-rose-700'
                }`}
              >
                HK${procShortfall.estimatedClientOutOfPocketHkd.toLocaleString()} (
                {100 - procShortfall.reimbursementRatioPct}%)
              </p>
            </div>
          </div>

          <StackedBillWaterfallBar
            totalBillHkd={procShortfall.totalEstimatedBillHkd}
            employerPaidHkd={procShortfall.step1EmployerGroupPaidHkd}
            personalVhisPaidHkd={procShortfall.step2PersonalMedicalPaidHkd}
            outOfPocketHkd={procShortfall.estimatedClientOutOfPocketHkd}
          />

          <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs leading-relaxed text-amber-950">
            {t(procShortfall.medicalNecessityAlertEn, procShortfall.medicalNecessityAlertZh)}
          </div>

          <div className="space-y-1.5 text-xs text-slate-700">
            <h3 className="font-bold text-slate-900">
              {t('Step-by-Step Dual-Policy Claim Sequence:', '雙保單無縫索償標準步驟：')}
            </h3>
            {(lang === 'en'
              ? procShortfall.claimSequenceStepsEn
              : procShortfall.claimSequenceStepsZh
            ).map((st, idx) => (
              <p key={idx}>{lang === 'zh-CN' ? toSimplifiedChinese(st) : st}</p>
            ))}
          </div>
        </section>
      )}

      {/* TAB 1: HOSPITAL LOG PLAN SIGN-UP MATCHER + 13 PRIVATE HOSPITALS MATRIX */}
      {activeTab === 'hospitals' && (
        <div className="space-y-6">
          {/* Interactive Hospital LOG Plan Sign-Up & Options Advisor */}
          <section
            id="hospital-log-matcher-card"
            aria-label="Private Hospital LOG Plan Sign-Up and Options Matcher"
            className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xs"
          >
            <div className="flex flex-col gap-2 bg-slate-900 px-6 py-4 text-white lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-2.5">
                <Stethoscope
                  className="mt-0.5 h-5 w-5 shrink-0 text-teal-400"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="text-base font-bold text-white">
                    {t(
                      'Which Plan Should I Sign Up For? — Private Hospital LOG & Option Matcher',
                      '私院入院應該投保邊份計劃？— 免找數（LOG）病房及自付費配對器'
                    )}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-300">
                    {syncedPlan
                      ? t(
                          `Synced Active Plan: [${syncedPlan.insurerCode}] ${syncedPlan.nameEn} · Ward class auto-calibrated to ${formatWardLabel(desiredWard)}.`,
                          `已同步主推計劃：[${syncedPlan.insurerCode}] ${syncedPlan.nameZh} · 已自動對齊「${formatWardLabel(desiredWard)}」免找數評估。`
                        )
                      : t(
                          `Calibrated for ${activeLead.fullNameEn} (Age ${activeLead.age}) · Compare HK$0 full cashless LOG vs. HK$20k / HK$50k corporate medical top-up options.`,
                          `已按客戶 ${t(activeLead.fullNameEn, activeLead.fullNameZh)}（${activeLead.age}歲）計算 · 即時比較 $0 自付費全免按金與 $2萬／$5萬公司醫保銜接方案。`
                        )}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-left lg:text-right shrink-0">
                <span className="block text-[11px] font-medium text-slate-300">
                  {t('Non-LOG Cash Deposit at Hospital', '所選醫院無 LOG 現金入院按金')}
                </span>
                <span className="font-mono text-base font-bold text-rose-300 tabular-nums">
                  {activeHospital.cashDepositRangeHkd}
                </span>
              </div>
            </div>
            <div className="p-6 space-y-5">

            {/* 3 Option Selectors: Target Hospital + Desired Ward Class + Deductible Tier */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Control 1: Target Hospital */}
              <div className="lg:col-span-4">
                <label
                  htmlFor="log-matcher-hospital-select"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {t('1. Target Private Hospital', '1. 選擇目標入院私家醫院')}
                </label>
                <select
                  id="log-matcher-hospital-select"
                  value={selectedHospitalId}
                  onChange={(e) => setSelectedHospitalId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  {HK_PRIVATE_HOSPITALS_LOG.map((hosp) => (
                    <option key={hosp.recordId} value={hosp.recordId}>
                      {t(
                        `${hosp.hospitalNameEn} (${hosp.cashDepositRangeHkd})`,
                        `${hosp.hospitalNameZh} · 按金 ${hosp.cashDepositRangeHkd}`
                      )}
                    </option>
                  ))}
                </select>
              </div>

              {/* Control 2: Desired Ward Class */}
              <div className="lg:col-span-4">
                <span className="block text-xs font-semibold text-slate-700">
                  {t('2. Desired Hospital Ward Tier', '2. 期望入住病房級別')}
                </span>
                <div
                  role="group"
                  aria-label="Desired hospital ward class"
                  className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
                >
                  {(
                    [
                      { id: 'STANDARD_WARD', label: t('Standard', '普通房') },
                      { id: 'SEMI_PRIVATE', label: t('Semi-Private', '半私家房') },
                      { id: 'PRIVATE_ROOM', label: t('Private Room', '私家房') },
                    ] as const
                  ).map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      aria-pressed={desiredWard === w.id}
                      onClick={() => setDesiredWard(w.id)}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        desiredWard === w.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Control 3: Annual Deductible Option */}
              <div className="lg:col-span-4">
                <span className="block text-xs font-semibold text-slate-700">
                  {t('3. Annual Deductible Option', '3. 年度自付費選項（配搭團體醫保）')}
                </span>
                <div
                  role="group"
                  aria-label="Annual VHIS deductible option"
                  className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
                >
                  {(
                    [
                      { val: 0 as HospitalDeductibleHkd, label: t('HK$0 Full', 'HK$0 零自付') },
                      {
                        val: 20000 as HospitalDeductibleHkd,
                        label: t('HK$20k (-34%)', 'HK$2萬 (-34%)'),
                      },
                      {
                        val: 50000 as HospitalDeductibleHkd,
                        label: t('HK$50k (-54%)', 'HK$5萬 (-54%)'),
                      },
                    ] as const
                  ).map((d) => (
                    <button
                      key={d.val}
                      type="button"
                      aria-pressed={deductibleHkd === d.val}
                      onClick={() => setDeductibleHkd(d.val)}
                      className={`rounded-md px-2 py-1.5 font-mono text-[11px] font-semibold transition-colors whitespace-nowrap ${
                        deductibleHkd === d.val
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Matched VHIS / Medical Plan Sign-Up Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visibleHospitalSignupOptions.map((opt) => {
                const loc = localizePlanStrings(opt.plan, lang);
                const isComparing = comparedPlanIds.includes(opt.plan.id);
                const isLockedPlan = selectedPlanId === opt.plan.id;
                const isFullLog = opt.logStatus === 'FULL_CASHLESS_LOG';

                return (
                  <article
                    key={opt.plan.id}
                    className={`flex flex-col justify-between rounded-xl border border-t-4 p-4 transition-colors ${
                      isLockedPlan
                        ? 'border-emerald-600 border-t-emerald-600 bg-emerald-50/25 ring-1 ring-emerald-600/30 shadow-xs'
                        : isFullLog
                        ? 'border-slate-200 border-t-teal-600 bg-white hover:border-teal-400'
                        : 'border-slate-200 border-t-amber-500 bg-slate-50/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-slate-700">{loc.insurerName}</span>
                        <span
                          className={`font-mono font-bold ${
                            isFullLog ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {isFullLog
                            ? t('100% Cashless LOG', '100% 免找數批核')
                            : t('Ward Upgrade Co-Deposit', '病房升級需補按金')}
                        </span>
                      </div>

                      <h3 className="mt-1 text-sm font-bold text-slate-900">{loc.planName}</h3>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {t('Native Tier:', '原生房種：')} {formatWardLabel(opt.nativeWardTier)} ·{' '}
                        {t(opt.annualLimitLabelEn, opt.annualLimitLabelZh)}
                      </p>

                      <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
                        {t(opt.optionSummaryEn, opt.optionSummaryZh)}
                      </p>
                    </div>

                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="block text-[11px] text-slate-500">
                            {t('Admission Deposit', '入院按金')}
                          </span>
                          <span
                            className={`font-mono font-bold tabular-nums ${
                              opt.estimatedDepositRequiredHkd === 0
                                ? 'text-emerald-700'
                                : 'text-amber-800'
                            }`}
                          >
                            HK${opt.estimatedDepositRequiredHkd.toLocaleString()}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[11px] text-slate-500">
                            {t('Tax Saved', '扣稅節省')}
                          </span>
                          <span className="font-mono font-semibold text-slate-800 tabular-nums">
                            HK${opt.irdTaxSavedHkd.toLocaleString()}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="block text-[11px] text-slate-500">
                            {t('Net Cost / Yr', '扣稅後淨保費')}
                          </span>
                          <span className="font-mono font-bold text-teal-800 tabular-nums">
                            HK${opt.netAnnualCostAfterTaxHkd.toLocaleString()}
                          </span>
                          <span className="block font-mono text-[10px] text-slate-500 tabular-nums">
                            ~HK${opt.monthlyPremiumHkd.toLocaleString()}/mo
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {onSelectPlanId && (
                          <button
                            type="button"
                            aria-pressed={isLockedPlan}
                            onClick={() => {
                              const nextId = isLockedPlan ? '' : opt.plan.id;
                              onSelectPlanId(nextId);
                              onNotify?.(
                                nextId
                                  ? t(
                                      `Locked [${opt.plan.insurerCode}] ${opt.plan.nameEn} across all 6 stages.`,
                                      `已將「[${opt.plan.insurerCode}] ${opt.plan.nameZh}」設為全局主推計劃。`
                                    )
                                  : t('Unlocked active plan.', '已解除主推計劃鎖定。')
                              );
                            }}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold whitespace-nowrap ${
                              isLockedPlan
                                ? 'bg-emerald-700 text-white'
                                : 'border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                            }`}
                          >
                            {isLockedPlan && <Check className="h-3 w-3" aria-hidden="true" />}
                            <span>{isLockedPlan ? t('Active', '主推中') : t('Set Active', '設為主推')}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSignupPlanInStp(opt.plan.id)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                        >
                          <span>{t('Sign Up in STP', '揀選投保')}</span>
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onToggleComparePlan(opt.plan.id);
                            onNotify?.(
                              isComparing
                                ? t(`Removed ${opt.plan.nameEn} from comparison.`, `已從比較清單移除「${opt.plan.nameZh}」。`)
                                : t(`Added ${opt.plan.nameEn} to comparison.`, `已加入「${opt.plan.nameZh}」至比較表（可於 02A 檢視）。`)
                            );
                          }}
                          aria-pressed={isComparing}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold whitespace-nowrap ${
                            isComparing
                              ? 'bg-indigo-700 text-white'
                              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {isComparing && <Check className="h-3 w-3" aria-hidden="true" />}
                          <span>{isComparing ? t('Added', '已加入') : t('Compare', '比較')}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {hospitalSignupOptions.length > 6 && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowAllLogPlans((prev) => !prev)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  {showAllLogPlans
                    ? t('Show Top 6 Matched Plans', '收起只顯示首 6 個最佳配對方案')
                    : t(
                        `View All ${hospitalSignupOptions.length} VHIS Plan Options`,
                        `展開全部 ${hospitalSignupOptions.length} 個自願醫保方案選項`
                      )}
                </button>
              </div>
            )}
            </div>
          </section>

          {/* Filter Bar for 13 HK Private Hospitals Table */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'ALL', label: t('All 13 Hospitals', '全港13間私院') },
                  { id: 'HK_ISLAND', label: t('HK Island (6)', '港島 (6)') },
                  { id: 'KOWLOON', label: t('Kowloon (4)', '九龍 (4)') },
                  { id: 'NEW_TERRITORIES', label: t('New Territories (3)', '新界 (3)') },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDistrictFilter(d.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    districtFilter === d.id
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Search Hong Kong private hospital"
                value={hospitalSearch}
                onChange={(e) => setHospitalSearch(e.target.value)}
                placeholder={t(
                  'Search HKSH, Gleneagles, Matilda...',
                  '搜尋養和、港怡、明德、中大醫院...'
                )}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* 13 Private Hospitals Matrix */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs">
              <span className="font-semibold text-slate-800">
                {t(
                  'Cap. 633 Private Hospitals — Click "Check Plans" on any hospital to load its LOG options above',
                  '第 633 章註冊私家醫院 — 點擊任何醫院「配對方案」即時更新上方投保選項'
                )}
              </span>
              <a
                href={DH_PHF_OFFICIAL_REGISTRY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline whitespace-nowrap"
              >
                <span>{t('DH Cap. 633 Official Register', '衞生署私營醫療機構登記冊')}</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-3 pl-5 pr-3 font-semibold">
                      {t('Hospital', '私家醫院')}
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      {t('With LOG Deposit', '免找數按金')}
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      {t('Without LOG Deposit', '無 LOG 現金按金')}
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      {t('Turnaround', '批核時間')}
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      {t('Practical Note', '實務提示')}
                    </th>
                    <th className="py-3 pl-3 pr-5 font-semibold text-right">
                      {t('Plan Options', '選單配對')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHospitals.map((h) => {
                    const isFocused = h.recordId === selectedHospitalId;
                    return (
                      <tr
                        key={h.recordId}
                        className={isFocused ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'}
                      >
                        <td className="py-3.5 pl-5 pr-3">
                          <div className="font-bold text-slate-900">
                            {t(h.hospitalNameEn, h.hospitalNameZh)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {lang === 'en' ? h.hospitalNameZh : h.hospitalNameEn}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-emerald-700 tabular-nums">
                          HK$0 ({t('Waived', '全免')})
                        </td>
                        <td className="py-3.5 px-3 font-mono font-semibold text-rose-700 tabular-nums">
                          {h.cashDepositRangeHkd}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-700">
                          {h.preApprovalTurnaround}
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 leading-relaxed">
                          {t(h.auditNote, h.auditNote)}
                        </td>
                        <td className="py-3.5 pl-3 pr-5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedHospitalId(h.recordId);
                              scrollToElementSmooth('hospital-log-matcher-card');
                              onNotify?.(
                                t(
                                  `Loaded cashless LOG options for ${h.hospitalNameEn}.`,
                                  `已載入「${h.hospitalNameZh}」免找數（LOG）配對方案。`
                                )
                              );
                            }}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                              isFocused
                                ? 'bg-teal-700 text-white'
                                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {isFocused
                              ? t('Selected ↑', '已配對 ↑')
                              : t('Check Plans ↑', '配對方案 ↑')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GN16 FULFILLMENT REGISTRY & IRD CAP. 112 TAX CALCULATOR */}
      {activeTab === 'gn16_tax' && (
        <div className="space-y-6">
          <section
            aria-label="IRD Cap 112 QDAP and VHIS tax relief calculator"
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {t(
                    'IRD Cap. 112 s.26ZZD & DIPN 57 — Progressive Salaries Tax Relief Calculator',
                    '稅務條例第 112 章 — 合資格延期年金（QDAP）及自願醫保（VHIS）扣稅計算機'
                  )}
                </h2>
                <p className="text-xs text-slate-500">
                  {t(
                    '[SOURCED-STRICT] Statutory HK$60,000 individual / HK$120,000 married joint QDAP+TVC cap + HK$8,000 per insured VHIS family member across 2%–17% progressive tax brackets.',
                    '[SOURCED-STRICT] 法定個人 HK$60,000／夫婦合併 HK$120,000 扣稅年金上限，另加每名受保親屬 HK$8,000 自願醫保扣稅額（按 2%–17% 累進稅階計算）。'
                  )}
                </p>
              </div>
              <div className="text-right">
                <span className="block text-[11px] font-medium text-slate-500">
                  {t('Annual Salaries Tax Saved', '每年節省薪俸稅款')}
                </span>
                <span className="font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                  HK${taxRelief.annualTaxSavedHkd.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="flex flex-col justify-between">
                <label
                  htmlFor="ird-filing-status"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {t('Filing Status', '報稅身份')}
                </label>
                <select
                  id="ird-filing-status"
                  value={filingStatus}
                  onChange={(e) =>
                    setFilingStatus(e.target.value as 'SINGLE' | 'MARRIED_JOINT')
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                >
                  <option value="SINGLE">{t('Single ($60k Cap)', '個人報稅 ($60k 上限)')}</option>
                  <option value="MARRIED_JOINT">
                    {t('Married Joint ($120k Cap)', '夫婦合併 ($120k 上限)')}
                  </option>
                </select>
              </div>

              <div className="flex flex-col justify-between">
                <label
                  htmlFor="ird-chargeable-income"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {t('Net Chargeable Income (HKD)', '應課稅入息實額 (HKD)')}
                </label>
                <input
                  id="ird-chargeable-income"
                  type="number"
                  step={20000}
                  min={0}
                  value={netChargeableIncomeHkd}
                  onChange={(e) =>
                    setNetChargeableIncomeHkd(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold text-slate-900 tabular-nums"
                />
              </div>

              <div className="flex flex-col justify-between">
                <label
                  htmlFor="ird-qdap-premium"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {t('Annual QDAP Premium (HKD)', '年度年金保費 (HKD)')}
                </label>
                <input
                  id="ird-qdap-premium"
                  type="number"
                  step={10000}
                  min={0}
                  value={qdapAnnualPremiumHkd}
                  onChange={(e) =>
                    setQdapAnnualPremiumHkd(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold text-slate-900 tabular-nums"
                />
              </div>

              <div className="flex flex-col justify-between">
                <label
                  htmlFor="ird-vhis-members"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {t('VHIS Insured Relatives', '自願醫保受保親屬人數')}
                </label>
                <input
                  id="ird-vhis-members"
                  type="number"
                  min={0}
                  max={10}
                  value={vhisInsuredCount}
                  onChange={(e) =>
                    setVhisInsuredCount(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold text-slate-900 tabular-nums"
                />
              </div>

              <div className="flex flex-col justify-between">
                <label
                  htmlFor="ird-vhis-premium"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {t('Total VHIS Premium (HKD)', '醫保總保費 (HKD)')}
                </label>
                <input
                  id="ird-vhis-premium"
                  type="number"
                  step={2000}
                  min={0}
                  value={vhisTotalPremiumHkd}
                  onChange={(e) =>
                    setVhisTotalPremiumHkd(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold text-slate-900 tabular-nums"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs sm:grid-cols-4">
              <div>
                <span className="text-slate-500">{t('Top Marginal Band', '最高邊際稅率')}</span>
                <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
                  {taxRelief.marginalRatePercent}%
                </p>
              </div>
              <div>
                <span className="text-slate-500">
                  {t('Eligible QDAP Deduction', '認可年金扣稅額')}
                </span>
                <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
                  HK${taxRelief.eligibleQdapDeductionHkd.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-slate-500">
                  {t('Eligible VHIS Deduction', '認可醫保扣稅額')}
                </span>
                <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
                  HK${taxRelief.eligibleVhisDeductionHkd.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-slate-500">{t('Total Deductible', '總認可扣稅額')}</span>
                <p className="mt-0.5 font-mono text-sm font-bold text-blue-700">
                  HK${taxRelief.totalEligibleDeductionHkd.toLocaleString()}
                </p>
              </div>
            </div>
          </section>

          {/* Official GN16 Historical Fulfillment Ratio Portal Registry */}
          <section
            aria-label="Official HKIA GN16 historical fulfillment ratio registry"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {t(
                    'HKIA GN16 / GL16 Official Historical Fulfillment Ratio Disclosures',
                    '保監局 GN16／GL16 各大保險公司官方分紅實現率披露專頁'
                  )}
                </h2>
                <p className="text-xs text-slate-500">
                  {t(
                    'Direct links to official annual dividend & terminal bonus fulfillment ratio tables mandated by the Hong Kong Insurance Authority.',
                    '直達各大獲授權保險公司按保監局指引公佈之週年紅利及終期紅利實現率官方網頁。'
                  )}
                </p>
              </div>
              <input
                type="search"
                aria-label="Filter GN16 disclosures"
                value={gn16Search}
                onChange={(e) => setGn16Search(e.target.value)}
                placeholder={t(
                  'Filter AIA, AXA, Sun Life, BOC Life...',
                  '篩選 友邦、安盛、永明、中銀...'
                )}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 sm:w-64"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <th className="py-3 pl-5 pr-3 font-semibold">{t('Insurer', '保險公司')}</th>
                    <th className="py-3 px-3 font-semibold">
                      {t('Flagship Par Series', '旗艦分紅系列')}
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      {t('Inception Cohorts', '保單生效年份')}
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      {t('Reported Band', '歷史實現率區間')}
                    </th>
                    <th className="py-3 pl-3 pr-5 font-semibold">
                      {t('Official GN16 Portal', '官方披露專頁')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGn16.map((row) => (
                    <tr key={row.recordId} className="hover:bg-slate-50/70">
                      <td className="py-3 pl-5 pr-3">
                        <div className="font-bold text-slate-900">
                          {t(row.insurerNameEn, row.insurerNameZh)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {lang === 'en' ? row.insurerNameZh : row.insurerNameEn}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">
                          {t(row.productSeriesEn, row.productSeriesZh)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {lang === 'en' ? row.productSeriesZh : row.productSeriesEn}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 tabular-nums">
                        {row.inceptionCohorts[0]}–
                        {row.inceptionCohorts[row.inceptionCohorts.length - 1]} (
                        {row.inceptionCohorts.length}y)
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                        {row.illustrativeBandText}
                      </td>
                      <td className="py-3 pl-3 pr-5">
                        <a
                          href={row.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline whitespace-nowrap"
                        >
                          <span>{t('Verify Official GN16', '核實官方數據')}</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: DATA PROVENANCE CHARTER ("PROVE IT OR LABEL IT") & PRACTICE ECONOMICS */}
      {activeTab === 'provenance_roi' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-700" aria-hidden="true" />
              <h2 className="text-base font-bold text-slate-900">
                {t(
                  'Charter of Honesty — "Prove It or Label It" Provenance Ledger',
                  '誠信披露約章 —「實證或標示」數據出處分類帳'
                )}
              </h2>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              {t(
                'Eliminates unverified sales claims and aligns strictly with Cap. 41, Cap. 362 (Trade Descriptions), and HKIA GL28/GL30:',
                '杜絕未經核實銷售陳述，嚴格對齊香港法例第 41 章、第 362 章《商品說明條例》及保監局 GL28／GL30 指引：'
              )}
            </p>

            <div className="space-y-3 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <div className="font-mono font-bold text-emerald-800">
                  [SOURCED-STRICT] {t('Statutory & Hospital Rules', '法定扣稅與私院免找數規則')}
                </div>
                <p className="mt-1 text-slate-600">
                  {t(
                    'IRD Cap. 112 s.26ZZD QDAP deduction limits (HK$60,000 single / HK$120,000 married), 5-band progressive tax rates (2%–17%), HKIA participating IRR caps (6.0% HKD / 6.5% Non-HKD), and 13 Cap. 633 Private Hospital zero-deposit LOG protocols.',
                    '稅務條例第 112 章 QDAP 扣稅上限（個人 $6萬／夫婦 $12萬）、2%–17% 五級累進稅率、保監局分紅演示利率上限（港元 6.0%／非港元 6.5%）及全港 13 間私院免找數機制。'
                  )}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <div className="font-mono font-bold text-blue-800">
                  [SOURCED-BROCHURE]{' '}
                  {t(
                    `${totalCatalogPlansCount} Active HK Product Profiles`,
                    `${totalCatalogPlansCount} 款香港市場保險產品檔案`
                  )}
                </div>
                <p className="mt-1 text-slate-600">
                  {t(
                    'Includes newly expanded AXA, Sun Life, and BOC Life product suites alongside AIA, Prudential, Manulife, FWD, HSBC Life, CTF Life, Chubb, Bupa, Cigna, and Bowtie.',
                    '涵蓋最新擴充之安盛（AXA）、永明金融（Sun Life）及中銀人壽（BOC Life）產品系列，連同友邦、保誠、宏利、富衛、滙豐、周大福、安達、保柏、信諾及保泰等 20+ 間保司。'
                  )}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <div className="font-mono font-bold text-amber-800">
                  [SYNTHETIC-BI]{' '}
                  {t('Surrender Cash Value Curves & Breakeven Separation', '退保價值曲線及回本年期分拆')}
                </div>
                <p className="mt-1 text-slate-600">
                  {t(
                    'Mainstream participating savings plans reach Guaranteed Breakeven around Year 18–22 (never Year 5 guaranteed), whereas Year 5–8 breakeven includes non-guaranteed dividends.',
                    '主流分紅儲蓄險之「純保證現金價值回本」約在第 18–22 年；第 5–8 年回本已包含非保證紅利，簽署前必須附上保險公司官方利益說明文件。'
                  )}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t(
                  'InsurTech SaaS Unit Economics & Break-Even Model (cost_model.json v4.0.0)',
                  '保險團隊 SaaS 營運成本及回本模型 (cost_model.json v4.0.0)'
                )}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t(
                  'All financial parameters below are tagged [ASSUMPTION]. Includes Stripe HK (3.4% + HK$2.35) and HK$10.00/seat/mo OCR + storage variable cost.',
                  '以下所有財務參數均標註為 [ASSUMPTION]，已計入 Stripe HK 手續費（3.4% + HK$2.35）及每席每月 HK$10 OCR 儲存變動成本。'
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor="cm-advisor-price" className="block font-semibold text-slate-700">
                  {t('Advisor Pro Monthly (HKD)', '個人顧問月費 (HKD)')} [ASSUMPTION]
                </label>
                <input
                  id="cm-advisor-price"
                  type="number"
                  min={50}
                  value={advisorPriceHkd}
                  onChange={(e) =>
                    setAdvisorPriceHkd(Math.max(20, Number(e.target.value) || 199))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono font-semibold text-slate-900 tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="cm-team-price" className="block font-semibold text-slate-700">
                  {t('Agency Team 15-Seat (HKD)', '15人團隊月費 (HKD)')} [ASSUMPTION]
                </label>
                <input
                  id="cm-team-price"
                  type="number"
                  min={500}
                  value={teamPriceHkd}
                  onChange={(e) =>
                    setTeamPriceHkd(Math.max(200, Number(e.target.value) || 2480))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono font-semibold text-slate-900 tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="cm-founder-salary" className="block font-semibold text-slate-700">
                  {t('Founder Salary Baseline (HKD)', '創辦人月薪基準 (HKD)')} [ASSUMPTION]
                </label>
                <input
                  id="cm-founder-salary"
                  type="number"
                  step={5000}
                  min={0}
                  value={founderSalaryHkd}
                  onChange={(e) =>
                    setFounderSalaryHkd(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono font-semibold text-slate-900 tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="cm-churn-pct" className="block font-semibold text-slate-700">
                  {t('Monthly Churn Scenario (%)', '每月流失率假設 (%)')} [ASSUMPTION]
                </label>
                <select
                  id="cm-churn-pct"
                  value={monthlyChurnPct}
                  onChange={(e) => setMonthlyChurnPct(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono font-semibold text-slate-900"
                >
                  <option value={2.5}>2.5% / mo</option>
                  <option value={5}>5.0% / mo</option>
                  <option value={10}>10.0% / mo</option>
                  <option value={15}>15.0% / mo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
              <div className="rounded-lg border border-slate-200 p-3">
                <span className="text-slate-500">
                  {t('Model A: Advisor Pro Net / Seat', '模型 A：個人席位淨貢獻')}
                </span>
                <p className="mt-0.5 font-mono text-base font-bold text-slate-900 tabular-nums">
                  HK${practiceBreakEven.advisorProNetPerSeatHkd.toFixed(2)}/mo
                </p>
                <p className="mt-1 text-[11px] text-slate-600">
                  {t('Lean Break-Even:', '精簡回本席位：')}{' '}
                  <strong className="font-mono text-slate-900">
                    {practiceBreakEven.advisorProLeanBreakEvenSeats}
                  </strong>
                  <br />
                  {t('Full Break-Even:', '全成本回本席位：')}{' '}
                  <strong className="font-mono text-blue-700">
                    {practiceBreakEven.advisorProFullBreakEvenSeats}
                  </strong>
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <span className="text-slate-500">
                  {t('Model B: Agency Team Net / Unit', '模型 B：15人團隊淨貢獻')}
                </span>
                <p className="mt-0.5 font-mono text-base font-bold text-slate-900 tabular-nums">
                  HK${practiceBreakEven.agencyTeamNetPerUnitHkd.toFixed(2)}/mo
                </p>
                <p className="mt-1 text-[11px] text-slate-600">
                  {t('Lean Break-Even:', '精簡回本團隊：')}{' '}
                  <strong className="font-mono text-slate-900">
                    {practiceBreakEven.agencyTeamLeanBreakEvenUnits}
                  </strong>
                  <br />
                  {t('Full Break-Even:', '全成本回本團隊：')}{' '}
                  <strong className="font-mono text-blue-700">
                    {practiceBreakEven.agencyTeamFullBreakEvenUnits}
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <span>
                {t(
                  `Steady-State Churn Replacement at ${monthlyChurnPct}%/mo: +${practiceBreakEven.monthlyChurnReplacementSeats} new seats/mo required.`,
                  `按每月 ${monthlyChurnPct}% 流失率計算：每月需新增 +${practiceBreakEven.monthlyChurnReplacementSeats} 個個人席位以維持收支平衡。`
                )}
              </span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
