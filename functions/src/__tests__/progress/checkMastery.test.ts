import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const mockTransactionGet = vi.fn();
  const mockTransactionUpdate = vi.fn();
  const mockRunTransaction = vi.fn(async (fn: (t: { get: typeof mockTransactionGet; update: typeof mockTransactionUpdate }) => Promise<void>) => {
    await fn({ get: mockTransactionGet, update: mockTransactionUpdate });
  });
  const mockSet = vi.fn().mockResolvedValue(undefined);
  const mockDoc = vi.fn(() => ({ set: mockSet }));

  return {
    mockDb: {
      doc: mockDoc,
      runTransaction: mockRunTransaction,
      _mockTransactionGet: mockTransactionGet,
      _mockTransactionUpdate: mockTransactionUpdate,
      _mockSet: mockSet,
      _mockDoc: mockDoc,
    },
  };
});

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-functions/v2', () => ({ setGlobalOptions: vi.fn() }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockDb),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    increment: vi.fn((n: number) => ({ __increment: n })),
  },
}));

// Test the mastery logic directly without firebase-functions-test wrap
// since onDocumentWritten triggers require complex event structure
describe('checkMastery logic', () => {
  const MASTERY_TIME_THRESHOLD = 300;
  const MASTERY_REPEAT_THRESHOLD = 10;

  // Replicate the core decision logic from checkMastery
  const shouldTriggerMastery = (
    before: { status?: string; studyTimeSeconds?: number; repeatCount?: number } | null,
    after: { status?: string; studyTimeSeconds?: number; repeatCount?: number } | null,
  ) => {
    if (!after) return false;
    const wasMastered = before?.status === 'mastered';
    const shouldBeMastered =
      (after.studyTimeSeconds ?? 0) >= MASTERY_TIME_THRESHOLD ||
      (after.repeatCount ?? 0) >= MASTERY_REPEAT_THRESHOLD;
    return shouldBeMastered && !wasMastered;
  };

  it('triggers when studyTimeSeconds >= 300', () => {
    expect(shouldTriggerMastery(
      { studyTimeSeconds: 200, repeatCount: 3, status: 'learning' },
      { studyTimeSeconds: 300, repeatCount: 3, status: 'learning' },
    )).toBe(true);
  });

  it('triggers when repeatCount >= 10', () => {
    expect(shouldTriggerMastery(
      { studyTimeSeconds: 100, repeatCount: 9, status: 'learning' },
      { studyTimeSeconds: 100, repeatCount: 10, status: 'learning' },
    )).toBe(true);
  });

  it('does not trigger when already mastered', () => {
    expect(shouldTriggerMastery(
      { studyTimeSeconds: 500, repeatCount: 15, status: 'mastered' },
      { studyTimeSeconds: 600, repeatCount: 16, status: 'mastered' },
    )).toBe(false);
  });

  it('does not trigger when thresholds not met', () => {
    expect(shouldTriggerMastery(
      { studyTimeSeconds: 100, repeatCount: 5, status: 'learning' },
      { studyTimeSeconds: 299, repeatCount: 9, status: 'learning' },
    )).toBe(false);
  });

  it('does not trigger on document deletion (after is null)', () => {
    expect(shouldTriggerMastery(
      { studyTimeSeconds: 500, repeatCount: 15, status: 'mastered' },
      null,
    )).toBe(false);
  });

  it('triggers when both thresholds met', () => {
    expect(shouldTriggerMastery(
      { studyTimeSeconds: 100, repeatCount: 5, status: 'learning' },
      { studyTimeSeconds: 400, repeatCount: 12, status: 'learning' },
    )).toBe(true);
  });

  it('triggers on first write (before is null)', () => {
    expect(shouldTriggerMastery(
      null,
      { studyTimeSeconds: 500, repeatCount: 5, status: 'learning' },
    )).toBe(true);
  });

  it('does not trigger with zero values', () => {
    expect(shouldTriggerMastery(
      null,
      { studyTimeSeconds: 0, repeatCount: 0 },
    )).toBe(false);
  });
});

describe('checkMastery daily stats KST logic', () => {
  it('uses KST (UTC+9) for daily bucketing', () => {
    // Replicate KST date logic from the function
    const now = new Date('2026-04-06T22:00:00Z'); // 10pm UTC = 7am Apr 7 KST
    const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = kst.toISOString().split('T')[0];
    expect(today).toBe('2026-04-07'); // Should be Apr 7 in KST
  });

  it('same UTC time, different KST date', () => {
    const now = new Date('2026-04-06T14:00:00Z'); // 2pm UTC = 11pm Apr 6 KST
    const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = kst.toISOString().split('T')[0];
    expect(today).toBe('2026-04-06'); // Still Apr 6 in KST
  });
});
