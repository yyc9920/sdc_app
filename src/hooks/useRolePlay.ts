import { useReducer, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { getTTSAudioUrl } from '../services/ttsService';
import { evaluateSpeechLogic } from './useInfiniteSpeaking';
import {
  useTrainingData,
  useTrainingSession,
  useTrainingAudio,
  useTrainingProgress,
} from './training';
import type { TrainingRow } from './training';
import type { RolePlayPhase, TurnResult } from '../constants/rolePlay';
import { USER_TURN_TIMEOUT_MS, MS_PER_WORD, PARTNER_TTS_TIMEOUT_MS } from '../constants/rolePlay';

// ─── Pure utilities ───────────────────────────────────────────────────────────

function bagOverlapScore(spoken: string[], expected: string[]): number {
  if (expected.length === 0) return 0;
  const freq: Record<string, number> = {};
  for (const w of spoken) freq[w] = (freq[w] ?? 0) + 1;
  let matched = 0;
  for (const w of expected) {
    if (freq[w] && freq[w] > 0) { matched++; freq[w]--; }
  }
  return matched / expected.length;
}

function getBigrams(words: string[]): string[] {
  if (words.length < 2) return [];
  const result: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    result.push(`${words[i]} ${words[i + 1]}`);
  }
  return result;
}

/**
 * Compute similarity: 40% unigram bag-of-words + 60% bigram overlap.
 * Bigram component penalizes wrong word order (language-learning intent).
 * Returns 0–100. Both empty → 0.
 */
export function computeSimilarity(spoken: string, expected: string): number {
  const normalize = (s: string): string =>
    s.toLowerCase().replace(/[^\w\s]/g, '').trim();

  const spokenWords = normalize(spoken).split(/\s+/).filter(Boolean);
  const expectedWords = normalize(expected).split(/\s+/).filter(Boolean);

  if (expectedWords.length === 0 || spokenWords.length === 0) return 0;

  const unigramScore = bagOverlapScore(spokenWords, expectedWords);

  const spokenBigrams = getBigrams(spokenWords);
  const expectedBigrams = getBigrams(expectedWords);

  if (expectedBigrams.length === 0) {
    // Single-word expected: unigram only
    return Math.round(unigramScore * 100);
  }

  const bigramScore = bagOverlapScore(spokenBigrams, expectedBigrams);
  return Math.round((0.4 * unigramScore + 0.6 * bigramScore) * 100);
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export interface RolePlayState {
  rolePlayPhase: RolePlayPhase;
  selectedRole: string;
  currentTurnIndex: number;
  turnResults: TurnResult[];
  isAutoPlaying: boolean;
  isTTSPlaying: boolean;
  isDemoPaused: boolean;
  isPhaseComplete: boolean;
  skipAllPartnerTTS: boolean;
  liveTranscript: string;
  liveWordStatuses: string[];
}

type RolePlayAction =
  | { type: 'SET_ROLE'; role: string }
  | { type: 'START_DEMO' }
  | { type: 'INTRO_COMPLETE' }
  | { type: 'DEMO_COMPLETE'; rowCount: number }
  | { type: 'NEXT_TURN'; rowCount: number; currentPhase: RolePlayPhase }
  | { type: 'PROCEED_NEXT_PHASE' }
  | { type: 'SKIP_TO_REVIEW' }
  | { type: 'USER_TURN_COMPLETE'; transcript: string; score: number | null; rowIndex: number; speaker: string; expected: string }
  | { type: 'UPDATE_LIVE_TRANSCRIPT'; transcript: string }
  | { type: 'UPDATE_LIVE_WORD_STATUSES'; statuses: string[] }
  | { type: 'SET_AUTO_PLAYING'; value: boolean }
  | { type: 'SET_TTS_PLAYING'; value: boolean }
  | { type: 'SET_DEMO_PAUSED'; value: boolean }
  | { type: 'SET_SKIP_ALL_PARTNER_TTS' }
  | { type: 'RESET' };

const PHASE_PROGRESSION: Partial<Record<RolePlayPhase, RolePlayPhase>> = {
  GUIDED:   'PRACTICE',
  PRACTICE: 'FREE',
  FREE:     'REVIEW',
};

export const initialRolePlayState: RolePlayState = {
  rolePlayPhase: 'SETUP',
  selectedRole: '',
  currentTurnIndex: 0,
  turnResults: [],
  isAutoPlaying: false,
  isTTSPlaying: false,
  isDemoPaused: false,
  isPhaseComplete: false,
  skipAllPartnerTTS: false,
  liveTranscript: '',
  liveWordStatuses: [],
};

export function rolePlayReducer(state: RolePlayState, action: RolePlayAction): RolePlayState {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, selectedRole: action.role };

    case 'START_DEMO': {
      const skipIntro = localStorage.getItem('roleplay-skip-intro') === 'true';
      if (skipIntro) {
        return { ...state, rolePlayPhase: 'DEMO', isAutoPlaying: true };
      }
      return { ...state, rolePlayPhase: 'INTRO' };
    }

    case 'INTRO_COMPLETE':
      return { ...state, rolePlayPhase: 'DEMO', isAutoPlaying: true };

    case 'DEMO_COMPLETE':
      return {
        ...state,
        rolePlayPhase: 'GUIDED',
        isAutoPlaying: false,
        isDemoPaused: false,
        currentTurnIndex: 0,
        turnResults: [],
      };

    case 'NEXT_TURN': {
      const nextIndex = state.currentTurnIndex + 1;
      if (nextIndex >= action.rowCount) {
        // Stay in current phase, set completion flag — user chooses next step
        return { ...state, isPhaseComplete: true, isTTSPlaying: false };
      }
      return { ...state, currentTurnIndex: nextIndex, isPhaseComplete: false };
    }

    case 'PROCEED_NEXT_PHASE': {
      const nextPhase = PHASE_PROGRESSION[state.rolePlayPhase];
      if (!nextPhase) return state;
      return {
        ...state,
        rolePlayPhase: nextPhase,
        currentTurnIndex: 0,
        isPhaseComplete: false,
        isTTSPlaying: false,
        skipAllPartnerTTS: false,
      };
    }

    case 'SKIP_TO_REVIEW':
      return {
        ...state,
        rolePlayPhase: 'REVIEW',
        isPhaseComplete: false,
        isTTSPlaying: false,
      };

    case 'SET_SKIP_ALL_PARTNER_TTS':
      return {
        ...state,
        skipAllPartnerTTS: true,
        isTTSPlaying: false,
      };

    case 'USER_TURN_COMPLETE': {
      const result: TurnResult = {
        rowIndex: action.rowIndex,
        speaker: action.speaker,
        expected: action.expected,
        transcript: action.transcript,
        score: action.score,
        phase: state.rolePlayPhase,
      };
      return {
        ...state,
        turnResults: [...state.turnResults, result],
        liveTranscript: '',
        liveWordStatuses: [],
      };
    }

    case 'UPDATE_LIVE_TRANSCRIPT':
      return { ...state, liveTranscript: action.transcript };

    case 'UPDATE_LIVE_WORD_STATUSES':
      return { ...state, liveWordStatuses: action.statuses };

    case 'SET_AUTO_PLAYING':
      return { ...state, isAutoPlaying: action.value };

    case 'SET_TTS_PLAYING':
      return { ...state, isTTSPlaying: action.value };

    case 'SET_DEMO_PAUSED':
      return { ...state, isDemoPaused: action.value };

    case 'RESET':
      return initialRolePlayState;

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRolePlay(setId: string) {
  const { rows: allRows, speakers: dataSetSpeakers, isLoading, error } = useTrainingData(setId);

  // Unique speakers from script rows only — used for both voice and color indices (devil fix #7)
  const dialogueSpeakers: string[] = useMemo(
    () => {
      const scriptRows = allRows.filter(
        (r: TrainingRow & { rowType?: string }) => r.rowType === 'script' && r.speaker !== '',
      );
      return Array.from(new Set(scriptRows.map((r: TrainingRow) => r.speaker)));
    },
    [allRows],
  );

  const sessionApi = useTrainingSession({
    setId,
    mode: 'rolePlay',
    allRows,
    options: {},
  });

  const audioApi = useTrainingAudio({
    speakers: dialogueSpeakers.length > 0 ? dialogueSpeakers : dataSetSpeakers,
  });
  const progressApi = useTrainingProgress(sessionApi.session);

  const [rpState, dispatch] = useReducer(rolePlayReducer, initialRolePlayState);
  const [demoPlayingIndex, setDemoPlayingIndex] = useState(-1);
  const [ttsError, setTtsError] = useState(false);

  // Dialogue rows: session rows with blank speakers filtered out
  const dialogueRows: TrainingRow[] = useMemo(
    () => sessionApi.rows.filter((r: TrainingRow) => r.speaker !== ''),
    [sessionApi.rows],
  );

  const currentRow = dialogueRows[rpState.currentTurnIndex] ?? null;
  const isUserTurn = currentRow !== null && currentRow.speaker === rpState.selectedRole;

  // Keep latest transcript in a ref to avoid stale closures
  const transcriptRef = useRef('');
  useEffect(() => {
    transcriptRef.current = audioApi.transcript;
    if (audioApi.transcript) {
      dispatch({ type: 'UPDATE_LIVE_TRANSCRIPT', transcript: audioApi.transcript });
      if (currentRow) { // C5 fix: null guard already here; also guard the evaluateSpeechLogic call
        const result = evaluateSpeechLogic(audioApi.transcript, currentRow.english, false);
        dispatch({ type: 'UPDATE_LIVE_WORD_STATUSES', statuses: result.wordStatuses });
      }
    }
  }, [audioApi.transcript, currentRow]);

  // Demo control refs
  const demoActiveRef = useRef(false);
  const demoPausedRef = useRef(false);

  // Expose an interrupt for DEMO pause + partner turn skip
  const playInterruptRef = useRef<(() => void) | null>(null);

  /**
   * Play a single row's TTS with an 8-second timeout guard (devil fix #1).
   * Returns a Promise that resolves when audio ends, times out, or errors.
   */
  const playPartnerTurn = useCallback(
    async (row: TrainingRow): Promise<void> => {
      const voice = audioApi.speakerVoiceMap[row.speaker] ?? 'female1';
      setTtsError(false);

      let resolvePlay!: () => void;
      const playDone = new Promise<void>(res => { resolvePlay = res; });
      playInterruptRef.current = resolvePlay;

      // Dynamic timeout: base + 500ms per word for long sentences
      const wordCount = row.english.split(/\s+/).filter(Boolean).length;
      const dynamicTimeout = Math.max(PARTNER_TTS_TIMEOUT_MS, wordCount * 500 + 3000);

      const timeout = new Promise<void>(res =>
        window.setTimeout(() => {
          setTtsError(true);
          res();
        }, dynamicTimeout),
      );

      try {
        const url = await getTTSAudioUrl(row.english, voice);
        const audio = new Audio(url);
        audio.onended = resolvePlay;
        audio.onerror = resolvePlay;
        audio.play().catch(resolvePlay);
        await Promise.race([playDone, timeout]);
        audio.pause();
      } catch {
        setTtsError(true);
      } finally {
        playInterruptRef.current = null;
      }
    },
    [audioApi.speakerVoiceMap],
  );

  // ── DEMO phase ──────────────────────────────────────────────────────────────

  const startDemo = useCallback(async () => {
    if (!rpState.selectedRole) return;

    // Request mic permission early (needed for native Capacitor)
    await audioApi.requestMicPermission();

    demoActiveRef.current = true;
    demoPausedRef.current = false;
    dispatch({ type: 'START_DEMO' });

    // If intro is shown, demo playback is handled by completeIntro
    if (localStorage.getItem('roleplay-skip-intro') !== 'true') return;

    for (let i = 0; i < dialogueRows.length; i++) {
      if (!demoActiveRef.current) break;

      // Pause support (devil fix #6)
      while (demoPausedRef.current && demoActiveRef.current) {
        await new Promise<void>(res => window.setTimeout(res, 100));
      }
      if (!demoActiveRef.current) break;

      setDemoPlayingIndex(i);
      await playPartnerTurn(dialogueRows[i]);
    }

    setDemoPlayingIndex(-1);
    if (demoActiveRef.current) {
      dispatch({ type: 'DEMO_COMPLETE', rowCount: dialogueRows.length });
    }
    demoActiveRef.current = false;
  }, [rpState.selectedRole, dialogueRows, playPartnerTurn, audioApi]);

  const completeIntro = useCallback(async () => {
    // Request mic permission before demo starts (needed for native)
    await audioApi.requestMicPermission();

    demoActiveRef.current = true;
    demoPausedRef.current = false;
    dispatch({ type: 'INTRO_COMPLETE' });

    for (let i = 0; i < dialogueRows.length; i++) {
      if (!demoActiveRef.current) break;
      while (demoPausedRef.current && demoActiveRef.current) {
        await new Promise<void>(res => window.setTimeout(res, 100));
      }
      if (!demoActiveRef.current) break;
      setDemoPlayingIndex(i);
      await playPartnerTurn(dialogueRows[i]);
    }

    setDemoPlayingIndex(-1);
    if (demoActiveRef.current) {
      dispatch({ type: 'DEMO_COMPLETE', rowCount: dialogueRows.length });
    }
    demoActiveRef.current = false;
  }, [dialogueRows, playPartnerTurn, audioApi]);

  const pauseDemo = useCallback(() => {
    demoPausedRef.current = true;
    dispatch({ type: 'SET_DEMO_PAUSED', value: true });
    if (playInterruptRef.current) playInterruptRef.current();
  }, []);

  const resumeDemo = useCallback(() => {
    demoPausedRef.current = false;
    dispatch({ type: 'SET_DEMO_PAUSED', value: false });
  }, []);

  // ── Turn loop (GUIDED / PRACTICE / FREE) ────────────────────────────────────

  const stopUserTurn = useCallback(() => {
    audioApi.stopRecording();
    const transcript = transcriptRef.current;
    const expected = currentRow?.english ?? '';
    const score = transcript.length > 0 ? evaluateSpeechLogic(transcript, expected, true).score : null;
    dispatch({
      type: 'USER_TURN_COMPLETE',
      transcript,
      score,
      rowIndex: rpState.currentTurnIndex,
      speaker: currentRow?.speaker ?? '',
      expected,
    });
    dispatch({ type: 'NEXT_TURN', rowCount: dialogueRows.length, currentPhase: rpState.rolePlayPhase });
  }, [audioApi, currentRow, rpState.currentTurnIndex, rpState.rolePlayPhase, dialogueRows.length]);

  const skipUserTurn = useCallback(() => {
    audioApi.stopRecording();
    dispatch({
      type: 'USER_TURN_COMPLETE',
      transcript: '',
      score: null,
      rowIndex: rpState.currentTurnIndex,
      speaker: currentRow?.speaker ?? '',
      expected: currentRow?.english ?? '',
    });
    dispatch({ type: 'NEXT_TURN', rowCount: dialogueRows.length, currentPhase: rpState.rolePlayPhase });
  }, [audioApi, currentRow, rpState.currentTurnIndex, rpState.rolePlayPhase, dialogueRows.length]);

  const skipPartnerTurn = useCallback(() => {
    if (playInterruptRef.current) playInterruptRef.current();
  }, []);

  const activateSkipAllPartnerTTS = useCallback(() => {
    if (playInterruptRef.current) playInterruptRef.current();
    dispatch({ type: 'SET_SKIP_ALL_PARTNER_TTS' });
  }, []);

  const proceedNextPhase = useCallback(() => {
    progressApi.saveProgress(); // devil fix #8: save at phase boundary
    dispatch({ type: 'PROCEED_NEXT_PHASE' });
  }, [progressApi]);

  const skipToReview = useCallback(() => {
    progressApi.saveProgress(); // devil fix #8
    dispatch({ type: 'SKIP_TO_REVIEW' });
  }, [progressApi]);

  // Turn loop effect: fires on each turn change in active phases
  const turnTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const activePhases: RolePlayPhase[] = ['GUIDED', 'PRACTICE', 'FREE'];
    if (!activePhases.includes(rpState.rolePlayPhase)) return;
    if (rpState.isPhaseComplete) return;
    if (rpState.currentTurnIndex >= dialogueRows.length) return;
    if (rpState.isTTSPlaying) return;

    const row = dialogueRows[rpState.currentTurnIndex];
    if (!row) return;

    const thisTurnIsUser = row.speaker === rpState.selectedRole;

    if (!thisTurnIsUser) {
      // GUIDED: 상대 턴은 TTS 없이 즉시 넘기기 (선택한 발화자만 연습)
      // skipAllPartnerTTS: 모든 페이즈에서 상대 TTS 건너뛰기 (사용자 발화는 유지)
      if (rpState.rolePlayPhase === 'GUIDED' || rpState.skipAllPartnerTTS) {
        dispatch({ type: 'NEXT_TURN', rowCount: dialogueRows.length, currentPhase: rpState.rolePlayPhase });
        return;
      }

      let cancelled = false;
      dispatch({ type: 'SET_TTS_PLAYING', value: true });

      playPartnerTurn(row).then(() => {
        if (!cancelled) {
          dispatch({ type: 'SET_TTS_PLAYING', value: false });
          dispatch({ type: 'NEXT_TURN', rowCount: dialogueRows.length, currentPhase: rpState.rolePlayPhase });
        }
      });

      return () => { cancelled = true; };
    } else {
      // Dynamic timeout = max(USER_TURN_TIMEOUT_MS, wordCount * MS_PER_WORD)
      transcriptRef.current = '';

      // 200ms gap lets Web Speech API fully reset between turns
      const startDelay = window.setTimeout(() => {
        audioApi.startRecording();
      }, 200);

      const wordCount = (row.english ?? '').split(/\s+/).filter(Boolean).length;
      const timeoutMs = Math.max(USER_TURN_TIMEOUT_MS, wordCount * MS_PER_WORD);

      turnTimeoutRef.current = window.setTimeout(() => {
        stopUserTurn();
      }, timeoutMs + 200);

      return () => {
        clearTimeout(startDelay);
        if (turnTimeoutRef.current) {
          clearTimeout(turnTimeoutRef.current);
          turnTimeoutRef.current = null;
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpState.currentTurnIndex, rpState.rolePlayPhase, rpState.isPhaseComplete, rpState.skipAllPartnerTTS]);

  // ── REVIEW ────────────────────────────────────────────────────────────────

  const overallAccuracy = useMemo(() => {
    const userTurns = rpState.turnResults.filter(
      r => r.speaker === rpState.selectedRole && r.score !== null,
    );
    if (userTurns.length === 0) return null;
    const total = userTurns.reduce((sum, r) => sum + (r.score ?? 0), 0);
    return Math.round(total / userTurns.length);
  }, [rpState.turnResults, rpState.selectedRole]);

  // Save result when entering REVIEW phase
  const savedReviewRef = useRef(false);
  useEffect(() => {
    if (rpState.rolePlayPhase === 'REVIEW' && !savedReviewRef.current) {
      savedReviewRef.current = true;
      progressApi.saveResult(overallAccuracy ?? undefined);
    }
    if (rpState.rolePlayPhase === 'SETUP') {
      savedReviewRef.current = false;
    }
  }, [rpState.rolePlayPhase, overallAccuracy, progressApi]);

  // Save progress on unmount (devil fix #8)
  useEffect(() => {
    return () => {
      progressApi.saveProgress();
      demoActiveRef.current = false;
      if (playInterruptRef.current) playInterruptRef.current();
      if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectRole = useCallback((role: string) => {
    dispatch({ type: 'SET_ROLE', role });
  }, []);

  const resetRolePlay = useCallback(() => {
    demoActiveRef.current = false;
    if (playInterruptRef.current) playInterruptRef.current();
    audioApi.stop();
    audioApi.stopRecording();
    if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
    progressApi.saveProgress();
    sessionApi.reset();
    dispatch({ type: 'RESET' });
  }, [audioApi, progressApi, sessionApi]);

  const skipDemo = useCallback(() => {
    demoActiveRef.current = false;
    if (playInterruptRef.current) playInterruptRef.current();
    setDemoPlayingIndex(-1);
    dispatch({ type: 'DEMO_COMPLETE', rowCount: dialogueRows.length });
  }, [dialogueRows.length]);

  return {
    // Loading
    isLoading,
    error,

    // Data
    dialogueRows,
    dialogueSpeakers,
    speakerVoiceMap: audioApi.speakerVoiceMap,

    // RolePlay state
    rolePlayPhase: rpState.rolePlayPhase,
    selectedRole: rpState.selectedRole,
    currentTurnIndex: rpState.currentTurnIndex,
    currentRow,
    isUserTurn,
    isTTSPlaying: rpState.isTTSPlaying,
    isAutoPlaying: rpState.isAutoPlaying,
    isDemoPaused: rpState.isDemoPaused,
    isPhaseComplete: rpState.isPhaseComplete,
    liveTranscript: rpState.liveTranscript,
    liveWordStatuses: rpState.liveWordStatuses,
    turnResults: rpState.turnResults,
    demoPlayingIndex,
    ttsError,

    // Audio
    isRecording: audioApi.isRecording,

    // Session
    elapsed: sessionApi.elapsed,
    overallAccuracy,

    // Actions
    selectRole,
    startDemo,
    completeIntro,
    skipDemo,
    pauseDemo,
    resumeDemo,
    stopUserTurn,
    skipUserTurn,
    skipPartnerTurn,
    activateSkipAllPartnerTTS,
    skipAllPartnerTTS: rpState.skipAllPartnerTTS,
    proceedNextPhase,
    skipToReview,
    resetRolePlay,
  };
}
