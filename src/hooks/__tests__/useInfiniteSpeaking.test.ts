// src/hooks/__tests__/useInfiniteSpeaking.test.ts
import { describe, it, expect } from 'vitest';
import {
  isReducer,
  initialISState,
  evaluateSpeechLogic,
} from '../useInfiniteSpeaking';
import { SPEAKER_COLOR_PALETTE } from '../../constants/infiniteSpeaking';

// ─── isReducer tests ──────────────────────────────────────────────────────────

describe('isReducer', () => {
  it('SET_SUB_PHASE updates subPhase', () => {
    const state = isReducer(initialISState, { type: 'SET_SUB_PHASE', subPhase: 'LISTENING' });
    expect(state.subPhase).toBe('LISTENING');
  });

  it('START_SPEAKING sets subPhase to SPEAKING and inits wordStatuses', () => {
    const state = isReducer(initialISState, { type: 'START_SPEAKING', wordCount: 5 });
    expect(state.subPhase).toBe('SPEAKING');
    expect(state.wordStatuses).toHaveLength(5);
    expect(state.wordStatuses.every(s => s === 'pending')).toBe(true);
    expect(state.transcript).toBe('');
    expect(state.score).toBe(0);
  });

  it('UPDATE_SPEECH updates transcript, wordStatuses, and score', () => {
    const state = isReducer(initialISState, {
      type: 'UPDATE_SPEECH',
      transcript: 'hello world',
      wordStatuses: ['correct', 'incorrect'],
      score: 50,
    });
    expect(state.transcript).toBe('hello world');
    expect(state.wordStatuses).toEqual(['correct', 'incorrect']);
    expect(state.score).toBe(50);
  });

  it('RETRY_SPEAKING increments retryCount and resets speaking state', () => {
    const withRetry1 = isReducer(initialISState, { type: 'RETRY_SPEAKING', wordCount: 3 });
    expect(withRetry1.retryCount).toBe(1);
    expect(withRetry1.subPhase).toBe('SPEAKING');
    expect(withRetry1.wordStatuses).toHaveLength(3);
    expect(withRetry1.transcript).toBe('');
    expect(withRetry1.score).toBe(0);
    expect(withRetry1.hints).toHaveLength(0);

    const withRetry2 = isReducer(withRetry1, { type: 'RETRY_SPEAKING', wordCount: 3 });
    expect(withRetry2.retryCount).toBe(2);
  });

  it('RESET_ROW clears row-level state but preserves subPhase and handsFree', () => {
    const dirty = {
      ...initialISState,
      subPhase: 'COMPARISON' as const,
      handsFree: true,
      wordStatuses: ['correct', 'incorrect'],
      transcript: 'some text',
      score: 42,
      retryCount: 2,
    };
    const state = isReducer(dirty, { type: 'RESET_ROW' });
    expect(state.wordStatuses).toHaveLength(0);
    expect(state.transcript).toBe('');
    expect(state.score).toBe(0);
    expect(state.retryCount).toBe(0);
    expect(state.hints).toHaveLength(0);
    expect(state.subPhase).toBe('COMPARISON');
    expect(state.handsFree).toBe(true);
  });

  it('TOGGLE_HANDS_FREE toggles handsFree', () => {
    const on = isReducer(initialISState, { type: 'TOGGLE_HANDS_FREE' });
    expect(on.handsFree).toBe(true);
    const off = isReducer(on, { type: 'TOGGLE_HANDS_FREE' });
    expect(off.handsFree).toBe(false);
  });

  it('ADD_HINT adds a hint with id, message, and timestamp', () => {
    const state = isReducer(initialISState, { type: 'ADD_HINT', message: 'Try again!' });
    expect(state.hints).toHaveLength(1);
    expect(state.hints[0].message).toBe('Try again!');
    expect(state.hints[0].id).toBe(1);
    expect(typeof state.hints[0].timestamp).toBe('number');
  });

  it('ADD_HINT caps at 3 entries (keeps most recent)', () => {
    let state = initialISState;
    for (let i = 0; i < 5; i++) {
      state = isReducer(state, { type: 'ADD_HINT', message: `Hint ${i}` });
    }
    expect(state.hints).toHaveLength(3);
    expect(state.hints[2].message).toBe('Hint 4');
  });

  it('DISMISS_HINT removes hint by id', () => {
    let state = isReducer(initialISState, { type: 'ADD_HINT', message: 'A' });
    state = isReducer(state, { type: 'ADD_HINT', message: 'B' });
    const idToRemove = state.hints[0].id;
    state = isReducer(state, { type: 'DISMISS_HINT', id: idToRemove });
    expect(state.hints).toHaveLength(1);
    expect(state.hints[0].message).toBe('B');
  });

  it('RESET returns to initialISState but preserves handsFree', () => {
    const dirty = {
      ...initialISState,
      subPhase: 'SPEAKING' as const,
      handsFree: true,
      retryCount: 3,
      score: 75,
    };
    const state = isReducer(dirty, { type: 'RESET' });
    expect(state.subPhase).toBe('ROUND_INTRO');
    expect(state.retryCount).toBe(0);
    expect(state.score).toBe(0);
    expect(state.handsFree).toBe(true);
  });
});

// ─── evaluateSpeechLogic tests ────────────────────────────────────────────────

describe('evaluateSpeechLogic', () => {
  it('exact match returns 100% and all correct', () => {
    const result = evaluateSpeechLogic('hello world', 'hello world', true);
    expect(result.score).toBe(100);
    expect(result.wordStatuses).toEqual(['correct', 'correct']);
  });

  it('complete mismatch with markFinal returns 0% and all incorrect', () => {
    const result = evaluateSpeechLogic('foo bar', 'hello world', true);
    expect(result.score).toBe(0);
    expect(result.wordStatuses).toEqual(['incorrect', 'incorrect']);
  });

  it('complete mismatch without markFinal returns 0% and all pending', () => {
    const result = evaluateSpeechLogic('foo bar', 'hello world', false);
    expect(result.score).toBe(0);
    expect(result.wordStatuses).toEqual(['pending', 'pending']);
  });

  it('partial match returns proportional score', () => {
    const result = evaluateSpeechLogic('hello foo', 'hello world', true);
    expect(result.score).toBe(50);
    expect(result.wordStatuses).toEqual(['correct', 'incorrect']);
  });

  it('is case-insensitive', () => {
    const result = evaluateSpeechLogic('HELLO WORLD', 'hello world', true);
    expect(result.score).toBe(100);
    expect(result.wordStatuses).toEqual(['correct', 'correct']);
  });

  it('strips punctuation from spoken text', () => {
    const result = evaluateSpeechLogic('Hello, world!', 'Hello world', true);
    expect(result.score).toBe(100);
  });

  it('strips punctuation from target text', () => {
    const result = evaluateSpeechLogic('hello world', "Hello, world!", true);
    expect(result.score).toBe(100);
  });

  it('uses bag-of-words (order does not matter)', () => {
    const result = evaluateSpeechLogic('world hello', 'hello world', true);
    expect(result.score).toBe(100);
  });

  it('each target word matched only once (no double-counting)', () => {
    // Target has "the" twice; spoken has "the" once
    const result = evaluateSpeechLogic('the cat', 'the the cat', true);
    expect(result.wordStatuses[0]).toBe('correct');   // first "the" — consumed
    expect(result.wordStatuses[1]).toBe('incorrect'); // second "the" — already consumed
    expect(result.wordStatuses[2]).toBe('correct');   // "cat"
    expect(result.score).toBe(Math.round((2 / 3) * 100));
  });

  it('empty spoken text returns 0% with all incorrect when markFinal', () => {
    const result = evaluateSpeechLogic('', 'hello world', true);
    expect(result.score).toBe(0);
    expect(result.wordStatuses).toEqual(['incorrect', 'incorrect']);
  });

  it('markFinal=false leaves unmatched words as pending', () => {
    const result = evaluateSpeechLogic('hello', 'hello world', false);
    expect(result.wordStatuses[0]).toBe('correct');
    expect(result.wordStatuses[1]).toBe('pending');
  });
});

// ─── SPEAKER_COLOR_PALETTE tests ──────────────────────────────────────────────

describe('SPEAKER_COLOR_PALETTE', () => {
  it('has at least 6 colors', () => {
    expect(SPEAKER_COLOR_PALETTE.length).toBeGreaterThanOrEqual(6);
  });

  it('each entry has non-empty colorClass and bgClass', () => {
    for (const entry of SPEAKER_COLOR_PALETTE) {
      expect(typeof entry.colorClass).toBe('string');
      expect(typeof entry.bgClass).toBe('string');
      expect(entry.colorClass.length).toBeGreaterThan(0);
      expect(entry.bgClass.length).toBeGreaterThan(0);
    }
  });

  it('all colorClass values are distinct', () => {
    const classes = SPEAKER_COLOR_PALETTE.map(e => e.colorClass);
    const unique = new Set(classes);
    expect(unique.size).toBe(SPEAKER_COLOR_PALETTE.length);
  });
});

// ─── speakerStyleMap derivation logic ────────────────────────────────────────

describe('speakerStyleMap derivation', () => {
  // Mirrors the logic inside useInfiniteSpeaking
  function buildSpeakerStyleMap(speakers: string[]) {
    const map: Record<string, { name: string; colorClass: string; bgClass: string }> = {};
    speakers.forEach((name, i) => {
      if (!name) return;
      const palette = SPEAKER_COLOR_PALETTE[i % SPEAKER_COLOR_PALETTE.length];
      map[name] = { name, colorClass: palette.colorClass, bgClass: palette.bgClass };
    });
    return map;
  }

  it('assigns distinct colors to distinct speakers', () => {
    const map = buildSpeakerStyleMap(['Alice', 'Bob']);
    expect(map['Alice'].colorClass).not.toBe(map['Bob'].colorClass);
  });

  it('wraps palette when more than 6 speakers', () => {
    const speakers = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const map = buildSpeakerStyleMap(speakers);
    // G (index 6) wraps to index 0
    expect(map['G'].colorClass).toBe(SPEAKER_COLOR_PALETTE[0].colorClass);
  });

  it('empty speakers array produces empty map', () => {
    const map = buildSpeakerStyleMap([]);
    expect(Object.keys(map)).toHaveLength(0);
  });

  it('empty string speaker name is skipped', () => {
    const map = buildSpeakerStyleMap(['', 'Bob']);
    expect(map['']).toBeUndefined();
    expect(map['Bob']).toBeDefined();
  });
});
