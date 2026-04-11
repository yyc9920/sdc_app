import React, { useState } from 'react';
import { Clock, Target, Flame, BarChart3 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useRankings, type RankingType } from '../../hooks/useRankings';
import { RankingTable } from './RankingTable';
import { LoadingSpinner } from '../LoadingSpinner';
import { MODE_CONFIG, TRAINING_MODES } from '../../utils/modeConfig';
import type { TrainingMode } from '../../types';

type RankingCategory = 'general' | 'perMode';

interface GeneralTabConfig {
  id: RankingType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const GENERAL_TABS: GeneralTabConfig[] = [
  {
    id: 'total_study_time',
    label: '학습 시간',
    icon: <Clock className="w-4 h-4" />,
    description: '전체 누적 학습 시간 순위',
  },
  {
    id: 'total_mastered',
    label: '마스터',
    icon: <Target className="w-4 h-4" />,
    description: '마스터한 문장 수 순위',
  },
  {
    id: 'current_streak',
    label: '연속 학습',
    icon: <Flame className="w-4 h-4" />,
    description: '현재 연속 학습일 순위',
  },
];

const modeToRankingType = (mode: TrainingMode): RankingType => {
  const map: Record<TrainingMode, RankingType> = {
    repetition: 'mode_repetition_sessions',
    speedListening: 'mode_speedListening_sessions',
    infiniteSpeaking: 'mode_infiniteSpeaking_sessions',
    rolePlay: 'mode_rolePlay_sessions',
    vocab: 'mode_vocab_sessions',
    freeResponse: 'mode_freeResponse_sessions',
  };
  return map[mode];
};

export const RankingPage: React.FC = () => {
  const { user } = useAuth();
  const [category, setCategory] = useState<RankingCategory>('general');
  const [generalTab, setGeneralTab] = useState<RankingType>('total_study_time');
  const [modeTab, setModeTab] = useState<TrainingMode>('repetition');

  const activeTab = category === 'general' ? generalTab : modeToRankingType(modeTab);
  const { rankings, loading, error, config, formatValue, getUserRank } = useRankings(activeTab, 50);

  const currentUserRank = user ? getUserRank(user.uid) : null;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <header className="shrink-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <img src="/sdc_logo.png" alt="SDC" className="w-8 h-8 object-contain" />
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            랭킹
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          학습자들과 경쟁하며 성장하세요
        </p>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {currentUserRank && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">나의 {config.label} 순위</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">{currentUserRank.rank}</span>
                  <span className="text-blue-200">위</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-blue-100 text-sm mb-1">{config.label}</p>
                <p className="text-2xl font-bold">{formatValue(currentUserRank.value)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Category Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setCategory('general')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
              category === 'general'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            종합
          </button>
          <button
            onClick={() => setCategory('perMode')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
              category === 'perMode'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <Target className="w-4 h-4" />
            모드별
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Sub-tabs */}
          {category === 'general' ? (
            <div className="flex border-b border-gray-100 dark:border-gray-700">
              {GENERAL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setGeneralTab(tab.id)}
                  aria-label={tab.label}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 px-3 text-sm font-medium transition-all min-h-[44px] ${
                    generalTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex overflow-x-auto border-b border-gray-100 dark:border-gray-700 scrollbar-hide">
              {TRAINING_MODES.map((mode) => {
                const modeConfig = MODE_CONFIG[mode];
                const Icon = modeConfig.icon;
                const isActive = modeTab === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setModeTab(mode)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap shrink-0 transition-colors min-h-[44px] ${
                      isActive
                        ? `${modeConfig.iconClass} border-b-2 border-current bg-gray-50 dark:bg-gray-700/30`
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{modeConfig.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {config.label} TOP 50
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400 text-right shrink-0 ml-2">
                {category === 'general'
                  ? GENERAL_TABS.find(t => t.id === generalTab)?.description
                  : '완료 세션 수 순위'}
              </span>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : error ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                데이터를 불러오지 못했습니다.
                <br />
                <span className="text-sm">잠시 후 다시 시도해주세요.</span>
              </div>
            ) : (
              <RankingTable
                rankings={rankings}
                formatValue={formatValue}
                currentUserId={user?.uid}
                emptyMessage="아직 학습 기록이 있는 사용자가 없습니다. 첫 번째 랭커가 되어보세요!"
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
