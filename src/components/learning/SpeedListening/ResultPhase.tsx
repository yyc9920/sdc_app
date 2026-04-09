import React from 'react';
import type { QuizScore } from '../../../hooks/useSpeedListening';
import { cleanWord } from '../../../hooks/useSpeedListening';
import type { TrainingRow } from '../../../hooks/training/types';

interface ResultPhaseProps {
  score: QuizScore;
  rows: TrainingRow[];
  blankIndicesMap: Record<number, Set<number>>;
  getUserInput: (rowId: number, wordIndex: number) => string;
  onRestart: () => void;
  onNext?: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return '완벽해요! 🎉';
  if (score >= 70) return '잘했어요!';
  if (score >= 50) return '괜찮아요. 다시 도전해봐요!';
  return '조금 더 연습해봐요.';
}

export const ResultPhase: React.FC<ResultPhaseProps> = ({
  score,
  rows,
  blankIndicesMap,
  getUserInput,
  onRestart,
  onNext,
}) => {
  return (
    <div className="space-y-6">
      {/* Score card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center shadow-sm">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">최종 점수</p>
        <p className={`text-5xl font-bold tabular-nums mb-2 ${getScoreColor(score.score)}`}>
          {score.score}
          <span className="text-2xl">점</span>
        </p>
        <p className="text-gray-600 dark:text-gray-300">{getScoreLabel(score.score)}</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          {score.blanksCorrect} / {score.blanksTotal} 정답
        </p>
      </div>

      {/* Review — all sentences with blank results highlighted */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          결과 확인
        </h3>
        {rows.map((row, index) => {
          const rowBlanks = blankIndicesMap[row.id];
          const hasBlanks = (rowBlanks?.size ?? 0) > 0;
          const isEven = index % 2 === 0;

          return (
            <div
              key={row.id}
              className={`flex ${isEven ? 'justify-start' : 'justify-end'}`}
            >
              <div className="w-fit max-w-[92%] md:max-w-[85%] p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                {row.speaker && (
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 block mb-1">
                    {row.speaker}
                  </span>
                )}
                <div className="text-base leading-relaxed text-gray-800 dark:text-gray-100 font-medium flex flex-wrap items-baseline">
                  {row.english.split(' ').map((word, wIndex) => {
                    if (!hasBlanks || !rowBlanks?.has(wIndex)) {
                      return (
                        <span key={wIndex} className="mr-1">
                          {word}
                        </span>
                      );
                    }

                    const match = word.match(/^([.,?!;:"']*)(.+?)([.,?!;:"']*)$/);
                    const leadingPunct = match?.[1] ?? '';
                    const actualWord = match?.[2] ?? word;
                    const trailingPunct = match?.[3] ?? '';
                    const userInput = getUserInput(row.id, wIndex);
                    const isCorrect = cleanWord(userInput) === cleanWord(actualWord);

                    return (
                      <span key={wIndex} className="mr-1 inline-flex items-baseline">
                        {leadingPunct && <span>{leadingPunct}</span>}
                        <span
                          className={`font-semibold px-0.5 rounded ${
                            isCorrect
                              ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
                              : 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
                          }`}
                        >
                          {isCorrect ? userInput || actualWord : actualWord}
                        </span>
                        {!isCorrect && userInput && (
                          <span className="text-xs text-red-400 dark:text-red-500 line-through ml-0.5">
                            {userInput}
                          </span>
                        )}
                        {trailingPunct && <span>{trailingPunct}</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-2">
        <button
          onClick={onRestart}
          className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          다시 도전
        </button>
        <button
          onClick={onNext}
          disabled={!onNext}
          className="w-full py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {onNext ? '다음 세트 →' : '마지막 세트입니다'}
        </button>
      </div>
    </div>
  );
};
