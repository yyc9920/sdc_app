import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { getTTSAudioUrl } from '../../services/ttsService';
import { createSpeechService } from '../../services/speechService';
import type { TrainingRow, VoiceKey } from './types';
import { assignSpeakerVoices } from './dataAdapter';

const DEFAULT_VOICE: VoiceKey = 'female1';

interface UseTrainingAudioConfig {
  speakers: string[];
}

export function useTrainingAudio(config: UseTrainingAudioConfig) {
  const { speakers } = config;

  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechServiceRef = useRef(createSpeechService());

  const speakerVoiceMap = useMemo(
    () => assignSpeakerVoices(speakers),
    [speakers],
  );

  const getVoiceForRow = useCallback(
    (row: TrainingRow, overrideVoice?: VoiceKey): VoiceKey => {
      if (overrideVoice) return overrideVoice;
      if (row.speaker && speakerVoiceMap[row.speaker]) {
        return speakerVoiceMap[row.speaker];
      }
      return DEFAULT_VOICE;
    },
    [speakerVoiceMap],
  );

  const play = useCallback(
    async (row: TrainingRow, voice?: VoiceKey) => {
      const selectedVoice = getVoiceForRow(row, voice);
      const url = await getTTSAudioUrl(row.english, selectedVoice);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(url);
      audio.playbackRate = speed;
      audioRef.current = audio;

      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);

      await audio.play?.();
    },
    [getVoiceForRow, speed],
  );

  const playSequence = useCallback(
    async (rows: TrainingRow[]) => {
      for (const row of rows) {
        await play(row);
        // Wait for current audio to finish before playing next
        await new Promise<void>(resolve => {
          const audio = audioRef.current;
          if (!audio) { resolve(); return; }
          const onEnd = () => { audio.removeEventListener('ended', onEnd); resolve(); };
          if (audio.ended || audio.paused) { resolve(); return; }
          audio.addEventListener('ended', onEnd);
        });
      }
    },
    [play],
  );

  // Wait for the currently playing audio to finish (uses DOM events, not React state)
  const waitForEnd = useCallback((): Promise<void> => {
    return new Promise<void>(resolve => {
      const audio = audioRef.current;
      if (!audio || audio.ended || audio.paused) { resolve(); return; }
      const onDone = () => {
        audio.removeEventListener('ended', onDone);
        audio.removeEventListener('error', onDone);
        resolve();
      };
      audio.addEventListener('ended', onDone);
      audio.addEventListener('error', onDone);
    });
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    const service = speechServiceRef.current;
    setTranscript('');
    service.onResult(result => {
      if (result.matches.length > 0) {
        setTranscript(result.matches[0]);
      }
    });
    service.startListening('en-US');
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    speechServiceRef.current.stopListening();
    setIsRecording(false);
  }, []);

  useEffect(() => {
    const speechService = speechServiceRef.current;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      speechService.removeAllListeners();
    };
  }, []);

  return {
    play,
    playSequence,
    waitForEnd,
    stop,
    speed,
    setSpeed,
    isPlaying,
    startRecording,
    stopRecording,
    transcript,
    isRecording,
    speakerVoiceMap,
  };
}
