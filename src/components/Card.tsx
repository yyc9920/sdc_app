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
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Sentence #{sentence.id + 1}
        </span>
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

      <div className="space-y-4">
        {(displayMode === 'all' || displayMode === 'english') && (
          <div>
            <p className={`text-xl font-bold leading-tight ${isPlaying ? 'text-blue-700' : 'text-gray-900 dark:text-white'}`}>
              {sentence.english}
            </p>
            <p className="text-sm text-blue-500 mt-1 font-medium">{sentence.koreanPronounce}</p>
          </div>
        )}

        {(displayMode === 'all' || displayMode === 'korean') && (
          <div className="space-y-2">
            <p className="text-lg text-gray-600 dark:text-gray-300 font-medium border-l-4 border-gray-100 dark:border-gray-700 pl-4">
              {sentence.directComprehension}
            </p>
            <p className="text-lg text-gray-900 dark:text-gray-100 font-bold border-l-4 border-blue-500 pl-4">
              {sentence.comprehension}
            </p>
          </div>
        )}
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
