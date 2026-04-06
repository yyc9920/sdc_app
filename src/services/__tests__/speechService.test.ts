import { describe, it, expect, beforeEach } from 'vitest';
import { mockCapacitor } from '../../test/mocks/capacitor';

// Mock the Capacitor speech recognition plugin
vi.mock('@capacitor-community/speech-recognition', () => ({
  SpeechRecognition: {
    available: vi.fn().mockResolvedValue({ available: true }),
    requestPermissions: vi.fn().mockResolvedValue({ speechRecognition: 'granted' }),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    addListener: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

import { createSpeechService } from '../speechService';

describe('createSpeechService', () => {
  beforeEach(() => {
    mockCapacitor.setNative(false);
  });

  it('returns a service object with required methods', () => {
    const service = createSpeechService();
    expect(service.isAvailable).toBeTypeOf('function');
    expect(service.requestPermission).toBeTypeOf('function');
    expect(service.startListening).toBeTypeOf('function');
    expect(service.stopListening).toBeTypeOf('function');
    expect(service.onResult).toBeTypeOf('function');
    expect(service.onError).toBeTypeOf('function');
    expect(service.removeAllListeners).toBeTypeOf('function');
  });

  it('web service: isAvailable returns false when no SpeechRecognition', async () => {
    mockCapacitor.setNative(false);
    // jsdom doesn't have SpeechRecognition
    const service = createSpeechService();
    const available = await service.isAvailable();
    expect(available).toBe(false);
  });

  it('web service: isAvailable returns true when SpeechRecognition exists', async () => {
    mockCapacitor.setNative(false);
    // Simulate Chrome's SpeechRecognition
    (window as Record<string, unknown>).webkitSpeechRecognition = class {};
    const service = createSpeechService();
    const available = await service.isAvailable();
    expect(available).toBe(true);
    delete (window as Record<string, unknown>).webkitSpeechRecognition;
  });

  it('native service: delegates to Capacitor plugin', async () => {
    mockCapacitor.setNative(true);
    const service = createSpeechService();
    const available = await service.isAvailable();
    expect(available).toBe(true); // mocked to return true
  });
});
