import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  Mic,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  X,
} from 'lucide-react';
import {
  convertHkdToRmb,
  evaluateDynamicSchemeBenchmarks,
  evaluateSixDimensionGapAudit,
  FAMILY_STAGE_OPTIONS,
  getDefaultRidersForScheme,
  getSchemeMeta,
  OCCUPATION_RISK_OPTIONS,
  TARGET_PROTECTION_SCHEMES,
} from '../domain/clientGapEngine';
import {
  ensureLeadCartDefaults,
  resetLeadToFactoryDefault,
  UnifiedDealValuation,
} from '../domain/dealCaseEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import { GuidedStageKey, GuidedStepGateResult } from '../domain/guidedWorkflowEngine';
import { evaluateGl30AffordabilityGauge } from '../domain/proEnhancementsEngine';
import { GuidedStepFooter } from './GuidedStepFooter';
import { InteractiveSixAxisGapRadarSvg } from './VisualCharts';
import { LegacyPolicyDiffPanel } from './LegacyPolicyDiffPanel';
import { FamilyAndPolicySummarySuite } from './FamilyAndPolicySummarySuite';
import { INTERMEDIARY_PROFILES } from '../data/hkMarketPlans';
import {
  ClientFollowUpTask,
  ClientLead,
  ExistingPolicyAuditItem,
  FamilyStageCode,
  InsurancePlan,
  IntermediaryProfile,
  LeadStage,
  OccupationRiskClass,
  ProtectionDimensionId,
  ResidencyType,
  TargetProtectionSchemeId,
} from '../domain/types';
import { PowerPackToolId } from '../domain/advisorSixPowerPackEngine';

interface ClientProfileGapViewProps {
  leads: ClientLead[];
  initialPresets?: ClientLead[];
  selectedLeadId: string;
  onSelectLeadId: (leadId: string) => void;
  onUpdateLead: (leadId: string, updater: (prev: ClientLead) => ClientLead) => void;
  onAddLead: (newLead: ClientLead) => void;
  onOpenClientEditor: () => void;
  onJumpToSection: (section: 'market' | 'calculator' | 'subagents' | 'morning_briefing') => void;
  plans?: InsurancePlan[];
  selectedPlanId?: string;
  onSelectPlanId?: (planId: string) => void;
  unifiedDeal?: UnifiedDealValuation;
  intermediary?: IntermediaryProfile;
  expressMeetingMode?: boolean;
  step1Confirmed?: boolean;
  onConfirmStep1?: () => void;
  stepGate?: GuidedStepGateResult;
  onGoNextStage?: (next: GuidedStageKey) => void;
  onDeleteSnapshot?: (snapshotId: string) => void;
  onOpenPowerPackTool?: (toolId: PowerPackToolId) => void;
  onNotify?: (msg: string) => void;
}

export const ClientProfileGapView: React.FC<ClientProfileGapViewProps> = ({
  leads,
  initialPresets = [],
  selectedLeadId,
  onSelectLeadId,
  onUpdateLead,
  onAddLead,
  onOpenClientEditor,
  onJumpToSection,
  plans = [],
  selectedPlanId = '',
  onSelectPlanId,
  unifiedDeal,
  intermediary,
  expressMeetingMode = false,
  step1Confirmed = false,
  onConfirmStep1,
  stepGate,
  onGoNextStage,
  onDeleteSnapshot,
  onOpenPowerPackTool,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zhHk: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk);
  const [showAdvancedStage1Tools, setShowAdvancedStage1Tools] = useState(false);
  const [showNotesSection, setShowNotesSection] = useState(false);

  const activeLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || leads[0],
    [leads, selectedLeadId]
  );

  // Local editable form draft synced with activeLead
  const [nameZh, setNameZh] = useState(activeLead.fullNameZh);
  const [age, setAge] = useState(String(activeLead.age));
  const [budgetHkd, setBudgetHkd] = useState(String(activeLead.annualBudgetHkd ?? 48000));
  const [familyStage, setFamilyStage] = useState<FamilyStageCode>(
    activeLead.familyStage || 'CHILDCARE_NUCLEAR'
  );
  const [occupationRisk, setOccupationRisk] = useState<OccupationRiskClass>(
    activeLead.occupationRiskClass || 'CLASS_1_OFFICE'
  );
  const [residency, setResidency] = useState<ResidencyType>(activeLead.residency);
  const [isSmoker, setIsSmoker] = useState<boolean>(activeLead.isSmoker);
  const [targetSchemeId, setTargetSchemeId] = useState<TargetProtectionSchemeId>(
    activeLead.targetSchemeId || 'FAMILY_COMPREHENSIVE'
  );
  const [existingSummaryNote, setExistingSummaryNote] = useState(
    activeLead.existingSummaryNote || ''
  );
  const [priorityGoalNote, setPriorityGoalNote] = useState(
    activeLead.priorityGoalNote || ''
  );
  const [clientNotes, setClientNotes] = useState<string>(activeLead.clientNotes ?? '');
  const [hideConsultantNotes, setHideConsultantNotes] = useState<boolean>(false);
  const isEditingClientNotesRef = useRef<boolean>(false);

  // Sync draft when selected client ID switches
  useEffect(() => {
    isEditingClientNotesRef.current = false;
    setNameZh(activeLead.fullNameZh);
    setAge(String(activeLead.age));
    setBudgetHkd(String(activeLead.annualBudgetHkd ?? 48000));
    setFamilyStage(activeLead.familyStage || 'CHILDCARE_NUCLEAR');
    setOccupationRisk(activeLead.occupationRiskClass || 'CLASS_1_OFFICE');
    setResidency(activeLead.residency);
    setIsSmoker(activeLead.isSmoker);
    setTargetSchemeId(activeLead.targetSchemeId || 'FAMILY_COMPREHENSIVE');
    setExistingSummaryNote(activeLead.existingSummaryNote || '');
    setPriorityGoalNote(activeLead.priorityGoalNote || '');
    setClientNotes(activeLead.clientNotes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLead.id]);

  // Keep clientNotes synced when workspace finishes async hydration or external reset
  useEffect(() => {
    if (!isEditingClientNotesRef.current) {
      setClientNotes(activeLead.clientNotes ?? '');
    }
  }, [activeLead.clientNotes]);

  // Active radar dimension & OCR scan state (wired into unified Existing Policy Summary Sheet)
  const [polDim, setPolDim] = useState<ProtectionDimensionId>('PRIVATE_HOSPITAL');
  const [ocrScanningPolicy, setOcrScanningPolicy] = useState(false);

  const affordabilityGauge = useMemo(
    () =>
      evaluateGl30AffordabilityGauge(
        activeLead,
        unifiedDeal?.bundleSim.netAnnualPremiumHkd ?? (Number(budgetHkd) || 48000)
      ),
    [activeLead, unifiedDeal?.bundleSim.netAnnualPremiumHkd, budgetHkd]
  );

  const runPolicyOcrExtract = async (payload: {
    rawText?: string;
    fileBase64?: string;
    mimeType?: string;
    fileName?: string;
  }) => {
    setOcrScanningPolicy(true);
    try {
      const res = await fetch('/api/ai/ocr-existing-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.parsed) {
        const p = data.parsed;
        const item: ExistingPolicyAuditItem = {
          id: `pol-ocr-${Date.now()}`,
          policyName: p.policyName,
          dimensionId: p.dimensionId,
          coverageAmountHkd: p.coverageAmountHkd,
          annualPremiumHkd: p.annualPremiumHkd,
          limitationNote: p.limitationNote,
          addedAtIso: new Date().toISOString(),
        };
        onUpdateLead(activeLead.id, (prev) => ({
          ...prev,
          existingPolicies: [item, ...(prev.existingPolicies || [])],
        }));
        onNotify?.(
          t(
            `OCR imported "${item.policyName}" (HK$${item.coverageAmountHkd.toLocaleString()}) into 6-Axis Gap Audit!`,
            conv(`已透過智能 OCR 識別並匯入舊保單「${item.policyName}」（保額 HK$${item.coverageAmountHkd.toLocaleString()}）！`)
          )
        );
      }
    } finally {
      setOcrScanningPolicy(false);
    }
  };

  const handlePolicyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = typeof reader.result === 'string' ? reader.result : '';
      runPolicyOcrExtract({
        fileBase64: base64,
        mimeType: file.type || 'image/png',
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Quick "+ 新增客戶" modal state
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newNameZh, setNewNameZh] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newRoleTag, setNewRoleTag] = useState('家庭支柱');
  const [newAge, setNewAge] = useState('34');
  const [newBudget, setNewBudget] = useState('45000');
  const [newResidency, setNewResidency] = useState<ResidencyType>('HK_RESIDENT');
  const [newScheme, setNewScheme] = useState<TargetProtectionSchemeId>('FAMILY_COMPREHENSIVE');
  const [newClientNotes, setNewClientNotes] = useState('');

  const draftLeadPreview = useMemo<ClientLead>(
    () => ({
      ...activeLead,
      fullNameZh: nameZh.trim() || activeLead.fullNameZh,
      age: Math.max(18, Math.min(80, Number(age) || activeLead.age)),
      annualBudgetHkd: Math.max(6000, Number(budgetHkd) || 48000),
      familyStage,
      occupationRiskClass: occupationRisk,
      residency,
      isSmoker,
      targetSchemeId,
      existingSummaryNote,
      priorityGoalNote,
    }),
    [
      activeLead,
      nameZh,
      age,
      budgetHkd,
      familyStage,
      occupationRisk,
      residency,
      isSmoker,
      targetSchemeId,
      existingSummaryNote,
      priorityGoalNote,
    ]
  );

  const gapAudit = useMemo(
    () =>
      evaluateSixDimensionGapAudit(
        draftLeadPreview,
        targetSchemeId,
        targetSchemeId === (activeLead.targetSchemeId || 'FAMILY_COMPREHENSIVE')
          ? unifiedDeal?.combinedDimensionBoostsHkd
          : undefined
      ),
    [draftLeadPreview, targetSchemeId, activeLead.targetSchemeId, unifiedDeal?.combinedDimensionBoostsHkd]
  );

  const activeSchemeMeta = getSchemeMeta(targetSchemeId);
  const budgetRmb = convertHkdToRmb(Math.max(0, Number(budgetHkd) || 0));

  const dynamicSchemeBenchmarks = useMemo(
    () =>
      evaluateDynamicSchemeBenchmarks({
        lead: draftLeadPreview,
        allPlans: plans,
      }),
    [draftLeadPreview, plans]
  );

  const commitLeadPatch = (patch: Partial<ClientLead>) => {
    onUpdateLead(activeLead.id, (prev) => ({
      ...prev,
      ...patch,
      lastContactIso: new Date().toISOString(),
    }));
  };

  const handleSelectSchemeCard = (schemeId: TargetProtectionSchemeId) => {
    setTargetSchemeId(schemeId);
    const meta = getSchemeMeta(schemeId);
    onUpdateLead(activeLead.id, (prev) => {
      const safePrev = ensureLeadCartDefaults(prev);
      return {
        ...safePrev,
        targetSchemeId: schemeId,
        proposalCart: {
          ...safePrev.proposalCart!,
          selectedRiderIds: getDefaultRidersForScheme(schemeId),
        },
        lastContactIso: new Date().toISOString(),
      };
    });
    onNotify?.(
      t(
        `Target architecture switched to "${meta.titleEn}" — 6-Axis Radar & riders updated.`,
        conv(`已切換目標保障架構為「${meta.titleZh}」，六軸缺口雷達與附約預設已同步更新。`)
      )
    );
  };

  const persistedClientNotes = activeLead.clientNotes ?? '';
  const hasUnsavedClientNotes = clientNotes !== persistedClientNotes;

  const formatNotesSavedStamp = (iso?: string): string => {
    if (!iso) return t('Auto-synced to workspace', conv('自動同步至工作區'));
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return t('Saved', conv('已儲存'));
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${min}`;
  };

  const handleSaveClientNotes = (overrideText?: string, silent?: boolean) => {
    const nextText = typeof overrideText === 'string' ? overrideText : clientNotes;
    const nowIso = new Date().toISOString();
    isEditingClientNotesRef.current = false;
    setClientNotes(nextText);
    onUpdateLead(activeLead.id, (prev) => ({
      ...prev,
      clientNotes: nextText,
      clientNotesUpdatedAtIso: nowIso,
      lastContactIso: nowIso,
    }));
    if (!silent) {
      onNotify?.(
        t(
          `Saved meeting notes for ${activeLead.fullNameEn}.`,
          conv(`已儲存「${activeLead.fullNameZh}」的顧問會面筆記（跨裝置與重整自動保留）。`)
        )
      );
    }
  };

  const handleAppendMeetingNoteTemplate = (snippetZh: string, snippetEn: string) => {
    const line = lang === 'en' ? `• ${snippetEn}` : `• ${conv(snippetZh)}`;
    const base = clientNotes.trimEnd();
    const combined = base ? `${base}\n${line}` : line;
    handleSaveClientNotes(combined, false);
  };

  // #7 Actionable Follow-Up Tasks & Due Dates + #8 Voice/Transcript Structuring
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('2026-11-18');
  const [showVoiceDrawer, setShowVoiceDrawer] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [structuringNotes, setStructuringNotes] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);

  const handleAddFollowUpTask = () => {
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;
    const task: ClientFollowUpTask = {
      id: `task-${Date.now().toString(36)}`,
      title: trimmed,
      dueDateIso: newTaskDueDate || '2026-11-18',
      completed: false,
      category: 'REVIEW',
    };
    onUpdateLead(activeLead.id, (prev) => ({
      ...prev,
      followUpTasks: [task, ...(prev.followUpTasks || [])],
      lastContactIso: new Date().toISOString(),
    }));
    setNewTaskTitle('');
    onNotify?.(
      t(
        `Added follow-up task (Due ${task.dueDateIso}).`,
        conv(`已新增待辦跟進任務（期限：${task.dueDateIso}），同步顯示於 CRM 看板。`)
      )
    );
  };

  const handleToggleFollowUpTask = (taskId: string) => {
    onUpdateLead(activeLead.id, (prev) => ({
      ...prev,
      followUpTasks: (prev.followUpTasks || []).map((tk) =>
        tk.id === taskId ? { ...tk, completed: !tk.completed } : tk
      ),
    }));
  };

  const handleDeleteFollowUpTask = (taskId: string) => {
    onUpdateLead(activeLead.id, (prev) => ({
      ...prev,
      followUpTasks: (prev.followUpTasks || []).filter((tk) => tk.id !== taskId),
    }));
  };

  const handleStartBrowserDictation = () => {
    const SpeechRec =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;
    if (!SpeechRec) {
      setVoiceTranscript(
        `今日同 ${activeLead.fullNameZh} 面談，確認每年保費預算約 5.2 萬港幣，希望優先安排養和半私家房全數賠償同埋補交近期驗身超聲波報告。`
      );
      return;
    }
    try {
      const rec = new SpeechRec();
      rec.lang = lang === 'en' ? 'en-HK' : 'yue-Hant-HK';
      rec.interimResults = false;
      setIsListeningVoice(true);
      rec.onresult = (ev: any) => {
        const spoken = ev?.results?.[0]?.[0]?.transcript || '';
        if (spoken) {
          setVoiceTranscript((prev) => (prev ? `${prev} ${spoken}` : spoken));
        }
      };
      rec.onerror = () => setIsListeningVoice(false);
      rec.onend = () => setIsListeningVoice(false);
      rec.start();
    } catch {
      setIsListeningVoice(false);
    }
  };

  const handleStructureTranscriptToNotes = async () => {
    const raw =
      voiceTranscript.trim() ||
      `今日同 ${activeLead.fullNameZh} 覆核保障，預算約 5.2 萬一年，最關心養和半私家房免找數預批，下週補交驗身超聲波報告。`;
    setStructuringNotes(true);
    try {
      const res = await fetch('/api/ai/structure-meeting-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: raw, lead: activeLead }),
      });
      const data = await res.json();
      if (data?.extracted) {
        const ext = data.extracted;
        const summaryBlock = lang === 'en' ? ext.bulletSummaryEn : conv(ext.bulletSummaryZh);
        const base = clientNotes.trimEnd();
        const combined = base ? `${base}\n${summaryBlock}` : summaryBlock;
        const nowIso = new Date().toISOString();
        const autoTask: ClientFollowUpTask = {
          id: `task-ai-${Date.now().toString(36)}`,
          title: ext.suggestedFollowUpTitleZh || `跟進 ${activeLead.fullNameZh} 建議書簽署`,
          dueDateIso: ext.suggestedFollowUpDueDateIso || '2026-11-18',
          completed: false,
          category: 'UW_DOC',
        };
        setClientNotes(combined);
        if (ext.detectedAnnualBudgetHkd) {
          setBudgetHkd(String(ext.detectedAnnualBudgetHkd));
        }
        onUpdateLead(activeLead.id, (prev) => ({
          ...prev,
          clientNotes: combined,
          clientNotesUpdatedAtIso: nowIso,
          annualBudgetHkd: ext.detectedAnnualBudgetHkd || prev.annualBudgetHkd,
          followUpTasks: [autoTask, ...(prev.followUpTasks || [])],
          lastContactIso: nowIso,
        }));
        setVoiceTranscript('');
        setShowVoiceDrawer(false);
        onNotify?.(
          t(
            'Structured meeting transcript into Client Notes & created follow-up task!',
            conv('已將口述面談紀錄自動整理寫入客戶筆記，並同步建立待辦跟進項目！')
          )
        );
      }
    } finally {
      setStructuringNotes(false);
    }
  };

  const handleSaveClientSettings = (e?: React.FormEvent) => {
    e?.preventDefault();
    const parsedAge = Math.max(18, Math.min(80, Number(age) || activeLead.age));
    const parsedBudget = Math.max(6000, Number(budgetHkd) || 48000);
    const nowIso = new Date().toISOString();
    isEditingClientNotesRef.current = false;
    onUpdateLead(activeLead.id, (prev) => ({
      ...prev,
      fullNameZh: nameZh.trim() || prev.fullNameZh,
      age: parsedAge,
      annualBudgetHkd: parsedBudget,
      familyStage,
      occupationRiskClass: occupationRisk,
      residency,
      isSmoker,
      targetSchemeId,
      existingSummaryNote: existingSummaryNote.trim(),
      priorityGoalNote: priorityGoalNote.trim(),
      clientNotes,
      clientNotesUpdatedAtIso:
        clientNotes !== (prev.clientNotes ?? '') ? nowIso : prev.clientNotesUpdatedAtIso || nowIso,
      lastContactIso: nowIso,
    }));
    onNotify?.(
      t(
        `Saved ${nameZh.trim() || activeLead.fullNameEn}'s profile, notes & recalculated 6-dimension gaps.`,
        conv(`已儲存「${nameZh.trim() || activeLead.fullNameZh}」設定與會面筆記，並即時重算六大保障缺口。`)
      )
    );
  };

  const handleResetDraftToLead = () => {
    const restored = resetLeadToFactoryDefault(activeLead, initialPresets);
    isEditingClientNotesRef.current = false;
    onUpdateLead(activeLead.id, () => restored);
    setNameZh(restored.fullNameZh);
    setAge(String(restored.age));
    setBudgetHkd(String(restored.annualBudgetHkd ?? 48000));
    setFamilyStage(restored.familyStage || 'CHILDCARE_NUCLEAR');
    setOccupationRisk(restored.occupationRiskClass || 'CLASS_1_OFFICE');
    setResidency(restored.residency);
    setIsSmoker(restored.isSmoker);
    setTargetSchemeId(restored.targetSchemeId || 'FAMILY_COMPREHENSIVE');
    setExistingSummaryNote(restored.existingSummaryNote || '');
    setPriorityGoalNote(restored.priorityGoalNote || '');
    setClientNotes(restored.clientNotes ?? '');
    onNotify?.(
      t(
        `Restored "${restored.fullNameEn}" back to factory preset defaults.`,
        conv(`已將「${restored.fullNameZh}」還原至系統預設資料及預算（HK$ ${(restored.annualBudgetHkd ?? 48000).toLocaleString()}）。`)
      )
    );
  };

  const handleCreateQuickClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameZh.trim()) return;
    const parsedAge = Math.max(18, Math.min(80, Number(newAge) || 35));
    const parsedBudget = Math.max(6000, Number(newBudget) || 45000);
    const scheme = getSchemeMeta(newScheme);

    const created: ClientLead = {
      id: `lead-${Date.now().toString(36)}`,
      fullNameZh: newNameZh.trim(),
      fullNameEn: newNameEn.trim() || newNameZh.trim(),
      age: parsedAge,
      plannedRetirementAge: 65,
      isSmoker: false,
      residency: newResidency,
      whatsappPhone: '+852 9000 0000',
      email: 'client@hk-insurehub.hk',
      stage: LeadStage.NEW,
      roleTagZh: newRoleTag.trim() || '新客戶',
      roleTagEn: 'Prospect Client',
      annualBudgetHkd: parsedBudget,
      familyStage: newResidency === 'MCV' ? 'HNW_CROSSBORDER' : 'CHILDCARE_NUCLEAR',
      occupationRiskClass: 'CLASS_1_OFFICE',
      targetSchemeId: newScheme,
      existingSummaryNote: '待盤點現有保單明細，建議優先補足私家半私家房及多重危疾現金池',
      priorityGoalNote: scheme.lockedSummaryZh,
      clientNotes: newClientNotes.trim(),
      clientNotesUpdatedAtIso: newClientNotes.trim() ? new Date().toISOString() : undefined,
      existingPolicies: [],
      notes: `${newRoleTag.trim()} · ${scheme.titleZh}`,
      fnaRecord: {
        monthlyIncomeHkd: Math.round((parsedBudget * 12) / 0.85),
        monthlyExpensesHkd: Math.round((parsedBudget * 6) / 0.85),
        liquidAssetsHkd: 800000,
        dependentsCount: 1,
        riskTolerance: 'BALANCED',
        primaryObjectives: ['Medical Protection', 'Critical Illness'],
        postRetirementSourceNote: 'MPF & personal investment portfolio',
        signedAtIso: new Date().toISOString(),
      },
      kycCheck: {
        hkidVerified: newResidency === 'HK_RESIDENT',
        hkidDocNumber: newResidency === 'HK_RESIDENT' ? 'PENDING-HKID' : 'EEP-PENDING',
        mcvEntrySlipVerified: false,
      },
      lastContactIso: new Date().toISOString(),
    };
    onAddLead(created);
    setShowAddClientModal(false);
    setNewNameZh('');
    setNewNameEn('');
    setNewClientNotes('');
    onNotify?.(
      t(
        `Created saved client profile: ${created.fullNameZh}`,
        conv(`已新增建檔客戶「${created.fullNameZh}」並切換為當前互動服務檔案。`)
      )
    );
  };

  return (
    <div className="space-y-5">
      {/* Compact Saved Clients Selector + Top Actions Bar */}
      <section
        aria-label="Saved clients selector"
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
            {t(`Saved Clients (${leads.length}):`, conv(`已建檔客戶 (${leads.length})：`))}
          </span>
          {leads.map((lead) => {
            const isSelected = lead.id === activeLead.id;
            const roleLabel =
              lang === 'en'
                ? lead.roleTagEn || (lead.residency === 'MCV' ? 'MCV' : 'HK')
                : conv(lead.roleTagZh || (lead.residency === 'MCV' ? '大灣區' : '港人'));
            return (
              <button
                key={lead.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  onSelectLeadId(lead.id);
                  onNotify?.(
                    t(
                      `Switched active client to ${lead.fullNameEn} (${lead.age}y).`,
                      conv(`已切換服務客戶：${lead.fullNameZh}（${lead.age} 歲）`)
                    )
                  );
                }}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-xs transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 font-semibold text-white'
                    : 'border-slate-200 bg-slate-50 font-medium text-slate-700 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <span>{lead.fullNameZh}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    isSelected ? 'text-teal-300' : 'text-slate-500'
                  }`}
                >
                  {lead.age}
                  {t('y', '歲')} · {roleLabel}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenClientEditor}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
          >
            <UserCog className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
            <span>{t('1B. CRM & KYC Table', conv('1B. 客戶管線與合規列表'))}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddClientModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('+ Add Client', conv('+ 新增客戶'))}</span>
          </button>
        </div>
      </section>

      {/* Quick Launch Strip for Matched Client 1–6 Power Tools (collapsed by default so Step 01 stays focused) */}
      {onOpenPowerPackTool && showAdvancedStage1Tools && (
        <section
          aria-label="Quick launch 6 core advisor tools for active client"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs"
        >
          <span className="font-bold text-slate-700">
            {t(
              `Instant Client Match (${activeLead.fullNameEn}):`,
              conv(`「${activeLead.fullNameZh}」一鍵配對見客神器：`)
            )}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'PRE_UW', zh: '1. 預先核保速查', en: '1. Pre-UW' },
                { id: 'BACKDATE_RADAR', zh: '2. 轉保齡／Backdate 慳費', en: '2. Backdate Radar' },
                { id: 'DEDUCTIBLE_RELAY', zh: '3. 團保＋VHIS 墊底費接力', en: '3. Group + VHIS Relay' },
                { id: 'POLICY_SPLIT', zh: '4. 保單分拆傳承', en: '4. Policy Split' },
                { id: 'CLAIMS_CHECKLIST', zh: '5. 理賠 Checklist', en: '5. Claims Checklist' },
                { id: 'PAYMENT_PERKS', zh: '6. 多幣種＋交費優惠', en: '6. Payment Perks' },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => onOpenPowerPackTool(btn.id)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 hover:border-teal-600 hover:bg-teal-50/50 hover:text-teal-900 whitespace-nowrap"
              >
                {t(btn.en, conv(btn.zh))}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ABOVE-THE-FOLD 12-COLUMN MASTER SPLIT (PC & iPad Parity): Left = Client & Scheme Controls | Right = Live 6-Axis Radar */}
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12">
        {/* LEFT COLUMN (6 cols): Client Demographics, 4 Target Schemes & Progressive Drawers */}
        <div className="space-y-4 md:col-span-6">
          <form
            onSubmit={handleSaveClientSettings}
            className="rounded-xl border border-slate-200 bg-white p-5 space-y-5"
          >
            {/* Header + Residency / Smoker Toggles */}
            <div className="flex flex-col gap-2.5 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  {t(
                    '01. Client Profile & Target Protection Architecture',
                    conv('01. 客戶核心資料與目標保障架構')
                  )}
                </h1>
                <p className="mt-0.5 text-xs text-slate-600">
                  {t('Locked Scheme:', conv('目前鎖定：'))}{' '}
                  <span className="font-semibold text-teal-800">
                    {lang === 'en'
                      ? activeSchemeMeta.lockedSummaryEn
                      : conv(activeSchemeMeta.lockedSummaryZh)}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const nextRes = residency === 'HK_RESIDENT' ? 'MCV' : 'HK_RESIDENT';
                    setResidency(nextRes);
                    commitLeadPatch({ residency: nextRes });
                    onNotify?.(
                      nextRes === 'MCV'
                        ? t('Switched residency to MCV (Greater Bay).', conv('已切換身份為：內地訪客 (MCV)'))
                        : t('Switched residency to HK Resident.', conv('已切換身份為：香港居民'))
                    );
                  }}
                  className={`rounded-lg border px-2.5 py-1.5 font-semibold whitespace-nowrap ${
                    residency === 'MCV'
                      ? 'border-amber-300 bg-amber-50 text-amber-950'
                      : 'border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {residency === 'MCV'
                    ? t('MCV Visitor', conv('內地訪客 MCV'))
                    : t('HK Resident', conv('香港居民'))}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextSmoker = !isSmoker;
                    setIsSmoker(nextSmoker);
                    commitLeadPatch({ isSmoker: nextSmoker });
                    onNotify?.(
                      nextSmoker
                        ? t('Updated status: Smoker rates applied.', conv('已切換為：吸煙費率'))
                        : t('Updated status: Non-Smoker rates applied.', conv('已切換為：非吸煙標準費率'))
                    );
                  }}
                  className={`rounded-lg border px-2.5 py-1.5 font-semibold whitespace-nowrap ${
                    isSmoker
                      ? 'border-rose-300 bg-rose-50 text-rose-900'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  }`}
                >
                  {isSmoker ? t('Smoker', conv('吸煙')) : t('Non-Smoker', conv('非吸煙'))}
                </button>
              </div>
            </div>

            {/* Core 3 Essential Inputs */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="profile-name-zh" className="block text-xs font-semibold text-slate-700">
                  {t('Client Name', conv('客戶姓名 / 稱謂'))}
                </label>
                <input
                  id="profile-name-zh"
                  type="text"
                  value={nameZh}
                  onChange={(e) => setNameZh(e.target.value)}
                  onBlur={() => {
                    if (nameZh.trim()) commitLeadPatch({ fullNameZh: nameZh.trim() });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="profile-age" className="block text-xs font-semibold text-slate-700">
                  {t('Issue Age (18–80)', conv('投保年齡 (18–80)'))}
                </label>
                <input
                  id="profile-age"
                  type="number"
                  min={18}
                  max={80}
                  value={age}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAge(val);
                    const n = Number(val);
                    if (n >= 18 && n <= 80) commitLeadPatch({ age: n });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-semibold text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-1">
                  <label htmlFor="profile-budget-hkd" className="block text-xs font-semibold text-slate-700">
                    {t('Budget (HK$)', conv('年預算 (HK$)'))}
                  </label>
                  <span className="font-mono text-[11px] font-semibold text-teal-700 tabular-nums">
                    ≈ ¥{budgetRmb.toLocaleString()}
                  </span>
                </div>
                <input
                  id="profile-budget-hkd"
                  type="number"
                  min={6000}
                  step={1}
                  value={budgetHkd}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBudgetHkd(val);
                    const n = Number(val);
                    if (n >= 6000) commitLeadPatch({ annualBudgetHkd: n });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-semibold text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            {/* 2x2 Target Protection Scheme Selector Cards (Explained Dynamic Actuarial Benchmarks + Matched Plans) */}
            <div className="space-y-2.5" data-testid="stage1-scheme-benchmarks">
              <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <h2 className="text-xs font-bold text-slate-900">
                    {t(
                      'Select Target Protection Architecture (Syncs Radar & All 6 Stages)',
                      conv('選擇目標保障架構（點擊即時連動右側雷達與全流程）')
                    )}
                  </h2>
                  <span className="rounded bg-[#0B172A] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#F3D37A] tabular-nums">
                    {t(
                      `Live Rate Basis: Age ${draftLeadPreview.age} · ${isSmoker ? 'Smoker' : 'Non-Smoker'}`,
                      conv(`精算基準：${draftLeadPreview.age} 歲 · ${isSmoker ? '吸煙' : '非吸煙'}`)
                    )}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  {t(
                    `What these HK$ / RMB figures mean: Estimated annual market benchmark premiums calibrated for Age ${draftLeadPreview.age} (${isSmoker ? 'Smoker' : 'Non-Smoker'}). Click a representative insurer plan tag inside any card to lock that exact plan across Stages 01–05.`,
                    conv(
                      `金額涵義說明：下方 HK$／¥ 金額為按當前客戶「${draftLeadPreview.age} 歲 · ${isSmoker ? '吸煙' : '非吸煙'}」即時估算之香港市場代表計劃年繳參考費（改動年齡或吸煙狀態即動態重算）；可直接點選卡內代表保司計劃一鍵配對。`
                    )
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {dynamicSchemeBenchmarks.map((bench) => {
                  const { scheme } = bench;
                  const selected = targetSchemeId === scheme.id;
                  return (
                    <div
                      key={scheme.id}
                      data-testid={`scheme-card-${scheme.id}`}
                      className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors ${
                        selected
                          ? 'border-[#0B172A] bg-[#0B172A]/[0.03] ring-1 ring-[#D4AF37]/60'
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => handleSelectSchemeCard(scheme.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {t(scheme.titleEn, conv(scheme.titleZh))}
                          </span>
                          {selected && (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                          )}
                        </div>
                        <div className="mt-1 font-mono text-sm font-bold text-teal-800 tabular-nums">
                          HK$ {bench.estimatedAnnualHkd.toLocaleString()}
                          <span className="text-[11px] font-semibold text-slate-600">
                            /{t('yr', '年')}
                          </span>{' '}
                          <span className="text-[11px] font-medium text-slate-500">
                            (≈ ¥ {bench.estimatedAnnualRmb.toLocaleString()} · {t('Mo', conv('月均'))} HK${' '}
                            {bench.monthlyEquivalentHkd.toLocaleString()})
                          </span>
                        </div>
                        <div className="mt-1 rounded bg-teal-50/80 px-2 py-0.5 text-[10px] font-semibold text-teal-900">
                          {lang === 'en' ? bench.actuarialBasisEn : conv(bench.actuarialBasisZh)}
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-600">
                          {t(scheme.descriptionEn, conv(scheme.descriptionZh))}
                        </p>
                      </button>

                      {bench.matchedRepresentativePlans.length > 0 && (
                        <div className="mt-2.5 border-t border-slate-200/80 pt-2">
                          <div className="text-[10px] font-semibold text-slate-500">
                            {t('Match Representative Plan:', conv('點選配對代表計劃：'))}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {bench.matchedRepresentativePlans.slice(0, 2).map((repPlan) => {
                              const isLockedPlan =
                                selectedPlanId === repPlan.id ||
                                unifiedDeal?.anchorPlan?.id === repPlan.id;
                              return (
                                <button
                                  key={repPlan.id}
                                  type="button"
                                  onClick={() => {
                                    if (targetSchemeId !== scheme.id) {
                                      handleSelectSchemeCard(scheme.id);
                                    }
                                    onSelectPlanId?.(repPlan.id);
                                    onNotify?.(
                                      t(
                                        `Matched [${repPlan.insurerCode}] ${repPlan.nameEn} to ${activeLead.fullNameEn}'s case.`,
                                        conv(
                                          `已為客戶配對代表計劃：[${repPlan.insurerCode}] ${repPlan.nameZh}（全流程同步）`
                                        )
                                      )
                                    );
                                  }}
                                  className={`max-w-full truncate rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors ${
                                    isLockedPlan
                                      ? 'border-[#D4AF37] bg-[#0B172A] text-[#F3D37A]'
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-teal-600 hover:text-teal-900'
                                  }`}
                                >
                                  [{repPlan.insurerCode}]{' '}
                                  {lang === 'en' ? repPlan.nameEn : conv(repPlan.nameZh)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Collapsible Consultant Client Notes Drawer (Clean by default) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60">
              <button
                type="button"
                data-testid="toggle-client-notes-drawer-btn"
                aria-expanded={showNotesSection}
                onClick={() => setShowNotesSection((prev) => !prev)}
                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-100/70 rounded-xl"
              >
                <span className="inline-flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#0B172A] shrink-0" aria-hidden="true" />
                  <span>
                    {t(
                      `Optional: Client Meeting Notes & Follow-Up Tasks (${(activeLead.followUpTasks || []).filter((tk) => !tk.completed).length} pending)`,
                      conv(
                        `選填：展開顧問會面跟進筆記與待辦（${(activeLead.followUpTasks || []).filter((tk) => !tk.completed).length} 項待辦）`
                      )
                    )}
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-500 transition-transform ${showNotesSection ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {showNotesSection && (
              <div
                data-testid="consultant-client-notes-card"
                className="border-t border-slate-200 bg-white p-4 space-y-3 rounded-b-xl"
              >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <label
                    htmlFor="client-meeting-notes-textarea"
                    className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-900 cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-[#0B172A] shrink-0" aria-hidden="true" />
                    <span>
                      {t(
                        'Client Notes (Consultant Meeting Log)',
                        conv('顧問會面跟進筆記 (Client Notes)')
                      )}
                    </span>
                    <span className="rounded bg-[#0B172A] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#F3D37A]">
                      {activeLead.fullNameZh}
                    </span>
                  </label>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    {t(
                      'Dedicated private meeting log per client — auto-saved to workspace and searchable via Cmd+K.',
                      conv('每位客戶獨立保存之會面紀錄、核保待補文件與跟進事項（支援失焦自動存檔及 Cmd+K 全域關鍵字搜尋）。')
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    data-testid="client-notes-sync-badge"
                    className={`font-mono text-[10px] font-semibold tabular-nums whitespace-nowrap ${
                      hasUnsavedClientNotes ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {hasUnsavedClientNotes
                      ? t('Unsaved edits', conv('尚有未儲存變更'))
                      : `${t('Saved', conv('已儲存'))} · ${formatNotesSavedStamp(
                          activeLead.clientNotesUpdatedAtIso
                        )}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHideConsultantNotes((prev) => !prev)}
                    aria-pressed={hideConsultantNotes}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    {hideConsultantNotes ? (
                      <>
                        <Eye className="h-3 w-3 text-teal-700" aria-hidden="true" />
                        <span>{t('Show Notes', conv('顯示筆記'))}</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3 text-slate-500" aria-hidden="true" />
                        <span>{t('Hide on Screen', conv('見客隱藏'))}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {hideConsultantNotes ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                  {t(
                    'Consultant meeting notes are temporarily hidden for client-facing screen sharing. Click "Show Notes" to view or edit.',
                    conv('已暫時隱藏顧問內部會面筆記（方便與客戶同屏展示）；點擊右上角「顯示筆記」即可檢視或編輯。')
                  )}
                </div>
              ) : (
                <>
                  {/* Quick Consultant Meeting Note Templates */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                      {t('Quick Insert:', conv('快速插入紀錄：'))}
                    </span>
                    {[
                      {
                        zh: '待補核保文件：近半年驗身／超聲波報告副本',
                        en: 'Pending UW docs: Recent blood test / ultrasound report copy',
                        chipZh: '+ 待補驗身報告',
                        chipEn: '+ Pending Medical Docs',
                      },
                      {
                        zh: '下次會面：安排配偶同席覆核家庭保費預算與受益人比例',
                        en: 'Next meeting: Review annual budget & beneficiary split with spouse',
                        chipZh: '+ 配偶同席覆核',
                        chipEn: '+ Spouse Joint Review',
                      },
                      {
                        zh: '客戶查詢：確認養和／港怡半私家房免找數預批申請流程',
                        en: 'Client Q&A: Confirmed HKSH / Gleneagles cashless LOG turnaround',
                        chipZh: '+ 私院免找數備忘',
                        chipEn: '+ Cashless LOG Note',
                      },
                      {
                        zh: '促單跟進：提醒本季首年保費回贈及預繳鎖息截止日期',
                        en: 'Closing follow-up: Remind Q4 first-year rebate & prepaid interest deadline',
                        chipZh: '+ 回贈截止提醒',
                        chipEn: '+ Promo Deadline',
                      },
                    ].map((tpl) => (
                      <button
                        key={tpl.chipEn}
                        type="button"
                        onClick={() => handleAppendMeetingNoteTemplate(tpl.zh, tpl.en)}
                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:border-teal-600 hover:text-teal-900 whitespace-nowrap"
                      >
                        {t(tpl.chipEn, conv(tpl.chipZh))}
                      </button>
                    ))}
                  </div>

                  <textarea
                    id="client-meeting-notes-textarea"
                    data-testid="client-notes-textarea"
                    rows={4}
                    value={clientNotes}
                    onFocus={() => {
                      isEditingClientNotesRef.current = true;
                    }}
                    onChange={(e) => {
                      isEditingClientNotesRef.current = true;
                      setClientNotes(e.target.value);
                    }}
                    onBlur={(e) => {
                      const nextVal = e.currentTarget.value;
                      isEditingClientNotesRef.current = false;
                      if (nextVal !== persistedClientNotes) {
                        handleSaveClientNotes(nextVal, true);
                      }
                    }}
                    placeholder={t(
                      'Record client meeting takeaways, medical disclosure reminders, bank eDDA readiness, or follow-up dates...',
                      conv('記錄客戶面談重點、健康申報／舊病歷備忘、開戶或 eDDA 進度、下次簽單跟進日期...')
                    )}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed text-slate-900 focus:border-[#0B172A] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                      {clientNotes.length} {t('chars', conv('字'))}
                    </span>
                    <div className="flex items-center gap-2">
                      {clientNotes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSaveClientNotes('', false)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 whitespace-nowrap"
                        >
                          {t('Clear Notes', conv('清空筆記'))}
                        </button>
                      )}
                      <button
                        type="button"
                        data-testid="toggle-voice-transcript-btn"
                        onClick={() => setShowVoiceDrawer((prev) => !prev)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                      >
                        <Mic className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                        <span>{t('Voice / Transcript AI', conv('語音／逐字稿整理'))}</span>
                      </button>
                      <button
                        type="button"
                        data-testid="save-client-notes-btn"
                        onClick={() => handleSaveClientNotes(clientNotes, false)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/70 bg-[#0B172A] px-3 py-1.5 text-xs font-semibold text-[#F3D37A] hover:bg-slate-900 whitespace-nowrap shrink-0"
                      >
                        <Save className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t('Save Client Notes', conv('儲存客戶筆記'))}</span>
                      </button>
                    </div>
                  </div>

                  {/* #8 Voice / Meeting Transcript to Structured Notes Drawer */}
                  {showVoiceDrawer && (
                    <div
                      data-testid="voice-transcript-drawer"
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-slate-800">
                          {t(
                            'Dictate or paste Cantonese/English meeting transcript to extract FNA notes & follow-up task:',
                            conv('口述或貼上粵／普／英會面錄音逐字稿，自動提取預算、關注點與待辦任務：')
                          )}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleStartBrowserDictation}
                            className="rounded border border-slate-300 bg-white px-2 py-0.5 font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                          >
                            {isListeningVoice
                              ? t('Listening...', conv('錄音辨識中...'))
                              : t('Mic / Sample', conv('語音輸入／載入範例'))}
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        aria-label="Meeting transcript input"
                        value={voiceTranscript}
                        onChange={(e) => setVoiceTranscript(e.target.value)}
                        placeholder={t(
                          'e.g. Client wants HKSH semi-private full cover, annual budget ~HK$52,000, will send ultrasound report next Tuesday...',
                          conv('例如：今日同客戶傾過，年度預算約 5.2 萬，最關心養和半私家房全數賠償，下週補交超聲波報告...')
                        )}
                        className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          data-testid="run-structure-transcript-btn"
                          disabled={structuringNotes}
                          onClick={handleStructureTranscriptToNotes}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                        >
                          {structuringNotes
                            ? t('Structuring...', conv('AI 整理中...'))
                            : t('Extract Notes & Task', conv('一鍵轉為結構化筆記＋待辦'))}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* #7 Actionable Client Follow-Up Tasks & Due Dates */}
                  <div
                    data-testid="client-followup-tasks-section"
                    className="border-t border-slate-200/80 pt-3 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                      <span>
                        {t(
                          `Actionable Follow-Up Checklist (${(activeLead.followUpTasks || []).filter((tk) => !tk.completed).length} Pending)`,
                          conv(
                            `客戶跟進待辦事項與到期日（${
                              (activeLead.followUpTasks || []).filter((tk) => !tk.completed).length
                            } 項未完成）`
                          )
                        )}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {(activeLead.followUpTasks || []).map((tk) => (
                        <div
                          key={tk.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                        >
                          <label className="flex items-center gap-2 min-w-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tk.completed}
                              onChange={() => handleToggleFollowUpTask(tk.id)}
                              className="rounded border-slate-300"
                            />
                            <span
                              className={`truncate ${
                                tk.completed ? 'line-through text-slate-400' : 'text-slate-800'
                              }`}
                            >
                              {conv(tk.title)}
                            </span>
                          </label>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                              {tk.dueDateIso}
                            </span>
                            <button
                              type="button"
                              aria-label={`Delete task ${tk.title}`}
                              onClick={() => handleDeleteFollowUpTask(tk.id)}
                              className="rounded p-0.5 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <input
                        type="text"
                        aria-label="New follow-up task title"
                        data-testid="new-followup-task-input"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder={t('Add follow-up action item...', conv('新增跟進事項（如：收齊驗身報告）...'))}
                        className="min-w-[180px] flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                      />
                      <input
                        type="date"
                        aria-label="Follow-up due date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-800 tabular-nums"
                      />
                      <button
                        type="button"
                        data-testid="add-followup-task-btn"
                        onClick={handleAddFollowUpTask}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t('Add Task', conv('新增待辦'))}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
              )}
            </div>

            {/* Progressive Drawer 1: Family Stage, Occupation & Advisor Notes */}
            <details className="group rounded-xl border border-slate-200 bg-slate-50/60">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-800 select-none">
                <span>
                  {t(
                    'Detailed Family Stage, Occupation Class & Meeting Notes',
                    conv('展開詳細家庭階段、職業風險等級與會面優先備註')
                  )}
                </span>
                <ChevronDown
                  className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="space-y-3 border-t border-slate-200 bg-white p-4 rounded-b-xl">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="profile-family-stage" className="block text-xs font-semibold text-slate-700">
                      {t('Family & Life Stage', conv('家庭與人生階段'))}
                    </label>
                    <select
                      id="profile-family-stage"
                      value={familyStage}
                      onChange={(e) => {
                        const nextStage = e.target.value as FamilyStageCode;
                        setFamilyStage(nextStage);
                        commitLeadPatch({ familyStage: nextStage });
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-teal-600 focus:outline-none"
                    >
                      {FAMILY_STAGE_OPTIONS.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {t(opt.labelEn, conv(opt.labelZh))}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="profile-occ-risk" className="block text-xs font-semibold text-slate-700">
                      {t('Occupation Risk Class', conv('職業風險等級'))}
                    </label>
                    <select
                      id="profile-occ-risk"
                      value={occupationRisk}
                      onChange={(e) => {
                        const nextOcc = e.target.value as OccupationRiskClass;
                        setOccupationRisk(nextOcc);
                        commitLeadPatch({ occupationRiskClass: nextOcc });
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-teal-600 focus:outline-none"
                    >
                      {OCCUPATION_RISK_OPTIONS.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {t(opt.labelEn, conv(opt.labelZh))}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="profile-existing-note" className="block text-xs font-semibold text-slate-700">
                    {t(
                      'Existing Protection Summary Note (Syncs 04 Deck & Objections)',
                      conv('既有保障摘要備註（連動 04 早會簡報與異議腳本）')
                    )}
                  </label>
                  <textarea
                    id="profile-existing-note"
                    rows={2}
                    value={existingSummaryNote}
                    onChange={(e) => setExistingSummaryNote(e.target.value)}
                    onBlur={() => commitLeadPatch({ existingSummaryNote: existingSummaryNote.trim() })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="profile-priority-goal" className="block text-xs font-semibold text-slate-700">
                    {t('Top Priority Objective for This Review', conv('本次規劃最優先目標'))}
                  </label>
                  <textarea
                    id="profile-priority-goal"
                    rows={2}
                    value={priorityGoalNote}
                    onChange={(e) => setPriorityGoalNote(e.target.value)}
                    onBlur={() => commitLeadPatch({ priorityGoalNote: priorityGoalNote.trim() })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </details>

            {/* GL30 Formal Affordability Gauge Strip (#14) */}
            <div
              data-testid="profile-gl30-affordability-strip"
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${
                    affordabilityGauge.status === 'GREEN_COMFORTABLE'
                      ? 'bg-emerald-600'
                      : affordabilityGauge.status === 'AMBER_STRETCH'
                      ? 'bg-amber-500'
                      : 'bg-rose-600'
                  }`}
                />
                <span className="font-bold text-slate-900">
                  {lang === 'en'
                    ? affordabilityGauge.statusLabelEn
                    : conv(affordabilityGauge.statusLabelZh)}
                </span>
              </div>
              <span className="font-mono text-[11px] font-semibold text-slate-600 tabular-nums">
                {t('Surplus Ratio:', conv('盈餘佔比：'))} {affordabilityGauge.disposableRatioPct}% ·{' '}
                {t('Liquid Reserve:', conv('流動資金緩衝：'))} {affordabilityGauge.liquidBufferYears}x
              </span>
            </div>

            {/* Primary Action Footer — Confirm Step 01 Action to Unlock Next Step */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
              <button
                type="button"
                data-testid="reset-client-defaults-btn"
                onClick={handleResetDraftToLead}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Reset Defaults', conv('重設預設值'))}</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  data-testid="stage1-confirm-profile-btn"
                  onClick={() => onConfirmStep1?.()}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                    step1Confirmed
                      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                      : 'bg-slate-900 text-[#F3D37A] hover:bg-slate-800'
                  }`}
                >
                  {step1Confirmed ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {step1Confirmed
                      ? t('Profile Confirmed ✓', conv('已確認客戶資料 ✓'))
                      : t('Save & Confirm Client Profile', conv('儲存並確認客戶資料'))}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN (6 cols): Immediate Above-the-Fold 6-Axis Gap Radar + 6 Dimension Progress + Snapshots */}
        <div className="space-y-4 md:col-span-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <InteractiveSixAxisGapRadarSvg
              dimensions={gapAudit.rows}
              overallAchievementPct={gapAudit.overallCompletionPct}
              selectedDimensionId={polDim}
              onSelectDimension={(dimId) => setPolDim(dimId)}
              anchorPlanLabel={
                unifiedDeal?.anchorPlan
                  ? `[${unifiedDeal.anchorPlan.insurerCode}] ${
                      lang === 'en' ? unifiedDeal.anchorPlan.nameEn : conv(unifiedDeal.anchorPlan.nameZh)
                    }`
                  : undefined
              }
              attachedRidersCount={unifiedDeal?.selectedRiderIds.length || 0}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <h2 className="text-xs font-bold text-slate-900">
                {t(
                  '6-Dimension Coverage Progress (Existing vs. New Proposal)',
                  conv('六大保障範疇進度（現有保單 vs. 新方案補強）')
                )}
              </h2>
              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-xs bg-slate-700" />
                  <span>{t('Existing', conv('現有保單'))}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-xs bg-teal-600" />
                  <span>{t('New Plan + Riders', conv('新方案補強'))}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {gapAudit.rows.map((row) => (
                <div
                  key={row.dimensionId}
                  className={`rounded-xl border p-3 space-y-2 ${
                    row.isFullyCovered
                      ? 'border-slate-200 bg-emerald-50/20'
                      : 'border-amber-200 bg-amber-50/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      {t(row.labelEn, conv(row.labelZh))}
                    </span>
                    {row.isFullyCovered ? (
                      <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-bold text-emerald-700 tabular-nums whitespace-nowrap shrink-0">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>100%</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-bold text-amber-800 tabular-nums whitespace-nowrap shrink-0">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                        <span>-HK${Math.round(row.remainingGapHkd / 10000)}萬</span>
                      </span>
                    )}
                  </div>

                  <div className="flex h-2 w-full overflow-hidden rounded-sm bg-slate-200">
                    {row.existingPct > 0 && (
                      <div
                        className="h-full bg-slate-700 transition-all"
                        style={{ width: `${row.existingPct}%` }}
                      />
                    )}
                    {row.newAddedPct > 0 && (
                      <div
                        className={`h-full transition-all ${
                          row.isFullyCovered ? 'bg-teal-600' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${row.newAddedPct}%` }}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-600 tabular-nums">
                    <span>
                      {t('Goal', conv('目標'))} HK${row.recommendedTargetHkd.toLocaleString()}
                    </span>
                    <span className="font-semibold text-teal-800">
                      +HK${row.newProposedCoverHkd.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs">
              <span className="text-slate-600">
                {t(
                  `Logged ${(activeLead.existingPolicies || []).length} existing policies · ${(activeLead.householdMembers || []).length + 1} family member(s)`,
                  conv(
                    `已整合 ${(activeLead.existingPolicies || []).length} 份舊保單 · 全家共 ${(activeLead.householdMembers || []).length + 1} 位受保成員`
                  )
                )}
              </span>
              <button
                type="button"
                data-testid="toggle-stage1-advanced-panels-btn"
                onClick={() => setShowAdvancedStage1Tools((prev) => !prev)}
                className="font-semibold text-teal-800 hover:text-teal-950 hover:underline whitespace-nowrap"
              >
                {showAdvancedStage1Tools
                  ? t('Hide Optional Tools ↑', conv('收起進階舊單／全家扣稅工具 ↑'))
                  : t(
                      'Optional: Old Policy Diff, Family Tax & 6 Power Tools ↓',
                      conv('展開選用工具：舊單對比、全家扣稅與 6 大見客神器 ↓')
                    )}
              </button>
            </div>
          </div>

          {/* 01C: Saved Stage 06 Pro-Calculator Snapshots */}
          {(activeLead.savedSnapshots || []).length > 0 && (
            <section
              data-testid="saved-tool-snapshots-panel"
              aria-label="Saved specialist actuarial snapshots"
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h2 className="text-xs font-bold text-slate-900">
                  {t(
                    `01C. Saved Specialist Snapshots (${activeLead.savedSnapshots!.length})`,
                    conv(`01C. 已存檔專項精算分析快照（${activeLead.savedSnapshots!.length} 項）`)
                  )}
                </h2>
                <span className="font-mono text-[11px] font-semibold text-teal-700">
                  {activeLead.fullNameZh}
                </span>
              </div>
              <div className="space-y-2">
                {activeLead.savedSnapshots!.map((snap) => (
                  <div
                    key={snap.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-teal-800">{snap.toolCode}</span>
                        <span className="font-bold text-slate-900">
                          {lang === 'en' ? snap.toolTitleEn : conv(snap.toolTitleZh)}
                        </span>
                      </div>
                      <div className="font-mono text-xs font-semibold text-blue-700 tabular-nums">
                        {snap.headlineMetric}
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600">{snap.advisorNote}</p>
                    </div>
                    {onDeleteSnapshot && (
                      <button
                        type="button"
                        onClick={() => onDeleteSnapshot(snap.id)}
                        aria-label={`Delete snapshot ${snap.toolCode}`}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Action-Gated Step 01 Footer: Next Step button ONLY appears after client profile is confirmed */}
      {stepGate && onGoNextStage && (
        <GuidedStepFooter
          gate={stepGate}
          onGoNext={onGoNextStage}
          showPrimaryAction={!step1Confirmed}
          primaryActionLabelZh="確認客戶資料並解鎖下一步"
          primaryActionLabelEn="Confirm Client Profile & Unlock Next"
          onPrimaryAction={() => onConfirmStep1?.()}
          testIdPrefix="stage1-guided"
        />
      )}

      {/* Optional Advanced Tools (Collapsed by default so Step 01 is never overwhelming) */}
      {showAdvancedStage1Tools && (
        <div className="space-y-6">
          {/* Suggestion #2: Legacy Policy Photo-to-Diff Traffic-Light Comparator */}
          <LegacyPolicyDiffPanel
            lead={activeLead}
            activePlan={unifiedDeal?.anchorPlan || null}
            onImportPolicyToRadar={(auditItem) => {
              onUpdateLead(activeLead.id, (prev) => ({
                ...prev,
                existingPolicies: [auditItem, ...(prev.existingPolicies || [])],
              }));
            }}
            onNotify={onNotify}
          />

          {/* Family Policy View + 1-Page Existing Policy Summary Sheet + .ics Follow-Up Reminders */}
          <FamilyAndPolicySummarySuite
            lead={activeLead}
            intermediary={intermediary || Object.values(INTERMEDIARY_PROFILES)[0]}
            selfProposalAnnualHkd={
              unifiedDeal?.bundleSim.netAnnualPremiumHkd ?? activeLead.annualBudgetHkd ?? 36000
            }
            activePlanNameZh={unifiedDeal?.anchorPlan?.nameZh}
            ocrScanningPolicy={ocrScanningPolicy}
            onUploadPolicyFile={handlePolicyFileChange}
            onRunSampleGroupMedOcr={() =>
              runPolicyOcrExtract({
                rawText:
                  '公司團體醫保 (Bupa Corporate Ward Plan)\n普通房外科手術賠償上限 HK$ 60,000 · 年繳保費 HK$ 0',
              })
            }
            onUpdateLead={onUpdateLead}
            onNotify={onNotify}
          />
        </div>
      )}

      {/* Quick Add Saved Client Modal */}
      {showAddClientModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add new saved client profile"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {t('Add New Saved Client Profile', conv('+ 新增建檔客戶資料'))}
              </h3>
              <button
                type="button"
                aria-label="Close add client modal"
                onClick={() => setShowAddClientModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickClient} className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('Chinese Name *', conv('客戶姓名（中文）*'))}
                  </label>
                  <input
                    type="text"
                    required
                    value={newNameZh}
                    onChange={(e) => setNewNameZh(e.target.value)}
                    placeholder={conv('例：張家豪')}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('English Name', conv('英文姓名'))}
                  </label>
                  <input
                    type="text"
                    value={newNameEn}
                    onChange={(e) => setNewNameEn(e.target.value)}
                    placeholder="e.g., Kelvin Cheung"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('Role Tag', conv('角色標籤'))}
                  </label>
                  <input
                    type="text"
                    value={newRoleTag}
                    onChange={(e) => setNewRoleTag(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('Age', conv('年齡'))}
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={80}
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('Budget (HK$)', conv('年預算 (HK$)'))}
                  </label>
                  <input
                    type="number"
                    min={6000}
                    step={1}
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('Residency', conv('居留身份'))}
                  </label>
                  <select
                    value={newResidency}
                    onChange={(e) => setNewResidency(e.target.value as ResidencyType)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                  >
                    <option value="HK_RESIDENT">{t('HK Resident', conv('香港居民'))}</option>
                    <option value="MCV">{t('Mainland Visitor (MCV)', conv('內地訪客 (MCV)'))}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('Target Architecture', conv('目標保障架構'))}
                  </label>
                  <select
                    value={newScheme}
                    onChange={(e) => setNewScheme(e.target.value as TargetProtectionSchemeId)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                  >
                    {TARGET_PROTECTION_SCHEMES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {t(s.titleEn, conv(s.titleZh))}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="new-client-initial-notes" className="block text-xs font-semibold text-slate-700">
                  {t('Initial Client Notes (Optional)', conv('初次會面筆記（選填）'))}
                </label>
                <textarea
                  id="new-client-initial-notes"
                  rows={2}
                  value={newClientNotes}
                  onChange={(e) => setNewClientNotes(e.target.value)}
                  placeholder={conv('例：轉介自現有客戶，關注半私家房 VHIS 及子女教育儲蓄...')}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t('Cancel', conv('取消'))}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  {t('Create & Activate Client', conv('建立並設為當前客戶'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
