import { AnimatePresence, motion } from 'framer-motion';
import { Volume2, RotateCcw, ChevronRight } from 'lucide-react';
import type { TrainingRow } from '../../../hooks/training';

interface FlashCardProps {
  row: TrainingRow;
  isFlipped: boolean;
  onFlip: () => void;
  onNext: () => void;
  onPlayAudio: () => void;
  isPlaying: boolean;
  ttsError: boolean;
}

export const FlashCard = ({
  row,
  isFlipped,
  onFlip,
  onNext,
  onPlayAudio,
  isPlaying,
  ttsError,
}: FlashCardProps) => {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Card */}
      <button
        onClick={onFlip}
        className="w-full max-w-lg min-h-48 rounded-3xl shadow-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center transition-all hover:shadow-xl active:scale-[0.98] cursor-pointer relative overflow-hidden"
        aria-label={isFlipped ? '카드 앞면 보기' : '카드 뒤집기'}
      >
        <AnimatePresence mode="wait">
          {!isFlipped ? (
            <motion.div
              key="front"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-3"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400">
                Expression
              </span>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                {row.english}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">탭하여 뒤집기</p>
            </motion.div>
          ) : (
            <motion.div
              key="back"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-4"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400">
                뜻
              </span>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {row.comprehension}
              </p>
              {row.directComprehension && (
                <p className="text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3 w-full text-center">
                  {row.directComprehension}
                </p>
              )}
              {row.koreanPronounce && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  [{row.koreanPronounce}]
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Play pronunciation */}
        <button
          onClick={onPlayAudio}
          disabled={isPlaying}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium text-sm transition-colors disabled:opacity-50"
        >
          <Volume2 className="w-4 h-4" />
          {isPlaying ? '재생 중...' : '발음 듣기'}
        </button>

        {/* Flip back */}
        {isFlipped && (
          <button
            onClick={onFlip}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            앞면 보기
          </button>
        )}
      </div>

      {ttsError && (
        <p className="text-sm text-amber-600 dark:text-amber-400">음성을 불러올 수 없습니다.</p>
      )}

      {/* Next button — appears after flip */}
      {isFlipped && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onNext}
          className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-md transition-all active:scale-95"
        >
          다음
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      )}
    </div>
  );
};
