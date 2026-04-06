export const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'] as const;

export const MONTHS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
] as const;

// Thresholds in seconds: 0=none, 300=5min, 900=15min, 1800=30min
export const INTENSITY_THRESHOLDS = {
  NONE: 0,
  LIGHT: 300,
  MODERATE: 900,
  HEAVY: 1800,
} as const;

export const getIntensity = (seconds: number): number => {
  if (seconds === 0) return 0;
  if (seconds < INTENSITY_THRESHOLDS.LIGHT) return 1;
  if (seconds < INTENSITY_THRESHOLDS.MODERATE) return 2;
  if (seconds < INTENSITY_THRESHOLDS.HEAVY) return 3;
  return 4;
};

export const INTENSITY_COLORS = [
  'bg-gray-100 dark:bg-gray-800',
  'bg-green-200 dark:bg-green-900',
  'bg-green-400 dark:bg-green-700',
  'bg-green-500 dark:bg-green-600',
  'bg-green-600 dark:bg-green-500',
] as const;

export const MOTIVATIONAL_MESSAGES = {
  NONE: '학습 기록이 없어요. 오늘부터 시작해볼까요?',
  LIGHT: '첫걸음을 떼셨네요! 꾸준함이 중요해요.',
  MODERATE: '잘하고 있어요! 집중하는 모습이 멋져요.',
  HEAVY: '엄청난 노력이에요! 오늘도 성장하고 있네요.',
  INTENSE: '정말 대단해요! 오늘의 열정이 내일의 실력이 될 거예요.',
} as const;

export const getMotivationalMessage = (seconds: number): string => {
  if (seconds === 0) return MOTIVATIONAL_MESSAGES.NONE;
  if (seconds < INTENSITY_THRESHOLDS.LIGHT) return MOTIVATIONAL_MESSAGES.LIGHT;
  if (seconds < INTENSITY_THRESHOLDS.MODERATE) return MOTIVATIONAL_MESSAGES.MODERATE;
  if (seconds < INTENSITY_THRESHOLDS.HEAVY) return MOTIVATIONAL_MESSAGES.HEAVY;
  return MOTIVATIONAL_MESSAGES.INTENSE;
};
