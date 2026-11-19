import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  Play,
  RotateCcw,
  Search,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  ADVISOR_WORKFLOW_ROI_BENCHMARKS,
  CANTONESE_TUTORIAL_CHAPTERS,
  CANTONESE_TUTORIAL_POSTER_PATH,
  CANTONESE_TUTORIAL_TOTAL_DURATION_SEC,
  CANTONESE_TUTORIAL_VIDEO_PATH,
  CANTONESE_TUTORIAL_VTT_PATH,
  computeTutorialProgressPercent,
  computeWorkflowEfficiencySummary,
  filterTutorialChapters,
  formatTutorialTimestamp,
  resolveActiveTutorialChapter,
  resolveActiveTutorialSubStep,
  type TutorialAudienceFilter,
  type TutorialChapterItem,
  type TutorialSubStepItem,
  type TutorialTargetSubTab,
} from '../domain/tutorialWalkthroughConfig';
import type { MemberAccountProfile } from '../domain/memberAuthEngine';
import type { MemberModalInitialTab } from './MemberAuthModal';
import type { WorkspaceSection } from './SidebarNav';

export interface CantoneseTutorialShowcaseProps {
  sectionId?: string;
  themeVariant?: 'travertine' | 'daylight';
  activeMember?: MemberAccountProfile | null;
  onOpenMemberAuth?: (tab?: MemberModalInitialTab) => void;
  onEnterWorkbench: (
    targetStage?: WorkspaceSection,
    targetSubTab?: TutorialTargetSubTab,
    targetLeadId?: string,
    guidedChapterId?: string
  ) => void;
}

const AUDIENCE_FILTER_OPTIONS: Array<{
  id: TutorialAudienceFilter;
  labelZh: string;
  labelEn: string;
}> = [
  { id: 'ALL', labelZh: '全部教學 (02:24)', labelEn: 'All Steps (02:24)' },
  { id: 'PREP_CRM', labelZh: '01–03 客戶缺口與跟進名單', labelEn: '01–03 Client Info & CRM' },
  { id: 'COMPARE_ACTUARIAL', labelZh: '04–05 跨公司比較與退休提款', labelEn: '04–05 Plan Comparison & Retirement' },
  { id: 'MEDICAL_PROPOSAL', labelZh: '06–07 私院收費與 WhatsApp 分享', labelEn: '06–07 Hospital Info & Proposal Share' },
  { id: 'CLOSING_SERVICING', labelZh: '08 簽單確認與日曆提醒', labelEn: '08 Sign-Off & Calendar Alerts' },
];

export const CantoneseTutorialShowcase: React.FC<CantoneseTutorialShowcaseProps> = ({
  sectionId = 't4-tutorial-guide',
  themeVariant = 'travertine',
  activeMember = null,
  onOpenMemberAuth,
  onEnterWorkbench,
}) => {
  const { lang, t } = useLanguage();
  const conv = useCallback(
    (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh),
    [lang]
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastAutoNarratedChapterRef = useRef<string | null>(null);

  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(CANTONESE_TUTORIAL_TOTAL_DURATION_SEC);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('ch1');
  const [audienceFilter, setAudienceFilter] = useState<TutorialAudienceFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [autoCantoneseVoice, setAutoCantoneseVoice] = useState<boolean>(false);
  const [videoAudioMuted, setVideoAudioMuted] = useState<boolean>(false);

  const roiSummary = useMemo(
    () => computeWorkflowEfficiencySummary(ADVISOR_WORKFLOW_ROI_BENCHMARKS),
    []
  );

  const activeChapter = useMemo(() => {
    if (isPlaying || currentTimeSec > 0) {
      return resolveActiveTutorialChapter(currentTimeSec, CANTONESE_TUTORIAL_CHAPTERS);
    }
    return (
      CANTONESE_TUTORIAL_CHAPTERS.find((c) => c.id === selectedChapterId) ||
      CANTONESE_TUTORIAL_CHAPTERS[0]
    );
  }, [currentTimeSec, isPlaying, selectedChapterId]);

  const activeSubStep = useMemo(() => {
    const effectiveTime =
      isPlaying || currentTimeSec > 0 ? currentTimeSec : activeChapter.startSec;
    return resolveActiveTutorialSubStep(effectiveTime, activeChapter);
  }, [activeChapter, currentTimeSec, isPlaying]);

  const filteredTutorials = useMemo(
    () => filterTutorialChapters(CANTONESE_TUTORIAL_CHAPTERS, audienceFilter, searchQuery),
    [audienceFilter, searchQuery]
  );

  const stopAllSpeech = useCallback(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      stopAllSpeech();
    };
  }, [stopAllSpeech]);

  const speakCantoneseScript = useCallback(
    async (scriptText: string, chapterId?: string) => {
      stopAllSpeech();
      // Pause video embedded audio if currently playing so voiceovers never overlap
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      setIsSpeaking(true);

      // 1. Primary path: Bundled static native Hong Kong Cantonese (yue) MP3 in /public/audio/
      // Works instantaneously offline, locally, AND on static Firebase Hosting (hk-is-pro)!
      if (chapterId) {
        const playedStatic = await new Promise<boolean>((resolve) => {
          const staticAudio = new Audio(`/audio/cantonese-${chapterId}.mp3`);
          activeAudioRef.current = staticAudio;
          staticAudio.onended = () => {
            setIsSpeaking(false);
            resolve(true);
          };
          staticAudio.onerror = () => {
            resolve(false);
          };
          staticAudio
            .play()
            .then(() => resolve(true))
            .catch(() => resolve(false));
        });
        if (playedStatic) {
          return;
        }
      }

      // 2. Secondary path: Server-side native Cantonese (tl=yue) TTS endpoint
      try {
        const res = await fetch('/api/ai/cantonese-narrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: scriptText }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && typeof data.audioBase64 === 'string') {
            const audio = new Audio(
              `data:${data.mimeType || 'audio/mpeg'};base64,${data.audioBase64}`
            );
            activeAudioRef.current = audio;
            audio.onended = () => setIsSpeaking(false);
            audio.onerror = () => setIsSpeaking(false);
            await audio.play();
            return;
          }
        }
      } catch {
        // Fall through to strict yue / zh-HK browser voice check
      }

      // 3. Strict Cantonese-only browser speechSynthesis (NEVER select zh-CN / Mandarin)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        const strictCantoneseVoice =
          voices.find((v) => /yue|zh[-_]HK/i.test(v.lang)) ||
          voices.find((v) => /Cantonese|粵語|香港|Sin-ji|Tracy/i.test(v.name));
        if (strictCantoneseVoice) {
          const utter = new SpeechSynthesisUtterance(scriptText);
          utter.voice = strictCantoneseVoice;
          utter.lang = strictCantoneseVoice.lang;
          utter.rate = 1.03;
          utter.onend = () => setIsSpeaking(false);
          utter.onerror = () => setIsSpeaking(false);
          window.speechSynthesis.speak(utter);
          return;
        }
      }
      setIsSpeaking(false);
    },
    [stopAllSpeech]
  );

  useEffect(() => {
    if (!autoCantoneseVoice || !isPlaying) return;
    if (lastAutoNarratedChapterRef.current === activeChapter.id) return;
    lastAutoNarratedChapterRef.current = activeChapter.id;
    void speakCantoneseScript(activeChapter.cantoneseVoiceScript, activeChapter.id);
  }, [activeChapter, autoCantoneseVoice, isPlaying, speakCantoneseScript]);

  const seekVideoToSecond = (targetSec: number, chapterId: string, scrollPlayer = false) => {
    setSelectedChapterId(chapterId);
    lastAutoNarratedChapterRef.current = null;
    if (scrollPlayer && playerContainerRef.current) {
      playerContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const vid = videoRef.current;
    if (vid) {
      vid.currentTime = targetSec;
      setCurrentTimeSec(targetSec);
      const playPromise = vid.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
  };

  const handleSeekToChapter = (chapter: TutorialChapterItem, scrollPlayerIntoView = false) => {
    seekVideoToSecond(chapter.startSec, chapter.id, scrollPlayerIntoView);
  };

  const handleSeekToSubStep = (
    chapter: TutorialChapterItem,
    sub: TutorialSubStepItem,
    scrollPlayerIntoView = false
  ) => {
    seekVideoToSecond(sub.startSec, chapter.id, scrollPlayerIntoView);
  };

  const handleTryChapterGuided = (chapter: TutorialChapterItem) => {
    stopAllSpeech();
    if (chapter.opensMemberModal && !activeMember && onOpenMemberAuth) {
      onOpenMemberAuth('SIGN_IN');
      return;
    }
    onEnterWorkbench(chapter.targetStage, chapter.targetSubTab, undefined, chapter.id);
  };

  const progressPct = computeTutorialProgressPercent(currentTimeSec, durationSec);
  const isDaylight = themeVariant === 'daylight';

  return (
    <section
      id={sectionId}
      data-testid="landing-cantonese-tutorial-section"
      className={
        isDaylight
          ? 'border-b border-slate-200 bg-slate-50 text-slate-900'
          : 'border-b border-stone-300/90 bg-[#EFE8DC] text-[#1C1815]'
      }
    >
      <div className="mx-auto max-w-[1380px] px-6 py-16 lg:px-10 lg:py-20">
        {/* Masthead: Operational How-To + Advisor Workflow Efficiency */}
        <div className="flex flex-col justify-between gap-6 border-b border-stone-300/90 pb-7 lg:flex-row lg:items-end">
          <div className="max-w-3xl space-y-2.5">
            <div
              className={`text-xs font-semibold tracking-widest ${
                isDaylight ? 'text-[#1D4ED8]' : 'text-[#8C5E24]'
              }`}
            >
              {t(
                '2-MINUTE WALKTHROUGH · 8 PRACTICAL STEPS',
                conv('2 分鐘廣東話實操示範 · 8 個常用功能教學')
              )}
            </div>
            <h2
              className={`text-3xl sm:text-4xl font-semibold tracking-tight text-balance ${
                isDaylight ? 'text-slate-950' : 'font-editorial text-[#1C1815]'
              }`}
            >
              {t(
                `See how it works step by step—cutting ${roiSummary.totalBeforeMinutes}m of quoting and slide prep down to ${roiSummary.totalAfterMinutes}m.`,
                conv(
                  `由見客前準備到簽單跟進：平時要搞成 ${roiSummary.totalBeforeMinutes} 分鐘嘅打價同執表，12 分鐘就做齊晒。`
                )
              )}
            </h2>
            <p className={isDaylight ? 'text-sm text-slate-600' : 'text-sm text-[#4A4138]'}>
              {t(
                'Click any step on the right to jump straight to that screen in the video, or click "Try This Step" to open the feature directly inside the workspace.',
                conv(
                  '撳右邊任何一步，條片即刻跳去嗰一幕畀你睇點撳；睇完撳「跟住試做」仲可以直接跳入工作台試玩。'
                )
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              data-testid="tutorial-video-audio-toggle"
              onClick={() => {
                const nextMuted = !videoAudioMuted;
                setVideoAudioMuted(nextMuted);
                if (videoRef.current) {
                  videoRef.current.muted = nextMuted;
                }
              }}
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                !videoAudioMuted
                  ? 'border-[#8C5E24] bg-[#12100E] text-[#FAF6F0]'
                  : isDaylight
                  ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                  : 'border-stone-400/80 bg-[#FAF6F0] text-[#1C1815] hover:bg-white'
              }`}
            >
              {!videoAudioMuted ? (
                <Volume2 className="h-3.5 w-3.5 text-[#D8B377]" aria-hidden="true" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-stone-500" aria-hidden="true" />
              )}
              <span>
                {!videoAudioMuted
                  ? t('Video Cantonese Audio: ON', conv('影片廣東話旁白：開'))
                  : t('Muted (Subtitles ON)', conv('影片靜音（顯示字幕）'))}
              </span>
            </button>

            <button
              type="button"
              data-testid="tutorial-auto-cantonese-toggle"
              onClick={() => {
                const next = !autoCantoneseVoice;
                setAutoCantoneseVoice(next);
                if (!next) {
                  stopAllSpeech();
                } else {
                  void speakCantoneseScript(activeChapter.cantoneseVoiceScript, activeChapter.id);
                }
              }}
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                autoCantoneseVoice
                  ? 'border-[#8C5E24] bg-[#12100E] text-[#FAF6F0]'
                  : isDaylight
                  ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                  : 'border-stone-400/80 bg-[#FAF6F0] text-[#1C1815] hover:bg-white'
              }`}
            >
              {autoCantoneseVoice ? (
                <Volume2 className="h-3.5 w-3.5 text-[#D8B377]" aria-hidden="true" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-stone-500" aria-hidden="true" />
              )}
              <span>
                {autoCantoneseVoice
                  ? t('Auto Voice Guide: ON', conv('自動語音講解：開'))
                  : t('Auto Voice Guide', conv('自動語音講解'))}
              </span>
            </button>

            <button
              type="button"
              data-testid="tutorial-replay-from-start-btn"
              onClick={() => handleSeekToChapter(CANTONESE_TUTORIAL_CHAPTERS[0], false)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isDaylight
                  ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  : 'border-stone-400/80 bg-[#FAF6F0] text-[#1C1815] hover:bg-white'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('Replay (00:00)', conv('由頭播放 (00:00)'))}</span>
            </button>

            <a
              href={CANTONESE_TUTORIAL_VIDEO_PATH}
              download="HK-InsureHub-Pro-Cantonese-Tutorial.mp4"
              data-testid="tutorial-download-video-btn"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#8C5E24] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#724B1B] transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('Download Video (MP4)', conv('下載教學影片 (MP4)'))}</span>
            </a>
          </div>
        </div>

        {/* Quantified Before-vs-After Workflow Efficiency Strip */}
        <div
          data-testid="advisor-workflow-roi-strip"
          className={`mt-6 grid grid-cols-1 divide-y rounded-2xl border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x ${
            isDaylight
              ? 'divide-slate-200 border-slate-200 bg-white'
              : 'divide-stone-300/80 border-stone-300/90 bg-[#FAF6F0]'
          }`}
        >
          {ADVISOR_WORKFLOW_ROI_BENCHMARKS.map((item) => (
            <div key={item.id} className="p-4 sm:p-5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#1C1815]">
                  {t(item.phaseEn, conv(item.phaseZh))}
                </span>
                <span className="font-mono text-xs font-bold text-[#8C5E24] tabular-nums whitespace-nowrap">
                  {item.beforeMinutes}m → {item.afterMinutes}m
                </span>
              </div>
              <div className="text-[11px] text-stone-500 line-through">
                {t(item.beforeEn, conv(item.beforeZh))}
              </div>
              <div className="text-xs font-semibold text-[#2B2520]">
                {t(item.afterEn, conv(item.afterZh))}
              </div>
            </div>
          ))}
        </div>

        {/* PART A: 12-Col Zoomed-In Screen-Capture Video + Synced 24-Operation Controls (PC & iPad Parity) */}
        <div
          ref={playerContainerRef}
          className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-12 items-start"
        >
          {/* Left 7 Columns: Real 144s Zoomed-In HD Video + Synced 3-Sub-Step Micro-Timeline */}
          <div className="md:col-span-7 overflow-hidden rounded-2xl border border-stone-800 bg-[#12100E] text-[#FAF6F0]">
            <div className="relative aspect-video w-full bg-black">
              <video
                ref={videoRef}
                data-testid="landing-tutorial-video"
                controls
                muted={videoAudioMuted}
                playsInline
                preload="metadata"
                poster={CANTONESE_TUTORIAL_POSTER_PATH}
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (Number.isFinite(d) && d > 0) {
                    setDurationSec(d);
                  }
                }}
                onTimeUpdate={(e) => {
                  setCurrentTimeSec(e.currentTarget.currentTime);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  setIsPlaying(false);
                  stopAllSpeech();
                }}
                className="h-full w-full object-contain bg-black"
              >
                <source src={CANTONESE_TUTORIAL_VIDEO_PATH} type="video/mp4" />
                <track
                  kind="captions"
                  src={CANTONESE_TUTORIAL_VTT_PATH}
                  srcLang="zh-HK"
                  label="香港繁體 / 廣東話細步操作字幕"
                  default
                />
              </video>
            </div>

            {/* Progress Bar */}
            <div className="h-1 w-full bg-stone-800">
              <div
                className="h-full bg-[#D8B377] transition-opacity duration-150"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Live Synced Operational Readout + 3 Clickable Micro-Action Sub-Steps */}
            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    data-testid="tutorial-active-chapter-badge"
                    className="rounded bg-[#C59B5F] px-2.5 py-0.5 font-mono text-xs font-bold text-[#12100E] tabular-nums whitespace-nowrap"
                  >
                    {t(activeChapter.stepBadgeEn, conv(activeChapter.stepBadgeZh))}
                  </span>
                  <span
                    data-testid="tutorial-active-time-saved"
                    className="font-mono text-xs font-semibold text-[#D8B377] tabular-nums"
                  >
                    {t(activeChapter.timeComparisonEn, conv(activeChapter.timeComparisonZh))}
                  </span>
                </div>
                <span
                  data-testid="tutorial-video-time-readout"
                  className="font-mono text-xs text-stone-300 tabular-nums"
                >
                  {formatTutorialTimestamp(currentTimeSec)} / {formatTutorialTimestamp(durationSec)}
                </span>
              </div>

              <h3
                data-testid="tutorial-active-chapter-title"
                className="text-base sm:text-lg font-bold text-[#FAF6F0] leading-snug"
              >
                {t(activeChapter.titleEn, conv(activeChapter.titleZh))}
              </h3>

              {/* NEW: Live Synced 3-Sub-Step Operational Strip (Click any micro-step to seek video!) */}
              <div
                data-testid="tutorial-active-substeps"
                className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              >
                {activeChapter.subSteps.map((sub) => {
                  const isSubCurrent = activeSubStep.id === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      data-testid={`tutorial-substep-seek-${sub.id}`}
                      onClick={() => handleSeekToSubStep(activeChapter, sub, false)}
                      className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-colors ${
                        isSubCurrent
                          ? 'border-[#D8B377] bg-[#221D17] text-[#FAF6F0]'
                          : 'border-white/10 bg-white/[0.03] text-stone-300 hover:border-white/25 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 font-mono text-[11px] tabular-nums">
                          <span
                            className={`font-bold ${
                              isSubCurrent ? 'text-[#D8B377]' : 'text-stone-400'
                            }`}
                          >
                            {t(`Step ${sub.code}`, conv(`小步 ${sub.code}`))}
                          </span>
                          <span className="text-stone-400">{sub.formattedStart}</span>
                        </div>
                        <div className="text-xs font-semibold leading-snug text-[#FAF6F0]">
                          {t(sub.uiControlEn, conv(sub.uiControlZh))}
                        </div>
                      </div>
                      <div className="mt-2 border-t border-white/10 pt-1.5 text-[11px] leading-snug text-stone-300">
                        {t(sub.expectedResultEn, conv(sub.expectedResultZh))}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p
                data-testid="tutorial-active-cantonese-script"
                className="text-xs sm:text-sm leading-relaxed text-stone-200"
              >
                {lang === 'en'
                  ? activeChapter.summaryEn
                  : conv(activeChapter.cantoneseVoiceScript)}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3.5">
                <button
                  type="button"
                  data-testid="tutorial-speak-current-btn"
                  onClick={() => {
                    if (isSpeaking) {
                      stopAllSpeech();
                    } else {
                      void speakCantoneseScript(
                        activeChapter.cantoneseVoiceScript,
                        activeChapter.id
                      );
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#D8B377]/50 bg-white/5 px-3.5 py-2 text-xs font-semibold text-[#FAF6F0] hover:border-[#D8B377] hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="h-3.5 w-3.5 text-[#D8B377]" aria-hidden="true" />
                      <span>{t('Stop Audio', conv('停止語音播放'))}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5 text-[#D8B377]" aria-hidden="true" />
                      <span>
                        {t('Cantonese Voice Guide', conv('廣東話語音講解'))}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  data-testid="tutorial-player-try-live-btn"
                  onClick={() => handleTryChapterGuided(activeChapter)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#C59B5F] px-4 py-2 text-xs font-semibold text-[#12100E] hover:bg-[#d8b377] transition-colors whitespace-nowrap"
                >
                  <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {t(
                      `Try Step ${activeChapter.stepNumber}`,
                      conv(`跟住試做第 ${activeChapter.stepNumber} 步`)
                    )}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Interactive 8-Chapter Seek Playlist */}
          <div
            className={`md:col-span-5 rounded-2xl border p-4 sm:p-5 ${
              isDaylight
                ? 'border-slate-200 bg-white'
                : 'border-stone-300/90 bg-[#FAF6F0]'
            }`}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-xs font-bold tracking-wider text-[#8C5E24]">
                {t(
                  'WALKTHROUGH CHAPTERS (CLICK TO SEEK)',
                  conv('8 個教學章節（撳一下即跳去嗰幕）')
                )}
              </span>
              <span className="font-mono text-xs text-stone-500 tabular-nums">
                02:24 高清 · 慳時 {roiSummary.timeSavedPercent}%
              </span>
            </div>

            <div className="space-y-1.5">
              {CANTONESE_TUTORIAL_CHAPTERS.map((chapter) => {
                const isCurrent = activeChapter.id === chapter.id;
                return (
                  <button
                    key={chapter.id}
                    type="button"
                    data-testid={`tutorial-chapter-seek-${chapter.id}`}
                    onClick={() => handleSeekToChapter(chapter, false)}
                    className={`group flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                      isCurrent
                        ? 'border-[#9A6F32] bg-[#12100E] text-[#FAF6F0]'
                        : isDaylight
                        ? 'border-slate-200 bg-slate-50/70 text-slate-900 hover:border-blue-400 hover:bg-white'
                        : 'border-stone-200 bg-white text-[#1C1815] hover:border-[#9A6F32]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold tabular-nums ${
                          isCurrent
                            ? 'bg-[#C59B5F] text-[#12100E]'
                            : 'bg-stone-200/80 text-stone-700 group-hover:bg-[#C59B5F]/25 group-hover:text-[#8C5E24]'
                        }`}
                      >
                        {chapter.stepNumber}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold leading-snug line-clamp-1">
                          {t(chapter.titleEn, conv(chapter.titleZh))}
                        </div>
                        <div
                          className={`mt-0.5 font-mono text-[11px] tabular-nums ${
                            isCurrent ? 'text-[#D8B377]' : 'text-[#8C5E24]'
                          }`}
                        >
                          {chapter.subSteps.map((s) => s.code).join(' → ')} ·{' '}
                          {t(chapter.timeComparisonEn, conv(chapter.timeComparisonZh))}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 pt-0.5">
                      <Play
                        className={`h-3 w-3 ${
                          isCurrent ? 'text-[#D8B377]' : 'text-stone-400 group-hover:text-[#8C5E24]'
                        }`}
                        aria-hidden="true"
                      />
                      <span
                        className={`font-mono text-xs font-semibold tabular-nums ${
                          isCurrent ? 'text-[#D8B377]' : 'text-stone-500'
                        }`}
                      >
                        {chapter.formattedStart}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* PART B: Detailed 8-Step Click-by-Click Operational Playbook */}
        <div className="mt-14 pt-12 border-t border-stone-300/90">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-[#8C5E24]">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {t(
                    'STEP-BY-STEP FEATURE GUIDE',
                    conv('圖文功能操作指南')
                  )}
                </span>
              </div>
              <h3
                className={`mt-1.5 text-2xl sm:text-3xl font-semibold text-balance ${
                  isDaylight ? 'text-slate-950' : 'font-editorial text-[#1C1815]'
                }`}
              >
                {t(
                  'Quick reference for every feature—click any step to watch the clip or try it live.',
                  conv('快速查閱每個功能嘅按鍵位置同用法，點選即可跳播片段或入工作台試用。')
                )}
              </h3>
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-84">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                aria-hidden="true"
              />
              <input
                type="search"
                data-testid="tutorial-guide-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={t('Search Cantonese workflow tutorials', conv('搜尋功能教學'))}
                placeholder={t(
                  'Search button or action: 85% 壓測, 77419, HIBOR, QR...',
                  conv('搵功能或字眼：85% 壓測、養和、HIBOR、77419、WhatsApp...')
                )}
                className={`w-full rounded-xl border py-2.5 pl-10 pr-9 text-xs font-medium outline-none transition-colors ${
                  isDaylight
                    ? 'border-slate-300 bg-white text-slate-900 focus:border-blue-600'
                    : 'border-stone-300 bg-[#FAF6F0] text-[#1C1815] focus:border-[#8C5E24] focus:bg-white'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label={t('Clear tutorial search', conv('清除搜尋'))}
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:text-stone-700"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Workflow Phase Filter Tabs */}
          <div
            role="tablist"
            aria-label={t('Workflow phase filter', conv('成單流程階段篩選'))}
            className="mt-5 flex flex-wrap gap-2"
          >
            {AUDIENCE_FILTER_OPTIONS.map((opt) => {
              const selected = audienceFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  data-testid={`tutorial-filter-${opt.id}`}
                  onClick={() => setAudienceFilter(opt.id)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    selected
                      ? 'bg-[#12100E] text-[#FAF6F0]'
                      : isDaylight
                      ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      : 'border border-stone-300 bg-[#FAF6F0] text-[#3B332B] hover:bg-white'
                  }`}
                >
                  {t(opt.labelEn, conv(opt.labelZh))}
                </button>
              );
            })}
          </div>

          {/* Detailed 2-Column Editorial Tutorial Playbook Cards */}
          {filteredTutorials.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-stone-300 bg-[#FAF6F0] p-8 text-center">
              <p className="text-sm font-medium text-stone-600">
                {t(
                  'No workflow steps matched your keyword. Reset filters to view all 8 steps.',
                  conv('搵唔到相符嘅操作步驟，請重設篩選睇返全部 8 大實戰教學。')
                )}
              </p>
              <button
                type="button"
                onClick={() => {
                  setAudienceFilter('ALL');
                  setSearchQuery('');
                }}
                className="mt-3 rounded-lg bg-[#12100E] px-4 py-2 text-xs font-semibold text-[#FAF6F0]"
              >
                {t('Show All 8 Tutorials', conv('顯示全部 8 大細步教學'))}
              </button>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {filteredTutorials.map((tut) => {
                const isHighlighted = activeChapter.id === tut.id;
                return (
                  <article
                    key={tut.id}
                    data-testid={`tutorial-step-card-${tut.id}`}
                    className={`flex flex-col justify-between rounded-2xl border p-6 sm:p-7 transition-colors ${
                      isHighlighted
                        ? 'border-[#9A6F32] bg-white'
                        : isDaylight
                        ? 'border-slate-200 bg-white hover:border-blue-400'
                        : 'border-stone-300/90 bg-[#FAF6F0] hover:bg-white'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Single-line Clean Unboxed Metadata Header */}
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs font-bold text-[#8C5E24] tabular-nums whitespace-nowrap shrink-0">
                          {t(tut.stepBadgeEn, conv(tut.stepBadgeZh))} · {tut.formattedStart}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#1C1815] tabular-nums truncate">
                          <Clock className="h-3.5 w-3.5 text-[#8C5E24] shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {t(tut.timeComparisonEn, conv(tut.timeComparisonZh))}
                          </span>
                        </span>
                      </div>

                      <h4 className="text-lg font-bold leading-snug text-[#1C1815]">
                        {t(tut.titleEn, conv(tut.titleZh))}
                      </h4>

                      {/* 3 Timestamped Video Sub-Steps */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold tracking-wider text-stone-500">
                          {t(
                            'CLICK ANY STEP TO JUMP TO THAT PART OF THE VIDEO',
                            conv('撳下面任何一步直接跳去影片對應位置')
                          )}
                        </div>
                        <div className="space-y-2">
                          {tut.subSteps.map((sub) => (
                            <button
                              key={sub.id}
                              type="button"
                              data-testid={`card-substep-jump-${sub.id}`}
                              onClick={() => handleSeekToSubStep(tut, sub, true)}
                              className="group flex w-full items-start justify-between gap-3 rounded-xl border border-stone-200/90 bg-white px-3.5 py-2.5 text-left hover:border-[#8C5E24] transition-colors"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="text-xs font-semibold text-[#1C1815] group-hover:text-[#7A5019]">
                                  <span className="mr-1.5 font-mono font-bold text-[#8C5E24] tabular-nums">
                                    {sub.code}
                                  </span>
                                  {t(sub.uiControlEn, conv(sub.uiControlZh))}
                                </div>
                                <div className="text-[11px] text-stone-600">
                                  → {t(sub.expectedResultEn, conv(sub.expectedResultZh))}
                                </div>
                              </div>
                              <span className="inline-flex shrink-0 items-center gap-1 rounded bg-[#F5EFE6] px-2 py-0.5 font-mono text-[11px] font-bold text-[#7A5019] tabular-nums">
                                <Play className="h-2.5 w-2.5" aria-hidden="true" />
                                {sub.formattedStart}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Practical Tip */}
                      <div className="rounded-xl border border-[#D8B377]/60 bg-[#F5EFE6] p-3.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#7A5019]">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{t('Practical Tip', conv('見客實用貼士'))}</span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-[#3B3229]">
                          {lang === 'en' ? tut.proTipEn : conv(tut.cantoneseProTip)}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-stone-200 pt-4">
                      <button
                        type="button"
                        data-testid={`tutorial-watch-btn-${tut.id}`}
                        onClick={() => handleSeekToChapter(tut, true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#1C1815] hover:border-[#8C5E24] transition-colors whitespace-nowrap"
                      >
                        <Play className="h-3 w-3 text-[#8C5E24]" aria-hidden="true" />
                        <span className="tabular-nums">
                          {t(`Watch Clip (${tut.formattedStart})`, conv(`播放片段 (${tut.formattedStart})`))}
                        </span>
                      </button>

                      <button
                        type="button"
                        data-testid={`tutorial-try-btn-${tut.id}`}
                        onClick={() => handleTryChapterGuided(tut)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#12100E] px-4 py-2 text-xs font-semibold text-[#FAF6F0] hover:bg-[#8C5E24] transition-colors whitespace-nowrap"
                      >
                        <Compass className="h-3.5 w-3.5 text-[#D8B377]" aria-hidden="true" />
                        <span>{t('Try This Step →', conv('跟住試做 →'))}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
