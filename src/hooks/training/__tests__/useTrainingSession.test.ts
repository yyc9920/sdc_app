// src/hooks/training/__tests__/useTrainingSession.test.ts
import { describe, it, expect } from 'vitest';
import { sessionReducer, initialSessionState } from '../useTrainingSession';
import type { TrainingRow } from '../types';
import type { RowType } from '../../../types';

function makeRow(id: number, rowType: RowType = 'script'): TrainingRow {
  return {
    id,
    rowType,
    rowSeq: id,
    speaker: '',
    note: '',
    english: `Sentence ${id}`,
    koreanPronounce: '',
    directComprehension: '',
    comprehension: '',
  };
}

const testRows = [makeRow(0, 'prompt'), makeRow(1), makeRow(2), makeRow(3)];

describe('sessionReducer', () => {
  it('initializes session with INIT action', () => {
    const state = sessionReducer(initialSessionState, {
      type: 'INIT',
      rows: testRows,
      mode: 'repetition',
      setId: 'L1_SPK_001',
    });

    expect(state.phase).toBe('active');
    expect(state.rows).toHaveLength(4);
    expect(state.currentIndex).toBe(0);
    expect(state.round).toBe(1);
    expect(state.mode).toBe('repetition');
    expect(state.setId).toBe('L1_SPK_001');
    expect(state.isPaused).toBe(false);
  });

  it('advances to next row with NEXT', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'NEXT' });
    expect(state.currentIndex).toBe(1);
  });

  it('does not go past the last row', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'GO_TO', index: 3 });
    state = sessionReducer(state, { type: 'NEXT' });
    expect(state.currentIndex).toBe(3);
  });

  it('goes back with PREV', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'GO_TO', index: 2 });
    state = sessionReducer(state, { type: 'PREV' });
    expect(state.currentIndex).toBe(1);
  });

  it('does not go below 0 with PREV', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'PREV' });
    expect(state.currentIndex).toBe(0);
  });

  it('jumps to index with GO_TO', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'GO_TO', index: 2 });
    expect(state.currentIndex).toBe(2);
  });

  it('clamps GO_TO within valid range', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'GO_TO', index: 99 });
    expect(state.currentIndex).toBe(3);
  });

  it('advances round with NEXT_ROUND', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'infiniteSpeaking', setId: 'test', totalRounds: 4,
    });
    state = sessionReducer(state, { type: 'NEXT_ROUND' });
    expect(state.round).toBe(2);
    expect(state.currentIndex).toBe(0);
  });

  it('completes session when last round finishes', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'infiniteSpeaking', setId: 'test', totalRounds: 2,
    });
    state = sessionReducer(state, { type: 'NEXT_ROUND' }); // round 2
    state = sessionReducer(state, { type: 'NEXT_ROUND' }); // past last round
    expect(state.phase).toBe('complete');
  });

  it('toggles pause/resume', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'PAUSE' });
    expect(state.isPaused).toBe(true);
    state = sessionReducer(state, { type: 'RESUME' });
    expect(state.isPaused).toBe(false);
  });

  it('updates elapsed with TICK', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'TICK', elapsed: 5 });
    expect(state.elapsedSeconds).toBe(5);
  });

  it('sets phase to complete with COMPLETE', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'COMPLETE' });
    expect(state.phase).toBe('complete');
  });

  it('resets to initial state with RESET', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'NEXT' });
    state = sessionReducer(state, { type: 'RESET' });
    expect(state).toEqual(initialSessionState);
  });

  it('sets custom phase with SET_PHASE', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT', rows: testRows, mode: 'repetition', setId: 'test',
    });
    state = sessionReducer(state, { type: 'SET_PHASE', phase: 'review' });
    expect(state.phase).toBe('review');
  });
});
