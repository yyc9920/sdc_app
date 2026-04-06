

interface ControlsProps {
  rangeStart: number;
  rangeEnd: number;
  repeatCount: number;
  isRandom: boolean;
  totalItems: number;
  voice: string;
  onRangeStartChange: (val: number) => void;
  onRangeEndChange: (val: number) => void;
  onRepeatCountChange: (val: number) => void;
  onRandomChange: (val: boolean) => void;
  onVoiceChange: (val: string) => void;
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
    <div className="w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur relative border-t border-gray-200 dark:border-gray-700 p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 shrink-0">
      <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
        <div className="flex justify-between gap-3 flex-wrap items-center text-sm">
          <div className="flex items-center gap-2">
            <label className="font-semibold text-gray-700 dark:text-gray-300">시작</label>
            <select
              value={rangeStart}
              onChange={(e) => onRangeStartChange(Number(e.target.value))}
              className="w-16 p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
            >
              {Array.from({ length: totalItems }, (_, i) => i + 1).map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="font-semibold text-gray-700 dark:text-gray-300">끝</label>
            <select
              value={rangeEnd}
              onChange={(e) => onRangeEndChange(Number(e.target.value))}
              className="w-16 p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
            >
              {Array.from({ length: totalItems }, (_, i) => i + 1).map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="font-semibold text-gray-700 dark:text-gray-300">반복</label>
            <select
              value={repeatCount}
              onChange={(e) => onRepeatCountChange(Number(e.target.value))}
              className="w-16 p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
            >
              {Array.from({ length: 100 }, (_, i) => i + 1).map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="font-semibold text-gray-700 dark:text-gray-300">음성</label>
            <select
              value={voice}
              onChange={(e) => onVoiceChange(e.target.value)}
              className="p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="female">여성</option>
              <option value="male">남성</option>
              <option value="child_female">여자아이</option>
              <option value="child_male">남자아이</option>
              <option value="elderly_female">노년 여성</option>
              <option value="elderly_male">노년 남성</option>
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

          <div className="flex items-center gap-1.5">
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
        </div>

        <div className="flex justify-center items-center gap-6">
          <button
            onClick={onPrev}
            className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full transition-colors text-gray-800 dark:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <button
            onClick={onPlayPause}
            className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-transform transform active:scale-95"
          >
            {isPlaying ? (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
          </button>
          
          <button
            onClick={onNext}
            className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full transition-colors text-gray-800 dark:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};
