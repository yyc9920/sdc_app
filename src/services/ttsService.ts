import { httpsCallable } from 'firebase/functions';
import { functions, getStorageUrl } from '../firebase';
import { AUDIO_PATHS } from '../constants/audio';
import { TIMEOUTS } from '../constants/infiniteSpeaking';

const textToSpeechFn = httpsCallable<
  { text: string; voiceKey: string },
  { audio: string }
>(functions, 'textToSpeech');

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = TIMEOUTS.TTS_MAX_RETRIES,
  baseDelayMs: number = TIMEOUTS.TTS_BASE_DELAY_MS,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error('unreachable');
}

/** In-memory blob URL cache keyed by "voiceKey:text" */
const audioCache = new Map<string, string>();

/** Deduplication map for in-flight requests */
const pendingRequests = new Map<string, Promise<string>>();

export function base64ToBlobUrl(base64: string, mimeType = 'audio/mpeg'): string {
  const byteChars = atob(base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: mimeType });
  return URL.createObjectURL(blob);
}

/**
 * Generate TTS audio via Cloud Function and return a blob URL.
 * Results are cached in memory — same text+voice will return instantly.
 */
export async function getTTSAudioUrl(text: string, voiceKey: string): Promise<string> {
  const cacheKey = `${voiceKey}:${text}`;

  const cached = audioCache.get(cacheKey);
  if (cached) return cached;

  const pending = pendingRequests.get(cacheKey);
  if (pending) return pending;

  const promise = (async () => {
    const result = await withRetry(() => textToSpeechFn({ text, voiceKey }));
    const blobUrl = base64ToBlobUrl(result.data.audio);
    audioCache.set(cacheKey, blobUrl);
    return blobUrl;
  })();

  pendingRequests.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

/**
 * Fire-and-forget prefetch: loads audio into cache for future use.
 */
export function prefetchTTS(text: string, voiceKey: string): void {
  getTTSAudioUrl(text, voiceKey).catch(() => {});
}

/**
 * Prefetch a batch of sentences for a given voice.
 */
export function prefetchBatch(
  sentences: Array<{ text: string }>,
  voiceKey: string
): void {
  for (const s of sentences) {
    prefetchTTS(s.text, voiceKey);
  }
}

/**
 * Get static asset URL (announcement, transition chime, etc.).
 * These are NOT TTS — they're pre-stored files in Firebase Storage.
 */
export async function getStaticAudioUrl(
  pathKey: keyof typeof AUDIO_PATHS
): Promise<string> {
  const cacheKey = `static:${pathKey}`;
  const cached = audioCache.get(cacheKey);
  if (cached) return cached;

  const url = await getStorageUrl(AUDIO_PATHS[pathKey]);
  audioCache.set(cacheKey, url);
  return url;
}

/**
 * Clear all cached audio blob URLs (call on logout or memory pressure).
 */
export function clearTTSCache(): void {
  for (const url of audioCache.values()) {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
  audioCache.clear();
}
