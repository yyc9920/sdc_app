import React, { useState, useCallback } from 'react';
import type { TrainingMode } from '../../types';
import { useQuizHistory } from '../../hooks/useQuizHistory';
import { useSpeakingHistory } from '../../hooks/useSpeakingHistory';
import { MODE_CONFIG, TRAINING_MODES } from '../../utils/modeConfig';
import { QuizHistory } from './QuizHistory';
import { SpeakingHistory } from './SpeakingHistory';

interface ModeHistoryTabsProps {
  uid: string;
}

export const ModeHistoryTabs: React.FC<ModeHistoryTabsProps> = ({ uid }) => {
  const [activeMode, setActiveMode] = useState<TrainingMode>('repetition');
  const [activatedModes, setActivatedModes] = useState<Set<TrainingMode>>(new Set(['repetition']));

  const handleTabChange = useCallback((mode: TrainingMode) => {
    setActivatedModes(prev => {
      if (prev.has(mode)) return prev;
      const next = new Set(prev);
      next.add(mode);
      return next;
    });
    setActiveMode(mode);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div
        className="flex overflow-x-auto border-b border-gray-100 dark:border-gray-700 scrollbar-hide"
      >
        {TRAINING_MODES.map((mode) => {
          const config = MODE_CONFIG[mode];
          const Icon = config.icon;
          const isActive = activeMode === mode;
          return (
            <button
              key={mode}
              onClick={() => handleTabChange(mode)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap shrink-0 transition-colors min-h-[44px] ${
                isActive
                  ? `${config.iconClass} border-b-2 border-current bg-gray-50 dark:bg-gray-700/30`
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-6">
        {activeMode === 'speedListening' ? (
          <SpeedListeningTab uid={uid} activated={activatedModes.has('speedListening')} />
        ) : (
          <SpeakingModeTab uid={uid} mode={activeMode} activated={activatedModes.has(activeMode)} />
        )}
      </div>
    </div>
  );
};

const SpeedListeningTab: React.FC<{ uid: string; activated: boolean }> = ({ uid, activated }) => {
  const { results, loading } = useQuizHistory(activated ? uid : undefined);
  return <QuizHistory results={results} loading={loading} embedded />;
};

const SpeakingModeTab: React.FC<{ uid: string; mode: TrainingMode; activated: boolean }> = ({
  uid,
  mode,
  activated,
}) => {
  const { results, loading } = useSpeakingHistory(activated ? uid : undefined, 20, mode);
  const config = MODE_CONFIG[mode];
  return (
    <SpeakingHistory
      results={results}
      loading={loading}
      modeLabel={config.label}
      modeColor={config.color}
      modeBgClass={config.bgClass}
      modeIconClass={config.iconClass}
      ModeIcon={config.icon}
      emptyMessage={config.emptyMessage}
      embedded
    />
  );
};
