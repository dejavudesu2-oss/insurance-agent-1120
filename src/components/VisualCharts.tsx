import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { HKIA_REGISTER_COMPLETENESS_SEGMENTS } from '../data/hkAdditionalMarketPlans';
import { ClaimScenarioId, convertHkdToRmb, DimensionGapEvaluationRow } from '../domain/clientGapEngine';
import { ScenarioComparisonItem } from '../domain/dealCaseEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import { ClauseDimensionComparison } from '../domain/clauseAndMonetizationEngine';
import {
  ActuarialQuoteResult,
  CurrencyCode,
  InsurancePlan,
  PlanCategory,
  ProtectionDimensionId,
} from '../domain/types';
import { COMPARE_SLOT_CLASSIFICATION } from '../domain/planLinksAndOffersEngine';

// ============================================================================
// 1. HKIA STATUTORY REGISTER & CATEGORY VISUAL BAR (SECTION 01)
// ============================================================================

interface MarketCoverageVisualBarProps {
  plans: InsurancePlan[];
  insurerCount: number;
  onSelectCategory?: (cat: 'ALL' | PlanCategory) => void;
}

const CATEGORY_COLORS: Record<PlanCategory, string> = {
  [PlanCategory.PARTICIPATING_SAVINGS]: '#1d4ed8',
  [PlanCategory.CRITICAL_ILLNESS]: '#0f766e',
  [PlanCategory.VHIS]: '#0369a1',
  [PlanCategory.HIGH_END_MEDICAL]: '#4338ca',
  [PlanCategory.QDAP]: '#b45309',
  [PlanCategory.UNIVERSAL_LIFE]: '#334155',
  [PlanCategory.TERM_LIFE]: '#15803d',
  [PlanCategory.GENERAL_GI]: '#64748b',
};

const CATEGORY_SHORT_LABELS: Record<PlanCategory, { en: string; zh: string }> = {
  [PlanCategory.PARTICIPATING_SAVINGS]: { en: 'Savings', zh: '分紅儲蓄' },
  [PlanCategory.CRITICAL_ILLNESS]: { en: 'Critical Illness', zh: '危疾保障' },
  [PlanCategory.VHIS]: { en: 'VHIS', zh: '自願醫保' },
  [PlanCategory.HIGH_END_MEDICAL]: { en: 'High-End Med', zh: '高端醫療' },
  [PlanCategory.QDAP]: { en: 'QDAP Annuity', zh: '扣稅年金' },
  [PlanCategory.UNIVERSAL_LIFE]: { en: 'Universal Life', zh: '萬用壽險' },
  [PlanCategory.TERM_LIFE]: { en: 'Term Life', zh: '定期人壽' },
  [PlanCategory.GENERAL_GI]: { en: 'Personal GI', zh: '旅遊家傭家居' },
};

export const MarketCoverageVisualBar: React.FC<MarketCoverageVisualBarProps> = ({
  plans,
  insurerCount,
  onSelectCategory,
}) => {
  const { lang, t } = useLanguage();
  const [expandedAudit, setExpandedAudit] = useState(false);

  const total = Math.max(1, plans.length);
  const categoryBreakdown = (Object.keys(CATEGORY_COLORS) as PlanCategory[]).map((cat) => {
    const count = plans.filter((p) => p.category === cat).length;
    return {
      cat,
      count,
      pct: Math.max(2, Math.round((count / total) * 100)),
      color: CATEGORY_COLORS[cat],
      label: CATEGORY_SHORT_LABELS[cat],
    };
  });

  return (
    <section
      aria-label="Hong Kong market plan completeness visual overview"
      className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {t(
              `HKIA Retail Market Completeness Visual Audit — ${insurerCount} Active Retail/HNW/GI Insurers (${plans.length} Plans)`,
              `香港保監局零售市場覆蓋率視覺化審計 — 已收錄全港 ${insurerCount} 間活躍零售／高淨值／一般險保司（共 ${plans.length} 款計劃）`
            )}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {t(
              '100% of active HK consumer life, savings, CI, VHIS, annuity & personal GI insurers indexed · Click any segment to filter.',
              '100% 覆蓋香港公開發售個人壽險、儲蓄、危疾、自願醫保、香港年金及個人一般險保司 · 點擊色塊可即時篩選類別。'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpandedAudit((prev) => !prev)}
          aria-expanded={expandedAudit}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <span>
            {expandedAudit
              ? t('Hide HKIA 165-Entity Breakdown', '收起保監 165 間持牌機構對照')
              : t(
                  `Why ${insurerCount} vs 165 HKIA Entities?`,
                  `核查：為何是 ${insurerCount} 間而非 165 間？`
                )}
          </span>
          {expandedAudit ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Stacked Proportional Category Bar */}
      <div>
        <div className="flex h-3.5 w-full overflow-hidden rounded-md bg-slate-100">
          {categoryBreakdown.map((seg) => (
            <button
              key={seg.cat}
              type="button"
              title={`${t(seg.label.en, seg.label.zh)}: ${seg.count}`}
              onClick={() => onSelectCategory?.(seg.cat)}
              style={{ width: `${(seg.count / total) * 100}%`, backgroundColor: seg.color }}
              className="h-full transition-opacity hover:opacity-85 focus:outline-none"
            />
          ))}
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4 lg:grid-cols-8">
          {categoryBreakdown.map((seg) => (
            <button
              key={seg.cat}
              type="button"
              onClick={() => onSelectCategory?.(seg.cat)}
              className="flex items-center justify-between gap-1.5 rounded px-1.5 py-1 text-left text-[11px] hover:bg-slate-50"
            >
              <span className="inline-flex items-center gap-1.5 truncate font-medium text-slate-700">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-xs"
                  style={{ backgroundColor: seg.color }}
                  aria-hidden="true"
                />
                <span className="truncate">{t(seg.label.en, seg.label.zh)}</span>
              </span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">{seg.count}</span>
            </button>
          ))}
        </div>
      </div>

      {expandedAudit && (
        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 md:grid-cols-2">
          {HKIA_REGISTER_COMPLETENESS_SEGMENTS.map((seg) => {
            const covPct =
              seg.hkiaStatutoryCount > 0
                ? Math.round((seg.inAppCoveredCount / seg.hkiaStatutoryCount) * 100)
                : 0;
            const desc =
              lang === 'en'
                ? seg.retailRelevanceEn
                : lang === 'zh-CN'
                ? toSimplifiedChinese(seg.retailRelevanceZh)
                : seg.retailRelevanceZh;
            return (
              <div
                key={seg.segmentCode}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-900">
                    {t(seg.titleEn, seg.titleZh)}
                  </span>
                  <span className="font-mono font-bold text-blue-700 whitespace-nowrap tabular-nums">
                    {seg.includedInCatalog
                      ? `${seg.inAppCoveredCount}/${seg.hkiaStatutoryCount} (${covPct}%)`
                      : `${seg.hkiaStatutoryCount} Non-Retail`}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-slate-200">
                  <div
                    className={`h-full ${
                      seg.includedInCatalog ? 'bg-emerald-600' : 'bg-slate-400'
                    }`}
                    style={{ width: seg.includedInCatalog ? '100%' : '18%' }}
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">{desc}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

// ============================================================================
// 2. MULTI-PLAN SURRENDER TRAJECTORY SVG CHART (SECTION 01)
// ============================================================================

interface SurrenderTrajectoryChartProps {
  items: Array<{
    plan: InsurancePlan;
    quote: ActuarialQuoteResult;
    displayTitle: string;
    slotIndex?: 0 | 1 | 2;
  }>;
  currency: CurrencyCode;
}

export const SurrenderTrajectoryChart: React.FC<SurrenderTrajectoryChartProps> = ({
  items,
  currency,
}) => {
  const { t } = useLanguage();
  const indexedItems = items.slice(0, 3).map((it, idx) => ({
    ...it,
    resolvedSlot: (it.slotIndex ?? idx) as 0 | 1 | 2,
  }));
  const cashValueItems = indexedItems.filter((it) =>
    it.quote.projections.some((p) => p.totalSurrenderValue > 0)
  );

  if (cashValueItems.length === 0) {
    return null;
  }

  const years = [5, 10, 15, 20, 30];
  const maxVal = Math.max(
    1,
    ...cashValueItems.flatMap((it) => [
      it.quote.totalPremiumsPaid,
      ...it.quote.projections.map((p) => p.totalSurrenderValue),
    ])
  );

  const width = 760;
  const height = 230;
  const padL = 74;
  const padR = 24;
  const padT = 18;
  const padB = 34;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const xForIdx = (idx: number) => padL + (idx / (years.length - 1)) * plotW;
  const yForVal = (val: number) => padT + plotH - Math.min(1, val / maxVal) * plotH;

  const refPaid = cashValueItems[0].quote.totalPremiumsPaid;
  const refPaidY = yForVal(refPaid);

  const formatCompact = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
    return `${v}`;
  };

  return (
    <div
      data-testid="surrender-trajectory-chart"
      className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div>
          <h3 className="text-xs font-bold text-slate-900">
            {t(
              `3-Plan Cash Value Compounding Trajectory — Red / Blue / Yellow Lines (Yr 5 → Yr 30, ${currency})`,
              `三方案紅・藍・黃分色退保價值增長曲線圖（第 5 至 30 年 · ${currency}）`
            )}
          </h3>
          <p className="text-[11px] text-slate-500">
            {t(
              'Solid Red/Blue/Yellow lines = Total Projected Surrender Value · Dashed lines = Guaranteed Cash Value · Gray dotted = Total Premiums Paid',
              '紅／藍／黃實線＝總預期退保價值 · 同色虛線＝寫入合約保證現金價值 · 灰色點線＝總繳保費回本基準線'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          {cashValueItems.map((it) => {
            const slotMeta = COMPARE_SLOT_CLASSIFICATION[it.resolvedSlot] || COMPARE_SLOT_CLASSIFICATION[0];
            return (
              <span
                key={it.plan.id}
                className="inline-flex items-center gap-1.5 font-semibold text-slate-900"
              >
                <span
                  className="inline-block h-1 w-5 rounded-full shrink-0"
                  style={{ backgroundColor: slotMeta.strokeHex }}
                  aria-hidden="true"
                />
                <span className={slotMeta.textAccentClass}>
                  {t(slotMeta.labelEn, slotMeta.labelZh)}:
                </span>
                <span className="max-w-[165px] truncate">{it.displayTitle}</span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Surrender cash value projection chart across policy years 5 to 30"
          className="h-56 w-full min-w-[580px]"
        >
          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const val = Math.round(maxVal * tick);
            const y = yForVal(val);
            return (
              <g key={tick}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <text
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 font-mono text-[10px]"
                >
                  ${formatCompact(val)}
                </text>
              </g>
            );
          })}

          {/* Reference Total Premiums Paid Breakeven Line */}
          <line
            x1={padL}
            y1={refPaidY}
            x2={width - padR}
            y2={refPaidY}
            stroke="#64748b"
            strokeWidth={1.25}
            strokeDasharray="3 3"
          />
          <text
            x={width - padR - 4}
            y={Math.max(12, refPaidY - 5)}
            textAnchor="end"
            className="fill-slate-600 font-mono text-[10px]"
          >
            {t('Paid Base', '總繳保費線')} ${formatCompact(refPaid)}
          </text>

          {/* X-axis labels */}
          {years.map((yr, idx) => {
            const x = xForIdx(idx);
            return (
              <text
                key={yr}
                x={x}
                y={height - 10}
                textAnchor="middle"
                className="fill-slate-600 font-mono text-[11px] font-semibold"
              >
                Yr {yr}
              </text>
            );
          })}

          {/* Series Polylines (Red / Blue / Yellow Classification) */}
          {cashValueItems.map((it) => {
            const slotMeta = COMPARE_SLOT_CLASSIFICATION[it.resolvedSlot] || COMPARE_SLOT_CLASSIFICATION[0];
            const stroke = slotMeta.strokeHex;
            const totalPts = years.map((yr, idx) => {
              const row = it.quote.projections.find((p) => p.policyYear === yr);
              return { x: xForIdx(idx), y: yForVal(row?.totalSurrenderValue ?? 0) };
            });
            const guarPts = years.map((yr, idx) => {
              const row = it.quote.projections.find((p) => p.policyYear === yr);
              return { x: xForIdx(idx), y: yForVal(row?.guaranteedCashValue ?? 0) };
            });

            return (
              <g key={it.plan.id}>
                <polyline
                  fill="none"
                  stroke={stroke}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  opacity={0.65}
                  points={guarPts.map((p) => `${p.x},${p.y}`).join(' ')}
                />
                <polyline
                  fill="none"
                  stroke={stroke}
                  strokeWidth={2.6}
                  points={totalPts.map((p) => `${p.x},${p.y}`).join(' ')}
                />
                {totalPts.map((pt, pIdx) => (
                  <circle
                    key={pIdx}
                    cx={pt.x}
                    cy={pt.y}
                    r={3.5}
                    fill="#ffffff"
                    stroke={stroke}
                    strokeWidth={2}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// ============================================================================
// 3. CLAUSE 5-DIMENSION COMPARISON BARS & VHIS PRE-EXISTING TIMELINE (SECTION 03)
// ============================================================================

interface ClauseRadarDimensionBarsProps {
  planAName: string;
  planBName: string;
  dimensions: ClauseDimensionComparison[];
}

export const ClauseRadarDimensionBars: React.FC<ClauseRadarDimensionBarsProps> = ({
  planAName,
  planBName,
  dimensions,
}) => {
  const { lang } = useLanguage();

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-bold text-blue-700">
          <span className="inline-block h-2.5 w-2.5 rounded-xs bg-blue-700" aria-hidden="true" />
          <span>A: {planAName}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 font-bold text-teal-700">
          <span className="inline-block h-2.5 w-2.5 rounded-xs bg-teal-600" aria-hidden="true" />
          <span>B: {planBName}</span>
        </span>
      </div>

      {dimensions.map((dim) => (
        <div key={dim.dimensionKey} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-900">
              {lang === 'en' ? dim.labelEn : dim.labelZh}
            </span>
            <span className="font-mono font-bold text-slate-800 tabular-nums">
              A {dim.planAScore}/100 · B {dim.planBScore}/100
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-6 font-mono text-[11px] font-bold text-blue-700">A</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded bg-slate-200">
                <div
                  className="h-full rounded bg-blue-700"
                  style={{ width: `${dim.planAScore}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 font-mono text-[11px] font-bold text-teal-700">B</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded bg-slate-200">
                <div
                  className="h-full rounded bg-teal-600"
                  style={{ width: `${dim.planBScore}%` }}
                />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-600">{dim.verdictNote}</p>
        </div>
      ))}
    </div>
  );
};

export const VhisPreExistingTimelineBar: React.FC = () => {
  const { t } = useLanguage();
  const stages = [
    { periodEn: 'Day 1–30', periodZh: '第1–30日', stdPct: 0, enhancedPct: 0 },
    { periodEn: 'Day 31–Yr 1', periodZh: '第31日–第1年', stdPct: 0, enhancedPct: 100 },
    { periodEn: 'Policy Yr 2', periodZh: '第2保單年度', stdPct: 25, enhancedPct: 100 },
    { periodEn: 'Policy Yr 3', periodZh: '第3保單年度', stdPct: 50, enhancedPct: 100 },
    { periodEn: 'Yr 4 Onwards', periodZh: '第4年起終身', stdPct: 100, enhancedPct: 100 },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-slate-900">
          {t(
            'Visual Clause Timeline — VHIS Unknown Pre-Existing Condition Payable Ratio',
            '條款視覺化時間軸 — 自願醫保「投保前未知已有病症」賠付比例對照'
          )}
        </h3>
        <span className="font-mono text-[11px] text-slate-500">
          {t('Standard Scale vs Enhanced Flexi (e.g. Bowtie Pink)', '法定標準遞增 vs 升級靈活計劃（如保泰粉紅）')}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {stages.map((st) => (
          <div key={st.periodEn} className="rounded-md border border-slate-200 bg-white p-2.5 text-center space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-700">
              {t(st.periodEn, st.periodZh)}
            </div>
            <div className="space-y-1 font-mono text-[11px] tabular-nums">
              <div className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                {t('Std', '標準')} <strong>{st.stdPct}%</strong>
              </div>
              <div className="rounded bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-800">
                {t('Enh', '升級')} {st.enhancedPct}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 4. STACKED HOSPITAL BILL WATERFALL BAR (SECTIONS 06 & 08 FN-08)
// ============================================================================

interface StackedBillWaterfallBarProps {
  totalBillHkd: number;
  employerPaidHkd: number;
  personalVhisPaidHkd: number;
  outOfPocketHkd: number;
}

export const StackedBillWaterfallBar: React.FC<StackedBillWaterfallBarProps> = ({
  totalBillHkd,
  employerPaidHkd,
  personalVhisPaidHkd,
  outOfPocketHkd,
}) => {
  const { t } = useLanguage();
  const denom = Math.max(1, totalBillHkd);
  const empPct = Math.round((employerPaidHkd / denom) * 100);
  const vhisPct = Math.round((personalVhisPaidHkd / denom) * 100);
  const oopPct = Math.max(0, 100 - empPct - vhisPct);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-900">
          {t(
            'Visual Bill Reimbursement Split (Group Medical → Personal VHIS → Client Shortfall)',
            '手術帳單雙保單賠付比例視覺圖（公司醫保 → 個人 VHIS → 客戶自付差額）'
          )}
        </span>
        <span className="font-mono font-bold text-slate-800 tabular-nums">
          {t('Total Bill:', '總帳單：')} HK${totalBillHkd.toLocaleString()}
        </span>
      </div>

      <div className="flex h-5 w-full overflow-hidden rounded-md bg-slate-100">
        {empPct > 0 && (
          <div
            style={{ width: `${empPct}%` }}
            className="flex items-center justify-center bg-emerald-600 font-mono text-[10px] font-bold text-white tabular-nums"
          >
            {empPct >= 10 ? `${empPct}%` : ''}
          </div>
        )}
        {vhisPct > 0 && (
          <div
            style={{ width: `${vhisPct}%` }}
            className="flex items-center justify-center bg-blue-700 font-mono text-[10px] font-bold text-white tabular-nums"
          >
            {vhisPct >= 10 ? `${vhisPct}%` : ''}
          </div>
        )}
        {oopPct > 0 && (
          <div
            style={{ width: `${oopPct}%` }}
            className="flex items-center justify-center bg-rose-600 font-mono text-[10px] font-bold text-white tabular-nums"
          >
            {oopPct >= 10 ? `${oopPct}%` : ''}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-medium text-slate-700 tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-xs bg-emerald-600" aria-hidden="true" />
          <span>
            {t('1st Group Medical:', '1. 公司醫保：')} HK${employerPaidHkd.toLocaleString()} ({empPct}%)
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-xs bg-blue-700" aria-hidden="true" />
          <span>
            {t('2nd Personal VHIS:', '2. 個人 VHIS：')} HK${personalVhisPaidHkd.toLocaleString()} ({vhisPct}%)
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-xs bg-rose-600" aria-hidden="true" />
          <span>
            {t('Client Co-Pay:', '3. 客戶實付：')} HK${outOfPocketHkd.toLocaleString()} ({oopPct}%)
          </span>
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// 5. PROTECTION GAP BARS, LEGACY BARS & MDRT TRACK (SECTION 08)
// ============================================================================

export const CoverageGapComparisonBars: React.FC<{
  existingLifeHkd: number;
  recommendedLifeHkd: number;
  existingCiHkd: number;
  recommendedCiHkd: number;
}> = ({ existingLifeHkd, recommendedLifeHkd, existingCiHkd, recommendedCiHkd }) => {
  const { t } = useLanguage();
  const lifeFundedPct = Math.min(
    100,
    Math.round((existingLifeHkd / Math.max(1, recommendedLifeHkd)) * 100)
  );
  const ciFundedPct = Math.min(
    100,
    Math.round((existingCiHkd / Math.max(1, recommendedCiHkd)) * 100)
  );

  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900">
            {t('Life & Mortgage Coverage Ratio', '人壽及按揭保障覆蓋進度')}
          </span>
          <span className="font-mono font-bold text-slate-800 tabular-nums">
            {lifeFundedPct}% {t('Funded', '已到位')}
          </span>
        </div>
        <div className="flex h-4 w-full overflow-hidden rounded bg-rose-100">
          <div style={{ width: `${lifeFundedPct}%` }} className="h-full bg-emerald-600" />
        </div>
        <div className="flex justify-between font-mono text-[11px] text-slate-600 tabular-nums">
          <span>{t('Existing:', '現有：')} HK${existingLifeHkd.toLocaleString()}</span>
          <span className="font-semibold text-rose-700">
            {t('Shortfall:', '缺口：')} HK${Math.max(0, recommendedLifeHkd - existingLifeHkd).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900">
            {t('Critical Illness (3.5x Income) Ratio', '嚴重危疾收入替代覆蓋進度')}
          </span>
          <span className="font-mono font-bold text-slate-800 tabular-nums">
            {ciFundedPct}% {t('Funded', '已到位')}
          </span>
        </div>
        <div className="flex h-4 w-full overflow-hidden rounded bg-amber-100">
          <div style={{ width: `${ciFundedPct}%` }} className="h-full bg-blue-700" />
        </div>
        <div className="flex justify-between font-mono text-[11px] text-slate-600 tabular-nums">
          <span>{t('Existing:', '現有：')} HK${existingCiHkd.toLocaleString()}</span>
          <span className="font-semibold text-amber-800">
            {t('Shortfall:', '缺口：')} HK${Math.max(0, recommendedCiHkd - existingCiHkd).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export const LegacyWithdrawalBarChart: React.FC<{
  rows: Array<{
    policyYear: number;
    annualWithdrawalUsd: number;
    remainingTotalCsvUsd: number;
  }>;
}> = ({ rows }) => {
  const { t } = useLanguage();
  const maxCsv = Math.max(1, ...rows.map((r) => r.remainingTotalCsvUsd + r.annualWithdrawalUsd));

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-900">
          {t(
            'Visual Legacy Compounding vs. Passive Withdrawal Bars (USD)',
            '保單剩餘總現金價值 vs 每年被動提領柱狀圖 (USD)'
          )}
        </span>
        <span className="text-[11px] text-slate-500">
          {t('Blue = Remaining Estate CSV · Green = Annual Cash Withdrawal', '深藍＝提領後剩餘資產池 · 翠綠＝當年現金提領')}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-3 pt-2">
        {rows.slice(0, 5).map((r) => {
          const remPct = Math.max(6, Math.round((r.remainingTotalCsvUsd / maxCsv) * 100));
          const wdPct = Math.max(
            r.annualWithdrawalUsd > 0 ? 5 : 0,
            Math.round((r.annualWithdrawalUsd / maxCsv) * 100)
          );
          return (
            <div key={r.policyYear} className="flex flex-col items-center gap-1.5">
              <div className="flex h-28 w-full items-end justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 pb-1 pt-2">
                <div
                  style={{ height: `${remPct}%` }}
                  title={`Remaining CSV: USD $${r.remainingTotalCsvUsd.toLocaleString()}`}
                  className="w-5 rounded-t bg-blue-700"
                />
                <div
                  style={{ height: `${wdPct}%` }}
                  title={`Annual Withdrawal: USD $${r.annualWithdrawalUsd.toLocaleString()}`}
                  className="w-4 rounded-t bg-emerald-600"
                />
              </div>
              <span className="font-mono text-[11px] font-bold text-slate-800 tabular-nums">
                Yr {r.policyYear}
              </span>
              <span className="font-mono text-[10px] text-blue-700 tabular-nums">
                ${Math.round(r.remainingTotalCsvUsd / 1000)}k
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const MdrtMilestoneProgressTrack: React.FC<{
  earnedFycHkd: number;
  mdrtTargetHkd: number;
}> = ({ earnedFycHkd, mdrtTargetHkd }) => {
  const { t } = useLanguage();
  const cotTarget = mdrtTargetHkd * 3;
  const totTarget = mdrtTargetHkd * 6;
  const mdrtPct = Math.min(100, Math.round((earnedFycHkd / Math.max(1, mdrtTargetHkd)) * 100));
  const cotPct = Math.min(100, Math.round((earnedFycHkd / Math.max(1, cotTarget)) * 100));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-900">
          {t('Visual MDRT / COT / TOT Qualification Track', '香港區 MDRT／COT／TOT 達標進度條')}
        </span>
        <span className="font-mono font-bold text-blue-700 tabular-nums">
          HK${earnedFycHkd.toLocaleString()} ({mdrtPct}% of 1x MDRT)
        </span>
      </div>

      <div className="space-y-2">
        <div>
          <div className="mb-1 flex justify-between font-mono text-[11px] text-slate-600 tabular-nums">
            <span>1x MDRT (HK${mdrtTargetHkd.toLocaleString()})</span>
            <span>{mdrtPct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded bg-slate-100">
            <div style={{ width: `${mdrtPct}%` }} className="h-full bg-blue-700" />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between font-mono text-[11px] text-slate-600 tabular-nums">
            <span>
              3x COT (HK${cotTarget.toLocaleString()}) · 6x TOT (HK${totTarget.toLocaleString()})
            </span>
            <span>{cotPct}% of COT</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded bg-slate-100">
            <div style={{ width: `${cotPct}%` }} className="h-full bg-teal-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. INTERACTIVE 6-AXIS HEXAGONAL PROTECTION RADAR SVG (STAGES 01 & 04)
// ============================================================================

const RADAR_SHORT_ZH: Record<ProtectionDimensionId, string> = {
  LIFE_MORTGAGE: '人壽按揭',
  PRIVATE_HOSPITAL: '私院手術',
  CRITICAL_ILLNESS: '嚴重危疾',
  CANCER_TARGETED: '癌症標靶',
  ACCIDENT_INCOME: '意外收入',
  RETIREMENT_DEMENTIA: '退休照護',
};

const RADAR_SHORT_EN: Record<ProtectionDimensionId, string> = {
  LIFE_MORTGAGE: 'Life & Debt',
  PRIVATE_HOSPITAL: 'Private Med',
  CRITICAL_ILLNESS: 'Major CI',
  CANCER_TARGETED: 'Cancer Drug',
  ACCIDENT_INCOME: 'Accident Inc',
  RETIREMENT_DEMENTIA: 'Retirement',
};

function radarPolarPoint(cx: number, cy: number, radius: number, idx: number, total: number) {
  const rad = ((idx * 360) / total - 90) * (Math.PI / 180);
  return {
    x: Number((cx + radius * Math.cos(rad)).toFixed(2)),
    y: Number((cy + radius * Math.sin(rad)).toFixed(2)),
  };
}

export const InteractiveSixAxisGapRadarSvg: React.FC<{
  dimensions: DimensionGapEvaluationRow[];
  overallAchievementPct: number;
  selectedDimensionId?: ProtectionDimensionId;
  onSelectDimension?: (dimId: ProtectionDimensionId) => void;
  anchorPlanLabel?: string;
  attachedRidersCount?: number;
}> = ({
  dimensions,
  overallAchievementPct,
  selectedDimensionId,
  onSelectDimension,
  anchorPlanLabel,
  attachedRidersCount = 0,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);
  const [internalDimId, setInternalDimId] = useState<ProtectionDimensionId>(
    selectedDimensionId || dimensions[0]?.dimensionId || 'PRIVATE_HOSPITAL'
  );

  const activeDimId = selectedDimensionId || internalDimId;
  const activeRow =
    dimensions.find((d) => d.dimensionId === activeDimId) || dimensions[0];

  const cx = 215;
  const cy = 148;
  const maxR = 82;
  const totalAxes = Math.max(1, dimensions.length);

  const ringLevels = [0.33, 0.66, 1.0];

  const existingPoints = dimensions
    .map((dim, idx) => {
      const ratio = Math.min(1, Math.max(0.05, dim.existingCoverHkd / Math.max(1, dim.recommendedTargetHkd)));
      const pt = radarPolarPoint(cx, cy, maxR * ratio, idx, totalAxes);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  const combinedPoints = dimensions
    .map((dim, idx) => {
      const ratio = Math.min(1, Math.max(0.1, dim.totalAchievementPct / 100));
      const pt = radarPolarPoint(cx, cy, maxR * ratio, idx, totalAxes);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  return (
    <div
      data-testid="interactive-six-axis-radar"
      className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-slate-900">
            {t(
              '6-Axis Protection Fulfillment Radar (Existing vs. New Plan + Riders)',
              conv('六軸保障達成率雷達圖（既有保單 vs 主約＋附約補強後）')
            )}
          </h4>
          <p className="text-[11px] text-slate-600">
            {anchorPlanLabel
              ? `${anchorPlanLabel}${attachedRidersCount > 0 ? ` · +${attachedRidersCount} ${t('Riders', conv('項附約'))}` : ''}`
              : t(
                  'Click any axis vertex to inspect exact HKD/RMB shortfall',
                  conv('點擊任一維度頂點可即時檢視該項保障缺口與補強明細')
                )}
          </p>
        </div>
        <span className="font-mono text-sm font-bold text-teal-800 tabular-nums">
          {t('Overall:', conv('綜合達成：'))} {overallAchievementPct}%
        </span>
      </div>

      <svg
        viewBox="0 0 430 296"
        role="img"
        aria-label="Interactive hexagonal 6-axis protection gap radar"
        className="mx-auto h-64 w-full max-w-[440px]"
      >
        {/* Concentric target polygons */}
        {ringLevels.map((lvl) => {
          const pts = dimensions
            .map((_, idx) => {
              const p = radarPolarPoint(cx, cy, maxR * lvl, idx, totalAxes);
              return `${p.x},${p.y}`;
            })
            .join(' ');
          return (
            <polygon
              key={lvl}
              points={pts}
              fill={lvl === 1 ? '#ffffff' : 'none'}
              fillOpacity={lvl === 1 ? 0.7 : 0}
              stroke={lvl === 1 ? '#0f766e' : '#cbd5e1'}
              strokeWidth={lvl === 1 ? 1.4 : 1}
              strokeDasharray={lvl === 1 ? '4 3' : undefined}
            />
          );
        })}

        {/* Radial spokes */}
        {dimensions.map((dim, idx) => {
          const outerPt = radarPolarPoint(cx, cy, maxR, idx, totalAxes);
          return (
            <line
              key={dim.dimensionId}
              x1={cx}
              y1={cy}
              x2={outerPt.x}
              y2={outerPt.y}
              stroke="#cbd5e1"
              strokeWidth={1}
            />
          );
        })}

        {/* Combined After-Plan Polygon */}
        <polygon
          points={combinedPoints}
          fill="#0d9488"
          fillOpacity={0.22}
          stroke="#0f766e"
          strokeWidth={2.4}
        />

        {/* Existing Policies Polygon */}
        <polygon
          points={existingPoints}
          fill="#475569"
          fillOpacity={0.32}
          stroke="#334155"
          strokeWidth={1.8}
        />

        {/* Interactive Vertex Nodes & Labels */}
        {dimensions.map((dim, idx) => {
          const ratio = Math.min(1, Math.max(0.1, dim.totalAchievementPct / 100));
          const valPt = radarPolarPoint(cx, cy, maxR * ratio, idx, totalAxes);
          const lblPt = radarPolarPoint(cx, cy, maxR + 28, idx, totalAxes);
          const isSelected = dim.dimensionId === activeDimId;
          const shortLbl =
            lang === 'en'
              ? RADAR_SHORT_EN[dim.dimensionId]
              : conv(RADAR_SHORT_ZH[dim.dimensionId]);
          const anchor =
            Math.abs(lblPt.x - cx) < 14
              ? 'middle'
              : lblPt.x > cx
              ? 'start'
              : 'end';

          return (
            <g
              key={dim.dimensionId}
              onClick={() => {
                setInternalDimId(dim.dimensionId);
                onSelectDimension?.(dim.dimensionId);
              }}
              className="cursor-pointer"
            >
              <circle
                cx={valPt.x}
                cy={valPt.y}
                r={isSelected ? 5.5 : 4}
                fill={dim.remainingGapHkd > 0 ? '#e11d48' : '#0f766e'}
                stroke="#ffffff"
                strokeWidth={2}
              />
              <text
                x={lblPt.x}
                y={lblPt.y - 2}
                textAnchor={anchor}
                className={`text-[11px] font-bold ${
                  isSelected ? 'fill-teal-800' : 'fill-slate-800'
                }`}
              >
                {shortLbl}
              </text>
              <text
                x={lblPt.x}
                y={lblPt.y + 12}
                textAnchor={anchor}
                className={`font-mono text-[10px] font-semibold ${
                  dim.remainingGapHkd > 0 ? 'fill-rose-700' : 'fill-emerald-700'
                }`}
              >
                {dim.totalAchievementPct}%
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-xs bg-slate-600" aria-hidden="true" />
          <span>{t('Existing Cover', conv('既有保單'))}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-xs bg-teal-600" aria-hidden="true" />
          <span>{t('New Plan + Riders', conv('新規劃主約＋附約'))}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-xs border border-dashed border-teal-700 bg-white" aria-hidden="true" />
          <span>{t('100% Recommended Target', conv('100% 建議目標線'))}</span>
        </span>
      </div>

      {/* Selected Axis Detail Bar */}
      {activeRow && (
        <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-slate-900">
              {lang === 'en' ? activeRow.labelEn : conv(activeRow.labelZh)}
            </span>
            <span
              className={`font-mono font-bold tabular-nums ${
                activeRow.remainingGapHkd > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {activeRow.remainingGapHkd > 0
                ? `${t('Shortfall:', conv('尚餘缺口：'))} HK$ ${activeRow.remainingGapHkd.toLocaleString()} (¥ ${convertHkdToRmb(activeRow.remainingGapHkd).toLocaleString()})`
                : t('100% Fully Funded', conv('已足額達標 (100%)'))}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-slate-600 tabular-nums">
            <span>
              {t('Target:', conv('目標：'))} HK$ {activeRow.recommendedTargetHkd.toLocaleString()}
            </span>
            <span>
              {t('Existing:', conv('既有：'))} HK$ {activeRow.existingCoverHkd.toLocaleString()} ·{' '}
              <strong className="text-teal-800">
                +{t('New:', conv('新增：'))} HK$ {activeRow.newProposedCoverHkd.toLocaleString()}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 7. ALL-4-SCENARIOS CLAIM STRESS COMPARISON BAR CHART (STAGE 03)
// ============================================================================

export const AllScenariosClaimComparisonChart: React.FC<{
  items: ScenarioComparisonItem[];
  activeScenarioId: ClaimScenarioId;
  onSelectScenario: (id: ClaimScenarioId) => void;
  fxRateHkdToRmb?: number;
}> = ({ items, activeScenarioId, onSelectScenario, fxRateHkdToRmb = 0.92 }) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  return (
    <div
      data-testid="all-scenarios-claim-chart"
      className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-slate-900">
            {t(
              '4-Crisis Claim Stress Matrix — Click Any Row to Inspect Itemized Payout',
              conv('四大香港真實理賠危機全景壓力測試（點擊任一情境即時切換明細）')
            )}
          </h4>
          <p className="text-[11px] text-slate-600">
            {t(
              'Slate = Existing Group/Personal Cover · Teal = Active Plan + Riders · Rose = Client Out-of-Pocket',
              conv('深灰＝既有團保賠付 · 翠綠＝本次主約＋附約賠付 · 玫紅＝客戶仍需自付差額')
            )}
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => {
          const isSelected = item.scenarioId === activeScenarioId;
          const denom = Math.max(1, item.totalClaimCostHkd);
          const existPct = Math.min(100, Math.round((item.existingPayoutHkd / denom) * 100));
          const newPct = Math.min(
            100 - existPct,
            Math.round((item.newBundlePayoutHkd / denom) * 100)
          );
          const oopPct = Math.max(0, 100 - existPct - newPct);
          const oopRmb = Math.round(item.outOfPocketShortfallHkd * fxRateHkdToRmb);

          return (
            <button
              key={item.scenarioId}
              type="button"
              onClick={() => onSelectScenario(item.scenarioId)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                isSelected
                  ? 'border-teal-600 bg-white ring-1 ring-teal-600/25'
                  : 'border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-900">
                  {lang === 'en' ? item.titleEn : conv(item.titleZh)}
                </span>
                <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums">
                  <span className="text-slate-600">
                    {t('Bill:', conv('總開支：'))} HK$ {item.totalClaimCostHkd.toLocaleString()}
                  </span>
                  <span
                    className={`font-bold ${
                      item.outOfPocketShortfallHkd === 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {item.outOfPocketShortfallHkd === 0
                      ? t('HK$ 0 Out-of-Pocket (100%)', conv('HK$ 0 免自付 (100% 覆蓋)'))
                      : `${t('Self-Pay:', conv('自付：'))} HK$ ${item.outOfPocketShortfallHkd.toLocaleString()} (¥ ${oopRmb.toLocaleString()})`}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex h-3.5 w-full overflow-hidden rounded bg-slate-200">
                {existPct > 0 && (
                  <div
                    style={{ width: `${existPct}%` }}
                    className="h-full bg-slate-600"
                    title={`Existing: HK$${item.existingPayoutHkd.toLocaleString()}`}
                  />
                )}
                {newPct > 0 && (
                  <div
                    style={{ width: `${newPct}%` }}
                    className="h-full bg-teal-600"
                    title={`New Plan + Riders: HK$${item.newBundlePayoutHkd.toLocaleString()}`}
                  />
                )}
                {oopPct > 0 && (
                  <div
                    style={{ width: `${oopPct}%` }}
                    className="h-full bg-rose-600"
                    title={`Out-of-Pocket: HK$${item.outOfPocketShortfallHkd.toLocaleString()}`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 8. 5-AXIS PENTAGON CLAUSE AUDIT RADAR SVG (STAGE 02 CLAUSE AI)
// ============================================================================

const CLAUSE_RADAR_SHORT_ZH: Record<string, string> = {
  BREADTH: '1. 權益涵蓋廣度',
  WAITING_SPEED: '2. 等候期與復發',
  PRE_EXISTING: '3. 未知已有病症',
  GUARANTEED_CERTAINTY: '4. 保證條款確定性',
  POST_CLAIM_FLEX: '5. 豁免與鎖定彈性',
};

const CLAUSE_RADAR_SHORT_EN: Record<string, string> = {
  BREADTH: '1. Scope Breadth',
  WAITING_SPEED: '2. Waiting Speed',
  PRE_EXISTING: '3. Pre-Existing',
  GUARANTEED_CERTAINTY: '4. Guarantee Wording',
  POST_CLAIM_FLEX: '5. Waiver & Lock-In',
};

export const ClausePentagonRadarSvg: React.FC<{
  planAName: string;
  planBName: string;
  dimensions: ClauseDimensionComparison[];
}> = ({ planAName, planBName, dimensions }) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);
  const axes = dimensions.slice(0, 5);
  if (axes.length < 3) return null;

  const cx = 210;
  const cy = 136;
  const maxR = 72;
  const n = axes.length;

  const polyA = axes
    .map((d, i) => {
      const pt = radarPolarPoint(cx, cy, maxR * Math.max(0.1, d.planAScore / 100), i, n);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  const polyB = axes
    .map((d, i) => {
      const pt = radarPolarPoint(cx, cy, maxR * Math.max(0.1, d.planBScore / 100), i, n);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-900">
          {t('5-Axis Clause Strength Polygon', conv('保單條款五維實力對比雷達圖'))}
        </span>
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1 text-blue-700">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-blue-700" aria-hidden="true" />
            <span className="max-w-[140px] truncate">A: {planAName}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-teal-700">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-teal-600" aria-hidden="true" />
            <span className="max-w-[140px] truncate">B: {planBName}</span>
          </span>
        </div>
      </div>

      <svg
        viewBox="0 0 420 268"
        role="img"
        aria-label="5-axis clause strength comparison radar"
        className="mx-auto h-56 w-full max-w-[420px]"
      >
        {[0.35, 0.7, 1].map((lvl) => (
          <polygon
            key={lvl}
            points={axes
              .map((_, i) => {
                const p = radarPolarPoint(cx, cy, maxR * lvl, i, n);
                return `${p.x},${p.y}`;
              })
              .join(' ')}
            fill={lvl === 1 ? '#ffffff' : 'none'}
            fillOpacity={lvl === 1 ? 0.7 : 0}
            stroke="#cbd5e1"
            strokeWidth={1}
          />
        ))}
        {axes.map((d, i) => {
          const out = radarPolarPoint(cx, cy, maxR, i, n);
          return (
            <line
              key={d.dimensionKey}
              x1={cx}
              y1={cy}
              x2={out.x}
              y2={out.y}
              stroke="#cbd5e1"
              strokeWidth={1}
            />
          );
        })}

        <polygon
          points={polyB}
          fill="#0d9488"
          fillOpacity={0.18}
          stroke="#0f766e"
          strokeWidth={2}
        />
        <polygon
          points={polyA}
          fill="#1d4ed8"
          fillOpacity={0.22}
          stroke="#1d4ed8"
          strokeWidth={2.4}
        />

        {axes.map((d, i) => {
          const lbl = radarPolarPoint(cx, cy, maxR + 22, i, n);
          const anchor =
            Math.abs(lbl.x - cx) < 14 ? 'middle' : lbl.x > cx ? 'start' : 'end';
          const shortTitle =
            lang === 'en'
              ? CLAUSE_RADAR_SHORT_EN[d.dimensionKey] || d.labelEn.slice(0, 16)
              : conv(CLAUSE_RADAR_SHORT_ZH[d.dimensionKey] || d.labelZh.slice(0, 10));
          return (
            <g key={d.dimensionKey}>
              <text
                x={lbl.x}
                y={lbl.y}
                textAnchor={anchor}
                className="fill-slate-800 text-[10.5px] font-bold"
              >
                {shortTitle}
              </text>
              <text
                x={lbl.x}
                y={lbl.y + 12}
                textAnchor={anchor}
                className="fill-slate-600 font-mono text-[9.5px] font-semibold"
              >
                A:{d.planAScore} / B:{d.planBScore}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ============================================================================
// 9. LIFELONG AGE-TO-100 CASH-VALUE & IRR PROJECTION CURVE SVG (SUGGESTION #7)
// ============================================================================

export const LifelongCashValueCurveSvg: React.FC<{
  plan: InsurancePlan;
  clientAge: number;
  isSmoker: boolean;
  currency: CurrencyCode;
  sumAssured: number;
  paymentTermYears: number;
}> = ({ plan, clientAge, isSmoker, currency, sumAssured, paymentTermYears }) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);
  const [stressPct, setStressPct] = React.useState<100 | 90 | 75>(100);
  const [inspectAgeOffset, setInspectAgeOffset] = React.useState<number>(25);

  const curve = React.useMemo(() => {
    const safeAge = Math.min(80, Math.max(1, Math.round(clientAge)));
    const maxYears = Math.max(30, 100 - safeAge);
    const isPure =
      plan.category === 'VHIS' ||
      plan.category === 'HIGH_END_MEDICAL' ||
      plan.category === 'TERM_LIFE' ||
      plan.category === 'GENERAL_GI';
    if (isPure) return null;

    const capIrr =
      plan.category === 'PARTICIPATING_SAVINGS' || plan.category === 'QDAP'
        ? currency === 'HKD'
          ? 0.06
          : 0.065
        : plan.rawProjectedIrr;
    const effIrr = Math.min(plan.rawProjectedIrr, capIrr);
    const guarIrr = plan.guaranteedIrr;
    const term = plan.supportedPaymentTerms.includes(paymentTermYears)
      ? paymentTermYears
      : plan.supportedPaymentTerms[0] || 10;
    const estAnnual = Math.max(
      2400,
      Math.round((sumAssured / 1000) * plan.baseRatePer1000UsdAge35Ns * (10 / term))
    );
    const totalPaid = estAnnual * term;
    const ratio = stressPct / 100;

    const pts: Array<{
      yr: number;
      age: number;
      paid: number;
      guar: number;
      total: number;
      irr: number;
    }> = [];
    let breakevenAge: number | null = null;
    let guarBreakevenAge: number | null = null;

    for (let yr = 1; yr <= maxYears; yr++) {
      const paidYrs = Math.min(yr, term);
      const paid = estAnnual * paidYrs;
      const midDur = Math.max(0.5, yr - (paidYrs - 1) / 2);
      const earlyPen = yr <= 2 ? 0.14 : yr <= 4 ? 0.42 : yr < term ? 0.68 : yr < 8 ? 0.86 : 1;
      const guarPen = yr <= 2 ? 0.08 : yr <= 5 ? 0.46 : yr <= 10 ? 0.72 : yr <= 15 ? 0.89 : 0.98;

      const rawTot = paid * Math.pow(1 + effIrr, midDur) * earlyPen;
      const guar = Math.round(paid * Math.pow(1 + guarIrr, midDur) * guarPen);
      const div = Math.round(Math.max(0, Math.round(rawTot) - guar) * ratio);
      const total = guar + div;
      const age = safeAge + yr;

      if (breakevenAge === null && yr >= term && total >= totalPaid) breakevenAge = age;
      if (guarBreakevenAge === null && yr >= term && guar >= totalPaid) guarBreakevenAge = age;

      const irr =
        paid > 0 && total > paid && midDur >= 1
          ? Number(((Math.pow(total / paid, 1 / midDur) - 1) * 100).toFixed(2))
          : 0;
      pts.push({ yr, age, paid, guar, total, irr });
    }
    return { pts, breakevenAge, guarBreakevenAge, safeAge, maxYears };
  }, [plan, clientAge, isSmoker, currency, sumAssured, paymentTermYears, stressPct]);

  if (!curve || curve.pts.length === 0) return null;

  const { pts, breakevenAge, guarBreakevenAge, maxYears } = curve;
  const clampedIdx = Math.min(pts.length - 1, Math.max(0, inspectAgeOffset - 1));
  const activePt = pts[clampedIdx] || pts[pts.length - 1];

  const svgW = 680;
  const svgH = 220;
  const padL = 56;
  const padR = 20;
  const padT = 18;
  const padB = 30;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const maxVal = Math.max(1, pts[pts.length - 1].total);

  const xAt = (idx: number) => padL + (idx / Math.max(1, pts.length - 1)) * plotW;
  const yAt = (v: number) => padT + plotH - Math.min(1, v / maxVal) * plotH;

  const totalPath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.total).toFixed(1)}`)
    .join(' ');
  const guarPath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.guar).toFixed(1)}`)
    .join(' ');
  const paidPath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.paid).toFixed(1)}`)
    .join(' ');

  return (
    <div
      data-testid="lifelong-age100-curve-card"
      className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900">
            {t(
              `Lifelong Cash-Value & IRR Trajectory to Age 100 · [${plan.insurerCode}] ${plan.nameEn}`,
              conv(`至 100 歲終身現金價值及 IRR 複利曲線 · [${plan.insurerCode}] ${plan.nameZh}`)
            )}
          </h3>
          <p className="text-[11px] text-slate-500 font-mono tabular-nums">
            {breakevenAge
              ? t(
                  `Total Breakeven: Age ${breakevenAge} · Guaranteed Breakeven: ${
                    guarBreakevenAge ? `Age ${guarBreakevenAge}` : '>Age 80'
                  }`,
                  conv(
                    `預期總回本：${breakevenAge} 歲 · 保證現金回本：${
                      guarBreakevenAge ? `${guarBreakevenAge} 歲` : '長線滾存'
                    }`
                  )
                )
              : t('Long-horizon participating compounding', conv('長線複利滾存'))}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-[11px]">
          {([100, 90, 75] as const).map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => setStressPct(pct)}
              className={`rounded-md px-2.5 py-1 font-mono font-bold tabular-nums ${
                stressPct === pct
                  ? 'bg-[#0B172A] text-[#F3D37A]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {pct}% {t('Div', conv('分紅'))}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        role="img"
        aria-label="Lifelong cash value projection curve up to age 100"
        className="w-full h-48 rounded-lg bg-white border border-slate-200"
      >
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const gy = padT + plotH * (1 - frac);
          return (
            <line
              key={frac}
              x1={padL}
              y1={gy}
              x2={svgW - padR}
              y2={gy}
              stroke="#f1f5f9"
              strokeWidth={1}
            />
          );
        })}

        <path d={paidPath} fill="none" stroke="#94a3b8" strokeWidth={1.6} strokeDasharray="4 3" />
        <path d={guarPath} fill="none" stroke="#059669" strokeWidth={2.2} />
        <path d={totalPath} fill="none" stroke="#1d4ed8" strokeWidth={2.8} />

        {/* Inspected Year Vertical Marker */}
        <line
          x1={xAt(clampedIdx)}
          y1={padT}
          x2={xAt(clampedIdx)}
          y2={padT + plotH}
          stroke="#d4af37"
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
        <circle
          cx={xAt(clampedIdx)}
          cy={yAt(activePt.total)}
          r={4.5}
          fill="#0b172a"
          stroke="#f3d37a"
          strokeWidth={2}
        />

        {[0, Math.floor(pts.length * 0.33), Math.floor(pts.length * 0.66), pts.length - 1].map(
          (i) => {
            const p = pts[i];
            if (!p) return null;
            return (
              <text
                key={i}
                x={xAt(i)}
                y={svgH - 8}
                textAnchor={i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}
                className="fill-slate-500 font-mono text-[10px]"
              >
                {t(`Age ${p.age}`, `${p.age}歲`)}
              </text>
            );
          }
        )}
      </svg>

      {/* Interactive Year / Age Scrubber & Readout */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
        <div className="flex items-center gap-2 flex-1">
          <span className="font-semibold text-slate-600 whitespace-nowrap">
            {t('Scrub Age:', conv('滑動檢視年齡：'))}
          </span>
          <input
            type="range"
            min={1}
            max={maxYears}
            value={inspectAgeOffset}
            onChange={(e) => setInspectAgeOffset(Number(e.target.value))}
            className="w-full max-w-[220px] accent-blue-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-xs tabular-nums">
          <span className="font-bold text-slate-900">
            {t(`Yr ${activePt.yr} (Age ${activePt.age})`, `第 ${activePt.yr} 年 (${activePt.age} 歲)`)}
          </span>
          <span className="text-emerald-700 font-semibold">
            {t('Guar:', conv('保證:'))} {currency} ${activePt.guar.toLocaleString()}
          </span>
          <span className="text-blue-700 font-bold">
            {t('Total:', conv('總退保:'))} {currency} ${activePt.total.toLocaleString()}
          </span>
          <span className="text-slate-700 font-semibold">IRR {activePt.irr}%</span>
        </div>
      </div>
    </div>
  );
};


