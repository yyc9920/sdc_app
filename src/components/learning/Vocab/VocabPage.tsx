import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Moon, Sun } from 'lucide-react';
import { useVocab } from '../../../hooks/useVocab';
import { LoadingSpinner } from '../../LoadingSpinner';
import { FlashCard } from './FlashCard';
import { ContextView } from './ContextView';
import { PracticeQuiz } from './PracticeQuiz';
import { ProduceView } from './ProduceView';
import { ReviewSummary } from './ReviewSummary';

interface VocabPageProps {
  setId: string;
  setTitle: string;
  isNightMode: boolean;
  onToggleNight: () => void;
  onBack: () => void;
}

export const VocabPage = ({
  setId,
  setTitle,
  isNightMode,
  onToggleNight,
  onBack,
}: VocabPageProps) => {
  const vocab = useVocab(setId);
  const {
    isLoading,
    error,
    vocabRows,
    contextRows,
    practiceOptions,
    blankSentence,
    currentRow,
    currentIndex,
    totalItems,
    phase,
    isFlipped,
    results,
    score,
    nextReviewDays,
    flipCard,
    advancePhase,
    submitPractice,
    submitProduce,
    completeSession,
    play,
    isPlaying,
    startRecording,
    stopRecording,
    transcript,
    isRecording,
  } = vocab;

  const [ttsError, setTtsError] = useState(false);

  // Auto-play pronunciation on each INTRODUCE phase entry
  const lastIntroduceIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (phase !== 'introduce' || !currentRow) return;
    if (lastIntroduceIdRef.current === currentRow.id) return;
    lastIntroduceIdRef.current = currentRow.id;
    setTtsError(false); // eslint-disable-line react-hooks/set-state-in-effect -- reset error on new item
    play(currentRow).catch(() => setTtsError(true));
  }, [phase, currentRow, play]);

  const handleFinish = async () => {
    await completeSession(score);
    onBack();
  };

  const progressPercent =
    totalItems > 0
      ? Math.round(((currentIndex + (phase === 'review' ? 1 : 0)) / totalItems) * 100)
      : 0;

  if (isLoading) return <LoadingSpinner fullScreen />;

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-xl text-red-500">
        에러: {error}
      </div>
    );
  }

  return (
    <div
      className={`h-full ${isNightMode ? 'dark bg-gray-900' : 'bg-gray-50'} flex flex-col transition-colors duration-300 overflow-hidden`}
    >
      {/* Header */}
      <header className="shrink-0 w-full max-w-4xl mx-auto flex justify-between items-center p-3 sm:p-4 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur z-40 border-b border-gray-200 dark:border-gray-700 gap-3">
        <div className="flex items-center gap-1 sm:gap-3 flex-1 min-w-0">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90 shrink-0"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <img src="/sdc_logo.png" alt="SDC" className="w-7 h-7 object-contain shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white truncate">
            어휘 학습 — {setTitle}
          </h1>
        </div>
        <button
          onClick={onToggleNight}
          className="p-2 shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {isNightMode ? (
            <Sun className="w-5 h-5 text-yellow-400" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </header>

      {/* Progress bar */}
      {totalItems > 0 && phase !== 'review' && (
        <div className="shrink-0 max-w-4xl mx-auto px-4 pt-3 w-full">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {currentIndex + 1}/{totalItems}
            </span>
            <span className="capitalize">{phase}</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto max-w-4xl mx-auto p-4 sm:p-6 w-full pb-6">
        {/* Empty state */}
        {!isLoading && vocabRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
            <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
              이 세트에서 사용할 수 있는 콘텐츠가 없습니다
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              어휘(vocab/expression) 데이터가 있는 세트를 선택해주세요.
            </p>
            <button
              onClick={onBack}
              className="mt-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors"
            >
              돌아가기
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {phase === 'introduce' && currentRow && (
              <motion.div
                key={`introduce-${currentRow.id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <FlashCard
                  row={currentRow}
                  isFlipped={isFlipped}
                  onFlip={flipCard}
                  onNext={advancePhase}
                  onPlayAudio={() => {
                    setTtsError(false);
                    play(currentRow).catch(() => setTtsError(true));
                  }}
                  isPlaying={isPlaying}
                  ttsError={ttsError}
                />
              </motion.div>
            )}

            {phase === 'context' && currentRow && (
              <motion.div
                key={`context-${currentRow.id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ContextView
                  currentRow={currentRow}
                  contextRows={contextRows}
                  onNext={advancePhase}
                />
              </motion.div>
            )}

            {phase === 'practice' && currentRow && (
              <motion.div
                key={`practice-${currentRow.id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <PracticeQuiz
                  currentRow={currentRow}
                  options={practiceOptions}
                  blankSentence={blankSentence}
                  onSubmit={submitPractice}
                  onNext={advancePhase}
                />
              </motion.div>
            )}

            {phase === 'produce' && currentRow && (
              <motion.div
                key={`produce-${currentRow.id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ProduceView
                  currentRow={currentRow}
                  onSubmit={submitProduce}
                  onNext={advancePhase}
                  startRecording={startRecording}
                  stopRecording={stopRecording}
                  transcript={transcript}
                  isRecording={isRecording}
                />
              </motion.div>
            )}

            {phase === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ReviewSummary
                  results={results}
                  score={score}
                  nextReviewDays={nextReviewDays}
                  onFinish={handleFinish}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
};
