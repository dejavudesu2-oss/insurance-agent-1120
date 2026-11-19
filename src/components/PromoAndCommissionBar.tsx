import React, { useMemo, useState } from 'react';
import {
  Award,
  Check,
  Clock,
  Copy,
  EyeOff,
  Flame,
  Gift,
  Percent,
} from 'lucide-react';
import {
  evaluateInsurerPromos,
  estimateAdvisorFycAndMdrtProgress,
  PromoFilterKind,
} from '../domain/advisorToolkitSuiteEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  CurrencyCode,
  InsurancePlan,
  PolicyApplicationRecord,
  PromoAdminOverride,
} from '../domain/types';
import { copyTextSafe } from '../utils/clipboardAndDom';

export interface PromoAndCommissionBarProps {
  activePlan: InsurancePlan;
  activeAnnualPremium: number;
  currency: CurrencyCode;
  paymentTermYears: number;
  clientNameZh: string;
  clientSafeMode: boolean;
  onToggleClientSafeMode: () => void;
  promoOverrides?: Record<string, PromoAdminOverride>;
  applications?: PolicyApplicationRecord[];
  onSelectInsurerFilter?: (insurerCode: string) => void;
  onNotify?: (msg: string) => void;
}

const PROMO_FILTER_TABS: Array<{
  id: PromoFilterKind;
  zh: string;
  en: string;
}> = [
  { id: 'ALL', zh: '全部優惠', en: 'All Promos' },
  { id: 'CLOSING_SOON', zh: '14日內截止', en: 'Closing in 14d' },
  { id: 'HIGH_PREPAY', zh: '預繳 ≥4.5%', en: 'Prepay ≥4.5%' },
  { id: 'SAVINGS', zh: '儲蓄／傳承', en: 'Savings' },
  { id: 'MEDICAL_CI', zh: '醫保／危疾', en: 'VHIS & CI' },
];

export const PromoAndCommissionBar: React.FC<PromoAndCommissionBarProps> = ({
  activePlan,
  activeAnnualPremium,
  currency,
  paymentTermYears,
  clientNameZh,
  clientSafeMode,
  onToggleClientSafeMode,
  promoOverrides,
  applications,
  onSelectInsurerFilter,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const [promoFilter, setPromoFilter] = useState<PromoFilterKind>('ALL');
  const [showAllPromos, setShowAllPromos] = useState<boolean>(false);
  const [copiedPromoId, setCopiedPromoId] = useState<string | null>(null);

  const promos = useMemo(
    () =>
      evaluateInsurerPromos({
        overrides: promoOverrides,
        filter: promoFilter,
        clientNameZh,
      }),
    [promoOverrides, promoFilter, clientNameZh]
  );

  const commission = useMemo(
    () =>
      estimateAdvisorFycAndMdrtProgress({
        clientSafeMode,
        activePlan,
        activeAnnualPremium,
        currency,
        paymentTermYears,
        applications,
      }),
    [
      clientSafeMode,
      activePlan,
      activeAnnualPremium,
      currency,
      paymentTermYears,
      applications,
    ]
  );

  const visiblePromos = showAllPromos ? promos : promos.slice(0, 3);

  const handleCopyPromoWhatsApp = async (promoId: string, textZh: string) => {
    await copyTextSafe(conv(textZh));
    setCopiedPromoId(promoId);
    window.setTimeout(() => setCopiedPromoId(null), 2200);
    onNotify?.(
      t(
        'Copied seasonal promo deadline reminder for WhatsApp!',
        conv('已複製本季保費回贈截止提醒 WhatsApp 訊息！')
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* ================================================================== */}
      {/* 1. ADVISOR-ONLY FYC & MDRT ESTIMATOR (Strictly Hidden in Safe Mode) */}
      {/* ================================================================== */}
      {commission.isVisible && (
        <section
          data-testid="advisor-fyc-mdrt-estimator-card"
          className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5 text-white shadow-sm"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/15 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                  <Award className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {t(
                      'ADVISOR PRIVATE · FYC & MDRT TRACKER',
                      conv('顧問私人預算 · 佣金及 MDRT 進度（見客模式自動隱藏）')
                    )}
                  </span>
                </span>
                <span className="text-xs text-slate-400">
                  [{activePlan.insurerCode}] {lang === 'en' ? activePlan.nameEn : conv(activePlan.nameZh)} ·{' '}
                  {paymentTermYears} {t('yr pay', conv('年供款'))}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {conv(commission.nextMilestoneLabelZh)}
              </p>
            </div>

            <button
              type="button"
              data-testid="hide-commission-safe-mode-btn"
              onClick={() => {
                onToggleClientSafeMode();
                onNotify?.(
                  t(
                    'Client Safe Mode enabled — private FYC & MDRT panel hidden.',
                    conv('已開啟見客保密模式 — 顧問佣金及 MDRT 面板已即時隱藏！')
                  )
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-400/20 transition-colors whitespace-nowrap shrink-0"
            >
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {t(
                  'Turn On Client Safe Mode (Hide FYC)',
                  conv('開啟見客模式（即時收起佣金）')
                )}
              </span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
              <div className="text-[11px] text-slate-400">
                {t('Est. Year-1 FYC (This Case)', conv('此單預計首年佣金 (FYC)'))}
              </div>
              <div
                data-testid="advisor-this-case-fyc-hkd"
                className="mt-1 font-mono text-base sm:text-lg font-bold text-amber-300 tabular-nums"
              >
                HK$ {commission.activeDealYear1FycHkd.toLocaleString()}
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-slate-400 tabular-nums">
                {t(
                  `Rate ~${commission.fycRatePct}% of HK$ ${commission.activeDealAnnualHkd.toLocaleString()}`,
                  conv(`按首年 ~${commission.fycRatePct}% 計（年費折合 HK$${commission.activeDealAnnualHkd.toLocaleString()}）`)
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
              <div className="text-[11px] text-slate-400">
                {t('Est. Year-2 Renewal', conv('預計第 2 年續保佣金'))}
              </div>
              <div className="mt-1 font-mono text-base sm:text-lg font-bold text-white tabular-nums">
                HK$ {commission.activeDealYear2RenewalHkd.toLocaleString()}
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-slate-400 tabular-nums">
                {t(
                  `Renewal ~${commission.renewalYear2RatePct}%`,
                  conv(`續保率約 ~${commission.renewalYear2RatePct}%`)
                )}
              </div>
            </div>

            <div className="sm:col-span-2 rounded-xl border border-slate-800 bg-slate-900/90 p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-300 font-medium">
                  {t(
                    'HK MDRT Progress (Target HK$ 552,000 FYC)',
                    conv('香港 MDRT 進度（目標 HK$ 552,000 首年佣金）')
                  )}
                </span>
                <span
                  data-testid="advisor-mdrt-progress-pct"
                  className="font-mono font-bold text-emerald-400 tabular-nums"
                >
                  {commission.mdrtProgressBeforePct}% → {commission.mdrtProgressAfterPct}%
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-amber-400 transition-all"
                  style={{
                    width: `${Math.min(100, commission.mdrtProgressAfterPct)}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] text-slate-400 tabular-nums">
                <span>
                  {t('YTD + This Case:', conv('連同此單累計：'))} HK${' '}
                  {commission.projectedTotalYtdFycHkd.toLocaleString()}
                </span>
                <span>
                  COT: HK$ {(commission.cotTargetHkd / 1000).toFixed(0)}k · TOT: HK${' '}
                  {(commission.totTargetHkd / 1000).toFixed(0)}k
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* 2. INSURER QUARTERLY PROMO & PREPAYMENT COUNTDOWN TRACKER          */}
      {/* ================================================================== */}
      <section
        data-testid="insurer-quarterly-promo-tracker"
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3.5"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-teal-700 shrink-0" aria-hidden="true" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {t(
                  'HK Insurer Quarterly Rebates & Prepayment Interest Countdown',
                  conv('各保險公司本季保費回贈、預繳高息與截止倒數')
                )}
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {t(
                'Check first-year rebates, USD guaranteed prepayment rates, and closing dates—copy a natural reminder for hesitant clients in 1 click.',
                conv(
                  '一覽各間保險公司今季首年保費回贈、美金預繳保證年息及截止日，撳一下即可複製溫馨提醒發畀考慮緊嘅客。'
                )
              )}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter insurer seasonal promotions"
            className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"
          >
            {PROMO_FILTER_TABS.map((tab) => {
              const active = promoFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  data-testid={`promo-filter-${tab.id}`}
                  aria-selected={active}
                  onClick={() => setPromoFilter(tab.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t(tab.en, conv(tab.zh))}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {visiblePromos.map((promo) => {
            const isUrgent = promo.urgencyBadge === 'URGENT_7D';
            const isSoon = promo.urgencyBadge === 'CLOSING_14D';
            return (
              <article
                key={promo.id}
                data-testid={`promo-card-${promo.insurerCode}`}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 hover:border-teal-600/60 hover:bg-white transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectInsurerFilter?.(promo.insurerCode)}
                      className="text-xs font-bold text-slate-900 hover:text-teal-800 hover:underline text-left"
                    >
                      {lang === 'en' ? promo.insurerNameEn : conv(promo.insurerNameZh)}
                    </button>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums whitespace-nowrap shrink-0 ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-800'
                          : isSoon
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-200/80 text-slate-700'
                      }`}
                    >
                      {isUrgent ? (
                        <Flame className="h-3 w-3 text-rose-600" aria-hidden="true" />
                      ) : (
                        <Clock className="h-3 w-3" aria-hidden="true" />
                      )}
                      <span>
                        {t(
                          `${promo.daysRemaining}d left`,
                          conv(`尚餘 ${promo.daysRemaining} 日`)
                        )}
                      </span>
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-800 leading-snug">
                    {lang === 'en' ? promo.campaignTitleEn : conv(promo.campaignTitleZh)}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] tabular-nums">
                    <span className="inline-flex items-center gap-0.5 rounded bg-teal-100/90 px-2 py-0.5 font-bold text-teal-900">
                      <Percent className="h-3 w-3" aria-hidden="true" />
                      {t(
                        `Up to ${promo.firstYearRebatePct}% Rebate`,
                        conv(`首年回贈高達 ${promo.firstYearRebatePct}%`)
                      )}
                    </span>
                    {promo.prepaidInterestPct !== null && (
                      <span className="rounded bg-amber-100/90 px-2 py-0.5 font-bold text-amber-950">
                        {t(
                          `${promo.prepaidInterestPct.toFixed(1)}% Prepay p.a.`,
                          conv(`預繳保證息 ${promo.prepaidInterestPct.toFixed(1)}%`)
                        )}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-600">
                    {lang === 'en' ? promo.highlightNoteEn : conv(promo.highlightNoteZh)}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200/80 pt-2.5">
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    {t('Ends', conv('截止：'))} {promo.deadlineDateIso}
                  </span>
                  <button
                    type="button"
                    data-testid={`copy-promo-wa-${promo.insurerCode}`}
                    onClick={() =>
                      handleCopyPromoWhatsApp(promo.id, promo.whatsappPromoAlertZh)
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
                  >
                    {copiedPromoId === promo.id ? (
                      <Check className="h-3 w-3 text-emerald-700" aria-hidden="true" />
                    ) : (
                      <Copy className="h-3 w-3" aria-hidden="true" />
                    )}
                    <span>
                      {copiedPromoId === promo.id
                        ? t('Copied!', conv('已複製！'))
                        : t('Copy Promo WhatsApp', conv('複製優惠提醒'))}
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {promos.length > 3 && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setShowAllPromos((p) => !p)}
              className="text-xs font-semibold text-teal-800 hover:underline"
            >
              {showAllPromos
                ? t('Show Top 3 Closing Soonest', conv('收起（只顯示最快截止 3 間）'))
                : t(
                    `Show All ${promos.length} Insurer Campaigns`,
                    conv(`展開全部 ${promos.length} 間保險公司今季優惠`)
                  )}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
