import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookmarkPlus,
  CheckCircle2,
  GitBranch,
  Percent,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  buildPremiumFinancingSensitivityMatrix,
  buildThreeGenBeneficiaryTree,
  simulatePartialWithdrawalPlan,
} from '../domain/lifecycleAndComplianceEngine';
import {
  ClientLead,
  CurrencyCode,
  InsurancePlan,
  SavedToolSnapshot,
} from '../domain/types';

interface AdvancedActuarialLabPanelProps {
  activeLead: ClientLead;
  anchorPlan: InsurancePlan | null;
  defaultCurrency: CurrencyCode;
  onUpdateLead: (leadId: string, updater: (prev: ClientLead) => ClientLead) => void;
  onSaveSnapshotToCase?: (snapshot: SavedToolSnapshot) => void;
  onNotify?: (msg: string) => void;
}

export const AdvancedActuarialLabPanel: React.FC<AdvancedActuarialLabPanelProps> = ({
  activeLead,
  anchorPlan,
  defaultCurrency,
  onUpdateLead,
  onSaveSnapshotToCase,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const [activeSubTool, setActiveSubTool] = useState<'WITHDRAWAL' | 'PF_MATRIX' | 'THREE_GEN'>(
    'WITHDRAWAL'
  );

  // #4 Partial Withdrawal ("567") State
  const [wdCurrency, setWdCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [wdAnnualPremium, setWdAnnualPremium] = useState<number>(
    defaultCurrency === 'USD' ? 50000 : 380000
  );
  const [wdPayTerm, setWdPayTerm] = useState<number>(5);
  const [wdStartYear, setWdStartYear] = useState<number>(6);
  const [wdRatePct, setWdRatePct] = useState<number>(7);

  // #5 Premium Financing 2D Matrix State
  const [pfSinglePremiumUsd, setPfSinglePremiumUsd] = useState<number>(1000000);
  const [pfLtvPct, setPfLtvPct] = useState<number>(78);
  const [pfHoldingYears, setPfHoldingYears] = useState<number>(10);

  // #6 3-Gen Contingent Owner Draft
  const [contingentDraft, setContingentDraft] = useState<string>(
    activeLead.contingentOwnerName || ''
  );

  React.useEffect(() => {
    setContingentDraft(activeLead.contingentOwnerName || '');
  }, [activeLead.id, activeLead.contingentOwnerName]);

  const withdrawalSim = useMemo(
    () =>
      simulatePartialWithdrawalPlan({
        clientAge: activeLead.age,
        currency: wdCurrency,
        annualPremium: wdAnnualPremium,
        paymentTermYears: wdPayTerm,
        startWithdrawalYear: Math.max(wdPayTerm, wdStartYear),
        annualWithdrawalPct: wdRatePct,
        effectiveIrrPct: anchorPlan
          ? Math.max(5.2, anchorPlan.rawProjectedIrr * 100)
          : 6.2,
        guaranteedIrrPct: anchorPlan
          ? Math.max(1.0, anchorPlan.guaranteedIrr * 100)
          : 1.25,
      }),
    [activeLead.age, anchorPlan, wdAnnualPremium, wdCurrency, wdPayTerm, wdRatePct, wdStartYear]
  );

  const pfMatrix = useMemo(
    () =>
      buildPremiumFinancingSensitivityMatrix({
        totalSinglePremiumUsd: pfSinglePremiumUsd,
        ltvPct: pfLtvPct,
        holdingYears: pfHoldingYears,
        day1CsvRatioPct: 82,
      }),
    [pfHoldingYears, pfLtvPct, pfSinglePremiumUsd]
  );

  const threeGenTree = useMemo(
    () => buildThreeGenBeneficiaryTree(activeLead, anchorPlan),
    [activeLead, anchorPlan]
  );

  const handleSaveWithdrawalSnapshot = () => {
    if (!onSaveSnapshotToCase) return;
    const snap: SavedToolSnapshot = {
      id: `snap-wd-${Date.now().toString(36)}`,
      toolCode: 'ACT-567',
      toolTitleZh: `「${wdPayTerm}-${Math.max(wdPayTerm, wdStartYear)}-${wdRatePct}」保單部份提領現金流`,
      toolTitleEn: `"${wdPayTerm}-${Math.max(wdPayTerm, wdStartYear)}-${wdRatePct}" Partial Withdrawal Stream`,
      headlineMetric: `${wdCurrency} $${withdrawalSim.annualWithdrawalAmount.toLocaleString()}/yr`,
      summaryZh: `供款 ${wdPayTerm} 年共 ${wdCurrency} $${withdrawalSim.totalPremiumsPaid.toLocaleString()}，第 ${withdrawalSim.startWithdrawalYear} 年起每年提領 ${wdRatePct}%，至 85 歲累計已提 ${wdCurrency} $${withdrawalSim.cumulativeWithdrawnByAge85.toLocaleString()}，預期餘額 ${wdCurrency} $${withdrawalSim.remainingTotalAtAge85.toLocaleString()}。`,
      summaryEn: `${wdPayTerm}-yr pay (${wdCurrency} $${withdrawalSim.totalPremiumsPaid.toLocaleString()}), withdraw ${wdRatePct}%/yr from Yr ${withdrawalSim.startWithdrawalYear}; Age 85 cumulative withdrawn ${wdCurrency} $${withdrawalSim.cumulativeWithdrawnByAge85.toLocaleString()}.`,
      savedAtIso: new Date().toISOString(),
    };
    onSaveSnapshotToCase(snap);
    onNotify?.(
      t(
        'Saved Partial Withdrawal snapshot to active client case.',
        conv('已將「部份提領退休現金流」精算結果釘選至當前客戶檔案。')
      )
    );
  };

  const handleUpdateBeneficiaryPct = (memberId: string, nextPct: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(nextPct) || 0));
    onUpdateLead(activeLead.id, (prev) => {
      const baseMap: Record<string, number> = {};
      for (const b of threeGenTree.gen3Beneficiaries) {
        baseMap[b.memberId] = b.allocationPct;
      }
      baseMap[memberId] = clamped;
      return {
        ...prev,
        beneficiaryAllocations: baseMap,
        lastContactIso: new Date().toISOString(),
      };
    });
  };

  const handleAutoBalanceBeneficiaries = () => {
    const count = threeGenTree.gen3Beneficiaries.length;
    if (count === 0) return;
    const baseShare = Math.floor(100 / count);
    const balanced: Record<string, number> = {};
    threeGenTree.gen3Beneficiaries.forEach((b, idx) => {
      balanced[b.memberId] = idx === count - 1 ? 100 - baseShare * (count - 1) : baseShare;
    });
    onUpdateLead(activeLead.id, (prev) => ({
      ...prev,
      beneficiaryAllocations: balanced,
      lastContactIso: new Date().toISOString(),
    }));
    onNotify?.(
      t(
        'Auto-balanced beneficiary split to 100%.',
        conv('已自動平均分配受益人比例至 100%。')
      )
    );
  };

  const handleSaveContingentOwner = () => {
    onUpdateLead(activeLead.id, (prev) => ({
      ...prev,
      contingentOwnerName: contingentDraft.trim(),
      lastContactIso: new Date().toISOString(),
    }));
    onNotify?.(
      t(
        'Saved Contingent Policyholder designation.',
        conv('已儲存後備保單持有人 (Contingent Owner) 設定。')
      )
    );
  };

  // Build clean SVG polylines for #4 Withdrawal Chart
  const chartPoints = useMemo(() => {
    const sampled = withdrawalSim.allRows.filter(
      (r, idx) => idx % 2 === 0 || idx === withdrawalSim.allRows.length - 1
    );
    const maxVal = Math.max(
      1,
      ...sampled.map((r) => Math.max(r.remainingTotalSurrender, r.cumulativeWithdrawn))
    );
    const w = 680;
    const h = 190;
    const padX = 36;
    const padY = 20;
    const plotW = w - padX * 2;
    const plotH = h - padY * 2;

    const toCoord = (idx: number, val: number) => {
      const x = padX + (idx / Math.max(1, sampled.length - 1)) * plotW;
      const y = padY + plotH - (val / maxVal) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    };

    return {
      w,
      h,
      maxVal,
      sampled,
      surrenderLine: sampled.map((r, i) => toCoord(i, r.remainingTotalSurrender)).join(' '),
      withdrawnLine: sampled.map((r, i) => toCoord(i, r.cumulativeWithdrawn)).join(' '),
    };
  }, [withdrawalSim.allRows]);

  return (
    <div data-testid="stage2c-actuarial-lab" className="space-y-5">
      {/* Header & 3-Module Segmented Switcher */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">
              {t(
                'Advanced Wealth Withdrawal, Premium Financing & 3-Generation Legacy Lab',
                conv('進階退休提領模擬、保費融資 HIBOR 息差矩陣與三代傳承架構室')
              )}
            </h2>
            <p className="text-xs text-slate-600">
              {t(
                `Synced with active client ${activeLead.fullNameEn} (Age ${activeLead.age}) · ${
                  anchorPlan ? `[${anchorPlan.insurerCode}] ${anchorPlan.nameEn}` : 'Participating Wealth Benchmark'
                }`,
                conv(
                  `即時連動當前客戶 ${activeLead.fullNameZh}（${activeLead.age} 歲）· ${
                    anchorPlan ? `[${anchorPlan.insurerCode}] ${anchorPlan.nameZh}` : '多元貨幣儲蓄基準'
                  }`
                )
              )}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Advanced actuarial tools"
            className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            <button
              type="button"
              role="tab"
              data-testid="lab-tab-withdrawal"
              aria-selected={activeSubTool === 'WITHDRAWAL'}
              onClick={() => setActiveSubTool('WITHDRAWAL')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                activeSubTool === 'WITHDRAWAL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('01. "567" Partial Withdrawal', conv('01. 「567」提領現金流'))}</span>
            </button>
            <button
              type="button"
              role="tab"
              data-testid="lab-tab-pf-matrix"
              aria-selected={activeSubTool === 'PF_MATRIX'}
              onClick={() => setActiveSubTool('PF_MATRIX')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                activeSubTool === 'PF_MATRIX'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <Percent className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('02. 2D HIBOR Sensitivity Matrix', conv('02. 保費融資雙維度矩陣'))}</span>
            </button>
            <button
              type="button"
              role="tab"
              data-testid="lab-tab-three-gen"
              aria-selected={activeSubTool === 'THREE_GEN'}
              onClick={() => setActiveSubTool('THREE_GEN')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                activeSubTool === 'THREE_GEN'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('03. 3-Gen Beneficiary & Split Tree', conv('03. 三代受益人與分拆樹'))}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SUB-TOOL 01: "567" / CUSTOM PARTIAL WITHDRAWAL SIMULATOR           */}
      {/* ================================================================== */}
      {activeSubTool === 'WITHDRAWAL' && (
        <section
          data-testid="withdrawal-simulator-panel"
          className="rounded-xl border border-slate-200 bg-white p-5 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t(
                  'Custom Partial Withdrawal & Passive Retirement Stream (Through Age 100)',
                  conv('自訂保單部份提領（「567」／退休被動現金流）百歲演算法')
                )}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {t(
                  `HKIA GL28 Illustration Cap Enforced: ${withdrawalSim.effectiveIllustratedIrrPct}% p.a. (${wdCurrency})`,
                  conv(
                    `嚴格遵守保監局 GL28 分紅演示上限：${withdrawalSim.effectiveIllustratedIrrPct}% 年化 (${wdCurrency})`
                  )
                )}
              </p>
            </div>
            {onSaveSnapshotToCase && (
              <button
                type="button"
                data-testid="save-withdrawal-snapshot-btn"
                onClick={handleSaveWithdrawalSnapshot}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/70 bg-[#0B172A] px-3.5 py-2 text-xs font-semibold text-[#F3D37A] hover:bg-slate-900 whitespace-nowrap shrink-0"
              >
                <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Pin to Client Case', conv('釘選至客戶提案'))}</span>
              </button>
            )}
          </div>

          {/* Interactive Controls Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="wd-currency-select"
                className="block text-xs font-semibold text-slate-700"
              >
                {t('Policy Currency & Annual Outlay', conv('保單貨幣及每年供款額'))}
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <select
                  id="wd-currency-select"
                  value={wdCurrency}
                  onChange={(e) => {
                    const nextC = e.target.value as CurrencyCode;
                    setWdCurrency(nextC);
                    setWdAnnualPremium(nextC === 'USD' ? 50000 : 380000);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900"
                >
                  <option value="USD">USD</option>
                  <option value="HKD">HKD</option>
                  <option value="RMB">RMB</option>
                </select>
                <input
                  type="number"
                  aria-label="Annual premium amount"
                  min={10000}
                  step={5000}
                  value={wdAnnualPremium}
                  onChange={(e) => setWdAnnualPremium(Math.max(5000, Number(e.target.value) || 0))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 tabular-nums"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700">
                {t('Payment Term (Years)', conv('供款年期'))}
              </span>
              <div className="mt-1.5 flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {[2, 5, 10].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setWdPayTerm(yr);
                      if (wdStartYear < yr) setWdStartYear(yr + 1);
                    }}
                    className={`flex-1 rounded-md px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
                      wdPayTerm === yr
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {yr}
                    {t('y', '年')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700">
                {t('Start Withdrawal Year', conv('開始提領保單年度'))}
              </span>
              <div className="mt-1.5 flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {[5, 6, 7, 10].map((yr) => {
                  const disabled = yr < wdPayTerm;
                  return (
                    <button
                      key={yr}
                      type="button"
                      disabled={disabled}
                      onClick={() => setWdStartYear(yr)}
                      className={`flex-1 rounded-md px-2 py-1.5 font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
                        Math.max(wdPayTerm, wdStartYear) === yr
                          ? 'bg-white text-slate-900 shadow-xs'
                          : disabled
                          ? 'cursor-not-allowed text-slate-300'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Yr {yr}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700">
                {t('Annual Withdrawal (% Total Paid)', conv('每年提領佔總保費比例'))}
              </span>
              <div className="mt-1.5 flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {[5, 6, 7, 8].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    data-testid={`wd-rate-${pct}-btn`}
                    onClick={() => setWdRatePct(pct)}
                    className={`flex-1 rounded-md px-2 py-1.5 font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
                      wdRatePct === pct
                        ? 'bg-[#0B172A] text-[#F3D37A]'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4 Headline KPI Strip */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 font-mono tabular-nums">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="font-sans text-xs font-medium text-slate-500">
                {t('Total Principal Paid', conv('總已繳保費本金'))}
              </div>
              <div className="mt-1 text-base font-bold text-slate-900">
                {wdCurrency} ${withdrawalSim.totalPremiumsPaid.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3.5">
              <div className="font-sans text-xs font-medium text-teal-900">
                {t(
                  `Annual Passive Cash (From Yr ${withdrawalSim.startWithdrawalYear})`,
                  conv(`第 ${withdrawalSim.startWithdrawalYear} 年起每年被動提領`)
                )}
              </div>
              <div
                data-testid="wd-annual-cash-value"
                className="mt-1 text-base font-bold text-teal-900"
              >
                {wdCurrency} ${withdrawalSim.annualWithdrawalAmount.toLocaleString()} / yr
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="font-sans text-xs font-medium text-slate-500">
                {t('Cumulative Withdrawn (Age 85)', conv('至 85 歲累計已提現金'))}
              </div>
              <div className="mt-1 text-base font-bold text-blue-700">
                {wdCurrency} ${withdrawalSim.cumulativeWithdrawnByAge85.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-[#0B172A] p-3.5 text-white">
              <div className="font-sans text-xs font-medium text-[#F3D37A]">
                {t('Remaining Legacy Value (Age 85)', conv('85 歲預期剩餘傳承價值'))}
              </div>
              <div className="mt-1 text-base font-bold text-white">
                {wdCurrency} ${withdrawalSim.remainingTotalAtAge85.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Dual-Curve SVG Chart */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-800">
                {t(
                  'Remaining Policy Surrender Value vs. Cumulative Cash Withdrawn (To Age 100)',
                  conv('提領後剩餘保單退保總價值 vs 累計已提領現金流（直達 100 歲）')
                )}
              </span>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 bg-teal-600" />
                  <span>{t('Remaining Policy Value', conv('剩餘保單價值'))}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 bg-blue-600" />
                  <span>{t('Cumulative Withdrawn', conv('累計已提領總額'))}</span>
                </span>
              </div>
            </div>
            <svg
              role="img"
              aria-label="Partial withdrawal projection chart through age 100"
              viewBox={`0 0 ${chartPoints.w} ${chartPoints.h}`}
              className="h-44 w-full"
            >
              <line
                x1={36}
                y1={chartPoints.h - 20}
                x2={chartPoints.w - 36}
                y2={chartPoints.h - 20}
                stroke="#CBD5E1"
                strokeWidth="1"
              />
              <polyline
                fill="none"
                stroke="#0D9488"
                strokeWidth="2.6"
                points={chartPoints.surrenderLine}
              />
              <polyline
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.2"
                strokeDasharray="5 3"
                points={chartPoints.withdrawnLine}
              />
            </svg>
          </div>

          {/* Milestone Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[680px] border-collapse text-left text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-sans text-slate-600">
                  <th className="py-2.5 px-3 font-semibold">{t('Policy Yr / Age', conv('保單年度／年齡'))}</th>
                  <th className="py-2.5 px-3 text-right font-semibold">{t('Annual Withdrawal', conv('當年提領'))}</th>
                  <th className="py-2.5 px-3 text-right font-semibold">{t('Cumulative Withdrawn', conv('累計已提領'))}</th>
                  <th className="py-2.5 px-3 text-right font-semibold">{t('Rem. Guaranteed', conv('剩餘保證價值'))}</th>
                  <th className="py-2.5 px-3 text-right font-semibold">{t('Rem. Total Value', conv('剩餘預期總價值'))}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {withdrawalSim.milestoneRows.map((row) => (
                  <tr key={row.policyYear} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      Yr {row.policyYear} · {row.clientAge}
                      {t('y', '歲')}
                    </td>
                    <td className="py-2.5 px-3 text-right text-teal-700">
                      {wdCurrency} ${row.annualWithdrawal.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-blue-700">
                      {wdCurrency} ${row.cumulativeWithdrawn.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700">
                      {wdCurrency} ${row.remainingGuaranteed.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-950">
                      {wdCurrency} ${row.remainingTotalSurrender.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* SUB-TOOL 02: 2D PREMIUM FINANCING HIBOR / SOFR SENSITIVITY MATRIX  */}
      {/* ================================================================== */}
      {activeSubTool === 'PF_MATRIX' && (
        <section
          data-testid="pf-sensitivity-matrix-panel"
          className="rounded-xl border border-slate-200 bg-white p-5 space-y-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t(
                  'Cross-Insurer Premium Financing 2D HIBOR / SOFR Stress Matrix',
                  conv('跨保司保費融資 HIBOR / SOFR 融資成本 vs 分紅派息率雙維度壓力矩陣')
                )}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {t(
                  `Client Self-Funded Equity: USD $${pfMatrix.clientEquityUsd.toLocaleString()} · Bank Loan (${pfMatrix.ltvPct}% LTV): USD $${pfMatrix.bankLoanUsd.toLocaleString()} · Break-Even Bank Rate @ 5.2% Crediting: ${pfMatrix.breakEvenFundingRateAtBaseCreditingPct}%`,
                  conv(
                    `客戶自備本金：USD $${pfMatrix.clientEquityUsd.toLocaleString()} · 銀行貸款 (${pfMatrix.ltvPct}% LTV)：USD $${pfMatrix.bankLoanUsd.toLocaleString()} · 5.2% 派息下融資打和利率上限：${pfMatrix.breakEvenFundingRateAtBaseCreditingPct}%`
                  )
                )}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <span className="block text-xs font-semibold text-slate-700">
                {t('Total Single Premium (USD)', conv('整付保單總保費 (USD)'))}
              </span>
              <div className="mt-1.5 flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {[500000, 1000000, 2000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPfSinglePremiumUsd(amt)}
                    className={`flex-1 rounded-md px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
                      pfSinglePremiumUsd === amt
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ${(amt / 1000000).toFixed(1)}M
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700">
                {t('Bank Financing LTV Ratio', conv('私人銀行貸款成數 (LTV)'))}
              </span>
              <div className="mt-1.5 flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {[70, 75, 78, 80, 85].map((ltv) => (
                  <button
                    key={ltv}
                    type="button"
                    data-testid={`pf-ltv-${ltv}-btn`}
                    onClick={() => setPfLtvPct(ltv)}
                    className={`flex-1 rounded-md px-2 py-1.5 font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
                      pfLtvPct === ltv
                        ? 'bg-[#0B172A] text-[#F3D37A]'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ltv}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700">
                {t('Holding Horizon', conv('持有年期'))}
              </span>
              <div className="mt-1.5 flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {[8, 10, 15].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setPfHoldingYears(yr)}
                    className={`flex-1 rounded-md px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
                      pfHoldingYears === yr
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {yr} {t('Yrs', '年')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5x5 2D Sensitivity Matrix */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[740px] border-collapse text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                  <th className="py-3 px-3 text-left font-sans font-semibold">
                    {t('Bank Rate \\ Policy Rate', conv('融資年息 \\ 保單派息率'))}
                  </th>
                  {pfMatrix.creditingRatesPct.map((cRate) => (
                    <th key={cRate} className="py-3 px-3 text-right font-semibold">
                      {cRate.toFixed(1)}% {t('Crediting', conv('派息'))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pfMatrix.rows.map((row, rIdx) => {
                  const fRate = pfMatrix.fundingRatesPct[rIdx];
                  return (
                    <tr key={fRate}>
                      <td className="bg-slate-50/70 py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        {fRate.toFixed(2)}% {t('Funding', conv('銀行息'))}
                      </td>
                      {row.map((cell) => (
                        <td
                          key={`${cell.fundingRatePct}-${cell.creditingRatePct}`}
                          className={`py-2.5 px-3 text-right ${
                            cell.marginCallWarning
                              ? 'bg-rose-50/80 text-rose-900'
                              : cell.isPositiveCarry
                              ? 'bg-emerald-50/40 text-emerald-950'
                              : 'bg-amber-50/50 text-amber-950'
                          }`}
                        >
                          <div className="font-bold">
                            {cell.netAnnualizedRoePct > 0 ? '+' : ''}
                            {cell.netAnnualizedRoePct.toFixed(1)}% ROE
                          </div>
                          <div className="mt-0.5 text-[10px] font-sans text-slate-600">
                            {cell.marginCallWarning
                              ? t('Margin Alert', conv('補倉風險'))
                              : cell.isPositiveCarry
                              ? `+$${Math.round(cell.netDollarGainUsd / 1000)}k`
                              : `-$${Math.abs(Math.round(cell.netDollarGainUsd / 1000))}k`}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* SUB-TOOL 03: 3-GENERATION FAMILY & BENEFICIARY STRUCTURE TREE      */}
      {/* ================================================================== */}
      {activeSubTool === 'THREE_GEN' && (
        <section
          data-testid="three-gen-legacy-tree-panel"
          className="rounded-xl border border-slate-200 bg-white p-5 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t(
                  '3-Generation Policyholder, Successor Insured & Beneficiary Split Architecture',
                  conv('跨三代保單持有人、後備持有人、無限次更換受保人及受益人比例樹')
                )}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {lang === 'en'
                  ? threeGenTree.policySplitSummaryEn
                  : conv(threeGenTree.policySplitSummaryZh)}
              </p>
            </div>
            <button
              type="button"
              data-testid="auto-balance-beneficiaries-btn"
              onClick={handleAutoBalanceBeneficiaries}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('Equalize 100% Split', conv('一鍵平均分配 100%'))}</span>
            </button>
          </div>

          {/* 3-Tier Visual Tree */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Tier 1: Gen 1 Policyholder & Contingent Owner */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>{t('Gen 1 · Policyholder & Control', conv('第一代 · 保單持有人與控制權'))}</span>
                <span className="font-mono text-[11px] text-slate-500">GEN 01</span>
              </div>
              <div className="text-xs text-slate-700">
                <div className="font-semibold text-slate-950">
                  {threeGenTree.gen1OwnerNameZh} ({threeGenTree.gen1OwnerNameEn})
                </div>
                <div className="mt-0.5 text-slate-500">
                  {t('Full cash value & policy split control', conv('掌握退保價值提取權與保單分拆主導權'))}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                <label
                  htmlFor="contingent-owner-input"
                  className="block text-[11px] font-semibold text-slate-700"
                >
                  {t('Contingent Owner (Probate-Free Handover)', conv('後備保單持有人（免遺囑認證接管）'))}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="contingent-owner-input"
                    type="text"
                    value={contingentDraft}
                    onChange={(e) => setContingentDraft(e.target.value)}
                    placeholder={threeGenTree.gen1ContingentOwner}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleSaveContingentOwner}
                    className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    {t('Save', conv('儲存'))}
                  </button>
                </div>
              </div>
            </div>

            {/* Tier 2: Gen 2 Insured & Successor Insureds */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>{t('Gen 2 · Insured & Compounding Span', conv('第二代 · 受保人與滾存年期'))}</span>
                <span className="font-mono text-[11px] text-slate-500">GEN 02</span>
              </div>
              <div className="text-xs text-slate-700">
                <div className="font-semibold text-slate-950">
                  {t('Initial Insured:', conv('首任受保人：'))} {threeGenTree.gen2CurrentInsuredZh}
                </div>
                <div className="mt-1 text-slate-600">
                  {t('Designated Successor Insureds:', conv('可轉換後備受保人名單：'))}
                </div>
                <ul className="mt-1.5 space-y-1 text-slate-800">
                  {threeGenTree.gen2SuccessorCandidates.map((cand) => (
                    <li key={cand} className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-teal-700 shrink-0" aria-hidden="true" />
                      <span>{cand}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Tier 3: Gen 3 Beneficiary % Allocation */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>{t('Gen 3 · Beneficiary % Split', conv('第三代 · 身故賠償及分拆受益比例'))}</span>
                <span
                  data-testid="beneficiary-total-pct"
                  className={`font-mono text-xs font-bold tabular-nums ${
                    threeGenTree.isAllocationBalanced ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {threeGenTree.totalAllocationPct}% / 100%
                </span>
              </div>

              <div className="space-y-2.5">
                {threeGenTree.gen3Beneficiaries.map((ben) => (
                  <div key={ben.memberId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {ben.nameZh} · {lang === 'en' ? ben.relationLabelEn : conv(ben.relationLabelZh)}
                      </span>
                      <div className="flex items-center gap-1 font-mono tabular-nums">
                        <input
                          type="number"
                          aria-label={`Allocation percent for ${ben.nameEn}`}
                          min={0}
                          max={100}
                          value={ben.allocationPct}
                          onChange={(e) =>
                            handleUpdateBeneficiaryPct(ben.memberId, Number(e.target.value))
                          }
                          className="w-16 rounded border border-slate-300 px-2 py-0.5 text-right text-xs font-bold text-slate-900"
                        />
                        <span>%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        style={{ width: `${Math.min(100, ben.allocationPct)}%` }}
                        className="h-full bg-[#0B172A]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {threeGenTree.isAllocationBalanced ? (
                <div className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {t(
                      'Beneficiary allocation sums cleanly to 100%.',
                      conv('受益人分配總和已準確核對為 100%。')
                    )}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {t(
                      `Total is ${threeGenTree.totalAllocationPct}% — adjust to 100% before policy endorsement.`,
                      conv(`目前總和為 ${threeGenTree.totalAllocationPct}%，遞交批註前請調整至 100%。`)
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
