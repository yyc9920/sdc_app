import { useReducer, useCallback, useMemo, useRef, useEffect } from 'react';
import { getKeyExpressionIndices } from '../utils/keyExpressions';
import { TIMEOUTS } from '../constants/infiniteSpeaking';
import type { SentenceData } from '../types';

// --- Types ---

export type InfiniteSpeakingPhase =
  | 'SETUP'
  | 'ROUND_INTRO'
  | 'LISTENING'
  | 'SPEAKING'
  | 'COMPARISON'
  | 'ROUND_COMPLETE'
  | 'SESSION_COMPLETE';

export type Round = 1 | 2 | 3 | 4;

export interface Hint {
  id: number;
  message: string;
  timestamp: number;
}

export interface InfiniteSpeakingState {
  phase: InfiniteSpeakingPhase;
  currentRound: Round;
  currentSentenceIndex: number;
  currentGroupIndex: number;
  sentences: SentenceData[];
  shuffledOrder: number[];
  sentenceGroups: number[][];
  keyIndicesMap: Record<number, number[]>;
  handsFree: boolean;
  wordStatuses: string[];
  transcript: string;
  score: number;
  retryCount: number;
  hints: Hint[];
  hintIdCounter: number;
  sessionStartTime: number | null;
}

type Action =
  | { type: 'START_SESSION'; sentences: SentenceData[] }
  | { type: 'START_ROUND' }
  | { type: 'START_LISTENING' }
  | { type: 'START_SPEAKING' }
  | { type: 'UPDATE_SPEECH'; transcript: string; wordStatuses: string[]; score: number }
  | { type: 'FINISH_SPEAKING' }
  | { type: 'RETRY_SPEAKING' }
  | { type: 'NEXT_SENTENCE' }
  | { type: 'COMPLETE_ROUND' }
  | { type: 'NEXT_ROUND' }
  | { type: 'COMPLETE_SESSION' }
  | { type: 'TOGGLE_HANDS_FREE' }
  | { type: 'ADD_HINT'; message: string }
  | { type: 'DISMISS_HINT'; id: number }
  | { type: 'RESET' };

// --- Helpers (exported for testing) ---

export function shuffleArray(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

export function buildKeyIndicesMap(sentences: SentenceData[]): Record<number, number[]> {
  const map: Record<number, number[]> = {};
  for (const s of sentences) {
    map[s.id] = getKeyExpressionIndices(s.english);
  }
  return map;
}

/**
 * Groups sentences for speaking turns.
 * If a sentence has 3 or fewer words, it is grouped with the next sentence.
 */
export function buildSentenceGroups(
  sentences: SentenceData[],
  shuffledOrder: number[]
): number[][] {
  const groups: number[][] = [];
  let i = 0;
  while (i < shuffledOrder.length) {
    const idx = shuffledOrder[i];
    const wordCount = sentences[idx].english.split(' ').length;
    if (wordCount <= 3 && i + 1 < shuffledOrder.length) {
      groups.push([shuffledOrder[i], shuffledOrder[i + 1]]);
      i += 2;
    } else {
      groups.push([shuffledOrder[i]]);
      i += 1;
    }
  }
  return groups;
}

// --- Reducer ---

export const initialState: InfiniteSpeakingState = {
  phase: 'SETUP',
  currentRound: 1,
  currentSentenceIndex: 0,
  currentGroupIndex: 0,
  sentences: [],
  shuffledOrder: [],
  sentenceGroups: [],
  keyIndicesMap: {},
  handsFree: false,
  wordStatuses: [],
  transcript: '',
  score: 0,
  retryCount: 0,
  hints: [],
  hintIdCounter: 0,
  sessionStartTime: null,
};

export function reducer(state: InfiniteSpeakingState, action: Action): InfiniteSpeakingState {
  switch (action.type) {
    case 'START_SESSION': {
      const keyMap = buildKeyIndicesMap(action.sentences);
      const shuffled = shuffleArray(action.sentences.length);
      return {
        ...initialState,
        phase: 'ROUND_INTRO',
        sentences: action.sentences,
        shuffledOrder: shuffled,
        sentenceGroups: buildSentenceGroups(action.sentences, shuffled),
        keyIndicesMap: keyMap,
        handsFree: state.handsFree,
        currentRound: 1,
        sessionStartTime: Date.now(),
      };
    }

    case 'START_ROUND': {
      const shuffled = shuffleArray(state.sentences.length);
      return {
        ...state,
        phase: 'ROUND_INTRO',
        currentSentenceIndex: 0,
        currentGroupIndex: 0,
        shuffledOrder: shuffled,
        sentenceGroups: buildSentenceGroups(state.sentences, shuffled),
        wordStatuses: [],
        transcript: '',
        score: 0,
      };
    }

    case 'START_LISTENING':
      return {
        ...state,
        phase: 'LISTENING',
        wordStatuses: [],
        transcript: '',
        score: 0,
        retryCount: 0,
        hints: [],
      };

    case 'START_SPEAKING': {
      const group = state.sentenceGroups[state.currentGroupIndex] ?? [];
      const combinedWordCount = group.reduce(
        (sum, idx) => sum + (state.sentences[idx]?.english.split(' ').length ?? 0), 0
      );
      return {
        ...state,
        phase: 'SPEAKING',
        wordStatuses: new Array(combinedWordCount).fill('pending'),
        transcript: '',
        score: 0,
      };
    }

    case 'UPDATE_SPEECH':
      return {
        ...state,
        transcript: action.transcript,
        wordStatuses: action.wordStatuses,
        score: action.score,
      };

    case 'FINISH_SPEAKING':
      return {
        ...state,
        phase: 'COMPARISON',
      };

    case 'RETRY_SPEAKING': {
      const retryGroup = state.sentenceGroups[state.currentGroupIndex] ?? [];
      const retryWordCount = retryGroup.reduce(
        (sum, idx) => sum + (state.sentences[idx]?.english.split(' ').length ?? 0), 0
      );
      return {
        ...state,
        phase: 'SPEAKING',
        wordStatuses: new Array(retryWordCount).fill('pending'),
        transcript: '',
        score: 0,
        retryCount: state.retryCount + 1,
        hints: [],
      };
    }

    case 'NEXT_SENTENCE': {
      const nextGroupIndex = state.currentGroupIndex + 1;
      if (nextGroupIndex >= state.sentenceGroups.length) {
        return { ...state, phase: 'ROUND_COMPLETE' };
      }
      return {
        ...state,
        phase: 'LISTENING',
        currentGroupIndex: nextGroupIndex,
        wordStatuses: [],
        transcript: '',
        score: 0,
        retryCount: 0,
        hints: [],
      };
    }

    case 'COMPLETE_ROUND':
      return { ...state, phase: 'ROUND_COMPLETE' };

    case 'NEXT_ROUND': {
      const nextRound = (state.currentRound + 1) as Round;
      if (nextRound > 4) {
        return { ...state, phase: 'SESSION_COMPLETE' };
      }
      const newShuffled = shuffleArray(state.sentences.length);
      return {
        ...state,
        phase: 'ROUND_INTRO',
        currentRound: nextRound,
        currentSentenceIndex: 0,
        currentGroupIndex: 0,
        shuffledOrder: newShuffled,
        sentenceGroups: buildSentenceGroups(state.sentences, newShuffled),
        wordStatuses: [],
        transcript: '',
        score: 0,
        hints: [],
      };
    }

    case 'COMPLETE_SESSION':
      return { ...state, phase: 'SESSION_COMPLETE' };

    case 'TOGGLE_HANDS_FREE':
      return { ...state, handsFree: !state.handsFree };

    case 'ADD_HINT': {
      const newId = state.hintIdCounter + 1;
      return {
        ...state,
        hintIdCounter: newId,
        hints: [...state.hints.slice(-2), { id: newId, message: action.message, timestamp: Date.now() }],
      };
    }

    case 'DISMISS_HINT':
      return {
        ...state,
        hints: state.hints.filter(h => h.id !== action.id),
      };

    case 'RESET':
      return { ...initialState, handsFree: state.handsFree };

    default:
      return state;
  }
}

/**
 * Evaluates the spoken transcript against the target sentence.
 * Uses a flexible matching algorithm: each target word can be matched
 * by any occurrence in the spoken words, allowing mid-sentence corrections.
 */
export function evaluateSpeechLogic(
  spokenText: string,
  targetSentence: string,
  markFinal: boolean = false
): { wordStatuses: string[]; score: number } {
  const targetWords = targetSentence.split(' ');
  const spokenClean = spokenText.toLowerCase().replace(/[.,!?;:'"()&\-_—]/g, '').split(/\s+/).filter(Boolean);

  const spokenWordCounts = new Map<string, number>();
  for (const w of spokenClean) {
    spokenWordCounts.set(w, (spokenWordCounts.get(w) ?? 0) + 1);
  }

  const newStatuses = targetWords.map((tWord) => {
    const tClean = tWord.toLowerCase().replace(/[.,!?;:'"()&\-_—]/g, '');
    const remaining = spokenWordCounts.get(tClean) ?? 0;
    if (remaining > 0) {
      spokenWordCounts.set(tClean, remaining - 1);
      return 'correct';
    }
    return markFinal ? 'incorrect' : 'pending';
  });

  const correctCount = newStatuses.filter(s => s === 'correct').length;
  const newScore = Math.round((correctCount / targetWords.length) * 100);

  return { wordStatuses: newStatuses, score: newScore };
}

// --- Hook ---

export const useInfiniteSpeaking = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const hintTimersRef = useRef<Map<number, number>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    const hintTimers = hintTimersRef.current;
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      hintTimers.forEach(t => clearTimeout(t));
    };
  }, []);

  const currentSentenceGroup = useMemo(() => {
    if (state.sentences.length === 0 || state.sentenceGroups.length === 0) return null;
    const group = state.sentenceGroups[state.currentGroupIndex];
    if (!group || group.length === 0) return null;
    const groupSentences = group.map(idx => state.sentences[idx]).filter(Boolean);
    if (groupSentences.length === 0) return null;
    return {
      sentences: groupSentences,
      combinedEnglish: groupSentences.map(s => s.english).join(' '),
      combinedKorean: groupSentences.map(s => s.comprehension).join(' '),
      ids: groupSentences.map(s => s.id),
    };
  }, [state.sentences, state.sentenceGroups, state.currentGroupIndex]);

  // Keep currentSentence for backward compat (first sentence in group)
  const currentSentence = useMemo(() => {
    return currentSentenceGroup?.sentences[0] ?? null;
  }, [currentSentenceGroup]);

  const currentKeyIndices = useMemo(() => {
    if (!currentSentenceGroup) return [];
    // Merge key indices from all sentences in group, adjusting offsets
    const merged: number[] = [];
    let offset = 0;
    for (const s of currentSentenceGroup.sentences) {
      const indices = state.keyIndicesMap[s.id] ?? [];
      for (const idx of indices) {
        merged.push(idx + offset);
      }
      offset += s.english.split(' ').length;
    }
    return merged;
  }, [currentSentenceGroup, state.keyIndicesMap]);

  const startSession = useCallback((sentences: SentenceData[]) => {
    dispatch({ type: 'START_SESSION', sentences });
  }, []);

  const startListening = useCallback(() => {
    dispatch({ type: 'START_LISTENING' });
  }, []);

  const startSpeaking = useCallback(() => {
    dispatch({ type: 'START_SPEAKING' });
  }, []);

  const updateSpeech = useCallback((transcript: string, wordStatuses: string[], score: number) => {
    dispatch({ type: 'UPDATE_SPEECH', transcript, wordStatuses, score });
  }, []);

  const finishSpeaking = useCallback(() => {
    dispatch({ type: 'FINISH_SPEAKING' });
  }, []);

  const retrySpeaking = useCallback(() => {
    dispatch({ type: 'RETRY_SPEAKING' });
  }, []);

  const nextSentence = useCallback(() => {
    dispatch({ type: 'NEXT_SENTENCE' });
  }, []);

  const nextRound = useCallback(() => {
    dispatch({ type: 'NEXT_ROUND' });
  }, []);

  const toggleHandsFree = useCallback(() => {
    dispatch({ type: 'TOGGLE_HANDS_FREE' });
  }, []);

  const addHint = useCallback((message: string) => {
    dispatch({ type: 'ADD_HINT', message });
  }, []);

  const dismissHint = useCallback((id: number) => {
    dispatch({ type: 'DISMISS_HINT', id });
  }, []);

  const reset = useCallback(() => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    dispatch({ type: 'RESET' });
  }, []);

  // Auto-advance for hands-free mode
  useEffect(() => {
    if (!state.handsFree) return;

    if (state.phase === 'COMPARISON') {
      const canRetry = state.score < 100 && state.retryCount < 3;
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        if (canRetry) {
          retrySpeaking();
        } else {
          nextSentence();
        }
      }, TIMEOUTS.AUTO_ADVANCE_MS);
      return () => {
        if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      };
    }

    if (state.phase === 'ROUND_COMPLETE') {
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        nextRound();
      }, TIMEOUTS.ROUND_COMPLETE_ADVANCE_MS);
      return () => {
        if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      };
    }
  }, [state.phase, state.handsFree, state.score, state.retryCount, nextSentence, nextRound, retrySpeaking]);

  // Auto-dismiss hints
  useEffect(() => {
    for (const hint of state.hints) {
      if (!hintTimersRef.current.has(hint.id)) {
        const timer = window.setTimeout(() => {
          dismissHint(hint.id);
          hintTimersRef.current.delete(hint.id);
        }, TIMEOUTS.HINT_DISMISS_MS);
        hintTimersRef.current.set(hint.id, timer);
      }
    }
  }, [state.hints, dismissHint]);

  const evaluateSpeech = useCallback(
    (spokenText: string, targetSentence: string, markFinal: boolean = false) =>
      evaluateSpeechLogic(spokenText, targetSentence, markFinal),
    []
  );

  return {
    state,
    currentSentence,
    currentSentenceGroup,
    currentKeyIndices,
    startSession,
    startListening,
    startSpeaking,
    updateSpeech,
    finishSpeaking,
    retrySpeaking,
    nextSentence,
    nextRound,
    toggleHandsFree,
    addHint,
    dismissHint,
    reset,
    evaluateSpeech,
  };
};
