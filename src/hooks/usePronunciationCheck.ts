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

/**
 * Custom hook for real-time pronunciation checking using the Web Speech API.
 * Handles speech recognition, audio recording, and scoring based on a target sentence.
 * 
 * @param {string} targetSentence - The English sentence the user is expected to say.
 * @returns {Object} State and functions for managing recording and evaluation.
 */
export const usePronunciationCheck = (targetSentence: string) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [wordStatuses, setWordStatuses] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [supportError, setSupportError] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const targetWords = useMemo(() => targetSentence.split(' '), [targetSentence]);

  /**
   * Resets all internal states for a fresh recording session.
   */
  const resetState = useCallback(() => {
    setTranscript('');
    setWordStatuses([]);
    setIsFinished(false);
    setScore(0);
    setAudioUrl(null);
    audioChunksRef.current = [];
  }, []);

  /**
   * Compares spoken text against the target sentence and updates word statuses.
   * 
   * @param {string} spokenText - The transcript from the speech recognition.
   * @param {boolean} [markFinished=true] - Whether to finalize the evaluation.
   * @returns {number} The calculated accuracy score (0-100).
   */
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

  /**
   * Initiates both speech recognition and raw audio recording.
   */
  const startRecording = useCallback(async () => {
    if (isRecording) return;
    setWordStatuses(new Array(targetWords.length).fill('pending'));
    setIsFinished(false);
    setTranscript('');
    setAudioUrl(null);
    audioChunksRef.current = [];
    
    try {
      recognitionRef.current?.start();
      
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
      console.error('Failed to start recording', e);
    }
  }, [isRecording, targetWords]);

  /**
   * Stops recognition and audio recording.
   */
  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  /**
   * Toggles the recording state.
   */
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  /**
   * Plays back the captured user audio.
   */
  const playRecording = useCallback(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(console.error);
    }
  }, [audioUrl]);

  useEffect(() => {
    if (!isRecording && transcript && !isFinished) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      evaluatePronunciation(transcript, true);
    }
  }, [isRecording, transcript, isFinished, evaluatePronunciation]);

  /**
   * Triggers the native browser Text-to-Speech to read the target sentence.
   */
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
