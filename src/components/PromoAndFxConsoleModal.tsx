import React, { useState } from 'react';
import { CheckCircle2, Coins, ExternalLink, Lock, RefreshCw, Tag, Unlock, X } from 'lucide-react';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import { HKIA_CENTRAL_GN16_PORTAL_URL } from '../domain/planLinksAndOffersEngine';
import { formatFxRateStamp } from '../domain/proEnhancementsEngine';
import { FxRateFeedState, PromoAdminOverride } from '../domain/types';

const CAMPAIGN_INSURERS: Array<{
  code: string;
  nameZh: string;
  nameEn: string;
  defaultRebatePct: number;
  defaultPrepaidPct: number;
  defaultDays: number;
}> = [
  { code: 'MANULIFE', nameZh: '宏利香港', nameEn: 'Manulife HK', defaultRebatePct: 20, defaultPrepaidPct: 4.8, defaultDays: 14 },
  { code: 'FWD', nameZh: '富衛保險', nameEn: 'FWD HK', defaultRebatePct: 20, defaultPrepaidPct: 4.8, defaultDays: 14 },
  { code: 'AIA', nameZh: '友邦香港', nameEn: 'AIA HK', defaultRebatePct: 18, defaultPrepaidPct: 4.6, defaultDays: 16 },
  { code: 'PRU', nameZh: '保誠保險', nameEn: 'Prudential HK', defaultRebatePct: 19, defaultPrepaidPct: 4.7, defaultDays: 12 },
  { code: 'SUNLIFE', nameZh: '永明金融', nameEn: 'Sun Life HK', defaultRebatePct: 20, defaultPrepaidPct: 4.8, defaultDays: 14 },
  { code: 'AXA', nameZh: '安盛香港', nameEn: 'AXA HK', defaultRebatePct: 18, defaultPrepaidPct: 4.5, defaultDays: 18 },
  { code: 'BOCLIFE', nameZh: '中銀人壽', nameEn: 'BOC Life', defaultRebatePct: 20, defaultPrepaidPct: 4.8, defaultDays: 14 },
  { code: 'CTFLIFE', nameZh: '周大福人壽', nameEn: 'CTF Life', defaultRebatePct: 20, defaultPrepaidPct: 4.8, defaultDays: 14 },
  { code: 'YFLIFE', nameZh: '萬通保險', nameEn: 'YF Life', defaultRebatePct: 19, defaultPrepaidPct: 4.7, defaultDays: 14 },
];

interface PromoAndFxConsoleModalProps {
  open: boolean;
  onClose: () => void;
  fxFeed: FxRateFeedState;
  onSaveFxFeed: (next: FxRateFeedState) => Promise<void> | void;
  promoOverrides: Record<string, PromoAdminOverride>;
  onSavePromoOverrides: (next: Record<string, PromoAdminOverride>) => Promise<void> | void;
}

export const PromoAndFxConsoleModal: React.FC<PromoAndFxConsoleModalProps> = ({
  open,
  onClose,
  fxFeed,
  onSaveFxFeed,
  promoOverrides,
  onSavePromoOverrides,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const [tab, setTab] = useState<'FX' | 'PROMO'>('FX');
  const [usdToHkd, setUsdToHkd] = useState(String(fxFeed.usdToHkd));
  const [hkdToRmb, setHkdToRmb] = useState(String(fxFeed.hkdToRmb));
  const [rateLocked, setRateLocked] = useState(fxFeed.rateLocked);
  const [localPromos, setLocalPromos] = useState<Record<string, PromoAdminOverride>>(promoOverrides);

  if (!open) return null;

  const handleApplyFx = async () => {
    const u2h = Math.min(7.85, Math.max(7.75, Number(usdToHkd) || 7.785));
    const h2r = Math.min(1.02, Math.max(0.82, Number(hkdToRmb) || 0.923));
    await onSaveFxFeed({
      usdToHkd: Number(u2h.toFixed(4)),
      hkdToRmb: Number(h2r.toFixed(4)),
      usdToRmb: Number((u2h * h2r).toFixed(4)),
      updatedAtIso: new Date().toISOString(),
      sourceLabel: rateLocked ? 'Advisor Rate-Locked Quote' : 'HKMA / Interbank Mid-Market',
      rateLocked,
    });
    onClose();
  };

  const updateInsurerPromo = (code: string, patch: Partial<PromoAdminOverride>) => {
    setLocalPromos((prev) => {
      const cur = prev[code] || {
        insurerCode: code,
        archived: false,
        updatedAtIso: new Date().toISOString(),
      };
      return {
        ...prev,
        [code]: {
          ...cur,
          ...patch,
          updatedAtIso: new Date().toISOString(),
        },
      };
    });
  };

  const handleSavePromos = async () => {
    await onSavePromoOverrides(localPromos);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live FX Rate-Lock & Quarterly Promo Maintenance Console"
      data-testid="promo-fx-console-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060D18]/75 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#D4AF37]/45 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="vh-harbour-surface flex items-center justify-between gap-3 px-6 py-4 text-white">
          <div>
            <p className="font-mono text-[11px] font-semibold text-[#F3D37A]">
              {t('MARKET FEED & CAMPAIGN GOVERNANCE', conv('實時匯率鎖定與保司季度推廣維護台'))}
            </p>
            <h2 className="mt-0.5 text-base font-bold text-white">
              {t(
                'Live FX Rate-Lock Stamp & Quarterly Promo / GN16 Console',
                conv('USD/HKD/RMB 牌價鎖定簽章 ＋ 保司回贈倒數管理')
              )}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close console"
            onClick={onClose}
            className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sub-Tab Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setTab('FX')}
            className={`inline-flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2 text-xs font-bold ${
              tab === 'FX'
                ? 'border-slate-900 bg-white text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
            <span>{t('1. Live FX Feed & Rate-Lock', conv('1. 實時雙幣匯率與鎖定簽章'))}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('PROMO')}
            className={`inline-flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2 text-xs font-bold ${
              tab === 'PROMO'
                ? 'border-slate-900 bg-white text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
            <span>{t('2. Insurer Promo & GN16 Maintenance', conv('2. 季度推廣倒數與自動下架管理'))}</span>
          </button>
        </div>

        {tab === 'FX' ? (
          <div className="p-6 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-slate-900">
                {t('Active Proposal FX Stamp:', conv('當前建議書匯率簽章：'))}
              </div>
              <div className="font-mono text-sm font-bold text-teal-800 tabular-nums">
                {formatFxRateStamp(fxFeed)}
              </div>
              <p className="text-[11px] text-slate-500">
                {t(
                  'Locking the FX rate syncs the HKD ↔ RMB conversion across Stage 03 Proposal Cart, Stage 04 Microsite, and Stage 05A Signed PDF.',
                  conv('鎖定匯率後將自動同步至 03A 雙幣提案購物車、04C 客戶微網頁及 05A 簽署確認書。')
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('USD → HKD Linked Peg Rate (7.75–7.85)', conv('美元兌港元聯繫匯率 (1 USD = HKD)'))}
                </label>
                <input
                  type="number"
                  step="0.001"
                  min={7.75}
                  max={7.85}
                  value={usdToHkd}
                  onChange={(e) => setUsdToHkd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm font-bold text-slate-900 tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('HKD → RMB Cross-Border Reference (1 HKD = ¥)', conv('港元兌離岸人民幣匯率 (1 HKD = ¥)'))}
                </label>
                <input
                  type="number"
                  step="0.001"
                  min={0.82}
                  max={1.02}
                  value={hkdToRmb}
                  onChange={(e) => setHkdToRmb(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm font-bold text-slate-900 tabular-nums"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
              <button
                type="button"
                onClick={() => setRateLocked((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-bold ${
                  rateLocked
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                {rateLocked ? (
                  <Lock className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                ) : (
                  <Unlock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                )}
                <span>
                  {rateLocked
                    ? t('Quote FX Rate Locked for Client', conv('已為當前客戶鎖定報價匯率'))
                    : t('Lock FX Rate on Client Quotes', conv('點擊鎖定客戶報價匯率'))}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsdToHkd('7.785');
                  setHkdToRmb('0.923');
                  setRateLocked(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Reset to Daily Mid-Market', conv('重設為今日銀行中間價'))}</span>
              </button>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t('Cancel', conv('取消'))}
              </button>
              <button
                type="button"
                data-testid="save-fx-feed-btn"
                onClick={handleApplyFx}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Apply & Stamp FX Rate', conv('套用匯率並同步全站報價'))}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span>
                {t(
                  'Adjust first-year rebate %, countdown days, or archive expired campaigns (0 days auto-hides promo banners).',
                  conv('可即時調整各保司首年回贈 %、剩餘倒數日數或一鍵下架已到期優惠（設為 0 日或封存即自動隱藏橫幅）。')
                )}
              </span>
              <a
                href={HKIA_CENTRAL_GN16_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline whitespace-nowrap"
              >
                <span>{t('HKIA GN16 Central Registry', conv('保監局 GN16 官方索引'))}</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[580px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">{t('Insurer', conv('保險公司'))}</th>
                    <th className="py-2.5 px-3 font-semibold">{t('FYP Rebate %', conv('首年回贈 %'))}</th>
                    <th className="py-2.5 px-3 font-semibold">{t('Countdown Days', conv('剩餘倒數日'))}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t('Status', conv('推廣狀態'))}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {CAMPAIGN_INSURERS.map((ins) => {
                    const ov = localPromos[ins.code];
                    const archived = Boolean(ov?.archived);
                    const rebateVal = ov?.customRebatePct ?? ins.defaultRebatePct;
                    const daysVal = ov?.daysRemainingOverride ?? ins.defaultDays;

                    return (
                      <tr key={ins.code} className={archived ? 'bg-slate-50 opacity-60' : 'bg-white'}>
                        <td className="py-2.5 px-3 font-sans font-bold text-slate-900">
                          [{ins.code}] {lang === 'en' ? ins.nameEn : conv(ins.nameZh)}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min={1}
                            max={35}
                            value={rebateVal}
                            onChange={(e) =>
                              updateInsurerPromo(ins.code, {
                                customRebatePct: Number(e.target.value) || ins.defaultRebatePct,
                              })
                            }
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-xs font-bold text-slate-900"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min={0}
                            max={90}
                            value={daysVal}
                            onChange={(e) =>
                              updateInsurerPromo(ins.code, {
                                daysRemainingOverride: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-xs font-bold text-slate-900"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          <button
                            type="button"
                            onClick={() => updateInsurerPromo(ins.code, { archived: !archived })}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                              archived
                                ? 'border border-slate-300 bg-white text-slate-700'
                                : 'bg-emerald-700 text-white hover:bg-emerald-800'
                            }`}
                          >
                            {archived
                              ? t('Archived (Hidden)', conv('已下架（點擊重啟）'))
                              : t('Active Campaign', conv('生效中（點擊下架）'))}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t('Cancel', conv('取消'))}
              </button>
              <button
                type="button"
                data-testid="save-promo-overrides-btn"
                onClick={handleSavePromos}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Save Campaign Rules', conv('儲存季度推廣設定'))}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
