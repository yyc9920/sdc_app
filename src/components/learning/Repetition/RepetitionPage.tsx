import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  Moon,
  Sun,
  Play,
  ChevronRight,
  SkipBack,
  RefreshCw,
  Repeat,
  Square,
  Loader2,
  Mic,
  Eye,
} from 'lucide-react';
import { useRepetition } from '../../../hooks/useRepetition';
import { LoadingSpinner } from '../../LoadingSpinner';
import { PromptCard } from './PromptCard';
import { ScriptCard } from './ScriptCard';
import { ReadingCard } from './ReadingCard';
import { RepetitionProgress } from './RepetitionProgress';
import { AVAILABLE_VOICES, VOICE_DISPLAY_NAMES } from '../../../constants/audio';
import type { Voice } from '../../../constants/audio';
import type { DataSet } from '../../../types';
import type { TrainingRow } from '../../../hooks/training/types';
import type { DisplayToggles } from '../../../hooks/useRepetition';

interface RepetitionPageProps {
  dataSet: DataSet;
  isNightMode: boolean;
  onToggleNight: () => void;
  onBack: () => void;
}

const SPEED_OPTIONS = [1, 1.5, 2] as const;
const REPEAT_OPTIONS = [1, 2, 3, 5] as const;

const DISPLAY_TOGGLE_OPTIONS: { key: keyof DisplayToggles; label: string }[] = [
  { key: 'showEnglish', label: '영어' },
  { key: 'showPronunciation', label: '발음' },
  { key: 'showDirectComprehension', label: '직독직해' },
  { key: 'showComprehension', label: '해석' },
];

export const RepetitionPage = ({
  dataSet,
  isNightMode,
  onToggleNight,
  onBack,
}: RepetitionPageProps) => {
  const engine = useRepetition(dataSet.id);
  const {
    groups,
    session,
    speakerColors,
    speed,
    setSpeed,
    rowSeqToSessionIndex,
    playRow,
    goTo,
    next,
    prev,
    isLoading,
    error,
    ttsError,
    reset,
    isRangePlaying,
    isLoadingTTS,
    playLoop,
    stopRange,
    displayToggles,
    toggleDisplay,
    voiceOverride,
    setVoiceOverride,
  } = engine;

  const [sentenceRepeat, setSentenceRepeat] = useState(1);
  // Range: null = full range (all sentences)
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(-1); // -1 = last
  const [useRange, setUseRange] = useState(false);
  const [showRangeControls, setShowRangeControls] = useState(false);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const activeCardRef = useRef<HTMLButtonElement | null>(null);
  const cardTapLockRef = useRef(false);

  const effectiveEnd = rangeEnd < 0 ? session.rows.length - 1 : rangeEnd;

  useEffect(() => {
    activeCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [session.currentIndex]);

  const handleCardTap = useCallback(
    (row: TrainingRow) => {
      if (cardTapLockRef.current) return;
      cardTapLockRef.current = true;
      setTimeout(() => { cardTapLockRef.current = false; }, 300);
      const idx = rowSeqToSessionIndex.get(row.rowSeq);
      if (idx !== undefined) goTo(idx);
      playRow(row).catch(console.error);
    },
    [rowSeqToSessionIndex, goTo, playRow],
  );

  const handleProgressGoTo = useCallback(
    (idx: number) => {
      goTo(idx);
      const row = session.rows[idx];
      if (row) playRow(row).catch(console.error);
    },
    [goTo, session.rows, playRow],
  );

  // Next/prev with auto-play
  const handleNext = useCallback(() => {
    if (isRangePlaying) return; // playLoop controls navigation during auto-play
    next();
    const nextIdx = session.currentIndex + 1;
    const row = session.rows[nextIdx];
    if (row) playRow(row).catch(console.error);
  }, [isRangePlaying, next, session.currentIndex, session.rows, playRow]);

  const handlePrev = useCallback(() => {
    if (isRangePlaying) return;
    prev();
    const prevIdx = Math.max(0, session.currentIndex - 1);
    const row = session.rows[prevIdx];
    if (row) playRow(row).catch(console.error);
  }, [isRangePlaying, prev, session.currentIndex, session.rows, playRow]);

  // Single unified play/stop button
  const handlePlayStop = useCallback(() => {
    if (isRangePlaying) {
      stopRange();
    } else if (useRange) {
      void playLoop(sentenceRepeat, rangeStart, effectiveEnd);
    } else {
      void playLoop(sentenceRepeat);
    }
  }, [isRangePlaying, stopRange, playLoop, sentenceRepeat, useRange, rangeStart, effectiveEnd]);

  const handleSpeedCycle = useCallback(() => {
    const idx = SPEED_OPTIONS.indexOf(speed as 1 | 1.5 | 2);
    setSpeed(SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]);
  }, [speed, setSpeed]);

  const handleRepeatCycle = useCallback(() => {
    setSentenceRepeat(prev => {
      const idx = REPEAT_OPTIONS.indexOf(prev as typeof REPEAT_OPTIONS[number]);
      return REPEAT_OPTIONS[(idx + 1) % REPEAT_OPTIONS.length];
    });
  }, []);

  const toggleRange = useCallback(() => {
    setShowRangeControls(p => !p);
    setShowVoiceSelector(false);
    setShowDisplaySettings(false);
  }, []);

  const toggleVoiceSelector = useCallback(() => {
    setShowVoiceSelector(p => !p);
    setShowRangeControls(false);
    setShowDisplaySettings(false);
  }, []);

  const toggleDisplaySettings = useCallback(() => {
    setShowDisplaySettings(p => !p);
    setShowRangeControls(false);
    setShowVoiceSelector(false);
  }, []);

  const handleBack = useCallback(() => {
    stopRange();
    reset();
    onBack();
  }, [stopRange, reset, onBack]);

  if (isLoading) return <LoadingSpinner fullScreen />;

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-xl text-red-500 bg-gray-50 dark:bg-gray-900">
        에러: {error}
      </div>
    );
  }

  if (session.rows.length === 0 && session.phase !== 'setup') {
    return (
      <div className={`h-full ${isNightMode ? 'dark bg-gray-900' : 'bg-gray-50'} flex flex-col transition-colors duration-300`}>
        <header className="shrink-0 w-full max-w-4xl mx-auto flex justify-between items-center p-3 sm:p-4 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur z-40 border-b border-gray-200 dark:border-gray-700 gap-3">
          <div className="flex items-center gap-1 sm:gap-3 flex-1 min-w-0">
            <button onClick={handleBack} className="p-2.5 -ml-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center">
              <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
            <img src="/sdc_logo.png" alt="SDC" className="w-7 h-7 object-contain shrink-0" />
            <h1 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white truncate">반복 학습 — {dataSet.name}</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-8">
          <p className="text-gray-500 dark:text-gray-400 text-center">이 세트에서 사용할 수 있는 콘텐츠가 없습니다</p>
        </main>
      </div>
    );
  }

  return (
    <div className={`h-full ${isNightMode ? 'dark bg-gray-900' : 'bg-gray-50'} flex flex-col transition-colors duration-300 overflow-hidden`}>
      {/* Header */}
      <header className="shrink-0 w-full max-w-4xl mx-auto flex justify-between items-center p-3 sm:p-4 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur z-40 border-b border-gray-200 dark:border-gray-700 gap-3">
        <div className="flex items-center gap-1 sm:gap-3 flex-1 min-w-0">
          <button onClick={handleBack} className="p-2.5 -ml-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <img src="/sdc_logo.png" alt="SDC" className="w-7 h-7 object-contain shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white truncate">반복 학습 — {dataSet.name}</h1>
        </div>
        <button onClick={onToggleNight} className="p-2.5 shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          {isNightMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
        </button>
      </header>

      <RepetitionProgress rows={session.rows} currentIndex={session.currentIndex} onGoTo={handleProgressGoTo} />

      {ttsError && (
        <div className="shrink-0 mx-4 mt-2 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-xl flex items-center gap-3 text-sm">
          <RefreshCw className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-amber-800 dark:text-amber-200">음성을 불러올 수 없습니다</span>
        </div>
      )}

      {/* Playing status */}
      {isRangePlaying && (
        <div className="shrink-0 mx-4 mt-2 flex items-center justify-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-bold">
          <Repeat className="w-3.5 h-3.5" />
          <span>
            {useRange ? `${rangeStart + 1}~${effectiveEnd + 1}번 · ` : ''}
            {sentenceRepeat > 1 ? `문장별 ${sentenceRepeat}회 · ` : ''}
            무한 재생 중
          </span>
        </div>
      )}

      {/* Card list */}
      <main className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-4">
        {groups.map((group, gi) => (
          <section key={group.prompt?.rowSeq ?? `group-${gi}`} className="space-y-3">
            {group.prompt && <PromptCard row={group.prompt} />}
            {group.items.map((row) => {
              const sessionIdx = rowSeqToSessionIndex.get(row.rowSeq);
              const isActive = sessionIdx === session.currentIndex;
              const speakerColor = row.speaker ? speakerColors[row.speaker] : undefined;
              if (row.rowType === 'reading') {
                return <ReadingCard key={row.rowSeq} ref={isActive ? activeCardRef : null} row={row} isActive={isActive} speakerColor={speakerColor} onPlay={() => handleCardTap(row)} displayToggles={displayToggles} />;
              }
              return <ScriptCard key={row.rowSeq} ref={isActive ? activeCardRef : null} row={row} isActive={isActive} speakerColor={speakerColor} onPlay={() => handleCardTap(row)} displayToggles={displayToggles} />;
            })}
          </section>
        ))}
      </main>

      {/* Range settings panel */}
      {showRangeControls && (
        <div className="shrink-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur border-t border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-2 shrink-0">
                <input
                  type="checkbox"
                  checked={useRange}
                  onChange={e => setUseRange(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-600 dark:text-gray-300 font-bold">범위 지정</span>
              </label>
              <select
                value={rangeStart}
                onChange={e => setRangeStart(Number(e.target.value))}
                disabled={!useRange}
                className="flex-1 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-0 text-sm font-medium disabled:opacity-40"
              >
                {session.rows.map((_, i) => <option key={i} value={i}>{i + 1}번</option>)}
              </select>
              <span className="text-gray-400">~</span>
              <select
                value={effectiveEnd}
                onChange={e => setRangeEnd(Number(e.target.value))}
                disabled={!useRange}
                className="flex-1 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-0 text-sm font-medium disabled:opacity-40"
              >
                {session.rows.map((_, i) => <option key={i} value={i}>{i + 1}번</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Voice selector panel */}
      {showVoiceSelector && (
        <div className="shrink-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur border-t border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="max-w-4xl mx-auto flex flex-wrap gap-2">
            <button
              onClick={() => setVoiceOverride(null)}
              className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${
                voiceOverride === null
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              자동
            </button>
            {AVAILABLE_VOICES.map(v => (
              <button
                key={v}
                onClick={() => setVoiceOverride(v as Voice)}
                className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${
                  voiceOverride === v
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {VOICE_DISPLAY_NAMES[v]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Display toggle panel */}
      {showDisplaySettings && (
        <div className="shrink-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur border-t border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="max-w-4xl mx-auto flex flex-wrap gap-2">
            {DISPLAY_TOGGLE_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleDisplay(key)}
                className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${
                  displayToggles[key]
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer — single unified playback bar */}
      <div className="shrink-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Left: Speed + Sentence repeat + Voice */}
          <div className="flex items-center gap-1.5">
            <button onClick={handleSpeedCycle} className="px-2.5 py-2 text-sm font-bold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-w-[44px] min-h-[44px]" aria-label={`재생 속도 ${speed}배`}>
              {speed}x
            </button>
            <button
              onClick={handleRepeatCycle}
              className={`flex items-center gap-1 px-2.5 py-2 text-sm font-bold rounded-xl transition-colors min-w-[44px] min-h-[44px] ${
                sentenceRepeat > 1
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              aria-label={`문장 반복 ${sentenceRepeat}회`}
            >
              <Repeat className="w-3.5 h-3.5" />
              {sentenceRepeat}
            </button>
            <button
              onClick={toggleVoiceSelector}
              className={`flex items-center gap-1 px-2.5 py-2 text-sm font-bold rounded-xl transition-colors min-w-[44px] min-h-[44px] ${
                voiceOverride
                  ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                  : showVoiceSelector
                  ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              aria-label="목소리 선택"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center: Prev / Play-Stop / Next */}
          <div className="flex items-center gap-2">
            <button onClick={handlePrev} className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-90 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="이전 문장">
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={handlePlayStop}
              className={`p-4 rounded-full text-white shadow-md transition-all active:scale-90 min-h-[44px] min-w-[44px] flex items-center justify-center ${isRangePlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              aria-label={isRangePlaying ? '정지' : '연속 재생'}
            >
              {isRangePlaying ? <Square className="w-5 h-5 fill-current" /> : isLoadingTTS ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />}
            </button>
            <button onClick={handleNext} className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-90 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="다음 문장">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Right: Display + Range toggles */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleDisplaySettings}
              className={`px-2.5 py-2 text-xs font-bold rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                showDisplaySettings
                  ? 'bg-blue-200 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
              aria-label="표시 설정"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={toggleRange}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors min-w-[44px] min-h-[44px] ${
                useRange
                  ? 'bg-orange-500 text-white shadow-sm'
                  : showRangeControls
                  ? 'bg-orange-200 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
              aria-label={showRangeControls ? '범위 설정 닫기' : '범위 설정 열기'}
            >
              범위
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
