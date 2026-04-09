import { BookOpen, AlertCircle } from 'lucide-react';
import type { AnalysisResult } from '../../../hooks/useFreeResponse';

interface CompareViewProps {
  analysis: AnalysisResult;
  modelRows: Array<{ english: string }>;
  transcriptMissing: boolean;
  onStartStudy: () => void;
}

export const CompareView = ({
  analysis,
  modelRows,
  transcriptMissing,
  onStartStudy,
}: CompareViewProps) => {
  const { overlapPercent, keywordsMatched, keywordsMissed, userWords, modelWords } = analysis;

  const scoreColor =
    overlapPercent >= 70
      ? 'text-green-600 dark:text-green-400'
      : overlapPercent >= 40
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-500 dark:text-red-400';

  return (
    <div className="flex flex-col gap-6">
      {/* Score badge or empty-transcript notice */}
      {transcriptMissing ? (
        <div className="flex flex-col items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-2xl text-center">
          <AlertCircle className="w-8 h-8 text-amber-500" />
          <p className="font-semibold text-amber-800 dark:text-amber-200">
            음성이 인식되지 않았습니다
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            마이크 권한을 확인하거나, 더 크게 말하고 다시 시도해보세요.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <span className={`text-5xl font-bold ${scoreColor}`}>{overlapPercent}%</span>
          <p className="text-sm text-gray-500 dark:text-gray-400">주요 어휘 일치율</p>
        </div>
      )}

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* User transcript */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-3">
            내 답변
          </p>
          <p className="leading-relaxed text-sm">
            {userWords.length === 0 ? (
              <span className="text-gray-400 italic">인식된 텍스트 없음</span>
            ) : (
              userWords.map((w, i) => (
                <span
                  key={i}
                  className={
                    w.matched
                      ? 'text-green-700 dark:text-green-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300'
                  }
                >
                  {w.word}{' '}
                </span>
              ))
            )}
          </p>
        </div>

        {/* Model answer */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 border border-purple-200 dark:border-purple-800">
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-3">
            모범답안
          </p>
          <p className="leading-relaxed text-sm">
            {modelWords.map((w, i) => (
              <span
                key={i}
                className={
                  w.found
                    ? 'text-green-700 dark:text-green-400 font-semibold'
                    : 'text-gray-700 dark:text-gray-300'
                }
              >
                {w.word}{' '}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* Keyword breakdown — only when transcript was recognized */}
      {!transcriptMissing && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
          {keywordsMatched.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1.5">
                사용한 키워드 ({keywordsMatched.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {keywordsMatched.map(kw => (
                  <span
                    key={kw}
                    className="px-2.5 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs rounded-full font-medium"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
          {keywordsMissed.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 dark:text-red-400 mb-1.5">
                놓친 키워드 ({keywordsMissed.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {keywordsMissed.slice(0, 10).map(kw => (
                  <span
                    key={kw}
                    className="px-2.5 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs rounded-full font-medium"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Model sentences list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          모범답안 전문
        </p>
        {modelRows.map((row, i) => (
          <p key={i} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-3 border-l-2 border-purple-300 dark:border-purple-700">
            {row.english}
          </p>
        ))}
      </div>

      <button
        onClick={onStartStudy}
        className="flex items-center justify-center gap-3 px-8 py-4 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-lg rounded-2xl shadow-lg transition-all"
      >
        <BookOpen className="w-5 h-5" />
        모범답안 학습
      </button>
    </div>
  );
};
