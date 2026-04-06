import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockCallable } = vi.hoisted(() => ({
  mockCallable: vi.fn(),
}));

// Mock firebase modules before import
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => mockCallable),
}));

vi.mock('../../firebase', () => ({
  functions: {},
  getStorageUrl: vi.fn(),
}));

import { withRetry, base64ToBlobUrl, getTTSAudioUrl, clearTTSCache } from '../ttsService';

describe('withRetry', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, 3, 10);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure then succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, 3, 10);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after all attempts exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(withRetry(fn, 2, 10)).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('respects maxAttempts = 1 (no retry)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(withRetry(fn, 1, 10)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('base64ToBlobUrl', () => {
  it('returns a blob: URL', () => {
    const url = base64ToBlobUrl('aGVsbG8=');
    expect(url).toMatch(/^blob:/);
  });

  it('creates a valid blob URL for given base64', () => {
    const url = base64ToBlobUrl('dGVzdA==');
    expect(typeof url).toBe('string');
    expect(url.startsWith('blob:')).toBe(true);
  });
});

describe('getTTSAudioUrl cache behavior', () => {
  beforeEach(() => {
    clearTTSCache();
    mockCallable.mockReset();
    mockCallable.mockResolvedValue({ data: { audio: 'aGVsbG8=' } });
  });

  it('calls cloud function and caches result', async () => {
    const url1 = await getTTSAudioUrl('hello', 'female');
    const url2 = await getTTSAudioUrl('hello', 'female');

    expect(url1).toBe(url2);
    expect(url1).toMatch(/^blob:/);
    // The callable should only be called once (cached on second call)
    expect(mockCallable).toHaveBeenCalledTimes(1);
  });

  it('different keys make separate calls', async () => {
    const url1 = await getTTSAudioUrl('hello', 'female');
    const url2 = await getTTSAudioUrl('world', 'female');

    expect(url1).not.toBe(url2);
    expect(mockCallable).toHaveBeenCalledTimes(2);
  });
});

describe('clearTTSCache', () => {
  beforeEach(() => {
    clearTTSCache();
    mockCallable.mockReset();
    mockCallable.mockResolvedValue({ data: { audio: 'dGVzdA==' } });
  });

  it('clears cache so next call fetches again', async () => {
    await getTTSAudioUrl('test', 'male');
    expect(mockCallable).toHaveBeenCalledTimes(1);

    clearTTSCache();

    await getTTSAudioUrl('test', 'male');
    expect(mockCallable).toHaveBeenCalledTimes(2);
  });
});
