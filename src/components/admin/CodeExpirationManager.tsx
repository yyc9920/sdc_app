import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../firebase';
import { AlertCircle, Clock, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CodeExpirationManager: React.FC = () => {
  const [codeId, setCodeId] = useState('');
  const [extensionDays, setExtensionDays] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formattedCodeId = codeId.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const finalCodeId = formattedCodeId.length > 5 
        ? `${formattedCodeId.slice(0, 5)}-${formattedCodeId.slice(5)}`
        : formattedCodeId;
    
    if (finalCodeId.length < 8) {
      setMessage({ text: '올바른 코드 형식을 입력해주세요.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);
    
    try {
      const functions = getFunctions(app, 'asia-northeast3');
      const extendCodeFn = httpsCallable<{codeId: string, extensionDays: number}, {success: boolean, message: string, newExpiresAt: string}>(functions, 'extendCodeExpiration');
      
      const result = await extendCodeFn({ codeId: finalCodeId, extensionDays });
      
      const newDate = new Date(result.data.newExpiresAt).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      
      setMessage({ 
        text: `연장 완료! 새로운 만료일: ${newDate}`, 
        type: 'success' 
      });
      setCodeId('');
    } catch (err: unknown) {
      console.error("Error extending code:", err);
      let errorMsg = '연장 중 오류가 발생했습니다.';
      
      if (err instanceof Error && err.message) {
        errorMsg = err.message;
        if (errorMsg.includes('not-found')) errorMsg = '존재하지 않는 코드입니다.';
        if (errorMsg.includes('do not expire')) errorMsg = '관리자 코드는 연장할 필요가 없습니다.';
      }
      
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">코드 만료일 연장</h3>
      
      <form onSubmit={handleExtend} className="space-y-4">
        <div>
          <label htmlFor="codeId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            대상 코드 (학생용)
          </label>
          <input
            type="text"
            id="codeId"
            value={codeId}
            onChange={(e) => setCodeId(e.target.value)}
            placeholder="ABCD-1234"
            className="w-full px-4 py-3 text-lg tracking-widest uppercase rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 dark:bg-gray-700 dark:text-white transition-all outline-none"
            disabled={loading}
            maxLength={10}
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            연장 기간
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[7, 15, 30].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => setExtensionDays(days)}
                className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                  extensionDays === days 
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                    : 'border-gray-200 bg-transparent text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                +{days}일
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || codeId.length < 5}
          className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              <Clock className="w-5 h-5" />
              <span>기간 연장하기</span>
            </>
          )}
        </button>

        <AnimatePresence mode="wait">
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
                message.type === 'success' 
                  ? 'text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400' 
                  : 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
              }`}
            >
              {message.type === 'success' ? (
                <CalendarDays className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <p className="font-medium leading-relaxed">{message.text}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
};
