

interface ControlsProps {
  rangeStart: number;
  rangeEnd: number;
  repeatCount: number;
  isRandom: boolean;
  totalItems: number;
  voice: 'male' | 'female';
  onRangeStartChange: (val: number) => void;
  onRangeEndChange: (val: number) => void;
  onRepeatCountChange: (val: number) => void;
  onRandomChange: (val: boolean) => void;
  onVoiceChange: (val: 'male' | 'female') => void;
  displayMode: 'all' | 'english' | 'korean';
  onDisplayModeChange: (val: 'all' | 'english' | 'korean') => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Controls = ({
  rangeStart,
  rangeEnd,
  repeatCount,
  isRandom,
  totalItems,
  voice,
  onRangeStartChange,
  onRangeEndChange,
  onRepeatCountChange,
  onRandomChange,
  onVoiceChange,
  displayMode,
  onDisplayModeChange,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
}: ControlsProps) => {
  return (
    <div className="w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur sticky bottom-0 border-t border-gray-200 dark:border-gray-700 p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex flex-col gap-2 z-50">
      <div className="flex justify-between gap-3 flex-wrap items-center max-w-4xl mx-auto w-full text-sm">
        <div className="flex items-center gap-2">
          <label className="font-semibold text-gray-700 dark:text-gray-300">시작</label>
          <input
            type="number"
            min={1}
            max={totalItems}
            value={rangeStart}
            onChange={(e) => onRangeStartChange(Number(e.target.value))}
            className="w-16 p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="font-semibold text-gray-700 dark:text-gray-300">끝</label>
          <input
            type="number"
            min={1}
            max={totalItems}
            value={rangeEnd}
            onChange={(e) => onRangeEndChange(Number(e.target.value))}
            className="w-16 p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="font-semibold text-gray-700 dark:text-gray-300">반복</label>
          <input
            type="number"
            min={1}
            max={100}
            value={repeatCount}
            onChange={(e) => onRepeatCountChange(Number(e.target.value))}
            className="w-12 p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="font-semibold text-gray-700 dark:text-gray-300">음성</label>
          <select
            value={voice}
            onChange={(e) => onVoiceChange(e.target.value as 'male' | 'female')}
            className="p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="female">여성</option>
            <option value="male">남성</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-semibold text-gray-700 dark:text-gray-300">보기</label>
          <div className="flex rounded-md border border-gray-300 dark:border-gray-600">
            {(['all', 'english', 'korean'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onDisplayModeChange(mode)}
                className={`px-3 py-1 text-sm font-medium transition-colors first:rounded-l-md last:rounded-r-md 
                  ${displayMode === mode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
              >
                {mode === 'all' ? '전체' : mode === 'english' ? '영어' : '한글'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <input
            type="checkbox"
            id="random"
            checked={isRandom}
            onChange={(e) => onRandomChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="random" className="text-gray-700 dark:text-gray-300 font-medium">
            랜덤
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            className="p-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full transition-colors text-gray-800 dark:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <button
            onClick={onPlayPause}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-transform transform active:scale-95"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
          </button>
          
          <button
            onClick={onNext}
            className="p-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full transition-colors text-gray-800 dark:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};
