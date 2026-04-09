import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  Moon,
  Sun,
  Play,
  Pause,
  ChevronRight,
  SkipBack,
  RefreshCw,
  Repeat,
  Square,
} from 'lucide-react';
import { useRepetition } from '../../../hooks/useRepetition';
import { LoadingSpinner } from '../../LoadingSpinner';
import { PromptCard } from './PromptCard';
import { ScriptCard } from './ScriptCard';
import { ReadingCard } from './ReadingCard';
import { RepetitionProgress } from './RepetitionProgress';
import type { DataSet } from '../../../types';
import type { TrainingRow } from '../../../hooks/training/types';

interface RepetitionPageProps {
  dataSet: DataSet;
  isNightMode: boolean;
  onToggleNight: () => void;
  onBack: () => void;
}

const SPEED_OPTIONS = [1, 1.5, 2] as const;
const REPEAT_OPTIONS = [1, 2, 3, 5] as const;

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
    currentRow,
    isPlaying,
    speakerColors,
    speed,
    setSpeed,
    rowSeqToSessionIndex,
    playRow,
    stop,
    next,
    prev,
    goTo,
    isLoading,
    error,
    ttsError,
    reset,
    rangeStart,
    rangeEnd,
    repeatTotal,
    repeatCurrent,
    isRangePlaying,
    setRangeStart,
    setRangeEnd,
    setRepeatTotal,
    playRange,
    playLoop,
    stopRange,
  } = engine;

  // Per-sentence repeat count for continuous playback
  const [sentenceRepeat, setSentenceRepeat] = useState(1);
  // Range controls panel visibility
  const [showRangeControls, setShowRangeControls] = useState(false);
  const activeCardRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll to active card when index changes
  useEffect(() => {
    activeCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [session.currentIndex]);

  // Card tap: play the tapped card and sync session index
  const handleCardTap = useCallback(
    (row: TrainingRow) => {
      const idx = rowSeqToSessionIndex.get(row.rowSeq);
      if (idx !== undefined) goTo(idx);
      playRow(row).catch(console.error);
    },
    [rowSeqToSessionIndex, goTo, playRow],
  );

  // Progress bar segment click: navigate + play
  const handleProgressGoTo = useCallback(
    (idx: number) => {
      goTo(idx);
      const row = session.rows[idx];
      if (row) playRow(row).catch(console.error);
    },
    [goTo, session.rows, playRow],
  );

  // Main play/stop: starts infinite loop playback or stops it
  const handlePlayStop = useCallback(() => {
    if (isRangePlaying) {
      stopRange();
    } else {
      void playLoop(sentenceRepeat);
    }
  }, [isRangePlaying, stopRange, playLoop, sentenceRepeat]);

  // Single sentence play/pause (manual, no auto-advance)
  const handleSinglePlay = useCallback(() => {
    if (isPlaying) {
      stop();
    } else if (currentRow) {
      playRow(currentRow).catch(console.error);
    }
  }, [isPlaying, stop, currentRow, playRow]);

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

  // Empty content fallback
  if (session.rows.length === 0 && session.phase !== 'setup') {
    return (
      <div className={`h-full ${isNightMode ? 'dark bg-gray-900' : 'bg-gray-50'} flex flex-col transition-colors duration-300`}>
        <header className="shrink-0 w-full max-w-4xl mx-auto flex justify-between items-center p-3 sm:p-4 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur z-40 border-b border-gray-200 dark:border-gray-700 gap-3">
          <div className="flex items-center gap-1 sm:gap-3 flex-1 min-w-0">
            <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90 shrink-0">
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
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90 shrink-0">
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <img src="/sdc_logo.png" alt="SDC" className="w-7 h-7 object-contain shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white truncate">반복 학습 — {dataSet.name}</h1>
        </div>
        <button onClick={onToggleNight} className="p-2 shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          {isNightMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
        </button>
      </header>

      {/* Progress bar */}
      <RepetitionProgress rows={session.rows} currentIndex={session.currentIndex} onGoTo={handleProgressGoTo} />

      {/* TTS error banner */}
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
            {sentenceRepeat > 1 ? `문장별 ${sentenceRepeat}회 반복 · ` : ''}무한 재생 중
          </span>
        </div>
      )}

      {/* Scrollable card list */}
      <main className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-4">
        {groups.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 mt-10">이 세트에서 사용할 수 있는 콘텐츠가 없습니다</p>
        ) : (
          groups.map((group, gi) => (
            <section key={group.prompt?.rowSeq ?? `group-${gi}`} className="space-y-3">
              {group.prompt && <PromptCard row={group.prompt} />}
              {group.items.map((row) => {
                const sessionIdx = rowSeqToSessionIndex.get(row.rowSeq);
                const isActive = sessionIdx === session.currentIndex;
                const speakerColor = row.speaker ? speakerColors[row.speaker] : undefined;
                if (row.rowType === 'reading') {
                  return <ReadingCard key={row.rowSeq} ref={isActive ? activeCardRef : null} row={row} isActive={isActive} speakerColor={speakerColor} onPlay={() => handleCardTap(row)} />;
                }
                return <ScriptCard key={row.rowSeq} ref={isActive ? activeCardRef : null} row={row} isActive={isActive} speakerColor={speakerColor} onPlay={() => handleCardTap(row)} />;
              })}
            </section>
          ))
        )}
      </main>

      {/* Range playback controls (advanced) */}
      {showRangeControls && (
        <div className="shrink-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur border-t border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <label className="text-gray-600 dark:text-gray-300 font-bold shrink-0">범위</label>
              <select value={rangeStart} onChange={e => setRangeStart(Number(e.target.value))} className="flex-1 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-0 text-sm font-medium">
                {session.rows.map((_, i) => <option key={i} value={i}>{i + 1}번</option>)}
              </select>
              <span className="text-gray-400">~</span>
              <select value={rangeEnd} onChange={e => setRangeEnd(Number(e.target.value))} className="flex-1 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-0 text-sm font-medium">
                {session.rows.map((_, i) => <option key={i} value={i}>{i + 1}번</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <label className="text-gray-600 dark:text-gray-300 font-bold shrink-0">반복</label>
              <div className="flex gap-2">
                {[1, 2, 3, 5, 10].map(n => (
                  <button key={n} onClick={() => setRepeatTotal(n)} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${repeatTotal === n ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{n}회</button>
                ))}
              </div>
            </div>
            <button onClick={isRangePlaying ? stopRange : playRange} className={`w-full py-2.5 rounded-xl font-bold text-white transition-colors ${isRangePlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {isRangePlaying ? `정지 (${repeatCurrent}/${repeatTotal}회)` : `범위 재생 (${rangeStart + 1}~${rangeEnd + 1}번, ${repeatTotal}회)`}
            </button>
          </div>
        </div>
      )}

      {/* Footer playback controls */}
      <div className="shrink-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Left: Speed + Sentence repeat */}
          <div className="flex items-center gap-1.5">
            <button onClick={handleSpeedCycle} className="px-2.5 py-2 text-sm font-bold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-w-[44px]" aria-label={`재생 속도 ${speed}배`}>
              {speed}x
            </button>
            <button
              onClick={handleRepeatCycle}
              className={`flex items-center gap-1 px-2.5 py-2 text-sm font-bold rounded-xl transition-colors min-w-[44px] ${
                sentenceRepeat > 1
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              aria-label={`문장 반복 ${sentenceRepeat}회`}
            >
              <Repeat className="w-3.5 h-3.5" />
              {sentenceRepeat}
            </button>
          </div>

          {/* Center: Prev / Play-Stop / Next */}
          <div className="flex items-center gap-2">
            <button onClick={prev} className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-90" aria-label="이전 문장">
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={handlePlayStop}
              className={`p-4 rounded-full text-white shadow-md transition-all active:scale-90 ${isRangePlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              aria-label={isRangePlaying ? '정지' : '연속 재생'}
            >
              {isRangePlaying ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-6 h-6" />}
            </button>
            <button onClick={next} className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-90" aria-label="다음 문장">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Right: Single play + Range */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSinglePlay}
              disabled={isRangePlaying}
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={isPlaying ? '일시정지' : '현재 문장 재생'}
            >
              {isPlaying && !isRangePlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowRangeControls(p => !p)}
              className={`px-2.5 py-2 text-xs font-bold rounded-xl transition-colors ${showRangeControls ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
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
