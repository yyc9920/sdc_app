import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

export interface SpeechListenerResult {
  matches: string[];
  isFinal: boolean;
}

type SpeechListener = (result: SpeechListenerResult) => void;
type ErrorListener = (error: string) => void;

interface SpeechService {
  isAvailable(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  startListening(lang: string): void;
  stopListening(): void;
  onResult(cb: SpeechListener): void;
  onError(cb: ErrorListener): void;
  removeAllListeners(): void;
}

// ─── Native implementation (iOS / Android) ───────────────────────────────────

function createNativeService(): SpeechService {
  let resultCb: SpeechListener | null = null;
  let errorCb: ErrorListener | null = null;

  return {
    async isAvailable() {
      try {
        const { available } = await SpeechRecognition.available();
        console.log('[SpeechService] Native available:', available);
        return available;
      } catch (e) {
        console.error('[SpeechService] Native available check failed:', e);
        return false;
      }
    },

    async requestPermission() {
      try {
        const status = await SpeechRecognition.requestPermissions();
        console.log('[SpeechService] Permission status:', status);
        return status.speechRecognition === 'granted';
      } catch (e) {
        console.error('[SpeechService] Permission request failed:', e);
        return false;
      }
    },

    startListening(lang: string) {
      SpeechRecognition.start({
        language: lang,
        partialResults: true,
        popup: false,
      }).catch((e: Error) => {
        errorCb?.(e.message || 'Speech recognition failed to start');
      });

      SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        resultCb?.({ matches: data.matches, isFinal: false });
      });

      SpeechRecognition.addListener('listeningState', (data: { status: 'started' | 'stopped' }) => {
        if (data.status === 'stopped') {
          resultCb?.({ matches: [], isFinal: true });
        }
      });
    },

    stopListening() {
      SpeechRecognition.stop();
    },

    onResult(cb: SpeechListener) {
      resultCb = cb;
    },

    onError(cb: ErrorListener) {
      errorCb = cb;
    },

    removeAllListeners() {
      resultCb = null;
      errorCb = null;
      SpeechRecognition.removeAllListeners();
    },
  };
}

// ─── Web fallback implementation (Chrome Web Speech API) ─────────────────────

interface WebSpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface WebSpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface WindowWithSpeech extends Window {
  SpeechRecognition?: new () => WebSpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => WebSpeechRecognitionInstance;
}

function createWebService(): SpeechService {
  let recognition: WebSpeechRecognitionInstance | null = null;
  let resultCb: SpeechListener | null = null;
  let errorCb: ErrorListener | null = null;

  function getRecognition(): WebSpeechRecognitionInstance | null {
    if (recognition) return recognition;
    const win = window as WindowWithSpeech;
    const Ctor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Ctor) return null;
    recognition = new Ctor();
    return recognition;
  }

  return {
    async isAvailable() {
      const win = window as WindowWithSpeech;
      return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
    },

    async requestPermission() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        return true;
      } catch {
        return false;
      }
    },

    startListening(lang: string) {
      const rec = getRecognition();
      if (!rec) {
        errorCb?.('이 브라우저는 음성 인식을 지원하지 않습니다.');
        return;
      }

      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = lang;

      rec.onresult = (event: WebSpeechRecognitionEvent) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const text = final + interim;
        const isFinal = final.length > 0 && interim.length === 0;
        resultCb?.({ matches: [text], isFinal });
      };

      rec.onerror = (event: { error: string }) => {
        if (event.error !== 'no-speech') {
          errorCb?.(event.error);
        }
      };

      rec.onend = () => {
        resultCb?.({ matches: [], isFinal: true });
      };

      rec.start();
    },

    stopListening() {
      recognition?.stop();
    },

    onResult(cb: SpeechListener) {
      resultCb = cb;
    },

    onError(cb: ErrorListener) {
      errorCb = cb;
    },

    removeAllListeners() {
      resultCb = null;
      errorCb = null;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
      }
    },
  };
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createSpeechService(): SpeechService {
  const isNative = Capacitor.isNativePlatform();
  console.log('[SpeechService] Platform:', Capacitor.getPlatform(), 'isNative:', isNative);
  if (isNative) {
    return createNativeService();
  }
  return createWebService();
}
