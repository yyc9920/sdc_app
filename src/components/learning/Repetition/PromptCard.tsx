import type { TrainingRow } from '../../../hooks/training/types';

interface PromptCardProps {
  row: TrainingRow;
}

export const PromptCard = ({ row }: PromptCardProps) => {
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5 mb-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2.5 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold rounded-full">
          주제 소개
        </span>
        {row.speaker && (
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            {row.speaker}
          </span>
        )}
      </div>
      <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
        {row.english}
      </p>
      {row.comprehension && (
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
          {row.comprehension}
        </p>
      )}
    </div>
  );
};
