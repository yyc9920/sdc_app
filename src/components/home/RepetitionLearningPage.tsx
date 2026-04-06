import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useData, usePrefetchData } from '../../hooks/useData';
import { useAudio } from '../../hooks/useAudio';
import { useStudySession } from '../../hooks/useStudySession';
import { getTTSAudioUrl, prefetchTTS } from '../../services/ttsService';
import { Card } from '../Card';
import { Controls } from '../Controls';
import { PronunciationChecker } from '../PronunciationChecker';
import { LoadingSpinner } from '../LoadingSpinner';
import { DATA_SETS } from '../../constants/dataSets';
import { BookOpen, Plane, ChevronLeft, Moon, Sun } from 'lucide-react';
import type { SentenceData, DataSet } from '../../types';

interface RepetitionLearningPageProps {
  isNightMode: boolean;
  onToggleNight: () => void;
}

export const RepetitionLearningPage = ({ isNightMode, onToggleNight }: RepetitionLearningPageProps) => {
  const [selectedDataSet, setSelectedDataSet] = useState<DataSet | null>(null);
  const { prefetch } = usePrefetchData();

  // Prefetch all datasets on mount
  useEffect(() => {
    DATA_SETS.forEach(ds => prefetch(ds.filename));
  }, [prefetch]);

  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(100);
  const [repeatCount, setRepeatCount] = useState(3);
  const [isRandom, setIsRandom] = useState(false);
  const [voice, setVoice] = useState<string>('female');
  const [displayMode, setDisplayMode] = useState<'all' | 'english' | 'korean'>('all');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [checkingSentence, setCheckingSentence] = useState<SentenceData | null>(null);
  const [lastUpdate, setLastUpdate] = useState(() => Date.now());

  const activeCardRef = useRef<HTMLDivElement | null>(null);

  const { data, loading, error } = useData(selectedDataSet?.filename);

  useEffect(() => {
    if (activeCardRef.current && isPlaying) {
      activeCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex, isPlaying]);

  useEffect(() => {
    if (data.length > 0) {
      setTimeout(() => {
        setRangeStart(1);
        setRangeEnd(Math.min(data.length, 100));
        setCurrentIndex(0);
        setIsPlaying(false);
      }, 0);
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
      setTimeout(() => {
        if (isRandom) {
          const indices = Array.from({ length: activeRangeData.length }, (_, i) => i);
          for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
          }
          setShuffledIndices(indices);
        } else {
          setShuffledIndices(Array.from({ length: activeRangeData.length }, (_, i) => i));
        }
        setCurrentIndex(0);
      }, 0);
    }
  }, [activeRangeData, isRandom]);

  const activeSentence: SentenceData | undefined =
    activeRangeData.length > 0 && shuffledIndices.length > 0
      ? activeRangeData[shuffledIndices[currentIndex]]
      : undefined;

  const { startSession, pauseSession, endSession } = useStudySession({
    sentenceId: activeSentence?.id ?? 0,
    setId: selectedDataSet?.id ?? '',
  });

  useEffect(() => {
    if (isPlaying && activeSentence && selectedDataSet) {
      startSession();
    } else {
      pauseSession();
    }
  }, [isPlaying, activeSentence, selectedDataSet, startSession, pauseSession]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, [activeSentence?.id, endSession]);

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

  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string>('');

  // Prefetch audio for upcoming sentences
  useEffect(() => {
    if (!activeRangeData.length || !shuffledIndices.length) return;
    const nextIndices = [1, 2, 3].map(offset => (currentIndex + offset) % activeRangeData.length);
    for (const idx of nextIndices) {
      const sentence = activeRangeData[shuffledIndices[idx]];
      if (sentence) {
        prefetchTTS(sentence.english, voice);
      }
    }
  }, [currentIndex, activeRangeData, shuffledIndices, voice]);

  useEffect(() => {
    let isCancelled = false;
    const updateUrl = async () => {
      if (!activeSentence || !selectedDataSet) {
        setResolvedAudioUrl('');
        return;
      }
      const url = await getTTSAudioUrl(activeSentence.english, voice);
      if (!isCancelled) {
        setResolvedAudioUrl(url);
      }
    };
    updateUrl();
    return () => { isCancelled = true; };
  }, [activeSentence, voice, selectedDataSet]);

  useAudio({
    audioUrl: resolvedAudioUrl,
    repeatCount,
    isPlaying,
    onComplete: handleAudioComplete,
  });

  const togglePlayPause = () => setIsPlaying(!isPlaying);

  const handleCheckPronunciation = (sentence: SentenceData) => {
    setIsPlaying(false);
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
    if (hasNextCheck) setCheckingSentence(data[currentCheckIndex + 1]);
  }, [hasNextCheck, currentCheckIndex, data]);

  const handlePrevCheck = useCallback(() => {
    if (hasPrevCheck) setCheckingSentence(data[currentCheckIndex - 1]);
  }, [hasPrevCheck, currentCheckIndex, data]);

  // Lobby: dataset selection
  if (!selectedDataSet) {
    return (
      <div className={`h-full ${isNightMode ? 'dark bg-gray-900' : 'bg-gray-50'} flex flex-col transition-colors duration-300 relative overflow-hidden`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col h-full overflow-hidden"
        >
          <header className="shrink-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  반복 학습
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  문장 세트를 선택하세요
                </p>
              </div>
              <button
                onClick={onToggleNight}
                className="p-2 shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {isNightMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {DATA_SETS.map((set) => (
                <button
                  key={set.id}
                  onClick={() => setSelectedDataSet(set)}
                  className="group relative flex items-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-xl active:scale-[0.98]"
                >
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl mr-4 group-hover:scale-110 transition-transform shrink-0">
                    {set.id.includes('travel') ? <Plane className="w-8 h-8 text-blue-500" /> : <BookOpen className="w-8 h-8 text-blue-500" />}
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{set.name}</h3>
                    {set.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{set.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </main>
        </motion.div>
      </div>
    );
  }

  // Loading / Error
  if (loading) return <LoadingSpinner fullScreen />;
  if (error) return <div className="flex h-screen items-center justify-center text-xl text-red-500 bg-gray-50 dark:bg-gray-900">에러: {error}</div>;

  // Learning view
  return (
    <div className={`h-full ${isNightMode ? 'dark bg-gray-900' : 'bg-gray-50'} transition-colors duration-300 flex flex-col overflow-hidden`}>
      {checkingSentence && (
        <PronunciationChecker
          sentence={checkingSentence}
          onClose={handleCloseChecker}
          onNext={hasNextCheck ? handleNextCheck : undefined}
          onPrev={hasPrevCheck ? handlePrevCheck : undefined}
        />
      )}
      <header className="shrink-0 w-full max-w-4xl mx-auto flex justify-between items-center p-3 sm:p-4 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur z-40 border-b border-gray-200 dark:border-gray-700 gap-3">
        <div className="flex items-center gap-1 sm:gap-3 flex-1 min-w-0">
          <button
            onClick={() => { setSelectedDataSet(null); setIsPlaying(false); }}
            className="p-2 -ml-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90 shrink-0"
            title="Lobby"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white truncate">
            {selectedDataSet.name}
          </h1>
        </div>
        <button
          onClick={onToggleNight}
          className="p-2 shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {isNightMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto p-4 flex flex-col gap-4">
        {data.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 pb-6">
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
                          if (indexInShuffled !== -1) setCurrentIndex(indexInShuffled);
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

      {!checkingSentence && (
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
      )}
    </div>
  );
};
