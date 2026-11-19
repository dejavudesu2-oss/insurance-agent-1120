import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Award, Check, QrCode, ShieldCheck, TrendingUp } from 'lucide-react';
import {
  ADVISOR_SAAS_TIERS,
  calculateAdvisorSubscriptionRoi,
  ImprovementCategory,
  TWENTY_APP_IMPROVEMENTS,
} from '../domain/clauseAndMonetizationEngine';
import {
  buildDeterministicQrMatrix,
  ClientMicrositeRecord,
  TwentyUpgradeCode,
  WhatsAppComplianceLogEntry,
  WhiteLabelBrandConfig,
} from '../domain/twentyUpgradesEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import { ClientLead, CurrencyCode, InsurancePlan, IntermediaryProfile } from '../domain/types';
import { TwentyUpgradesHub } from './TwentyUpgradesHub';

interface MonetizationRoadmapViewProps {
  intermediary: IntermediaryProfile;
  totalPlansCount: number;
  totalInsurersCount: number;
  adoptedImprovementIds: string[];
  onToggleAdoptImprovement: (id: string) => void;
  activeUpgradeCode: TwentyUpgradeCode;
  onSelectUpgradeCode: (code: TwentyUpgradeCode) => void;
  leads: ClientLead[];
  activeLead: ClientLead;
  onAddLead: (newLead: ClientLead) => void;
  onUpdateLead: (leadId: string, updater: (prev: ClientLead) => ClientLead) => void;
  plans: InsurancePlan[];
  selectedPlanId: string;
  onSelectPlanId: (planId: string) => void;
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
  hideEmbeddedUpgradesAndList?: boolean;
  canShowDrive?: boolean;
}

const IMPROVEMENT_FILTERS: Array<{
  id: 'ALL' | ImprovementCategory;
  labelEn: string;
  labelZh: string;
}> = [
  { id: 'ALL', labelEn: 'All 20 Upgrades', labelZh: '全部 20 項升級建議' },
  { id: 'CLOSING_REVENUE', labelEn: 'Closing & Revenue', labelZh: '簽單轉化與增收' },
  { id: 'UX_CLIENT_TRUST', labelEn: 'Visual UX & Trust', labelZh: '視覺體驗與客戶信任' },
  { id: 'AI_AUTOMATION', labelEn: 'AI & Workflow Speed', labelZh: 'AI 自動化與提速' },
  { id: 'COMPLIANCE_TEAM_SAAS', labelEn: 'Compliance & Team SaaS', labelZh: '合規風控與團隊管理' },
];

export const MonetizationRoadmapView: React.FC<MonetizationRoadmapViewProps> = ({
  intermediary,
  totalPlansCount,
  totalInsurersCount,
  adoptedImprovementIds,
  onToggleAdoptImprovement,
  activeUpgradeCode,
  onSelectUpgradeCode,
  leads,
  activeLead,
  onAddLead,
  onUpdateLead,
  plans,
  selectedPlanId,
  onSelectPlanId,
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
  hideEmbeddedUpgradesAndList = false,
  canShowDrive = false,
}) => {
  const { lang, t } = useLanguage();

  // Interactive Advisor ROI Calculator State
  const [billingCycle, setBillingCycle] = useState<'ANNUAL' | 'MONTHLY'>('ANNUAL');
  const [monthlySubHkd, setMonthlySubHkd] = useState<number>(798);
  const [avgCasePremHkd, setAvgCasePremHkd] = useState<number>(95000);
  const [avgFycPct, setAvgFycPct] = useState<number>(35);
  const [extraCasesPerQuarter, setExtraCasesPerQuarter] = useState<number>(1.5);
  const [hoursSavedPerWeek, setHoursSavedPerWeek] = useState<number>(5);
  const [preventedClawbacksPerYr, setPreventedClawbacksPerYr] = useState<number>(1);
  const [impCategory, setImpCategory] = useState<'ALL' | ImprovementCategory>('ALL');

  const qrMatrix = useMemo(
    () =>
      buildDeterministicQrMatrix(
        `${whiteLabelConfig.practiceTitleEn}|${whiteLabelConfig.contactChannelLabel}|${intermediary.iaLicenseNo}`
      ),
    [whiteLabelConfig, intermediary.iaLicenseNo]
  );

  const roi = useMemo(
    () =>
      calculateAdvisorSubscriptionRoi({
        monthlySubscriptionHkd: monthlySubHkd,
        avgCaseAnnualPremiumHkd: avgCasePremHkd,
        avgFycCommissionRatePct: avgFycPct,
        extraPoliciesClosedPerQuarter: extraCasesPerQuarter,
        adminHoursSavedPerWeek: hoursSavedPerWeek,
        advisorHourlyValueHkd: 450,
        preventedClawbackPoliciesPerYear: preventedClawbacksPerYr,
      }),
    [
      monthlySubHkd,
      avgCasePremHkd,
      avgFycPct,
      extraCasesPerQuarter,
      hoursSavedPerWeek,
      preventedClawbacksPerYr,
    ]
  );

  const filteredImprovements = useMemo(() => {
    if (impCategory === 'ALL') return TWENTY_APP_IMPROVEMENTS;
    return TWENTY_APP_IMPROVEMENTS.filter((item) => item.category === impCategory);
  }, [impCategory]);

  const gainTotal = Math.max(1, roi.totalAnnualEconomicGainHkd);
  const extraCommShare = Math.round((roi.annualExtraCommissionHkd / gainTotal) * 100);
  const timeSavedShare = Math.round((roi.annualAdminTimeValueSavedHkd / gainTotal) * 100);
  const clawbackShare = Math.max(0, 100 - extraCommShare - timeSavedShare);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-slate-900"
            style={{ textWrap: 'balance' }}
          >
            {t(
              'Advisor Time Efficiency, Commission Uplift & Team Branding Planner',
              '香港保險顧問時間效益、簽單增收與個人品牌方案試算'
            )}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {t(
              `Estimate how much admin time and extra FYC you gain across ${totalInsurersCount} HK insurers & ${totalPlansCount} plans (1 extra policy covers ${roi.monthsCoveredBySingleExtraPolicy} months of workspace cost).`,
              `幫你計清慳返幾多做 Proposal 同對表時間、每季多簽一張單可帶來幾多額外首年佣金（多簽 1 單已抵銷 ${roi.monthsCoveredBySingleExtraPolicy} 個月系統開支）。`
            )}
          </p>
        </div>

        <div
          role="group"
          aria-label="Subscription billing cycle"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 shrink-0"
        >
          <button
            type="button"
            onClick={() => {
              setBillingCycle('ANNUAL');
              setMonthlySubHkd(798);
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
              billingCycle === 'ANNUAL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('Annual Billing (Save 18%)', '年繳方案（省 18%）')}
          </button>
          <button
            type="button"
            onClick={() => {
              setBillingCycle('MONTHLY');
              setMonthlySubHkd(980);
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
              billingCycle === 'MONTHLY'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('Monthly Billing', '按月彈性付費')}
          </button>
        </div>
      </div>

      {/* LIVE 20-UPGRADE INTERACTIVE WORKBENCH (IMP-01 TO IMP-20) */}
      {!hideEmbeddedUpgradesAndList && (
        <TwentyUpgradesHub
          activeCode={activeUpgradeCode}
          onSelectCode={onSelectUpgradeCode}
          leads={leads}
          activeLead={activeLead}
          onAddLead={onAddLead}
          onUpdateLead={onUpdateLead}
          plans={plans}
          selectedPlanId={selectedPlanId}
          onSelectPlanId={onSelectPlanId}
          intermediary={intermediary}
          currency={currency}
          sumAssuredUsd={sumAssuredUsd}
          paymentTermYears={paymentTermYears}
          whiteLabelConfig={whiteLabelConfig}
          onChangeWhiteLabelConfig={onChangeWhiteLabelConfig}
          microsites={microsites}
          onCreateMicrosite={onCreateMicrosite}
          onLogMicrositeRead={onLogMicrositeRead}
          whatsappAuditLogs={whatsappAuditLogs}
          onAppendWhatsappAuditLog={onAppendWhatsappAuditLog}
          onJumpToSection={onJumpToSection}
        />
      )}

      {/* 4 Core Psychological & Economic Drivers Why HK Agents Pay */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: TrendingUp,
            titleEn: '1. Commission Multiplier (1 Case = 3+ Yrs Fee)',
            titleZh: '1. 簽單槓桿極高（多簽 1 單＝3 年月費）',
            bodyEn:
              'HK agents think in FYC commission, not software cost. Closing just ONE extra savings or VHIS family bundle on the first meeting pays for 35–45 months of subscription.',
            bodyZh:
              '香港顧問最看重首年佣金（FYC）回報。只要透過跨保司即場對比及私院免找數工具每季多簽 1 張單，佣金已足夠支付超過 3 年系統月費。',
          },
          {
            icon: Award,
            titleEn: '2. Bespoke Private-Bank White-Label Face',
            titleZh: '2. 私人銀行級白牌形象（面子與轉介紹）',
            bodyEn:
              'Top MDRT/COT advisors pay to stand out from generic insurer PDFs. Custom firm logos, WeChat/WhatsApp QR codes, and clean SVG charts win HNW & MCV trust instantly.',
            bodyZh:
              '高淨值及內地訪客（MCV）極重視專業感。匯出印有顧問專屬品牌 Logo、個人二維碼及清晰圖表之比較報告，能瞬間拉開與傳統單一保司計劃書之差距。',
          },
          {
            icon: ShieldCheck,
            titleEn: '3. HKIA License & Clawback Shield',
            titleZh: '3. 保監合規護城河＋防 13 個月斷供回撥',
            bodyEn:
              'Built-in GL30 FNA gates, Client Safe Mode anonymization for Tied Agents, ICB claims trap alerts, and 13-month persistency radar protect hard-earned commissions.',
            bodyZh:
              '專屬代理人用匿名鎖見客免踩越權紅線；自動留存 GL30 FNA、CPFI 轉保紀錄及 13 個月續保防斷供預警，直接守住已落袋佣金與牌照安全。',
          },
          {
            icon: QrCode,
            titleEn: '4. 10-Minute Meeting Prep & Full Data Ownership',
            titleZh: '4. 10 分鐘做好見客準備＋客戶資料自己掌握',
            bodyEn: canShowDrive
              ? 'HKID/Landing Slip OCR + Cantonese Voice-to-FNA cut 45 mins of admin per client, with 1-click private Google Drive backup.'
              : 'HKID/Landing Slip OCR + Cantonese Voice-to-FNA cut 45 mins of admin per client, with instant local JSON/PDF export anytime.',
            bodyZh: canShowDrive
              ? '身份證／入境紙 OCR 同廣東話語音整理筆記每次見客慳返 45 分鐘；資料更可隨時備份去你自己嘅私人 Google Drive。'
              : '身份證／入境紙 OCR 同廣東話語音整理筆記每次見客慳返 45 分鐘；所有客戶紀錄及建議書均可隨時匯出自己保存。',
          },
        ].map((pillar, i) => {
          const Icon = pillar.icon;
          return (
            <article
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-5 space-y-2.5"
            >
              <div className="flex items-center gap-2 text-blue-700">
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <h2 className="text-xs font-bold text-slate-900">
                  {t(pillar.titleEn, pillar.titleZh)}
                </h2>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                {t(pillar.bodyEn, pillar.bodyZh)}
              </p>
            </article>
          );
        })}
      </section>

      {/* Interactive Subscription Payback & ROI Simulator + White-Label Preview */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 lg:col-span-7">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {t(
                'Interactive Advisor Subscription Payback & Net Income Simulator',
                '顧問付費回本倍數及年度淨增收模擬器（向團隊證明為何超值）'
              )}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {t(
                'Adjust your average HK policy size and time saved to see exact annual commission uplift vs. SaaS fee.',
                '調整你的平均保單年繳保費及每週節省文書時數，即時計算訂閱回報倍數。'
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {t('Monthly SaaS Fee (HKD)', '系統月費 (HKD)')}
              </label>
              <input
                type="number"
                step={50}
                value={monthlySubHkd}
                onChange={(e) => setMonthlySubHkd(Math.max(99, Number(e.target.value) || 398))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {t('Avg Case AFYP (HKD)', '平均每單年繳保費 (HKD)')}
              </label>
              <input
                type="number"
                step={10000}
                value={avgCasePremHkd}
                onChange={(e) => setAvgCasePremHkd(Math.max(5000, Number(e.target.value) || 50000))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {t('Avg FYC Rate (%)', '平均首年佣金率 (%)')}
              </label>
              <input
                type="number"
                min={10}
                max={65}
                value={avgFycPct}
                onChange={(e) => setAvgFycPct(Math.max(10, Number(e.target.value) || 30))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {t('Extra Cases / Quarter', '每季多簽保單宗數')}
              </label>
              <input
                type="number"
                step={0.5}
                min={0.5}
                value={extraCasesPerQuarter}
                onChange={(e) => setExtraCasesPerQuarter(Math.max(0, Number(e.target.value) || 1))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {t('Admin Hrs Saved / Wk', '每週節省文書時數')}
              </label>
              <input
                type="number"
                step={1}
                min={1}
                value={hoursSavedPerWeek}
                onChange={(e) => setHoursSavedPerWeek(Math.max(0, Number(e.target.value) || 3))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {t('Saved Lapses / Yr', '每年救回續保單數')}
              </label>
              <input
                type="number"
                step={1}
                min={0}
                value={preventedClawbacksPerYr}
                onChange={(e) => setPreventedClawbacksPerYr(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold tabular-nums"
              />
            </div>
          </div>

          {/* Visual Economic Gain vs Cost Bar */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 tabular-nums">
              <div>
                <span className="text-[11px] text-slate-500">
                  {t('1 Extra Policy Pays For', '多簽 1 張保單已夠交')}
                </span>
                <p className="font-mono text-lg font-bold text-emerald-700">
                  {roi.monthsCoveredBySingleExtraPolicy} {t('mos', '個月月費')}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500">
                  {t('Annual SaaS Cost', '全年訂閱總支出')}
                </span>
                <p className="font-mono text-lg font-bold text-slate-800">
                  HK${roi.annualSubscriptionCostHkd.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500">
                  {t('Net Annual Gain', '扣除月費每年淨增收')}
                </span>
                <p className="font-mono text-lg font-bold text-blue-700">
                  +HK${roi.netAnnualBenefitHkd.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500">
                  {t('Subscription ROI', '投資回報倍數')}
                </span>
                <p className="font-mono text-lg font-bold text-emerald-700">
                  {roi.roiMultiple}x ROI
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex h-4 w-full overflow-hidden rounded bg-slate-200">
                <div style={{ width: `${extraCommShare}%` }} className="bg-blue-700" />
                <div style={{ width: `${timeSavedShare}%` }} className="bg-teal-600" />
                <div style={{ width: `${clawbackShare}%` }} className="bg-amber-600" />
              </div>
              <div className="flex flex-wrap justify-between gap-2 font-mono text-[11px] text-slate-600 tabular-nums">
                <span>
                  {t('New FYC:', '新增簽單佣金：')} HK${roi.annualExtraCommissionHkd.toLocaleString()}
                </span>
                <span>
                  {t('Time Saved Value:', '節省時間價值：')} HK${roi.annualAdminTimeValueSavedHkd.toLocaleString()}
                </span>
                <span>
                  {t('Clawback Saved:', '防回撥保護：')} HK${roi.annualClawbackProtectedHkd.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive White-Label Broker Header Preview */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 lg:col-span-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {t(
                  'Paid Pro Unlock: White-Label Proposal Branding',
                  '付費版核心賣點：個人／家族辦公室白牌報告頭銜'
                )}
              </h2>
              <button
                type="button"
                onClick={() =>
                  onChangeWhiteLabelConfig({
                    ...whiteLabelConfig,
                    enabled: !whiteLabelConfig.enabled,
                  })
                }
                aria-pressed={whiteLabelConfig.enabled}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                  whiteLabelConfig.enabled
                    ? 'bg-blue-700 text-white'
                    : 'border border-slate-300 bg-slate-50 text-slate-700'
                }`}
              >
                {whiteLabelConfig.enabled
                  ? t('White-Label ON', '白牌模式：開啟')
                  : t('Free Watermark', '免費版預設樣式')}
              </button>
            </div>

            <div>
              <label htmlFor="wl-brand-input" className="block text-xs font-semibold text-slate-700">
                {t('Custom Practice / Team Header Title', '自訂營業處／財富管理團隊名稱')}
              </label>
              <input
                id="wl-brand-input"
                type="text"
                value={whiteLabelConfig.practiceTitleZh}
                onChange={(e) =>
                  onChangeWhiteLabelConfig({
                    ...whiteLabelConfig,
                    practiceTitleZh: e.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900"
              />
            </div>

            {/* Simulated Proposal PDF Header Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {whiteLabelConfig.enabled
                      ? whiteLabelConfig.practiceTitleZh
                      : 'Generated via HK InsureHub Free Trial (Watermarked)'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    {intermediary.nameEn} ({intermediary.nameZh}) · {whiteLabelConfig.honorBadge} · HKIA Lic:{' '}
                    {intermediary.iaLicenseNo}
                  </p>
                </div>
                {whiteLabelConfig.enabled ? (
                  <div
                    aria-label="Advisor QR Matrix"
                    className="grid gap-px rounded border border-slate-300 bg-white p-1 shrink-0"
                    style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))', width: 46, height: 46 }}
                  >
                    {qrMatrix.flatMap((row, r) =>
                      row.map((cell, c) => (
                        <span
                          key={`${r}-${c}`}
                          className={cell ? 'bg-slate-900' : 'bg-white'}
                          style={{ width: 2.5, height: 2.5 }}
                        />
                      ))
                    )}
                  </div>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white font-mono text-[10px] font-bold text-slate-700">
                    DEMO
                  </div>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                {whiteLabelConfig.enabled
                  ? t(
                      'Every exported PDF & client microsite carries YOUR wealth brand, MDRT credential & direct WhatsApp/WeChat QR — zero software ads.',
                      '所有匯出之比較建議書 PDF 及微網頁均只顯示你的個人品牌、MDRT 頭銜與專屬聯絡 QR Code，零第三方平台水印。'
                    )
                  : t(
                      'Free Trial limits exports to 3 watermarked quotes/month — creating a natural, high-converting upgrade trigger to Solo Pro / COT Elite.',
                      '免費試用版每月限匯出 3 份帶平台水印報告 — 讓顧問先免費體驗全市場比較威力，見重要客戶前自然升級付費版去水印。'
                    )}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            {t(
              'Recommended Go-To-Market: 14-day full COT Elite trial + Agency District Director 10-seat team bundles.',
              '最佳推廣策略：提供 14 日免費試用＋與大型營業處總監 (DD) 合作推出 10 席團隊年費包，獲客成本最低且續訂率最高。'
            )}
          </p>
        </div>
      </section>

      {/* 3 SaaS Pricing Tiers */}
      <section aria-label="SaaS subscription tiers for Hong Kong insurance advisors" className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">
          {t(
            '3-Tier Advisor & Agency Team Plans',
            '個人顧問、績優團隊及營業處方案對比'
          )}
        </h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {ADVISOR_SAAS_TIERS.map((tier) => {
            const displayPrice =
              billingCycle === 'ANNUAL' ? tier.annualMonthlyEquivHkd : tier.monthlyPriceHkd;
            const rawBullets = lang === 'en' ? tier.coreLimitsEn : tier.coreLimitsZh;
            const bullets = canShowDrive
              ? rawBullets
              : rawBullets.map((b) =>
                  b
                    .replace(/\s*\+\s*Google Drive encrypted sync/gi, ' + local encrypted export')
                    .replace(/及\s*Google Drive\s*雲端同步/g, '及一鍵匯出離線備份')
                );
            return (
              <article
                key={tier.id}
                className={`flex flex-col justify-between rounded-xl border bg-white p-5 ${
                  tier.highlighted
                    ? 'border-blue-700 ring-1 ring-blue-700/20'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-bold text-slate-900">
                      {t(tier.tierNameEn, tier.tierNameZh)}
                    </span>
                    {tier.highlighted && (
                      <span className="font-mono text-[11px] font-bold text-blue-700">
                        {t('MOST POPULAR', '最多績優顧問選用')}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {t(tier.targetAudienceEn, tier.targetAudienceZh)}
                  </p>

                  <div className="mt-4 flex items-baseline gap-1.5 border-b border-slate-100 pb-4 font-mono tabular-nums">
                    <span className="text-2xl font-bold text-slate-900">
                      HK${displayPrice.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500">
                      /{t('mo', '月')}
                      {billingCycle === 'ANNUAL' ? ` (${t('billed annually', '按年計費')})` : ''}
                    </span>
                  </div>

                  <ul className="mt-4 space-y-2 text-xs leading-relaxed text-slate-700">
                    {bullets.map((b, idx) => (
                      <li key={idx}>• {lang === 'zh-CN' ? toSimplifiedChinese(b) : b}</li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setMonthlySubHkd(displayPrice)}
                  className={`mt-5 w-full rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    tier.highlighted
                      ? 'bg-blue-700 text-white hover:bg-blue-800'
                      : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {t(
                    `Test HK$${displayPrice}/mo in ROI Simulator Above`,
                    `代入 HK$${displayPrice}/月 至上方回本計算機`
                  )}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* 20 Concrete Product & UX Improvements */}
      {!hideEmbeddedUpgradesAndList && (
        <section aria-label="20 concrete improvements for HK insurance super-app" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {t(
                  '20 Concrete Improvements to Maximize Advisor Retention & Paid Conversion',
                  '20 項高價值進階升級建議（全面強化簽單轉化、視覺體驗及付費留存）'
                )}
              </h2>
              <p className="text-xs text-slate-500">
                {t(
                  'Filter by strategic pillar and pin priority items into your persistent workspace roadmap.',
                  '可按四大策略範疇篩選，並點擊「優先排期」將重點項目儲存至工作區藍圖。'
                )}
              </p>
            </div>

            <div
              role="group"
              aria-label="Filter 20 improvements by category"
              className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
            >
              {IMPROVEMENT_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setImpCategory(f.id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    impCategory === f.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t(f.labelEn, f.labelZh)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            {filteredImprovements.map((item) => {
              const isPinned = adoptedImprovementIds.includes(item.id);
              const title =
                lang === 'en'
                  ? item.titleEn
                  : lang === 'zh-CN'
                  ? toSimplifiedChinese(item.titleZh)
                  : item.titleZh;
              const reason =
                lang === 'en'
                  ? item.whyAgentsPayEn
                  : lang === 'zh-CN'
                  ? toSimplifiedChinese(item.whyAgentsPayZh)
                  : item.whyAgentsPayZh;
              const catLabel =
                lang === 'en'
                  ? item.categoryLabelEn
                  : lang === 'zh-CN'
                  ? toSimplifiedChinese(item.categoryLabelZh)
                  : item.categoryLabelZh;

              return (
                <article
                  key={item.id}
                  className={`flex flex-col justify-between rounded-xl border bg-white p-4 transition-colors ${
                    isPinned ? 'border-blue-700' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        <strong className="font-mono text-blue-700 tabular-nums">
                          #{String(item.number).padStart(2, '0')}
                        </strong>{' '}
                        · {catLabel} · {item.effortTag}
                      </span>

                      <button
                        type="button"
                        onClick={() => onToggleAdoptImprovement(item.id)}
                        aria-pressed={isPinned}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 whitespace-nowrap shrink-0"
                      >
                        {isPinned && <Check className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />}
                        <span>{isPinned ? t('Pinned', '已納入排期') : t('Pin Priority', '優先排期')}</span>
                      </button>
                    </div>

                    <h3 className="mt-1.5 text-sm font-bold text-slate-900">{title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{reason}</p>
                  </div>

                  {/* Visual Willingness-to-Pay Impact Bar + Live Launch Button */}
                  <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-2.5">
                    <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                      {t('WTP Impact', '付費吸引力')}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded bg-slate-100">
                      <div
                        style={{ width: `${item.impactScore}%` }}
                        className="h-full rounded bg-blue-700"
                      />
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                      {item.impactScore}/100
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const code = (item.upgradeCode ||
                          `IMP-${String(item.number).padStart(2, '0')}`) as TwentyUpgradeCode;
                        onSelectUpgradeCode(code);
                        document
                          .getElementById('twenty-live-upgrades-workbench')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        activeUpgradeCode === item.upgradeCode
                          ? 'bg-blue-700 text-white'
                          : 'border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <span>{t('Open Live Tool', '開啟實戰工具')}</span>
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
