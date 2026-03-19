import { Mic, MicOff, Volume2, RotateCcw, Award, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { usePronunciationCheck } from '../hooks/usePronunciationCheck';
import type { SentenceData } from '../types';
import { useEffect, useMemo } from 'react';

interface PronunciationCheckerProps {
  sentence: SentenceData;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export const PronunciationChecker = ({ sentence, onClose, onNext, onPrev }: PronunciationCheckerProps) => {
  const {
    isRecording,
    wordStatuses,
    isFinished,
    score,
    supportError,
    toggleRecording,
    startRecording,
    speakSentence,
    resetState,
  } = usePronunciationCheck(sentence.english);

  const targetWords = useMemo(() => sentence.english.split(' '), [sentence.english]);

  useEffect(() => {
    if (isFinished) {
      const storageKey = `pronunciation-score-${sentence.id}`;
      localStorage.setItem(storageKey, score.toString());
    }
  }, [isFinished, score, sentence.id]);

  useEffect(() => {
    // Start recording automatically when sentence changes
    if (isFinished) return;
    
    const timer = setTimeout(() => {
      startRecording();
    }, 400);
    return () => clearTimeout(timer);
  }, [sentence.id, startRecording, isFinished]);

  if (supportError) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-xl shadow-xl">
          <p className="text-red-500 font-bold">{supportError}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 relative" onClick={e => e.stopPropagation()}>
        <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-300" />
            발음 체크
          </h1>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-8">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                문장을 큰 소리로 읽어주세요
              </p>
              <button
                onClick={speakSentence}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                title="원어민 발음 듣기"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            <div className="text-3xl font-bold leading-tight flex flex-wrap gap-x-2 gap-y-3 mb-6">
              {targetWords.map((word, i) => {
                let colorClass = "text-slate-300";
                if (wordStatuses[i] === 'correct') colorClass = "text-green-500";
                else if (wordStatuses[i] === 'incorrect') colorClass = "text-red-500 underline";

                return (
                  <span key={i} className={`transition-colors duration-300 ${colorClass}`}>
                    {word}
                  </span>
                );
              })}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-slate-700 font-medium text-lg mb-1">{sentence.koreanPronounce}</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center min-h-[160px] relative">
            {!isFinished ? (
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={toggleRecording}
                  className={`relative flex items-center justify-center w-20 h-20 rounded-full text-white shadow-lg transition-all duration-300 ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 scale-105'
                      : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <div className="absolute w-full h-full bg-red-400 rounded-full animate-ping opacity-50"></div>
                      <MicOff className="w-8 h-8 relative z-10" />
                    </>
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
                <p className={`text-sm font-medium ${isRecording ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>
                  {isRecording ? '듣고 있습니다... 탭하여 완료' : '마이크를 눌러 시작하세요'}
                </p>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <div className="text-center mb-6">
                  <div className="text-5xl font-black mb-2 flex items-center justify-center gap-2">
                    <span className={score === 100 ? 'text-green-500' : score > 70 ? 'text-blue-500' : 'text-orange-500'}>
                      {score}%
                    </span>
                  </div>
                  <p className="text-slate-600 font-medium">
                    {score === 100 ? '완벽한 발음입니다! 🎉' :
                     score > 70 ? '잘하셨어요! 조금만 더 다듬어볼까요?' :
                     '좀 더 연습해봅시다! 크게 말해보세요. 💪'}
                  </p>
                </div>

                <div className="flex w-full gap-3">
                  <button
                    onClick={resetState}
                    className="flex-1 py-4 flex items-center justify-center gap-2 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <RotateCcw className="w-5 h-5" /> 다시 시도
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-[2] py-4 flex items-center justify-center gap-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md"
                  >
                    닫기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onPrev}
            disabled={!onPrev}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-colors ${
              onPrev ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-5 h-5" /> 이전
          </button>
          <div className="w-px bg-slate-100"></div>
          <button
            onClick={onNext}
            disabled={!onNext}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-colors ${
              onNext ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            다음 <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
