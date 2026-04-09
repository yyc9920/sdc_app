import { useCallback } from 'react';
import { ChevronLeft, Moon, Sun, RotateCcw, RefreshCw } from 'lucide-react';
import { useFreeResponse } from '../../../hooks/useFreeResponse';
import { LoadingSpinner } from '../../LoadingSpinner';
import { PromptCard } from './PromptCard';
import { ThinkTimer } from './ThinkTimer';
import { RecordingView } from './RecordingView';
import { CompareView } from './CompareView';
import { StudyView } from './StudyView';

interface FreeResponsePageProps {
  setId: string;
  isNightMode: boolean;
  onToggleNight: () => void;
  onBack: () => void;
}

export const FreeResponsePage = ({
  setId,
  isNightMode,
  onToggleNight,
  onBack,
}: FreeResponsePageProps) => {
  const fr = useFreeResponse(setId);

  const handleBack = useCallback(() => {
    fr.reset();
    onBack();
  }, [fr, onBack]);

  if (fr.isLoading) return <LoadingSpinner fullScreen />;
  if (fr.error) {
    return (
      <div className="flex h-screen items-center justify-center text-xl text-red-500">
        에러: {fr.error}
      </div>
    );
  }

  // Empty content guard
  if (!fr.hasContent) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
          이 세트에서 사용할 수 있는 콘텐츠가 없습니다
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
        >
          돌아가기
        </button>
      </div>
    );
  }

  // Top 5 keywords from model for THINK hints
  const hintKeywords = fr.scriptRows
    .flatMap(r => r.english.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/))
    .filter(w => w.length > 4)
    .reduce<Map<string, number>>((acc, w) => {
      acc.set(w, (acc.get(w) ?? 0) + 1);
      return acc;
    }, new Map())
    .entries();
  const topKeywords = [...hintKeywords]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);

  const currentStudyRow = fr.scriptRows[fr.studyIndex] ?? null;
  const isLastStudySentence = fr.studyIndex === fr.scriptRows.length - 1;

  return (
    <div className={`h-full flex flex-col ${isNightMode ? 'dark bg-gray-900' : 'bg-gray-50'} transition-colors duration-300 overflow-hidden`}>
      {/* Header */}
      <header className="shrink-0 w-full max-w-4xl mx-auto flex justify-between items-center p-3 sm:p-4 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur z-40 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1 sm:gap-3 flex-1 min-w-0">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90 shrink-0"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <img src="/sdc_logo.png" alt="SDC" className="w-7 h-7 object-contain shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white truncate">
            자유 스피킹 — {setId}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {fr.phase !== 'PROMPT' && fr.phase !== 'COMPLETE' && (
            <button
              onClick={fr.reset}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="처음부터"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onToggleNight}
            className="p-2 shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isNightMode
              ? <Sun className="w-5 h-5 text-yellow-400" />
              : <Moon className="w-5 h-5 text-gray-600" />}
          </button>
        </div>
      </header>

      {/* Phase indicator */}
      {fr.phase !== 'COMPLETE' && (
        <div className="shrink-0 max-w-4xl mx-auto px-4 pt-3 w-full">
          <div className="flex gap-1.5 justify-center">
            {(['PROMPT', 'THINK', 'RECORD', 'COMPARE', 'STUDY', 'RETRY'] as const).map(p => (
              <div
                key={p}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  fr.phase === p
                    ? 'bg-indigo-500'
                    : ['COMPARE', 'STUDY', 'RETRY', 'COMPLETE'].includes(fr.phase) &&
                      ['PROMPT', 'THINK', 'RECORD'].includes(p)
                    ? 'bg-indigo-300 dark:bg-indigo-700'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto max-w-4xl mx-auto p-4 sm:p-6 w-full pb-6">
        {/* PROMPT */}
        {fr.phase === 'PROMPT' && fr.promptRow && (
          <PromptCard
            promptText={fr.promptRow.english}
            koreanMeaning={fr.promptRow.comprehension}
            isPlaying={fr.isPlaying}
            ttsError={fr.ttsError}
            onPlay={fr.playPrompt}
            onStartThink={fr.startThink}
          />
        )}

        {/* THINK */}
        {fr.phase === 'THINK' && (
          <ThinkTimer
            secondsLeft={fr.thinkSecondsLeft}
            expired={fr.thinkExpired}
            keywords={topKeywords}
            onStartRecord={fr.startRecord}
          />
        )}

        {/* RECORD */}
        {fr.phase === 'RECORD' && (
          <RecordingView
            secondsLeft={fr.recordSecondsLeft}
            transcript={fr.userTranscript}
            isRecording={fr.isRecording}
            shortRecordingWarning={fr.shortRecordingWarning}
            onStop={fr.stopRecord}
          />
        )}

        {/* COMPARE */}
        {fr.phase === 'COMPARE' && fr.analysis && (
          <CompareView
            analysis={fr.analysis}
            modelRows={fr.scriptRows}
            transcriptMissing={fr.transcriptMissing}
            onStartStudy={fr.startStudy}
          />
        )}

        {/* STUDY */}
        {fr.phase === 'STUDY' && currentStudyRow && (
          <StudyView
            sentence={currentStudyRow.english}
            koreanMeaning={currentStudyRow.comprehension}
            currentIndex={fr.studyIndex}
            total={fr.scriptRows.length}
            isPlaying={fr.isPlaying}
            ttsError={fr.ttsError}
            isLastSentence={isLastStudySentence}
            onPlay={fr.playCurrentStudySentence}
            onNext={fr.nextStudySentence}
          />
        )}

        {/* RETRY */}
        {fr.phase === 'RETRY' && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                학습 완료!
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                다시 녹음해서 점수를 높여보세요
              </p>
              {fr.retryCount > 0 && (
                <p className="text-sm text-indigo-500 mt-1">재시도 {fr.retryCount}회</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <button
                onClick={fr.retry}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold rounded-2xl shadow-lg transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                다시 녹음
              </button>
              <button
                onClick={fr.complete}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-2xl shadow-lg transition-all"
              >
                완료
              </button>
            </div>
          </div>
        )}

        {/* COMPLETE */}
        {fr.phase === 'COMPLETE' && (
          <div className="flex flex-col items-center gap-6 py-8 text-center">
            <div className="text-6xl">🎉</div>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                세션 완료!
              </p>
              {fr.analysis && (
                <p className="text-gray-500 dark:text-gray-400">
                  최종 키워드 일치율:{' '}
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {fr.analysis.overlapPercent}%
                  </span>
                </p>
              )}
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                학습 시간: {Math.floor(fr.elapsedSeconds / 60)}분 {fr.elapsedSeconds % 60}초
              </p>
            </div>
            <button
              onClick={handleBack}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-2xl shadow-lg transition-all"
            >
              돌아가기
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
