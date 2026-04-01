import { useState, useRef, useCallback, useEffect } from 'react';
import { getStorageUrl } from '../firebase';
import { SPEEDS, AUDIO_PATHS, getTTSPath } from '../constants';
import type { Voice } from '../constants';

export type AudioState = 
  | 'IDLE'
  | 'ANNOUNCEMENT'
  | 'PLAYING_SENTENCE'
  | 'TRANSITION'
  | 'FINISHED'
  | 'REVIEW';

interface UseSpeedListeningAudioProps {
  datasetId: string;
  sentences: Array<{ id: number }>;
  sentenceVoices: Record<number, Voice>;
  onFinished?: () => void;
}

interface UseSpeedListeningAudioReturn {
  audioState: AudioState;
  currentSpeedIndex: number;
  currentSentenceIndex: number;
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  play: () => void;
  pause: () => void;
  startReview: () => void;
  reset: () => void;
  handleAudioEnded: () => void;
  currentSpeed: number;
}

export const useSpeedListeningAudio = ({
  datasetId,
  sentences,
  sentenceVoices,
  onFinished,
}: UseSpeedListeningAudioProps): UseSpeedListeningAudioReturn => {
  const [audioState, setAudioState] = useState<AudioState>('ANNOUNCEMENT');
  const [currentSpeedIndex, setCurrentSpeedIndex] = useState(0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioSrcRef = useRef<string>('');

  const handleAudioEnded = useCallback(() => {
    switch (audioState) {
      case 'ANNOUNCEMENT':
        setAudioState('PLAYING_SENTENCE');
        break;
      
      case 'TRANSITION':
        setCurrentSentenceIndex(0);
        setCurrentSpeedIndex(prev => prev + 1);
        setAudioState('PLAYING_SENTENCE');
        break;
      
      case 'PLAYING_SENTENCE':
        if (currentSentenceIndex < sentences.length - 1) {
          setCurrentSentenceIndex(prev => prev + 1);
        } else if (currentSpeedIndex < SPEEDS.length - 1) {
          setAudioState('TRANSITION');
        } else {
          setAudioState('FINISHED');
          setIsPlaying(false);
          onFinished?.();
        }
        break;
      
      case 'REVIEW':
        if (currentSentenceIndex < sentences.length - 1) {
          setCurrentSentenceIndex(prev => prev + 1);
        } else {
          setAudioState('FINISHED');
          setIsPlaying(false);
        }
        break;
      
      default:
        break;
    }
  }, [audioState, currentSentenceIndex, sentences.length, currentSpeedIndex, onFinished]);

  useEffect(() => {
    let isCancelled = false;

    const updateAudio = async () => {
      if (!isPlaying || !audioRef.current) {
        if (audioRef.current) audioRef.current.pause();
        return;
      }

      let targetPath = '';
      let targetRate = 1.0;

      switch (audioState) {
        case 'ANNOUNCEMENT':
          targetPath = AUDIO_PATHS.ANNOUNCEMENT;
          targetRate = 1.0;
          break;
        
        case 'TRANSITION':
          targetPath = AUDIO_PATHS.TRANSITION_CHIME;
          targetRate = 1.0;
          break;
        
        case 'PLAYING_SENTENCE': {
          const sentence = sentences[currentSentenceIndex];
          if (!sentence) return;
          const voice = sentenceVoices[sentence.id] || 'female';
          targetPath = getTTSPath(datasetId, voice as Voice, sentence.id);
          targetRate = SPEEDS[currentSpeedIndex];
          break;
        }
        
        case 'REVIEW': {
          const sentence = sentences[currentSentenceIndex];
          if (!sentence) return;
          const voice = sentenceVoices[sentence.id] || 'female';
          targetPath = getTTSPath(datasetId, voice as Voice, sentence.id);
          targetRate = 1.0;
          break;
        }
        
        default:
          return;
      }

      const targetSrc = await getStorageUrl(targetPath);
      if (isCancelled || !audioRef.current) return;

      if (currentAudioSrcRef.current !== targetSrc) {
        audioRef.current.src = targetSrc;
        currentAudioSrcRef.current = targetSrc;
      }

      audioRef.current.playbackRate = targetRate;

      audioRef.current.play().catch(e => {
        if (e.name !== 'AbortError') {
          console.error('Audio play failed', e);
          handleAudioEnded();
        }
      });
    };

    updateAudio();

    return () => {
      isCancelled = true;
    };
  }, [isPlaying, audioState, currentSentenceIndex, currentSpeedIndex, datasetId, sentences, sentenceVoices, handleAudioEnded]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const startReview = useCallback(() => {
    setCurrentSpeedIndex(0);
    setCurrentSentenceIndex(0);
    setAudioState('REVIEW');
    currentAudioSrcRef.current = '';
    setIsPlaying(true);
  }, []);

  const reset = useCallback(() => {
    setAudioState('ANNOUNCEMENT');
    setCurrentSpeedIndex(0);
    setCurrentSentenceIndex(0);
    setIsPlaying(true);
    currentAudioSrcRef.current = '';
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, []);

  return {
    audioState,
    currentSpeedIndex,
    currentSentenceIndex,
    isPlaying,
    audioRef,
    play,
    pause,
    startReview,
    reset,
    handleAudioEnded,
    currentSpeed: SPEEDS[currentSpeedIndex],
  };
};
