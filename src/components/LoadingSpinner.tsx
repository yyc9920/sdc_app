import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner = ({ 
  message = '데이터를 불러오는 중...', 
  fullScreen = false 
}: LoadingSpinnerProps) => {
  const containerClasses = fullScreen
    ? "flex h-screen w-full flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 gap-4"
    : "flex flex-col items-center justify-center py-10 gap-4 w-full";

  return (
    <div className={containerClasses} role="status" aria-live="polite">
      <motion.div
        className="w-12 h-12 border-4 border-blue-200 dark:border-blue-900/50 border-t-blue-600 dark:border-t-blue-400 rounded-full"
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        }}
        aria-hidden="true"
      />
      <span className="text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base">
        {message}
      </span>
    </div>
  );
};
