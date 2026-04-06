import { describe, it, expect } from 'vitest';
import { reducer, initialState } from '../useInfiniteSpeaking';
import type { InfiniteSpeakingState } from '../useInfiniteSpeaking';
import type { SentenceData } from '../../types';

const mockSentences: SentenceData[] = [
  { id: 1, english: 'Hello world', koreanPronounce: '헬로 월드', directComprehension: '', comprehension: '안녕 세상' },
  { id: 2, english: 'Good morning', koreanPronounce: '굿 모닝', directComprehension: '', comprehension: '좋은 아침' },
];

function stateWithSession(overrides: Partial<InfiniteSpeakingState> = {}): InfiniteSpeakingState {
  return {
    ...initialState,
    phase: 'LISTENING',
    sentences: mockSentences,
    shuffledOrder: [0, 1],
    keyIndicesMap: { '1': [0], '2': [0] },
    currentRound: 1,
    sessionStartTime: Date.now(),
    ...overrides,
  };
}

describe('useInfiniteSpeaking reducer', () => {
  describe('START_SESSION', () => {
    it('should initialize session with sentences', () => {
      const state = reducer(initialState, { type: 'START_SESSION', sentences: mockSentences });
      expect(state.phase).toBe('ROUND_INTRO');
      expect(state.sentences).toEqual(mockSentences);
      expect(state.shuffledOrder).toHaveLength(2);
      expect(state.currentRound).toBe(1);
      expect(state.sessionStartTime).toBeTypeOf('number');
    });

    it('should preserve handsFree setting', () => {
      const prev = { ...initialState, handsFree: true };
      const state = reducer(prev, { type: 'START_SESSION', sentences: mockSentences });
      expect(state.handsFree).toBe(true);
    });
  });

  describe('START_LISTENING', () => {
    it('should transition to LISTENING and reset speech state', () => {
      const prev = stateWithSession({ phase: 'ROUND_INTRO', score: 80, transcript: 'old' });
      const state = reducer(prev, { type: 'START_LISTENING' });
      expect(state.phase).toBe('LISTENING');
      expect(state.transcript).toBe('');
      expect(state.score).toBe(0);
      expect(state.retryCount).toBe(0);
      expect(state.hints).toEqual([]);
    });
  });

  describe('START_SPEAKING', () => {
    it('should transition to SPEAKING with pending word statuses', () => {
      const prev = stateWithSession({ phase: 'LISTENING' });
      const state = reducer(prev, { type: 'START_SPEAKING' });
      expect(state.phase).toBe('SPEAKING');
      // "Hello world" has 2 words
      expect(state.wordStatuses).toEqual(['pending', 'pending']);
      expect(state.transcript).toBe('');
      expect(state.score).toBe(0);
    });
  });

  describe('UPDATE_SPEECH', () => {
    it('should update transcript, word statuses, and score', () => {
      const prev = stateWithSession({ phase: 'SPEAKING' });
      const state = reducer(prev, {
        type: 'UPDATE_SPEECH',
        transcript: 'hello world',
        wordStatuses: ['correct', 'correct'],
        score: 100,
      });
      expect(state.transcript).toBe('hello world');
      expect(state.wordStatuses).toEqual(['correct', 'correct']);
      expect(state.score).toBe(100);
    });
  });

  describe('FINISH_SPEAKING', () => {
    it('should transition to COMPARISON', () => {
      const prev = stateWithSession({ phase: 'SPEAKING' });
      const state = reducer(prev, { type: 'FINISH_SPEAKING' });
      expect(state.phase).toBe('COMPARISON');
    });
  });

  describe('RETRY_SPEAKING', () => {
    it('should reset to SPEAKING and increment retryCount', () => {
      const prev = stateWithSession({ phase: 'COMPARISON', score: 50, retryCount: 0 });
      const state = reducer(prev, { type: 'RETRY_SPEAKING' });
      expect(state.phase).toBe('SPEAKING');
      expect(state.score).toBe(0);
      expect(state.transcript).toBe('');
      expect(state.retryCount).toBe(1);
      expect(state.hints).toEqual([]);
    });

    it('should increment retryCount each time', () => {
      const prev = stateWithSession({ phase: 'COMPARISON', retryCount: 2 });
      const state = reducer(prev, { type: 'RETRY_SPEAKING' });
      expect(state.retryCount).toBe(3);
    });
  });

  describe('NEXT_SENTENCE', () => {
    it('should advance to next sentence', () => {
      const prev = stateWithSession({ currentSentenceIndex: 0 });
      const state = reducer(prev, { type: 'NEXT_SENTENCE' });
      expect(state.phase).toBe('LISTENING');
      expect(state.currentSentenceIndex).toBe(1);
      expect(state.retryCount).toBe(0);
      expect(state.score).toBe(0);
    });

    it('should transition to ROUND_COMPLETE when all sentences done', () => {
      const prev = stateWithSession({ currentSentenceIndex: 1 });
      const state = reducer(prev, { type: 'NEXT_SENTENCE' });
      expect(state.phase).toBe('ROUND_COMPLETE');
    });
  });

  describe('NEXT_ROUND', () => {
    it('should advance to next round', () => {
      const prev = stateWithSession({ phase: 'ROUND_COMPLETE', currentRound: 1 });
      const state = reducer(prev, { type: 'NEXT_ROUND' });
      expect(state.phase).toBe('ROUND_INTRO');
      expect(state.currentRound).toBe(2);
      expect(state.currentSentenceIndex).toBe(0);
    });

    it('should complete session after round 4', () => {
      const prev = stateWithSession({ phase: 'ROUND_COMPLETE', currentRound: 4 });
      const state = reducer(prev, { type: 'NEXT_ROUND' });
      expect(state.phase).toBe('SESSION_COMPLETE');
    });
  });

  describe('TOGGLE_HANDS_FREE', () => {
    it('should toggle handsFree', () => {
      const prev = stateWithSession({ handsFree: false });
      const state = reducer(prev, { type: 'TOGGLE_HANDS_FREE' });
      expect(state.handsFree).toBe(true);

      const state2 = reducer(state, { type: 'TOGGLE_HANDS_FREE' });
      expect(state2.handsFree).toBe(false);
    });
  });

  describe('RESET', () => {
    it('should return to initial state', () => {
      const prev = stateWithSession({ phase: 'SPEAKING', score: 80, currentRound: 3 });
      const state = reducer(prev, { type: 'RESET' });
      expect(state.phase).toBe('SETUP');
      expect(state.sentences).toEqual([]);
      expect(state.score).toBe(0);
    });
  });
});
