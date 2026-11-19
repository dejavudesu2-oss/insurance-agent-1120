import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Check,
  Copy,
  FilePlus2,
  Loader2,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  recommendBestFitPlansForContext,
  runDeterministicClauseSubAgents,
  TripleClauseSubAgentReport,
} from '../domain/clauseAndMonetizationEngine';
import { localizePlanStrings, toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  AppLanguage,
  ClauseComparisonResponse,
  ClientLead,
  InsurancePlan,
  IntermediaryProfile,
  PolicyProvisionChunk,
} from '../domain/types';
import { derivePlanSyncProfile } from '../domain/crmAndCatalogTaxonomy';
import {
  ClausePentagonRadarSvg,
  ClauseRadarDimensionBars,
  VhisPreExistingTimelineBar,
} from './VisualCharts';
import { copyTextSafe, scrollToElementSmooth } from '../utils/clipboardAndDom';

interface PolicyCopilotViewProps {
  provisions: PolicyProvisionChunk[];
  onAddProvision: (chunk: PolicyProvisionChunk) => void;
  plans?: InsurancePlan[];
  selectedPlanId?: string;
  onSelectPlanId?: (planId: string) => void;
  activeLead?: ClientLead;
  intermediary?: IntermediaryProfile;
  onNotify?: (msg: string) => void;
}

const PRESET_QUESTIONS: Array<{
  labelEn: string;
  labelZhHk: string;
  query: string;
  lang: AppLanguage;
}> = [
  {
    labelEn: 'CIS Waiting Period & Organ Definitions (AIA vs Manulife)',
    labelZhHk: '原位癌等候期及定義比較 (友邦 vs 宏利)',
    query:
      '比較友邦愛伴航 2 同宏利活耀人生危疾保 2 對原位癌 (Carcinoma-in-situ) 嘅等候期、受保器官定義同預支賠償上限。',
    lang: 'zh-HK',
  },
  {
    labelEn: 'VHIS Unknown Pre-Existing & Ward Upgrade 50% Penalty (Prudential vs Bowtie)',
    labelZhHk: '自願醫保未知已有病症及自願升等 50% 病房折算 (保誠 vs 保泰)',
    query:
      '比較保誠自願醫保尊尚計劃同保泰粉紅自願醫保對投保前未知已有病症賠償比例，以及自願升等入住私家房觸發 50% 病房調整因子嘅規定。',
    lang: 'zh-HK',
  },
  {
    labelEn: 'Day-Case vs Inpatient Endoscopy "Medically Necessary" Trap',
    labelZhHk: '腸胃鏡「入院過夜 vs 日間中心」醫療必需拒賠盲點',
    query:
      '解釋私家醫院住院照腸胃鏡與指定日間內視鏡中心喺「醫療必需 (Medically Necessary)」條款上嘅理賠風險差異及免找數批核做法。',
    lang: 'zh-HK',
  },
  {
    labelEn: 'Multi-Currency Switch & 30-Day Lock-In Window (FWD vs Sun Life)',
    labelZhHk: '儲蓄分紅貨幣轉換與週年 30 日紅利鎖定限期 (富衛 vs 永明)',
    query:
      '比較富衛盈聚天下同永明萬年青星河傳承計劃嘅保單貨幣轉換、保單分拆同終期紅利鎖定週年申請限期條款。',
    lang: 'zh-HK',
  },
];

export const PolicyCopilotView: React.FC<PolicyCopilotViewProps> = ({
  provisions,
  onAddProvision,
  plans = [],
  selectedPlanId = '',
  onSelectPlanId,
  activeLead,
  intermediary,
  onNotify,
}) => {
  const { lang: globalLang, t } = useLanguage();
  const [question, setQuestion] = useState(PRESET_QUESTIONS[0].query);
  const [language, setLanguage] = useState<AppLanguage>(globalLang);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ClauseComparisonResponse | null>(null);

  // Triple Clause Sub-Agents Workbench State (Sub-Agent C1 + C2 + C3)
  const defaultRecommended = useMemo(
    () =>
      plans.length > 0
        ? recommendBestFitPlansForContext({
            plans,
            lead: activeLead,
            intermediary,
            contextHint: 'CLAUSE_AUDIT',
            limit: 3,
          })
        : [],
    [plans, activeLead, intermediary]
  );

  const [planAId, setPlanAId] = useState<string>(
    selectedPlanId || defaultRecommended[0]?.plan.id || plans[0]?.id || ''
  );
  const [planBId, setPlanBId] = useState<string>(
    defaultRecommended[1]?.plan.id || plans[1]?.id || ''
  );
  const [focusTopic, setFocusTopic] = useState<string>(
    '等候期、投保前未知已有病症、病房升等折算及保證條款'
  );
  const [auditBusy, setAuditBusy] = useState(false);
  const [liveSubAgentReport, setLiveSubAgentReport] =
    useState<TripleClauseSubAgentReport | null>(null);
  const [copiedBattlecard, setCopiedBattlecard] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState('');

  useEffect(() => {
    setLanguage(globalLang);
    setLiveSubAgentReport(null);
  }, [globalLang]);

  useEffect(() => {
    if (selectedPlanId && selectedPlanId !== planAId) {
      setPlanAId(selectedPlanId);
      setLiveSubAgentReport(null);
    }
  }, [selectedPlanId]);

  const planA = useMemo(
    () => plans.find((p) => p.id === planAId) || plans[0] || null,
    [plans, planAId]
  );
  const planB = useMemo(
    () =>
      plans.find((p) => p.id === planBId) ||
      plans.find((p) => p.id !== planA?.id) ||
      plans[0] ||
      null,
    [plans, planBId, planA]
  );

  const deterministicSubAgentReport = useMemo(() => {
    if (!planA || !planB) return null;
    return runDeterministicClauseSubAgents({
      planA,
      planB,
      focusTopic,
      language,
      provisions,
    });
  }, [planA, planB, focusTopic, language, provisions]);

  const activeSubAgentReport = liveSubAgentReport ?? deterministicSubAgentReport;

  const handleRunLiveClauseSubAgents = async () => {
    if (!planA || !planB) return;
    setAuditBusy(true);
    try {
      const res = await fetch('/api/ai/clause-subagents-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planA,
          planB,
          focusTopic,
          language,
          provisions,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.actuarialAuditor) {
        setLiveSubAgentReport(data as TripleClauseSubAgentReport);
      }
    } catch {
      // Deterministic report stays rendered seamlessly
    } finally {
      setAuditBusy(false);
    }
  };

  // Add Brochure Clause Modal
  const [showAddClause, setShowAddClause] = useState(false);
  const [newInsurer, setNewInsurer] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [newClauseRef, setNewClauseRef] = useState('');
  const [newContentEn, setNewContentEn] = useState('');
  const [newContentZh, setNewContentZh] = useState('');
  const [clauseFormError, setClauseFormError] = useState<string | null>(null);

  const handleRunComparison = async (customQuery?: string, customLang?: AppLanguage) => {
    const q = (customQuery ?? question).trim();
    const targetLang = customLang ?? language;
    if (!q) {
      setErrorMsg(
        t(
          'Please enter a policy clause question to compare.',
          '請輸入保單條款問題以進行比對。'
        )
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/compare-clauses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          language: targetLang,
          provisions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Clause comparison request failed');
      }
      setResult(data as ClauseComparisonResponse);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to query Policy Clause Copilot.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClauseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInsurer.trim() || !newPlanName.trim() || !newClauseRef.trim()) {
      setClauseFormError('Insurer name, plan name, and exact page/clause citation are required.');
      return;
    }
    if (!newContentEn.trim() && !newContentZh.trim()) {
      setClauseFormError('Provide at least English or Traditional Chinese policy clause text.');
      return;
    }

    const chunk: PolicyProvisionChunk = {
      id: `chunk-custom-${Date.now()}`,
      planId: `CUSTOM_${Date.now()}`,
      insurerName: newInsurer.trim(),
      planName: newPlanName.trim(),
      clauseRef: newClauseRef.trim(),
      topicTags: [newInsurer.trim(), newPlanName.trim()],
      contentEn: newContentEn.trim() || newContentZh.trim(),
      contentZh: newContentZh.trim() || newContentEn.trim(),
    };

    onAddProvision(chunk);
    setShowAddClause(false);
    setNewInsurer('');
    setNewPlanName('');
    setNewClauseRef('');
    setNewContentEn('');
    setNewContentZh('');
    setClauseFormError(null);
  };

  const filteredProvisions = useMemo(() => {
    const q = libraryFilter.trim().toLowerCase();
    if (!q) return provisions;
    return provisions.filter((chunk) => {
      const raw = `${chunk.insurerName} ${chunk.planName} ${chunk.clauseRef} ${chunk.contentEn} ${chunk.contentZh} ${chunk.topicTags.join(' ')}`;
      return `${raw} ${toSimplifiedChinese(raw)}`.toLowerCase().includes(q);
    });
  }, [provisions, libraryFilter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-slate-900"
            style={{ textWrap: 'balance' }}
          >
            {t(
              '02B. Policy Clause Comparison & Claims Checklist',
              '02B. 保單條款比較與理賠細則查詢'
            )}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {t(
              `Includes ${provisions.length} HK policy provision extracts — with 5-dimension coverage scores, common claims pitfalls, and plain-language WhatsApp explanations.`,
              `收錄 ${provisions.length} 條香港保單條款原文 — 提供 5 項保障評分、常見理賠注意事項，以及一鍵複製給客戶嘅白話文解釋。`
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setClauseFormError(null);
            setShowAddClause(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <FilePlus2 className="h-4 w-4" aria-hidden="true" />
          <span>{t('Add Brochure Clause', '新增保單條款摘錄')}</span>
        </button>
      </div>

      {/* NEW UPGRADED SECTION 03: TRIPLE CLAUSE SUB-AGENTS VISUAL WORKBENCH */}
      {plans.length >= 2 && activeSubAgentReport && (
        <section
          aria-label="Triple Clause Sub-Agents Plan A vs Plan B Visual Audit"
          className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xs"
        >
          <div className="flex flex-col gap-3 bg-slate-900 px-6 py-4 text-white lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-2.5">
              <Bot className="mt-0.5 h-5 w-5 shrink-0 text-teal-400" aria-hidden="true" />
              <div>
                <h2 className="text-base font-bold text-white">
                  {t(
                    'Plan A vs. Plan B Clause Comparison & Claims Notes',
                    '兩款計劃條款並排比較 — 保障評分與理賠注意事項'
                  )}
                </h2>
                <p className="mt-0.5 text-xs text-slate-300">
                  {selectedPlanId && planA
                    ? t(
                        `Active Plan: [${planA.insurerCode}] ${planA.nameEn} · Switching Plan A updates all stages.`,
                        `目前已選計劃：[${planA.insurerCode}] ${planA.nameZh} · 切換方案 A 會同步更新其他步驟。`
                      )
                    : t(
                        'Select any two HK plans to compare key definitions side by side.',
                        '選擇任何兩款香港保險計劃，即可並排比較重點條款與定義。'
                      )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {planA && (
                <button
                  type="button"
                  data-testid="copilot-audit-active-plan-btn"
                  disabled={loading}
                  onClick={() => {
                    const syncProf = derivePlanSyncProfile(planA, activeLead);
                    if (!syncProf) return;
                    const q =
                      language === 'en'
                        ? syncProf.copilotAuditQuestionEn
                        : language === 'zh-CN'
                        ? toSimplifiedChinese(syncProf.copilotAuditQuestionZh)
                        : syncProf.copilotAuditQuestionZh;
                    setQuestion(q);
                    scrollToElementSmooth('clause-rag-section');
                    onNotify?.(
                      t(
                        `Auditing exact clauses for [${planA.insurerCode}] ${planA.nameEn}...`,
                        `正在檢索「[${planA.insurerCode}] ${planA.nameZh}」條款原文與頁碼...`
                      )
                    );
                    handleRunComparison(q, language);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-teal-300 hover:bg-slate-700 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {loading
                      ? t('Checking Clauses...', '查詢條款中...')
                      : t('Check Plan Clauses', '查看此計劃條款原文')}
                  </span>
                </button>
              )}
              <button
                type="button"
                disabled={auditBusy}
                onClick={handleRunLiveClauseSubAgents}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {auditBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {auditBusy
                    ? t('Comparing Clauses...', '深入比對條款中...')
                    : t('Compare Clauses in Depth', '深入比對兩款條款')}
                </span>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
          {/* Plan A vs Plan B Direct Selectors */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-100/80 p-4 md:grid-cols-3">
            <div>
              <label htmlFor="clause-plan-a" className="block text-xs font-semibold text-slate-700">
                {t('Plan A (Synced Primary / Active Plan)', '方案 A（連動全局主推計劃）')}
              </label>
              <select
                id="clause-plan-a"
                value={planA?.id || ''}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setPlanAId(nextId);
                  onSelectPlanId?.(nextId);
                  setLiveSubAgentReport(null);
                }}
                className="mt-1 w-full rounded-lg border border-emerald-400 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
              >
                {plans.map((p) => {
                  const loc = localizePlanStrings(p, language);
                  return (
                    <option key={p.id} value={p.id}>
                      [{p.insurerCode}] {loc.planName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label htmlFor="clause-plan-b" className="block text-xs font-semibold text-slate-700">
                {t('Plan B (Competitor Benchmark)', '方案 B（同業對照計劃）')}
              </label>
              <select
                id="clause-plan-b"
                value={planB?.id || ''}
                onChange={(e) => {
                  setPlanBId(e.target.value);
                  setLiveSubAgentReport(null);
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
              >
                {plans.map((p) => {
                  const loc = localizePlanStrings(p, language);
                  return (
                    <option key={p.id} value={p.id}>
                      [{p.insurerCode}] {loc.planName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label htmlFor="clause-focus-topic" className="block text-xs font-semibold text-slate-700">
                {t('Audit Focus Dimension', '重點審查條款焦點')}
              </label>
              <input
                id="clause-focus-topic"
                type="text"
                value={focusTopic}
                onChange={(e) => setFocusTopic(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Sub-Agent C1 Visual 5-Dimension Bars + Sub-Agent C2 ICB Trap Cards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: Sub-Agent C1 Visual Bars */}
            <div className="space-y-4 lg:col-span-7">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  {activeSubAgentReport.actuarialAuditor.agentTitle}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {activeSubAgentReport.actuarialAuditor.executiveVerdict}
                </p>
              </div>

              <ClausePentagonRadarSvg
                planAName={activeSubAgentReport.planAName}
                planBName={activeSubAgentReport.planBName}
                dimensions={activeSubAgentReport.actuarialAuditor.dimensions}
              />

              <ClauseRadarDimensionBars
                planAName={activeSubAgentReport.planAName}
                planBName={activeSubAgentReport.planBName}
                dimensions={activeSubAgentReport.actuarialAuditor.dimensions}
              />
            </div>

            {/* Right: Sub-Agent C2 ICB Dispute Traps */}
            <div className="space-y-3 lg:col-span-5">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  {activeSubAgentReport.claimsAdvocate.agentTitle}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {activeSubAgentReport.claimsAdvocate.icbSummary}
                </p>
              </div>

              <div className="space-y-2.5">
                {activeSubAgentReport.claimsAdvocate.traps.map((trap) => (
                  <article
                    key={trap.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                        <AlertTriangle
                          className={`h-3.5 w-3.5 shrink-0 ${
                            trap.severity === 'HIGH' ? 'text-rose-700' : 'text-amber-700'
                          }`}
                          aria-hidden="true"
                        />
                        <span>{trap.trapTitle}</span>
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold whitespace-nowrap ${
                          trap.severity === 'HIGH' ? 'text-rose-700' : 'text-amber-700'
                        }`}
                      >
                        {trap.severity}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      {trap.clauseMechanism}
                    </p>
                    <p className="text-[11px] font-medium text-emerald-800">
                      ✓ {trap.advisorMitigationTip}
                    </p>
                    <p className="font-mono text-[10px] text-slate-500">{trap.icbReference}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          {/* Visual VHIS Unknown Pre-Existing Condition Timeline */}
          <VhisPreExistingTimelineBar />

          {/* Sub-Agent C3: 30-Second Plain-Language Analogy + Copyable WhatsApp Clause Battlecard */}
          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 lg:grid-cols-12">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5 lg:col-span-7">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-900">
                  {activeSubAgentReport.clientPlainLanguageCoach.agentTitle}
                </h3>
                <button
                  type="button"
                  onClick={async () => {
                    await copyTextSafe(
                      activeSubAgentReport.clientPlainLanguageCoach.whatsappBattlecardText
                    );
                    setCopiedBattlecard(true);
                    onNotify?.(
                      t(
                        'Copied WhatsApp clause battlecard to clipboard!',
                        '已複製 WhatsApp 白話條款懶人包至剪貼簿！'
                      )
                    );
                    window.setTimeout(() => setCopiedBattlecard(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  {copiedBattlecard ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {copiedBattlecard
                      ? t('Copied Battlecard!', '已複製條款懶人包！')
                      : t('Copy WhatsApp Battlecard', '一鍵複製 WhatsApp 懶人包')}
                  </span>
                </button>
              </div>

              <p className="text-xs leading-relaxed text-slate-700">
                {activeSubAgentReport.clientPlainLanguageCoach.thirtySecondAnalogy}
              </p>

              <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 font-sans text-[11px] leading-relaxed text-slate-800">
                {activeSubAgentReport.clientPlainLanguageCoach.whatsappBattlecardText}
              </pre>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2 lg:col-span-5">
              <h3 className="text-xs font-bold text-slate-900">
                {t(
                  'Sub-Agent C3 Audit — 4 Live Section 03 Upgrades Delivered',
                  '子代理 C3 檢視報告 — 已為 03 模組落實之 4 項體驗升級'
                )}
              </h3>
              <div className="divide-y divide-slate-100">
                {activeSubAgentReport.clientPlainLanguageCoach.section03Upgrades.map((up) => (
                  <div key={up.id} className="py-2 first:pt-1 last:pb-0">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-900">{up.title}</span>
                      <span className="font-mono text-[10px] font-bold text-emerald-700 whitespace-nowrap">
                        {up.liveStatusIn03}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">{up.beforePainPoint}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        </section>
      )}

      {/* Free-Form Clause RAG Query Panel (ZH FIRST in Switcher!) */}
      <section id="clause-rag-section" className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label
            htmlFor="copilot-query-input"
            className="text-sm font-semibold text-slate-900"
          >
            {t(
              'Ask Any Specific Policy Clause or Definition Question (Page & Clause Cited)',
              '輸入任何具體保單條款或定義問題（附頁碼及條款編號引證）'
            )}
          </label>

          <div
            role="group"
            aria-label="Clause response language ZH CN EN"
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
          >
            <button
              type="button"
              onClick={() => setLanguage('zh-HK')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 ${
                language === 'zh-HK' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              ZH 繁體
            </button>
            <button
              type="button"
              onClick={() => setLanguage('zh-CN')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 ${
                language === 'zh-CN' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              CN 简体
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 ${
                language === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Preset Quick Queries */}
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESET_QUESTIONS.map((preset) => (
            <button
              key={preset.labelEn}
              type="button"
              onClick={() => {
                setQuestion(preset.query);
                handleRunComparison(preset.query, language);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-100"
            >
              {t(preset.labelEn, preset.labelZhHk)}
            </button>
          ))}
        </div>

        <textarea
          id="copilot-query-input"
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., Does AIA On Your Side Plan 2 cover early-stage carcinoma-in-situ across all organs, and what is the waiting period?"
          className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-slate-500">
            {t(
              'Cites exact Page & Clause numbers · Separates Guaranteed vs. Non-Guaranteed terms',
              '嚴格引述頁碼及條款編號 · 清晰區分保證與非保證利益條款'
            )}
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleRunComparison()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300 whitespace-nowrap shrink-0"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span>
              {loading
                ? t('Analyzing Policy Provisions...', '正在檢索條款原文...')
                : t('Compare Policy Clauses', '比對保單條款原文')}
            </span>
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
            {errorMsg}
          </div>
        )}
      </section>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6" aria-busy="true">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="h-3 w-2/3 rounded bg-slate-100" />
          <div className="mt-4 h-24 w-full rounded bg-slate-100" />
        </div>
      )}

      {/* Comparison Results */}
      {!loading && result && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {t('Executive Provision Summary', '條款原文比對摘要結論')}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
              {result.summaryRecommendation}
            </p>
          </div>

          <div className="overflow-x-auto pt-2">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-3 px-4 font-semibold">{t('Insurer & Plan', '保險公司及計劃')}</th>
                  <th className="py-3 px-4 font-semibold">{t('Verdict', '保障結論')}</th>
                  <th className="py-3 px-4 font-semibold">{t('Waiting Period', '等候期')}</th>
                  <th className="py-3 px-4 font-semibold">{t('Clause Provision Details', '條款細則重點')}</th>
                  <th className="py-3 px-4 font-semibold">{t('Source Citation', '原文頁碼出處')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.planComparisons.map((item, i) => (
                  <tr key={i} className="align-top">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>{item.insurer}</div>
                      <div className="mt-0.5 text-blue-700">{item.planName}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-700">
                      {item.coverageVerdict}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{item.waitingPeriod}</td>
                    <td className="py-3.5 px-4 max-w-md leading-relaxed text-slate-700">
                      {item.keyDetails}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {item.exactSourceCitation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            {result.regulatoryDisclaimer}
          </div>
        </section>
      )}

      {/* Searchable Indexed Policy Provisions Reference Library */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-600" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900 tabular-nums">
              {t(
                `Indexed Hong Kong Policy Provision Library (${filteredProvisions.length}/${provisions.length})`,
                `已索引香港保單條款原文庫（顯示 ${filteredProvisions.length}／${provisions.length} 條）`
              )}
            </h2>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search indexed policy clauses"
              value={libraryFilter}
              onChange={(e) => setLibraryFilter(e.target.value)}
              placeholder={t(
                'Filter VHIS, CIS, Endoscopy, HKMC...',
                '篩選原位癌、腸胃鏡、病房折算、年金...'
              )}
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900"
            />
          </div>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {filteredProvisions.map((chunk) => (
            <div key={chunk.id} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span className="font-semibold text-slate-900">{chunk.insurerName}</span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-slate-700">{chunk.planName}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px] text-blue-700">{chunk.clauseRef}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                {language === 'en'
                  ? chunk.contentEn
                  : language === 'zh-CN'
                  ? toSimplifiedChinese(chunk.contentZh)
                  : chunk.contentZh}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Add Custom Brochure Clause Modal */}
      {showAddClause && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-clause-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 id="add-clause-title" className="text-lg font-bold text-slate-900">
                {t('Add Insurer Brochure / Policy Clause', '新增保單條款摘錄')}
              </h2>
              <button
                type="button"
                aria-label="Close add clause modal"
                onClick={() => setShowAddClause(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddClauseSubmit} className="mt-4 space-y-3.5">
              {clauseFormError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
                  {clauseFormError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="clause-insurer" className="block text-xs font-semibold text-slate-700">
                    Insurer Name *
                  </label>
                  <input
                    id="clause-insurer"
                    type="text"
                    value={newInsurer}
                    onChange={(e) => setNewInsurer(e.target.value)}
                    placeholder="e.g., YF Life 萬通保險"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="clause-plan" className="block text-xs font-semibold text-slate-700">
                    Plan Name *
                  </label>
                  <input
                    id="clause-plan"
                    type="text"
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    placeholder="e.g., PrimeHealth Pro"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="clause-ref" className="block text-xs font-semibold text-slate-700">
                  Page & Clause Citation *
                </label>
                <input
                  id="clause-ref"
                  type="text"
                  value={newClauseRef}
                  onChange={(e) => setNewClauseRef(e.target.value)}
                  placeholder="e.g., Page 16, Clause 5.3 — Stroke & Heart Attack Waiting Period"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                />
              </div>
              <div>
                <label htmlFor="clause-zh" className="block text-xs font-semibold text-slate-700">
                  Traditional Chinese Provision Text 繁體中文條款原文
                </label>
                <textarea
                  id="clause-zh"
                  rows={2}
                  value={newContentZh}
                  onChange={(e) => setNewContentZh(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label htmlFor="clause-en" className="block text-xs font-semibold text-slate-700">
                  English Provision Text 英文條款原文
                </label>
                <textarea
                  id="clause-en"
                  rows={2}
                  value={newContentEn}
                  onChange={(e) => setNewContentEn(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClause(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  {t('Cancel', '取消')}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white"
                >
                  {t('Index Clause into Corpus', '納入條款原文庫')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
