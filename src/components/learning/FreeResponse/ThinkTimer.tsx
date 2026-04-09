import { useState } from 'react';
import { Mic } from 'lucide-react';

interface ThinkTimerProps {
  secondsLeft: number;
  keywords: string[];
  onStartRecord: () => void;
}

export const ThinkTimer = ({ secondsLeft, keywords, onStartRecord }: ThinkTimerProps) => {
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());

  const toggleReveal = (index: number) => {
    setRevealedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const progress = (secondsLeft / 30) * 100;
  const isUrgent = secondsLeft <= 10;

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      {/* Countdown circle */}
      <div className="relative flex items-center justify-center">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
            className={`transition-all duration-1000 ${isUrgent ? 'stroke-red-500' : 'stroke-indigo-500'}`}
          />
        </svg>
        <div className="absolute text-center">
          <span className={`text-4xl font-bold ${isUrgent ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>
            {secondsLeft}
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">초</p>
        </div>
      </div>

      <p className="text-gray-600 dark:text-gray-300 font-medium">답변을 준비하세요</p>

      {/* Keyword hints */}
      {keywords.length > 0 && (
        <div className="w-full max-w-md">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-3 uppercase tracking-wide">
            키워드 힌트 (탭하여 보기)
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {keywords.map((kw, i) => (
              <button
                key={i}
                onClick={() => toggleReveal(i)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  revealedIndices.has(i)
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-transparent select-none blur-sm'
                }`}
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onStartRecord}
        className="flex items-center gap-3 px-8 py-4 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold text-lg rounded-2xl shadow-lg transition-all"
      >
        <Mic className="w-5 h-5" />
        녹음 시작
      </button>
    </div>
  );
};
