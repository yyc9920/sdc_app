import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from './hooks/useData';
import { useSpeedListeningData } from './hooks/useSpeedListeningData';
import { useAuth } from './hooks/useAuth';
import { useUserProfile } from './hooks/useUserProfile';
import { Card } from './components/Card';
import { Controls } from './components/Controls';
import { LoginOverlay } from './components/auth/LoginOverlay';
import { OnboardingForm } from './components/auth/OnboardingForm';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { ProfilePage } from './components/dashboard/ProfilePage';
import { useAudio } from './hooks/useAudio';
import './App.css';
import type { SentenceData, DataSet, SpeedListeningSet } from './types';
import { PronunciationChecker } from './components/PronunciationChecker';
import { BookOpen, Plane, ChevronLeft, Moon, Sun, Headphones, Repeat } from 'lucide-react';
import { SpeedListeningQuiz } from './components/SpeedListeningQuiz';
import { LoadingSpinner } from './components/LoadingSpinner';

const DATA_SETS: DataSet[] = [
  {
    id: 'ultimate_speaking_beginner_1_1050',
    name: '끝장스피킹 초급 1',
    description: '1050문장',
    filename: 'ultimate_speaking_beginner_1_1050.csv'
  },
  {
    id: 'essential_travel_english_phrases_100',
    name: '필수 여행영어',
    description: '100문장',
    filename: 'essential_travel_english_phrases_100.csv'
  },
  {
    id: 'native_30_patterns',
    name: '원어민 핵심 패턴',
    description: '30문장',
    filename: 'frequent_30_patterns.csv'
  }
];

const formatSetTitle = (setId: string) => {
  const match = setId.match(/set(\d+)$/i);
  return match ? `Set ${match[1]}` : setId;
};

function App() {
  const [showSplash, setShowSplash] = useState(true);

  const [isLobby, setIsLobby] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'admin' | 'teacher' | 'profile'>('home');
  const { user, role, loading: authLoading, error: authError, loginWithCode } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid);
  const [learningMode, setLearningMode] = useState<'repetition' | 'speed_listening' | null>(null);
  const [selectedDataSet, setSelectedDataSet] = useState<DataSet | null>(null);
  const [selectedSpeedListeningSet, setSelectedSpeedListeningSet] = useState<SpeedListeningSet | null>(null);
  const [speedListeningSets, setSpeedListeningSets] = useState<SpeedListeningSet[]>([]);
  const [loadingSpeedListening, setLoadingSpeedListening] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');
  const { data, loading, error } = useData(selectedDataSet?.filename);
  
  const [isNightMode, setIsNightMode] = useState(false);
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

  const { data: speedListeningData, loading: slLoading } = useSpeedListeningData(selectedDataSet?.id || null);
  
  useEffect(() => {
    setTimeout(() => {
      setSpeedListeningSets(speedListeningData);
      setLoadingSpeedListening(slLoading);
    }, 0);
  }, [speedListeningData, slLoading]);

  const availableLevels = useMemo(() => {
    return Array.from(new Set(speedListeningSets.map(s => s.level))).sort((a, b) => a - b);
  }, [speedListeningSets]);

  const filteredSets = useMemo(() => {
    return selectedLevel === 'all' 
      ? speedListeningSets 
      : speedListeningSets.filter(s => s.level === selectedLevel);
  }, [speedListeningSets, selectedLevel]);
  
  // Reset settings when dataset changes
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
    const url = `${import.meta.env.BASE_URL}tts/${selectedDataSet.id}/${voice}/${activeSentence.id}.mp3`;
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
    if (learningMode === 'repetition') {
      setIsLobby(false);
    }
  };

  const selectSpeedListeningSet = (set: SpeedListeningSet) => {
    setSelectedSpeedListeningSet(set);
    setIsLobby(false);
  };

  const backToLobby = () => {
    setIsLobby(true);
    setIsPlaying(false);
    if (learningMode === 'speed_listening' && selectedSpeedListeningSet) {
      setSelectedSpeedListeningSet(null);
    } else if (selectedDataSet) {
      setSelectedDataSet(null);
    } else {
      setLearningMode(null);
    }
  };

  if (!user && !authLoading) {
    return <LoginOverlay onLogin={loginWithCode} loading={authLoading} error={authError} />;
  }

  if (authLoading || (user && profileLoading)) {
    return <LoadingSpinner fullScreen />;
  }

  if (user && profile && !profile.profileCompleted) {
    return <OnboardingForm />;
  }

  if (activeTab === 'admin' && role === 'admin') {
    return (
      <>
        <AdminDashboard />
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} role={role} />
      </>
    );
  }

  if (activeTab === 'teacher' && role === 'teacher') {
    return (
      <>
        <TeacherDashboard />
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} role={role} />
      </>
    );
  }

  if (activeTab === 'profile') {
    return (
      <>
        <ProfilePage />
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} role={role} />
      </>
    );
  }

  if (isLobby) {
    return (
      <>
        <div className={`min-h-screen ${isNightMode ? 'dark bg-gray-900' : 'bg-gray-50'} transition-colors duration-300 relative overflow-hidden`}>
        <AnimatePresence>
          {showSplash && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              onClick={() => setShowSplash(false)}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 cursor-pointer"
            >
              <motion.h1 
                initial={{ scale: 0.8, filter: 'blur(10px)', opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  filter: 'blur(0px)', 
                  opacity: 1,
                  textShadow: ['0px 0px 0px rgba(59,130,246,0)', '0px 0px 20px rgba(59,130,246,0.8)', '0px 0px 0px rgba(59,130,246,0)']
                }}
                transition={{ 
                  duration: 1.5,
                  textShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
                className="text-5xl md:text-7xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight text-center px-4"
              >
                SDC English Study
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                className="absolute bottom-20 text-gray-500 dark:text-gray-400 font-medium tracking-widest text-sm uppercase"
              >
                Touch anywhere to start
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showSplash ? 0 : 1 }}
          transition={{ duration: 0.5 }}
        >
          <header className="w-full max-w-4xl mx-auto flex justify-between items-center p-4 sm:p-6 bg-transparent gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              {(learningMode || selectedDataSet) && (
                <button 
                  onClick={() => {
                    if (selectedDataSet) setSelectedDataSet(null);
                    else if (learningMode) setLearningMode(null);
                  }}
                  className="p-2 -ml-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90 shrink-0"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              )}
              <h1 className="text-xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight truncate">
                SDC English Study
              </h1>
            </div>
            <button
              onClick={() => setIsNightMode(!isNightMode)}
              className="p-2 sm:p-3 shrink-0 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95"
            >
              {isNightMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>
          </header>

          <main className="max-w-4xl mx-auto p-6 flex flex-col gap-8">
            {!learningMode ? (
              <>
                <section className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">학습 모드 선택</h2>
                  <p className="text-gray-500 dark:text-gray-400">원하는 학습 방식을 선택하세요.</p>
                </section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    onClick={() => setLearningMode('repetition')}
                    className="group relative flex items-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-xl active:scale-[0.98]"
                  >
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl mr-4 group-hover:scale-110 transition-transform shrink-0">
                      <Repeat className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">반복 학습</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">문장을 반복해서 듣고 따라 말하기</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setLearningMode('speed_listening')}
                    className="group relative flex items-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-xl active:scale-[0.98]"
                  >
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl mr-4 group-hover:scale-110 transition-transform shrink-0">
                      <Headphones className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">스피드 리스닝</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">빠른 속도로 듣고 빈칸 채우기</p>
                    </div>
                  </button>
                </div>
              </>
            ) : !selectedDataSet ? (
              <>
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
                      <div className="text-left flex-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{set.name}</h3>
                        {set.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{set.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : learningMode === 'speed_listening' && !selectedSpeedListeningSet ? (
              <>
                <section className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">스피드 리스닝 세트 선택</h2>
                  <p className="text-gray-500 dark:text-gray-400">도전할 세트를 선택하세요.</p>
                </section>
                {loadingSpeedListening ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                      <button
                        onClick={() => setSelectedLevel('all')}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                          selectedLevel === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        전체
                      </button>
                      {availableLevels.map(level => (
                        <button
                          key={level}
                          onClick={() => setSelectedLevel(level)}
                          className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                            selectedLevel === level
                              ? 'bg-blue-600 text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          Level {level}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredSets.map((set) => (
                        <button
                          key={set.setId}
                          onClick={() => selectSpeedListeningSet(set)}
                          className="flex flex-col p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-md text-left"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{formatSetTitle(set.setId)}</h3>
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
                              Level {set.level}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 font-medium">{set.theme}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{set.sentences.length} sentences</p>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
              ) : null}
            </main>
          </motion.div>
        </div>
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} role={role} />
      </>
    );
  }

  if (learningMode === 'speed_listening' && selectedDataSet && selectedSpeedListeningSet) {
    return (
      <div className={`min-h-screen ${isNightMode ? 'dark bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
        <header className="w-full max-w-4xl mx-auto flex justify-between items-center p-3 sm:p-4 sticky top-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur z-40 border-b border-gray-200 dark:border-gray-700 gap-3">
          <div className="flex items-center gap-1 sm:gap-3 flex-1 min-w-0">
            <button 
              onClick={backToLobby}
              className="p-2 -ml-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90 shrink-0"
              title="Back"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white truncate">
              {selectedDataSet.name} <span className="text-gray-400 mx-1 font-normal">|</span> Lv.{selectedSpeedListeningSet.level} {formatSetTitle(selectedSpeedListeningSet.setId)}
            </h1>
          </div>
          <button
            onClick={() => setIsNightMode(!isNightMode)}
            className="p-2 shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isNightMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>
        </header>
        <main className="w-full max-w-4xl mx-auto flex flex-col flex-1 p-4 gap-4 pb-10">
          <SpeedListeningQuiz
            datasetId={selectedDataSet.id}
            set={selectedSpeedListeningSet}
            onNext={(() => {
              const currentIndex = speedListeningSets.findIndex(s => s.setId === selectedSpeedListeningSet.setId);
              const nextSet = speedListeningSets[currentIndex + 1];
              return nextSet ? () => setSelectedSpeedListeningSet(nextSet) : undefined;
            })()}
          />
        </main>
      </div>
    );
  }

  if (loading) return <LoadingSpinner fullScreen />;
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
      <header className="w-full max-w-4xl mx-auto flex justify-between items-center p-3 sm:p-4 sticky top-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur z-40 border-b border-gray-200 dark:border-gray-700 gap-3">
        <div className="flex items-center gap-1 sm:gap-3 flex-1 min-w-0">
          <button 
            onClick={backToLobby}
            className="p-2 -ml-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90 shrink-0"
            title="Lobby"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white truncate">
            {selectedDataSet?.name}
          </h1>
        </div>
        <button
          onClick={() => setIsNightMode(!isNightMode)}
          className="p-2 shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
}

export default App;
