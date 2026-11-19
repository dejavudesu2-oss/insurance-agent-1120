import React, { useState } from 'react';
import {
  BadgeDollarSign,
  Building2,
  Compass,
  FileCheck2,
  Globe,
  KeyRound,
  Layers,
  Presentation,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import brokerAvatarImg from '../assets/images/avatar_hk_broker_1794463570042.jpg';
import { AGENT_COMPANY_OPTIONS } from '../domain/guidedWorkflowEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  buildMemberInitials,
  type MemberAccountProfile,
} from '../domain/memberAuthEngine';
import { AppLanguage, IntermediaryProfile, IntermediaryRole } from '../domain/types';
import type { MemberModalInitialTab } from './MemberAuthModal';
import { PWAInstallButton } from './PwaControls';

export type WorkspaceSection =
  | 'stage1'
  | 'stage2'
  | 'stage3'
  | 'stage4'
  | 'stage5'
  | 'stage6';

interface SidebarNavProps {
  activeSection: WorkspaceSection;
  onSelectSection: (section: WorkspaceSection) => void;
  intermediary: IntermediaryProfile;
  onChangeRole: (role: IntermediaryRole) => void;
  agentCompanyCode?: string | null;
  onChangeAgentCompanyCode?: (code: string | null) => void;
  activeMember?: MemberAccountProfile | null;
  onOpenMemberAuth?: (tab?: MemberModalInitialTab) => void;
  plansCount: number;
  leadsCount: number;
  policiesCount: number;
  driveFilesCount: number;
  activeClientName?: string;
  bundledAnnualHkd?: number;
  expressMeetingMode?: boolean;
  onToggleExpressMode?: () => void;
  onOpenMobilePoster?: () => void;
  onOpenGuidedCoach?: () => void;
  onOpenLandingPage?: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface StageNavItemDef {
  id: WorkspaceSection;
  index: string;
  labelEn: string;
  labelZhHk: string;
  subLabelEn: string;
  subLabelZhHk: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SIX_STAGE_WORKBENCH_ITEMS: StageNavItemDef[] = [
  {
    id: 'stage1',
    index: '01',
    labelEn: 'Client Info & Coverage',
    labelZhHk: '客戶資料與保障分析',
    subLabelEn: 'Client List, Coverage Gap & Stats',
    subLabelZhHk: '客戶名單 · 保障缺口 · 轉化數據',
    icon: Users,
  },
  {
    id: 'stage2',
    index: '02',
    labelEn: 'Plan Comparison & Clauses',
    labelZhHk: '產品比較與條款查詢',
    subLabelEn: 'Side-by-Side Quotes & Policy Terms',
    subLabelZhHk: '跨公司比較 · 條款對照 · 退休提領',
    icon: Layers,
  },
  {
    id: 'stage3',
    index: '03',
    labelEn: 'Riders & Hospital Info',
    labelZhHk: '醫療附約與醫院收費',
    subLabelEn: 'Rider Pricing, Cashless & Tax',
    subLabelZhHk: '保費配搭 · 私院免找數 · 扣稅計算',
    icon: Building2,
  },
  {
    id: 'stage4',
    index: '04',
    labelEn: 'Proposal & Mobile Share',
    labelZhHk: '建議書簡報與分享',
    subLabelEn: '5-Page PDF, Client Q&A & QR Link',
    subLabelZhHk: '5 頁簡報 PDF · 常見問題 · 手機 QR',
    icon: Presentation,
  },
  {
    id: 'stage5',
    index: '05',
    labelEn: 'Sign-Off & Servicing',
    labelZhHk: '投保確認與售後跟進',
    subLabelEn: 'e-Signature, Renewals & Compliance',
    subLabelZhHk: '電子簽名 · 續保提醒 · 合規紀錄',
    icon: FileCheck2,
  },
  {
    id: 'stage6',
    index: '06',
    labelEn: 'Planning Calculators',
    labelZhHk: '實用計算機工具箱',
    subLabelEn: '32 Tax, Retirement & Family Tools',
    subLabelZhHk: '32 款扣稅、退休、按揭及傳承工具',
    icon: BadgeDollarSign,
  },
];

const LANGUAGE_OPTIONS: Array<{
  code: AppLanguage;
  shortCode: 'ZH' | 'CN' | 'EN';
  ariaLabel: string;
  displayLabel: string;
}> = [
  {
    code: 'zh-HK',
    shortCode: 'ZH',
    ariaLabel: 'Switch language to ZH Traditional Chinese 繁體中文',
    displayLabel: 'ZH 繁',
  },
  {
    code: 'zh-CN',
    shortCode: 'CN',
    ariaLabel: 'Switch language to CN Simplified Chinese 简体中文',
    displayLabel: 'CN 简',
  },
  {
    code: 'en',
    shortCode: 'EN',
    ariaLabel: 'Switch language to EN English',
    displayLabel: 'EN',
  },
];

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeSection,
  onSelectSection,
  intermediary,
  onChangeRole,
  agentCompanyCode = null,
  onChangeAgentCompanyCode,
  activeMember = null,
  onOpenMemberAuth,
  plansCount,
  leadsCount,
  policiesCount,
  driveFilesCount,
  activeClientName,
  bundledAnnualHkd,
  expressMeetingMode = false,
  onToggleExpressMode,
  onOpenMobilePoster,
  onOpenGuidedCoach,
  onOpenLandingPage,
  mobileOpen,
  onCloseMobile,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);
  const visibleStageItems = expressMeetingMode
    ? SIX_STAGE_WORKBENCH_ITEMS.filter(
        (it) => it.id === 'stage1' || it.id === 'stage3' || it.id === 'stage5'
      )
    : SIX_STAGE_WORKBENCH_ITEMS;

  const renderStageButton = (item: StageNavItemDef) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;
    const countMetric =
      item.id === 'stage1'
        ? leadsCount
        : item.id === 'stage2'
        ? plansCount
        : item.id === 'stage3'
        ? 13
        : item.id === 'stage4'
        ? 5
        : item.id === 'stage5'
        ? policiesCount + (driveFilesCount > 0 ? driveFilesCount : 0)
        : 32;

    const primaryTitle =
      lang === 'en' ? item.labelEn : t(item.labelEn, item.labelZhHk);
    const secondarySubtitle =
      lang === 'en' ? item.subLabelEn : t(item.subLabelEn, item.subLabelZhHk);

    return (
      <button
        key={item.id}
        type="button"
        data-testid={`sidebar-nav-${item.id}`}
        onClick={() => {
          onSelectSection(item.id);
          onCloseMobile();
        }}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
          isActive
            ? 'border-[#D4AF37]/80 bg-[#11223B] text-white shadow-xs'
            : 'border-transparent text-slate-300 hover:border-slate-800 hover:bg-[#0B172A] hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon
            className={`h-4 w-4 shrink-0 ${
              isActive ? 'text-[#F3D37A]' : 'text-slate-400'
            }`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold whitespace-nowrap">
              {item.index}. {primaryTitle}
            </div>
            <div
              className={`truncate text-[11px] ${
                isActive ? 'text-[#F3D37A]/90' : 'text-slate-400'
              }`}
            >
              {secondarySubtitle}
            </div>
          </div>
        </div>
        <span
          className={`ml-2 font-mono text-xs tabular-nums ${
            isActive ? 'font-bold text-[#F3D37A]' : 'text-slate-400'
          }`}
        >
          {countMetric}
        </span>
      </button>
    );
  };

  const renderNavContent = () => (
    <div className="vh-harbour-surface flex h-full flex-col justify-between overflow-y-auto border-r border-[#D4AF37]/25 text-slate-200">
      <div>
        {/* Brand Lockup + Victoria Harbour Central Skyline Geometric Linework */}
        <div className="relative overflow-hidden border-b border-[#D4AF37]/25 bg-[#060D18] px-4 py-3">
          <svg
            aria-hidden="true"
            viewBox="0 0 260 64"
            className="pointer-events-none absolute bottom-0 right-0 h-14 w-48 opacity-30"
            fill="none"
          >
            {/* Central HK Skyline: BOC Tower X-bracing, IFC Two, Cheung Kong Center, ICC */}
            <path
              d="M96 64V34H114V64M122 64V16L142 6V64M122 16L142 40M142 16L122 40M122 40L142 64M142 40L122 64M150 64V24H170V64M154 24V20H166V24M178 64V10H202V64M184 10V5H196V10M210 64V30H228V64M234 64V20H252V64"
              stroke="#D4AF37"
              strokeWidth="1.25"
            />
            <line x1="0" y1="63.2" x2="260" y2="63.2" stroke="#D4AF37" strokeOpacity="0.45" strokeWidth="1" />
          </svg>

          <div className="relative z-10 flex items-center justify-between">
            <span className="text-base font-bold tracking-tight text-[#F8FAFC] whitespace-nowrap">
              HK InsureHub <span className="text-[#F3D37A]">Pro</span>
            </span>
            {mobileOpen && (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation menu"
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-slate-300 hover:bg-[#11223B] hover:text-white lg:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Trilingual Selector: ZH (Traditional HK) / CN (Simplified) / EN (English) */}
        <div className="border-b border-slate-800/90 px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 whitespace-nowrap">
              <Globe className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
              <span>{t('Language', '語言切換')}</span>
            </span>
            <div
              role="group"
              aria-label="Interface language selection ZH CN EN"
              className="grid grid-cols-3 gap-1 rounded-lg border border-slate-800 bg-[#060D18] p-0.5"
            >
              {LANGUAGE_OPTIONS.map((opt) => {
                const active = lang === opt.code;
                return (
                  <button
                    key={opt.shortCode}
                    type="button"
                    aria-label={opt.ariaLabel}
                    aria-pressed={active}
                    onClick={() => setLang(opt.code)}
                    className={`rounded-md px-2 py-1 font-mono text-[11px] font-semibold whitespace-nowrap ${
                      active
                        ? 'bg-[#D4AF37] text-[#060D18]'
                        : 'text-slate-400 hover:bg-[#11223B] hover:text-white'
                    }`}
                  >
                    {opt.displayLabel}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            {onOpenLandingPage ? (
              <button
                type="button"
                data-testid="sidebar-open-landing-btn"
                onClick={() => {
                  onOpenLandingPage();
                  onCloseMobile();
                }}
                className="rounded-md border border-[#D4AF37]/40 bg-[#060D18] px-2.5 py-1 text-[11px] font-semibold text-[#F3D37A] hover:bg-[#11223B] whitespace-nowrap shrink-0"
              >
                {t('Home', '返回首頁')}
              </button>
            ) : (
              <span />
            )}
            <PWAInstallButton compact />
          </div>
        </div>

        <nav aria-label="6-stage deal workbench" className="mt-2 space-y-1 px-3 pb-2">
          {onToggleExpressMode && (
            <div
              role="group"
              aria-label="Workflow complexity mode"
              className="mb-2 grid grid-cols-2 gap-1 rounded-lg border border-[#D4AF37]/25 bg-[#060D18] p-1"
            >
              <button
                type="button"
                data-testid="sidebar-express-mode-btn"
                aria-pressed={expressMeetingMode}
                onClick={() => {
                  if (!expressMeetingMode) onToggleExpressMode();
                }}
                className={`inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  expressMeetingMode
                    ? 'bg-[#D4AF37] text-[#060D18]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{t('Simple 3-Step', '簡易 3 步')}</span>
              </button>
              <button
                type="button"
                data-testid="sidebar-pro-mode-btn"
                aria-pressed={!expressMeetingMode}
                onClick={() => {
                  if (expressMeetingMode) onToggleExpressMode();
                }}
                className={`inline-flex items-center justify-center rounded-md px-2 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  !expressMeetingMode
                    ? 'border border-[#D4AF37]/40 bg-[#11223B] text-[#F3D37A]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{t('Full 6-Step', '完整 6 步')}</span>
              </button>
            </div>
          )}

          <div className="px-2 pb-0.5 text-[11px] font-medium text-[#F3D37A]/80">
            {expressMeetingMode
              ? t('Quick Meeting Flow (01→03→05)', '見客簡易流程 (01→03→05)')
              : t('Advisor Workflow (01–06)', '主要功能選單 (01–06)')}
          </div>
          {visibleStageItems.map(renderStageButton)}
        </nav>

        {/* Active Deal Pulse Summary + 1-Page Mobile Poster Quick Launch */}
        {activeClientName && typeof bundledAnnualHkd === 'number' && (
          <div className="mx-3 mt-1 space-y-2 rounded-lg border border-[#D4AF37]/30 bg-[#081221] p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold text-white">{activeClientName}</span>
              <span className="font-mono text-[11px] font-semibold text-[#F3D37A] tabular-nums shrink-0">
                HK$ {bundledAnnualHkd.toLocaleString()}/yr
              </span>
            </div>
            {(onOpenMobilePoster || onOpenGuidedCoach) && (
              <div className="grid grid-cols-2 gap-1.5">
                {onOpenMobilePoster && (
                  <button
                    type="button"
                    data-testid="sidebar-open-poster-btn"
                    onClick={() => {
                      onOpenMobilePoster();
                      onCloseMobile();
                    }}
                    className="vh-gold-cta flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold whitespace-nowrap"
                  >
                    <Smartphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{t('Summary Card', '一頁摘要')}</span>
                  </button>
                )}
                {onOpenGuidedCoach && (
                  <button
                    type="button"
                    data-testid="sidebar-open-guided-coach-btn"
                    onClick={() => {
                      onOpenGuidedCoach();
                      onCloseMobile();
                    }}
                    className="flex items-center justify-center gap-1 rounded-lg border border-[#D4AF37]/45 bg-[#11223B] px-2 py-1.5 text-[11px] font-semibold text-[#F3D37A] hover:border-[#D4AF37] whitespace-nowrap"
                  >
                    <Compass className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{t('Quick Guide', '操作指引')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* HKIA Intermediary License, Member Session & RBAC Switcher */}
      <div className="border-t border-[#D4AF37]/20 bg-[#060D18]/90 px-3.5 py-3">
        <div className="flex items-center gap-3">
          {!imgFailed && (!activeMember || activeMember.id === 'member-raymond-kwok') ? (
            <img
              src={brokerAvatarImg}
              alt={`${intermediary.nameEn} licensed intermediary portrait`}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-10 w-10 shrink-0 rounded-full border border-[#D4AF37]/60 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/50 bg-[#11223B] font-mono text-xs font-semibold text-[#F3D37A]">
              {activeMember
                ? buildMemberInitials(activeMember)
                : buildMemberInitials({
                    fullNameEn: intermediary.nameEn,
                    fullNameZh: intermediary.nameZh,
                  })}
            </div>
          )}
          <div className="min-w-0">
            <p
              data-testid="sidebar-advisor-name"
              className="truncate text-xs font-semibold text-white"
            >
              {intermediary.nameEn}
              {intermediary.nameZh && intermediary.nameZh !== intermediary.nameEn
                ? ` · ${t(intermediary.nameZh, intermediary.nameZh)}`
                : ''}
            </p>
            <p
              data-testid="sidebar-advisor-license"
              className="truncate font-mono text-[11px] text-[#F3D37A]/85 tabular-nums"
            >
              IA Lic: {intermediary.iaLicenseNo}
            </p>
            {activeMember && (
              <p className="truncate text-[11px] text-slate-400">{activeMember.email}</p>
            )}
          </div>
        </div>

        {onOpenMemberAuth && (
          <button
            type="button"
            data-testid="sidebar-member-auth-btn"
            onClick={() => {
              onOpenMemberAuth(activeMember ? 'PROFILE' : 'SIGN_IN');
              onCloseMobile();
            }}
            className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeMember
                ? 'border-[#D4AF37]/45 bg-[#11223B] text-[#F3D37A] hover:border-[#D4AF37]'
                : 'border-slate-600 bg-[#0B172A] text-white hover:border-[#D4AF37] hover:text-[#F3D37A]'
            }`}
          >
            {activeMember ? (
              <>
                <UserCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{t('Account Settings / Sign Out', '帳戶設定 / 登出')}</span>
              </>
            ) : (
              <>
                <KeyRound className="h-3.5 w-3.5 shrink-0 text-[#F3D37A]" aria-hidden="true" />
                <span>{t('Sign In / Register', '會員登入 / 註冊')}</span>
              </>
            )}
          </button>
        )}

        <div className="mt-2.5">
          <label
            htmlFor="rbac-role-select"
            className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
            <span>{t('License Role', '牌照身分設定')}</span>
          </label>
          <select
            id="rbac-role-select"
            value={intermediary.role}
            onChange={(e) => onChangeRole(e.target.value as IntermediaryRole)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0B172A] px-2.5 py-1.5 text-xs font-medium text-slate-100 focus:border-[#D4AF37] focus:outline-none"
          >
            <option value={IntermediaryRole.BROKER_TR}>
              {t(
                `Broker — All Insurers (${
                  intermediary.role === IntermediaryRole.BROKER_TR
                    ? intermediary.iaLicenseNo
                    : 'FB1928'
                })`,
                `保險經紀代表 — 全市場產品 (${
                  intermediary.role === IntermediaryRole.BROKER_TR
                    ? intermediary.iaLicenseNo
                    : 'FB1928'
                })`
              )}
            </option>
            <option value={IntermediaryRole.TIED_AGENT}>
              {t(
                `Tied Agent (${
                  intermediary.role === IntermediaryRole.TIED_AGENT
                    ? intermediary.iaLicenseNo
                    : 'FA8402'
                })`,
                `專屬保險代理人 (${
                  intermediary.role === IntermediaryRole.TIED_AGENT
                    ? intermediary.iaLicenseNo
                    : 'FA8402'
                })`
              )}
            </option>
          </select>
        </div>

        {onChangeAgentCompanyCode && (
          <div className="mt-2.5">
            <label
              htmlFor="agent-company-priority-select"
              className="flex items-center gap-1.5 text-[11px] font-medium text-[#F3D37A]"
            >
              <span>{t('My Insurer (Shown First)', '所屬保險公司（本司優先）')}</span>
            </label>
            <select
              id="agent-company-priority-select"
              data-testid="sidebar-agent-company-select"
              value={agentCompanyCode || 'ALL'}
              onChange={(e) => {
                const v = e.target.value;
                onChangeAgentCompanyCode(v === 'ALL' ? null : v);
              }}
              className="mt-1 w-full rounded-lg border border-[#D4AF37]/45 bg-[#0B172A] px-2.5 py-1.5 text-xs font-semibold text-white focus:border-[#D4AF37] focus:outline-none"
            >
              <option value="ALL">
                {t('All Insurers (Neutral Broker)', '全市場平均展示（無指定主司）')}
              </option>
              {AGENT_COMPANY_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {lang === 'en' ? opt.nameEn : conv(opt.nameZh)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64 lg:shrink-0">
        {renderNavContent()}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-[#060D18]/75 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full w-72 max-w-[85vw]">{renderNavContent()}</div>
        </div>
      )}
    </>
  );
};
