import { Square, AlertTriangle } from 'lucide-react';

interface RecordingViewProps {
  secondsLeft: number;
  transcript: string;
  isRecording: boolean;
  shortRecordingWarning: boolean;
  onStop: () => void;
}

const BAR_DELAYS = ['0ms', '150ms', '300ms', '150ms', '0ms'];
const BAR_DURATIONS = ['0.8s', '0.6s', '1s', '0.7s', '0.9s'];

export const RecordingView = ({
  secondsLeft,
  transcript,
  isRecording,
  shortRecordingWarning,
  onStop,
}: RecordingViewProps) => {
  const elapsed = 120 - secondsLeft;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Waveform animation */}
      <div className="flex items-end gap-1.5 h-16">
        {BAR_DELAYS.map((delay, i) => (
          <div
            key={i}
            style={
              isRecording
                ? ({
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
            className={`w-3 rounded-full transition-colors ${
              isRecording ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>

      {/* Timer */}
      <div className="text-center">
        <span className="text-3xl font-mono font-bold text-gray-800 dark:text-white">
          {mm}:{ss}
        </span>
        <span className="text-gray-400 dark:text-gray-500 text-sm ml-2">/ 02:00</span>
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

      {/* Short recording warning — tap Done again to confirm */}
      {shortRecordingWarning && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-xl text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
          15초 미만입니다. 계속하려면 완료를 다시 누르세요.
        </div>
      )}

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
