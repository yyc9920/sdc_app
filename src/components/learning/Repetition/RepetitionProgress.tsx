import type { TrainingRow } from '../../../hooks/training/types';

interface RepetitionProgressProps {
  rows: TrainingRow[];
  currentIndex: number;
  onGoTo: (index: number) => void;
}

const ROW_TYPE_COLOR: Record<string, string> = {
  script: 'bg-blue-500',
  reading: 'bg-green-500',
};

const ROW_TYPE_COLOR_ACTIVE: Record<string, string> = {
  script: 'bg-blue-300',
  reading: 'bg-green-300',
};

export const RepetitionProgress = ({ rows, currentIndex, onGoTo }: RepetitionProgressProps) => {
  if (rows.length === 0) return null;

  // Avoid unclickable tiny segments on large sets
  const isClickable = rows.length <= 50;

  return (
    <div className="shrink-0 w-full max-w-4xl mx-auto px-4 pt-2 pb-1">
      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1.5">
        <span className="font-semibold text-blue-600 dark:text-blue-400">
          {currentIndex + 1}
        </span>
        <span>/</span>
        <span>{rows.length}</span>
      </div>
      <div className="flex gap-px h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
        {rows.map((row, i) => {
          const isActive = i === currentIndex;
          const colorClass = isActive
            ? (ROW_TYPE_COLOR_ACTIVE[row.rowType] ?? 'bg-gray-400')
            : (ROW_TYPE_COLOR[row.rowType] ?? 'bg-gray-300 dark:bg-gray-600');

          return (
            <div
              key={row.rowSeq}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onClick={isClickable ? () => onGoTo(i) : undefined}
              onKeyDown={isClickable ? (e) => { if (e.key === 'Enter') onGoTo(i); } : undefined}
              className={`flex-1 transition-all duration-150 ${colorClass} ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              }`}
              style={{ minWidth: 2 }}
              aria-label={isClickable ? `${row.rowType} ${i + 1}로 이동` : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};
