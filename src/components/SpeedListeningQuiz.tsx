import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { SpeedListeningSet } from '../types';

interface Props {
  datasetId: string;
  set: SpeedListeningSet;
  onNext?: () => void;
}

const SPEEDS = [1, 1.2, 1.5, 2];

const cleanWord = (word: string) => word.replace(/[.,?!;:"']/g, '').toLowerCase();

export const SpeedListeningQuiz: React.FC<Props> = ({ datasetId, set, onNext }) => {
  const [blanks, setBlanks] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [currentSpeedIndex, setCurrentSpeedIndex] = useState(0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isAnnouncementPlaying, setIsAnnouncementPlaying] = useState(true);
  const [isTransitionChimePlaying, setIsTransitionChimePlaying] = useState(false);
  const [audioFinished, setAudioFinished] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioSrcRef = useRef<string>('');

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  useEffect(() => {
    setBlanks({});
    setIsSubmitted(false);
    setCurrentSpeedIndex(0);
    setCurrentSentenceIndex(0);
    setIsPlaying(true);
    setIsAnnouncementPlaying(true);
    setIsTransitionChimePlaying(false);
    setAudioFinished(false);
    setIsReviewMode(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    currentAudioSrcRef.current = '';
    window.scrollTo(0, 0);
  }, [set]);

  const blankIndicesMap = useMemo(() => {
    const map: Record<number, Set<number>> = {};
    set.sentences.forEach(sentence => {
      const words = sentence.english.split(' ');
      const eligibleIndices = words
        .map((_, i) => i)
        .filter(i => !sentence.properNounIndices.includes(i));
      
      for (let i = eligibleIndices.length - 1; i > 0; i--) {
        // eslint-disable-next-line react-hooks/purity
        const j = Math.floor(Math.random() * (i + 1));
        [eligibleIndices[i], eligibleIndices[j]] = [eligibleIndices[j], eligibleIndices[i]];
      }
      
      const numBlanks = Math.max(1, Math.floor(words.length * (set.level * 0.15)));
      const selectedIndices = new Set(eligibleIndices.slice(0, numBlanks));
      map[sentence.id] = selectedIndices;
    });
    return map;
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

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      let targetSrc = '';
      let targetRate = 1.0;
      
      if (isAnnouncementPlaying) {
        targetSrc = `${import.meta.env.BASE_URL}tts/announcement.mp3`;
        targetRate = 1.0;
      } else if (isTransitionChimePlaying) {
        targetSrc = `${import.meta.env.BASE_URL}tts/dingdong.wav`;
        targetRate = 1.0;
      } else {
        const sentence = set.sentences[currentSentenceIndex];
        targetSrc = `${import.meta.env.BASE_URL}tts/${datasetId}/female/${sentence.id}.mp3`;
        targetRate = SPEEDS[currentSpeedIndex];
      }
      
      if (currentAudioSrcRef.current !== targetSrc) {
        audioRef.current.src = targetSrc;
        currentAudioSrcRef.current = targetSrc;
      }
      
      audioRef.current.playbackRate = targetRate;
      
      audioRef.current.play().catch(e => {
        console.error("Audio play failed", e);
        handleAudioEnded();
      });
    } else if (!isPlaying && audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPlaying, isAnnouncementPlaying, isTransitionChimePlaying, currentSentenceIndex, currentSpeedIndex, datasetId, set.sentences, handleAudioEnded]);

  const renderWord = (word: string, sentenceId: number, wordIndex: number) => {
    const isBlank = blankIndicesMap[sentenceId]?.has(wordIndex);
    if (!isBlank) return <span key={wordIndex} className="mr-1">{word}</span>;

    const match = word.match(/^([.,?!;:"']*)(.+?)([.,?!;:"']*)$/);
    const leadingPunct = match ? match[1] : '';
    const actualWord = match ? match[2] : word;
    const trailingPunct = match ? match[3] : '';

    const blankKey = `${sentenceId}-${wordIndex}`;
    const userInput = blanks[blankKey] || '';
    
    let inputColor = "bg-white border-gray-300";
    const isCorrect = cleanWord(userInput) === cleanWord(actualWord);
    
    if (isCorrect && userInput.length > 0) {
      inputColor = "bg-green-100 border-green-500 text-green-700";
    } else if (isSubmitted) {
      inputColor = "bg-red-100 border-red-500 text-red-700";
    } else if (userInput.length > 0) {
      inputColor = "bg-red-50 border-red-300 text-red-600";
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
            style={{ width: inputWidth, boxSizing: 'content-box' }}
            className={`px-1 py-0.5 border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${inputColor}`}
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
    <div className="max-w-3xl mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Theme: {set.theme}</h2>
        <div className="text-sm text-gray-500">Level: {set.level}</div>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
        <div className="flex items-center space-x-4">
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
          <div className="text-lg font-semibold text-gray-700">
            Speed: <span className="text-blue-600">{SPEEDS[currentSpeedIndex]}x</span>
          </div>
        </div>
      </div>

      <div className="space-y-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
        {set.sentences.map((sentence, index) => {
          const isEven = index % 2 === 0;
          return (
            <div key={sentence.id} className={`flex ${isEven ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                isEven 
                  ? 'bg-white border border-gray-200 rounded-bl-none' 
                  : 'bg-blue-50 border border-blue-100 rounded-br-none'
              }`}>
                <div className="text-lg leading-relaxed text-gray-800 font-medium">
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
          }}
          disabled={isSubmitted}
          className="w-full py-3.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {isSubmitted ? '제출 완료' : '정답 제출'}
        </button>
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
