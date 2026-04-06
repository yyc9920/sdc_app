import { describe, it, expect, beforeEach } from 'vitest';
import { mockCapacitor } from '../../test/mocks/capacitor';
import { isMobileBrowser } from '../platform';

describe('isMobileBrowser', () => {
  beforeEach(() => {
    mockCapacitor.setNative(false);
  });

  it('returns false on native platform', () => {
    mockCapacitor.setNative(true);
    expect(isMobileBrowser()).toBe(false);
  });

  it('returns true for Android user agent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
      configurable: true,
    });
    expect(isMobileBrowser()).toBe(true);
  });

  it('returns true for iPhone user agent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      configurable: true,
    });
    expect(isMobileBrowser()).toBe(true);
  });

  it('returns false for desktop Chrome user agent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
      configurable: true,
    });
    // Ensure no touch support for pure desktop
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });
    expect(isMobileBrowser()).toBe(false);
  });

  it('detects iPadOS (desktop UA with touch support)', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
    // ontouchstart must be on window
    Object.defineProperty(window, 'ontouchstart', { value: null, configurable: true });
    expect(isMobileBrowser()).toBe(true);
  });

  it('returns false for desktop Mac without touch', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });
    delete (window as unknown as Record<string, unknown>).ontouchstart;
    expect(isMobileBrowser()).toBe(false);
  });
});
