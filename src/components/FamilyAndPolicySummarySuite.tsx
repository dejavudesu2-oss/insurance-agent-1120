import React, { useMemo, useState } from 'react';
import {
  CalendarPlus,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import {
  buildAdvisorFollowUpIcs,
  buildExistingPolicySummarySheet,
  buildSampleExistingPolicies,
  computeFamilyPolicyOverview,
  DIMENSION_LABELS,
  FollowUpCalendarKind,
} from '../domain/advisorToolkitSuiteEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  ClientLead,
  ExistingPolicyAuditItem,
  HouseholdMember,
  HouseholdRelation,
  IntermediaryProfile,
  ProtectionDimensionId,
} from '../domain/types';
import { copyTextSafe, triggerBrowserDownload } from '../utils/clipboardAndDom';

export interface FamilyAndPolicySummarySuiteProps {
  lead: ClientLead;
  intermediary: IntermediaryProfile;
  selfProposalAnnualHkd: number;
  activePlanNameZh?: string;
  ocrScanningPolicy?: boolean;
  onUploadPolicyFile?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRunSampleGroupMedOcr?: () => void;
  onUpdateLead: (leadId: string, updater: (prev: ClientLead) => ClientLead) => void;
  onNotify?: (msg: string) => void;
}

type SuiteTabId = 'FAMILY_VIEW' | 'POLICY_SUMMARY' | 'CALENDAR_ICS';

export const FamilyAndPolicySummarySuite: React.FC<
  FamilyAndPolicySummarySuiteProps
> = ({
  lead,
  intermediary,
  selfProposalAnnualHkd,
  activePlanNameZh,
  ocrScanningPolicy = false,
  onUploadPolicyFile,
  onRunSampleGroupMedOcr,
  onUpdateLead,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const [activeTab, setActiveTab] = useState<SuiteTabId>('FAMILY_VIEW');
  const [marginalTaxRate, setMarginalTaxRate] = useState<0.15 | 0.17>(0.17);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Family member quick-add state
  const [memberNameZh, setMemberNameZh] = useState('');
  const [memberRelation, setMemberRelation] = useState<HouseholdRelation>('SPOUSE');
  const [memberAge, setMemberAge] = useState('34');
  const [memberAnnualHkd, setMemberAnnualHkd] = useState('18600');
  const [memberSummaryZh, setMemberSummaryZh] = useState('自願醫保半私家房 ＋ 危疾保障');
  const [memberVhis, setMemberVhis] = useState(true);
  const [memberQdap, setMemberQdap] = useState(true);

  // Existing policy quick-add state
  const [polInsurerAndName, setPolInsurerAndName] = useState('');
  const [polNumber, setPolNumber] = useState('');
  const [polDimension, setPolDimension] =
    useState<ProtectionDimensionId>('PRIVATE_HOSPITAL');
  const [polCoverageHkd, setPolCoverageHkd] = useState('500000');
  const [polAnnualPremHkd, setPolAnnualPremHkd] = useState('12000');
  const [polNote, setPolNote] = useState('');

  // Calendar (.ics) state
  const defaultNextRenewalIso = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const [renewalDateIso, setRenewalDateIso] = useState(defaultNextRenewalIso);
  const [birthdayMd, setBirthdayMd] = useState(lead.birthdayMonthDay || '08-18');
  const [policyRefInput, setPolicyRefInput] = useState('HK-POL-2026-881');

  const familyOverview = useMemo(
    () =>
      computeFamilyPolicyOverview({
        lead,
        selfProposalAnnualHkd,
        marginalTaxRate,
      }),
    [lead, selfProposalAnnualHkd, marginalTaxRate]
  );

  const policySheet = useMemo(
    () =>
      buildExistingPolicySummarySheet({
        lead,
        advisorNameZh: intermediary.nameZh,
        advisorLicenseNo: intermediary.iaLicenseNo,
      }),
    [lead, intermediary.nameZh, intermediary.iaLicenseNo]
  );

  const flashCopied = (key: string) => {
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 2200);
  };

  const handleAddFamilyMember = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName =
      memberNameZh.trim() ||
      (memberRelation === 'SPOUSE'
        ? `${lead.fullNameZh.slice(0, 1)}太太`
        : memberRelation === 'CHILD'
        ? `${lead.fullNameZh.slice(0, 1)}小朋友`
        : `${lead.fullNameZh.slice(0, 1)}家長輩`);
    const newMember: HouseholdMember = {
      id: `fam-${Date.now().toString(36)}`,
      nameZh: cleanName,
      nameEn: cleanName,
      relation: memberRelation,
      age: Math.max(0, Math.min(99, Number(memberAge) || 30)),
      isSmoker: false,
      vhisEligible: memberVhis,
      qdapEligible: memberRelation !== 'CHILD' && memberQdap,
      annualPremiumHkd: Math.max(0, Number(memberAnnualHkd) || 0),
      policySummaryZh: memberSummaryZh.trim() || '自願醫保及基礎保障',
    };

    onUpdateLead(lead.id, (prev) => ({
      ...prev,
      householdMembers: [...(prev.householdMembers || []), newMember],
    }));
    setMemberNameZh('');
    onNotify?.(
      t(
        `Added family member ${cleanName} & updated household tax deduction cap.`,
        conv(`已新增家庭成員「${cleanName}」，全家總保費及扣稅上限已即時更新！`)
      )
    );
  };

  const handleRemoveFamilyMember = (memberId: string) => {
    onUpdateLead(lead.id, (prev) => ({
      ...prev,
      householdMembers: (prev.householdMembers || []).filter(
        (m) => m.id !== memberId
      ),
    }));
  };

  const handleAddExistingPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!polInsurerAndName.trim()) return;
    const newItem: ExistingPolicyAuditItem = {
      id: `expol-${Date.now().toString(36)}`,
      policyNumber: polNumber.trim() || undefined,
      policyName: polInsurerAndName.trim(),
      dimensionId: polDimension,
      coverageAmountHkd: Math.max(0, Number(polCoverageHkd) || 0),
      annualPremiumHkd: Math.max(0, Number(polAnnualPremHkd) || 0),
      limitationNote: polNote.trim() || undefined,
      addedAtIso: new Date().toISOString(),
    };
    onUpdateLead(lead.id, (prev) => ({
      ...prev,
      existingPolicies: [...(prev.existingPolicies || []), newItem],
    }));
    setPolInsurerAndName('');
    setPolNumber('');
    setPolNote('');
    onNotify?.(
      t(
        `Added existing policy "${newItem.policyName}" to summary sheet.`,
        conv(`已將「${newItem.policyName}」加入現有保單一覽表並同步扣減缺口！`)
      )
    );
  };

  const handleLoadSamplePolicies = () => {
    const samples = buildSampleExistingPolicies();
    onUpdateLead(lead.id, (prev) => ({
      ...prev,
      existingPolicies: samples,
    }));
    onNotify?.(
      t(
        'Loaded 3 sample Hong Kong existing policies into the summary sheet.',
        conv('已載入 3 份常見香港舊保單範例（公司醫保、舊危疾、定期人壽）！')
      )
    );
  };

  const handleDeleteExistingPolicy = (polId: string) => {
    onUpdateLead(lead.id, (prev) => ({
      ...prev,
      existingPolicies: (prev.existingPolicies || []).filter(
        (p) => p.id !== polId
      ),
    }));
  };

  const handleExportCalendarIcs = (kind: FollowUpCalendarKind) => {
    if (birthdayMd && /^\d{2}-\d{2}$/.test(birthdayMd)) {
      onUpdateLead(lead.id, (prev) => ({
        ...prev,
        birthdayMonthDay: birthdayMd,
      }));
    }
    const built = buildAdvisorFollowUpIcs({
      kind,
      clientNameZh: lead.fullNameZh,
      clientNameEn: lead.fullNameEn,
      policyNumber: policyRefInput.trim() || undefined,
      planNameZh: activePlanNameZh || '香港保單保障方案',
      whatsappPhone: lead.whatsappPhone,
      nextRenewalDateIso: renewalDateIso,
      birthdayMonthDay: birthdayMd,
    });

    triggerBrowserDownload(
      built.fileName,
      built.icsContent,
      'text/calendar;charset=utf-8'
    );
    onNotify?.(
      t(
        `Downloaded ${built.eventCount} calendar reminder(s) (.ics) for Apple/Google/Outlook Calendar!`,
        conv(
          `已下載日曆提醒檔（共 ${built.eventCount} 個事項），打開即可加入 iPhone／Google／Outlook 行事曆！`
        )
      )
    );
  };

  return (
    <section
      data-testid="family-and-policy-summary-suite"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
    >
      {/* Header & 3 Clear Everyday Tabs */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {t(
              'Household Policy & Tax Overview · Existing Policy Sheet · Follow-Up Calendar (.ics)',
              conv('家庭保單扣稅總覽 · 現有保單一覽表 · 跟進日曆提醒 (.ics)')
            )}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {t(
              'Manage whole-family premiums & VHIS/QDAP tax caps, consolidate old policies on one sheet, and export calendar reminders.',
              conv(
                '一頁幫客人計清全家總保費同扣稅上限、整理分散喺唔同公司嘅舊保單，並一鍵匯出冷靜期／續保／生日手機日曆提醒。'
              )
            )}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Household, existing policies, and calendar reminders"
          className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 shrink-0"
        >
          <button
            type="button"
            role="tab"
            data-testid="suite-tab-family"
            aria-selected={activeTab === 'FAMILY_VIEW'}
            onClick={() => setActiveTab('FAMILY_VIEW')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'FAMILY_VIEW'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {t(
                `Family Policy View (${familyOverview.totalMembersCount})`,
                conv(`家庭保單總覽 (${familyOverview.totalMembersCount}人)`)
              )}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            data-testid="suite-tab-policy-sheet"
            aria-selected={activeTab === 'POLICY_SUMMARY'}
            onClick={() => setActiveTab('POLICY_SUMMARY')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'POLICY_SUMMARY'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {t(
                `Existing Policy Sheet (${policySheet.totalPoliciesCount})`,
                conv(`現有保單一覽表 (${policySheet.totalPoliciesCount}份)`)
              )}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            data-testid="suite-tab-calendar-ics"
            aria-selected={activeTab === 'CALENDAR_ICS'}
            onClick={() => setActiveTab('CALENDAR_ICS')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'CALENDAR_ICS'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('Calendar Reminders (.ics)', conv('跟進日曆提醒 (.ics)'))}</span>
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* TAB 1: FAMILY POLICY VIEW (夫婦＋小朋友全家保費與扣稅上限整合)         */}
      {/* ================================================================== */}
      {activeTab === 'FAMILY_VIEW' && (
        <div data-testid="family-policy-view-panel" className="space-y-4">
          {/* 4 Key Household Metrics */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
              <div className="text-[11px] font-semibold text-slate-500">
                {t('Whole-Family Annual Premium', conv('全家每年總保費（連新方案）'))}
              </div>
              <div
                data-testid="family-total-annual-hkd"
                className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums"
              >
                HK$ {familyOverview.totalFamilyAnnualPremiumHkd.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                {t(
                  `≈ HK$ ${familyOverview.totalFamilyMonthlyPremiumHkd.toLocaleString()} / mo · ${familyOverview.budgetUtilizationPct}% of family budget`,
                  conv(
                    `折合每月約 HK$ ${familyOverview.totalFamilyMonthlyPremiumHkd.toLocaleString()} · 佔家庭預算 ${familyOverview.budgetUtilizationPct}%`
                  )
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
              <div className="text-[11px] font-semibold text-slate-500">
                {t('VHIS Deduction Cap (HK$8k/person)', conv('全家自願醫保 VHIS 扣稅上限'))}
              </div>
              <div
                data-testid="family-vhis-cap-hkd"
                className="mt-1 font-mono text-lg font-bold text-teal-800 tabular-nums"
              >
                HK$ {familyOverview.maxVhisDeductionCapHkd.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {t(
                  `${familyOverview.vhisEligibleCount} eligible insured family member(s) × HK$8,000`,
                  conv(`${familyOverview.vhisEligibleCount} 位合資格受保親屬 × HK$8,000（無人數上限）`)
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
              <div className="text-[11px] font-semibold text-slate-500">
                {t('QDAP + TVC Annuity Cap', conv('延期年金 QDAP 扣稅上限'))}
              </div>
              <div
                data-testid="family-qdap-cap-hkd"
                className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums"
              >
                HK$ {familyOverview.maxQdapJointDeductionCapHkd.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {familyOverview.qdapTaxpayerCount === 2
                  ? t('Married Joint Cap (2 × HK$60,000)', conv('夫婦合併報稅上限（2 人 × HK$60,000）'))
                  : t('Individual Cap (HK$60,000)', conv('個人報稅上限（HK$60,000）'))}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-emerald-900">
                  {t('Est. Annual Salaries Tax Saved', conv('預計每年最多可慳薪俸稅'))}
                </span>
                <div className="inline-flex rounded border border-emerald-300 bg-white p-0.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setMarginalTaxRate(0.15)}
                    className={`rounded px-1.5 py-0.5 ${
                      marginalTaxRate === 0.15
                        ? 'bg-emerald-700 text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    15%
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarginalTaxRate(0.17)}
                    className={`rounded px-1.5 py-0.5 ${
                      marginalTaxRate === 0.17
                        ? 'bg-emerald-700 text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    17%
                  </button>
                </div>
              </div>
              <div
                data-testid="family-tax-saved-hkd"
                className="mt-1 font-mono text-lg font-bold text-emerald-800 tabular-nums"
              >
                HK${' '}
                {(marginalTaxRate === 0.15
                  ? familyOverview.estimatedTaxSavedAt15PctHkd
                  : familyOverview.estimatedTaxSavedAt17PctHkd
                ).toLocaleString()}
              </div>
              <div className="mt-0.5 text-[11px] text-emerald-800 tabular-nums">
                {t(
                  `Net after tax: HK$ ${familyOverview.netAfterTaxAnnualHkd.toLocaleString()} / yr`,
                  conv(`扣稅後全家實付約：HK$ ${familyOverview.netAfterTaxAnnualHkd.toLocaleString()} / 年`)
                )}
              </div>
            </div>
          </div>

          {/* Family Members Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[680px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 whitespace-nowrap">
                  <th className="py-2.5 px-3.5 font-semibold">{t('Family Member', conv('家庭成員'))}</th>
                  <th className="py-2.5 px-3.5 font-semibold">{t('Relation & Age', conv('關係及年齡'))}</th>
                  <th className="py-2.5 px-3.5 font-semibold">{t('Policies / Plan Focus', conv('保單／配置重點'))}</th>
                  <th className="py-2.5 px-3.5 font-semibold">{t('Tax Eligibility', conv('扣稅資格'))}</th>
                  <th className="py-2.5 px-3.5 text-right font-semibold">{t('Annual Premium', conv('每年保費'))}</th>
                  <th className="py-2.5 px-3.5 text-right font-semibold">{t('Action', conv('操作'))}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {familyOverview.rows.map((row) => {
                  const isSelf = row.id === 'self-primary';
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900">
                        {lang === 'en' ? row.nameEn : conv(row.nameZh)}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 tabular-nums">
                        {lang === 'en' ? row.relationLabelEn : conv(row.relationLabelZh)} · {row.age}{' '}
                        {t('yrs', conv('歲'))}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-700">
                        {conv(row.policySummaryZh)}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600">
                        {row.vhisEligible ? 'VHIS HK$8,000' : '—'}
                        {row.qdapEligible ? ' ＋ QDAP' : ''}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                        HK$ {row.annualPremiumHkd.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        {isSelf ? (
                          <span className="text-[11px] text-slate-400">
                            {t('Primary', conv('主檔案'))}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRemoveFamilyMember(row.id)}
                            aria-label={`Remove ${row.nameEn}`}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                            <span>{t('Remove', conv('移除'))}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quick-Add Spouse / Child / Parent Form + Copy WhatsApp Summary */}
          <form
            onSubmit={handleAddFamilyMember}
            className="grid grid-cols-1 gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:grid-cols-12 items-end"
          >
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('Relation', conv('關係'))}
              </label>
              <select
                aria-label="Family member relation"
                value={memberRelation}
                onChange={(e) => {
                  const rel = e.target.value as HouseholdRelation;
                  setMemberRelation(rel);
                  if (rel === 'SPOUSE') {
                    setMemberAge('34');
                    setMemberAnnualHkd('18600');
                    setMemberSummaryZh('自願醫保半私家房 ＋ 危疾保障');
                    setMemberQdap(true);
                  } else if (rel === 'CHILD') {
                    setMemberAge('5');
                    setMemberAnnualHkd('9600');
                    setMemberSummaryZh('兒童自願醫保 ＋ 意外醫療');
                    setMemberQdap(false);
                  } else {
                    setMemberAge('62');
                    setMemberAnnualHkd('16800');
                    setMemberSummaryZh('長輩設有墊底費自願醫保');
                    setMemberQdap(false);
                  }
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900"
              >
                <option value="SPOUSE">{t('Spouse', conv('配偶（太太／先生）'))}</option>
                <option value="CHILD">{t('Child', conv('子女（小朋友）'))}</option>
                <option value="PARENT">{t('Parent', conv('父母／長輩'))}</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('Name', conv('稱呼／姓名'))}
              </label>
              <input
                type="text"
                data-testid="family-member-name-input"
                value={memberNameZh}
                onChange={(e) => setMemberNameZh(e.target.value)}
                placeholder={conv('如：陳太太 / 囡囡')}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('Age', conv('年齡'))}
              </label>
              <input
                type="number"
                min={0}
                max={99}
                value={memberAge}
                onChange={(e) => setMemberAge(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 tabular-nums"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('Annual HKD', conv('每年保費 (HK$)'))}
              </label>
              <input
                type="number"
                min={0}
                step={1}
                data-testid="family-member-premium-input"
                value={memberAnnualHkd}
                onChange={(e) => setMemberAnnualHkd(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 tabular-nums"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('Plan Note', conv('保單簡述'))}
              </label>
              <input
                type="text"
                value={memberSummaryZh}
                onChange={(e) => setMemberSummaryZh(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <label className="inline-flex items-center gap-1 text-[11px] text-slate-700 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={memberVhis}
                  onChange={(e) => setMemberVhis(e.target.checked)}
                />
                <span>VHIS</span>
              </label>
              <button
                type="submit"
                data-testid="add-family-member-btn"
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Add Member', conv('加入家人'))}</span>
              </button>
            </div>
          </form>

          <div className="flex justify-end">
            <button
              type="button"
              data-testid="copy-family-whatsapp-btn"
              onClick={async () => {
                await copyTextSafe(conv(familyOverview.whatsappFamilySummaryZh));
                flashCopied('family-wa');
                onNotify?.(
                  t(
                    'Copied whole-family policy & tax summary to clipboard!',
                    conv('已複製「家庭保單及扣稅總覽」WhatsApp 摘要！')
                  )
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
            >
              {copiedKey === 'family-wa' ? (
                <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>
                {copiedKey === 'family-wa'
                  ? t('Copied Family Summary!', conv('已複製全家保單摘要！'))
                  : t(
                      'Copy Family Policy & Tax WhatsApp Summary',
                      conv('複製「全家保單及扣稅」WhatsApp 摘要')
                    )}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 2: 1-PAGE EXISTING POLICY SUMMARY SHEET (舊保單整合對照表)        */}
      {/* ================================================================== */}
      {activeTab === 'POLICY_SUMMARY' && (
        <div data-testid="existing-policy-summary-sheet-panel" className="space-y-4">
          {(onUploadPolicyFile || onRunSampleGroupMedOcr) && (
            <div
              data-testid="existing-policy-ocr-upload-bar"
              className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-teal-200/80 bg-teal-50/50 p-3.5 text-xs"
            >
              <div className="min-w-0">
                <div className="font-bold text-slate-900">
                  {t(
                    'Smart Policy Schedule OCR Import',
                    conv('智能舊保單／公司團體醫保表單 OCR 掃描匯入')
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  {t(
                    'Upload an old policy schedule image/PDF or test with a corporate group medical sample to auto-deduct coverage gaps.',
                    conv('上傳客人舊保單截圖／PDF 或試用公司團保例子，自動讀取保額並即時扣減上方保障缺口圖。')
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {onUploadPolicyFile && (
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap">
                    <Upload className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                    <span>
                      {ocrScanningPolicy
                        ? t('Scanning...', conv('讀取保單中...'))
                        : t('Upload Policy Image/PDF', conv('上傳保單圖片／PDF'))}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf,.txt"
                      onChange={onUploadPolicyFile}
                      className="hidden"
                    />
                  </label>
                )}
                {onRunSampleGroupMedOcr && (
                  <button
                    type="button"
                    disabled={ocrScanningPolicy}
                    onClick={onRunSampleGroupMedOcr}
                    className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60 whitespace-nowrap"
                  >
                    {t('1-Click OCR Group Med Sample', conv('一鍵匯入公司醫保例子'))}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
            <div className="flex flex-wrap items-center gap-5 text-xs">
              <div>
                <span className="text-slate-500">{t('Policies Consolidated:', conv('已整合舊保單：'))}</span>{' '}
                <strong className="font-mono text-slate-900 tabular-nums">
                  {policySheet.totalPoliciesCount} {t('policies', conv('份'))}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">{t('Total Existing Annual Premium:', conv('現有每年總保費：'))}</span>{' '}
                <strong className="font-mono text-slate-900 tabular-nums">
                  HK$ {policySheet.totalAnnualPremiumHkd.toLocaleString()}
                </strong>{' '}
                <span className="text-slate-500 tabular-nums">
                  (≈ HK$ {policySheet.totalMonthlyEquivalentHkd.toLocaleString()}/{t('mo', conv('月'))})
                </span>
              </div>
              {policySheet.missingDimensionsZh.length > 0 && (
                <div className="text-amber-800 font-medium">
                  {t('Uncovered areas:', conv('尚未覆蓋範疇：'))}{' '}
                  {conv(policySheet.missingDimensionsZh.join('、'))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {policySheet.totalPoliciesCount === 0 && (
                <button
                  type="button"
                  data-testid="load-sample-existing-policies-btn"
                  onClick={handleLoadSamplePolicies}
                  className="inline-flex items-center gap-1 rounded-lg border border-teal-600/40 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-100 whitespace-nowrap"
                >
                  <Sparkles className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                  <span>{t('Load Sample Old Policies', conv('一鍵載入常見舊單例子'))}</span>
                </button>
              )}

              <button
                type="button"
                data-testid="copy-policy-sheet-whatsapp-btn"
                onClick={async () => {
                  await copyTextSafe(conv(policySheet.formattedWhatsappSummaryZh));
                  flashCopied('pol-sheet');
                  onNotify?.(
                    t(
                      'Copied 1-Page Existing Policy Summary to clipboard!',
                      conv('已複製「現有保單一覽表」WhatsApp 摘要！')
                    )
                  );
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
              >
                {copiedKey === 'pol-sheet' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {copiedKey === 'pol-sheet'
                    ? t('Copied!', conv('已複製！'))
                    : t('Copy Summary for Client', conv('複製一覽表發畀客'))}
                </span>
              </button>

              <button
                type="button"
                data-testid="download-policy-sheet-txt-btn"
                onClick={() => {
                  const safeName = lead.fullNameEn.replace(/\s+/g, '_');
                  triggerBrowserDownload(
                    `Existing_Policy_Summary_${safeName}.txt`,
                    conv(policySheet.printableTextReportZh),
                    'text/plain;charset=utf-8'
                  );
                  onNotify?.(
                    t(
                      'Downloaded 1-Page Existing Policy Summary Sheet!',
                      conv('已下載單頁「客戶現有保單整合對照表」檔案！')
                    )
                  );
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Download 1-Page Sheet', conv('下載單頁對照表'))}</span>
              </button>
            </div>
          </div>

          {/* Consolidated Existing Policies Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[700px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 whitespace-nowrap">
                  <th className="py-2.5 px-3.5 font-semibold">{t('Policy No. & Plan / Insurer', conv('保單編號及公司／計劃名稱'))}</th>
                  <th className="py-2.5 px-3.5 font-semibold">{t('Category', conv('保障類別'))}</th>
                  <th className="py-2.5 px-3.5 text-right font-semibold">{t('Sum Assured / Limit', conv('保額／上限'))}</th>
                  <th className="py-2.5 px-3.5 text-right font-semibold">{t('Annual Premium', conv('每年保費'))}</th>
                  <th className="py-2.5 px-3.5 font-semibold">{t('Key Clause / Note', conv('條款留意位／備註'))}</th>
                  <th className="py-2.5 px-3.5 text-right font-semibold">{t('Action', conv('操作'))}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(lead.existingPolicies || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-xs text-slate-500">
                      {t(
                        'No existing policies added yet. Add below or click "Load Sample Old Policies" to preview.',
                        conv('目前未有舊保單紀錄，可喺下方輸入新增，或撳右上角「一鍵載入常見舊單例子」。')
                      )}
                    </td>
                  </tr>
                ) : (
                  (lead.existingPolicies || []).map((pol) => (
                    <tr key={pol.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3.5">
                        {pol.policyNumber && (
                          <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                            {pol.policyNumber}
                          </span>
                        )}
                        <span className="font-semibold text-slate-900">{conv(pol.policyName)}</span>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600">
                        {lang === 'en'
                          ? DIMENSION_LABELS[pol.dimensionId]?.en
                          : conv(DIMENSION_LABELS[pol.dimensionId]?.zh || '一般保障')}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        HK$ {pol.coverageAmountHkd.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        HK$ {pol.annualPremiumHkd.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600">
                        {pol.limitationNote ? conv(pol.limitationNote) : '—'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingPolicy(pol.id)}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          <span>{t('Delete', conv('移除'))}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Quick Add Existing Policy Row */}
          <form
            onSubmit={handleAddExistingPolicy}
            className="grid grid-cols-1 gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:grid-cols-12 items-end"
          >
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('Insurer & Plan Name', conv('保險公司及舊單名稱'))}
              </label>
              <input
                type="text"
                data-testid="existing-pol-name-input"
                value={polInsurerAndName}
                onChange={(e) => setPolInsurerAndName(e.target.value)}
                placeholder={conv('如：保誠危疾加倍保 / 公司團保')}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('Category', conv('保障類別'))}
              </label>
              <select
                aria-label="Existing policy category"
                value={polDimension}
                onChange={(e) =>
                  setPolDimension(e.target.value as ProtectionDimensionId)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900"
              >
                {(
                  Object.keys(DIMENSION_LABELS) as ProtectionDimensionId[]
                ).map((dim) => (
                  <option key={dim} value={dim}>
                    {lang === 'en'
                      ? DIMENSION_LABELS[dim].en
                      : conv(DIMENSION_LABELS[dim].zh)}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('Coverage (HK$)', conv('保額／上限 (HK$)'))}
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={polCoverageHkd}
                onChange={(e) => setPolCoverageHkd(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 tabular-nums"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('Annual Prem (HK$)', conv('每年保費 (HK$)'))}
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={polAnnualPremHkd}
                onChange={(e) => setPolAnnualPremHkd(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 tabular-nums"
              />
            </div>

            <div className="sm:col-span-3 flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {t('Note / Policy No.', conv('備註（如：單次賠付／離職失效）'))}
                </label>
                <input
                  type="text"
                  value={polNote}
                  onChange={(e) => setPolNote(e.target.value)}
                  placeholder={conv('選填')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900"
                />
              </div>
              <button
                type="submit"
                data-testid="add-existing-pol-sheet-btn"
                className="mt-5 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Add', conv('加入'))}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 3: .ICS FOLLOW-UP CALENDAR REMINDER EXPORT (日曆提醒一鍵匯出)    */}
      {/* ================================================================== */}
      {activeTab === 'CALENDAR_ICS' && (
        <div data-testid="followup-calendar-ics-panel" className="space-y-4">
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('Policy Reference (Optional)', conv('保單／申請編號（選填）'))}
              </label>
              <input
                type="text"
                value={policyRefInput}
                onChange={(e) => setPolicyRefInput(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('Next Renewal Date', conv('下次續保到期日'))}
              </label>
              <input
                type="date"
                value={renewalDateIso}
                onChange={(e) => setRenewalDateIso(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs text-slate-900 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('Client Birthday (MM-DD)', conv('客戶生日月份日期 (MM-DD)'))}
              </label>
              <input
                type="text"
                value={birthdayMd}
                onChange={(e) => setBirthdayMd(e.target.value)}
                placeholder="08-18"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs text-slate-900 tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              data-testid="export-ics-cooling-btn"
              onClick={() => handleExportCalendarIcs('COOLING_OFF_21D')}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left hover:border-teal-600 transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {t('21-Day Cooling-Off Check', conv('21 日冷靜期跟進提醒'))}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t(
                    'Sets an alert on Day 18 before cooling-off ends to confirm e-policy receipt.',
                    conv('自動設於冷靜期屆滿前（第 18 日）彈通知，提醒關心客戶有冇收妥保單。')
                  )}
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-800">
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Download .ics', conv('下載 .ics 日曆檔'))}</span>
              </span>
            </button>

            <button
              type="button"
              data-testid="export-ics-renewal-btn"
              onClick={() => handleExportCalendarIcs('RENEWAL_30D')}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left hover:border-teal-600 transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {t('30-Day Pre-Renewal Alert', conv('續保前 30 日每年提醒'))}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t(
                    'Annual recurring alert 30 days before policy anniversary for eDDA & FX check.',
                    conv('每年保單週年前 30 日自動重複提醒，方便提早通知客戶準備轉帳及做年檢。')
                  )}
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-800">
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Download .ics', conv('下載 .ics 日曆檔'))}</span>
              </span>
            </button>

            <button
              type="button"
              data-testid="export-ics-birthday-btn"
              onClick={() => handleExportCalendarIcs('CLIENT_BIRTHDAY')}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left hover:border-teal-600 transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {t('Client Birthday & Age-Change', conv('客戶生日及轉保齡提醒'))}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t(
                    'Annual birthday greeting + insurance age backdating upsell reminder.',
                    conv('每年客戶生日朝早提醒發祝福，兼把握轉保齡前加保或追溯保齡優惠。')
                  )}
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-800">
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Download .ics', conv('下載 .ics 日曆檔'))}</span>
              </span>
            </button>

            <button
              type="button"
              data-testid="export-ics-all-bundle-btn"
              onClick={() => handleExportCalendarIcs('ALL_BUNDLE')}
              className="flex flex-col justify-between rounded-xl border border-slate-900 bg-slate-900 p-3.5 text-left text-white hover:bg-slate-800 transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-amber-300">
                  {t('Export All 3 Reminders (.ics)', conv('一鍵打包全套 3 個提醒 (.ics)'))}
                </div>
                <p className="mt-1 text-[11px] text-slate-300">
                  {t(
                    'Imports Cooling-Off + Annual Renewal + Birthday into iPhone / Google / Outlook in 1 file.',
                    conv('一個檔案包晒冷靜期、每年續保同客戶生日，直接匯入 iPhone／Google／Outlook 日曆！')
                  )}
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-300">
                <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Download Full Pack (.ics)', conv('下載全套日曆包 (.ics)'))}</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
