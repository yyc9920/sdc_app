import { useState, useEffect, useRef } from 'react';

interface UseAudioProps {
  audioUrl: string;
  repeatCount: number;
  isPlaying: boolean;
  onComplete: () => void;
}

export const useAudio = ({ audioUrl, repeatCount, isPlaying, onComplete }: UseAudioProps) => {
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repeatRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentRepeat(0);
    repeatRef.current = 0;
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [audioUrl]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    const audio = audioRef.current;
    
    const handleEnded = () => {
      if (repeatRef.current + 1 < repeatCount) {
        repeatRef.current += 1;
        setCurrentRepeat(repeatRef.current);
        
        timeoutRef.current = window.setTimeout(() => {
          timeoutRef.current = null;
          audio.currentTime = 0;
          if (isPlaying) {
            audio.play().catch(e => console.error("Audio playback failed", e));
          }
        }, 800);
      } else {
        onCompleteRef.current();
      }
    };

    audio.addEventListener('ended', handleEnded);
    
    if (audio.src !== window.location.origin + audioUrl && audio.src !== audioUrl) {
      audio.src = audioUrl;
      audio.load();
    }

    if (isPlaying) {
      if (audio.paused && !timeoutRef.current) {
        if (audio.ended) {
          audio.currentTime = 0;
        }
        audio.play().catch(e => {
          console.error("Audio playback failed", e);
          if (e.name !== 'AbortError') {
            onCompleteRef.current();
          }
        });
      }
    } else {
      audio.pause();
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl, repeatCount, isPlaying]);

  return { currentRepeat };
};
