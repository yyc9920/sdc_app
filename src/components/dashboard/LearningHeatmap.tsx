import React, { useMemo, useState } from 'react';
import type { DailyStatsData } from '../../hooks/useDailyStats';
import {
  DAYS_OF_WEEK,
  MONTHS,
  INTENSITY_COLORS,
  getIntensity,
  getMotivationalMessage,
} from '../../constants';

interface LearningHeatmapProps {
  stats: DailyStatsData[];
  weeks?: number;
}

interface TooltipData {
  content: string;
  x: number;
  y: number;
}

export const LearningHeatmap: React.FC<LearningHeatmapProps> = ({ stats, weeks = 12 }) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const { grid, monthLabels } = useMemo(() => {
    const statsMap = new Map<string, DailyStatsData>();
    stats.forEach(s => statsMap.set(s.date, s));

    const today = new Date();
    const totalDays = weeks * 7;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - totalDays + 1);

    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const grid: Array<Array<{ date: string; intensity: number; seconds: number }>> = [];
    const monthLabelsInitial: Array<{ label: string; col: number }> = [];
    const monthSet = new Set<number>();

    for (let week = 0; week < weeks + 1; week++) {
      const weekData: Array<{ date: string; intensity: number; seconds: number }> = [];
      
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + week * 7 + day);
        
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        const stat = statsMap.get(dateStr);
        const seconds = stat?.studyTimeSeconds || 0;
        
        weekData.push({
          date: dateStr,
          intensity: getIntensity(seconds),
          seconds,
        });

        const currentMonth = currentDate.getMonth();
        if (!monthSet.has(currentMonth)) {
          monthSet.add(currentMonth);
          monthLabelsInitial.push({ label: MONTHS[currentMonth], col: week });
        }
      }
      
      grid.push(weekData);
    }

    const monthLabels = monthLabelsInitial.filter((label, index) => {
      if (index === 0) return true;
      const prevLabel = monthLabelsInitial[index - 1];
      return label.col > prevLabel.col + 1;
    });

    return { grid, monthLabels };
  }, [stats, weeks]);

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '학습 기록 없음';
    if (seconds < 60) return `${seconds}초`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}시간 ${mins}분`;
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, day: { date: string; seconds: number }) => {
    const message = getMotivationalMessage(day.seconds);
    const date = new Date(day.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    setTooltip({
      content: `${date}: ${formatTime(day.seconds)}<br />${message}`,
      x: e.clientX,
      y: e.clientY,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">학습 활동</h3>
      
      <div className="overflow-x-auto relative">
        <div className="inline-block min-w-full">
          <div className="flex gap-1 mb-1 text-xs text-gray-400" style={{ paddingLeft: '2rem' }}>
            {monthLabels.map((m, i) => (
              <div 
                key={i} 
                className="absolute"
                style={{ transform: `translateX(${m.col * 16}px)` }}
              >
                {m.label}
              </div>
            ))}
          </div>
          
          <div className="flex gap-1 mt-6">
            <div className="flex flex-col gap-1 text-xs text-gray-400 w-8 mr-2">
              {DAYS_OF_WEEK.map((day, i) => (
                <div key={day} className="h-3 flex items-center" style={{ visibility: i % 2 === 1 ? 'visible' : 'hidden' }}>
                  {day}
                </div>
              ))}
            </div>
            
            <div className="flex gap-1">
              {grid.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {week.map((day, dayIdx) => (
                    <div
                      key={`${weekIdx}-${dayIdx}`}
                      className={`w-3 h-3 rounded-sm ${INTENSITY_COLORS[day.intensity]} cursor-pointer transition-transform hover:scale-125`}
                      onMouseEnter={(e) => handleMouseEnter(e, day)}
                      onMouseLeave={() => setTooltip(null)}
                      onMouseMove={(e) => setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {tooltip && (
        <div
          className="fixed z-10 p-2 text-xs text-white bg-gray-900 rounded-md shadow-lg pointer-events-none"
          style={{ left: tooltip.x + 10, top: tooltip.y - 28 }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}

      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
        <span>적음</span>
        <div className="flex gap-1">
          {INTENSITY_COLORS.map((color, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
          ))}
        </div>
        <span>많음</span>
      </div>
    </div>
  );
};
