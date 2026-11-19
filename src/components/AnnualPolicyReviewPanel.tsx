import React, { useMemo, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { CalendarCheck2, Check, Copy, Download, FileCheck2, Loader2 } from 'lucide-react';
import {
  AnnualPolicyReviewModel,
  AnnualReviewLifeEvent,
  buildAnnualPolicyReviewModel,
} from '../domain/advisorUpgradesPackEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  ClientLead,
  InForcePolicyRecord,
  IntermediaryProfile,
} from '../domain/types';
import { copyTextSafe } from '../utils/clipboardAndDom';

interface AnnualPolicyReviewPanelProps {
  policies: InForcePolicyRecord[];
  leads: ClientLead[];
  intermediary: IntermediaryProfile;
  onNotify?: (msg: string) => void;
}

const LIFE_EVENT_OPTIONS: Array<{
  id: AnnualReviewLifeEvent;
  labelZh: string;
  labelEn: string;
}> = [
  { id: 'MARRIAGE', labelZh: '新婚／配偶合併扣稅', labelEn: 'Marriage / Joint Tax' },
  { id: 'NEWBORN', labelZh: '添丁／新生兒加保', labelEn: 'Newborn Addition' },
  { id: 'MORTGAGE', labelZh: '置業按揭／轉按', labelEn: 'New Property Mortgage' },
  { id: 'PROMOTION', labelZh: '升職加薪／高稅階', labelEn: 'Salary Jump / Promotion' },
];

async function renderAnnualReviewPdfBytes(
  review: AnnualPolicyReviewModel,
  intermediary: IntermediaryProfile
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header Banner
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, canvas.width, 210);

  ctx.fillStyle = '#F3D37A';
  ctx.font = '700 20px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText('HK INSUREHUB PRO · ANNUAL POLICY & ASSET REVIEW REPORT', 68, 66);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 40px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText('年度保障及 GN16 資產檢視報告', 68, 124);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '500 20px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText(
    `Ref: ${review.reportRefNo}  |  Review Date: ${review.reviewDateIso}  |  Advisor: ${intermediary.nameZh} (${intermediary.iaLicenseNo})`,
    68,
    172
  );

  // Policy Summary Box
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.fillRect(68, 252, 1104, 230);
  ctx.strokeRect(68, 252, 1104, 230);

  ctx.fillStyle = '#0F172A';
  ctx.font = '700 26px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText(
    `保單持有人 Policyholder: ${review.clientNameZh} (${review.clientNameEn})`,
    100,
    308
  );

  ctx.font = '600 22px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillStyle = '#1E293B';
  ctx.fillText(
    `檢視保單 Policy: [${review.insurerCode}] ${review.planNameZh} (#${review.policyNumber})`,
    100,
    358
  );
  ctx.fillText(`年繳保費 Annual Premium: ${review.annualPremiumDisplay}`, 100, 404);
  ctx.fillStyle = '#0F766E';
  ctx.fillText(
    `最新 GN16 分紅實現率: ${review.gn16FulfillmentPct}%   |   私院醫療通脹基準: ${review.medicalInflationPct}%/yr   |   健康評分: ${review.protectionHealthScore}/100`,
    100,
    450
  );

  // Gap KPI Highlight
  ctx.fillStyle = '#FEF2F2';
  ctx.strokeStyle = '#FECACA';
  ctx.fillRect(68, 518, 1104, 130);
  ctx.strokeRect(68, 518, 1104, 130);

  ctx.fillStyle = '#991B1B';
  ctx.font = '700 24px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText(
    `本年度家庭保障重算缺口 Updated Protection Delta: HK$${review.newProtectionGapHkd.toLocaleString()}`,
    100,
    574
  );
  ctx.fillStyle = '#7F1D1D';
  ctx.font = '500 19px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText(
    '已綜合計算最新人生階段變動及香港私家醫院手術與標靶藥物通脹因素。',
    100,
    618
  );

  // Actionable Recommendations
  ctx.fillStyle = '#0F172A';
  ctx.font = '700 28px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText('本年度顧問重點優化建議 Priority Advisory Actions', 68, 716);

  let currY = 774;
  ctx.font = '500 21px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  review.actionRecommendationsZh.forEach((rec, idx) => {
    ctx.fillStyle = '#1D4ED8';
    ctx.font = '700 22px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
    ctx.fillText(`0${idx + 1}.`, 68, currY);

    ctx.fillStyle = '#1E293B';
    ctx.font = '500 21px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
    // Simple CJK chunk line wrapping (max ~44 chars per line)
    const maxChars = 44;
    for (let i = 0; i < rec.length; i += maxChars) {
      ctx.fillText(rec.slice(i, i + maxChars), 118, currY);
      currY += 36;
    }
    currY += 22;
  });

  // Footer
  ctx.fillStyle = '#64748B';
  ctx.font = '500 16px "Plus Jakarta Sans", "Noto Sans HK", sans-serif';
  ctx.fillText(
    `Prepared by ${intermediary.nameEn} (${intermediary.iaLicenseNo}) · ${intermediary.firmName} · Compliant with HKIA GL28 & GL30`,
    68,
    1690
  );

  const pngDataUrl = canvas.toDataURL('image/png');
  const base64 = pngDataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${review.reportRefNo} - Annual Policy Review`);
  const pngImage = await pdfDoc.embedPng(bytes);
  const page = pdfDoc.addPage([595.28, 841.89]);
  page.drawImage(pngImage, { x: 0, y: 0, width: 595.28, height: 841.89 });
  return pdfDoc.save();
}

export const AnnualPolicyReviewPanel: React.FC<AnnualPolicyReviewPanelProps> = ({
  policies,
  leads,
  intermediary,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zhHk: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk);

  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(policies[0]?.id || '');
  const [lifeEvents, setLifeEvents] = useState<AnnualReviewLifeEvent[]>(['PROMOTION']);
  const [gn16FulfillmentPct, setGn16FulfillmentPct] = useState<number>(101);
  const [medicalInflationPct, setMedicalInflationPct] = useState<number>(7);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const activePolicy = useMemo(
    () => policies.find((p) => p.id === selectedPolicyId) || policies[0],
    [policies, selectedPolicyId]
  );

  const matchedLead = useMemo(
    () => leads.find((l) => l.id === activePolicy?.leadId),
    [leads, activePolicy]
  );

  const reviewModel = useMemo(() => {
    if (!activePolicy) return null;
    return buildAnnualPolicyReviewModel({
      lead: matchedLead,
      policy: activePolicy,
      lifeEvents,
      gn16FulfillmentPct,
      medicalInflationPct,
    });
  }, [activePolicy, matchedLead, lifeEvents, gn16FulfillmentPct, medicalInflationPct]);

  if (!activePolicy || !reviewModel) return null;

  const toggleEvent = (ev: AnnualReviewLifeEvent) => {
    setLifeEvents((prev) =>
      prev.includes(ev) ? prev.filter((item) => item !== ev) : [...prev, ev]
    );
  };

  const handleDownloadReviewPdf = async () => {
    setDownloadingPdf(true);
    try {
      const pdfBytes = await renderAnnualReviewPdfBytes(reviewModel, intermediary);
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reviewModel.reportRefNo}_${reviewModel.clientNameEn.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
      onNotify?.(conv(`已生成並下載《${reviewModel.clientNameZh} 年度保障及資產檢視報告》PDF！`));
    } catch {
      onNotify?.(conv('報告生成失敗，請稍後重試。'));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCopyInvite = async () => {
    await copyTextSafe(conv(reviewModel.whatsappInviteZh));
    setCopiedInvite(true);
    window.setTimeout(() => setCopiedInvite(false), 2200);
    onNotify?.(conv('已複製保單週年體檢 WhatsApp 約見邀請話術！'));
  };

  return (
    <section
      data-testid="annual-policy-review-panel"
      className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
            <CalendarCheck2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {t(
                '1-CLICK ANNUAL POLICY REVIEW & ORPHAN UPSELL GENERATOR',
                conv('保單週年體檢報告生成器（孤兒單／舊客二次加保神器）')
              )}
            </span>
          </div>
          <h2 className="mt-1 text-base font-bold text-slate-900">
            {t(
              '1-Page Annual Coverage & GN16 Fulfillment Review Report (PDF)',
              conv('一鍵生成 1 頁紙《年度保障及 GN16 資產檢視報告》PDF ＋ WhatsApp 約見話術')
            )}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="copy-annual-review-whatsapp-btn"
            onClick={handleCopyInvite}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            {copiedInvite ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
            )}
            <span>
              {copiedInvite
                ? t('Copied Invite ✓', conv('已複製邀請 ✓'))
                : t('Copy WhatsApp Invite', conv('複製週年約見 WhatsApp'))}
            </span>
          </button>

          <button
            type="button"
            data-testid="download-annual-review-pdf-btn"
            disabled={downloadingPdf}
            onClick={handleDownloadReviewPdf}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {downloadingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {downloadingPdf
                ? t('Generating PDF...', conv('生成 A4 PDF 中...'))
                : t('Download 1-Page Review PDF', conv('下載《年度檢視報告》PDF'))}
            </span>
          </button>
        </div>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="space-y-3 md:col-span-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              {t('Select In-Force Policy for Review', conv('選擇即將週年續保之生效保單'))}
            </label>
            <select
              value={activePolicy.id}
              onChange={(e) => setSelectedPolicyId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
            >
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.clientNameZh} · [{p.insurerCode}] {p.planNameZh} (#{p.policyId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700">
              {t('Client Life-Stage Changes This Year', conv('勾選客戶過去一年人生階段變動'))}
            </span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {LIFE_EVENT_OPTIONS.map((opt) => {
                const active = lifeEvents.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`review-life-event-${opt.id.toLowerCase()}`}
                    onClick={() => toggleEvent(opt.id)}
                    className={`rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {lang === 'en' ? opt.labelEn : conv(opt.labelZh)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                {t('Latest GN16 Ratio (%)', conv('最新 GN16 分紅實現率 (%)'))}
              </label>
              <input
                type="number"
                min={60}
                max={130}
                value={gn16FulfillmentPct}
                onChange={(e) => setGn16FulfillmentPct(Number(e.target.value) || 100)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs font-bold text-slate-900 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">
                {t('HK Medical Inflation (%)', conv('私院醫療通脹率 (%)'))}
              </label>
              <input
                type="number"
                min={3}
                max={12}
                value={medicalInflationPct}
                onChange={(e) => setMedicalInflationPct(Number(e.target.value) || 7)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs font-bold text-slate-900 tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Live Report Preview Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 md:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <FileCheck2 className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <span>
                {reviewModel.reportRefNo} · {reviewModel.clientNameZh}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
              <span className="font-bold text-teal-800">
                {t('Score:', conv('健康評分：'))} {reviewModel.protectionHealthScore}/100
              </span>
              <span className="font-bold text-rose-700">
                {t('New Gap:', conv('新增保障缺口：'))} HK$
                {reviewModel.newProtectionGapHkd.toLocaleString()}
              </span>
            </div>
          </div>

          <ul className="space-y-2 text-xs leading-relaxed text-slate-700">
            {(lang === 'en'
              ? reviewModel.actionRecommendationsEn
              : reviewModel.actionRecommendationsZh
            ).map((rec, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <span className="font-mono font-bold text-blue-700">0{idx + 1}</span>
                <span>{lang === 'en' ? rec : conv(rec)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
