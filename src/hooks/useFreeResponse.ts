import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  useTrainingData,
  useTrainingSession,
  useTrainingAudio,
  useTrainingProgress,
} from './training';
import type { TrainingRow } from './training';

export type FreeResponsePhase =
  | 'PROMPT'
  | 'THINK'
  | 'RECORD'
  | 'COMPARE'
  | 'STUDY'
  | 'RETRY'
  | 'COMPLETE';

export interface AnalysisResult {
  overlapPercent: number;
  keywordsMatched: string[];
  keywordsMissed: string[];
  userWords: Array<{ word: string; matched: boolean }>;
  modelWords: Array<{ word: string; found: boolean }>;
}

const THINK_SECONDS = 30;
const RECORD_SECONDS = 120;
const MIN_RECORD_SECONDS = 15;

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'i', 'am', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
  'them', 'my', 'your', 'his', 'its', 'our', 'their',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'as',
  'and', 'or', 'but', 'so', 'yet', 'nor', 'not',
  'that', 'this', 'these', 'those', 'what', 'which', 'who',
  'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'can',
  'could', 'should', 'may', 'might', 'shall', 'must',
  'also', 'just', 'very', 'more', 'most', 'much', 'many', 'some',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Analyzes user transcript against model answer rows.
 * Returns keyword overlap metrics (주요 어휘 일치율) based on token matching.
 * Note: "overlap" is bag-of-words token matching — not syntactic similarity.
 */
export function analyzeResponse(
  userTranscript: string,
  scriptRows: TrainingRow[],
): AnalysisResult {
  const modelText = scriptRows.map(r => r.english).join(' ');
  const modelTokens = tokenize(modelText);
  const userTokens = tokenize(userTranscript);

  const modelKeywords = [...new Set(modelTokens.filter(w => !STOP_WORDS.has(w)))];
  const userTokenSet = new Set(userTokens);

  const keywordsMatched = modelKeywords.filter(k => userTokenSet.has(k));
  const keywordsMissed = modelKeywords.filter(k => !userTokenSet.has(k));
  const matchedSet = new Set(keywordsMatched);

  const overlapPercent =
    modelKeywords.length === 0
      ? 0
      : Math.round((keywordsMatched.length / modelKeywords.length) * 100);

  const userWords = userTokens.map(word => ({
    word,
    matched: matchedSet.has(word),
  }));

  const modelWords = modelTokens.map(word => ({
    word,
    found: userTokenSet.has(word),
  }));

  return { overlapPercent, keywordsMatched, keywordsMissed, userWords, modelWords };
}

export function useFreeResponse(setId: string) {
  const { rows, speakers, isLoading, error } = useTrainingData(setId);

  // Separate prompt vs script rows.
  // Fallback: if no prompt row exists, use the first script row as the topic.
  const { promptRow, scriptRows } = useMemo(() => {
    const promptRows = rows.filter(r => r.rowType === 'prompt');
    const scripts = rows.filter(r => r.rowType === 'script');
    const prompt = promptRows[0] ?? scripts[0] ?? null;
    return { promptRow: prompt, scriptRows: scripts };
  }, [rows]);

  const sessionApi = useTrainingSession({
    setId,
    mode: 'freeResponse',
    allRows: rows,
  });

  const audioApi = useTrainingAudio({ speakers });
  const progressApi = useTrainingProgress(sessionApi.session);

  const [phase, setPhase] = useState<FreeResponsePhase>('PROMPT');
  const [thinkSecondsLeft, setThinkSecondsLeft] = useState(THINK_SECONDS);
  // true once the think countdown hits 0 — signals the CTA to start recording
  const [thinkExpired, setThinkExpired] = useState(false);
  const [recordSecondsLeft, setRecordSecondsLeft] = useState(RECORD_SECONDS);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [studyIndex, setStudyIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [ttsError, setTtsError] = useState(false);
  // true when the transcript was empty on submit
  const [transcriptMissing, setTranscriptMissing] = useState(false);
  // true when user stopped recording before MIN_RECORD_SECONDS
  const [shortRecordingWarning, setShortRecordingWarning] = useState(false);
  // true when mic permission was denied during THINK phase
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSavedResultRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // THINK countdown — when it expires, set thinkExpired flag.
  // Does NOT auto-transition to RECORD; student must confirm.
  useEffect(() => {
    if (phase !== 'THINK') return;
    setThinkSecondsLeft(THINK_SECONDS);
    setThinkExpired(false);
    timerRef.current = setInterval(() => {
      setThinkSecondsLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          setThinkExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [phase, clearTimer]);

  // RECORD countdown — when it expires, auto-stop recording
  useEffect(() => {
    if (phase !== 'RECORD') return;
    setRecordSecondsLeft(RECORD_SECONDS);
    timerRef.current = setInterval(() => {
      setRecordSecondsLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [phase, clearTimer]);

  // Auto-stop recording when countdown hits 0
  useEffect(() => {
    if (phase === 'RECORD' && recordSecondsLeft === 0 && audioApi.isRecording) {
      audioApi.stopRecording();
      const isEmpty = !audioApi.transcript.trim();
      setTranscriptMissing(isEmpty);
      const result = analyzeResponse(audioApi.transcript, scriptRows);
      setAnalysis(result);
      setPhase('COMPARE');
    }
  }, [phase, recordSecondsLeft, audioApi, scriptRows]);

  // STUDY: does NOT auto-play. Student taps "듣기" / "다시 듣기" to hear each sentence.
  // (Auto-play on mount can surprise users in quiet environments.)

  // Save result on COMPLETE (fire-and-forget)
  useEffect(() => {
    if (phase === 'COMPLETE' && !hasSavedResultRef.current) {
      hasSavedResultRef.current = true;
      const score = analysis?.overlapPercent ?? undefined;
      progressApi.saveResult(score).catch(console.error);
    }
  }, [phase, analysis, progressApi]);

  // Save progress on unmount — preserves elapsed time even if student exits early
  useEffect(() => {
    return () => {
      if (sessionApi.elapsed > 0) {
        progressApi.saveProgress().catch(console.error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only on unmount
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  // H3 fix: Clear TTS error on phase transitions
  useEffect(() => {
    setTtsError(false);
  }, [phase]);

  const playPrompt = useCallback(() => {
    if (!promptRow) return;
    setTtsError(false);
    audioApi.play(promptRow).catch(() => setTtsError(true));
  }, [promptRow, audioApi]);

  const startThink = useCallback(() => {
    audioApi.stop();
    setMicPermissionDenied(false);
    setPhase('THINK');
    // Pre-request mic permission so it's ready when recording starts
    audioApi.requestMicPermission().then(granted => {
      if (!granted) setMicPermissionDenied(true);
    }).catch(() => setMicPermissionDenied(true));
  }, [audioApi]);

  const startRecord = useCallback(() => {
    clearTimer();
    setShortRecordingWarning(false);
    setTranscriptMissing(false);
    setPhase('RECORD');
    audioApi.startRecording().catch(console.error);
  }, [clearTimer, audioApi]);

  const stopRecord = useCallback(() => {
    const elapsed = RECORD_SECONDS - recordSecondsLeft;
    if (elapsed < MIN_RECORD_SECONDS && !shortRecordingWarning) {
      // First tap under 15s: show warning but don't block — student can tap again to confirm
      setShortRecordingWarning(true);
      return;
    }
    clearTimer();
    audioApi.stopRecording();
    const isEmpty = !audioApi.transcript.trim();
    setTranscriptMissing(isEmpty);
    const result = analyzeResponse(audioApi.transcript, scriptRows);
    setAnalysis(result);
    setPhase('COMPARE');
  }, [clearTimer, audioApi, scriptRows, recordSecondsLeft, shortRecordingWarning]);

  const startStudy = useCallback(() => {
    setStudyIndex(0);
    setPhase('STUDY');
  }, []);

  const nextStudySentence = useCallback(() => {
    audioApi.stop();
    const next = studyIndex + 1;
    if (next >= scriptRows.length) {
      setPhase('RETRY');
    } else {
      setStudyIndex(next);
    }
  }, [studyIndex, scriptRows.length, audioApi]);

  const playCurrentStudySentence = useCallback(() => {
    const row = scriptRows[studyIndex];
    if (!row) return;
    setTtsError(false);
    audioApi.play(row).catch(() => setTtsError(true));
  }, [scriptRows, studyIndex, audioApi]);

  const retry = useCallback(() => {
    // Save progress before resetting elapsed time
    progressApi.saveProgress().catch(console.error);
    setRetryCount(c => c + 1);
    setAnalysis(null);
    setShortRecordingWarning(false);
    setTranscriptMissing(false);
    audioApi.startRecording().catch(console.error);
    setPhase('RECORD');
  }, [audioApi, progressApi]);

  const complete = useCallback(() => {
    setPhase('COMPLETE');
  }, []);

  const reset = useCallback(() => {
    // Save progress before zeroing elapsed time
    if (sessionApi.elapsed > 0) {
      progressApi.saveProgress().catch(console.error);
    }
    clearTimer();
    audioApi.stop();
    audioApi.stopRecording();
    setPhase('PROMPT');
    setThinkSecondsLeft(THINK_SECONDS);
    setThinkExpired(false);
    setRecordSecondsLeft(RECORD_SECONDS);
    setAnalysis(null);
    setStudyIndex(0);
    setRetryCount(0);
    setTtsError(false);
    setShortRecordingWarning(false);
    setTranscriptMissing(false);
    setMicPermissionDenied(false);
    hasSavedResultRef.current = false;
    sessionApi.reset();
  }, [clearTimer, audioApi, sessionApi, progressApi]);

  return {
    // Loading / error
    isLoading,
    error,
    // Data
    promptRow,
    scriptRows,
    hasContent: promptRow !== null || scriptRows.length > 0,
    // Phase state
    phase,
    thinkSecondsLeft,
    thinkExpired,
    recordSecondsLeft,
    studyIndex,
    analysis,
    retryCount,
    ttsError,
    transcriptMissing,
    shortRecordingWarning,
    micPermissionDenied,
    // Audio state
    isPlaying: audioApi.isPlaying,
    isRecording: audioApi.isRecording,
    userTranscript: audioApi.transcript,
    elapsedSeconds: sessionApi.elapsed,
    // Actions
    playPrompt,
    startThink,
    startRecord,
    stopRecord,
    startStudy,
    nextStudySentence,
    playCurrentStudySentence,
    retry,
    complete,
    reset,
  };
}
