import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileSearch,
  Mic,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { copyTextSafe } from '../utils/clipboardAndDom';
import {
  auditExistingPolicyDeterministically,
  buildDeterministicQrMatrix,
  buildHouseholdAndReferralTree,
  buildIamSmartVerificationHandshake,
  buildTalentAndMcvSigningConciergePack,
  buildTeamDirectorMdrtAndBackdateBoard,
  calculateGroupMedicalToVhisBridge,
  calculateHkMpfAndGbaRetirementWaterfall,
  calculateOverseasTuitionWithdrawalPlan,
  calculatePromoRebateAndPrepaidStack,
  calculateSmeKeymanAndBuySell,
  CLIENT_DISCHARGE_CHECKLIST_ITEMS,
  ClientMicrositeRecord,
  createClientMicrositeProposal,
  createWhatsAppComplianceLog,
  evaluateGn16CohortStability,
  evaluatePersistencyAndClawbackLedger,
  evaluateSurgeonFeeBenchmark,
  GBA_AND_HK_RETIREMENT_VENUES,
  HK_CASHLESS_SPECIALIST_CENTRES,
  HK_GN16_MULTI_YEAR_SERIES,
  HK_INSURER_SLA_THERMOMETER,
  HK_PRIVATE_SURGEON_FEE_BENCHMARKS,
  HK_QUARTERLY_PROMO_CAMPAIGNS,
  HK_UNDERWRITING_PRECEDENT_VAULT,
  LegacyPolicyAuditResult,
  OVERSEAS_TUITION_BASELINES_2026,
  RetirementLifestyleVenue,
  SAMPLE_LEGACY_POLICY_TEXTS,
  simulateInsuranceTrustVsPolicySplit,
  StudyDestination,
  triageLabBiomarkers,
  TWENTY_LIVE_UPGRADES_META,
  TwentyUpgradeCode,
  WhatsAppComplianceLogEntry,
  WhiteLabelBrandConfig,
} from '../domain/twentyUpgradesEngine';
import { localizePlanStrings, toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  ClientLead,
  CurrencyCode,
  FnaRecord,
  InsurancePlan,
  IntermediaryProfile,
  LeadStage,
  PlanCategory,
} from '../domain/types';
import { triggerBrowserDownload } from '../services/pdfGenerator';
import {
  ClientMicrositeView,
  ScannableProposalQrSvg,
} from './ClientMicrositeView';
import { PWAInstallButton, useOnlineStatus } from './PwaControls';

/**
 * Reusable panel combining IMP-03 (HK Private Surgeon Fee Median Benchmark + Cashless Day-Case Centres)
 * and IMP-14 (Insurer UW / LOG / Claims SLA Turnaround Thermometer + Discharge Checklist).
 * Mounted in both Section 06 (Private Hospital LOG Hub) and Section 09 (20 Live Upgrades Hub).
 */
export const SurgeonAndSlaBenchmarksPanel: React.FC<{
  mode?: 'BOTH' | 'IMP-03' | 'IMP-14';
}> = ({ mode = 'BOTH' }) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  // IMP-03 State
  const [surgId, setSurgId] = useState<string>(HK_PRIVATE_SURGEON_FEE_BENCHMARKS[4].id);
  const [percentile, setPercentile] = useState<'P50_MEDIAN' | 'P90_PREMIER'>('P50_MEDIAN');
  const [planTier, setPlanTier] = useState<
    'VHIS_STANDARD' | 'VHIS_FLEXI_85_SMM' | 'HIGH_END_FULL_COVER'
  >('VHIS_FLEXI_85_SMM');
  const [deductibleHkd, setDeductibleHkd] = useState<number>(0);
  const [centreSearch, setCentreSearch] = useState<string>('');

  // IMP-14 State
  const [checkedDischargeIds, setCheckedDischargeIds] = useState<string[]>(['chk-1', 'chk-2']);
  const [copiedDischarge, setCopiedDischarge] = useState(false);

  const surgEval = useMemo(
    () =>
      evaluateSurgeonFeeBenchmark({
        benchmarkId: surgId,
        percentile,
        planTier,
        deductibleHkd,
      }),
    [surgId, percentile, planTier, deductibleHkd]
  );

  const filteredCentres = useMemo(() => {
    const q = centreSearch.trim().toLowerCase();
    if (!q) return HK_CASHLESS_SPECIALIST_CENTRES;
    return HK_CASHLESS_SPECIALIST_CENTRES.filter((c) => {
      const blob = `${c.centreNameZh} ${c.centreNameEn} ${c.specialtyZh} ${c.specialtyEn} ${c.districtZh} ${c.directBillingInsurers.join(' ')}`;
      return `${blob} ${toSimplifiedChinese(blob)}`.toLowerCase().includes(q);
    });
  }, [centreSearch]);

  const showImp03 = mode === 'BOTH' || mode === 'IMP-03';
  const showImp14 = mode === 'BOTH' || mode === 'IMP-14';

  return (
    <div className="space-y-6">
      {showImp03 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <p className="font-mono text-xs text-blue-700">
              IMP-03 · {t('Surgeon Fee Median & Cashless Specialist Network', '私家醫院手術收費中位數及免找數專科網絡')}
            </p>
            <h3 className="mt-1 text-base font-bold text-slate-900">
              {t(
                'HK Private Hospital Historical Bill Median (P50 / P90) vs. VHIS Schedule Cap',
                '香港私家醫院手術歷史收費統計（第50／90百分位）對比自願醫保賠償上限'
              )}
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              {t(
                'Visually demonstrates why statutory VHIS Standard caps leave large surgeon/OT shortfalls on major surgeries, and locates $0-deposit day-case centres.',
                '用真實私家醫院收費中位數與養和／明德級 90 百分位收費，直觀展示為何普通標準計劃不足以覆蓋複雜微創手術。'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="imp03-surg-select" className="block text-xs font-semibold text-slate-700">
                {t('Select Private Procedure', '選擇私家醫院手術項目')}
              </label>
              <select
                id="imp03-surg-select"
                value={surgId}
                onChange={(e) => setSurgId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                {HK_PRIVATE_SURGEON_FEE_BENCHMARKS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {t(b.procedureEn, b.procedureZh)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700">
                {t('Hospital Fee Percentile', '私院收費百分位基準')}
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setPercentile('P50_MEDIAN')}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                    percentile === 'P50_MEDIAN'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('P50 Median', 'P50 全港中位數')}
                </button>
                <button
                  type="button"
                  onClick={() => setPercentile('P90_PREMIER')}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                    percentile === 'P90_PREMIER'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('P90 Top Hospital', 'P90 頂級私院')}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="imp03-tier-select" className="block text-xs font-semibold text-slate-700">
                {t('Client Medical Plan Tier', '客戶醫保計劃級別')}
              </label>
              <select
                id="imp03-tier-select"
                value={planTier}
                onChange={(e) => setPlanTier(e.target.value as any)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                <option value="VHIS_STANDARD">{t('VHIS Standard Plan', '自願醫保標準計劃')}</option>
                <option value="VHIS_FLEXI_85_SMM">
                  {t('VHIS Flexi (85% SMM)', '自願醫保靈活（85%額外醫療）')}
                </option>
                <option value="HIGH_END_FULL_COVER">
                  {t('Full-Cover Flexi / High-End', '全數賠償靈活／高端醫療')}
                </option>
              </select>
            </div>

            <div>
              <label htmlFor="imp03-ded-select" className="block text-xs font-semibold text-slate-700">
                {t('Annual Deductible', '年度自付費選項')}
              </label>
              <select
                id="imp03-ded-select"
                value={deductibleHkd}
                onChange={(e) => setDeductibleHkd(Number(e.target.value))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-semibold text-slate-900 tabular-nums"
              >
                <option value={0}>HK$0</option>
                <option value={16000}>HK$16,000</option>
                <option value={25000}>HK$25,000</option>
                <option value={50000}>HK$50,000</option>
              </select>
            </div>
          </div>

          {/* Proportional Coverage Bar */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono tabular-nums">
              <div>
                <span className="font-sans text-xs text-slate-500">
                  {t('Total Hospital Bill', '私院預計總帳單')}
                </span>
                <p className="mt-0.5 text-lg font-bold text-slate-900">
                  HK${surgEval.totalBillHkd.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="font-sans text-xs text-slate-500">
                  {t('Surgeon Fee Median', '主診外科醫生費中位數')}
                </span>
                <p className="mt-0.5 text-lg font-bold text-slate-700">
                  HK${surgEval.entry.surgeonFeeMedianHkd.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="font-sans text-xs text-slate-500">
                  {t('Insurer Reimbursed', '保險公司預計賠付')}
                </span>
                <p className="mt-0.5 text-lg font-bold text-emerald-700">
                  HK${surgEval.insurerPaidHkd.toLocaleString()} ({surgEval.coveragePct}%)
                </p>
              </div>
              <div>
                <span className="font-sans text-xs text-slate-500">
                  {t('Client Out-of-Pocket', '客戶需自付差額')}
                </span>
                <p
                  className={`mt-0.5 text-lg font-bold ${
                    surgEval.clientOutOfPocketHkd === 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  HK${surgEval.clientOutOfPocketHkd.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex h-3.5 w-full overflow-hidden rounded bg-slate-200">
                <div
                  style={{ width: `${surgEval.coveragePct}%` }}
                  className="bg-emerald-600"
                />
                <div
                  style={{ width: `${100 - surgEval.coveragePct}%` }}
                  className="bg-rose-600"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-600 font-mono tabular-nums">
                <span>
                  {t('VHIS Statutory Cap Reference:', '自願醫保標準上限參考：')} HK$
                  {surgEval.entry.vhisStandardCapHkd.toLocaleString()} ·{' '}
                  {surgEval.entry.vhisCategory === 'COMPLEX'
                    ? t('Complex Tier', '複雜手術級別')
                    : surgEval.entry.vhisCategory === 'MAJOR'
                      ? t('Major Tier', '大型手術級別')
                      : t('Intermediate Tier', '中型手術級別')}
                </span>
                <span>
                  {t('Anaesthetist + OT + Ward:', '麻醉師＋手術室＋雜費：')} HK$
                  {surgEval.entry.anaesthetistAndOtMedianHkd.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Cashless Day-Case Specialist Centres */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h4 className="text-xs font-bold text-slate-900">
                {t(
                  'HK $0-Deposit Direct-Billing Day-Case Specialist Centres',
                  '香港 $0 按金網絡日間專科及內視鏡直付中心速查'
                )}
              </h4>
              <div className="relative w-full sm:w-64">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Search cashless specialist centre"
                  value={centreSearch}
                  onChange={(e) => setCentreSearch(e.target.value)}
                  placeholder={t('Filter Central, TST, AIA, Bupa...', '搜尋中環、尖沙咀、腸胃、AIA...')}
                  className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filteredCentres.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>{t(c.districtEn, conv(c.districtZh))}</span>
                    <span className="font-mono font-bold text-emerald-700 tabular-nums">
                      {t('Deposit: HK$0', '免找數按金：HK$0')}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900">{t(c.centreNameEn, conv(c.centreNameZh))}</p>
                  <p className="text-slate-600">{t(c.specialtyEn, conv(c.specialtyZh))}</p>
                  <p className="font-mono text-[11px] text-blue-700">
                    {t('Direct Billing:', '直付合作保司：')} {c.directBillingInsurers.join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showImp14 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <p className="font-mono text-xs text-blue-700">
              IMP-14 · {t('Insurer UW / LOG / Claims SLA Turnaround Thermometer', '保司核保、免找數批核及理賠時效溫度計')}
            </p>
            <h3 className="mt-1 text-base font-bold text-slate-900">
              {t(
                'Live Insurer Turnaround Benchmark & Client Discharge Original-Receipt Checklist',
                '香港主要保司批核時效橫向評測 ＋ 客戶出院必備正本單據清單'
              )}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-3 font-semibold">{t('Insurer', '保險公司')}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">
                    {t('Clean e-UW', '標準件自動核保')}
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right">
                    {t('Medical UW', '體檢／病歷核保')}
                  </th>
                  <th className="py-2.5 px-3 font-semibold">
                    {t('Hospital LOG Pre-Approval', '私院免找數 LOG 批核時數')}
                  </th>
                  <th className="py-2.5 pl-3 font-semibold text-right">
                    {t('Minor Claim', '一般門診／日間理賠')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {HK_INSURER_SLA_THERMOMETER.map((row) => {
                  const barPct = Math.min(100, Math.round((row.hospitalLogHours / 54) * 100));
                  return (
                    <tr key={row.insurerCode} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-3 font-sans font-bold text-slate-900">
                        {t(row.insurerNameEn, conv(row.insurerNameZh))}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                        {row.cleanEuwDays}d
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {row.medicalUwDays}d
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-28 overflow-hidden rounded bg-slate-100">
                            <div
                              style={{ width: `${barPct}%` }}
                              className={
                                row.hospitalLogHours <= 30 ? 'h-full bg-emerald-600' : 'h-full bg-blue-600'
                              }
                            />
                          </div>
                          <span className="text-slate-800">{row.hospitalLogHours} hrs</span>
                        </div>
                      </td>
                      <td className="py-2.5 pl-3 text-right text-blue-700 font-semibold">
                        {row.minorClaimDays}d
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900">
                {t(
                  'Hospital Discharge Original-Receipt Checklist (Send to Client Before Checkout)',
                  '客戶出院前必取正本文件核對表（一鍵複製發送予出院客戶）'
                )}
              </h4>
              <button
                type="button"
                onClick={() => {
                  const text = CLIENT_DISCHARGE_CHECKLIST_ITEMS.map(
                    (it, idx) => `${idx + 1}. ${lang === 'en' ? it.en : conv(it.zh)}`
                  ).join('\n');
                  void copyTextSafe(text);
                  setCopiedDischarge(true);
                  setTimeout(() => setCopiedDischarge(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {copiedDischarge
                    ? t('Checklist Copied!', '已複製出院清單！')
                    : t('Copy Discharge Checklist', '複製出院文件清單')}
                </span>
              </button>
            </div>

            <div className="space-y-2">
              {CLIENT_DISCHARGE_CHECKLIST_ITEMS.map((item) => {
                const checked = checkedDischargeIds.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setCheckedDischargeIds((prev) =>
                          prev.includes(item.id)
                            ? prev.filter((x) => x !== item.id)
                            : [...prev, item.id]
                        )
                      }
                      className="mt-0.5 rounded border-slate-300 text-blue-700"
                    />
                    <span>{lang === 'en' ? item.en : conv(item.zh)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN 20-UPGRADE INTERACTIVE WORKBENCH (IMP-01 TO IMP-20)
// ============================================================================

export interface TwentyUpgradesHubProps {
  activeCode: TwentyUpgradeCode;
  onSelectCode: (code: TwentyUpgradeCode) => void;
  leads: ClientLead[];
  activeLead: ClientLead;
  onAddLead: (newLead: ClientLead) => void;
  onUpdateLead: (leadId: string, updater: (prev: ClientLead) => ClientLead) => void;
  plans: InsurancePlan[];
  selectedPlanId: string;
  onSelectPlanId: (planId: string) => void;
  intermediary: IntermediaryProfile;
  currency: CurrencyCode;
  sumAssuredUsd: number;
  paymentTermYears: number;
  whiteLabelConfig: WhiteLabelBrandConfig;
  onChangeWhiteLabelConfig: (next: WhiteLabelBrandConfig) => void;
  microsites: ClientMicrositeRecord[];
  onCreateMicrosite: (record: ClientMicrositeRecord) => Promise<void>;
  onLogMicrositeRead: (id: string, inspectedPolicyYear: number) => Promise<void>;
  whatsappAuditLogs: WhatsAppComplianceLogEntry[];
  onAppendWhatsappAuditLog: (entry: WhatsAppComplianceLogEntry) => void;
  onJumpToSection?: (section: 'market' | 'crm' | 'stp' | 'intel') => void;
  embeddedSingleTool?: boolean;
}

export const TwentyUpgradesHub: React.FC<TwentyUpgradesHubProps> = ({
  activeCode,
  onSelectCode,
  leads,
  activeLead,
  onAddLead,
  onUpdateLead,
  plans,
  selectedPlanId,
  onSelectPlanId,
  intermediary,
  currency,
  sumAssuredUsd,
  paymentTermYears,
  whiteLabelConfig,
  onChangeWhiteLabelConfig,
  microsites,
  onCreateMicrosite,
  onLogMicrositeRead,
  whatsappAuditLogs,
  onAppendWhatsappAuditLog,
  onJumpToSection,
  embeddedSingleTool = false,
}) => {
  const { lang, t } = useLanguage();
  const isOnline = useOnlineStatus();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const activePlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || plans[0],
    [plans, selectedPlanId]
  );
  const activeMeta = useMemo(
    () => TWENTY_LIVE_UPGRADES_META.find((m) => m.code === activeCode) || TWENTY_LIVE_UPGRADES_META[0],
    [activeCode]
  );

  // Pillar Filter for the 20-button selector
  const [pillarFilter, setPillarFilter] = useState<
    'ALL' | 'CLOSING_REVENUE' | 'UX_CLIENT_TRUST' | 'AI_AUTOMATION' | 'COMPLIANCE_TEAM_SAAS'
  >('ALL');

  const visibleMetaButtons = useMemo(() => {
    if (pillarFilter === 'ALL') return TWENTY_LIVE_UPGRADES_META;
    return TWENTY_LIVE_UPGRADES_META.filter((m) => m.pillar === pillarFilter);
  }, [pillarFilter]);

  // IMP-01 State
  const [previewMicrosite, setPreviewMicrosite] = useState<ClientMicrositeRecord | null>(null);
  const [copiedMicrositeId, setCopiedMicrositeId] = useState<string | null>(null);
  const [creatingMicrosite, setCreatingMicrosite] = useState(false);

  // IMP-02 State
  const [legacySampleId, setLegacySampleId] = useState<string>(SAMPLE_LEGACY_POLICY_TEXTS[0].id);
  const [legacyText, setLegacyText] = useState<string>(SAMPLE_LEGACY_POLICY_TEXTS[0].rawText);
  const [auditingPolicy, setAuditingPolicy] = useState(false);
  const [legacyAuditResult, setLegacyAuditResult] = useState<LegacyPolicyAuditResult>(() =>
    auditExistingPolicyDeterministically(SAMPLE_LEGACY_POLICY_TEXTS[0].rawText)
  );

  // IMP-04 State
  const [visaCategory, setVisaCategory] = useState<
    'MCV_VISITOR' | 'TOP_TALENT_TTPS' | 'IANG_WORK_VISA'
  >('TOP_TALENT_TTPS');
  const [arrivalHub, setArrivalHub] = useState<'WEST_KOWLOON_HSR' | 'HK_AIRPORT' | 'LOK_MA_CHAU'>(
    'WEST_KOWLOON_HSR'
  );
  const [preferredBank, setPreferredBank] = useState<'HSBC_HK' | 'BOCHK' | 'ZA_BANK_DIGITAL'>(
    'HSBC_HK'
  );
  const [signingDistrict, setSigningDistrict] = useState<'TST_CANTON_RD' | 'CAUSEWAY_BAY'>(
    'TST_CANTON_RD'
  );
  const [copiedConcierge, setCopiedConcierge] = useState(false);

  // IMP-05 State
  const [voiceTranscript, setVoiceTranscript] = useState<string>(
    '今日同陳生喺中環傾咗半個鐘，佢月入大約 HK$92,000，每月家庭開支 HK$38,000，手頭流動現金約 HK$1,800,000，有太太同 1 個 5 歲小朋友（共 2 名受養人），風險取向穩健平衡，最想做齊自願醫保免找數、多重危疾同小朋友 18 歲英國升學儲蓄。'
  );
  const [parsingVoice, setParsingVoice] = useState(false);
  const [voiceSyncedNotice, setVoiceSyncedNotice] = useState<string | null>(null);

  // IMP-06 State
  const [gn16Insurer, setGn16Insurer] = useState<string>('FWD');

  // IMP-07 State
  const [addedFamilyNodeIds, setAddedFamilyNodeIds] = useState<string[]>([]);

  // IMP-08 State
  const [advisorSplitPct, setAdvisorSplitPct] = useState<number>(85);
  const [rescuedCount, setRescuedCount] = useState<number>(0);

  // IMP-09 State
  const [trustDbUsd, setTrustDbUsd] = useState<number>(1500000);
  const [trustYears, setTrustYears] = useState<number>(20);

  // IMP-10 State
  const [smeValuationHkd, setSmeValuationHkd] = useState<number>(18000000);
  const [smeKeymanProfitHkd, setSmeKeymanProfitHkd] = useState<number>(3500000);
  const [smeRecoveryYrs, setSmeRecoveryYrs] = useState<number>(2);
  const [smeEquityPct, setSmeEquityPct] = useState<number>(35);
  const [smeStructure, setSmeStructure] = useState<'PURE_TERM_KEYMAN' | 'CASH_VALUE_SAVINGS'>(
    'PURE_TERM_KEYMAN'
  );

  // IMP-11 State
  const [exitAge, setExitAge] = useState<number>(58);
  const [empSurgCapHkd, setEmpSurgCapHkd] = useState<number>(30000);
  const [bridgeDedHkd, setBridgeDedHkd] = useState<16000 | 25000 | 50000>(25000);

  // IMP-12 State
  const [studyDest, setStudyDest] = useState<StudyDestination>('UK_GBP');
  const [childAge, setChildAge] = useState<number>(5);

  // IMP-13 State
  const [uwQuery, setUwQuery] = useState<string>('');
  const [labBmi, setLabBmi] = useState<number>(24.2);
  const [labSbp, setLabSbp] = useState<number>(126);
  const [labHba1c, setLabHba1c] = useState<number>(5.5);
  const [labAlt, setLabAlt] = useState<number>(34);

  // IMP-15 State
  const [promoInsurer, setPromoInsurer] = useState<string>('PRU');
  const [promoAnnualUsd, setPromoAnnualUsd] = useState<number>(30000);
  const [prepay5Yr, setPrepay5Yr] = useState<boolean>(true);
  const [tdRenewalRate, setTdRenewalRate] = useState<number>(2.1);

  // IMP-17 State
  const [offlineSnapshotSavedAt, setOfflineSnapshotSavedAt] = useState<string | null>(null);

  // IMP-19 State
  const [retireVenue, setRetireVenue] = useState<RetirementLifestyleVenue>(
    'GBA_SHENZHEN_ZHUHAI_WELLNESS'
  );
  const [mpfAt65Hkd, setMpfAt65Hkd] = useState<number>(2600000);
  const [monthlyQdapHkd, setMonthlyQdapHkd] = useState<number>(8500);
  const [monthlySavDrawHkd, setMonthlySavDrawHkd] = useState<number>(12000);

  // IMP-20 State
  const [waTopicInput, setWaTopicInput] = useState<string>(
    '發送盈聚天下／盈御 3 保證與非保證退保價值分離披露及 21 日冷靜期說明'
  );
  const [iamHandshakeResult, setIamHandshakeResult] = useState<ReturnType<
    typeof buildIamSmartVerificationHandshake
  > | null>(null);

  // Derived computations
  const conciergePack = useMemo(
    () =>
      buildTalentAndMcvSigningConciergePack({
        clientName: `${activeLead.fullNameZh} (${activeLead.fullNameEn})`,
        visaCategory,
        arrivalHub,
        preferredBank,
        signingDistrict,
        lang,
      }),
    [activeLead, visaCategory, arrivalHub, preferredBank, signingDistrict, lang]
  );

  const gn16Eval = useMemo(() => evaluateGn16CohortStability(gn16Insurer), [gn16Insurer]);
  const familyTree = useMemo(() => buildHouseholdAndReferralTree(activeLead), [activeLead]);
  const persistencyEval = useMemo(
    () =>
      evaluatePersistencyAndClawbackLedger({
        advisorSplitOverridePct: advisorSplitPct,
        savedPoliciesCount: rescuedCount,
      }),
    [advisorSplitPct, rescuedCount]
  );
  const trustEval = useMemo(
    () =>
      simulateInsuranceTrustVsPolicySplit({
        deathBenefitUsd: trustDbUsd,
        payoutYears: trustYears,
      }),
    [trustDbUsd, trustYears]
  );
  const smeEval = useMemo(
    () =>
      calculateSmeKeymanAndBuySell({
        companyValuationHkd: smeValuationHkd,
        keymanGrossProfitContributionHkd: smeKeymanProfitHkd,
        recoveryYears: smeRecoveryYrs,
        shareholderCount: 3,
        founderEquityPct: smeEquityPct,
        policyStructure: smeStructure,
      }),
    [smeValuationHkd, smeKeymanProfitHkd, smeRecoveryYrs, smeEquityPct, smeStructure]
  );
  const bridgeEval = useMemo(
    () =>
      calculateGroupMedicalToVhisBridge({
        currentAge: activeLead.age,
        plannedExitAge: exitAge,
        employerSurgicalLimitHkd: empSurgCapHkd,
        selectedDeductibleHkd: bridgeDedHkd,
      }),
    [activeLead.age, exitAge, empSurgCapHkd, bridgeDedHkd]
  );
  const tuitionEval = useMemo(
    () =>
      calculateOverseasTuitionWithdrawalPlan({
        destination: studyDest,
        childCurrentAge: childAge,
      }),
    [studyDest, childAge]
  );
  const filteredUwVault = useMemo(() => {
    const q = uwQuery.trim().toLowerCase();
    if (!q) return HK_UNDERWRITING_PRECEDENT_VAULT;
    return HK_UNDERWRITING_PRECEDENT_VAULT.filter((u) =>
      `${u.conditionZh} ${u.conditionEn} ${u.biomarkerRange} ${toSimplifiedChinese(u.conditionZh)}`
        .toLowerCase()
        .includes(q)
    );
  }, [uwQuery]);
  const labTriage = useMemo(
    () =>
      triageLabBiomarkers({
        bmi: labBmi,
        systolicBp: labSbp,
        hba1cPct: labHba1c,
        altUl: labAlt,
      }),
    [labBmi, labSbp, labHba1c, labAlt]
  );
  const selectedPromo = useMemo(
    () =>
      HK_QUARTERLY_PROMO_CAMPAIGNS.find((c) => c.insurerCode === promoInsurer) ||
      HK_QUARTERLY_PROMO_CAMPAIGNS[0],
    [promoInsurer]
  );
  const promoStack = useMemo(
    () =>
      calculatePromoRebateAndPrepaidStack({
        annualPremiumUsd: promoAnnualUsd,
        firstYearRebatePct: selectedPromo.firstYearRebatePct,
        prepaidGuaranteedRatePct: selectedPromo.prepaidGuaranteedRatePct,
        prepayFull5Years: prepay5Yr,
        bankTdYear1RatePct: 4.2,
        bankTdRenewalRatePct: tdRenewalRate,
      }),
    [promoAnnualUsd, selectedPromo, prepay5Yr, tdRenewalRate]
  );
  const qrPreviewMatrix = useMemo(
    () =>
      buildDeterministicQrMatrix(
        `${whiteLabelConfig.practiceTitleEn}|${whiteLabelConfig.contactChannelLabel}|${intermediary.iaLicenseNo}`
      ),
    [whiteLabelConfig, intermediary.iaLicenseNo]
  );
  const teamBoard = useMemo(() => buildTeamDirectorMdrtAndBackdateBoard(leads), [leads]);
  const gbaWaterfall = useMemo(
    () =>
      calculateHkMpfAndGbaRetirementWaterfall({
        venue: retireVenue,
        mpfProjectedAt65Hkd: mpfAt65Hkd,
        monthlyAnnuityAndQdapHkd: monthlyQdapHkd,
        monthlyParticipatingWithdrawalHkd: monthlySavDrawHkd,
      }),
    [retireVenue, mpfAt65Hkd, monthlyQdapHkd, monthlySavDrawHkd]
  );

  // Action Handlers
  const handleRunLegacyPolicyAudit = async () => {
    setAuditingPolicy(true);
    try {
      const res = await fetch('/api/ai/audit-existing-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: legacyText }),
      });
      if (res.ok) {
        const data = await res.json();
        setLegacyAuditResult(data);
      } else {
        setLegacyAuditResult(auditExistingPolicyDeterministically(legacyText));
      }
    } catch {
      setLegacyAuditResult(auditExistingPolicyDeterministically(legacyText));
    } finally {
      setAuditingPolicy(false);
    }
  };

  const handleSyncVoiceToLeadFna = async () => {
    if (!voiceTranscript.trim()) return;
    setParsingVoice(true);
    setVoiceSyncedNotice(null);
    try {
      const res = await fetch('/api/ai/voice-fna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: voiceTranscript }),
      });
      const parsed = res.ok ? await res.json() : null;
      const newFna: FnaRecord = {
        monthlyIncomeHkd: Number(parsed?.monthlyIncomeHkd) || 85000,
        monthlyExpensesHkd: Number(parsed?.monthlyExpensesHkd) || 35000,
        liquidAssetsHkd: Number(parsed?.liquidAssetsHkd) || 1500000,
        dependentsCount: Number.isFinite(Number(parsed?.dependentsCount))
          ? Number(parsed.dependentsCount)
          : 2,
        riskTolerance:
          parsed?.riskTolerance === 'CONSERVATIVE' || parsed?.riskTolerance === 'GROWTH'
            ? parsed.riskTolerance
            : 'BALANCED',
        primaryObjectives:
          Array.isArray(parsed?.primaryObjectives) && parsed.primaryObjectives.length > 0
            ? parsed.primaryObjectives
            : ['VHIS Medical', 'Critical Illness', 'Children Education'],
        postRetirementSourceNote:
          parsed?.meetingSummaryEn ||
          'Synced from Cantonese/Mandarin voice memo into HKIA GL30 FNA.',
        signedAtIso: new Date().toISOString(),
      };
      onUpdateLead(activeLead.id, (prev) => ({
        ...prev,
        fnaRecord: newFna,
        stage: prev.stage === LeadStage.NEW ? LeadStage.FNA_COMPLETED : prev.stage,
        lastContactIso: new Date().toISOString(),
      }));
      setVoiceSyncedNotice(
        t(
          `GL30 FNA synced directly to ${activeLead.fullNameEn} in 02 Lead CRM (Income HK$${newFna.monthlyIncomeHkd.toLocaleString()}/mo).`,
          `已成功將語音提取之 GL30 財務分析直接寫入「02 客戶 CRM」：${activeLead.fullNameZh}（月入 HK$${newFna.monthlyIncomeHkd.toLocaleString()}，狀態已解鎖電子投保）！`
        )
      );
    } finally {
      setParsingVoice(false);
    }
  };

  return (
    <section
      id="twenty-live-upgrades-workbench"
      aria-label="20 Live Integrated InsurTech Upgrades Workbench"
      className="rounded-xl border border-slate-200 bg-white p-6 space-y-6"
    >
      {!embeddedSingleTool && (
        <>
          {/* Top Workbench Header */}
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700">
                {t('20-Module Interactive Advisory Workbench', '20 項實戰升級互動工作台')} · IMP-01 → IMP-20
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                {t(
                  'All 20 Suggested Upgrades — Fully Built & Merged Interactive Center',
                  '20 項高價值升級功能實戰中心（全部已建成可互動工具並深度整合至全系統）'
                )}
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                {t(
                  `Active Client: ${activeLead.fullNameEn} (${activeLead.age}y) · Active Plan: ${activePlan.nameEn} · Select any IMP-01 to IMP-20 module below.`,
                  `當前連動客戶：${activeLead.fullNameZh}（${activeLead.age}歲） · 當前連動計劃：${conv(activePlan.nameZh)} · 點擊下方 IMP-01 至 IMP-20 即時操作。`
                )}
              </p>
            </div>

            {/* Pillar Filter */}
            <div
              role="group"
              aria-label="Filter 20 live tools by strategic pillar"
              className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 shrink-0"
            >
              {(
                [
                  { id: 'ALL', zh: '全部 20 項', en: 'All 20' },
                  { id: 'CLOSING_REVENUE', zh: '簽單增收 (8)', en: 'Closing (8)' },
                  { id: 'UX_CLIENT_TRUST', zh: '視覺信任 (5)', en: 'Visual Trust (5)' },
                  { id: 'AI_AUTOMATION', zh: 'AI 提速 (3)', en: 'AI Speed (3)' },
                  { id: 'COMPLIANCE_TEAM_SAAS', zh: '合規團隊 (4)', en: 'Team & Reg (4)' },
                ] as const
              ).map((pf) => (
                <button
                  key={pf.id}
                  type="button"
                  onClick={() => setPillarFilter(pf.id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    pillarFilter === pf.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t(pf.en, pf.zh)}
                </button>
              ))}
            </div>
          </div>

          {/* 20-Button Module Selector Grid */}
          <div
            role="tablist"
            aria-label="Select live upgrade tool IMP-01 to IMP-20"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5"
          >
            {visibleMetaButtons.map((m) => {
              const selected = m.code === activeCode;
              return (
                <button
                  key={m.code}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onSelectCode(m.code)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors whitespace-nowrap truncate ${
                    selected
                      ? 'border-blue-700 bg-blue-700 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  {t(m.shortEn, conv(m.shortZh))}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Active Tool Context Banner */}
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-slate-500 font-mono">
            {activeMeta.code} · {t('Merged Location:', '全站整合位置：')}{' '}
            {t(activeMeta.mergedTargetEn, conv(activeMeta.mergedTargetZh))}
          </p>
          <h3 className="mt-0.5 text-sm font-bold text-slate-900">
            {t(activeMeta.titleEn, conv(activeMeta.titleZh))}
          </h3>
        </div>
        {onJumpToSection && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {(activeCode === 'IMP-03' || activeCode === 'IMP-14') && (
              <button
                type="button"
                onClick={() => onJumpToSection('intel')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                <span>{t('Open in 06 Hospital Hub', '前往 06 私院專頁檢視')}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {(activeCode === 'IMP-05' || activeCode === 'IMP-07' || activeCode === 'IMP-18') && (
              <button
                type="button"
                onClick={() => onJumpToSection('crm')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                <span>{t('Open 02 Lead CRM', '前往 02 客戶 CRM')}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {activeCode === 'IMP-20' && (
              <button
                type="button"
                onClick={() => onJumpToSection('stp')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                <span>{t('Open 04 Auto-Policy STP', '前往 04 電子投保驗證')}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* IMP-01: CLIENT INTERACTIVE PROPOSAL MICROSITE + READ RECEIPTS         */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-01' && (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-600">
              {t(
                'Generate a bespoke ?proposal=<id> interactive link for WhatsApp/WeChat. Clients slide Policy Year 5–30 cash values while you receive live Read-Receipt telemetry.',
                '一鍵為當前客戶及計劃生成專屬互動提案微網頁連結（?proposal=...），客戶滑動查看第 5–30 年現金價值時即時記錄「客戶已閱」回執及停留秒數。'
              )}
            </p>
            <button
              type="button"
              disabled={creatingMicrosite}
              onClick={async () => {
                setCreatingMicrosite(true);
                try {
                  const rec = createClientMicrositeProposal({
                    lead: activeLead,
                    plan: activePlan,
                    intermediary,
                    whiteLabel: whiteLabelConfig,
                    currency,
                    sumAssuredUsd,
                    paymentTermYears,
                  });
                  await onCreateMicrosite(rec);
                  onAppendWhatsappAuditLog(
                    createWhatsAppComplianceLog({
                      clientName: `${activeLead.fullNameZh} (${activeLead.fullNameEn})`,
                      advisorLicenseNo: intermediary.iaLicenseNo,
                      channel: 'MICROSITE_LINK',
                      summaryTopic: `Generated Microsite ${rec.id} for ${activePlan.nameZh}`,
                    })
                  );
                  setPreviewMicrosite(rec);
                } finally {
                  setCreatingMicrosite(false);
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>
                {creatingMicrosite
                  ? t('Generating Link...', '正在建立專屬微網頁...')
                  : t('Generate Interactive Microsite Link', '一鍵建立客戶專屬微網頁連結')}
              </span>
            </button>
          </div>

          {microsites.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-600">
              {t(
                'No client microsites generated yet. Click "Generate Interactive Microsite Link" above to create your first live link.',
                '尚未建立微網頁提案。請點擊上方「一鍵建立客戶專屬微網頁連結」即時體驗互動滑桿及已閱回執。'
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {microsites.map((ms) => {
                const shareUrl = `${window.location.origin}/?proposal=${ms.id}`;
                return (
                  <div
                    key={ms.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                        <span className="font-bold text-blue-700">{ms.id}</span>
                        <span>·</span>
                        <span>
                          {ms.clientNameZh} ({ms.clientNameEn})
                        </span>
                        <span>·</span>
                        <span>
                          {ms.currency} ${ms.annualPremium.toLocaleString()}/yr
                        </span>
                        <span>·</span>
                        <span className="font-semibold text-emerald-700">
                          {t('Opened:', '已閱次數：')} {ms.readReceipts.length}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {conv(ms.planNameZh)} ({ms.planNameEn})
                      </p>
                      {ms.readReceipts.length > 0 && (
                        <p className="text-[11px] text-emerald-800 font-mono tabular-nums">
                          ✓ {t('Latest Read Receipt:', '最新客戶查閱回執：')}{' '}
                          {new Date(ms.readReceipts[0].openedAtIso).toLocaleTimeString()} ·{' '}
                          {t('Focused on Policy Year', '重點停留於第')}{' '}
                          {ms.readReceipts[0].inspectedPolicyYear} {t('', '保單年度')}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <ScannableProposalQrSvg
                        url={shareUrl}
                        sizePx={64}
                        ariaLabel={`QR code for ${ms.id}`}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void copyTextSafe(shareUrl);
                            setCopiedMicrositeId(ms.id);
                            setTimeout(() => setCopiedMicrositeId(null), 2000);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>
                            {copiedMicrositeId === ms.id
                              ? t('Link Copied!', '已複製連結！')
                              : t('Copy ?proposal= Link', '複製 WhatsApp 專屬連結')}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPreviewMicrosite(ms)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t('Preview Client View', '打開客戶端互動微網頁')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {previewMicrosite && (
            <ClientMicrositeView
              record={
                microsites.find((m) => m.id === previewMicrosite.id) || previewMicrosite
              }
              proposalUrl={`${window.location.origin}/?proposal=${encodeURIComponent(
                previewMicrosite.id
              )}`}
              onClose={() => setPreviewMicrosite(null)}
              onLogReadReceipt={async (yr) => {
                await onLogMicrositeRead(previewMicrosite.id, yr);
              }}
            />
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-02: EXISTING LEGACY POLICY & OFFICIAL BI PDF GAP SCANNER          */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-02' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6 space-y-3">
              <label htmlFor="imp02-sample" className="block text-xs font-semibold text-slate-700">
                {t(
                  'Load Sample Client Legacy Policy / Competitor BI Extract',
                  '載入客戶舊保單／友商建議書範例（或直接貼上保單條款摘錄）'
                )}
              </label>
              <select
                id="imp02-sample"
                value={legacySampleId}
                onChange={(e) => {
                  const found = SAMPLE_LEGACY_POLICY_TEXTS.find((s) => s.id === e.target.value);
                  if (found) {
                    setLegacySampleId(found.id);
                    setLegacyText(found.rawText);
                    setLegacyAuditResult(auditExistingPolicyDeterministically(found.rawText));
                  }
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                {SAMPLE_LEGACY_POLICY_TEXTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t(s.labelEn, conv(s.labelZh))}
                  </option>
                ))}
              </select>

              <textarea
                rows={4}
                aria-label="Policy schedule or benefit illustration extract"
                value={legacyText}
                onChange={(e) => setLegacyText(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs text-slate-800"
              />

              <button
                type="button"
                disabled={auditingPolicy}
                onClick={handleRunLegacyPolicyAudit}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
              >
                <FileSearch className="h-4 w-4" aria-hidden="true" />
                <span>
                  {auditingPolicy
                    ? t('Running Gemini Policy Audit...', 'Gemini 正在審計保單缺口...')
                    : t('Scan Policy Inflation Gap (Gemini AI)', '一鍵執行 Gemini 舊保單醫療通脹體檢')}
                </span>
              </button>
            </div>

            <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 font-mono tabular-nums">
                <span>{legacyAuditResult.detectedPolicyTitle}</span>
                <span>{legacyAuditResult.sourceMode}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono tabular-nums">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <span className="font-sans text-[11px] text-slate-500">
                    {t('2026 Benchmark Bill / Target', '2026 醫療／危疾基準需求')}
                  </span>
                  <p className="mt-0.5 text-base font-bold text-slate-900">
                    HK${legacyAuditResult.benchmark2026MajorSurgeryBillHkd.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3">
                  <span className="font-sans text-[11px] text-rose-800">
                    {t('Estimated Out-of-Pocket Gap', '預計客戶自付保障缺口')}
                  </span>
                  <p className="mt-0.5 text-base font-bold text-rose-700">
                    HK${legacyAuditResult.estimatedOutOfPocketShortfallHkd.toLocaleString()}
                  </p>
                </div>
              </div>

              <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700">
                {(lang === 'en'
                  ? legacyAuditResult.keyFindingsEn
                  : legacyAuditResult.keyFindingsZh
                ).map((f, idx) => (
                  <li key={idx}>• {conv(f)}</li>
                ))}
              </ul>

              <div className="border-t border-slate-200 pt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-blue-800">
                  {t(
                    legacyAuditResult.recommendedActionEn,
                    conv(legacyAuditResult.recommendedActionZh)
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const vhisTopUp = plans.find((p) => p.category === PlanCategory.VHIS);
                    if (vhisTopUp) onSelectPlanId(vhisTopUp.id);
                    onJumpToSection?.('market');
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <span>{t('Match Top-Up Plan', '配對補足方案')}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-03: HK PRIVATE SURGEON FEE MEDIAN & CASHLESS SPECIALISTS          */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-03' && <SurgeonAndSlaBenchmarksPanel mode="IMP-03" />}

      {/* ===================================================================== */}
      {/* IMP-04: TOP TALENT PASS (高才通) / IANG / MCV SIGNING CONCIERGE PACK   */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-04' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="imp04-visa" className="block text-xs font-semibold text-slate-700">
                {t('Client Visa / Segment', '客戶身份／簽證類別')}
              </label>
              <select
                id="imp04-visa"
                value={visaCategory}
                onChange={(e) => setVisaCategory(e.target.value as any)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                <option value="TOP_TALENT_TTPS">{t('Top Talent Pass (TTPS)', '高才通／優才新來港人士')}</option>
                <option value="IANG_WORK_VISA">{t('IANG / Work Visa (HK Drift)', '港漂 IANG／工作簽證')}</option>
                <option value="MCV_VISITOR">{t('MCV Mainland Visitor', '內地訪客 (MCV 赴港簽單)')}</option>
              </select>
            </div>

            <div>
              <label htmlFor="imp04-hub" className="block text-xs font-semibold text-slate-700">
                {t('Arrival Port', '抵港關口')}
              </label>
              <select
                id="imp04-hub"
                value={arrivalHub}
                onChange={(e) => setArrivalHub(e.target.value as any)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                <option value="WEST_KOWLOON_HSR">{t('West Kowloon HSR', '香港西九龍高鐵站')}</option>
                <option value="HK_AIRPORT">{t('HK International Airport', '香港國際機場 T1')}</option>
                <option value="LOK_MA_CHAU">{t('Lok Ma Chau / Futian', '落馬洲／福田口岸')}</option>
              </select>
            </div>

            <div>
              <label htmlFor="imp04-bank" className="block text-xs font-semibold text-slate-700">
                {t('HK Bank & Renewal DDA', '開戶及續保 DDA 銀行')}
              </label>
              <select
                id="imp04-bank"
                value={preferredBank}
                onChange={(e) => setPreferredBank(e.target.value as any)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                <option value="HSBC_HK">{t('HSBC HK International', '滙豐香港（廣東道／希慎）')}</option>
                <option value="BOCHK">{t('Bank of China (HK)', '中銀香港跨境理財中心')}</option>
                <option value="ZA_BANK_DIGITAL">{t('ZA Bank Onshore App', '眾安銀行 ZA Bank (境內即開)')}</option>
              </select>
            </div>

            <div>
              <label htmlFor="imp04-dist" className="block text-xs font-semibold text-slate-700">
                {t('Insurer Verification Hub', '保司驗證簽署地點')}
              </label>
              <select
                id="imp04-dist"
                value={signingDistrict}
                onChange={(e) => setSigningDistrict(e.target.value as any)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                <option value="TST_CANTON_RD">{t('Tsim Sha Tsui Harbour City', '尖沙咀海港城／美麗華')}</option>
                <option value="CAUSEWAY_BAY">{t('Causeway Bay Lee Garden', '銅鑼灣利園／時代廣場')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-900">
                {t('1-Day Onshore Signing & Banking Itinerary', '赴港簽單＋開戶綁定續保一日標準時間表')}
              </h4>
              <div className="space-y-2">
                {conciergePack.schedule.map((s) => (
                  <div key={s.time} className="flex items-start gap-3 text-xs">
                    <span className="font-mono font-bold text-blue-700 tabular-nums shrink-0">
                      {s.time}
                    </span>
                    <span className="text-slate-700">{s.step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900">
                  {t('Mandatory KYC & Tax-Perk Checklist', '必備核實文件及高才通扣稅權益清單')}
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                  {conciergePack.docChecklist.map((d, i) => (
                    <li key={i}>• {d}</li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => {
                  void copyTextSafe(conciergePack.copyCardText);
                  onAppendWhatsappAuditLog(
                    createWhatsAppComplianceLog({
                      clientName: `${activeLead.fullNameZh} (${activeLead.fullNameEn})`,
                      advisorLicenseNo: intermediary.iaLicenseNo,
                      channel: 'WECHAT',
                      summaryTopic: `Dispatched ${visaCategory} 1-Day HK Signing & DDA Concierge Pack`,
                    })
                  );
                  setCopiedConcierge(true);
                  setTimeout(() => setCopiedConcierge(false), 2000);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {copiedConcierge
                    ? t('Copied & Logged to Vault!', '已複製微信／WhatsApp 禮賓卡並寫入合規金庫！')
                    : t('Copy WeChat / WhatsApp Concierge Card', '一鍵複製雙語禮賓行程卡')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-05: CANTONESE / MANDARIN VOICE MEMO TO HKIA GL30 FNA SYNC         */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-05' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {t(
              'Speak or paste a 10-second Cantonese/Mandarin post-meeting memo. Gemini AI extracts income, liquid assets, dependents, and risk profile, writing a signed GL30 FNA directly into 02 Lead CRM.',
              '見客後口述或貼上 10 秒廣東話／普通話會談備忘，Gemini 即時提取月入、流動資產、受養人數及保障目標，並一鍵同步簽署至「02 客戶 CRM」解鎖電子投保！'
            )}
          </p>

          <textarea
            rows={3}
            aria-label="Cantonese or Mandarin meeting voice memo transcript"
            value={voiceTranscript}
            onChange={(e) => setVoiceTranscript(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3 text-xs leading-relaxed text-slate-900"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={parsingVoice}
              onClick={handleSyncVoiceToLeadFna}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
              <span>
                {parsingVoice
                  ? t('Extracting GL30 FNA...', '正在解析粵普語音並寫入 FNA...')
                  : t(
                      `Extract & Sync GL30 FNA to ${activeLead.fullNameEn}`,
                      `一鍵解析並寫入 ${activeLead.fullNameZh} 之 GL30 FNA 檔案`
                    )}
              </span>
            </button>

            {activeLead.fnaRecord && (
              <span className="text-xs font-mono text-emerald-700 tabular-nums">
                ✓ {t('Current FNA on file:', '目前已存檔 FNA：')} HK$
                {activeLead.fnaRecord.monthlyIncomeHkd.toLocaleString()}/mo ·{' '}
                {activeLead.fnaRecord.riskTolerance}
              </span>
            )}
          </div>

          {voiceSyncedNotice && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900">
              ✓ {voiceSyncedNotice}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-06: MULTI-YEAR GN16 FULFILLMENT COHORT TREND SVG CHART            */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-06' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {HK_GN16_MULTI_YEAR_SERIES.map((s) => (
                <button
                  key={s.insurerCode}
                  type="button"
                  onClick={() => setGn16Insurer(s.insurerCode)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    gn16Insurer === s.insurerCode
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {t(s.insurerNameEn, conv(s.insurerNameZh))}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
              <span>
                {t('7-Yr Mean:', '7年平均實現率：')}{' '}
                <strong className="text-emerald-700">{gn16Eval.meanRatioPct}%</strong>
              </span>
              <span>
                {t('Volatility σ:', '波幅標準差 σ：')}{' '}
                <strong className="text-blue-700">±{gn16Eval.stdDevPct}%</strong>
              </span>
            </div>
          </div>

          {/* Crisp SVG Cohort Line Chart (2019-2025) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">
                {t(gn16Eval.series.flagshipSeriesEn, conv(gn16Eval.series.flagshipSeriesZh))} (2019–2025 GN16)
              </span>
              <span className="font-mono text-slate-500 tabular-nums">
                Range: {gn16Eval.minRatioPct}% – {gn16Eval.maxRatioPct}%
              </span>
            </div>

            <svg
              viewBox="0 0 640 170"
              className="w-full h-44 overflow-visible"
              role="img"
              aria-label="Multi-year GN16 fulfillment ratio trend chart 2019 to 2025"
            >
              {/* 100% Benchmark Reference Line */}
              <line
                x1={45}
                y1={60}
                x2={605}
                y2={60}
                stroke="#94A3B8"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <text x={8} y={64} fontSize={10} fill="#64748B" fontFamily="IBM Plex Mono, monospace">
                100%
              </text>
              <line x1={45} y1={120} x2={605} y2={120} stroke="#E2E8F0" strokeWidth={1} />
              <text x={8} y={124} fontSize={10} fill="#64748B" fontFamily="IBM Plex Mono, monospace">
                95%
              </text>

              {(() => {
                const pts = gn16Eval.series.yearlyRatios.map((r, idx) => {
                  const x = 65 + idx * 86;
                  const y = 60 + (100 - r.ratioPct) * 12;
                  return { ...r, x, y };
                });
                const poly = pts.map((p) => `${p.x},${p.y}`).join(' ');
                return (
                  <>
                    <polyline
                      fill="none"
                      stroke="#1D4ED8"
                      strokeWidth={2.8}
                      points={poly}
                    />
                    {pts.map((p) => (
                      <g key={p.year}>
                        <circle cx={p.x} cy={p.y} r={4.5} fill="#1D4ED8" />
                        <text
                          x={p.x}
                          y={p.y - 10}
                          textAnchor="middle"
                          fontSize={11}
                          fontWeight="700"
                          fill="#0F172A"
                          fontFamily="IBM Plex Mono, monospace"
                        >
                          {p.ratioPct}%
                        </text>
                        <text
                          x={p.x}
                          y={152}
                          textAnchor="middle"
                          fontSize={11}
                          fill="#475569"
                          fontFamily="IBM Plex Mono, monospace"
                        >
                          {p.year}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>

            <p className="text-xs text-slate-700">
              {t(
                gn16Eval.series.latestDividendAlertEn,
                conv(gn16Eval.series.latestDividendAlertZh)
              )}
            </p>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-07: HOUSEHOLD FAMILY & REFERRAL NETWORK TREE                      */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-07' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono tabular-nums">
            <div>
              <span className="font-sans text-xs text-slate-500">
                {t('Household Members Mapped', '已識別家庭及轉介關係節點')}
              </span>
              <p className="mt-0.5 text-xl font-bold text-slate-900">{familyTree.nodes.length}</p>
            </div>
            <div>
              <span className="font-sans text-xs text-slate-500">
                {t('Combined Family VHIS Tax Cap', '全家共享自願醫保扣稅上限')}
              </span>
              <p className="mt-0.5 text-xl font-bold text-emerald-700">
                HK${familyTree.sharedVhisTaxCapHkd.toLocaleString()} / yr
              </p>
            </div>
            <div>
              <span className="font-sans text-xs text-slate-500">
                {t('Uncaptured Household AFYP', '家庭加保潛在總年繳保費')}
              </span>
              <p className="mt-0.5 text-xl font-bold text-blue-700">
                HK${familyTree.totalHouseholdAfypPotentialHkd.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
            {familyTree.nodes.map((node) => {
              const alreadyAdded = addedFamilyNodeIds.includes(node.id);
              return (
                <div
                  key={node.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>{t(node.relationEn, conv(node.relationZh))}</span>
                      <span className="font-mono font-semibold text-slate-700 tabular-nums">
                        {node.age}y
                      </span>
                    </div>
                    <h4 className="mt-1 text-sm font-bold text-slate-900">
                      {t(node.nameEn, conv(node.nameZh))}
                    </h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      {t(node.gapSummaryEn, conv(node.gapSummaryZh))}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 tabular-nums">
                      {node.estimatedAfypPotentialHkd > 0
                        ? `AFYP HK$${node.estimatedAfypPotentialHkd.toLocaleString()}`
                        : 'VIP Referrer'}
                    </span>
                    {node.relation !== 'SELF' && (
                      <button
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => {
                          const newFamilyLead: ClientLead = {
                            id: `lead-fam-${Date.now()}`,
                            fullNameEn: node.nameEn,
                            fullNameZh: node.nameZh,
                            hkidNumber: 'Pending OCR',
                            age: Math.max(18, node.age),
                            plannedRetirementAge: 65,
                            isSmoker: false,
                            residency: activeLead.residency,
                            whatsappPhone: activeLead.whatsappPhone,
                            email: activeLead.email,
                            stage: LeadStage.NEW,
                            notes: `Linked via IMP-07 Family & Referral Tree of ${activeLead.fullNameEn}.`,
                            fnaRecord: null,
                            kycCheck: {
                              hkidVerified: false,
                              hkidDocNumber: 'Pending OCR',
                              mcvEntrySlipVerified: false,
                            },
                            lastContactIso: new Date().toISOString(),
                          };
                          onAddLead(newFamilyLead);
                          setAddedFamilyNodeIds((prev) => [...prev, node.id]);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap shrink-0"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
                        <span>
                          {alreadyAdded
                            ? t('Added to 02 CRM', '已建檔至 CRM')
                            : t('Add to 02 CRM', '一鍵加入 CRM')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-08: 13TH / 25TH MONTH PERSISTENCY & CLAWBACK SHIELD               */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-08' && (
        <div className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label htmlFor="imp08-split" className="block text-xs font-semibold text-slate-700">
                  {t('Advisor Commission Split (%)', '顧問拆帳比例 (%)')}
                </label>
                <input
                  id="imp08-split"
                  type="number"
                  min={20}
                  max={100}
                  value={advisorSplitPct}
                  onChange={(e) => setAdvisorSplitPct(Math.min(100, Math.max(20, Number(e.target.value) || 85)))}
                  className="mt-1 w-28 rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs font-semibold tabular-nums"
                />
              </div>

              <button
                type="button"
                onClick={() => setRescuedCount((prev) => (prev >= 2 ? 0 : prev + 1))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>
                  {rescuedCount < 2
                    ? t('Simulate DDA Renewal Rescue (+1 Policy)', '模擬成功追回續保 DDA（救回 +1 單）')
                    : t('Reset Persistency Simulation', '重設斷供風險模擬')}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-5 font-mono text-xs tabular-nums">
              <div>
                <span className="font-sans text-slate-500">{t('13m Persistency:', '13個月續保率：')}</span>{' '}
                <strong
                  className={
                    persistencyEval.persistencyBonusUnlocked ? 'text-emerald-700 text-base' : 'text-rose-700 text-base'
                  }
                >
                  {persistencyEval.projected13mPersistencyPct}%
                </strong>
              </div>
              <div>
                <span className="font-sans text-slate-500">{t('Clawback Risk:', '佣金回撥風險：')}</span>{' '}
                <strong className="text-rose-700 text-base">
                  HK${persistencyEval.totalClawbackExposureHkd.toLocaleString()}
                </strong>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-3 font-semibold">{t('Policy / Client', '保單及客戶')}</th>
                  <th className="py-2.5 px-3 font-semibold">{t('Plan', '投保計劃')}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{t('Month', '保單月份')}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{t('AFYP', '年繳保費')}</th>
                  <th className="py-2.5 px-3 font-semibold">{t('DDA Autopay', 'DDA 自動轉帳')}</th>
                  <th className="py-2.5 pl-3 font-semibold text-right">{t('Clawback Exposure', '潛在追回佣金')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {persistencyEval.rows.map((r) => (
                  <tr key={r.policyRef}>
                    <td className="py-2.5 pr-3 font-sans">
                      <span className="font-bold text-slate-900">{t(r.clientNameEn, conv(r.clientNameZh))}</span>{' '}
                      <span className="font-mono text-[11px] text-slate-500">· {r.policyRef}</span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-700">{conv(r.insurerPlanZh)}</td>
                    <td className="py-2.5 px-3 text-right">M{r.policyMonth}</td>
                    <td className="py-2.5 px-3 text-right">HK${r.annualPremiumHkd.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className={r.autopayDdaActive ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>
                        {r.autopayDdaActive ? t('DDA Bound', '已綁定自動扣帳') : t('Unbound (Alert!)', '未綁定 · 斷供高危')}
                      </span>
                    </td>
                    <td className="py-2.5 pl-3 text-right font-bold text-rose-700">
                      HK${r.clawbackExposureHkd.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-09: INSURANCE TRUST VS POLICY SETTLEMENT OPTION SIMULATOR         */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-09' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="imp09-db" className="block text-xs font-semibold text-slate-700">
                {t('Total Death Benefit / Estate Size (USD)', '保單身故賠償總額 (USD)')}
              </label>
              <input
                id="imp09-db"
                type="number"
                step={250000}
                min={200000}
                value={trustDbUsd}
                onChange={(e) => setTrustDbUsd(Math.max(200000, Number(e.target.value) || 1000000))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="imp09-yrs" className="block text-xs font-semibold text-slate-700">
                {t('Installment Distribution Horizon (Years)', '受益人分期領取年期（年）')}
              </label>
              <input
                id="imp09-yrs"
                type="number"
                min={5}
                max={40}
                value={trustYears}
                onChange={(e) => setTrustYears(Math.min(40, Math.max(5, Number(e.target.value) || 20)))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 font-mono tabular-nums">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <p className="font-sans text-xs font-bold text-slate-900">
                {t('Option A: Policy Built-In Death-Benefit Installment', '方案 A：保單免費內置「類信託」分期賠付選項')}
              </p>
              <p className="text-lg font-bold text-emerald-700">
                {t('Setup + Admin Fee:', '設立及管理費：')} US$0
              </p>
              <p className="text-xs text-slate-700">
                {t('Projected Net Heir Payout:', '受益人累計實收總額：')} US$
                {trustEval.netHeirPayoutPolicyOptionUsd.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <p className="font-sans text-xs font-bold text-slate-900">
                {t('Option B: Dedicated HK Private Insurance Trust', '方案 B：獨立香港私人保險金信託（持牌受託人）')}
              </p>
              <p className="text-lg font-bold text-blue-700">
                {t('Cumulative Trust Fees:', '累計信託總收費：')} US$
                {trustEval.totalTrustFeesUsd.toLocaleString()}
              </p>
              <p className="text-xs text-slate-700">
                {t('Projected Net Heir Payout:', '扣除信託費後受益人實收：')} US$
                {trustEval.netHeirPayoutTrustUsd.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3 text-xs leading-relaxed text-slate-900">
            {t(trustEval.verdictEn, conv(trustEval.verdictZh))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-10: SME KEYMAN INSURANCE & BUY-SELL + IRD DIPN 28                 */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-10' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="imp10-val" className="block text-xs font-semibold text-slate-700">
                {t('SME Valuation (HKD)', '公司估值 (HKD)')}
              </label>
              <input
                id="imp10-val"
                type="number"
                step={1000000}
                value={smeValuationHkd}
                onChange={(e) => setSmeValuationHkd(Math.max(1000000, Number(e.target.value) || 10000000))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="imp10-prof" className="block text-xs font-semibold text-slate-700">
                {t('Keyman Annual Gross Profit (HKD)', '要員每年貢獻毛利 (HKD)')}
              </label>
              <input
                id="imp10-prof"
                type="number"
                step={500000}
                value={smeKeymanProfitHkd}
                onChange={(e) => setSmeKeymanProfitHkd(Math.max(200000, Number(e.target.value) || 2000000))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="imp10-eq" className="block text-xs font-semibold text-slate-700">
                {t('Insured Shareholder Equity (%)', '受保人持股比例 (%)')}
              </label>
              <input
                id="imp10-eq"
                type="number"
                min={0}
                max={100}
                value={smeEquityPct}
                onChange={(e) => setSmeEquityPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="imp10-struct" className="block text-xs font-semibold text-slate-700">
                {t('Policy Structure', '保單結構（影響 DIPN 28 扣稅）')}
              </label>
              <select
                id="imp10-struct"
                value={smeStructure}
                onChange={(e) => setSmeStructure(e.target.value as any)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                <option value="PURE_TERM_KEYMAN">{t('Pure Term Life (No Cash Value)', '純定期人壽（無退保現金價值）')}</option>
                <option value="CASH_VALUE_SAVINGS">{t('Savings / Universal Life', '儲蓄／萬用壽險（資本性質）')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4 font-mono tabular-nums">
            <div>
              <span className="font-sans text-xs text-slate-500">{t('Keyman Cover', '建議要員保額')}</span>
              <p className="mt-0.5 text-base font-bold text-slate-900">
                HK${smeEval.recommendedKeymanSumHkd.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="font-sans text-xs text-slate-500">{t('Buy-Sell Equity Pool', '股東互保回購保額')}</span>
              <p className="mt-0.5 text-base font-bold text-blue-700">
                HK${smeEval.founderBuySellShareHkd.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="font-sans text-xs text-slate-500">{t('16.5% Profits Tax Saved', '利得稅節省 (16.5%)')}</span>
              <p className="mt-0.5 text-base font-bold text-emerald-700">
                HK${smeEval.profitsTaxSavedHkd.toLocaleString()} / yr
              </p>
            </div>
            <div>
              <span className="font-sans text-xs text-slate-500">{t('Net Corporate Cost', '稅後企業淨保費')}</span>
              <p className="mt-0.5 text-base font-bold text-slate-900">
                HK${smeEval.netCorporateAnnualCostHkd.toLocaleString()} / yr
              </p>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-700">
            {t(smeEval.dipn28NoteEn, conv(smeEval.dipn28NoteZh))}
          </p>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-11: CORPORATE GROUP MEDICAL EXIT BRIDGE TO PERSONAL VHIS          */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-11' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="imp11-exit" className="block text-xs font-semibold text-slate-700">
                {t('Planned Retirement / Exit Age', '預計離職／退休年齡')}
              </label>
              <input
                id="imp11-exit"
                type="number"
                min={activeLead.age + 1}
                max={70}
                value={exitAge}
                onChange={(e) => setExitAge(Math.max(activeLead.age + 1, Number(e.target.value) || 60))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="imp11-emp" className="block text-xs font-semibold text-slate-700">
                {t('Current Employer Surgical Limit (HKD)', '現職公司醫保手術上限 (HKD)')}
              </label>
              <input
                id="imp11-emp"
                type="number"
                step={5000}
                value={empSurgCapHkd}
                onChange={(e) => setEmpSurgCapHkd(Math.max(0, Number(e.target.value) || 25000))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="imp11-ded" className="block text-xs font-semibold text-slate-700">
                {t('VHIS High-Deductible Option', '在職期間自願醫保高自付額選項')}
              </label>
              <select
                id="imp11-ded"
                value={bridgeDedHkd}
                onChange={(e) => setBridgeDedHkd(Number(e.target.value) as 16000 | 25000 | 50000)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              >
                <option value={16000}>HK$16,000</option>
                <option value={25000}>HK$25,000</option>
                <option value={50000}>HK$50,000</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4 font-mono tabular-nums">
            <div>
              <span className="font-sans text-xs text-slate-500">{t('$0 Deductible Cost', '$0 自付額原價保費')}</span>
              <p className="mt-0.5 text-base font-bold text-slate-700">
                HK${bridgeEval.zeroDeductibleAnnualHkd.toLocaleString()}/yr
              </p>
            </div>
            <div>
              <span className="font-sans text-xs text-slate-500">{t('High-Deductible Cost', '高自付額優惠保費')}</span>
              <p className="mt-0.5 text-base font-bold text-blue-700">
                HK${bridgeEval.highDeductibleAnnualHkd.toLocaleString()}/yr
              </p>
            </div>
            <div>
              <span className="font-sans text-xs text-slate-500">
                {t(`Saved Over ${bridgeEval.yearsUntilExit} Yrs`, `退休前 ${bridgeEval.yearsUntilExit} 年共慳保費`)}
              </span>
              <p className="mt-0.5 text-base font-bold text-emerald-700">
                HK${bridgeEval.cumulativePremiumSavedBeforeExitHkd.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="font-sans text-xs text-slate-500">{t('Zero-UW Step-Down Ages', '免核保調低自付額歲數')}</span>
              <p className="mt-0.5 text-base font-bold text-slate-900">
                {bridgeEval.guaranteedStepDownAges.join(' / ')}y
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-12: OVERSEAS UNIVERSITY TUITION INFLATION & WITHDRAWAL PLANNER    */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-12' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="imp12-dest" className="block text-xs font-semibold text-slate-700">
                {t('Target Study Destination & Currency', '目標海外升學國家及貨幣')}
              </label>
              <select
                id="imp12-dest"
                value={studyDest}
                onChange={(e) => setStudyDest(e.target.value as StudyDestination)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                {(Object.keys(OVERSEAS_TUITION_BASELINES_2026) as StudyDestination[]).map((k) => (
                  <option key={k} value={k}>
                    {t(
                      OVERSEAS_TUITION_BASELINES_2026[k].labelEn,
                      conv(OVERSEAS_TUITION_BASELINES_2026[k].labelZh)
                    )}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="imp12-age" className="block text-xs font-semibold text-slate-700">
                {t('Child Current Age (0–17)', '子女目前年齡（0–17歲）')}
              </label>
              <input
                id="imp12-age"
                type="number"
                min={0}
                max={17}
                value={childAge}
                onChange={(e) => setChildAge(Math.min(17, Math.max(0, Number(e.target.value) || 0)))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono tabular-nums">
            <div>
              <span className="font-sans text-xs text-slate-500">
                {t('Total Inflated Tuition Needed', '連學費通脹大學總開支')}
              </span>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {tuitionEval.meta.currencyCode} {tuitionEval.totalRequiredLocal.toLocaleString()} (HK$
                {tuitionEval.totalRequiredHkd.toLocaleString()})
              </p>
            </div>
            <div>
              <span className="font-sans text-xs text-slate-500">
                {t('Recommended 5-Pay Savings Funding', '建議現時 5 年期儲蓄單年供')}
              </span>
              <p className="mt-0.5 text-lg font-bold text-blue-700">
                US${tuitionEval.recommended5PayAnnualUsd.toLocaleString()} / yr
              </p>
            </div>
            <div>
              <span className="font-sans text-xs text-slate-500">
                {t('FX Switch Execution', '多元貨幣轉換時間點')}
              </span>
              <p className="mt-0.5 text-lg font-bold text-emerald-700">
                Yr {tuitionEval.yearsUntilUni} → {tuitionEval.meta.currencyCode}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {tuitionEval.schedule.map((row) => {
              const maxHkd = tuitionEval.schedule[tuitionEval.schedule.length - 1]?.requiredHkd || 1;
              const pct = Math.round((row.requiredHkd / maxHkd) * 100);
              return (
                <div key={row.uniYear} className="space-y-1 font-mono text-xs tabular-nums">
                  <div className="flex justify-between text-slate-700">
                    <span>
                      Uni Year {row.uniYear} (Age {row.childAge} · Policy Yr {row.policyYear})
                    </span>
                    <span>
                      <strong>
                        {tuitionEval.meta.currencyCode} {row.requiredLocalCurrency.toLocaleString()}
                      </strong>{' '}
                      (HK${row.requiredHkd.toLocaleString()})
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded bg-slate-100">
                    <div style={{ width: `${pct}%` }} className="h-full bg-blue-700" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-13: SUB-STANDARD UNDERWRITING VAULT & LAB BIOMARKER TRIAGE        */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-13' && (
        <div className="space-y-5">
          {/* Biomarker Quick Triage */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-900">
              {t('Live Medical Report Biomarker Pre-Underwriting Triage', '客戶驗身報告指標即時預判（避免盲目投保留拒保紀錄）')}
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label htmlFor="lab-bmi" className="block text-[11px] font-semibold text-slate-700">BMI</label>
                <input
                  id="lab-bmi"
                  type="number"
                  step={0.5}
                  value={labBmi}
                  onChange={(e) => setLabBmi(Number(e.target.value) || 22)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="lab-bp" className="block text-[11px] font-semibold text-slate-700">Systolic BP (mmHg)</label>
                <input
                  id="lab-bp"
                  type="number"
                  value={labSbp}
                  onChange={(e) => setLabSbp(Number(e.target.value) || 120)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="lab-a1c" className="block text-[11px] font-semibold text-slate-700">HbA1c (%)</label>
                <input
                  id="lab-a1c"
                  type="number"
                  step={0.1}
                  value={labHba1c}
                  onChange={(e) => setLabHba1c(Number(e.target.value) || 5.4)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="lab-alt" className="block text-[11px] font-semibold text-slate-700">Liver ALT (U/L)</label>
                <input
                  id="lab-alt"
                  type="number"
                  value={labAlt}
                  onChange={(e) => setLabAlt(Number(e.target.value) || 30)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs tabular-nums"
                />
              </div>
            </div>

            <div className="text-xs text-slate-800 space-y-1">
              <p className="font-mono font-bold text-blue-700 tabular-nums">
                {t('Estimated Loading:', '預估核保加費幅度：')} +{labTriage.estimatedLoadingPct}% ({labTriage.tier})
              </p>
              {labTriage.flags.map((fl, idx) => (
                <p key={idx}>• {conv(fl)}</p>
              ))}
            </div>
          </div>

          {/* Precedent Vault */}
          <div className="space-y-3">
            <input
              type="search"
              aria-label="Search sub-standard underwriting precedent vault"
              value={uwQuery}
              onChange={(e) => setUwQuery(e.target.value)}
              placeholder={t(
                'Search thyroid nodule, BI-RADS, fatty liver, HBV, polyp...',
                '搜尋甲狀腺結節、BI-RADS 乳房囊腫、脂肪肝、乙肝帶菌、大腸息肉...'
              )}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filteredUwVault.map((u) => (
                <div key={u.id} className="rounded-xl border border-slate-200 bg-white p-4 text-xs space-y-1.5">
                  <p className="font-bold text-slate-900">{t(u.conditionEn, conv(u.conditionZh))}</p>
                  <p className="font-mono text-[11px] text-slate-500">{u.biomarkerRange}</p>
                  <p className="text-slate-700">• VHIS：{conv(u.vhisOutcomeZh)}</p>
                  <p className="text-slate-700">• 危疾 CI：{conv(u.ciOutcomeZh)}</p>
                  <p className="font-mono text-[11px] font-semibold text-blue-700">
                    {t('Lenient Insurers:', '核保較具彈性保司：')} {u.lenientInsurers.join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-14: INSURER UW / LOG / CLAIMS SLA THERMOMETER                     */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-14' && <SurgeonAndSlaBenchmarksPanel mode="IMP-14" />}

      {/* ===================================================================== */}
      {/* IMP-15: QUARTERLY PROMO REBATE + PREPAID INTEREST & BANK TD CLIFF     */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-15' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="imp15-ins" className="block text-xs font-semibold text-slate-700">
                {t('Active Q4 Insurer Campaign', '選擇保司季度限時推廣')}
              </label>
              <select
                id="imp15-ins"
                value={promoInsurer}
                onChange={(e) => setPromoInsurer(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                {HK_QUARTERLY_PROMO_CAMPAIGNS.map((c) => (
                  <option key={c.insurerCode} value={c.insurerCode}>
                    {t(c.insurerNameEn, conv(c.insurerNameZh))} ({c.firstYearRebatePct}% + {c.prepaidGuaranteedRatePct}%)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="imp15-prem" className="block text-xs font-semibold text-slate-700">
                {t('5-Pay Annual Premium (USD)', '5年期每年保費 (USD)')}
              </label>
              <input
                id="imp15-prem"
                type="number"
                step={5000}
                value={promoAnnualUsd}
                onChange={(e) => setPromoAnnualUsd(Math.max(5000, Number(e.target.value) || 20000))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="imp15-td" className="block text-xs font-semibold text-slate-700">
                {t('Bank TD Renewal Rate Yr 2+ (%)', '減息後銀行定存續期年息 (%)')}
              </label>
              <input
                id="imp15-td"
                type="number"
                step={0.25}
                value={tdRenewalRate}
                onChange={(e) => setTdRenewalRate(Math.max(0.25, Number(e.target.value) || 2.0))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                aria-pressed={prepay5Yr}
                onClick={() => setPrepay5Yr((p) => !p)}
                className={`w-full rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap ${
                  prepay5Yr
                    ? 'bg-blue-700 text-white'
                    : 'border border-slate-300 bg-white text-slate-800'
                }`}
              >
                {prepay5Yr
                  ? t(`Prepay 5Y ON (${selectedPromo.prepaidGuaranteedRatePct}% Guar.)`, `已啟用 5年預繳鎖息 (${selectedPromo.prepaidGuaranteedRatePct}%)`)
                  : t('Annual Pay Only', '逐年繳付（不預繳）')}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 font-mono tabular-nums">
            <p className="font-sans text-xs font-bold text-slate-900">
              {t(selectedPromo.campaignTitleEn, conv(selectedPromo.campaignTitleZh))} ·{' '}
              <span className="text-amber-700">
                {t(`${selectedPromo.daysRemaining} days left`, `距離截數尚餘 ${selectedPromo.daysRemaining} 日`)}
              </span>
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <span className="font-sans text-[11px] text-slate-500">{t('First-Yr Rebate', '首年保費回贈')}</span>
                <p className="text-base font-bold text-emerald-700">-US${promoStack.firstYearRebateUsd.toLocaleString()}</p>
              </div>
              <div>
                <span className="font-sans text-[11px] text-slate-500">{t('Prepaid Guar. Interest', '預繳保證利息收益')}</span>
                <p className="text-base font-bold text-emerald-700">-US${promoStack.prepaidInterestEarnedUsd.toLocaleString()}</p>
              </div>
              <div>
                <span className="font-sans text-[11px] text-slate-500">{t('Net 5-Yr Out-of-Pocket', '折實 5年淨本金')}</span>
                <p className="text-base font-bold text-slate-900">
                  US${promoStack.netOutOfPocket5YrUsd.toLocaleString()} (-{promoStack.totalDiscountPct}%)
                </p>
              </div>
              <div>
                <span className="font-sans text-[11px] text-slate-500">{t('Yr-15 Gain Over Bank TD', '第15年跑贏銀行定存')}</span>
                <p className="text-base font-bold text-blue-700">
                  +US${promoStack.yr15AdvantageOverBankTdUsd.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-16: GLOBAL WHITE-LABEL BRAND STUDIO, MDRT BADGE & QR HEADER       */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-16' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                {t(
                  'Changes apply globally to all exported Comparison PDFs & Client Microsites',
                  '此處設定即時套用至「01 比較建議書 PDF 頁首」及「IMP-01 客戶微網頁」！'
                )}
              </span>
              <button
                type="button"
                aria-pressed={whiteLabelConfig.enabled}
                onClick={() =>
                  onChangeWhiteLabelConfig({
                    ...whiteLabelConfig,
                    enabled: !whiteLabelConfig.enabled,
                  })
                }
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                  whiteLabelConfig.enabled
                    ? 'bg-blue-700 text-white'
                    : 'border border-slate-300 bg-white text-slate-700'
                }`}
              >
                {whiteLabelConfig.enabled
                  ? t('Global White-Label: ON', '全站個人白牌：已啟用')
                  : t('Global White-Label: OFF', '全站個人白牌：關閉')}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="wl-zh" className="block text-xs font-semibold text-slate-700">
                  {t('Practice Header Title', '個人品牌／家族辦公室頁首名稱')}
                </label>
                <input
                  id="wl-zh"
                  type="text"
                  value={whiteLabelConfig.practiceTitleZh}
                  onChange={(e) =>
                    onChangeWhiteLabelConfig({
                      ...whiteLabelConfig,
                      practiceTitleZh: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label htmlFor="wl-badge" className="block text-xs font-semibold text-slate-700">
                  {t('Honor / Qualification Badge', '專業榮譽頭銜')}
                </label>
                <select
                  id="wl-badge"
                  value={whiteLabelConfig.honorBadge}
                  onChange={(e) =>
                    onChangeWhiteLabelConfig({
                      ...whiteLabelConfig,
                      honorBadge: e.target.value as WhiteLabelBrandConfig['honorBadge'],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium"
                >
                  <option value="MDRT">MDRT 百萬圓桌會員</option>
                  <option value="COT (Court of the Table)">COT 超級會員 (3x MDRT)</option>
                  <option value="TOT (Top of the Table)">TOT 頂尖會員 (6x MDRT)</option>
                  <option value="Private Wealth Director">Private Wealth Director 財富策劃總監</option>
                </select>
              </div>

              <div>
                <label htmlFor="wl-contact" className="block text-xs font-semibold text-slate-700">
                  {t('WhatsApp / WeChat Contact Line', '頁首聯絡專線及 QR 編碼內容')}
                </label>
                <input
                  id="wl-contact"
                  type="text"
                  value={whiteLabelConfig.contactChannelLabel}
                  onChange={(e) =>
                    onChangeWhiteLabelConfig({
                      ...whiteLabelConfig,
                      contactChannelLabel: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700">
                  {t('PDF Banner Theme Color', 'PDF 建議書頁首主題色')}
                </span>
                <div className="mt-1 flex items-center gap-2">
                  {(
                    [
                      { hex: '#1D4ED8', label: 'Harbour Blue' },
                      { hex: '#0F766E', label: 'Private Emerald' },
                      { hex: '#1E293B', label: 'Executive Slate' },
                    ] as const
                  ).map((col) => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() =>
                        onChangeWhiteLabelConfig({ ...whiteLabelConfig, accentHex: col.hex })
                      }
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        whiteLabelConfig.accentHex === col.hex
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live PDF Header + 13x13 QR Preview */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div
              style={{ backgroundColor: whiteLabelConfig.enabled ? whiteLabelConfig.accentHex : '#0F172A' }}
              className="rounded-xl p-5 text-white flex items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <p className="text-sm font-bold leading-snug">
                  {whiteLabelConfig.enabled
                    ? whiteLabelConfig.practiceTitleZh
                    : 'HK InsureHub Pro (Default Header)'}
                </p>
                <p className="font-mono text-[11px] text-slate-200">
                  {intermediary.nameEn} ({intermediary.nameZh}) · {whiteLabelConfig.honorBadge}
                </p>
                <p className="font-mono text-[11px] text-slate-200">
                  IA Lic: {intermediary.iaLicenseNo} · {whiteLabelConfig.contactChannelLabel}
                </p>
              </div>
              <div
                aria-label="Live white-label QR matrix preview"
                className="grid gap-px rounded bg-white p-1.5 shrink-0"
                style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))', width: 56, height: 56 }}
              >
                {qrPreviewMatrix.flatMap((row, r) =>
                  row.map((cell, c) => (
                    <span
                      key={`${r}-${c}`}
                      className={cell ? 'bg-slate-900' : 'bg-white'}
                      style={{ width: 3, height: 3 }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-17: OFFLINE MEETING PWA MODE & CACHE SNAPSHOT                     */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-17' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs tabular-nums">
            <div>
              <span className="font-sans text-slate-500">{t('Network Status', '目前連線狀態')}</span>
              <p className="mt-0.5 text-base font-bold text-emerald-700">
                {isOnline ? t('Online · SW Caching Active', '在線 · Service Worker 已就緒') : t('Offline Mode', '離線運作中')}
              </p>
            </div>
            <div>
              <span className="font-sans text-slate-500">{t('Cached HK Catalog', '本機離線快取保單庫')}</span>
              <p className="mt-0.5 text-base font-bold text-slate-900">
                {plans.length} Plans · {leads.length} CRM Leads
              </p>
            </div>
            <div>
              <span className="font-sans text-slate-500">{t('Manifest Spec', 'W3C PWA 安裝規格')}</span>
              <p className="mt-0.5 text-base font-bold text-blue-700">
                192px + 512px + Maskable PNG
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PWAInstallButton />

            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem(
                    'hk_insurehub_offline_snapshot_v1',
                    JSON.stringify({
                      savedAt: new Date().toISOString(),
                      plansCount: plans.length,
                      leadsCount: leads.length,
                    })
                  );
                } catch {
                  // Ignore quota limits in restricted environments
                }
                setOfflineSnapshotSavedAt(new Date().toLocaleTimeString());
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {t(
                  'Pre-Cache Offline HSR / Cross-Border Pack Now',
                  '一鍵預先同步高鐵／過境無網絡離線報價包'
                )}
              </span>
            </button>

            {offlineSnapshotSavedAt && (
              <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                ✓ {t('Offline pack verified at', '已於')} {offlineSnapshotSavedAt}{' '}
                {t('', '完成本機離線快取驗證')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-18: TEAM DIRECTOR MDRT BOARD, AGE-BACKDATE & RO 7-YR AUDIT PACK   */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-18' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-3">
              <h4 className="text-xs font-bold text-slate-900">
                {t('District Team MDRT / COT Progress & GL30 Audit Pass Rate', '營業處團隊 MDRT / COT 業績進度及合規率看板')}
              </h4>
              <div className="space-y-2.5">
                {teamBoard.teamMembers.map((m) => (
                  <div key={m.nameZh} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">
                        {conv(m.nameZh)} · <span className="font-normal text-slate-500">{conv(m.roleZh)}</span>
                      </span>
                      <span className="font-mono font-bold text-blue-700 tabular-nums">
                        HK${m.fycYtdHkd.toLocaleString()} ({m.mdrtProgressPct}% MDRT) · {conv(m.statusLabelZh)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded bg-slate-200">
                      <div
                        style={{ width: `${Math.min(100, m.mdrtProgressPct)}%` }}
                        className="h-full bg-blue-700"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900">
                  {t('30-Day Insurance Age-Backdate Radar (Save 5%–8% Rate)', '客戶生日前「保單追溯年齡」黃金促單雷達')}
                </h4>
                {teamBoard.ageBackdateLeads.map((bl) => (
                  <div
                    key={bl.leadId}
                    className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {conv(bl.nameZh)} ({bl.currentAge}→{bl.nextAge}y)
                      </p>
                      <p className="font-mono text-[11px] text-amber-700 tabular-nums">
                        {t(`In ${bl.daysUntilAgeStepUp} days · Lock rate saves`, `尚餘 ${bl.daysUntilAgeStepUp} 日加齡 · 鎖定舊歲數慳`)}{' '}
                        HK${bl.lifetimePremiumSavedHkd.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const roPack = JSON.stringify(
                    {
                      packType: 'HKIA_RO_7_YEAR_STATUTORY_AUDIT_BUNDLE',
                      generatedAtIso: new Date().toISOString(),
                      responsibleOfficerLicense: intermediary.iaLicenseNo,
                      firmName: intermediary.firmName,
                      leadsCount: leads.length,
                      fnaSignedRecords: leads.filter((l) => Boolean(l.fnaRecord)),
                      whatsappDisclosureVaultCount: whatsappAuditLogs.length,
                      whatsappDisclosureVault: whatsappAuditLogs,
                    },
                    null,
                    2
                  );
                  triggerBrowserDownload(
                    `HKIA_RO_7Yr_Audit_Pack_${new Date().toISOString().slice(0, 10)}.json`,
                    roPack,
                    'application/json'
                  );
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>
                  {t('Export RO 7-Year HKIA Inspection Pack (.json)', '一鍵匯出經紀行 RO 7年保監查冊合規包 (.json)')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-19: HK MPF + QDAP + GREATER BAY AREA (GBA) RETIREMENT PLANNER     */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-19' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="imp19-venue" className="block text-xs font-semibold text-slate-700">
                {t('Retirement Venue (HK vs GBA)', '選擇退休生活場景（留港 vs 大灣區）')}
              </label>
              <select
                id="imp19-venue"
                value={retireVenue}
                onChange={(e) => setRetireVenue(e.target.value as RetirementLifestyleVenue)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                {(Object.keys(GBA_AND_HK_RETIREMENT_VENUES) as RetirementLifestyleVenue[]).map(
                  (v) => (
                    <option key={v} value={v}>
                      {t(
                        GBA_AND_HK_RETIREMENT_VENUES[v].labelEn,
                        conv(GBA_AND_HK_RETIREMENT_VENUES[v].labelZh)
                      )}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label htmlFor="imp19-mpf" className="block text-xs font-semibold text-slate-700">
                {t('Projected MPF at Age 65 (HKD)', '65歲預計強積金累算權益 (HKD)')}
              </label>
              <input
                id="imp19-mpf"
                type="number"
                step={200000}
                value={mpfAt65Hkd}
                onChange={(e) => setMpfAt65Hkd(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="imp19-qdap" className="block text-xs font-semibold text-slate-700">
                {t('HKMC Annuity + QDAP / Mo (HKD)', '香港年金＋QDAP 每月派發 (HKD)')}
              </label>
              <input
                id="imp19-qdap"
                type="number"
                step={1000}
                value={monthlyQdapHkd}
                onChange={(e) => setMonthlyQdapHkd(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="imp19-sav" className="block text-xs font-semibold text-slate-700">
                {t('Savings Policy Withdrawal / Mo', '分紅儲蓄單每月提取 (HKD)')}
              </label>
              <input
                id="imp19-sav"
                type="number"
                step={1000}
                value={monthlySavDrawHkd}
                onChange={(e) => setMonthlySavDrawHkd(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 font-mono tabular-nums">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <span className="font-sans text-xs text-slate-500">{t('Monthly MPF Draw', 'MPF 每月提取流')}</span>
                <p className="text-base font-bold text-slate-800">HK${gbaWaterfall.monthlyMpfStreamHkd.toLocaleString()}/mo</p>
              </div>
              <div>
                <span className="font-sans text-xs text-slate-500">{t('Total Passive Income', '三支柱每月總現金流')}</span>
                <p className="text-base font-bold text-blue-700">HK${gbaWaterfall.totalMonthlyPassiveIncomeHkd.toLocaleString()}/mo</p>
              </div>
              <div>
                <span className="font-sans text-xs text-slate-500">{t('Venue Monthly Cost', '所選養老場景月費')}</span>
                <p className="text-base font-bold text-slate-900">HK${gbaWaterfall.targetMonthlyExpenseHkd.toLocaleString()}/mo</p>
              </div>
              <div>
                <span className="font-sans text-xs text-slate-500">{t('Monthly Surplus / Gap', '每月現金流盈餘／缺口')}</span>
                <p
                  className={`text-base font-bold ${
                    gbaWaterfall.isFullyFunded ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {gbaWaterfall.monthlySurplusOrGapHkd >= 0 ? '+' : ''}HK$
                  {gbaWaterfall.monthlySurplusOrGapHkd.toLocaleString()}/mo
                </p>
              </div>
            </div>
            <p className="font-sans text-xs text-slate-700">
              {t(gbaWaterfall.venueMeta.medicalNoteEn, conv(gbaWaterfall.venueMeta.medicalNoteZh))}
            </p>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMP-20: WHATSAPP COMPLIANCE AUDIT VAULT & iAM SMART IDENTITY BRIDGE   */}
      {/* ===================================================================== */}
      {activeCode === 'IMP-20' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* iAM Smart Handshake */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900">
                {t('HKSAR iAM Smart (智方便+) 1-Click e-KYC & Digital Signing Bridge', '香港政府「智方便+ (iAM Smart)」一鍵實名核實及法定數碼簽署接口')}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t(
                  `Verify ${activeLead.fullNameEn}'s HKID identity token via HKSAR iAM Smart+ and auto-unlock e-KYC inside 02 CRM & 04 Auto-Policy STP.`,
                  `直接為當前客戶 ${activeLead.fullNameZh} 完成「智方便+」實名認證，即時更新 02 CRM 及 04 電子投保之 e-KYC 狀態！`
                )}
              </p>
              {iamHandshakeResult && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 font-mono text-[11px] text-emerald-900 space-y-1">
                  <p className="font-bold">✓ {iamHandshakeResult.iamSmartRefId}</p>
                  <p>HKID: {iamHandshakeResult.verifiedHkidNumber}</p>
                  <p>{iamHandshakeResult.eloaLevel}</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const hs = buildIamSmartVerificationHandshake(activeLead);
                setIamHandshakeResult(hs);
                onUpdateLead(activeLead.id, (prev) => ({
                  ...prev,
                  hkidNumber: hs.verifiedHkidNumber,
                  kycCheck: {
                    ...prev.kycCheck,
                    hkidVerified: true,
                    hkidDocNumber: hs.verifiedHkidNumber,
                  },
                  lastContactIso: new Date().toISOString(),
                }));
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>
                {t(
                  `Verify ${activeLead.fullNameEn} via iAM Smart+`,
                  `一鍵以「智方便+」核實 ${activeLead.fullNameZh} 身份`
                )}
              </span>
            </button>
          </div>

          {/* WhatsApp Compliance Disclosure Vault */}
          <div className="lg:col-span-7 space-y-3">
            <h4 className="text-xs font-bold text-slate-900">
              {t('Immutable WhatsApp / WeChat Disclosure Audit Vault (7-Yr HKIA Trail)', 'WhatsApp／微信合規披露防篡改留痕金庫（HKIA-SHA 雜湊指紋）')}
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                aria-label="Disclosure summary topic to log"
                value={waTopicInput}
                onChange={(e) => setWaTopicInput(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!waTopicInput.trim()) return;
                  onAppendWhatsappAuditLog(
                    createWhatsAppComplianceLog({
                      clientName: `${activeLead.fullNameZh} (${activeLead.fullNameEn})`,
                      advisorLicenseNo: intermediary.iaLicenseNo,
                      channel: 'WHATSAPP',
                      summaryTopic: waTopicInput.trim(),
                    })
                  );
                }}
                className="rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
              >
                {t('Log Disclosure Hash', '新增合規留痕')}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {whatsappAuditLogs.map((log) => (
                <div key={log.id} className="p-3 text-xs space-y-0.5 bg-white">
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 tabular-nums">
                    <span className="font-bold text-blue-700">{log.auditFingerprint}</span>
                    <span>
                      {log.channel} · {new Date(log.sentAtIso).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="font-medium text-slate-900">
                    {log.clientName} — {conv(log.summaryTopic)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
