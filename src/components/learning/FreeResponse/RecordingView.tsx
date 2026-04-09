import { Square } from 'lucide-react';

interface RecordingViewProps {
  secondsLeft: number;
  transcript: string;
  isRecording: boolean;
  onStop: () => void;
}

const BAR_DELAYS = ['0ms', '150ms', '300ms', '150ms', '0ms'];
const BAR_DURATIONS = ['0.8s', '0.6s', '1s', '0.7s', '0.9s'];

export const RecordingView = ({
  secondsLeft,
  transcript,
  isRecording,
  onStop,
}: RecordingViewProps) => {
  const elapsed = 120 - secondsLeft;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const maxMm = '02';
  const maxSs = '00';

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Waveform animation */}
      <div className="flex items-end gap-1.5 h-16">
        {BAR_DELAYS.map((delay, i) => (
          <div
            key={i}
            className={`w-3 rounded-full transition-all ${
              isRecording
                ? 'bg-red-500 animate-[wave_var(--dur)_var(--delay)_ease-in-out_infinite]'
                : 'bg-gray-300 dark:bg-gray-600 h-2'
            }`}
            style={
              isRecording
                ? ({
                    '--dur': BAR_DURATIONS[i],
                    '--delay': delay,
                    animationName: 'wave',
                    animationDuration: BAR_DURATIONS[i],
                    animationDelay: delay,
                    animationTimingFunction: 'ease-in-out',
                    animationIterationCount: 'infinite',
                    animationDirection: 'alternate',
                    height: '100%',
                  } as React.CSSProperties)
                : { height: '8px' }
            }
          />
        ))}
      </div>

      {/* Timer */}
      <div className="text-center">
        <span className="text-3xl font-mono font-bold text-gray-800 dark:text-white">
          {mm}:{ss}
        </span>
        <span className="text-gray-400 dark:text-gray-500 text-sm ml-2">
          / {maxMm}:{maxSs}
        </span>
      </div>

      {isRecording && (
        <div className="flex items-center gap-2 text-red-500 text-sm font-semibold animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          녹음 중
        </div>
      )}

      {/* Live transcript */}
      <div className="w-full max-w-xl min-h-[80px] bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
        {transcript ? (
          <p className="text-gray-800 dark:text-gray-100 leading-relaxed">{transcript}</p>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 italic text-sm">
            말하기 시작하면 텍스트가 여기 표시됩니다...
          </p>
        )}
      </div>

      <button
        onClick={onStop}
        className="flex items-center gap-3 px-8 py-4 bg-gray-800 dark:bg-gray-200 hover:bg-gray-700 dark:hover:bg-gray-300 active:scale-95 text-white dark:text-gray-900 font-bold text-lg rounded-2xl shadow-lg transition-all"
      >
        <Square className="w-5 h-5" />
        완료
      </button>
    </div>
  );
};
