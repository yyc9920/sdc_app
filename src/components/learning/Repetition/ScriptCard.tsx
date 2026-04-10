import { forwardRef } from 'react';
import { Volume2 } from 'lucide-react';
import type { TrainingRow } from '../../../hooks/training/types';

interface ScriptCardProps {
  row: TrainingRow;
  isActive: boolean;
  speakerColor?: string;
  onPlay: () => void;
}

const COLOR_CLASSES: Record<string, { dot: string; name: string }> = {
  blue: { dot: 'bg-blue-500', name: 'text-blue-600 dark:text-blue-400' },
  rose: { dot: 'bg-rose-500', name: 'text-rose-600 dark:text-rose-400' },
  amber: { dot: 'bg-amber-500', name: 'text-amber-600 dark:text-amber-400' },
  emerald: { dot: 'bg-emerald-500', name: 'text-emerald-600 dark:text-emerald-400' },
  violet: { dot: 'bg-violet-500', name: 'text-violet-600 dark:text-violet-400' },
  cyan: { dot: 'bg-cyan-500', name: 'text-cyan-600 dark:text-cyan-400' },
};

export const ScriptCard = forwardRef<HTMLButtonElement, ScriptCardProps>(
  ({ row, isActive, speakerColor, onPlay }, ref) => {
    const colors = speakerColor ? COLOR_CLASSES[speakerColor] : null;

    return (
      <button
        ref={ref}
        onClick={onPlay}
        className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 active:scale-[0.98] ${
          isActive
            ? 'ring-2 ring-blue-500 border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 shadow-lg'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
        }`}
      >
        {row.speaker && colors && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
            <span className={`text-xs font-semibold ${colors.name}`}>{row.speaker}</span>
          </div>
        )}
        <div className="flex items-start gap-2">
          <p className="flex-1 text-base font-medium text-gray-900 dark:text-white leading-relaxed">
            {row.english}
          </p>
          {isActive && (
            <Volume2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          )}
        </div>
        {row.koreanPronounce && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 font-medium">
            {row.koreanPronounce}
          </p>
        )}
        {row.comprehension && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {row.comprehension}
          </p>
        )}
      </button>
    );
  },
);

ScriptCard.displayName = 'ScriptCard';
