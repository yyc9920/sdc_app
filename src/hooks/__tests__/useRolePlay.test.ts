// src/hooks/__tests__/useRolePlay.test.ts
import { describe, it, expect, vi } from 'vitest';

// Firebase/service mocks must come before importing the hook
vi.mock('../../firebase', () => ({
  db: {},
  auth: { currentUser: null },
  functions: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn()),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  increment: vi.fn(),
  serverTimestamp: vi.fn(),
}));

vi.mock('../useStudySession', () => ({
  getTodayString: vi.fn(() => '2026-04-09'),
}));

vi.mock('../../services/ttsService', () => ({
  getTTSAudioUrl: vi.fn().mockResolvedValue('blob:mock'),
}));

import { computeSimilarity, rolePlayReducer, initialRolePlayState } from '../useRolePlay';
import type { RolePlayState } from '../useRolePlay';
import type { TurnResult } from '../../constants/rolePlay';

// ─── computeSimilarity ────────────────────────────────────────────────────────

describe('computeSimilarity', () => {
  it('exact match returns 100', () => {
    expect(computeSimilarity('hello world', 'hello world')).toBe(100);
  });

  it('no overlap returns 0', () => {
    expect(computeSimilarity('foo bar', 'hello world')).toBe(0);
  });

  it('empty spoken returns 0', () => {
    expect(computeSimilarity('', 'hello world')).toBe(0);
  });

  it('empty expected returns 0', () => {
    expect(computeSimilarity('hello world', '')).toBe(0);
  });

  it('partial overlap returns correct percentage', () => {
    // spoken has 1 of 2 expected words
    expect(computeSimilarity('hello there', 'hello world')).toBe(50);
  });

  it('is case insensitive', () => {
    expect(computeSimilarity('HELLO WORLD', 'hello world')).toBe(100);
  });

  it('strips punctuation', () => {
    expect(computeSimilarity("hello, world!", 'hello world')).toBe(100);
  });

  it('handles extra spoken words', () => {
    expect(computeSimilarity('hello world foo bar', 'hello world')).toBe(100);
  });

  it('does not double-count spoken words', () => {
    // "hello hello" vs "hello world" — only 1 "hello" should match
    expect(computeSimilarity('hello hello', 'hello world')).toBe(50);
  });
});

// ─── rolePlayReducer ──────────────────────────────────────────────────────────

function makeTurnResult(overrides: Partial<TurnResult> = {}): TurnResult {
  return {
    rowIndex: 0,
    speaker: 'A',
    expected: 'Hello there',
    transcript: 'Hello there',
    score: 100,
    phase: 'GUIDED',
    ...overrides,
  };
}

function guidedState(overrides: Partial<RolePlayState> = {}): RolePlayState {
  return { ...initialRolePlayState, rolePlayPhase: 'GUIDED', ...overrides };
}

describe('rolePlayReducer', () => {
  it('starts in SETUP phase', () => {
    expect(initialRolePlayState.rolePlayPhase).toBe('SETUP');
  });

  it('SET_ROLE sets selectedRole', () => {
    const state = rolePlayReducer(initialRolePlayState, { type: 'SET_ROLE', role: 'A' });
    expect(state.selectedRole).toBe('A');
  });

  it('START_DEMO transitions to DEMO and sets isAutoPlaying', () => {
    const state = rolePlayReducer(initialRolePlayState, { type: 'START_DEMO' });
    expect(state.rolePlayPhase).toBe('DEMO');
    expect(state.isAutoPlaying).toBe(true);
  });

  it('DEMO_COMPLETE transitions to GUIDED, resets index and results', () => {
    const demoing = rolePlayReducer(initialRolePlayState, { type: 'START_DEMO' });
    const state = rolePlayReducer(demoing, { type: 'DEMO_COMPLETE', rowCount: 4 });
    expect(state.rolePlayPhase).toBe('GUIDED');
    expect(state.isAutoPlaying).toBe(false);
    expect(state.currentTurnIndex).toBe(0);
    expect(state.turnResults).toHaveLength(0);
  });

  it('NEXT_TURN increments currentTurnIndex', () => {
    const base = guidedState({ currentTurnIndex: 0 });
    const state = rolePlayReducer(base, { type: 'NEXT_TURN', rowCount: 4, currentPhase: 'GUIDED' });
    expect(state.currentTurnIndex).toBe(1);
  });

  it('NEXT_TURN at last row in GUIDED transitions to PRACTICE', () => {
    const base = guidedState({ currentTurnIndex: 3 });
    const state = rolePlayReducer(base, { type: 'NEXT_TURN', rowCount: 4, currentPhase: 'GUIDED' });
    expect(state.rolePlayPhase).toBe('PRACTICE');
    expect(state.currentTurnIndex).toBe(0);
  });

  it('NEXT_TURN at last row in PRACTICE transitions to FREE', () => {
    const base: RolePlayState = { ...initialRolePlayState, rolePlayPhase: 'PRACTICE', currentTurnIndex: 3 };
    const state = rolePlayReducer(base, { type: 'NEXT_TURN', rowCount: 4, currentPhase: 'PRACTICE' });
    expect(state.rolePlayPhase).toBe('FREE');
    expect(state.currentTurnIndex).toBe(0);
  });

  it('NEXT_TURN at last row in FREE transitions to REVIEW', () => {
    const base: RolePlayState = { ...initialRolePlayState, rolePlayPhase: 'FREE', currentTurnIndex: 3 };
    const state = rolePlayReducer(base, { type: 'NEXT_TURN', rowCount: 4, currentPhase: 'FREE' });
    expect(state.rolePlayPhase).toBe('REVIEW');
    expect(state.currentTurnIndex).toBe(0);
  });

  it('USER_TURN_COMPLETE appends to turnResults and clears liveTranscript', () => {
    const base = guidedState({ liveTranscript: 'partial...' });
    const state = rolePlayReducer(base, {
      type: 'USER_TURN_COMPLETE',
      transcript: 'hello world',
      score: 90,
      rowIndex: 0,
      speaker: 'A',
      expected: 'hello world',
    });
    expect(state.turnResults).toHaveLength(1);
    expect(state.turnResults[0].transcript).toBe('hello world');
    expect(state.turnResults[0].score).toBe(90);
    expect(state.liveTranscript).toBe('');
  });

  it('USER_TURN_COMPLETE accepts null score (SR unavailable)', () => {
    const state = rolePlayReducer(initialRolePlayState, {
      type: 'USER_TURN_COMPLETE',
      transcript: '',
      score: null,
      rowIndex: 0,
      speaker: 'A',
      expected: 'hello',
    });
    expect(state.turnResults[0].score).toBeNull();
  });

  it('UPDATE_LIVE_TRANSCRIPT updates liveTranscript', () => {
    const state = rolePlayReducer(initialRolePlayState, {
      type: 'UPDATE_LIVE_TRANSCRIPT',
      transcript: 'hello...',
    });
    expect(state.liveTranscript).toBe('hello...');
  });

  it('SET_AUTO_PLAYING toggles flag', () => {
    const on = rolePlayReducer(initialRolePlayState, { type: 'SET_AUTO_PLAYING', value: true });
    expect(on.isAutoPlaying).toBe(true);
    const off = rolePlayReducer(on, { type: 'SET_AUTO_PLAYING', value: false });
    expect(off.isAutoPlaying).toBe(false);
  });

  it('SET_TTS_PLAYING toggles flag', () => {
    const on = rolePlayReducer(initialRolePlayState, { type: 'SET_TTS_PLAYING', value: true });
    expect(on.isTTSPlaying).toBe(true);
  });

  it('RESET returns to initial state', () => {
    const modified: RolePlayState = {
      ...initialRolePlayState,
      rolePlayPhase: 'REVIEW',
      selectedRole: 'A',
      currentTurnIndex: 5,
      turnResults: [makeTurnResult()],
    };
    const state = rolePlayReducer(modified, { type: 'RESET' });
    expect(state).toEqual(initialRolePlayState);
  });

  it('accumulates multiple turn results across turns', () => {
    let state = guidedState();
    state = rolePlayReducer(state, {
      type: 'USER_TURN_COMPLETE', transcript: 'hi', score: 80, rowIndex: 0, speaker: 'A', expected: 'hi',
    });
    state = rolePlayReducer(state, {
      type: 'USER_TURN_COMPLETE', transcript: 'bye', score: 60, rowIndex: 1, speaker: 'A', expected: 'goodbye',
    });
    expect(state.turnResults).toHaveLength(2);
    expect(state.turnResults[1].score).toBe(60);
  });
});
