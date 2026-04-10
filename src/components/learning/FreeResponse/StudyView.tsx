import { motion } from 'framer-motion';
import { Volume2, ChevronRight, CheckCircle } from 'lucide-react';

interface StudyViewProps {
  sentence: string;
  koreanMeaning: string;
  currentIndex: number;
  total: number;
  isPlaying: boolean;
  ttsError: boolean;
  isLastSentence: boolean;
  onPlay: () => void;
  onNext: () => void;
}

export const StudyView = ({
  sentence,
  koreanMeaning,
  currentIndex,
  total,
  isPlaying,
  ttsError,
  isLastSentence,
  onPlay,
  onNext,
}: StudyViewProps) => (
  <div className="flex flex-col items-center gap-6 py-4">
    {/* Progress */}
    <div className="w-full max-w-md">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
        <span>문장 {currentIndex + 1} / {total}</span>
        <span>{Math.round(((currentIndex + 1) / total) * 100)}%</span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-500 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>
    </div>

    {/* Sentence card — R1 style */}
    <div className={`w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl p-6 transition-all ${
      isPlaying
        ? 'border-2 border-blue-300 dark:border-blue-600 shadow-md'
        : 'border border-gray-100 dark:border-gray-700 shadow-md'
    }`}>
      <p className={`text-xl sm:text-2xl font-bold leading-relaxed transition-colors ${
        isPlaying
          ? 'text-gray-900 dark:text-white'
          : 'text-gray-800 dark:text-white'
      }`}>
        {sentence}
      </p>
      {koreanMeaning && (
        <p className="mt-3 text-purple-600 dark:text-purple-400 font-medium text-sm leading-relaxed">
          {koreanMeaning}
        </p>
      )}

      {/* R1-style waveform animation during playback */}
      {isPlaying && (
        <div className="flex gap-0.5 mt-3 items-end h-4">
          {[0, 1, 2, 3].map(i => (
            <motion.div
              key={i}
              className="w-1 bg-blue-500 rounded-full"
              animate={{ height: [4, 14, 4] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>
      )}
    </div>

    {ttsError && (
      <p className="text-sm text-amber-600 dark:text-amber-400">
        음성을 불러올 수 없습니다.
      </p>
    )}

    {/* Play button */}
    <button
      onClick={onPlay}
      disabled={isPlaying}
      className={`flex items-center gap-2 px-6 py-3 border-2 rounded-full font-semibold transition-colors disabled:opacity-50 ${
        !isPlaying
          ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700 hover:border-purple-700'
          : 'bg-white dark:bg-gray-800 border-purple-400 dark:border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
      }`}
    >
      <Volume2 className="w-5 h-5" />
      {isPlaying ? '재생 중...' : '듣기'}
    </button>

    {/* Next button */}
    <button
      onClick={onNext}
      className="flex items-center gap-3 px-8 py-4 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-lg rounded-2xl shadow-lg transition-all"
    >
      {isLastSentence ? (
        <>
          <CheckCircle className="w-5 h-5" />
          학습 완료
        </>
      ) : (
        <>
          다음
          <ChevronRight className="w-5 h-5" />
        </>
      )}
    </button>
  </div>
);
