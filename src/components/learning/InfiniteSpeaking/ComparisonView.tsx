import { useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Mic, ChevronRight, RotateCcw } from 'lucide-react';

const MAX_RETRIES = 3;

interface ComparisonViewProps {
  score: number;
  wordStatuses: string[];
  words: string[];
  onPlayModel: () => void;
  onPlayMine: () => void;
  /** Whether any form of "my pronunciation" playback is available */
  canPlayMine: boolean;
  onNext: () => void;
  onRetry: () => void;
  retryCount: number;
  handsFree: boolean;
  /** R4: no retries offered */
  disableRetry?: boolean;
}

export const ComparisonView = ({
  score,
  wordStatuses,
  words,
  onPlayModel,
  onPlayMine,
  canPlayMine,
  onNext,
  onRetry,
  retryCount,
  handsFree,
  disableRetry = false,
}: ComparisonViewProps) => {
  const [playingModel, setPlayingModel] = useState(false);
  const [playingMine, setPlayingMine] = useState(false);

  const scoreColor = score >= 80 ? 'text-green-600 dark:text-green-400' : score >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
  const scoreBg = score >= 80 ? 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : score >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : 'bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Score */}
      <div className={`${scoreBg} rounded-2xl p-6 text-center`}>
        <p className={`text-5xl font-extrabold ${scoreColor}`}>{score}%</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {score >= 80 ? '훌륭해요!' : score >= 50 ? '좋아요, 조금 더!' : '다시 도전해보세요!'}
        </p>
      </div>

      {/* Word-by-word result */}
      <div className="flex flex-wrap gap-2 justify-center">
        {words.map((word, i) => {
          const status = wordStatuses[i];
          return (
            <span
              key={i}
              className={`px-2 py-1 rounded-lg text-lg font-bold transition-colors ${
                status === 'correct'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}
            >
              {word}
            </span>
          );
        })}
      </div>

      {/* Playback buttons */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => {
            setPlayingModel(true);
            onPlayModel();
            setTimeout(() => setPlayingModel(false), 2000);
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all ${
            playingModel
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50'
          }`}
        >
          <Volume2 className="w-5 h-5" />
          모범 발음
        </button>
        {canPlayMine && (
          <button
            onClick={() => {
              if (playingMine) return;
              setPlayingMine(true);
              onPlayMine();
              setTimeout(() => setPlayingMine(false), 3000);
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all ${
              playingMine
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 hover:bg-purple-200 dark:hover:bg-purple-900/50'
            }`}
          >
            <Mic className="w-5 h-5" />
            내 발음
          </button>
        )}
      </div>

      {/* Retry / Next buttons */}
      {(() => {
        const isPerfect = score === 100;
        const canRetry = !isPerfect && retryCount < MAX_RETRIES && !disableRetry;

        if (handsFree) {
          return (
            <p className="text-center text-sm text-gray-400 animate-pulse">
              {canRetry ? '자동으로 다시 시도합니다...' : '자동으로 넘어갑니다...'}
            </p>
          );
        }

        return (
          <div className="space-y-3">
            {canRetry && (
              <>
                <button
                  onClick={onRetry}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
                >
                  <RotateCcw className="w-5 h-5" />
                  다시 시도 ({retryCount}/{MAX_RETRIES})
                </button>
                <button
                  onClick={onNext}
                  className="w-full flex items-center justify-center gap-2 py-3 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium rounded-2xl transition-all"
                >
                  건너뛰기 <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            {!canRetry && (
              <button
                onClick={onNext}
                className="w-full flex items-center justify-center gap-2 py-4 bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
              >
                다음 <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        );
      })()}
    </motion.div>
  );
};
