import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SpeedListeningSet } from '../types';
import { useSaveQuizResult } from '../hooks/useStudySession';
import { SPEEDS, AVAILABLE_VOICES, BLANK_MULTIPLIER } from '../constants';
import type { Voice } from '../constants';
import { getTTSAudioUrl, getStaticAudioUrl, prefetchTTS } from '../services/ttsService';

interface Props {
  set: SpeedListeningSet;
  onNext?: () => void;
}

const cleanWord = (word: string) => word.replace(/[.,?!;:"']/g, '').toLowerCase();

const generateSentenceVoices = (sentences: SpeedListeningSet['sentences']): Record<number, Voice> => {
  const v1Index = Math.floor(Math.random() * AVAILABLE_VOICES.length);
  let v2Index = Math.floor(Math.random() * AVAILABLE_VOICES.length);
  while (v2Index === v1Index) {
    v2Index = Math.floor(Math.random() * AVAILABLE_VOICES.length);
  }
  const v1 = AVAILABLE_VOICES[v1Index];
  const v2 = AVAILABLE_VOICES[v2Index];

  const map: Record<number, Voice> = {};
  sentences.forEach((sentence, index) => {
    map[sentence.id] = index % 2 === 0 ? v1 : v2;
  });
  return map;
};

const generateBlankIndices = (sentences: SpeedListeningSet['sentences'], level: number): Record<number, Set<number>> => {
  const map: Record<number, Set<number>> = {};
  sentences.forEach(sentence => {
    const words = sentence.english.split(' ');
    const eligibleIndices = words
      .map((_, i) => i)
      .filter(i => !sentence.properNounIndices.includes(i));
    
    for (let i = eligibleIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligibleIndices[i], eligibleIndices[j]] = [eligibleIndices[j], eligibleIndices[i]];
    }
    
    const numBlanks = Math.max(1, Math.floor(words.length * (level * BLANK_MULTIPLIER)));
    map[sentence.id] = new Set(eligibleIndices.slice(0, numBlanks));
  });
  return map;
};

export const SpeedListeningQuiz: React.FC<Props> = ({ set, onNext }) => {
  const [blanks, setBlanks] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  
  const [currentSpeedIndex, setCurrentSpeedIndex] = useState(0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isAnnouncementPlaying, setIsAnnouncementPlaying] = useState(true);
  const [isTransitionChimePlaying, setIsTransitionChimePlaying] = useState(false);
  const [audioFinished, setAudioFinished] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioSrcRef = useRef<string>('');
  const startTimeRef = useRef<number>(Date.now());
  
  const { saveQuizResult } = useSaveQuizResult();

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

const [sentenceVoices, setSentenceVoices] = useState<Record<number, Voice>>(() => 
    generateSentenceVoices(set.sentences)
  );
  const [blankIndicesMap, setBlankIndicesMap] = useState<Record<number, Set<number>>>(() => 
    generateBlankIndices(set.sentences, set.level)
  );

  useEffect(() => {
    setBlanks({});
    setIsSubmitted(false);
    setQuizAnswer(null);
    setQuizSubmitted(false);
    setCurrentSpeedIndex(0);
    setCurrentSentenceIndex(0);
    setIsPlaying(true);
    setIsAnnouncementPlaying(true);
    setIsTransitionChimePlaying(false);
    setAudioFinished(false);
    setIsReviewMode(false);
    setSentenceVoices(generateSentenceVoices(set.sentences));
    setBlankIndicesMap(generateBlankIndices(set.sentences, set.level));
    startTimeRef.current = Date.now();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    currentAudioSrcRef.current = '';
    window.scrollTo(0, 0);
  }, [set]);

  const handleAudioEnded = useCallback(() => {
    if (isAnnouncementPlaying) {
      setIsAnnouncementPlaying(false);
      return;
    }

    if (isTransitionChimePlaying) {
      setIsTransitionChimePlaying(false);
      setCurrentSentenceIndex(0);
      setCurrentSpeedIndex(prev => prev + 1);
      return;
    }

    if (currentSentenceIndex < set.sentences.length - 1) {
      setCurrentSentenceIndex(prev => prev + 1);
    } else {
      if (isReviewMode) {
        setIsPlaying(false);
        setAudioFinished(true);
      } else if (currentSpeedIndex < SPEEDS.length - 1) {
        setIsTransitionChimePlaying(true);
      } else {
        setAudioFinished(true);
        setIsPlaying(false);
      }
    }
  }, [isAnnouncementPlaying, isTransitionChimePlaying, currentSentenceIndex, set.sentences.length, isReviewMode, currentSpeedIndex]);

  // Prefetch upcoming sentence audio
  useEffect(() => {
    if (isAnnouncementPlaying || isTransitionChimePlaying) return;
    const nextIndices = [1, 2, 3].map(offset => currentSentenceIndex + offset);
    for (const idx of nextIndices) {
      const sentence = set.sentences[idx];
      if (sentence) {
        const voice = sentenceVoices[sentence.id] || AVAILABLE_VOICES[0];
        prefetchTTS(sentence.english, voice);
      }
    }
  }, [currentSentenceIndex, set.sentences, sentenceVoices, isAnnouncementPlaying, isTransitionChimePlaying]);

  useEffect(() => {
    let isCancelled = false;

    const updateAudio = async () => {
      if (isPlaying && audioRef.current) {
        let targetSrc = '';
        let targetRate = 1.0;

        if (isAnnouncementPlaying) {
          targetSrc = await getStaticAudioUrl('ANNOUNCEMENT');
          targetRate = 1.0;
        } else if (isTransitionChimePlaying) {
          targetSrc = await getStaticAudioUrl('TRANSITION_CHIME');
          targetRate = 1.0;
        } else {
          const sentence = set.sentences[currentSentenceIndex];
          const voice = sentenceVoices[sentence.id] || AVAILABLE_VOICES[0];
          targetSrc = await getTTSAudioUrl(sentence.english, voice);
          targetRate = SPEEDS[currentSpeedIndex];
        }

        if (isCancelled || !audioRef.current) return;

        if (currentAudioSrcRef.current !== targetSrc) {
          audioRef.current.src = targetSrc;
          currentAudioSrcRef.current = targetSrc;
        }

        audioRef.current.playbackRate = targetRate;

        audioRef.current.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.error("Audio play failed", e);
            handleAudioEnded();
          }
        });
      } else if (!isPlaying && audioRef.current) {
        audioRef.current.pause();
      }
    };

    updateAudio();

    return () => {
      isCancelled = true;
    };
  }, [isPlaying, isAnnouncementPlaying, isTransitionChimePlaying, currentSentenceIndex, currentSpeedIndex, set.sentences, handleAudioEnded, sentenceVoices]);

  const renderWord = (word: string, sentenceId: number, wordIndex: number) => {
    const isBlank = blankIndicesMap[sentenceId]?.has(wordIndex);
    if (!isBlank) return <span key={wordIndex} className="mr-1">{word}</span>;

    const match = word.match(/^([.,?!;:"']*)(.+?)([.,?!;:"']*)$/);
    const leadingPunct = match ? match[1] : '';
    const actualWord = match ? match[2] : word;
    const trailingPunct = match ? match[3] : '';

    const blankKey = `${sentenceId}-${wordIndex}`;
    const userInput = blanks[blankKey] || '';
    
    let inputColor = "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white";
    const isCorrect = cleanWord(userInput) === cleanWord(actualWord);
    
    if (isCorrect && userInput.length > 0) {
      inputColor = "bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-400 text-green-700 dark:text-green-400";
    } else if (isSubmitted) {
      inputColor = "bg-red-100 dark:bg-red-900/30 border-red-500 dark:border-red-400 text-red-700 dark:text-red-400";
    } else if (userInput.length > 0) {
      inputColor = "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-400";
    }

    const inputWidth = `${Math.max(actualWord.length, 2) + 1}ch`;

    return (
      <span key={wordIndex} className="mr-1 inline-flex items-baseline">
        {leadingPunct && <span>{leadingPunct}</span>}
        <span className="inline-flex flex-col items-center">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setBlanks(prev => ({ ...prev, [blankKey]: e.target.value }))}
            disabled={isSubmitted}
            maxLength={actualWord.length}
            style={{ width: inputWidth, boxSizing: 'content-box', minWidth: '40px' }}
            className={`px-1 py-0.5 border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${inputColor} text-sm sm:text-base`}
          />
          {isSubmitted && !isCorrect && (
            <span className="text-xs text-green-600">{actualWord}</span>
          )}
        </span>
        {trailingPunct && <span>{trailingPunct}</span>}
      </span>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">{set.theme}</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Level {set.level}</div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm mb-6 border border-gray-200 dark:border-gray-700 gap-4">
        <div className="flex flex-1 items-center justify-between sm:justify-start sm:space-x-4">
          <button 
            onClick={() => {
              if (isSubmitted && !isPlaying) {
                setCurrentSpeedIndex(0);
                setCurrentSentenceIndex(0);
                setAudioFinished(false);
                setIsReviewMode(true);
                setIsPlaying(true);
                currentAudioSrcRef.current = '';
              } else {
                setIsPlaying(!isPlaying);
              }
            }}
            disabled={audioFinished && !isSubmitted}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPlaying ? 'Pause' : isSubmitted ? 'Replay (1x)' : (audioFinished ? 'Finished' : 'Play Audio')}
          </button>
          <div className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300">
            Speed: <span className="text-blue-600 dark:text-blue-400">{SPEEDS[currentSpeedIndex]}x</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
        {set.sentences.map((sentence, index) => {
          const isEven = index % 2 === 0;
          return (
            <div key={sentence.id} className={`flex ${isEven ? 'justify-start' : 'justify-end'}`}>
              <div className={`w-fit max-w-[90%] md:max-w-[85%] p-4 sm:p-5 rounded-2xl shadow-sm bg-white dark:bg-gray-800 ${
                isEven 
                  ? 'border border-pink-200 dark:border-pink-800/50 rounded-bl-none' 
                  : 'border border-sky-200 dark:border-sky-800/50 rounded-br-none'
              }`}>
                <div className="text-lg leading-relaxed text-gray-800 dark:text-gray-100 font-medium">
                  {sentence.english.split(' ').map((word, wIndex) => renderWord(word, sentence.id, wIndex))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 space-y-3">
        <button
          onClick={() => {
            setIsSubmitted(true);
            setIsPlaying(false);
            if (audioRef.current) {
              audioRef.current.pause();
            }
            
            let blanksTotal = 0;
            let blanksCorrect = 0;
            
            set.sentences.forEach(sentence => {
              const words = sentence.english.split(' ');
              words.forEach((word, wIndex) => {
                if (blankIndicesMap[sentence.id]?.has(wIndex)) {
                  blanksTotal++;
                  const blankKey = `${sentence.id}-${wIndex}`;
                  const userInput = blanks[blankKey] || '';
                  const match = word.match(/^[.,?!;:"']*(.+?)[.,?!;:"']*$/);
                  const actualWord = match ? match[1] : word;
                  if (cleanWord(userInput) === cleanWord(actualWord)) {
                    blanksCorrect++;
                  }
                }
              });
            });
            
            const score = blanksTotal > 0 ? Math.round((blanksCorrect / blanksTotal) * 100) : 0;
            const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
            
            saveQuizResult(set.setId, set.level, score, blanksTotal, blanksCorrect, timeSpentSeconds);
          }}
          disabled={isSubmitted}
          className="w-full py-3.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {isSubmitted ? '제출 완료' : '정답 제출'}
        </button>
        {isSubmitted && set.quiz && (
          <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Comprehension Quiz</h3>
            <p className="text-gray-700 dark:text-gray-300 font-medium">{set.quiz.question}</p>
            <div className="space-y-2">
              {set.quiz.options.map((option, idx) => {
                const isSelected = quizAnswer === idx;
                const isCorrectOption = idx === set.quiz!.answerIndex;
                let optionStyle = 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500';

                if (quizSubmitted) {
                  if (isCorrectOption) {
                    optionStyle = 'border-green-500 bg-green-50 dark:bg-green-900/30 dark:border-green-400';
                  } else if (isSelected && !isCorrectOption) {
                    optionStyle = 'border-red-500 bg-red-50 dark:bg-red-900/30 dark:border-red-400';
                  }
                } else if (isSelected) {
                  optionStyle = 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => !quizSubmitted && setQuizAnswer(idx)}
                    disabled={quizSubmitted}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${optionStyle} ${
                      quizSubmitted ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    <span className="text-gray-800 dark:text-gray-200">{option}</span>
                  </button>
                );
              })}
            </div>
            {!quizSubmitted && (
              <button
                onClick={() => setQuizSubmitted(true)}
                disabled={quizAnswer === null}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                퀴즈 정답 확인
              </button>
            )}
            {quizSubmitted && (
              <p className={`text-sm font-semibold ${
                quizAnswer === set.quiz.answerIndex
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {quizAnswer === set.quiz.answerIndex ? '정답입니다!' : '오답입니다. 정답을 확인하세요.'}
              </p>
            )}
          </div>
        )}
        {isSubmitted && (
          <button
            onClick={() => onNext?.()}
            disabled={!onNext}
            className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {onNext ? '다음 세트' : '마지막 세트입니다'}
          </button>
        )}
      </div>

      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />
    </div>
  );
};
