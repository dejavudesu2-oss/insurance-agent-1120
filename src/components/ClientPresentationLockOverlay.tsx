import React, { useMemo, useState } from 'react';
import { Check, Lock, ShieldCheck, Sliders, Tablet, X } from 'lucide-react';
import { computeClientInteractivePreview } from '../domain/advisorUpgradesPackEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import { ClientLead, InsurancePlan, IntermediaryProfile } from '../domain/types';

interface ClientPresentationLockOverlayProps {
  open: boolean;
  onClose: () => void;
  lead: ClientLead;
  plan: InsurancePlan;
  intermediary: IntermediaryProfile;
  fxUsdToHkd?: number;
  fxHkdToRmb?: number;
  onApplyToDeal?: (params: {
    paymentTermYears: 5 | 10 | 15 | 20;
    sumAssuredUsd: number;
    vhisDeductibleHkd: 0 | 20000 | 50000;
  }) => void;
}

export const ClientPresentationLockOverlay: React.FC<ClientPresentationLockOverlayProps> = ({
  open,
  onClose,
  lead,
  plan,
  intermediary,
  fxUsdToHkd = 7.8,
  fxHkdToRmb = 0.92,
  onApplyToDeal,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zhHk: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk);

  const initialTerm = ([5, 10, 15, 20].includes(lead.proposalCart?.paymentTermYears || 10)
    ? lead.proposalCart?.paymentTermYears
    : 10) as 5 | 10 | 15 | 20;

  const [paymentTermYears, setPaymentTermYears] = useState<5 | 10 | 15 | 20>(initialTerm);
  const [sumAssuredUsd, setSumAssuredUsd] = useState<number>(
    lead.proposalCart?.sumAssuredUsd || 100000
  );
  const [vhisDeductibleHkd, setVhisDeductibleHkd] = useState<0 | 20000 | 50000>(
    lead.proposalCart?.hospitalDeductibleHkd ?? 20000
  );
  const [withdrawalRatePct, setWithdrawalRatePct] = useState<5 | 6 | 7>(6);
  const [applied, setApplied] = useState(false);

  const preview = useMemo(
    () =>
      computeClientInteractivePreview({
        clientAge: lead.age,
        paymentTermYears,
        sumAssuredUsd,
        vhisDeductibleHkd,
        withdrawalRatePct,
        fxUsdToHkd,
        fxHkdToRmb,
      }),
    [
      lead.age,
      paymentTermYears,
      sumAssuredUsd,
      vhisDeductibleHkd,
      withdrawalRatePct,
      fxUsdToHkd,
      fxHkdToRmb,
    ]
  );

  if (!open) return null;

  const handleApply = () => {
    onApplyToDeal?.({
      paymentTermYears,
      sumAssuredUsd,
      vhisDeductibleHkd,
    });
    setApplied(true);
    window.setTimeout(() => {
      setApplied(false);
      onClose();
    }, 650);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="PC and iPad Client-Facing Presentation Lock Mode"
      data-testid="ipad-client-lock-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl">
        {/* Clean Client-Safe Top Bar (Zero internal CRM notes / lead temperatures exposed) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
              <Tablet className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-300">
                <Lock className="h-3 w-3" aria-hidden="true" />
                <span>
                  {t(
                    'PC / IPAD CLIENT-SAFE PRESENTATION MODE · INTERNAL NOTES HIDDEN',
                    conv('PC／iPad 統一見客純淨同屏模式 · 已自動隱藏所有內部佣金／跟進備註')
                  )}
                </span>
              </div>
              <h2 className="text-base font-bold text-white">
                {lead.fullNameZh} ({lead.fullNameEn}, {lead.age}歲) · [{plan.insurerCode}]{' '}
                {lang === 'en' ? plan.nameEn : conv(plan.nameZh)}
              </h2>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-ipad-client-lock-btn"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span>{t('Exit Client View', conv('退出見客純淨模式'))}</span>
          </button>
        </div>

        {/* 2-Column Unified PC & iPad Co-Design Body */}
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-12">
          {/* Left Column: Large Touch Controls for Client */}
          <div className="space-y-5 md:col-span-6">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Sliders className="h-4 w-4 text-blue-700" aria-hidden="true" />
              <span>
                {t(
                  'Touch Parameters Together with Your Advisor',
                  conv('請與持牌顧問一齊輕觸調校最適合您家庭嘅方案參數')
                )}
              </span>
            </div>

            {/* Control 1: Payment Term */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>{t('1. Contribution Term (Years)', conv('1. 供款年期選擇'))}</span>
                <span className="font-mono text-blue-700 tabular-nums">
                  {paymentTermYears} {t('Years', conv('年供款期'))}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {([5, 10, 15, 20] as const).map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    data-testid={`ipad-lock-term-${yr}`}
                    onClick={() => setPaymentTermYears(yr)}
                    className={`rounded-xl border py-2.5 font-mono text-xs font-bold tabular-nums transition-colors ${
                      paymentTermYears === yr
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {yr} {t('Yr', conv('年'))}
                  </button>
                ))}
              </div>
            </div>

            {/* Control 2: Core Savings / Protection Sum Assured Slider */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>{t('2. Target Capital / Sum Assured (USD)', conv('2. 核心儲蓄／傳承名義保額'))}</span>
                <span className="font-mono text-sm text-blue-700 tabular-nums">
                  USD ${sumAssuredUsd.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min={30000}
                max={500000}
                step={10000}
                value={sumAssuredUsd}
                onChange={(e) => setSumAssuredUsd(Number(e.target.value))}
                className="h-2.5 w-full cursor-pointer accent-blue-700"
              />
              <div className="flex justify-between font-mono text-[11px] text-slate-500 tabular-nums">
                <span>USD $30,000</span>
                <span>USD $250,000</span>
                <span>USD $500,000</span>
              </div>
            </div>

            {/* Control 3: VHIS Medical Deductible */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>
                  {t(
                    '3. Private Hospital VHIS Annual Deductible',
                    conv('3. 高端自願醫保每年自付費（可對接公司團體醫保）')
                  )}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { val: 0, labelZh: 'HK$0 零自付費', labelEn: 'HK$0 Full' },
                    { val: 20000, labelZh: 'HK$20,000 熱門', labelEn: 'HK$20k Smart' },
                    { val: 50000, labelZh: 'HK$50,000 慳保費', labelEn: 'HK$50k Saver' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    data-testid={`ipad-lock-deductible-${opt.val}`}
                    onClick={() => setVhisDeductibleHkd(opt.val)}
                    className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition-colors whitespace-nowrap ${
                      vhisDeductibleHkd === opt.val
                        ? 'border-teal-700 bg-teal-700 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {lang === 'en' ? opt.labelEn : conv(opt.labelZh)}
                  </button>
                ))}
              </div>
            </div>

            {/* Control 4: Retirement Passive Income Rate */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>
                  {t('4. Annual Retirement Withdrawal Rate', conv('4. 第 20 年起退休自製長糧提取率'))}
                </span>
                <span className="font-mono text-teal-700 tabular-nums">
                  {withdrawalRatePct}% / {t('yr', conv('年'))}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([5, 6, 7] as const).map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setWithdrawalRatePct(rate)}
                    className={`rounded-xl border py-2 font-mono text-xs font-bold tabular-nums ${
                      withdrawalRatePct === rate
                        ? 'border-blue-700 bg-blue-700 text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {rate}% {t('Annual', conv('穩健提取'))}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Live Dual-Currency HKD/RMB Outcome & Gap Closure */}
          <div className="flex flex-col justify-between space-y-5 md:col-span-6">
            <div className="space-y-4">
              {/* Dual-Currency Premium Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-white">
                <span className="text-xs font-medium text-slate-300">
                  {t(
                    'Net Annual Family Contribution (After IRD VHIS Tax Relief)',
                    conv('扣減稅務優惠後 · 每年淨供款預算（港幣／人民幣雙幣同屏）')
                  )}
                </span>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 font-mono tabular-nums">
                  <span
                    data-testid="ipad-lock-net-annual-hkd"
                    className="text-3xl font-bold text-amber-300"
                  >
                    HK${preview.totalNetAnnualHkd.toLocaleString()}
                    <span className="ml-1 text-xs font-normal text-slate-300">/yr</span>
                  </span>
                  <span className="text-sm font-semibold text-teal-300">
                    ≈ RMB ¥{preview.totalNetAnnualRmb.toLocaleString()}/yr
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between border-t border-slate-800 pt-3 font-mono text-xs text-slate-300 tabular-nums">
                  <span>
                    {t('Monthly Equiv:', conv('折合每月：'))} HK$
                    {preview.totalNetMonthlyHkd.toLocaleString()}/mo
                  </span>
                  <span className="text-emerald-400">
                    {t('Tax Saved:', conv('已扣減 VHIS 稅務優惠：'))} HK$
                    {preview.irdTaxSavedHkd.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 6-Axis Gap Closure Progress */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>
                    {t('Household 6-Axis Protection Coverage', conv('家庭六軸保障覆蓋完整度'))}
                  </span>
                  <span className="font-mono text-emerald-700 tabular-nums">
                    {preview.gapClosureBeforePct}% → {preview.gapClosureAfterPct}%
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    style={{ width: `${preview.gapClosureAfterPct}%` }}
                    className="h-full rounded-full bg-emerald-600 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-600">
                  {t(
                    `Includes HK$${preview.cashlessDepositWaivedHkd.toLocaleString()} private hospital admission deposit waiver via Cashless LOG.`,
                    conv(
                      `涵蓋私家醫院免找數入院預批（免除約 HK$${preview.cashlessDepositWaivedHkd.toLocaleString()} 入院按金）及 65 歲自付費無縫下調權。`
                    )
                  )}
                </p>
              </div>

              {/* Yr-20 / Yr-30 Projected Values & Passive Income */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-[11px] font-medium text-slate-500">
                    {t('Yr 20 Projected Value', conv('第 20 年預期總價值'))}
                  </span>
                  <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                    HK${preview.projectedCashValueYr20Hkd.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-[11px] font-medium text-slate-500">
                    {t('Yr 30 Legacy Value', conv('第 30 年財富傳承價值'))}
                  </span>
                  <div className="mt-1 font-mono text-base font-bold text-blue-700 tabular-nums">
                    HK${preview.projectedCashValueYr30Hkd.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3.5">
                  <span className="text-[11px] font-medium text-teal-900">
                    {t('Annual Passive Income', conv(`每年 ${withdrawalRatePct}% 自製長糧`))}
                  </span>
                  <div className="mt-1 font-mono text-base font-bold text-teal-800 tabular-nums">
                    HK${preview.annualRetirementPayoutHkd.toLocaleString()}/yr
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Witness & Apply */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <ShieldCheck className="h-4 w-4 text-teal-700 shrink-0" aria-hidden="true" />
                <span>
                  {intermediary.nameZh} ({intermediary.iaLicenseNo}) · HKIA GL28/GL30 合規同屏演示
                </span>
              </div>

              <button
                type="button"
                data-testid="apply-ipad-lock-to-deal-btn"
                onClick={handleApply}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>
                  {applied
                    ? t('Applied to Proposal ✓', conv('已套用至建議書 ✓'))
                    : t('Lock Parameters into Proposal', conv('確認套用此組參數至建議書'))}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
