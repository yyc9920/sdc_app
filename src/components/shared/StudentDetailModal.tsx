import React from 'react';
import { X } from 'lucide-react';
import { DashboardContent } from '../dashboard/DashboardContent';

interface StudentDetailModalProps {
  uid: string | null;
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ uid, isOpen, onClose, studentName }) => {
  if (!isOpen || !uid) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {studentName ? `${studentName}님의 상세 학습 현황` : '상세 학습 현황'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              학습 시간, 진행률, 문장 학습 및 퀴즈 기록을 확인합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden relative bg-gray-50 dark:bg-gray-900 rounded-b-3xl">
          <DashboardContent uid={uid} />
        </div>
      </div>
    </div>
  );
};
