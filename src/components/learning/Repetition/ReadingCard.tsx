import { forwardRef } from 'react';
import { Volume2 } from 'lucide-react';
import type { TrainingRow } from '../../../hooks/training/types';
import type { DisplayToggles } from '../../../hooks/useRepetition';

interface ReadingCardProps {
  row: TrainingRow;
  isActive: boolean;
  speakerColor?: string;
  onPlay: () => void;
  displayToggles?: DisplayToggles;
}

const COLOR_CLASSES: Record<string, { dot: string; name: string }> = {
  blue: { dot: 'bg-blue-500', name: 'text-blue-600 dark:text-blue-400' },
  rose: { dot: 'bg-rose-500', name: 'text-rose-600 dark:text-rose-400' },
  amber: { dot: 'bg-amber-500', name: 'text-amber-600 dark:text-amber-400' },
  emerald: { dot: 'bg-emerald-500', name: 'text-emerald-600 dark:text-emerald-400' },
  violet: { dot: 'bg-violet-500', name: 'text-violet-600 dark:text-violet-400' },
  cyan: { dot: 'bg-cyan-500', name: 'text-cyan-600 dark:text-cyan-400' },
};

export const ReadingCard = forwardRef<HTMLButtonElement, ReadingCardProps>(
  ({ row, isActive, speakerColor, onPlay, displayToggles }, ref) => {
    const colors = speakerColor ? COLOR_CLASSES[speakerColor] : null;

    return (
      <button
        ref={ref}
        onClick={onPlay}
        className={`w-full text-left rounded-2xl border p-5 transition-all duration-200 active:scale-[0.98] ${
          isActive
            ? 'ring-2 ring-green-500 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 shadow-lg'
            : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 hover:border-green-400 dark:hover:border-green-600 hover:shadow-md'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs font-bold rounded-full">
            읽기
          </span>
          {row.speaker && colors && (
            <>
              <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
              <span className={`text-xs font-semibold ${colors.name}`}>{row.speaker}</span>
            </>
          )}
          {isActive && (
            <Volume2 className="w-4 h-4 text-green-500 ml-auto shrink-0" />
          )}
        </div>
        {displayToggles?.showEnglish !== false && (
          <p className="text-base text-gray-900 dark:text-white leading-loose">
            {row.english}
          </p>
        )}
        {displayToggles?.showPronunciation !== false && row.koreanPronounce && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {row.koreanPronounce}
          </p>
        )}
        {displayToggles?.showDirectComprehension && row.directComprehension && (
          <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
            {row.directComprehension}
          </p>
        )}
        {displayToggles?.showComprehension !== false && row.comprehension && (
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            {row.comprehension}
          </p>
        )}
      </button>
    );
  },
);

ReadingCard.displayName = 'ReadingCard';
