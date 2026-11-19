import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { GuidedStageKey, GuidedStepGateResult } from '../domain/guidedWorkflowEngine';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';

interface GuidedStepFooterProps {
  gate: GuidedStepGateResult;
  onGoNext: (nextSection: GuidedStageKey) => void;
  onGoBack?: () => void;
  backLabelZh?: string;
  backLabelEn?: string;
  primaryActionLabelZh?: string;
  primaryActionLabelEn?: string;
  onPrimaryAction?: () => void;
  showPrimaryAction?: boolean;
  testIdPrefix?: string;
}

export const GuidedStepFooter: React.FC<GuidedStepFooterProps> = ({
  gate,
  onGoNext,
  onGoBack,
  backLabelZh = '返回上一步',
  backLabelEn = 'Back',
  primaryActionLabelZh,
  primaryActionLabelEn,
  onPrimaryAction,
  showPrimaryAction = false,
  testIdPrefix = 'guided-step',
}) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  return (
    <section
      data-testid={`${testIdPrefix}-footer`}
      aria-label="Current step completion and next move"
      className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
        gate.canAdvance
          ? 'border-emerald-300 bg-emerald-50/70'
          : 'border-slate-300 bg-white shadow-xs'
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-slate-900 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#F3D37A] tabular-nums">
              {t(`STEP ${gate.stepNumber}/${gate.totalSteps}`, `第 ${gate.stepNumber}／${gate.totalSteps} 步`)}
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              {t(gate.stepTitleEn, conv(gate.stepTitleZh))}
            </h3>
          </div>

          {gate.checklist.length > 0 && (
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
              {gate.checklist.map((item) => (
                <li
                  key={item.id}
                  className={`inline-flex items-center gap-1.5 font-medium ${
                    item.done ? 'text-emerald-800' : 'text-slate-600'
                  }`}
                >
                  {item.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
                  )}
                  <span>{t(item.labelEn, conv(item.labelZh))}</span>
                </li>
              ))}
            </ul>
          )}

          {!gate.canAdvance && gate.blockingHintZh && (
            <p
              data-testid={`${testIdPrefix}-blocking-hint`}
              className="text-xs font-medium text-amber-800"
            >
              {t(gate.blockingHintEn, conv(gate.blockingHintZh))}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t(backLabelEn, conv(backLabelZh))}</span>
            </button>
          )}

          {showPrimaryAction && onPrimaryAction && primaryActionLabelZh && !gate.canAdvance && (
            <button
              type="button"
              data-testid={`${testIdPrefix}-confirm-action-btn`}
              onClick={onPrimaryAction}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-[#F3D37A] hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>{t(primaryActionLabelEn || primaryActionLabelZh, conv(primaryActionLabelZh))}</span>
            </button>
          )}

          {gate.canAdvance && gate.nextSection && (
            <button
              type="button"
              data-testid={`${testIdPrefix}-next-btn`}
              onClick={() => onGoNext(gate.nextSection!)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition-colors whitespace-nowrap"
            >
              <span>{t(gate.nextCtaEn, conv(gate.nextCtaZh))}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
