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

  it('partial unigram match without bigram overlap scores lower (word order matters)', () => {
    // "hello" matches but bigram "hello there" ≠ "hello world" → 40%*0.5 + 60%*0 = 20%
    expect(computeSimilarity('hello there', 'hello world')).toBe(20);
  });

  it('is case insensitive', () => {
    expect(computeSimilarity('HELLO WORLD', 'hello world')).toBe(100);
  });

  it('strips punctuation', () => {
    expect(computeSimilarity("hello, world!", 'hello world')).toBe(100);
  });

  it('handles extra spoken words — all expected words present', () => {
    // bigram "hello world" is still present in spoken bigrams
    expect(computeSimilarity('hello world foo bar', 'hello world')).toBe(100);
  });

  it('does not double-count spoken words', () => {
    // unigram: 1/2 (hello matches, world doesn't) = 0.5; bigram: 0 → 0.4*0.5 = 20
    expect(computeSimilarity('hello hello', 'hello world')).toBe(20);
  });

  it('penalizes wrong word order (bigram-sensitive)', () => {
    // All words correct but reversed: unigram=1.0, bigram=0 → 40%
    expect(computeSimilarity('world hello', 'hello world')).toBe(40);
    expect(computeSimilarity('world hello', 'hello world')).toBeLessThan(100);
  });

  it('single-word expected falls back to unigram only', () => {
    expect(computeSimilarity('hello', 'hello')).toBe(100);
    expect(computeSimilarity('world', 'hello')).toBe(0);
  });

  it('multi-word correct answer with correct bigrams scores 100', () => {
    const phrase = 'I would like to go to the store';
    expect(computeSimilarity(phrase, phrase)).toBe(100);
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

  it('isPhaseComplete starts false', () => {
    expect(initialRolePlayState.isPhaseComplete).toBe(false);
  });

  it('SET_ROLE sets selectedRole', () => {
    const state = rolePlayReducer(initialRolePlayState, { type: 'SET_ROLE', role: 'A' });
    expect(state.selectedRole).toBe('A');
  });

  it('START_DEMO transitions to INTRO when skip-intro not set', () => {
    localStorage.removeItem('roleplay-skip-intro');
    const state = rolePlayReducer(initialRolePlayState, { type: 'START_DEMO' });
    expect(state.rolePlayPhase).toBe('INTRO');
    expect(state.isAutoPlaying).toBe(false);
  });

  it('START_DEMO transitions to DEMO when skip-intro is set', () => {
    localStorage.setItem('roleplay-skip-intro', 'true');
    const state = rolePlayReducer(initialRolePlayState, { type: 'START_DEMO' });
    expect(state.rolePlayPhase).toBe('DEMO');
    expect(state.isAutoPlaying).toBe(true);
    localStorage.removeItem('roleplay-skip-intro');
  });

  it('INTRO_COMPLETE transitions from INTRO to DEMO', () => {
    const introState: RolePlayState = { ...initialRolePlayState, rolePlayPhase: 'INTRO' };
    const state = rolePlayReducer(introState, { type: 'INTRO_COMPLETE' });
    expect(state.rolePlayPhase).toBe('DEMO');
    expect(state.isAutoPlaying).toBe(true);
  });

  it('DEMO_COMPLETE transitions to GUIDED, resets index and results', () => {
    const demoing: RolePlayState = { ...initialRolePlayState, rolePlayPhase: 'DEMO', isAutoPlaying: true };
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
    expect(state.isPhaseComplete).toBe(false);
  });

  it('NEXT_TURN at last row sets isPhaseComplete instead of auto-transitioning', () => {
    // devil fix #3: no forced phase advance — show transition UI
    const base = guidedState({ currentTurnIndex: 3 });
    const state = rolePlayReducer(base, { type: 'NEXT_TURN', rowCount: 4, currentPhase: 'GUIDED' });
    expect(state.isPhaseComplete).toBe(true);
    expect(state.rolePlayPhase).toBe('GUIDED'); // stays in GUIDED until user acts
  });

  it('PROCEED_NEXT_PHASE advances from GUIDED to PRACTICE', () => {
    const base = guidedState({ isPhaseComplete: true });
    const state = rolePlayReducer(base, { type: 'PROCEED_NEXT_PHASE' });
    expect(state.rolePlayPhase).toBe('PRACTICE');
    expect(state.currentTurnIndex).toBe(0);
    expect(state.isPhaseComplete).toBe(false);
  });

  it('PROCEED_NEXT_PHASE advances from PRACTICE to FREE', () => {
    const base: RolePlayState = { ...initialRolePlayState, rolePlayPhase: 'PRACTICE', isPhaseComplete: true };
    const state = rolePlayReducer(base, { type: 'PROCEED_NEXT_PHASE' });
    expect(state.rolePlayPhase).toBe('FREE');
  });

  it('PROCEED_NEXT_PHASE advances from FREE to REVIEW', () => {
    const base: RolePlayState = { ...initialRolePlayState, rolePlayPhase: 'FREE', isPhaseComplete: true };
    const state = rolePlayReducer(base, { type: 'PROCEED_NEXT_PHASE' });
    expect(state.rolePlayPhase).toBe('REVIEW');
  });

  it('SKIP_TO_REVIEW jumps directly to REVIEW from any phase', () => {
    const base = guidedState({ isPhaseComplete: true });
    const state = rolePlayReducer(base, { type: 'SKIP_TO_REVIEW' });
    expect(state.rolePlayPhase).toBe('REVIEW');
    expect(state.isPhaseComplete).toBe(false);
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

  it('SET_DEMO_PAUSED toggles flag', () => {
    const on = rolePlayReducer(initialRolePlayState, { type: 'SET_DEMO_PAUSED', value: true });
    expect(on.isDemoPaused).toBe(true);
  });

  it('RESET returns to initial state', () => {
    const modified: RolePlayState = {
      ...initialRolePlayState,
      rolePlayPhase: 'REVIEW',
      selectedRole: 'A',
      currentTurnIndex: 5,
      turnResults: [makeTurnResult()],
      isPhaseComplete: true,
    };
    const state = rolePlayReducer(modified, { type: 'RESET' });
    expect(state).toEqual(initialRolePlayState);
  });

  it('accumulates multiple turn results', () => {
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
