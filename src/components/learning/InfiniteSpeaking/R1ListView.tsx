import { motion } from 'framer-motion';
import { Volume2, Pause, Play, SkipForward } from 'lucide-react';
import { PromptCard } from './PromptCard';
import type { TrainingRow } from '../../../hooks/training/types';
import type { SpeakerStyle } from '../../../hooks/useInfiniteSpeaking';

interface R1ListViewProps {
  rows: TrainingRow[];
  promptRow: TrainingRow | null;
  speakerStyleMap: Record<string, SpeakerStyle>;
  playingIndex: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onSkip: () => void;
}

export const R1ListView = ({
  rows,
  promptRow,
  speakerStyleMap,
  playingIndex,
  isPaused,
  onTogglePause,
  onSkip,
}: R1ListViewProps) => {
  // Row list offset: if promptRow exists it's index 0 in the play sequence
  const promptOffset = promptRow ? 1 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Status banner */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400">
          {isPaused ? (
            <Pause className="w-4 h-4" />
          ) : (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Volume2 className="w-4 h-4" />
            </motion.div>
          )}
          <span>{isPaused ? '일시정지' : '재생 중...'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePause}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[44px]"
          >
            {isPaused ? (
              <><Play className="w-4 h-4" /> 계속</>
            ) : (
              <><Pause className="w-4 h-4" /> 일시정지</>
            )}
          </button>
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[44px]"
          >
            <SkipForward className="w-4 h-4" /> 건너뛰기
          </button>
        </div>
      </div>

      {/* Prompt context (shown as header, not counted in row list) */}
      {promptRow && playingIndex === 0 && (
        <div className="ring-2 ring-indigo-400 dark:ring-indigo-500 rounded-2xl">
          <PromptCard row={promptRow} />
        </div>
      )}
      {promptRow && playingIndex > 0 && <PromptCard row={promptRow} />}

      {/* Script rows */}
      <div className="space-y-2">
        {rows.map((row, idx) => {
          const absIndex = idx + promptOffset; // index in the full play sequence
          const isPlaying = absIndex === playingIndex && !isPaused;
          const isActive = absIndex === playingIndex;
          const isDone = absIndex < playingIndex;
          const speaker = row.speaker ? speakerStyleMap[row.speaker] : undefined;

          return (
            <motion.div
              key={row.id}
              initial={false}
              animate={{
                opacity: isDone ? 0.45 : 1,
                scale: isActive ? 1.01 : 1,
              }}
              transition={{ duration: 0.2 }}
              className={`rounded-2xl p-4 border transition-colors ${
                isActive
                  ? 'bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-600 shadow-md'
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
              }`}
            >
              {speaker && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mb-2 ${speaker.bgClass} ${speaker.colorClass}`}
                >
                  {speaker.name}
                </span>
              )}
              <p
                className={`text-base leading-relaxed ${
                  isActive
                    ? 'text-gray-900 dark:text-white font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {row.english}
              </p>
              {row.comprehension && (
                <p
                  className={`text-sm mt-1 ${
                    isActive
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {row.comprehension}
                </p>
              )}
              {isActive && (
                <div className="flex gap-0.5 mt-2 items-end h-4">
                  {isPlaying
                    ? [0, 1, 2, 3].map(i => (
                        <motion.div
                          key={i}
                          className="w-1 bg-blue-500 rounded-full"
                          animate={{ height: [4, 14, 4] }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                        />
                      ))
                    : <span className="text-xs text-blue-400">일시정지</span>
                  }
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* iOS background note */}
      <p className="text-xs text-center text-gray-400 dark:text-gray-500">
        화면이 꺼지면 재생이 중단될 수 있습니다
      </p>
    </motion.div>
  );
};
