import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Cloud,
  Coins,
  Lock,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Tablet,
  UserCheck,
  Zap,
} from 'lucide-react';
import {
  NeedContextHint,
  recommendBestFitPlansForContext,
} from '../domain/clauseAndMonetizationEngine';
import { convertHkdToRmb, getSchemeMeta } from '../domain/clientGapEngine';
import { UnifiedDealValuation } from '../domain/dealCaseEngine';
import {
  GuidedStepGateResult,
  partitionPlansByAgentCompany,
} from '../domain/guidedWorkflowEngine';
import { localizePlanStrings, toSimplifiedChinese, useLanguage } from '../domain/i18n';
import { ClientLead, InsurancePlan, IntermediaryProfile } from '../domain/types';
import { WorkspaceSection } from './SidebarNav';

interface ActivePlanContextBarProps {
  activeSection: WorkspaceSection;
  onSelectSection: (section: WorkspaceSection) => void;
  leads: ClientLead[];
  selectedLeadId: string;
  onSelectLeadId: (leadId: string) => void;
  plans: InsurancePlan[];
  selectedPlanId: string;
  onSelectPlanId: (planId: string) => void;
  intermediary: IntermediaryProfile;
  agentCompanyCode?: string | null;
  stepGate?: GuidedStepGateResult;
  contextHint: NeedContextHint;
  unifiedDeal: UnifiedDealValuation;
  expressMeetingMode?: boolean;
  onToggleExpressMode?: () => void;
  onOpenMobilePoster?: () => void;
  onOpenClientLockModal?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenPromoFxConsole?: () => void;
  fxRateLocked?: boolean;
  cloudSyncLabel?: string;
  onBrowseAllMarketPlans?: () => void;
  onNotify?: (msg: string) => void;
}

const NEXT_STAGE_FLOW: Record<
  WorkspaceSection,
  { next: WorkspaceSection; labelEn: string; labelZh: string }
> = {
  stage1: { next: 'stage2', labelEn: 'Next: 02 Compare Plans', labelZh: '下一步：02 比較產品' },
  stage2: { next: 'stage3', labelEn: 'Next: 03 Quote & Riders', labelZh: '下一步：03 保費配搭' },
  stage3: { next: 'stage4', labelEn: 'Next: 04 Proposal', labelZh: '下一步：04 製作建議書' },
  stage4: { next: 'stage5', labelEn: 'Next: 05 Sign-Off', labelZh: '下一步：05 簽署確認' },
  stage5: { next: 'stage6', labelEn: '06 Calculators', labelZh: '06 計算工具箱' },
  stage6: { next: 'stage1', labelEn: 'Back to 01 Client', labelZh: '返回 01 客戶資料' },
};

const EXPRESS_NEXT_STAGE_FLOW: Record<
  WorkspaceSection,
  { next: WorkspaceSection; labelEn: string; labelZh: string }
> = {
  stage1: { next: 'stage3', labelEn: 'Next: 03 Quote', labelZh: '下一步：03 保費報價' },
  stage2: { next: 'stage3', labelEn: 'Next: 03 Quote', labelZh: '下一步：03 保費報價' },
  stage3: { next: 'stage5', labelEn: 'Next: 05 Sign-Off', labelZh: '下一步：05 簽署確認' },
  stage4: { next: 'stage5', labelEn: 'Next: 05 Sign-Off', labelZh: '下一步：05 簽署確認' },
  stage5: { next: 'stage1', labelEn: 'Back to 01 Client', labelZh: '返回 01 客戶資料' },
  stage6: { next: 'stage3', labelEn: 'Back to 03 Quote', labelZh: '返回 03 保費報價' },
};

export const ActivePlanContextBar: React.FC<ActivePlanContextBarProps> = ({
  activeSection,
  onSelectSection,
  leads,
  selectedLeadId,
  onSelectLeadId,
  plans,
  selectedPlanId,
  onSelectPlanId,
  intermediary,
  agentCompanyCode = null,
  stepGate,
  contextHint,
  unifiedDeal,
  expressMeetingMode = false,
  onToggleExpressMode,
  onOpenMobilePoster,
  onOpenClientLockModal,
  onOpenCommandPalette,
  onOpenPromoFxConsole,
  fxRateLocked = false,
  cloudSyncLabel,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);
  const [showRecommendationsDrawer, setShowRecommendationsDrawer] = useState(false);
  const [moreUtilitiesOpen, setMoreUtilitiesOpen] = useState(false);

  const activeLead = unifiedDeal.lead;
  const explicitPlan = unifiedDeal.anchorPlan;

  const partitionedPlans = useMemo(
    () =>
      partitionPlansByAgentCompany(
        plans.map((plan) => ({ plan })),
        agentCompanyCode
      ),
    [plans, agentCompanyCode]
  );

  const topCandidates = useMemo(
    () =>
      recommendBestFitPlansForContext({
        plans,
        lead: activeLead,
        intermediary,
        contextHint,
        preferredInsurerCode: agentCompanyCode,
        limit: 3,
      }),
    [plans, activeLead, intermediary, contextHint, agentCompanyCode]
  );

  const schemeMeta = getSchemeMeta(activeLead?.targetSchemeId);
  const budgetHkd = activeLead?.annualBudgetHkd ?? 48000;
  const budgetRmb = convertHkdToRmb(budgetHkd);
  const riderCount = unifiedDeal.selectedRiderIds.length;
  const comboCount = unifiedDeal.comboSecondaryPlans?.length ?? 0;
  const nextStepMeta = expressMeetingMode
    ? EXPRESS_NEXT_STAGE_FLOW[activeSection]
    : NEXT_STAGE_FLOW[activeSection];
  const visibleDealStages = expressMeetingMode
    ? unifiedDeal.dealStages.filter(
        (s) => s.sectionKey === 'stage1' || s.sectionKey === 'stage3' || s.sectionKey === 'stage5'
      )
    : unifiedDeal.dealStages;

  return (
    <section
      data-testid="global-deal-command-bar"
      aria-label="Unified 6-stage deal progress and active proposal cart bar"
      className="vh-harbour-panel relative mb-4 rounded-xl shadow-sm"
    >
      {/* Subtle Victoria Harbour Central Architectural Skyline Geometric Watermark */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl" aria-hidden="true">
        <svg
          aria-hidden="true"
          viewBox="0 0 560 90"
          className="absolute bottom-0 right-0 h-20 w-[440px] opacity-20"
          fill="none"
        >
          <path
            d="M280 90V48H308V90M320 90V22L348 8V90M320 22L348 56M348 22L320 56M320 56L348 90M348 56L320 90M362 90V34H394V90M408 90V14H442V90M418 14V6H432V14M456 90V38H486V90M498 90V26H532V90"
            stroke="#D4AF37"
            strokeWidth="1.35"
          />
        </svg>
      </div>

      {/* Slim Interactive Deal Progress Stepper (3-Step Express or 6-Stage Pro) */}
      <div
        className={`relative z-10 grid gap-1 border-b border-[#D4AF37]/25 bg-[#060D18]/95 px-2.5 py-1.5 ${
          expressMeetingMode
            ? 'grid-cols-1 sm:grid-cols-3'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
        }`}
      >
        {visibleDealStages.map((st) => {
          const isCurrent = activeSection === st.sectionKey;
          return (
            <button
              key={st.sectionKey}
              type="button"
              data-testid={`deal-stepper-${st.sectionKey}`}
              onClick={() => onSelectSection(st.sectionKey)}
              className={`flex items-center justify-between gap-1.5 rounded-md border px-2.5 py-1 text-left transition-colors whitespace-nowrap ${
                isCurrent
                  ? 'border-[#D4AF37] bg-[#14294A] text-white'
                  : st.completed
                  ? 'border-slate-800 bg-[#0B172A] text-slate-200 hover:border-[#D4AF37]/50'
                  : 'border-slate-800/70 bg-[#091322] text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 truncate text-[11px] font-semibold">
                {st.completed && !isCurrent ? (
                  <Check className="h-3 w-3 shrink-0 text-emerald-400" aria-hidden="true" />
                ) : (
                  <span
                    className={`font-mono text-[10px] ${
                      isCurrent ? 'text-[#F3D37A]' : 'opacity-85'
                    }`}
                  >
                    {st.stageNumber}
                  </span>
                )}
                <span className="truncate">
                  {lang === 'en' ? st.shortLabelEn : conv(st.shortLabelZh)}
                </span>
              </span>
              <span
                className={`font-mono text-[10px] font-bold tabular-nums ${
                  isCurrent
                    ? 'text-[#F3D37A]'
                    : st.completed
                    ? 'text-emerald-300'
                    : 'text-slate-400'
                }`}
              >
                {lang === 'en' ? st.metricBadge : conv(st.metricBadge)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Band 2: Active Client + Selected Plan + Live Annual Premium Badge */}
      <div className="relative z-10 flex flex-col gap-2 border-b border-slate-800/80 px-3.5 py-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 min-w-0">
            <label
              htmlFor="shared-context-client-select"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F3D37A] whitespace-nowrap shrink-0"
            >
              <UserCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{t('Client:', conv('客戶：'))}</span>
            </label>
            <select
              id="shared-context-client-select"
              value={selectedLeadId}
              onChange={(e) => {
                onSelectLeadId(e.target.value);
                const picked = leads.find((l) => l.id === e.target.value);
                if (picked) {
                  onNotify?.(
                    t(
                      `Switched active client to ${picked.fullNameEn} (${picked.age}y).`,
                      conv(`已切換當前服務客戶為「${picked.fullNameZh}（${picked.age} 歲）」。`)
                    )
                  );
                }
              }}
              className="min-w-0 flex-1 truncate rounded-lg border border-slate-700 bg-[#060D18]/90 px-2.5 py-1.5 text-xs font-semibold text-white focus:border-[#D4AF37] focus:outline-none"
            >
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id} className="bg-[#060D18] text-white">
                  {lead.fullNameZh} ({lead.fullNameEn}) · {lead.age}
                  {t('y', '歲')} · HK${(lead.annualBudgetHkd ?? 48000).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <label
              htmlFor="shared-context-plan-select"
              className={`inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                explicitPlan ? 'text-emerald-300' : 'text-[#F3D37A]'
              }`}
            >
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{explicitPlan ? t('Plan:', conv('已選計劃：')) : t('Target:', conv('保障方案：'))}</span>
            </label>
            <select
              id="shared-context-plan-select"
              value={explicitPlan?.id || ''}
              onChange={(e) => {
                const nextId = e.target.value;
                onSelectPlanId(nextId);
                const pickedPlan = plans.find((p) => p.id === nextId);
                onNotify?.(
                  pickedPlan
                    ? t(
                        `Selected [${pickedPlan.insurerCode}] ${pickedPlan.nameEn} across all steps.`,
                        conv(`已揀選「[${pickedPlan.insurerCode}] ${pickedPlan.nameZh}」，各步驟資料已同步更新。`)
                      )
                    : t(
                        `Switched back to target coverage scheme (${schemeMeta.titleEn}).`,
                        conv(`已切回預設保障方案（${schemeMeta.titleZh}）。`)
                      )
                );
              }}
              className={`min-w-0 flex-1 truncate rounded-lg border px-2.5 py-1.5 text-xs font-semibold focus:outline-none ${
                explicitPlan
                  ? 'border-emerald-500/70 bg-emerald-950/60 text-emerald-50 focus:border-emerald-400'
                  : 'border-slate-700 bg-[#060D18]/90 text-slate-100 focus:border-[#D4AF37]'
              }`}
            >
              <option value="" className="bg-[#060D18] text-slate-200">
                {t(
                  `[Not Selected Yet] Pick a plan in Step 02`,
                  conv(`【未選定具體計劃】請於第 02 步揀選`)
                )}
              </option>
              {partitionedPlans.ownCompanyItems.length > 0 ? (
                <>
                  <optgroup
                    label={t(
                      `★ My Company First (${partitionedPlans.activeCompanyNameEn})`,
                      conv(`★ 本司優先產品（${partitionedPlans.activeCompanyNameZh}）`)
                    )}
                  >
                    {partitionedPlans.ownCompanyItems.map(({ plan: p }) => {
                      const loc = localizePlanStrings(p, lang);
                      return (
                        <option key={p.id} value={p.id} className="bg-[#060D18] text-white">
                          ★ [{p.insurerCode}] {loc.planName} ({loc.categoryLabel})
                        </option>
                      );
                    })}
                  </optgroup>
                  <optgroup
                    label={t(
                      'Other Insurers (Market Suggestions)',
                      conv('其他保險公司（市場參考建議）')
                    )}
                  >
                    {partitionedPlans.otherCompanyItems.map(({ plan: p }) => {
                      const loc = localizePlanStrings(p, lang);
                      return (
                        <option key={p.id} value={p.id} className="bg-[#060D18] text-white">
                          [{p.insurerCode}] {loc.planName} ({loc.categoryLabel})
                        </option>
                      );
                    })}
                  </optgroup>
                </>
              ) : (
                plans.map((p) => {
                  const loc = localizePlanStrings(p, lang);
                  return (
                    <option key={p.id} value={p.id} className="bg-[#060D18] text-white">
                      [{p.insurerCode}] {loc.planName} ({loc.categoryLabel})
                    </option>
                  );
                })
              )}
            </select>

            {explicitPlan && (
              <button
                type="button"
                title={t('Reset to default target scheme', conv('重設回預設保障方案'))}
                onClick={() => {
                  onSelectPlanId('');
                  setShowRecommendationsDrawer(false);
                  onNotify?.(
                    t(
                      'Cleared plan selection; restored target coverage scheme.',
                      conv('已重設單一產品選擇，恢復按預設保障方案計算。')
                    )
                  );
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-[#0B172A] px-2 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#11223B] whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t('Reset', conv('重設'))}</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Budget & Annual Cart Total Pill */}
        <div className="flex flex-wrap items-center justify-between gap-2 xl:justify-end shrink-0">
          {cloudSyncLabel && (
            <span
              data-testid="advisor-cloud-sync-badge"
              className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-300/90 whitespace-nowrap"
            >
              <Cloud className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{cloudSyncLabel}</span>
            </span>
          )}
          <span className="font-mono text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
            {t('Budget', conv('預算'))} HK${budgetHkd.toLocaleString()} (¥{budgetRmb.toLocaleString()})
          </span>
          <span
            data-testid="global-cart-annual-total"
            className="rounded-md border border-[#D4AF37]/45 bg-[#060D18] px-2.5 py-1 font-mono text-xs font-bold text-[#F3D37A] tabular-nums whitespace-nowrap"
          >
            HK$ {unifiedDeal.bundleSim.netAnnualPremiumHkd.toLocaleString()}
            {comboCount > 0 ? ` · +${comboCount}${t(' Combo', conv(' 組合'))}` : ''} · +{riderCount}{' '}
            {t('Riders', conv('附約'))}
          </span>
        </div>
      </div>

      {/* Band 3: Calm Single-Focus Bar — Essential Tools (Left) + Action-Gated Next Step CTA (Right) */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 bg-[#081120]/85 px-3.5 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {onOpenCommandPalette && (
            <button
              type="button"
              data-testid="open-command-palette-btn"
              onClick={onOpenCommandPalette}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/90 bg-[#060D18] px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-[#D4AF37]/60 hover:text-white whitespace-nowrap shrink-0"
            >
              <Search className="h-3.5 w-3.5 text-[#F3D37A]" aria-hidden="true" />
              <span>{t('Search ⌘K', conv('搜尋 ⌘K'))}</span>
            </button>
          )}

          {onOpenClientLockModal && (
            <button
              type="button"
              data-testid="open-ipad-client-lock-btn"
              onClick={onOpenClientLockModal}
              className="inline-flex items-center gap-1 rounded-lg border border-teal-500/60 bg-teal-950/60 px-2.5 py-1 text-[11px] font-semibold text-teal-200 hover:border-teal-400 hover:text-white whitespace-nowrap shrink-0"
            >
              <Tablet className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
              <span>{t('PC / iPad Client View', conv('PC／iPad 同屏見客'))}</span>
            </button>
          )}

          {/* Collapsible More Tools Dropdown so the bar stays uncluttered */}
          <div className="relative">
            <button
              type="button"
              data-testid="context-bar-more-tools-btn"
              aria-expanded={moreUtilitiesOpen}
              onClick={() => setMoreUtilitiesOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/90 bg-[#0B172A] px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-[#D4AF37]/50 whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#F3D37A]" aria-hidden="true" />
              <span>{t('More Tools', conv('更多工具'))}</span>
              <ChevronDown
                className={`h-3 w-3 transition-transform ${moreUtilitiesOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {moreUtilitiesOpen && (
              <div
                role="menu"
                className="absolute left-0 z-40 mt-1.5 w-56 rounded-xl border border-slate-700 bg-[#0B172A] p-1.5 shadow-2xl space-y-1 text-xs"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowRecommendationsDrawer((prev) => !prev);
                    setMoreUtilitiesOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-semibold text-slate-200 hover:bg-[#14294A]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#F3D37A]" aria-hidden="true" />
                  <span>
                    {showRecommendationsDrawer
                      ? t('Hide Top Picks', conv('收起推薦計劃'))
                      : t('Top Picks (My Co First)', conv('推薦計劃（本司優先）'))}
                  </span>
                </button>
                {onOpenMobilePoster && (
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="open-mobile-poster-btn"
                    onClick={() => {
                      onOpenMobilePoster();
                      setMoreUtilitiesOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-semibold text-slate-200 hover:bg-[#14294A]"
                  >
                    <Smartphone className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
                    <span>{t('1-Page Summary Card', conv('一頁見客摘要卡'))}</span>
                  </button>
                )}
                {onOpenPromoFxConsole && (
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="open-promo-fx-console-btn"
                    onClick={() => {
                      onOpenPromoFxConsole();
                      setMoreUtilitiesOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-semibold text-slate-200 hover:bg-[#14294A]"
                  >
                    <Coins className="h-3.5 w-3.5 text-[#F3D37A]" aria-hidden="true" />
                    <span>
                      {fxRateLocked
                        ? t('FX Locked / Promos', conv('匯率已鎖定／推廣'))
                        : t('FX & Quarterly Promos', conv('匯率鎖定與優惠'))}
                    </span>
                  </button>
                )}
                {onToggleExpressMode && (
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="toggle-express-mode-btn"
                    onClick={() => {
                      onToggleExpressMode();
                      setMoreUtilitiesOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-semibold text-slate-200 hover:bg-[#14294A]"
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                    <span>
                      {expressMeetingMode
                        ? t('Switch to Full 5-Step Flow', conv('切換至完整 5 步流程'))
                        : t('Switch to Quick 4-Step Flow', conv('切換至快速見客模式'))}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action-Gated Next Step CTA: ONLY shown when current step's required action is completed */}
        {stepGate ? (
          stepGate.canAdvance && stepGate.nextSection ? (
            <button
              type="button"
              data-testid="deal-bar-next-step-btn"
              onClick={() => onSelectSection(stepGate.nextSection!)}
              className="vh-gold-cta inline-flex items-center gap-1 rounded-lg px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shrink-0"
            >
              <span>{t(stepGate.nextCtaEn, conv(stepGate.nextCtaZh))}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <span
              data-testid="deal-bar-step-pending-hint"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-950/50 px-3 py-1 text-[11px] font-semibold text-amber-200"
            >
              <span>
                {t(
                  `Step ${stepGate.stepNumber}/${stepGate.totalSteps}: Complete current step to unlock Next`,
                  conv(`第 ${stepGate.stepNumber}／${stepGate.totalSteps} 步：完成本頁操作後自動顯示「下一步」`)
                )}
              </span>
            </span>
          )
        ) : (
          <button
            type="button"
            data-testid="deal-bar-next-step-btn"
            onClick={() => onSelectSection(nextStepMeta.next)}
            className="vh-gold-cta inline-flex items-center gap-1 rounded-lg px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shrink-0"
          >
            <span>{t(nextStepMeta.labelEn, conv(nextStepMeta.labelZh))}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* On-Demand Top-3 Smart Recommendations Tray */}
      {showRecommendationsDrawer && (
        <div className="relative z-10 border-t border-[#D4AF37]/25 bg-[#060D18]/95 px-4 py-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-slate-300">
              {t(
                'Recommended plans based on this client’s age and budget (selecting one updates all steps):',
                conv('按此客戶年齡及保費預算推薦嘅計劃（揀選後會同步更新保費配搭及建議書）：')
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
            {topCandidates.map((cand) => {
              const loc = localizePlanStrings(cand.plan, lang);
              const isLocked = explicitPlan?.id === cand.plan.id;
              const reasonText =
                lang === 'en'
                  ? cand.reasonEn
                  : lang === 'zh-CN'
                  ? toSimplifiedChinese(cand.reasonZh)
                  : cand.reasonZh;
              const tagText =
                lang === 'en'
                  ? cand.tagLabelEn
                  : lang === 'zh-CN'
                  ? toSimplifiedChinese(cand.tagLabelZh)
                  : cand.tagLabelZh;

              return (
                <div
                  key={cand.plan.id}
                  className={`flex flex-col justify-between rounded-lg border p-3 ${
                    isLocked
                      ? 'border-[#D4AF37] bg-[#14294A]'
                      : 'border-slate-800 bg-[#0B172A] hover:border-[#D4AF37]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="truncate font-semibold text-slate-300">
                        {loc.insurerName} · {tagText}
                      </span>
                      <span className="font-mono font-bold text-[#F3D37A] whitespace-nowrap tabular-nums">
                        {cand.matchScorePct}% {t('Fit', conv('匹配'))}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs font-bold text-white">
                      {loc.planName}
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-slate-400">{reasonText}</p>
                  </div>

                  <div className="mt-2.5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPlanId(cand.plan.id);
                        setShowRecommendationsDrawer(false);
                        onNotify?.(
                          t(
                            `Locked [${cand.plan.insurerCode}] ${cand.plan.nameEn} as active proposal plan.`,
                            conv(`已鎖定「[${cand.plan.insurerCode}] ${cand.plan.nameZh}」為主推計劃。`)
                          )
                        );
                      }}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold whitespace-nowrap shrink-0 ${
                        isLocked
                          ? 'bg-emerald-600 text-white'
                          : 'vh-gold-cta'
                      }`}
                    >
                      {isLocked && <Check className="h-3 w-3" aria-hidden="true" />}
                      <span>
                        {isLocked
                          ? t('Locked Plan', conv('當前主推計劃'))
                          : t('Lock This Plan', conv('設為主推計劃'))}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
