import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Award, Check, Copy, Share2, Trophy, Users } from 'lucide-react';
import {
  MDRT_2026_FYC_HKD,
  computeAgencyMdrtCoachingSummary,
} from '../domain/advisorUpgradesPackEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  ClientLead,
  IntermediaryProfile,
  PolicyApplicationRecord,
  TeamLibraryItem,
} from '../domain/types';
import { copyTextSafe } from '../utils/clipboardAndDom';

interface AgencyLeaderCoachingViewProps {
  intermediary: IntermediaryProfile;
  leads: ClientLead[];
  applications: PolicyApplicationRecord[];
  micrositeReceiptsCount: number;
  teamLibraryItems: TeamLibraryItem[];
  onPublishScript: (item: {
    titleZh: string;
    objectionPromptZh: string;
    objectionReplyZh: string;
  }) => void;
  onCloneScript?: (itemId: string) => void;
  onNotify?: (msg: string) => void;
}

export const AgencyLeaderCoachingView: React.FC<AgencyLeaderCoachingViewProps> = ({
  intermediary,
  leads,
  applications,
  micrositeReceiptsCount,
  teamLibraryItems,
  onPublishScript,
  onCloneScript,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zhHk: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk);

  const [rosterFilter, setRosterFilter] = useState<'ALL' | 'SPRINT' | 'COACHING'>('ALL');
  const [newTitleZh, setNewTitleZh] = useState('');
  const [newPromptZh, setNewPromptZh] = useState('');
  const [newReplyZh, setNewReplyZh] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const summary = useMemo(
    () =>
      computeAgencyMdrtCoachingSummary({
        activeAdvisorNameZh: intermediary.nameZh,
        activeAdvisorNameEn: intermediary.nameEn,
        activeAdvisorLicense: intermediary.iaLicenseNo,
        leads,
        applications,
        micrositeReceiptsCount,
      }),
    [intermediary, leads, applications, micrositeReceiptsCount]
  );

  const filteredAdvisors = useMemo(() => {
    if (rosterFilter === 'SPRINT') {
      return summary.advisors.filter(
        (a) => a.trackStatus === 'MDRT_SPRINT' || a.trackStatus === 'MDRT_QUALIFIED'
      );
    }
    if (rosterFilter === 'COACHING') {
      return summary.advisors.filter((a) => a.trackStatus === 'COACHING_PRIORITY');
    }
    return summary.advisors;
  }, [summary.advisors, rosterFilter]);

  const chartData = useMemo(
    () =>
      summary.advisors.map((adv) => ({
        name: adv.nameEn.replace(' (Live Seat)', ''),
        ytdFycHkd: adv.ytdFycHkd,
        mdrtPct: adv.mdrtProgressPct,
        fill:
          adv.trackStatus === 'COT_TOT_TRACK'
            ? '#D97706'
            : adv.trackStatus === 'MDRT_QUALIFIED'
            ? '#059669'
            : adv.trackStatus === 'MDRT_SPRINT'
            ? '#2563EB'
            : '#E11D48',
      })),
    [summary.advisors]
  );

  const objectionScripts = useMemo(
    () => teamLibraryItems.filter((item) => item.kind === 'OBJECTION_SCRIPT'),
    [teamLibraryItems]
  );

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleZh.trim() || !newReplyZh.trim()) return;
    onPublishScript({
      titleZh: newTitleZh.trim(),
      objectionPromptZh: newPromptZh.trim() || '客戶對非保證分紅或保費猶豫不決',
      objectionReplyZh: newReplyZh.trim(),
    });
    setNewTitleZh('');
    setNewPromptZh('');
    setNewReplyZh('');
    onNotify?.(conv('已成功發佈王牌粵語異議處理話術至團隊共享庫！'));
  };

  return (
    <div data-testid="agency-leader-coaching-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
            <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {t(
                'STAGE 01D · AGENCY LEADER MDRT / COT / TOT COACHING HUB',
                conv('01D · 區域總監／分行經理 MDRT 團隊活動量督導看板')
              )}
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
            {t(
              'Team Activity Funnel, 2026 MDRT Progress & Shared Cantonese Playbooks',
              conv('組員每週 FNA／QR 微網打開率／核保轉化追蹤 ＋ 團隊共享王牌粵語話術庫')
            )}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1 shrink-0">
          {(
            [
              { id: 'ALL', zh: '全部組員 (5)', en: 'All Advisors' },
              { id: 'SPRINT', zh: '衝刺／達標 MDRT', en: 'MDRT Sprint' },
              { id: 'COACHING', zh: '需優先督導', en: 'Needs Coaching' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setRosterFilter(f.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                rosterFilter === f.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t(f.en, conv(f.zh))}
            </button>
          ))}
        </div>
      </div>

      {/* Team KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-xs font-medium text-slate-500">
            {t('Team YTD Total FYC', conv('團隊本年度累計首年佣金 (FYC)'))}
          </span>
          <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            HK${summary.teamTotalFycHkd.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            1x MDRT 基準線：HK${MDRT_2026_FYC_HKD.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-xs font-medium text-slate-500">
            {t('Advisors On-Track for MDRT/COT', conv('進度達標／衝刺 MDRT 人數'))}
          </span>
          <div className="mt-1.5 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {summary.teamMdrtOnTrackCount} / {summary.advisors.length}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            3x COT 基準線：HK${summary.cotTargetFycHkd.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-xs font-medium text-slate-500">
            {t('Team Avg QR Microsite Open Rate', conv('全組互動建議書 QR 平均打開率'))}
          </span>
          <div className="mt-1.5 font-mono text-2xl font-bold text-blue-700 tabular-nums">
            {summary.teamAvgQrOpenRatePct}%
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            較傳統靜態 PDF 電郵提升約 2.4 倍
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-xs font-medium text-slate-500">
            {t('Priority 1-on-1 Coaching Seats', conv('本週需主管陪談督導人數'))}
          </span>
          <div className="mt-1.5 font-mono text-2xl font-bold text-rose-700 tabular-nums">
            {summary.coachingPriorityCount} {t('Advisor', conv('位新晉同事'))}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            FNA 少於 3 份或微網打開率低於 50%
          </p>
        </div>
      </div>

      {/* MDRT FYC BarChart + Team Activity Table */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-5">
          <h2 className="text-sm font-bold text-slate-900">
            {t('YTD FYC vs. HK$600k MDRT Benchmark', conv('組員累計 FYC 對標 HK$600,000 MDRT 線'))}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {t('Dashed line = 1x MDRT qualification threshold', conv('虛線代表 2026 香港 1x MDRT 資格基準'))}
          </p>

          <div className="mt-4 h-64 w-full" style={{ minHeight: 256 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="name"
                  interval={0}
                  tick={{ fill: '#334155', fontSize: 10, fontWeight: 600 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
                  tick={{ fill: '#475569', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(val: any) => [
                    `HK$${Number(val || 0).toLocaleString()}`,
                    'YTD FYC',
                  ]}
                />
                <ReferenceLine
                  y={MDRT_2026_FYC_HKD}
                  stroke="#0F172A"
                  strokeDasharray="4 4"
                  label={{ value: 'MDRT $600k', position: 'top', fontSize: 10, fill: '#0F172A' }}
                />
                <Bar dataKey="ytdFycHkd" radius={[6, 6, 0, 0]} maxBarSize={42}>
                  {chartData.map((c) => (
                    <Cell key={c.name} fill={c.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-7">
          <div className="flex items-center gap-2 pb-3">
            <Users className="h-4 w-4 text-blue-700" aria-hidden="true" />
            <h2 className="text-sm font-bold text-slate-900">
              {t('Weekly Advisor Funnel & Leader Action', conv('組員每週活動漏斗與主管督導建議'))}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-2.5 px-2.5 font-semibold">{t('Advisor', conv('組員及牌照'))}</th>
                  <th className="py-2.5 px-2 text-right font-semibold whitespace-nowrap">{t('Wk FNA', conv('本週 FNA'))}</th>
                  <th className="py-2.5 px-2 text-right font-semibold whitespace-nowrap">{t('QR Open', conv('微網打開'))}</th>
                  <th className="py-2.5 px-2 text-right font-semibold whitespace-nowrap">{t('UW Conv', conv('核保轉化'))}</th>
                  <th className="py-2.5 px-2 text-right font-semibold whitespace-nowrap">{t('MDRT %', conv('MDRT 進度'))}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {filteredAdvisors.map((adv) => (
                  <tr key={adv.advisorId} className="align-top">
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-900">{conv(adv.nameZh)}</div>
                      <div className="text-[11px] text-slate-500">
                        {adv.iaLicenseNo} · {conv(adv.tierTitleZh)}
                      </div>
                      <p className="mt-1 text-[11px] text-teal-800">{conv(adv.coachingActionZh)}</p>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {adv.weeklyFnaCount}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-blue-700">
                      {adv.qrOpenRatePct}%
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {adv.uwConversionRatePct}%
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`inline-block rounded px-2 py-0.5 font-bold ${
                          adv.mdrtProgressPct >= 100
                            ? 'bg-emerald-50 text-emerald-800'
                            : adv.mdrtProgressPct >= 70
                            ? 'bg-blue-50 text-blue-800'
                            : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {adv.mdrtProgressPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Team Winning Cantonese Objection-Handling Playbook Library */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-600" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-900">
            {t(
              'Team Shared Cantonese Objection-Handling Scripts (1-Click Sync to New Recruits)',
              conv('團隊共享王牌粵語異議處理話術庫（銷冠經驗一鍵同步俾全組新人）')
            )}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form onSubmit={handlePublish} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-5">
            <div className="text-xs font-bold text-slate-900">
              {t('Share New Winning Cantonese Script', conv('新增並發佈團隊粵語實戰話術'))}
            </div>
            <input
              type="text"
              placeholder={conv('話術標題（例：拆解「定期存款 4% 好過買儲蓄保」異議）')}
              value={newTitleZh}
              onChange={(e) => setNewTitleZh(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
            />
            <input
              type="text"
              placeholder={conv('客戶常見疑問（例：做美金定存都有 4 厘幾，點解要鎖 5 年？）')}
              value={newPromptZh}
              onChange={(e) => setNewPromptZh(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
            />
            <textarea
              rows={3}
              placeholder={conv('輸入銷冠實戰廣東話回應話術...')}
              value={newReplyZh}
              onChange={(e) => setNewReplyZh(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
            />
            <button
              type="submit"
              data-testid="publish-team-script-btn"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('Publish to Agency Team', conv('發佈至全組共享話術庫'))}</span>
            </button>
          </form>

          <div className="space-y-3 lg:col-span-7">
            {objectionScripts.slice(0, 4).map((script) => (
              <div
                key={script.id}
                className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {conv(script.titleZh)}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    {script.authorName} · {t('Cloned', conv('已被引用'))} {script.cloneCount}x
                  </span>
                </div>
                {script.objectionPromptZh && (
                  <div className="text-[11px] font-semibold text-amber-800">
                    Q: {conv(script.objectionPromptZh)}
                  </div>
                )}
                <p className="text-xs leading-relaxed text-slate-600">
                  {conv(script.objectionReplyZh || script.summaryZh)}
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await copyTextSafe(conv(script.objectionReplyZh || script.summaryZh));
                      onCloneScript?.(script.id);
                      setCopiedId(script.id);
                      window.setTimeout(() => setCopiedId(null), 2000);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
                  >
                    {copiedId === script.id ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>
                      {copiedId === script.id
                        ? conv('已複製話術 ✓')
                        : conv('一鍵引用並複製粵語話術')}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
