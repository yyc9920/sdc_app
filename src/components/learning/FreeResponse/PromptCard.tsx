import { useEffect } from 'react';
import { Volume2, ArrowRight } from 'lucide-react';

interface PromptCardProps {
  promptText: string;
  koreanMeaning: string;
  isPlaying: boolean;
  ttsError: boolean;
  onPlay: () => void;
  onStartThink: () => void;
}

export const PromptCard = ({
  promptText,
  koreanMeaning,
  isPlaying,
  ttsError,
  onPlay,
  onStartThink,
}: PromptCardProps) => {
  // Auto-play TTS when prompt is first shown
  useEffect(() => {
    onPlay();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- play once on mount
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="w-full max-w-2xl bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 shadow-xl">
        <p className="text-sm font-semibold text-indigo-200 uppercase tracking-widest mb-4">
          Topic / Question
        </p>
        <p className="text-2xl sm:text-3xl font-bold text-white leading-relaxed">
          {promptText}
        </p>
        {koreanMeaning && (
          <p className="mt-4 text-indigo-200 text-base leading-relaxed">
            {koreanMeaning}
          </p>
        )}
      </div>

      {ttsError && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          음성을 불러올 수 없습니다.
        </p>
      )}

      <button
        onClick={onPlay}
        disabled={isPlaying}
        className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        <Volume2 className="w-4 h-4" />
        {isPlaying ? '재생 중...' : '다시 듣기'}
      </button>

      <button
        onClick={onStartThink}
        className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-lg rounded-2xl shadow-lg transition-all"
      >
        준비하기
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};
