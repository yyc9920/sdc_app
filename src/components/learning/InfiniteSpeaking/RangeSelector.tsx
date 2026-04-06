import { useState } from 'react';
import { RANGE_OPTIONS } from '../../../constants/infiniteSpeaking';
import type { SentenceData } from '../../../types';

interface RangeSelectorProps {
  totalSentences: number;
  onStart: (sentences: SentenceData[], startIndex: number, count: number) => void;
  allSentences: SentenceData[];
}

export const RangeSelector = ({ totalSentences, onStart, allSentences }: RangeSelectorProps) => {
  const [count, setCount] = useState<number>(5);
  const [startIndex, setStartIndex] = useState(0);

  const maxStart = Math.max(0, totalSentences - count);
  const rangeOptions = RANGE_OPTIONS.filter(n => n <= totalSentences);

  const handleStart = () => {
    const selected = allSentences.slice(startIndex, startIndex + count);
    onStart(selected, startIndex, count);
  };

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <section className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">문장 범위 선택</h2>
        <p className="text-gray-500 dark:text-gray-400">학습할 문장 수와 시작 위치를 선택하세요.</p>
      </section>

      {/* Count selection */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">문장 수</label>
        <div className="flex gap-3 justify-center">
          {rangeOptions.map(n => (
            <button
              key={n}
              onClick={() => {
                setCount(n);
                if (startIndex > totalSentences - n) {
                  setStartIndex(Math.max(0, totalSentences - n));
                }
              }}
              className={`px-5 py-3 rounded-2xl text-lg font-bold transition-all ${
                count === n
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 shadow-sm'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Start position */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
          시작 위치: <span className="text-purple-600 dark:text-purple-400">{startIndex + 1} ~ {startIndex + count}</span> / {totalSentences}
        </label>
        <input
          type="range"
          min={0}
          max={maxStart}
          value={startIndex}
          onChange={(e) => setStartIndex(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>1</span>
          <span>{totalSentences}</span>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-4 space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 shadow-sm">
        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">미리보기</p>
        {allSentences.slice(startIndex, startIndex + count).map((s, i) => (
          <p key={s.id} className="text-sm text-gray-800 dark:text-gray-300">
            <span className="text-gray-400 mr-2">{startIndex + i + 1}.</span>
            {s.english}
          </p>
        ))}
      </div>

      {/* Start button */}
      <button
        onClick={handleStart}
        className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
      >
        학습 시작 ({count}문장)
      </button>
    </div>
  );
};
