import React from 'react';
import type { LearningLevel } from '../../../types';
import { useSpeedListening } from '../../../hooks/useSpeedListening';
import { ListenPhase } from './ListenPhase';
import { QuizPhase } from './QuizPhase';
import { ResultPhase } from './ResultPhase';

interface SpeedListeningPageProps {
  setId: string;
  level: LearningLevel;
  title?: string;
  sentences?: Array<{ id: number; english: string; korean: string }>;
  onNext?: () => void;
}

export const SpeedListeningPage: React.FC<SpeedListeningPageProps> = ({
  setId,
  level,
  title,
  sentences,
  onNext,
}) => {
  const {
    rows,
    isLoading,
    speakerVoiceMap,
    phase,
    hasPlayedOnce,
    startQuiz,
    restart,
    isPlaying,
    currentPlayingIndex,
    speed,
    setSpeed,
    playAll,
    stop,
    replaySingle,
    blankIndicesMap,
    isWordBlank,
    getUserInput,
    updateBlank,
    isSubmitted,
    score,
    submit,
  } = useSpeedListening({ setId, level, sentences });

  const phaseLabels: Record<typeof phase, string> = {
    listening: '듣기',
    quiz: '퀴즈',
    result: '결과',
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto p-6 flex items-center justify-center min-h-48">
        <div className="text-gray-500 dark:text-gray-400">로딩 중...</div>
      </div>
    );
  }

  // Empty state: rows empty after filtering (no script/reading content in this set)
  // This is the mandatory fallback required by architect
  if (rows.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto p-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-6 text-center">
          <p className="text-amber-700 dark:text-amber-400 font-medium">
            이 세트에서 사용할 수 있는 콘텐츠가 없습니다
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
            속청 퀴즈 모드는 script 또는 reading 타입 문장이 필요합니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
            {title ?? setId}
          </h2>
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            {phaseLabels[phase]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Level {level} · {rows.length}문장
          </span>
          {/* Phase progress dots */}
          <div className="flex gap-1.5 ml-auto">
            {(['listening', 'quiz', 'result'] as const).map(p => (
              <div
                key={p}
                className={`w-2 h-2 rounded-full transition-colors ${
                  p === phase
                    ? 'bg-blue-600 dark:bg-blue-400'
                    : phase === 'result' ||
                      (phase === 'quiz' && p === 'listening')
                    ? 'bg-gray-400 dark:bg-gray-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Phase views */}
      {phase === 'listening' && (
        <ListenPhase
          rows={rows}
          isPlaying={isPlaying}
          currentPlayingIndex={currentPlayingIndex}
          hasPlayedOnce={hasPlayedOnce}
          speed={speed}
          setSpeed={setSpeed}
          playAll={playAll}
          stop={stop}
          onStartQuiz={startQuiz}
          speakerVoiceMap={speakerVoiceMap}
        />
      )}

      {phase === 'quiz' && (
        <QuizPhase
          rows={rows}
          blankIndicesMap={blankIndicesMap}
          isWordBlank={isWordBlank}
          getUserInput={getUserInput}
          updateBlank={updateBlank}
          isSubmitted={isSubmitted}
          onSubmit={submit}
          onReplaySingle={row => void replaySingle(row)}
          speakerVoiceMap={speakerVoiceMap}
        />
      )}

      {phase === 'result' && score !== null && (
        <ResultPhase
          score={score}
          rows={rows}
          blankIndicesMap={blankIndicesMap}
          getUserInput={getUserInput}
          onRestart={restart}
          onNext={onNext}
        />
      )}
    </div>
  );
};
