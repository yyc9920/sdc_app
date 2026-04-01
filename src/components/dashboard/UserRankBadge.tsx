import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

interface UserRankBadgeProps {
  rank: number | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const BADGE_CONFIGS = {
  1: {
    icon: Trophy,
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColor: 'text-yellow-500',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    label: '1위',
  },
  2: {
    icon: Medal,
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    iconColor: 'text-gray-400',
    textColor: 'text-gray-600 dark:text-gray-300',
    label: '2위',
  },
  3: {
    icon: Award,
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600',
    textColor: 'text-amber-700 dark:text-amber-400',
    label: '3위',
  },
};

const SIZE_CLASSES = {
  sm: {
    container: 'px-2 py-1 gap-1',
    icon: 'w-3 h-3',
    text: 'text-xs',
  },
  md: {
    container: 'px-3 py-1.5 gap-1.5',
    icon: 'w-4 h-4',
    text: 'text-sm',
  },
  lg: {
    container: 'px-4 py-2 gap-2',
    icon: 'w-5 h-5',
    text: 'text-base',
  },
};

export const UserRankBadge: React.FC<UserRankBadgeProps> = ({
  rank,
  size = 'md',
  showLabel = true,
}) => {
  if (rank === null || rank <= 0) {
    return null;
  }

  const sizeClass = SIZE_CLASSES[size];

  if (rank <= 3) {
    const config = BADGE_CONFIGS[rank as 1 | 2 | 3];
    const IconComponent = config.icon;

    return (
      <div className={`inline-flex items-center rounded-full ${config.bgColor} ${sizeClass.container}`}>
        <IconComponent className={`${sizeClass.icon} ${config.iconColor}`} />
        {showLabel && (
          <span className={`font-bold ${sizeClass.text} ${config.textColor}`}>
            {config.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 ${sizeClass.container}`}>
      <span className={`font-bold ${sizeClass.text} text-blue-700 dark:text-blue-400`}>
        {rank}위
      </span>
    </div>
  );
};
