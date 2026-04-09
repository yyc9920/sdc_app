import React, { useState } from 'react';
import type { TrainingRow } from '../../../hooks/training/types';
import type { VoiceKey } from '../../../hooks/training/types';
import { SPEEDS } from '../../../constants';

interface ListenPhaseProps {
  rows: TrainingRow[];
  isPlaying: boolean;
  currentPlayingIndex: number;
  hasPlayedOnce: boolean;
  speed: number;
  setSpeed: (s: number) => void;
  playAll: () => void;
  stop: () => void;
  onStartQuiz: () => void;
  speakerVoiceMap: Record<string, VoiceKey>;
}

const VOICE_LABEL_COLORS: Record<VoiceKey, string> = {
  male1: 'text-blue-600 dark:text-blue-400',
  female1: 'text-pink-600 dark:text-pink-400',
  male2: 'text-indigo-600 dark:text-indigo-400',
  female2: 'text-purple-600 dark:text-purple-400',
  male3: 'text-cyan-600 dark:text-cyan-400',
  female3: 'text-rose-600 dark:text-rose-400',
};

export const ListenPhase: React.FC<ListenPhaseProps> = ({
  rows,
  isPlaying,
  currentPlayingIndex,
  hasPlayedOnce,
  speed,
  setSpeed,
  playAll,
  stop,
  onStartQuiz,
  speakerVoiceMap,
}) => {
  const [localHasPlayed, setLocalHasPlayed] = useState(hasPlayedOnce);

  const handlePlayAll = (): void => {
    setLocalHasPlayed(true);
    void playAll();
  };

  const isActive = currentPlayingIndex >= 0;
  const effectiveHasPlayed = localHasPlayed || hasPlayedOnce;

  return (
    <div className="space-y-6">
      {/* Audio controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={isPlaying ? stop : handlePlayAll}
              className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              {isPlaying ? '일시정지' : isActive ? '재개' : '전체 듣기 ▶'}
            </button>
            {isActive && (
              <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                {currentPlayingIndex + 1} / {rows.length}
              </span>
            )}
          </div>

          {/* Speed selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">속도</span>
            <div className="flex gap-1">
              {SPEEDS.map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                    speed === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {isActive && (
          <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentPlayingIndex + 1) / rows.length) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Sentence list — shows all rows; highlights current */}
      <div className="space-y-2">
        {rows.map((row, index) => {
          const isCurrent = index === currentPlayingIndex;
          const isReading = row.rowType === 'reading';
          const speakerColor = row.speaker
            ? (VOICE_LABEL_COLORS[speakerVoiceMap[row.speaker]] ?? 'text-gray-500')
            : '';

          return (
            <div
              key={row.id}
              className={`p-3 rounded-lg border transition-all duration-200 ${
                isCurrent
                  ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                  : isReading
                  ? 'border-green-200 dark:border-green-800/50 bg-green-50/30 dark:bg-green-900/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              {row.speaker && (
                <span className={`text-xs font-semibold block mb-0.5 ${speakerColor}`}>
                  {row.speaker}
                </span>
              )}
              <p
                className={`text-base leading-relaxed ${
                  isCurrent
                    ? 'text-blue-900 dark:text-blue-100 font-medium'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {row.english}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quiz start CTA */}
      <div className="pt-2">
        <button
          onClick={onStartQuiz}
          className={`w-full py-3.5 font-bold rounded-lg transition-colors shadow-sm ${
            effectiveHasPlayed
              ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
          }`}
        >
          {effectiveHasPlayed ? '퀴즈 시작 →' : '전체 듣기 완료 후 퀴즈를 시작할 수 있어요'}
        </button>
        {!effectiveHasPlayed && (
          <button
            onClick={onStartQuiz}
            className="w-full mt-2 py-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            바로 퀴즈 시작 (듣기 건너뜀)
          </button>
        )}
      </div>
    </div>
  );
};
