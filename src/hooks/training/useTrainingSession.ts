// src/hooks/training/useTrainingSession.ts
import { useReducer, useCallback, useEffect, useRef, useMemo } from 'react';
import type { TrainingMode } from '../../types';
import type { TrainingRow, TrainingSession, SessionAction, SessionPhase, ModeOptions } from './types';
import { filterRowsForMode } from './dataAdapter';

export const initialSessionState: TrainingSession = {
  setId: '',
  mode: 'repetition',
  rows: [],
  currentIndex: 0,
  round: 1,
  totalRounds: 1,
  phase: 'setup',
  startedAt: 0,
  elapsedSeconds: 0,
  isPaused: false,
};

export function sessionReducer(state: TrainingSession, action: SessionAction): TrainingSession {
  switch (action.type) {
    case 'INIT':
      return {
        ...initialSessionState,
        setId: action.setId,
        mode: action.mode,
        rows: action.rows,
        totalRounds: action.totalRounds ?? 1,
        phase: 'active',
        startedAt: Date.now(),
      };

    case 'NEXT':
      if (state.currentIndex >= state.rows.length - 1) return state;
      return { ...state, currentIndex: state.currentIndex + 1 };

    case 'PREV':
      if (state.currentIndex <= 0) return state;
      return { ...state, currentIndex: state.currentIndex - 1 };

    case 'GO_TO': {
      const index = Math.max(0, Math.min(action.index, state.rows.length - 1));
      return { ...state, currentIndex: index };
    }

    case 'NEXT_ROUND':
      if (state.round >= state.totalRounds) {
        return { ...state, phase: 'complete' };
      }
      return { ...state, round: state.round + 1, currentIndex: 0 };

    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'PAUSE':
      return { ...state, isPaused: true };

    case 'RESUME':
      return { ...state, isPaused: false };

    case 'TICK':
      return { ...state, elapsedSeconds: action.elapsed };

    case 'COMPLETE':
      return { ...state, phase: 'complete' };

    case 'RESET':
      return initialSessionState;

    default:
      return state;
  }
}

export function useTrainingSession(config: {
  setId: string;
  mode: TrainingMode;
  allRows: TrainingRow[];
  options?: ModeOptions;
}) {
  const { setId, mode, allRows, options } = config;

  const filteredRows = useMemo(
    () => filterRowsForMode(allRows, mode),
    [allRows, mode],
  );

  const [session, dispatch] = useReducer(sessionReducer, initialSessionState);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (filteredRows.length > 0 && session.phase === 'setup') {
      dispatch({
        type: 'INIT',
        rows: filteredRows,
        mode,
        setId,
        totalRounds: options?.totalRounds,
      });
    }
  }, [filteredRows, mode, setId, options?.totalRounds, session.phase]);

  useEffect(() => {
    if (session.phase === 'active' && !session.isPaused) {
      const startOffset = session.elapsedSeconds;
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = startOffset + Math.floor((Date.now() - startTime) / 1000);
        dispatch({ type: 'TICK', elapsed });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- startOffset captured once per timer activation
  }, [session.phase, session.isPaused, session.round]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        dispatch({ type: 'PAUSE' });
      } else if (session.phase === 'active') {
        dispatch({ type: 'RESUME' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [session.phase]);

  const next = useCallback(() => dispatch({ type: 'NEXT' }), []);
  const prev = useCallback(() => dispatch({ type: 'PREV' }), []);
  const goTo = useCallback((index: number) => dispatch({ type: 'GO_TO', index }), []);
  const nextRound = useCallback(() => dispatch({ type: 'NEXT_ROUND' }), []);
  const setPhase = useCallback((phase: SessionPhase) => dispatch({ type: 'SET_PHASE', phase }), []);
  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const resume = useCallback(() => dispatch({ type: 'RESUME' }), []);
  const complete = useCallback(() => dispatch({ type: 'COMPLETE' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    session,
    rows: session.rows,
    currentRow: session.rows[session.currentIndex] ?? null,
    next,
    prev,
    goTo,
    nextRound,
    setPhase,
    pause,
    resume,
    complete,
    reset,
    elapsed: session.elapsedSeconds,
  };
}
