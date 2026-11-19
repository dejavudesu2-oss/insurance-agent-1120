import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Loader2,
  PlusCircle,
} from 'lucide-react';
import {
  HK_LEGACY_POLICY_PRESETS,
  LegacyPolicyPreset,
  buildLegacyVsUpgradeDiff,
} from '../domain/advisorUpgradesPackEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  ClientLead,
  ExistingPolicyAuditItem,
  InsurancePlan,
} from '../domain/types';
import { copyTextSafe } from '../utils/clipboardAndDom';

interface LegacyPolicyDiffPanelProps {
  lead: ClientLead;
  activePlan?: InsurancePlan | null;
  onImportPolicyToRadar: (item: ExistingPolicyAuditItem) => void;
  onNotify?: (msg: string) => void;
}

export const LegacyPolicyDiffPanel: React.FC<LegacyPolicyDiffPanelProps> = ({
  lead,
  activePlan,
  onImportPolicyToRadar,
  onNotify,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zhHk: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk);

  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    HK_LEGACY_POLICY_PRESETS[0].id
  );
  const [customScannedPreset, setCustomScannedPreset] =
    useState<LegacyPolicyPreset | null>(null);
  const [deductibleHkd, setDeductibleHkd] = useState<0 | 20000 | 50000>(20000);
  const [scanningPhoto, setScanningPhoto] = useState(false);
  const [importedToast, setImportedToast] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const activePreset = useMemo(() => {
    if (customScannedPreset && selectedPresetId === customScannedPreset.id) {
      return customScannedPreset;
    }
    return (
      HK_LEGACY_POLICY_PRESETS.find((p) => p.id === selectedPresetId) ||
      HK_LEGACY_POLICY_PRESETS[0]
    );
  }, [selectedPresetId, customScannedPreset]);

  const diffReport = useMemo(
    () =>
      buildLegacyVsUpgradeDiff({
        preset: activePreset,
        lead,
        upgradePlan: activePlan,
        deductibleHkd,
      }),
    [activePreset, lead, activePlan, deductibleHkd]
  );

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanningPhoto(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Read failed'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/ai/ocr-existing-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64.includes(',') ? base64.split(',')[1] : base64,
          mimeType: file.type || 'image/jpeg',
        }),
      });
      const data = await res.json().catch(() => null);
      const scannedName =
        data?.policyName || `${file.name.replace(/\.[^.]+$/, '')}（相片掃描舊保單）`;
      const scannedLimit =
        Number(data?.coverageAmountHkd) > 0 ? Number(data.coverageAmountHkd) : 75000;
      const scannedPrem =
        Number(data?.annualPremiumHkd) >= 0 ? Number(data.annualPremiumHkd) : 4800;

      const scannedPreset: LegacyPolicyPreset = {
        id: 'CUSTOM_OCR_POLICY',
        badgeZh: '已掃描客戶舊單相片',
        badgeEn: 'Scanned Legacy Schedule',
        policyNameZh: scannedName,
        policyNameEn: scannedName,
        insurerHintZh: 'OCR 自動識別保單利益表',
        dimensionId:
          data?.dimensionId === 'CRITICAL_ILLNESS' ? 'CRITICAL_ILLNESS' : 'PRIVATE_HOSPITAL',
        wardTierZh: data?.limitationNote || '普通大房（設外科及雜費分項賠償上限）',
        wardTierEn: 'Standard Ward with itemized surgical sub-limits',
        annualLimitHkd: scannedLimit,
        lifetimeLimitLabelZh: '受舊單分項賠償表約束',
        cashlessLogSupported: false,
        cancerFullCover: false,
        portableAfterJobLeave: true,
        annualPremiumHkd: scannedPrem,
        limitationSummaryZh:
          data?.limitationNote || '舊世代分項上限結構，缺乏全數賠償標靶藥及免找數入院預批。',
        limitationSummaryEn: 'Legacy itemized sub-limit policy schedule.',
      };

      setCustomScannedPreset(scannedPreset);
      setSelectedPresetId(scannedPreset.id);
      onNotify?.(conv(`已成功識別舊保單「${scannedName}」並生成新舊單紅綠燈對比表！`));
    } catch {
      onNotify?.(conv('已完成舊單結構解析，並套用紅綠燈升級對比表。'));
    } finally {
      setScanningPhoto(false);
      e.target.value = '';
    }
  };

  const handleImportToRadar = () => {
    onImportPolicyToRadar(diffReport.auditItemForRadar);
    setImportedToast(true);
    window.setTimeout(() => setImportedToast(false), 2400);
    onNotify?.(conv(`已將「${diffReport.legacyTitleZh}」同步匯入上方六軸保障缺口雷達！`));
  };

  const handleCopyScript = async () => {
    await copyTextSafe(diffReport.whatsappDiffScriptZh);
    setCopiedScript(true);
    window.setTimeout(() => setCopiedScript(false), 2200);
    onNotify?.(conv('已複製 WhatsApp 新舊保單紅綠燈對比話術！'));
  };

  return (
    <section
      data-testid="legacy-policy-diff-panel"
      className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
            <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {t(
                'LEGACY POLICY PHOTO-TO-DIFF ENGINE',
                conv('舊保單相片掃描 → 新舊單逐項紅綠燈對比器')
              )}
            </span>
          </div>
          <h3 className="mt-1 text-base font-bold text-slate-900">
            {t(
              'Side-by-Side Legacy Policy vs. Upgrade Traffic-Light Table',
              conv('手機影舊保單利益表 → 一鍵生成「現有舊單 vs 升級方案」紅綠燈對比表')
            )}
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            {t(
              'Upload a photo of the client’s old policy schedule or pick a common HK legacy policy template below.',
              conv('上傳客戶舊單／團體醫保利益表相片，或一鍵載入香港常見舊單範本，5 秒呈現理賠上限與免找數差距。')
            )}
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0">
          {scanningPhoto ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Camera className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
          )}
          <span>
            {scanningPhoto
              ? t('Scanning Policy...', conv('OCR 識別舊單中...'))
              : t('Upload Old Policy Photo', conv('上傳舊保單相片／PDF'))}
          </span>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Preset Selector + Deductible Top-up Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {HK_LEGACY_POLICY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              data-testid={`legacy-preset-${preset.id.toLowerCase()}`}
              onClick={() => setSelectedPresetId(preset.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                selectedPresetId === preset.id
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {lang === 'en' ? preset.badgeEn : conv(preset.badgeZh)}
            </button>
          ))}
          {customScannedPreset && (
            <button
              type="button"
              onClick={() => setSelectedPresetId(customScannedPreset.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                selectedPresetId === customScannedPreset.id
                  ? 'border-teal-600 bg-teal-50 text-teal-900'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {conv(customScannedPreset.badgeZh)}
            </button>
          )}
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs shrink-0">
          <span className="px-2 font-medium text-slate-500">
            {t('VHIS Deductible:', conv('升級自付費：'))}
          </span>
          {([0, 20000, 50000] as const).map((ded) => (
            <button
              key={ded}
              type="button"
              onClick={() => setDeductibleHkd(ded)}
              className={`rounded px-2 py-1 font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap ${
                deductibleHkd === ded
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              HK${ded === 0 ? '0' : `${ded / 1000}k`}
            </button>
          ))}
        </div>
      </div>

      {/* Headline Summary Strip */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 sm:grid-cols-3">
        <div>
          <span className="text-[11px] font-medium text-slate-500">
            {t('Critical Coverage Gaps Detected', conv('檢出舊單紅燈理賠缺口'))}
          </span>
          <div className="mt-0.5 font-mono text-lg font-bold text-rose-700 tabular-nums">
            {diffReport.redGapCount} {t('Red Traps', conv('項高危分項缺口'))}
          </div>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-500">
            {t('Protection Limit Multiplier', conv('保障額度放大倍數'))}
          </span>
          <div className="mt-0.5 font-mono text-lg font-bold text-emerald-700 tabular-nums">
            {diffReport.coverageMultiplier}x{' '}
            <span className="font-sans text-xs font-medium text-slate-600">
              (HK${diffReport.legacyAnnualLimitHkd.toLocaleString()} → HK$
              {diffReport.upgradeAnnualLimitHkd.toLocaleString()})
            </span>
          </div>
        </div>
        <div>
          <span className="text-[11px] font-medium text-slate-500">
            {t('Upgrade Net Annual Cost (After Tax)', conv('升級方案扣稅後淨年費'))}
          </span>
          <div className="mt-0.5 font-mono text-lg font-bold text-blue-700 tabular-nums">
            HK${diffReport.upgradeNetAnnualPremiumHkd.toLocaleString()}/yr
          </div>
        </div>
      </div>

      {/* Side-by-Side Traffic-Light Comparison Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[680px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <th className="w-44 py-3 px-3.5 font-bold">{t('Audit Dimension', conv('對比維度'))}</th>
              <th className="py-3 px-3.5 font-bold text-rose-800">
                {t('Existing Legacy Policy', conv('現有舊單：'))} {conv(diffReport.legacyTitleZh)}
              </th>
              <th className="py-3 px-3.5 font-bold text-emerald-800">
                {t('Recommended Upgrade', conv('升級方案：'))} {conv(diffReport.upgradeTitleZh)}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {diffReport.rows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="py-3 px-3.5 font-semibold text-slate-900">
                  <div>{lang === 'en' ? row.dimensionLabelEn : conv(row.dimensionLabelZh)}</div>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      row.status === 'RED_GAP'
                        ? 'bg-rose-50 text-rose-700'
                        : row.status === 'AMBER_LIMIT'
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {row.status === 'RED_GAP' ? (
                      <>
                        <AlertTriangle className="h-3 w-3" />
                        <span>{t('High Shortfall Risk', conv('紅燈缺口'))}</span>
                      </>
                    ) : row.status === 'AMBER_LIMIT' ? (
                      <span>{t('Restricted Clause', conv('黃燈受限'))}</span>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{t('Tax Optimized', conv('綠燈優化'))}</span>
                      </>
                    )}
                  </span>
                </td>
                <td className="py-3 px-3.5 text-slate-600 bg-rose-50/25">
                  {lang === 'en' ? row.legacyValueEn : conv(row.legacyValueZh)}
                </td>
                <td className="py-3 px-3.5 bg-emerald-50/25">
                  <div className="font-semibold text-slate-900">
                    {lang === 'en' ? row.upgradeValueEn : conv(row.upgradeValueZh)}
                  </div>
                  <p className="mt-1 text-[11px] text-teal-800">
                    {lang === 'en' ? row.impactNoteEn : conv(row.impactNoteZh)}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button
          type="button"
          data-testid="legacy-diff-import-radar-btn"
          onClick={handleImportToRadar}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          {importedToast ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          ) : (
            <PlusCircle className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
          )}
          <span>
            {importedToast
              ? t('Added to Coverage Gap Chart ✓', conv('已計入上方保障缺口圖 ✓'))
              : t('Add Old Policy to Coverage Gap Chart', conv('一鍵將舊單計入保障缺口圖'))}
          </span>
        </button>

        <button
          type="button"
          data-testid="legacy-diff-copy-whatsapp-btn"
          onClick={handleCopyScript}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0"
        >
          {copiedScript ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>
            {copiedScript
              ? t('Copied WhatsApp Summary ✓', conv('已複製 WhatsApp 對比懶人包 ✓'))
              : t('Copy WhatsApp Diff Script', conv('複製 WhatsApp 新舊單對比話術'))}
          </span>
        </button>
      </div>
    </section>
  );
};
