import { vi } from 'vitest';

let _isNative = false;

export const mockCapacitor = {
  setNative: (value: boolean) => {
    _isNative = value;
  },
};

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => _isNative,
    getPlatform: () => (_isNative ? 'ios' : 'web'),
  },
}));
