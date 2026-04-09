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
  // Single reusable Audio element — mobile browsers silently fail when
  // too many new Audio() elements are created in rapid sequence.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechServiceRef = useRef(createSpeechService());
  // Promise that resolves when the current audio finishes.
  // Created inside play() BEFORE audio.play() — guarantees no event gap.
  const audioEndedRef = useRef<Promise<void>>(Promise.resolve());
  // Manual resolve for stop() to break the waitForEnd() promise
  const audioEndedResolveRef = useRef<(() => void) | null>(null);

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

      // Reuse a single Audio element for mobile compatibility
      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio();
        audioRef.current = audio;
      }
      audio.pause();

      audio.src = url;
      audio.playbackRate = speed;

      // Create ended promise BEFORE play() — no gap between listener and playback start
      audioEndedRef.current = new Promise<void>(resolve => {
        audioEndedResolveRef.current = resolve;
        const onDone = () => {
          audio.removeEventListener('ended', onDone);
          audio.removeEventListener('error', onDone);
          audioEndedResolveRef.current = null;
          setIsPlaying(false);
          resolve();
        };
        audio.addEventListener('ended', onDone, { once: true });
        audio.addEventListener('error', onDone, { once: true });
      });

      setIsPlaying(true);
      await audio.play();
    },
    [getVoiceForRow, speed],
  );

  const playSequence = useCallback(
    async (rows: TrainingRow[]) => {
      for (const row of rows) {
        await play(row);
        await audioEndedRef.current;
      }
    },
    [play],
  );

  // Returns a promise that resolves when the current audio finishes.
  const waitForEnd = useCallback((): Promise<void> => {
    return audioEndedRef.current;
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    // Resolve any pending waitForEnd() promise
    if (audioEndedResolveRef.current) {
      audioEndedResolveRef.current();
      audioEndedResolveRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const requestMicPermission = useCallback(async () => {
    const service = speechServiceRef.current;
    return service.requestPermission();
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
    requestMicPermission,
    startRecording,
    stopRecording,
    transcript,
    isRecording,
    speakerVoiceMap,
  };
}
