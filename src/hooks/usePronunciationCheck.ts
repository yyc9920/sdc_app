import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (event: Event) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: { error: string }) => void;
  onend: (event: Event) => void;
  start(): void;
  stop(): void;
  abort(): void;
}

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

export const usePronunciationCheck = (targetSentence: string) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [wordStatuses, setWordStatuses] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [supportError, setSupportError] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const targetWords = useMemo(() => targetSentence.split(' '), [targetSentence]);

  const resetState = useCallback(() => {
    setTranscript('');
    setWordStatuses([]);
    setIsFinished(false);
    setScore(0);
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
    
    if (newScore === 100) {
      recognitionRef.current?.stop();
      setIsFinished(true);
    } else if (markFinished) {
      setIsFinished(true);
    }
    
    return newScore;
  }, [targetWords]);

  useEffect(() => {
    recognitionRef.current?.stop();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetState();
  }, [targetSentence, resetState]);

  useEffect(() => {
    const win = window as WindowWithSpeechRecognition;
    const SpeechRecognitionConstructor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupportError("This browser does not support speech recognition. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript('');
      setIsFinished(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const currentTranscript = finalTranscript + interimTranscript;
      setTranscript(currentTranscript);
      
      // Real-time evaluation
      evaluatePronunciation(currentTranscript, false);
    };

    recognition.onerror = (event: { error: string }) => {
      console.error('Speech recognition error', event.error);
      if (event.error !== 'no-speech') {
         setIsRecording(false);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    
    return () => {
      recognitionRef.current?.abort();
    };
  }, [evaluatePronunciation]);

  const startRecording = useCallback(() => {
    if (isRecording) return;
    setWordStatuses(new Array(targetWords.length).fill('pending'));
    setIsFinished(false);
    setTranscript('');
    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.error('Failed to start recognition', e);
    }
  }, [isRecording, targetWords]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      startRecording();
    }
  };
  
  useEffect(() => {
    if (!isRecording && transcript && !isFinished) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      evaluatePronunciation(transcript, true);
    }
  }, [isRecording, transcript, isFinished, evaluatePronunciation]);

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
    toggleRecording,
    startRecording,
    speakSentence,
    resetState,
  };
};
