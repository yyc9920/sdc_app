import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { createSpeechService } from '../services/speechService';

const speechService = createSpeechService();

export const usePronunciationCheck = (targetSentence: string) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [wordStatuses, setWordStatuses] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [supportError, setSupportError] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const targetWords = useMemo(() => targetSentence.split(' '), [targetSentence]);

  const resetState = useCallback(() => {
    setTranscript('');
    setWordStatuses([]);
    setIsFinished(false);
    setScore(0);
    setAudioUrl(null);
    audioChunksRef.current = [];
  }, []);

  const evaluatePronunciation = useCallback((spokenText: string, markFinished: boolean = true) => {
    const spokenClean = spokenText.toLowerCase().replace(/[.,!?]/g, '').split(/\s+/);
    let lastFoundIdx = -1;

    const newStatuses = targetWords.map((tWord: string) => {
      const tClean = tWord.toLowerCase().replace(/[.,!?]/g, '');
      const foundIdx = spokenClean.findIndex((sWord: string, idx: number) => idx > lastFoundIdx && sWord === tClean);

      if (foundIdx !== -1) {
        lastFoundIdx = foundIdx;
        return 'correct';
      } else {
        return markFinished ? 'incorrect' : 'pending';
      }
    });

    setWordStatuses(newStatuses);
    const correctCount = newStatuses.filter((s: string) => s === 'correct').length;
    const newScore = Math.round((correctCount / targetWords.length) * 100);
    setScore(newScore);

    if (newScore === 100 || markFinished) {
      setIsFinished(true);
    }

    return newScore;
  }, [targetWords]);

  useEffect(() => {
    resetState();
  }, [targetSentence, resetState]);

  // Check availability on mount
  useEffect(() => {
    speechService.isAvailable().then(available => {
      if (!available) {
        setSupportError('음성 인식을 사용할 수 없습니다.');
      }
    });
  }, []);

  // Set up speech service listeners
  useEffect(() => {
    speechService.onResult((result) => {
      if (result.matches.length > 0) {
        const text = result.matches[0];
        setTranscript(text);
        evaluatePronunciation(text, result.isFinal);
      }
      if (result.isFinal && result.matches.length === 0) {
        setIsRecording(false);
      }
    });

    speechService.onError((error) => {
      console.error('Speech recognition error:', error);
      setIsRecording(false);
    });

    return () => {
      speechService.removeAllListeners();
    };
  }, [evaluatePronunciation]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    setWordStatuses(new Array(targetWords.length).fill('pending'));
    setIsFinished(false);
    setTranscript('');
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const granted = await speechService.requestPermission();
      if (!granted) {
        setSupportError('마이크 권한이 거부되었습니다. 설정에서 허용해주세요.');
        return;
      }

      speechService.startListening('en-US');
      setIsRecording(true);

      // Audio recording for playback - skip on native if getUserMedia unavailable
      if (!Capacitor.isNativePlatform() && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
          };

          mediaRecorder.start();
        } catch (e) {
          console.warn('Audio recording not available:', e);
        }
      }
    } catch (e) {
      console.error('Failed to start recording', e);
    }
  }, [isRecording, targetWords]);

  const stopRecording = useCallback(() => {
    speechService.stopListening();
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const playRecording = useCallback(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(console.error);
    }
  }, [audioUrl]);

  const speakSentence = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(targetSentence);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return {
    isRecording,
    transcript,
    wordStatuses,
    isFinished,
    score,
    supportError,
    audioUrl,
    toggleRecording,
    startRecording,
    stopRecording,
    playRecording,
    speakSentence,
    resetState,
  };
};
