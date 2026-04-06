import { useState, useEffect, useCallback, forwardRef } from 'react';
import { Volume2, Mic, Play, CheckCircle } from 'lucide-react';
import type { SentenceData } from '../types';

interface CardProps {
  sentence: SentenceData;
  displayMode: 'all' | 'english' | 'korean';
  isInRange: boolean;
  isPlaying: boolean;
  onClick: () => void;
  onCheckPronunciation: (sentence: SentenceData) => void;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  sentence,
  displayMode,
  isInRange,
  isPlaying,
  onClick,
  onCheckPronunciation
}, ref) => {
  const [score, setScore] = useState<number | null>(null);

  const loadScore = useCallback(() => {
    const storageKey = `pronunciation-score-${sentence.id}`;
    const savedScore = localStorage.getItem(storageKey);
    if (savedScore) {
      setScore(Number(savedScore));
    }
  }, [sentence.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadScore();
    
    // Listen for storage changes in case other components update it
    window.addEventListener('storage', loadScore);
    return () => window.removeEventListener('storage', loadScore);
  }, [loadScore]);

  const handlePronunciationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCheckPronunciation(sentence);
  };

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`
        p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer
        ${isPlaying 
          ? 'bg-blue-50 border-blue-400 shadow-md transform scale-[1.01]' 
          : 'bg-white dark:bg-gray-800 border-transparent hover:border-gray-200 dark:hover:border-gray-700 shadow-sm'}
        ${!isInRange ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}
      `}
    >
      <div className="flex justify-end items-start mb-4">
        <div className="flex gap-2">
          {score !== null && (
            <div className="flex items-center gap-1 bg-green-50 text-green-600 px-2 py-1 rounded-lg text-xs font-bold">
              <CheckCircle className="w-3 h-3" />
              {score}%
            </div>
          )}
          {isPlaying && (
            <div className="flex items-center gap-1 bg-blue-100 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold animate-pulse">
              <Play className="w-3 h-3" />
              Playing
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {(displayMode === 'all' || displayMode === 'english') && (
          <div className="flex items-start gap-4">
            <div className={`text-3xl font-bold shrink-0 min-w-[3rem] text-right ${isPlaying ? 'text-blue-700' : 'text-gray-300 dark:text-gray-600'}`}>
              {sentence.id + 1}.
            </div>
            <div className="flex-1">
              {sentence.speaker && (
                <span className="inline-block text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded mb-1">
                  {sentence.speaker}
                </span>
              )}
              <p className={`text-3xl font-bold leading-tight ${isPlaying ? 'text-blue-700' : 'text-gray-900 dark:text-white'}`}>
                {sentence.english}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {(displayMode === 'all' || displayMode === 'korean') && (
            <div className="flex items-start gap-4">
              <div className="shrink-0 min-w-[3rem] text-right mt-0.5">
                <span className="inline-block text-sm font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded">의미</span>
              </div>
              <p className="text-xl text-gray-900 dark:text-gray-100 font-bold leading-relaxed flex-1">
                {sentence.comprehension}
              </p>
            </div>
          )}

          {(displayMode === 'all' || displayMode === 'english') && (
            <div className="flex items-start gap-4">
              <div className="shrink-0 min-w-[3rem] text-right mt-0.5">
                <span className="inline-block text-sm font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded">발음</span>
              </div>
              <p className="text-xl text-blue-500 font-medium leading-relaxed flex-1">
                {sentence.koreanPronounce}
              </p>
            </div>
          )}

          {(displayMode === 'all' || displayMode === 'korean') && (
            <div className="flex items-start gap-4">
              <div className="shrink-0 min-w-[3rem] text-right mt-0.5">
                <span className="inline-block text-sm font-bold text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-2.5 py-1 rounded">직독</span>
              </div>
              <p className="text-xl text-gray-600 dark:text-gray-300 font-medium leading-relaxed flex-1">
                {sentence.directComprehension}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-700 flex justify-end gap-3">
        <button
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 transition-colors"
          title="Listen"
        >
          <Volume2 className="w-5 h-5" />
        </button>
        <button
          onClick={handlePronunciationClick}
          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full text-blue-500 transition-colors"
          title="Check Pronunciation"
        >
          <Mic className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});

Card.displayName = 'Card';
