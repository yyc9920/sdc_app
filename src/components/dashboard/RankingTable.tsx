import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import type { RankingEntry } from '../../hooks/useRankings';

interface RankingTableProps {
  rankings: RankingEntry[];
  formatValue: (value: number) => string;
  currentUserId?: string;
  loading?: boolean;
  emptyMessage?: string;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-5 h-5 text-yellow-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Award className="w-5 h-5 text-amber-600" />;
    default:
      return null;
  }
};

const getRankBgColor = (rank: number, isCurrentUser: boolean): string => {
  if (isCurrentUser) {
    return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700';
  }
  switch (rank) {
    case 1:
      return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700';
    case 2:
      return 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600';
    case 3:
      return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700';
    default:
      return 'bg-gray-50 dark:bg-gray-700/50 border-transparent';
  }
};

export const RankingTable: React.FC<RankingTableProps> = ({
  rankings,
  formatValue,
  currentUserId,
  loading,
  emptyMessage = '아직 랭킹 데이터가 없습니다.',
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rankings.map((entry) => {
        const isCurrentUser = entry.uid === currentUserId;
        const rankIcon = getRankIcon(entry.rank);
        
        return (
          <div
            key={entry.uid}
            className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border transition-all ${getRankBgColor(entry.rank, isCurrentUser)}`}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full font-bold ${
                entry.rank <= 3 
                  ? 'bg-white dark:bg-gray-800 shadow-sm' 
                  : 'bg-gray-100 dark:bg-gray-600'
              }`}>
                {rankIcon || (
                  <span className={`text-sm ${
                    entry.rank <= 10 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {entry.rank}
                  </span>
                )}
              </div>
              
              <div>
                <div className={`font-medium ${
                  isCurrentUser 
                    ? 'text-blue-700 dark:text-blue-300' 
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {entry.name}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-full">
                      나
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className={`text-lg sm:text-xl font-bold ${
              entry.rank === 1 
                ? 'text-yellow-600 dark:text-yellow-400' 
                : entry.rank === 2 
                  ? 'text-gray-600 dark:text-gray-300'
                  : entry.rank === 3
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-gray-700 dark:text-gray-200'
            }`}>
              {formatValue(entry.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
