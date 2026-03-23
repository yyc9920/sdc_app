import React from 'react';
import { Clock, Trophy, Flame, Target } from 'lucide-react';
import type { UserProfile } from '../../hooks/useUserProfile';
import type { DailyStatsData } from '../../hooks/useDailyStats';

interface StatsOverviewProps {
  profile: UserProfile | null;
  todayStats: DailyStatsData | null;
}

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}초`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
};

export const StatsOverview: React.FC<StatsOverviewProps> = ({ profile, todayStats }) => {
  const stats = profile?.stats;
  
  const cards = [
    {
      icon: Clock,
      label: '오늘 학습',
      value: formatTime(todayStats?.studyTimeSeconds || 0),
      subValue: `총 ${formatTime(stats?.totalStudyTimeSeconds || 0)}`,
      color: 'blue',
    },
    {
      icon: Trophy,
      label: '마스터한 문장',
      value: `${stats?.totalMasteredCount || 0}개`,
      subValue: `오늘 ${todayStats?.sentencesMastered || 0}개`,
      color: 'amber',
    },
    {
      icon: Flame,
      label: '연속 학습',
      value: `${stats?.currentStreak || 0}일`,
      subValue: `최장 ${stats?.longestStreak || 0}일`,
      color: 'orange',
    },
    {
      icon: Target,
      label: '오늘 학습 문장',
      value: `${todayStats?.sentencesStudied || 0}개`,
      subValue: `${todayStats?.sessionsCount || 0}회 세션`,
      color: 'green',
    },
  ];

  const colorMap: Record<string, { bg: string; icon: string; ring: string }> = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      icon: 'text-blue-600 dark:text-blue-400',
      ring: 'ring-blue-500/20',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      icon: 'text-amber-600 dark:text-amber-400',
      ring: 'ring-amber-500/20',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      icon: 'text-orange-600 dark:text-orange-400',
      ring: 'ring-orange-500/20',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      icon: 'text-green-600 dark:text-green-400',
      ring: 'ring-green-500/20',
    },
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {cards.map((card) => {
        const colors = colorMap[card.color];
        return (
          <div
            key={card.label}
            className={`${colors.bg} rounded-2xl p-4 sm:p-5 ring-1 ${colors.ring}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-5 h-5 ${colors.icon}`} />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {card.label}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {card.value}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {card.subValue}
            </div>
          </div>
        );
      })}
    </div>
  );
};
