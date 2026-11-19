import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Crosshair,
  X,
} from 'lucide-react';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  CANTONESE_TUTORIAL_CHAPTERS,
  type TutorialChapterItem,
  type TutorialSubStepItem,
  type TutorialTargetSubTab,
} from '../domain/tutorialWalkthroughConfig';
import type { WorkspaceSection } from './SidebarNav';

export interface InteractiveWalkthroughCoachProps {
  open: boolean;
  activeChapterId: string;
  onSelectChapter: (
    chapterId: string,
    targetStage: WorkspaceSection,
    targetSubTab?: TutorialTargetSubTab
  ) => void;
  onNavigateSubStep: (
    targetStage: WorkspaceSection,
    targetSubTab?: TutorialTargetSubTab
  ) => void;
  onClose: () => void;
}

export const InteractiveWalkthroughCoach: React.FC<InteractiveWalkthroughCoachProps> = ({
  open,
  activeChapterId,
  onSelectChapter,
  onNavigateSubStep,
  onClose,
}) => {
  const { lang, t } = useLanguage();
  const conv = useCallback(
    (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh),
    [lang]
  );

  const [minimized, setMinimized] = useState(false);
  const [completedSubIds, setCompletedSubIds] = useState<Record<string, boolean>>({});
  const [spotlightFeedback, setSpotlightFeedback] = useState<string | null>(null);

  const chapterIndex = useMemo(() => {
    const idx = CANTONESE_TUTORIAL_CHAPTERS.findIndex((c) => c.id === activeChapterId);
    return idx >= 0 ? idx : 0;
  }, [activeChapterId]);

  const currentChapter: TutorialChapterItem = CANTONESE_TUTORIAL_CHAPTERS[chapterIndex];

  useEffect(() => {
    setSpotlightFeedback(null);
  }, [activeChapterId]);

  const clearExistingSpotlights = useCallback(() => {
    if (typeof document === 'undefined') return;
    const prev = document.getElementById('hk-coach-dom-spotlight');
    if (prev) prev.remove();
  }, []);

  useEffect(() => {
    return () => {
      clearExistingSpotlights();
    };
  }, [clearExistingSpotlights]);

  const handleSpotlightSubStep = (sub: TutorialSubStepItem) => {
    onNavigateSubStep(sub.targetStage, sub.targetSubTab);
    setCompletedSubIds((prev) => ({ ...prev, [sub.id]: true }));

    window.setTimeout(() => {
      clearExistingSpotlights();
      const selector = sub.spotlightSelector || 'main';
      const candidates = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
      const el =
        candidates.find((node) => {
          const r = node.getBoundingClientRect();
          return r.width > 20 && r.height > 16;
        }) || (document.querySelector('main') as HTMLElement | null);

      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'center' });
        const rect = el.getBoundingClientRect();
        const ring = document.createElement('div');
        ring.id = 'hk-coach-dom-spotlight';
        ring.setAttribute('aria-hidden', 'true');
        ring.style.position = 'fixed';
        ring.style.left = `${Math.max(8, rect.left - 6)}px`;
        ring.style.top = `${Math.max(8, rect.top - 6)}px`;
        ring.style.width = `${Math.min(window.innerWidth - 16, rect.width + 12)}px`;
        ring.style.height = `${Math.min(window.innerHeight - 24, Math.max(40, rect.height + 12))}px`;
        ring.style.border = '2.5px solid #D4AF37';
        ring.style.borderRadius = '12px';
        ring.style.boxShadow = '0 0 0 4px rgba(212, 175, 55, 0.25)';
        ring.style.pointerEvents = 'none';
        ring.style.zIndex = '60';
        ring.style.transition = 'opacity 0.25s ease';
        document.body.appendChild(ring);
        window.setTimeout(() => {
          ring.style.opacity = '0';
          window.setTimeout(() => ring.remove(), 260);
        }, 2800);
        setSpotlightFeedback(
          t(
            `Focused step ${sub.code} on screen`,
            conv(`已為你跳轉並以金框標示「動作 ${sub.code}」操作位置`)
          )
        );
      }
    }, 120);
  };

  if (!open) return null;

  const prevChapter =
    chapterIndex > 0 ? CANTONESE_TUTORIAL_CHAPTERS[chapterIndex - 1] : null;
  const nextChapter =
    chapterIndex < CANTONESE_TUTORIAL_CHAPTERS.length - 1
      ? CANTONESE_TUTORIAL_CHAPTERS[chapterIndex + 1]
      : null;

  const completedCountInChapter = currentChapter.subSteps.filter(
    (s) => completedSubIds[s.id]
  ).length;

  return (
    <aside
      aria-label={t('Step-by-Step Guide', conv('操作指引小助手'))}
      data-testid="interactive-walkthrough-coach"
      className="fixed bottom-4 right-4 z-40 flex max-h-[calc(100vh-2rem)] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#D4AF37]/55 bg-[#0A1424] text-slate-100 shadow-2xl"
    >
      {/* Top Bar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800 px-3.5 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Compass className="h-4 w-4 shrink-0 text-[#F3D37A]" aria-hidden="true" />
          <span className="font-mono text-xs font-bold text-[#F3D37A] tabular-nums whitespace-nowrap">
            {t(
              `Step ${currentChapter.stepNumber}/08`,
              conv(`操作指引 ${currentChapter.stepNumber}/08`)
            )}
          </span>
          <span className="truncate text-xs text-slate-300">
            · {completedCountInChapter}/3 {t('done', conv('已完成'))}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            data-testid="coach-minimize-btn"
            onClick={() => setMinimized((m) => !m)}
            aria-label={
              minimized
                ? t('Expand guided coach', conv('展開實操導賞'))
                : t('Minimize guided coach', conv('收合實操導賞'))
            }
            className="rounded-lg p-1 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            {minimized ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            data-testid="coach-close-btn"
            onClick={() => {
              clearExistingSpotlights();
              onClose();
            }}
            aria-label={t('Close guided coach', conv('關閉實操導賞'))}
            className="rounded-lg p-1 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5">
            {/* Chapter Selector Pills (01..08) */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {CANTONESE_TUTORIAL_CHAPTERS.map((ch) => {
                const active = ch.id === currentChapter.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    data-testid={`coach-chapter-pill-${ch.id}`}
                    onClick={() =>
                      onSelectChapter(ch.id, ch.targetStage, ch.targetSubTab)
                    }
                    className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#D4AF37] text-[#0A1424]'
                        : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {ch.stepNumber}
                  </button>
                );
              })}
            </div>

            <div>
              <h3
                data-testid="coach-active-title"
                className="text-xs sm:text-sm font-bold leading-snug text-white"
              >
                {t(currentChapter.titleEn, conv(currentChapter.titleZh))}
              </h3>
              <p className="mt-0.5 font-mono text-[11px] text-[#F3D37A] tabular-nums">
                {t(currentChapter.timeComparisonEn, conv(currentChapter.timeComparisonZh))}
              </p>
            </div>

            {/* 3 Click-to-Spotlight Operational Sub-Steps */}
            <div className="space-y-1.5">
              {currentChapter.subSteps.map((sub) => {
                const done = Boolean(completedSubIds[sub.id]);
                return (
                  <div
                    key={sub.id}
                    className={`rounded-xl border p-2.5 transition-colors ${
                      done
                        ? 'border-emerald-500/45 bg-emerald-950/25'
                        : 'border-slate-800 bg-[#101E33]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            setCompletedSubIds((prev) => ({
                              ...prev,
                              [sub.id]: !prev[sub.id],
                            }))
                          }
                          aria-label={`Mark step ${sub.code} complete`}
                          className={`mt-0.5 inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold tabular-nums ${
                            done
                              ? 'bg-emerald-400 text-slate-950'
                              : 'bg-[#D4AF37]/25 text-[#F3D37A]'
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            sub.code
                          )}
                        </button>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold leading-snug text-white">
                            {t(sub.uiControlEn, conv(sub.uiControlZh))}
                          </div>
                          <div className="mt-0.5 text-[11px] leading-snug text-slate-300">
                            {t(sub.expectedResultEn, conv(sub.expectedResultZh))}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        data-testid={`coach-spotlight-${sub.id}`}
                        onClick={() => handleSpotlightSubStep(sub)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#D4AF37]/55 bg-[#0A1424] px-2 py-1 text-[11px] font-semibold text-[#F3D37A] hover:border-[#F3D37A] hover:bg-slate-900 whitespace-nowrap shrink-0"
                      >
                        <Crosshair className="h-3 w-3" aria-hidden="true" />
                        <span>{t('Locate', conv('定位'))}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {spotlightFeedback && (
              <div className="rounded-lg bg-[#162742] px-2.5 py-1.5 text-[11px] font-medium text-[#F3D37A]">
                {spotlightFeedback}
              </div>
            )}
          </div>

          {/* Sticky Prev / Next Chapter Footer inside Coach */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-800 bg-[#08101E] px-3.5 py-2.5">
            <button
              type="button"
              data-testid="coach-prev-chapter-btn"
              disabled={!prevChapter}
              onClick={() => {
                if (prevChapter) {
                  onSelectChapter(
                    prevChapter.id,
                    prevChapter.targetStage,
                    prevChapter.targetSubTab
                  );
                }
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('Prev', conv('上一步'))}</span>
            </button>

            {nextChapter ? (
              <button
                type="button"
                data-testid="coach-next-chapter-btn"
                onClick={() =>
                  onSelectChapter(
                    nextChapter.id,
                    nextChapter.targetStage,
                    nextChapter.targetSubTab
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3.5 py-1.5 text-xs font-bold text-[#0A1424] hover:bg-[#F3D37A] transition-colors whitespace-nowrap"
              >
                <span>
                  {t(
                    `Next: Step ${nextChapter.stepNumber}`,
                    conv(`下一步：第 ${nextChapter.stepNumber} 步`)
                  )}
                </span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                data-testid="coach-finish-btn"
                onClick={() => {
                  clearExistingSpotlights();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 transition-colors whitespace-nowrap"
              >
                <span>{t('Done', conv('完成指引'))}</span>
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  );
};
