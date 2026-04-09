import React from 'react';
import { cleanWord } from '../../../utils/textProcessing';

interface BlankWordProps {
  word: string;
  userInput: string;
  isSubmitted: boolean;
  onChange: (value: string) => void;
}

export const BlankWord: React.FC<BlankWordProps> = ({
  word,
  userInput,
  isSubmitted,
  onChange,
}) => {
  const match = word.match(/^([.,?!;:"']*)(.+?)([.,?!;:"']*)$/);
  const leadingPunct = match?.[1] ?? '';
  const actualWord = match?.[2] ?? word;
  const trailingPunct = match?.[3] ?? '';

  const isCorrect = cleanWord(userInput) === cleanWord(actualWord);
  const hasInput = userInput.length > 0;

  let inputClass =
    'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white';
  if (hasInput && isCorrect) {
    inputClass =
      'bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-400 text-green-700 dark:text-green-400';
  } else if (isSubmitted) {
    inputClass =
      'bg-red-100 dark:bg-red-900/30 border-red-500 dark:border-red-400 text-red-700 dark:text-red-400';
  } else if (hasInput) {
    inputClass =
      'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-400';
  }

  const inputWidth = `${Math.max(actualWord.length, 2) + 1.5}ch`;

  return (
    <span className="mr-1 inline-flex items-baseline">
      {leadingPunct && <span>{leadingPunct}</span>}
      <span className="inline-flex flex-col items-center">
        <input
          type="text"
          value={userInput}
          onChange={e => onChange(e.target.value)}
          disabled={isSubmitted}
          maxLength={actualWord.length + 3}
          style={{ width: inputWidth, boxSizing: 'content-box', minWidth: '44px' }}
          className={`px-1 py-0.5 border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-base ${inputClass}`}
        />
        {isSubmitted && !isCorrect && (
          <span className="text-xs text-green-600 dark:text-green-400 mt-0.5">{actualWord}</span>
        )}
      </span>
      {trailingPunct && <span>{trailingPunct}</span>}
    </span>
  );
};
