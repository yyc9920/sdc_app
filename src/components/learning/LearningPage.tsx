import { useState, useMemo } from 'react';
import { useSpeedListeningData } from '../../hooks/useSpeedListeningData';
import { usePrefetchData } from '../../hooks/useData';
import { useTTSPrefetch } from '../../hooks/useTTSPrefetch';
import { useLearningSetsBrowser } from '../../hooks/useLearningSetsBrowser';
import { useAuth } from '../../hooks/useAuth';
import { SpeedListeningQuiz } from '../SpeedListeningQuiz';
import { LevelRecommendationBadge } from '../speed-listening/LevelRecommendationBadge';
import { LoadingSpinner } from '../LoadingSpinner';
import { InfiniteSpeakingPage } from './InfiniteSpeaking/InfiniteSpeakingPage';
import { RepetitionPage } from './Repetition/RepetitionPage';
import { RolePlayPage } from './RolePlay/RolePlayPage';
import { VocabPage } from './Vocab/VocabPage';
import { FreeResponsePage } from './FreeResponse/FreeResponsePage';
import { LevelSelector } from '../home/LevelSelector';
import { CategorySelector } from '../home/CategorySelector';
import { SetSelector } from '../home/SetSelector';
import { ChevronLeft, Moon, Sun, Headphones, Mic2, BookOpen, RefreshCw, MessageSquare, PenTool } from 'lucide-react';
import type { DataSet, SpeedListeningSet, LearningLevel, CategoryCode, LearningSetMeta } from '../../types';

interface LearningPageProps {
  isNightMode: boolean;
  onToggleNight: () => void;
}

const formatSetTitle = (setId: string) => {
  const match = setId.match(/set(\d+)$/i);
  return match ? `Set ${match[1]}` : setId;
};

type LearningMode = 'repetition' | 'speed_listening' | 'infinite_speaking' | 'role_play' | 'vocab' | 'free_response' | null;

export const LearningPage = ({ isNightMode, onToggleNight }: LearningPageProps) => {
  const { user } = useAuth();
  const { prefetch } = usePrefetchData();
  const [mode, setMode] = useState<LearningMode>(null);
  const { levels, loading: browsing } = useLearningSetsBrowser(mode);
  const [navLevel, setNavLevel] = useState<LearningLevel | null>(null);
  const [navCategory, setNavCategory] = useState<CategoryCode | null>(null);
  const [selectedDataSet, setSelectedDataSet] = useState<DataSet | null>(null);
  const [selectedSpeedListeningSet, setSelectedSpeedListeningSet] = useState<SpeedListeningSet | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');

  useTTSPrefetch(selectedDataSet?.id ?? null);

  // M1 fix: Reset navigation state when switching modes
  const selectMode = (newMode: LearningMode) => {
    setMode(newMode);
    setNavLevel(null);
    setNavCategory(null);
    setSelectedDataSet(null);
    setSelectedSpeedListeningSet(null);
    setSelectedLevel('all');
  };

  const currentLevelGroup = levels.find(l => l.level === navLevel);
  const currentCategoryGroup = currentLevelGroup?.categories.find(c => c.code === navCategory);

  const handleSetSelect = (meta: LearningSetMeta) => {
    setSelectedDataSet({
      id: meta.setId,
      name: meta.title,
      description: `${meta.sentenceCount}문장`,
      level: meta.level,
      category: meta.category,
      isLegacy: meta.isLegacy,
    });
    prefetch(meta.setId);
  };

  const { data: speedListeningData, loading: slLoading } = useSpeedListeningData(
    mode === 'speed_listening' && selectedDataSet ? selectedDataSet.id : null
  );

  const availableLevels = useMemo(() => {
    return Array.from(new Set(speedListeningData.map(s => s.level))).sort((a, b) => a - b);
  }, [speedListeningData]);

  const filteredSets = useMemo(() => {
    return selectedLevel === 'all'
      ? speedListeningData
      : speedListeningData.filter(s => s.level === selectedLevel);
  }, [speedListeningData, selectedLevel]);

  const handleBack = () => {
    if (selectedSpeedListeningSet) {
      setSelectedSpeedListeningSet(null);
    } else if (selectedDataSet) {
      setSelectedDataSet(null);
    } else if (navCategory) {
      setNavCategory(null);
    } else if (navLevel !== null) {
      setNavLevel(null);
    } else if (mode) {
      selectMode(null);
    }
  };

  // Infinite Speaking active session
  if (mode === 'infinite_speaking' && selectedDataSet) {
    return (
      <InfiniteSpeakingPage
        dataSet={selectedDataSet}
        isNightMode={isNightMode}
        onToggleNight={onToggleNight}
        onBack={() => { setSelectedDataSet(null); }}
      />
    );
  }

  // Repetition active session
  if (mode === 'repetition' && selectedDataSet) {
    return (
      <RepetitionPage
        dataSet={selectedDataSet}
        isNightMode={isNightMode}
        onToggleNight={onToggleNight}
        onBack={() => { setSelectedDataSet(null); }}
      />
    );
  }

  // Vocab active session
  if (mode === 'vocab' && selectedDataSet) {
    return (
      <VocabPage
        setId={selectedDataSet.id}
        setTitle={selectedDataSet.name}
        isNightMode={isNightMode}
        onToggleNight={onToggleNight}
        onBack={() => { setSelectedDataSet(null); }}
      />
    );
  }

  // Role Play active session
  if (mode === 'role_play' && selectedDataSet) {
    return (
      <RolePlayPage
        setId={selectedDataSet.id}
        setName={selectedDataSet.name}
        isNightMode={isNightMode}
        onToggleNight={onToggleNight}
        onBack={() => { setSelectedDataSet(null); }}
      />
    );
  }

  // Free Response active session
  if (mode === 'free_response' && selectedDataSet) {
    return (
      <FreeResponsePage
        setId={selectedDataSet.id}
        isNightMode={isNightMode}
        onToggleNight={onToggleNight}
        onBack={() => { setSelectedDataSet(null); }}
      />
    );
  }

  // Speed Listening active session — uses legacy SpeedListeningQuiz (stable mobile TTS)
  if (mode === 'speed_listening' && selectedDataSet && selectedSpeedListeningSet) {
    const currentIndex = speedListeningData.findIndex(s => s.setId === selectedSpeedListeningSet.setId);
    const nextSet = speedListeningData[currentIndex + 1];
    return (
      <div className={`h-full ${isNightMode ? 'dark bg-gray-900' : 'bg-gray-50'} overflow-y-auto`}>
        <SpeedListeningQuiz
          set={selectedSpeedListeningSet}
          onNext={nextSet ? () => setSelectedSpeedListeningSet(nextSet) : undefined}
          onFinish={() => { setSelectedSpeedListeningSet(null); setSelectedDataSet(null); }}
        />
      </div>
    );
  }

  // Lobby screens
  return (
    <div className={`h-full ${isNightMode ? 'dark bg-gray-900' : 'bg-gray-50'} flex flex-col transition-colors duration-300 overflow-hidden`}>
      <header className="shrink-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {(mode || selectedDataSet) && (
              <button
                onClick={handleBack}
                className="p-2.5 -ml-2.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90 shrink-0"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-3">
                <img src="/sdc_logo.png" alt="SDC" className="w-8 h-8 object-contain" />
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  학습
                </h1>
              </div>
              {!mode && !selectedDataSet && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  학습 모드를 선택하세요
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onToggleNight}
            className="p-2.5 shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {isNightMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>
        </div>
      </header>

      {/* Speed Listening level filter - fixed between header and scrollable content */}
      {mode === 'speed_listening' && selectedDataSet && !selectedSpeedListeningSet && !slLoading && (
        <div className="shrink-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-2">
          <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
            <button
              onClick={() => setSelectedLevel('all')}
              className={`flex-shrink-0 snap-start px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
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
                className={`flex-shrink-0 snap-start px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                  selectedLevel === level
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Level {level}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto max-w-4xl mx-auto p-6 flex flex-col gap-8 w-full pb-6">
        {/* Step 1: Mode selection */}
        {!mode && (
          <>
            <section className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">학습 모드 선택</h2>
              <p className="text-gray-500 dark:text-gray-400">원하는 학습 방식을 선택하세요.</p>
            </section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => selectMode('speed_listening')}
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
              <button
                onClick={() => selectMode('infinite_speaking')}
                className="group relative flex items-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border-2 border-transparent hover:border-purple-500 dark:hover:border-purple-400 transition-all hover:shadow-xl active:scale-[0.98]"
              >
                <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-2xl mr-4 group-hover:scale-110 transition-transform shrink-0">
                  <Mic2 className="w-8 h-8 text-purple-500" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">무한 스피킹</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">단계별로 문장을 말하며 스피킹 훈련</p>
                </div>
              </button>
              <button
                onClick={() => selectMode('vocab')}
                className="group relative flex items-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border-2 border-transparent hover:border-emerald-500 dark:hover:border-emerald-400 transition-all hover:shadow-xl active:scale-[0.98]"
              >
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl mr-4 group-hover:scale-110 transition-transform shrink-0">
                  <BookOpen className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">어휘 학습</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">표현을 카드로 익히고 문장으로 말하기</p>
                </div>
              </button>
              <button
                onClick={() => selectMode('repetition')}
                className="group relative flex items-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border-2 border-transparent hover:border-orange-500 dark:hover:border-orange-400 transition-all hover:shadow-xl active:scale-[0.98]"
              >
                <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-2xl mr-4 group-hover:scale-110 transition-transform shrink-0">
                  <RefreshCw className="w-8 h-8 text-orange-500" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">반복 학습</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">카드 형태로 문장을 반복하며 학습</p>
                </div>
              </button>
              <button
                onClick={() => selectMode('role_play')}
                className="group relative flex items-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border-2 border-transparent hover:border-pink-500 dark:hover:border-pink-400 transition-all hover:shadow-xl active:scale-[0.98]"
              >
                <div className="p-3 bg-pink-50 dark:bg-pink-900/30 rounded-2xl mr-4 group-hover:scale-110 transition-transform shrink-0">
                  <MessageSquare className="w-8 h-8 text-pink-500" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">대화 롤플레이</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">역할을 선택하고 대화 연습</p>
                </div>
              </button>
              <button
                onClick={() => selectMode('free_response')}
                className="group relative flex items-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border-2 border-transparent hover:border-rose-500 dark:hover:border-rose-400 transition-all hover:shadow-xl active:scale-[0.98]"
              >
                <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-2xl mr-4 group-hover:scale-110 transition-transform shrink-0">
                  <PenTool className="w-8 h-8 text-rose-500" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">자유 스피킹</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">주제를 듣고 자유롭게 말한 뒤 모범답안 비교</p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Step 2: Dataset selection (Level > Category > Set) */}
        {mode && !selectedDataSet && (
          <>
            <section className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">학습 세트 선택</h2>
              <p className="text-gray-500 dark:text-gray-400">
                {navCategory ? '학습할 세트를 선택하세요' : navLevel !== null ? '카테고리를 선택하세요' : '레벨을 선택하세요'}
              </p>
            </section>
            {browsing ? (
              <LoadingSpinner />
            ) : navCategory && currentCategoryGroup ? (
              <SetSelector
                sets={currentCategoryGroup.sets}
                categoryLabel={currentCategoryGroup.label}
                onSelect={handleSetSelect}
              />
            ) : navLevel !== null && currentLevelGroup ? (
              <CategorySelector
                categories={currentLevelGroup.categories}
                levelLabel={currentLevelGroup.label}
                onSelect={(code) => setNavCategory(code)}
              />
            ) : (
              <LevelSelector
                levels={levels}
                onSelect={(level) => setNavLevel(level)}
              />
            )}
          </>
        )}

        {/* Step 3: Speed Listening set selection */}
        {mode === 'speed_listening' && selectedDataSet && !selectedSpeedListeningSet && (
          <>
            <section className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">스피드 리스닝 세트 선택</h2>
              <p className="text-gray-500 dark:text-gray-400">도전할 세트를 선택하세요.</p>
            </section>
            {slLoading ? (
              <LoadingSpinner />
            ) : (
              <>
                <LevelRecommendationBadge
                  uid={user?.uid}
                  currentLevel={selectedLevel}
                  onSelectLevel={(level) => setSelectedLevel(level)}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSets.map((set) => (
                    <button
                      key={set.setId}
                      onClick={() => setSelectedSpeedListeningSet(set)}
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
        )}
      </main>
    </div>
  );
};
