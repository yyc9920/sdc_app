import { motion } from 'framer-motion';
import { CheckCircle2, PlayCircle } from 'lucide-react';
import { getSpeakerColor } from '../../../constants/rolePlay';
import type { VoiceKey } from '../../../hooks/training';

interface RoleSetupProps {
  speakers: string[];
  selectedRole: string;
  speakerVoiceMap: Record<string, VoiceKey>;
  turnCounts: Record<string, number>;
  onSelectRole: (role: string) => void;
  onStartDemo: () => void;
}

const VOICE_LABELS: Record<VoiceKey, string> = {
  male1: '남성 1',
  female1: '여성 1',
  male2: '남성 2',
  female2: '여성 2',
  male3: '남성 3',
  female3: '여성 3',
};

export function RoleSetup({
  speakers,
  selectedRole,
  speakerVoiceMap,
  turnCounts,
  onSelectRole,
  onStartDemo,
}: RoleSetupProps) {
  return (
    <motion.div
      key="setup"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="flex flex-col gap-6 py-4"
    >
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
          나의 역할을 선택하세요
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          선택한 역할로 대화 연습을 진행합니다
        </p>
      </div>

      {/* Speaker cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {speakers.map(speaker => {
          const color = getSpeakerColor(speaker, speakers);
          const voice = speakerVoiceMap[speaker];
          const count = turnCounts[speaker] ?? 0;
          const isSelected = selectedRole === speaker;

          return (
            <button
              key={speaker}
              onClick={() => onSelectRole(speaker)}
              className={`
                relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all
                active:scale-[0.97]
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              {/* Avatar */}
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold ${color.bg} ${color.text}`}>
                {speaker.charAt(0).toUpperCase()}
              </div>

              {/* Label */}
              <div className="text-center">
                <p className="font-semibold text-gray-800 dark:text-white">{speaker}</p>
                {voice && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {VOICE_LABELS[voice]}
                  </p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {count}턴
                </p>
              </div>

              {/* Selected checkmark */}
              {isSelected && (
                <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-blue-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Info banner for unbalanced dialogues */}
      {selectedRole && (() => {
        const myTurns = turnCounts[selectedRole] ?? 0;
        const totalTurns = Object.values(turnCounts).reduce((a, b) => a + b, 0);
        const pct = totalTurns > 0 ? Math.round((myTurns / totalTurns) * 100) : 0;
        if (pct < 20 && totalTurns > 0) {
          return (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl text-sm text-amber-700 dark:text-amber-300">
              <span className="shrink-0">⚠️</span>
              <span>선택한 역할은 전체 대화의 {pct}%만 담당합니다. 상대방 턴을 주로 듣게 됩니다.</span>
            </div>
          );
        }
        return null;
      })()}

      {/* Start button */}
      <button
        onClick={onStartDemo}
        disabled={!selectedRole}
        className={`
          flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-base
          transition-all active:scale-[0.98]
          ${selectedRole
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/30'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
          }
        `}
      >
        <PlayCircle className="w-5 h-5" />
        데모 보기 →
      </button>
    </motion.div>
  );
}
