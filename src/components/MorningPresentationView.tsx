import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit3,
  FileDown,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  Presentation,
  RotateCcw,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';
import {
  calculateDualCurrencyBundleSimulation,
  convertHkdToRmb,
  createDefaultMorningBriefingDeck,
  evaluateSixDimensionGapAudit,
  getDefaultRidersForScheme,
  TARGET_PROTECTION_SCHEMES,
} from '../domain/clientGapEngine';
import { derivePlanSyncProfile } from '../domain/crmAndCatalogTaxonomy';
import { UnifiedDealValuation } from '../domain/dealCaseEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  ClientLead,
  InsurancePlan,
  IntermediaryProfile,
  LeadStage,
  MorningBriefingSlide,
  TeamLibraryItem,
} from '../domain/types';
import {
  generateExecutiveSummaryDeckPdfBytes,
  triggerBrowserDownload,
} from '../services/pdfGenerator';
import { copyTextSafe } from '../utils/clipboardAndDom';

interface MorningPresentationViewProps {
  leads: ClientLead[];
  selectedLeadId: string;
  onSelectLeadId: (leadId: string) => void;
  plans: InsurancePlan[];
  selectedPlanId: string;
  onSelectPlanId?: (planId: string) => void;
  intermediary: IntermediaryProfile;
  customDecksByLeadId: Record<string, MorningBriefingSlide[]>;
  onUpdateDeckForLead: (leadId: string, slides: MorningBriefingSlide[]) => void;
  onResetDeckForLead: (leadId: string) => void;
  unifiedDeal?: UnifiedDealValuation;
  whiteLabelConfig?: {
    enabled: boolean;
    practiceTitleEn: string;
    practiceTitleZh: string;
    honorBadge: string;
    contactChannelLabel: string;
    accentHex: string;
  };
  teamLibraryItems?: TeamLibraryItem[];
  onCloneTeamItem?: (item: TeamLibraryItem) => void;
  onPublishTeamDeck?: (titleZh: string, summaryZh: string) => void;
  onNotify?: (msg: string, tone?: 'success' | 'warning') => void;
}

const SLIDE_ACCENT_BORDERS = [
  'border-t-teal-600',
  'border-t-rose-500',
  'border-t-amber-500',
  'border-t-indigo-600',
  'border-t-emerald-600',
];

const SHORT_AXIS_LABELS_ZH: Record<string, string> = {
  LIFE_MORTGAGE: '人壽按揭',
  PRIVATE_HOSPITAL: '私院手術',
  CRITICAL_ILLNESS: '嚴重危疾',
  CANCER_TARGETED: '癌症標靶',
  ACCIDENT_INCOME: '意外收入',
  RETIREMENT_DEMENTIA: '退休腦退化',
};

const SHORT_AXIS_LABELS_EN: Record<string, string> = {
  LIFE_MORTGAGE: 'Life & Debt',
  PRIVATE_HOSPITAL: 'Private Med',
  CRITICAL_ILLNESS: 'Major CI',
  CANCER_TARGETED: 'Cancer Drug',
  ACCIDENT_INCOME: 'Accident Inc',
  RETIREMENT_DEMENTIA: 'Retirement',
};

function polarPoint(cx: number, cy: number, radius: number, index: number, total = 6) {
  const angleRad = ((index * 360) / total - 90) * (Math.PI / 180);
  return {
    x: Number((cx + radius * Math.cos(angleRad)).toFixed(2)),
    y: Number((cy + radius * Math.sin(angleRad)).toFixed(2)),
  };
}

export const MorningPresentationView: React.FC<MorningPresentationViewProps> = ({
  leads,
  selectedLeadId,
  onSelectLeadId,
  plans,
  selectedPlanId,
  onSelectPlanId,
  intermediary,
  customDecksByLeadId,
  onUpdateDeckForLead,
  onResetDeckForLead,
  unifiedDeal,
  whiteLabelConfig,
  teamLibraryItems = [],
  onCloneTeamItem,
  onPublishTeamDeck,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zhHk: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk);

  const activeLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || leads[0],
    [leads, selectedLeadId]
  );

  const activePlan = useMemo(
    () =>
      unifiedDeal?.anchorPlan ??
      (selectedPlanId ? plans.find((p) => p.id === selectedPlanId) || null : null),
    [unifiedDeal?.anchorPlan, plans, selectedPlanId]
  );

  const planSyncProfile = useMemo(
    () => unifiedDeal?.planSyncProfile ?? derivePlanSyncProfile(activePlan, activeLead),
    [unifiedDeal?.planSyncProfile, activePlan, activeLead]
  );

  // Live 6-Dimension Gap Audit synced 1:1 with Stage 01 & Stage 03 Riders
  const gapAudit = useMemo(
    () =>
      unifiedDeal && unifiedDeal.lead.id === activeLead.id
        ? unifiedDeal.gapAudit
        : evaluateSixDimensionGapAudit(
            activeLead,
            activeLead.targetSchemeId,
            planSyncProfile?.dimensionCoverageBoostsHkd
          ),
    [unifiedDeal, activeLead, planSyncProfile]
  );

  // Live Dual-Currency Bundle & Claim Simulation synced 1:1 with Stage 03 Cart
  const bundleSim = useMemo(
    () =>
      unifiedDeal && unifiedDeal.lead.id === activeLead.id
        ? unifiedDeal.bundleSim
        : calculateDualCurrencyBundleSimulation({
            lead: activeLead,
            selectedPlan: activePlan,
            selectedRiderIds: getDefaultRidersForScheme(activeLead.targetSchemeId),
            paymentMode: 'ANNUAL',
            paymentTermYears: 10,
            fxRateHkdToRmb: 0.92,
            scenarioId: planSyncProfile?.suggestedScenarioId || 'HOSPITAL_MIN_INVASIVE',
          }),
    [unifiedDeal, activeLead, activePlan, planSyncProfile]
  );

  const slides = useMemo(() => {
    const custom = customDecksByLeadId[activeLead.id];
    if (custom && custom.length > 0) return custom;
    const baseDeck = createDefaultMorningBriefingDeck({
      lead: activeLead,
      intermediary,
      plan: activePlan,
    });
    return baseDeck.map((s, idx) =>
      idx === 1
        ? {
            ...s,
            titleZh: `六大防護維度診斷：補強後綜合達成率 ${gapAudit.overallCompletionPct}%`,
            titleEn: `6-Dimension Protection Gap Audit: ${gapAudit.overallCompletionPct}% Post-Proposal Fulfillment`,
          }
        : s
    );
  }, [customDecksByLeadId, activeLead, intermediary, activePlan, gapAudit.overallCompletionPct]);

  const [selectedSlideIdx, setSelectedSlideIdx] = useState(0);
  const [presenterMode, setPresenterMode] = useState(false);
  const [copiedDeck, setCopiedDeck] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [newBulletText, setNewBulletText] = useState('');
  const [showTeamLibrary, setShowTeamLibrary] = useState(false);

  const teamDeckItems = useMemo(
    () => teamLibraryItems.filter((item) => item.kind === 'CASE_DECK'),
    [teamLibraryItems]
  );

  const safeIdx = Math.min(selectedSlideIdx, Math.max(0, slides.length - 1));
  const currentSlide = slides[safeIdx];

  const updateCurrentSlide = (updater: (slide: MorningBriefingSlide) => MorningBriefingSlide) => {
    const updated = slides.map((s, idx) => (idx === safeIdx ? updater(s) : s));
    onUpdateDeckForLead(activeLead.id, updated);
  };

  const handleAddBullet = () => {
    const val = newBulletText.trim();
    if (!val) return;
    updateCurrentSlide((s) => ({
      ...s,
      bulletsZh: lang === 'en' ? s.bulletsZh : [...s.bulletsZh, val],
      bulletsEn: lang === 'en' ? [...s.bulletsEn, val] : [...s.bulletsEn, val],
    }));
    setNewBulletText('');
  };

  const handleDeleteBullet = (bulletIdx: number) => {
    updateCurrentSlide((s) => ({
      ...s,
      bulletsZh: s.bulletsZh.filter((_, i) => i !== bulletIdx),
      bulletsEn: s.bulletsEn.filter((_, i) => i !== bulletIdx),
    }));
  };

  const buildMarkdownExport = () => {
    const lines = [
      `# ${activeLead.fullNameZh} (${activeLead.fullNameEn}) — Agency Morning Case Presentation`,
      `Prepared by: ${intermediary.nameZh} (${intermediary.iaLicenseNo})`,
      activePlan
        ? `Locked Plan: [${activePlan.insurerCode}] ${activePlan.nameZh} (${activePlan.nameEn})`
        : `Target Architecture: ${gapAudit.schemeMeta.titleZh}`,
      '',
    ];
    slides.forEach((s) => {
      lines.push(`## ${lang === 'en' ? s.badgeEn : s.badgeZh} — ${lang === 'en' ? s.titleEn : s.titleZh}`);
      lines.push(`**${lang === 'en' ? s.keyMetricLabelEn : s.keyMetricLabelZh}:** ${s.keyMetricValue}`);
      (lang === 'en' ? s.bulletsEn : s.bulletsZh).forEach((b) => lines.push(`- ${b}`));
      lines.push(`> Speaker Cue: ${lang === 'en' ? s.speakerNoteEn : s.speakerNoteZh}`);
      lines.push('');
    });
    return lines.join('\n');
  };

  const handleCopyDeck = async () => {
    await copyTextSafe(buildMarkdownExport());
    setCopiedDeck(true);
    onNotify?.(
      t(
        `Copied 5-slide case presentation for ${activeLead.fullNameEn} to clipboard!`,
        conv(`已複製「${activeLead.fullNameZh}」5 頁早會簡報講稿至剪貼簿！`)
      )
    );
    window.setTimeout(() => setCopiedDeck(false), 2000);
  };

  const handleGeneratePdfExecutiveSummary = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      const { pdfBytes, fileName } = await generateExecutiveSummaryDeckPdfBytes({
        lead: activeLead,
        plan: activePlan,
        intermediary,
        slides,
        gapAudit,
        bundleSim,
        lang,
        whiteLabel: whiteLabelConfig,
      });
      triggerBrowserDownload(fileName, pdfBytes, 'application/pdf');
      onNotify?.(
        t(
          `Downloaded 5-slide PDF Executive Summary (${fileName}).`,
          conv(`已成功生成並下載 5 頁早會簡報執行摘要 PDF（${fileName}）！`)
        )
      );
    } catch (err: any) {
      onNotify?.(
        err?.message ||
          t(
            'Unable to generate PDF Executive Summary.',
            conv('生成 PDF 簡報執行摘要失敗，請重試。')
          ),
        'warning'
      );
    } finally {
      setExportingPdf(false);
    }
  };

  // Precompute Radar SVG geometry for Slide 1 (index 1) with generous label margins
  const radarGeometry = useMemo(() => {
    const cx = 200;
    const cy = 132;
    const maxR = 76;
    const rings = [0.25, 0.5, 0.75, 1.0].map((scale) =>
      Array.from({ length: 6 }, (_, i) => {
        const pt = polarPoint(cx, cy, maxR * scale, i, 6);
        return `${pt.x},${pt.y}`;
      }).join(' ')
    );

    const existingPolygon = gapAudit.rows
      .map((row, i) => {
        const ratio = Math.max(0.06, Math.min(1, row.existingPct / 100));
        const pt = polarPoint(cx, cy, maxR * ratio, i, 6);
        return `${pt.x},${pt.y}`;
      })
      .join(' ');

    const combinedPolygon = gapAudit.rows
      .map((row, i) => {
        const ratio = Math.max(0.12, Math.min(1, row.totalAchievementPct / 100));
        const pt = polarPoint(cx, cy, maxR * ratio, i, 6);
        return `${pt.x},${pt.y}`;
      })
      .join(' ');

    const axes = gapAudit.rows.map((row, i) => {
      const endPt = polarPoint(cx, cy, maxR, i, 6);
      const labelPt = polarPoint(cx, cy, maxR + 20, i, 6);
      const dotPt = polarPoint(
        cx,
        cy,
        maxR * Math.max(0.12, Math.min(1, row.totalAchievementPct / 100)),
        i,
        6
      );
      return {
        row,
        endPt,
        labelPt,
        dotPt,
      };
    });

    return { cx, cy, maxR, rings, existingPolygon, combinedPolygon, axes };
  }, [gapAudit.rows]);

  // Closing Readiness Milestones for Slide 4 (index 4)
  const readinessSteps = useMemo(() => {
    const fnaReady = Boolean(activeLead.fnaRecord);
    const kycReady =
      activeLead.residency === 'MCV'
        ? Boolean(activeLead.kycCheck.hkidVerified && activeLead.kycCheck.mcvEntrySlipVerified)
        : Boolean(activeLead.kycCheck.hkidVerified);
    const planLocked = Boolean(activePlan);
    const stpIssued =
      activeLead.stage === LeadStage.UNDERWRITING || activeLead.stage === LeadStage.IN_FORCE;

    return [
      {
        step: '01',
        done: fnaReady,
        titleZh: '保監局 GL30 財務需要分析 (FNA)',
        titleEn: 'HKIA GL30 Suitability FNA',
        detailZh: fnaReady
          ? `已完成簽署 · 風險取向 ${activeLead.fnaRecord?.riskTolerance || 'BALANCED'}`
          : '待補簽數位 GL30 財務分析表',
        detailEn: fnaReady
          ? `Signed · Risk profile: ${activeLead.fnaRecord?.riskTolerance || 'BALANCED'}`
          : 'Pending digital GL30 FNA signature',
      },
      {
        step: '02',
        done: kycReady,
        titleZh:
          activeLead.residency === 'MCV'
            ? 'MCV 入境白紙仔及雙證件核實'
            : '香港身份證／智方便 e-KYC 核實',
        titleEn:
          activeLead.residency === 'MCV'
            ? 'MCV Landing Slip & Travel Doc KYC'
            : 'HKID / iAM Smart e-KYC Check',
        detailZh: kycReady ? '證件與在港合規狀態已核實' : '需於簽單前完成 OCR 掃描或智方便認證',
        detailEn: kycReady ? 'Identity & onshore status verified' : 'Complete Vision OCR / iAM Smart check',
      },
      {
        step: '03',
        done: planLocked || Boolean(activeLead.targetSchemeId),
        titleZh: planLocked
          ? `已鎖定主推計劃：[${activePlan!.insurerCode}] ${activePlan!.nameZh}`
          : `目標保障架構：${gapAudit.schemeMeta.titleZh}`,
        titleEn: planLocked
          ? `Locked Plan: [${activePlan!.insurerCode}] ${activePlan!.nameEn}`
          : `Target Scheme: ${gapAudit.schemeMeta.titleEn}`,
        detailZh: `稅後淨保費 HK$ ${bundleSim.effectiveAfterTaxAnnualHkd.toLocaleString()} (¥ ${bundleSim.effectiveAfterTaxAnnualRmb.toLocaleString()})`,
        detailEn: `Net After-Tax HK$ ${bundleSim.effectiveAfterTaxAnnualHkd.toLocaleString()}`,
      },
      {
        step: '04',
        done: stpIssued,
        titleZh: '第 05 步雙重電子簽名 STP 直通遞交',
        titleEn: 'Dual e-Signature STP Submission',
        detailZh: stpIssued
          ? '已進入核保／保單生效階段'
          : '準備就緒：一鍵帶入客戶與計劃發起電子投保',
        detailEn: stpIssued ? 'Submitted to underwriting / In-Force' : 'Ready to launch STP e-Application',
      },
    ];
  }, [activeLead, activePlan, gapAudit.schemeMeta, bundleSim]);

  const budgetHkd = Math.max(10000, activeLead.annualBudgetHkd ?? 48000);
  const budgetRatio = Math.min(1.25, bundleSim.effectiveAfterTaxAnnualHkd / budgetHkd);

  return (
    <div className="space-y-6">
      {/* Executive Dark Command Header */}
      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-white shadow-xs">
        <div className="space-y-4 px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-teal-300">
                <Presentation className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="font-semibold">
                  {t(
                    'Agency Morning Briefing & Visual Case Deck',
                    conv('早會晨間簡報與視覺化個案演練工作台')
                  )}
                </span>
              </div>
              <h1
                className="text-xl font-bold tracking-tight text-white sm:text-2xl"
                style={{ textWrap: 'balance' }}
              >
                {t(
                  `Visual Case Deck — ${activeLead.fullNameEn} (${activeLead.age}y)`,
                  conv(`早會晨間簡報與個案編輯工作台（${activeLead.fullNameZh} · ${activeLead.age} 歲）`)
                )}
              </h1>
              <p className="text-xs text-slate-300">
                {t(
                  'Interactive 5-slide executive deck featuring live 6-axis radar, dual-currency tax waterfall, and claim payout charts.',
                  conv(
                    '即時連動客戶六維缺口雷達圖、雙幣保費扣稅瀑布圖與私院理賠對比圖，支援即場編輯講稿與全屏放映。'
                  )
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPresenterMode((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-500 whitespace-nowrap shrink-0 self-start"
            >
              {presenterMode ? (
                <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>
                {presenterMode
                  ? t('Exit Presenter Mode', conv('返回雙欄編輯'))
                  : t('Full-Width Slide Deck', conv('全寬放映模式'))}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="font-semibold text-teal-300">
                {t('Synced Case:', conv('當前連動個案：'))} {activeLead.fullNameZh} ({activeLead.age}
                {t('y', '歲')})
              </span>
              <span className="text-slate-600">·</span>
              <span>
                {activePlan
                  ? `[${activePlan.insurerCode}] ${lang === 'en' ? activePlan.nameEn : conv(activePlan.nameZh)}`
                  : t(gapAudit.schemeMeta.titleEn, conv(gapAudit.schemeMeta.titleZh))}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetDeckForLead(activeLead.id);
                  setSelectedSlideIdx(0);
                  setJustSynced(true);
                  window.setTimeout(() => setJustSynced(false), 2200);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap"
              >
                {justSynced ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {justSynced
                    ? t('✓ Deck Rebuilt from Live Data', conv('✓ 已同步最新數據'))
                    : t('Sync Latest Data', conv('依最新數據重產簡報'))}
                </span>
              </button>

              <button
                type="button"
                onClick={handleCopyDeck}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap"
              >
                {copiedDeck ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{copiedDeck ? t('Copied!', conv('已複製！')) : t('Copy Deck', conv('複製講稿'))}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerBrowserDownload(
                    `Morning_Briefing_${activeLead.fullNameEn.replace(/\s+/g, '_')}.md`,
                    buildMarkdownExport(),
                    'text/markdown;charset=utf-8'
                  );
                  onNotify?.(
                    t(
                      'Downloaded Markdown presentation deck (.md).',
                      conv('已下載早會個案簡報 Markdown 檔案 (.md)。')
                    )
                  );
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>.md</span>
              </button>

              <button
                type="button"
                data-testid="toggle-team-deck-library-btn"
                onClick={() => setShowTeamLibrary((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/50 bg-slate-800 px-3 py-2 text-xs font-semibold text-teal-300 hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {t(
                    `Team Case Library (${teamDeckItems.length})`,
                    conv(`團隊王牌案例庫 (${teamDeckItems.length})`)
                  )}
                </span>
              </button>

              <button
                type="button"
                data-testid="generate-pdf-executive-summary-btn"
                disabled={exportingPdf}
                onClick={handleGeneratePdfExecutiveSummary}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37] bg-[#F3D37A] px-3.5 py-2 text-xs font-bold text-[#0B172A] shadow-2xs transition-colors hover:bg-[#FCE394] disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {exportingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {exportingPdf
                    ? t('Generating PDF...', conv('生成 PDF 中...'))
                    : t(
                        'Generate PDF Executive Summary',
                        conv('匯出 PDF 執行摘要 (Generate PDF Executive Summary)')
                      )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Collapsible Agency Team Case Deck Library (#20) */}
      {showTeamLibrary && (
        <section
          data-testid="team-case-deck-library-panel"
          className="rounded-xl border border-slate-300 bg-white p-5 space-y-4 shadow-xs"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {t(
                  'Agency Team Case Deck Library (COT / TOT Proven Briefing Frameworks)',
                  conv('團隊王牌早會案例共享庫（一鍵套用 COT / TOT 成交簡報框架至當前客戶）')
                )}
              </h2>
              <p className="text-xs text-slate-600">
                {t(
                  'Clone a senior advisor deck framework directly onto the active client or publish your current 5-slide case to share with the agency.',
                  conv('點擊「套用框架」即可將資深總監成交切入點套用至當前客戶簡報；亦可將您編輯好的 5 頁簡報發佈至團隊庫。')
                )}
              </p>
            </div>
            {onPublishTeamDeck && (
              <button
                type="button"
                data-testid="publish-current-deck-team-btn"
                onClick={() => {
                  const titleZh = `【實戰分享】${activeLead.age}歲 ${activeLead.roleTagZh || '核心家庭'}：${
                    activePlan ? activePlan.nameZh : gapAudit.schemeMeta.titleZh
                  }`;
                  const summaryZh = `年度保費 HK$${bundleSim.netAnnualPremiumHkd.toLocaleString()}，綜合缺口達成率 ${gapAudit.overallCompletionPct}%。`;
                  onPublishTeamDeck(titleZh, summaryZh);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Share2 className="h-3.5 w-3.5 text-[#F3D37A]" aria-hidden="true" />
                <span>{t('Publish Current Deck to Team', conv('發佈當前 5 頁簡報至團隊庫'))}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {teamDeckItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span className="font-semibold text-teal-800">{item.authorName}</span>
                    <span className="font-mono tabular-nums">
                      {t(`Cloned ${item.cloneCount}x`, conv(`已被複製 ${item.cloneCount} 次`))}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">
                    {lang === 'en' ? item.titleEn : conv(item.titleZh)}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {lang === 'en' ? item.summaryEn : conv(item.summaryZh)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tg) => (
                      <span
                        key={tg}
                        className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600"
                      >
                        {conv(tg)}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const clonedDeck = slides.map((s, idx) =>
                        idx === 0
                          ? {
                              ...s,
                              speakerNoteZh: `${item.summaryZh}（套用自 ${item.authorName} 王牌框架）`,
                              speakerNoteEn: `${item.summaryEn} (Cloned from ${item.authorName})`,
                            }
                          : s
                      );
                      onUpdateDeckForLead(activeLead.id, clonedDeck);
                      onCloneTeamItem?.(item);
                      setShowTeamLibrary(false);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-900 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-slate-900 hover:text-white transition-colors whitespace-nowrap shrink-0"
                  >
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    <span>{t('Apply Framework', conv('套用此案例框架'))}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5-Slide Navigator Strip with Semantic Top Accents */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-5">
        {slides.map((s, idx) => {
          const active = idx === safeIdx;
          const topAccent = SLIDE_ACCENT_BORDERS[idx % SLIDE_ACCENT_BORDERS.length];
          return (
            <button
              key={s.id}
              type="button"
              data-testid={`morning-slide-tab-${idx}`}
              aria-pressed={active}
              onClick={() => setSelectedSlideIdx(idx)}
              className={`rounded-xl border border-t-4 px-3.5 py-3 text-left ${topAccent} ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
              }`}
            >
              <div
                className={`font-mono text-[10px] font-bold ${
                  active ? 'text-teal-300' : 'text-slate-500'
                }`}
              >
                {t(s.badgeEn, conv(s.badgeZh))}
              </div>
              <div
                className={`mt-1 truncate text-xs font-bold ${
                  active ? 'text-white' : 'text-slate-900'
                }`}
              >
                {t(s.titleEn, conv(s.titleZh))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Executive Slide Canvas + Optional Inline Editor */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Live Visual Executive Slide */}
        <section
          data-testid="morning-slide-canvas"
          className={`${
            presenterMode ? 'lg:col-span-12' : 'lg:col-span-8'
          } rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-7 text-white shadow-sm flex flex-col justify-between space-y-6`}
        >
          {/* Slide Top Meta Bar */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-teal-300">
                <Presentation className="h-4 w-4" aria-hidden="true" />
                <span>{t(currentSlide.badgeEn, conv(currentSlide.badgeZh))}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-300">
                  {activePlan
                    ? `[${activePlan.insurerCode}] ${lang === 'en' ? activePlan.nameEn : conv(activePlan.nameZh)}`
                    : t(gapAudit.schemeMeta.titleEn, conv(gapAudit.schemeMeta.titleZh))}
                </span>
              </span>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {activeLead.fullNameZh} ({activeLead.age}
                {t('y', '歲')}) · {intermediary.nameZh} ({intermediary.iaLicenseNo})
              </span>
            </div>

            {/* 2-Column Slide Split: Left Executive Narrative + Right Live SVG Infographic */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-stretch">
              {/* Left Narrative Column */}
              <div className="xl:col-span-6 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <h2
                    className="text-xl font-bold leading-snug tracking-tight text-white"
                    style={{ textWrap: 'balance' }}
                  >
                    {t(currentSlide.titleEn, conv(currentSlide.titleZh))}
                  </h2>

                  <div className="rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-slate-300">
                      {t(currentSlide.keyMetricLabelEn, conv(currentSlide.keyMetricLabelZh))}
                    </span>
                    <span className="font-mono text-sm font-bold text-teal-300 tabular-nums">
                      {currentSlide.keyMetricValue}
                    </span>
                  </div>

                  <ul className="space-y-2.5 pt-1">
                    {(lang === 'en' ? currentSlide.bulletsEn : currentSlide.bulletsZh).map(
                      (bullet, bIdx) => (
                        <li
                          key={bIdx}
                          className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-slate-100"
                        >
                          <span className="mt-1.5 font-mono text-[10px] font-bold text-teal-400 tabular-nums">
                            0{bIdx + 1}
                          </span>
                          <span>{lang === 'en' ? bullet : conv(bullet)}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                    {t('Agency Huddle Speaker Cue', conv('早會主持人帶教提示'))}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-200">
                    {t(currentSlide.speakerNoteEn, conv(currentSlide.speakerNoteZh))}
                  </p>
                </div>
              </div>

              {/* Right Live Data Visualization Column */}
              <div
                data-testid="morning-slide-visual"
                className="xl:col-span-6 rounded-xl border border-slate-700/90 bg-slate-950/85 p-5 flex flex-col justify-between space-y-4"
              >
                {/* SLIDE 0 VISUAL: Budget Gauge + 4-Scheme Architecture Matrix */}
                {safeIdx === 0 && (
                  <>
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-teal-300">
                          {t(
                            'Annual Budget Utilization & Scheme Fit',
                            conv('年度保費預算配置儀表板（港幣／人民幣）')
                          )}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                          {Math.round(budgetRatio * 100)}% {t('of Budget', conv('預算佔比'))}
                        </span>
                      </div>

                      {/* SVG Semi-Circular Arc Gauge */}
                      <div className="mt-3 flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-900/90 p-3.5">
                        <svg
                          viewBox="0 0 140 82"
                          className="h-20 w-32 shrink-0"
                          role="img"
                          aria-label="Client annual budget utilization gauge"
                        >
                          <path
                            d="M 16 70 A 54 54 0 0 1 124 70"
                            fill="none"
                            stroke="#1e293b"
                            strokeWidth="12"
                            strokeLinecap="round"
                          />
                          <path
                            d="M 16 70 A 54 54 0 0 1 124 70"
                            fill="none"
                            stroke={bundleSim.withinClientBudget ? '#14b8a6' : '#f59e0b'}
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray="169.6"
                            strokeDashoffset={Number(
                              (169.6 * (1 - Math.min(1, budgetRatio))).toFixed(1)
                            )}
                          />
                          <text
                            x="70"
                            y="62"
                            textAnchor="middle"
                            className="fill-white font-mono text-[15px] font-bold"
                          >
                            {Math.round(budgetRatio * 100)}%
                          </text>
                        </svg>

                        <div className="min-w-0 space-y-1 text-xs">
                          <div className="text-slate-400">
                            {t('Client Annual Budget:', conv('客戶年度預算上限：'))}
                          </div>
                          <div className="font-mono text-sm font-bold text-white tabular-nums">
                            HK$ {budgetHkd.toLocaleString()}{' '}
                            <span className="text-xs font-normal text-slate-400">
                              (≈ ¥ {convertHkdToRmb(budgetHkd).toLocaleString()})
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-teal-300 tabular-nums">
                            {t('Proposed Net:', conv('規劃稅後淨保費：'))} HK${' '}
                            {bundleSim.effectiveAfterTaxAnnualHkd.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-slate-400">
                        {t(
                          '4 Target Protection Architectures Comparison',
                          conv('四大目標保障架構基準保費對照')
                        )}
                      </div>
                      {TARGET_PROTECTION_SCHEMES.map((sch) => {
                        const isTarget =
                          (activeLead.targetSchemeId || 'FAMILY_COMPREHENSIVE') === sch.id;
                        const widthPct = Math.min(
                          100,
                          Math.round((sch.baseAnnualPremiumHkd / 68000) * 100)
                        );
                        return (
                          <div
                            key={sch.id}
                            className={`rounded-lg border px-3 py-2 ${
                              isTarget
                                ? 'border-teal-500/70 bg-teal-950/40'
                                : 'border-slate-800 bg-slate-900/60'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span
                                className={`font-semibold ${
                                  isTarget ? 'text-teal-300' : 'text-slate-300'
                                }`}
                              >
                                {t(sch.titleEn, conv(sch.titleZh))}
                                {isTarget ? ` · ${t('LOCKED', conv('當前鎖定'))}` : ''}
                              </span>
                              <span className="font-mono text-xs font-bold text-white tabular-nums">
                                HK$ {sch.baseAnnualPremiumHkd.toLocaleString()}
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-slate-800">
                              <div
                                style={{ width: `${widthPct}%` }}
                                className={`h-full rounded ${
                                  isTarget ? 'bg-teal-400' : 'bg-slate-600'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* SLIDE 1 VISUAL: Custom SVG Hexagonal 6-Axis Protection Radar */}
                {safeIdx === 1 && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-teal-300">
                        {t(
                          '6-Axis Protection Radar (Existing vs. Post-Proposal)',
                          conv('六大保障維度雷達圖（既有保單 vs 新規劃補強後）')
                        )}
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-400 tabular-nums">
                        {t('Overall Fulfillment:', conv('綜合達成率：'))}{' '}
                        {gapAudit.overallCompletionPct}%
                      </span>
                    </div>

                    <div className="flex justify-center rounded-lg border border-slate-800 bg-slate-900/90 px-2 py-2">
                      <svg
                        data-testid="morning-radar-svg"
                        viewBox="0 0 400 264"
                        className="h-56 w-full max-w-[400px]"
                        role="img"
                        aria-label="Hexagonal 6-axis protection gap radar chart"
                      >
                        {/* Concentric hexagonal target rings */}
                        {radarGeometry.rings.map((pts, idx) => (
                          <polygon
                            key={idx}
                            points={pts}
                            fill="none"
                            stroke={idx === 3 ? '#475569' : '#1e293b'}
                            strokeWidth={idx === 3 ? '1.4' : '1'}
                            strokeDasharray={idx === 3 ? '3 2' : undefined}
                          />
                        ))}

                        {/* Axis spokes */}
                        {radarGeometry.axes.map((ax, idx) => (
                          <line
                            key={idx}
                            x1={radarGeometry.cx}
                            y1={radarGeometry.cy}
                            x2={ax.endPt.x}
                            y2={ax.endPt.y}
                            stroke="#334155"
                            strokeWidth="1"
                          />
                        ))}

                        {/* Existing Coverage Polygon (Slate) */}
                        <polygon
                          points={radarGeometry.existingPolygon}
                          fill="rgba(148, 163, 184, 0.28)"
                          stroke="#94a3b8"
                          strokeWidth="1.8"
                        />

                        {/* Post-Proposal Combined Coverage Polygon (Teal/Emerald) */}
                        <polygon
                          points={radarGeometry.combinedPolygon}
                          fill="rgba(20, 184, 166, 0.34)"
                          stroke="#2dd4bf"
                          strokeWidth="2.4"
                        />

                        {/* Vertex nodes & Axis Labels */}
                        {radarGeometry.axes.map((ax, idx) => {
                          const shortLabel =
                            lang === 'en'
                              ? SHORT_AXIS_LABELS_EN[ax.row.dimensionId]
                              : conv(SHORT_AXIS_LABELS_ZH[ax.row.dimensionId] || ax.row.labelZh);
                          return (
                            <g key={ax.row.dimensionId}>
                              <circle
                                cx={ax.dotPt.x}
                                cy={ax.dotPt.y}
                                r="3.8"
                                fill={ax.row.isFullyCovered ? '#34d399' : '#fbbf24'}
                                stroke="#0f172a"
                                strokeWidth="1.2"
                              />
                              <text
                                x={ax.labelPt.x}
                                y={ax.labelPt.y}
                                textAnchor={
                                  idx === 0 || idx === 3
                                    ? 'middle'
                                    : idx < 3
                                    ? 'start'
                                    : 'end'
                                }
                                dominantBaseline="middle"
                                className="fill-slate-200 text-[10px] font-semibold"
                              >
                                {shortLabel} ({ax.row.totalAchievementPct}%)
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {gapAudit.rows.map((r) => (
                        <div
                          key={r.dimensionId}
                          className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/70 px-2.5 py-1.5"
                        >
                          <span className="truncate text-slate-300">
                            {lang === 'en'
                              ? SHORT_AXIS_LABELS_EN[r.dimensionId]
                              : conv(SHORT_AXIS_LABELS_ZH[r.dimensionId] || r.labelZh)}
                          </span>
                          <span
                            className={`font-mono font-bold tabular-nums ${
                              r.isFullyCovered ? 'text-emerald-400' : 'text-amber-300'
                            }`}
                          >
                            {r.totalAchievementPct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* SLIDE 2 VISUAL: Dual-Currency Cost & Tax Relief Waterfall */}
                {safeIdx === 2 && (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-300">
                        {t(
                          'Dual-Currency Premium & IRD Tax Waterfall',
                          conv('雙幣保費結構與扣稅減免瀑布分解圖')
                        )}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                        1 HKD ≈ 0.92 RMB
                      </span>
                    </div>

                    <div className="space-y-2.5 rounded-lg border border-slate-800 bg-slate-900/85 p-4">
                      {[
                        {
                          labelEn: '1. Base Plan Annual',
                          labelZh: '1. 主約基準年繳保費',
                          hkd: bundleSim.basePlanAnnualHkd,
                          barColor: 'bg-sky-500',
                          sign: '',
                        },
                        {
                          labelEn: '2. Modular Riders Stack',
                          labelZh: '2. 自選醫療／危疾／按揭附約',
                          hkd: bundleSim.ridersAnnualHkd,
                          barColor: 'bg-indigo-400',
                          sign: '+',
                        },
                        {
                          labelEn: `3. Multi-Rider Discount (${bundleSim.bundleDiscountPct}%)`,
                          labelZh: `3. 組合附約整併折扣 (${bundleSim.bundleDiscountPct}%)`,
                          hkd: bundleSim.bundleDiscountHkd,
                          barColor: 'bg-emerald-500',
                          sign: '−',
                        },
                        {
                          labelEn: '4. Est. VHIS / QDAP Tax Saved',
                          labelZh: '4. 預估薪俸稅扣稅節省 (IRD)',
                          hkd: bundleSim.estimatedTaxSavedHkd,
                          barColor: 'bg-amber-400',
                          sign: '−',
                        },
                      ].map((stepItem, i) => {
                        const denom = Math.max(
                          1,
                          bundleSim.basePlanAnnualHkd + bundleSim.ridersAnnualHkd
                        );
                        const pct = Math.max(6, Math.min(100, Math.round((stepItem.hkd / denom) * 100)));
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-300">
                                {t(stepItem.labelEn, conv(stepItem.labelZh))}
                              </span>
                              <span className="font-mono font-bold text-white tabular-nums">
                                {stepItem.sign}HK$ {stepItem.hkd.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded bg-slate-800">
                              <div
                                style={{ width: `${pct}%` }}
                                className={`h-full rounded ${stepItem.barColor}`}
                              />
                            </div>
                          </div>
                        );
                      })}

                      <div className="mt-3 border-t border-slate-700 pt-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-teal-300">
                            {t('Effective Net Annual Cost', conv('稅後實際每年淨支出'))}
                          </div>
                          <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                            {t('Monthly eq.:', conv('平均每月：'))} HK${' '}
                            {bundleSim.monthlyEquivalentHkd.toLocaleString()} (¥{' '}
                            {bundleSim.monthlyEquivalentRmb.toLocaleString()})
                          </div>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <div className="text-base font-extrabold text-white">
                            HK$ {bundleSim.effectiveAfterTaxAnnualHkd.toLocaleString()}
                          </div>
                          <div className="text-xs font-semibold text-teal-300">
                            ≈ ¥ {bundleSim.effectiveAfterTaxAnnualRmb.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* SLIDE 3 VISUAL: Claim Payout Waterfall vs Client Out-of-Pocket */}
                {safeIdx === 3 && (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-indigo-300">
                          {t('Simulated Claim Stress Test', conv('理賠實況壓力測試瀑布圖'))}
                        </span>
                        <span className="font-mono text-[11px] text-emerald-400 tabular-nums">
                          {bundleSim.scenarioOutcome.clientOutOfPocketHkd === 0
                            ? t('HK$ 0 Out-of-Pocket', conv('客戶自付差額 HK$ 0'))
                            : `自付 HK$ ${bundleSim.scenarioOutcome.clientOutOfPocketHkd.toLocaleString()}`}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white">
                        {t(
                          bundleSim.scenarioOutcome.scenario.titleEn,
                          conv(bundleSim.scenarioOutcome.scenario.titleZh)
                        )}
                      </p>
                    </div>

                    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/85 p-4">
                      {[
                        {
                          labelEn: 'Total Private Hospital / Event Loss',
                          labelZh: '私院帳單／停工總財務衝擊',
                          hkd: bundleSim.scenarioOutcome.totalEventCostHkd,
                          color: 'bg-rose-500',
                        },
                        {
                          labelEn: 'Existing Group / Old Policy Payout',
                          labelZh: '客戶既有團保／舊保單賠付',
                          hkd: bundleSim.scenarioOutcome.existingPolicyPayoutHkd,
                          color: 'bg-slate-500',
                        },
                        {
                          labelEn: 'New Proposed Plan & Riders Payout',
                          labelZh: '本次新規劃主約＋附約賠付',
                          hkd: bundleSim.scenarioOutcome.newBundlePayoutHkd,
                          color: 'bg-teal-400',
                        },
                      ].map((bar, idx) => {
                        const maxCost = Math.max(
                          bundleSim.scenarioOutcome.totalEventCostHkd,
                          bundleSim.scenarioOutcome.totalCoveredHkd,
                          1
                        );
                        const w = Math.max(4, Math.min(100, Math.round((bar.hkd / maxCost) * 100)));
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-300">
                                {t(bar.labelEn, conv(bar.labelZh))}
                              </span>
                              <span className="font-mono font-bold text-white tabular-nums">
                                HK$ {bar.hkd.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded bg-slate-800">
                              <div
                                style={{ width: `${w}%` }}
                                className={`h-full rounded ${bar.color}`}
                              />
                            </div>
                          </div>
                        );
                      })}

                      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800 text-xs">
                        <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
                          <div className="text-[11px] text-slate-400">
                            {t('Client Out-of-Pocket', conv('客戶最終自掏腰包'))}
                          </div>
                          <div className="mt-0.5 font-mono text-sm font-extrabold text-emerald-400 tabular-nums">
                            HK$ {bundleSim.scenarioOutcome.clientOutOfPocketHkd.toLocaleString()}
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
                          <div className="text-[11px] text-slate-400">
                            {t('Recovery Cash Buffer', conv('額外康復生活現金池'))}
                          </div>
                          <div className="mt-0.5 font-mono text-sm font-extrabold text-teal-300 tabular-nums">
                            +HK$ {bundleSim.scenarioOutcome.surplusCashBufferHkd.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* SLIDE 4 VISUAL: 4-Milestone Closing Readiness Pipeline */}
                {safeIdx === 4 && (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-300">
                        {t(
                          '4-Step Regulatory & Closing Readiness',
                          conv('四步合規促單與 STP 直通進度看板')
                        )}
                      </span>
                      <span className="font-mono text-xs font-bold text-white tabular-nums">
                        {readinessSteps.filter((s) => s.done).length} / 4{' '}
                        {t('Ready', conv('項已就緒'))}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {readinessSteps.map((st) => (
                        <div
                          key={st.step}
                          className={`flex items-start gap-3 rounded-lg border p-3 ${
                            st.done
                              ? 'border-emerald-500/50 bg-emerald-950/30'
                              : 'border-amber-500/40 bg-slate-900/80'
                          }`}
                        >
                          {st.done ? (
                            <CheckCircle2
                              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                              aria-hidden="true"
                            />
                          ) : (
                            <Clock
                              className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
                              aria-hidden="true"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-white">
                                {st.step}. {t(st.titleEn, conv(st.titleZh))}
                              </span>
                              <span
                                className={`font-mono text-[10px] font-bold whitespace-nowrap ${
                                  st.done ? 'text-emerald-300' : 'text-amber-300'
                                }`}
                              >
                                {st.done ? t('READY', conv('已完成')) : t('ACTION', conv('待辦'))}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-300">
                              {t(st.detailEn, conv(st.detailZh))}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Slide Deck Footer Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              disabled={safeIdx === 0}
              onClick={() => setSelectedSlideIdx((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-40 whitespace-nowrap"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('Previous Slide', conv('上一頁簡報'))}</span>
            </button>

            <span className="font-mono text-xs font-semibold text-slate-400 tabular-nums">
              {t('Slide', conv('簡報頁次'))} {safeIdx + 1} / {slides.length}
            </span>

            <button
              type="button"
              disabled={safeIdx >= slides.length - 1}
              onClick={() => setSelectedSlideIdx((i) => Math.min(slides.length - 1, i + 1))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-40 whitespace-nowrap"
            >
              <span>{t('Next Slide', conv('下一頁簡報'))}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* Inline Slide Editor Panel */}
        {!presenterMode && (
          <section className="lg:col-span-4 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xs">
            <div className="flex items-center gap-2 bg-slate-900 px-5 py-3.5 text-white">
              <Edit3 className="h-4 w-4 text-teal-400" aria-hidden="true" />
              <h3 className="text-sm font-bold text-white">
                {t('Edit Current Slide Copy', conv('即時編輯本頁早會講稿'))}
              </h3>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Slide Title', conv('簡報標題'))}
                </label>
                <input
                  type="text"
                  value={lang === 'en' ? currentSlide.titleEn : currentSlide.titleZh}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateCurrentSlide((s) =>
                      lang === 'en' ? { ...s, titleEn: val } : { ...s, titleZh: val }
                    );
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('Key Metric Label', conv('焦點數據標籤'))}
                  </label>
                  <input
                    type="text"
                    value={
                      lang === 'en' ? currentSlide.keyMetricLabelEn : currentSlide.keyMetricLabelZh
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      updateCurrentSlide((s) =>
                        lang === 'en'
                          ? { ...s, keyMetricLabelEn: val }
                          : { ...s, keyMetricLabelZh: val }
                      );
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('Key Metric Value', conv('焦點數據內容'))}
                  </label>
                  <input
                    type="text"
                    value={currentSlide.keyMetricValue}
                    onChange={(e) =>
                      updateCurrentSlide((s) => ({ ...s, keyMetricValue: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Talking Points', conv('簡報要點列表'))}
                </label>
                {(lang === 'en' ? currentSlide.bulletsEn : currentSlide.bulletsZh).map(
                  (bullet, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-2">
                      <textarea
                        rows={2}
                        value={bullet}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateCurrentSlide((s) =>
                            lang === 'en'
                              ? {
                                  ...s,
                                  bulletsEn: s.bulletsEn.map((item, i) =>
                                    i === bIdx ? val : item
                                  ),
                                }
                              : {
                                  ...s,
                                  bulletsZh: s.bulletsZh.map((item, i) =>
                                    i === bIdx ? val : item
                                  ),
                                }
                          );
                        }}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteBullet(bIdx)}
                        aria-label="Delete slide bullet"
                        className="mt-1 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newBulletText}
                    onChange={(e) => setNewBulletText(e.target.value)}
                    placeholder={conv('新增一條早會簡報要點...')}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddBullet}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t('Add', conv('新增'))}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Speaker Cue Note', conv('主持提示／總結金句'))}
                </label>
                <textarea
                  rows={2}
                  value={lang === 'en' ? currentSlide.speakerNoteEn : currentSlide.speakerNoteZh}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateCurrentSlide((s) =>
                      lang === 'en' ? { ...s, speakerNoteEn: val } : { ...s, speakerNoteZh: val }
                    );
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
