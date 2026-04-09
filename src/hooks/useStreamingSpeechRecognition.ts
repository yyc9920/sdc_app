import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { createSpeechService } from '../services/speechService';

interface UseStreamingSpeechRecognitionOptions {
  onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  lang?: string;
}

const speechService = createSpeechService();

export const useStreamingSpeechRecognition = (options: UseStreamingSpeechRecognitionOptions = {}) => {
  const { onTranscriptUpdate, lang = 'en-US' } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [supportError, setSupportError] = useState('');
  const [micError, setMicError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const onTranscriptUpdateRef = useRef(onTranscriptUpdate);
  const fullTranscriptRef = useRef('');
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    onTranscriptUpdateRef.current = onTranscriptUpdate;
  }, [onTranscriptUpdate]);

  // Check availability on mount
  useEffect(() => {
    speechService.isAvailable().then(available => {
      if (!available) {
        setSupportError('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해주세요.');
      }
    });
  }, []);

  // Set up speech service listeners
  useEffect(() => {
    speechService.onResult((result) => {
      if (result.matches.length > 0) {
        const text = result.matches[0];
        fullTranscriptRef.current = text;
        setTranscript(text);
        onTranscriptUpdateRef.current?.(text, result.isFinal);
      }
      if (result.isFinal && result.matches.length === 0) {
        // Recognition ended naturally
        setIsRecording(false);
      }
    });

    speechService.onError((error) => {
      console.error('Speech recognition error:', error);
      setIsRecording(false);
      if (error === 'not-allowed') {
        setMicError('마이크 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.');
      } else {
        setMicError('음성 인식 오류가 발생했습니다. 다시 시도해주세요.');
      }
    });

    return () => {
      speechService.removeAllListeners();
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    setTranscript('');
    setMicError('');
    fullTranscriptRef.current = '';
    audioChunksRef.current = [];

    try {
      // Request permission if needed (especially important on native)
      const granted = await speechService.requestPermission();
      if (!granted) {
        setMicError('마이크 권한이 거부되었습니다. 설정에서 허용해주세요.');
        return;
      }

      // Start speech recognition
      speechService.startListening(lang);
      setIsRecording(true);

      // Start audio recording for playback (skip on native - getUserMedia unavailable in WKWebView)
      if (!Capacitor.isNativePlatform() && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);
            stream.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          };

          setAudioUrl(null);
          mediaRecorder.start();
        } catch (e) {
          console.warn('Audio recording not available:', e);
        }
      }
    } catch (e) {
      console.error('Failed to start recording:', e);
      setMicError('마이크에 접근할 수 없습니다. 권한을 확인해주세요.');
    }
  }, [isRecording, lang]);

  const stopRecording = useCallback(() => {
    speechService.stopListening();
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const retryRecording = useCallback(async () => {
    setMicError('');
    await startRecording();
  }, [startRecording]);

  const playRecording = useCallback((): Promise<void> => {
    if (!audioUrl) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const audio = new Audio(audioUrl);
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
  }, [audioUrl]);

  const reset = useCallback(() => {
    setTranscript('');
    setAudioUrl(null);
    setMicError('');
    fullTranscriptRef.current = '';
    audioChunksRef.current = [];
  }, []);

  return {
    isRecording,
    transcript,
    audioUrl,
    supportError,
    micError,
    startRecording,
    stopRecording,
    retryRecording,
    playRecording,
    reset,
  };
};
