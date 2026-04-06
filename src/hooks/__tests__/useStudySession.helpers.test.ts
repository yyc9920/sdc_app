import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock firebase dependencies before importing
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  writeBatch: vi.fn(),
  increment: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('../../firebase', () => ({
  db: {},
  auth: { currentUser: null },
}));

import { getTodayString } from '../useStudySession';

describe('getTodayString', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns YYYY-MM-DD format', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 6)); // April 6, 2026
    expect(getTodayString()).toBe('2026-04-06');
  });

  it('pads single-digit month', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15)); // January 15, 2026
    expect(getTodayString()).toBe('2026-01-15');
  });

  it('pads single-digit day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 5)); // December 5, 2026
    expect(getTodayString()).toBe('2026-12-05');
  });

  it('handles year boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 11, 31)); // December 31, 2025
    expect(getTodayString()).toBe('2025-12-31');
  });
});
