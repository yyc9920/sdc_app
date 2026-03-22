import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onLogin: (code: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const LoginOverlay: React.FC<Props> = ({ onLogin, loading, error }) => {
  const [code, setCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim() && !loading) {
      const finalCode = code.trim().toUpperCase();
      await onLogin(finalCode);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight mb-2">
            SDC Study
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Please enter your access code to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Access Code
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ABCD-1234"
              className="w-full px-5 py-4 text-center text-2xl tracking-widest uppercase rounded-2xl border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 dark:bg-gray-700 dark:text-white transition-all outline-none"
              disabled={loading}
              maxLength={10}
              autoComplete="off"
              autoFocus
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-red-500 dark:text-red-400 text-sm text-center font-medium bg-red-50 dark:bg-red-900/30 py-3 rounded-xl"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading || code.trim().length < 8}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-lg font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </div>
            ) : (
              'Login'
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            If you don't have an access code, please contact your administrator.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
