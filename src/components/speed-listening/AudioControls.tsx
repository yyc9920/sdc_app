import React from 'react';
import type { AudioState } from '../../hooks/useSpeedListeningAudio';

interface AudioControlsProps {
  audioState: AudioState;
  isPlaying: boolean;
  isSubmitted: boolean;
  currentSpeed: number;
  onPlayPause: () => void;
  onReplay: () => void;
}

const getButtonLabel = (audioState: AudioState, isPlaying: boolean, isSubmitted: boolean): string => {
  if (isPlaying) return 'Pause';
  if (isSubmitted) return 'Replay (1x)';
  if (audioState === 'FINISHED') return 'Finished';
  return 'Play Audio';
};

export const AudioControls: React.FC<AudioControlsProps> = ({
  audioState,
  isPlaying,
  isSubmitted,
  currentSpeed,
  onPlayPause,
  onReplay,
}) => {
  const isDisabled = audioState === 'FINISHED' && !isSubmitted;
  const buttonLabel = getButtonLabel(audioState, isPlaying, isSubmitted);

  const handleClick = () => {
    if (isSubmitted && !isPlaying) {
      onReplay();
    } else {
      onPlayPause();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm mb-6 border border-gray-200 dark:border-gray-700 gap-4">
      <div className="flex flex-1 items-center justify-between sm:justify-start sm:space-x-4">
        <button
          onClick={handleClick}
          disabled={isDisabled}
          className="px-4 py-2.5 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[44px]"
        >
          {buttonLabel}
        </button>
        <div className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300">
          Speed: <span className="text-blue-600 dark:text-blue-400">{currentSpeed}x</span>
        </div>
      </div>
    </div>
  );
};
