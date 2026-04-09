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

  // Separate prompt vs script rows
  const { promptRow, scriptRows } = useMemo(() => {
    const promptRows = rows.filter(r => r.rowType === 'prompt');
    const scripts = rows.filter(r => r.rowType === 'script');
    // Fallback: if no prompt row, treat first script as the topic
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
  const [recordSecondsLeft, setRecordSecondsLeft] = useState(RECORD_SECONDS);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [studyIndex, setStudyIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [ttsError, setTtsError] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSavedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // THINK countdown
  useEffect(() => {
    if (phase !== 'THINK') return;
    setThinkSecondsLeft(THINK_SECONDS);
    timerRef.current = setInterval(() => {
      setThinkSecondsLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          setPhase('RECORD');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [phase, clearTimer]);

  // RECORD countdown + auto-stop
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
      const result = analyzeResponse(audioApi.transcript, scriptRows);
      setAnalysis(result);
      setPhase('COMPARE');
    }
  }, [phase, recordSecondsLeft, audioApi, scriptRows]);

  // STUDY: auto-play TTS for current script sentence
  useEffect(() => {
    if (phase !== 'STUDY' || scriptRows.length === 0) return;
    const row = scriptRows[studyIndex];
    if (!row) return;
    setTtsError(false);
    audioApi.play(row).catch(() => setTtsError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-run on studyIndex change
  }, [phase, studyIndex]);

  // Save result on COMPLETE
  useEffect(() => {
    if (phase === 'COMPLETE' && !hasSavedRef.current) {
      hasSavedRef.current = true;
      const score = analysis?.overlapPercent ?? undefined;
      progressApi.saveResult(score).catch(console.error);
    }
  }, [phase, analysis, progressApi]);

  // Actions
  const playPrompt = useCallback(() => {
    if (!promptRow) return;
    setTtsError(false);
    audioApi.play(promptRow).catch(() => setTtsError(true));
  }, [promptRow, audioApi]);

  const startThink = useCallback(() => {
    audioApi.stop();
    setPhase('THINK');
  }, [audioApi]);

  const startRecord = useCallback(() => {
    clearTimer();
    setPhase('RECORD');
    audioApi.startRecording().catch(console.error);
  }, [clearTimer, audioApi]);

  const stopRecord = useCallback(() => {
    clearTimer();
    audioApi.stopRecording();
    const result = analyzeResponse(audioApi.transcript, scriptRows);
    setAnalysis(result);
    setPhase('COMPARE');
  }, [clearTimer, audioApi, scriptRows]);

  const startStudy = useCallback(() => {
    setStudyIndex(0);
    setPhase('STUDY');
  }, []);

  const nextStudySentence = useCallback(() => {
    const next = studyIndex + 1;
    if (next >= scriptRows.length) {
      audioApi.stop();
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
    setRetryCount(c => c + 1);
    setAnalysis(null);
    audioApi.startRecording().catch(console.error);
    setPhase('RECORD');
  }, [audioApi]);

  const complete = useCallback(() => {
    setPhase('COMPLETE');
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    audioApi.stop();
    audioApi.stopRecording();
    setPhase('PROMPT');
    setThinkSecondsLeft(THINK_SECONDS);
    setRecordSecondsLeft(RECORD_SECONDS);
    setAnalysis(null);
    setStudyIndex(0);
    setRetryCount(0);
    setTtsError(false);
    hasSavedRef.current = false;
    sessionApi.reset();
  }, [clearTimer, audioApi, sessionApi]);

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
    recordSecondsLeft,
    studyIndex,
    analysis,
    retryCount,
    ttsError,
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
