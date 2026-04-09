import { useState } from 'react';
import { Mic, Square, SkipForward, ChevronRight, Check, AlertCircle } from 'lucide-react';
import type { TrainingRow } from '../../../hooks/training';

interface ProduceViewProps {
  currentRow: TrainingRow;
  onSubmit: (transcript: string) => boolean;
  onNext: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  transcript: string;
  isRecording: boolean;
}

type ProduceState = 'idle' | 'recording' | 'done';

export const ProduceView = ({
  currentRow,
  onSubmit,
  onNext,
  startRecording,
  stopRecording,
  transcript,
  isRecording,
}: ProduceViewProps) => {
  const [produceState, setProduceState] = useState<ProduceState>('idle');
  const [hit, setHit] = useState(false);

  const handleStartRecording = () => {
    setProduceState('recording');
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
    const result = onSubmit(transcript);
    setHit(result);
    setProduceState('done');
  };

  const handleSkip = () => {
    if (isRecording) stopRecording();
    onSubmit('');
    onNext();
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <div className="text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400">
          Produce
        </span>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">문장 만들어 말하기</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          아래 표현을 사용해 문장을 만들어 말해보세요.
        </p>
      </div>

      {/* Target expression */}
      <div className="text-center px-6 py-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl border border-emerald-200 dark:border-emerald-700">
        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
          {currentRow.english}
        </p>
        <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
          {currentRow.comprehension}
        </p>
      </div>

      {/* Recording area */}
      <div className="min-h-20 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        {produceState === 'idle' && (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm">
            아래 버튼을 눌러 녹음을 시작하세요.
          </p>
        )}
        {(produceState === 'recording' || produceState === 'done') && (
          <p className="text-gray-900 dark:text-white min-h-8">
            {transcript || (
              <span className="text-gray-400 dark:text-gray-500 text-sm">말씀해주세요...</span>
            )}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-4">
        {produceState === 'idle' && (
          <button
            onClick={handleStartRecording}
            className="flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95"
          >
            <Mic className="w-5 h-5" />
            녹음 시작
          </button>
        )}

        {produceState === 'recording' && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-red-500 font-bold text-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              녹음 중...
            </div>
            <button
              onClick={handleStopRecording}
              className="flex items-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95"
            >
              <Square className="w-5 h-5" />
              완료
            </button>
          </div>
        )}

        {produceState === 'done' && (
          <div
            className={`flex items-start gap-3 w-full p-4 rounded-2xl text-sm ${
              hit
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
            }`}
          >
            {hit ? (
              <Check className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
            )}
            <div>
              <p className="font-bold">{hit ? '표현을 사용했습니다!' : '표현을 찾지 못했습니다.'}</p>
              <p className="mt-0.5 text-xs opacity-80">
                {hit
                  ? '훌륭합니다! 표현을 문장 속에서 사용했어요.'
                  : `"${currentRow.english}"을 포함하여 말해보세요.`}
              </p>
            </div>
          </div>
        )}

        {produceState !== 'idle' && produceState !== 'recording' && (
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-md transition-all active:scale-95"
          >
            다음
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={handleSkip}
          className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <SkipForward className="w-4 h-4" />
          건너뛰기
        </button>
      </div>
    </div>
  );
};
