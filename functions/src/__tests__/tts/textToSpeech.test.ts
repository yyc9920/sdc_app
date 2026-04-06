import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSynthesizeSpeech } = vi.hoisted(() => ({
  mockSynthesizeSpeech: vi.fn(),
}));

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-functions/v2', () => ({ setGlobalOptions: vi.fn() }));
vi.mock('@google-cloud/text-to-speech', () => {
  class MockTextToSpeechClient {
    synthesizeSpeech = mockSynthesizeSpeech;
  }
  return {
    TextToSpeechClient: MockTextToSpeechClient,
    protos: {
      google: {
        cloud: {
          texttospeech: {
            v1: {},
          },
        },
      },
    },
  };
});

import functionsTest from 'firebase-functions-test';
import { textToSpeech } from '../../tts/textToSpeech';

const testEnv = functionsTest();

describe('textToSpeech', () => {
  const wrapped = testEnv.wrap(textToSpeech);

  beforeEach(() => {
    vi.clearAllMocks();
    mockSynthesizeSpeech.mockResolvedValue([{
      audioContent: Buffer.from('test-audio'),
    }]);
  });

  it('throws unauthenticated when no auth', async () => {
    await expect(
      wrapped({ data: { text: 'hello', voiceKey: 'female' } })
    ).rejects.toThrow(/Authentication required/);
  });

  it('throws invalid-argument for missing text', async () => {
    await expect(
      wrapped({ data: { voiceKey: 'female' }, auth: { uid: 'u1' } })
    ).rejects.toThrow(/Missing or invalid text/);
  });

  it('throws invalid-argument for empty text', async () => {
    await expect(
      wrapped({ data: { text: '', voiceKey: 'female' }, auth: { uid: 'u1' } })
    ).rejects.toThrow(/Missing or invalid text/);
  });

  it('throws invalid-argument for text > 500 characters', async () => {
    const longText = 'a'.repeat(501);
    await expect(
      wrapped({ data: { text: longText, voiceKey: 'female' }, auth: { uid: 'u1' } })
    ).rejects.toThrow(/Text too long/);
  });

  it('throws invalid-argument for invalid voiceKey', async () => {
    await expect(
      wrapped({ data: { text: 'hello', voiceKey: 'robot' }, auth: { uid: 'u1' } })
    ).rejects.toThrow(/Invalid voiceKey/);
  });

  it('returns base64 audio for valid request', async () => {
    const result = await wrapped({
      data: { text: 'Hello world', voiceKey: 'female' },
      auth: { uid: 'u1' },
    });

    expect(result).toHaveProperty('audio');
    expect(typeof result.audio).toBe('string');
    expect(mockSynthesizeSpeech).toHaveBeenCalledTimes(1);
  });

  it('accepts all valid voice keys', async () => {
    const validKeys = ['female', 'male', 'child_female', 'child_male', 'elderly_female', 'elderly_male', 'korean_female', 'korean_male'];

    for (const voiceKey of validKeys) {
      const result = await wrapped({
        data: { text: 'test', voiceKey },
        auth: { uid: 'u1' },
      });
      expect(result).toHaveProperty('audio');
    }
  });
});
