import React from 'react';

interface WordInputProps {
  word: string;
  sentenceId: number;
  wordIndex: number;
  isBlank: boolean;
  userInput: string;
  isSubmitted: boolean;
  onInputChange: (value: string) => void;
}

const cleanWord = (word: string) => word.replace(/[.,?!;:"']/g, '').toLowerCase();

const getInputColorClass = (userInput: string, actualWord: string, isSubmitted: boolean): string => {
  const isCorrect = cleanWord(userInput) === cleanWord(actualWord);
  
  if (isCorrect && userInput.length > 0) {
    return 'bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-400 text-green-700 dark:text-green-400';
  }
  if (isSubmitted) {
    return 'bg-red-100 dark:bg-red-900/30 border-red-500 dark:border-red-400 text-red-700 dark:text-red-400';
  }
  if (userInput.length > 0) {
    return 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-400';
  }
  return 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white';
};

export const WordInput: React.FC<WordInputProps> = ({
  word,
  wordIndex,
  isBlank,
  userInput,
  isSubmitted,
  onInputChange,
}) => {
  if (!isBlank) {
    return <span key={wordIndex} className="mr-1">{word}</span>;
  }

  const match = word.match(/^([.,?!;:"']*)(.+?)([.,?!;:"']*)$/);
  const leadingPunct = match ? match[1] : '';
  const actualWord = match ? match[2] : word;
  const trailingPunct = match ? match[3] : '';

  const inputColor = getInputColorClass(userInput, actualWord, isSubmitted);
  const isCorrect = cleanWord(userInput) === cleanWord(actualWord);
  const inputWidth = `${Math.max(actualWord.length, 2) + 1}ch`;

  return (
    <span className="mr-1 inline-flex items-baseline">
      {leadingPunct && <span>{leadingPunct}</span>}
      <span className="inline-flex flex-col items-center">
        <input
          type="text"
          value={userInput}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={isSubmitted}
          maxLength={actualWord.length}
          style={{ width: inputWidth, boxSizing: 'content-box', minWidth: '40px' }}
          className={`px-1 py-0.5 border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${inputColor} text-sm sm:text-base`}
        />
        {isSubmitted && !isCorrect && (
          <span className="text-xs text-green-600">{actualWord}</span>
        )}
      </span>
      {trailingPunct && <span>{trailingPunct}</span>}
    </span>
  );
};
