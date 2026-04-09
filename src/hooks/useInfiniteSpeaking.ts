import { useReducer, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useTrainingData } from './training/useTrainingData';
import { useTrainingSession } from './training/useTrainingSession';
import { useTrainingProgress } from './training/useTrainingProgress';
import { filterRowsForMode, assignSpeakerVoices } from './training/dataAdapter';
import { useStreamingSpeechRecognition } from './useStreamingSpeechRecognition';
import { getTTSAudioUrl } from '../services/ttsService';
import { getKeyExpressionIndices } from '../utils/keyExpressions';
import { isMobileBrowser } from '../utils/platform';
import { TIMEOUTS, SPEAKER_COLOR_PALETTE } from '../constants/infiniteSpeaking';
import type { TrainingRow, VoiceKey } from './training/types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Kept for backward-compat with RoundComplete.tsx */
export type Round = 1 | 2 | 3 | 4;

export type ISSubPhase =
  | 'ROUND_INTRO'
  | 'R1_PLAYING'   // R1: sequential full-listen playback
  | 'LISTENING'    // R2: model audio plays before speaking
  | 'SPEAKING'     // user records their response
  | 'COMPARISON'   // scored result shown
  | 'ROUND_COMPLETE';

/**
 * R4 SPEC DEVIATION NOTE
 * The spec describes R4 as "전체 스크립트 연속 발화" (continuous utterance of the full script).
 * We implement R4 as per-row recording (same cadence as R3, but with full text visible).
 *
 * Reason: iOS SFSpeechRecognizer resets after ~60s of audio and Chrome/Safari Web Speech API
 * has a ~2-minute timeout. A 20-row set would exceed both limits in a single recording session,
 * causing silent failures on the primary platform with no recoverable error.
 *
 * Pedagogical trade-off: R4 remains a distinct skill from R3 because text visibility
 * removes the recall burden, letting students focus on fluency and pronunciation rather
 * than memory. "Continuous" refers to the uninterrupted flow between rows (no model audio
 * played between sentences), not a single long recording.
 *
 * Single-take continuous recording may be revisited as a Phase 4 enhancement.
 */

export interface Hint {
  id: number;
  message: string;
  timestamp: number;
}

export interface SpeakerStyle {
  name: string;
  colorClass: string;
  bgClass: string;
}

// ─── Sub-phase reducer ────────────────────────────────────────────────────────

interface ISState {
  subPhase: ISSubPhase;
  handsFree: boolean;
  wordStatuses: string[];
  transcript: string;
  score: number;
  retryCount: number;
  hints: Hint[];
  hintIdCounter: number;
}

type ISAction =
  | { type: 'SET_SUB_PHASE'; subPhase: ISSubPhase }
  | { type: 'START_SPEAKING'; wordCount: number }
  | { type: 'UPDATE_SPEECH'; transcript: string; wordStatuses: string[]; score: number }
  | { type: 'RETRY_SPEAKING'; wordCount: number }
  | { type: 'TOGGLE_HANDS_FREE' }
  | { type: 'ADD_HINT'; message: string }
  | { type: 'DISMISS_HINT'; id: number }
  | { type: 'RESET_ROW' }
  | { type: 'RESET' };

export const initialISState: ISState = {
  subPhase: 'ROUND_INTRO',
  handsFree: false,
  wordStatuses: [],
  transcript: '',
  score: 0,
  retryCount: 0,
  hints: [],
  hintIdCounter: 0,
};

export function isReducer(state: ISState, action: ISAction): ISState {
  switch (action.type) {
    case 'SET_SUB_PHASE':
      return { ...state, subPhase: action.subPhase };

    case 'START_SPEAKING':
      return {
        ...state,
        subPhase: 'SPEAKING',
        wordStatuses: new Array(action.wordCount).fill('pending'),
        transcript: '',
        score: 0,
      };

    case 'UPDATE_SPEECH':
      return {
        ...state,
        transcript: action.transcript,
        wordStatuses: action.wordStatuses,
        score: action.score,
      };

    case 'RETRY_SPEAKING': {
      return {
        ...state,
        subPhase: 'SPEAKING',
        wordStatuses: new Array(action.wordCount).fill('pending'),
        transcript: '',
        score: 0,
        retryCount: state.retryCount + 1,
        hints: [],
      };
    }

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
      return { ...state, hints: state.hints.filter(h => h.id !== action.id) };

    case 'RESET_ROW':
      return {
        ...state,
        wordStatuses: [],
        transcript: '',
        score: 0,
        retryCount: 0,
        hints: [],
      };

    case 'RESET':
      return { ...initialISState, handsFree: state.handsFree };

    default:
      return state;
  }
}

// ─── Speech evaluation (pure, exported for testing) ───────────────────────────

export function evaluateSpeechLogic(
  spokenText: string,
  targetSentence: string,
  markFinal = false,
): { wordStatuses: string[]; score: number } {
  const targetWords = targetSentence.split(' ');
  const spokenClean = spokenText
    .toLowerCase()
    .replace(/[.,!?;:'"()&\-_—]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  const spokenCounts = new Map<string, number>();
  for (const w of spokenClean) {
    spokenCounts.set(w, (spokenCounts.get(w) ?? 0) + 1);
  }

  const newStatuses = targetWords.map(tWord => {
    const clean = tWord.toLowerCase().replace(/[.,!?;:'"()&\-_—]/g, '');
    // Auto-pass words that become empty after stripping punctuation/special chars
    if (clean === '') return 'correct';
    const remaining = spokenCounts.get(clean) ?? 0;
    if (remaining > 0) {
      spokenCounts.set(clean, remaining - 1);
      return 'correct';
    }
    return markFinal ? 'incorrect' : 'pending';
  });

  const correct = newStatuses.filter(s => s === 'correct').length;
  return {
    wordStatuses: newStatuses,
    score: Math.round((correct / targetWords.length) * 100),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInfiniteSpeaking(setId: string) {
  // ── Core hooks ──────────────────────────────────────────────────────────────
  const { rows: allRows, speakers, isLoading, error } = useTrainingData(setId);

  const sessionApi = useTrainingSession({
    setId,
    mode: 'infiniteSpeaking',
    allRows,
    options: { totalRounds: 4 },
  });
  const { session, currentRow, next: sessionNext, nextRound: sessionNextRound, goTo: sessionGoTo, reset: sessionReset } = sessionApi;

  const progressApi = useTrainingProgress(session);

  // ── Derived data ────────────────────────────────────────────────────────────
  const promptRow = useMemo(
    () => allRows.find(r => r.rowType === 'prompt') ?? null,
    [allRows],
  );

  const scriptRows = useMemo(
    () => filterRowsForMode(allRows, 'infiniteSpeaking'),
    [allRows],
  );

  const speakerVoiceMap = useMemo(
    () => assignSpeakerVoices(speakers),
    [speakers],
  );

  const speakerStyleMap = useMemo<Record<string, SpeakerStyle>>(() => {
    const map: Record<string, SpeakerStyle> = {};
    speakers.forEach((speaker, i) => {
      const palette = SPEAKER_COLOR_PALETTE[i % SPEAKER_COLOR_PALETTE.length];
      map[speaker] = { name: speaker, ...palette };
    });
    return map;
  }, [speakers]);

  // ── Sub-phase state ─────────────────────────────────────────────────────────
  const [state, dispatch] = useReducer(isReducer, initialISState);

  // ── R1 state ────────────────────────────────────────────────────────────────
  const [r1PlayingIndex, setR1PlayingIndex] = useState(-1);
  const [r1IsPaused, setR1IsPaused] = useState(false);
  const r1AbortRef = useRef(false);
  const r1PausedRef = useRef(false);
  const r1AudioRef = useRef<HTMLAudioElement | null>(null);

  // ── Listening (R2) audio ────────────────────────────────────────────────────
  const listeningAudioRef = useRef<HTMLAudioElement | null>(null);
  const [ttsError, setTtsError] = useState(false);

  // ── Speaking state ──────────────────────────────────────────────────────────
  const [needsMicGesture, setNeedsMicGesture] = useState(false);
  const isMobileBrowserRef = useRef(isMobileBrowser());
  const speakingTimeoutRef = useRef<number | null>(null);
  const hintDebounceRef = useRef<number | null>(null);
  const hintTimersRef = useRef<Map<number, number>>(new Map());
  const autoAdvanceTimerRef = useRef<number | null>(null);

  // ── Progress tracking ───────────────────────────────────────────────────────
  const hasSavedResultRef = useRef(false);
  const savedRoundRef = useRef(0);

  // ── Stable refs for use inside callbacks/effects ────────────────────────────
  const subPhaseRef = useRef(state.subPhase);
  useEffect(() => { subPhaseRef.current = state.subPhase; }, [state.subPhase]);

  const handsFreeRef = useRef(state.handsFree);
  useEffect(() => { handsFreeRef.current = state.handsFree; }, [state.handsFree]);

  const currentRowRef = useRef(currentRow);
  useEffect(() => { currentRowRef.current = currentRow; }, [currentRow]);

  const scriptRowsRef = useRef(scriptRows);
  useEffect(() => { scriptRowsRef.current = scriptRows; }, [scriptRows]);

  const promptRowRef = useRef(promptRow);
  useEffect(() => { promptRowRef.current = promptRow; }, [promptRow]);

  const speakerVoiceMapRef = useRef(speakerVoiceMap);
  useEffect(() => { speakerVoiceMapRef.current = speakerVoiceMap; }, [speakerVoiceMap]);

  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  // ── Helper: play a row via its speaker-mapped voice ──────────────────────────
  const playRowAudio = useCallback(
    (row: TrainingRow, audioRef: { current: HTMLAudioElement | null }): Promise<void> => {
      const voice: VoiceKey =
        row.speaker && speakerVoiceMapRef.current[row.speaker]
          ? (speakerVoiceMapRef.current[row.speaker] as VoiceKey)
          : 'female1';

      return getTTSAudioUrl(row.english, voice).then(url => {
        return new Promise<void>((resolve, reject) => {
          if (audioRef.current) audioRef.current.pause();
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error('TTS audio error'));
          audio.play().catch(reject);
        });
      });
    },
    [],
  );

  // ── Speech recognition ───────────────────────────────────────────────────────
  const speechRef = useRef<ReturnType<typeof useStreamingSpeechRecognition> | null>(null);

  const handleTranscriptUpdate = useCallback((transcript: string, isFinal: boolean) => {
    if (subPhaseRef.current !== 'SPEAKING' || !currentRowRef.current) return;

    const result = evaluateSpeechLogic(transcript, currentRowRef.current.english, isFinal);
    dispatch({ type: 'UPDATE_SPEECH', transcript, wordStatuses: result.wordStatuses, score: result.score });

    if (result.score === 100) {
      speechRef.current?.stopRecording();
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
      dispatch({ type: 'SET_SUB_PHASE', subPhase: 'COMPARISON' });
      return;
    }

    if (hintDebounceRef.current) clearTimeout(hintDebounceRef.current);
    hintDebounceRef.current = window.setTimeout(() => {
      if (!currentRowRef.current) return;
      const words = currentRowRef.current.english.split(' ');
      const keyIndices = getKeyExpressionIndices(currentRowRef.current.english);
      for (const idx of keyIndices) {
        if (result.wordStatuses[idx] === 'pending' && transcript.split(/\s+/).length > idx) {
          dispatch({ type: 'ADD_HINT', message: `"${words[idx]}" 을 발음해보세요` });
          break;
        }
      }
    }, TIMEOUTS.HINT_DEBOUNCE_MS);
  }, []); // stable — uses only refs

  const speech = useStreamingSpeechRecognition({ onTranscriptUpdate: handleTranscriptUpdate });
  useEffect(() => { speechRef.current = speech; }, [speech]);

  // ── R1: Sequential playback loop ─────────────────────────────────────────────
  useEffect(() => {
    if (state.subPhase !== 'R1_PLAYING') return;

    r1AbortRef.current = false;
    r1PausedRef.current = false;
    setR1IsPaused(false);
    setR1PlayingIndex(0);

    const rows: TrainingRow[] = promptRowRef.current
      ? [promptRowRef.current, ...scriptRowsRef.current]
      : scriptRowsRef.current;

    const run = async () => {
      for (let i = 0; i < rows.length; i++) {
        if (r1AbortRef.current) return;

        // Pause gate: busy-wait if paused
        while (r1PausedRef.current && !r1AbortRef.current) {
          await new Promise(r => setTimeout(r, 150));
        }
        if (r1AbortRef.current) return;

        setR1PlayingIndex(i);

        try {
          await playRowAudio(rows[i], r1AudioRef);
        } catch {
          // TTS failed for this row — skip silently, continue sequence
          if (r1AbortRef.current) return;
          await new Promise(r => setTimeout(r, 300)); // brief pause before next
        }

        if (r1AbortRef.current) return;
      }

      // All rows played
      dispatch({ type: 'SET_SUB_PHASE', subPhase: 'ROUND_COMPLETE' });
    };

    run();

    return () => {
      r1AbortRef.current = true;
      if (r1AudioRef.current) {
        r1AudioRef.current.pause();
        r1AudioRef.current = null;
      }
    };
  }, [state.subPhase, playRowAudio]);

  // ── R2: LISTENING — play model then auto-transition to SPEAKING ───────────────
  useEffect(() => {
    if (state.subPhase !== 'LISTENING' || session.round !== 2 || !currentRow) return;

    let cancelled = false;
    setTtsError(false);

    const run = async () => {
      try {
        await playRowAudio(currentRow, listeningAudioRef);
        if (!cancelled) {
          dispatch({ type: 'SET_SUB_PHASE', subPhase: 'SPEAKING' });
        }
      } catch {
        if (!cancelled) setTtsError(true);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (listeningAudioRef.current) {
        listeningAudioRef.current.pause();
        listeningAudioRef.current = null;
      }
    };
  }, [state.subPhase, session.round, currentRow, playRowAudio]);

  // ── SPEAKING: start recording (with mobile gate) ─────────────────────────────
  useEffect(() => {
    if (state.subPhase !== 'SPEAKING') {
      setNeedsMicGesture(false);
      return;
    }
    if (!currentRowRef.current) return;

    const wordCount = currentRowRef.current.english.split(' ').length;
    dispatch({ type: 'START_SPEAKING', wordCount });

    // On mobile: require a user gesture to start the microphone.
    // Exception: when hands-free is active the user has already opted into auto-advance,
    // so we start recording immediately to avoid a stuck state (hands-free auto-advances
    // from COMPARISON → SPEAKING but would wait forever for a mic-gesture tap).
    if (isMobileBrowserRef.current && !handsFreeRef.current) {
      setNeedsMicGesture(true);
      return;
    }

    speech.startRecording();

    speakingTimeoutRef.current = window.setTimeout(() => {
      speech.stopRecording();
      if (currentRowRef.current) {
        const result = evaluateSpeechLogic(speechRef.current?.transcript ?? '', currentRowRef.current.english, true);
        dispatch({ type: 'UPDATE_SPEECH', transcript: result.wordStatuses.join(' '), wordStatuses: result.wordStatuses, score: result.score });
      }
      dispatch({ type: 'SET_SUB_PHASE', subPhase: 'COMPARISON' });
    }, TIMEOUTS.SPEAKING_TIMEOUT_MS);

    return () => {
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    };
  }, [state.subPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hands-free auto-advance ───────────────────────────────────────────────────
  useEffect(() => {
    if (!state.handsFree) return;

    if (state.subPhase === 'COMPARISON') {
      const canRetry = state.score < 100 && state.retryCount < 3 && session.round !== 4;
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        if (canRetry) {
          retrySpeaking();
        } else {
          nextRow();
        }
      }, TIMEOUTS.AUTO_ADVANCE_MS);
      return () => { if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current); };
    }

    if (state.subPhase === 'ROUND_COMPLETE') {
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        nextRound();
      }, TIMEOUTS.ROUND_COMPLETE_ADVANCE_MS);
      return () => { if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current); };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.subPhase, state.handsFree, state.score, state.retryCount, session.round]);

  // ── Hints auto-dismiss ───────────────────────────────────────────────────────
  useEffect(() => {
    for (const hint of state.hints) {
      if (!hintTimersRef.current.has(hint.id)) {
        const timer = window.setTimeout(() => {
          dispatch({ type: 'DISMISS_HINT', id: hint.id });
          hintTimersRef.current.delete(hint.id);
        }, TIMEOUTS.HINT_DISMISS_MS);
        hintTimersRef.current.set(hint.id, timer);
      }
    }
  }, [state.hints]);

  // ── Save progress at round boundaries ────────────────────────────────────────
  useEffect(() => {
    if (state.subPhase === 'ROUND_COMPLETE' && session.round > savedRoundRef.current) {
      savedRoundRef.current = session.round;
      progressApi.saveProgress();
    }
  }, [state.subPhase, session.round, progressApi]);

  // ── Save result when session completes ───────────────────────────────────────
  useEffect(() => {
    if (session.phase === 'complete' && !hasSavedResultRef.current) {
      hasSavedResultRef.current = true;
      progressApi.saveResult();
    }
  }, [session.phase, progressApi]);

  // ── Save progress on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (session.phase === 'active') {
        progressApi.saveProgress();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Global cleanup ───────────────────────────────────────────────────────────
  useEffect(() => {
    const hintTimers = hintTimersRef.current;
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
      if (hintDebounceRef.current) clearTimeout(hintDebounceRef.current);
      hintTimers.forEach(t => clearTimeout(t));
      if (r1AudioRef.current) r1AudioRef.current.pause();
      if (listeningAudioRef.current) listeningAudioRef.current.pause();
    };
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const startRound = useCallback(() => {
    setTtsError(false);
    if (sessionRef.current.round === 1) {
      dispatch({ type: 'SET_SUB_PHASE', subPhase: 'R1_PLAYING' });
    } else {
      sessionGoTo(0);
      dispatch({ type: 'RESET_ROW' });
      const nextSubPhase = sessionRef.current.round === 2 ? 'LISTENING' : 'SPEAKING';
      dispatch({ type: 'SET_SUB_PHASE', subPhase: nextSubPhase });
    }
  }, [sessionGoTo]);

  const nextRow = useCallback(() => {
    const isLast = sessionRef.current.currentIndex >= scriptRowsRef.current.length - 1;
    if (isLast) {
      dispatch({ type: 'SET_SUB_PHASE', subPhase: 'ROUND_COMPLETE' });
      return;
    }
    sessionNext();
    dispatch({ type: 'RESET_ROW' });
    const nextSubPhase = sessionRef.current.round === 2 ? 'LISTENING' : 'SPEAKING';
    dispatch({ type: 'SET_SUB_PHASE', subPhase: nextSubPhase });
  }, [sessionNext]);

  const nextRound = useCallback(() => {
    const isLast = sessionRef.current.round >= sessionRef.current.totalRounds;
    sessionNextRound();
    dispatch({ type: 'RESET_ROW' });
    if (!isLast) {
      dispatch({ type: 'SET_SUB_PHASE', subPhase: 'ROUND_INTRO' });
    }
    savedRoundRef.current = 0;
  }, [sessionNextRound]);

  const finishSpeaking = useCallback(() => {
    speech.stopRecording();
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    if (currentRowRef.current) {
      const result = evaluateSpeechLogic(speechRef.current?.transcript ?? '', currentRowRef.current.english, true);
      dispatch({ type: 'UPDATE_SPEECH', transcript: speechRef.current?.transcript ?? '', wordStatuses: result.wordStatuses, score: result.score });
    }
    dispatch({ type: 'SET_SUB_PHASE', subPhase: 'COMPARISON' });
  }, [speech]);

  const retrySpeaking = useCallback(() => {
    if (!currentRowRef.current) return;
    const wordCount = currentRowRef.current.english.split(' ').length;
    dispatch({ type: 'RETRY_SPEAKING', wordCount });
  }, []);

  const toggleHandsFree = useCallback(() => {
    dispatch({ type: 'TOGGLE_HANDS_FREE' });
  }, []);

  const toggleR1Pause = useCallback(() => {
    r1PausedRef.current = !r1PausedRef.current;
    setR1IsPaused(r1PausedRef.current);
    if (r1PausedRef.current && r1AudioRef.current) {
      r1AudioRef.current.pause();
    } else if (!r1PausedRef.current && r1AudioRef.current) {
      r1AudioRef.current.play().catch(console.error);
    }
  }, []);

  const addHint = useCallback((message: string) => {
    dispatch({ type: 'ADD_HINT', message });
  }, []);

  const dismissHint = useCallback((id: number) => {
    dispatch({ type: 'DISMISS_HINT', id });
  }, []);

  const handleTtsRetry = useCallback(() => {
    setTtsError(false);
    // Re-trigger LISTENING effect by momentarily resetting sub-phase
    dispatch({ type: 'SET_SUB_PHASE', subPhase: 'ROUND_INTRO' });
    setTimeout(() => dispatch({ type: 'SET_SUB_PHASE', subPhase: 'LISTENING' }), 50);
  }, []);

  const handleTtsSkip = useCallback(() => {
    setTtsError(false);
    dispatch({ type: 'SET_SUB_PHASE', subPhase: 'SPEAKING' });
  }, []);

  const handleMobileMicStart = useCallback(() => {
    setNeedsMicGesture(false);
    speech.startRecording();
    speakingTimeoutRef.current = window.setTimeout(() => {
      speech.stopRecording();
      if (currentRowRef.current) {
        const result = evaluateSpeechLogic(speechRef.current?.transcript ?? '', currentRowRef.current.english, true);
        dispatch({ type: 'UPDATE_SPEECH', transcript: speechRef.current?.transcript ?? '', wordStatuses: result.wordStatuses, score: result.score });
      }
      dispatch({ type: 'SET_SUB_PHASE', subPhase: 'COMPARISON' });
    }, TIMEOUTS.SPEAKING_TIMEOUT_MS);
  }, [speech]);

  const handleManualStopSpeaking = useCallback(() => {
    speech.stopRecording();
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    if (currentRowRef.current) {
      const result = evaluateSpeechLogic(speech.transcript, currentRowRef.current.english, true);
      dispatch({ type: 'UPDATE_SPEECH', transcript: speech.transcript, wordStatuses: result.wordStatuses, score: result.score });
    }
    dispatch({ type: 'SET_SUB_PHASE', subPhase: 'COMPARISON' });
  }, [speech]);

  const handlePlayModelForComparison = useCallback(async () => {
    if (!currentRowRef.current) return;
    try {
      const voice: VoiceKey =
        currentRowRef.current.speaker && speakerVoiceMapRef.current[currentRowRef.current.speaker]
          ? (speakerVoiceMapRef.current[currentRowRef.current.speaker] as VoiceKey)
          : 'female1';
      const url = await getTTSAudioUrl(currentRowRef.current.english, voice);
      const audio = new Audio(url);
      audio.play().catch(console.error);
    } catch {
      // ignore
    }
  }, []);

  const reset = useCallback(() => {
    r1AbortRef.current = true;
    if (r1AudioRef.current) { r1AudioRef.current.pause(); r1AudioRef.current = null; }
    if (listeningAudioRef.current) { listeningAudioRef.current.pause(); listeningAudioRef.current = null; }
    speech.stopRecording();
    dispatch({ type: 'RESET' });
    sessionReset();
    hasSavedResultRef.current = false;
    savedRoundRef.current = 0;
  }, [speech, sessionReset]);

  // ── Return ───────────────────────────────────────────────────────────────────
  return {
    // Data / loading
    isLoading,
    error,
    promptRow,
    scriptRows,
    currentRow,
    speakerStyleMap,
    r1PlayingIndex,
    r1IsPaused,

    // Session
    session,

    // Sub-phase state
    subPhase: state.subPhase,
    handsFree: state.handsFree,
    wordStatuses: state.wordStatuses,
    transcript: state.transcript,
    score: state.score,
    retryCount: state.retryCount,
    hints: state.hints,
    ttsError,
    needsMicGesture,

    // Speech (pass through for error display)
    speech,

    // Actions
    startRound,
    finishSpeaking,
    retrySpeaking,
    nextRow,
    nextRound,
    toggleHandsFree,
    toggleR1Pause,
    addHint,
    dismissHint,
    handleTtsRetry,
    handleTtsSkip,
    handleMobileMicStart,
    handleManualStopSpeaking,
    handlePlayModelForComparison,
    reset,
    evaluateSpeech: evaluateSpeechLogic,
  };
}
