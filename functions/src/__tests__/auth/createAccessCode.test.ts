import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures these are available when vi.mock factories run
const { mockAdd, mockCollection, mockDb } = vi.hoisted(() => {
  const mockAdd = vi.fn();
  const mockCollection = vi.fn(() => ({ add: mockAdd }));
  const mockDb = { collection: mockCollection };
  return { mockAdd, mockCollection, mockDb };
});

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-functions/v2', () => ({ setGlobalOptions: vi.fn() }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockDb),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    increment: vi.fn((n: number) => n),
  },
  Timestamp: {
    fromDate: vi.fn((d: Date) => d),
  },
}));
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({})),
}));

import functionsTest from 'firebase-functions-test';
import { createAccessCode } from '../../auth/createAccessCode';

const testEnv = functionsTest();
const wrapped = testEnv.wrap(createAccessCode);

describe('createAccessCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdd.mockResolvedValue({ id: 'generated-doc-id' });
  });

  it('should throw permission-denied for non-admin caller', async () => {
    await expect(
      wrapped({ data: { role: 'student' }, auth: { uid: 'user1', token: { role: 'student' } } })
    ).rejects.toThrow('Admin access required');
  });

  it('should throw permission-denied when auth is missing', async () => {
    await expect(
      wrapped({ data: { role: 'student' } })
    ).rejects.toThrow('Admin access required');
  });

  it('should throw invalid-argument when role is missing', async () => {
    await expect(
      wrapped({ data: {}, auth: { uid: 'admin1', token: { role: 'admin' } } })
    ).rejects.toThrow('Valid role required');
  });

  it('should throw invalid-argument for invalid role value', async () => {
    await expect(
      wrapped({ data: { role: 'superuser' }, auth: { uid: 'admin1', token: { role: 'admin' } } })
    ).rejects.toThrow('Valid role required');
  });

  it('should return code in XXXX-XXXX format for student role', async () => {
    const result = await wrapped({
      data: { role: 'student' },
      auth: { uid: 'admin1', token: { role: 'admin' } },
    });

    expect(result.success).toBe(true);
    expect(result.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(result.code.length).toBe(9);
    expect(result.codeId).toBe('generated-doc-id');
    expect(result.role).toBe('student');
  });

  it('should set 30-day expiration for student code', async () => {
    const before = Date.now();
    const result = await wrapped({
      data: { role: 'student' },
      auth: { uid: 'admin1', token: { role: 'admin' } },
    });
    const after = Date.now();

    expect(result.expiresAt).not.toBeNull();
    const expiresMs = new Date(result.expiresAt).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(expiresMs).toBeGreaterThanOrEqual(before + thirtyDaysMs);
    expect(expiresMs).toBeLessThanOrEqual(after + thirtyDaysMs);
  });

  it('should set null expiration for admin code', async () => {
    const result = await wrapped({
      data: { role: 'admin' },
      auth: { uid: 'admin1', token: { role: 'admin' } },
    });

    expect(result.expiresAt).toBeNull();
  });

  it('should set null expiration for teacher code', async () => {
    const result = await wrapped({
      data: { role: 'teacher' },
      auth: { uid: 'admin1', token: { role: 'admin' } },
    });

    expect(result.expiresAt).toBeNull();
  });

  it('should only use allowed characters (no I, O, 0, 1)', async () => {
    const disallowed = /[IO01]/;

    // Run multiple times to increase confidence
    for (let i = 0; i < 10; i++) {
      const result = await wrapped({
        data: { role: 'student' },
        auth: { uid: 'admin1', token: { role: 'admin' } },
      });
      const codeChars = result.code.replace('-', '');
      expect(codeChars).not.toMatch(disallowed);
    }
  });
});
