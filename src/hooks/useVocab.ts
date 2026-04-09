// src/hooks/useVocab.ts
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  useTrainingData,
  useTrainingAudio,
  useTrainingProgress,
} from './training';
import type { TrainingRow, TrainingSession } from './training';

export type VocabPhase = 'introduce' | 'context' | 'practice' | 'produce' | 'review';

export interface VocabItemResult {
  row: TrainingRow;
  practiceCorrect: boolean;
  produceHit: boolean;
  produceTranscript: string;
}

// --- Pure helper functions (exported for testing) ---

const HANGUL_REGEX = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;

export function filterVocabRows(rows: TrainingRow[]): TrainingRow[] {
  return rows.filter(r => {
    if (r.rowType !== 'vocab' && r.rowType !== 'expression') return false;
    // Skip rows where 'english' field contains Korean (Korean-Korean pair data error)
    if (HANGUL_REGEX.test(r.english)) return false;
    return true;
  });
}

export function findContextRows(allRows: TrainingRow[], expression: string): TrainingRow[] {
  // Use word-boundary regex to prevent partial-word false positives
  // e.g. "turn" must not match "return" or "turning"
  const escaped = expression.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return allRows.filter(
    r => (r.rowType === 'script' || r.rowType === 'reading') && regex.test(r.english),
  );
}

export function buildPracticeOptions(current: TrainingRow, others: TrainingRow[]): string[] {
  const distractors = [...others]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(r => r.english);
  return [current.english, ...distractors].sort(() => Math.random() - 0.5);
}

export function computeScore(results: VocabItemResult[]): number {
  if (results.length === 0) return 0;
  const correct =
    results.filter(r => r.practiceCorrect).length +
    results.filter(r => r.produceHit).length;
  return Math.round((correct / (results.length * 2)) * 100);
}

// Content-word matching for PRODUCE phase:
// Checks that all "meaningful" words of the expression appear somewhere in the transcript,
// allowing speech-recognition to drop filler words ("a", "the", etc.).
const STOP_WORDS = new Set(['a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'up']);

export function checkProduceHit(transcript: string, expression: string): boolean {
  const contentWords = expression
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
  if (contentWords.length === 0) return false;
  const t = transcript.toLowerCase();
  return contentWords.every(w => t.includes(w));
}

// --- Main hook ---

export function useVocab(setId: string) {
  const { rows, speakers, isLoading, error } = useTrainingData(setId);

  // Keep all rows; manually split for context lookup vs session vocab items
  const vocabRows = useMemo(() => filterVocabRows(rows), [rows]);

  const audioApi = useTrainingAudio({ speakers });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<VocabPhase>('introduce');
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<VocabItemResult[]>([]);
  const [pendingPracticeCorrect, setPendingPracticeCorrect] = useState(false);

  const startedAtRef = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const hasSavedRef = useRef(false);

  // M3 fix: Reset elapsed time when setId changes
  useEffect(() => {
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
  }, [setId]);

  // Elapsed time counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentRow: TrainingRow | null = vocabRows[currentIndex] ?? null;

  // Context rows: script/reading rows that contain the current expression
  const contextRows = useMemo(() => {
    if (!currentRow) return [];
    return findContextRows(rows, currentRow.english);
  }, [currentRow, rows]);

  // Practice multiple-choice options (stable per item via currentRow.id dep)
  const practiceOptions = useMemo(() => {
    if (!currentRow) return [];
    const others = vocabRows.filter(r => r.id !== currentRow.id);
    return buildPracticeOptions(currentRow, others);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRow?.id, vocabRows]);

  // Blank sentence for fill-in-the-blank (uses first context row if available)
  // Uses word-boundary regex to blank only exact phrase matches, not partial words.
  const blankSentence = useMemo(() => {
    if (!currentRow) return '';
    if (contextRows.length > 0) {
      const escaped = currentRow.english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return contextRows[0].english.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '___');
    }
    return `___ (${currentRow.comprehension})`;
  }, [currentRow, contextRows]);

  // Synthetic TrainingSession for useTrainingProgress compatibility
  const syntheticSession = useMemo<TrainingSession>(
    () => ({
      setId,
      mode: 'vocab',
      rows: vocabRows,
      currentIndex,
      round: 1,
      totalRounds: 1,
      phase: phase === 'review' ? 'complete' : 'active',
      startedAt: startedAtRef.current,
      elapsedSeconds,
      isPaused: false,
    }),
    [setId, vocabRows, currentIndex, phase, elapsedSeconds],
  );

  const { saveProgress, saveResult } = useTrainingProgress(syntheticSession);

  // Keep latest saveProgress in ref for unmount cleanup
  const saveProgressRef = useRef(saveProgress);
  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);

  // Save progress on unmount if session was not fully completed via saveResult
  useEffect(() => {
    return () => {
      if (!hasSavedRef.current) {
        saveProgressRef.current();
      }
    };
  }, []);

  const flipCard = useCallback(() => setIsFlipped(v => !v), []);

  const nextItem = useCallback(() => {
    if (currentIndex >= vocabRows.length - 1) {
      setPhase('review');
    } else {
      setCurrentIndex(i => i + 1);
      setIsFlipped(false);
      setPendingPracticeCorrect(false);
      setPhase('introduce');
    }
  }, [currentIndex, vocabRows.length]);

  const advancePhase = useCallback(() => {
    if (phase === 'introduce') setPhase('context');
    else if (phase === 'context') setPhase('practice');
    else if (phase === 'practice') setPhase('produce');
    else if (phase === 'produce') nextItem();
  }, [phase, nextItem]);

  // Returns whether the answer was correct
  const submitPractice = useCallback(
    (answer: string): boolean => {
      const correct = answer === currentRow?.english;
      setPendingPracticeCorrect(correct);
      return correct;
    },
    [currentRow],
  );

  // Returns whether expression content words were found in the transcript
  const submitProduce = useCallback(
    (transcript: string): boolean => {
      if (!currentRow) return false;
      const hit = checkProduceHit(transcript, currentRow.english);
      setResults(prev => [
        ...prev,
        {
          row: currentRow,
          practiceCorrect: pendingPracticeCorrect,
          produceHit: hit,
          produceTranscript: transcript,
        },
      ]);
      setPendingPracticeCorrect(false);
      return hit;
    },
    [currentRow, pendingPracticeCorrect],
  );

  // Call at review completion; guards against double-saving
  const completeSession = useCallback(
    async (score: number) => {
      if (hasSavedRef.current) return;
      hasSavedRef.current = true;
      await saveResult(score);
    },
    [saveResult],
  );

  const score = useMemo(() => computeScore(results), [results]);

  return {
    // Data & loading
    isLoading,
    error,
    vocabRows,
    contextRows,
    practiceOptions,
    blankSentence,
    // Session state
    currentRow,
    currentIndex,
    totalItems: vocabRows.length,
    phase,
    isFlipped,
    results,
    score,
    // Controls
    flipCard,
    advancePhase,
    submitPractice,
    submitProduce,
    completeSession,
    // Audio (spread from useTrainingAudio)
    ...audioApi,
  };
}
