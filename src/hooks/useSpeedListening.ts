import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { LearningLevel } from '../types';
import type { TrainingRow } from './training/types';
import { useTrainingData } from './training/useTrainingData';
import { useTrainingSession } from './training/useTrainingSession';
import { useTrainingAudio } from './training/useTrainingAudio';
import { useTrainingProgress } from './training/useTrainingProgress';
import { BLANK_MULTIPLIER } from '../constants';
import {
  cleanWord,
  hasSpecialChars,
  isAcronym,
  breakConsecutiveRuns,
} from '../utils/textProcessing';

// Re-export cleanWord so components can import it from one place
export { cleanWord } from '../utils/textProcessing';

export type SpeedListeningPhase = 'listening' | 'quiz' | 'result';

export interface QuizScore {
  blanksTotal: number;
  blanksCorrect: number;
  score: number; // 0–100
}

// Exported for tests
export function generateBlankIndicesForRows(
  rows: TrainingRow[],
  level: LearningLevel,
): Record<number, Set<number>> {
  const effectiveLevel = Math.max(1, level);
  const map: Record<number, Set<number>> = {};

  rows.forEach(row => {
    const words = row.english.split(' ');

    // Single-word rows: nothing meaningful to blank without fully revealing the sentence
    if (words.length <= 1) {
      map[row.id] = new Set();
      return;
    }

    const eligibleIndices = words
      .map((_, i) => i)
      .filter(i => !hasSpecialChars(words[i]))
      .filter(i => !isAcronym(words[i])); // only skip true acronyms (BBC, USA, NATO)
    // Note: we intentionally do NOT try to detect proper nouns by capitalisation.
    // A naive "uppercase + not first word" heuristic breaks on multi-sentence rows
    // (e.g. "We went to Paris. France is beautiful." — "France" starts a new sentence).

    if (eligibleIndices.length === 0) {
      map[row.id] = new Set();
      return;
    }

    // Fisher-Yates shuffle
    for (let i = eligibleIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligibleIndices[i], eligibleIndices[j]] = [eligibleIndices[j], eligibleIndices[i]];
    }

    const numBlanks = Math.max(
      1,
      Math.floor(words.length * (effectiveLevel * BLANK_MULTIPLIER)),
    );
    const selected = eligibleIndices.slice(0, Math.min(numBlanks, eligibleIndices.length));
    const cleaned = breakConsecutiveRuns(selected, 3);
    map[row.id] = new Set(cleaned);
  });

  return map;
}

function getBlankKey(rowId: number, wordIndex: number): string {
  return `${rowId}-${wordIndex}`;
}

export function useSpeedListening(config: {
  setId: string;
  level: LearningLevel;
  sentences?: Array<{ id: number; english: string; korean: string }>;
}) {
  const { setId, level, sentences: preloaded } = config;

  // 1. Data layer — use preloaded sentences if available, else fetch from training data
  const { rows: fetchedRows, speakers: fetchedSpeakers, isLoading: fetchLoading } = useTrainingData(
    preloaded ? undefined : setId,
  );

  // Convert preloaded SpeedListeningSentences to TrainingRow format
  const preloadedRows: TrainingRow[] = useMemo(() => {
    if (!preloaded) return [];
    return preloaded.map((s, index): TrainingRow => ({
      id: s.id,
      english: s.english,
      koreanPronounce: '',
      directComprehension: '',
      comprehension: s.korean,
      rowType: 'script',
      rowSeq: index,
      speaker: '',
      note: '',
    }));
  }, [preloaded]);

  const allRows = preloaded ? preloadedRows : fetchedRows;
  const speakers = preloaded ? [] as string[] : fetchedSpeakers;
  const isLoading = preloaded ? false : fetchLoading;

  // 2. Session management — filters to script + reading rows via filterRowsForMode
  const sessionApi = useTrainingSession({
    setId,
    mode: 'speedListening',
    allRows,
  });

  // 3. Audio — speaker-aware TTS; voice assignment is deterministic (index-based rotation)
  //    so the same speaker always gets the same voice across sessions for the same set
  const audioApi = useTrainingAudio({ speakers });

  // 4. Progress tracking
  const progressApi = useTrainingProgress(sessionApi.session);

  const { rows } = sessionApi;

  // Local UI phase (separate from SessionPhase)
  const [phase, setLocalPhase] = useState<SpeedListeningPhase>('listening');
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(-1);
  const [blanks, setBlanks] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<QuizScore | null>(null);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

  // C1 fix: Reset all local state when setId changes (e.g. "다음 세트" navigation)
  const prevSetIdRef = useRef(setId);
  useEffect(() => {
    if (prevSetIdRef.current !== setId) {
      prevSetIdRef.current = setId;
      stopRef.current = true;
      audioApi.stop();
      setLocalPhase('listening');
      setCurrentPlayingIndex(-1);
      setBlanks({});
      setIsSubmitted(false);
      setScore(null);
      setHasPlayedOnce(false);
      sessionApi.reset();
    }
  }, [setId, audioApi, sessionApi]);

  // Kept for backward-compat — no longer used by playAll (uses waitForEnd instead)
  const isPlayingRef = useRef(false);
  useEffect(() => {
    isPlayingRef.current = audioApi.isPlaying;
  }, [audioApi.isPlaying]);

  const stopRef = useRef(false);

  // Keep latest progressApi in a ref for the unmount cleanup effect
  const progressApiRef = useRef(progressApi);
  progressApiRef.current = progressApi;

  // Keep latest session in a ref so the unmount cleanup can read current elapsed time
  const sessionRef = useRef(sessionApi.session);
  sessionRef.current = sessionApi.session;

  // Save progress on unmount (mandatory: prevents losing study time if student navigates away).
  // React 18 concurrent mode may delay cleanup, but this is the best available hook mechanism.
  // Only save if there was actually tracked time (session left setup phase).
  useEffect(() => {
    return () => {
      if (
        sessionRef.current.elapsedSeconds > 0 &&
        sessionRef.current.phase !== 'setup'
      ) {
        void progressApiRef.current.saveProgress();
      }
    };
  }, []); // intentionally empty — runs only on unmount

  // Generate blank positions once per set+level combination.
  // rowKey changes when the set changes (first row id changes), re-triggering generation.
  const rowKey = rows.map(r => r.id).join(',');
  const blankIndicesMap = useMemo(
    () => (rows.length > 0 ? generateBlankIndicesForRows(rows, level) : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowKey, level],
  );

  const isWordBlank = useCallback(
    (rowId: number, wordIndex: number): boolean =>
      blankIndicesMap[rowId]?.has(wordIndex) ?? false,
    [blankIndicesMap],
  );

  const getUserInput = useCallback(
    (rowId: number, wordIndex: number): string =>
      blanks[getBlankKey(rowId, wordIndex)] ?? '',
    [blanks],
  );

  const updateBlank = useCallback(
    (rowId: number, wordIndex: number, value: string): void => {
      setBlanks(prev => ({ ...prev, [getBlankKey(rowId, wordIndex)]: value }));
    },
    [],
  );

  // Sequence-level playing flag — stays true for the entire playAll loop (no per-sentence flicker)
  const [isSequencePlaying, setIsSequencePlaying] = useState(false);

  // Sequential playback with per-row index tracking.
  // Uses waitForEnd() (DOM audio events) instead of React state polling for reliability.
  const playAll = useCallback(async (): Promise<void> => {
    if (rows.length === 0) return;
    stopRef.current = false;
    setIsSequencePlaying(true);

    for (let i = 0; i < rows.length; i++) {
      if (stopRef.current) break;
      setCurrentPlayingIndex(i);

      try {
        await audioApi.play(rows[i]);
        if (stopRef.current) break;
        await audioApi.waitForEnd();
      } catch {
        // TTS failure: skip this row and continue
      }
    }

    setCurrentPlayingIndex(-1);
    setHasPlayedOnce(true);
    setIsSequencePlaying(false);
  }, [rows, audioApi]);

  const stop = useCallback((): void => {
    stopRef.current = true;
    audioApi.stop();
    setCurrentPlayingIndex(-1);
    setIsSequencePlaying(false);
  }, [audioApi]);

  // Per-sentence replay during quiz phase — interrupts any ongoing sequence
  const replaySingle = useCallback(
    async (row: TrainingRow): Promise<void> => {
      stopRef.current = true;
      audioApi.stop();
      await new Promise(r => setTimeout(r, 100));
      stopRef.current = false;
      try {
        await audioApi.play(row);
      } catch {
        // ignore single-sentence replay failures
      }
    },
    [audioApi],
  );

  const startQuiz = useCallback((): void => {
    stop();
    setLocalPhase('quiz');
    sessionApi.setPhase('active');
  }, [stop, sessionApi]);

  const calculateScore = useCallback((): QuizScore => {
    let blanksTotal = 0;
    let blanksCorrect = 0;

    rows.forEach(row => {
      const words = row.english.split(' ');
      words.forEach((word, wIndex) => {
        if (blankIndicesMap[row.id]?.has(wIndex)) {
          blanksTotal++;
          const userInput = blanks[getBlankKey(row.id, wIndex)] ?? '';
          const match = word.match(/^[.,?!;:"']*(.+?)[.,?!;:"']*$/);
          const actualWord = match?.[1] ?? word;
          if (cleanWord(userInput) === cleanWord(actualWord)) {
            blanksCorrect++;
          }
        }
      });
    });

    const computedScore =
      blanksTotal > 0 ? Math.round((blanksCorrect / blanksTotal) * 100) : 0;
    return { blanksTotal, blanksCorrect, score: computedScore };
  }, [rows, blankIndicesMap, blanks]);

  const submit = useCallback((): void => {
    const quizScore = calculateScore();
    setIsSubmitted(true);
    setScore(quizScore);
    setLocalPhase('result');
    sessionApi.complete();
    void progressApi.saveResult(quizScore.score);
    void progressApi.saveProgress();
  }, [calculateScore, sessionApi, progressApi]);

  const restart = useCallback((): void => {
    // Save progress BEFORE reset() — reset() zeroes elapsedSeconds
    void progressApi.saveProgress();
    stop();
    setBlanks({});
    setIsSubmitted(false);
    setScore(null);
    setHasPlayedOnce(false);
    setLocalPhase('listening');
    sessionApi.reset();
  }, [stop, sessionApi, progressApi]);

  return {
    // Data
    rows,
    isLoading,
    speakerVoiceMap: audioApi.speakerVoiceMap,

    // Phase
    phase,
    hasPlayedOnce,
    startQuiz,
    restart,

    // Audio (listening phase) — 1 concurrent TTS max, sequential
    isPlaying: isSequencePlaying || audioApi.isPlaying,
    isSequencePlaying,
    currentPlayingIndex,
    speed: audioApi.speed,
    setSpeed: audioApi.setSpeed,
    playAll,
    stop,
    replaySingle,

    // Quiz phase
    blankIndicesMap,
    isWordBlank,
    getUserInput,
    updateBlank,

    // Submission
    isSubmitted,
    score,
    submit,
  };
}
