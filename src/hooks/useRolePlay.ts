import { useReducer, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { getTTSAudioUrl } from '../services/ttsService';
import {
  useTrainingData,
  useTrainingSession,
  useTrainingAudio,
  useTrainingProgress,
} from './training';
import type { TrainingRow } from './training';
import type { RolePlayPhase, TurnResult } from '../constants/rolePlay';
import { USER_TURN_TIMEOUT_MS } from '../constants/rolePlay';

// ─── Pure utilities ───────────────────────────────────────────────────────────

/**
 * Compute word-overlap similarity score between spoken text and expected text.
 * Returns 0–100. Returns null if expected is empty (guard against divide-by-zero).
 */
export function computeSimilarity(spoken: string, expected: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^\w\s]/g, '').trim();

  const spokenWords = normalize(spoken).split(/\s+/).filter(Boolean);
  const expectedWords = normalize(expected).split(/\s+/).filter(Boolean);

  if (expectedWords.length === 0) return 0;
  if (spokenWords.length === 0) return 0;

  // Build frequency map of spoken words
  const freq: Record<string, number> = {};
  for (const w of spokenWords) {
    freq[w] = (freq[w] ?? 0) + 1;
  }

  let matched = 0;
  for (const w of expectedWords) {
    if (freq[w] && freq[w] > 0) {
      matched++;
      freq[w]--;
    }
  }

  return Math.round((matched / expectedWords.length) * 100);
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export interface RolePlayState {
  rolePlayPhase: RolePlayPhase;
  selectedRole: string;
  currentTurnIndex: number;
  turnResults: TurnResult[];
  isAutoPlaying: boolean;
  isTTSPlaying: boolean;
  liveTranscript: string;
}

type RolePlayAction =
  | { type: 'SET_ROLE'; role: string }
  | { type: 'START_DEMO' }
  | { type: 'DEMO_COMPLETE'; rowCount: number }
  | { type: 'NEXT_TURN'; rowCount: number; currentPhase: RolePlayPhase }
  | { type: 'USER_TURN_COMPLETE'; transcript: string; score: number | null; rowIndex: number; speaker: string; expected: string }
  | { type: 'UPDATE_LIVE_TRANSCRIPT'; transcript: string }
  | { type: 'SET_AUTO_PLAYING'; value: boolean }
  | { type: 'SET_TTS_PLAYING'; value: boolean }
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
  liveTranscript: '',
};

export function rolePlayReducer(state: RolePlayState, action: RolePlayAction): RolePlayState {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, selectedRole: action.role };

    case 'START_DEMO':
      return { ...state, rolePlayPhase: 'DEMO', isAutoPlaying: true };

    case 'DEMO_COMPLETE':
      return {
        ...state,
        rolePlayPhase: 'GUIDED',
        isAutoPlaying: false,
        currentTurnIndex: 0,
        turnResults: [],
      };

    case 'NEXT_TURN': {
      const nextIndex = state.currentTurnIndex + 1;
      if (nextIndex >= action.rowCount) {
        const nextPhase = PHASE_PROGRESSION[action.currentPhase];
        if (!nextPhase) return state;
        return { ...state, currentTurnIndex: 0, rolePlayPhase: nextPhase, isTTSPlaying: false };
      }
      return { ...state, currentTurnIndex: nextIndex };
    }

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
      };
    }

    case 'UPDATE_LIVE_TRANSCRIPT':
      return { ...state, liveTranscript: action.transcript };

    case 'SET_AUTO_PLAYING':
      return { ...state, isAutoPlaying: action.value };

    case 'SET_TTS_PLAYING':
      return { ...state, isTTSPlaying: action.value };

    case 'RESET':
      return initialRolePlayState;

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRolePlay(setId: string) {
  const { rows: allRows, speakers, isLoading, error } = useTrainingData(setId);

  const sessionApi = useTrainingSession({
    setId,
    mode: 'rolePlay',
    allRows,
    options: {},
  });

  const audioApi = useTrainingAudio({ speakers });
  const progressApi = useTrainingProgress(sessionApi.session);

  const [rpState, dispatch] = useReducer(rolePlayReducer, initialRolePlayState);
  const [demoPlayingIndex, setDemoPlayingIndex] = useState(-1);
  const [ttsError, setTtsError] = useState(false);

  // Dialogue rows: session rows with blank speakers filtered out
  const dialogueRows: TrainingRow[] = useMemo(
    () => sessionApi.rows.filter(r => r.speaker !== ''),
    [sessionApi.rows],
  );

  // Unique speakers from dialogue rows (preserves order)
  const dialogueSpeakers: string[] = useMemo(
    () => Array.from(new Set(dialogueRows.map(r => r.speaker))),
    [dialogueRows],
  );

  const currentRow = dialogueRows[rpState.currentTurnIndex] ?? null;
  const isUserTurn = currentRow !== null && currentRow.speaker === rpState.selectedRole;

  // Keep latest transcript in a ref to avoid stale closures
  const transcriptRef = useRef('');
  useEffect(() => {
    transcriptRef.current = audioApi.transcript;
    if (audioApi.transcript) {
      dispatch({ type: 'UPDATE_LIVE_TRANSCRIPT', transcript: audioApi.transcript });
    }
  }, [audioApi.transcript]);

  // Demo active flag for cancellation
  const demoActiveRef = useRef(false);

  // Partner audio element for direct playback with onended promise
  const partnerAudioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Play a single row's TTS and return a Promise that resolves when audio ends.
   * Uses speaker-voice mapping from audioApi.
   */
  const playPartnerTurn = useCallback(
    async (row: TrainingRow): Promise<void> => {
      const voice = audioApi.speakerVoiceMap[row.speaker] ?? 'female1';
      setTtsError(false);
      try {
        const url = await getTTSAudioUrl(row.english, voice);
        return new Promise<void>(resolve => {
          const audio = new Audio(url);
          partnerAudioRef.current = audio;
          audio.onended = () => { partnerAudioRef.current = null; resolve(); };
          audio.onerror = () => { partnerAudioRef.current = null; resolve(); };
          audio.play().catch(() => { partnerAudioRef.current = null; resolve(); });
        });
      } catch {
        setTtsError(true);
        return;
      }
    },
    [audioApi.speakerVoiceMap],
  );

  // ── DEMO phase ──────────────────────────────────────────────────────────────

  const startDemo = useCallback(async () => {
    if (!rpState.selectedRole) return;
    demoActiveRef.current = true;
    dispatch({ type: 'START_DEMO' });

    for (let i = 0; i < dialogueRows.length; i++) {
      if (!demoActiveRef.current) break;
      setDemoPlayingIndex(i);
      await playPartnerTurn(dialogueRows[i]);
    }

    setDemoPlayingIndex(-1);
    if (demoActiveRef.current) {
      dispatch({ type: 'DEMO_COMPLETE', rowCount: dialogueRows.length });
    }
    demoActiveRef.current = false;
  }, [rpState.selectedRole, dialogueRows, playPartnerTurn]);

  // ── Turn loop (GUIDED / PRACTICE / FREE) ────────────────────────────────────

  const stopUserTurn = useCallback(() => {
    audioApi.stopRecording();
    const transcript = transcriptRef.current;
    const expected = currentRow?.english ?? '';
    // null score if no transcript (SR unavailable), else compute similarity
    const score = transcript.length > 0 ? computeSimilarity(transcript, expected) : null;
    dispatch({
      type: 'USER_TURN_COMPLETE',
      transcript,
      score,
      rowIndex: rpState.currentTurnIndex,
      speaker: currentRow?.speaker ?? '',
      expected,
    });
    // Advance after recording result
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

  // Turn loop effect: fires on each turn change in active phases
  const turnTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const activePhases: RolePlayPhase[] = ['GUIDED', 'PRACTICE', 'FREE'];
    if (!activePhases.includes(rpState.rolePlayPhase)) return;
    if (rpState.currentTurnIndex >= dialogueRows.length) return;
    if (rpState.isTTSPlaying) return; // already in a partner turn

    const row = dialogueRows[rpState.currentTurnIndex];
    if (!row) return;

    const thisTurnIsUser = row.speaker === rpState.selectedRole;

    if (!thisTurnIsUser) {
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
      // User turn: start recording, set timeout
      transcriptRef.current = '';
      audioApi.startRecording();

      turnTimeoutRef.current = window.setTimeout(() => {
        stopUserTurn();
      }, USER_TURN_TIMEOUT_MS);

      return () => {
        if (turnTimeoutRef.current) {
          clearTimeout(turnTimeoutRef.current);
          turnTimeoutRef.current = null;
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpState.currentTurnIndex, rpState.rolePlayPhase]);

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

  // Save progress on unmount
  useEffect(() => {
    return () => {
      progressApi.saveProgress();
      demoActiveRef.current = false;
      if (partnerAudioRef.current) {
        partnerAudioRef.current.pause();
        partnerAudioRef.current = null;
      }
      if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectRole = useCallback((role: string) => {
    dispatch({ type: 'SET_ROLE', role });
  }, []);

  const resetRolePlay = useCallback(() => {
    demoActiveRef.current = false;
    if (partnerAudioRef.current) {
      partnerAudioRef.current.pause();
      partnerAudioRef.current = null;
    }
    audioApi.stop();
    audioApi.stopRecording();
    if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
    progressApi.saveProgress();
    sessionApi.reset();
    dispatch({ type: 'RESET' });
  }, [audioApi, progressApi, sessionApi]);

  const skipDemo = useCallback(() => {
    demoActiveRef.current = false;
    if (partnerAudioRef.current) {
      partnerAudioRef.current.pause();
      partnerAudioRef.current = null;
    }
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
    liveTranscript: rpState.liveTranscript,
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
    skipDemo,
    stopUserTurn,
    skipUserTurn,
    resetRolePlay,
  };
}
