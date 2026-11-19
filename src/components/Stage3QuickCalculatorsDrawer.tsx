import React, { useMemo, useState } from 'react';
import {
  BookmarkPlus,
  Building2,
  Calculator,
  Check,
  Smartphone,
  Stethoscope,
  X,
} from 'lucide-react';
import {
  evaluateProcedureShortfallAndClaim,
  HK_SURGICAL_PROCEDURES,
  optimizeJointTaxTrio,
} from '../domain/advisoryEngines';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import { calculateGroupMedicalToVhisBridge } from '../domain/twentyUpgradesEngine';
import { ClientLead, HospitalDeductibleHkd, SavedToolSnapshot } from '../domain/types';

export type QuickCalcTabId = 'TAX_TRIO' | 'SURGICAL_SHORTFALL' | 'GROUP_VHIS_BRIDGE';

interface Stage3QuickCalculatorsDrawerProps {
  activeLead: ClientLead;
  onSaveSnapshotToLead: (snapshot: SavedToolSnapshot) => void;
  onOpenPosterModal: () => void;
  onNotify?: (msg: string) => void;
}

export const Stage3QuickCalculatorsDrawer: React.FC<Stage3QuickCalculatorsDrawerProps> = ({
  activeLead,
  onSaveSnapshotToLead,
  onOpenPosterModal,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const [openTool, setOpenTool] = useState<QuickCalcTabId | null>(null);
  const [savedToolCode, setSavedToolCode] = useState<string | null>(null);

  // 1. Tax Trio State (FN-02)
  const defaultIncome = Math.max(480000, (activeLead.fnaRecord?.monthlyIncomeHkd || 55000) * 12);
  const [selfIncomeHkd, setSelfIncomeHkd] = useState<number>(defaultIncome);
  const [spouseIncomeHkd, setSpouseIncomeHkd] = useState<number>(360000);
  const [qdapSelfHkd, setQdapSelfHkd] = useState<number>(60000);
  const [vhisMembersCount, setVhisMembersCount] = useState<number>(2);

  const taxResult = useMemo(
    () =>
      optimizeJointTaxTrio({
        selfAnnualAssessableIncomeHkd: selfIncomeHkd,
        spouseAnnualAssessableIncomeHkd: spouseIncomeHkd,
        dependentChildrenCount: activeLead.familyStage === 'CHILDCARE_NUCLEAR' ? 1 : 0,
        eligibleParents55To59Count: 0,
        eligibleParents60PlusCount: 1,
        selfQdapAndTvcPremiumHkd: qdapSelfHkd,
        spouseQdapAndTvcPremiumHkd: spouseIncomeHkd > 0 ? 60000 : 0,
        vhisInsuredRelativesCount: vhisMembersCount,
        avgVhisPremiumPerPersonHkd: 8000,
        qdapPreTaxIrrPct: 4.5,
      }),
    [selfIncomeHkd, spouseIncomeHkd, qdapSelfHkd, vhisMembersCount, activeLead.familyStage]
  );

  // 2. Surgical Shortfall State (FN-08)
  const [procedureId, setProcedureId] = useState<string>('CORONARY_PTCA_STENT');
  const [wardSetting, setWardSetting] = useState<
    'DAY_CASE_NETWORK' | 'HOSPITAL_STANDARD_WARD' | 'HOSPITAL_PRIVATE_ROOM'
  >('HOSPITAL_STANDARD_WARD');
  const [employerGroupCapHkd, setEmployerGroupCapHkd] = useState<number>(50000);
  const [personalDeductible, setPersonalDeductible] = useState<HospitalDeductibleHkd>(0);

  const surgicalResult = useMemo(
    () =>
      evaluateProcedureShortfallAndClaim({
        procedureId,
        setting: wardSetting,
        employerGroupLimitHkd: employerGroupCapHkd,
        personalPlanTier: 'VHIS_FLEXI_SMM',
        personalDeductibleHkd: personalDeductible,
      }),
    [procedureId, wardSetting, employerGroupCapHkd, personalDeductible]
  );

  // 3. Corporate Group Medical -> VHIS Bridge State (IMP-11)
  const [plannedExitAge, setPlannedExitAge] = useState<number>(Math.max(activeLead.age + 12, 55));
  const [bridgeGroupLimitHkd, setBridgeGroupLimitHkd] = useState<number>(40000);
  const [bridgeDeductibleHkd, setBridgeDeductibleHkd] = useState<16000 | 25000 | 50000>(25000);

  const bridgeResult = useMemo(
    () =>
      calculateGroupMedicalToVhisBridge({
        currentAge: activeLead.age,
        plannedExitAge,
        employerSurgicalLimitHkd: bridgeGroupLimitHkd,
        selectedDeductibleHkd: bridgeDeductibleHkd,
      }),
    [activeLead.age, plannedExitAge, bridgeGroupLimitHkd, bridgeDeductibleHkd]
  );

  const handleSaveQuickSnapshot = (
    toolCode: string,
    titleZh: string,
    titleEn: string,
    summaryZh: string,
    summaryEn: string,
    keyMetricLabel: string
  ) => {
    const snap: SavedToolSnapshot = {
      id: `snap-${toolCode.toLowerCase()}-${Date.now().toString(36)}`,
      toolCode,
      toolTitleZh: titleZh,
      toolTitleEn: titleEn,
      headlineMetric: keyMetricLabel,
      summaryZh,
      summaryEn,
      savedAtIso: new Date().toISOString(),
    };
    onSaveSnapshotToLead(snap);
    setSavedToolCode(toolCode);
    window.setTimeout(() => setSavedToolCode(null), 2200);
    onNotify?.(
      t(
        `Pinned "${titleEn}" calculation to ${activeLead.fullNameEn}'s file (01C).`,
        conv(`已將「${titleZh}」試算結果存入「${activeLead.fullNameZh}」檔案（01C）！`)
      )
    );
  };

  return (
    <section
      data-testid="stage3-quick-calc-bar"
      className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xs"
    >
      {/* Compact Trigger Strip: Top-3 High-Frequency Calculators + 1-Page Mobile Poster CTA */}
      <div className="flex flex-col gap-3 bg-slate-900 px-4 py-3 text-white lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-teal-300 whitespace-nowrap">
            {t('Quick Meeting Tools:', conv('見客高頻快捷工具：'))}
          </span>

          <button
            type="button"
            data-testid="quick-calc-btn-tax"
            aria-expanded={openTool === 'TAX_TRIO'}
            onClick={() => setOpenTool((prev) => (prev === 'TAX_TRIO' ? null : 'TAX_TRIO'))}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              openTool === 'TAX_TRIO'
                ? 'border-teal-400 bg-teal-600 text-white'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('Tax Trio (QDAP+VHIS)', conv('扣稅三寶試算'))}</span>
          </button>

          <button
            type="button"
            data-testid="quick-calc-btn-surgical"
            aria-expanded={openTool === 'SURGICAL_SHORTFALL'}
            onClick={() =>
              setOpenTool((prev) =>
                prev === 'SURGICAL_SHORTFALL' ? null : 'SURGICAL_SHORTFALL'
              )
            }
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              openTool === 'SURGICAL_SHORTFALL'
                ? 'border-teal-400 bg-teal-600 text-white'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('Surgical Shortfall', conv('私院手術差額'))}</span>
          </button>

          <button
            type="button"
            data-testid="quick-calc-btn-bridge"
            aria-expanded={openTool === 'GROUP_VHIS_BRIDGE'}
            onClick={() =>
              setOpenTool((prev) =>
                prev === 'GROUP_VHIS_BRIDGE' ? null : 'GROUP_VHIS_BRIDGE'
              )
            }
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              openTool === 'GROUP_VHIS_BRIDGE'
                ? 'border-teal-400 bg-teal-600 text-white'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('Group Med → VHIS Bridge', conv('公司醫保銜接 VHIS'))}</span>
          </button>
        </div>

        <button
          type="button"
          data-testid="stage3-open-mobile-poster-btn"
          onClick={onOpenPosterModal}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300 whitespace-nowrap shrink-0"
        >
          <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {t('1-Page Mobile Portrait Poster', conv('生成一頁式手機直式提案海報'))}
          </span>
        </button>
      </div>

      {/* Expandable Inline Drawer Content */}
      {openTool === 'TAX_TRIO' && (
        <div
          data-testid="quick-calc-drawer-tax"
          className="border-t border-slate-200 bg-slate-50/80 p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t(
                  'FN-02 · HK IRD "Tax Trio" (VHIS + QDAP + TVC) Joint vs. Separate Optimizer',
                  conv('FN-02 · 香港「扣稅三寶」（VHIS＋QDAP＋TVC）夫婦分開 vs 合併評稅精算')
                )}
              </h3>
              <p className="text-xs text-slate-600">
                {lang === 'en'
                  ? taxResult.allocationRecommendationEn
                  : conv(taxResult.allocationRecommendationZh)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="save-quick-tax-btn"
                onClick={() =>
                  handleSaveQuickSnapshot(
                    'FN-02',
                    '扣稅三寶薪俸稅節省試算',
                    'HK IRD Tax Trio Optimizer',
                    `全年節省薪俸稅 HK$${taxResult.totalTaxSavedByTrioHkd.toLocaleString()}，QDAP 稅後實際 IRR 提升至 ${taxResult.postTaxQdapIrrPct}%`,
                    `Annual salaries tax saved: HK$${taxResult.totalTaxSavedByTrioHkd.toLocaleString()}; post-tax QDAP IRR ${taxResult.postTaxQdapIrrPct}%`,
                    `-HK$${taxResult.totalTaxSavedByTrioHkd.toLocaleString()}/yr`
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
              >
                {savedToolCode === 'FN-02' ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {savedToolCode === 'FN-02'
                    ? t('Saved to 01C!', conv('已存入 01C！'))
                    : t('Save to Client File', conv('存入客戶檔案'))}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setOpenTool(null)}
                aria-label="Close quick calculator"
                className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-700">
                {t('Taxpayer Annual Income (HK$)', conv('主納稅人年薪 (HK$)'))}
              </span>
              <input
                type="number"
                step={20000}
                value={selfIncomeHkd}
                onChange={(e) => setSelfIncomeHkd(Math.max(0, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs tabular-nums"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-700">
                {t('Spouse Annual Income (0=Single)', conv('配偶年薪 (單身填 0)'))}
              </span>
              <input
                type="number"
                step={20000}
                value={spouseIncomeHkd}
                onChange={(e) => setSpouseIncomeHkd(Math.max(0, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs tabular-nums"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-700">
                {t('Self QDAP + TVC (Cap $60k)', conv('個人 QDAP+TVC 供款'))}
              </span>
              <input
                type="number"
                step={5000}
                value={qdapSelfHkd}
                onChange={(e) => setQdapSelfHkd(Math.max(0, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs tabular-nums"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-700">
                {t('VHIS Insured Family Members', conv('投保 VHIS 家庭人數'))}
              </span>
              <select
                value={vhisMembersCount}
                onChange={(e) => setVhisMembersCount(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {t('Persons', '名受保親屬')} (HK${(n * 8000).toLocaleString()})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 font-mono text-xs tabular-nums">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-sans text-[11px] text-slate-500">
                {t('Annual Salaries Tax Saved', conv('全年節省薪俸稅額'))}
              </div>
              <div className="mt-1 text-lg font-bold text-emerald-700">
                HK$ {taxResult.totalTaxSavedByTrioHkd.toLocaleString()} / yr
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-sans text-[11px] text-slate-500">
                {t('Effective Tax Rebate on Premium', conv('相當於首年保費即減折扣'))}
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {taxResult.effectiveRebatePctOnContributions}% OFF
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-sans text-[11px] text-slate-500">
                {t('Post-Tax QDAP Effective IRR', conv('QDAP 計及扣稅後實際回報'))}
              </div>
              <div className="mt-1 text-lg font-bold text-blue-700">
                4.50% ➔ {taxResult.postTaxQdapIrrPct}% p.a.
              </div>
            </div>
          </div>
        </div>
      )}

      {openTool === 'SURGICAL_SHORTFALL' && (
        <div
          data-testid="quick-calc-drawer-surgical"
          className="border-t border-slate-200 bg-slate-50/80 p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t(
                  'FN-08 · Private Hospital Surgical Shortfall & Group-to-VHIS Claim Sequence',
                  conv('FN-08 · 香港常見私院手術帳單差額及「先團保、後個人 VHIS」雙單理賠試算')
                )}
              </h3>
              <p className="text-xs text-slate-600">
                {t(
                  'Shows exact employer group payout vs. VHIS Flexi SMM top-up so client sees HK$0 out-of-pocket.',
                  conv('即時對比公司團體醫保賠償上限與個人高端自願醫保全數補足金額。')
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="save-quick-surgical-btn"
                onClick={() =>
                  handleSaveQuickSnapshot(
                    'FN-08',
                    `私院手術理賠差額（${surgicalResult.procedure.nameZh}）`,
                    `Surgical Shortfall (${surgicalResult.procedure.nameEn})`,
                    `總帳單 HK$${surgicalResult.totalEstimatedBillHkd.toLocaleString()} · 團保賠 HK$${surgicalResult.step1EmployerGroupPaidHkd.toLocaleString()} + VHIS 賠 HK$${surgicalResult.step2PersonalMedicalPaidHkd.toLocaleString()} · 自付 HK$${surgicalResult.estimatedClientOutOfPocketHkd.toLocaleString()}`,
                    `Bill HK$${surgicalResult.totalEstimatedBillHkd.toLocaleString()} -> Out-of-pocket HK$${surgicalResult.estimatedClientOutOfPocketHkd.toLocaleString()}`,
                    `自付 HK$${surgicalResult.estimatedClientOutOfPocketHkd.toLocaleString()}`
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
              >
                {savedToolCode === 'FN-08' ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {savedToolCode === 'FN-08'
                    ? t('Saved to 01C!', conv('已存入 01C！'))
                    : t('Save to Client File', conv('存入客戶檔案'))}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setOpenTool(null)}
                aria-label="Close quick calculator"
                className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-700">
                {t('Surgical Procedure', conv('常見私院手術項目'))}
              </span>
              <select
                value={procedureId}
                onChange={(e) => setProcedureId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
              >
                {HK_SURGICAL_PROCEDURES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {lang === 'en' ? p.nameEn : conv(p.nameZh)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold text-slate-700">
                {t('Facility / Ward Class', conv('手術場所及病房級別'))}
              </span>
              <select
                value={wardSetting}
                onChange={(e) => setWardSetting(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
              >
                <option value="DAY_CASE_NETWORK">
                  {t('Day-Case Specialist Center', conv('日間專科手術中心'))}
                </option>
                <option value="HOSPITAL_STANDARD_WARD">
                  {t('Private Hospital Standard/Semi-Private', conv('私家醫院標準／半私家房'))}
                </option>
                <option value="HOSPITAL_PRIVATE_ROOM">
                  {t('Private Hospital Private Room', conv('私家醫院頭等私家房'))}
                </option>
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold text-slate-700">
                {t('Employer Group Cap (HK$)', conv('公司團保賠償上限 (HK$)'))}
              </span>
              <input
                type="number"
                step={10000}
                value={employerGroupCapHkd}
                onChange={(e) => setEmployerGroupCapHkd(Math.max(0, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs tabular-nums"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold text-slate-700">
                {t('Personal VHIS Deductible', conv('個人 VHIS 自付額選項'))}
              </span>
              <select
                value={personalDeductible}
                onChange={(e) =>
                  setPersonalDeductible(Number(e.target.value) as HospitalDeductibleHkd)
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
              >
                <option value={0}>HK$ 0 ({t('Zero Deductible', conv('零自付額'))})</option>
                <option value={20000}>HK$ 20,000 ({t('Offset by Group', conv('由團保抵銷'))})</option>
                <option value={50000}>HK$ 50,000 ({t('High Savings', conv('高墊底慳保費'))})</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs tabular-nums">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-sans text-[11px] text-slate-500">
                {t('Estimated Hospital Bill', conv('預計總手術帳單'))}
              </div>
              <div className="mt-1 text-base font-bold text-slate-900">
                HK$ {surgicalResult.totalEstimatedBillHkd.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-sans text-[11px] text-slate-500">
                {t('1st Claim: Employer Group', conv('第一層：公司團保賠付'))}
              </div>
              <div className="mt-1 text-base font-bold text-slate-700">
                HK$ {surgicalResult.step1EmployerGroupPaidHkd.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-sans text-[11px] text-slate-500">
                {t('2nd Claim: VHIS Flexi SMM', conv('第二層：個人 VHIS 補足'))}
              </div>
              <div className="mt-1 text-base font-bold text-blue-700">
                +HK$ {surgicalResult.step2PersonalMedicalPaidHkd.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="font-sans text-[11px] font-semibold text-emerald-800">
                {t('Client Out-of-Pocket', conv('客戶最終自付金額'))}
              </div>
              <div className="mt-1 text-base font-bold text-emerald-800">
                HK$ {surgicalResult.estimatedClientOutOfPocketHkd.toLocaleString()} (
                {surgicalResult.reimbursementRatioPct}%)
              </div>
            </div>
          </div>
        </div>
      )}

      {openTool === 'GROUP_VHIS_BRIDGE' && (
        <div
          data-testid="quick-calc-drawer-bridge"
          className="border-t border-slate-200 bg-slate-50/80 p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t(
                  'IMP-11 · Corporate Group Medical Exit / Retirement Zero-Underwriting VHIS Bridge',
                  conv('IMP-11 · 公司團體醫保在職慳保費＋退休免核保調低自付額（Step-Down）試算')
                )}
              </h3>
              <p className="text-xs text-slate-600">
                {t(
                  `Lock insurability at age ${activeLead.age} with high deductible, then step down to HK$0 deductible at ages 50/55/60/65 without medical underwriting.`,
                  conv(
                    `趁 ${activeLead.age} 歲健康鎖定核保，在職期間利用團保抵銷自付額，並於 50/55/60/65 歲退休時免核保轉回 HK$0 自付額。`
                  )
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="save-quick-bridge-btn"
                onClick={() =>
                  handleSaveQuickSnapshot(
                    'IMP-11',
                    '公司醫保銜接高自付額 VHIS 退休方案',
                    'Group Medical to VHIS Retirement Bridge',
                    `選用 HK$${bridgeDeductibleHkd.toLocaleString()} 自付額每年慳 HK$${bridgeResult.annualPremiumSavedHkd.toLocaleString()}，退休前累計節省 HK$${bridgeResult.cumulativePremiumSavedBeforeExitHkd.toLocaleString()}`,
                    `Saves HK$${bridgeResult.annualPremiumSavedHkd.toLocaleString()}/yr (${bridgeResult.cumulativePremiumSavedBeforeExitHkd.toLocaleString()} before retirement)`,
                    `累計慳 HK$${bridgeResult.cumulativePremiumSavedBeforeExitHkd.toLocaleString()}`
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
              >
                {savedToolCode === 'IMP-11' ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {savedToolCode === 'IMP-11'
                    ? t('Saved to 01C!', conv('已存入 01C！'))
                    : t('Save to Client File', conv('存入客戶檔案'))}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setOpenTool(null)}
                aria-label="Close quick calculator"
                className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-700">
                {t('VHIS Deductible Option', conv('在職期間個人 VHIS 自付額'))}
              </span>
              <select
                value={bridgeDeductibleHkd}
                onChange={(e) =>
                  setBridgeDeductibleHkd(Number(e.target.value) as 16000 | 25000 | 50000)
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
              >
                <option value={16000}>HK$ 16,000 (-34% {t('Premium', '保費')})</option>
                <option value={25000}>HK$ 25,000 (-44% {t('Premium', '保費')})</option>
                <option value={50000}>HK$ 50,000 (-56% {t('Premium', '保費')})</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold text-slate-700">
                {t('Employer Surgical Limit (HK$)', conv('現職公司醫保賠償上限 (HK$)'))}
              </span>
              <input
                type="number"
                step={5000}
                value={bridgeGroupLimitHkd}
                onChange={(e) => setBridgeGroupLimitHkd(Math.max(0, Number(e.target.value)))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs tabular-nums"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold text-slate-700">
                {t('Planned Exit / Retirement Age', conv('預計離職或退休年齡'))}
              </span>
              <select
                value={plannedExitAge}
                onChange={(e) => setPlannedExitAge(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
              >
                {[50, 55, 60, 65].map((age) => (
                  <option key={age} value={age}>
                    {age} {t('Years Old (Zero-UW Step-Down)', '歲（保證免核保轉 0 自付額）')}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 font-mono text-xs tabular-nums">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-sans text-[11px] text-slate-500">
                {t('High-Deductible Annual Premium', conv('銜接方案折後年繳保費'))}
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                HK$ {bridgeResult.highDeductibleAnnualHkd.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-400 line-through">
                  HK${bridgeResult.zeroDeductibleAnnualHkd.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-sans text-[11px] text-slate-500">
                {t(
                  `Cumulative Saved (${bridgeResult.yearsUntilExit} yrs)`,
                  conv(`退休前 ${bridgeResult.yearsUntilExit} 年累計慳保費`)
                )}
              </div>
              <div className="mt-1 text-lg font-bold text-emerald-700">
                HK$ {bridgeResult.cumulativePremiumSavedBeforeExitHkd.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-sans text-[11px] text-slate-500">
                {t('Bridge Deductible Residual Gap', conv('在職團保銜接自付差額'))}
              </div>
              <div className="mt-1 text-lg font-bold text-blue-700">
                HK$ {bridgeResult.outOfPocketBridgeGapHkd.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
