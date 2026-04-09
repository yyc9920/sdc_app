import { useState, useCallback } from 'react';
import { Mic, Square, SkipForward, ChevronRight, Check, AlertCircle, RotateCcw } from 'lucide-react';
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

type ProduceStep = 'word' | 'sentence';
type StepState = 'idle' | 'recording' | 'done';

export const ProduceView = ({
  currentRow,
  onSubmit,
  onNext,
  startRecording,
  stopRecording,
  transcript,
  isRecording,
}: ProduceViewProps) => {
  const [step, setStep] = useState<ProduceStep>('word');
  const [stepState, setStepState] = useState<StepState>('idle');
  const [wordHit, setWordHit] = useState(false);
  const [sentenceHit, setSentenceHit] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');

  const handleStartRecording = useCallback(() => {
    setStepState('recording');
    startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
    setLastTranscript(transcript);

    if (step === 'word') {
      // For word step: check if the spoken word matches the expression
      const t = transcript.toLowerCase().trim();
      const expression = currentRow.english.toLowerCase().trim();
      // Match if transcript contains the expression content words
      const hit = expression.split(/\s+/).every(w => t.includes(w));
      setWordHit(hit);
      setStepState('done');
    } else {
      // For sentence step: use the full produce check
      const hit = onSubmit(transcript);
      setSentenceHit(hit);
      setStepState('done');
    }
  }, [stopRecording, transcript, step, currentRow.english, onSubmit]);

  const handleRetryWord = useCallback(() => {
    setStepState('idle');
    setWordHit(false);
    setLastTranscript('');
  }, []);

  const handleAdvanceToSentence = useCallback(() => {
    setStep('sentence');
    setStepState('idle');
    setLastTranscript('');
  }, []);

  const handleSkip = useCallback(() => {
    if (isRecording) stopRecording();
    onSubmit('');
    onNext();
  }, [isRecording, stopRecording, onSubmit, onNext]);

  const isWordStep = step === 'word';
  const currentHit = isWordStep ? wordHit : sentenceHit;

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <div className="text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400">
          Produce
        </span>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
          {isWordStep ? '어휘 말하기' : '문장 만들어 말하기'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {isWordStep
            ? '아래 어휘를 정확하게 말해보세요.'
            : '아래 표현을 사용해 문장을 만들어 말해보세요.'}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
          isWordStep
            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
        }`}>
          {!isWordStep && <Check className="w-3 h-3" />}
          1. 어휘
        </div>
        <div className="w-4 h-px bg-gray-300 dark:bg-gray-600" />
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
          !isWordStep
            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
        }`}>
          2. 문장
        </div>
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
        {stepState === 'idle' && (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm">
            아래 버튼을 눌러 녹음을 시작하세요.
          </p>
        )}
        {(stepState === 'recording' || stepState === 'done') && (
          <p className="text-gray-900 dark:text-white min-h-8">
            {stepState === 'recording' ? (transcript || (
              <span className="text-gray-400 dark:text-gray-500 text-sm">말씀해주세요...</span>
            )) : lastTranscript || (
              <span className="text-gray-400 dark:text-gray-500 text-sm">인식된 내용 없음</span>
            )}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-4">
        {stepState === 'idle' && (
          <button
            onClick={handleStartRecording}
            className="flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95"
          >
            <Mic className="w-5 h-5" />
            녹음 시작
          </button>
        )}

        {stepState === 'recording' && (
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

        {stepState === 'done' && (
          <>
            <div
              className={`flex items-start gap-3 w-full p-4 rounded-2xl text-sm ${
                currentHit
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
              }`}
            >
              {currentHit ? (
                <Check className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
              )}
              <div>
                {isWordStep ? (
                  <>
                    <p className="font-bold">{currentHit ? '정확합니다!' : '다시 시도해보세요.'}</p>
                    <p className="mt-0.5 text-xs opacity-80">
                      {currentHit
                        ? '어휘를 정확하게 발음했습니다.'
                        : `"${currentRow.english}"을(를) 정확하게 말해보세요.`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold">{currentHit ? '표현을 사용했습니다!' : '표현을 찾지 못했습니다.'}</p>
                    <p className="mt-0.5 text-xs opacity-80">
                      {currentHit
                        ? '훌륭합니다! 표현을 문장 속에서 사용했어요.'
                        : `"${currentRow.english}"을(를) 포함하여 말해보세요.`}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Action buttons based on step and result */}
            {isWordStep && !currentHit && (
              <button
                onClick={handleRetryWord}
                className="flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-md transition-all active:scale-95"
              >
                <RotateCcw className="w-5 h-5" />
                다시 시도
              </button>
            )}

            {isWordStep && currentHit && (
              <button
                onClick={handleAdvanceToSentence}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-md transition-all active:scale-95"
              >
                문장 말하기
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {!isWordStep && (
              <button
                onClick={onNext}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-md transition-all active:scale-95"
              >
                다음
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </>
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
