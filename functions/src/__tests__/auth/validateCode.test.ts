import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb, mockAuth } = vi.hoisted(() => {
  const mockUpdate = vi.fn().mockResolvedValue(undefined);
  const mockSet = vi.fn().mockResolvedValue(undefined);
  const mockGet = vi.fn();
  const mockWhere = vi.fn();
  const mockLimit = vi.fn();
  const mockDoc = vi.fn(() => ({ set: mockSet }));
  const mockCollection = vi.fn(() => ({
    where: mockWhere,
    doc: mockDoc,
  }));

  mockWhere.mockReturnValue({ limit: mockLimit });
  mockLimit.mockReturnValue({ get: mockGet });

  const mockDb = {
    collection: mockCollection,
    _mockGet: mockGet,
    _mockWhere: mockWhere,
    _mockLimit: mockLimit,
    _mockDoc: mockDoc,
    _mockSet: mockSet,
    _mockUpdate: mockUpdate,
  };

  const mockAuth = {
    createUser: vi.fn().mockResolvedValue({ uid: 'new-uid-123' }),
    setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
    createCustomToken: vi.fn().mockResolvedValue('mock-custom-token'),
  };

  return { mockDb, mockAuth };
});

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-functions/v2', () => ({ setGlobalOptions: vi.fn() }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockDb),
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP') },
}));
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
}));

import functionsTest from 'firebase-functions-test';
import { validateCode } from '../../auth/validateCode';

const testEnv = functionsTest();

describe('validateCode', () => {
  const wrapped = testEnv.wrap(validateCode);

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock chains
    mockDb._mockWhere.mockReturnValue({ limit: mockDb._mockLimit });
    mockDb._mockLimit.mockReturnValue({ get: mockDb._mockGet });
  });

  it('throws invalid-argument for missing code', async () => {
    await expect(wrapped({ data: {} })).rejects.toThrow(/Code is required/);
  });

  it('throws invalid-argument for non-string code', async () => {
    await expect(wrapped({ data: { code: 123 } })).rejects.toThrow(/Code is required/);
  });

  it('throws not-found for non-existent code', async () => {
    mockDb._mockGet.mockResolvedValue({ empty: true, docs: [] });
    await expect(wrapped({ data: { code: 'ABCD-EFGH' } })).rejects.toThrow(/Invalid code/);
  });

  it('throws permission-denied for revoked code', async () => {
    mockDb._mockGet.mockResolvedValue({
      empty: false,
      docs: [{
        data: () => ({ status: 'revoked', role: 'student' }),
        ref: { update: mockDb._mockUpdate },
      }],
    });
    await expect(wrapped({ data: { code: 'ABCD-EFGH' } })).rejects.toThrow(/revoked/);
  });

  it('throws permission-denied for expired code', async () => {
    mockDb._mockGet.mockResolvedValue({
      empty: false,
      docs: [{
        data: () => ({
          status: 'available',
          role: 'student',
          expiresAt: { toDate: () => new Date('2020-01-01') },
        }),
        ref: { update: mockDb._mockUpdate },
      }],
    });
    await expect(wrapped({ data: { code: 'ABCD-EFGH' } })).rejects.toThrow(/expired/);
  });

  it('creates new user for unused code', async () => {
    mockDb._mockGet.mockResolvedValue({
      empty: false,
      docs: [{
        data: () => ({
          status: 'available',
          role: 'student',
          expiresAt: { toDate: () => new Date('2099-01-01') },
        }),
        ref: { update: mockDb._mockUpdate },
      }],
    });

    const result = await wrapped({ data: { code: 'ABCD-EFGH' } });
    expect(mockAuth.createUser).toHaveBeenCalled();
    expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('new-uid-123', { role: 'student' });
    expect(result).toHaveProperty('customToken', 'mock-custom-token');
    expect(result).toHaveProperty('role', 'student');
  });

  it('returns existing user for used code', async () => {
    mockDb._mockGet.mockResolvedValue({
      empty: false,
      docs: [{
        data: () => ({
          status: 'used',
          assignedTo: 'existing-uid',
          role: 'teacher',
          expiresAt: null,
        }),
        ref: { update: mockDb._mockUpdate },
      }],
    });

    const result = await wrapped({ data: { code: 'ABCD-EFGH' } });
    expect(mockAuth.createUser).not.toHaveBeenCalled();
    expect(mockAuth.createCustomToken).toHaveBeenCalledWith('existing-uid', { role: 'teacher' });
    expect(result.role).toBe('teacher');
  });

  it('sets custom claims with correct role', async () => {
    mockDb._mockGet.mockResolvedValue({
      empty: false,
      docs: [{
        data: () => ({
          status: 'available',
          role: 'teacher',
          expiresAt: null,
        }),
        ref: { update: mockDb._mockUpdate },
      }],
    });

    await wrapped({ data: { code: 'ABCD-EFGH' } });
    expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('new-uid-123', { role: 'teacher' });
  });
});
