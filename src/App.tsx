import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useData } from './hooks/useData';
import { Card } from './components/Card';
import { Controls } from './components/Controls';
import { useAudio } from './hooks/useAudio';
import './App.css';
import type { SentenceData } from './types';
import { PronunciationChecker } from './components/PronunciationChecker';

function App() {
  const { data, loading, error } = useData();
  const [isNightMode, setIsNightMode] = useState(false);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(100);
  const [repeatCount, setRepeatCount] = useState(3);
  const [isRandom, setIsRandom] = useState(false);
  const [voice, setVoice] = useState<'male' | 'female'>('female');
  const [displayMode, setDisplayMode] = useState<'all' | 'english' | 'korean'>('all');
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [checkingSentence, setCheckingSentence] = useState<SentenceData | null>(null);
  const [lastUpdate, setLastUpdate] = useState(() => Date.now());

  const activeCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeCardRef.current && isPlaying) {
      activeCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex, isPlaying]);

  useEffect(() => {
    if (isNightMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isNightMode]);

  const activeRangeData = useMemo(() => {
    if (!data.length) return [];
    const start = Math.max(0, rangeStart - 1);
    const end = Math.min(data.length, rangeEnd);
    return data.slice(start, end);
  }, [data, rangeStart, rangeEnd]);

  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);

  useEffect(() => {
    if (activeRangeData.length > 0) {
      if (isRandom) {
        const indices = Array.from({ length: activeRangeData.length }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShuffledIndices(indices);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShuffledIndices(Array.from({ length: activeRangeData.length }, (_, i) => i));
      }
      setCurrentIndex(0);
    }
  }, [activeRangeData, isRandom]);

  const activeSentence: SentenceData | undefined = 
    activeRangeData.length > 0 && shuffledIndices.length > 0
      ? activeRangeData[shuffledIndices[currentIndex]]
      : undefined;

  const handleNext = useCallback(() => {
    if (activeRangeData.length > 0) {
      setCurrentIndex(prev => (prev + 1) % activeRangeData.length);
    }
  }, [activeRangeData]);

  const handlePrev = useCallback(() => {
    if (activeRangeData.length > 0) {
      setCurrentIndex(prev => (prev - 1 + activeRangeData.length) % activeRangeData.length);
    }
  }, [activeRangeData]);

  const handleAudioComplete = useCallback(() => {
    handleNext();
  }, [handleNext]);

  const audioUrl = useMemo(() => {
    if (!activeSentence) return '';
    return `tts/${voice}/${activeSentence.id}.mp3`;
  }, [activeSentence, voice]);

  useAudio({
    audioUrl,
    repeatCount,
    isPlaying,
    onComplete: handleAudioComplete
  });

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };
  
  const handleCheckPronunciation = (sentence: SentenceData) => {
    setCheckingSentence(sentence);
  };
  
  const handleCloseChecker = () => {
    setCheckingSentence(null);
    setLastUpdate(Date.now());
  };

  const currentCheckIndex = checkingSentence ? data.findIndex(s => s.id === checkingSentence.id) : -1;
  const hasNextCheck = currentCheckIndex !== -1 && currentCheckIndex < data.length - 1;
  const hasPrevCheck = currentCheckIndex > 0;

  const handleNextCheck = useCallback(() => {
    if (hasNextCheck) {
      setCheckingSentence(data[currentCheckIndex + 1]);
    }
  }, [hasNextCheck, currentCheckIndex, data]);

  const handlePrevCheck = useCallback(() => {
    if (hasPrevCheck) {
      setCheckingSentence(data[currentCheckIndex - 1]);
    }
  }, [hasPrevCheck, currentCheckIndex, data]);

  if (loading) return <div className="flex h-screen items-center justify-center text-xl dark:text-white">Loading data...</div>;
  if (error) return <div className="flex h-screen items-center justify-center text-xl text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col items-center">
      {checkingSentence && (
        <PronunciationChecker 
          sentence={checkingSentence} 
          onClose={handleCloseChecker}
          onNext={hasNextCheck ? handleNextCheck : undefined}
          onPrev={hasPrevCheck ? handlePrevCheck : undefined}
        />
      )}
      <header className="w-full max-w-4xl mx-auto flex justify-between items-center p-4 sticky top-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur z-40 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">SDC App</h1>
        <button
          onClick={() => setIsNightMode(!isNightMode)}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {isNightMode ? (
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
          ) : (
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
          )}
        </button>
      </header>

      <main className="w-full max-w-4xl mx-auto flex flex-col flex-1 p-4 gap-4 pb-32">
        {data.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {data.map((sentence) => {
              const isInRange = sentence.id >= rangeStart - 1 && sentence.id < rangeEnd;
              const isPlayingCard = isPlaying && activeSentence?.id === sentence.id;
              
              return (
                <Card 
                  key={`${sentence.id}-${lastUpdate}`}
                  ref={isPlayingCard ? activeCardRef : null}
                  sentence={sentence}
                  displayMode={displayMode} 
                  isInRange={isInRange}
                  isPlaying={isPlayingCard} 
                  onClick={() => {
                    if (isInRange) {
                      const indexInActiveRange = activeRangeData.findIndex(s => s.id === sentence.id);
                      if (indexInActiveRange !== -1) {
                        if (isRandom) {
                          const indexInShuffled = shuffledIndices.indexOf(indexInActiveRange);
                          if (indexInShuffled !== -1) {
                            setCurrentIndex(indexInShuffled);
                          }
                        } else {
                          setCurrentIndex(indexInActiveRange);
                        }
                        setIsPlaying(true);
                      }
                    }
                  }}
                  onCheckPronunciation={handleCheckPronunciation}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400 mt-10 text-center">No sentences available.</div>
        )}
      </main>

      <Controls
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        repeatCount={repeatCount}
        isRandom={isRandom}
        voice={voice}
        totalItems={data.length}
        onRangeStartChange={setRangeStart}
        onRangeEndChange={setRangeEnd}
        onRepeatCountChange={setRepeatCount}
        onRandomChange={setIsRandom}
        onVoiceChange={setVoice}
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        isPlaying={isPlaying}
        onPlayPause={togglePlayPause}
        onNext={handleNext}
        onPrev={handlePrev}
      />
    </div>
  );
}

export default App;
