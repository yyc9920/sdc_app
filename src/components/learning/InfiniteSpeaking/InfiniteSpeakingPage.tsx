import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Moon, Sun, Hand, HandMetal, Mic, Square, AlertTriangle, RefreshCw, SkipForward } from 'lucide-react';
import { useInfiniteSpeaking } from '../../../hooks/useInfiniteSpeaking';
import { getKeyExpressionIndices } from '../../../utils/keyExpressions';
import { LoadingSpinner } from '../../LoadingSpinner';
import { PromptCard } from './PromptCard';
import { RoundIntro } from './RoundIntro';
import { R1ListView } from './R1ListView';
import { SpeakingCard } from './SpeakingCard';
import { StreamingHints } from './StreamingHints';
import { ComparisonView } from './ComparisonView';
import { RoundComplete } from './RoundComplete';
import { SessionComplete } from './SessionComplete';
import type { DataSet } from '../../../types';

interface InfiniteSpeakingPageProps {
  dataSet: DataSet;
  isNightMode: boolean;
  onToggleNight: () => void;
  onBack: () => void;
}

export const InfiniteSpeakingPage = ({ dataSet, isNightMode, onToggleNight, onBack }: InfiniteSpeakingPageProps) => {
  const engine = useInfiniteSpeaking(dataSet.id);
  const {
    isLoading, error,
    promptRow, scriptRows, currentRow, speakerStyleMap,
    r1PlayingIndex, r1IsPaused,
    session,
    subPhase, handsFree, wordStatuses, transcript, score, retryCount, hints,
    ttsError, needsMicGesture,
    speech,
    startRound, finishSpeaking, retrySpeaking, nextRow, nextRound,
    toggleHandsFree, toggleR1Pause,
    handleTtsRetry, handleTtsSkip,
    handleMobileMicStart, handleManualStopSpeaking,
    handlePlayModelForComparison,
    reset,
  } = engine;

  // Derived from currentRow
  const currentKeyIndices = currentRow ? getKeyExpressionIndices(currentRow.english) : [];
  const currentSpeakerStyle = currentRow?.speaker ? speakerStyleMap[currentRow.speaker] : undefined;
  // R3: hide text during speaking
  const textVisible = session.round !== 3 || subPhase !== 'SPEAKING';

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return (
    <div className="flex h-screen items-center justify-center text-xl text-red-500">
      에러: {error}
    </div>
  );

  // Empty set fallback
  if (!isLoading && scriptRows.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center px-6">
        <div className="text-center space-y-3">
          <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
            이 세트에서 사용할 수 있는 콘텐츠가 없습니다
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            스크립트 타입의 행이 없습니다.
          </p>
          <button
            onClick={onBack}
            className="mt-4 px-6 py-3 bg-purple-600 text-white font-bold rounded-2xl"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const isSessionComplete = session.phase === 'complete';
  const showProgress = !isSessionComplete && subPhase !== 'ROUND_INTRO';

  return (
    <div className={`h-full ${isNightMode ? 'dark bg-gray-900' : 'bg-gray-50'} flex flex-col transition-colors duration-300 overflow-hidden`}>
      {/* Streaming hints overlay */}
      <StreamingHints hints={hints} />

      {/* Header */}
      <header className="shrink-0 w-full max-w-4xl mx-auto flex justify-between items-center p-3 sm:p-4 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur z-40 border-b border-gray-200 dark:border-gray-700 gap-3">
        <div className="flex items-center gap-1 sm:gap-3 flex-1 min-w-0">
          <button
            onClick={() => { reset(); onBack(); }}
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
          {!isSessionComplete && (
            <button
              onClick={toggleHandsFree}
              className={`p-2 rounded-full transition-colors ${
                handsFree
                  ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title={handsFree ? '핸즈프리 ON' : '핸즈프리 OFF'}
            >
              {handsFree ? <HandMetal className="w-5 h-5" /> : <Hand className="w-5 h-5" />}
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
      {showProgress && (
        <div className="shrink-0 max-w-4xl mx-auto px-4 pt-3 w-full">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span className="font-bold text-purple-600 dark:text-purple-400">
              Round {session.round}/4
            </span>
            {subPhase !== 'R1_PLAYING' && subPhase !== 'ROUND_COMPLETE' && currentRow && (
              <span>문장 {session.currentIndex + 1}/{scriptRows.length}</span>
            )}
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-purple-500 rounded-full"
              animate={{
                width: `${(((session.round - 1) * scriptRows.length + session.currentIndex + (subPhase === 'COMPARISON' ? 1 : 0)) / (4 * scriptRows.length)) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto max-w-4xl mx-auto p-4 sm:p-6 w-full pb-6">
        <AnimatePresence mode="wait">

          {/* ROUND INTRO */}
          {subPhase === 'ROUND_INTRO' && !isSessionComplete && (
            <RoundIntro
              key={`intro-${session.round}`}
              round={session.round as 1 | 2 | 3 | 4}
              promptRow={promptRow}
              onStart={startRound}
              handsFree={handsFree}
            />
          )}

          {/* R1: Full sequential listen */}
          {subPhase === 'R1_PLAYING' && (
            <R1ListView
              key="r1-play"
              rows={scriptRows}
              promptRow={promptRow}
              speakerStyleMap={speakerStyleMap}
              playingIndex={r1PlayingIndex}
              isPaused={r1IsPaused}
              onTogglePause={toggleR1Pause}
            />
          )}

          {/* LISTENING (R2 only) */}
          {subPhase === 'LISTENING' && currentRow && (
            <div key={`listening-${session.currentIndex}`} className="space-y-4">
              {promptRow && <PromptCard row={promptRow} />}
              <SpeakingCard
                sentence={currentRow.english}
                koreanMeaning={currentRow.comprehension}
                round={session.round as 1 | 2 | 3 | 4}
                keyIndices={currentKeyIndices}
                wordStatuses={wordStatuses}
                isListening={true}
                isSpeaking={false}
                speakerStyle={currentSpeakerStyle}
                textVisible={true}
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
          {subPhase === 'SPEAKING' && currentRow && (
            <div key={`speaking-${session.currentIndex}-${retryCount}`} className="space-y-6">
              {promptRow && <PromptCard row={promptRow} />}
              <SpeakingCard
                sentence={currentRow.english}
                koreanMeaning={currentRow.comprehension}
                round={session.round as 1 | 2 | 3 | 4}
                keyIndices={currentKeyIndices}
                wordStatuses={wordStatuses}
                isListening={false}
                isSpeaking={!needsMicGesture}
                speakerStyle={currentSpeakerStyle}
                textVisible={textVisible}
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
                    onClick={() => { speech.stopRecording(); finishSpeaking(); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/50 font-medium rounded-lg text-xs transition-colors"
                  >
                    <SkipForward className="w-3.5 h-3.5" /> 건너뛰기
                  </button>
                </div>
              )}
            </div>
          )}

          {/* COMPARISON */}
          {subPhase === 'COMPARISON' && currentRow && (
            <ComparisonView
              key={`comparison-${session.currentIndex}-${retryCount}`}
              score={score}
              wordStatuses={wordStatuses}
              words={currentRow.english.split(' ')}
              onPlayModel={handlePlayModelForComparison}
              onPlayMine={speech.playRecording}
              hasRecording={!!speech.audioUrl}
              recognizedText={transcript}
              onNext={nextRow}
              onRetry={retrySpeaking}
              retryCount={retryCount}
              handsFree={handsFree}
              disableRetry={session.round === 4}
            />
          )}

          {/* ROUND COMPLETE */}
          {subPhase === 'ROUND_COMPLETE' && !isSessionComplete && (
            <RoundComplete
              key={`round-complete-${session.round}`}
              round={session.round as 1 | 2 | 3 | 4}
              totalSentences={scriptRows.length}
              onNextRound={nextRound}
              handsFree={handsFree}
              isLastRound={session.round === session.totalRounds}
            />
          )}

          {/* SESSION COMPLETE */}
          {isSessionComplete && (
            <SessionComplete
              key="session-complete"
              totalSentences={scriptRows.length}
              sessionStartTime={session.startedAt || null}
              onFinish={() => { reset(); onBack(); }}
            />
          )}

        </AnimatePresence>
      </main>

      {/* Floating mic indicator during speaking */}
      {subPhase === 'SPEAKING' && speech.isRecording && (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/90 text-white rounded-full text-sm font-bold shadow-lg animate-pulse">
            <Mic className="w-4 h-4" />
            녹음 중...
          </div>
        </div>
      )}
    </div>
  );
};
