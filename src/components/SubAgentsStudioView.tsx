import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Loader2,
  MessageSquareQuote,
  Share2,
  Sparkles,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { recommendBestFitPlansForContext } from '../domain/clauseAndMonetizationEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import { buildDeterministicDualSubAgentReport } from '../domain/subAgentEngine';
import { buildPersonalizedObjectionScripts } from '../domain/clientGapEngine';
import {
  AgentWorkflowActionStep,
  AppImprovementItem,
  ClientLead,
  DualSubAgentResponse,
  InsurancePlan,
  IntermediaryProfile,
  TeamLibraryItem,
} from '../domain/types';
import { copyTextSafe } from '../utils/clipboardAndDom';

interface SubAgentsStudioViewProps {
  leads: ClientLead[];
  plans: InsurancePlan[];
  intermediary: IntermediaryProfile;
  selectedLeadId: string;
  onSelectLeadId: (leadId: string) => void;
  selectedPlanId: string;
  onSelectPlanId: (planId: string) => void;
  adoptedImprovementIds: string[];
  onToggleAdoptImprovement: (improvementId: string) => void;
  onExecuteWorkflowAction: (
    action: AgentWorkflowActionStep['targetAction'],
    leadId: string,
    planId: string
  ) => void;
  onLaunchLiveImprovement?: (improvementId: string, moduleTarget: string) => void;
  teamLibraryItems?: TeamLibraryItem[];
  onCloneTeamItem?: (item: TeamLibraryItem) => void;
  onPublishTeamScript?: (params: {
    titleZh: string;
    summaryZh: string;
    objectionPromptZh: string;
    objectionReplyZh: string;
  }) => void;
  onNotify?: (msg: string) => void;
}

type ImprovementFilter = 'ALL' | 'AGENT_EFFICIENCY' | 'CLIENT_EXPERIENCE' | 'ADOPTED';

export const SubAgentsStudioView: React.FC<SubAgentsStudioViewProps> = ({
  leads,
  plans,
  intermediary,
  selectedLeadId,
  selectedPlanId,
  adoptedImprovementIds,
  onToggleAdoptImprovement,
  onExecuteWorkflowAction,
  onLaunchLiveImprovement,
  teamLibraryItems = [],
  onCloneTeamItem,
  onPublishTeamScript,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zhHk: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk);
  const [customFocusPrompt, setCustomFocusPrompt] = useState('');
  const [runningAgents, setRunningAgents] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedObjectionId, setCopiedObjectionId] = useState<string | null>(null);
  const [activeObjectionIdx, setActiveObjectionIdx] = useState(0);
  const [improvementFilter, setImprovementFilter] = useState<ImprovementFilter>('ALL');
  const [showTeamScripts, setShowTeamScripts] = useState(false);

  const teamScriptItems = useMemo(
    () => teamLibraryItems.filter((item) => item.kind === 'OBJECTION_SCRIPT'),
    [teamLibraryItems]
  );

  const activeLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || leads[0],
    [leads, selectedLeadId]
  );

  const smartMatched = useMemo(
    () =>
      recommendBestFitPlansForContext({
        plans,
        lead: activeLead,
        intermediary,
        contextHint: 'GENERAL',
        limit: 1,
      }),
    [plans, activeLead, intermediary]
  );

  const activePlan = useMemo(
    () =>
      (selectedPlanId ? plans.find((p) => p.id === selectedPlanId) : undefined) ||
      smartMatched[0]?.plan ||
      plans[0],
    [plans, selectedPlanId, smartMatched]
  );

  const deterministicBaseline = useMemo(
    () =>
      buildDeterministicDualSubAgentReport({
        lead: activeLead,
        plan: activePlan,
        intermediary,
        language: lang,
        customFocusPrompt,
      }),
    [activeLead, activePlan, intermediary, lang, customFocusPrompt]
  );

  const [liveReport, setLiveReport] = useState<DualSubAgentResponse | null>(null);

  useEffect(() => {
    setLiveReport(null);
  }, [selectedLeadId, selectedPlanId, intermediary.role, lang]);

  const activeReport = liveReport ?? deterministicBaseline;

  const personalizedObjections = useMemo(
    () =>
      buildPersonalizedObjectionScripts({
        lead: activeLead,
        intermediary,
        plan: activePlan,
      }),
    [activeLead, intermediary, activePlan]
  );

  const selectedObjection =
    personalizedObjections[Math.min(activeObjectionIdx, personalizedObjections.length - 1)];

  const handleRunDualSubAgents = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setRunningAgents(true);
    setAgentError(null);
    try {
      const res = await fetch('/api/ai/subagents-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: activeLead,
          plan: activePlan,
          intermediary,
          language: lang,
          customFocusPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Dual AI Sub-Agent request failed.');
      }
      setLiveReport(data as DualSubAgentResponse);
      onNotify?.(
        t(
          `Updated client Q&A scripts for ${activeLead.fullNameEn}.`,
          conv(`已更新「${activeLead.fullNameZh}」嘅常見問題應對話術。`)
        )
      );
    } catch (err: any) {
      setAgentError(
        err?.message ||
          t(
            'Using built-in Hong Kong advisory Q&A library.',
            '已載入內置香港保險常見問題與應對話術。'
          )
      );
    } finally {
      setRunningAgents(false);
    }
  };

  const handleCopyPitch = async () => {
    await copyTextSafe(activeReport.agentSubAgent.readyPitchScript);
    setCopiedScript(true);
    onNotify?.(
      t(
        'Copied WhatsApp opening pitch to clipboard!',
        conv('已複製 WhatsApp／見客開場話術至剪貼簿！')
      )
    );
    window.setTimeout(() => setCopiedScript(false), 2000);
  };

  const combinedImprovements: AppImprovementItem[] = useMemo(() => {
    const all = [
      ...activeReport.agentSubAgent.appImprovements,
      ...activeReport.clientSubAgent.appImprovements,
    ];
    return all.filter((item) => {
      if (improvementFilter === 'AGENT_EFFICIENCY') {
        return item.sourceSubAgent === 'AGENT_EFFICIENCY';
      }
      if (improvementFilter === 'CLIENT_EXPERIENCE') {
        return item.sourceSubAgent === 'CLIENT_EXPERIENCE';
      }
      if (improvementFilter === 'ADOPTED') {
        return adoptedImprovementIds.includes(item.id);
      }
      return true;
    });
  }, [activeReport, improvementFilter, adoptedImprovementIds]);

  const totalMinutesSaved = useMemo(
    () =>
      activeReport.agentSubAgent.workflowSteps.reduce(
        (sum, step) => sum + step.estimatedMinutesSaved,
        0
      ),
    [activeReport]
  );

  const getWorkflowButtonLabel = (target: AgentWorkflowActionStep['targetAction']) => {
    switch (target) {
      case 'OPEN_FNA':
        return t('Open GL30 FNA', '打開 GL30 財務分析');
      case 'OPEN_OCR':
        return t('Scan HKID / Slip', '掃描身份證／標籤');
      case 'ENABLE_SAFE_MODE':
        return t('Enable Safe Mode', '開啟見客匿名鎖');
      case 'OPEN_HOSPITAL_LOG':
        return t('Open Hospital LOG', '查看私院免找數');
      case 'LAUNCH_STP':
      default:
        return t('Launch e-Policy STP', '啟動電子投保 STP');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-slate-900"
            style={{ textWrap: 'balance' }}
          >
            {t(
              '04B. Client Q&A & Objection Script Library',
              conv('04B. 客戶常見問題與應對話術庫')
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              `Practical talking points and client Q&A for ${activeLead.fullNameEn} (${activeLead.age}y) + [${activePlan.insurerCode}] ${activePlan.nameEn}.`,
              conv(
                `已根據「${activeLead.fullNameZh}（${activeLead.age} 歲）」及「[${activePlan.insurerCode}] ${activePlan.nameZh}」整理常見問題應對話術同跟進重點。`
              )
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 shrink-0">
          <button
            type="button"
            data-testid="toggle-team-script-library-btn"
            onClick={() => setShowTeamScripts((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Users className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
            <span>
              {t(
                `Team Battlecards (${teamScriptItems.length})`,
                conv(`團隊拆彈話術庫 (${teamScriptItems.length})`)
              )}
            </span>
          </button>
          <span className="font-mono font-semibold text-slate-900 tabular-nums">
            {t(`~${totalMinutesSaved} mins saved / case`, `每單節省 ~${totalMinutesSaved} 分鐘`)}
          </span>
        </div>
      </div>

      {/* Collapsible Agency Team Objection Battlecard Library (#20) */}
      {showTeamScripts && (
        <section
          data-testid="team-objection-library-panel"
          className="rounded-xl border border-slate-300 bg-white p-5 space-y-4 shadow-xs"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {t(
                  'Agency MDRT Objection Battlecard Library',
                  conv('團隊 MDRT 王牌異議拆彈話術共享庫')
                )}
              </h2>
              <p className="text-xs text-slate-600">
                {t(
                  'Copy proven MDRT objection rebuttals in one click or share your personalized client rebuttal with your agency team.',
                  conv('一鍵複製團隊高成交拆彈金句，或將當前個人化異議回應分享至團隊知識庫。')
                )}
              </p>
            </div>
            {onPublishTeamScript && selectedObjection && (
              <button
                type="button"
                data-testid="publish-current-script-team-btn"
                onClick={() =>
                  onPublishTeamScript({
                    titleZh: `【實戰拆彈】${selectedObjection.categoryZh}`,
                    summaryZh: `針對 ${activeLead.age} 歲客戶與 [${activePlan.insurerCode}] ${activePlan.nameZh} 之實戰應對腳本`,
                    objectionPromptZh: selectedObjection.clientObjectionZh,
                    objectionReplyZh: selectedObjection.advisorScriptZh,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Share2 className="h-3.5 w-3.5 text-[#F3D37A]" aria-hidden="true" />
                <span>{t('Share Current Rebuttal to Team', conv('分享當前拆彈話術至團隊庫'))}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {teamScriptItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span className="font-semibold text-teal-800">{item.authorName}</span>
                    <span className="font-mono tabular-nums">
                      {t(`Used ${item.cloneCount}x`, conv(`已被引用 ${item.cloneCount} 次`))}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">
                    {lang === 'en' ? item.titleEn : conv(item.titleZh)}
                  </h3>
                  <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs leading-relaxed text-slate-700">
                    {lang === 'en'
                      ? item.objectionReplyEn || item.summaryEn
                      : conv(item.objectionReplyZh || item.summaryZh)}
                  </p>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      const replyText =
                        lang === 'en'
                          ? item.objectionReplyEn || item.summaryEn
                          : conv(item.objectionReplyZh || item.summaryZh);
                      await copyTextSafe(replyText);
                      onCloneTeamItem?.(item);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                  >
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    <span>{t('Copy MDRT Rebuttal', conv('一鍵複製王牌話術'))}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PRIMARY ABOVE-THE-FOLD ANCHOR: Personalized Client Objection Roleplay Studio */}
      <section
        aria-label="Client objection roleplay studio"
        data-testid="objection-roleplay-studio"
        className="overflow-hidden rounded-xl border border-slate-300 bg-white"
      >
        <div className="flex flex-col gap-2 bg-slate-900 px-6 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquareQuote className="h-4 w-4 text-teal-400" aria-hidden="true" />
              <h2 className="text-base font-bold text-white">
                {t(
                  `Client Objection Roleplay Studio (${activeLead.fullNameEn} Personalized Scripts)`,
                  conv(`客戶異議實戰演練室（針對「${activeLead.fullNameZh}」個人化拆彈腳本）`)
                )}
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-300">
              {t(
                `Synced Plan: [${activePlan.insurerCode}] ${activePlan.nameEn} · Budget HK$${(activeLead.annualBudgetHkd ?? 48000).toLocaleString()}`,
                conv(
                  `連動主推：[${activePlan.insurerCode}] ${activePlan.nameZh} · 客戶年預算 HK$ ${(activeLead.annualBudgetHkd ?? 48000).toLocaleString()}`
                )
              )}
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-teal-300 whitespace-nowrap">
            {activeLead.fullNameZh} · [{activePlan.insurerCode}]
          </span>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {personalizedObjections.map((obj, idx) => {
              const active = idx === activeObjectionIdx;
              return (
                <button
                  key={obj.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveObjectionIdx(idx)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-teal-700 text-white'
                      : 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t(obj.categoryEn, conv(obj.categoryZh))}
                </button>
              );
            })}
          </div>

          {selectedObjection && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Client Tough Question + Root Psychology */}
              <div className="lg:col-span-5 rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <div className="font-mono text-[11px] font-bold text-amber-900">
                  {t('Client Raises Objection', conv('模擬客戶現場異議提問'))}
                </div>
                <p className="text-sm font-bold leading-relaxed text-slate-900">
                  {t(selectedObjection.clientObjectionEn, conv(selectedObjection.clientObjectionZh))}
                </p>
                <div className="border-t border-amber-200/70 pt-3">
                  <div className="text-[11px] font-semibold text-amber-900">
                    {t('Underlying Client Psychology', conv('背後真實顧慮解讀'))}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">
                    {t(selectedObjection.rootPsychologyEn, conv(selectedObjection.rootPsychologyZh))}
                  </p>
                </div>
                <div className="border-t border-amber-200/70 pt-3">
                  <div className="text-[11px] font-semibold text-slate-800">
                    {t('Next Live Action', conv('即場示範動作'))}
                  </div>
                  <p className="mt-1 text-xs text-teal-800 font-medium">
                    {t(
                      selectedObjection.nextClosingActionEn,
                      conv(selectedObjection.nextClosingActionZh)
                    )}
                  </p>
                </div>
              </div>

              {/* Advisor Personalized Golden Script + Proof Anchors */}
              <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold text-teal-800">
                    {t(
                      `Personalized Advisor Rebuttal (${activeLead.fullNameEn})`,
                      conv(`顧問實戰回應話術（已套用 ${activeLead.fullNameZh} 數據）`)
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const txt = t(
                        selectedObjection.advisorScriptEn,
                        conv(selectedObjection.advisorScriptZh)
                      );
                      await copyTextSafe(txt);
                      setCopiedObjectionId(selectedObjection.id);
                      onNotify?.(
                        t(
                          'Copied personalized objection rebuttal script!',
                          conv('已複製此段個人化異議回應話術！')
                        )
                      );
                      window.setTimeout(() => setCopiedObjectionId(null), 2000);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
                  >
                    {copiedObjectionId === selectedObjection.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>
                      {copiedObjectionId === selectedObjection.id
                        ? t('Copied!', conv('已複製話術！'))
                        : t('Copy Script', conv('複製此段話術'))}
                    </span>
                  </button>
                </div>

                <blockquote className="rounded-lg border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-800 font-medium">
                  {t(selectedObjection.advisorScriptEn, conv(selectedObjection.advisorScriptZh))}
                </blockquote>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700">
                    {t('Key Proof Anchors to Highlight:', conv('演練必提三大數據支撐點：'))}
                  </div>
                  <ul className="space-y-1">
                    {(lang === 'en'
                      ? selectedObjection.proofPointsEn
                      : selectedObjection.proofPointsZh
                    ).map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle2
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700"
                          aria-hidden="true"
                        />
                        <span>{lang === 'en' ? pt : conv(pt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Single-Row Custom Meeting Scenario Dispatch Bar */}
      <form
        onSubmit={handleRunDualSubAgents}
        aria-label="Dual AI Sub-Agent configuration"
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
      >
        <label
          htmlFor="subagent-custom-focus"
          className="text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0"
        >
          {t('Custom Meeting Scenario:', '輸入特定見客情境：')}
        </label>
        <input
          id="subagent-custom-focus"
          type="text"
          value={customFocusPrompt}
          onChange={(e) => setCustomFocusPrompt(e.target.value)}
          placeholder={t(
            'e.g., Client comparing AXA vs Sun Life dividend fulfillment & semi-private LOG...',
            '例如：客戶正比較安盛與永明分紅實現率，並擔心養和半私家房自付差額...'
          )}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={runningAgents}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap shrink-0"
        >
          {runningAgents ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              <span>{t('Running Sub-Agents...', '雙子 AI 分析中...')}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
              <span>{t('Run Dual AI Sub-Agents', '啟動雙子 AI 深度推演')}</span>
            </>
          )}
        </button>
      </form>

      {agentError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
          {agentError}
        </div>
      )}

      {/* Dual Sub-Agent Split Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* COLUMN 1: SUB-AGENT 01 — INSURANCE AGENT EFFICIENCY ARCHITECT */}
        <section
          aria-label="Sub-Agent 01 Insurance Agent Efficiency Architect"
          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 space-y-5"
        >
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <Bot className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-teal-800">
                    {t('Sub-Agent 01 · Advisor Closing Side', '子代理 01 · 顧問成交與合規提速')}
                  </div>
                  <h2 className="mt-0.5 text-base font-bold text-slate-900">
                    {activeReport.agentSubAgent.personaTitle}
                  </h2>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                {activeReport.agentSubAgent.readinessScoreLabel}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              {activeReport.agentSubAgent.executiveBrief}
            </p>

            {/* Prioritized Workflow Acceleration Actions */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-700">
                {t(
                  '1. Advisor Efficiency & Compliance Shortcuts',
                  '1. 顧問成交提速與合規一鍵執行清單'
                )}
              </h3>

              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {activeReport.agentSubAgent.workflowSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex flex-col justify-between gap-3 p-3.5 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <span className="font-mono text-slate-400">0{index + 1}</span>
                        <span>{step.title}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-600">{step.rationale}</p>
                      <div className="font-mono text-[11px] font-semibold text-emerald-700 tabular-nums">
                        {t(
                          `Saves ~${step.estimatedMinutesSaved} mins`,
                          `節省約 ${step.estimatedMinutesSaved} 分鐘`
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onExecuteWorkflowAction(
                          step.targetAction,
                          activeLead.id,
                          activePlan.id
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      <span>{getWorkflowButtonLabel(step.targetAction)}</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Ready-to-Send WhatsApp / Meeting Opening Script */}
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {t(
                    '2. Ready-to-Send WhatsApp / Meeting Pitch',
                    '2. 即時可用 WhatsApp／見客開場話術'
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPitch}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
                >
                  {copiedScript ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-700" aria-hidden="true" />
                      <span>{t('Copied!', '已複製！')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" aria-hidden="true" />
                      <span>{t('Copy Script', '複製話術')}</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs leading-relaxed text-slate-700">
                {activeReport.agentSubAgent.readyPitchScript}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            {activeReport.sourceMode === 'gemini-dual-subagents'
              ? t('Engine: Live Gemini Dual Sub-Agent Synthesis', '引擎：Gemini 實時雙子智能合成')
              : t(
                  'Engine: HKIA Domain-Grounded Sub-Agent Baseline',
                  '引擎：香港保監局規則基準模型（可於上方輸入情境啟動實時 AI 推演）'
                )}
          </div>
        </section>

        {/* COLUMN 2: SUB-AGENT 02 — PROSPECTIVE CLIENT FOLLOW-UP SIMULATOR */}
        <section
          aria-label="Sub-Agent 02 Prospective Client Question Simulator"
          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 space-y-5"
        >
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white">
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-teal-800">
                    {t(
                      'Sub-Agent 02 · Client Perspective',
                      '子代理 02 · 準客戶心理與尖銳追問端'
                    )}
                  </div>
                  <h2 className="mt-0.5 text-base font-bold text-slate-900">
                    {activeReport.clientSubAgent.personaTitle}
                  </h2>
                </div>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              {activeReport.clientSubAgent.psychologySummary}
            </p>

            {/* Predicted Client Follow-Up Questions & Compliant Rebuttals */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700">
                {t(
                  'What This Client Will Ask Next (With HKIA-Compliant Answers)',
                  '預測客戶下一步必問尖銳問題（附合規標準解答）'
                )}
              </h3>

              <div className="space-y-3">
                {activeReport.clientSubAgent.predictedQuestions.map((qItem, idx) => (
                  <article
                    key={qItem.id}
                    className="rounded-lg border border-slate-200 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">
                        Q{idx + 1} · {qItem.concernCategory}
                      </span>
                      <span className="font-mono text-slate-500">{qItem.citationOrRule}</span>
                    </div>

                    <p className="flex items-start gap-2 text-xs font-bold leading-relaxed text-slate-900">
                      <MessageSquareQuote
                        className="mt-0.5 h-4 w-4 shrink-0 text-teal-700"
                        aria-hidden="true"
                      />
                      <span>&ldquo;{qItem.question}&rdquo;</span>
                    </p>

                    <div className="rounded-md bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                      <span className="font-semibold text-emerald-800">
                        {t('Compliant Advisor Answer: ', '合規顧問解答：')}
                      </span>
                      {qItem.compliantAnswer}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            {t(
              'All suggested client answers enforce HKIA GL28/GN16 non-guaranteed disclosure rules.',
              '所有建議答覆均嚴格遵守保監局 GL28／GN16 保證與非保證分拆披露原則。'
            )}
          </div>
        </section>
      </div>

      {/* Progressive Disclosure Drawer: Recommended Specialist Tools for This Case */}
      <details className="group rounded-xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 text-sm font-bold text-slate-900 select-none">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <span>
              {t(
                `Recommended Tools & Next Steps for ${activeLead.fullNameEn} (${combinedImprovements.length})`,
                conv(`展開適合此客戶嘅實用工具與跟進建議（${combinedImprovements.length} 項）`)
              )}
            </span>
          </div>
          <ChevronDown
            className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180 shrink-0"
            aria-hidden="true"
          />
        </summary>

        <div className="space-y-4 border-t border-slate-100 p-6">
          <div
            role="group"
            aria-label="Filter app improvements by sub-agent perspective"
            className="inline-flex items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-1"
          >
            {(
              [
                { id: 'ALL', label: t('All Proposals', '全部建議') },
                { id: 'AGENT_EFFICIENCY', label: t('Agent Efficiency', '顧問效率') },
                { id: 'CLIENT_EXPERIENCE', label: t('Client Questions', '客戶體驗') },
                {
                  id: 'ADOPTED',
                  label: `${t('Pinned', '已釘選')} (${adoptedImprovementIds.length})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setImprovementFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  improvementFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {combinedImprovements.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-600">
              {t(
                'No items pinned in this filter yet.',
                '目前尚未在此分類釘選項目。'
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {combinedImprovements.map((imp) => {
                const isAdopted = adoptedImprovementIds.includes(imp.id);
                const isAgent = imp.sourceSubAgent === 'AGENT_EFFICIENCY';
                return (
                  <article
                    key={imp.id}
                    className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                      isAdopted
                        ? 'border-emerald-600 bg-emerald-50/30'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-800">
                          {isAgent
                            ? t('Sub-Agent 01 · Agent Efficiency', '子代理 01 · 顧問效率')
                            : t('Sub-Agent 02 · Client Trust', '子代理 02 · 客戶體驗')}
                        </span>
                        <span className="font-mono text-slate-500">{imp.moduleTarget}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900">{imp.title}</h3>
                      <p className="text-xs leading-relaxed text-slate-600">
                        {imp.problemSolved}
                      </p>
                    </div>

                    <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3">
                      <div className="font-mono text-[11px] font-semibold text-teal-800">
                        {imp.impactMetric}
                      </div>

                      <div className="flex items-center gap-2">
                        {onLaunchLiveImprovement && (
                          <button
                            type="button"
                            onClick={() => onLaunchLiveImprovement(imp.id, imp.moduleTarget)}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                          >
                            <span>{t('Open Live Tool', '開啟實戰工具')}</span>
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            onToggleAdoptImprovement(imp.id);
                            onNotify?.(
                              isAdopted
                                ? t('Unpinned tool from favorites.', conv('已取消釘選該項工具。'))
                                : t('Pinned tool to Stage 06 favorites!', conv('已釘選該項工具至 06 常用清單！'))
                            );
                          }}
                          aria-pressed={isAdopted}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                            isAdopted
                              ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                              : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{isAdopted ? t('Pinned', '已釘選') : t('Pin', '釘選')}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </details>
    </div>
  );
};
