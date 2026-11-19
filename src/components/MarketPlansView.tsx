import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Coins,
  Download,
  ExternalLink,
  EyeOff,
  FolderUp,
  Globe,
  Layers,
  LayoutGrid,
  Link2,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Table2,
  X,
} from 'lucide-react';
import {
  calculateCompliantQuote,
  formatPlanForClientSafeMode,
  FX_RATES_FROM_USD,
} from '../domain/actuarialEngine';
import { getSchemeMeta } from '../domain/clientGapEngine';
import { mapPlanCategoryToCrmStandard } from '../domain/planNormalizer';
import { localizePlanStrings, toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  COMPARE_SLOT_CLASSIFICATION,
  HKIA_CENTRAL_GN16_PORTAL_URL,
} from '../domain/planLinksAndOffersEngine';
import { getPlanActionableHyperlinks } from '../domain/crawledPlansMatcher';
import { resolveSpecialOfferWithAdminOverride } from '../domain/proEnhancementsEngine';
import {
  ActuarialQuoteResult,
  ClientLead,
  CurrencyCode,
  InsurancePlan,
  IntermediaryProfile,
  IntermediaryRole,
  LiveMarketSearchResponse,
  PlanCategory,
  PlanLinkAuditResult,
  PolicyApplicationRecord,
  PromoAdminOverride,
} from '../domain/types';
import {
  generateComparisonProposalPdfBytes,
  triggerBrowserDownload,
} from '../services/pdfGenerator';
import {
  buildDeterministicQrMatrix,
  TwentyUpgradeCode,
  WhiteLabelBrandConfig,
} from '../domain/twentyUpgradesEngine';
import {
  LifelongCashValueCurveSvg,
  MarketCoverageVisualBar,
  SurrenderTrajectoryChart,
} from './VisualCharts';
import { PromoAndCommissionBar } from './PromoAndCommissionBar';
import { ShareProposalActionButton } from './ShareProposalActionButton';
import { PlanSubagentLoopsPanel, SubagentLoopPanelTab } from './PlanSubagentLoopsPanel';
import { PowerPackToolId } from '../domain/advisorSixPowerPackEngine';
import {
  AGENT_COMPANY_OPTIONS,
  GuidedStageKey,
  GuidedStepGateResult,
  partitionPlansByAgentCompany,
  resolveAgentCompanyOption,
} from '../domain/guidedWorkflowEngine';
import { GuidedStepFooter } from './GuidedStepFooter';
import { scrollToElementSmooth } from '../utils/clipboardAndDom';

interface MarketPlansViewProps {
  plans: InsurancePlan[];
  intermediary: IntermediaryProfile;
  leads: ClientLead[];
  selectedLeadId: string;
  onSelectLeadId: (leadId: string) => void;
  currency: CurrencyCode;
  onChangeCurrency: (curr: CurrencyCode) => void;
  sumAssuredUsd: number;
  onChangeSumAssuredUsd: (usd: number) => void;
  paymentTermYears: number;
  onChangePaymentTermYears: (yrs: number) => void;
  comparedPlanIds: string[];
  onToggleComparePlan: (planId: string) => void;
  onSetCompareSlotPlan?: (slotIndex: 0 | 1 | 2, planId: string) => void;
  onApplyVerifiedPlanUrls?: (
    planId: string,
    officialUrl: string,
    gn16ReportUrl?: string
  ) => void;
  onLaunchStpForPlan: (planId: string) => void;
  onSaveProposalPdfToDrive: (fileName: string, pdfBytes: Uint8Array) => Promise<void>;
  driveConnected: boolean;
  canShowDrive?: boolean;
  clientSafeMode: boolean;
  onToggleClientSafeMode: () => void;
  onImportDiscoveredPlan: (plan: InsurancePlan) => void;
  customPlans?: InsurancePlan[];
  onUpsertNormalizedPlans?: (plans: InsurancePlan[]) => void;
  fulfillmentStressPercent?: number;
  onChangeFulfillmentStressPercent?: (pct: number) => void;
  onOpenFeatureRoadmap?: () => void;
  whiteLabelConfig?: WhiteLabelBrandConfig;
  onOpenLiveUpgrade?: (code: TwentyUpgradeCode) => void;
  onJumpToClientProfile?: () => void;
  selectedPlanId?: string;
  onSelectPlanId?: (planId: string) => void;
  comboPlanIds?: string[];
  onToggleComboPlan?: (planId: string) => void;
  expressMeetingMode?: boolean;
  promoOverrides?: Record<string, PromoAdminOverride>;
  applications?: PolicyApplicationRecord[];
  onOpenPromoFxConsole?: () => void;
  fxRateStamp?: string;
  onJumpToPlanModule?: (
    sec: 'copilot' | 'calculator' | 'stp' | 'intel' | 'subagents'
  ) => void;
  planUrlOverrides?: Record<string, { officialUrl?: string; gn16ReportUrl?: string }>;
  onApplyBatchVerifiedPlanUrls?: (
    overrides: Record<string, { officialUrl?: string; gn16ReportUrl?: string }>
  ) => void;
  onImportBatchDiscoveredPlans?: (plansToAdd: InsurancePlan[]) => void;
  onSelectPlanAndOpenPowerPack?: (planId: string, toolId?: PowerPackToolId) => void;
  agentCompanyCode?: string | null;
  onChangeAgentCompanyCode?: (code: string | null) => void;
  stepGate?: GuidedStepGateResult;
  onGoNextStage?: (next: GuidedStageKey) => void;
  onNotify?: (msg: string) => void;
}

const CATEGORY_FILTERS: Array<{
  id: 'ALL' | PlanCategory;
  labelEn: string;
  labelZhHk: string;
}> = [
  { id: 'ALL', labelEn: 'All Plans', labelZhHk: '全部計劃' },
  {
    id: PlanCategory.PARTICIPATING_SAVINGS,
    labelEn: 'Savings',
    labelZhHk: '分紅儲蓄',
  },
  {
    id: PlanCategory.CRITICAL_ILLNESS,
    labelEn: 'Critical Illness',
    labelZhHk: '危疾保障',
  },
  { id: PlanCategory.VHIS, labelEn: 'VHIS Medical', labelZhHk: '自願醫保' },
  {
    id: PlanCategory.HIGH_END_MEDICAL,
    labelEn: 'High-End & Outpatient',
    labelZhHk: '高端及門診',
  },
  { id: PlanCategory.QDAP, labelEn: 'QDAP Annuity', labelZhHk: '扣稅年金' },
  {
    id: PlanCategory.UNIVERSAL_LIFE,
    labelEn: 'Universal Life',
    labelZhHk: '萬用壽險',
  },
  { id: PlanCategory.TERM_LIFE, labelEn: 'Term Life', labelZhHk: '定期人壽' },
  {
    id: PlanCategory.GENERAL_GI,
    labelEn: 'Travel, Home & GI',
    labelZhHk: '旅遊家居一般險',
  },
];

const QUICK_LIVE_SEARCH_PROMPTS = [
  'CTF Life 周大福人壽 multi-currency savings',
  'Chubb Life 安達人壽 critical illness',
  'Transamerica HK indexed universal life',
  'Allianz Hong Kong VHIS medical plan',
];

export const MarketPlansView: React.FC<MarketPlansViewProps> = ({
  plans,
  intermediary,
  leads,
  selectedLeadId,
  onSelectLeadId,
  currency,
  onChangeCurrency,
  sumAssuredUsd,
  onChangeSumAssuredUsd,
  paymentTermYears,
  onChangePaymentTermYears,
  comparedPlanIds,
  onToggleComparePlan,
  onSetCompareSlotPlan,
  onApplyVerifiedPlanUrls,
  onLaunchStpForPlan,
  onSaveProposalPdfToDrive,
  driveConnected,
  canShowDrive = false,
  clientSafeMode,
  onToggleClientSafeMode,
  onImportDiscoveredPlan,
  customPlans = [],
  onUpsertNormalizedPlans,
  fulfillmentStressPercent = 100,
  onChangeFulfillmentStressPercent,
  onOpenFeatureRoadmap: _onOpenFeatureRoadmap,
  whiteLabelConfig,
  onOpenLiveUpgrade,
  onJumpToClientProfile: _onJumpToClientProfile,
  selectedPlanId = '',
  onSelectPlanId,
  comboPlanIds = [],
  onToggleComboPlan,
  expressMeetingMode = false,
  promoOverrides,
  applications = [],
  onOpenPromoFxConsole,
  fxRateStamp,
  onJumpToPlanModule,
  planUrlOverrides = {},
  onApplyBatchVerifiedPlanUrls,
  onImportBatchDiscoveredPlans,
  onSelectPlanAndOpenPowerPack,
  agentCompanyCode = 'AIA',
  onChangeAgentCompanyCode,
  stepGate,
  onGoNextStage,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zhHk: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | PlanCategory>('ALL');
  const [insurerFilter, setInsurerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [cardDisplayLimit, setCardDisplayLimit] = useState<number>(12);
  const [showAllInsurersStrip, setShowAllInsurersStrip] = useState<boolean>(false);
  const [showPromoCommissionBar, setShowPromoCommissionBar] = useState<boolean>(false);
  const [showInsurerDirectory, setShowInsurerDirectory] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [uploadingDrivePdf, setUploadingDrivePdf] = useState(false);
  const [moreToolsMenuOpen, setMoreToolsMenuOpen] = useState(false);
  const [subagentPanelOpen, setSubagentPanelOpen] = useState(false);
  const [subagentPanelTab, setSubagentPanelTab] = useState<SubagentLoopPanelTab>('links');

  // Sub-AI Agent: Official Product Brochure & GN16 Link Finder + Reviewer State
  const [linkAuditModalPlan, setLinkAuditModalPlan] = useState<InsurancePlan | null>(null);
  const [linkAuditLoading, setLinkAuditLoading] = useState<boolean>(false);
  const [linkAuditResult, setLinkAuditResult] = useState<PlanLinkAuditResult | null>(null);
  const [linkAuditError, setLinkAuditError] = useState<string | null>(null);

  // Live Google Search Plan Discovery Drawer State
  const [liveDrawerOpen, setLiveDrawerOpen] = useState(false);
  const [liveQuery, setLiveQuery] = useState('');
  const [liveSearching, setLiveSearching] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveResult, setLiveResult] = useState<LiveMarketSearchResponse | null>(null);

  // Gemini API Policy Feature Analyzer & CRM Plan Normalizer State
  const [normalizerOpen, setNormalizerOpen] = useState(false);
  const [rawImportText, setRawImportText] = useState('');
  const [normalizing, setNormalizing] = useState(false);
  const [normalizerError, setNormalizerError] = useState<string | null>(null);
  const [normalizedAudit, setNormalizedAudit] = useState<
    Array<{
      id: string;
      nameEn: string;
      assignedCrmCategory: string;
      assignedEngineCategory: string;
      standardizedHighlightsEn: string[];
      standardizedHighlightsZh: string[];
      confidenceReason: string;
      engineMode: string;
    }>
  >([]);

  const activeLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || leads[0],
    [leads, selectedLeadId]
  );

  // Deterministic insurer index map + per-insurer plan counts
  const insurerOptions = useMemo(() => {
    const map = new Map<
      string,
      { code: string; nameEn: string; nameZh: string; count: number }
    >();
    for (const p of plans) {
      const existing = map.get(p.insurerCode);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(p.insurerCode, {
          code: p.insurerCode,
          nameEn: p.insurerNameEn,
          nameZh: p.insurerNameZh,
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [plans]);

  const insurerIndexLookup = useMemo(() => {
    const idxMap: Record<string, number> = {};
    insurerOptions.forEach((ins, idx) => {
      idxMap[ins.code] = idx;
    });
    return idxMap;
  }, [insurerOptions]);

  const fx = FX_RATES_FROM_USD[currency];
  const displaySumAssured = Math.round(sumAssuredUsd * fx);

  const quotedPlans = useMemo(() => {
    return plans.map((plan) => {
      const effectiveTerm = plan.supportedPaymentTerms.includes(paymentTermYears)
        ? paymentTermYears
        : plan.supportedPaymentTerms[plan.supportedPaymentTerms.length - 1];
      const quote = calculateCompliantQuote({
        plan,
        age: activeLead?.age ?? 35,
        isSmoker: activeLead?.isSmoker ?? false,
        currency,
        sumAssuredInSelectedCurrency: displaySumAssured,
        paymentTermYears: effectiveTerm,
        fulfillmentStressPercent,
      });
      return { plan, quote };
    });
  }, [
    plans,
    activeLead,
    currency,
    displaySumAssured,
    paymentTermYears,
    fulfillmentStressPercent,
  ]);

  const filteredPlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return quotedPlans.filter(({ plan }) => {
      if (categoryFilter !== 'ALL' && plan.category !== categoryFilter) {
        return false;
      }
      if (insurerFilter !== 'ALL' && plan.insurerCode !== insurerFilter) {
        return false;
      }
      if (!q) return true;
      const tradBlob = `${plan.insurerCode} ${plan.insurerNameEn} ${plan.insurerNameZh} ${plan.nameEn} ${plan.nameZh} ${plan.categoryLabelEn} ${plan.categoryLabelZh}`;
      const blob = `${tradBlob} ${toSimplifiedChinese(tradBlob)}`.toLowerCase();
      return blob.includes(q);
    });
  }, [quotedPlans, categoryFilter, insurerFilter, searchQuery]);

  const activeAgentCompanyOpt = useMemo(
    () => resolveAgentCompanyOption(agentCompanyCode ?? null),
    [agentCompanyCode]
  );

  const partitionedFilteredPlans = useMemo(
    () => partitionPlansByAgentCompany(filteredPlans, agentCompanyCode ?? null),
    [filteredPlans, agentCompanyCode]
  );

  const quotedById = useMemo(() => {
    const map = new Map<string, { plan: InsurancePlan; quote: ActuarialQuoteResult }>();
    for (const item of quotedPlans) {
      map.set(item.plan.id, item);
    }
    return map;
  }, [quotedPlans]);

  // Preserve exact 1–3 comparison slot order (Slot 0 = Red, Slot 1 = Blue, Slot 2 = Yellow)
  const selectedComparisonItems = useMemo(() => {
    return comparedPlanIds
      .slice(0, 3)
      .map((id, idx) => {
        const found = quotedById.get(id);
        if (!found) return null;
        return {
          ...found,
          slotIndex: idx as 0 | 1 | 2,
        };
      })
      .filter((x): x is { plan: InsurancePlan; quote: ActuarialQuoteResult; slotIndex: 0 | 1 | 2 } =>
        Boolean(x)
      );
  }, [quotedById, comparedPlanIds]);

  const existingPlanIds = useMemo(() => new Set(plans.map((p) => p.id)), [plans]);

  const runPlanLinkSubAgentAudit = async (targetPlan: InsurancePlan) => {
    setLinkAuditModalPlan(targetPlan);
    setLinkAuditLoading(true);
    setLinkAuditError(null);
    setLinkAuditResult(null);
    try {
      const res = await fetch('/api/ai/verify-plan-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan, language: lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Link audit sub-agent request failed.');
      }
      setLinkAuditResult(data as PlanLinkAuditResult);
    } catch (err: any) {
      setLinkAuditError(
        err?.message || 'Unable to run official link verification sub-agent.'
      );
    } finally {
      setLinkAuditLoading(false);
    }
  };

  const executeLiveMarketSearch = async (targetQuery: string) => {
    const q = targetQuery.trim();
    if (!q) return;
    setLiveQuery(q);
    setLiveSearching(true);
    setLiveError(null);
    try {
      const res = await fetch('/api/market/live-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Live market search failed.');
      }
      setLiveResult(data as LiveMarketSearchResponse);
    } catch (err: any) {
      setLiveError(err?.message || 'Unable to reach live market search service.');
    } finally {
      setLiveSearching(false);
    }
  };

  const runGeminiPlanNormalization = async (mode: 'PASTE_TEXT' | 'EXISTING_CRM_CUSTOM') => {
    setNormalizing(true);
    setNormalizerError(null);
    try {
      const payload =
        mode === 'EXISTING_CRM_CUSTOM'
          ? {
              plans:
                customPlans.length > 0
                  ? customPlans.map((p) => ({
                      id: p.id,
                      insurerCode: p.insurerCode,
                      insurerNameEn: p.insurerNameEn,
                      insurerNameZh: p.insurerNameZh,
                      nameEn: p.nameEn,
                      nameZh: p.nameZh,
                      rawCategoryText: p.category,
                      rawFeaturesText: [
                        p.waitingPeriodText,
                        ...(p.highlights || []),
                        ...(p.keyHighlightsEn || []),
                      ].join('; '),
                      currencies: p.currencies,
                      fulfillmentRatio: p.fulfillmentRatio,
                      rawProjectedIrr: p.rawProjectedIrr,
                      guaranteedIrr: p.guaranteedIrr,
                      supportedPaymentTerms: p.supportedPaymentTerms,
                      waitingPeriodText: p.waitingPeriodText,
                    }))
                  : undefined,
              rawText:
                customPlans.length === 0
                  ? [
                      'AIA | On Your Side Plan 2 | 愛伴航—首護摯寶2 | Covers 115 critical illnesses, early-stage cancer & stroke recurrence up to 900% sum assured with future premium waiver',
                      'Sun Life | SunJoy Global II | 萬年青星河尊享2 | Multi-currency participating wealth accumulation in 8 currencies, Year-3 policy split and terminal bonus lock-in',
                      'Bupa | Bupa Hero VHIS Flexi | 保柏非凡自願醫保 | HKSAR certified VHIS semi-private full surgical cover up to HK$40M/yr, cashless LOG & HK$8,000 tax relief',
                      'BOC Life | i-Care Term Life | 智守護定期壽險 | Pure level-premium term life death benefit protection up to age 80 for family mortgage hedge',
                    ].join('\n')
                  : '',
            }
          : { rawText: rawImportText };

      const res = await fetch('/api/ai/normalize-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Plan normalization failed.');
      }
      const returnedPlans = (data?.normalizedPlans || []) as InsurancePlan[];
      setNormalizedAudit(data?.auditEntries || []);
      if (returnedPlans.length > 0) {
        if (onUpsertNormalizedPlans) {
          onUpsertNormalizedPlans(returnedPlans);
        } else {
          returnedPlans.forEach((p) => onImportDiscoveredPlan(p));
        }
      }
    } catch (err: any) {
      setNormalizerError(err?.message || 'Unable to normalize insurance plans.');
    } finally {
      setNormalizing(false);
    }
  };

  const handleDownloadComparisonPdf = async () => {
    if (selectedComparisonItems.length === 0) return;
    setExportingPdf(true);
    try {
      const qrMatrix = whiteLabelConfig?.enabled
        ? buildDeterministicQrMatrix(
            `${whiteLabelConfig.practiceTitleEn}|${whiteLabelConfig.contactChannelLabel}|${intermediary.iaLicenseNo}`
          )
        : undefined;
      const bytes = await generateComparisonProposalPdfBytes({
        clientName: `${activeLead.fullNameEn} (${activeLead.fullNameZh})`,
        age: activeLead.age,
        currency,
        items: selectedComparisonItems,
        intermediary,
        whiteLabel: whiteLabelConfig,
        qrMatrix,
      });
      triggerBrowserDownload(
        `HK_Comparison_Proposal_${activeLead.fullNameEn.replace(/\s+/g, '_')}.pdf`,
        bytes,
        'application/pdf'
      );
    } finally {
      setExportingPdf(false);
    }
  };

  const handleSaveComparisonToDrive = async () => {
    if (selectedComparisonItems.length === 0) return;
    setUploadingDrivePdf(true);
    try {
      const qrMatrix = whiteLabelConfig?.enabled
        ? buildDeterministicQrMatrix(
            `${whiteLabelConfig.practiceTitleEn}|${whiteLabelConfig.contactChannelLabel}|${intermediary.iaLicenseNo}`
          )
        : undefined;
      const bytes = await generateComparisonProposalPdfBytes({
        clientName: `${activeLead.fullNameEn} (${activeLead.fullNameZh})`,
        age: activeLead.age,
        currency,
        items: selectedComparisonItems,
        intermediary,
        whiteLabel: whiteLabelConfig,
        qrMatrix,
      });
      await onSaveProposalPdfToDrive(
        `HK_Comparison_Proposal_${activeLead.fullNameEn.replace(/\s+/g, '_')}.pdf`,
        bytes
      );
    } finally {
      setUploadingDrivePdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Top Controls */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 2xl:flex-row 2xl:items-end 2xl:justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-slate-900"
            style={{ textWrap: 'balance' }}
          >
            {t(
              'All-Market Hong Kong Plan Aggregator & Actuarial Comparator',
              '全香港保險產品精算比較及報價引擎'
            )}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {t(
              `${plans.length} plans across ${insurerOptions.length} HKIA-authorized insurers (Life, VHIS, High-End Medical, QDAP, UL & General GI) · GL28 IRR Caps (6.00% HKD / 6.50% Non-HKD)`,
              `全市場匯聚 ${insurerOptions.length} 間獲授權香港保險公司、共 ${plans.length} 款保險計劃（涵蓋儲蓄、危疾、自願醫保、高端醫療、扣稅年金、萬用壽險、定期壽險及旅遊／家傭／家居一般保險）`
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Currency Switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            {(['USD', 'HKD', 'RMB'] as CurrencyCode[]).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => onChangeCurrency(curr)}
                className={`rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  currency === curr
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          {!expressMeetingMode && (
            <>
              <button
                type="button"
                data-testid="market-open-subagent-links-btn"
                onClick={() => {
                  if (subagentPanelOpen && subagentPanelTab === 'links') {
                    setSubagentPanelOpen(false);
                  } else {
                    setSubagentPanelTab('links');
                    setSubagentPanelOpen(true);
                  }
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  subagentPanelOpen && subagentPanelTab === 'links'
                    ? 'border-teal-700 bg-teal-700 text-white'
                    : 'border-teal-300 bg-teal-50/70 text-teal-900 hover:bg-teal-100'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Hyperlink QA Loop', '超連結巡檢修復')}</span>
              </button>

              <button
                type="button"
                data-testid="market-open-subagent-missing-btn"
                onClick={() => {
                  if (subagentPanelOpen && subagentPanelTab === 'missing') {
                    setSubagentPanelOpen(false);
                  } else {
                    setSubagentPanelTab('missing');
                    setSubagentPanelOpen(true);
                  }
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  subagentPanelOpen && subagentPanelTab === 'missing'
                    ? 'border-[#0B172A] bg-[#0B172A] text-[#F3D37A]'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                <span>{t('Search Missing Plans', '搜尋未收錄新計劃')}</span>
              </button>
            </>
          )}

          {onOpenPromoFxConsole && !expressMeetingMode && (
            <button
              type="button"
              data-testid="market-open-fx-promo-btn"
              onClick={onOpenPromoFxConsole}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              title={fxRateStamp || 'Manage Live FX Rate-Lock & Quarterly Insurer Promos'}
            >
              <Coins className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
              <span>{t('FX & Promo Console', '匯率鎖定／推廣維護')}</span>
            </button>
          )}

          {/* Single Clean Disclosure Menu for Import / Live Search / Client Safe Mode */}
          {!expressMeetingMode && (
            <div className="relative">
              <button
                type="button"
                data-testid="market-advanced-tools-btn"
                aria-expanded={moreToolsMenuOpen}
                onClick={() => setMoreToolsMenuOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  clientSafeMode
                    ? 'border-amber-600 bg-amber-50 text-amber-900'
                    : moreToolsMenuOpen || normalizerOpen || liveDrawerOpen
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {clientSafeMode
                    ? t('Safe Mode ON · Tools', '匿名模式中 · 進階工具')
                    : t('Import & Privacy Tools', '進階匯入與匿名工具')}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${moreToolsMenuOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {moreToolsMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl space-y-1"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onToggleClientSafeMode();
                      setMoreToolsMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold ${
                      clientSafeMode
                        ? 'bg-amber-50 text-amber-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t('Client Safe Mode Lock', '見客匿名保密鎖')}</span>
                    </span>
                    <span className="font-mono text-[10px]">
                      {clientSafeMode ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setLiveDrawerOpen((prev) => !prev);
                      setMoreToolsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Globe className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
                    <span>{t('Live Google Search Plans', 'Google 實時搜尋新計劃')}</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setNormalizerOpen((prev) => !prev);
                      setMoreToolsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                    <span>{t('AI Standardize & Import', 'AI 保單分類標準化匯入')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* External Client Safe Mode Notice Banner */}
      {clientSafeMode && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-950">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <span className="font-semibold">
              {t('Client Safe Mode ON:', '見客保密模式已開啟：')}
            </span>{' '}
            {t(
              'Non-appointed competitor insurer names are masked as neutral Market Peer A/B benchmarks for iPad client sharing, and private FYC commissions are hidden.',
              '非委任保險公司及產品名稱已自動隱藏為「同業計劃 A／B」，同時收起顧問私人佣金數字，方便同客一齊睇 iPad 比較。'
            )}
          </div>
        </div>
      )}

      {/* Slim Synced Plan & 6-Stage Quick Jump Strip + Conditional Special Offer Banner */}
      {activeLead && (() => {
        const schemeMeta = getSchemeMeta(activeLead.targetSchemeId);
        const lockedPlan = selectedPlanId
          ? plans.find((p) => p.id === selectedPlanId) || null
          : null;
        const lockedPlanLoc = lockedPlan ? localizePlanStrings(lockedPlan, lang) : null;
        const activeSpecialOffer = resolveSpecialOfferWithAdminOverride(
          lockedPlan,
          promoOverrides
        );
        const activeComboPlans = comboPlanIds
          .filter((cid) => cid && cid !== selectedPlanId)
          .map((cid) => plans.find((p) => p.id === cid))
          .filter((p): p is InsurancePlan => Boolean(p));
        const targetCategory: PlanCategory =
          schemeMeta.id === 'VHIS_HIGH_END'
            ? PlanCategory.HIGH_END_MEDICAL
            : schemeMeta.id === 'MULTI_FX_LEGACY'
            ? PlanCategory.PARTICIPATING_SAVINGS
            : PlanCategory.CRITICAL_ILLNESS;
        return (
          <div className="space-y-3">
            <section
              data-testid="market-locked-plan-strip"
              className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {lockedPlan && lockedPlanLoc ? (
                  <>
                    <span className="font-bold text-emerald-800">
                      {t('Active Main Plan:', '已鎖定主推：')} [{lockedPlan.insurerCode}] {lockedPlanLoc.planName}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600">{lockedPlanLoc.categoryLabel}</span>
                  </>
                ) : (
                  <span className="font-medium text-slate-700">
                    {t(
                      'Click "Set Active Plan" on any plan below, and optionally "+ Combo" to bundle up to 2 complementary plans across Stages 01–05.',
                      '點擊下方產品卡「設為主推計劃」，並可點選「+ 組合」配搭最多 2 款互補副約保單（如儲蓄＋自願醫保＋危疾），即時同步 01–05。'
                    )}
                  </span>
                )}
                {activeComboPlans.length > 0 && (
                  <span className="inline-flex flex-wrap items-center gap-1.5 font-semibold text-indigo-800">
                    <span className="text-slate-400">·</span>
                    <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {t('Combo Portfolio:', '多保單組合：')} +
                      {activeComboPlans
                        .map((cp) => `[${cp.insurerCode}] ${lang === 'en' ? cp.nameEn : cp.nameZh}`)
                        .join(' + ')}
                    </span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter(targetCategory);
                    setCardDisplayLimit(60);
                    onNotify?.(
                      t(
                        `Filtered catalog to match ${schemeMeta.titleEn}.`,
                        `已篩選符合「${schemeMeta.titleZh}」之香港產品類別。`
                      )
                    );
                  }}
                  className="rounded-lg border border-teal-700 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50 whitespace-nowrap"
                >
                  {t('Match Target Scheme', '篩選目標架構產品')}
                </button>

                {selectedComparisonItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => scrollToElementSmooth('side-by-side-comparison')}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap tabular-nums"
                  >
                    {t(
                      `3-Plan Compare (${selectedComparisonItems.length}/3) ↓`,
                      `查看三方案比較表 (${selectedComparisonItems.length}/3) ↓`
                    )}
                  </button>
                )}

                {onJumpToPlanModule && lockedPlan && (
                  <button
                    type="button"
                    data-testid="market-locked-next-step-btn"
                    onClick={() => onJumpToPlanModule('calculator')}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#0B172A] px-3 py-1.5 text-xs font-semibold text-[#F3D37A] hover:bg-[#162B4A] whitespace-nowrap"
                  >
                    <span>{t('Next: 03 Configure Riders & LOG', '下一步：03 配置附約與免找數')}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </section>

            {/* CONDITIONAL SPECIAL OFFER BANNER — ONLY SHOWN WHEN THE SELECTED PLAN HAS AN ACTIVE SPECIAL OFFER */}
            {lockedPlan && lockedPlanLoc && activeSpecialOffer && (
              <section
                data-testid="market-special-offer-banner"
                aria-label="Selected insurance plan seasonal special offer"
                className="flex flex-col gap-3 rounded-xl border border-amber-300/80 bg-white px-4 py-3.5 shadow-2xs lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-0.5 text-xs">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-slate-900">
                    <span className="font-bold text-slate-900">
                      {t('Seasonal Closing Lever:', '本季促單實戰利器：')}
                    </span>
                    <span className="font-semibold text-amber-900">
                      {lang === 'en'
                        ? activeSpecialOffer.headlineEn
                        : lang === 'zh-CN'
                        ? toSimplifiedChinese(activeSpecialOffer.headlineZh)
                        : activeSpecialOffer.headlineZh}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    [{lockedPlan.insurerCode}] {lockedPlanLoc.planName} ·{' '}
                    {lang === 'en'
                      ? activeSpecialOffer.conditionNoteEn
                      : lang === 'zh-CN'
                      ? toSimplifiedChinese(activeSpecialOffer.conditionNoteZh)
                      : activeSpecialOffer.conditionNoteZh}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {onOpenPromoFxConsole && !expressMeetingMode && (
                    <button
                      type="button"
                      onClick={onOpenPromoFxConsole}
                      className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                    >
                      {t('Edit Rebate / Archive', '調整回贈／下架')}
                    </button>
                  )}
                  {onOpenLiveUpgrade && !expressMeetingMode && (
                    <button
                      type="button"
                      data-testid="special-offer-imp15-btn"
                      onClick={() => onOpenLiveUpgrade('IMP-15')}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                    >
                      {t('Rebate + Prepaid Calc', '回贈 + 預繳鎖息計算')}
                    </button>
                  )}
                  {onOpenLiveUpgrade && (
                    <button
                      type="button"
                      data-testid="special-offer-imp01-btn"
                      onClick={() => onOpenLiveUpgrade('IMP-01')}
                      className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
                    >
                      {t('Create Client Microsite', '生成客戶互動微網頁')}
                    </button>
                  )}
                </div>
              </section>
            )}
          </div>
        );
      })()}

      {/* Advisor Private FYC/MDRT Estimator & Quarterly Promo Tracker (Collapsed by Default to Keep Stage 02 Focused) */}
      {!expressMeetingMode && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">
                {t('Optional Tools (Click to Expand):', '進階工具（預設收起，保持畫面簡潔）：')}
              </span>
              <button
                type="button"
                data-testid="toggle-stage2-promo-bar-btn"
                onClick={() => setShowPromoCommissionBar((prev) => !prev)}
                className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
              >
                {showPromoCommissionBar
                  ? t('Hide FYC & Quarterly Promos', '收起佣金與季度優惠')
                  : t('Show FYC & Quarterly Promos', '展開佣金估算與季度優惠')}
              </button>
              <button
                type="button"
                data-testid="toggle-stage2-insurer-dir-btn"
                onClick={() => setShowInsurerDirectory((prev) => !prev)}
                className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
              >
                {showInsurerDirectory
                  ? t('Hide 40-Insurer Coverage Bar', '收起全港保司分佈圖')
                  : t(`Show ${insurerOptions.length}-Insurer Coverage Bar`, `展開全港 ${insurerOptions.length} 間保司篩選列`)}
              </button>
            </div>
            <span className="text-[11px] text-slate-500">
              {t('Step Goal: Select 1 active main plan below', '本步目標：在下方點選 1 款主推計劃即可解鎖「下一步」')}
            </span>
          </div>

          {showPromoCommissionBar &&
            (() => {
              const promoFocusItem =
                (selectedPlanId ? quotedById.get(selectedPlanId) : undefined) ||
                selectedComparisonItems[0] ||
                quotedPlans[0];
              if (!promoFocusItem) return null;
              return (
                <PromoAndCommissionBar
                  activePlan={promoFocusItem.plan}
                  activeAnnualPremium={promoFocusItem.quote.annualPremium}
                  currency={currency}
                  paymentTermYears={promoFocusItem.quote.paymentTermYears}
                  clientNameZh={activeLead?.fullNameZh || '客戶'}
                  clientSafeMode={clientSafeMode}
                  onToggleClientSafeMode={onToggleClientSafeMode}
                  promoOverrides={promoOverrides}
                  applications={applications}
                  onSelectInsurerFilter={(code) => {
                    setInsurerFilter(code);
                    setCardDisplayLimit(12);
                    onNotify?.(
                      t(
                        `Filtered catalog by insurer ${code}.`,
                        `已篩選「${code}」旗下保險計劃。`
                      )
                    );
                  }}
                  onNotify={onNotify}
                />
              );
            })()}
        </div>
      )}

      {/* Multi-Subagent Hyperlink Review & Fix Loop + Unadded Plan Search/Review/Import Loop */}
      {subagentPanelOpen && !expressMeetingMode && (
        <PlanSubagentLoopsPanel
          plans={plans}
          initialTab={subagentPanelTab}
          existingOverrides={planUrlOverrides}
          onApplyBatchVerifiedUrls={(batch) => {
            if (onApplyBatchVerifiedPlanUrls) {
              onApplyBatchVerifiedPlanUrls(batch);
            } else if (onApplyVerifiedPlanUrls) {
              Object.entries(batch).forEach(([pid, urls]) => {
                if (urls.officialUrl) {
                  onApplyVerifiedPlanUrls(pid, urls.officialUrl, urls.gn16ReportUrl);
                }
              });
            }
          }}
          onImportSinglePlan={onImportDiscoveredPlan}
          onImportBatchPlans={(batch) => {
            if (onImportBatchDiscoveredPlans) {
              onImportBatchDiscoveredPlans(batch);
            } else if (onUpsertNormalizedPlans) {
              onUpsertNormalizedPlans(batch);
            } else {
              batch.forEach((p) => onImportDiscoveredPlan(p));
            }
          }}
          onSelectPlanAndOpenPowerPack={onSelectPlanAndOpenPowerPack}
          onNotify={onNotify}
        />
      )}

      {/* Gemini API Policy Feature Analyzer & CRM Plan Normalizer Panel */}
      {normalizerOpen && (
        <section
          aria-label="Gemini API Policy Feature Analyzer and CRM Plan Normalizer"
          className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t(
                  'Gemini API Policy Feature Analyzer — Auto-Assign CRM Category & Standardized Highlights',
                  'Gemini AI 保單特徵分析引擎 — 自動歸類 CRM 類別及生成標準化三點亮點'
                )}
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                {t(
                  'Analyzes unstructured brochure text, CSV lines, or imported JSON plans via Gemini 3.8 Flash (or CLI `npm run normalize:plans`) to assign standardized CRM categories (Critical Illness, Life, Medical, Savings, Tax Annuity, General Insurance) and uniform 3-point highlights.',
                  '透過 Gemini 3.8 Flash（亦支援終端機指令 `npm run normalize:plans`）分析原始小冊子文字或匯入保單，自動歸入統一 CRM 類別（危疾、人壽、醫療、儲蓄、扣稅年金、一般保險）並生成標準化三段式亮點。'
                )}
              </p>
            </div>
            <button
              type="button"
              disabled={normalizing}
              onClick={() => runGeminiPlanNormalization('EXISTING_CRM_CUSTOM')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {normalizing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
              )}
              <span>
                {customPlans.length > 0
                  ? t(
                      `Re-Standardize ${customPlans.length} Imported Plans`,
                      `一鍵標準化現有 ${customPlans.length} 款匯入計劃`
                    )
                  : t(
                      'Demo: Normalize 4 Sample Imported Plans',
                      '示範：AI 自動分類 4 款匯入保單'
                    )}
              </span>
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="raw-plan-features-textarea"
                className="text-xs font-semibold text-slate-700"
              >
                {t(
                  'Paste Raw Brochure Copy, JSON Array, or Pipe Lines (Insurer | Plan EN | Plan ZH | Policy Features)',
                  '貼上保單小冊子原文、JSON 或分隔行（保司｜英文名｜中文名｜保障特徵描述）'
                )}
              </label>
              <button
                type="button"
                onClick={() =>
                  setRawImportText(
                    [
                      'FWD | Crisis USupporter Pro | 危疾應援保（升級版） | Lump-sum cover across 68 major critical illnesses, early carcinoma-in-situ & ICU stay protection with future premium waiver.',
                      'Prudential | PRUHealth VHIS VIP | 保誠自願醫保尚賓計劃 | Certified VHIS private/semi-private hospital cashless LOG, full cover on surgery & prescribed non-surgical cancer therapy, HK$8,000 tax relief.',
                      'AXA | Wealth Ultra Savings | 安進儲蓄系列—躍進 | Multi-currency participating wealth accumulation in 9 currencies, policy split option & flexible retirement withdrawal.',
                      'Manulife | ManuTerm Level Life | 宏利定期壽險計劃 | Pure level-premium term life death benefit protection without savings component, ideal for 10x income & mortgage hedge.',
                    ].join('\n')
                  )
                }
                className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
              >
                {t('Fill 4 Unclassified Plans (CI / Medical / Savings / Life)', '填入 4 款未分類原始保單範例')}
              </button>
            </div>
            <textarea
              id="raw-plan-features-textarea"
              rows={4}
              value={rawImportText}
              onChange={(e) => setRawImportText(e.target.value)}
              placeholder="AIA | On Your Side Plan 2 | 愛伴航2 | Lump-sum critical illness & cancer recurrence cover..."
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={normalizing || !rawImportText.trim()}
                onClick={() => runGeminiPlanNormalization('PASTE_TEXT')}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
              >
                {normalizing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    <span>{t('Analyzing Policy Features...', 'AI 分析保單特徵中...')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {t(
                        'Analyze & Import Plans',
                        '分析並匯入保單資料'
                      )}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {normalizerError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {normalizerError}
            </p>
          )}

          {normalizedAudit.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 pl-3 pr-2 font-semibold">{t('Imported Plan', '匯入計劃')}</th>
                    <th className="py-2.5 px-2 font-semibold">{t('Assigned CRM Category', 'AI 指派 CRM 類別')}</th>
                    <th className="py-2.5 px-2 font-semibold">
                      {t('Standardized CRM Highlights (EN / ZH)', '標準化三點式 CRM 亮點')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {normalizedAudit.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2.5 pl-3 pr-2 align-top font-semibold text-slate-900">
                        <div>{row.nameEn}</div>
                        <div className="font-mono text-[11px] font-normal text-slate-500">
                          {row.id} · {row.engineMode}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 align-top whitespace-nowrap">
                        <span className="font-mono font-bold text-blue-700">
                          {row.assignedCrmCategory}
                        </span>
                        <div className="font-mono text-[11px] text-slate-500">
                          {row.assignedEngineCategory}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 align-top text-slate-700">
                        <ul className="space-y-0.5">
                          {(lang === 'en'
                            ? row.standardizedHighlightsEn
                            : row.standardizedHighlightsZh
                          ).map((h, i) => (
                            <li key={i}>• {lang === 'zh-CN' ? toSimplifiedChinese(h) : h}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Collapsible Live Google Search Grounding Plan Discovery Panel */}
      {liveDrawerOpen && (
        <section
          aria-label="Live Google Search HK insurance plan discovery"
          className="rounded-xl border border-blue-200 bg-white p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Live Google Search Grounding — Discover More Hong Kong Insurer Plans
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Powered by Gemini Google Search grounding to retrieve additional HKIA-authorized insurer plans with cited web sources and 1-click import into your workspace catalog.
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeLiveMarketSearch(liveQuery.trim() || QUICK_LIVE_SEARCH_PROMPTS[0]);
            }}
            className="mt-4 flex flex-col gap-2.5 sm:flex-row"
          >
            <label htmlFor="live-google-plan-query" className="sr-only">
              Search Hong Kong insurers and plans via Google Search
            </label>
            <input
              id="live-google-plan-query"
              type="text"
              value={liveQuery}
              onChange={(e) => setLiveQuery(e.target.value)}
              placeholder="e.g., CTF Life 周大福人壽 savings, Allianz HK VHIS, Transamerica Universal Life..."
              className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={liveSearching}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {liveSearching ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>Searching HK Web...</span>
                </>
              ) : (
                <>
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Search HK Market</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500">Quick Search:</span>
            {QUICK_LIVE_SEARCH_PROMPTS.map((qText) => (
              <button
                key={qText}
                type="button"
                onClick={() => executeLiveMarketSearch(qText)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
              >
                {qText}
              </button>
            ))}
          </div>

          {liveError && (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {liveError}
            </p>
          )}

          {liveResult && (
            <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                <span className="font-semibold text-slate-900">
                  {liveResult.sourceMode === 'google-search-live'
                    ? 'Google Search Grounded Summary:'
                    : 'HK Authorized Insurer Index Summary:'}
                </span>{' '}
                {liveResult.marketSummary}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {liveResult.discoveredPlans.map((dPlan) => {
                  const alreadyAdded = existingPlanIds.has(dPlan.id);
                  return (
                    <div
                      key={dPlan.id}
                      className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4"
                    >
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500">
                          {dPlan.insurerNameEn} · {dPlan.insurerNameZh} · {dPlan.categoryLabelEn}
                        </div>
                        <h3 className="mt-1 text-sm font-bold text-slate-900">{dPlan.nameEn}</h3>
                        <p className="text-xs font-medium text-slate-600">{dPlan.nameZh}</p>
                        <ul className="mt-2 space-y-1 text-xs text-slate-600">
                          {dPlan.keyHighlightsEn.slice(0, 2).map((hl, i) => (
                            <li key={i}>• {hl}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        {dPlan.officialUrl ? (
                          <a
                            href={dPlan.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline"
                          >
                            <span>Official Source</span>
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400">HKIA Authorized</span>
                        )}

                        <button
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => onImportDiscoveredPlan(dPlan)}
                          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                            alreadyAdded
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-slate-900 text-white hover:bg-slate-800'
                          }`}
                        >
                          {alreadyAdded ? (
                            <>
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Added to Catalog</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Import into Catalog</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {liveResult.sources.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-semibold text-slate-500">
                    Grounded Web Sources (Google Search Citations):
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                    {liveResult.sources.map((src, idx) => (
                      <a
                        key={`${src.uri}-${idx}`}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
                      >
                        <span>[{idx + 1}] {src.title}</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Interactive Calibration Controls Bar (Client already synced in Global Deal Bar above) */}
      <section
        aria-label="Actuarial quote parameters"
        className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2 lg:grid-cols-4"
      >

        <div>
          <label
            htmlFor="market-insurer-select"
            className="block text-xs font-semibold text-slate-700"
          >
            {t(`Filter Insurer (${insurerOptions.length})`, `篩選保司 (${insurerOptions.length})`)}
          </label>
          <select
            id="market-insurer-select"
            value={insurerFilter}
            onChange={(e) => setInsurerFilter(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
          >
            <option value="ALL">
              {t(`All ${insurerOptions.length} HK Insurers`, `全部 ${insurerOptions.length} 間保司`)}
            </option>
            {insurerOptions.map((ins) => (
              <option key={ins.code} value={ins.code}>
                {lang === 'en'
                  ? `${ins.nameEn} (${ins.count})`
                  : `${t(ins.nameEn, ins.nameZh)} · ${ins.nameEn} (${ins.count})`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="market-sum-assured"
            className="block text-xs font-semibold text-slate-700"
          >
            {t(`Sum Assured (${currency})`, `投保額 (${currency})`)}
          </label>
          <div className="mt-1.5 flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Decrease sum assured"
              onClick={() => onChangeSumAssuredUsd(Math.max(20000, sumAssuredUsd - 25000))}
              className="rounded-lg border border-slate-300 px-2.5 py-2 font-mono text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              -
            </button>
            <input
              id="market-sum-assured"
              type="number"
              min={10000}
              step={10000}
              value={displaySumAssured}
              onChange={(e) => {
                const val = Math.max(10000, Number(e.target.value) || 10000);
                onChangeSumAssuredUsd(Math.round(val / fx));
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-semibold text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
            />
            <button
              type="button"
              aria-label="Increase sum assured"
              onClick={() => onChangeSumAssuredUsd(sumAssuredUsd + 25000)}
              className="rounded-lg border border-slate-300 px-2.5 py-2 font-mono text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="market-payment-term"
            className="block text-xs font-semibold text-slate-700"
          >
            {t('Payment Term', '供款年期')}
          </label>
          <select
            id="market-payment-term"
            value={paymentTermYears}
            onChange={(e) => onChangePaymentTermYears(Number(e.target.value))}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-medium text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
          >
            {[5, 10, 15, 20, 25].map((yr) => (
              <option key={yr} value={yr}>
                {t(`${yr} Years`, `${yr} 年供款`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="market-plan-search" className="block text-xs font-semibold text-slate-700">
            {t('Search Plan Keyword', '關鍵字搜尋')}
          </label>
          <div className="relative mt-1.5">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="market-plan-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('AXA, Sun Life, BOC Life, VHIS...', '安盛, 永明, 中銀人壽, VHIS...')}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>
        {!expressMeetingMode && (
          <div className="md:col-span-2 lg:col-span-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-800">
                {t(
                  'Dividend Fulfillment Stress-Test Simulator',
                  '非保證紅利實現率壓力測試（保證現金價值維持 100% 不變）'
                )}
              </span>
              <p className="text-[11px] text-slate-500">
                {t(
                  'Stress-tests Non-Guaranteed Dividends across all quotes & Yr 10/20/30 projections while Guaranteed Cash Value stays locked.',
                  '即時模擬當分紅實現率下跌至 90%／85%／75% 時對預期總退保價值及回本年期的影響（保證現金價值維持 100% 不變）。'
                )}
              </p>
            </div>
            <div
              role="group"
              aria-label="Dividend fulfillment ratio stress test"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 shrink-0"
            >
              {[
                { pct: 100, labelEn: '100% Base', labelZh: '100% 基準' },
                { pct: 90, labelEn: '90% Mild', labelZh: '90% 輕度' },
                { pct: 85, labelEn: '85% Stress', labelZh: '85% 壓測' },
                { pct: 75, labelEn: '75% Severe', labelZh: '75% 嚴峻' },
              ].map((opt) => (
                <button
                  key={opt.pct}
                  type="button"
                  data-testid={`gn16-stress-btn-${opt.pct}`}
                  aria-pressed={fulfillmentStressPercent === opt.pct}
                  onClick={() => onChangeFulfillmentStressPercent?.(opt.pct)}
                  className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                    fulfillmentStressPercent === opt.pct
                      ? opt.pct < 100
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t(opt.labelEn, opt.labelZh)}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Visual HKIA Completeness Breakdown + 40-Insurer Directory (On-Demand Toggle) */}
      {showInsurerDirectory && (
        <div className="space-y-4">
          <MarketCoverageVisualBar
            plans={plans}
            insurerCount={insurerOptions.length}
            onSelectCategory={(cat) => {
              setCategoryFilter(cat);
              setCardDisplayLimit(12);
            }}
          />

          <section
            aria-label="Filter by Hong Kong insurance company"
            className="rounded-xl border border-slate-200 bg-white p-3.5"
          >
            <div className="flex items-center justify-between gap-2 pb-2.5">
              <span className="text-xs font-semibold text-slate-700">
                {t(
                  `HKIA Authorized Insurer Directory (${insurerOptions.length} Companies · ${plans.length} Plans)`,
                  `香港獲授權保險公司快速篩選（共 ${insurerOptions.length} 間保司 · ${plans.length} 款計劃）`
                )}
              </span>
              <button
                type="button"
                onClick={() => setShowAllInsurersStrip((prev) => !prev)}
                className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0"
              >
                {showAllInsurersStrip
                  ? t('Collapse Insurer List', '收起保司列表')
                  : t(`Show All ${insurerOptions.length} Insurers`, `展開全部 ${insurerOptions.length} 間保司`)}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setInsurerFilter('ALL');
                  setCardDisplayLimit(12);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                  insurerFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {t(`All (${plans.length})`, `全部保司 (${plans.length})`)}
              </button>
              {(showAllInsurersStrip ? insurerOptions : insurerOptions.slice(0, 14)).map((ins) => {
                const active = insurerFilter === ins.code;
                const label =
                  lang === 'en' ? ins.nameEn.replace(/ Hong Kong| HK$/i, '') : t(ins.nameEn, ins.nameZh);
                return (
                  <button
                    key={ins.code}
                    type="button"
                    onClick={() => {
                      setInsurerFilter(active ? 'ALL' : ins.code);
                      setCardDisplayLimit(12);
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                      active
                        ? 'bg-blue-700 font-semibold text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {label} ({ins.count})
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Agent's Own Company Priority Bar: Always Show Own Company First, Then Suggest Other Insurers */}
      <section
        data-testid="market-agent-company-bar"
        aria-label="Agent own company priority filter"
        className="flex flex-col gap-3 rounded-xl border border-amber-300/80 bg-amber-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-900">
            <span className="rounded bg-amber-600 px-2 py-0.5 text-[11px] font-bold text-white">
              {t('OWN COMPANY FIRST', '本司產品優先')}
            </span>
            <span>
              {activeAgentCompanyOpt
                ? t(
                    `Showing ${activeAgentCompanyOpt.nameEn} products first (${partitionedFilteredPlans.ownCompanyItems.length} plans), followed by other insurers' suggestions (${partitionedFilteredPlans.otherCompanyItems.length}).`,
                    `優先顯示「${activeAgentCompanyOpt.nameZh}」本司產品（${partitionedFilteredPlans.ownCompanyItems.length} 款），其後才列出其他保司市場建議（${partitionedFilteredPlans.otherCompanyItems.length} 款）。`
                  )
                : t(
                    `Neutral Broker View — showing all ${filteredPlans.length} market plans equally.`,
                    `中立經紀模式 — 公平顯示全港 ${filteredPlans.length} 款保險公司方案。`
                  )}
            </span>
          </div>
        </div>
        {onChangeAgentCompanyCode && (
          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor="market-agent-company-select"
              className="text-[11px] font-semibold text-slate-700 whitespace-nowrap"
            >
              {t('My Insurer:', '我的公司：')}
            </label>
            <select
              id="market-agent-company-select"
              data-testid="market-agent-company-select"
              value={agentCompanyCode ?? 'BROKER_ALL'}
              onChange={(e) => {
                const next = e.target.value === 'BROKER_ALL' ? null : e.target.value;
                onChangeAgentCompanyCode(next);
                setInsurerFilter('ALL');
              }}
              className="rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-amber-600 focus:outline-none"
            >
              <option value="BROKER_ALL">
                {lang === 'en' ? 'Independent Broker (All Market)' : '獨立經紀（全市場公平排序）'}
              </option>
              {AGENT_COMPANY_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {lang === 'en' ? opt.nameEn : opt.nameZh}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* Category Filter Tabs + View Switcher + Count */}
      <div className="flex flex-col gap-3">
        <div
          role="group"
          aria-label="Filter insurance plans by product category"
          className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
        >
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategoryFilter(cat.id);
                setCardDisplayLimit(60);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === cat.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t(cat.labelEn, cat.labelZhHk)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium text-slate-600 tabular-nums">
            {t(
              `Showing ${filteredPlans.length} of ${plans.length} HK market plans (${insurerOptions.length} insurers) · ${selectedComparisonItems.length} comparing`,
              `正顯示 ${filteredPlans.length}／${plans.length} 款香港保險計劃（共 ${insurerOptions.length} 間保司）· 已選 ${selectedComparisonItems.length} 款並排比較`
            )}
          </p>

          <div className="flex items-center gap-2">
            {selectedComparisonItems.length > 0 && (
              <a
                href="#side-by-side-comparison"
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 whitespace-nowrap shrink-0 tabular-nums"
              >
                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {t(
                    `Compare Matrix (${selectedComparisonItems.length})`,
                    `跳至比較表 (${selectedComparisonItems.length})`
                  )}
                </span>
              </a>
            )}

            <div
              role="group"
              aria-label="Catalog display layout"
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5"
            >
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                aria-pressed={viewMode === 'cards'}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Cards', '卡片詳情')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('All-Plans Table', '全市場總覽表')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Empty Filter State */}
      {filteredPlans.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <SlidersHorizontal className="mx-auto h-7 w-7 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-slate-900">
            No Hong Kong plans match the current filter
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Reset your insurer/category filters, or launch Live Google Search Plans above to discover and import niche Hong Kong products.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('ALL');
                setInsurerFilter('ALL');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset Filters</span>
            </button>
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => {
                  setLiveDrawerOpen(true);
                  executeLiveMarketSearch(searchQuery);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 whitespace-nowrap"
              >
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Google Search &ldquo;{searchQuery.trim()}&rdquo;</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* High-Density All-Market Table View showing every matched HK plan cleanly */
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[860px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                <th className="py-3 pl-4 pr-3 font-semibold">{t('Insurer', '保險公司')}</th>
                <th className="py-3 px-3 font-semibold">{t('Plan Name', '計劃名稱')}</th>
                <th className="py-3 px-3 font-semibold">{t('Category', '產品類別')}</th>
                <th className="py-3 px-3 font-semibold text-right">
                  {t('GN16 / IRR', '實現率／回報')}
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  {t('Breakeven', '回本年期')}
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  {t(`Annual Premium (${currency})`, `每年保費 (${currency})`)}
                </th>
                <th className="py-3 pl-3 pr-4 font-semibold text-right">
                  {t('Actions', '操作')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partitionedFilteredPlans.orderedItems.map(({ plan, quote }) => {
                const isOwnCompanyPlan =
                  Boolean(agentCompanyCode) &&
                  plan.insurerCode.toUpperCase() === String(agentCompanyCode).toUpperCase();
                const isSelected = comparedPlanIds.includes(plan.id);
                const displayLabels = formatPlanForClientSafeMode(
                  plan,
                  insurerIndexLookup[plan.insurerCode] ?? 0,
                  clientSafeMode,
                  intermediary
                );
                const loc = localizePlanStrings(plan, lang);
                const insurerTitle = displayLabels.isAnonymized
                  ? lang === 'en'
                    ? displayLabels.displayInsurerEn
                    : lang === 'zh-CN'
                    ? toSimplifiedChinese(displayLabels.displayInsurerZh)
                    : displayLabels.displayInsurerZh
                  : loc.insurerName;
                const planTitle = displayLabels.isAnonymized
                  ? lang === 'en'
                    ? displayLabels.displayPlanEn
                    : lang === 'zh-CN'
                    ? toSimplifiedChinese(displayLabels.displayPlanZh)
                    : displayLabels.displayPlanZh
                  : loc.planName;

                const isLockedPlan = selectedPlanId === plan.id;
                return (
                  <tr
                    key={plan.id}
                    className={
                      isLockedPlan
                        ? 'bg-emerald-50/50 hover:bg-emerald-50/70'
                        : isOwnCompanyPlan
                        ? 'bg-amber-50/30 hover:bg-amber-50/50'
                        : 'hover:bg-slate-50/70'
                    }
                  >
                    <td className="py-3 pl-4 pr-3 font-semibold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isOwnCompanyPlan && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                            {t('OWN', '本司')}
                          </span>
                        )}
                        <span>{insurerTitle}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{planTitle}</div>
                      <div className="text-[11px] text-slate-500">{loc.secondaryPlanName}</div>
                      {!displayLabels.isAnonymized &&
                        (() => {
                          const docLinks = getPlanActionableHyperlinks(plan, planUrlOverrides);
                          return (
                            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
                              <a
                                href={docLinks.officialPageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 font-semibold text-teal-800 hover:underline"
                              >
                                <span>🔗 {t('Plan Page', '官方產品專頁')}</span>
                                <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                              </a>
                              {docLinks.brochureOrPolicyPdfUrl && (
                                <a
                                  href={docLinks.brochureOrPolicyPdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 font-semibold text-indigo-700 hover:underline"
                                >
                                  <span>
                                    📄{' '}
                                    {t(
                                      docLinks.brochureLinkLabelEn,
                                      conv(docLinks.brochureLinkLabelZh)
                                    )}
                                  </span>
                                  <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                                </a>
                              )}
                              {docLinks.standardPremiumPdfUrl && (
                                <a
                                  href={docLinks.standardPremiumPdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 font-semibold text-emerald-800 hover:underline"
                                >
                                  <span>💰 {t('Standard Premium PDF', '官方標準保費表')}</span>
                                  <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                                </a>
                              )}
                              {docLinks.promoFlyerPdfUrl && (
                                <a
                                  href={docLinks.promoFlyerPdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 font-semibold text-amber-800 hover:underline"
                                >
                                  <span>🎁 {t('Promo Flyer PDF', '最新推廣單張')}</span>
                                  <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                                </a>
                              )}
                              {docLinks.gn16ReportUrl && (
                                <a
                                  href={docLinks.gn16ReportUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 font-semibold text-blue-800 hover:underline"
                                >
                                  <span>GN16</span>
                                  <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                                </a>
                              )}
                            </div>
                          );
                        })()}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {loc.categoryLabel}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800 tabular-nums whitespace-nowrap">
                      {plan.fulfillmentRatio !== null ? `${plan.fulfillmentRatio}%` : '—'}
                      {quote.effectiveIllustratedIrrPercent > 0
                        ? ` · ${quote.effectiveIllustratedIrrPercent}%`
                        : ''}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {quote.breakevenYear !== null
                        ? `Yr ${quote.breakevenYear} / ${
                            quote.guaranteedBreakevenYear !== null
                              ? `Yr ${quote.guaranteedBreakevenYear}`
                              : '>30y'
                          }`
                        : t('Pure Cover', '純保障')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-teal-800 tabular-nums whitespace-nowrap">
                      {currency} ${quote.annualPremium.toLocaleString()}
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {onSelectPlanId && (
                          <button
                            type="button"
                            aria-pressed={isLockedPlan}
                            onClick={() => {
                              const nextId = isLockedPlan ? '' : plan.id;
                              onSelectPlanId(nextId);
                              onNotify?.(
                                nextId
                                  ? t(
                                      `Locked [${plan.insurerCode}] ${plan.nameEn} across all 6 stages.`,
                                      `已將「[${plan.insurerCode}] ${plan.nameZh}」設為主推計劃並同步全系統。`
                                    )
                                  : t('Unlocked active plan.', '已解除主推計劃鎖定。')
                              );
                            }}
                            className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                              isLockedPlan
                                ? 'bg-emerald-700 text-white'
                                : 'border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                            }`}
                          >
                            {isLockedPlan ? t('Active Plan', '主推中') : t('Set Active', '設為主推')}
                          </button>
                        )}
                        {(() => {
                          const slotIdx = comparedPlanIds.slice(0, 3).indexOf(plan.id);
                          const slotMeta =
                            slotIdx !== -1
                              ? COMPARE_SLOT_CLASSIFICATION[slotIdx as 0 | 1 | 2]
                              : null;
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                onToggleComparePlan(plan.id);
                                onNotify?.(
                                  isSelected
                                    ? t(
                                        `Removed ${plan.nameEn} from 3-plan comparison.`,
                                        `已從三方案比較表移除「${plan.nameZh}」。`
                                      )
                                    : t(
                                        `Added ${plan.nameEn} to 3-plan comparison (Red/Blue/Yellow).`,
                                        `已加入「${plan.nameZh}」至三方案紅藍黃比較表。`
                                      )
                                );
                              }}
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                                slotMeta
                                  ? slotMeta.activeButtonClass
                                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {slotMeta
                                ? t(slotMeta.shortTagEn, slotMeta.shortTagZh)
                                : t('Compare', '加入比較')}
                            </button>
                          );
                        })()}
                        <button
                          type="button"
                          onClick={() => runPlanLinkSubAgentAudit(plan)}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                        >
                          {t('Verify Links', 'AI 核實連結')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onLaunchStpForPlan(plan.id)}
                          className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                        >
                          {t('e-Policy', '投保')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Plan Grid — Own Company Products FIRST, then Other Insurers' Suggestions (PC & iPad 2-Col Parity) */
        (() => {
          const renderPlanCard = ({
            plan,
            quote,
          }: {
            plan: InsurancePlan;
            quote: ActuarialQuoteResult;
          }) => {
            const isSelected = comparedPlanIds.includes(plan.id);
            const isAppointedForSubmission =
              intermediary.role === IntermediaryRole.BROKER_TR ||
              intermediary.appointedInsurers.includes('ALL') ||
              intermediary.appointedInsurers.includes(plan.insurerCode);

            const displayLabels = formatPlanForClientSafeMode(
              plan,
              insurerIndexLookup[plan.insurerCode] ?? 0,
              clientSafeMode,
              intermediary
            );
            const loc = localizePlanStrings(plan, lang);
            const insurerTitle = displayLabels.isAnonymized
              ? lang === 'en'
                ? displayLabels.displayInsurerEn
                : lang === 'zh-CN'
                ? toSimplifiedChinese(displayLabels.displayInsurerZh)
                : displayLabels.displayInsurerZh
              : loc.insurerName;
            const planTitle = displayLabels.isAnonymized
              ? lang === 'en'
                ? displayLabels.displayPlanEn
                : lang === 'zh-CN'
                ? toSimplifiedChinese(displayLabels.displayPlanZh)
                : displayLabels.displayPlanZh
              : loc.planName;
            const secondaryTitle = displayLabels.isAnonymized
              ? lang === 'en'
                ? displayLabels.displayPlanZh
                : displayLabels.displayPlanEn
              : loc.secondaryPlanName;

            const isLockedPlan = selectedPlanId === plan.id;
            const isInCombo = !isLockedPlan && comboPlanIds.includes(plan.id);
            const catTopBorder =
              plan.category === PlanCategory.VHIS || plan.category === PlanCategory.HIGH_END_MEDICAL
                ? 'border-t-teal-600'
                : plan.category === PlanCategory.CRITICAL_ILLNESS
                ? 'border-t-rose-600'
                : plan.category === PlanCategory.PARTICIPATING_SAVINGS || plan.category === PlanCategory.QDAP
                ? 'border-t-amber-500'
                : 'border-t-indigo-600';

            return (
              <article
                key={plan.id}
                className={`flex flex-col justify-between rounded-xl border border-t-4 bg-white p-5 transition-colors ${catTopBorder} ${
                  isLockedPlan
                    ? 'border-emerald-600 bg-emerald-50/20 ring-1 ring-emerald-600/30 shadow-xs'
                    : isInCombo
                    ? 'border-indigo-500 bg-indigo-50/15 ring-1 ring-indigo-500/25'
                    : isSelected
                    ? 'border-indigo-600 ring-1 ring-indigo-600/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Quiet Unboxed Metadata Line + Clean Action Trio */}
                  <div className="flex items-start justify-between gap-3 text-xs text-slate-500">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 pt-1">
                      <span className="font-semibold text-slate-800">{insurerTitle}</span>
                      <span aria-hidden="true">·</span>
                      <span>{loc.categoryLabel}</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                      {onSelectPlanId && (
                        <button
                          type="button"
                          data-testid={`lock-plan-${plan.id}`}
                          aria-pressed={isLockedPlan}
                          onClick={() => {
                            const nextId = isLockedPlan ? '' : plan.id;
                            onSelectPlanId(nextId);
                            onNotify?.(
                              nextId
                                ? t(
                                    `Locked [${plan.insurerCode}] ${plan.nameEn} across all 6 stages.`,
                                    `已鎖定主推計劃：[${plan.insurerCode}] ${plan.nameZh}（同步連動 01–06）`
                                  )
                                : t('Unlocked active plan.', '已解除主推計劃鎖定。')
                            );
                          }}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            isLockedPlan
                              ? 'bg-emerald-700 text-white'
                              : 'border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                          }`}
                        >
                          {isLockedPlan && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                          <span>
                            {isLockedPlan
                              ? t('Active Plan', '主推鎖定中')
                              : t('Set Active', '設為主推')}
                          </span>
                        </button>
                      )}
                      {onToggleComboPlan && !isLockedPlan && (
                        <button
                          type="button"
                          data-testid={`combo-plan-${plan.id}`}
                          aria-pressed={isInCombo}
                          onClick={() => onToggleComboPlan(plan.id)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            isInCombo
                              ? 'bg-indigo-700 text-white'
                              : 'border border-indigo-200 bg-indigo-50/70 text-indigo-900 hover:bg-indigo-100'
                          }`}
                          title={t(
                            'Bundle as complementary secondary plan in Multi-Plan Portfolio',
                            '加入多保單組合（如儲蓄＋自願醫保＋危疾同時投保）'
                          )}
                        >
                          {isInCombo ? (
                            <Check className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <Plus className="h-3 w-3" aria-hidden="true" />
                          )}
                          <span>{isInCombo ? t('In Combo', '已入組合') : t('Combo', '組合')}</span>
                        </button>
                      )}
                      {(() => {
                        const slotIdx = comparedPlanIds.slice(0, 3).indexOf(plan.id);
                        const slotMeta =
                          slotIdx !== -1
                            ? COMPARE_SLOT_CLASSIFICATION[slotIdx as 0 | 1 | 2]
                            : null;
                        return (
                          <button
                            type="button"
                            data-testid={`compare-plan-${plan.id}`}
                            onClick={() => {
                              onToggleComparePlan(plan.id);
                              onNotify?.(
                                isSelected
                                  ? t(
                                      `Removed ${plan.nameEn} from 3-plan comparison.`,
                                      `已從三方案比較表移除「${plan.nameZh}」。`
                                    )
                                  : t(
                                      `Added ${plan.nameEn} to 3-plan comparison (Red/Blue/Yellow).`,
                                      `已加入「${plan.nameZh}」至三方案紅藍黃比較表。`
                                    )
                              );
                            }}
                            aria-pressed={isSelected}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                              slotMeta
                                ? slotMeta.activeButtonClass
                                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {slotMeta && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                            <span>
                              {slotMeta
                                ? t(slotMeta.shortTagEn, slotMeta.shortTagZh)
                                : t('Compare', '比較')}
                            </span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Primary & Secondary Plan Titles */}
                  <h2 className="mt-2.5 text-lg font-bold text-slate-900">{planTitle}</h2>
                  <p className="text-sm font-medium text-slate-600">{secondaryTitle}</p>

                  {/* Verified Live-Crawled Metadata Row (VHIS Cert No / Issue Age / Benefit Period) */}
                  {(plan.vhisCertificationNo || plan.issueAge || plan.benefitPeriod) && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                      {plan.vhisCertificationNo && (
                        <span
                          data-testid={`card-vhis-cert-${plan.id}`}
                          className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono font-semibold text-emerald-900"
                        >
                          VHIS {plan.vhisCertificationNo}
                        </span>
                      )}
                      {plan.issueAge && (
                        <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-medium text-slate-700">
                          {t(`Issue Age: ${plan.issueAge}`, conv(`投保年齡：${plan.issueAge}`))}
                        </span>
                      )}
                      {plan.benefitPeriod && (
                        <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-medium text-slate-700">
                          {t(`Term: ${plan.benefitPeriod}`, conv(`保障期：${plan.benefitPeriod}`))}
                        </span>
                      )}
                    </div>
                  )}

                  {plan.crawledPromoHighlights && !displayLabels.isAnonymized && (
                    <p className="mt-2 rounded-md border border-amber-200/80 bg-amber-50/70 px-2.5 py-1.5 text-[11px] font-medium leading-relaxed text-amber-950">
                      🎁 {conv(plan.crawledPromoHighlights)}
                    </p>
                  )}

                  {/* Progressive Disclosure: Scannable Top 2 Highlights + Direct Official Hyperlinks + Expandable Footnotes */}
                  <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-slate-600">
                    {loc.highlights.slice(0, 2).map((hl, idx) => (
                      <li key={idx}>• {hl}</li>
                    ))}
                  </ul>

                  {!displayLabels.isAnonymized &&
                    (() => {
                      const docLinks = getPlanActionableHyperlinks(plan, planUrlOverrides);
                      return (
                        <div className="mt-2.5 flex flex-col gap-2 pt-0.5 text-xs">
                          <div
                            data-testid={`card-doc-links-${plan.id}`}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1.5"
                          >
                            <a
                              href={docLinks.officialPageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid={`card-official-link-${plan.id}`}
                              className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:text-teal-950 hover:underline"
                            >
                              <span>🔗 {t('Official Plan Page', '官方產品專頁')}</span>
                              <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                            {docLinks.brochureOrPolicyPdfUrl && (
                              <a
                                href={docLinks.brochureOrPolicyPdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`card-brochure-link-${plan.id}`}
                                className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-950 hover:underline"
                              >
                                <span>
                                  📄{' '}
                                  {t(
                                    docLinks.brochureLinkLabelEn,
                                    conv(docLinks.brochureLinkLabelZh)
                                  )}
                                </span>
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </a>
                            )}
                            {docLinks.standardPremiumPdfUrl && (
                              <a
                                href={docLinks.standardPremiumPdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`card-std-premium-link-${plan.id}`}
                                className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-950 hover:underline"
                              >
                                <span>💰 {t('Standard Premium PDF', '官方標準保費表')}</span>
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </a>
                            )}
                            {docLinks.promoFlyerPdfUrl && (
                              <a
                                href={docLinks.promoFlyerPdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`card-promo-flyer-link-${plan.id}`}
                                className="inline-flex items-center gap-1 font-semibold text-amber-800 hover:text-amber-950 hover:underline"
                              >
                                <span>🎁 {t('Promo Flyer PDF', '最新推廣單張')}</span>
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </a>
                            )}
                            {docLinks.gn16ReportUrl && (
                              <a
                                href={docLinks.gn16ReportUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`card-gn16-link-${plan.id}`}
                                className="inline-flex items-center gap-1 font-semibold text-blue-800 hover:text-blue-950 hover:underline"
                              >
                                <span>{t('GN16 Ratios', 'GN16 實現率')}</span>
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </a>
                            )}
                          </div>

                          {onSelectPlanAndOpenPowerPack && !expressMeetingMode && (
                            <div>
                              <button
                                type="button"
                                data-testid={`card-open-powerpack-${plan.id}`}
                                onClick={() => {
                                  const defaultTool: PowerPackToolId =
                                    plan.category === PlanCategory.VHIS ||
                                    plan.category === PlanCategory.HIGH_END_MEDICAL
                                      ? 'DEDUCTIBLE_RELAY'
                                      : plan.category === PlanCategory.PARTICIPATING_SAVINGS ||
                                        plan.category === PlanCategory.UNIVERSAL_LIFE
                                      ? 'POLICY_SPLIT'
                                      : plan.category === PlanCategory.CRITICAL_ILLNESS ||
                                        plan.category === PlanCategory.TERM_LIFE
                                      ? 'PRE_UW'
                                      : 'PAYMENT_PERKS';
                                  onSelectPlanAndOpenPowerPack(plan.id, defaultTool);
                                }}
                                className="font-semibold text-slate-700 hover:text-teal-800 hover:underline whitespace-nowrap"
                              >
                                {t('Match 6 Power Tools →', '配對六大見客神器 →')}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  {!expressMeetingMode && (
                    <details className="mt-2.5 group rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-slate-600">
                      <summary className="cursor-pointer list-none font-semibold text-slate-700 hover:text-slate-950 flex items-center justify-between">
                        <span>
                          {t(
                            'Actuarial Footnotes & Official GN16 Links',
                            '展開精算細則、等候期與官方 GN16 連結'
                          )}
                        </span>
                        <ChevronDown
                          className="h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-180"
                          aria-hidden="true"
                        />
                      </summary>
                      <div className="mt-2 space-y-2 border-t border-slate-200/70 pt-2">
                        {loc.highlights.slice(2).map((hl, idx) => (
                          <p key={idx} className="text-[11px] leading-relaxed text-slate-600">
                            • {hl}
                          </p>
                        ))}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span className="font-mono text-teal-800">
                            [CRM: {plan.crmStandardCategory || mapPlanCategoryToCrmStandard(plan.category)}]
                          </span>
                          <span>· {plan.waitingPeriodText}</span>
                        </div>
                        {!displayLabels.isAnonymized && (
                          <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px]">
                            {plan.officialUrl && (
                              <a
                                href={plan.officialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:underline"
                              >
                                <span>{t('Brochure', '產品專頁')}</span>
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </a>
                            )}
                            {plan.gn16ReportUrl && (
                              <a
                                href={plan.gn16ReportUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-950 hover:underline"
                              >
                                <span>GN16</span>
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </a>
                            )}
                            <button
                              type="button"
                              data-testid={`audit-links-${plan.id}`}
                              onClick={() => runPlanLinkSubAgentAudit(plan)}
                              className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 hover:underline whitespace-nowrap"
                            >
                              <Link2 className="h-3 w-3" aria-hidden="true" />
                              <span>{t('AI Verify Links', 'AI 核實連結')}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>

                {/* Actuarial Metrics Footer */}
                <div className="mt-4 border-t border-slate-100 pt-3.5">
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <span className="block text-[11px] text-slate-500">
                        {t('Fulfillment', '分紅實現率')}
                      </span>
                      <span className="mt-0.5 block font-mono text-sm font-semibold text-slate-900 tabular-nums">
                        {plan.fulfillmentRatio !== null
                          ? `${plan.fulfillmentRatio}%`
                          : plan.category === PlanCategory.UNIVERSAL_LIFE
                          ? t('Crediting UL', '派息萬用險')
                          : t('Pure Cover', '純保障')}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] text-slate-500">
                        {quote.appliedHkiaIrrCapPercent !== null
                          ? t('HKIA Capped IRR', '保監上限 IRR')
                          : plan.category === PlanCategory.UNIVERSAL_LIFE
                          ? t('Crediting IRR', '派息回報率')
                          : quote.estimatedAnnualTaxSavedHkd > 0
                          ? t('Tax Saved', '每年扣稅')
                          : t('Pay Term', '供款期')}
                      </span>
                      <span className="mt-0.5 block font-mono text-sm font-semibold text-slate-900 tabular-nums">
                        {quote.appliedHkiaIrrCapPercent !== null
                          ? `${quote.effectiveIllustratedIrrPercent}%`
                          : plan.category === PlanCategory.UNIVERSAL_LIFE
                          ? `${quote.effectiveIllustratedIrrPercent}%`
                          : quote.estimatedAnnualTaxSavedHkd > 0
                          ? `HK$${quote.estimatedAnnualTaxSavedHkd.toLocaleString()}`
                          : `${quote.paymentTermYears}y`}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] text-slate-500">
                        {t('Breakeven (Tot/Guar)', '回本 (總/保證)')}
                      </span>
                      <span className="mt-0.5 block font-mono text-xs font-semibold text-slate-800 tabular-nums">
                        {quote.breakevenYear !== null
                          ? `Yr ${quote.breakevenYear} / ${
                              quote.guaranteedBreakevenYear !== null
                                ? `Yr ${quote.guaranteedBreakevenYear}`
                                : '>30y'
                            }`
                          : t('Protection', '純醫療／保障')}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="block text-[11px] text-slate-500">
                        {t('Annual Premium', '每年保費')}
                      </span>
                      <span className="mt-0.5 block font-mono text-sm font-bold text-teal-800 tabular-nums">
                        {currency} ${quote.annualPremium.toLocaleString()}
                      </span>
                      {(() => {
                        const premiumHkd =
                          currency === 'HKD'
                            ? quote.annualPremium
                            : currency === 'USD'
                            ? Math.round(quote.annualPremium * 7.8)
                            : Math.round(quote.annualPremium / 0.92);
                        const budgetHkd = activeLead?.annualBudgetHkd ?? 48000;
                        const withinBudget = premiumHkd <= budgetHkd;
                        return (
                          <span
                            className={`block font-mono text-[11px] tabular-nums ${
                              withinBudget ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            ~${quote.monthlyEquivalent.toLocaleString()}/mo ·{' '}
                            {withinBudget
                              ? t('Within Budget', '符合預算')
                              : t('Above Budget', '高於年預算')}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-500">
                      {isAppointedForSubmission
                        ? t('Direct STP Ready', '支援直通電子投保')
                        : t(`Benchmark only (${plan.insurerCode})`, `僅供同業比對 (${plan.insurerCode})`)}
                    </span>

                    <button
                      type="button"
                      onClick={() => onLaunchStpForPlan(plan.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                    >
                      <span>
                        {isAppointedForSubmission
                          ? t('Sign & Submit (05A)', '前往簽署確認 (05A)')
                          : t('Inspect Compliance', '查看合規限制')}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            );
          };

          const showPartitionedSections =
            insurerFilter === 'ALL' &&
            Boolean(agentCompanyCode) &&
            partitionedFilteredPlans.ownCompanyItems.length > 0;

          const otherItemsToDisplay = partitionedFilteredPlans.otherCompanyItems.slice(
            0,
            cardDisplayLimit
          );

          return (
            <div className="space-y-6">
              {showPartitionedSections ? (
                <>
                  {/* SECTION 1: AGENT'S OWN COMPANY PRODUCTS FIRST */}
                  <section
                    data-testid="market-own-company-section"
                    className="space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-amber-600 px-2 py-0.5 text-[11px] font-bold text-white">
                          {t('1 · OWN COMPANY', '1 · 本司優先')}
                        </span>
                        <h2 className="text-sm font-bold text-slate-900">
                          {t(
                            `${activeAgentCompanyOpt?.nameEn || agentCompanyCode || ''} Products (${partitionedFilteredPlans.ownCompanyItems.length})`,
                            `${activeAgentCompanyOpt?.nameZh || agentCompanyCode || ''} 旗下計劃（共 ${partitionedFilteredPlans.ownCompanyItems.length} 款）`
                          )}
                        </h2>
                      </div>
                      <span className="text-xs text-slate-500">
                        {t(
                          'Recommended to prioritize your own company plans first',
                          '已為你置頂本司所有相符產品，方便優先推介'
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {partitionedFilteredPlans.ownCompanyItems.map(renderPlanCard)}
                    </div>
                  </section>

                  {/* SECTION 2: OTHER INSURERS SUGGESTIONS */}
                  {partitionedFilteredPlans.otherCompanyItems.length > 0 && (
                    <section
                      data-testid="market-other-insurers-section"
                      className="space-y-3 pt-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-white">
                            {t('2 · OTHER INSURERS', '2 · 其他保司建議')}
                          </span>
                          <h2 className="text-sm font-bold text-slate-900">
                            {t(
                              `Other Hong Kong Insurers — Market Suggestions (${partitionedFilteredPlans.otherCompanyItems.length})`,
                              `其他保險公司市場參考及建議方案（共 ${partitionedFilteredPlans.otherCompanyItems.length} 款）`
                            )}
                          </h2>
                        </div>
                        <span className="text-xs text-slate-500">
                          {t(
                            'For cross-company comparison & niche coverage matching',
                            '作同業對比或補足本司未涵蓋嘅特定保障'
                          )}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {otherItemsToDisplay.map(renderPlanCard)}
                      </div>

                      {partitionedFilteredPlans.otherCompanyItems.length > cardDisplayLimit && (
                        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 sm:flex-row">
                          <p className="text-xs text-slate-600 tabular-nums">
                            {t(
                              `Showing ${otherItemsToDisplay.length} of ${partitionedFilteredPlans.otherCompanyItems.length} other-insurer plans.`,
                              `目前先顯示前 ${otherItemsToDisplay.length} 款其他保司建議（共 ${partitionedFilteredPlans.otherCompanyItems.length} 款），可按需要展開更多。`
                            )}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setCardDisplayLimit((prev) => prev + 24)}
                              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 tabular-nums"
                            >
                              {t('Show +24 More Plans', '再顯示 +24 款計劃')}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCardDisplayLimit(
                                  partitionedFilteredPlans.otherCompanyItems.length
                                )
                              }
                              className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                            >
                              {t('Show All', '顯示全部')}
                            </button>
                          </div>
                        </div>
                      )}
                    </section>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {partitionedFilteredPlans.orderedItems
                      .slice(0, cardDisplayLimit)
                      .map(renderPlanCard)}
                  </div>

                  {partitionedFilteredPlans.orderedItems.length > cardDisplayLimit && (
                    <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 sm:flex-row">
                      <p className="text-xs text-slate-600 tabular-nums">
                        {t(
                          `Displaying ${cardDisplayLimit} of ${partitionedFilteredPlans.orderedItems.length} matched HK plans in Card View.`,
                          `目前先載入前 ${cardDisplayLimit} 款（合共配對 ${partitionedFilteredPlans.orderedItems.length} 款香港保險計劃），可展開更多或切換至「全市場總覽表」。`
                        )}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCardDisplayLimit((prev) => prev + 24)}
                          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 tabular-nums"
                        >
                          {t('Show +24 More Cards', '再載入 +24 款計劃')}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCardDisplayLimit(partitionedFilteredPlans.orderedItems.length)
                          }
                          className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                        >
                          {t('Show All', '顯示全部')}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()
      )}


      {/* 3-Plan Side-by-Side Comparison Matrix (Red / Blue / Yellow Classification Lines) */}
      {selectedComparisonItems.length > 0 && (
        <section
          id="side-by-side-comparison"
          data-testid="side-by-side-comparison-section"
          aria-label="Side-by-side 3-plan actuarial comparison matrix"
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
        >
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {t(
                  '3-Plan Side-by-Side Comparison (Red · Blue · Yellow Lines) & 10/20/30-Year Projections',
                  '三方案紅・藍・黃分色並排比較表及 10／20／30 年退保價值預測'
                )}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {t(
                  `Compare up to 3 plans side-by-side classified by Red (#DC2626), Blue (#2563EB) & Yellow (#EAB308) lines · Prepared for ${activeLead.fullNameEn} (${activeLead.age}y) · ${currency} $${displaySumAssured.toLocaleString()}`,
                  `支援同時比較最多 3 款保險計劃，以紅線（方案 1）、藍線（方案 2）、黃線（方案 3）清晰歸類圖表與比較項目 · 客戶：${activeLead.fullNameZh}（${activeLead.age} 歲）· 保額 ${currency} $${displaySumAssured.toLocaleString()}`
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {selectedComparisonItems[0] && (
                <ShareProposalActionButton
                  testId="stage2a-share-proposal-btn"
                  variant="teal"
                  shareInput={{
                    clientNameZh: activeLead.fullNameZh,
                    clientNameEn: activeLead.fullNameEn,
                    planNameZh: selectedComparisonItems[0].plan.nameZh,
                    planNameEn: selectedComparisonItems[0].plan.nameEn,
                    insurerNameZh: selectedComparisonItems[0].plan.insurerNameZh,
                    insurerCode: selectedComparisonItems[0].plan.insurerCode,
                    annualPremiumDisplay: `${currency} $${selectedComparisonItems[0].quote.annualPremium.toLocaleString()}`,
                    proposalUrl:
                      typeof window !== 'undefined'
                        ? window.location.origin
                        : 'https://hk-is-pro.web.app',
                    advisorNameZh: intermediary.nameZh,
                    advisorLicenseNo: intermediary.iaLicenseNo,
                    whatsappPhone: activeLead.whatsappPhone,
                  }}
                  getOptionalFile={async () => {
                    const qrMatrix = whiteLabelConfig?.enabled
                      ? buildDeterministicQrMatrix(
                          `${whiteLabelConfig.practiceTitleEn}|${whiteLabelConfig.contactChannelLabel}|${intermediary.iaLicenseNo}`
                        )
                      : undefined;
                    const bytes = await generateComparisonProposalPdfBytes({
                      clientName: `${activeLead.fullNameEn} (${activeLead.fullNameZh})`,
                      age: activeLead.age,
                      currency,
                      items: selectedComparisonItems,
                      intermediary,
                      whiteLabel: whiteLabelConfig,
                      qrMatrix,
                    });
                    return new File(
                      [bytes as unknown as BlobPart],
                      `HK_Comparison_Proposal_${activeLead.fullNameEn.replace(/\s+/g, '_')}.pdf`,
                      { type: 'application/pdf' }
                    );
                  }}
                  onNotify={onNotify}
                />
              )}

              <button
                type="button"
                data-testid="export-3plan-pdf-btn"
                onClick={handleDownloadComparisonPdf}
                disabled={exportingPdf}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {exportingPdf
                    ? t('Generating PDF...', '生成 PDF 中...')
                    : t('Export 3-Plan PDF', '匯出三方案比較 PDF')}
                </span>
              </button>

              {canShowDrive && (
                <button
                  type="button"
                  onClick={handleSaveComparisonToDrive}
                  disabled={uploadingDrivePdf}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
                >
                  <FolderUp className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {uploadingDrivePdf
                      ? t('Saving to Drive...', '備份至雲端中...')
                      : t('Save Proposal to Google Drive', '儲存建議書至 Google Drive')}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive 3-Slot Selector Strip (Red Line / Blue Line / Yellow Line) */}
          <div
            data-testid="three-plan-slot-selectors"
            className="grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            {COMPARE_SLOT_CLASSIFICATION.map((slotMeta) => {
              const currentSlotId = comparedPlanIds[slotMeta.slotIndex] || '';
              return (
                <div
                  key={slotMeta.slotIndex}
                  data-testid={`compare-slot-card-${slotMeta.slotIndex + 1}`}
                  className={`rounded-xl border p-3.5 ${slotMeta.topBorderClass} ${slotMeta.cardBorderClass}`}
                >
                  <div className="flex items-center justify-between gap-2 pb-2">
                    <label
                      htmlFor={`compare-slot-select-${slotMeta.slotIndex}`}
                      className={`inline-flex items-center gap-2 text-xs font-bold ${slotMeta.textAccentClass}`}
                    >
                      <span
                        className="inline-block h-1 w-5 rounded-full shrink-0"
                        style={{ backgroundColor: slotMeta.strokeHex }}
                        aria-hidden="true"
                      />
                      <span>{t(slotMeta.labelEn, slotMeta.labelZh)}</span>
                    </label>
                    {currentSlotId && comparedPlanIds.length > 1 && onSetCompareSlotPlan && (
                      <button
                        type="button"
                        onClick={() => onSetCompareSlotPlan(slotMeta.slotIndex, '')}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                      >
                        {t('Clear', '移除')}
                      </button>
                    )}
                  </div>
                  <select
                    id={`compare-slot-select-${slotMeta.slotIndex}`}
                    value={currentSlotId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (onSetCompareSlotPlan) {
                        onSetCompareSlotPlan(slotMeta.slotIndex, val);
                      } else if (val) {
                        onToggleComparePlan(val);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                  >
                    {!currentSlotId && (
                      <option value="">
                        {t('— Select a 3rd plan to compare —', '— 選擇第 3 款比較計劃 —')}
                      </option>
                    )}
                    {plans.map((p) => {
                      const pLoc = localizePlanStrings(p, lang);
                      return (
                        <option key={p.id} value={p.id}>
                          [{p.insurerCode}] {pLoc.planName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              );
            })}
          </div>

          <SurrenderTrajectoryChart
            currency={currency}
            items={selectedComparisonItems.map(({ plan, quote, slotIndex }) => {
              const lbl = formatPlanForClientSafeMode(
                plan,
                insurerIndexLookup[plan.insurerCode] ?? 0,
                clientSafeMode,
                intermediary
              );
              const locPlan = localizePlanStrings(plan, lang);
              const title = lbl.isAnonymized
                ? lang === 'en'
                  ? lbl.displayPlanEn
                  : lang === 'zh-CN'
                  ? toSimplifiedChinese(lbl.displayPlanZh)
                  : lbl.displayPlanZh
                : `${locPlan.insurerName} · ${locPlan.planName}`;
              return { plan, quote, displayTitle: title, slotIndex };
            })}
          />

          {/* Interactive Lifelong Age-to-100 Cash-Value & IRR Curve for Slot 1 Plan */}
          {selectedComparisonItems[0] && (
            <LifelongCashValueCurveSvg
              plan={selectedComparisonItems[0].plan}
              clientAge={activeLead.age}
              isSmoker={activeLead.isSmoker}
              currency={currency}
              sumAssured={displaySumAssured}
              paymentTermYears={paymentTermYears}
            />
          )}

          {/* Inline Synchronized GN16 Dividend Stress Bar Right Above 3-Plan Matrix */}
          {onChangeFulfillmentStressPercent && (
            <div
              data-testid="matrix-stress-control-bar"
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5"
            >
              <span className="text-xs font-semibold text-slate-700">
                {t(
                  'GN16 Non-Guaranteed Dividend Stress Test (Guaranteed CV stays 100%):',
                  'GN16 非保證分紅實現率壓力測試（保證現金價值維持 100% 不變）：'
                )}
              </span>
              <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shrink-0">
                {[
                  { pct: 100, labelEn: '100% Base', labelZh: '100% 基準' },
                  { pct: 90, labelEn: '90% Mild', labelZh: '90% 輕度' },
                  { pct: 85, labelEn: '85% Stress', labelZh: '85% 壓測' },
                  { pct: 75, labelEn: '75% Severe', labelZh: '75% 嚴峻' },
                ].map((opt) => (
                  <button
                    key={opt.pct}
                    type="button"
                    data-testid={`matrix-stress-btn-${opt.pct}`}
                    aria-pressed={fulfillmentStressPercent === opt.pct}
                    onClick={() => onChangeFulfillmentStressPercent(opt.pct)}
                    className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                      fulfillmentStressPercent === opt.pct
                        ? opt.pct < 100
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t(opt.labelEn, opt.labelZh)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table
              data-testid="three-plan-comparison-table"
              className="w-full min-w-[740px] border-collapse text-left text-xs"
            >
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                  <th className="w-56 py-3.5 pl-4 pr-4 font-bold text-slate-800">
                    {t('Comparison Item / Horizon', '比較項目／年期')}
                  </th>
                  {selectedComparisonItems.map(({ plan, slotIndex }) => {
                    const slotMeta =
                      COMPARE_SLOT_CLASSIFICATION[slotIndex] || COMPARE_SLOT_CLASSIFICATION[0];
                    const lbl = formatPlanForClientSafeMode(
                      plan,
                      insurerIndexLookup[plan.insurerCode] ?? 0,
                      clientSafeMode,
                      intermediary
                    );
                    const locPlan = localizePlanStrings(plan, lang);
                    return (
                      <th
                        key={plan.id}
                        data-testid={`compare-col-header-${slotIndex + 1}`}
                        className={`py-3.5 px-4 align-top font-semibold text-slate-900 ${slotMeta.topBorderClass} ${slotMeta.cardBorderClass}`}
                      >
                        <div className="mb-1 inline-flex items-center gap-1.5">
                          <span
                            className="inline-block h-1 w-5 rounded-full shrink-0"
                            style={{ backgroundColor: slotMeta.strokeHex }}
                            aria-hidden="true"
                          />
                          <span className={`font-mono text-[11px] font-bold ${slotMeta.textAccentClass}`}>
                            {t(slotMeta.labelEn, slotMeta.labelZh)}
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-slate-600">
                          {lbl.isAnonymized
                            ? lang === 'en'
                              ? lbl.displayInsurerEn
                              : lang === 'zh-CN'
                              ? toSimplifiedChinese(lbl.displayInsurerZh)
                              : lbl.displayInsurerZh
                            : locPlan.insurerName}
                        </div>
                        <div className="mt-0.5 text-sm font-bold text-slate-900">
                          {lbl.isAnonymized
                            ? lang === 'en'
                              ? lbl.displayPlanEn
                              : lang === 'zh-CN'
                              ? toSimplifiedChinese(lbl.displayPlanZh)
                              : lbl.displayPlanZh
                            : locPlan.planName}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                <tr>
                  <td className="py-3 pl-4 pr-4 font-sans font-semibold text-slate-700">
                    {t('Annual Premium', '每年保費')}
                  </td>
                  {selectedComparisonItems.map(({ plan, quote, slotIndex }) => {
                    const slotMeta =
                      COMPARE_SLOT_CLASSIFICATION[slotIndex] || COMPARE_SLOT_CLASSIFICATION[0];
                    return (
                      <td
                        key={plan.id}
                        className={`py-3 px-4 font-bold ${slotMeta.textAccentClass}`}
                      >
                        {currency} ${quote.annualPremium.toLocaleString()}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-3 pl-4 pr-4 font-sans font-medium text-slate-600">
                    {t('Total Premiums Paid', '總繳保費')}
                  </td>
                  {selectedComparisonItems.map(({ plan, quote }) => (
                    <td key={plan.id} className="py-3 px-4 text-slate-700">
                      {currency} ${quote.totalPremiumsPaid.toLocaleString()} ({quote.paymentTermYears}y)
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 pl-4 pr-4 font-sans font-medium text-slate-600">
                    {t('Seasonal Special Offer', '本季保司推廣優惠')}
                  </td>
                  {selectedComparisonItems.map(({ plan }) => {
                    const offer = resolveSpecialOfferWithAdminOverride(plan, promoOverrides);
                    return (
                      <td key={plan.id} className="py-3 px-4 font-sans text-xs">
                        {offer ? (
                          <span className="font-semibold text-amber-900">
                            {lang === 'en'
                              ? offer.headlineEn
                              : lang === 'zh-CN'
                              ? toSimplifiedChinese(offer.headlineZh)
                              : offer.headlineZh}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            {t('Standard Tariff (No Seasonal Rebate)', '標準費率（無季度回贈優惠）')}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-3 pl-4 pr-4 font-sans font-medium text-slate-600">
                    {t('Breakeven Horizon (Total / Guaranteed)', '回本年期（總預期／保證）')}
                  </td>
                  {selectedComparisonItems.map(({ plan, quote }) => (
                    <td key={plan.id} className="py-3 px-4 text-slate-800">
                      {quote.breakevenYear !== null
                        ? `${t('Total Yr', '總第')} ${quote.breakevenYear} / ${t('Guar.', '保證')} ${
                            quote.guaranteedBreakevenYear !== null
                              ? `${t('Yr', '第')} ${quote.guaranteedBreakevenYear}`
                              : '>30 Yrs'
                          }`
                        : t('N/A (Pure Cover)', '純保障無退保價值')}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 pl-4 pr-4 font-sans font-medium text-slate-600">
                    {t('Fulfillment Ratio', 'GN16 分紅實現率')}
                  </td>
                  {selectedComparisonItems.map(({ plan }) => (
                    <td key={plan.id} className="py-3 px-4 text-slate-700">
                      {plan.fulfillmentRatio !== null
                        ? `${plan.fulfillmentRatio}%`
                        : t('N/A (Non-Par)', '非分紅產品')}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 pl-4 pr-4 font-sans font-medium text-slate-600">
                    {t('HKIA Illustrated IRR', '保監局演示回報率')}
                  </td>
                  {selectedComparisonItems.map(({ plan, quote }) => (
                    <td key={plan.id} className="py-3 px-4 text-slate-800">
                      {quote.effectiveIllustratedIrrPercent > 0
                        ? `${quote.effectiveIllustratedIrrPercent}% ${
                            quote.appliedHkiaIrrCapPercent !== null
                              ? `(HKIA Cap ${quote.appliedHkiaIrrCapPercent}%)`
                              : ''
                          }`
                        : t('Protection Only', '純保障型')}
                    </td>
                  ))}
                </tr>
                {[10, 20, 30].map((yr) => (
                  <tr key={yr}>
                    <td className="py-3 pl-4 pr-4 font-sans font-medium text-slate-600">
                      {t(
                        `Year ${yr} Total Surrender (Guar. / Total)`,
                        `第 ${yr} 年退保價值（保證／總預期）`
                      )}
                    </td>
                    {selectedComparisonItems.map(({ plan, quote, slotIndex }) => {
                      const slotMeta =
                        COMPARE_SLOT_CLASSIFICATION[slotIndex] || COMPARE_SLOT_CLASSIFICATION[0];
                      const row = quote.projections.find((p) => p.policyYear === yr);
                      if (!row || row.totalSurrenderValue === 0) {
                        return (
                          <td key={plan.id} className="py-3 px-4 text-slate-400">
                            {t('No Cash Value', '無現金價值')}
                          </td>
                        );
                      }
                      return (
                        <td key={plan.id} className="py-3 px-4 text-slate-900">
                          <span className="text-slate-500">
                            {currency} ${row.guaranteedCashValue.toLocaleString()}
                          </span>{' '}
                          /{' '}
                          <span className={`font-bold ${slotMeta.textAccentClass}`}>
                            ${row.totalSurrenderValue.toLocaleString()}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!clientSafeMode && (
                  <tr data-testid="comparison-official-links-row">
                    <td className="py-3 pl-4 pr-4 font-sans font-medium text-slate-600 align-top">
                      {t(
                        'Official Plan Page, Brochure / Policy & Premium PDFs',
                        '官方產品專頁、小冊子／保單條款與標準保費表'
                      )}
                    </td>
                    {selectedComparisonItems.map(({ plan }) => {
                      const docLinks = getPlanActionableHyperlinks(plan, planUrlOverrides);
                      return (
                        <td key={plan.id} className="py-3 px-4 font-sans text-xs align-top">
                          <div className="flex flex-col gap-1.5">
                            {plan.vhisCertificationNo && (
                              <span className="inline-block w-fit rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-900">
                                VHIS {plan.vhisCertificationNo}
                              </span>
                            )}
                            <a
                              href={docLinks.officialPageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid={`compare-official-link-${plan.id}`}
                              className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:underline"
                            >
                              <span>🔗 {t('Official Plan Page', '官方產品專頁')}</span>
                              <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                            {docLinks.brochureOrPolicyPdfUrl && (
                              <a
                                href={docLinks.brochureOrPolicyPdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`compare-brochure-link-${plan.id}`}
                                className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline"
                              >
                                <span>
                                  📄{' '}
                                  {t(
                                    docLinks.brochureLinkLabelEn,
                                    conv(docLinks.brochureLinkLabelZh)
                                  )}
                                </span>
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </a>
                            )}
                            {docLinks.standardPremiumPdfUrl && (
                              <a
                                href={docLinks.standardPremiumPdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`compare-std-premium-link-${plan.id}`}
                                className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:underline"
                              >
                                <span>💰 {t('Standard Premium PDF', '官方標準保費表')}</span>
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </a>
                            )}
                            {docLinks.promoFlyerPdfUrl && (
                              <a
                                href={docLinks.promoFlyerPdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`compare-promo-flyer-link-${plan.id}`}
                                className="inline-flex items-center gap-1 font-semibold text-amber-800 hover:underline"
                              >
                                <span>🎁 {t('Promo Flyer PDF', '最新推廣單張')}</span>
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </a>
                            )}
                            <div className="flex flex-wrap items-center gap-3 pt-0.5">
                              {docLinks.gn16ReportUrl && (
                                <a
                                  href={docLinks.gn16ReportUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:underline"
                                >
                                  <span>GN16</span>
                                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => runPlanLinkSubAgentAudit(plan)}
                                className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                              >
                                <Link2 className="h-3 w-3" aria-hidden="true" />
                                <span>{t('AI Review', 'AI 核實')}</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Sub-AI Agent Modal: Official Product Brochure & GN16 Link Finder + HTTP Reviewer */}
      {linkAuditModalPlan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Official Product and GN16 Link Verification Sub-Agent"
          data-testid="plan-link-subagent-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3.5">
              <div>
                <div className="font-mono text-[11px] font-bold text-blue-700">
                  {t(
                    'SUB-AI AGENT · OFFICIAL LINK DISCOVERY & HTTP AUDITOR',
                    'AI 連結巡檢子代理 · 官方「產品專頁」與「GN16」實時核實'
                  )}
                </div>
                <h3 className="mt-1 text-base font-bold text-slate-900">
                  [{linkAuditModalPlan.insurerCode}] {linkAuditModalPlan.nameZh} ({linkAuditModalPlan.nameEn})
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close link verification modal"
                onClick={() => setLinkAuditModalPlan(null)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {linkAuditLoading && (
              <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs font-medium text-blue-950">
                <Loader2 className="h-4 w-4 animate-spin text-blue-700 shrink-0" aria-hidden="true" />
                <span>
                  {t(
                    'Sub-Agent is probing insurer HTTP endpoints, checking for soft-404 redirects, and searching official HKIA / insurer portals...',
                    '子代理正在實時測試保司伺服器 HTTP 狀態、攔截 Soft-404 失效轉址，並搜尋香港保司與保監局官方有效連結...'
                  )}
                </span>
              </div>
            )}

            {linkAuditError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
                {linkAuditError}
              </div>
            )}

            {linkAuditResult && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800">
                  <div className="mb-1 font-bold text-slate-900">
                    {t('Sub-Agent Audit Verdict:', '子代理審核結論：')}
                  </div>
                  <p>
                    {lang === 'en'
                      ? linkAuditResult.aiReviewVerdictEn
                      : lang === 'zh-CN'
                      ? toSimplifiedChinese(linkAuditResult.aiReviewVerdictZh)
                      : linkAuditResult.aiReviewVerdictZh}
                  </p>
                </div>

                {/* 1. Official Product Page Probe */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">
                      {t('1. Official Product Page (產品專頁)', '1. 官方產品專頁連結 (Brochure / Portal)')}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        linkAuditResult.officialProbe.status === 'VERIFIED_200'
                          ? 'text-emerald-700'
                          : linkAuditResult.officialProbe.status === 'WAF_BROWSER_ONLY'
                          ? 'text-blue-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {lang === 'en'
                        ? linkAuditResult.officialProbe.statusSummaryEn
                        : linkAuditResult.officialProbe.statusSummaryZh}
                    </span>
                  </div>
                  {linkAuditResult.officialProbe.pageTitle && (
                    <div className="text-[11px] text-slate-500">
                      {t('Detected Title:', '網頁標題：')} {linkAuditResult.officialProbe.pageTitle}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <a
                      href={linkAuditResult.officialProbe.recommendedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[11px] font-semibold text-teal-800 hover:underline"
                    >
                      <span className="truncate">{linkAuditResult.officialProbe.recommendedUrl}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  </div>
                </div>

                {/* 2. GN16 Fulfillment Ratio Probe */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">
                      {t('2. GN16 Fulfillment Ratio Disclosure (分紅實現率)', '2. GN16 分紅實現率披露專頁')}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        linkAuditResult.gn16Probe.status === 'VERIFIED_200'
                          ? 'text-emerald-700'
                          : linkAuditResult.gn16Probe.status === 'NOT_APPLICABLE'
                          ? 'text-slate-500'
                          : 'text-blue-700'
                      }`}
                    >
                      {lang === 'en'
                        ? linkAuditResult.gn16Probe.statusSummaryEn
                        : linkAuditResult.gn16Probe.statusSummaryZh}
                    </span>
                  </div>

                  {linkAuditResult.gn16Probe.recommendedUrl ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <a
                        href={linkAuditResult.gn16Probe.recommendedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[11px] font-semibold text-blue-800 hover:underline"
                      >
                        <span className="truncate">{linkAuditResult.gn16Probe.recommendedUrl}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      </a>
                    </div>
                  ) : null}

                  <div className="pt-1">
                    <a
                      href={HKIA_CENTRAL_GN16_PORTAL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-950 hover:underline"
                    >
                      <span>
                        {t(
                          'HKIA Official Central Fulfillment Ratio Registry (ia.org.hk)',
                          '香港保監局官方「分紅實現率」中央披露索引 (ia.org.hk)'
                        )}
                      </span>
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </div>
                </div>

                {/* Grounded Sources */}
                {linkAuditResult.groundedSources.length > 0 && (
                  <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                    <div className="text-[11px] font-semibold text-slate-500">
                      {t('Verified Reference Portals:', '已核實官方來源索引：')}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {linkAuditResult.groundedSources.slice(0, 4).map((src, i) => (
                        <a
                          key={`${src.uri}-${i}`}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                        >
                          <span>[{i + 1}] {src.title}</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setLinkAuditModalPlan(null)}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t('Close', '關閉')}
                  </button>
                  {onApplyVerifiedPlanUrls && (
                    <button
                      type="button"
                      data-testid="apply-verified-plan-links-btn"
                      onClick={() => {
                        onApplyVerifiedPlanUrls(
                          linkAuditResult.planId,
                          linkAuditResult.officialProbe.recommendedUrl,
                          linkAuditResult.gn16Probe.recommendedUrl || undefined
                        );
                        setLinkAuditModalPlan(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {t(
                          'Apply Verified Official Links to Plan',
                          '套用已核實官方連結至此計劃'
                        )}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action-Gated Step 02 Footer: Unlocks Next Step ONLY when an active main plan is selected */}
      {stepGate && onGoNextStage && (
        <GuidedStepFooter
          gate={stepGate}
          onGoNext={onGoNextStage}
          testIdPrefix="stage2-guided"
        />
      )}
    </div>
  );
};
