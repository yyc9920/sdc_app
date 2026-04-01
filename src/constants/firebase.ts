export const FIREBASE_REGION = 'asia-northeast3';

export const EMULATOR_PORTS = {
  AUTH: 9099,
  FIRESTORE: 8080,
  FUNCTIONS: 5001,
  STORAGE: 9199,
} as const;

export const FIREBASE_ERROR_CODES = {
  NOT_FOUND: 'not-found',
  PERMISSION_DENIED: 'permission-denied',
  UNAUTHENTICATED: 'unauthenticated',
  INVALID_ARGUMENT: 'invalid-argument',
  ALREADY_EXISTS: 'already-exists',
  RESOURCE_EXHAUSTED: 'resource-exhausted',
  CANCELLED: 'cancelled',
  UNAVAILABLE: 'unavailable',
} as const;

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  [FIREBASE_ERROR_CODES.NOT_FOUND]: 'Invalid access code.',
  [FIREBASE_ERROR_CODES.PERMISSION_DENIED]: 'Access denied. Please contact your administrator.',
  [FIREBASE_ERROR_CODES.UNAUTHENTICATED]: 'Please log in to continue.',
  default: 'Login failed. Please check your code and try again.',
};

export const getAuthErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    for (const [code, message] of Object.entries(AUTH_ERROR_MESSAGES)) {
      if (code !== 'default' && error.message.includes(code)) {
        if (code === FIREBASE_ERROR_CODES.PERMISSION_DENIED && error.message !== code) {
          return error.message;
        }
        return message;
      }
    }
  }
  return AUTH_ERROR_MESSAGES.default;
};
