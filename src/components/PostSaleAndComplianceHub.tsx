import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  CloudUpload,
  Copy,
  Download,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  calculateCompliantQuote,
  evaluateHkiaCompliance,
} from '../domain/actuarialEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  buildHkiaAuditDossierModel,
  buildRenewalWhatsAppMessage,
  evaluateHkiaCpdCompliance,
  evaluateInForceRenewalSummary,
} from '../domain/lifecycleAndComplianceEngine';
import { WhatsAppComplianceLogEntry } from '../domain/twentyUpgradesEngine';
import {
  AgencyHandoverItem,
  AgencyTeamRole,
  ClaimConciergeCase,
  ClaimKanbanStage,
  ClientLead,
  HkiaCpdCategory,
  HkiaCpdCourseEntry,
  InForcePolicyRecord,
  InsurancePlan,
  IntermediaryProfile,
  PolicyApplicationRecord,
  PolicyEndorsementRequest,
  PolicyEndorsementType,
} from '../domain/types';
import {
  generateHkiaAuditDossierPdfBytes,
  triggerBrowserDownload,
} from '../services/pdfGenerator';
import { buildAdvisorFollowUpIcs } from '../domain/advisorToolkitSuiteEngine';
import {
  copyTextSafe,
  triggerBrowserDownload as triggerTextDownload,
} from '../utils/clipboardAndDom';
import { AnnualPolicyReviewPanel } from './AnnualPolicyReviewPanel';

interface PostSaleAndComplianceHubProps {
  mode: 'servicing' | 'compliance';
  activeLead: ClientLead;
  leads: ClientLead[];
  onSelectLeadId: (leadId: string) => void;
  intermediary: IntermediaryProfile;
  anchorPlan: InsurancePlan | null;
  annualPremiumHkd: number;
  applications: PolicyApplicationRecord[];
  inForcePolicies: InForcePolicyRecord[];
  onUpdateInForcePolicies: React.Dispatch<React.SetStateAction<InForcePolicyRecord[]>>;
  claimCases: ClaimConciergeCase[];
  onUpdateClaimCases: React.Dispatch<React.SetStateAction<ClaimConciergeCase[]>>;
  endorsements: PolicyEndorsementRequest[];
  onUpdateEndorsements: React.Dispatch<React.SetStateAction<PolicyEndorsementRequest[]>>;
  cpdEntries: HkiaCpdCourseEntry[];
  onUpdateCpdEntries: React.Dispatch<React.SetStateAction<HkiaCpdCourseEntry[]>>;
  agencyHandovers: AgencyHandoverItem[];
  onSyncAgencyHandovers: (nextItems: AgencyHandoverItem[]) => Promise<void> | void;
  whatsappAuditLogs: WhatsAppComplianceLogEntry[];
  onNotify?: (msg: string) => void;
}

const CLAIM_STAGE_ORDER: ClaimKanbanStage[] = [
  'LOG_PREAPPROVAL',
  'DOCTOR_REPORT',
  'INSURER_ASSESSMENT',
  'SETTLED',
];

const CLAIM_STAGE_LABELS: Record<ClaimKanbanStage, { zh: string; en: string }> = {
  LOG_PREAPPROVAL: { zh: '01. 入院前免找數預批 (LOG)', en: '01. Pre-Admission Cashless LOG' },
  DOCTOR_REPORT: { zh: '02. 主診醫生報告及收據', en: '02. Specialist Report & Bills' },
  INSURER_ASSESSMENT: { zh: '03. 保司理賠部審核中', en: '03. Insurer Claims Assessment' },
  SETTLED: { zh: '04. 賠款 FPS 結算入賬', en: '04. Claim Settled & Credited' },
};

const ENDORSEMENT_TYPE_LABELS: Record<PolicyEndorsementType, { zh: string; en: string }> = {
  CURRENCY_SWITCH: { zh: '保單貨幣轉換 (USD/HKD/RMB)', en: 'Policy Currency Switch' },
  POLICY_SPLIT: { zh: '保單分拆傳承申請 (Policy Split)', en: 'Policy Split Option' },
  CHANGE_INSURED: { zh: '無限次更換受保人', en: 'Change of Insured Life' },
  CONTINGENT_OWNER: { zh: '委任／更改後備保單持有人', en: 'Contingent Owner Designation' },
  BENEFICIARY_CHANGE: { zh: '更改身故賠償受益人比例', en: 'Beneficiary Allocation Change' },
};

const ROLE_LABELS: Record<AgencyTeamRole, { zh: string; en: string }> = {
  ADVISOR: { zh: '持牌理財顧問', en: 'Licensed Advisor' },
  UW_ASSISTANT: { zh: '核保跟進助理', en: 'UW Assistant' },
  COMPLIANCE_OFFICER: { zh: '合規簽批主管', en: 'Compliance Officer' },
};

export const PostSaleAndComplianceHub: React.FC<PostSaleAndComplianceHubProps> = ({
  mode,
  activeLead,
  leads,
  onSelectLeadId,
  intermediary,
  anchorPlan,
  annualPremiumHkd,
  applications,
  inForcePolicies,
  onUpdateInForcePolicies,
  claimCases,
  onUpdateClaimCases,
  endorsements,
  onUpdateEndorsements,
  cpdEntries,
  onUpdateCpdEntries,
  agencyHandovers,
  onSyncAgencyHandovers,
  whatsappAuditLogs,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  // Servicing state
  const [renewalSearch, setRenewalSearch] = useState('');
  const [newClaimHospital, setNewClaimHospital] = useState('養和醫院 (跑馬地)');
  const [newClaimDiagnosis, setNewClaimDiagnosis] = useState('');
  const [newClaimAmount, setNewClaimAmount] = useState('38000');

  const [endorsePolicyId, setEndorsePolicyId] = useState(
    inForcePolicies[0]?.policyId || 'HK-POL-2023-77419'
  );
  const [endorseType, setEndorseType] = useState<PolicyEndorsementType>('CURRENCY_SWITCH');
  const [endorseDetail, setEndorseDetail] = useState('');

  // Compliance state
  const [cpdTitle, setCpdTitle] = useState('');
  const [cpdHours, setCpdHours] = useState('3');
  const [cpdCategory, setCpdCategory] = useState<HkiaCpdCategory>('ETHICS_REGULATION');
  const [exportingDossier, setExportingDossier] = useState(false);

  const [handoverRoleFilter, setHandoverRoleFilter] = useState<'ALL' | AgencyTeamRole>('ALL');
  const [newHoToRole, setNewHoToRole] = useState<AgencyTeamRole>('UW_ASSISTANT');
  const [newHoTask, setNewHoTask] = useState('');
  const [newHoUrgent, setNewHoUrgent] = useState(false);

  const renewalSummary = useMemo(
    () => evaluateInForceRenewalSummary(inForcePolicies),
    [inForcePolicies]
  );

  const filteredInForcePolicies = useMemo(() => {
    const q = renewalSearch.trim().toLowerCase();
    if (!q) return inForcePolicies;
    return inForcePolicies.filter((p) =>
      `${p.policyId} ${p.clientNameZh} ${p.clientNameEn} ${p.insurerCode} ${p.planNameZh} ${p.planNameEn}`
        .toLowerCase()
        .includes(q)
    );
  }, [inForcePolicies, renewalSearch]);

  const cpdStatus = useMemo(() => evaluateHkiaCpdCompliance(cpdEntries), [cpdEntries]);

  const activeCompliance = useMemo(() => {
    if (!anchorPlan) {
      return {
        canSubmitStp: Boolean(activeLead.fnaRecord && activeLead.kycCheck.hkidVerified),
        canCompareBenchmark: true,
        blockingReasons: [],
        suitabilityWarnings: [],
        passedChecks: ['KYC & GL30 FNA Verified'],
      };
    }
    const quote = calculateCompliantQuote({
      plan: anchorPlan,
      age: activeLead.age,
      isSmoker: activeLead.isSmoker,
      currency: anchorPlan.currencies.includes('HKD')
        ? 'HKD'
        : anchorPlan.currencies[0],
      sumAssuredInSelectedCurrency: Math.max(250000, annualPremiumHkd * 10),
      paymentTermYears: anchorPlan.supportedPaymentTerms[0] || 10,
    });
    return evaluateHkiaCompliance({
      intermediary,
      lead: activeLead,
      plan: anchorPlan,
      quote,
    });
  }, [activeLead, anchorPlan, annualPremiumHkd, intermediary]);

  const auditDossier = useMemo(
    () =>
      buildHkiaAuditDossierModel({
        lead: activeLead,
        intermediary,
        anchorPlan,
        annualPremiumHkd,
        compliance: activeCompliance,
        applications,
        inForcePolicies,
        whatsappAuditLogs,
      }),
    [
      activeCompliance,
      activeLead,
      anchorPlan,
      annualPremiumHkd,
      applications,
      inForcePolicies,
      intermediary,
      whatsappAuditLogs,
    ]
  );

  // Handlers for 5C Servicing
  const handleMarkPolicyRenewed = (polId: string) => {
    onUpdateInForcePolicies((prev) =>
      prev.map((p) => {
        if (p.id !== polId) return p;
        const currDue = new Date(`${p.nextDueDateIso}T00:00:00Z`);
        const nextYearIso = Number.isNaN(currDue.getTime())
          ? '2027-11-24'
          : new Date(currDue.setUTCFullYear(currDue.getUTCFullYear() + 1))
              .toISOString()
              .slice(0, 10);
        const graceDate = new Date(`${nextYearIso}T00:00:00Z`);
        const nextGraceIso = new Date(graceDate.getTime() + 30 * 86400_000)
          .toISOString()
          .slice(0, 10);
        return {
          ...p,
          nextDueDateIso: nextYearIso,
          graceEndsIso: nextGraceIso,
          status: 'ACTIVE',
        };
      })
    );
    onNotify?.(
      t(
        'Policy marked renewed for next anniversary year.',
        conv('已確認收到續保保費並更新至下一保單週年日。')
      )
    );
  };

  const handleToggleFxLock = (polId: string) => {
    onUpdateInForcePolicies((prev) =>
      prev.map((p) => (p.id === polId ? { ...p, fxRateLocked: !p.fxRateLocked } : p))
    );
  };

  const handleCopyRenewalWhatsApp = async (pol: InForcePolicyRecord) => {
    const msg = buildRenewalWhatsAppMessage(pol, intermediary.nameZh, intermediary.iaLicenseNo);
    await copyTextSafe(msg);
    onNotify?.(
      t(
        `Copied WhatsApp renewal notice for ${pol.policyId}.`,
        conv(`已複製保單 ${pol.policyId} 的續保提醒 WhatsApp 訊息。`)
      )
    );
  };

  const handleDownloadPolicyIcs = (pol: InForcePolicyRecord) => {
    const built = buildAdvisorFollowUpIcs({
      kind: 'RENEWAL_30D',
      clientNameZh: pol.clientNameZh,
      clientNameEn: pol.clientNameEn,
      policyNumber: pol.policyId,
      planNameZh: `[${pol.insurerCode}] ${pol.planNameZh}`,
      nextRenewalDateIso: pol.nextDueDateIso,
    });
    triggerTextDownload(
      built.fileName,
      built.icsContent,
      'text/calendar;charset=utf-8'
    );
    onNotify?.(
      t(
        `Downloaded .ics renewal reminder (30 days before ${pol.nextDueDateIso}) for ${pol.policyId}.`,
        conv(`已下載保單 ${pol.policyId} 的續保前 30 日提醒 (.ics)，可直接匯入 iPhone／Google 日曆！`)
      )
    );
  };

  const handleAdvanceClaimStage = (claimId: string) => {
    onUpdateClaimCases((prev) =>
      prev.map((c) => {
        if (c.id !== claimId) return c;
        const idx = CLAIM_STAGE_ORDER.indexOf(c.stage);
        const nextStage = CLAIM_STAGE_ORDER[Math.min(CLAIM_STAGE_ORDER.length - 1, idx + 1)];
        return {
          ...c,
          stage: nextStage,
          updatedAtIso: new Date().toISOString(),
        };
      })
    );
    onNotify?.(
      t('Advanced claim case to next concierge stage.', conv('已推進私家醫院理賠個案至下一階段。'))
    );
  };

  const handleToggleClaimChecklist = (claimId: string, itemId: string) => {
    onUpdateClaimCases((prev) =>
      prev.map((c) => {
        if (c.id !== claimId) return c;
        return {
          ...c,
          checklist: c.checklist.map((item) =>
            item.id === itemId ? { ...item, done: !item.done } : item
          ),
        };
      })
    );
  };

  const handleCreateClaimCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClaimDiagnosis.trim()) return;
    const matchedPol =
      inForcePolicies.find((p) => p.leadId === activeLead.id) || inForcePolicies[0];
    const created: ClaimConciergeCase = {
      id: `clm-${Date.now().toString(36)}`,
      claimNumber: `CLM-2026-${Math.floor(1000 + Math.random() * 8999)}`,
      policyId: matchedPol?.policyId || 'HK-POL-2026-NEW',
      leadId: activeLead.id,
      clientNameZh: activeLead.fullNameZh,
      clientNameEn: activeLead.fullNameEn,
      hospitalNameZh: newClaimHospital,
      hospitalNameEn: newClaimHospital,
      diagnosisZh: newClaimDiagnosis.trim(),
      diagnosisEn: newClaimDiagnosis.trim(),
      estimatedClaimHkd: Math.max(2000, Number(newClaimAmount) || 35000),
      cashlessLogApproved: true,
      stage: 'LOG_PREAPPROVAL',
      checklist: [
        {
          id: 'chk-new-1',
          itemZh: '主診專科醫生簽署入院前免找數預批表 (LOG)',
          itemEn: 'Specialist Pre-Admission LOG Form signed',
          done: false,
        },
        {
          id: 'chk-new-2',
          itemZh: '私家醫院手術室及半私家房費用估算單',
          itemEn: 'Private hospital surgical & ward fee quotation',
          done: false,
        },
      ],
      updatedAtIso: new Date().toISOString(),
    };
    onUpdateClaimCases((prev) => [created, ...prev]);
    setNewClaimDiagnosis('');
    onNotify?.(
      t(
        `Registered cashless LOG claim ${created.claimNumber}.`,
        conv(`已建立私院免找數預批理賠個案 ${created.claimNumber}。`)
      )
    );
  };

  const handleSubmitEndorsement = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedPol =
      inForcePolicies.find((p) => p.policyId === endorsePolicyId) || inForcePolicies[0];
    const summaryText =
      endorseDetail.trim() ||
      `${ENDORSEMENT_TYPE_LABELS[endorseType].zh} — 依客戶 ${activeLead.fullNameZh} 最新指示辦理生效`;
    const created: PolicyEndorsementRequest = {
      id: `end-${Date.now().toString(36)}`,
      referenceNo: `END-2026-${Math.floor(1000 + Math.random() * 8999)}`,
      policyId: matchedPol?.policyId || endorsePolicyId,
      leadId: matchedPol?.leadId || activeLead.id,
      clientNameZh: matchedPol?.clientNameZh || activeLead.fullNameZh,
      clientNameEn: matchedPol?.clientNameEn || activeLead.fullNameEn,
      endorsementType: endorseType,
      detailSummaryZh: summaryText,
      detailSummaryEn: summaryText,
      effectiveDateIso: new Date().toISOString().slice(0, 10),
      status: 'SUBMITTED',
    };
    onUpdateEndorsements((prev) => [created, ...prev]);
    setEndorseDetail('');
    onNotify?.(
      t(
        `Submitted policy endorsement ${created.referenceNo}.`,
        conv(`已遞交保單售後批註申請 ${created.referenceNo}。`)
      )
    );
  };

  // Handlers for 5D Compliance
  const handleAddCpdCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpdTitle.trim()) return;
    const hrs = Math.min(15, Math.max(0.5, Number(cpdHours) || 2));
    const entry: HkiaCpdCourseEntry = {
      id: `cpd-${Date.now().toString(36)}`,
      titleZh: cpdTitle.trim(),
      titleEn: cpdTitle.trim(),
      provider: 'HKFI / Accredited IA Provider',
      hours: hrs,
      category: cpdCategory,
      completedDateIso: new Date().toISOString().slice(0, 10),
      certificateRef: `HKIA-CPD-2026-${Math.floor(1000 + Math.random() * 8999)}`,
    };
    onUpdateCpdEntries((prev) => [entry, ...prev]);
    setCpdTitle('');
    onNotify?.(
      t(
        `Logged ${hrs} CPD hour(s) toward HKIA renewal.`,
        conv(`已登錄 ${hrs} 小時保監局持續專業培訓 (CPD) 學分。`)
      )
    );
  };

  const handleExportAuditDossierPdf = async () => {
    setExportingDossier(true);
    try {
      const pdfBytes = await generateHkiaAuditDossierPdfBytes(auditDossier);
      triggerBrowserDownload(
        `${auditDossier.dossierId}_${activeLead.fullNameEn.replace(/\s+/g, '_')}.pdf`,
        pdfBytes,
        'application/pdf'
      );
      onNotify?.(
        t(
          `Downloaded HKIA Inspection Audit Dossier PDF (${auditDossier.dossierId}).`,
          conv(`已匯出保監局合規查冊審計卷宗 PDF (${auditDossier.dossierId})！`)
        )
      );
    } finally {
      setExportingDossier(false);
    }
  };

  const handleExportAuditDossierJson = () => {
    triggerBrowserDownload(
      `${auditDossier.dossierId}.json`,
      JSON.stringify(auditDossier, null, 2),
      'application/json'
    );
    onNotify?.(
      t('Exported HKIA Audit Dossier JSON archive.', conv('已下載保監局合規審計 JSON 留痕封存檔。'))
    );
  };

  const handleAddHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoTask.trim()) return;
    const policyRef = auditDossier.policyIds[0] || 'PENDING-STP';
    const item: AgencyHandoverItem = {
      id: `ho-${Date.now().toString(36)}`,
      leadId: activeLead.id,
      clientNameZh: activeLead.fullNameZh,
      clientNameEn: activeLead.fullNameEn,
      policyOrRefId: policyRef,
      fromRole: 'ADVISOR',
      toRole: newHoToRole,
      taskSummaryZh: newHoTask.trim(),
      taskSummaryEn: newHoTask.trim(),
      priority: newHoUrgent ? 'URGENT' : 'NORMAL',
      status: 'OPEN',
      updatedAtIso: new Date().toISOString(),
    };
    const nextList = [item, ...agencyHandovers];
    await onSyncAgencyHandovers(nextList);
    setNewHoTask('');
    setNewHoUrgent(false);
    onNotify?.(
      t(
        `Assigned handover task to ${ROLE_LABELS[newHoToRole].en}.`,
        conv(`已指派跨職能交接任務予「${ROLE_LABELS[newHoToRole].zh}」並同步雲端。`)
      )
    );
  };

  const handleCycleHandoverStatus = async (hoId: string) => {
    const nextList = agencyHandovers.map((h) => {
      if (h.id !== hoId) return h;
      const nextStatus: AgencyHandoverItem['status'] =
        h.status === 'OPEN' ? 'IN_PROGRESS' : h.status === 'IN_PROGRESS' ? 'DONE' : 'OPEN';
      return { ...h, status: nextStatus, updatedAtIso: new Date().toISOString() };
    });
    await onSyncAgencyHandovers(nextList);
  };

  // ==========================================================================
  // RENDER MODE 1: STAGE 05C POST-SALE SERVICING, RENEWALS & CLAIMS KANBAN
  // ==========================================================================
  if (mode === 'servicing') {
    return (
      <div data-testid="stage5c-post-sale-servicing" className="space-y-6">
        {/* Suggestion #5: 1-Click 1-Page Annual Policy Review PDF & WhatsApp Generator */}
        <AnnualPolicyReviewPanel
          policies={inForcePolicies}
          leads={leads}
          intermediary={intermediary}
          onNotify={onNotify}
        />

        {/* #1 In-Force Policy Anniversary, Renewal & 30-Day Grace Calendar */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <CalendarClock className="h-4 w-4 text-slate-800 shrink-0" aria-hidden="true" />
                <span>
                  {t(
                    '01. In-Force Policy Renewal & 30-Day Grace-Period Calendar',
                    conv('01. 已生效保單週年續保與 30 日寬限期預警日曆')
                  )}
                </span>
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {t(
                  `Total In-Force: ${renewalSummary.totalInForceCount} · Grace Alert: ${renewalSummary.gracePeriodCount} · Due Within 30d: ${renewalSummary.dueSoonCount} · Annualized Book: HK$ ${renewalSummary.totalAnnualizedPremiumHkdEquiv.toLocaleString()}`,
                  conv(
                    `生效保單共 ${renewalSummary.totalInForceCount} 份 · 寬限期緊急跟進 ${renewalSummary.gracePeriodCount} 份 · 30 日內到期 ${renewalSummary.dueSoonCount} 份 · 年度續保總額約 HK$ ${renewalSummary.totalAnnualizedPremiumHkdEquiv.toLocaleString()}`
                  )
                )}
              </p>
            </div>
            <input
              type="search"
              aria-label="Filter in-force policies by policy ID or client"
              value={renewalSearch}
              onChange={(e) => setRenewalSearch(e.target.value)}
              placeholder={t('Filter Policy ID or Client...', conv('搜尋保單編號或客戶姓名...'))}
              className="w-full sm:w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[780px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 whitespace-nowrap">
                  <th className="py-3 px-3.5 font-semibold">{t('Policy ID & Plan', conv('保單編號及計劃'))}</th>
                  <th className="py-3 px-3.5 font-semibold">{t('Policyholder', conv('保單持有人'))}</th>
                  <th className="py-3 px-3.5 text-right font-semibold">{t('Renewal Premium', conv('續保保費'))}</th>
                  <th className="py-3 px-3.5 font-semibold">{t('Due / Grace End', conv('應繳日／寬限期屆滿'))}</th>
                  <th className="py-3 px-3.5 text-right font-semibold">{t('Actions', conv('續保跟進'))}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInForcePolicies.map((pol) => (
                  <tr key={pol.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3.5">
                      <div className="font-mono font-bold text-slate-900 tabular-nums">
                        {pol.policyId}
                      </div>
                      <div className="mt-0.5 text-slate-600">
                        [{pol.insurerCode}] {lang === 'en' ? pol.planNameEn : conv(pol.planNameZh)}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-slate-900">
                      {pol.clientNameZh} · {pol.clientNameEn}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {pol.currency} ${pol.annualPremium.toLocaleString()}
                      <div className="mt-0.5 font-sans text-[11px] font-normal text-slate-500">
                        <button
                          type="button"
                          onClick={() => handleToggleFxLock(pol.id)}
                          className="hover:underline"
                        >
                          {pol.fxRateLocked
                            ? t('FX Locked', conv('已鎖定兌換匯率'))
                            : t('Lock FX Rate', conv('點擊鎖定匯率'))}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 font-mono tabular-nums">
                      <div
                        className={`font-semibold ${
                          pol.status === 'GRACE_PERIOD'
                            ? 'text-rose-700'
                            : pol.status === 'DUE_SOON'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {pol.status === 'GRACE_PERIOD'
                          ? t(`Grace Ends ${pol.graceEndsIso}`, conv(`寬限期至 ${pol.graceEndsIso}`))
                          : pol.status === 'DUE_SOON'
                          ? t(`Due Soon ${pol.nextDueDateIso}`, conv(`即將到期 ${pol.nextDueDateIso}`))
                          : t(`Active · ${pol.nextDueDateIso}`, conv(`正常生效 · ${pol.nextDueDateIso}`))}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          data-testid={`export-renewal-ics-${pol.id}`}
                          onClick={() => handleDownloadPolicyIcs(pol)}
                          className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50/70 px-2.5 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100 whitespace-nowrap shrink-0"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t('.ics Reminder', conv('.ics 日曆提醒'))}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyRenewalWhatsApp(pol)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t('WhatsApp Notice', conv('複製續保通知'))}</span>
                        </button>
                        {pol.status !== 'ACTIVE' && (
                          <button
                            type="button"
                            data-testid={`mark-renewed-${pol.id}`}
                            onClick={() => handleMarkPolicyRenewed(pol.id)}
                            className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                          >
                            {t('Mark Paid', conv('確認已續保'))}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* #2 Claims Concierge & Private Hospital Cashless LOG Kanban */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t(
                  '02. Claims Concierge & Private Hospital Cashless LOG Tracker',
                  conv('02. 私家醫院入院前免找數預批 (LOG) 與理賠進度看板')
                )}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {t(
                  'Track pre-admission LOG approval, attending doctor reports, insurer assessment, and FPS payout.',
                  conv('一站式跟進客戶私院免按金預批、主診醫生報告核對、保司理賠審批與 FPS 入賬進度。')
                )}
              </p>
            </div>
          </div>

          {/* Quick New Claim Form */}
          <form
            onSubmit={handleCreateClaimCase}
            className="grid grid-cols-1 gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 sm:grid-cols-4"
          >
            <select
              aria-label="Select private hospital"
              value={newClaimHospital}
              onChange={(e) => setNewClaimHospital(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900"
            >
              <option value="養和醫院 (跑馬地)">養和醫院 HKSH</option>
              <option value="港怡醫院 (黃竹坑)">港怡醫院 Gleneagles</option>
              <option value="仁安醫院 (大圍)">仁安醫院 Union Hospital</option>
              <option value="聖保祿醫院 (銅鑼灣)">聖保祿醫院 St. Paul&apos;s</option>
            </select>
            <input
              type="text"
              aria-label="Surgical procedure or diagnosis"
              value={newClaimDiagnosis}
              onChange={(e) => setNewClaimDiagnosis(e.target.value)}
              placeholder={t(
                `Procedure / Diagnosis for ${activeLead.fullNameEn}...`,
                conv(`輸入 ${activeLead.fullNameZh} 擬進行手術或診斷...`)
              )}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
            />
            <input
              type="number"
              aria-label="Estimated claim amount HKD"
              value={newClaimAmount}
              onChange={(e) => setNewClaimAmount(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 tabular-nums"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0B172A] px-3 py-2 text-xs font-semibold text-[#F3D37A] hover:bg-slate-900 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('Open LOG Claim', conv('新增免找數理賠'))}</span>
            </button>
          </form>

          {/* 4-Stage Kanban Grid */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            {CLAIM_STAGE_ORDER.map((stageKey) => {
              const stageCases = claimCases.filter((c) => c.stage === stageKey);
              const labelObj = CLAIM_STAGE_LABELS[stageKey];
              return (
                <div
                  key={stageKey}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-xs font-bold text-slate-800">
                    <span>{lang === 'en' ? labelObj.en : conv(labelObj.zh)}</span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {stageCases.length}
                    </span>
                  </div>
                  {stageCases.length === 0 ? (
                    <p className="py-4 text-center text-[11px] text-slate-400">
                      {t('No cases in this stage', conv('此階段暫無個案'))}
                    </p>
                  ) : (
                    stageCases.map((clm) => (
                      <div
                        key={clm.id}
                        data-testid={`claim-card-${clm.id}`}
                        className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 tabular-nums">
                          <span>{clm.claimNumber}</span>
                          <span>{clm.policyId}</span>
                        </div>
                        <div className="text-xs font-bold text-slate-900">
                          {clm.clientNameZh} · {conv(clm.hospitalNameZh)}
                        </div>
                        <div className="text-[11px] text-slate-600">{conv(clm.diagnosisZh)}</div>
                        <div className="font-mono text-xs font-bold text-teal-800 tabular-nums">
                          Est. HK$ {clm.estimatedClaimHkd.toLocaleString()}
                        </div>
                        <div className="space-y-1 pt-1 border-t border-slate-100">
                          {clm.checklist.map((item) => (
                            <label
                              key={item.id}
                              className="flex items-start gap-1.5 text-[11px] text-slate-700 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={item.done}
                                onChange={() => handleToggleClaimChecklist(clm.id, item.id)}
                                className="mt-0.5 rounded border-slate-300"
                              />
                              <span className={item.done ? 'line-through text-slate-400' : ''}>
                                {lang === 'en' ? item.itemEn : conv(item.itemZh)}
                              </span>
                            </label>
                          ))}
                        </div>
                        {clm.stage !== 'SETTLED' && (
                          <button
                            type="button"
                            data-testid={`advance-claim-${clm.id}`}
                            onClick={() => handleAdvanceClaimStage(clm.id)}
                            className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
                          >
                            <span>{t('Advance Next Stage', conv('推進至下一階段'))}</span>
                            <ArrowRight className="h-3 w-3" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* #3 Multi-Currency Policy Servicing & Endorsement Wizard */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {t(
                '03. Multi-Currency Policy Servicing & Endorsement Wizard',
                conv('03. 多元貨幣轉換、保單分拆及更換受保人售後批註中心')
              )}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {t(
                'Generate structured policy servicing endorsements for Currency Switch, Policy Split, Change of Insured, or Contingent Owner.',
                conv('一鍵建立轉貨幣行使、保單分拆、無限次更換受保人或委任後備持有人之標準批註申請紀錄。')
              )}
            </p>
          </div>

          <form
            onSubmit={handleSubmitEndorsement}
            className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 lg:grid-cols-4"
          >
            <select
              aria-label="Select target policy ID for endorsement"
              value={endorsePolicyId}
              onChange={(e) => setEndorsePolicyId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs text-slate-900"
            >
              {inForcePolicies.map((p) => (
                <option key={p.id} value={p.policyId}>
                  {p.policyId} · {p.clientNameZh}
                </option>
              ))}
            </select>

            <select
              aria-label="Select policy endorsement type"
              value={endorseType}
              onChange={(e) => setEndorseType(e.target.value as PolicyEndorsementType)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900"
            >
              {(Object.keys(ENDORSEMENT_TYPE_LABELS) as PolicyEndorsementType[]).map((k) => (
                <option key={k} value={k}>
                  {lang === 'en' ? ENDORSEMENT_TYPE_LABELS[k].en : conv(ENDORSEMENT_TYPE_LABELS[k].zh)}
                </option>
              ))}
            </select>

            <input
              type="text"
              aria-label="Endorsement instruction details"
              value={endorseDetail}
              onChange={(e) => setEndorseDetail(e.target.value)}
              placeholder={t(
                'e.g. Switch USD 100% -> HKD at Yr 3 anniversary...',
                conv('例如：於第 3 保單週年日將 100% USD 保單價值轉換為 HKD...')
              )}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
            />

            <button
              type="submit"
              data-testid="submit-endorsement-btn"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('Submit Endorsement', conv('遞交售後批註'))}</span>
            </button>
          </form>

          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {endorsements.map((end) => (
              <div
                key={end.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-900">
                    <span className="font-mono">{end.referenceNo}</span> ·{' '}
                    <span className="font-mono text-blue-700">{end.policyId}</span> ·{' '}
                    {end.clientNameZh} ·{' '}
                    {lang === 'en'
                      ? ENDORSEMENT_TYPE_LABELS[end.endorsementType].en
                      : conv(ENDORSEMENT_TYPE_LABELS[end.endorsementType].zh)}
                  </div>
                  <div className="text-slate-600">{conv(end.detailSummaryZh)}</div>
                </div>
                <div className="font-mono text-[11px] font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
                  {end.status} · {end.effectiveDateIso}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // ==========================================================================
  // RENDER MODE 2: STAGE 05D HKIA CPD, AUDIT DOSSIER & AGENCY TEAM HANDOVER
  // ==========================================================================
  const visibleHandovers =
    handoverRoleFilter === 'ALL'
      ? agencyHandovers
      : agencyHandovers.filter(
          (h) => h.toRole === handoverRoleFilter || h.fromRole === handoverRoleFilter
        );

  return (
    <div data-testid="stage5d-compliance-governance" className="space-y-6">
      {/* #11 1-Click HKIA Inspection Audit Dossier Export */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>
                {t(
                  `01. 1-Click HKIA Regulatory Inspection Audit Dossier (${auditDossier.dossierId})`,
                  conv(`01. 一鍵匯出香港保監局合規查冊審計卷宗 (${auditDossier.dossierId})`)
                )}
              </span>
            </h2>
            <p className="text-xs text-slate-600">
              {t(
                'Compiles KYC/MCV verification, Policy IDs, GL30 FNA affordability, CP10 non-replacement, Client Notes & WhatsApp audit trail into a 7-year compliant PDF.',
                conv(
                  '自動彙整客戶身份證／MCV 入境標籤核實、關聯保單編號、GL30 負擔能力比率、CP10 轉保審核、顧問會面筆記及 WhatsApp 留痕成單一查冊 PDF。'
                )
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              aria-label="Select client for HKIA audit dossier"
              value={activeLead.id}
              onChange={(e) => onSelectLeadId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900"
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.fullNameZh} ({l.fullNameEn})
                </option>
              ))}
            </select>

            <button
              type="button"
              data-testid="export-hkia-dossier-pdf-btn"
              disabled={exportingDossier}
              onClick={handleExportAuditDossierPdf}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/70 bg-[#0B172A] px-3.5 py-2 text-xs font-semibold text-[#F3D37A] hover:bg-slate-900 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {exportingDossier
                  ? t('Compiling PDF...', conv('正在生成查冊 PDF...'))
                  : t('Download Audit Dossier PDF', conv('下載保監查冊卷宗 PDF'))}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportAuditDossierJson}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('Export JSON', conv('匯出 JSON 封存'))}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5">
            <div className="font-bold text-slate-900">
              {auditDossier.clientNameZh} ({auditDossier.clientNameEn}) · {auditDossier.residencyLabel}
            </div>
            <div className="font-mono text-slate-600 tabular-nums">
              Policy IDs: {auditDossier.policyIds.join(' · ')}
            </div>
            <div className="text-slate-700">{conv(auditDossier.kycStatusLine)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5">
            <div className="font-bold text-emerald-800">{conv(auditDossier.complianceVerdictLine)}</div>
            <div className="text-slate-700">{conv(auditDossier.gl30FnaSummaryLine)}</div>
            <div className="text-slate-600">{conv(auditDossier.cp10ReplacementLine)}</div>
          </div>
        </div>
      </section>

      {/* #10 HKIA License Renewal & 15-Hour CPD Tracker */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Award className="h-4 w-4 text-slate-800 shrink-0" aria-hidden="true" />
              <span>
                {t(
                  `02. HKIA License (${intermediary.iaLicenseNo}) Renewal & 15-Hour CPD Tracker`,
                  conv(`02. 保監局持牌人 (${intermediary.iaLicenseNo}) 週年續牌與 15 小時 CPD 學分追蹤`)
                )}
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {t(
                'Statutory requirement: >= 15 total CPD hours per assessment year, including >= 3 hours in Ethics or Regulations.',
                conv('法定要求：每個評估年度須完成不少於 15 小時 CPD 培訓，當中須包含不少於 3 小時「道德或規例」必修範疇。')
              )}
            </p>
          </div>
          <div className="font-mono text-xs font-bold tabular-nums">
            {cpdStatus.isFullyCompliant ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>{t('15h + 3h Ethics Met', conv('本年度 CPD 已全面達標'))}</span>
              </span>
            ) : (
              <span className="text-amber-800">
                {t(
                  `${cpdStatus.completedTotalHours} / 15h Total · ${cpdStatus.completedEthicsHours} / 3h Ethics`,
                  conv(
                    `已完成 ${cpdStatus.completedTotalHours} / 15 小時（道德規例 ${cpdStatus.completedEthicsHours} / 3 小時）`
                  )
                )}
              </span>
            )}
          </div>
        </div>

        {/* Dual Progress Bars */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-700 tabular-nums">
              <span>{t('Total Annual CPD Hours', conv('總持續專業培訓時數'))}</span>
              <span className="font-mono">
                {cpdStatus.completedTotalHours} / {cpdStatus.totalRequiredHours} hrs
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                style={{ width: `${cpdStatus.completionPct}%` }}
                className="h-full bg-[#0B172A]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-700 tabular-nums">
              <span>{t('Mandatory Ethics / Regulations (>= 3h)', conv('道德或規例必修時數 (>= 3 小時)'))}</span>
              <span className="font-mono">
                {cpdStatus.completedEthicsHours} / {cpdStatus.ethicsRequiredHours} hrs
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((cpdStatus.completedEthicsHours / cpdStatus.ethicsRequiredHours) * 100)
                  )}%`,
                }}
                className="h-full bg-emerald-600"
              />
            </div>
          </div>
        </div>

        <form
          onSubmit={handleAddCpdCourse}
          className="grid grid-cols-1 gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 sm:grid-cols-4"
        >
          <input
            type="text"
            aria-label="CPD course title"
            value={cpdTitle}
            onChange={(e) => setCpdTitle(e.target.value)}
            placeholder={t('Enter accredited CPD seminar title...', conv('輸入保監局認可 CPD 課程名稱...'))}
            className="sm:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
          />
          <div className="flex items-center gap-2">
            <select
              aria-label="CPD category"
              value={cpdCategory}
              onChange={(e) => setCpdCategory(e.target.value as HkiaCpdCategory)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900"
            >
              <option value="ETHICS_REGULATION">{t('Ethics / Regs', conv('道德／規例'))}</option>
              <option value="TECHNICAL_ACTUARIAL">{t('Technical', conv('產品／精算'))}</option>
            </select>
            <input
              type="number"
              aria-label="CPD hours"
              min={0.5}
              max={15}
              step={0.5}
              value={cpdHours}
              onChange={(e) => setCpdHours(e.target.value)}
              className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs text-slate-900 tabular-nums"
            />
          </div>
          <button
            type="submit"
            data-testid="add-cpd-course-btn"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('Log CPD Hours', conv('新增 CPD 紀錄'))}</span>
          </button>
        </form>

        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-xs">
          {cpdEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
            >
              <div>
                <span className="font-semibold text-slate-900">
                  {lang === 'en' ? entry.titleEn : conv(entry.titleZh)}
                </span>
                <span className="ml-2 text-slate-500">
                  · {entry.provider} · {entry.certificateRef}
                </span>
              </div>
              <div className="font-mono font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                {entry.hours}h ·{' '}
                {entry.category === 'ETHICS_REGULATION'
                  ? t('Ethics', conv('道德規例'))
                  : t('Technical', conv('精算實務'))}{' '}
                · {entry.completedDateIso}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* #12 Agency Cloud Sync & Multi-Role Case Handover */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Users className="h-4 w-4 text-slate-800 shrink-0" aria-hidden="true" />
              <span>
                {t(
                  '03. Agency Multi-Role Case Handover & Cloud Sync (Advisor ⇄ UW ⇄ Compliance)',
                  conv('03. 團隊跨職能個案交接與雲端同步看板（顧問 ⇄ 核保助理 ⇄ 合規主管）')
                )}
              </span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(['ALL', 'ADVISOR', 'UW_ASSISTANT', 'COMPLIANCE_OFFICER'] as const).map((rk) => (
              <button
                key={rk}
                type="button"
                onClick={() => setHandoverRoleFilter(rk)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                  handoverRoleFilter === rk
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {rk === 'ALL'
                  ? t('All Roles', conv('全部角色'))
                  : lang === 'en'
                  ? ROLE_LABELS[rk].en
                  : conv(ROLE_LABELS[rk].zh)}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleAddHandover}
          className="grid grid-cols-1 gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 sm:grid-cols-4"
        >
          <select
            aria-label="Assign handover to team role"
            value={newHoToRole}
            onChange={(e) => setNewHoToRole(e.target.value as AgencyTeamRole)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900"
          >
            <option value="UW_ASSISTANT">{conv(ROLE_LABELS.UW_ASSISTANT.zh)}</option>
            <option value="COMPLIANCE_OFFICER">{conv(ROLE_LABELS.COMPLIANCE_OFFICER.zh)}</option>
            <option value="ADVISOR">{conv(ROLE_LABELS.ADVISOR.zh)}</option>
          </select>

          <input
            type="text"
            aria-label="Handover task summary"
            value={newHoTask}
            onChange={(e) => setNewHoTask(e.target.value)}
            placeholder={t(
              `Handover instruction for ${activeLead.fullNameEn}...`,
              conv(`輸入 ${activeLead.fullNameZh} 的核保補件或合規簽批交接事項...`)
            )}
            className="sm:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
          />

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={newHoUrgent}
                onChange={(e) => setNewHoUrgent(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>{t('Urgent', conv('急件'))}</span>
            </label>
            <button
              type="submit"
              data-testid="assign-handover-btn"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0B172A] px-3 py-2 text-xs font-semibold text-[#F3D37A] hover:bg-slate-900 whitespace-nowrap shrink-0"
            >
              <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('Assign & Sync', conv('指派並同步'))}</span>
            </button>
          </div>
        </form>

        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-xs">
          {visibleHandovers.map((ho) => (
            <div
              key={ho.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-900">
                  {ho.clientNameZh} · <span className="font-mono text-blue-700">{ho.policyOrRefId}</span>{' '}
                  · {conv(ROLE_LABELS[ho.fromRole].zh)} → {conv(ROLE_LABELS[ho.toRole].zh)}
                  {ho.priority === 'URGENT' && (
                    <span className="ml-2 font-mono text-rose-700">
                      [{t('URGENT', conv('急件'))}]
                    </span>
                  )}
                </div>
                <div className="text-slate-600">{conv(ho.taskSummaryZh)}</div>
              </div>
              <button
                type="button"
                onClick={() => handleCycleHandoverStatus(ho.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                  ho.status === 'DONE'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : ho.status === 'IN_PROGRESS'
                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                <span>{ho.status}</span>
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
