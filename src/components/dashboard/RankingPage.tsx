import React, { useState } from 'react';
import { Trophy, Clock, Target, Flame } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useRankings, type RankingType } from '../../hooks/useRankings';
import { RankingTable } from './RankingTable';
import { LoadingSpinner } from '../LoadingSpinner';

interface TabConfig {
  id: RankingType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TABS: TabConfig[] = [
  { 
    id: 'total_study_time', 
    label: '학습 시간', 
    icon: <Clock className="w-4 h-4" />,
    description: '전체 누적 학습 시간 순위'
  },
  { 
    id: 'total_mastered', 
    label: '마스터', 
    icon: <Target className="w-4 h-4" />,
    description: '마스터한 문장 수 순위'
  },
  { 
    id: 'current_streak', 
    label: '연속 학습', 
    icon: <Flame className="w-4 h-4" />,
    description: '현재 연속 학습일 순위'
  },
];

export const RankingPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<RankingType>('total_study_time');
  
  const { rankings, loading, config, formatValue, getUserRank } = useRankings(activeTab, 50);

  const currentUserRank = user ? getUserRank(user.uid) : null;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-7 h-7 text-yellow-500" />
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              랭킹
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              학습자들과 경쟁하며 성장하세요
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 space-y-6">
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

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="flex border-b border-gray-100 dark:border-gray-700">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 px-3 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {config.label} TOP 50
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {TABS.find(t => t.id === activeTab)?.description}
              </span>
            </div>

            {loading ? (
              <LoadingSpinner />
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
