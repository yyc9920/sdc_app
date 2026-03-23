import React from 'react';
import { TrendingUp, CheckCircle, AlertTriangle, Zap, Clock, Turtle } from 'lucide-react';
import { useLevelRecommendation } from '../../hooks/useLevelRecommendation';

interface LevelRecommendationBadgeProps {
  uid: string | undefined;
  currentLevel: number | 'all';
  onSelectLevel: (level: number) => void;
}

export const LevelRecommendationBadge: React.FC<LevelRecommendationBadgeProps> = ({
  uid,
  currentLevel,
  onSelectLevel,
}) => {
  const recommendation = useLevelRecommendation(uid);

  if (!recommendation || recommendation.confidence < 0.4) {
    return null;
  }

  let Icon = CheckCircle;
  let message = '';
  let bgColor = 'bg-blue-50 dark:bg-blue-900/20';
  let borderColor = 'border-blue-200 dark:border-blue-800';
  let textColor = 'text-blue-800 dark:text-blue-300';
  let iconColor = 'text-blue-600 dark:text-blue-400';
  let buttonBg = 'bg-blue-600 hover:bg-blue-700';
  let showButton = false;

  const recLevel = recommendation.recommendedLevel;

  if (currentLevel === 'all' || currentLevel < recLevel) {
    showButton = true;
    if (recommendation.reason === 'high_performance') {
      Icon = TrendingUp;
      message = `실력이 늘었어요! Lv. ${recLevel}에 도전해보세요.`;
      bgColor = 'bg-green-50 dark:bg-green-900/20';
      borderColor = 'border-green-200 dark:border-green-800';
      textColor = 'text-green-800 dark:text-green-300';
      iconColor = 'text-green-600 dark:text-green-400';
      buttonBg = 'bg-green-600 hover:bg-green-700';
    } else if (recommendation.reason === 'maintain') {
      Icon = CheckCircle;
      message = `Lv. ${recLevel} 도전을 권장해요!`;
    } else {
      Icon = AlertTriangle;
      message = `조금 더 연습이 필요해요. Lv. ${recLevel}로 복습해볼까요?`;
      bgColor = 'bg-amber-50 dark:bg-amber-900/20';
      borderColor = 'border-amber-200 dark:border-amber-800';
      textColor = 'text-amber-800 dark:text-amber-300';
      iconColor = 'text-amber-600 dark:text-amber-400';
      buttonBg = 'bg-amber-600 hover:bg-amber-700';
    }
  } else if (currentLevel === recLevel) {
    Icon = Zap;
    message = `현재 권장 레벨이군요! 꾸준히 연습해서 레벨 업에 도전해보세요!`;
  } else {
    Icon = TrendingUp;
    message = `권장 레벨은 Lv. ${recLevel}이지만, 더 높은 Lv. ${currentLevel}에 도전하는 모습이 멋집니다! 응원해요!`;
    bgColor = 'bg-purple-50 dark:bg-purple-900/20';
    borderColor = 'border-purple-200 dark:border-purple-800';
    textColor = 'text-purple-800 dark:text-purple-300';
    iconColor = 'text-purple-600 dark:text-purple-400';
  }

  const speedConfig = {
    fast: { icon: Zap, label: '빠름', color: 'text-green-600 dark:text-green-400' },
    normal: { icon: Clock, label: '보통', color: 'text-blue-600 dark:text-blue-400' },
    slow: { icon: Turtle, label: '느림', color: 'text-amber-600 dark:text-amber-400' },
  };

  const { icon: SpeedIcon, label: speedLabel, color: speedColor } = 
    speedConfig[recommendation.speedRating];

  return (
    <div className={`${bgColor} ${borderColor} border rounded-2xl p-4 mb-4`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${textColor}`}>{message}</p>
          <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm mt-2 ${textColor} opacity-75`}>
            <span>정확도: {recommendation.recentAvgScore}%</span>
            <span className="flex items-center gap-1">
              <SpeedIcon className={`w-3.5 h-3.5 ${speedColor}`} />
              <span>속도: {speedLabel} ({recommendation.avgSecondsPerBlank}초/빈칸)</span>
            </span>
            <span>종합: {recommendation.efficiencyScore}점</span>
          </div>
        </div>

        {showButton && (
          <button
            onClick={() => onSelectLevel(recLevel)}
            className={`${buttonBg} text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap`}
          >
            Lv.{recLevel} 선택
          </button>
        )}
      </div>
    </div>
  );
};
