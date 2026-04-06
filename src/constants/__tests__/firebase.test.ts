import { describe, it, expect } from 'vitest';
import { getAuthErrorMessage, AUTH_ERROR_MESSAGES } from '../firebase';

describe('getAuthErrorMessage', () => {
  it('error with "not-found" returns mapped message', () => {
    const error = new Error('not-found');
    expect(getAuthErrorMessage(error)).toBe('Invalid access code.');
  });

  it('error with "unauthenticated" returns mapped message', () => {
    const error = new Error('unauthenticated');
    expect(getAuthErrorMessage(error)).toBe('Please log in to continue.');
  });

  it('error with exact "permission-denied" returns mapped message', () => {
    const error = new Error('permission-denied');
    expect(getAuthErrorMessage(error)).toBe('Access denied. Please contact your administrator.');
  });

  it('error with "permission-denied" plus extra text returns error.message directly', () => {
    const error = new Error('permission-denied: Your code has expired');
    expect(getAuthErrorMessage(error)).toBe('permission-denied: Your code has expired');
  });

  it('non-Error object returns default message', () => {
    expect(getAuthErrorMessage('some string')).toBe(AUTH_ERROR_MESSAGES.default);
  });

  it('null returns default message', () => {
    expect(getAuthErrorMessage(null)).toBe(AUTH_ERROR_MESSAGES.default);
  });

  it('Error with unrecognized code returns default message', () => {
    const error = new Error('something-unknown');
    expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES.default);
  });
});
