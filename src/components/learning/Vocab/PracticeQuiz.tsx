import { useState } from 'react';
import { Check, X, ChevronRight } from 'lucide-react';
import type { TrainingRow } from '../../../hooks/training';

interface PracticeQuizProps {
  currentRow: TrainingRow;
  options: string[];
  blankSentence: string;
  onSubmit: (answer: string) => boolean;
  onNext: () => void;
}

type AnswerState = 'idle' | 'correct' | 'incorrect';

export const PracticeQuiz = ({
  currentRow,
  options,
  blankSentence,
  onSubmit,
  onNext,
}: PracticeQuizProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('idle');

  const handleSelect = (option: string) => {
    if (answerState !== 'idle') return;
    setSelected(option);
    const correct = onSubmit(option);
    setAnswerState(correct ? 'correct' : 'incorrect');
  };

  const getOptionStyle = (option: string): string => {
    const base =
      'w-full p-4 rounded-2xl border-2 text-left font-medium transition-all text-sm sm:text-base';

    if (answerState === 'idle') {
      return `${base} border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-[0.98]`;
    }

    if (option === currentRow.english) {
      return `${base} border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200`;
    }

    if (option === selected && answerState === 'incorrect') {
      return `${base} border-red-400 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200`;
    }

    return `${base} border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600`;
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <div className="text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400">
          Practice
        </span>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">빈칸 채우기</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          빈칸에 들어갈 알맞은 표현을 고르세요.
        </p>
      </div>

      {/* Blank sentence */}
      <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <p className="text-gray-900 dark:text-white text-base sm:text-lg leading-relaxed">
          {blankSentence}
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3">
        {options.map((option, i) => (
          <button key={i} onClick={() => handleSelect(option)} className={getOptionStyle(option)}>
            <div className="flex items-center gap-3">
              {answerState !== 'idle' && option === currentRow.english && (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              {answerState === 'incorrect' && option === selected && option !== currentRow.english && (
                <X className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span>{option}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Feedback */}
      {answerState !== 'idle' && (
        <div
          className={`p-4 rounded-2xl text-sm ${
            answerState === 'correct'
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}
        >
          <p className="font-bold">{answerState === 'correct' ? '정답!' : '오답'}</p>
          <p className="mt-1">{currentRow.comprehension}</p>
        </div>
      )}

      {/* Next */}
      {answerState !== 'idle' && (
        <button
          onClick={onNext}
          className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-md transition-all active:scale-95"
        >
          다음
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
