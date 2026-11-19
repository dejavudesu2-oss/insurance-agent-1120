import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  MessageSquare,
  QrCode,
  ShieldCheck,
  X,
} from 'lucide-react';
import { buildFormattedMessengerPitch } from '../domain/proEnhancementsEngine';
import { ClientMicrositeRecord } from '../domain/twentyUpgradesEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import { copyTextSafe } from '../utils/clipboardAndDom';
import {
  generateScannableQrMatrix,
  generateScannableQrPngDataUrl,
} from '../utils/qrCodeGenerator';

interface ScannableProposalQrSvgProps {
  url: string;
  sizePx?: number;
  ariaLabel?: string;
}

/**
 * Renders a crisp, camera-scannable ISO/IEC 18004 QR code SVG with a 3-module quiet zone
 * so physical smartphone cameras can scan directly off laptop screens or printed handovers.
 */
export const ScannableProposalQrSvg: React.FC<ScannableProposalQrSvgProps> = ({
  url,
  sizePx = 148,
  ariaLabel = 'Scannable client proposal QR code',
}) => {
  const matrix = useMemo(() => generateScannableQrMatrix(url), [url]);
  const moduleCount = matrix.length;
  const quietZone = 3;
  const totalView = moduleCount + quietZone * 2;

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={sizePx}
      height={sizePx}
      viewBox={`0 0 ${totalView} ${totalView}`}
      shapeRendering="crispEdges"
      className="rounded-xl border border-[#D4AF37]/50 bg-white shadow-sm shrink-0"
    >
      <rect x={0} y={0} width={totalView} height={totalView} fill="#FFFFFF" />
      {matrix.map((row, rIdx) =>
        row.map((filled, cIdx) =>
          filled ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx + quietZone}
              y={rIdx + quietZone}
              width={1}
              height={1}
              fill="#060D18"
            />
          ) : null
        )
      )}
    </svg>
  );
};

interface ClientMicrositeViewProps {
  record: ClientMicrositeRecord;
  proposalUrl?: string;
  onClose?: () => void;
  onLogReadReceipt?: (inspectedYear: number) => void;
  onSubmitClientFeedback?: (feedback: {
    preferredPaymentMode: 'ANNUAL' | 'MONTHLY';
    preferredSigningSlot: string;
    clientQuestion: string;
  }) => Promise<void> | void;
  onPublishProposal?: () => Promise<void> | void;
  standaloneMode?: boolean;
  hideHeroQr?: boolean;
}

export const ClientMicrositeView: React.FC<ClientMicrositeViewProps> = ({
  record,
  proposalUrl,
  onClose,
  onLogReadReceipt,
  onSubmitClientFeedback,
  onPublishProposal,
  standaloneMode = false,
  hideHeroQr = false,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const availableYears = useMemo(
    () => record.projections.map((p) => p.policyYear),
    [record.projections]
  );
  const [selectedYearIdx, setSelectedYearIdx] = useState<number>(
    Math.min(3, Math.max(0, availableYears.length - 2))
  );
  const [receiptLogged, setReceiptLogged] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedChannel, setCopiedChannel] = useState<string | null>(null);
  const [showMobileQrSheet, setShowMobileQrSheet] = useState(false);

  // #9 2-Way Client Feedback State
  const [fbPaymentMode, setFbPaymentMode] = useState<'ANNUAL' | 'MONTHLY'>(
    record.clientFeedback?.preferredPaymentMode || 'ANNUAL'
  );
  const [fbSigningSlot, setFbSigningSlot] = useState<string>(
    record.clientFeedback?.preferredSigningSlot || ''
  );
  const [fbQuestion, setFbQuestion] = useState<string>(
    record.clientFeedback?.clientQuestion || ''
  );
  const [fbSubmitted, setFbSubmitted] = useState<boolean>(Boolean(record.clientFeedback));

  const activeRow = record.projections[selectedYearIdx] || record.projections[0];
  const isExpired = Boolean(
    record.expiresAtIso && new Date(record.expiresAtIso).getTime() < Date.now()
  );
  const expiresDateText = record.expiresAtIso
    ? record.expiresAtIso.slice(0, 10)
    : '2026-11-27';

  const resolvedShareUrl = useMemo(() => {
    if (proposalUrl) return proposalUrl;
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://hkinsurehub.pro';
    return `${origin.replace(/\/$/, '')}/?proposal=${encodeURIComponent(record.id)}`;
  }, [proposalUrl, record.id]);

  const maxTotal = Math.max(
    1,
    ...record.projections.map((p) => Math.max(p.total, p.paid))
  );

  const handleCopyShareLink = async () => {
    if (onPublishProposal) {
      await onPublishProposal();
    }
    await copyTextSafe(resolvedShareUrl);
    setCopiedUrl(true);
    window.setTimeout(() => setCopiedUrl(false), 2200);
  };

  const handleDownloadQrPng = async () => {
    if (onPublishProposal) {
      await onPublishProposal();
    }
    const pngUrl = await generateScannableQrPngDataUrl(resolvedShareUrl, {
      width: 600,
      darkColor: '#060D18',
      lightColor: '#FFFFFF',
    });
    const link = document.createElement('a');
    link.download = `HK_InsureHub_Proposal_QR_${record.id}.png`;
    link.href = pngUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmRead = () => {
    onLogReadReceipt?.(activeRow?.policyYear ?? 20);
    setReceiptLogged(true);
  };

  const handleCopyMessengerPitch = async (
    channel: 'WHATSAPP_ZH_HK' | 'WECHAT_ZH_CN' | 'WHATSAPP_EN'
  ) => {
    if (onPublishProposal) {
      await onPublishProposal();
    }
    const annualHkd =
      record.currency === 'HKD'
        ? record.annualPremium
        : record.currency === 'USD'
        ? Math.round(record.annualPremium * 7.785)
        : Math.round(record.annualPremium / 0.923);
    const pitchText = buildFormattedMessengerPitch({
      channel,
      clientNameZh: record.clientNameZh,
      clientNameEn: record.clientNameEn,
      planTitleZh: `${record.insurerNameZh} · ${record.planNameZh}`,
      planTitleEn: `${record.insurerNameZh} · ${record.planNameEn}`,
      annualPremiumHkd: annualHkd,
      annualPremiumRmb: Math.round(annualHkd * 0.923),
      monthlyHkd: Math.round(annualHkd / 12),
      fxRateHkdToRmb: 0.923,
      fxUpdatedDate: record.createdAtIso.slice(0, 10),
      proposalShareUrl: resolvedShareUrl,
      expiresDateText,
      advisorName: record.advisorName,
      advisorLicense: record.advisorLicense,
    });
    await copyTextSafe(pitchText);
    setCopiedChannel(channel);
    window.setTimeout(() => setCopiedChannel(null), 2200);
  };

  return (
    <div
      data-testid="client-microsite-root"
      className={
        standaloneMode
          ? 'client-microsite-shell bg-[#EEF2F6]'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-[#060D18]/80 p-3 sm:p-6 overflow-y-auto'
      }
    >
      <div
        className={`mx-auto flex w-full flex-col ${
          standaloneMode
            ? 'max-w-4xl flex-1 justify-between'
            : 'max-w-3xl overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-[#F8FAFC] shadow-2xl'
        }`}
      >
        {/* Scrollable Vertical Card Stack */}
        <div
          className={
            standaloneMode
              ? 'space-y-4 px-3.5 pt-3 pb-6 sm:space-y-5 sm:px-6 sm:pt-4'
              : 'space-y-5 p-4 sm:p-6'
          }
        >
          {/* CARD 1: Victoria Harbour Private Wealth (維港私銀深邃金) Hero Card */}
          <section className="vh-harbour-panel relative overflow-hidden rounded-2xl p-5 sm:p-6 shadow-md">
            {/* Central / Victoria Harbour Architectural Skyline Geometric Linework */}
            <svg
              aria-hidden="true"
              viewBox="0 0 480 120"
              className="pointer-events-none absolute bottom-0 right-0 h-28 w-80 opacity-25"
              fill="none"
            >
              <path
                d="M190 120V64H218V120M232 120V30L264 12V120M232 30L264 75M264 30L232 75M232 75L264 120M264 75L232 120M280 120V44H314V120M328 120V20H366V120M340 20V10H354V20M382 120V52H414V120M428 120V34H462V120"
                stroke="#D4AF37"
                strokeWidth="1.5"
              />
            </svg>

            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5 min-w-0">
                <p className="font-mono text-[11px] font-semibold text-[#F3D37A]">
                  {t(
                    'VICTORIA HARBOUR PRIVATE WEALTH · INTERACTIVE PROPOSAL',
                    conv('維港私銀專屬互動建議書 · 提案編號')
                  )}{' '}
                  · {record.id}
                </p>
                <h1
                  className="text-xl font-bold tracking-tight text-white sm:text-2xl"
                  style={{ textWrap: 'balance' }}
                >
                  {record.whiteLabelTitle}
                </h1>
                <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {t('Client:', conv('尊貴客戶：'))}{' '}
                  <strong className="text-white">
                    {record.clientNameZh} ({record.clientNameEn}, {record.clientAge}
                    {t('y', '歲')})
                  </strong>{' '}
                  · {t('Licensed Advisor:', conv('持牌顧問：'))} {record.advisorName} (IA:{' '}
                  {record.advisorLicense})
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-slate-200">
                  <span>
                    {record.insurerNameZh} · {record.planNameZh}
                  </span>
                  <span aria-hidden="true" className="text-[#D4AF37]">
                    ·
                  </span>
                  <span className="font-mono font-bold text-[#F3D37A] tabular-nums">
                    {record.currency} ${record.annualPremium.toLocaleString()} /{' '}
                    {t('yr', '年')} ({record.paymentTermYears}
                    {t('y pay', '年供款')})
                  </span>
                  <span aria-hidden="true" className="text-[#D4AF37]">
                    ·
                  </span>
                  <span
                    data-testid="microsite-expiry-badge"
                    className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold tabular-nums ${
                      isExpired ? 'text-amber-300' : 'text-emerald-300'
                    }`}
                  >
                    <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>
                      {isExpired
                        ? t(`Expired ${expiresDateText}`, conv(`已於 ${expiresDateText} 到期`))
                        : t(
                            `Valid thru ${expiresDateText}`,
                            conv(`有效期至 ${expiresDateText}`)
                          )}
                    </span>
                  </span>
                </div>
                {record.fxRateStamp && (
                  <p className="font-mono text-[11px] text-slate-300 tabular-nums">
                    {t('FX Stamp:', conv('鎖定牌價：'))} {record.fxRateStamp}
                  </p>
                )}
              </div>

              {(!hideHeroQr || onClose) && (
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end shrink-0">
                  {!hideHeroQr && (
                    <>
                      <div className="hidden sm:block">
                        <ScannableProposalQrSvg
                          url={resolvedShareUrl}
                          sizePx={92}
                          ariaLabel={`QR code for proposal ${record.id}`}
                        />
                      </div>
                      <button
                        type="button"
                        data-testid="microsite-toggle-qr-sheet-btn"
                        onClick={() => setShowMobileQrSheet((prev) => !prev)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#D4AF37]/60 bg-[#060D18] px-3.5 py-2 text-xs font-semibold text-[#F3D37A] hover:bg-[#11223B] whitespace-nowrap sm:hidden"
                      >
                        <QrCode className="h-4 w-4 text-[#D4AF37]" aria-hidden="true" />
                        <span>
                          {showMobileQrSheet
                            ? t('Hide QR Card', conv('收起掃描碼'))
                            : t('Show Scan QR', conv('顯示手機掃描 QR'))}
                        </span>
                      </button>
                    </>
                  )}
                  {onClose && (
                    <button
                      type="button"
                      aria-label="Close microsite preview"
                      onClick={onClose}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#060D18] text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Expandable Full-Contrast Scannable QR Drawer for Face-to-Face Mobile Scanning */}
            {showMobileQrSheet && (
              <div
                data-testid="microsite-qr-drawer"
                className="relative z-10 mt-4 flex flex-col items-center gap-3 rounded-xl border border-[#D4AF37]/50 bg-[#060D18]/95 p-4 text-center sm:flex-row sm:text-left"
              >
                <ScannableProposalQrSvg
                  url={resolvedShareUrl}
                  sizePx={144}
                  ariaLabel={`Large scannable QR code for ${resolvedShareUrl}`}
                />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="text-xs font-bold text-[#F3D37A]">
                    {t(
                      'Scan with Phone Camera to Open This Interactive Proposal',
                      conv('請用手機相機或微信直接掃描（即時開啟互動建議書）')
                    )}
                  </div>
                  <p className="truncate font-mono text-[11px] text-slate-300">
                    {resolvedShareUrl}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    <button
                      type="button"
                      onClick={handleDownloadQrPng}
                      className="vh-gold-cta inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      <span>{t('Download Print QR (PNG)', conv('下載列印級 QR 圖檔'))}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-600 bg-[#102038] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#162B4A] whitespace-nowrap"
                    >
                      {copiedUrl ? (
                        <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <Copy className="h-4 w-4 text-[#F3D37A]" aria-hidden="true" />
                      )}
                      <span>
                        {copiedUrl
                          ? t('Link Copied!', conv('已複製連結！'))
                          : t('Copy Proposal URL', conv('複製建議書網址'))}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {isExpired && (
            <section
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-medium text-amber-950"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
              <span>
                {t(
                  `This shared proposal snapshot expired on ${expiresDateText}. Figures below are for historical reference; please contact ${record.advisorName} for an updated quote.`,
                  conv(
                    `此建議書專屬連結已於 ${expiresDateText} 屆滿。以下歷年數據僅供留檔參考，請聯絡持牌顧問 ${record.advisorName} 索取最新季度回贈報價。`
                  )
                )}
              </span>
            </section>
          )}

          {/* One-Tap WhatsApp / WeChat Formatted Pitch Copy Bar (#10) */}
          <section className="client-microsite-v-card flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <MessageSquare className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
              <span>
                {t(
                  '1-Tap Copy Client Messenger Pitch (with FX stamp & link):',
                  conv('一鍵複製客戶發送話術（附鎖定匯率、有效期及微網連結）：')
                )}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                data-testid="microsite-copy-whatsapp-zh-btn"
                onClick={() => handleCopyMessengerPitch('WHATSAPP_ZH_HK')}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-950 hover:bg-emerald-100 whitespace-nowrap shrink-0"
              >
                {copiedChannel === 'WHATSAPP_ZH_HK' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                )}
                <span>
                  {copiedChannel === 'WHATSAPP_ZH_HK'
                    ? t('Copied!', conv('已複製繁中！'))
                    : t('WhatsApp (繁中)', conv('WhatsApp 繁中話術'))}
                </span>
              </button>
              <button
                type="button"
                data-testid="microsite-copy-wechat-cn-btn"
                onClick={() => handleCopyMessengerPitch('WECHAT_ZH_CN')}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-950 hover:bg-teal-100 whitespace-nowrap shrink-0"
              >
                {copiedChannel === 'WECHAT_ZH_CN' ? (
                  <Check className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                )}
                <span>
                  {copiedChannel === 'WECHAT_ZH_CN'
                    ? '已复制简中！'
                    : t('WeChat (简中)', '微信简体话术')}
                </span>
              </button>
              <button
                type="button"
                data-testid="microsite-copy-whatsapp-en-btn"
                onClick={() => handleCopyMessengerPitch('WHATSAPP_EN')}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                {copiedChannel === 'WHATSAPP_EN' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                )}
                <span>{copiedChannel === 'WHATSAPP_EN' ? 'Copied EN!' : 'WhatsApp (EN)'}</span>
              </button>
            </div>
          </section>

          {/* CARD 2: High-Contrast Interactive Policy-Year Slider & Value Breakdown */}
          <section className="client-microsite-v-card p-4 sm:p-6 space-y-4">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <label
                htmlFor="microsite-year-slider"
                className="text-sm font-bold text-slate-900"
              >
                {t(
                  'Slide or Tap Policy Year to Inspect Cash Values',
                  conv('滑動或點選保單年度（即時檢視保證及預期總價值）')
                )}
              </label>
              <span className="font-mono text-base font-bold text-[#0B172A] tabular-nums">
                {t('Policy Year', conv('第'))} {activeRow?.policyYear}{' '}
                {t('', conv('保單年度'))} · {t('Age', conv('客戶'))} {activeRow?.clientAge}{' '}
                {t('y', conv('歲'))}
              </span>
            </div>

            {/* Large Touch-Friendly Quick Year Selector Buttons (>= 44px height) */}
            <div
              role="group"
              aria-label="Quick select policy year milestone"
              className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
            >
              {record.projections.map((row, idx) => {
                const active = idx === selectedYearIdx;
                return (
                  <button
                    key={row.policyYear}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedYearIdx(idx)}
                    className={`min-h-[44px] rounded-xl border px-3 py-2 font-mono text-xs font-bold transition-colors whitespace-nowrap tabular-nums ${
                      active
                        ? 'border-[#D4AF37] bg-[#060D18] text-[#F3D37A]'
                        : 'border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {t(`Yr ${row.policyYear}`, conv(`第 ${row.policyYear} 年`))} ({row.clientAge}
                    {t('y', '歲')})
                  </button>
                );
              })}
            </div>

            {/* Enlarged Mobile Range Slider */}
            <input
              id="microsite-year-slider"
              type="range"
              min={0}
              max={Math.max(0, record.projections.length - 1)}
              value={selectedYearIdx}
              onChange={(e) => setSelectedYearIdx(Number(e.target.value))}
              className="client-microsite-range"
            />

            {/* High-Contrast 2x2 / 4-Column Metric Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 font-mono tabular-nums">
              <div className="rounded-xl border border-slate-300 bg-slate-50 p-3.5">
                <span className="text-xs font-sans font-semibold text-slate-600">
                  {t('Cumulative Paid', conv('累計已繳總保費'))}
                </span>
                <p className="mt-1 text-base font-bold text-slate-900">
                  {record.currency} ${(activeRow?.paid ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-3.5">
                <span className="text-xs font-sans font-semibold text-emerald-900">
                  {t('Contract Guaranteed', conv('合約保證現金價值'))}
                </span>
                <p className="mt-1 text-base font-bold text-emerald-800">
                  {record.currency} ${(activeRow?.guaranteed ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-slate-300 bg-white p-3.5">
                <span className="text-xs font-sans font-semibold text-slate-600">
                  {t('Non-Guaranteed Bonus', conv('非保證預期紅利'))}
                </span>
                <p className="mt-1 text-base font-bold text-slate-800">
                  {record.currency} ${(activeRow?.nonGuaranteed ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-[#D4AF37] bg-[#060D18] p-3.5 text-white">
                <span className="text-xs font-sans font-semibold text-[#F3D37A]">
                  {t('Projected Total Value', conv('預期退保總價值'))}
                </span>
                <p className="mt-1 text-lg font-bold text-white">
                  {record.currency} ${(activeRow?.total ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </section>

          {/* CARD 3: Full-Width Touch Milestone Bars */}
          <section className="client-microsite-v-card p-4 sm:p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                {t(
                  'Milestone Cash Value Progression (Tap Any Row)',
                  conv('跨年度保證與非保證價值進度表（點擊任一行切換）')
                )}
              </h2>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-xs bg-emerald-600" />
                  <span>{t('Guaranteed', conv('合約保證'))}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#1D4ED8]" />
                  <span>{t('Non-Guaranteed', conv('非保證紅利'))}</span>
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {record.projections.map((row, idx) => {
                const guarPct = Math.round((row.guaranteed / maxTotal) * 100);
                const nonGuarPct = Math.round((row.nonGuaranteed / maxTotal) * 100);
                const isSelected = idx === selectedYearIdx;
                return (
                  <button
                    key={row.policyYear}
                    type="button"
                    onClick={() => setSelectedYearIdx(idx)}
                    className={`client-microsite-touch-row flex w-full flex-col justify-center rounded-xl border px-3.5 py-2.5 text-left ${
                      isSelected
                        ? 'border-[#060D18] bg-slate-100 ring-1 ring-[#D4AF37]'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1 font-mono text-xs text-slate-800 tabular-nums">
                      <span className="font-bold text-slate-950">
                        {t(`Year ${row.policyYear}`, conv(`第 ${row.policyYear} 年`))} ({row.clientAge}
                        {t('y', '歲')})
                      </span>
                      <span>
                        {t('Guar', conv('保證'))} ${row.guaranteed.toLocaleString()} +{' '}
                        {t('Bonus', conv('紅利'))} ${row.nonGuaranteed.toLocaleString()} ={' '}
                        <strong className="text-[#060D18]">${row.total.toLocaleString()}</strong>
                      </span>
                    </div>
                    <div className="mt-1.5 flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
                      <div style={{ width: `${guarPct}%` }} className="bg-emerald-600" />
                      <div style={{ width: `${nonGuarPct}%` }} className="bg-[#1D4ED8]" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* CARD 3B: 2-Way Client Interactive Response & Signing Preference (#9) */}
          {onSubmitClientFeedback && (
            <section
              data-testid="microsite-client-feedback-card"
              className="client-microsite-v-card p-4 sm:p-6 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  {t(
                    'Interactive Client Reply & Signing Preference',
                    conv('客戶互動意向回傳（供款頻率、預約簽署時段與提問）')
                  )}
                </h2>
                {fbSubmitted && (
                  <span className="font-mono text-xs font-semibold text-emerald-700">
                    {t('Synced to Advisor CRM', conv('已同步回傳至顧問 CRM'))}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <span className="block text-xs font-semibold text-slate-700">
                    {t('Preferred Payment Cadence', conv('偏好繳費方式'))}
                  </span>
                  <div className="mt-1 flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                    {(['ANNUAL', 'MONTHLY'] as const).map((modeKey) => (
                      <button
                        key={modeKey}
                        type="button"
                        data-testid={`microsite-fb-pay-${modeKey.toLowerCase()}`}
                        onClick={() => setFbPaymentMode(modeKey)}
                        className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold whitespace-nowrap ${
                          fbPaymentMode === modeKey
                            ? 'bg-[#060D18] text-[#F3D37A]'
                            : 'text-slate-700 hover:text-slate-950'
                        }`}
                      >
                        {modeKey === 'ANNUAL'
                          ? t('Annual Pay', conv('年繳保費'))
                          : t('Monthly eDDA', conv('月繳 eDDA'))}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="microsite-signing-slot-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    {t('Preferred Meeting / Signing Time', conv('方便面談或簽署時段'))}
                  </label>
                  <input
                    id="microsite-signing-slot-input"
                    type="text"
                    value={fbSigningSlot}
                    onChange={(e) => setFbSigningSlot(e.target.value)}
                    placeholder={t('e.g. Fri 3:00 PM @ Central', conv('例如：週五下午 3:00 中環太古廣場'))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  aria-label="Client question for advisor"
                  data-testid="microsite-fb-question-input"
                  value={fbQuestion}
                  onChange={(e) => setFbQuestion(e.target.value)}
                  placeholder={t(
                    'Any question on hospital cashless LOG, deductible, or currency switch?',
                    conv('如有任何關於私院免找數預批、自付額或保單轉貨幣問題，可在此留言...')
                  )}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
                <button
                  type="button"
                  data-testid="microsite-fb-submit-btn"
                  onClick={async () => {
                    await onSubmitClientFeedback({
                      preferredPaymentMode: fbPaymentMode,
                      preferredSigningSlot: fbSigningSlot.trim(),
                      clientQuestion: fbQuestion.trim(),
                    });
                    setFbSubmitted(true);
                  }}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#060D18] px-4 py-2 text-xs font-bold text-[#F3D37A] hover:bg-slate-900 whitespace-nowrap shrink-0"
                >
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t('Send Reply to Advisor', conv('傳送意向予專屬顧問'))}</span>
                </button>
              </div>
            </section>
          )}

          {/* CARD 4: HKIA GL28 / GN16 Statutory Disclosure Card */}
          <section className="client-microsite-v-card p-4 sm:p-5">
            <div className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-700">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
              <span>
                {t(
                  `HKIA GL28 & GN16 Compliant Disclosure: Illustrated IRR ${record.effectiveIrrPct}% (Historical GN16 Fulfillment Ratio: ${
                    record.fulfillmentRatio ?? 'Pure Protection'
                  }%). Non-guaranteed dividends may vary with insurer investment performance. Policyholders enjoy a statutory 21-day cooling-off period.`,
                  conv(
                    `香港保監局 GL28 及 GN16 合規披露：演示預期內部回報率 ${
                      record.effectiveIrrPct
                    }%（歷年 GN16 分紅實現率參考：${
                      record.fulfillmentRatio ?? '純保障型'
                    }%）。非保證紅利會隨保險公司投資表現調整並非保證，保單持有人享有 21 日冷靜期權益。`
                  )
                )}
              </span>
            </div>
          </section>
        </div>

        {/* Sticky Bottom Call-To-Action Bar (Mobile Natural Thumb Zone · <= 68px height) */}
        <div
          data-testid="client-microsite-sticky-cta"
          className="client-microsite-sticky-cta px-3.5 pt-2.5 sm:px-6"
        >
          <div className="mx-auto flex max-w-4xl items-center gap-2.5">
            {onLogReadReceipt ? (
              <button
                type="button"
                data-testid="microsite-confirm-read-cta-btn"
                onClick={handleConfirmRead}
                className="vh-gold-cta flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap shadow-md"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {receiptLogged
                    ? t(
                        `Advisor Notified (Yr ${activeRow?.policyYear ?? 20})`,
                        conv(`已通知顧問跟進（第 ${activeRow?.policyYear ?? 20} 年度）`)
                      )
                    : t(
                        `Confirm Read (Yr ${activeRow?.policyYear ?? 20}) & Notify Advisor`,
                        conv(`確認已閱（第 ${activeRow?.policyYear ?? 20} 年）並通知顧問跟進`)
                      )}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="vh-gold-cta flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap"
              >
                <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {copiedUrl
                    ? t('Copied Proposal URL!', conv('已複製建議書專屬連結！'))
                    : t('Copy Interactive Proposal Link', conv('複製建議書專屬連結'))}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyShareLink}
              aria-label={t('Copy proposal share link', conv('複製建議書分享連結'))}
              className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-[#D4AF37]/50 bg-[#102038] px-3.5 py-2.5 text-xs font-semibold text-[#F3D37A] hover:bg-[#162B4A] whitespace-nowrap shrink-0"
            >
              {copiedUrl ? (
                <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {copiedUrl ? t('Copied', conv('已複製')) : t('Copy Link', conv('複製連結'))}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
