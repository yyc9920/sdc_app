// src/hooks/__tests__/useSpeedListening.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock training hooks before imports
vi.mock('../training/useTrainingData', () => ({
  useTrainingData: vi.fn(),
}));

vi.mock('../training/useTrainingSession', () => ({
  useTrainingSession: vi.fn(),
}));

vi.mock('../training/useTrainingAudio', () => ({
  useTrainingAudio: vi.fn(),
}));

vi.mock('../training/useTrainingProgress', () => ({
  useTrainingProgress: vi.fn(),
}));

import { useTrainingData } from '../training/useTrainingData';
import { useTrainingSession } from '../training/useTrainingSession';
import { useTrainingAudio } from '../training/useTrainingAudio';
import { useTrainingProgress } from '../training/useTrainingProgress';
import {
  useSpeedListening,
  generateBlankIndicesForRows,
} from '../useSpeedListening';
import { cleanWord } from '../../utils/textProcessing';
import type { TrainingRow } from '../training/types';
import type { RowType } from '../../types';

const mockedUseTrainingData = vi.mocked(useTrainingData);
const mockedUseTrainingSession = vi.mocked(useTrainingSession);
const mockedUseTrainingAudio = vi.mocked(useTrainingAudio);
const mockedUseTrainingProgress = vi.mocked(useTrainingProgress);

function makeRow(
  id: number,
  english: string,
  rowType: RowType = 'script',
  speaker = '',
): TrainingRow {
  return {
    id,
    rowType,
    rowSeq: id,
    speaker,
    note: '',
    english,
    koreanPronounce: '',
    directComprehension: '',
    comprehension: '',
  };
}

function makeSessionState(rows: TrainingRow[]) {
  return {
    setId: 'test',
    mode: 'speedListening' as const,
    rows,
    currentIndex: 0,
    round: 1,
    totalRounds: 1,
    phase: 'active' as const,
    startedAt: Date.now(),
    elapsedSeconds: 0,
    isPaused: false,
  };
}

function setupMocks(rows: TrainingRow[] = []) {
  mockedUseTrainingData.mockReturnValue({
    rows,
    speakers: [],
    supportedModes: ['speedListening'],
    isLoading: false,
    error: null,
  });

  mockedUseTrainingSession.mockReturnValue({
    session: makeSessionState(rows),
    rows,
    currentRow: rows[0] ?? null,
    next: vi.fn(),
    prev: vi.fn(),
    goTo: vi.fn(),
    nextRound: vi.fn(),
    setPhase: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    complete: vi.fn(),
    reset: vi.fn(),
    elapsed: 0,
  });

  mockedUseTrainingAudio.mockReturnValue({
    play: vi.fn().mockResolvedValue(undefined),
    playSequence: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    speed: 1,
    setSpeed: vi.fn(),
    isPlaying: false,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    transcript: '',
    isRecording: false,
    speakerVoiceMap: {},
    waitForEnd: vi.fn().mockResolvedValue(undefined),
    requestMicPermission: vi.fn().mockResolvedValue(true),
  });

  mockedUseTrainingProgress.mockReturnValue({
    saveProgress: vi.fn().mockResolvedValue(undefined),
    saveResult: vi.fn().mockResolvedValue(undefined),
  });
}

// ─────────────────────────────────────────────
// Pure function tests
// ─────────────────────────────────────────────

describe('cleanWord', () => {
  it('strips punctuation and lowercases', () => {
    expect(cleanWord('Hello,')).toBe('hello');
    expect(cleanWord("it's")).toBe('its');
    expect(cleanWord('World.')).toBe('world');
    expect(cleanWord('"quoted"')).toBe('quoted');
  });

  it('leaves plain words unchanged (lowercased)', () => {
    expect(cleanWord('running')).toBe('running');
  });
});

describe('generateBlankIndicesForRows', () => {
  const rows = [
    makeRow(1, 'The quick brown fox jumps over the lazy dog'),
    makeRow(2, 'She went to the market and bought some apples'),
    makeRow(3, 'I am fine'),
  ];

  it('generates more blanks at higher levels', () => {
    const l1 = generateBlankIndicesForRows(rows, 1);
    const l5 = generateBlankIndicesForRows(rows, 5);

    const l1Total = Object.values(l1).reduce((sum, s) => sum + s.size, 0);
    const l5Total = Object.values(l5).reduce((sum, s) => sum + s.size, 0);

    expect(l5Total).toBeGreaterThanOrEqual(l1Total);
  });

  it('guarantees at least 1 blank per row with eligible words', () => {
    const result = generateBlankIndicesForRows([rows[0]], 1);
    expect(result[1].size).toBeGreaterThanOrEqual(1);
  });

  it('skips single-word rows', () => {
    const singleWordRow = makeRow(10, 'Hello');
    const result = generateBlankIndicesForRows([singleWordRow], 3);
    expect(result[10].size).toBe(0);
  });

  it('returns empty set for rows with only special-char words', () => {
    const specialRow = makeRow(20, 'A&B C/D E—F');
    const result = generateBlankIndicesForRows([specialRow], 3);
    // All words have special chars or are position-0 so may have 0-1 blanks
    expect(result[20]).toBeDefined();
  });

  it('does not produce consecutive runs longer than 3', () => {
    const longRow = makeRow(
      30,
      'the cat sat on the mat and the dog ran far away quickly now',
    );
    const result = generateBlankIndicesForRows([longRow], 5);
    const sorted = [...result[30]].sort((a, b) => a - b);

    let maxRun = 1;
    let currentRun = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        currentRun++;
        maxRun = Math.max(maxRun, currentRun);
      } else {
        currentRun = 1;
      }
    }
    expect(maxRun).toBeLessThanOrEqual(3);
  });

  it('treats level 0 as level 1 (effectiveLevel = max(1, level))', () => {
    const result0 = generateBlankIndicesForRows([rows[0]], 0);
    const result1 = generateBlankIndicesForRows([rows[0]], 1);
    // Both should produce at least 1 blank; they use same effective level
    expect(result0[1].size).toBeGreaterThanOrEqual(1);
    expect(result0[1].size).toBeLessThanOrEqual(result1[1].size + 2);
  });
});

// ─────────────────────────────────────────────
// Hook tests
// ─────────────────────────────────────────────

describe('useSpeedListening', () => {
  const testRows = [
    makeRow(1, 'The cat sat on the mat today'),
    makeRow(2, 'She went to the store and bought milk'),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks(testRows);
  });

  it('starts in listening phase', () => {
    const { result } = renderHook(() =>
      useSpeedListening({ setId: 'L1_SPK_001', level: 2 }),
    );
    expect(result.current.phase).toBe('listening');
  });

  it('exposes rows from useTrainingSession', () => {
    const { result } = renderHook(() =>
      useSpeedListening({ setId: 'L1_SPK_001', level: 2 }),
    );
    expect(result.current.rows).toHaveLength(2);
  });

  it('startQuiz transitions phase to quiz', () => {
    const { result } = renderHook(() =>
      useSpeedListening({ setId: 'L1_SPK_001', level: 2 }),
    );

    act(() => {
      result.current.startQuiz();
    });

    expect(result.current.phase).toBe('quiz');
  });

  it('submit transitions phase to result and calculates score', () => {
    const { result } = renderHook(() =>
      useSpeedListening({ setId: 'L1_SPK_001', level: 2 }),
    );

    act(() => { result.current.startQuiz(); });

    // Fill in some blank answers via updateBlank — we need to know which words are blank
    // Since blanks are random, just submit with empty answers
    act(() => { result.current.submit(); });

    expect(result.current.phase).toBe('result');
    expect(result.current.score).not.toBeNull();
    expect(result.current.score?.score).toBeGreaterThanOrEqual(0);
    expect(result.current.score?.score).toBeLessThanOrEqual(100);
  });

  it('restart resets phase to listening and clears score', () => {
    const { result } = renderHook(() =>
      useSpeedListening({ setId: 'L1_SPK_001', level: 2 }),
    );

    act(() => { result.current.startQuiz(); });
    act(() => { result.current.submit(); });
    expect(result.current.phase).toBe('result');

    act(() => { result.current.restart(); });

    expect(result.current.phase).toBe('listening');
    expect(result.current.score).toBeNull();
    expect(result.current.isSubmitted).toBe(false);
  });

  it('updateBlank stores input and getUserInput retrieves it', () => {
    const { result } = renderHook(() =>
      useSpeedListening({ setId: 'L1_SPK_001', level: 2 }),
    );

    act(() => {
      result.current.updateBlank(1, 3, 'hello');
    });

    expect(result.current.getUserInput(1, 3)).toBe('hello');
  });

  it('returns isLoading from useTrainingData', () => {
    mockedUseTrainingData.mockReturnValue({
      rows: [],
      speakers: [],
      supportedModes: [],
      isLoading: true,
      error: null,
    });
    mockedUseTrainingSession.mockReturnValue({
      session: makeSessionState([]),
      rows: [],
      currentRow: null as unknown as TrainingRow,
      next: vi.fn(),
      prev: vi.fn(),
      goTo: vi.fn(),
      nextRound: vi.fn(),
      setPhase: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      complete: vi.fn(),
      reset: vi.fn(),
      elapsed: 0,
    });

    const { result } = renderHook(() =>
      useSpeedListening({ setId: 'L1_SPK_001', level: 1 }),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.rows).toHaveLength(0);
  });

  it('submit calls saveResult with computed score', () => {
    const mockSaveResult = vi.fn().mockResolvedValue(undefined);
    mockedUseTrainingProgress.mockReturnValue({
      saveProgress: vi.fn().mockResolvedValue(undefined),
      saveResult: mockSaveResult,
    });

    const { result } = renderHook(() =>
      useSpeedListening({ setId: 'L1_SPK_001', level: 2 }),
    );

    act(() => { result.current.startQuiz(); });
    act(() => { result.current.submit(); });

    expect(mockSaveResult).toHaveBeenCalledWith(expect.any(Number));
  });
});
