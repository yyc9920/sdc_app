import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import {
  useTrainingData,
  useTrainingSession,
  useTrainingAudio,
  useTrainingProgress,
} from './training';
import type { TrainingRow, TrainingSession, VoiceKey } from './training';

export interface RepetitionGroup {
  prompt: TrainingRow | null;
  items: TrainingRow[];
}

const SPEAKER_COLORS = ['blue', 'rose', 'amber', 'emerald', 'violet', 'cyan'] as const;

// Exported for unit testing
export function computeGroups(allRows: TrainingRow[]): RepetitionGroup[] {
  const groups: RepetitionGroup[] = [];
  let current: RepetitionGroup = { prompt: null, items: [] };

  for (const row of allRows) {
    if (row.rowType === 'prompt') {
      // Push accumulated group before starting a new one (skip empty initial state)
      if (current.items.length > 0 || current.prompt !== null) {
        groups.push(current);
      }
      current = { prompt: row, items: [] };
    } else if (row.rowType === 'script' || row.rowType === 'reading') {
      current.items.push(row);
    }
    // Other row types (vocab, expression, meta, question, task) are skipped
  }

  if (current.items.length > 0 || current.prompt !== null) {
    groups.push(current);
  }

  return groups;
}

// Exported for unit testing
export function computeSpeakerColors(speakers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  speakers.forEach((speaker, i) => {
    map[speaker] = SPEAKER_COLORS[i % SPEAKER_COLORS.length];
  });
  return map;
}

export interface UseRepetitionReturn {
  groups: RepetitionGroup[];
  isLoading: boolean;
  error: string | null;
  ttsError: boolean;
  session: TrainingSession;
  currentRow: TrainingRow | null;
  isPlaying: boolean;
  isLoadingTTS: boolean;
  speakerVoiceMap: Record<string, VoiceKey>;
  speakerColors: Record<string, string>;
  speed: number;
  setSpeed: (s: number) => void;
  rowSeqToSessionIndex: Map<number, number>;
  playRow: (row: TrainingRow) => Promise<void>;
  stop: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  complete: () => void;
  reset: () => void;
  saveProgress: () => Promise<void>;
  rangeStart: number;
  rangeEnd: number;
  repeatTotal: number;
  repeatCurrent: number;
  isRangePlaying: boolean;
  setRangeStart: (n: number) => void;
  setRangeEnd: (n: number) => void;
  setRepeatTotal: (n: number) => void;
  playRange: () => Promise<void>;
  playLoop: (perSentenceRepeat: number, fromIdx?: number, toIdx?: number) => Promise<void>;
  stopRange: () => void;
}

export function useRepetition(setId: string): UseRepetitionReturn {
  const { rows, speakers, isLoading, error } = useTrainingData(setId);

  const sessionApi = useTrainingSession({
    setId,
    mode: 'repetition',
    allRows: rows,
  });

  // TTS: on-demand only (user tap or prev/next), max 1 concurrent via stop() before play()
  const audioApi = useTrainingAudio({ speakers });
  const progressApi = useTrainingProgress(sessionApi.session);

  const hasSavedRef = useRef(false);
  const [ttsError, setTtsError] = useState(false);

  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(-1); // -1 = use max
  const [repeatTotal, setRepeatTotal] = useState(1);
  const [repeatCurrent, setRepeatCurrent] = useState(0);
  const [isRangePlaying, setIsRangePlaying] = useState(false);
  const rangeAbortRef = useRef(false);

  // Stable refs for unmount cleanup — updated in effects (never during render)
  const sessionRef = useRef(sessionApi.session);
  const saveProgressRef = useRef(progressApi.saveProgress);

  useEffect(() => {
    sessionRef.current = sessionApi.session;
  }, [sessionApi.session]);

  useEffect(() => {
    saveProgressRef.current = progressApi.saveProgress;
  }, [progressApi.saveProgress]);

  // Save progress + result exactly once when session completes
  useEffect(() => {
    if (sessionApi.session.phase === 'complete' && !hasSavedRef.current) {
      hasSavedRef.current = true;
      progressApi.saveProgress().catch(console.error);
      progressApi.saveResult().catch(console.error);
    }
    if (sessionApi.session.phase === 'setup') {
      hasSavedRef.current = false;
    }
  }, [sessionApi.session.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save elapsed time on unmount — covers navigating away before session completes.
  // hasSavedRef guard prevents double-save when unmounting after completion.
  // H4 fix: Also stop range playback on unmount to prevent audio leak.
  useEffect(() => {
    return () => {
      rangeAbortRef.current = true;
      if (sessionRef.current.elapsedSeconds > 0 && !hasSavedRef.current) {
        saveProgressRef.current().catch(console.error);
      }
    };
  }, []);

  // Group all rows (including prompt) for display — prompt rows excluded from session navigation
  const groups = useMemo(() => computeGroups(rows), [rows]);
  const speakerColors = useMemo(() => computeSpeakerColors(speakers), [speakers]);

  // rowSeq → session index (for progress bar clicks and card tap sync)
  const rowSeqToSessionIndex = useMemo(() => {
    const map = new Map<number, number>();
    sessionApi.session.rows.forEach((row, i) => {
      map.set(row.rowSeq, i);
    });
    return map;
  }, [sessionApi.session.rows]);

  // Effective range end: -1 means "use last row"
  const effectiveRangeEnd = rangeEnd < 0 ? sessionApi.session.rows.length - 1 : rangeEnd;

  const playRange = useCallback(async () => {
    const sessionRows = sessionApi.session.rows;
    if (sessionRows.length === 0) return;
    const start = Math.max(0, Math.min(rangeStart, sessionRows.length - 1));
    const end = Math.max(start, Math.min(effectiveRangeEnd, sessionRows.length - 1));

    rangeAbortRef.current = false;
    setIsRangePlaying(true);
    setRepeatCurrent(0);

    for (let rep = 0; rep < repeatTotal; rep++) {
      if (rangeAbortRef.current) break;
      setRepeatCurrent(rep + 1);
      for (let i = start; i <= end; i++) {
        if (rangeAbortRef.current) break;
        const row = sessionRows[i];
        sessionApi.goTo(i);
        try {
          audioApi.stop();
          await audioApi.play(row);
          if (rangeAbortRef.current) break;
          await audioApi.waitForEnd();
        } catch {
          // TTS error — skip
        }
        if (rangeAbortRef.current) break;
      }
    }
    setIsRangePlaying(false);
    setRepeatCurrent(0);
  }, [rangeStart, effectiveRangeEnd, repeatTotal, sessionApi, audioApi]);

  const stopRange = useCallback(() => {
    rangeAbortRef.current = true;
    audioApi.stop();
    setIsRangePlaying(false);
    setRepeatCurrent(0);
  }, [audioApi]);

  // Infinite loop playback with optional range and per-sentence repeat
  const playLoop = useCallback(async (perSentenceRepeat: number, fromIdx?: number, toIdx?: number) => {
    const sessionRows = sessionApi.session.rows;
    if (sessionRows.length === 0) return;

    const loopStart = fromIdx ?? 0;
    const loopEnd = Math.min(toIdx ?? sessionRows.length - 1, sessionRows.length - 1);

    rangeAbortRef.current = false;
    setIsRangePlaying(true);

    // First pass starts from current position (clamped to range)
    let startIdx = Math.max(loopStart, Math.min(sessionApi.session.currentIndex, loopEnd));

    while (!rangeAbortRef.current) {
      for (let i = startIdx; i <= loopEnd; i++) {
        if (rangeAbortRef.current) break;
        const row = sessionRows[i];
        sessionApi.goTo(i);

        for (let r = 0; r < perSentenceRepeat; r++) {
          if (rangeAbortRef.current) break;
          audioApi.stop();
          try {
            await audioApi.play(row);
            if (rangeAbortRef.current) break;
            await audioApi.waitForEnd();
          } catch {
            // TTS error — skip
          }
        }
      }
      startIdx = loopStart; // subsequent passes start from range beginning
    }

    setIsRangePlaying(false);
  }, [sessionApi, audioApi]);

  // Play a row's audio. Max 1 concurrent: stop() clears previous before play().
  // TTS failure captured in ttsError state.
  const playRow = useCallback(
    async (row: TrainingRow) => {
      try {
        setTtsError(false);
        audioApi.stop();
        await audioApi.play(row);
      } catch {
        setTtsError(true);
      }
    },
    [audioApi],
  );

  return {
    groups,
    isLoading,
    error,
    ttsError,
    session: sessionApi.session,
    currentRow: sessionApi.currentRow,
    isPlaying: audioApi.isPlaying,
    isLoadingTTS: audioApi.isLoadingTTS,
    speakerVoiceMap: audioApi.speakerVoiceMap,
    speakerColors,
    speed: audioApi.speed,
    setSpeed: audioApi.setSpeed,
    rowSeqToSessionIndex,
    playRow,
    stop: audioApi.stop,
    next: sessionApi.next,
    prev: sessionApi.prev,
    goTo: sessionApi.goTo,
    complete: sessionApi.complete,
    reset: sessionApi.reset,
    saveProgress: progressApi.saveProgress,
    rangeStart,
    rangeEnd: effectiveRangeEnd,
    repeatTotal,
    repeatCurrent,
    isRangePlaying,
    setRangeStart,
    setRangeEnd,
    setRepeatTotal,
    playRange,
    playLoop,
    stopRange,
  };
}
