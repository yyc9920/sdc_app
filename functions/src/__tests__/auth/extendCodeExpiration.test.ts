import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const mockUpdate = vi.fn().mockResolvedValue(undefined);
  const mockGet = vi.fn();
  const mockDocRef = { get: mockGet, update: mockUpdate };
  const mockDoc = vi.fn(() => mockDocRef);
  const mockCollection = vi.fn(() => ({ doc: mockDoc }));

  return {
    mockDb: {
      collection: mockCollection,
      _mockGet: mockGet,
      _mockUpdate: mockUpdate,
      _mockDoc: mockDoc,
    },
  };
});

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-functions/v2', () => ({ setGlobalOptions: vi.fn() }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockDb),
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP') },
  Timestamp: { fromDate: vi.fn((d: Date) => d) },
}));

import functionsTest from 'firebase-functions-test';
import { extendCodeExpiration } from '../../auth/extendCodeExpiration';

const testEnv = functionsTest();

describe('extendCodeExpiration', () => {
  const wrapped = testEnv.wrap(extendCodeExpiration);
  const adminAuth = { uid: 'admin1', token: { role: 'admin' } };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws permission-denied for non-admin', async () => {
    await expect(
      wrapped({ data: { codeId: 'c1', extensionDays: 30 }, auth: { uid: 'u1', token: { role: 'student' } } })
    ).rejects.toThrow(/Admin access required/);
  });

  it('throws invalid-argument for missing codeId', async () => {
    await expect(
      wrapped({ data: { extensionDays: 30 }, auth: adminAuth })
    ).rejects.toThrow(/Valid codeId and extensionDays required/);
  });

  it('throws invalid-argument for invalid extensionDays', async () => {
    await expect(
      wrapped({ data: { codeId: 'c1', extensionDays: 0 }, auth: adminAuth })
    ).rejects.toThrow(/Valid codeId and extensionDays required/);
  });

  it('throws not-found for non-existent code', async () => {
    mockDb._mockGet.mockResolvedValue({ exists: false });
    await expect(
      wrapped({ data: { codeId: 'c1', extensionDays: 30 }, auth: adminAuth })
    ).rejects.toThrow(/Code not found/);
  });

  it('throws invalid-argument for admin code', async () => {
    mockDb._mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ role: 'admin', expiresAt: null }),
    });
    await expect(
      wrapped({ data: { codeId: 'c1', extensionDays: 30 }, auth: adminAuth })
    ).rejects.toThrow(/Admin codes do not expire/);
  });

  it('extends from current expiry when not yet expired', async () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days ahead
    mockDb._mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ role: 'student', expiresAt: { toDate: () => futureDate } }),
    });

    const result = await wrapped({
      data: { codeId: 'c1', extensionDays: 15 },
      auth: adminAuth,
    });

    expect(result.success).toBe(true);
    const newExpiry = new Date(result.newExpiresAt);
    // Should extend from futureDate, not from today
    const expectedMin = futureDate.getTime() + 14 * 24 * 60 * 60 * 1000;
    const expectedMax = futureDate.getTime() + 16 * 24 * 60 * 60 * 1000;
    expect(newExpiry.getTime()).toBeGreaterThan(expectedMin);
    expect(newExpiry.getTime()).toBeLessThan(expectedMax);
  });

  it('extends from today when already expired', async () => {
    const pastDate = new Date('2020-01-01');
    mockDb._mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ role: 'student', expiresAt: { toDate: () => pastDate } }),
    });

    const before = Date.now();
    const result = await wrapped({
      data: { codeId: 'c1', extensionDays: 30 },
      auth: adminAuth,
    });

    const newExpiry = new Date(result.newExpiresAt);
    // Should extend from today (~30 days from now), not from past
    const expectedMin = before + 29 * 24 * 60 * 60 * 1000;
    expect(newExpiry.getTime()).toBeGreaterThan(expectedMin);
  });
});
