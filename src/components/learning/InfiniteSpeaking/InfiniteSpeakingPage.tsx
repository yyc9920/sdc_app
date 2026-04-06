import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, Moon, Sun, Hand, HandMetal, Mic, Square, AlertTriangle, RefreshCw, SkipForward } from 'lucide-react';
import { useData } from '../../../hooks/useData';
import { useInfiniteSpeaking } from '../../../hooks/useInfiniteSpeaking';
import { useStreamingSpeechRecognition } from '../../../hooks/useStreamingSpeechRecognition';
import { useSaveSpeakingResult } from '../../../hooks/useStudySession';
import { getTTSAudioUrl, prefetchTTS } from '../../../services/ttsService';
import { DEFAULT_VOICE } from '../../../constants/audio';
import { DEFAULT_KOREAN_VOICE } from '../../../constants/audio';
import { TIMEOUTS } from '../../../constants/infiniteSpeaking';
import { LoadingSpinner } from '../../LoadingSpinner';
import { RangeSelector } from './RangeSelector';
import { RoundIntro } from './RoundIntro';
import { SpeakingCard } from './SpeakingCard';
import { StreamingHints } from './StreamingHints';
import { ComparisonView } from './ComparisonView';
import { RoundComplete } from './RoundComplete';
import { SessionComplete } from './SessionComplete';
import { isMobileBrowser } from '../../../utils/platform';
import type { DataSet, SentenceData } from '../../../types';

interface InfiniteSpeakingPageProps {
  dataSet: DataSet;
  isNightMode: boolean;
  onToggleNight: () => void;
  onBack: () => void;
}

export const InfiniteSpeakingPage = ({ dataSet, isNightMode, onToggleNight, onBack }: InfiniteSpeakingPageProps) => {
  const { data: allSentences, loading, error } = useData(dataSet.filename);
  const engine = useInfiniteSpeaking();
  const { state, currentSentence, currentKeyIndices } = engine;
  const { saveSpeakingResult } = useSaveSpeakingResult();
  const hasSavedRef = useRef(false);
  const [ttsError, setTtsError] = useState(false);

  const speakingTimeoutRef = useRef<number | null>(null);
  const hintDebounceRef = useRef<number | null>(null);
  const modelAudioRef = useRef<HTMLAudioElement | null>(null);
  const isMobileBrowserRef = useRef(isMobileBrowser());
  const [needsMicGesture, setNeedsMicGesture] = useState(false);

  const speechRef = useRef<ReturnType<typeof useStreamingSpeechRecognition> | null>(null);

  const handleTranscriptUpdate = useCallback((transcript: string, isFinal: boolean) => {
    if (state.phase !== 'SPEAKING' || !currentSentence) return;

    const result = engine.evaluateSpeech(transcript, currentSentence.english, isFinal);
    engine.updateSpeech(transcript, result.wordStatuses, result.score);

    // Auto-finish on 100%
    if (result.score === 100) {
      speechRef.current?.stopRecording();
      engine.finishSpeaking();
      return;
    }

    // Streaming hints: debounced check for key word errors
    if (hintDebounceRef.current) clearTimeout(hintDebounceRef.current);
    hintDebounceRef.current = window.setTimeout(() => {
      const words = currentSentence.english.split(' ');
      for (const idx of currentKeyIndices) {
        if (result.wordStatuses[idx] === 'pending' && transcript.split(/\s+/).length > idx) {
          engine.addHint(`"${words[idx]}" 을 발음해보세요`);
          break;
        }
      }
    }, TIMEOUTS.HINT_DEBOUNCE_MS);
  }, [state.phase, currentSentence, currentKeyIndices, engine]);

  const speech = useStreamingSpeechRecognition({ onTranscriptUpdate: handleTranscriptUpdate });
  useEffect(() => { speechRef.current = speech; }, [speech]);

  // Prefetch upcoming sentence audio
  useEffect(() => {
    if (state.phase === 'SETUP' || state.phase === 'SESSION_COMPLETE') return;
    const nextIdx = state.currentSentenceIndex + 1;
    if (nextIdx < state.sentences.length) {
      const nextSentence = state.sentences[nextIdx];
      if (state.currentRound <= 2) {
        prefetchTTS(nextSentence.english, DEFAULT_VOICE);
      } else {
        prefetchTTS(nextSentence.comprehension, DEFAULT_KOREAN_VOICE);
      }
    }
  }, [state.phase, state.currentSentenceIndex, state.sentences, state.currentRound]);

  // Play model audio (English TTS via Cloud Function) for rounds 1-2
  const playModelAudio = useCallback(async () => {
    if (!currentSentence) return;
    try {
      setTtsError(false);
      const url = await getTTSAudioUrl(currentSentence.english, DEFAULT_VOICE);

      if (modelAudioRef.current) {
        modelAudioRef.current.pause();
      }
      const audio = new Audio(url);
      modelAudioRef.current = audio;
      audio.onended = () => {
        if (state.phase === 'LISTENING') {
          engine.startSpeaking();
        }
      };
      audio.play().catch(console.error);
    } catch (e) {
      console.error('TTS failed after retries:', e);
      setTtsError(true);
    }
  }, [currentSentence, state.phase, engine]);

  // Play Korean TTS (via Cloud Function with edge-tts Korean Neural voice) for rounds 3-4
  const playKoreanTTS = useCallback(async () => {
    if (!currentSentence) return;
    try {
      setTtsError(false);
      const url = await getTTSAudioUrl(currentSentence.comprehension, DEFAULT_KOREAN_VOICE);

      if (modelAudioRef.current) {
        modelAudioRef.current.pause();
      }
      const audio = new Audio(url);
      modelAudioRef.current = audio;
      audio.onended = () => {
        if (state.phase === 'LISTENING') {
          engine.startSpeaking();
        }
      };
      audio.play().catch(console.error);
    } catch (e) {
      console.error('Korean TTS failed after retries:', e);
      setTtsError(true);
    }
  }, [currentSentence, state.phase, engine]);

  const handleTtsRetry = useCallback(() => {
    if (state.currentRound <= 2) {
      playModelAudio();
    } else {
      playKoreanTTS();
    }
  }, [state.currentRound, playModelAudio, playKoreanTTS]);

  const handleTtsSkip = useCallback(() => {
    setTtsError(false);
    engine.startSpeaking();
  }, [engine]);

  // Handle LISTENING phase: play appropriate audio
  useEffect(() => {
    if (state.phase !== 'LISTENING' || !currentSentence) return;

    if (state.currentRound <= 2) {
      playModelAudio(); // eslint-disable-line react-hooks/set-state-in-effect -- async audio playback may set error state
    } else {
      playKoreanTTS();
    }

    return () => {
      if (modelAudioRef.current) {
        modelAudioRef.current.pause();
        modelAudioRef.current = null;
      }
    };
  }, [state.phase, state.currentRound, currentSentence, playModelAudio, playKoreanTTS]);

  // Handle SPEAKING phase: auto-start recording + timeout
  // On mobile browsers, require user tap to start (getUserMedia needs user gesture)
  useEffect(() => {
    if (state.phase !== 'SPEAKING') {
      setNeedsMicGesture(false); // eslint-disable-line react-hooks/set-state-in-effect -- sync with phase
      return;
    }

    if (isMobileBrowserRef.current) {
      setNeedsMicGesture(true);
      return;
    }

    // Desktop / native: auto-start as before
    speech.startRecording();

    speakingTimeoutRef.current = window.setTimeout(() => {
      speech.stopRecording();
      engine.finishSpeaking();
    }, TIMEOUTS.SPEAKING_TIMEOUT_MS);

    return () => {
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    };
  }, [state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMobileMicStart = useCallback(() => {
    setNeedsMicGesture(false);
    speech.startRecording();

    speakingTimeoutRef.current = window.setTimeout(() => {
      speech.stopRecording();
      engine.finishSpeaking();
    }, TIMEOUTS.SPEAKING_TIMEOUT_MS);
  }, [speech, engine]);

  // Save speaking result when session completes
  useEffect(() => {
    if (state.phase === 'SESSION_COMPLETE' && !hasSavedRef.current && state.sessionStartTime) {
      hasSavedRef.current = true;
      const elapsed = Math.floor((Date.now() - state.sessionStartTime) / 1000);
      saveSpeakingResult(dataSet.id, state.sentences.length, state.currentRound, elapsed);
    }
    if (state.phase === 'SETUP') {
      hasSavedRef.current = false;
    }
  }, [state.phase, state.sessionStartTime, state.sentences.length, state.currentRound, dataSet.id, saveSpeakingResult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (modelAudioRef.current) modelAudioRef.current.pause();
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
      if (hintDebounceRef.current) clearTimeout(hintDebounceRef.current);
    };
  }, []);

  const handleManualStopSpeaking = useCallback(() => {
    speech.stopRecording();
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);

    // Finalize evaluation
    if (currentSentence) {
      const result = engine.evaluateSpeech(speech.transcript, currentSentence.english, true);
      engine.updateSpeech(speech.transcript, result.wordStatuses, result.score);
    }
    engine.finishSpeaking();
  }, [speech, currentSentence, engine]);

  const handlePlayModelForComparison = useCallback(async () => {
    if (!currentSentence) return;
    const url = await getTTSAudioUrl(currentSentence.english, DEFAULT_VOICE);
    const audio = new Audio(url);
    audio.play().catch(console.error);
  }, [currentSentence]);

  const handleStartSession = useCallback((sentences: SentenceData[]) => {
    engine.startSession(sentences);
  }, [engine]);

  if (loading) return <LoadingSpinner fullScreen />;
  if (error) return <div className="flex h-screen items-center justify-center text-xl text-red-500">에러: {error}</div>;

  return (
    <div className={`h-full ${isNightMode ? 'dark bg-gray-900' : 'bg-gray-50'} flex flex-col transition-colors duration-300 overflow-hidden`}>
      {/* Streaming Hints Overlay */}
      <StreamingHints hints={state.hints} />

      {/* Header */}
      <header className="shrink-0 w-full max-w-4xl mx-auto flex justify-between items-center p-3 sm:p-4 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur z-40 border-b border-gray-200 dark:border-gray-700 gap-3">
        <div className="flex items-center gap-1 sm:gap-3 flex-1 min-w-0">
          <button
            onClick={() => { engine.reset(); onBack(); }}
            className="p-2 -ml-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90 shrink-0"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <img src="/sdc_logo.png" alt="SDC" className="w-7 h-7 object-contain shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white truncate">
            무한 스피킹 — {dataSet.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {state.phase !== 'SETUP' && (
            <button
              onClick={engine.toggleHandsFree}
              className={`p-2 rounded-full transition-colors ${
                state.handsFree
                  ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title={state.handsFree ? '핸즈프리 ON' : '핸즈프리 OFF'}
            >
              {state.handsFree ? <HandMetal className="w-5 h-5" /> : <Hand className="w-5 h-5" />}
            </button>
          )}
          <button
            onClick={onToggleNight}
            className="p-2 shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isNightMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>
        </div>
      </header>

      {/* Progress bar */}
      {state.phase !== 'SETUP' && state.phase !== 'SESSION_COMPLETE' && (
        <div className="shrink-0 max-w-4xl mx-auto px-4 pt-3 w-full">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span className="font-bold text-purple-600 dark:text-purple-400">Round {state.currentRound}/4</span>
            <span>문장 {state.currentSentenceIndex + 1}/{state.sentences.length}</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-300"
              style={{
                width: `${((((state.currentRound - 1) * state.sentences.length) + state.currentSentenceIndex + (state.phase === 'COMPARISON' ? 1 : 0)) / (4 * state.sentences.length)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto max-w-4xl mx-auto p-4 sm:p-6 w-full pb-6">
        <AnimatePresence mode="wait">
          {/* SETUP */}
          {state.phase === 'SETUP' && (
            <RangeSelector
              totalSentences={allSentences.length}
              allSentences={allSentences}
              onStart={handleStartSession}
            />
          )}

          {/* ROUND INTRO */}
          {state.phase === 'ROUND_INTRO' && (
            <RoundIntro
              round={state.currentRound}
              onStart={engine.startListening}
              handsFree={state.handsFree}
            />
          )}

          {/* LISTENING */}
          {state.phase === 'LISTENING' && currentSentence && (
            <div className="space-y-4">
              <SpeakingCard
                sentence={currentSentence.english}
                koreanMeaning={currentSentence.comprehension}
                round={state.currentRound}
                keyIndices={currentKeyIndices}
                wordStatuses={state.wordStatuses}
                isListening={true}
                isSpeaking={false}
              />
              {ttsError && (
                <div className="flex items-center justify-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-xl text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <span className="text-amber-800 dark:text-amber-200">음성을 불러올 수 없습니다</span>
                  <button onClick={handleTtsRetry} className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> 다시 시도
                  </button>
                  <button onClick={handleTtsSkip} className="flex items-center gap-1 px-3 py-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/50 font-medium rounded-lg text-xs transition-colors">
                    <SkipForward className="w-3.5 h-3.5" /> 건너뛰기
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SPEAKING */}
          {state.phase === 'SPEAKING' && currentSentence && (
            <div className="space-y-6">
              <SpeakingCard
                sentence={currentSentence.english}
                koreanMeaning={currentSentence.comprehension}
                round={state.currentRound}
                keyIndices={currentKeyIndices}
                wordStatuses={state.wordStatuses}
                isListening={false}
                isSpeaking={!needsMicGesture}
              />

              {needsMicGesture ? (
                <div className="flex justify-center">
                  <button
                    onClick={handleMobileMicStart}
                    className="flex items-center gap-2 px-8 py-4 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 animate-pulse"
                  >
                    <Mic className="w-6 h-6" />
                    마이크 켜기
                  </button>
                </div>
              ) : (
                <div className="flex justify-center">
                  <button
                    onClick={handleManualStopSpeaking}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95"
                  >
                    <Square className="w-5 h-5" />
                    말하기 완료
                  </button>
                </div>
              )}

              {speech.supportError && (
                <p className="text-center text-red-500 text-sm">{speech.supportError}</p>
              )}
              {speech.micError && (
                <div className="flex items-center justify-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-xl text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <span className="text-amber-800 dark:text-amber-200">{speech.micError}</span>
                  <button onClick={speech.retryRecording} className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> 다시 시도
                  </button>
                  <button
                    onClick={() => { speech.stopRecording(); engine.finishSpeaking(); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/50 font-medium rounded-lg text-xs transition-colors"
                  >
                    <SkipForward className="w-3.5 h-3.5" /> 건너뛰기
                  </button>
                </div>
              )}
            </div>
          )}

          {/* COMPARISON */}
          {state.phase === 'COMPARISON' && currentSentence && (
            <ComparisonView
              score={state.score}
              wordStatuses={state.wordStatuses}
              words={currentSentence.english.split(' ')}
              onPlayModel={handlePlayModelForComparison}
              onPlayMine={speech.playRecording}
              hasRecording={!!speech.audioUrl}
              onNext={engine.nextSentence}
              onRetry={engine.retrySpeaking}
              retryCount={state.retryCount}
              handsFree={state.handsFree}
            />
          )}

          {/* ROUND COMPLETE */}
          {state.phase === 'ROUND_COMPLETE' && (
            <RoundComplete
              round={state.currentRound}
              totalSentences={state.sentences.length}
              onNextRound={engine.nextRound}
              handsFree={state.handsFree}
              isLastRound={state.currentRound === 4}
            />
          )}

          {/* SESSION COMPLETE */}
          {state.phase === 'SESSION_COMPLETE' && (
            <SessionComplete
              totalSentences={state.sentences.length}
              sessionStartTime={state.sessionStartTime}
              onFinish={() => { engine.reset(); onBack(); }}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Floating mic indicator during speaking */}
      {state.phase === 'SPEAKING' && speech.isRecording && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/90 text-white rounded-full text-sm font-bold shadow-lg animate-pulse">
            <Mic className="w-4 h-4" />
            녹음 중...
          </div>
        </div>
      )}
    </div>
  );
};
