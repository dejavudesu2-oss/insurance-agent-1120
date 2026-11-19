import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, Play } from 'lucide-react';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import { AppLanguage, CurrencyCode } from '../domain/types';
import {
  computeLandingActuarialSandbox,
  LANDING_SANDBOX_MANDATES,
  SandboxMandateOption,
} from '../domain/landingTemplatesConfig';
import type { User } from 'firebase/auth';
import { CantoneseTutorialShowcase } from './CantoneseTutorialShowcase';
import { LoginButton } from './LoginButton';
import { WorkspaceSection } from './SidebarNav';

import familyOfficeLoungeImg from '../assets/images/hk_family_office_lounge_1794658408548.jpg';
import centralArchivalImg from '../assets/images/central_archival_architecture_1794658410116.jpg';
import daylightStudioImg from '../assets/images/advisor_daylight_consultation_1794658411643.jpg';

import type { MemberAccountProfile } from '../domain/memberAuthEngine';
import type { TutorialTargetSubTab } from '../domain/tutorialWalkthroughConfig';
import type { MemberModalInitialTab } from './MemberAuthModal';

export interface DistinctTemplateSharedProps {
  plansCount: number;
  insurersCount: number;
  leadsCount: number;
  inForceCount: number;
  activeMember?: MemberAccountProfile | null;
  onOpenMemberAuth?: (tab?: MemberModalInitialTab) => void;
  googleUser?: User | null;
  cloudBackupBusy?: boolean;
  onGoogleAuthAndBackup?: (params: {
    user: User;
    accessToken: string;
  }) => Promise<void> | void;
  onGoogleAuthError?: (message: string) => void;
  onEnterWorkbench: (
    targetStage?: WorkspaceSection,
    targetSubTab?: TutorialTargetSubTab,
    targetLeadId?: string,
    guidedChapterId?: string
  ) => void;
  onOpenTemplateGallery: () => void;
}

const LANGUAGE_CHOICES: Array<{ code: AppLanguage; label: string }> = [
  { code: 'zh-HK', label: '繁體' },
  { code: 'zh-CN', label: '简体' },
  { code: 'en', label: 'EN' },
];

// Resilient Image Component (Zero-Broken-Image Policy)
const ResilientEditorialImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallbackTitle: string;
}> = ({ src, alt, className = '', fallbackTitle }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-8 text-center text-slate-200 ${className}`}
      >
        <div className="font-editorial text-xl italic">{fallbackTitle}</div>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

// ============================================================================
// TEMPLATE 01: DAYLIGHT PRODUCT STUDIO (Stripe · Mercury · Apple Clean SaaS)
// Crisp #F8FAFC / #FFFFFF daylight canvas, Royal Cobalt #1D4ED8, Live UI Window
// ============================================================================
export const Template01DaylightStudio: React.FC<DistinctTemplateSharedProps> = ({
  plansCount,
  insurersCount,
  leadsCount,
  inForceCount,
  activeMember = null,
  onOpenMemberAuth,
  onEnterWorkbench,
}) => {
  const { lang, setLang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const [previewTab, setPreviewTab] = useState<'COMPARATOR' | 'CRM_SORT' | 'RADAR'>('COMPARATOR');
  const [crmSortPreview, setCrmSortPreview] = useState<'STAGE' | 'LAST_CONTACT'>('STAGE');
  const [mandate, setMandate] = useState<SandboxMandateOption>(LANDING_SANDBOX_MANDATES[1]);
  const [currency, setCurrency] = useState<CurrencyCode>('HKD');
  const [stressPct, setStressPct] = useState<100 | 90 | 85>(100);

  const proj = computeLandingActuarialSandbox(mandate, currency, stressPct);

  const crmRows =
    crmSortPreview === 'STAGE'
      ? [
          {
            nameEn: 'Henry Wang · Age 52',
            nameZh: '王建宏 · 52 歲',
            pol: 'HK-POL-2023-77419',
            stageEn: 'Underwriting',
            stageZh: '核保審批中',
            date: '2026-11-11',
          },
          {
            nameEn: 'Vanessa Lin · Age 31',
            nameZh: '林雅婷 · 31 歲',
            pol: 'HK-POL-2025-33910',
            stageEn: 'Proposal Sent',
            stageZh: '已發建議書',
            date: '2026-11-11',
          },
          {
            nameEn: 'Daniel Chan · Age 36',
            nameZh: '陳冠宇 · 36 歲',
            pol: 'HK-POL-2024-88102',
            stageEn: 'FNA Completed',
            stageZh: '已完成 FNA',
            date: '2026-11-12',
          },
        ]
      : [
          {
            nameEn: 'Daniel Chan · Age 36',
            nameZh: '陳冠宇 · 36 歲',
            pol: 'HK-POL-2024-88102',
            stageEn: 'FNA Completed',
            stageZh: '已完成 FNA',
            date: '2026-11-12 09:30',
          },
          {
            nameEn: 'Vanessa Lin · Age 31',
            nameZh: '林雅婷 · 31 歲',
            pol: 'HK-POL-2025-33910',
            stageEn: 'Proposal Sent',
            stageZh: '已發建議書',
            date: '2026-11-11 18:05',
          },
          {
            nameEn: 'Henry Wang · Age 52',
            nameZh: '王建宏 · 52 歲',
            pol: 'HK-POL-2023-77419',
            stageEn: 'Underwriting',
            stageZh: '核保審批中',
            date: '2026-11-11 15:10',
          },
        ];

  return (
    <div
      data-testid="template-t1-daylight"
      className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24 selection:bg-blue-600 selection:text-white"
    >
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="mx-auto flex max-w-[1360px] items-center justify-between gap-8 border-b border-slate-200/90 bg-white/95 px-6 py-4 lg:px-10">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onEnterWorkbench('stage1');
          }}
          className="text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0"
        >
          HK InsureHub Pro
        </a>

        <nav
          aria-label="Daylight template navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <a href="#t1-preview" className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
            {t('Product Preview', conv('實機視窗預覽'))}
          </a>
          <a href="#t1-sandbox" className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
            {t('Actuarial Calculator', conv('精算回報試算'))}
          </a>
          <a href="#t1-bento" className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
            {t('Capabilities', conv('核心功能'))}
          </a>
          <button
            type="button"
            onClick={() => onEnterWorkbench('stage1', 'crm')}
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t('Client CRM', conv('客戶管線 CRM'))}
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            data-testid="landing-top-enter-btn"
            onClick={() => onEnterWorkbench('stage1')}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            <span>{t('Enter Workbench', conv('進入顧問工作台'))}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Hero Split: Clean Daylight Typography + Interactive Multi-Tab Product Window */}
      <section id="t1-preview" className="bg-white border-b border-slate-200">
        <div className="mx-auto grid max-w-[1360px] grid-cols-1 items-stretch gap-10 px-6 py-14 lg:grid-cols-12 lg:px-10 lg:py-20">
          <div className="flex flex-col justify-between space-y-8 lg:col-span-5">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-medium text-slate-500">
                  <span className="font-semibold text-[#1D4ED8]">
                    {t('Hong Kong InsurTech Workbench', conv('全港持牌保險顧問實戰平台'))}
                  </span>
                  <span className="mx-2" aria-hidden="true">·</span>
                  <span>HKIA GL16 / GL28 / GL30</span>
                </div>

                <div
                  role="group"
                  aria-label="Language switcher"
                  className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5"
                >
                  {LANGUAGE_CHOICES.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      data-testid={`landing-lang-${opt.code}`}
                      onClick={() => setLang(opt.code)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                        lang === opt.code
                          ? 'bg-white text-slate-950 font-semibold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <h1 className="text-[clamp(2.25rem,3.8vw,3.5rem)] leading-[1.1] font-extrabold tracking-tight text-slate-950 text-balance">
                {t(
                  `Compare ${plansCount}+ Hong Kong policies and close compliant proposals in minutes.`,
                  conv(`一屏橫向比對 ${plansCount}+ 款香港保單，極速完成缺口診斷與合規簽單。`)
                )}
              </h1>

              <p className="text-base leading-relaxed text-slate-600 max-w-[54ch]">
                {t(
                  `Purpose-built for licensed Hong Kong brokers and tied agents across ${insurersCount} insurers. Sort CRM pipelines by stage or last contact, run Red/Blue/Yellow 3-plan comparisons, verify private hospital cashless LOG passes, and export 5-slide executive PDFs.`,
                  conv(`專為香港經紀及專屬代理打造，覆蓋全港 ${insurersCount} 間獲授權保司。整合 CRM 階段／聯絡日智能排序、紅藍黃三計劃對比、私家醫院免找數核實、QR 手機互動微網與 5 頁高管 PDF 匯出。`)
                )}
              </p>
            </div>

            <div className="space-y-5 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-testid="landing-enter-workbench-btn"
                  onClick={() => onEnterWorkbench('stage1')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{t('Launch Advisor Workbench', conv('立即開啟 6 步工作台'))}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  data-testid="landing-open-crm-btn"
                  onClick={() => onEnterWorkbench('stage1', 'crm')}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{t('Open Sorted CRM', conv('開啟 CRM 客戶管線'))}</span>
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="text-xs text-slate-500">
                <span>{t(`${leadsCount} Active Client Cases`, conv(`已建檔 ${leadsCount} 位客戶個案`))}</span>
                <span className="mx-2" aria-hidden="true">·</span>
                <span>{t(`${inForceCount} In-Force Renewals Tracked`, conv(`${inForceCount} 份生效保單續保追蹤`))}</span>
                <span className="mx-2" aria-hidden="true">·</span>
                <span>{t('Google Cloud Vision OCR Ready', conv('支援身份證／入境標籤 Vision OCR'))}</span>
              </div>
            </div>
          </div>

          {/* Interactive Live Product Window Mockup */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-7 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="text-xs font-semibold text-slate-900">
                {t('Interactive Workbench Preview', conv('互動式工作台實機預覽'))}
              </div>
              <div
                role="group"
                aria-label="Preview module tabs"
                className="inline-flex rounded-lg bg-slate-200/80 p-1"
              >
                {(
                  [
                    { id: 'COMPARATOR' as const, en: '3-Plan Matrix', zh: '紅藍黃三線比對' },
                    { id: 'CRM_SORT' as const, en: 'Sorted CRM', zh: 'CRM 排序檢索' },
                    { id: 'RADAR' as const, en: '6-Axis Radar', zh: '六軸缺口雷達' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPreviewTab(tab.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      previewTab === tab.id
                        ? 'bg-white text-slate-950 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t(tab.en, conv(tab.zh))}
                  </button>
                ))}
              </div>
            </div>

            <div className="my-5 rounded-xl border border-slate-200 bg-white p-5">
              {previewTab === 'COMPARATOR' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{t('Side-by-Side Participating Savings Audit (USD · 5-Pay)', conv('多元貨幣儲蓄分紅並排比較（美元 · 5 年繳）'))}</span>
                    <span className="font-mono text-slate-700 tabular-nums">GL28 Cap ≤ 6.5%</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-sm">
                    {[
                      {
                        lineColor: 'bg-rose-500',
                        planEn: 'AIA · Global Power Multi-Currency Plan 3',
                        planZh: '友邦 · 盈御多元貨幣計劃 3',
                        gn16: '100%',
                        irr: '6.50%',
                        fx: '9 Currencies',
                      },
                      {
                        lineColor: 'bg-blue-600',
                        planEn: 'Manulife · ManuGlobal Genesis',
                        planZh: '宏利 · 環球傳承保障計劃',
                        gn16: '99%',
                        irr: '6.45%',
                        fx: '7 Currencies',
                      },
                      {
                        lineColor: 'bg-amber-400',
                        planEn: 'Sun Life · SunJoy Global Savings II',
                        planZh: '永明 · 萬年青星河尊享 II',
                        gn16: '98%',
                        irr: '6.42%',
                        fx: '8 Currencies',
                      },
                    ].map((row) => (
                      <div key={row.planEn} className="flex items-center justify-between gap-4 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`h-3.5 w-1 rounded-full ${row.lineColor} shrink-0`} aria-hidden="true" />
                          <span className="font-semibold text-slate-900 truncate">
                            {t(row.planEn, conv(row.planZh))}
                          </span>
                        </div>
                        <div className="flex items-center gap-5 font-mono text-xs tabular-nums shrink-0">
                          <span className="text-slate-500">GN16 {row.gn16}</span>
                          <span className="font-bold text-[#1D4ED8]">IRR {row.irr}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewTab === 'CRM_SORT' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      {t('Pipeline Sorting & Policy ID Filter', conv('客戶管線即時排序與保單編號搜尋'))}
                    </span>
                    <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setCrmSortPreview('STAGE')}
                        className={`rounded px-2.5 py-1 font-medium whitespace-nowrap ${
                          crmSortPreview === 'STAGE' ? 'bg-white text-slate-900 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        {t('Sort: By Stage', conv('按銷售階段'))}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCrmSortPreview('LAST_CONTACT')}
                        className={`rounded px-2.5 py-1 font-medium whitespace-nowrap ${
                          crmSortPreview === 'LAST_CONTACT' ? 'bg-white text-slate-900 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        {t('Sort: Last Contact', conv('按最後聯絡日'))}
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {crmRows.map((c) => (
                      <div key={c.pol} className="flex items-center justify-between py-3">
                        <div>
                          <div className="font-semibold text-slate-900">{t(c.nameEn, conv(c.nameZh))}</div>
                          <div className="font-mono text-slate-500">{c.pol}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-[#1D4ED8]">{t(c.stageEn, conv(c.stageZh))}</div>
                          <div className="font-mono text-slate-500 tabular-nums">{c.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewTab === 'RADAR' && (
                <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
                  <svg viewBox="0 0 220 190" className="mx-auto h-40 w-48" aria-label="6-axis fulfillment radar preview">
                    <polygon
                      points="110,18 184,56 184,134 110,172 36,134 36,56"
                      fill="none"
                      stroke="#CBD5E1"
                      strokeWidth="1"
                    />
                    <polygon
                      points="110,48 158,72 158,118 110,142 62,118 62,72"
                      fill="none"
                      stroke="#E2E8F0"
                      strokeDasharray="3 3"
                    />
                    <polygon
                      points="110,24 178,60 174,129 110,166 44,128 42,60"
                      fill="rgba(29,78,216,0.14)"
                      stroke="#1D4ED8"
                      strokeWidth="2"
                    />
                  </svg>
                  <div className="space-y-2 text-xs">
                    <div className="text-sm font-bold text-slate-900">
                      {t('96% 6-Dimension Gap Fulfillment', conv('六維度保障缺口覆蓋率達 96%'))}
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {t(
                        'Automatically bridges corporate group medical deductibles, HK$4.5M mortgage life liability, and targeted cancer drug cash pools.',
                        conv('自動銜接公司團體醫保自付額、HK$450 萬樓宇按揭人壽責任與非手術癌症標靶藥現金池。')
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>{t('All modules share one synchronized Active Deal Cart', conv('全流程 01–06 共享單一同步建議書購物車'))}</span>
              <button
                type="button"
                onClick={() => onEnterWorkbench('stage2')}
                className="font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap"
              >
                {t('Explore Full Market Comparator →', conv('進入全市場比較引擎 →'))}
              </button>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Quantitative Strip */}
        <div className="mx-auto grid max-w-[1360px] grid-cols-2 border-t border-slate-200 px-6 lg:grid-cols-4 lg:px-10">
          {[
            { val: `${insurersCount}`, labelEn: 'HKIA Authorized Insurers', labelZh: '間獲授權香港保險公司' },
            { val: `${plansCount}+`, labelEn: 'Verified Policy Contracts', labelZh: '款精算產品與 GN16 直連' },
            { val: '6.0% / 6.5%', labelEn: 'GL28 Illustration Cap Guard', labelZh: '保監 GL28 演示上限把關' },
            { val: '32 Tools', labelEn: 'Tax, Trust, Keyman & Pre-UW', labelZh: '項稅務、信託與預核保計算機' },
          ].map((item, idx) => (
            <div
              key={item.val}
              className={`py-7 ${idx < 3 ? 'lg:border-r lg:border-slate-200' : ''} ${idx > 0 ? 'lg:pl-8' : ''} pr-4`}
            >
              <div className="font-mono text-3xl font-bold tracking-tight text-slate-950 tabular-nums">
                {item.val}
              </div>
              <div className="mt-1 text-xs text-slate-600">{t(item.labelEn, conv(item.labelZh))}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Cantonese Screen-Capture Walkthrough & 6-Step Tutorials Under Hero */}
      <CantoneseTutorialShowcase
        sectionId="t1-tutorial-guide"
        themeVariant="daylight"
        activeMember={activeMember}
        onOpenMemberAuth={onOpenMemberAuth}
        onEnterWorkbench={onEnterWorkbench}
      />

      {/* Live Daylight Actuarial Calculator + Studio Photography Bento */}
      <section id="t1-sandbox" className="mx-auto max-w-[1360px] px-6 py-16 lg:px-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-7 sm:p-8 lg:col-span-7">
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="text-xs font-semibold text-[#1D4ED8]">
                  {t('01. Live Actuarial Stress-Test', conv('01. 即時保單分紅實現率壓力測試'))}
                </div>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                  {t('Preview 20- & 30-Year Client Projections', conv('即場試算第 20 及 30 年保證與預期現金價值'))}
                </h2>
              </div>
              <div className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                IRR {proj.effectiveIrrPct}% · BE Yr {proj.breakevenYear}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {LANDING_SANDBOX_MANDATES.map((m) => (
                <button
                  key={m.leadId}
                  type="button"
                  onClick={() => setMandate(m)}
                  className={`rounded-xl border p-3.5 text-left transition-colors ${
                    mandate.leadId === m.leadId
                      ? 'border-[#1D4ED8] bg-blue-50/50 text-slate-950'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold">{t(m.clientEn, conv(m.clientZh.split('（')[0]))}</div>
                  <div className="mt-1 text-[11px] text-slate-500 line-clamp-1">{t(m.profileEn, conv(m.profileZh))}</div>
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
                {(['HKD', 'USD', 'RMB'] as CurrencyCode[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`rounded-md px-3 py-1 font-mono text-xs font-semibold ${
                      currency === c ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
                {([100, 90, 85] as const).map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setStressPct(pct)}
                    className={`rounded-md px-3 py-1 font-mono text-xs font-semibold ${
                      stressPct === pct ? 'bg-white text-[#1D4ED8] shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    GN16 {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4 rounded-xl bg-slate-50 p-5 border border-slate-200/80">
              <div>
                <div className="text-xs text-slate-500">{t('Annual Premium', conv('年繳保費'))}</div>
                <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {proj.fxSymbol} {proj.annualContribution.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">{t('Yr-20 Guaranteed', conv('第 20 年保證價值'))}</div>
                <div className="mt-1 font-mono text-lg font-bold text-slate-800 tabular-nums">
                  {proj.fxSymbol} {proj.year20Guaranteed.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">{t('Yr-20 Total Projected', conv('第 20 年預期總值'))}</div>
                <div className="mt-1 font-mono text-lg font-bold text-[#1D4ED8] tabular-nums">
                  {proj.fxSymbol} {proj.year20Projected.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <span className="text-xs text-slate-500">{t(mandate.hospitalTierEn, conv(mandate.hospitalTierZh))}</span>
              <button
                type="button"
                onClick={() => onEnterWorkbench('stage1', undefined, mandate.leadId)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap"
              >
                <span>{t('Open Mandate in Workbench', conv('載入此客戶進入工作台'))}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Sunlit Travertine Studio Feature Card */}
          <div id="t1-bento" className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-5">
            <ResilientEditorialImage
              src={daylightStudioImg}
              alt="Sunlit private advisory consultation table with fountain pen and notebook"
              fallbackTitle="HK InsureHub Pro Advisory Studio"
              className="h-56 w-full object-cover"
            />
            <div className="flex flex-1 flex-col justify-between p-7">
              <div>
                <div className="text-xs font-semibold text-slate-500">
                  {t('02. Client Delivery & QR Microsite', conv('02. 高管 PDF 簡報與 QR 互動微網'))}
                </div>
                <h3 className="mt-1.5 text-xl font-bold text-slate-950">
                  {t(
                    '5-Slide Executive Summary PDF & Scannable Mobile Proposal',
                    conv('一鍵匯出 5 頁高管摘要 PDF，手機掃碼直覽互動建議書')
                  )}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {t(
                    'Generate clean client-ready executive PDFs in Stage 04A or let clients scan an ISO-18004 QR code into a high-contrast vertical mobile proposal with sticky sign-off actions.',
                    conv('於 04A 一鍵下載 5 頁高管摘要 PDF，或展示 QR Code 讓客戶以手機開啟高對比全屏建議書並回傳簽署意向。')
                  )}
                </p>
              </div>
              <div className="mt-6 flex items-center gap-5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onEnterWorkbench('stage4', 'microsite')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap"
                >
                  <span>{t('Open QR Microsite Studio', conv('開啟 04C 互動微網'))}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onEnterWorkbench('stage5', 'compliance')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:underline whitespace-nowrap"
                >
                  <span>{t('15h CPD & Audit Pack', conv('保監 CPD 與查冊包'))}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// ============================================================================
// TEMPLATE 02: ARCHIVAL WEALTH MONOGRAPH (Monocle · Financial Times · Paper)
// Warm cotton paper #F6F2EA, Espresso Ink #1C1917, Terracotta #9A3412, Leica Photo
// ============================================================================
export const Template02ArchivalBroadsheet: React.FC<DistinctTemplateSharedProps> = ({
  plansCount,
  insurersCount,
  leadsCount,
  inForceCount,
  onEnterWorkbench,
}) => {
  const { lang, setLang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const [mandate, setMandate] = useState<SandboxMandateOption>(LANDING_SANDBOX_MANDATES[0]);
  const proj = computeLandingActuarialSandbox(mandate, 'USD', 100);

  return (
    <div
      data-testid="template-t2-editorial"
      className="min-h-screen bg-[#F6F2EA] text-[#1C1917] pb-24 selection:bg-[#9A3412] selection:text-[#F6F2EA]"
    >
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="mx-auto flex max-w-[1320px] items-center justify-between gap-8 border-b border-stone-300 px-6 py-5 lg:px-10">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onEnterWorkbench('stage1');
          }}
          className="font-editorial text-2xl font-semibold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0"
        >
          HK InsureHub <span className="italic text-[#9A3412]">Pro</span>
        </a>

        <nav
          aria-label="Editorial broadsheet navigation"
          className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600"
        >
          <a href="#t2-essay" className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
            {t('Monograph', conv('封面專論'))}
          </a>
          <a href="#t2-ledger" className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
            {t('Balance Sheet', conv('精算資產表'))}
          </a>
          <a href="#t2-index" className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
            {t('Curated Index', conv('六步目錄'))}
          </a>
          <button
            type="button"
            onClick={() => onEnterWorkbench('stage1', 'crm')}
            className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t('Client Registry', conv('客戶名冊 CRM'))}
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            data-testid="landing-top-enter-btn"
            onClick={() => onEnterWorkbench('stage1')}
            className="inline-flex items-center gap-2 bg-[#9A3412] px-5 py-2.5 text-xs font-semibold text-[#FBF9F5] hover:bg-[#7C2D12] transition-colors whitespace-nowrap shrink-0"
          >
            <span>{t('Enter Advisory Desk', conv('進入顧問案頭'))}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Broadsheet Dateline Ribbon */}
      <div className="mx-auto max-w-[1320px] border-b border-stone-300 px-6 py-2.5 lg:px-10 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-600">
        <div>
          <span>{t(`EDITION XLVI · ${insurersCount} AUTHORIZED INSURERS · ${plansCount}+ CONTRACTS`, conv(`第 46 卷 · 匯聚全港 ${insurersCount} 間獲授權保司 · ${plansCount}+ 款保單條款`))}</span>
        </div>
        <div className="flex items-center gap-3">
          {LANGUAGE_CHOICES.map((opt) => (
            <button
              key={opt.code}
              type="button"
              data-testid={`landing-lang-${opt.code}`}
              onClick={() => setLang(opt.code)}
              className={`text-xs transition-colors whitespace-nowrap ${
                lang === opt.code ? 'font-bold text-[#9A3412] underline underline-offset-4' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Asymmetric 7:5 Broadsheet Lead Story + Leica Central Architectural Plate */}
      <section id="t2-essay" className="mx-auto max-w-[1320px] border-b border-stone-300 px-6 py-14 lg:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="flex flex-col justify-between lg:col-span-7 lg:border-r lg:border-stone-300 lg:pr-12">
            <div>
              <p className="text-xs font-semibold tracking-widest text-[#9A3412]">
                {t('HONG KONG PRIVATE WEALTH PRACTICE', conv('香港私人財富與合規保險實務專刊'))}
              </p>
              <h1 className="mt-3 font-editorial text-[clamp(2.5rem,4.5vw,4.25rem)] leading-[1.06] font-medium text-[#1C1917] text-balance">
                {lang === 'en' ? (
                  <>
                    The discipline of actuarial clarity, written for{' '}
                    <span className="italic text-[#9A3412]">Central’s</span> fiduciaries.
                  </>
                ) : (
                  conv('為中環與大灣區財富顧問而設的精算典籍與成單案頭。')
                )}
              </h1>

              <p className="mt-7 max-w-[64ch] text-base leading-[1.82] text-stone-700 first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-editorial first-letter:text-5xl first-letter:font-semibold first-letter:leading-none first-letter:text-[#9A3412]">
                {t(
                  `Across ${insurersCount} authorized insurers and ${plansCount}+ participating, medical, and critical illness schedules, genuine advisory distinction rests on verifiable evidence: GN16 dividend fulfillment histories, GL28 illustration caps, sorted client pipelines, and cashless private hospital pre-approvals.`,
                  conv(`面對全港 ${insurersCount} 間獲授權保險公司逾 ${plansCount} 款分紅、高端醫療及危疾契約，真正贏得高淨值家族信任的關鍵在於可核實的精算證據：GN16 歷年分紅實現率、GL28 演示上限、智能排序客戶管線與養和／港怡免找數預批核實。`)
                )}
              </p>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4 pt-8 border-t border-stone-300">
              <button
                type="button"
                data-testid="landing-enter-workbench-btn"
                onClick={() => onEnterWorkbench('stage1')}
                className="inline-flex items-center gap-2.5 bg-[#1C1917] px-6 py-3.5 text-sm font-semibold text-[#F6F2EA] hover:bg-[#9A3412] transition-colors whitespace-nowrap"
              >
                <span>{t('Open Full 6-Stage Desk', conv('開啟完整六步顧問案頭'))}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                data-testid="landing-open-crm-btn"
                onClick={() => onEnterWorkbench('stage1', 'crm')}
                className="inline-flex items-center gap-2 border border-stone-400 bg-transparent px-5 py-3.5 text-sm font-semibold text-[#1C1917] hover:border-[#9A3412] hover:text-[#9A3412] transition-colors whitespace-nowrap"
              >
                <span>{t(`Inspect Client Registry (${leadsCount})`, conv(`查閱客戶管線名冊 (${leadsCount})`))}</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-between lg:col-span-5">
            <div>
              <div className="border border-stone-300 bg-[#EFE9DC] p-3">
                <ResilientEditorialImage
                  src={centralArchivalImg}
                  alt="Central Hong Kong modernist financial towers in morning light"
                  fallbackTitle="Central Hong Kong Architectural Monograph"
                  className="aspect-4/3 w-full object-cover"
                />
              </div>
              <p className="mt-2.5 font-editorial text-xs italic text-stone-600">
                {t(
                  'Fig. 01 — Central Financial District, Morning Study. Serving licensed intermediaries under HKIA GL16, GL28 & GL30.',
                  conv('圖一 — 中環金融核心區晨光紀實。嚴格遵循香港保監局 GL16、GL28 及 GL30 指引。')
                )}
              </p>
            </div>

            <dl className="mt-8 divide-y divide-stone-300 border-y border-stone-300 text-xs">
              <div className="flex justify-between py-2.5">
                <dt className="text-stone-600">{t('Whole-Market Coverage', conv('全市場產品覆蓋'))}</dt>
                <dd className="font-mono font-semibold text-[#1C1917] tabular-nums">{insurersCount} Insurers · {plansCount}+ Plans</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-stone-600">{t('Document Vision OCR', conv('證件及保單 OCR 引擎'))}</dt>
                <dd className="font-mono font-semibold text-[#9A3412]">Google Cloud Vision v1</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-stone-600">{t('In-Force Servicing', conv('生效保單續保追蹤'))}</dt>
                <dd className="font-mono font-semibold text-[#1C1917] tabular-nums">{inForceCount} Policies · 15h CPD</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Shareholder-Letter Style Actuarial Ledger & 6-Chapter Index */}
      <section id="t2-ledger" className="mx-auto max-w-[1320px] px-6 py-14 lg:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs font-semibold tracking-widest text-[#9A3412]">
              {t('TABLE I · REPRESENTATIVE CLIENT LEDGER (USD)', conv('表一 · 代表性家族委任帳目試算（美元）'))}
            </div>
            <h2 className="font-editorial text-3xl font-medium text-[#1C1917]">
              {t('Select a client dossier to inspect.', conv('點選客戶卷宗預覽精算現金流。'))}
            </h2>
            <div className="divide-y divide-stone-300 border-y border-stone-300">
              {LANDING_SANDBOX_MANDATES.map((m) => (
                <button
                  key={m.leadId}
                  type="button"
                  onClick={() => setMandate(m)}
                  className={`w-full py-3.5 text-left transition-colors ${
                    mandate.leadId === m.leadId ? 'text-[#9A3412] font-semibold' : 'text-stone-700 hover:text-stone-950'
                  }`}
                >
                  <div className="flex justify-between text-sm">
                    <span>{t(m.clientEn, conv(m.clientZh))}</span>
                    <span className="font-mono text-xs tabular-nums">IRR {proj.effectiveIrrPct}%</span>
                  </div>
                  <div className="mt-0.5 text-xs text-stone-500">{t(m.schemeEn, conv(m.schemeZh))}</div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 bg-[#EFE9DC] p-5 border border-stone-300">
              <div>
                <div className="text-xs text-stone-600">{t('Year 20 Projected', conv('第 20 年預期總價值'))}</div>
                <div className="mt-1 font-editorial text-2xl font-semibold text-[#1C1917] tabular-nums">
                  {proj.fxSymbol} {proj.year20Projected.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-600">{t('Year 30 Legacy', conv('第 30 年傳承總價值'))}</div>
                <div className="mt-1 font-editorial text-2xl font-semibold text-[#9A3412] tabular-nums">
                  {proj.fxSymbol} {proj.year30Projected.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div id="t2-index" className="lg:col-span-7">
            <div className="text-xs font-semibold tracking-widest text-[#9A3412]">
              {t('CURATED CONTENTS · SIX-STAGE WORKFLOW', conv('卷宗目錄 · 六步顧問實戰流程'))}
            </div>
            <div className="mt-4 divide-y divide-stone-300 border-y border-stone-300">
              {[
                { num: 'I', stage: 'stage1' as WorkspaceSection, sub: 'crm' as const, en: 'Sorted Client CRM, Vision OCR & 6-Axis Gap Audit', zh: '智能排序客戶管線、Vision 證件識別與六軸缺口診斷' },
                { num: 'II', stage: 'stage2' as WorkspaceSection, sub: 'actuarial_lab' as const, en: 'Red / Blue / Yellow 3-Plan Matrix, 567 & HIBOR Lab', zh: '紅藍黃三計劃比較、567 退休提領與 HIBOR 融資室' },
                { num: 'III', stage: 'stage3' as WorkspaceSection, sub: undefined, en: 'Dual-Currency Rider Cart & Private Hospital Cashless LOG', zh: '雙幣附約配置與養和／港怡私院免找數預批通行' },
                { num: 'IV', stage: 'stage4' as WorkspaceSection, sub: 'microsite' as const, en: '5-Slide Executive PDF Summary & QR Mobile Microsite', zh: '5 頁高管摘要 PDF 匯出與 QR 掃碼全屏互動微網' },
                { num: 'V', stage: 'stage5' as WorkspaceSection, sub: 'compliance' as const, en: 'Statutory 3-Doc Dual Sign, Renewals & 15h CPD Audit', zh: '法定三文件雙簽、續保理賠管家與保監 15h CPD 查冊包' },
                { num: 'VI', stage: 'stage6' as WorkspaceSection, sub: undefined, en: '32 Specialized HNW Tax, Trust, Keyman & Pre-UW Tools', zh: '32 項高淨值扣稅、家族信託、企業要員與預核保工具' },
              ].map((ch) => (
                <button
                  key={ch.num}
                  type="button"
                  onClick={() => onEnterWorkbench(ch.stage, ch.sub)}
                  className="group flex w-full items-baseline justify-between gap-4 py-4 text-left hover:bg-[#EFE9DC]/70 px-2 transition-colors"
                >
                  <div className="flex items-baseline gap-4">
                    <span className="font-editorial text-lg italic text-[#9A3412] w-7">{ch.num}.</span>
                    <span className="text-base font-medium text-[#1C1917] group-hover:text-[#9A3412] transition-colors">
                      {t(ch.en, conv(ch.zh))}
                    </span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-stone-500 shrink-0" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// ============================================================================
// TEMPLATE 03: ZURICH ARCHITECTURAL GRID (Swiss International · Bauhaus)
// Stark #FFFFFF, Exposed 1.5px Jet-Black Grid, Swiss Vermilion Red #DC2626
// ============================================================================
export const Template03SwissInternational: React.FC<DistinctTemplateSharedProps> = ({
  plansCount,
  insurersCount,
  leadsCount,
  inForceCount,
  onEnterWorkbench,
}) => {
  const { lang, setLang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [stressPct, setStressPct] = useState<100 | 90 | 85>(100);
  const proj = computeLandingActuarialSandbox(LANDING_SANDBOX_MANDATES[0], currency, stressPct);

  return (
    <div
      data-testid="template-t3-swiss"
      className="min-h-screen bg-white text-zinc-950 pb-24 selection:bg-[#DC2626] selection:text-white"
    >
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="mx-auto flex max-w-[1400px] items-center justify-between gap-8 border-b-2 border-zinc-950 px-6 py-4 lg:px-10">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onEnterWorkbench('stage1');
          }}
          className="text-lg font-black tracking-tighter text-zinc-950 whitespace-nowrap shrink-0"
        >
          HK INSUREHUB PRO
        </a>

        <nav
          aria-label="Swiss architectural navigation"
          className="hidden md:flex items-center gap-8 text-xs font-bold text-zinc-700"
        >
          <a href="#t3-grid" className="hover:text-[#DC2626] transition-colors whitespace-nowrap shrink-0">
            {t('01 SPECIFICATION', conv('01 精算規格'))}
          </a>
          <a href="#t3-matrix" className="hover:text-[#DC2626] transition-colors whitespace-nowrap shrink-0">
            {t('02 STRESS MATRIX', conv('02 壓力矩陣'))}
          </a>
          <a href="#t3-modules" className="hover:text-[#DC2626] transition-colors whitespace-nowrap shrink-0">
            {t('03 SIX MODULES', conv('03 六大模組'))}
          </a>
          <button
            type="button"
            onClick={() => onEnterWorkbench('stage1', 'crm')}
            className="hover:text-[#DC2626] transition-colors whitespace-nowrap shrink-0"
          >
            {t('04 CLIENT CRM', conv('04 客戶管線'))}
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            data-testid="landing-top-enter-btn"
            onClick={() => onEnterWorkbench('stage1')}
            className="inline-flex items-center gap-2 bg-[#DC2626] px-5 py-2.5 text-xs font-bold text-white hover:bg-zinc-950 transition-colors whitespace-nowrap shrink-0"
          >
            <span>{t('ENTER WORKBENCH', conv('進入工作台'))}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Exposed Bauhaus 12-Column Grid Hero */}
      <section id="t3-grid" className="mx-auto max-w-[1400px] border-b-2 border-zinc-950">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="border-b-2 border-zinc-950 p-6 sm:p-10 lg:col-span-8 lg:border-r-2 lg:border-b-0 lg:p-14">
            <div className="flex items-center justify-between gap-4 pb-8">
              <span className="font-mono text-xs font-bold text-[#DC2626]">
                HKIA GL16 · GL28 · GL30 ARCHITECTURAL INSTRUMENT
              </span>
              <div className="inline-flex border border-zinc-950">
                {LANGUAGE_CHOICES.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    data-testid={`landing-lang-${opt.code}`}
                    onClick={() => setLang(opt.code)}
                    className={`px-2.5 py-1 font-mono text-xs font-bold ${
                      lang === opt.code ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-950 hover:bg-zinc-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <h1 className="text-[clamp(2.5rem,4.9vw,4.75rem)] leading-[0.98] font-black tracking-tighter text-zinc-950 text-balance">
              {t(
                'PRECISION ACTUARIAL INFRASTRUCTURE FOR HONG KONG ADVISORS.',
                conv('香港全市場精算比較與合規成單結構系統。')
              )}
            </h1>

            <p className="mt-6 max-w-[58ch] text-base font-medium leading-relaxed text-zinc-700">
              {t(
                `Zero decorative clutter. Audit ${plansCount}+ insurance plans across ${insurersCount} carriers, sort client leads by pipeline stage or last contact timestamp, and execute compliant dual signatures.`,
                conv(`摒棄一切冗餘裝飾。精準審核全港 ${insurersCount} 間保司共 ${plansCount}+ 款計劃，按銷售階段或最後聯絡日排序 CRM 管線，一鍵匯出 5 頁高管摘要 PDF 及 QR 互動微網。`)
              )}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                data-testid="landing-enter-workbench-btn"
                onClick={() => onEnterWorkbench('stage1')}
                className="inline-flex items-center gap-3 bg-[#DC2626] px-7 py-4 text-sm font-bold text-white hover:bg-zinc-950 transition-colors whitespace-nowrap"
              >
                <span>{t('LAUNCH 6-STAGE SYSTEM', conv('啟動六步工作系統'))}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                data-testid="landing-open-crm-btn"
                onClick={() => onEnterWorkbench('stage1', 'crm')}
                className="inline-flex items-center gap-2 border-2 border-zinc-950 bg-white px-6 py-3.5 text-sm font-bold text-zinc-950 hover:bg-zinc-950 hover:text-white transition-colors whitespace-nowrap"
              >
                <span>{t('SORTED CRM PIPELINE', conv('CRM 管線排序檢索'))}</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Right 4 Columns: 4 Stacked Exposed Brutalist Metric Cells */}
          <div className="grid grid-cols-2 lg:col-span-4 lg:grid-cols-1 divide-y-2 divide-zinc-950">
            {[
              { num: `${insurersCount}`, labelEn: 'AUTHORIZED HK INSURERS', labelZh: '獲授權香港保險公司' },
              { num: `${plansCount}+`, labelEn: 'INDEXED POLICY CONTRACTS', labelZh: '標準化精算保單資料庫' },
              { num: '6.0 / 6.5%', labelEn: 'GL28 ILLUSTRATION CAP', labelZh: '保監局分紅演示上限' },
              { num: `${leadsCount} / ${inForceCount}`, labelEn: 'ACTIVE LEADS & IN-FORCE', labelZh: '建檔客戶與生效保單' },
            ].map((cell) => (
              <div key={cell.labelEn} className="flex items-baseline justify-between p-6 sm:p-8">
                <span className="font-mono text-xs font-bold text-zinc-600">
                  {t(cell.labelEn, conv(cell.labelZh))}
                </span>
                <span className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-zinc-950 tabular-nums">
                  {cell.num}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Swiss Stress Matrix + 6 Brutalist Stage Rows */}
      <section id="t3-matrix" className="mx-auto max-w-[1400px] border-b-2 border-zinc-950 px-6 py-14 lg:px-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-center">
          <div className="lg:col-span-5 space-y-5">
            <div className="font-mono text-xs font-bold text-[#DC2626]">02 · GN16 FULFILLMENT STRESS MATRIX</div>
            <h2 className="text-3xl font-black tracking-tight text-zinc-950">
              {t('Instant Currency & Dividend Calibration.', conv('多元貨幣與紅利實現率即時校準。'))}
            </h2>
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex border-2 border-zinc-950">
                {(['USD', 'HKD', 'RMB'] as CurrencyCode[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`px-4 py-2 font-mono text-xs font-bold ${
                      currency === c ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-950'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="inline-flex border-2 border-zinc-950">
                {([100, 90, 85] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setStressPct(p)}
                    className={`px-4 py-2 font-mono text-xs font-bold ${
                      stressPct === p ? 'bg-[#DC2626] text-white' : 'bg-white text-zinc-950'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 border-2 border-zinc-950 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-zinc-950">
            <div className="p-6">
              <div className="font-mono text-xs font-bold text-zinc-500">{t('YR 20 GUARANTEED', conv('第 20 年保證現金價值'))}</div>
              <div className="mt-2 font-mono text-2xl font-black text-zinc-950 tabular-nums">
                {proj.fxSymbol} {proj.year20Guaranteed.toLocaleString()}
              </div>
            </div>
            <div className="p-6 bg-zinc-50">
              <div className="font-mono text-xs font-bold text-zinc-500">{t('YR 20 PROJECTED', conv('第 20 年預期總價值'))}</div>
              <div className="mt-2 font-mono text-2xl font-black text-[#DC2626] tabular-nums">
                {proj.fxSymbol} {proj.year20Projected.toLocaleString()}
              </div>
            </div>
            <div className="p-6">
              <div className="font-mono text-xs font-bold text-zinc-500">{t('EFFECTIVE IRR', conv('等效內部回報率'))}</div>
              <div className="mt-2 font-mono text-2xl font-black text-zinc-950 tabular-nums">
                {proj.effectiveIrrPct}%
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="t3-modules" className="mx-auto max-w-[1400px]">
        {[
          { code: '01', stage: 'stage1' as WorkspaceSection, sub: 'crm' as const, en: 'DISCOVERY, VISION OCR & SORTED CRM PIPELINE', zh: '六軸缺口診斷、Cloud Vision 證件識別與管線排序' },
          { code: '02', stage: 'stage2' as WorkspaceSection, sub: 'actuarial_lab' as const, en: 'RED / BLUE / YELLOW 3-PLAN COMPARATOR & 567 LAB', zh: '全港紅藍黃三計劃比較與 567／HIBOR 精算室' },
          { code: '03', stage: 'stage3' as WorkspaceSection, sub: undefined, en: 'DUAL-CURRENCY RIDER CART & PRIVATE HOSPITAL LOG', zh: '港幣／人民幣附約購物車與私院免找數預批核實' },
          { code: '04', stage: 'stage4' as WorkspaceSection, sub: 'microsite' as const, en: '5-SLIDE EXECUTIVE PDF & SCANNABLE QR MICROSITE', zh: '5 頁高管摘要 PDF 匯出與手機 QR 掃碼互動微網' },
          { code: '05', stage: 'stage5' as WorkspaceSection, sub: 'compliance' as const, en: 'STATUTORY DUAL E-SIGN, RENEWALS & 15H CPD AUDIT', zh: '法定三文件電子雙簽、續保看板與保監 15h CPD 查冊' },
          { code: '06', stage: 'stage6' as WorkspaceSection, sub: undefined, en: '32 SPECIALIZED HNW TAX, TRUST & PRE-UW ENGINES', zh: '32 項扣稅、家族信託、企業要員與次標準體預核保工具' },
        ].map((item) => (
          <button
            key={item.code}
            type="button"
            onClick={() => onEnterWorkbench(item.stage, item.sub)}
            className="group flex w-full items-center justify-between border-b border-zinc-950 px-6 py-5 text-left hover:bg-zinc-950 hover:text-white transition-colors lg:px-10"
          >
            <div className="flex items-center gap-6">
              <span className="font-mono text-sm font-black text-[#DC2626] group-hover:text-white">{item.code}</span>
              <span className="text-base sm:text-lg font-extrabold tracking-tight">{t(item.en, conv(item.zh))}</span>
            </div>
            <ArrowUpRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </button>
        ))}
      </section>
    </div>
  );
};

// ============================================================================
// TEMPLATE 04: HARBOUR FAMILY OFFICE CINEMA (Aman · Sotheby's · Travertine)
// Full-bleed Victoria Harbour twilight boardroom photo + Warm Travertine #F5EFE6
// ============================================================================
export const Template04FamilyOfficeCinema: React.FC<DistinctTemplateSharedProps> = ({
  plansCount,
  insurersCount,
  leadsCount,
  inForceCount,
  activeMember = null,
  onOpenMemberAuth,
  googleUser,
  cloudBackupBusy = false,
  onGoogleAuthAndBackup,
  onGoogleAuthError,
  onEnterWorkbench,
}) => {
  const { lang, setLang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const [selectedMandate, setSelectedMandate] = useState<SandboxMandateOption>(
    LANDING_SANDBOX_MANDATES[0]
  );
  const proj = computeLandingActuarialSandbox(selectedMandate, 'USD', 100);

  return (
    <div
      data-testid="template-t4-cinema"
      className="min-h-screen bg-[#F5EFE6] text-[#1C1815] selection:bg-[#9A6F32] selection:text-white"
    >
      {/* Full-Bleed Victoria Harbour Twilight Boardroom Cinema Hero */}
      <div className="relative bg-[#12100E] text-[#FAF6F0]">
        <ResilientEditorialImage
          src={familyOfficeLoungeImg}
          alt="High-floor private wealth family office overlooking Victoria Harbour at twilight"
          fallbackTitle="Victoria Harbour Family Office Suite"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Measured Contrast Scrim (>= 7:1 text contrast) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0E0C0A]/92 via-[#0E0C0A]/72 to-[#0E0C0A]/30"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0E0C0A] via-transparent to-[#0E0C0A]/65"
        />

        {/* Strict 3-Zone Top Bar Contract */}
        <header className="relative z-10 mx-auto flex max-w-[1380px] items-center justify-between gap-8 border-b border-white/15 px-6 py-5 lg:px-10">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              onEnterWorkbench('stage1');
            }}
            className="font-editorial text-2xl font-medium tracking-wide text-[#FAF6F0] whitespace-nowrap shrink-0"
          >
            HK InsureHub <span className="italic text-[#D8B377]">Pro</span>
          </a>

          <nav
            aria-label="Main navigation"
            className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-200"
          >
            <a href="#t4-tutorial-guide" className="hover:text-[#D8B377] transition-colors whitespace-nowrap shrink-0">
              {t('2-Min Demo', conv('2 分鐘教學片'))}
            </a>
            <a href="#t4-mandates" className="hover:text-[#D8B377] transition-colors whitespace-nowrap shrink-0">
              {t('Sample Cases', conv('見客例子'))}
            </a>
            <a href="#t4-suites" className="hover:text-[#D8B377] transition-colors whitespace-nowrap shrink-0">
              {t('Key Features', conv('常用工具'))}
            </a>
            <button
              type="button"
              onClick={() => onEnterWorkbench('stage4', 'microsite')}
              className="hover:text-[#D8B377] transition-colors whitespace-nowrap shrink-0"
            >
              {t('Mobile Proposal', conv('手機版建議書'))}
            </button>
            <button
              type="button"
              data-testid="landing-member-auth-btn"
              onClick={() => onOpenMemberAuth?.(activeMember ? 'PROFILE' : 'SIGN_IN')}
              className="hover:text-[#D8B377] transition-colors whitespace-nowrap shrink-0"
            >
              {activeMember
                ? t(
                    `Account · ${activeMember.iaLicenseNo}`,
                    conv(`帳號 · ${activeMember.fullNameZh || activeMember.fullNameEn}`)
                  )
                : t('Sign In', conv('顧問登入'))}
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              data-testid="landing-top-enter-btn"
              onClick={() => onEnterWorkbench('stage1')}
              className="inline-flex items-center gap-2 rounded-full bg-[#C59B5F] px-5 py-2.5 text-xs font-semibold text-[#12100E] hover:bg-[#d6b078] transition-colors whitespace-nowrap shrink-0"
            >
              <span>{t('Open Workspace', conv('入去試用'))}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 mx-auto max-w-[1380px] px-6 py-24 sm:py-32 lg:px-10">
          <div className="max-w-3xl space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs tracking-widest text-[#D8B377]">
                {t(
                  'BUILT FOR HONG KONG INSURANCE ADVISORS & BROKERS',
                  conv('專為香港保險顧問及經紀而設嘅日常工作台')
                )}
              </span>
              <div className="inline-flex rounded-full border border-white/20 bg-black/45 p-0.5">
                {LANGUAGE_CHOICES.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    data-testid={`landing-lang-${opt.code}`}
                    onClick={() => setLang(opt.code)}
                    className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                      lang === opt.code ? 'bg-[#C59B5F] text-[#12100E] font-semibold' : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <h1 className="font-editorial text-[clamp(2.25rem,3.75vw,3.65rem)] leading-[1.18] font-medium text-[#FAF6F0]">
              {lang === 'en' ? (
                <>
                  Compare Hong Kong plans and send{' '}
                  <span className="italic text-[#D8B377]">clear proposals</span> in minutes.
                </>
              ) : (
                <>
                  {conv('唔使再開齊幾個網慢慢打價，')}
                  <br className="hidden sm:inline" />
                  {conv('幾分鐘出齊比較表同靚仔建議書。')}
                </>
              )}
            </h1>

            <p className="max-w-[58ch] text-base leading-relaxed text-stone-200">
              {t(
                `Compare ${plansCount}+ savings, critical illness, and VHIS plans across ${insurersCount} Hong Kong insurers—complete with family tax caps, insurer seasonal promos, private hospital fees, and one-tap WhatsApp sharing.`,
                conv(
                  `收錄全港 ${insurersCount} 間保險公司、超過 ${plansCount} 款儲蓄、危疾同自願醫保計劃。一頁睇晒保證回報、各公司今季回贈優惠、全家扣稅額同私院手術費，見完客手機一撳即刻 Share 去 WhatsApp。`
                )
              )}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                type="button"
                data-testid="landing-enter-workbench-btn"
                onClick={() => onEnterWorkbench('stage1')}
                className="inline-flex items-center gap-2.5 rounded-full bg-[#C59B5F] px-6 py-3 text-sm font-semibold text-[#12100E] hover:bg-[#d8b377] transition-colors whitespace-nowrap"
              >
                <span>{t('Start Now', conv('即刻開始用'))}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <a
                href="#t4-tutorial-guide"
                data-testid="landing-watch-tutorial-btn"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById('t4-tutorial-guide')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="inline-flex items-center gap-2 rounded-full border border-[#D8B377]/75 bg-[#12100E]/75 px-6 py-3.5 text-sm font-semibold text-[#FAF6F0] hover:border-[#D8B377] hover:bg-[#12100E] transition-colors whitespace-nowrap"
              >
                <Play className="h-4 w-4 text-[#D8B377]" aria-hidden="true" />
                <span>{t('Watch 2-Min Demo (02:24)', conv('睇 2 分鐘廣東話示範 (02:24)'))}</span>
              </a>
              <button
                type="button"
                data-testid="landing-open-crm-btn"
                onClick={() => onEnterWorkbench('stage1', 'crm')}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/35 px-6 py-3.5 text-sm font-medium text-white hover:border-[#D8B377] transition-colors whitespace-nowrap"
              >
                <span>{t(`Client List (${leadsCount})`, conv(`跟進緊嘅客 (${leadsCount})`))}</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                data-testid="landing-hero-member-btn"
                onClick={() => onOpenMemberAuth?.(activeMember ? 'PROFILE' : 'SIGN_IN')}
                className="inline-flex items-center gap-2 rounded-full border border-[#D8B377]/55 bg-black/45 px-5 py-3 text-xs font-semibold text-[#FAF6F0] hover:border-[#D8B377] hover:bg-black/65 transition-colors whitespace-nowrap shrink-0"
              >
                <span>
                  {activeMember
                    ? t(
                        `Signed in: ${activeMember.fullNameEn} · ${activeMember.iaLicenseNo}`,
                        conv(
                          `已登入：${activeMember.fullNameZh || activeMember.fullNameEn} · ${activeMember.iaLicenseNo}`
                        )
                      )
                    : t('Advisor Sign In', conv('顧問登入 / 開戶'))}
                </span>
              </button>
              {(activeMember || googleUser) && (
                <LoginButton
                  mode="backup"
                  connectedUser={googleUser}
                  isBusy={cloudBackupBusy}
                  variant="cinema-gold"
                  onAuthAndBackup={onGoogleAuthAndBackup}
                  onError={onGoogleAuthError}
                />
              )}
            </div>

            {(activeMember || googleUser?.email) && (
              <p data-testid="landing-member-status-line" className="text-xs text-stone-300">
                {activeMember
                  ? t(
                      `Signed in as ${activeMember.fullNameEn} (${activeMember.email}) · License ${activeMember.iaLicenseNo}`,
                      conv(
                        `已登入帳號：${activeMember.fullNameZh || activeMember.fullNameEn}（${activeMember.email}）· 牌照號碼 ${activeMember.iaLicenseNo}`
                      )
                    )
                  : t(
                      `Signed in as ${googleUser?.email} · Google Drive Cloud Backup ready`,
                      conv(`已連結 ${googleUser?.email} · 可隨時備份去 Google Drive`)
                    )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cantonese Screen-Capture Video & Step-by-Step Guide Directly Under Hero */}
      <CantoneseTutorialShowcase
        sectionId="t4-tutorial-guide"
        themeVariant="travertine"
        activeMember={activeMember}
        onOpenMemberAuth={onOpenMemberAuth}
        onEnterWorkbench={onEnterWorkbench}
      />

      {/* Sample Client Cases Section */}
      <section id="t4-mandates" className="mx-auto max-w-[1380px] px-6 py-18 lg:px-10">
        <div className="flex flex-col justify-between gap-4 border-b border-stone-300 pb-8 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs font-semibold tracking-widest text-[#8C5E24]">
              {t('01 · EVERYDAY CLIENT EXAMPLES', conv('01 · 平時最常遇到嘅客戶情況'))}
            </div>
            <h2 className="mt-2 font-editorial text-3xl sm:text-4xl font-medium text-[#1C1815]">
              {t(
                'Pick a client example below to preview projected values or open it directly.',
                conv('揀一個似你手頭上客人嘅例子，即刻睇數或者打開慢慢試。')
              )}
            </h2>
          </div>
          <div className="font-mono text-xs text-stone-600 tabular-nums">
            {t('Projected Yr-20:', conv('第 20 年預計總現金價值：'))}{' '}
            <strong className="text-[#8C5E24]">
              {proj.fxSymbol} {proj.year20Projected.toLocaleString()}
            </strong>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {LANDING_SANDBOX_MANDATES.map((m) => {
            const active = selectedMandate.leadId === m.leadId;
            return (
              <div
                key={m.leadId}
                className={`flex flex-col justify-between rounded-2xl border p-7 transition-colors ${
                  active
                    ? 'border-[#9A6F32] bg-white'
                    : 'border-stone-300/90 bg-[#FAF6F0] hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-editorial text-2xl font-semibold text-[#1C1815]">
                      {t(m.clientEn, conv(m.clientZh))}
                    </span>
                    <span className="font-mono text-xs text-[#8C5E24] tabular-nums shrink-0">
                      {t(`${m.gapCoveragePct}% Covered`, conv(`補齊 ${m.gapCoveragePct}% 缺口`))}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-stone-700">
                    {t(m.profileEn, conv(m.profileZh))}
                  </p>
                  <p className="mt-2 text-xs text-stone-500">
                    {t(m.hospitalTierEn, conv(m.hospitalTierZh))}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-stone-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedMandate(m)}
                    className="text-xs font-semibold text-stone-600 hover:text-stone-950"
                  >
                    {t('Preview Figures', conv('睇吓第 20 年回報'))}
                  </button>
                  <button
                    type="button"
                    onClick={() => onEnterWorkbench('stage1', undefined, m.leadId)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C5E24] hover:underline"
                  >
                    <span>{t('Open This Case', conv('入去睇呢個客'))}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4 Key Feature Shortcuts */}
        <div id="t4-suites" className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              num: '01',
              stage: 'stage1' as WorkspaceSection,
              sub: 'profile' as const,
              en: 'Family Policies & Existing Summary',
              zh: '全家保單扣稅總覽 ＋ 舊單一覽表',
            },
            {
              num: '02',
              stage: 'stage2' as WorkspaceSection,
              sub: 'market' as const,
              en: '3-Plan Compare, Promos & MDRT',
              zh: '跨公司比較、本季回贈優惠與佣金預估',
            },
            {
              num: '03',
              stage: 'stage4' as WorkspaceSection,
              sub: 'microsite' as const,
              en: '5-Page PDF & WhatsApp Share',
              zh: '5 頁重點 PDF ＋ 手機一鍵分享 WhatsApp',
            },
            {
              num: '04',
              stage: 'stage5' as WorkspaceSection,
              sub: 'servicing' as const,
              en: 'Hospital Fees & .ics Reminders',
              zh: '私院免找數 ＋ 匯出續保／生日日曆提醒',
            },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => onEnterWorkbench(s.stage, s.sub)}
              className="group flex flex-col justify-between rounded-xl border border-stone-300 bg-[#FAF6F0] p-6 text-left hover:border-[#9A6F32] hover:bg-white transition-colors"
            >
              <span className="font-editorial text-xl italic text-[#8C5E24]">{s.num}</span>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#1C1815]">{t(s.en, conv(s.zh))}</span>
                <ArrowUpRight className="h-4 w-4 text-stone-500 group-hover:text-[#8C5E24] shrink-0" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Production Footer */}
      <footer className="border-t border-stone-300 bg-[#EFE8DC] text-[#443C34]">
        <div className="mx-auto flex max-w-[1380px] flex-col justify-between gap-4 px-6 py-8 text-xs sm:flex-row sm:items-center lg:px-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-editorial text-base font-semibold text-[#1C1815]">
              HK InsureHub Pro
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {t(
                `${insurersCount} HK Insurers · ${plansCount}+ Plans · ${inForceCount} Active Policies`,
                conv(`全港 ${insurersCount} 間保險公司 · ${plansCount}+ 款保單計劃 · 已跟進 ${inForceCount} 份生效保單`)
              )}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => onEnterWorkbench('stage2')}
              className="hover:text-[#8C5E24] transition-colors whitespace-nowrap"
            >
              {t('Compare Plans', conv('去比較保單'))}
            </button>
            <button
              type="button"
              onClick={() => onEnterWorkbench('stage5', 'compliance')}
              className="hover:text-[#8C5E24] transition-colors whitespace-nowrap"
            >
              {t('CPD & Compliance Records', conv('CPD 時數及合規紀錄'))}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
