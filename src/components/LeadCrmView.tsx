import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  Camera,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  FileCheck,
  MessageSquare,
  ScanLine,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { copyTextSafe } from '../utils/clipboardAndDom';
import {
  ClientLead,
  FamilyStageCode,
  FnaRecord,
  IdentityScanResult,
  InForcePolicyRecord,
  LeadStage,
  OccupationRiskClass,
  PolicyApplicationRecord,
  ResidencyType,
  RiskTolerance,
  TargetProtectionSchemeId,
} from '../domain/types';
import {
  FAMILY_STAGE_OPTIONS,
  OCCUPATION_RISK_OPTIONS,
  TARGET_PROTECTION_SCHEMES,
} from '../domain/clientGapEngine';
import {
  computeLeadStageSummary,
  StageAccentTone,
} from '../domain/crmAndCatalogTaxonomy';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  collectLeadPolicyIds,
  CrmLeadSortOption,
  filterCrmLeadsByQuery,
  formatCrmLastContactLabel,
  INITIAL_IN_FORCE_POLICIES,
  sortCrmLeads,
} from '../domain/lifecycleAndComplianceEngine';
import {
  ClientMicrositeRecord,
  createWhatsAppComplianceLog,
  TwentyUpgradeCode,
  WhatsAppComplianceLogEntry,
} from '../domain/twentyUpgradesEngine';
import { RNCameraScannerModal } from './RNCameraScannerModal';

interface LeadCrmViewProps {
  leads: ClientLead[];
  selectedLeadId?: string;
  onSelectLeadId?: (leadId: string) => void;
  onAddLead: (lead: ClientLead) => void;
  onUpdateLead: (leadId: string, updater: (prev: ClientLead) => ClientLead) => void;
  onDeleteLead?: (leadId: string) => void;
  onLaunchStpForLead: (leadId: string) => void;
  initialOpenModal?: { type: 'fna' | 'ocr'; leadId: string } | null;
  onClearInitialModal?: () => void;
  intermediaryLicenseNo?: string;
  onOpenLiveUpgrade?: (code: TwentyUpgradeCode) => void;
  onAppendWhatsappAuditLog?: (entry: WhatsAppComplianceLogEntry) => void;
  microsites?: ClientMicrositeRecord[];
  applications?: PolicyApplicationRecord[];
  inForcePolicies?: InForcePolicyRecord[];
}

const STAGE_LABELS: Record<LeadStage, string> = {
  [LeadStage.NEW]: 'New Lead 新潛在客戶',
  [LeadStage.FNA_COMPLETED]: 'FNA Signed 已完成財務分析',
  [LeadStage.PROPOSAL_SENT]: 'Proposal Sent 已發送建議書',
  [LeadStage.UNDERWRITING]: 'Underwriting 核保審批中',
  [LeadStage.IN_FORCE]: 'In-Force 保單已生效',
};

const STAGE_FILTER_SHORT_LABELS: Record<LeadStage, string> = {
  [LeadStage.NEW]: 'New Lead',
  [LeadStage.FNA_COMPLETED]: 'FNA Signed',
  [LeadStage.PROPOSAL_SENT]: 'Proposal Sent',
  [LeadStage.UNDERWRITING]: 'Underwriting',
  [LeadStage.IN_FORCE]: 'In-Force',
};

const OBJECTIVE_OPTIONS = [
  'Critical Illness',
  'Medical Protection',
  'Wealth Accumulation',
  'Tax Deduction (VHIS/QDAP)',
  'Children Education',
  'Estate Legacy',
];

export const LeadCrmView: React.FC<LeadCrmViewProps> = ({
  leads,
  selectedLeadId,
  onSelectLeadId,
  onAddLead,
  onUpdateLead,
  onDeleteLead,
  onLaunchStpForLead,
  initialOpenModal,
  onClearInitialModal,
  intermediaryLicenseNo = 'FB1928',
  onOpenLiveUpgrade,
  onAppendWhatsappAuditLog,
  microsites = [],
  applications = [],
  inForcePolicies = INITIAL_IN_FORCE_POLICIES,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);
  const [stageFilter, setStageFilter] = useState<'ALL' | LeadStage>('ALL');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<CrmLeadSortOption>('LAST_CONTACT_DESC');

  // Edit Saved Client Modal State
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    fullNameZh: string;
    fullNameEn: string;
    roleTagZh: string;
    age: string;
    annualBudgetHkd: string;
    familyStage: FamilyStageCode;
    occupationRiskClass: OccupationRiskClass;
    targetSchemeId: TargetProtectionSchemeId;
    residency: ResidencyType;
    isSmoker: boolean;
    whatsappPhone: string;
    email: string;
    stage: LeadStage;
    existingSummaryNote: string;
    priorityGoalNote: string;
  } | null>(null);
  const [confirmDeleteLeadId, setConfirmDeleteLeadId] = useState<string | null>(null);

  // Add Lead Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNameEn, setNewNameEn] = useState('');
  const [newNameZh, setNewNameZh] = useState('');
  const [newAge, setNewAge] = useState('36');
  const [newRetireAge, setNewRetireAge] = useState('65');
  const [newResidency, setNewResidency] = useState<ResidencyType>('HK_RESIDENT');
  const [newSmoker, setNewSmoker] = useState(false);
  const [newDocNo, setNewDocNo] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [scannedDraftMeta, setScannedDraftMeta] = useState<IdentityScanResult | null>(null);

  // Digital GL30 FNA Modal State
  const [fnaLeadId, setFnaLeadId] = useState<string | null>(
    initialOpenModal?.type === 'fna' ? initialOpenModal.leadId : null
  );
  const [fnaIncome, setFnaIncome] = useState('75000');
  const [fnaExpenses, setFnaExpenses] = useState('32000');
  const [fnaLiquid, setFnaLiquid] = useState('1200000');
  const [fnaDependents, setFnaDependents] = useState('1');
  const [fnaRisk, setFnaRisk] = useState<RiskTolerance>('BALANCED');
  const [fnaObjectives, setFnaObjectives] = useState<string[]>([
    'Critical Illness',
    'Wealth Accumulation',
  ]);
  const [fnaPostRetireNote, setFnaPostRetireNote] = useState(
    'MPF portfolio + HKD/USD time deposit reserve'
  );
  const [fnaError, setFnaError] = useState<string | null>(null);

  // RNCamera + Google Cloud Vision Scanner Modal State
  const [scannerOpen, setScannerOpen] = useState<boolean>(
    initialOpenModal?.type === 'ocr'
  );
  const [ocrLeadId, setOcrLeadId] = useState<string | null>(
    initialOpenModal?.type === 'ocr' ? initialOpenModal.leadId : null
  );

  // WhatsApp Composer Modal State
  const [whatsappLead, setWhatsappLead] = useState<ClientLead | null>(null);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  React.useEffect(() => {
    if (initialOpenModal) {
      if (initialOpenModal.type === 'fna') {
        openFnaModalForLead(initialOpenModal.leadId);
      } else if (initialOpenModal.type === 'ocr') {
        setOcrLeadId(initialOpenModal.leadId);
        setScannerOpen(true);
      }
      onClearInitialModal?.();
    }
  }, [initialOpenModal]);

  const openFnaModalForLead = (id: string) => {
    const target = leads.find((l) => l.id === id);
    if (!target) return;
    setFnaLeadId(id);
    setFnaError(null);
    if (target.fnaRecord) {
      setFnaIncome(String(target.fnaRecord.monthlyIncomeHkd));
      setFnaExpenses(String(target.fnaRecord.monthlyExpensesHkd));
      setFnaLiquid(String(target.fnaRecord.liquidAssetsHkd));
      setFnaDependents(String(target.fnaRecord.dependentsCount));
      setFnaRisk(target.fnaRecord.riskTolerance);
      setFnaObjectives(target.fnaRecord.primaryObjectives);
      setFnaPostRetireNote(target.fnaRecord.postRetirementSourceNote);
    }
  };

  const filteredLeads = useMemo(
    () =>
      filterCrmLeadsByQuery({
        leads,
        query: searchText,
        stageFilter,
        applications,
        inForcePolicies,
      }),
    [applications, inForcePolicies, leads, searchText, stageFilter]
  );

  const sortedFilteredLeads = useMemo(
    () => sortCrmLeads(filteredLeads, sortBy),
    [filteredLeads, sortBy]
  );

  const quickPolicyFilterIds = useMemo(() => {
    const collected: string[] = [];
    for (const lead of leads) {
      const ids = collectLeadPolicyIds(lead, applications, inForcePolicies);
      for (const pid of ids) {
        if (!collected.includes(pid) && collected.length < 4) {
          collected.push(pid);
        }
      }
    }
    return collected;
  }, [applications, inForcePolicies, leads]);

  const pendingFollowUpItems = useMemo(() => {
    const items: Array<{ leadId: string; leadNameZh: string; taskId: string; title: string; dueDateIso: string }> = [];
    for (const lead of leads) {
      for (const task of lead.followUpTasks || []) {
        if (!task.completed) {
          items.push({
            leadId: lead.id,
            leadNameZh: lead.fullNameZh,
            taskId: task.id,
            title: task.title,
            dueDateIso: task.dueDateIso,
          });
        }
      }
    }
    return items.sort((a, b) => a.dueDateIso.localeCompare(b.dueDateIso)).slice(0, 4);
  }, [leads]);

  const activeFnaLead = leads.find((l) => l.id === fnaLeadId) || null;
  const activeOcrLead = leads.find((l) => l.id === ocrLeadId) || null;

  const openEditClientModal = (lead: ClientLead) => {
    setEditingLeadId(lead.id);
    setConfirmDeleteLeadId(null);
    setEditForm({
      fullNameZh: lead.fullNameZh,
      fullNameEn: lead.fullNameEn,
      roleTagZh: lead.roleTagZh || '',
      age: String(lead.age),
      annualBudgetHkd: String(lead.annualBudgetHkd ?? 48000),
      familyStage: lead.familyStage || 'CHILDCARE_NUCLEAR',
      occupationRiskClass: lead.occupationRiskClass || 'CLASS_1_OFFICE',
      targetSchemeId: lead.targetSchemeId || 'FAMILY_COMPREHENSIVE',
      residency: lead.residency,
      isSmoker: lead.isSmoker,
      whatsappPhone: lead.whatsappPhone,
      email: lead.email,
      stage: lead.stage,
      existingSummaryNote: lead.existingSummaryNote || '',
      priorityGoalNote: lead.priorityGoalNote || '',
    });
  };

  const handleSaveClientEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeadId || !editForm) return;
    const parsedAge = Math.min(80, Math.max(18, Number(editForm.age) || 35));
    const parsedBudget = Math.max(6000, Number(editForm.annualBudgetHkd) || 48000);
    onUpdateLead(editingLeadId, (prev) => ({
      ...prev,
      fullNameZh: editForm.fullNameZh.trim() || prev.fullNameZh,
      fullNameEn: editForm.fullNameEn.trim() || prev.fullNameEn,
      roleTagZh: editForm.roleTagZh.trim() || prev.roleTagZh,
      age: parsedAge,
      annualBudgetHkd: parsedBudget,
      familyStage: editForm.familyStage,
      occupationRiskClass: editForm.occupationRiskClass,
      targetSchemeId: editForm.targetSchemeId,
      residency: editForm.residency,
      isSmoker: editForm.isSmoker,
      whatsappPhone: editForm.whatsappPhone.trim() || prev.whatsappPhone,
      email: editForm.email.trim() || prev.email,
      stage: editForm.stage,
      existingSummaryNote: editForm.existingSummaryNote.trim(),
      priorityGoalNote: editForm.priorityGoalNote.trim(),
      lastContactIso: new Date().toISOString(),
    }));
    setEditingLeadId(null);
    setEditForm(null);
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameEn.trim()) {
      setAddFormError('Applicant English full name is required.');
      return;
    }
    if (!newPhone.trim()) {
      setAddFormError('WhatsApp mobile number is required for CRM dispatch.');
      return;
    }
    const parsedAge = Number(newAge);
    const parsedRetire = Number(newRetireAge);
    if (!Number.isFinite(parsedAge) || parsedAge < 18 || parsedAge > 85) {
      setAddFormError('Applicant age must be between 18 and 85.');
      return;
    }

    const resolvedDoc = newDocNo.trim() || 'Pending OCR';
    const isEntrySlipVerified =
      Boolean(scannedDraftMeta?.docType === 'MCV_ENTRY_SLIP' && scannedDraftMeta.onshoreValid);

    const created: ClientLead = {
      id: `lead-${Date.now()}`,
      fullNameEn: newNameEn.trim(),
      fullNameZh: newNameZh.trim() || newNameEn.trim(),
      hkidNumber: resolvedDoc,
      age: parsedAge,
      plannedRetirementAge: Number.isFinite(parsedRetire) ? parsedRetire : 65,
      isSmoker: newSmoker,
      residency: newResidency,
      whatsappPhone: newPhone.trim(),
      email: newEmail.trim() || 'client@hkmail.hk',
      stage: LeadStage.NEW,
      notes:
        newNotes.trim() ||
        (scannedDraftMeta
          ? `Onboarded via RNCamera + Cloud Vision ID scan (${resolvedDoc}).`
          : 'New inbound inquiry logged in HK InsureHub CRM.'),
      fnaRecord: null,
      kycCheck: {
        hkidVerified: Boolean(newDocNo.trim()),
        hkidDocNumber: resolvedDoc,
        mcvEntrySlipVerified: isEntrySlipVerified,
        mcvEntryDate: isEntrySlipVerified ? scannedDraftMeta?.entryDate : undefined,
        mcvPermittedUntil: isEntrySlipVerified ? scannedDraftMeta?.permittedUntil : undefined,
      },
      lastContactIso: new Date().toISOString(),
    };

    onAddLead(created);
    setShowAddModal(false);
    setScannedDraftMeta(null);
    setNewNameEn('');
    setNewNameZh('');
    setNewDocNo('');
    setNewPhone('');
    setNewEmail('');
    setNewNotes('');
    setAddFormError(null);
  };

  const handleSaveFna = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFnaLead) return;

    const inc = Number(fnaIncome);
    const exp = Number(fnaExpenses);
    const liq = Number(fnaLiquid);
    if (!Number.isFinite(inc) || inc <= 0) {
      setFnaError('Declared monthly income must be greater than HK$0.');
      return;
    }
    if (fnaObjectives.length === 0) {
      setFnaError('Select at least one primary insurance objective under GL30.');
      return;
    }

    const record: FnaRecord = {
      monthlyIncomeHkd: inc,
      monthlyExpensesHkd: Math.max(0, exp || 0),
      liquidAssetsHkd: Math.max(0, liq || 0),
      dependentsCount: Math.max(0, Number(fnaDependents) || 0),
      riskTolerance: fnaRisk,
      primaryObjectives: fnaObjectives,
      postRetirementSourceNote: fnaPostRetireNote.trim(),
      signedAtIso: new Date().toISOString(),
    };

    onUpdateLead(activeFnaLead.id, (prevLead) => ({
      ...prevLead,
      fnaRecord: record,
      stage:
        prevLead.stage === LeadStage.NEW ? LeadStage.FNA_COMPLETED : prevLead.stage,
      lastContactIso: new Date().toISOString(),
    }));
    setFnaLeadId(null);
  };

  const handleApplyCameraScanResult = (scan: IdentityScanResult) => {
    if (activeOcrLead) {
      // Update existing lead in Lead CRM
      const targetId = activeOcrLead.id;
      onUpdateLead(targetId, (prevLead) => {
        const updatedDoc =
          scan.hkidNumber || prevLead.hkidNumber || prevLead.kycCheck.hkidDocNumber;
        return {
          ...prevLead,
          fullNameEn: scan.fullNameEn || prevLead.fullNameEn,
          fullNameZh: scan.fullNameZh || prevLead.fullNameZh,
          hkidNumber: updatedDoc,
          age: scan.calculatedAge ?? prevLead.age,
          kycCheck: {
            hkidVerified: true,
            hkidDocNumber: updatedDoc,
            mcvEntrySlipVerified:
              scan.docType === 'MCV_ENTRY_SLIP' ? true : prevLead.kycCheck.mcvEntrySlipVerified,
            mcvEntryDate: scan.entryDate || prevLead.kycCheck.mcvEntryDate || '2026-11-11',
            mcvPermittedUntil:
              scan.permittedUntil || prevLead.kycCheck.mcvPermittedUntil || '2026-11-18',
          },
          lastContactIso: new Date().toISOString(),
        };
      });
      setScannerOpen(false);
      setOcrLeadId(null);
      return;
    }

    // Auto-populate New Lead CRM form fields (fullNameEn, fullNameZh, hkidNumber, age, residency)
    if (scan.fullNameEn) setNewNameEn(scan.fullNameEn);
    if (scan.fullNameZh) setNewNameZh(scan.fullNameZh);
    if (scan.hkidNumber) setNewDocNo(scan.hkidNumber);
    if (scan.calculatedAge !== null && scan.calculatedAge >= 18) {
      setNewAge(String(scan.calculatedAge));
    }
    setNewResidency(scan.residency);
    setScannedDraftMeta(scan);
    setAddFormError(null);
    setScannerOpen(false);
    setShowAddModal(true);
  };

  const stageSummary = useMemo(() => computeLeadStageSummary(leads), [leads]);

  const stageToneStyles: Record<
    StageAccentTone,
    {
      barBg: string;
      topBar: string;
      countText: string;
      activeCard: string;
    }
  > = {
    slate: {
      barBg: 'bg-slate-500',
      topBar: 'border-t-4 border-t-slate-500',
      countText: 'text-slate-900',
      activeCard: 'ring-2 ring-slate-700 bg-slate-50',
    },
    teal: {
      barBg: 'bg-teal-600',
      topBar: 'border-t-4 border-t-teal-600',
      countText: 'text-teal-800',
      activeCard: 'ring-2 ring-teal-700 bg-teal-50/50',
    },
    indigo: {
      barBg: 'bg-indigo-600',
      topBar: 'border-t-4 border-t-indigo-600',
      countText: 'text-indigo-800',
      activeCard: 'ring-2 ring-indigo-700 bg-indigo-50/50',
    },
    amber: {
      barBg: 'bg-amber-500',
      topBar: 'border-t-4 border-t-amber-500',
      countText: 'text-amber-800',
      activeCard: 'ring-2 ring-amber-600 bg-amber-50/50',
    },
    emerald: {
      barBg: 'bg-emerald-600',
      topBar: 'border-t-4 border-t-emerald-600',
      countText: 'text-emerald-800',
      activeCard: 'ring-2 ring-emerald-700 bg-emerald-50/50',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-300 bg-white p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] font-bold tracking-wider text-teal-700 uppercase">
            {t('CLIENT DIRECTORY & PIPELINE CRM', '建檔客戶管理與銷售管線工作台')}
          </p>
          <h1
            className="mt-1 text-2xl font-bold tracking-tight text-slate-900"
            style={{ textWrap: 'balance' }}
          >
            {t(
              'Saved Client Editor, Pipeline CRM & Digital GL30 FNA',
              '建檔客戶編輯、中港客戶管線與保監局 GL30 財務分析工作台'
            )}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {t(
              'Edit saved client profiles, target schemes & annual budgets, verify HKID/MCV Entry Slips via Vision OCR, and manage GL30 FNA sign-off',
              '集中管理及編輯所有已建檔客戶資料、年度預算、目標保障架構、GL30 財務分析及身份證／入境標籤 OCR 核實'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setOcrLeadId(null);
              setScannerOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
          >
            <Camera className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <span>Scan Physical ID / 入境標籤</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAddFormError(null);
              setScannedDraftMeta(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            <span>Add Client Lead</span>
          </button>
        </div>
      </div>

      {/* NEW: Lead Pipeline Stage Dashboard Summary Widget */}
      <section
        aria-label="Lead pipeline stage summary dashboard"
        data-testid="lead-stage-summary-widget"
        className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xs"
      >
        {/* Top Executive Funnel Header */}
        <div className="flex flex-col gap-4 bg-slate-900 px-5 py-4 text-slate-100 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-sm font-bold text-white">
                {t(
                  'Lead Pipeline Stage Summary (Prospect → Quoted → Applied → Converted)',
                  '客戶銷售管線階段總覽看板（潛在客戶 → 已簽FNA → 已報價 → 核保中 → 已生效）'
                )}
              </h2>
              {stageFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setStageFilter('ALL')}
                  className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-semibold text-teal-300 hover:bg-slate-700 whitespace-nowrap"
                >
                  {t('Reset Filter (Show All)', '清除階段篩選（顯示全部）')}
                </button>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              {t(
                'Live counts and annual HKD budget volume computed from active leads state. Click any stage card below to filter the table.',
                '實時統計各銷售階段人數佔比與年度保費預算總額；點擊下方任一階段卡片即可篩選客戶列表。'
              )}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-slate-800 pt-3 sm:gap-6 lg:border-t-0 lg:pt-0">
            <div>
              <span className="block text-[11px] text-slate-400">
                {t('Total Leads', '建檔總人數')}
              </span>
              <span
                data-testid="summary-total-leads"
                className="font-mono text-lg font-bold text-white tabular-nums"
              >
                {stageSummary.totalLeads}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-400">
                {t('GL30 FNA Ready', '已簽 GL30')}
              </span>
              <span className="font-mono text-lg font-bold text-teal-300 tabular-nums">
                {stageSummary.fnaCompletedCount}/{stageSummary.totalLeads}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-400">
                {t('Pipeline Budget', '管線年預算總額')}
              </span>
              <span className="font-mono text-lg font-bold text-amber-300 tabular-nums">
                HK${(stageSummary.totalAnnualBudgetHkd / 1000).toFixed(0)}k
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Segment Proportional Stage Bar */}
        <div className="border-b border-slate-200 bg-slate-100 px-5 py-2.5">
          <div
            aria-label="Proportional lead distribution bar"
            className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
          >
            {stageSummary.stages.map((bucket) => {
              if (bucket.count === 0) return null;
              const widthPct = (bucket.count / Math.max(1, stageSummary.totalLeads)) * 100;
              return (
                <div
                  key={bucket.stage}
                  style={{ width: `${widthPct}%` }}
                  title={`${bucket.shortLabelEn}: ${bucket.count}`}
                  className={`${stageToneStyles[bucket.accentTone].barBg} transition-all`}
                />
              );
            })}
          </div>
        </div>

        {/* 5 Interactive Stage Cards */}
        <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
          {stageSummary.stages.map((bucket) => {
            const style = stageToneStyles[bucket.accentTone];
            const isActiveStage = stageFilter === bucket.stage;

            return (
              <button
                key={bucket.stage}
                type="button"
                data-testid={`stage-card-${bucket.stage}`}
                aria-pressed={isActiveStage}
                onClick={() =>
                  setStageFilter((prev) => (prev === bucket.stage ? 'ALL' : bucket.stage))
                }
                className={`flex flex-col justify-between p-4 text-left transition-colors hover:bg-slate-50 ${
                  style.topBar
                } ${isActiveStage ? style.activeCard : 'bg-white'}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-slate-500">
                      STAGE {bucket.stepCode}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-500 tabular-nums">
                      {bucket.sharePct}%
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {t(bucket.shortLabelEn, `${bucket.shortLabelZh} (${bucket.shortLabelEn})`)}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {t(bucket.subLabelEn, bucket.subLabelZh)}
                  </p>
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-slate-100 pt-2.5">
                  <div>
                    <span
                      data-testid={`stage-count-${bucket.stage}`}
                      className={`font-mono text-2xl font-extrabold tabular-nums ${style.countText}`}
                    >
                      {bucket.count}
                    </span>
                    <span className="ml-1 text-[11px] font-medium text-slate-500">
                      {t(bucket.count === 1 ? 'lead' : 'leads', '位客戶')}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-slate-600 tabular-nums">
                    HK${bucket.totalAnnualBudgetHkd.toLocaleString()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Merged CRM Expansion Tools: Voice-to-FNA (IMP-05) · Family & Referral Tree (IMP-07) · Age-Backdate Radar (IMP-18) */}
      {onOpenLiveUpgrade && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-semibold text-slate-800">
            {t(
              'Smart CRM Accelerators (Merged from 20-Upgrade Suite):',
              '智能客戶開發加速器（已整合語音 FNA、家庭關係樹及保單追溯年齡雷達）：'
            )}
          </span>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenLiveUpgrade('IMP-05')}
              className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              {t('10s Cantonese Voice → FNA (IMP-05)', '粵語錄音 10秒轉 FNA (IMP-05)')}
            </button>
            <button
              type="button"
              onClick={() => onOpenLiveUpgrade('IMP-07')}
              className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              {t('Family & Referral Tree (IMP-07)', '家庭及轉介關係圖譜 (IMP-07)')}
            </button>
            <button
              type="button"
              onClick={() => onOpenLiveUpgrade('IMP-18')}
              className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              {t('Birthday Age-Backdate Radar (IMP-18)', '生日前追溯保費提醒 (IMP-18)')}
            </button>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Filter leads by pipeline stage"
          className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
        >
          <button
            type="button"
            onClick={() => setStageFilter('ALL')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
              stageFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Stages
          </button>
          {Object.values(LeadStage).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStageFilter(st)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                stageFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {STAGE_FILTER_SHORT_LABELS[st]}
            </button>
          ))}
        </div>

        <div className="w-full lg:w-[420px]">
          <label htmlFor="crm-client-policy-search" className="sr-only">
            {t('Search client leads by name or policy ID', conv('按客戶姓名或保單編號搜尋客戶'))}
          </label>
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="crm-client-policy-search"
              data-testid="crm-policy-name-search-input"
              type="search"
              aria-label={t(
                'Search client leads by name or policy ID',
                conv('按客戶姓名或保單編號搜尋客戶')
              )}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t(
                'Search client name or Policy ID (e.g. Daniel, HK-POL-2024-88102)...',
                conv('搜尋客戶中英文姓名或保單編號（如 陳冠宇 / HK-POL-2024-88102）...')
              )}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-24 text-xs text-slate-900 focus:border-[#0B172A] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none"
            />
            <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              <span
                data-testid="crm-search-match-count"
                className="font-mono text-[11px] font-semibold text-slate-500 tabular-nums"
              >
                {filteredLeads.length}/{leads.length}
              </span>
              {searchText.trim().length > 0 && (
                <button
                  type="button"
                  data-testid="crm-search-clear-btn"
                  aria-label={t('Clear CRM search query', conv('清空搜尋條件'))}
                  onClick={() => setSearchText('')}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          {quickPolicyFilterIds.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span className="whitespace-nowrap">
                {t('Quick Policy ID:', conv('快速按保單編號篩選：'))}
              </span>
              {quickPolicyFilterIds.map((pid) => (
                <button
                  key={pid}
                  type="button"
                  onClick={() => setSearchText(searchText === pid ? '' : pid)}
                  className={`rounded border px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums whitespace-nowrap ${
                    searchText === pid
                      ? 'border-[#0B172A] bg-[#0B172A] text-[#F3D37A]'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {pid}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Sorting Bar: Organize by Stage or Last Contacted Date */}
      <div
        data-testid="crm-sort-toolbar"
        className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs"
      >
        <div className="flex items-center gap-2 text-slate-700">
          <ArrowUpDown className="h-3.5 w-3.5 text-[#0B172A] shrink-0" aria-hidden="true" />
          <span className="font-semibold whitespace-nowrap">
            {t('Sort Pipeline By:', conv('管線排序方式：'))}
          </span>
          <div
            role="group"
            aria-label={t('Quick sort by Stage or Last Contacted', conv('按銷售階段或最後聯絡日期快速排序'))}
            className="flex flex-wrap items-center gap-1.5"
          >
            <button
              type="button"
              data-testid="crm-sort-last-contact-btn"
              onClick={() =>
                setSortBy((prev) =>
                  prev === 'LAST_CONTACT_DESC' ? 'LAST_CONTACT_ASC' : 'LAST_CONTACT_DESC'
                )
              }
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-semibold whitespace-nowrap transition-colors ${
                sortBy === 'LAST_CONTACT_DESC' || sortBy === 'LAST_CONTACT_ASC'
                  ? 'border-[#0B172A] bg-[#0B172A] text-[#F3D37A]'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>
                {sortBy === 'LAST_CONTACT_ASC'
                  ? t('Last Contacted (Oldest → Recent ↑)', conv('最後聯絡日（最久未跟進 ↑）'))
                  : t('Last Contacted (Recent → Oldest ↓)', conv('最後聯絡日（最近聯絡 ↓）'))}
              </span>
            </button>
            <button
              type="button"
              data-testid="crm-sort-stage-btn"
              onClick={() =>
                setSortBy((prev) => (prev === 'STAGE_DESC' ? 'STAGE_ASC' : 'STAGE_DESC'))
              }
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-semibold whitespace-nowrap transition-colors ${
                sortBy === 'STAGE_DESC' || sortBy === 'STAGE_ASC'
                  ? 'border-[#0B172A] bg-[#0B172A] text-[#F3D37A]'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>
                {sortBy === 'STAGE_ASC'
                  ? t('Stage (New → In-Force ↑)', conv('銷售階段（新客 ➔ 已生效 ↑）'))
                  : t('Stage (Closing → New ↓)', conv('銷售階段（近成交 ➔ 新客 ↓）'))}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="crm-sort-select" className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
            {t('Order:', conv('精確順序：'))}
          </label>
          <select
            id="crm-sort-select"
            data-testid="crm-sort-select"
            aria-label={t('Sort client leads by Stage or Last Contacted date', conv('按銷售階段或最後聯絡日期排序'))}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as CrmLeadSortOption)}
            className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-[#0B172A] focus:bg-white focus:outline-none"
          >
            <option value="LAST_CONTACT_DESC">
              {t('Last Contacted: Most Recent First', conv('最後聯絡日期：由近至遠（最近優先）'))}
            </option>
            <option value="LAST_CONTACT_ASC">
              {t('Last Contacted: Oldest First (Needs Follow-Up)', conv('最後聯絡日期：由遠至近（待跟進優先）'))}
            </option>
            <option value="STAGE_DESC">
              {t('Stage: Late Funnel → Early (In-Force → New)', conv('銷售階段：後段至前段（近成交優先）'))}
            </option>
            <option value="STAGE_ASC">
              {t('Stage: Early Funnel → Late (New → In-Force)', conv('銷售階段：前段至後段（新潛客優先）'))}
            </option>
          </select>
        </div>
      </div>

      {/* Actionable Pending Follow-Up Tasks Strip (#7) */}
      {pendingFollowUpItems.length > 0 && (
        <div
          data-testid="crm-pending-followups-strip"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-900">
              {t(
                `Actionable Client Follow-Up Queue (${pendingFollowUpItems.length} Open)`,
                conv(`待辦客戶跟進日程清單（共 ${pendingFollowUpItems.length} 項未完成）`)
              )}
            </span>
            <span className="text-[11px] text-slate-500">
              {t('Check off directly or edit in Stage 01A Client Notes', conv('可直接勾選完成，或於 01A 客戶筆記新增期限'))}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            {pendingFollowUpItems.map((item) => (
              <label
                key={item.taskId}
                className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 cursor-pointer hover:bg-slate-50"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() =>
                      onUpdateLead(item.leadId, (prev) => ({
                        ...prev,
                        followUpTasks: (prev.followUpTasks || []).map((tk) =>
                          tk.id === item.taskId ? { ...tk, completed: true } : tk
                        ),
                      }))
                    }
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <span className="text-slate-800">
                    <strong className="text-slate-950">{item.leadNameZh}</strong> · {conv(item.title)}
                  </span>
                </div>
                <span className="font-mono text-[11px] font-semibold text-amber-800 tabular-nums whitespace-nowrap shrink-0">
                  {item.dueDateIso}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Client Pipeline Data Grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 whitespace-nowrap">
              <th className="py-3.5 px-4 font-semibold">Client & Policy ID 客戶姓名及保單編號</th>
              <th className="py-3.5 px-4 font-semibold">Residency & KYC 證件及入境核實</th>
              <th className="py-3.5 px-4 font-semibold">GL30 FNA & Budget 財務分析</th>
              <th className="py-3.5 px-4 font-semibold">
                <button
                  type="button"
                  onClick={() =>
                    setSortBy((prev) => (prev === 'STAGE_DESC' ? 'STAGE_ASC' : 'STAGE_DESC'))
                  }
                  className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-950 whitespace-nowrap"
                >
                  <span>Pipeline Stage & Last Contact 進度及聯絡日</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" aria-hidden="true" />
                </button>
              </th>
              <th className="py-3.5 px-4 text-right font-semibold">Actions 操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedFilteredLeads.length === 0 ? (
              <tr data-testid="crm-search-empty-state">
                <td colSpan={5} className="py-10 px-6 text-center">
                  <p className="text-sm font-semibold text-slate-900">
                    {t(
                      `No matching client leads found for "${searchText}"`,
                      conv(`找不到符合「${searchText}」的客戶姓名或保單編號`)
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t(
                      'Try searching by English/Chinese name, Policy ID (e.g. HK-POL-2024-88102), or reset active filters.',
                      conv('請嘗試輸入客戶中英文姓名、保單編號（如 HK-POL-2024-88102），或重設目前篩選條件。')
                    )}
                  </p>
                  <button
                    type="button"
                    data-testid="crm-empty-reset-btn"
                    onClick={() => {
                      setSearchText('');
                      setStageFilter('ALL');
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                  >
                    <span>{t('Reset Search & Stage Filter', conv('重設搜尋及階段篩選'))}</span>
                  </button>
                </td>
              </tr>
            ) : null}
            {sortedFilteredLeads.map((lead) => {
              const mcvNeedsSlip =
                lead.residency === 'MCV' && !lead.kycCheck.mcvEntrySlipVerified;
              const kycComplete = lead.kycCheck.hkidVerified && !mcvNeedsSlip;
              const isSelectedActive = selectedLeadId === lead.id;
              const leadPolicyIds = collectLeadPolicyIds(lead, applications, inForcePolicies);

              return (
                <tr
                  key={lead.id}
                  data-testid={`crm-lead-row-${lead.id}`}
                  className={isSelectedActive ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'}
                >
                  <td className="py-4 px-4 align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {lead.fullNameEn} · {lead.fullNameZh}
                      </span>
                      {lead.roleTagZh && (
                        <span className="text-[11px] font-semibold text-blue-700">
                          ({lead.roleTagZh})
                        </span>
                      )}
                      {isSelectedActive && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          <UserCheck className="h-3 w-3" aria-hidden="true" />
                          <span>{t('Active', '當前客戶')}</span>
                        </span>
                      )}
                    </div>
                    {leadPolicyIds.length > 0 && (
                      <div
                        data-testid={`crm-policy-ids-${lead.id}`}
                        className="mt-1 font-mono text-[11px] font-semibold text-slate-800 tabular-nums"
                      >
                        Policy ID: {leadPolicyIds.join(' · ')}
                      </div>
                    )}
                    <div className="mt-1 text-slate-500 tabular-nums">
                      Age {lead.age} · Budget HK${(lead.annualBudgetHkd ?? 48000).toLocaleString()} ·{' '}
                      {lead.isSmoker ? 'Smoker' : 'Non-Smoker'} · {lead.whatsappPhone}
                    </div>
                    <p className="mt-1 max-w-xs text-[11px] text-slate-500">
                      {lead.priorityGoalNote || lead.notes}
                    </p>
                    {(() => {
                      const clientMs = microsites.filter(
                        (m) =>
                          m.leadId === lead.id ||
                          m.clientNameEn === lead.fullNameEn ||
                          m.clientNameZh === lead.fullNameZh
                      );
                      const receipts = clientMs.flatMap((m) => m.readReceipts || []);
                      const latestFeedback = clientMs.find((m) => m.clientFeedback)?.clientFeedback;
                      return (
                        <div className="mt-1.5 space-y-1">
                          {receipts.length > 0 && (
                            <div
                              data-testid={`crm-read-receipt-${lead.id}`}
                              className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-emerald-800 tabular-nums"
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                              <span>
                                {t(
                                  `Proposal Read (${receipts.length}x · Inspected Yr ${receipts[0].inspectedPolicyYear})`,
                                  `微網頁已閱 ${receipts.length} 次 · 重點查看第 ${receipts[0].inspectedPolicyYear} 年`
                                )}
                              </span>
                            </div>
                          )}
                          {latestFeedback && (
                            <div
                              data-testid={`crm-client-feedback-${lead.id}`}
                              className="text-[11px] font-medium text-blue-800"
                            >
                              {t(
                                `Client Reply: Prefers ${latestFeedback.preferredPaymentMode} pay${
                                  latestFeedback.preferredSigningSlot
                                    ? ` · Slot: ${latestFeedback.preferredSigningSlot}`
                                    : ''
                                }${
                                  latestFeedback.clientQuestion
                                    ? ` · "${latestFeedback.clientQuestion}"`
                                    : ''
                                }`,
                                conv(
                                  `客戶微網回傳：傾向${
                                    latestFeedback.preferredPaymentMode === 'MONTHLY' ? '月繳' : '年繳'
                                  }${
                                    latestFeedback.preferredSigningSlot
                                      ? ` · 預約時段：${latestFeedback.preferredSigningSlot}`
                                      : ''
                                  }${
                                    latestFeedback.clientQuestion
                                      ? ` · 提問：「${latestFeedback.clientQuestion}」`
                                      : ''
                                  }`
                                )
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  <td className="py-4 px-4 align-top">
                    <div className="font-medium text-slate-800">
                      {lead.residency === 'MCV'
                        ? 'MCV 內地訪港旅客'
                        : 'HK Resident 香港居民'}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
                      hkidNumber: {lead.hkidNumber || lead.kycCheck.hkidDocNumber}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {kycComplete ? (
                        <>
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {lead.residency === 'MCV'
                                ? 'HKID & 入境標籤 Verified'
                                : 'HKID Verified'}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setOcrLeadId(lead.id);
                              setScannerOpen(true);
                            }}
                            className="text-[11px] font-semibold text-blue-700 hover:underline whitespace-nowrap"
                          >
                            Re-scan ID
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setOcrLeadId(lead.id);
                            setScannerOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 whitespace-nowrap"
                        >
                          <ScanLine className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>
                            {mcvNeedsSlip ? 'Scan 入境標籤 (OCR)' : 'Verify HKID (OCR)'}
                          </span>
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="py-4 px-4 align-top">
                    {lead.fnaRecord ? (
                      <div>
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Signed ({lead.fnaRecord.riskTolerance})</span>
                        </span>
                        <div className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
                          Income HK${lead.fnaRecord.monthlyIncomeHkd.toLocaleString()}/mo · Liquid HK$
                          {lead.fnaRecord.liquidAssetsHkd.toLocaleString()}
                        </div>
                        <button
                          type="button"
                          onClick={() => openFnaModalForLead(lead.id)}
                          className="mt-1 text-[11px] font-semibold text-blue-700 hover:underline"
                        >
                          Edit GL30 FNA
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openFnaModalForLead(lead.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 whitespace-nowrap"
                      >
                        <FileCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Complete GL30 FNA</span>
                      </button>
                    )}
                  </td>

                  <td className="py-4 px-4 align-top whitespace-nowrap">
                    <select
                      aria-label={`Update pipeline stage for ${lead.fullNameEn}`}
                      value={lead.stage}
                      onChange={(e) => {
                        const nextStage = e.target.value as LeadStage;
                        onUpdateLead(lead.id, (prev) => ({
                          ...prev,
                          stage: nextStage,
                          lastContactIso: new Date().toISOString(),
                        }));
                      }}
                      className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:bg-white focus:outline-none"
                    >
                      {Object.values(LeadStage).map((st) => (
                        <option key={st} value={st}>
                          {STAGE_LABELS[st]}
                        </option>
                      ))}
                    </select>
                    <div
                      data-testid={`crm-last-contact-${lead.id}`}
                      className="mt-1.5 font-mono text-[11px] text-slate-500 tabular-nums"
                    >
                      {t('Last Contact:', conv('最後聯絡：'))}{' '}
                      {formatCrmLastContactLabel(lead.lastContactIso)}
                    </div>
                  </td>

                  <td className="py-4 px-4 text-right align-top">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {onSelectLeadId && !isSelectedActive && (
                        <button
                          type="button"
                          onClick={() => onSelectLeadId(lead.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 whitespace-nowrap"
                        >
                          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t('Set Active', '設為當前')}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditClientModal(lead)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
                        <span>{t('Edit Client', '編輯資料')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWhatsappLead(lead);
                          setCopiedWhatsapp(false);
                        }}
                        aria-label={`Prepare WhatsApp message for ${lead.fullNameEn}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                      >
                        <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onLaunchStpForLead(lead.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                      >
                        <span>Auto-Policy</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: Add New Client Lead */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-lead-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 id="add-lead-title" className="text-lg font-bold text-slate-900">
                Add New Client Lead 新增潛在客戶
              </h2>
              <button
                type="button"
                aria-label="Close add lead modal"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <div className="text-xs text-slate-600">
                  {scannedDraftMeta ? (
                    <span className="font-semibold text-emerald-800">
                      ✓ Auto-populated via Cloud Vision ({scannedDraftMeta.hkidNumber})
                    </span>
                  ) : (
                    <span>Auto-fill fullNameEn & hkidNumber from physical HKID / Entry Slip</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setOcrLeadId(null);
                    setScannerOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Scan ID with Camera</span>
                </button>
              </div>

              {addFormError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
                  {addFormError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="new-lead-en" className="block text-xs font-semibold text-slate-700">
                    English Full Name (fullNameEn) *
                  </label>
                  <input
                    id="new-lead-en"
                    name="fullNameEn"
                    type="text"
                    value={newNameEn}
                    onChange={(e) => setNewNameEn(e.target.value)}
                    placeholder="e.g., WONG, Ka Ming"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="new-lead-zh" className="block text-xs font-semibold text-slate-700">
                    Chinese Name 中文姓名
                  </label>
                  <input
                    id="new-lead-zh"
                    name="fullNameZh"
                    type="text"
                    value={newNameZh}
                    onChange={(e) => setNewNameZh(e.target.value)}
                    placeholder="例如：黃家明"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="new-lead-age" className="block text-xs font-semibold text-slate-700">
                    Current Age 年齡 *
                  </label>
                  <input
                    id="new-lead-age"
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="new-lead-retire" className="block text-xs font-semibold text-slate-700">
                    Planned Retirement Age 退休年齡
                  </label>
                  <input
                    id="new-lead-retire"
                    type="number"
                    value={newRetireAge}
                    onChange={(e) => setNewRetireAge(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="new-lead-residency" className="block text-xs font-semibold text-slate-700">
                    Residency Segment 居民類別
                  </label>
                  <select
                    id="new-lead-residency"
                    value={newResidency}
                    onChange={(e) => setNewResidency(e.target.value as ResidencyType)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="HK_RESIDENT">HK Resident 香港居民</option>
                    <option value="MCV">MCV 內地訪港旅客</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="new-lead-phone" className="block text-xs font-semibold text-slate-700">
                    WhatsApp Phone *
                  </label>
                  <input
                    id="new-lead-phone"
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+852 9876 5432"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="new-lead-doc" className="block text-xs font-semibold text-slate-700">
                    HKID / Travel Permit (hkidNumber)
                  </label>
                  <input
                    id="new-lead-doc"
                    name="hkidNumber"
                    type="text"
                    value={newDocNo}
                    onChange={(e) => setNewDocNo(e.target.value)}
                    placeholder="e.g., K654321(9)"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={newSmoker}
                      onChange={(e) => setNewSmoker(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Smoker 吸煙人士</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="new-lead-notes" className="block text-xs font-semibold text-slate-700">
                  Advisory Notes 跟進備註
                </label>
                <textarea
                  id="new-lead-notes"
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Coverage goals, preferred meeting location, family structure..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  Save Client Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Digital GL30 Financial Needs Analysis (FNA) & RPQ */}
      {activeFnaLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gl30-fna-title"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 id="gl30-fna-title" className="text-lg font-bold text-slate-900">
                  HKIA Guideline GL30 — Digital Financial Needs Analysis
                </h2>
                <p className="text-xs text-slate-500">
                  Client: {activeFnaLead.fullNameEn} ({activeFnaLead.fullNameZh}) · Age {activeFnaLead.age}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close GL30 FNA modal"
                onClick={() => setFnaLeadId(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFna} className="mt-4 space-y-4">
              {fnaError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
                  {fnaError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="fna-income" className="block text-xs font-semibold text-slate-700">
                    Monthly Income 每月收入 (HKD) *
                  </label>
                  <input
                    id="fna-income"
                    type="number"
                    value={fnaIncome}
                    onChange={(e) => setFnaIncome(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="fna-expenses" className="block text-xs font-semibold text-slate-700">
                    Monthly Expenses 每月開支 (HKD)
                  </label>
                  <input
                    id="fna-expenses"
                    type="number"
                    value={fnaExpenses}
                    onChange={(e) => setFnaExpenses(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="fna-liquid" className="block text-xs font-semibold text-slate-700">
                    Liquid Assets 流動資產儲備 (HKD)
                  </label>
                  <input
                    id="fna-liquid"
                    type="number"
                    value={fnaLiquid}
                    onChange={(e) => setFnaLiquid(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="fna-risk" className="block text-xs font-semibold text-slate-700">
                    Risk Profile (RPQ) 風險承受能力
                  </label>
                  <select
                    id="fna-risk"
                    value={fnaRisk}
                    onChange={(e) => setFnaRisk(e.target.value as RiskTolerance)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="CONSERVATIVE">Conservative 保守型</option>
                    <option value="MODERATE">Moderate 穩健型</option>
                    <option value="BALANCED">Balanced 平衡型</option>
                    <option value="GROWTH">Growth 進取增長型</option>
                  </select>
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700">
                  Primary Coverage & Financial Objectives 投保目標 *
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {OBJECTIVE_OPTIONS.map((obj) => {
                    const checked = fnaObjectives.includes(obj);
                    return (
                      <label
                        key={obj}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setFnaObjectives((prev) =>
                              checked ? prev.filter((item) => item !== obj) : [...prev, obj]
                            )
                          }
                        />
                        <span>{obj}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="fna-post-retire" className="block text-xs font-semibold text-slate-700">
                  GL16 Sec 7.4 Post-Retirement Funding Source 退休後供款資金來源
                </label>
                <input
                  id="fna-post-retire"
                  type="text"
                  value={fnaPostRetireNote}
                  onChange={(e) => setFnaPostRetireNote(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFnaLeadId(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  Sign & Certify GL30 FNA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RNCamera + Google Cloud Vision Physical Identity Scanner */}
      <RNCameraScannerModal
        open={scannerOpen}
        targetLead={activeOcrLead}
        onClose={() => {
          setScannerOpen(false);
          setOcrLeadId(null);
        }}
        onApplyScanResult={handleApplyCameraScanResult}
      />

      {/* MODAL 4: WhatsApp Business Dispatch Composer */}
      {whatsappLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="whatsapp-modal-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 id="whatsapp-modal-title" className="text-lg font-bold text-slate-900">
                WhatsApp Business Proposal & Follow-Up Dispatch
              </h2>
              <button
                type="button"
                aria-label="Close WhatsApp composer"
                onClick={() => setWhatsappLead(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {(() => {
              const cleanDigits = whatsappLead.whatsappPhone.replace(/[^0-9]/g, '');
              const msg = `你好 ${whatsappLead.fullNameZh} (${whatsappLead.fullNameEn})！我已為您準備好香港全市場保險方案比較及保監局合規利益說明書（包括保證及非保證退保價值預測）。請隨時回覆此 WhatsApp 訊息確認會面或電子簽署安排。`;
              const waHref = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(msg)}`;

              return (
                <div className="mt-4 space-y-4">
                  <div className="text-xs text-slate-500">
                    Recipient: <span className="font-semibold text-slate-800">{whatsappLead.fullNameEn}</span> ·{' '}
                    <span className="font-mono">{whatsappLead.whatsappPhone}</span>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-800">
                    {msg}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        void copyTextSafe(msg);
                        setCopiedWhatsapp(true);
                        onAppendWhatsappAuditLog?.(
                          createWhatsAppComplianceLog({
                            clientName: `${whatsappLead.fullNameZh} (${whatsappLead.fullNameEn})`,
                            advisorLicenseNo: intermediaryLicenseNo,
                            channel: 'WHATSAPP',
                            summaryTopic: 'Proposal & GL28 Guaranteed/Non-Guaranteed Disclosure Sent',
                          })
                        );
                        onUpdateLead(whatsappLead.id, (prevLead) => ({
                          ...prevLead,
                          stage:
                            prevLead.stage === LeadStage.FNA_COMPLETED
                              ? LeadStage.PROPOSAL_SENT
                              : prevLead.stage,
                          lastContactIso: new Date().toISOString(),
                        }));
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{copiedWhatsapp ? 'Copied & Logged!' : 'Copy & Log Proposal Sent'}</span>
                    </button>

                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        onUpdateLead(whatsappLead.id, (prevLead) => ({
                          ...prevLead,
                          stage:
                            prevLead.stage === LeadStage.FNA_COMPLETED
                              ? LeadStage.PROPOSAL_SENT
                              : prevLead.stage,
                          lastContactIso: new Date().toISOString(),
                        }));
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      <span>Open WhatsApp Web</span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {/* MODAL 5: Edit Saved Client Profile (建檔客戶編輯) */}
      {editingLeadId && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-saved-client-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 id="edit-saved-client-title" className="text-lg font-bold text-slate-900">
                {t('Edit Saved Client Profile', '編輯已建檔客戶資料與目標方案')}
              </h2>
              <button
                type="button"
                aria-label="Close edit client modal"
                onClick={() => {
                  setEditingLeadId(null);
                  setEditForm(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClientEdit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('Chinese Name & Title', '中文姓名／稱謂')}
                  </label>
                  <input
                    type="text"
                    value={editForm.fullNameZh}
                    onChange={(e) => setEditForm({ ...editForm, fullNameZh: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('English Name', '英文姓名')}
                  </label>
                  <input
                    type="text"
                    value={editForm.fullNameEn}
                    onChange={(e) => setEditForm({ ...editForm, fullNameEn: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('Role Tag (e.g. 家庭支柱)', '客戶標籤（如：家庭支柱／企業主）')}
                  </label>
                  <input
                    type="text"
                    value={editForm.roleTagZh}
                    onChange={(e) => setEditForm({ ...editForm, roleTagZh: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('Age (18–80)', '投保年齡 (18–80)')}
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={80}
                    value={editForm.age}
                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('Annual Budget (HK$)', '年度保費預算 (HK$)')}
                  </label>
                  <input
                    type="number"
                    min={6000}
                    step={1}
                    value={editForm.annualBudgetHkd}
                    onChange={(e) => setEditForm({ ...editForm, annualBudgetHkd: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('Target Protection Architecture', '鎖定目標保障架構')}
                  </label>
                  <select
                    value={editForm.targetSchemeId}
                    onChange={(e) =>
                      setEditForm({ ...editForm, targetSchemeId: e.target.value as TargetProtectionSchemeId })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    {TARGET_PROTECTION_SCHEMES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.titleZh} ({s.titleEn})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('Family Stage', '家庭與人生階段')}
                  </label>
                  <select
                    value={editForm.familyStage}
                    onChange={(e) =>
                      setEditForm({ ...editForm, familyStage: e.target.value as FamilyStageCode })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    {FAMILY_STAGE_OPTIONS.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.labelZh} ({f.labelEn})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('Occupation Risk Class', '職業風險等級')}
                  </label>
                  <select
                    value={editForm.occupationRiskClass}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        occupationRiskClass: e.target.value as OccupationRiskClass,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    {OCCUPATION_RISK_OPTIONS.map((o) => (
                      <option key={o.code} value={o.code}>
                        {o.labelZh}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('Residency & Pipeline Stage', '居民身份與跟進階段')}
                  </label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <select
                      value={editForm.residency}
                      onChange={(e) =>
                        setEditForm({ ...editForm, residency: e.target.value as ResidencyType })
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                    >
                      <option value="HK_RESIDENT">HK Resident</option>
                      <option value="MCV">MCV 內地訪客</option>
                    </select>
                    <select
                      value={editForm.stage}
                      onChange={(e) =>
                        setEditForm({ ...editForm, stage: e.target.value as LeadStage })
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                    >
                      {Object.values(LeadStage).map((st) => (
                        <option key={st} value={st}>
                          {STAGE_FILTER_SHORT_LABELS[st]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    WhatsApp & Smoking
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="tel"
                      value={editForm.whatsappPhone}
                      onChange={(e) => setEditForm({ ...editForm, whatsappPhone: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                    />
                    <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={editForm.isSmoker}
                        onChange={(e) => setEditForm({ ...editForm, isSmoker: e.target.checked })}
                      />
                      <span>{t('Smoker', '吸煙')}</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Existing Protection Summary Note', '既有保障摘要備註')}
                </label>
                <textarea
                  rows={2}
                  value={editForm.existingSummaryNote}
                  onChange={(e) =>
                    setEditForm({ ...editForm, existingSummaryNote: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('Priority Planning Goal', '本次規劃最優先目標')}
                </label>
                <textarea
                  rows={2}
                  value={editForm.priorityGoalNote}
                  onChange={(e) => setEditForm({ ...editForm, priorityGoalNote: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                <div>
                  {onDeleteLead && leads.length > 1 && (
                    confirmDeleteLeadId === editingLeadId ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-rose-700">
                          {t('Confirm delete client?', '確定刪除此建檔客戶？')}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteLead(editingLeadId);
                            setEditingLeadId(null);
                            setEditForm(null);
                            setConfirmDeleteLeadId(null);
                          }}
                          className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800"
                        >
                          {t('Yes, Delete', '確認刪除')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteLeadId(null)}
                          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          {t('Cancel', '取消')}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteLeadId(editingLeadId)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t('Delete Client', '刪除客戶')}</span>
                      </button>
                    )
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLeadId(null);
                      setEditForm(null);
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                  >
                    {t('Cancel', '取消')}
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                  >
                    {t('Save Client Changes', '儲存客戶資料修改')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
