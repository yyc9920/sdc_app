import { useState } from 'react';
import { Mic, Eye, EyeOff } from 'lucide-react';

interface ThinkTimerProps {
  secondsLeft: number;
  expired: boolean;
  promptText: string;
  onStartRecord: () => void;
}

export const ThinkTimer = ({ secondsLeft, expired, promptText, onStartRecord }: ThinkTimerProps) => {
  const [showQuestion, setShowQuestion] = useState(false);

  const progress = expired ? 0 : (secondsLeft / 30) * 100;
  const isUrgent = !expired && secondsLeft <= 10;

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
          {expired ? (
            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">
              준비됐나요?
            </p>
          ) : (
            <>
              <span className={`text-4xl font-bold ${isUrgent ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>
                {secondsLeft}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">초</p>
            </>
          )}
        </div>
      </div>

      <p className="text-gray-600 dark:text-gray-300 font-medium">
        {expired ? '준비가 되면 녹음을 시작하세요' : '답변을 준비하세요'}
      </p>

      {/* Question review toggle */}
      {promptText && (
        <div className="w-full max-w-md">
          <button
            onClick={() => setShowQuestion(prev => !prev)}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-full text-sm font-medium border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            {showQuestion ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showQuestion ? '질문 숨기기' : '질문 다시보기'}
          </button>
          {showQuestion && (
            <div className="mt-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-2xl">
              <p className="text-sm text-indigo-800 dark:text-indigo-200 font-medium leading-relaxed">
                {promptText}
              </p>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onStartRecord}
        className={`flex items-center gap-3 px-8 py-4 text-white font-bold text-lg rounded-2xl shadow-lg transition-all active:scale-95 ${
          expired
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-red-400 hover:bg-red-500'
        }`}
      >
        <Mic className="w-5 h-5" />
        녹음 시작
      </button>
    </div>
  );
};
