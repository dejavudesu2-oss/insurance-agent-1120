import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  FolderUp,
  HeartPulse,
  Lock,
  PenTool,
  RotateCcw,
  Send,
  ShieldCheck,
  Tablet,
  UserCheck,
} from 'lucide-react';
import {
  calculateCompliantQuote,
  evaluateHkiaCompliance,
  FX_RATES_FROM_USD,
} from '../domain/actuarialEngine';
import { UnifiedDealValuation } from '../domain/dealCaseEngine';
import { deriveProposalSummarySectionsForBoughtPlans } from '../domain/guidedWorkflowEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  evaluateGl30AffordabilityGauge,
  evaluateMcvCrossBorderReadiness,
  evaluateQuickHealthTriage,
  HEALTH_IMPAIRMENT_OPTIONS,
  STP_STATUTORY_DOCUMENTS_EXPLAINER,
} from '../domain/proEnhancementsEngine';
import {
  ClientLead,
  CurrencyCode,
  HealthImpairmentCode,
  InsurancePlan,
  IntermediaryProfile,
  LeadStage,
  McvCrossBorderChecklist,
  PolicyApplicationRecord,
} from '../domain/types';
import {
  generateStpPolicyPdfBytes,
  triggerBrowserDownload,
} from '../services/pdfGenerator';
import { scrollToElementSmooth } from '../utils/clipboardAndDom';
import { LifelongCashValueCurveSvg } from './VisualCharts';

interface AutoPolicyStpViewProps {
  intermediary: IntermediaryProfile;
  leads: ClientLead[];
  plans: InsurancePlan[];
  selectedLeadId: string;
  onSelectLeadId: (id: string) => void;
  onUpdateLead?: (leadId: string, updater: (prev: ClientLead) => ClientLead) => void;
  selectedPlanId: string;
  onSelectPlanId: (id: string) => void;
  currency: CurrencyCode;
  onChangeCurrency: (curr: CurrencyCode) => void;
  sumAssuredUsd: number;
  onChangeSumAssuredUsd: (usd: number) => void;
  paymentTermYears: number;
  onChangePaymentTermYears: (yrs: number) => void;
  applications: PolicyApplicationRecord[];
  onRecordApplication: (app: PolicyApplicationRecord, updatedStage: LeadStage) => void;
  onFixComplianceInCrm: (type: 'fna' | 'ocr', leadId: string) => void;
  onVerifyIamSmartLead?: (leadId: string) => void;
  onSavePolicyPdfToDrive: (
    appRecord: PolicyApplicationRecord,
    pdfBytes: Uint8Array
  ) => Promise<void>;
  driveConnected: boolean;
  canShowDrive?: boolean;
  unifiedDeal?: UnifiedDealValuation;
  fxRateStamp?: string;
  expressMeetingMode?: boolean;
  onJumpToMarketPlans?: () => void;
  onNotify?: (msg: string, tone?: 'success' | 'warning') => void;
}

export const AutoPolicyStpView: React.FC<AutoPolicyStpViewProps> = ({
  intermediary,
  leads,
  plans,
  selectedLeadId,
  onSelectLeadId,
  onUpdateLead,
  selectedPlanId,
  onSelectPlanId,
  currency,
  onChangeCurrency,
  sumAssuredUsd,
  onChangeSumAssuredUsd,
  paymentTermYears,
  onChangePaymentTermYears,
  applications,
  onRecordApplication,
  onFixComplianceInCrm,
  onVerifyIamSmartLead,
  onSavePolicyPdfToDrive,
  driveConnected,
  canShowDrive = false,
  unifiedDeal,
  fxRateStamp,
  expressMeetingMode = false,
  onJumpToMarketPlans,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const [presentationMode, setPresentationMode] = useState(false);
  const [bundleStage3Riders, setBundleStage3Riders] = useState(true);
  const [showLifelongCurve, setShowLifelongCurve] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [advisorWitnessConfirmed, setAdvisorWitnessConfirmed] = useState(true);
  const [checkedDocIds, setCheckedDocIds] = useState<Record<string, boolean>>({
    DOC_GL28_BI: true,
    DOC_GL30_FNA: true,
    DOC_INSURER_EAPP: true,
  });
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [uploadingAppId, setUploadingAppId] = useState<string | null>(null);
  const [latestGeneratedApp, setLatestGeneratedApp] =
    useState<PolicyApplicationRecord | null>(null);
  const [iamSmartSyncedIds, setIamSmartSyncedIds] = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const pdfCacheRef = useRef<Record<string, Uint8Array>>({});

  const activeLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || leads[0],
    [leads, selectedLeadId]
  );

  // Explicit bought plan strictly resolved without fake fallback for displaying Official Proposal Summary
  const explicitBoughtPlan = useMemo(
    () =>
      unifiedDeal?.anchorPlan ||
      (selectedPlanId ? plans.find((p) => p.id === selectedPlanId) || null : null),
    [unifiedDeal?.anchorPlan, selectedPlanId, plans]
  );

  const proposalSummarySpec = useMemo(
    () =>
      deriveProposalSummarySectionsForBoughtPlans({
        anchorPlan: explicitBoughtPlan,
        comboSecondaryPlans: unifiedDeal?.comboSecondaryPlans || [],
        selectedRiderIds: unifiedDeal?.selectedRiderIds || [],
      }),
    [explicitBoughtPlan, unifiedDeal?.comboSecondaryPlans, unifiedDeal?.selectedRiderIds]
  );

  const activePlan = useMemo(
    () => explicitBoughtPlan || plans[0],
    [explicitBoughtPlan, plans]
  );

  const fx = FX_RATES_FROM_USD[currency];
  const displaySumAssured = Math.round(sumAssuredUsd * fx);
  const effectiveTerm = activePlan.supportedPaymentTerms.includes(paymentTermYears)
    ? paymentTermYears
    : activePlan.supportedPaymentTerms[activePlan.supportedPaymentTerms.length - 1];

  const baseQuote = useMemo(
    () =>
      calculateCompliantQuote({
        plan: activePlan,
        age: activeLead.age,
        isSmoker: activeLead.isSmoker,
        currency,
        sumAssuredInSelectedCurrency: displaySumAssured,
        paymentTermYears: effectiveTerm,
      }),
    [activePlan, activeLead, currency, displaySumAssured, effectiveTerm]
  );

  const hasCartRiders = Boolean(
    unifiedDeal &&
      (unifiedDeal.selectedRiderIds.length > 0 || unifiedDeal.comboSecondaryPlans.length > 0)
  );
  const useBundledCartPricing = Boolean(bundleStage3Riders && unifiedDeal && hasCartRiders);

  const quote = useMemo(() => {
    if (!useBundledCartPricing || !unifiedDeal) return baseQuote;
    const sim = unifiedDeal.bundleSim;
    const bundledAnnualInCurr =
      currency === 'HKD'
        ? sim.netAnnualPremiumHkd
        : currency === 'RMB'
        ? sim.netAnnualPremiumRmb
        : sim.netAnnualPremiumUsd;
    return {
      ...baseQuote,
      annualPremium: bundledAnnualInCurr,
      monthlyEquivalent: Math.round(bundledAnnualInCurr / 12),
      totalPremiumsPaid: bundledAnnualInCurr * baseQuote.paymentTermYears,
    };
  }, [baseQuote, useBundledCartPricing, unifiedDeal, currency]);

  const annualPremiumHkdEquivalent = useMemo(() => {
    if (currency === 'HKD') return quote.annualPremium;
    if (currency === 'USD') return Math.round(quote.annualPremium * 7.8);
    return Math.round(quote.annualPremium / 0.92);
  }, [currency, quote.annualPremium]);

  const compliance = useMemo(
    () =>
      evaluateHkiaCompliance({
        intermediary,
        lead: activeLead,
        plan: activePlan,
        quote,
      }),
    [intermediary, activeLead, activePlan, quote]
  );

  // #14 Formal HKIA GL30 Affordability Gauge
  const affordability = useMemo(
    () => evaluateGl30AffordabilityGauge(activeLead, annualPremiumHkdEquivalent),
    [activeLead, annualPremiumHkdEquivalent]
  );

  // #15 Pre-Underwriting Medical Impairment Triage
  const healthTriage = useMemo(
    () => evaluateQuickHealthTriage(activeLead.healthTriageCode, activePlan.category),
    [activeLead.healthTriageCode, activePlan.category]
  );

  // #16 Automated MCV Cross-Border Checklist
  const mcvChecklistState = useMemo(
    () => evaluateMcvCrossBorderReadiness(activeLead),
    [activeLead]
  );

  const allThreeDocsChecked = STP_STATUTORY_DOCUMENTS_EXPLAINER.every(
    (d) => checkedDocIds[d.id]
  );

  const toggleStatutoryDoc = (docId: string) => {
    setCheckedDocIds((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

  const handleChangeHealthTriage = (nextCode: HealthImpairmentCode) => {
    onUpdateLead?.(activeLead.id, (prev) => ({
      ...prev,
      healthTriageCode: nextCode,
    }));
  };

  const handleToggleMcvItem = (key: keyof McvCrossBorderChecklist) => {
    onUpdateLead?.(activeLead.id, (prev) => {
      const current = evaluateMcvCrossBorderReadiness(prev).checklist;
      const nextVal = !current[key];
      return {
        ...prev,
        mcvChecklist: {
          ...current,
          [key]: nextVal,
        },
        kycCheck:
          key === 'landingSlipVerified'
            ? { ...prev.kycCheck, mcvEntrySlipVerified: nextVal }
            : prev.kycCheck,
      };
    });
  };

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pt = getCanvasPoint(e);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    isDrawingRef.current = true;
    setHasSigned(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pt = getCanvasPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSigned(false);
  };

  const applySampleSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(60, 95);
    ctx.bezierCurveTo(110, 35, 165, 115, 215, 62);
    ctx.bezierCurveTo(255, 28, 290, 102, 355, 70);
    ctx.stroke();

    ctx.font = 'italic 600 22px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(`${activeLead.fullNameEn} ${activeLead.fullNameZh}`, 65, 122);
    setHasSigned(true);
    onNotify?.(
      t(
        `Applied applicant signature for ${activeLead.fullNameEn}. Ready to stamp PDF & submit!`,
        conv(`已簽入投保人「${activeLead.fullNameZh}」示範簽名，現可點擊下方按鈕完成遞交並下載建議書 PDF！`)
      ),
      'success'
    );
  };

  const handleGenerateStpPolicy = async () => {
    if (!compliance.canSubmitStp) {
      onNotify?.(
        t(
          'Please clear the red HKIA compliance item on the left (e.g., GL30 FNA or MCV Landing Slip) first.',
          conv('請先完成左側紅色保監局合規待辦事項（如補簽 GL30 或驗證入境標籤）後再遞交。')
        ),
        'warning'
      );
      return;
    }
    if (!allThreeDocsChecked || !advisorWitnessConfirmed) {
      onNotify?.(
        t(
          'Please tick all 3 statutory client declarations and the Advisor Witness box before submitting.',
          conv('請先勾選確認全部 3 份保監局法定聲明文件及「持牌顧問見證」確認格。')
        ),
        'warning'
      );
      return;
    }
    if (!hasSigned) {
      scrollToElementSmooth('stp-signature-pad-box', 'center');
      onNotify?.(
        t(
          'Applicant signature required: please sign in the Applicant Pad (or click "1-Click Demo Signature").',
          conv('投保人尚未簽名：請於下方「投保人親筆簽署欄」簽署（或點選「一鍵示範簽名」）。')
        ),
        'warning'
      );
      return;
    }

    setGeneratingPdf(true);
    try {
      const referenceNo = `HK-STP-${String(Date.now()).slice(-6)}`;
      const signatureDataUrl = canvasRef.current?.toDataURL('image/png') || '';

      const pdfBytes = await generateStpPolicyPdfBytes({
        referenceNo,
        intermediary,
        lead: activeLead,
        plan: activePlan,
        quote,
        compliance,
        signatureDataUrl,
      });

      const status =
        activePlan.submissionChannel === 'OPEN_API_INSTANT' && healthTriage.instantIssueAllowed
          ? 'INSTANT_ISSUED'
          : 'SUBMITTED_UNDERWRITING';

      const comboNames =
        unifiedDeal && unifiedDeal.comboSecondaryPlans.length > 0
          ? unifiedDeal.comboSecondaryPlans.map((p) => `[${p.insurerCode}] ${p.nameZh}`)
          : [];
      const riderNames =
        useBundledCartPricing && unifiedDeal ? unifiedDeal.attachedRiderNamesZh : [];
      const mergedExtras = [...comboNames, ...riderNames];
      const riderSummaryStr = mergedExtras.length > 0 ? mergedExtras.join(' ＋ ') : undefined;

      const appRecord: PolicyApplicationRecord = {
        id: `app-${Date.now()}`,
        referenceNo,
        leadId: activeLead.id,
        clientNameEn: activeLead.fullNameEn,
        clientNameZh: activeLead.fullNameZh,
        whatsappPhone: activeLead.whatsappPhone,
        planId: activePlan.id,
        insurerCode: activePlan.insurerCode,
        planNameEn: activePlan.nameEn,
        planNameZh: activePlan.nameZh,
        currency,
        sumAssured: displaySumAssured,
        paymentTermYears: quote.paymentTermYears,
        annualPremium: quote.annualPremium,
        bundledRiderSummary: riderSummaryStr,
        effectiveIrrPercent: quote.effectiveIllustratedIrrPercent,
        intermediaryLicenseNo: intermediary.iaLicenseNo,
        signatureDataUrl,
        status,
        submissionChannel: activePlan.submissionChannel,
        createdAtIso: new Date().toISOString(),
      };

      pdfCacheRef.current[appRecord.id] = pdfBytes;
      onRecordApplication(
        appRecord,
        status === 'INSTANT_ISSUED' ? LeadStage.IN_FORCE : LeadStage.UNDERWRITING
      );
      setLatestGeneratedApp(appRecord);
      onNotify?.(
        t(
          `Signed Proposal & e-Application ${referenceNo} submitted for ${activeLead.fullNameEn}!`,
          conv(`已完成雙簽並遞交「${activeLead.fullNameZh}」投保申請及利益說明書 (${referenceNo})！`)
        ),
        'success'
      );
    } finally {
      setGeneratingPdf(false);
    }
  };

  const getOrBuildPdfForApp = async (
    appRecord: PolicyApplicationRecord
  ): Promise<Uint8Array> => {
    if (pdfCacheRef.current[appRecord.id]) {
      return pdfCacheRef.current[appRecord.id];
    }
    const lead = leads.find((l) => l.id === appRecord.leadId) || activeLead;
    const plan = plans.find((p) => p.id === appRecord.planId) || activePlan;
    const q = calculateCompliantQuote({
      plan,
      age: lead.age,
      isSmoker: lead.isSmoker,
      currency: appRecord.currency,
      sumAssuredInSelectedCurrency: appRecord.sumAssured,
      paymentTermYears: appRecord.paymentTermYears,
    });
    const comp = evaluateHkiaCompliance({ intermediary, lead, plan, quote: q });
    const bytes = await generateStpPolicyPdfBytes({
      referenceNo: appRecord.referenceNo,
      intermediary,
      lead,
      plan,
      quote: q,
      compliance: comp,
      signatureDataUrl: appRecord.signatureDataUrl,
    });
    pdfCacheRef.current[appRecord.id] = bytes;
    return bytes;
  };

  const handleDownloadPdf = async (appRecord: PolicyApplicationRecord) => {
    const bytes = await getOrBuildPdfForApp(appRecord);
    triggerBrowserDownload(`${appRecord.referenceNo}_${appRecord.insurerCode}.pdf`, bytes, 'application/pdf');
  };

  const handleUploadDrive = async (appRecord: PolicyApplicationRecord) => {
    setUploadingAppId(appRecord.id);
    try {
      const bytes = await getOrBuildPdfForApp(appRecord);
      await onSavePolicyPdfToDrive(appRecord, bytes);
    } finally {
      setUploadingAppId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* EXECUTIVE SIGN-OFF HERO & PLAIN-LANGUAGE EXPLAINER */}
      <section
        data-testid="stp-signoff-explainer-banner"
        className="vh-harbour-panel overflow-hidden rounded-2xl p-5 sm:p-6 shadow-md space-y-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-1.5">
            <p className="font-mono text-[11px] font-semibold tracking-wider text-[#F3D37A] uppercase">
              {t(
                'STAGE 05A · PROPOSAL CONFIRMATION & E-SIGNATURE',
                conv('第 05A 步 · 確認建議書內容與電子簽署')
              )}
            </p>
            <h1
              className="text-xl font-bold tracking-tight text-white sm:text-2xl"
              style={{ textWrap: 'balance' }}
            >
              {t(
                '05A. Proposal Confirmation & Insurer Submission',
                conv('05A. 投保確認與電子簽署遞交')
              )}
            </h1>
            <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
              {t(
                'Review the final coverage and premium with your client, confirm the 3 required HKIA declarations, and sign on-screen to generate a stamped bilingual Proposal PDF and submit to underwriting.',
                conv(
                  '同客戶核對清楚保障項目及保費後，一齊勾選確認 3 份保監局規定聲明並完成電子雙簽，即可生成附簽名嘅雙語建議書 PDF 並遞交保險公司核保。'
                )
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPresentationMode((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              presentationMode
                ? 'border-[#D4AF37] bg-[#D4AF37] text-[#060D18]'
                : 'border-[#D4AF37]/50 bg-[#060D18] text-[#F3D37A] hover:bg-[#102038]'
            }`}
          >
            <Tablet className="h-4 w-4" aria-hidden="true" />
            <span>
              {presentationMode
                ? t('Exit Client Sign-Off View', conv('退出客戶面對面簽署模式'))
                : t('PC / iPad Client Sign-Off Mode', conv('開啟 PC／iPad 面對面簽署模式'))}
            </span>
          </button>
        </div>

        {/* Clear 3-Step Visual Sign-Off Strip */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700/80 bg-[#060D18]/85 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-[#F3D37A]">
                {t('STEP 1 · VERIFY PACKAGE', conv('第 1 步 · 核對方案與資格'))}
              </span>
              <span className="font-mono text-[11px] text-emerald-400">
                {compliance.canSubmitStp ? t('Cleared', conv('已就緒')) : t('Action Needed', conv('待補件'))}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              {t(
                'Confirm insured person, base plan + riders, GL30 affordability & health pre-check.',
                conv('確認受保人、主約＋組合附約保費、GL30 負擔能力及健康核保預篩。')
              )}
            </p>
          </div>

          <div className="rounded-xl border border-slate-700/80 bg-[#060D18]/85 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-[#F3D37A]">
                {t('STEP 2 · 3 STATUTORY DOCS', conv('第 2 步 · 勾選 3 份法定聲明'))}
              </span>
              <span className="font-mono text-[11px] text-teal-300 tabular-nums">
                {Object.values(checkedDocIds).filter(Boolean).length}/3 {t('Checked', conv('已勾選'))}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              {t(
                'Acknowledge (1) GL28 Benefit Illustration, (2) GL30 Suitability, (3) Insurer e-App.',
                conv('確認《利益說明書》、《GL30 財務需要分析》及《保司電子投保授權書》。')
              )}
            </p>
          </div>

          <div className="rounded-xl border border-slate-700/80 bg-[#060D18]/85 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-[#F3D37A]">
                {t('STEP 3 · DUAL E-SIGN & PDF', conv('第 3 步 · 雙重簽署並出單'))}
              </span>
              <span className="font-mono text-[11px] text-slate-300">
                {hasSigned ? t('Signed ✓', conv('已簽署 ✓')) : t('Awaiting Sign', conv('待簽署'))}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              {t(
                'Applicant signs + Advisor witnesses → Instant stamped A4 PDF + CRM auto-update.',
                conv('投保人簽名＋顧問見證加簽 → 即時下載壓印雙語 PDF 並更新核保進度。')
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Post-Submission Instant Confirmation Receipt Banner */}
      {latestGeneratedApp && (
        <section
          data-testid="stp-submission-receipt-banner"
          className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-5 space-y-3"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-bold text-emerald-950">
                  {t(
                    `Submission Confirmed · Reference ${latestGeneratedApp.referenceNo}`,
                    conv(`已完成簽署並成功遞交保司 · 投保編號 ${latestGeneratedApp.referenceNo}`)
                  )}
                </h2>
                <p className="mt-0.5 text-xs text-emerald-900">
                  {latestGeneratedApp.status === 'INSTANT_ISSUED'
                    ? t(
                        `[${latestGeneratedApp.insurerCode}] ${latestGeneratedApp.planNameEn} passed Straight-Through Underwriting and is now IN-FORCE. Download the signed PDF for the client's 21-day cooling-off records.`,
                        conv(
                          `「[${latestGeneratedApp.insurerCode}] ${latestGeneratedApp.planNameZh}」已通過標準健康體直通核保並即時生效（In-Force）！請下載已壓印簽名之雙語 PDF 發送予客戶留存（享 21 日冷靜期保障）。`
                        )
                      )
                    : t(
                        `Submitted to [${latestGeneratedApp.insurerCode}] Medical Underwriting Queue. Client CRM stage updated to Underwriting.`,
                        conv(
                          `已連同健康核保預篩資料直通傳送至「[${latestGeneratedApp.insurerCode}]」核保部審批，客戶 CRM 狀態已自動更新為「核保審批中」。`
                        )
                      )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadPdf(latestGeneratedApp)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-900 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Download Signed PDF', conv('下載已簽署雙語 PDF'))}</span>
              </button>
              {canShowDrive && (
                <button
                  type="button"
                  onClick={() => handleUploadDrive(latestGeneratedApp)}
                  disabled={uploadingAppId === latestGeneratedApp.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 whitespace-nowrap"
                >
                  <FolderUp className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {uploadingAppId === latestGeneratedApp.id
                      ? t('Uploading...', conv('上傳雲端中...'))
                      : driveConnected
                      ? t('Backup to Google Drive', conv('備份至 Google Drive'))
                      : t('Connect & Backup to Drive', conv('連接並備份至 Google Drive'))}
                  </span>
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* MAIN TWO-COLUMN WORKSPACE (PC & iPad Parity) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* LEFT COLUMN (5 cols): STEP 1 — PACKAGE CONFIGURATION, GL30 AFFORDABILITY, HEALTH TRIAGE & MCV CHECKLIST */}
        {!presentationMode && (
          <div className="space-y-5 md:col-span-5">
            {/* Card 1A: Insured Applicant & Final Package Selector */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900">
                  {t('1A. Applicant & Policy Package', conv('1A. 投保人與最終投保方案設定'))}
                </h2>
                <span className="font-mono text-[11px] font-semibold text-slate-500">
                  IA: {intermediary.iaLicenseNo}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="stp-lead-select" className="block text-xs font-semibold text-slate-700">
                    {t('Policyholder / Insured Client', conv('保單持有人／受保客戶'))}
                  </label>
                  <select
                    id="stp-lead-select"
                    value={activeLead.id}
                    onChange={(e) => {
                      onSelectLeadId(e.target.value);
                      clearSignature();
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                  >
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.fullNameZh} ({l.fullNameEn}) · {l.age}歲 ·{' '}
                        {l.residency === 'MCV' ? 'MCV 訪港客戶' : '香港居民'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="stp-plan-select" className="block text-xs font-semibold text-slate-700">
                    {t('Primary Base Insurance Plan', conv('主約保險計劃'))}
                  </label>
                  <select
                    id="stp-plan-select"
                    value={activePlan.id}
                    onChange={(e) => onSelectPlanId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                  >
                    {plans.map((p) => {
                      const canSell =
                        intermediary.appointedInsurers.includes('ALL') ||
                        intermediary.appointedInsurers.includes(p.insurerCode);
                      return (
                        <option key={p.id} value={p.id}>
                          [{p.insurerCode}] {p.nameZh} ({p.nameEn}) {canSell ? '✓' : '(僅供比對)'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {hasCartRiders && unifiedDeal && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bundleStage3Riders}
                        onChange={(e) => setBundleStage3Riders(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-900">
                          {t(
                            'Include Stage 02/03 Bundled Combo & Riders in Single Sign-Off',
                            conv('一併納入 02/03 步已選「多保單組合＋附約購物車」整併簽署')
                          )}
                        </span>
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          {[
                            ...unifiedDeal.comboSecondaryPlans.map(
                              (p) => `[${p.insurerCode}] ${p.nameZh}`
                            ),
                            ...unifiedDeal.attachedRiderNamesZh,
                          ].join(' ＋ ')}
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {!expressMeetingMode && (
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label htmlFor="stp-currency" className="block text-[11px] font-semibold text-slate-600">
                        {t('Currency', conv('保單貨幣'))}
                      </label>
                      <select
                        id="stp-currency"
                        value={currency}
                        onChange={(e) => onChangeCurrency(e.target.value as CurrencyCode)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900"
                      >
                        {(['USD', 'HKD', 'RMB'] as CurrencyCode[]).map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="stp-term" className="block text-[11px] font-semibold text-slate-600">
                        {t('Pay Term', conv('供款年期'))}
                      </label>
                      <select
                        id="stp-term"
                        value={effectiveTerm}
                        onChange={(e) => onChangePaymentTermYears(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900"
                      >
                        {activePlan.supportedPaymentTerms.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr} {t('Yrs', conv('年'))}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="stp-sa" className="block text-[11px] font-semibold text-slate-600">
                        {t(`Sum (${currency})`, conv(`保額 (${currency})`))}
                      </label>
                      <input
                        id="stp-sa"
                        type="number"
                        min={10000}
                        step={10000}
                        value={displaySumAssured}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v) && v >= 0) {
                            onChangeSumAssuredUsd(Math.round(v / fx));
                          }
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono text-xs font-semibold text-slate-900 tabular-nums"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Card 1B (#14): Formal HKIA GL30 Affordability & Suitability Gauge */}
            <section
              data-testid="gl30-affordability-gauge-card"
              className="rounded-xl border border-slate-200 bg-white p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  {t('1B. HKIA GL30 Affordability Check', conv('1B. 保監局 GL30 保費負擔能力評估'))}
                </h2>
                <span
                  className={`font-mono text-xs font-bold tabular-nums ${
                    affordability.status === 'GREEN_COMFORTABLE'
                      ? 'text-emerald-700'
                      : affordability.status === 'AMBER_STRETCH'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}
                >
                  {affordability.disposableRatioPct}% {t('of Surplus', conv('佔盈餘'))}
                </span>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  style={{ width: `${Math.min(100, affordability.disposableRatioPct)}%` }}
                  className={`h-full transition-all ${
                    affordability.status === 'GREEN_COMFORTABLE'
                      ? 'bg-emerald-600'
                      : affordability.status === 'AMBER_STRETCH'
                      ? 'bg-amber-500'
                      : 'bg-rose-600'
                  }`}
                />
              </div>

              <div className="text-xs font-bold text-slate-900">
                {lang === 'en' ? affordability.statusLabelEn : conv(affordability.statusLabelZh)}
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                {lang === 'en' ? affordability.advisoryNoteEn : conv(affordability.advisoryNoteZh)}
              </p>

              {/* Statutory Compliance Blockers & iAM Smart Quick Fix */}
              {compliance.blockingReasons.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  {compliance.blockingReasons.map((reason, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 space-y-2"
                    >
                      <div className="flex items-start gap-2 font-medium">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                        <span>{reason}</span>
                      </div>
                      {reason.includes('GL30') && (
                        <button
                          type="button"
                          onClick={() => onFixComplianceInCrm('fna', activeLead.id)}
                          className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800"
                        >
                          {t('Complete GL30 FNA Now →', conv('立即補簽 GL30 財務分析 →'))}
                        </button>
                      )}
                      {(reason.includes('MCV') || reason.includes('HKID')) && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onFixComplianceInCrm('ocr', activeLead.id)}
                            className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800"
                          >
                            {t('Scan ID / Landing Slip →', conv('掃描身份證／入境標籤 →'))}
                          </button>
                          {onVerifyIamSmartLead && (
                            <button
                              type="button"
                              onClick={() => {
                                onVerifyIamSmartLead(activeLead.id);
                                setIamSmartSyncedIds((prev) => [...prev, activeLead.id]);
                              }}
                              className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                            >
                              {iamSmartSyncedIds.includes(activeLead.id)
                                ? t('✓ iAM Smart Verified', conv('✓ 智方便已認證'))
                                : t('Verify via HKSAR iAM Smart', conv('一鍵「智方便」認證'))}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Card 1C (#15): Pre-Underwriting Medical Impairment Triage */}
            <section
              data-testid="stp-health-triage-card"
              className="rounded-xl border border-slate-200 bg-white p-5 space-y-3"
            >
              <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-teal-700" aria-hidden="true" />
                <h2 className="text-sm font-bold text-slate-900">
                  {t(
                    '1C. Pre-Underwriting Health Disclosure Triage',
                    conv('1C. 遞交前健康申報與核保預判分流')
                  )}
                </h2>
              </div>

              <select
                aria-label="Select applicant health disclosure status"
                value={activeLead.healthTriageCode || 'STANDARD_HEALTH'}
                onChange={(e) => handleChangeHealthTriage(e.target.value as HealthImpairmentCode)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-teal-600 focus:outline-none"
              >
                {HEALTH_IMPAIRMENT_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {lang === 'en' ? opt.labelEn : conv(opt.labelZh)}
                  </option>
                ))}
              </select>

              <div
                className={`rounded-lg border p-3 text-xs space-y-1.5 ${
                  healthTriage.instantIssueAllowed
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                    : 'border-amber-200 bg-amber-50/80 text-amber-950'
                }`}
              >
                <div className="font-bold">
                  {lang === 'en' ? healthTriage.verdictBadgeEn : conv(healthTriage.verdictBadgeZh)}
                </div>
                <p className="leading-relaxed">
                  {lang === 'en' ? healthTriage.expectedTermsEn : conv(healthTriage.expectedTermsZh)}
                </p>
                <div className="pt-1 font-mono text-[11px] opacity-90">
                  {t('Docs:', conv('所需文件：'))}{' '}
                  {lang === 'en' ? healthTriage.requiredDocsEn : conv(healthTriage.requiredDocsZh)}
                </div>
              </div>
            </section>

            {/* Card 1D (#16): Automated MCV Cross-Border Checklist (Only when client is MCV) */}
            {mcvChecklistState.applicable && (
              <section
                data-testid="stp-mcv-crossborder-checklist"
                className="rounded-xl border border-amber-300 bg-amber-50/40 p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    {t(
                      '1D. MCV Cross-Border Onshore Signing Checklist',
                      conv('1D. MCV 內地訪港客戶在港合規簽單清單')
                    )}
                  </h2>
                  <span className="font-mono text-xs font-bold text-amber-900 tabular-nums">
                    {mcvChecklistState.completedCount}/{mcvChecklistState.totalCount}
                  </span>
                </div>

                <div className="space-y-2">
                  {mcvChecklistState.items.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleToggleMcvItem(item.key)}
                      className={`flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left text-xs ${
                        item.checked
                          ? 'border-emerald-300 bg-white text-slate-900'
                          : 'border-amber-300 bg-amber-50 text-amber-950'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          item.checked
                            ? 'border-emerald-700 bg-emerald-700 text-white'
                            : 'border-slate-400 bg-white'
                        }`}
                      >
                        {item.checked && <Check className="h-3 w-3" />}
                      </span>
                      <div>
                        <div className="font-bold">
                          {lang === 'en' ? item.titleEn : conv(item.titleZh)}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          {lang === 'en' ? item.descEn : conv(item.descZh)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* RIGHT COLUMN (7 cols or 12 in PC/iPad Mode): STRICTLY GATED & MATCHED TO BOUGHT PLAN(S) */}
        <div className={presentationMode ? 'md:col-span-12' : 'md:col-span-7'}>
          {!proposalSummarySpec.hasExactBoughtPlan ? (
            <section
              data-testid="proposal-summary-requires-plan-gate"
              className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 p-8 text-center space-y-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                <Lock className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="max-w-md space-y-2">
                <h2 className="text-base font-bold text-slate-900">
                  {t(
                    'Official Proposal Confirmation Requires an Exact Plan Selection',
                    conv('尚未揀選具體投保計劃 — 暫不顯示「正式投保方案確認書及利益說明摘要」')
                  )}
                </h2>
                <p className="text-xs leading-relaxed text-slate-600">
                  {t(
                    'Select the exact insurance plan(s) your client is applying for in Step 02. This document will then automatically generate only the benefit summary and disclosures matching those exact bought products.',
                    conv(
                      '請先前往第 02 步揀選客戶實際投保的具體保險計劃。選定產品後，系統才會按所買保障類別（如儲蓄分紅、自願醫保、危疾、定期壽險或一般保險）自動生成專屬的「正式投保方案確認書及利益說明摘要」。'
                    )
                  )}
                </p>
              </div>
              {onJumpToMarketPlans && (
                <button
                  type="button"
                  data-testid="stp-gate-go-stage2-btn"
                  onClick={onJumpToMarketPlans}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-[#F3D37A] hover:bg-slate-800"
                >
                  <span>{t('Go to Step 02: Select Insurance Plan', conv('前往第 02 步揀選保險計劃'))}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </section>
          ) : (
          <div
            data-testid="official-proposal-summary-card"
            className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm"
          >
            {/* Document Summary Header */}
            <div className="border-b border-slate-200 bg-slate-900 px-6 py-5 text-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="font-mono text-[11px] font-semibold text-[#F3D37A]">
                    {t(
                      proposalSummarySpec.primarySummaryTitleEn,
                      conv(proposalSummarySpec.primarySummaryTitleZh)
                    )}
                  </span>
                  <h2 className="mt-1 text-lg font-bold text-white">
                    [{activePlan.insurerCode}] {activePlan.nameZh} ({activePlan.nameEn})
                  </h2>
                  {proposalSummarySpec.boughtPlans.length > 1 && (
                    <p className="mt-1 text-xs font-semibold text-teal-300">
                      {t('Bundled Combo Plans:', conv('同時投保組合附單：'))}{' '}
                      {proposalSummarySpec.boughtPlans
                        .slice(1)
                        .map((cp) => `[${cp.insurerCode}] ${lang === 'en' ? cp.nameEn : conv(cp.nameZh)}`)
                        .join(' ＋ ')}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-300">
                    {t('Applicant:', conv('投保人／受保人：'))}{' '}
                    <strong className="text-white">
                      {activeLead.fullNameZh} ({activeLead.fullNameEn}, {activeLead.age}歲)
                    </strong>{' '}
                    · {t('Witnessing Advisor:', conv('見證持牌顧問：'))} {intermediary.nameZh} (
                    {intermediary.iaLicenseNo})
                  </p>
                  {fxRateStamp && (
                    <p className="mt-1 font-mono text-[11px] text-teal-300 tabular-nums">
                      {fxRateStamp}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-[#D4AF37]/50 bg-[#060D18] px-4 py-2.5 text-right font-mono tabular-nums">
                  <span className="block text-[11px] text-[#F3D37A]">
                    {useBundledCartPricing
                      ? t('Total Bundled Annual Premium', conv('連組合／附約年度總保費'))
                      : t('Annual Policy Premium', conv('年度應繳保費'))}
                  </span>
                  <span className="text-xl font-bold text-white">
                    {currency} ${quote.annualPremium.toLocaleString()}
                  </span>
                  <span className="block text-[11px] text-slate-300">
                    ~{currency} ${quote.monthlyEquivalent.toLocaleString()}/mo · {quote.paymentTermYears}
                    {t('Y Pay', conv('年供款'))}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 1. GL28 Cash-Value Illustration Table — ONLY shown for Savings / QDAP / UL / Par-CI */}
              {proposalSummarySpec.showGl28SurrenderTable && (
                <div data-testid="summary-section-gl28" className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {t(
                        'HKIA GL28 Benefit Illustration (Guaranteed vs. Non-Guaranteed)',
                        conv('保監局 GL28 利益說明表（保證現金價值 vs. 非保證預期紅利）')
                      )}
                    </h3>
                    {quote.projections.some((r) => r.totalSurrenderValue > 0) && (
                      <button
                        type="button"
                        onClick={() => setShowLifelongCurve((prev) => !prev)}
                        className="text-xs font-semibold text-blue-700 hover:underline"
                      >
                        {showLifelongCurve
                          ? t('Hide Age-100 Curve', conv('收起至 100 歲曲線圖'))
                          : t('View Age-to-100 IRR Curve →', conv('展開至 100 歲終身現金流曲線 →'))}
                      </button>
                    )}
                  </div>

                  {showLifelongCurve && (
                    <LifelongCashValueCurveSvg
                      plan={activePlan}
                      clientAge={activeLead.age}
                      isSmoker={activeLead.isSmoker}
                      currency={currency}
                      sumAssured={displaySumAssured}
                      paymentTermYears={effectiveTerm}
                    />
                  )}

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                          <th className="py-2.5 px-3 font-semibold">{t('Policy Yr', conv('保單年度'))}</th>
                          <th className="py-2.5 px-3 font-semibold">{t('Total Paid', conv('累計已繳保費'))}</th>
                          <th className="py-2.5 px-3 font-semibold">{t('Guaranteed', conv('合約保證價值'))}</th>
                          <th className="py-2.5 px-3 font-semibold">{t('Non-Guar.', conv('非保證紅利'))}</th>
                          <th className="py-2.5 px-3 font-semibold">{t('Projected Total', conv('預期退保總額'))}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                        {quote.projections.map((row) => (
                          <tr key={row.policyYear}>
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {t(`Yr ${row.policyYear} (Age ${row.clientAge})`, `第 ${row.policyYear} 年 (${row.clientAge}歲)`)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {currency} ${row.cumulativePremiumsPaid.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-emerald-800 font-semibold">
                              {currency} ${row.guaranteedCashValue.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {currency} ${row.nonGuaranteedDividend.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-blue-700">
                              {currency} ${row.totalSurrenderValue.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. VHIS / High-End Medical Benefit Summary — ONLY shown when Medical plan/rider is bought */}
              {proposalSummarySpec.showMedicalHospitalSummary && (
                <div
                  data-testid="summary-section-medical"
                  className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-2.5"
                >
                  <h3 className="text-sm font-bold text-teal-950">
                    {t(
                      'Medical & Private Hospital Cashless LOG Benefit Summary',
                      conv('醫療保障及私家醫院免找數（LOG）權益摘要')
                    )}
                  </h3>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {(lang === 'en' ? activePlan.keyHighlightsEn : activePlan.keyHighlightsZh).map(
                      (hl, idx) => (
                        <li key={idx}>• {conv(hl)}</li>
                      )
                    )}
                  </ul>
                  <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-[11px] text-teal-900">
                    <span>
                      {t('Waiting Period:', conv('等候期：'))} {activePlan.waitingPeriodText}
                    </span>
                    <span>·</span>
                    <span>
                      {t('Selected Deductible:', conv('每年自付費：'))} HK$
                      {(unifiedDeal?.cart.hospitalDeductibleHkd ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* 3. Critical Illness Summary — ONLY shown when CI plan/rider is bought */}
              {proposalSummarySpec.showCriticalIllnessSummary && (
                <div
                  data-testid="summary-section-ci"
                  className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-2"
                >
                  <h3 className="text-sm font-bold text-rose-950">
                    {t(
                      'Critical Illness Lump-Sum & Multi-Claim Protection Summary',
                      conv('危疾一筆過賠償及多重復發守護摘要')
                    )}
                  </h3>
                  <div className="font-mono text-xs font-bold text-rose-900 tabular-nums">
                    {t('Initial Sum Assured:', conv('基本危疾保額：'))} {currency} $
                    {displaySumAssured.toLocaleString()} · {t('Waiting Period:', conv('等候期：'))}{' '}
                    {activePlan.waitingPeriodText}
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {(lang === 'en' ? activePlan.keyHighlightsEn : activePlan.keyHighlightsZh).map(
                      (hl, idx) => (
                        <li key={idx}>• {conv(hl)}</li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {/* 4. Pure Term Life / UL Schedule — ONLY shown when Term / UL is bought */}
              {proposalSummarySpec.showTermLifeSummary && (
                <div
                  data-testid="summary-section-term"
                  className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-2"
                >
                  <h3 className="text-sm font-bold text-indigo-950">
                    {t(
                      'Life Protection & Family Liability Coverage Schedule',
                      conv('人壽身故保障及家庭按揭責任保額摘要')
                    )}
                  </h3>
                  <div className="font-mono text-xs font-bold text-indigo-900 tabular-nums">
                    {t('Death Benefit Sum Assured:', conv('身故賠償保額：'))} {currency} $
                    {displaySumAssured.toLocaleString()} · {quote.paymentTermYears}
                    {t('Y Level Term', conv('年保障／供款期'))}
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {(lang === 'en' ? activePlan.keyHighlightsEn : activePlan.keyHighlightsZh).map(
                      (hl, idx) => (
                        <li key={idx}>• {conv(hl)}</li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {/* 5. General Insurance Schedule — ONLY shown when GI is bought */}
              {proposalSummarySpec.showGeneralGiSummary && (
                <div
                  data-testid="summary-section-gi"
                  className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2"
                >
                  <h3 className="text-sm font-bold text-slate-900">
                    {t(
                      'General Insurance Coverage & Policy Schedule',
                      conv('一般保險保障範圍及條款摘要')
                    )}
                  </h3>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {(lang === 'en' ? activePlan.keyHighlightsEn : activePlan.keyHighlightsZh).map(
                      (hl, idx) => (
                        <li key={idx}>• {conv(hl)}</li>
                      )
                    )}
                  </ul>
                  <p className="text-[11px] text-slate-600">
                    {t('Policy Terms:', conv('生效／等候條件：'))} {activePlan.waitingPeriodText}
                  </p>
                </div>
              )}

              {/* 6. IRD Tax Deduction Summary — ONLY shown when VHIS or QDAP is bought */}
              {proposalSummarySpec.showTaxDeductionSummary && (
                <div
                  data-testid="summary-section-tax"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-xs"
                >
                  <span className="font-bold text-emerald-950">
                    {t(
                      'Eligible HKSAR Salaries Tax Deduction Cap (Selected Plan)',
                      conv('已選計劃適用之香港薪俸稅扣稅上限')
                    )}
                  </span>
                  <span className="font-mono font-bold text-emerald-800 tabular-nums">
                    HK$ {proposalSummarySpec.taxDeductionCapHkd.toLocaleString()} / {t('yr', '年')}
                  </span>
                </div>
              )}

              {/* STEP 2: EXPLICIT 3 STATUTORY DOCUMENTS ACKNOWLEDGMENT */}
              <div
                data-testid="stp-three-statutory-docs"
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-blue-700" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-slate-900">
                      {t(
                        'Step 2 · What Are You Signing For? (3 Statutory HKIA Declarations)',
                        conv('第 2 步 · 簽署文件清單確認（勾選以下 3 份保監局法定確認書）')
                      )}
                    </h3>
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
                    {Object.values(checkedDocIds).filter(Boolean).length}/3 {t('Confirmed', conv('份已確認'))}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {STP_STATUTORY_DOCUMENTS_EXPLAINER.map((doc) => {
                    const isChecked = Boolean(checkedDocIds[doc.id]);
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        data-testid={`statutory-doc-check-${doc.id}`}
                        onClick={() => toggleStatutoryDoc(doc.id)}
                        className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                          isChecked
                            ? 'border-blue-600/50 bg-white'
                            : 'border-amber-300 bg-amber-50/60'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              isChecked
                                ? 'border-blue-700 bg-blue-700 text-white'
                                : 'border-slate-400 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="h-3 w-3" />}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-mono font-bold text-blue-800">
                                {conv(doc.stepBadge)}
                              </span>
                              <span className="font-bold text-slate-900">
                                {lang === 'en' ? doc.titleEn : conv(doc.titleZh)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                              {lang === 'en' ? doc.purposeEn : conv(doc.purposeZh)}
                            </p>
                          </div>
                        </div>
                        <span className="hidden sm:inline-block shrink-0 font-mono text-[10px] font-semibold text-slate-500">
                          {lang === 'en' ? doc.signerRoleEn : conv(doc.signerRoleZh)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: DUAL SIGNATURE PAD (APPLICANT + LICENSED ADVISOR WITNESS) */}
              <div id="stp-signature-pad-box" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-slate-900" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-slate-900">
                      {t(
                        'Step 3 · Dual Electronic Signature (Applicant + Licensed Advisor Witness)',
                        conv('第 3 步 · 雙重電子簽署（投保人親筆簽署 ＋ 持牌顧問見證加簽）')
                      )}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="stp-sample-signature-btn"
                      onClick={applySampleSignature}
                      className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-100 whitespace-nowrap"
                    >
                      {t('1-Click Demo Signature', conv('一鍵填入投保人示範簽名'))}
                    </button>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t('Clear', conv('重簽'))}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                  {/* Box A: Policyholder / Applicant Signature Canvas */}
                  <div className="md:col-span-8 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-3">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                      <span>
                        {t(
                          `Box A · Policyholder Signature: ${activeLead.fullNameEn}`,
                          conv(`簽署欄 A · 投保人（保單持有人）親筆簽署：${activeLead.fullNameZh}`)
                        )}
                      </span>
                      <span className={hasSigned ? 'text-emerald-700 font-bold' : 'text-amber-700'}>
                        {hasSigned ? t('Signed ✓', conv('已完成簽署 ✓')) : t('Sign inside box below', conv('請於下方空白處簽名'))}
                      </span>
                    </div>
                    <canvas
                      ref={canvasRef}
                      data-testid="stp-signature-canvas"
                      width={600}
                      height={148}
                      aria-label="Applicant digital signature pad"
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      className="h-32 w-full cursor-crosshair touch-none rounded-lg border border-slate-200 bg-white"
                    />
                  </div>

                  {/* Box B: Licensed Advisor Witness Stamp */}
                  <div className="md:col-span-4 flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                        <UserCheck className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                        <span>{t('Box B · Advisor Witness', conv('簽署欄 B · 持牌顧問見證'))}</span>
                      </div>
                      <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-xs text-slate-800">
                        <div className="font-bold text-slate-950">
                          {intermediary.nameZh} ({intermediary.nameEn})
                        </div>
                        <div className="mt-0.5 text-[11px] text-teal-800">
                          HKIA Lic: {intermediary.iaLicenseNo}
                        </div>
                        <div className="mt-0.5 truncate text-[10px] text-slate-500">
                          {intermediary.firmName}
                        </div>
                      </div>
                    </div>

                    <label className="mt-3 flex items-start gap-2 cursor-pointer text-[11px] font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={advisorWitnessConfirmed}
                        onChange={(e) => setAdvisorWitnessConfirmed(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700"
                      />
                      <span>
                        {t(
                          'I witness that GL28/GL30 disclosures were explained clearly to the applicant.',
                          conv('本人確認已向投保人清楚解釋利益說明書及冷靜期條款並見證簽署。')
                        )}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Final Primary CTA Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    data-testid="stp-submit-generate-pdf-btn"
                    onClick={handleGenerateStpPolicy}
                    disabled={generatingPdf}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold transition-colors ${
                      compliance.canSubmitStp && allThreeDocsChecked && advisorWitnessConfirmed
                        ? 'vh-gold-cta shadow-md'
                        : 'bg-slate-800 text-white hover:bg-slate-900'
                    }`}
                  >
                    <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      {generatingPdf
                        ? t(
                            'Stamping Dual-Signed PDF & Transmitting to Insurer...',
                            conv('正在壓印雙簽名建議書 PDF 並直通傳送至保司核保部...')
                          )
                        : compliance.canSubmitStp
                        ? t(
                            `Complete Sign-Off: Stamp Bilingual PDF & Submit to [${activePlan.insurerCode}] (${currency} $${quote.annualPremium.toLocaleString()}/yr)`,
                            conv(
                              `完成確認簽署：生成雙語壓印 PDF 並遞交 [${activePlan.insurerCode}] 核保（${currency} $${quote.annualPremium.toLocaleString()}/年）`
                            )
                          )
                        : t(
                            'Resolve Red HKIA Compliance Item on Left to Enable Insurer Submission',
                            conv('請先完成左側紅色保監局合規項目（如補簽 GL30 或驗證入境標籤）')
                          )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* SUBMITTED APPLICATIONS LEDGER */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {t(
                'Signed Proposals & Submitted Insurer Applications Ledger',
                conv('已簽署建議書及保司核保遞交紀錄冊')
              )}
            </h2>
            <p className="text-xs text-slate-500">
              {canShowDrive
                ? t(
                    'Download any stamped bilingual PDF or back it up to your Google Drive folder.',
                    conv('可隨時下載已簽署嘅雙語建議書 PDF，或儲存至 Google Drive 備份。')
                  )
                : t(
                    'Download any stamped bilingual Proposal PDF anytime for your records.',
                    conv('可隨時下載任何已簽署嘅正式雙語建議書 PDF 留存。')
                  )}
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
            {applications.length} {t('Signed Records', conv('份已簽署紀錄'))}
          </span>
        </div>

        {applications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-500">
            {t(
              'No signed proposals submitted yet in this session. Complete Steps 1–3 above to generate your first signed package.',
              conv('目前未有已簽署嘅投保紀錄；完成上面第 1–3 步即可生成第一份已簽名建議書 PDF。')
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-3 px-3 font-semibold">{t('Ref No.', conv('投保編號'))}</th>
                  <th className="py-3 px-3 font-semibold">{t('Applicant', conv('投保人'))}</th>
                  <th className="py-3 px-3 font-semibold">{t('Plan & Riders', conv('投保計劃及附約'))}</th>
                  <th className="py-3 px-3 font-semibold">{t('Annual Premium', conv('每年保費'))}</th>
                  <th className="py-3 px-3 font-semibold">{t('Insurer Status', conv('核保狀態'))}</th>
                  <th className="py-3 px-3 text-right font-semibold">
                    {canShowDrive
                      ? t('Actions', conv('下載與雲端備份'))
                      : t('Download', conv('下載 PDF'))}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td className="py-3 px-3 font-bold text-slate-900">{app.referenceNo}</td>
                    <td className="py-3 px-3 font-sans font-medium text-slate-800">
                      {app.clientNameZh} ({app.clientNameEn})
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-700">
                      <div className="font-semibold text-slate-900">
                        [{app.insurerCode}] {app.planNameZh}
                      </div>
                      {app.bundledRiderSummary && (
                        <div className="mt-0.5 text-[11px] text-teal-800">
                          + {app.bundledRiderSummary}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold text-blue-700">
                      {app.currency} ${app.annualPremium.toLocaleString()} ({app.paymentTermYears}y)
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          app.status === 'INSTANT_ISSUED' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>
                          {app.status === 'INSTANT_ISSUED'
                            ? t('Instant Issued (In-Force)', conv('直通即時生效'))
                            : t('Underwriting Review', conv('核保部審批中'))}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-sans">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(app)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-800 hover:bg-slate-50"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>PDF</span>
                        </button>
                        {canShowDrive &&
                          (app.driveWebViewLink ? (
                            <a
                              href={app.driveWebViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                            >
                              <span>{t('In Drive', conv('已存雲端'))}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <button
                              type="button"
                              disabled={uploadingAppId === app.id}
                              onClick={() => handleUploadDrive(app)}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-2.5 py-1.5 font-semibold text-white hover:bg-blue-800"
                            >
                              <FolderUp className="h-3.5 w-3.5" />
                              <span>
                                {uploadingAppId === app.id
                                  ? '...'
                                  : driveConnected
                                  ? t('Save Drive', conv('存至雲端'))
                                  : t('Drive Backup', conv('雲端備份'))}
                              </span>
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
