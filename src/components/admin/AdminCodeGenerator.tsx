import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../firebase';
import { FIREBASE_REGION } from '../../constants';
import { Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AdminCodeGenerator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setGeneratedCode(null);
    setCopied(false);
    
    try {
      const functions = getFunctions(app, FIREBASE_REGION);
      const createCodeFn = httpsCallable<{role: string}, {code: string, expiresAt: string | null}>(functions, 'createAccessCode');
      const result = await createCodeFn({ role });
      
      setGeneratedCode(result.data.code);
    } catch (err: unknown) {
      console.error("Error generating code:", err);
      let errorMsg = '코드 생성 중 오류가 발생했습니다.';
      if (err instanceof Error && err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">새로운 접속 코드 발급</h3>
      
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            권한 선택
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`py-3 px-2 rounded-xl border-2 font-medium transition-all text-sm ${
                role === 'student' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                  : 'border-gray-200 bg-transparent text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              학생 (30일)
            </button>
            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`py-3 px-2 rounded-xl border-2 font-medium transition-all text-sm ${
                role === 'teacher' 
                  ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                  : 'border-gray-200 bg-transparent text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              선생님 (무제한)
            </button>
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`py-3 px-2 rounded-xl border-2 font-medium transition-all text-sm ${
                role === 'admin' 
                  ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                  : 'border-gray-200 bg-transparent text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              관리자 (무제한)
            </button>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-4 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white font-bold rounded-2xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            '코드 생성하기'
          )}
        </button>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          {generatedCode && !error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-2xl space-y-3"
            >
              <p className="text-sm font-medium text-green-800 dark:text-green-400 text-center">
                코드가 성공적으로 발급되었습니다
              </p>
              
              <div 
                onClick={copyToClipboard}
                className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 rounded-xl border border-green-100 dark:border-green-800 cursor-pointer hover:shadow-sm transition-all group"
              >
                <span className="text-2xl font-black tracking-widest text-gray-900 dark:text-white mx-auto">
                  {generatedCode}
                </span>
                {copied ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                ) : (
                  <Copy className="w-6 h-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 shrink-0 transition-colors" />
                )}
              </div>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                코드를 탭하여 복사하세요
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
