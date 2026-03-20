import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useData } from './hooks/useData';
import { Card } from './components/Card';
import { Controls } from './components/Controls';
import { useAudio } from './hooks/useAudio';
import './App.css';
import type { SentenceData, DataSet } from './types';
import { PronunciationChecker } from './components/PronunciationChecker';
import { BookOpen, Plane, ChevronLeft, Moon, Sun } from 'lucide-react';

const DATA_SETS: DataSet[] = [
  {
    id: 'ultimate_speaking_beginner_1_1050',
    name: '끝장스피킹 초급-1 1050문장',
    filename: 'ultimate_speaking_beginner_1_1050.csv'
  },
  {
    id: 'essential_travel_english_phrases_100',
    name: '필수 여행영어 100문장',
    filename: 'essential_travel_english_phrases_100.csv'
  }
];

function App() {
  const [isLobby, setIsLobby] = useState(true);
  const [selectedDataSet, setSelectedDataSet] = useState<DataSet | null>(null);
  const { data, loading, error } = useData(selectedDataSet?.filename);
  
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

  // Reset settings when dataset changes
  useEffect(() => {
    if (data.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRangeStart(1);
       
      setRangeEnd(Math.min(data.length, 100));
       
      setCurrentIndex(0);
       
      setIsPlaying(false);
    }
  }, [data]);

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
    if (!activeSentence || !selectedDataSet) return '';
    // Handle different TTS structures if necessary
    // For now, assuming same structure
    const url = `tts/${selectedDataSet.id}/${voice}/${activeSentence.id}.mp3`;
    return url;
  }, [activeSentence, voice, selectedDataSet]);

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

  const selectDataSet = (dataSet: DataSet) => {
    setSelectedDataSet(dataSet);
    setIsLobby(false);
  };

  const backToLobby = () => {
    setIsLobby(true);
    setIsPlaying(false);
  };

  if (isLobby) {
    return (
      <div className={`min-h-screen ${isNightMode ? 'dark bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
        <header className="w-full max-w-4xl mx-auto flex justify-between items-center p-6 bg-transparent">
          <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">SDC 성인반 English Study</h1>
          <button
            onClick={() => setIsNightMode(!isNightMode)}
            className="p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95"
          >
            {isNightMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>
        </header>

        <main className="max-w-4xl mx-auto p-6 flex flex-col gap-8">
          <section className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">학습 세트 선택</h2>
            <p className="text-gray-500 dark:text-gray-400">공부하고 싶은 문장 세트를 선택하세요.</p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {DATA_SETS.map((set) => (
              <button
                key={set.id}
                onClick={() => selectDataSet(set)}
                className="group relative flex items-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-xl active:scale-[0.98]"
              >
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl mr-4 group-hover:scale-110 transition-transform shrink-0">
                  {set.id.includes('travel') ? <Plane className="w-8 h-8 text-blue-500" /> : <BookOpen className="w-8 h-8 text-blue-500" />}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white text-left">{set.name}</h3>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (loading) return <div className="flex h-screen items-center justify-center text-xl dark:text-white bg-gray-50 dark:bg-gray-900">데이터를 불러오는 중...</div>;
  if (error) return <div className="flex h-screen items-center justify-center text-xl text-red-500 bg-gray-50 dark:bg-gray-900">에러: {error}</div>;

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
        <div className="flex items-center gap-3">
          <button 
            onClick={backToLobby}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90"
            title="Lobby"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-lg font-bold text-gray-800 dark:text-white truncate max-w-[200px] md:max-w-none">
            {selectedDataSet?.name}
          </h1>
        </div>
        <button
          onClick={() => setIsNightMode(!isNightMode)}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {isNightMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
        </button>
      </header>

      <main className="w-full max-w-4xl mx-auto flex flex-col flex-1 p-4 gap-4 pb-48">
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
          <div className="text-gray-500 dark:text-gray-400 mt-10 text-center">문장이 없습니다.</div>
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
