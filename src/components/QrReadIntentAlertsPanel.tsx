import React, { useMemo, useState } from 'react';
import { BellRing, Check, Copy, ExternalLink, Flame, Sparkles } from 'lucide-react';
import {
  MicrositeFocusSectionKey,
  MicrositeIntentSession,
  evaluateMicrositeReadIntentAlerts,
} from '../domain/advisorUpgradesPackEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import { ClientLead, InsurancePlan } from '../domain/types';
import { copyTextSafe } from '../utils/clipboardAndDom';

interface QrReadIntentAlertsPanelProps {
  activeLead: ClientLead;
  activePlan: InsurancePlan;
  onRecordReadReceipt?: (deviceHint: string) => void;
  onLogWhatsappAudit?: (leadId: string, scriptExcerpt: string) => void;
  onNotify?: (msg: string) => void;
}

export const QrReadIntentAlertsPanel: React.FC<QrReadIntentAlertsPanelProps> = ({
  activeLead,
  activePlan,
  onRecordReadReceipt,
  onLogWhatsappAudit,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zhHk: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk);

  const [sessions, setSessions] = useState<MicrositeIntentSession[]>(() => [
    {
      id: 'intent-seed-1',
      leadId: activeLead.id,
      clientNameZh: activeLead.fullNameZh,
      clientNameEn: activeLead.fullNameEn,
      whatsappPhone: activeLead.whatsappPhone,
      planNameZh: `[${activePlan.insurerCode}] ${activePlan.nameZh}`,
      focusSection: 'DIVIDEND_STRESS_85',
      dwellSeconds: 68,
      deviceLabel: 'iPhone 16 Pro · Safari (WeChat 轉跳)',
      openedAtIso: new Date(Date.now() - 8 * 60_000).toISOString(),
    },
    {
      id: 'intent-seed-2',
      leadId: activeLead.id,
      clientNameZh: activeLead.fullNameZh,
      clientNameEn: activeLead.fullNameEn,
      whatsappPhone: activeLead.whatsappPhone,
      planNameZh: `[${activePlan.insurerCode}] ${activePlan.nameZh}`,
      focusSection: 'HOSPITAL_LOG',
      dwellSeconds: 49,
      deviceLabel: 'iPad Air · Safari',
      openedAtIso: new Date(Date.now() - 42 * 60_000).toISOString(),
    },
  ]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const evaluatedAlerts = useMemo(
    () =>
      evaluateMicrositeReadIntentAlerts(
        sessions.map((s) => ({
          ...s,
          clientNameZh: activeLead.fullNameZh,
          clientNameEn: activeLead.fullNameEn,
          whatsappPhone: activeLead.whatsappPhone,
          planNameZh: `[${activePlan.insurerCode}] ${activePlan.nameZh}`,
        }))
      ),
    [sessions, activeLead, activePlan]
  );

  const handleSimulateClientRead = (
    section: MicrositeFocusSectionKey,
    dwellSeconds: number
  ) => {
    const next: MicrositeIntentSession = {
      id: `intent-${Date.now()}`,
      leadId: activeLead.id,
      clientNameZh: activeLead.fullNameZh,
      clientNameEn: activeLead.fullNameEn,
      whatsappPhone: activeLead.whatsappPhone,
      planNameZh: `[${activePlan.insurerCode}] ${activePlan.nameZh}`,
      focusSection: section,
      dwellSeconds,
      deviceLabel: 'iPhone · WhatsApp In-App Browser',
      openedAtIso: new Date().toISOString(),
    };
    setSessions((prev) => [next, ...prev.slice(0, 4)]);
    onRecordReadReceipt?.(`WhatsApp Scan · ${section} (${dwellSeconds}s)`);
    onNotify?.(
      conv(`即時熱度通知：${activeLead.fullNameZh} 剛停留閱讀建議書達 ${dwellSeconds} 秒，已自動配對跟進話術！`)
    );
  };

  const handleCopyFollowUp = async (id: string, script: string) => {
    await copyTextSafe(script);
    setCopiedId(id);
    onLogWhatsappAudit?.(activeLead.id, script.slice(0, 120));
    window.setTimeout(() => setCopiedId(null), 2200);
    onNotify?.(conv('已複製粵語高意向跟進 WhatsApp 話術並寫入 GL28 合規留痕！'));
  };

  return (
    <section
      data-testid="qr-read-intent-alerts-panel"
      className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
            <BellRing className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {t(
                'REAL-TIME QR MICROSITE READ-INTENT RADAR',
                conv('QR 建議書微網 · 即時開信停留熱度通知 ＋ WhatsApp 自動跟進劇本')
              )}
            </span>
          </div>
          <h3 className="mt-1 text-base font-bold text-slate-900">
            {t(
              'Client Section Dwell-Time Alerts & Matched Cantonese Closing Scripts',
              conv('偵測客戶重點閱讀章節（≥45 秒高意向訊號）並自動生成粵語跟進話術')
            )}
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            {t(
              'Know the exact second your client inspects 85% Dividend Stress, HIBOR Financing, or Cashless Hospital LOG.',
              conv('唔使再盲目問「睇咗建議書未」— 精準掌握客戶停留喺邊一頁最耐，對症下藥一擊即中。')
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="simulate-hot-intent-85-btn"
            onClick={() => handleSimulateClientRead('DIVIDEND_STRESS_85', 74)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100 whitespace-nowrap shrink-0"
          >
            <Flame className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
            <span>{t('Simulate 74s Read (85% Stress)', conv('模擬客戶停留 74 秒（85% 壓測）'))}</span>
          </button>
          <button
            type="button"
            data-testid="simulate-hot-intent-retirement-btn"
            onClick={() => handleSimulateClientRead('WITHDRAWAL_567', 56)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
            <span>{t('Simulate 56s Read (567 Income)', conv('模擬停留 56 秒（退休提領）'))}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {evaluatedAlerts.map((alert) => {
          const cleanPhone = (alert.whatsappPhone || '').replace(/[^0-9]/g, '');
          const waHref = `https://wa.me/${cleanPhone || '85291234567'}?text=${encodeURIComponent(
            alert.whatsappScriptZh
          )}`;

          return (
            <article
              key={alert.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums ${
                      alert.heatTier === 'HOT_CLOSING'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-blue-100 text-blue-900'
                    }`}
                  >
                    {conv(alert.heatBadgeZh)} · {alert.dwellSeconds}s
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {alert.deviceLabel}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {alert.clientNameZh} ({alert.clientNameEn}) · {conv(alert.sectionLabelZh)}
                  </div>
                  <p className="mt-1 text-[11px] text-teal-800">
                    {conv(alert.psychologyHintZh)}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700">
                  {conv(alert.whatsappScriptZh)}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  data-testid={`copy-intent-whatsapp-${alert.id}`}
                  onClick={() => handleCopyFollowUp(alert.id, conv(alert.whatsappScriptZh))}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  {copiedId === alert.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {copiedId === alert.id
                      ? t('Copied & Audited ✓', conv('已複製並合規留痕 ✓'))
                      : t('Copy Cantonese Script', conv('一鍵複製粵語跟進話術'))}
                  </span>
                </button>

                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap"
                >
                  <span>{t('Send via WhatsApp', conv('直通 WhatsApp 發送'))}</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
