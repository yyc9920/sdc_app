import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { analyzeResponse } from '../useFreeResponse';
import type { TrainingRow } from '../training/types';

vi.mock('../../firebase', () => ({
  db: {},
  auth: { currentUser: null },
}));

vi.mock('../../services/ttsService', () => ({
  getTTSAudioUrl: vi.fn().mockResolvedValue('blob:mock'),
}));

vi.mock('../../services/speechService', () => ({
  createSpeechService: vi.fn(() => ({
    isAvailable: vi.fn().mockResolvedValue(true),
    requestPermission: vi.fn().mockResolvedValue(true),
    startListening: vi.fn(),
    stopListening: vi.fn(),
    onResult: vi.fn(),
    onError: vi.fn(),
    removeAllListeners: vi.fn(),
  })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false, error: null })),
}));

function makeRow(english: string, rowType: TrainingRow['rowType'] = 'script'): TrainingRow {
  return {
    id: 1, rowType, rowSeq: 0, speaker: '', note: '',
    english, koreanPronounce: '', directComprehension: '', comprehension: '',
  };
}

// ─── analyzeResponse pure function tests ──────────────────────────────────────

describe('analyzeResponse', () => {
  it('returns 0% overlap when transcript is empty', () => {
    const rows = [makeRow('The library is a quiet comfortable place')];
    const result = analyzeResponse('', rows);
    expect(result.overlapPercent).toBe(0);
    expect(result.userWords).toHaveLength(0);
  });

  it('returns 100% when all model keywords appear in transcript', () => {
    const rows = [makeRow('The library is a comfortable place quiet')];
    const result = analyzeResponse('library comfortable place quiet reading', rows);
    expect(result.overlapPercent).toBe(100);
  });

  it('computes partial overlap correctly', () => {
    const rows = [makeRow('library book quiet reading')];
    const result = analyzeResponse('library book', rows);
    expect(result.overlapPercent).toBe(50);
  });

  it('excludes stop words from keywords', () => {
    const rows = [makeRow('I am a the and or but')];
    const result = analyzeResponse('something else entirely different', rows);
    expect(result.keywordsMatched).toHaveLength(0);
    expect(result.keywordsMissed).toHaveLength(0);
    expect(result.overlapPercent).toBe(0);
  });

  it('returns correct userWords highlight array', () => {
    const rows = [makeRow('library book')];
    const result = analyzeResponse('library coffee', rows);
    expect(result.userWords.find(w => w.word === 'library')?.matched).toBe(true);
    expect(result.userWords.find(w => w.word === 'coffee')?.matched).toBe(false);
  });

  it('returns correct modelWords with found flag', () => {
    const rows = [makeRow('library book')];
    const result = analyzeResponse('library coffee', rows);
    expect(result.modelWords.find(w => w.word === 'library')?.found).toBe(true);
    expect(result.modelWords.find(w => w.word === 'book')?.found).toBe(false);
  });

  it('handles multiple script rows joined together', () => {
    const rows = [makeRow('library book'), makeRow('comfortable quiet')];
    const result = analyzeResponse('library comfortable', rows);
    expect(result.keywordsMatched).toContain('library');
    expect(result.keywordsMatched).toContain('comfortable');
    expect(result.keywordsMissed).toContain('book');
    expect(result.keywordsMissed).toContain('quiet');
  });
});

// ─── useFreeResponse hook phase transition tests ──────────────────────────────

import { useFreeResponse } from '../useFreeResponse';

// Helper: advance to COMPARE through the two-tap short-recording-warning flow.
// Needs two separate act() calls because tap-1's state update must flush before tap-2 reads it.
function twoTapStop(result: ReturnType<typeof renderHook<ReturnType<typeof useFreeResponse>, unknown>>['result']) {
  act(() => { result.current.stopRecord(); }); // tap 1: sets shortRecordingWarning
  act(() => { result.current.stopRecord(); }); // tap 2: confirms
}

describe('useFreeResponse', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('starts in PROMPT phase', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    expect(result.current.phase).toBe('PROMPT');
  });

  it('starts with thinkExpired = false', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    expect(result.current.thinkExpired).toBe(false);
  });

  it('transitions to THINK on startThink()', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => { result.current.startThink(); });
    expect(result.current.phase).toBe('THINK');
  });

  it('transitions to RECORD on startRecord()', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => {
      result.current.startThink();
      result.current.startRecord();
    });
    expect(result.current.phase).toBe('RECORD');
  });

  it('first stopRecord() under 15s shows shortRecordingWarning and stays in RECORD', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => {
      result.current.startThink();
      result.current.startRecord();
      result.current.stopRecord(); // < 15s elapsed → warning only
    });
    expect(result.current.phase).toBe('RECORD');
    expect(result.current.shortRecordingWarning).toBe(true);
  });

  it('second stopRecord() transitions to COMPARE even under 15s', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => { result.current.startThink(); result.current.startRecord(); });
    twoTapStop(result);
    expect(result.current.phase).toBe('COMPARE');
    expect(result.current.analysis).not.toBeNull();
  });

  it('sets transcriptMissing when transcript is empty on confirm stop', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => { result.current.startThink(); result.current.startRecord(); });
    twoTapStop(result);
    expect(result.current.transcriptMissing).toBe(true);
  });

  it('transitions to STUDY on startStudy() with studyIndex 0', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => { result.current.startThink(); result.current.startRecord(); });
    twoTapStop(result);
    act(() => { result.current.startStudy(); });
    expect(result.current.phase).toBe('STUDY');
    expect(result.current.studyIndex).toBe(0);
  });

  it('transitions to RETRY when last study sentence is passed', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => { result.current.startThink(); result.current.startRecord(); });
    twoTapStop(result);
    act(() => {
      result.current.startStudy();
      result.current.nextStudySentence(); // scriptRows empty → RETRY
    });
    expect(result.current.phase).toBe('RETRY');
  });

  it('retry() transitions back to RECORD and increments retryCount', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => { result.current.startThink(); result.current.startRecord(); });
    twoTapStop(result);
    act(() => {
      result.current.startStudy();
      result.current.nextStudySentence();
      result.current.retry();
    });
    expect(result.current.phase).toBe('RECORD');
    expect(result.current.retryCount).toBe(1);
  });

  it('complete() transitions to COMPLETE', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => { result.current.startThink(); result.current.startRecord(); });
    twoTapStop(result);
    act(() => {
      result.current.startStudy();
      result.current.nextStudySentence();
      result.current.complete();
    });
    expect(result.current.phase).toBe('COMPLETE');
  });

  it('reset() returns to PROMPT and clears all state', () => {
    const { result } = renderHook(() => useFreeResponse('L1_SPK_001'));
    act(() => {
      result.current.startThink();
      result.current.reset();
    });
    expect(result.current.phase).toBe('PROMPT');
    expect(result.current.retryCount).toBe(0);
    expect(result.current.analysis).toBeNull();
    expect(result.current.thinkExpired).toBe(false);
    expect(result.current.shortRecordingWarning).toBe(false);
  });
});
