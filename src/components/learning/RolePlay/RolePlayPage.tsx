import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Moon, Sun, Mic, ArrowRight, FastForward } from 'lucide-react';
import { useRolePlay } from '../../../hooks/useRolePlay';
import { LoadingSpinner } from '../../LoadingSpinner';
import { RoleSetup } from './RoleSetup';
import { DemoView } from './DemoView';
import { ChatView } from './ChatView';
import { ReviewView } from './ReviewView';
import { PHASE_LABELS } from '../../../constants/rolePlay';

interface RolePlayPageProps {
  setId: string;
  setName: string;
  isNightMode: boolean;
  onToggleNight: () => void;
  onBack: () => void;
}

export function RolePlayPage({
  setId,
  setName,
  isNightMode,
  onToggleNight,
  onBack,
}: RolePlayPageProps) {
  const rp = useRolePlay(setId);

  const {
    isLoading,
    error,
    dialogueRows,
    dialogueSpeakers,
    speakerVoiceMap,
    rolePlayPhase,
    selectedRole,
    currentTurnIndex,
    isUserTurn,
    isTTSPlaying,
    isAutoPlaying,
    isDemoPaused,
    isPhaseComplete,
    liveTranscript,
    turnResults,
    demoPlayingIndex,
    ttsError,
    isRecording,
    elapsed,
    overallAccuracy,
    selectRole,
    startDemo,
    skipDemo,
    pauseDemo,
    resumeDemo,
    stopUserTurn,
    skipUserTurn,
    skipPartnerTurn,
    proceedNextPhase,
    skipToReview,
    resetRolePlay,
  } = rp;

  // Turn counts per speaker for SETUP display
  const turnCounts = useMemo(
    () => dialogueSpeakers.reduce<Record<string, number>>((acc, sp) => {
      acc[sp] = dialogueRows.filter(r => r.speaker === sp).length;
      return acc;
    }, {}),
    [dialogueSpeakers, dialogueRows],
  );

  const handleBack = () => {
    resetRolePlay();
    onBack();
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-xl text-red-500">
        에러: {error}
      </div>
    );
  }

  return (
    <div className={`h-full ${isNightMode ? 'dark bg-gray-900' : 'bg-gray-50'} flex flex-col transition-colors duration-300 overflow-hidden`}>

      {/* Header */}
      <header className="shrink-0 w-full max-w-4xl mx-auto flex justify-between items-center p-3 sm:p-4 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur z-40 border-b border-gray-200 dark:border-gray-700 gap-3">
        <div className="flex items-center gap-1 sm:gap-3 flex-1 min-w-0">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90 shrink-0"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <img src="/sdc_logo.png" alt="SDC" className="w-7 h-7 object-contain shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white truncate">
            롤플레이 — {setName}
          </h1>
        </div>
        <button
          onClick={onToggleNight}
          className="p-2 shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {isNightMode
            ? <Sun className="w-5 h-5 text-yellow-400" />
            : <Moon className="w-5 h-5 text-gray-600" />
          }
        </button>
      </header>

      {/* Progress bar (not shown in SETUP) */}
      {rolePlayPhase !== 'SETUP' && dialogueRows.length > 0 && (
        <div className="shrink-0 max-w-4xl mx-auto px-4 pt-3 w-full">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {PHASE_LABELS[rolePlayPhase]}
            </span>
            {rolePlayPhase !== 'DEMO' && rolePlayPhase !== 'REVIEW' && (
              <span>{currentTurnIndex + 1} / {dialogueRows.length} 턴</span>
            )}
            {rolePlayPhase === 'DEMO' && isAutoPlaying && (
              <span>{demoPlayingIndex + 1} / {dialogueRows.length}</span>
            )}
          </div>
          {rolePlayPhase !== 'REVIEW' && (
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{
                  width: rolePlayPhase === 'DEMO'
                    ? `${((demoPlayingIndex + 1) / dialogueRows.length) * 100}%`
                    : `${((currentTurnIndex) / dialogueRows.length) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* No content fallback */}
      {!isLoading && dialogueRows.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <p className="text-5xl mb-4">💬</p>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
              이 세트는 대화 롤플레이를 지원하지 않습니다
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              롤플레이 모드는 2명 이상의 화자가 있는 세트가 필요합니다
            </p>
            <button
              onClick={handleBack}
              className="px-6 py-2.5 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors"
            >
              돌아가기
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      {dialogueRows.length > 0 && (
        <main className="flex-1 overflow-y-auto max-w-4xl mx-auto p-4 sm:p-6 w-full pb-6">
          <AnimatePresence mode="wait">
            {rolePlayPhase === 'SETUP' && (
              <RoleSetup
                key="setup"
                speakers={dialogueSpeakers}
                selectedRole={selectedRole}
                speakerVoiceMap={speakerVoiceMap}
                turnCounts={turnCounts}
                onSelectRole={selectRole}
                onStartDemo={startDemo}
              />
            )}

            {rolePlayPhase === 'DEMO' && (
              <DemoView
                key="demo"
                rows={dialogueRows}
                speakers={dialogueSpeakers}
                selectedRole={selectedRole}
                demoPlayingIndex={demoPlayingIndex}
                isDemoPaused={isDemoPaused}
                onSkip={skipDemo}
                onPause={pauseDemo}
                onResume={resumeDemo}
              />
            )}

            {(rolePlayPhase === 'GUIDED' || rolePlayPhase === 'PRACTICE' || rolePlayPhase === 'FREE') && (
              <ChatView
                key="chat"
                rows={dialogueRows}
                speakers={dialogueSpeakers}
                currentTurnIndex={currentTurnIndex}
                selectedRole={selectedRole}
                rolePlayPhase={rolePlayPhase}
                isUserTurn={isUserTurn}
                isTTSPlaying={isTTSPlaying}
                isRecording={isRecording}
                ttsError={ttsError}
                liveTranscript={liveTranscript}
                liveWordStatuses={rp.liveWordStatuses}
                turnResults={turnResults}
                onStopTurn={stopUserTurn}
                onSkipTurn={skipUserTurn}
                onSkipPartnerTurn={skipPartnerTurn}
              />
            )}

            {rolePlayPhase === 'REVIEW' && (
              <ReviewView
                key="review"
                rows={dialogueRows}
                speakers={dialogueSpeakers}
                turnResults={turnResults}
                selectedRole={selectedRole}
                elapsed={elapsed}
                overallAccuracy={overallAccuracy}
                onPlayAgain={resetRolePlay}
                onFinish={handleBack}
              />
            )}
          </AnimatePresence>
        </main>
      )}

      {/* Phase-complete overlay — user chooses next step (devil fix #3) */}
      <AnimatePresence>
        {isPhaseComplete && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          >
            <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5">
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                이 단계를 완료했습니다!
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={proceedNextPhase}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  다음 단계로
                </button>
                <button
                  onClick={skipToReview}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-sm"
                >
                  <FastForward className="w-4 h-4" />
                  결과 바로 보기
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating mic indicator during user recording */}
      {isRecording && (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/90 text-white rounded-full text-sm font-bold shadow-lg animate-pulse">
            <Mic className="w-4 h-4" />
            녹음 중...
          </div>
        </div>
      )}
    </div>
  );
}
