import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { LearningLevel } from '../types';
import type { TrainingRow } from './training/types';
import { useTrainingData } from './training/useTrainingData';
import { useTrainingSession } from './training/useTrainingSession';
import { useTrainingAudio } from './training/useTrainingAudio';
import { useTrainingProgress } from './training/useTrainingProgress';
import { BLANK_MULTIPLIER } from '../constants';

export type SpeedListeningPhase = 'listening' | 'quiz' | 'result';

export interface QuizScore {
  blanksTotal: number;
  blanksCorrect: number;
  score: number; // 0–100
}

// Exported for use in components and tests
export const cleanWord = (word: string): string =>
  word.replace(/[.,?!;:"']/g, '').toLowerCase();

const hasSpecialChars = (word: string): boolean =>
  /[&_—/]/.test(word) || (word.includes('-') && word.length > 1);

const isLikelyProperNoun = (word: string, wordIndex: number): boolean =>
  wordIndex > 0 &&
  word.length > 0 &&
  word[0] !== word[0].toLowerCase();

const breakConsecutiveRuns = (indices: number[], maxConsecutive: number): number[] => {
  const sorted = [...indices].sort((a, b) => a - b);
  const result = new Set(sorted);
  let runStart = 0;
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === sorted[i - 1] + 1) continue;
    const runLength = i - runStart;
    if (runLength > maxConsecutive) {
      for (let j = runStart + maxConsecutive; j < i; j += maxConsecutive + 1) {
        result.delete(sorted[j]);
      }
    }
    runStart = i;
  }
  return [...result];
};

// Exported for testing
export function generateBlankIndicesForRows(
  rows: TrainingRow[],
  level: LearningLevel,
): Record<number, Set<number>> {
  const effectiveLevel = Math.max(1, level);
  const map: Record<number, Set<number>> = {};

  rows.forEach(row => {
    const words = row.english.split(' ');

    // Single-word sentences: 0 blanks (nothing to blank without full reveal)
    if (words.length <= 1) {
      map[row.id] = new Set();
      return;
    }

    const eligibleIndices = words
      .map((_, i) => i)
      .filter(i => !hasSpecialChars(words[i]))
      .filter(i => !isLikelyProperNoun(words[i], i));

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

export function useSpeedListening(config: { setId: string; level: LearningLevel }) {
  const { setId, level } = config;

  // 1. Data layer — fetches all rows; useTrainingSession will filter internally
  const { rows: allRows, speakers, isLoading } = useTrainingData(setId);

  // 2. Session management — filters to script + reading rows via filterRowsForMode
  const sessionApi = useTrainingSession({
    setId,
    mode: 'speedListening',
    allRows,
  });

  // 3. Audio — speaker-aware TTS voices; stable voice map (deterministic, index-based)
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

  // Sync isPlaying to ref so async playAll loop can poll it without stale closure issues
  const isPlayingRef = useRef(false);
  useEffect(() => {
    isPlayingRef.current = audioApi.isPlaying;
  }, [audioApi.isPlaying]);

  const stopRef = useRef(false);

  // Generate blank positions once per set+level. Stable voice assignment is guaranteed
  // because assignSpeakerVoices uses deterministic index-based rotation, not random.
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

  // Sequential playback with per-row index tracking.
  // TTS strategy: max 1 concurrent request, skip row on failure, poll isPlayingRef.
  const playAll = useCallback(async (): Promise<void> => {
    if (rows.length === 0) return;
    stopRef.current = false;

    for (let i = 0; i < rows.length; i++) {
      if (stopRef.current) break;
      setCurrentPlayingIndex(i);

      try {
        await audioApi.play(rows[i]);

        // Phase 1: wait for isPlaying to become true (audio started)
        const started = await new Promise<boolean>(resolve => {
          let attempts = 0;
          const check = (): void => {
            if (isPlayingRef.current) { resolve(true); return; }
            if (attempts++ > 20 || stopRef.current) { resolve(false); return; } // 1s timeout
            setTimeout(check, 50);
          };
          check();
        });
        if (!started) continue;

        // Phase 2: wait for isPlaying to become false (audio ended)
        await new Promise<void>(resolve => {
          const check = (): void => {
            if (!isPlayingRef.current || stopRef.current) { resolve(); return; }
            setTimeout(check, 100);
          };
          check();
        });
      } catch {
        // TTS failure: skip this row and continue the sequence
      }
    }

    setCurrentPlayingIndex(-1);
    setHasPlayedOnce(true);
  }, [rows, audioApi]);

  const stop = useCallback((): void => {
    stopRef.current = true;
    audioApi.stop();
    setCurrentPlayingIndex(-1);
  }, [audioApi]);

  // Per-sentence replay during quiz phase (answers devil's concern about re-listening)
  const replaySingle = useCallback(
    async (row: TrainingRow): Promise<void> => {
      stopRef.current = true; // interrupt any ongoing sequence
      audioApi.stop();
      await new Promise(r => setTimeout(r, 100));
      stopRef.current = false;
      try {
        await audioApi.play(row);
      } catch {
        // ignore replay failure
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
    // Fire-and-forget: save result and progress; ignore errors (e.g. unauthenticated)
    void progressApi.saveResult(quizScore.score);
    void progressApi.saveProgress();
  }, [calculateScore, sessionApi, progressApi]);

  const restart = useCallback((): void => {
    stop();
    setBlanks({});
    setIsSubmitted(false);
    setScore(null);
    setHasPlayedOnce(false);
    setLocalPhase('listening');
    sessionApi.reset();
  }, [stop, sessionApi]);

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

    // Audio (listening phase) — 1 concurrent TTS max
    isPlaying: audioApi.isPlaying,
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
