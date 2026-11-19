import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowUpRight, BarChart3, Filter, TrendingUp, Users } from 'lucide-react';
import {
  InsightsResidencyFilter,
  buildClientInsightsDashboard,
} from '../domain/clientInsightsEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  ClientLead,
  InForcePolicyRecord,
  LeadStage,
  PolicyApplicationRecord,
} from '../domain/types';

interface ClientInsightsViewProps {
  leads: ClientLead[];
  applications?: PolicyApplicationRecord[];
  inForcePolicies?: InForcePolicyRecord[];
  usdToHkd?: number;
  hkdToRmb?: number;
  onSelectLeadAndOpenCrm?: (leadId: string) => void;
  onOpenCrmList?: () => void;
}

const FUNNEL_STAGE_COLORS = ['#334155', '#2563EB', '#0D9488', '#D97706', '#059669'];
const SCHEME_BAR_COLORS = ['#0F172A', '#1D4ED8', '#0F766E', '#B45309', '#475569'];

export const ClientInsightsView: React.FC<ClientInsightsViewProps> = ({
  leads,
  applications = [],
  inForcePolicies = [],
  usdToHkd = 7.8,
  hkdToRmb = 0.92,
  onSelectLeadAndOpenCrm,
  onOpenCrmList,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zhHk: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk);

  const [residencyFilter, setResidencyFilter] = useState<InsightsResidencyFilter>('ALL');
  const [selectedStage, setSelectedStage] = useState<LeadStage | null>(null);

  const model = useMemo(
    () =>
      buildClientInsightsDashboard({
        leads,
        applications,
        inForcePolicies,
        filter: residencyFilter,
        usdToHkd,
        hkdToRmb,
      }),
    [leads, applications, inForcePolicies, residencyFilter, usdToHkd, hkdToRmb]
  );

  const funnelChartData = useMemo(
    () =>
      model.funnelMetrics.map((m, idx) => ({
        stage: m.stage,
        name: lang === 'en' ? m.shortLabelEn : conv(m.shortLabelZh),
        fullLabel: lang === 'en' ? m.labelEn : conv(m.labelZh),
        reachedCount: m.cumulativeReachedCount,
        currentCount: m.currentCount,
        stepConversionPct: m.stepConversionRatePct,
        topOfFunnelPct: m.topOfFunnelRatePct,
        avgPremiumHkd: m.avgAnnualPremiumHkd,
        fill: FUNNEL_STAGE_COLORS[idx] || '#1D4ED8',
      })),
    [model.funnelMetrics, lang]
  );

  const schemeChartData = useMemo(
    () =>
      model.schemePremiumBreakdown.map((row, idx) => ({
        schemeId: row.schemeId,
        name: lang === 'en' ? row.labelEn : conv(row.labelZh),
        avgPremiumHkd: row.avgPolicyPremiumHkd,
        medianPremiumHkd: row.medianPolicyPremiumHkd,
        leadCount: row.leadCount,
        closeRatePct: row.closeRatePct,
        fill: SCHEME_BAR_COLORS[idx % SCHEME_BAR_COLORS.length],
      })),
    [model.schemePremiumBreakdown, lang]
  );

  const stageMatchingLeads = useMemo(() => {
    const pool =
      residencyFilter === 'ALL'
        ? leads
        : leads.filter((l) => l.residency === residencyFilter);
    if (!selectedStage) return pool.slice(0, 5);
    return pool.filter((l) => l.stage === selectedStage);
  }, [leads, residencyFilter, selectedStage]);

  return (
    <div data-testid="client-insights-view" className="space-y-6">
      {/* Header & Residency Segment Filter */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
            <BarChart3 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {t(
                'STAGE 01C · CLIENT INSIGHTS & PIPELINE ANALYTICS',
                conv('01C · 客戶漏斗轉化率與平均保單保費分析看板')
              )}
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
            {t(
              'Client Lead Funnel Conversion & Average Policy Premium',
              conv('客戶銷售漏斗轉化率及平均年繳保費洞察 (Client Insights)')
            )}
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            {t(
              'Real-time conversion analytics across GL30 FNA, Proposal Microsite, Underwriting & In-Force policies.',
              conv('實時統計由新建潛客、GL30 財務分析、三選一建議書至核保生效之轉化表現及產品客單價分佈。')
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1 shrink-0">
          <Filter className="ml-2 h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          {(
            [
              { id: 'ALL', zh: '全部客群', en: 'All Clients' },
              { id: 'HK_RESIDENT', zh: '本地港人', en: 'HK Local' },
              { id: 'MCV', zh: '跨境高才 MCV', en: 'MCV Cross-Border' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              data-testid={`insights-filter-${opt.id.toLowerCase()}`}
              onClick={() => setResidencyFilter(opt.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                residencyFilter === opt.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t(opt.en, conv(opt.zh))}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Core KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div
          data-testid="insights-kpi-conversion"
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <span className="text-xs font-medium text-slate-500">
            {t('Lead-to-Close Funnel Rate', conv('潛客至核保／生效總轉化率'))}
          </span>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {model.overallLeadToCloseRatePct}%
            </span>
            <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
              {model.inForceOrUwLeads}/{model.totalLeads} {t('cases', conv('宗成交/核保'))}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {t('FNA Completion:', conv('GL30 FNA 完成率：'))}{' '}
            <strong className="font-mono text-slate-800 tabular-nums">
              {model.fnaCompletionRatePct}%
            </strong>
          </p>
        </div>

        <div
          data-testid="insights-kpi-avg-premium"
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <span className="text-xs font-medium text-slate-500">
            {t('Average Annual Policy Premium', conv('平均每張保單年繳保費 (AFYP)'))}
          </span>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="font-mono text-2xl font-bold text-blue-700 tabular-nums">
              HK${model.avgPolicyPremiumHkd.toLocaleString()}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {t('Median:', conv('保費中位數：'))}{' '}
            <strong className="font-mono text-slate-800 tabular-nums">
              HK${model.medianPolicyPremiumHkd.toLocaleString()}
            </strong>
          </p>
        </div>

        <div
          data-testid="insights-kpi-closed-premium"
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <span className="text-xs font-medium text-slate-500">
            {t('Closed / UW Case Avg Premium', conv('已簽署／生效個案平均年保費'))}
          </span>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="font-mono text-2xl font-bold text-teal-700 tabular-nums">
              HK${model.closedAvgPolicyPremiumHkd.toLocaleString()}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {t('Top Case:', conv('最高單宗年保費：'))}{' '}
            <strong className="font-mono text-slate-800 tabular-nums">
              HK${model.highestCasePremiumHkd.toLocaleString()}
            </strong>
          </p>
        </div>

        <div
          data-testid="insights-kpi-pipeline-total"
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <span className="text-xs font-medium text-slate-500">
            {t('Total Annualized Pipeline (HKD)', conv('全漏斗年度總保費規模 (HKD)'))}
          </span>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
              HK${model.totalAnnualizedPremiumHkd.toLocaleString()}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {t('MCV Cross-Border Mix:', conv('跨境高才 MCV 客群佔比：'))}{' '}
            <strong className="font-mono text-slate-800 tabular-nums">
              {model.mcvLeadSharePct}%
            </strong>
          </p>
        </div>
      </div>

      {/* Primary Recharts Grid: Left = Lead Funnel Conversion Rates; Right = Average Policy Premium */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Chart 1: Lead Funnel Progression & Step Conversion Rate (%) */}
        <section
          data-testid="insights-funnel-chart-card"
          className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {t(
                  '1. Client Lead Funnel Progression & Stage-to-Stage Conversion (%)',
                  conv('1. 客戶銷售漏斗遞進人數與跨階段轉化率 (%)')
                )}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {t(
                  'Bars = Cumulative clients reaching each stage · Gold Line = Stage-to-stage conversion %',
                  conv('直棒＝累計推進至該階段客戶數 · 金線＝上一階段推進轉化率 (%)')
                )}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-blue-800 tabular-nums">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {t('Proposal→UW:', conv('建議書→核保：'))} {model.proposalToUwRatePct}%
              </span>
            </span>
          </div>

          <div className="mt-4 h-72 w-full" style={{ minHeight: 288 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={funnelChartData}
                margin={{ top: 12, right: 18, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  allowDecimals={false}
                  tick={{ fill: '#475569', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fill: '#B45309', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(value: any, name: any) => {
                    if (name === 'stepConversionPct') {
                      return [`${value}%`, t('Step Conversion Rate', conv('跨階段轉化率'))];
                    }
                    return [
                      `${value} ${t('clients', conv('位客戶'))}`,
                      t('Reached Stage', conv('累計推進人數')),
                    ];
                  }}
                  contentStyle={{
                    borderRadius: '10px',
                    borderColor: '#CBD5E1',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="reachedCount"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={52}
                  onClick={(entry: any) => {
                    if (entry?.stage) {
                      setSelectedStage((prev) => (prev === entry.stage ? null : entry.stage));
                    }
                  }}
                >
                  {funnelChartData.map((entry) => (
                    <Cell
                      key={entry.stage}
                      fill={entry.fill}
                      cursor="pointer"
                    />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="stepConversionPct"
                  stroke="#D97706"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#D97706', strokeWidth: 2, stroke: '#FFFFFF' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 2: Average Policy Premium by Product Architecture (Recharts BarChart) */}
        <section
          data-testid="insights-premium-chart-card"
          className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {t(
                  '2. Average Annual Policy Premium by Solution (HKD)',
                  conv('2. 各保障方案架構平均年繳保費 (HKD)')
                )}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {t(
                  'Compares average case size across Savings, Family, VHIS & CI portfolios',
                  conv('比較多元貨幣傳承儲蓄、家庭保障、高端自願醫保及危疾之平均客單價')
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 h-72 w-full" style={{ minHeight: 288 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={schemeChartData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
                  }
                  tick={{ fill: '#475569', fontSize: 11 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={126}
                  tick={{ fill: '#1E293B', fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: any) => [
                    `HK$${Number(value || 0).toLocaleString()}`,
                    t('Avg Policy Premium', conv('平均年繳保費')),
                  ]}
                  contentStyle={{
                    borderRadius: '10px',
                    borderColor: '#CBD5E1',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="avgPremiumHkd" radius={[0, 6, 6, 0]} maxBarSize={34}>
                  {schemeChartData.map((entry) => (
                    <Cell key={entry.schemeId} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Stage Breakdown Table + HK Local vs MCV Cross-Border Comparison */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              {t(
                'Funnel Stage Conversion & Average Premium Breakdown',
                conv('各漏斗階段轉化率及平均年保費明細（點擊階段篩選右側跟進名單）')
              )}
            </h3>
            {onOpenCrmList && (
              <button
                type="button"
                onClick={onOpenCrmList}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
              >
                <span>{t('Open Full CRM Pipeline', conv('打開 1B 完整 CRM 名單'))}</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-2.5 px-3 font-semibold">{t('Funnel Stage', conv('銷售漏斗階段'))}</th>
                  <th className="py-2.5 px-3 text-right font-semibold">{t('Reached', conv('累計推進'))}</th>
                  <th className="py-2.5 px-3 text-right font-semibold">{t('Step Conv %', conv('跨步轉化率'))}</th>
                  <th className="py-2.5 px-3 text-right font-semibold">{t('Funnel %', conv('總留存率'))}</th>
                  <th className="py-2.5 px-3 text-right font-semibold">{t('Avg Policy Premium', conv('階段平均年保費'))}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {model.funnelMetrics.map((m) => {
                  const active = selectedStage === m.stage;
                  return (
                    <tr
                      key={m.stage}
                      onClick={() => setSelectedStage(active ? null : m.stage)}
                      className={`cursor-pointer transition-colors ${
                        active ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                        {lang === 'en' ? m.labelEn : conv(m.labelZh)}
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                          {t('Current:', conv('現處：'))} {m.currentCount}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {m.cumulativeReachedCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-amber-700">
                        {m.stepConversionRatePct}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {m.topOfFunnelRatePct}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                        HK${m.avgAnnualPremiumHkd.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quick Drill-down Leads + HK vs MCV Segment Card */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <h3 className="text-sm font-bold text-slate-900">
                {selectedStage
                  ? t(`Clients in ${selectedStage}`, conv(`「${selectedStage}」階段客戶`))
                  : t('HK Local vs. MCV Segment', conv('本地港人 vs 跨境高才客單價'))}
              </h3>
            </div>
            {selectedStage && (
              <button
                type="button"
                onClick={() => setSelectedStage(null)}
                className="text-[11px] font-semibold text-blue-700 hover:underline"
              >
                {t('Reset', conv('顯示客群對比'))}
              </button>
            )}
          </div>

          {!selectedStage ? (
            <div className="space-y-3">
              {model.residencyComparison.map((seg) => (
                <div
                  key={seg.residency}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>{lang === 'en' ? seg.labelEn : conv(seg.labelZh)}</span>
                    <span className="font-mono text-slate-600 tabular-nums">
                      {seg.leadCount} {t('leads', conv('位'))}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between font-mono tabular-nums">
                    <span className="text-base font-bold text-blue-700">
                      HK${seg.avgPolicyPremiumHkd.toLocaleString()}
                      <span className="ml-1 font-sans text-[11px] font-normal text-slate-500">
                        /{t('yr avg', conv('平均年保費'))}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-emerald-700">
                      {t('Close:', conv('轉化：'))} {seg.conversionToClosePct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {stageMatchingLeads.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                  {t(
                    'No clients currently resting at this exact step (already progressed downstream).',
                    conv('此階段客戶已全數推進至下游核保或生效階段。')
                  )}
                </p>
              ) : (
                stageMatchingLeads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => onSelectLeadAndOpenCrm?.(lead.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-xs hover:border-blue-400 hover:bg-blue-50/40"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {lead.fullNameZh} ({lead.fullNameEn})
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {lead.age}歲 · {lead.residency === 'MCV' ? '跨境 MCV' : '本地 HK'}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-blue-700 tabular-nums">
                      HK${(lead.annualBudgetHkd || 48000).toLocaleString()}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
