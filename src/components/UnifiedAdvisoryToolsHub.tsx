import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Save,
  Search,
  TrendingUp,
  Wrench,
  X,
} from 'lucide-react';
import {
  filterUnifiedAdvisoryTools,
  TOOL_USE_CASE_CATEGORIES,
  ToolUseCaseCategoryId,
  UNIFIED_32_TOOLS_DIRECTORY,
  UnifiedAdvisoryToolItem,
} from '../domain/crmAndCatalogTaxonomy';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  ClientMicrositeRecord,
  TwentyUpgradeCode,
  WhatsAppComplianceLogEntry,
  WhiteLabelBrandConfig,
} from '../domain/twentyUpgradesEngine';
import {
  ClientLead,
  CurrencyCode,
  FxRateFeedState,
  InsurancePlan,
  IntermediaryProfile,
  PolicyApplicationRecord,
  PromoAdminOverride,
  SavedToolSnapshot,
} from '../domain/types';
import { PowerPackToolId } from '../domain/advisorSixPowerPackEngine';
import { AdvisorSixPowerPackView } from './AdvisorSixPowerPackView';
import { AdvisoryFunctionCode, FeatureLabView } from './FeatureLabView';
import { MonetizationRoadmapView } from './MonetizationRoadmapView';
import { TwentyUpgradesHub } from './TwentyUpgradesHub';

export type ActiveClassifiedToolSelection =
  | { engine: 'FN'; code: AdvisoryFunctionCode }
  | { engine: 'IMP'; code: TwentyUpgradeCode };

interface UnifiedAdvisoryToolsHubProps {
  intermediary: IntermediaryProfile;
  totalPlansCount: number;
  totalInsurersCount: number;
  leads: ClientLead[];
  selectedLeadId: string;
  onSelectLeadId: (leadId: string) => void;
  activeLead: ClientLead;
  onAddLead: (newLead: ClientLead) => void;
  onUpdateLead: (leadId: string, updater: (prev: ClientLead) => ClientLead) => void;
  plans: InsurancePlan[];
  selectedPlanId: string;
  onSelectPlanId: (planId: string) => void;
  applications: PolicyApplicationRecord[];
  currency: CurrencyCode;
  sumAssuredUsd: number;
  paymentTermYears: number;
  clientSafeMode: boolean;
  onToggleClientSafeMode: () => void;
  adoptedImprovementIds: string[];
  onToggleAdoptImprovement: (id: string) => void;
  prioritizedRoadmapIds: string[];
  onTogglePrioritizeRoadmap: (id: string) => void;
  activeToolSelection: ActiveClassifiedToolSelection;
  onSelectTool: (next: ActiveClassifiedToolSelection) => void;
  whiteLabelConfig: WhiteLabelBrandConfig;
  onChangeWhiteLabelConfig: (next: WhiteLabelBrandConfig) => void;
  microsites: ClientMicrositeRecord[];
  onCreateMicrosite: (record: ClientMicrositeRecord) => Promise<void>;
  onLogMicrositeRead: (id: string, inspectedPolicyYear: number) => Promise<void>;
  whatsappAuditLogs: WhatsAppComplianceLogEntry[];
  onAppendWhatsappAuditLog: (entry: WhatsAppComplianceLogEntry) => void;
  onJumpToSection?: (section: 'market' | 'crm' | 'stp' | 'intel') => void;
  canShowDrive?: boolean;
  fxFeed?: FxRateFeedState;
  promoOverrides?: Record<string, PromoAdminOverride>;
  activePowerPackToolId?: PowerPackToolId;
  onChangeActivePowerPackToolId?: (toolId: PowerPackToolId) => void;
  forceOpenMode?: 'powerpack' | 'workbench' | 'roi' | null;
  onConsumeForceOpenMode?: () => void;
  onNotify?: (msg: string) => void;
}

export const UnifiedAdvisoryToolsHub: React.FC<UnifiedAdvisoryToolsHubProps> = ({
  intermediary,
  totalPlansCount,
  totalInsurersCount,
  leads,
  selectedLeadId,
  onSelectLeadId,
  activeLead,
  onAddLead,
  onUpdateLead,
  plans,
  selectedPlanId,
  onSelectPlanId,
  applications,
  currency,
  sumAssuredUsd,
  paymentTermYears,
  clientSafeMode,
  onToggleClientSafeMode,
  adoptedImprovementIds,
  onToggleAdoptImprovement,
  prioritizedRoadmapIds,
  onTogglePrioritizeRoadmap,
  activeToolSelection,
  onSelectTool,
  whiteLabelConfig,
  onChangeWhiteLabelConfig,
  microsites,
  onCreateMicrosite,
  onLogMicrositeRead,
  whatsappAuditLogs,
  onAppendWhatsappAuditLog,
  onJumpToSection,
  canShowDrive = false,
  fxFeed,
  promoOverrides,
  activePowerPackToolId,
  onChangeActivePowerPackToolId,
  forceOpenMode,
  onConsumeForceOpenMode,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zhHk: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk);

  const [hubMode, setHubMode] = useState<'powerpack' | 'workbench' | 'roi'>('powerpack');
  useEffect(() => {
    if (forceOpenMode) {
      setHubMode(forceOpenMode);
      onConsumeForceOpenMode?.();
    }
  }, [forceOpenMode, onConsumeForceOpenMode]);
  const [selectedCategory, setSelectedCategory] = useState<ToolUseCaseCategoryId>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [snapshotNoteDraft, setSnapshotNoteDraft] = useState('');
  const [justSavedSnapshot, setJustSavedSnapshot] = useState(false);

  const combinedPinnedIds = useMemo(
    () => [...adoptedImprovementIds, ...prioritizedRoadmapIds],
    [adoptedImprovementIds, prioritizedRoadmapIds]
  );

  const activeToolItem: UnifiedAdvisoryToolItem = useMemo(() => {
    const found = UNIFIED_32_TOOLS_DIRECTORY.find(
      (item) =>
        item.ref.engine === activeToolSelection.engine &&
        item.ref.code === activeToolSelection.code
    );
    return found || UNIFIED_32_TOOLS_DIRECTORY[0];
  }, [activeToolSelection]);

  useEffect(() => {
    if (
      selectedCategory !== 'ALL' &&
      activeToolItem &&
      activeToolItem.category !== selectedCategory
    ) {
      setSelectedCategory(activeToolItem.category);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeToolSelection.engine, activeToolSelection.code]);

  const categoryCounts = useMemo(() => {
    const counts: Record<ToolUseCaseCategoryId, number> = {
      ALL: UNIFIED_32_TOOLS_DIRECTORY.length,
      CLIENT_ACQUISITION_KYC: 0,
      MEDICAL_CLAIMS_UW: 0,
      WEALTH_TAX_LEGACY: 0,
      CROSS_BORDER_SME: 0,
      MDRT_COMPLIANCE_BRAND: 0,
    };
    for (const item of UNIFIED_32_TOOLS_DIRECTORY) {
      counts[item.category] += 1;
    }
    return counts;
  }, []);

  const filteredTools = useMemo(
    () =>
      filterUnifiedAdvisoryTools({
        category: selectedCategory,
        searchQuery,
        pinnedOnly,
        pinnedIds: combinedPinnedIds,
      }),
    [selectedCategory, searchQuery, pinnedOnly, combinedPinnedIds]
  );

  const siblingToolsInActiveCategory = useMemo(
    () =>
      UNIFIED_32_TOOLS_DIRECTORY.filter((tItem) => tItem.category === activeToolItem.category),
    [activeToolItem]
  );

  const currentSiblingIdx = siblingToolsInActiveCategory.findIndex(
    (tItem) => tItem.uid === activeToolItem.uid
  );

  const handleTogglePinTool = (item: UnifiedAdvisoryToolItem) => {
    const isPinned = combinedPinnedIds.includes(item.ref.pinId);
    if (item.ref.engine === 'FN') {
      onTogglePrioritizeRoadmap(item.ref.pinId);
    } else {
      onToggleAdoptImprovement(item.ref.pinId);
    }
    onNotify?.(
      isPinned
        ? t(`Unpinned ${item.codeBadge} from favorites.`, conv(`已取消釘選「${item.codeBadge}」。`))
        : t(`Pinned ${item.codeBadge} to favorites!`, conv(`已釘選「${item.codeBadge}」至常用清單！`))
    );
  };

  const handleLaunchTool = (item: UnifiedAdvisoryToolItem, scrollOnMobile = true) => {
    if (item.ref.engine === 'FN') {
      onSelectTool({ engine: 'FN', code: item.ref.code });
    } else {
      onSelectTool({ engine: 'IMP', code: item.ref.code });
    }
    if (
      scrollOnMobile &&
      typeof window !== 'undefined' &&
      window.innerWidth < 1024 &&
      typeof document !== 'undefined'
    ) {
      window.setTimeout(() => {
        document
          .getElementById('active-classified-tool-stage')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    }
  };

  const activeCategoryMeta =
    TOOL_USE_CASE_CATEGORIES.find((c) => c.id === activeToolItem.category) ||
    TOOL_USE_CASE_CATEGORIES[1];

  return (
    <div data-testid="unified-32-tools-hub" className="space-y-4">
      {/* Compact Editorial Header + Mode Switcher */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1
            className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
            style={{ textWrap: 'balance' }}
          >
            {t(
              '06. HK Advisor 6 Core Power Tools & 32 Specialist Calculators',
              conv('06. 香港顧問六大見客神器 ＋ 全套 32 項精算計算機（全產品庫實時配對）')
            )}
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            {t(
              `Synced to ${activeLead.fullNameEn} (${activeLead.age}y) & ${plans.length} HK plans — Run Pre-UW, Backdate Radar, Group+VHIS Deductible Relay, Policy Split, Claims Checklist & Multi-FX Payment Perks.`,
              conv(
                `已同步客戶「${activeLead.fullNameZh}（${activeLead.age} 歲）」及全庫 ${plans.length} 款保險計劃 · 一站式處理預先核保、轉保齡慳費、團保墊底費接力、保單分拆傳承、理賠清單及交費回贈比較。`
              )
            )}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Stage 06 Specialist Tools or Practice ROI"
          className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 shrink-0"
        >
          <button
            type="button"
            role="tab"
            data-testid="hub-mode-powerpack"
            aria-selected={hubMode === 'powerpack'}
            onClick={() => setHubMode('powerpack')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              hubMode === 'powerpack'
                ? 'bg-[#0B172A] text-[#F3D37A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('6 Core Power Tools', conv('六大見客神器 (1–6)'))}</span>
          </button>
          <button
            type="button"
            role="tab"
            data-testid="hub-mode-workbench"
            aria-selected={hubMode === 'workbench'}
            onClick={() => setHubMode('workbench')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              hubMode === 'workbench'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('32 Calculators', conv('32 個計算工具'))}</span>
          </button>
          <button
            type="button"
            role="tab"
            data-testid="hub-mode-roi"
            aria-selected={hubMode === 'roi'}
            onClick={() => setHubMode('roi')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              hubMode === 'roi'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('Time & Income Simulator', conv('時間效益與業績試算'))}</span>
          </button>
        </div>
      </div>

      {hubMode === 'powerpack' ? (
        <AdvisorSixPowerPackView
          activeToolId={activePowerPackToolId}
          onChangeActiveToolId={onChangeActivePowerPackToolId}
          leads={leads}
          selectedLeadId={selectedLeadId}
          onSelectLeadId={onSelectLeadId}
          activeLead={activeLead}
          onUpdateLead={onUpdateLead}
          plans={plans}
          selectedPlanId={selectedPlanId}
          onSelectPlanId={onSelectPlanId}
          intermediary={intermediary}
          currency={currency}
          sumAssuredUsd={sumAssuredUsd}
          paymentTermYears={paymentTermYears}
          fxFeed={fxFeed}
          promoOverrides={promoOverrides}
          onNotify={onNotify}
        />
      ) : hubMode === 'roi' ? (
        <MonetizationRoadmapView
          hideEmbeddedUpgradesAndList
          canShowDrive={canShowDrive}
          intermediary={intermediary}
          totalPlansCount={totalPlansCount}
          totalInsurersCount={totalInsurersCount}
          adoptedImprovementIds={adoptedImprovementIds}
          onToggleAdoptImprovement={onToggleAdoptImprovement}
          activeUpgradeCode={
            activeToolSelection.engine === 'IMP' ? activeToolSelection.code : 'IMP-01'
          }
          onSelectUpgradeCode={(code) => {
            onSelectTool({ engine: 'IMP', code });
            setHubMode('workbench');
          }}
          leads={leads}
          activeLead={activeLead}
          onAddLead={onAddLead}
          onUpdateLead={onUpdateLead}
          plans={plans}
          selectedPlanId={selectedPlanId}
          onSelectPlanId={onSelectPlanId}
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
      ) : (
        <div className="space-y-4">
          {/* Compact Single-Row Category Filter Pills + Search + Pinned */}
          <section
            aria-label="Filter 32 advisory tools by use case"
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 xl:flex-row xl:items-center xl:justify-between"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {TOOL_USE_CASE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const count = categoryCounts[cat.id];
                return (
                  <button
                    key={cat.id}
                    type="button"
                    data-testid={`tool-category-${cat.id}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-teal-700 text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{t(cat.titleEn, conv(cat.titleZh))}</span>
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        isSelected ? 'text-teal-100' : 'text-slate-500'
                      }`}
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="relative min-w-[220px] flex-1 sm:w-64">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label={t('Search 32 classified tools', conv('搜尋 32 項實戰工具'))}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('Search Tax, 567, MCV, MDRT...', conv('搜尋扣稅、567、高才通、結節...'))}
                  className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-7 text-xs font-medium text-slate-900 focus:border-teal-600 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear tool search"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                aria-pressed={pinnedOnly}
                onClick={() => setPinnedOnly((p) => !p)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  pinnedOnly
                    ? 'border-amber-500 bg-amber-50 text-amber-900'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {t(`Pinned (${combinedPinnedIds.length})`, conv(`常用釘選 (${combinedPinnedIds.length})`))}
                </span>
              </button>
            </div>
          </section>

          {/* ABOVE-THE-FOLD MASTER-DETAIL SPLIT: Left = Scrollable Directory (4 cols) | Right = Live Calculator (8 cols) */}
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
            {/* LEFT PANE: Compact Scrollable 32-Tool Directory */}
            <aside
              aria-label="Specialist calculators directory"
              className="rounded-xl border border-slate-200 bg-white p-3 lg:col-span-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-1 pb-2.5 text-xs">
                <span className="font-bold text-slate-800">
                  {t('Select Calculator', conv('點選專項工具'))}
                </span>
                <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                  {filteredTools.length} / 32
                </span>
              </div>

              {filteredTools.length === 0 ? (
                <div className="p-6 text-center space-y-2.5">
                  <p className="text-xs font-medium text-slate-600">
                    {t('No tools match this filter.', conv('沒有相符的實戰工具。'))}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('ALL');
                      setSearchQuery('');
                      setPinnedOnly(false);
                    }}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    {t('Show All 32 Tools', conv('重設顯示全部 32 項'))}
                  </button>
                </div>
              ) : (
                <div className="mt-2.5 max-h-[760px] space-y-2 overflow-y-auto pr-1">
                  {filteredTools.map((item) => {
                    const isActive = item.uid === activeToolItem.uid;
                    const isPinned = combinedPinnedIds.includes(item.ref.pinId);
                    return (
                      <article
                        key={item.uid}
                        data-testid={`classified-tool-card-${item.codeBadge}`}
                        className={`rounded-lg border p-3 transition-colors ${
                          isActive
                            ? 'border-teal-600 bg-teal-50/40 ring-1 ring-teal-600/25'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-mono font-bold text-teal-800">
                            {item.codeBadge}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTogglePinTool(item)}
                            aria-pressed={isPinned}
                            className="font-semibold text-slate-500 hover:text-slate-900 whitespace-nowrap"
                          >
                            {isPinned ? t('★ Pinned', conv('★ 已釘選')) : t('☆ Pin', conv('☆ 釘選'))}
                          </button>
                        </div>

                        <h3 className="mt-1 text-xs font-bold leading-snug text-slate-900">
                          {t(item.titleEn, conv(item.titleZh))}
                        </h3>

                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-600">
                          {t(item.whenToUseEn, conv(item.whenToUseZh))}
                        </p>

                        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                          <span className="truncate text-[10px] font-medium text-slate-500">
                            {t(item.deliverableEn, conv(item.deliverableZh))}
                          </span>
                          <button
                            type="button"
                            data-testid={`launch-tool-${item.codeBadge}`}
                            onClick={() => handleLaunchTool(item, true)}
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                              isActive
                                ? 'bg-teal-700 text-white'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                          >
                            <span>{isActive ? t('Active', conv('執行中')) : t('Open', conv('開啟'))}</span>
                            <ArrowRight className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </aside>

            {/* RIGHT PANE: Immediate Above-the-Fold Active Calculator Execution Stage */}
            <section
              id="active-classified-tool-stage"
              data-testid="active-classified-tool-stage"
              aria-label="Active interactive advisory tool stage"
              className="overflow-hidden rounded-xl border border-slate-300 bg-slate-50 lg:col-span-8"
            >
              <div className="flex flex-col gap-2.5 bg-slate-900 px-5 py-3.5 text-white sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-teal-300">
                    <span className="font-mono font-bold">{activeToolItem.codeBadge}</span>
                    <span aria-hidden="true">·</span>
                    <span>{t(activeCategoryMeta.titleEn, conv(activeCategoryMeta.titleZh))}</span>
                  </div>
                  <h2 className="mt-0.5 truncate text-base font-bold text-white">
                    {t(activeToolItem.titleEn, conv(activeToolItem.titleZh))}
                  </h2>
                </div>

                {siblingToolsInActiveCategory.length > 1 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const prevIdx =
                          (currentSiblingIdx - 1 + siblingToolsInActiveCategory.length) %
                          siblingToolsInActiveCategory.length;
                        handleLaunchTool(siblingToolsInActiveCategory[prevIdx], false);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap"
                    >
                      <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                      <span>{t('Prev', conv('上一個'))}</span>
                    </button>
                    <span className="font-mono text-xs text-slate-300 tabular-nums whitespace-nowrap px-1">
                      {currentSiblingIdx + 1}/{siblingToolsInActiveCategory.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextIdx =
                          (currentSiblingIdx + 1) % siblingToolsInActiveCategory.length;
                        handleLaunchTool(siblingToolsInActiveCategory[nextIdx], false);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap"
                    >
                      <span>{t('Next', conv('下一個'))}</span>
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>

              {/* Save Specialist Tool Calculation Snapshot to Active Client Case */}
              <div
                data-testid="save-tool-snapshot-bar"
                className="flex flex-col gap-2.5 border-b border-slate-200 bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <label htmlFor="tool-snapshot-note-input" className="sr-only">
                    {t('Advisor takeaway note for client snapshot', conv('存檔至客戶檔案備註'))}
                  </label>
                  <input
                    id="tool-snapshot-note-input"
                    type="text"
                    value={snapshotNoteDraft}
                    onChange={(e) => setSnapshotNoteDraft(e.target.value)}
                    placeholder={t(
                      `Optional note to attach "${activeToolItem.codeBadge}" to ${activeLead.fullNameEn} (Stage 01C)...`,
                      conv(`輸入顧問結論備註（一鍵將「${activeToolItem.codeBadge}」存入 ${activeLead.fullNameZh} 第 01C 步提案檔案）`)
                    )}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50/60 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  data-testid="save-tool-snapshot-btn"
                  onClick={() => {
                    const activePlanObj = plans.find((p) => p.id === selectedPlanId);
                    const headlineMetric = activePlanObj
                      ? `[${activePlanObj.insurerCode}] ${activePlanObj.nameZh} · 預算 HK$${(
                          activeLead.annualBudgetHkd ?? 48000
                        ).toLocaleString()}`
                      : `${activeLead.fullNameZh} (${activeLead.age}歲) · 預算 HK$${(
                          activeLead.annualBudgetHkd ?? 48000
                        ).toLocaleString()}`;
                    const snap: SavedToolSnapshot = {
                      id: `snap-${Date.now().toString(36)}`,
                      toolCode: activeToolItem.codeBadge,
                      toolTitleZh: activeToolItem.titleZh,
                      toolTitleEn: activeToolItem.titleEn,
                      headlineMetric,
                      advisorNote:
                        snapshotNoteDraft.trim() ||
                        (lang === 'en'
                          ? activeToolItem.deliverableEn
                          : activeToolItem.deliverableZh),
                      savedAtIso: new Date().toISOString(),
                    };
                    onUpdateLead(activeLead.id, (prev) => ({
                      ...prev,
                      savedSnapshots: [
                        snap,
                        ...(prev.savedSnapshots || []).filter((s) => s.toolCode !== snap.toolCode),
                      ].slice(0, 12),
                      lastContactIso: new Date().toISOString(),
                    }));
                    setSnapshotNoteDraft('');
                    setJustSavedSnapshot(true);
                    window.setTimeout(() => setJustSavedSnapshot(false), 2500);
                    onNotify?.(
                      t(
                        `Saved ${snap.toolCode} snapshot to ${activeLead.fullNameEn}'s case file.`,
                        conv(`已將「${snap.toolCode}」專項精算快照存入「${activeLead.fullNameZh}」檔案（可於 01C 檢視）。`)
                      )
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-600 whitespace-nowrap shrink-0"
                >
                  {justSavedSnapshot ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" aria-hidden="true" />
                  ) : (
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {justSavedSnapshot
                      ? t('Saved!', conv('已存入提案！'))
                      : t(
                          `Save to Case (${activeLead.savedSnapshots?.length || 0})`,
                          conv(`存檔至客戶提案 (${activeLead.savedSnapshots?.length || 0})`)
                        )}
                  </span>
                </button>
              </div>

              <div className="p-4 sm:p-5">
                {activeToolItem.ref.engine === 'FN' ? (
                  <FeatureLabView
                    embeddedSingleTool
                    prioritizedIds={prioritizedRoadmapIds}
                    onTogglePrioritize={onTogglePrioritizeRoadmap}
                    totalPlansCount={totalPlansCount}
                    totalInsurersCount={totalInsurersCount}
                    leads={leads}
                    selectedLeadId={selectedLeadId}
                    onSelectLeadId={onSelectLeadId}
                    onUpdateLead={onUpdateLead}
                    plans={plans}
                    selectedPlanId={selectedPlanId}
                    onSelectPlanId={onSelectPlanId}
                    applications={applications}
                    intermediary={intermediary}
                    currency={currency}
                    sumAssuredUsd={sumAssuredUsd}
                    paymentTermYears={paymentTermYears}
                    clientSafeMode={clientSafeMode}
                    onToggleClientSafeMode={onToggleClientSafeMode}
                    activeModuleCode={activeToolItem.ref.code}
                    onSelectModuleCode={(code) => onSelectTool({ engine: 'FN', code })}
                  />
                ) : (
                  <TwentyUpgradesHub
                    embeddedSingleTool
                    activeCode={activeToolItem.ref.code}
                    onSelectCode={(code) => onSelectTool({ engine: 'IMP', code })}
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
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
