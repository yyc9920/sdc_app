// src/hooks/training/__tests__/useTrainingAudio.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../../services/ttsService', () => ({
  getTTSAudioUrl: vi.fn(),
}));

vi.mock('../../../services/speechService', () => ({
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

import { getTTSAudioUrl } from '../../../services/ttsService';
import { useTrainingAudio } from '../useTrainingAudio';
import type { TrainingRow } from '../types';

const mockedGetTTS = vi.mocked(getTTSAudioUrl);

function makeRow(english: string, speaker = ''): TrainingRow {
  return {
    id: 1, rowType: 'script', rowSeq: 0, speaker, note: '',
    english, koreanPronounce: '', directComprehension: '', comprehension: '',
  };
}

describe('useTrainingAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetTTS.mockResolvedValue('blob:mock-audio-url');
  });

  it('exposes play function that calls getTTSAudioUrl', async () => {
    const { result } = renderHook(() => useTrainingAudio({ speakers: [] }));

    await act(async () => {
      await result.current.play(makeRow('Hello world'));
    });

    expect(mockedGetTTS).toHaveBeenCalledWith('Hello world', 'female1');
  });

  it('uses speakerVoiceMap for speaker-specific voice', async () => {
    const { result } = renderHook(() =>
      useTrainingAudio({ speakers: ['Phil', 'Feifei'] }),
    );

    await act(async () => {
      await result.current.play(makeRow('Hi there', 'Phil'));
    });

    expect(mockedGetTTS).toHaveBeenCalledWith('Hi there', 'male1');
  });

  it('allows voice override', async () => {
    const { result } = renderHook(() => useTrainingAudio({ speakers: [] }));

    await act(async () => {
      await result.current.play(makeRow('Test'), 'male2');
    });

    expect(mockedGetTTS).toHaveBeenCalledWith('Test', 'male2');
  });

  it('sets speed', () => {
    const { result } = renderHook(() => useTrainingAudio({ speakers: [] }));

    act(() => {
      result.current.setSpeed(1.5);
    });

    expect(result.current.speed).toBe(1.5);
  });

  it('computes speakerVoiceMap from speakers list', () => {
    const { result } = renderHook(() =>
      useTrainingAudio({ speakers: ['A', 'B', 'C'] }),
    );

    expect(result.current.speakerVoiceMap).toEqual({
      A: 'male1',
      B: 'female1',
      C: 'male2',
    });
  });
});
