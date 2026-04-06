import { useState, useRef, useCallback } from 'react';
import type { SpeedListeningSet } from '../types';
import { AVAILABLE_VOICES, BLANK_MULTIPLIER } from '../constants';
import type { Voice } from '../constants';

export const cleanWord = (word: string) => word.replace(/[.,?!;:"']/g, '').toLowerCase();

export const generateSentenceVoices = (sentences: SpeedListeningSet['sentences']): Record<number, Voice> => {
  const v1Index = Math.floor(Math.random() * AVAILABLE_VOICES.length);
  let v2Index = Math.floor(Math.random() * AVAILABLE_VOICES.length);
  while (v2Index === v1Index) {
    v2Index = Math.floor(Math.random() * AVAILABLE_VOICES.length);
  }
  const v1 = AVAILABLE_VOICES[v1Index];
  const v2 = AVAILABLE_VOICES[v2Index];

  const map: Record<number, Voice> = {};
  sentences.forEach((sentence, index) => {
    map[sentence.id] = index % 2 === 0 ? v1 : v2;
  });
  return map;
};

export const generateBlankIndices = (
  sentences: SpeedListeningSet['sentences'],
  level: number
): Record<number, Set<number>> => {
  const map: Record<number, Set<number>> = {};
  sentences.forEach(sentence => {
    const words = sentence.english.split(' ');
    const eligibleIndices = words
      .map((_, i) => i)
      .filter(i => !sentence.properNounIndices.includes(i));
    
    for (let i = eligibleIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligibleIndices[i], eligibleIndices[j]] = [eligibleIndices[j], eligibleIndices[i]];
    }
    
    const numBlanks = Math.max(1, Math.floor(words.length * (level * BLANK_MULTIPLIER)));
    map[sentence.id] = new Set(eligibleIndices.slice(0, numBlanks));
  });
  return map;
};

interface QuizScore {
  blanksTotal: number;
  blanksCorrect: number;
  score: number;
  timeSpentSeconds: number;
}

interface UseQuizLogicProps {
  set: SpeedListeningSet;
}

interface UseQuizLogicReturn {
  blanks: Record<string, string>;
  isSubmitted: boolean;
  sentenceVoices: Record<number, Voice>;
  blankIndicesMap: Record<number, Set<number>>;
  setBlanks: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  getBlankKey: (sentenceId: number, wordIndex: number) => string;
  isWordBlank: (sentenceId: number, wordIndex: number) => boolean;
  getUserInput: (sentenceId: number, wordIndex: number) => string;
  updateBlank: (sentenceId: number, wordIndex: number, value: string) => void;
  submit: () => QuizScore;
  reset: () => void;
}

export const useQuizLogic = ({ set }: UseQuizLogicProps): UseQuizLogicReturn => {
  const [blanks, setBlanks] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [sentenceVoices, setSentenceVoices] = useState<Record<number, Voice>>(() =>
    generateSentenceVoices(set.sentences)
  );
  const [blankIndicesMap, setBlankIndicesMap] = useState<Record<number, Set<number>>>(() =>
    generateBlankIndices(set.sentences, set.level)
  );
  
  const startTimeRef = useRef<number>(Date.now());

  const getBlankKey = useCallback((sentenceId: number, wordIndex: number): string => {
    return `${sentenceId}-${wordIndex}`;
  }, []);

  const isWordBlank = useCallback((sentenceId: number, wordIndex: number): boolean => {
    return blankIndicesMap[sentenceId]?.has(wordIndex) ?? false;
  }, [blankIndicesMap]);

  const getUserInput = useCallback((sentenceId: number, wordIndex: number): string => {
    return blanks[getBlankKey(sentenceId, wordIndex)] || '';
  }, [blanks, getBlankKey]);

  const updateBlank = useCallback((sentenceId: number, wordIndex: number, value: string) => {
    setBlanks(prev => ({
      ...prev,
      [getBlankKey(sentenceId, wordIndex)]: value,
    }));
  }, [getBlankKey]);

  const calculateScore = useCallback((): QuizScore => {
    let blanksTotal = 0;
    let blanksCorrect = 0;

    set.sentences.forEach(sentence => {
      const words = sentence.english.split(' ');
      words.forEach((word, wIndex) => {
        if (blankIndicesMap[sentence.id]?.has(wIndex)) {
          blanksTotal++;
          const userInput = blanks[getBlankKey(sentence.id, wIndex)] || '';
          const match = word.match(/^[.,?!;:"']*(.+?)[.,?!;:"']*$/);
          const actualWord = match ? match[1] : word;
          if (cleanWord(userInput) === cleanWord(actualWord)) {
            blanksCorrect++;
          }
        }
      });
    });

    const score = blanksTotal > 0 ? Math.round((blanksCorrect / blanksTotal) * 100) : 0;
    const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    return { blanksTotal, blanksCorrect, score, timeSpentSeconds };
  }, [set.sentences, blankIndicesMap, blanks, getBlankKey]);

  const submit = useCallback((): QuizScore => {
    setIsSubmitted(true);
    return calculateScore();
  }, [calculateScore]);

  const reset = useCallback(() => {
    setBlanks({});
    setIsSubmitted(false);
    setSentenceVoices(generateSentenceVoices(set.sentences));
    setBlankIndicesMap(generateBlankIndices(set.sentences, set.level));
    startTimeRef.current = Date.now();
  }, [set]);

  return {
    blanks,
    isSubmitted,
    sentenceVoices,
    blankIndicesMap,
    setBlanks,
    getBlankKey,
    isWordBlank,
    getUserInput,
    updateBlank,
    submit,
    reset,
  };
};
