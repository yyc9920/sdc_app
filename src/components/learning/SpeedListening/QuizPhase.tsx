import React from 'react';
import type { TrainingRow } from '../../../hooks/training/types';
import type { VoiceKey } from '../../../hooks/training/types';
import { BlankWord } from './BlankWord';

interface QuizPhaseProps {
  rows: TrainingRow[];
  blankIndicesMap: Record<number, Set<number>>;
  isWordBlank: (rowId: number, wordIndex: number) => boolean;
  getUserInput: (rowId: number, wordIndex: number) => string;
  updateBlank: (rowId: number, wordIndex: number, value: string) => void;
  isSubmitted: boolean;
  onSubmit: () => void;
  onReplaySingle: (row: TrainingRow) => void;
  speakerVoiceMap: Record<string, VoiceKey>;
}

const VOICE_LABEL_COLORS: Record<VoiceKey, string> = {
  male1: 'text-blue-600 dark:text-blue-400',
  female1: 'text-pink-600 dark:text-pink-400',
  male2: 'text-indigo-600 dark:text-indigo-400',
  female2: 'text-purple-600 dark:text-purple-400',
  male3: 'text-cyan-600 dark:text-cyan-400',
  female3: 'text-rose-600 dark:text-rose-400',
};

const VOICE_BUBBLE_COLORS: Record<VoiceKey, { even: string; odd: string }> = {
  male1: {
    even: 'border-blue-200 dark:border-blue-800/50',
    odd: 'border-blue-200 dark:border-blue-800/50',
  },
  female1: {
    even: 'border-pink-200 dark:border-pink-800/50',
    odd: 'border-pink-200 dark:border-pink-800/50',
  },
  male2: {
    even: 'border-indigo-200 dark:border-indigo-800/50',
    odd: 'border-indigo-200 dark:border-indigo-800/50',
  },
  female2: {
    even: 'border-purple-200 dark:border-purple-800/50',
    odd: 'border-purple-200 dark:border-purple-800/50',
  },
  male3: {
    even: 'border-cyan-200 dark:border-cyan-800/50',
    odd: 'border-cyan-200 dark:border-cyan-800/50',
  },
  female3: {
    even: 'border-rose-200 dark:border-rose-800/50',
    odd: 'border-rose-200 dark:border-rose-800/50',
  },
};

const DEFAULT_BUBBLE_COLORS = ['border-pink-200 dark:border-pink-800/50', 'border-sky-200 dark:border-sky-800/50'];

function getBubbleBorderClass(row: TrainingRow, index: number, speakerVoiceMap: Record<string, VoiceKey>): string {
  if (row.speaker && speakerVoiceMap[row.speaker]) {
    const voice = speakerVoiceMap[row.speaker];
    return VOICE_BUBBLE_COLORS[voice].even;
  }
  return DEFAULT_BUBBLE_COLORS[index % 2];
}

export const QuizPhase: React.FC<QuizPhaseProps> = ({
  rows,
  blankIndicesMap,
  isWordBlank,
  getUserInput,
  updateBlank,
  isSubmitted,
  onSubmit,
  onReplaySingle,
  speakerVoiceMap,
}) => {
  const hasAnyBlanks = rows.some(
    row => (blankIndicesMap[row.id]?.size ?? 0) > 0,
  );

  return (
    <div className="space-y-6">
      {/* Instruction */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        빈칸을 채워보세요. 문장 옆 ▶ 버튼으로 해당 문장을 다시 들을 수 있어요.
      </p>

      {/* Sentence rows — context hints are provided naturally by showing ALL rows */}
      <div className="space-y-3">
        {rows.map((row, index) => {
          const rowBlanks = blankIndicesMap[row.id];
          const hasBlanks = (rowBlanks?.size ?? 0) > 0;
          const isMultiSpeaker = Object.keys(speakerVoiceMap).length > 1;
          const isEven = index % 2 === 0;
          const bubbleBorder = getBubbleBorderClass(row, index, speakerVoiceMap);
          const speakerColor = row.speaker
            ? (VOICE_LABEL_COLORS[speakerVoiceMap[row.speaker]] ?? 'text-gray-400')
            : '';
          const isReading = row.rowType === 'reading';

          return (
            <div
              key={row.id}
              className={`flex ${isMultiSpeaker && !isEven ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`relative w-fit max-w-[92%] md:max-w-[85%] p-4 rounded-2xl border bg-white dark:bg-gray-800 shadow-sm ${bubbleBorder} ${
                  isReading ? 'rounded-xl border-l-4 border-l-green-400 dark:border-l-green-600 max-w-full w-full' : ''
                } ${
                  !hasBlanks ? 'opacity-75' : ''
                }`}
              >
                {/* Speaker label */}
                {row.speaker && (
                  <span className={`text-xs font-semibold block mb-1 ${speakerColor}`}>
                    {row.speaker}
                  </span>
                )}

                {/* Sentence with blanks */}
                <div className="text-base leading-relaxed text-gray-800 dark:text-gray-100 font-medium flex flex-wrap items-baseline">
                  {row.english.split(' ').map((word, wIndex) =>
                    isWordBlank(row.id, wIndex) ? (
                      <BlankWord
                        key={wIndex}
                        word={word}
                        userInput={getUserInput(row.id, wIndex)}
                        isSubmitted={isSubmitted}
                        onChange={value => updateBlank(row.id, wIndex, value)}
                      />
                    ) : (
                      <span key={wIndex} className="mr-1">
                        {word}
                      </span>
                    ),
                  )}
                </div>

                {/* Per-sentence replay button (addresses devil's re-listen concern) */}
                <button
                  onClick={() => onReplaySingle(row)}
                  className="absolute top-2 right-2 p-1 text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                  title="이 문장 다시 듣기"
                  aria-label="이 문장 다시 듣기"
                >
                  ▶
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit */}
      {!hasAnyBlanks && (
        <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
          이 세트에는 빈칸이 생성되지 않았습니다 (모든 단어가 고유명사이거나 특수문자를 포함합니다).
        </p>
      )}

      <button
        onClick={onSubmit}
        disabled={isSubmitted}
        className="w-full py-3.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {isSubmitted ? '제출 완료' : '정답 제출'}
      </button>
    </div>
  );
};
