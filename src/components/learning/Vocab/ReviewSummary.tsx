import { Check, X, Calendar, Trophy } from 'lucide-react';
import type { VocabItemResult } from '../../../hooks/useVocab';

interface ReviewSummaryProps {
  results: VocabItemResult[];
  score: number;
  nextReviewDays: number;
  onFinish: () => void;
}

export const ReviewSummary = ({ results, score, nextReviewDays, onFinish }: ReviewSummaryProps) => {
  const getScoreColor = () => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreLabel = () => {
    if (score >= 80) return '훌륭해요!';
    if (score >= 50) return '잘 했어요!';
    return '더 연습해봐요';
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400">
          Review
        </span>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">학습 완료!</h2>
      </div>

      {/* Score card */}
      <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <Trophy className="w-10 h-10 mx-auto text-amber-400 mb-3" />
        <p className={`text-5xl font-extrabold ${getScoreColor()}`}>{score}%</p>
        <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">{getScoreLabel()}</p>
      </div>

      {/* Next review */}
      <div className="flex items-center gap-3 px-5 py-4 bg-blue-50 dark:bg-blue-900/30 rounded-2xl border border-blue-200 dark:border-blue-700">
        <Calendar className="w-5 h-5 text-blue-500 shrink-0" />
        <div>
          <p className="text-sm font-bold text-blue-800 dark:text-blue-200">
            다음 복습 권장: {nextReviewDays}일 후
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
            {nextReviewDays === 7
              ? '완벽하게 기억하고 있어요!'
              : nextReviewDays === 3
                ? '조금 더 연습하면 완벽해질 거예요.'
                : '오늘 다시 복습해보세요.'}
          </p>
        </div>
      </div>

      {/* Result table */}
      {results.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="grid grid-cols-3 gap-0 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <span>표현</span>
            <span className="text-center">연습</span>
            <span className="text-center">발화</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {results.map((result, i) => (
              <div key={i} className="grid grid-cols-3 gap-0 px-4 py-3 items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {result.row.english}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {result.row.comprehension}
                  </p>
                </div>
                <div className="flex justify-center">
                  {result.practiceCorrect ? (
                    <Check className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <X className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div className="flex justify-center">
                  {result.produceHit ? (
                    <Check className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <X className="w-5 h-5 text-red-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Finish button */}
      <button
        onClick={onFinish}
        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-md transition-all active:scale-95 text-lg"
      >
        완료
      </button>
    </div>
  );
};
