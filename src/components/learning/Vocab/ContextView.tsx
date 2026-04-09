import { ChevronRight } from 'lucide-react';
import type { TrainingRow } from '../../../hooks/training';

interface ContextViewProps {
  currentRow: TrainingRow;
  contextRows: TrainingRow[];
  onNext: () => void;
}

function highlightExpression(text: string, expression: string): React.ReactNode[] {
  const escaped = expression.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Word-boundary match ensures "turn" doesn't highlight inside "return"
  const parts = text.split(new RegExp(`(\\b${escaped}\\b)`, 'gi'));
  return parts.map((part, i) =>
    // Odd indices are the captured regex matches
    i % 2 === 1 ? (
      <mark
        key={i}
        className="bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded px-0.5 not-italic"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export const ContextView = ({ currentRow, contextRows, onNext }: ContextViewProps) => {
  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <div className="text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400">
          Context
        </span>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
          문맥 속에서 보기
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          표현이 사용된 문장을 확인하세요.
        </p>
      </div>

      {/* Expression reminder */}
      <div className="text-center px-6 py-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl border border-emerald-200 dark:border-emerald-700">
        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
          {currentRow.english}
        </p>
        <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
          {currentRow.comprehension}
        </p>
      </div>

      {contextRows.length > 0 ? (
        <div className="flex flex-col gap-3">
          {contextRows.slice(0, 3).map(row => (
            <div
              key={row.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <p className="text-gray-900 dark:text-white leading-relaxed">
                {highlightExpression(row.english, currentRow.english)}
              </p>
              {row.comprehension && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {row.comprehension}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            이 세트에서 해당 표현의 문맥 예문을 찾을 수 없습니다.
          </p>
        </div>
      )}

      <button
        onClick={onNext}
        className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-md transition-all active:scale-95"
      >
        연습하기
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};
