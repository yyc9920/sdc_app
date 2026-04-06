import { vi } from 'vitest';

// Mock firebase-admin
vi.mock('firebase-admin/firestore', () => {
  const mockTimestamp = {
    now: vi.fn(() => ({ toDate: () => new Date(), seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: vi.fn((date: Date) => ({ toDate: () => date, seconds: date.getTime() / 1000, nanoseconds: 0 })),
  };

  return {
    getFirestore: vi.fn(() => ({
      collection: vi.fn(),
      doc: vi.fn(),
      runTransaction: vi.fn(),
      batch: vi.fn(),
    })),
    FieldValue: {
      serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
      increment: vi.fn((n: number) => ({ __increment: n })),
      delete: vi.fn(() => ({ __delete: true })),
    },
    Timestamp: mockTimestamp,
  };
});

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    createUser: vi.fn(),
    createCustomToken: vi.fn(),
    setCustomUserClaims: vi.fn(),
    getUser: vi.fn(),
  })),
}));

vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  credential: {
    applicationDefault: vi.fn(),
  },
}));
