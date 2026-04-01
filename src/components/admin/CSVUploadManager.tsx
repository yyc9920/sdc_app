import React, { useState, useRef, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, onSnapshot } from 'firebase/firestore';
import app, { storage, db } from '../../firebase';
import { FIREBASE_REGION } from '../../constants';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';

interface UploadStatus {
  status: 'idle' | 'uploading' | 'processing' | 'ready' | 'error';
  progress?: number;
  message?: string;
  setId?: string;
  sentenceCount?: number;
}

interface ProcessingStatus {
  status: 'processing' | 'ready' | 'error';
  progress: number;
  currentStep: string;
  sentenceCount?: number;
  error?: string;
}

export const CSVUploadManager: React.FC = () => {
  const { user } = useAuth();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ status: 'idle' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uploadStatus.setId || uploadStatus.status !== 'processing') return;

    const unsubscribe = onSnapshot(
      doc(db, 'learning_sets', uploadStatus.setId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as ProcessingStatus & { title?: string; sentenceCount?: number };
          if (data.status === 'ready') {
            setUploadStatus({
              status: 'ready',
              message: `"${data.title || title}"이(가) 성공적으로 처리되었습니다!`,
              setId: uploadStatus.setId,
              sentenceCount: data.sentenceCount,
            });
          } else if (data.status === 'error') {
            setUploadStatus({
              status: 'error',
              message: data.error || 'CSV 처리 중 오류가 발생했습니다.',
            });
          }
        }
      },
      (error) => {
        console.error('Error listening to processing status:', error);
      }
    );

    return () => unsubscribe();
  }, [uploadStatus.setId, uploadStatus.status, title]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setUploadStatus({ status: 'error', message: 'CSV 파일만 업로드할 수 있습니다.' });
        return;
      }
      setSelectedFile(file);
      setUploadStatus({ status: 'idle' });
      if (!title) {
        setTitle(file.name.replace('.csv', '').replace(/_/g, ' '));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user?.uid) return;

    if (!title.trim()) {
      setUploadStatus({ status: 'error', message: '학습 세트 제목을 입력해주세요.' });
      return;
    }

    setUploadStatus({ status: 'uploading', progress: 0, message: '파일 업로드 중...' });

    try {
      const timestamp = Date.now();
      const storagePath = `csv_uploads/${user.uid}/${timestamp}/${selectedFile.name}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, selectedFile, {
        contentType: 'text/csv',
        customMetadata: {
          uploadedBy: user.uid,
          title: title.trim(),
          description: description.trim(),
        },
      });

      const downloadURL = await getDownloadURL(storageRef);
      setUploadStatus({ status: 'uploading', progress: 50, message: 'CSV 처리 시작 중...' });

      const functions = getFunctions(app, FIREBASE_REGION);
      const processCSVFn = httpsCallable<
        { csvUrl: string; title: string; description: string; storagePath: string },
        { success: boolean; setId: string; message: string }
      >(functions, 'processCSV');

      const result = await processCSVFn({
        csvUrl: downloadURL,
        title: title.trim(),
        description: description.trim(),
        storagePath,
      });

      if (result.data.success) {
        setUploadStatus({
          status: 'processing',
          progress: 0,
          message: 'TTS 생성 및 데이터 저장 중...',
          setId: result.data.setId,
        });
      } else {
        throw new Error(result.data.message || 'CSV 처리 시작 실패');
      }
    } catch (err: unknown) {
      console.error('Error uploading CSV:', err);
      let errorMsg = 'CSV 업로드 중 오류가 발생했습니다.';
      if (err instanceof Error && err.message) {
        errorMsg = err.message;
      }
      setUploadStatus({ status: 'error', message: errorMsg });
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setTitle('');
    setDescription('');
    setUploadStatus({ status: 'idle' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isProcessing = uploadStatus.status === 'uploading' || uploadStatus.status === 'processing';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 md:col-span-2">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">학습 세트 업로드</h3>
      
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            CSV 파일 선택
          </label>
          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isProcessing 
                ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 cursor-not-allowed'
                : selectedFile
                  ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20 cursor-pointer hover:border-blue-400'
                  : 'border-gray-300 dark:border-gray-600 cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-blue-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                {!isProcessing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 text-gray-400 mx-auto" />
                <p className="text-gray-600 dark:text-gray-400">
                  클릭하여 CSV 파일을 선택하세요
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  필수 컬럼: English Sentence, Korean Pronounce, Direct Comprehension, Comprehension
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            학습 세트 제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: Ultimate Speaking Beginner 1"
            disabled={isProcessing}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            설명 (선택)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="학습 세트에 대한 간단한 설명을 입력하세요"
            rows={2}
            disabled={isProcessing}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={!selectedFile || isProcessing}
          className="w-full py-4 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white font-bold rounded-2xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {uploadStatus.message || '처리 중...'}
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              업로드 및 TTS 생성
            </>
          )}
        </button>

        <AnimatePresence mode="wait">
          {uploadStatus.status === 'error' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-xl text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{uploadStatus.message}</p>
            </motion.div>
          )}

          {uploadStatus.status === 'processing' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 p-4 rounded-xl space-y-3"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
                  TTS 생성 중... (6개 음성 × 각 문장)
                </p>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                처리 시간은 문장 수에 따라 몇 분이 소요될 수 있습니다.
                이 페이지를 떠나도 백그라운드에서 처리가 계속됩니다.
              </p>
            </motion.div>
          )}

          {uploadStatus.status === 'ready' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-2xl space-y-3"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <p className="text-sm font-medium text-green-800 dark:text-green-400">
                  {uploadStatus.message}
                </p>
              </div>
              {uploadStatus.sentenceCount && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  총 {uploadStatus.sentenceCount}개 문장이 등록되었습니다.
                </p>
              )}
              <button
                onClick={handleReset}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-all"
              >
                새 파일 업로드하기
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">CSV 파일 형식 안내</h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• <strong>English Sentence</strong>: 영어 문장</li>
            <li>• <strong>Korean Pronounce</strong>: 한글 발음 표기</li>
            <li>• <strong>Direct Comprehension</strong>: 직해 (한국어)</li>
            <li>• <strong>Comprehension</strong>: 의역 (한국어)</li>
          </ul>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            TTS는 female, male, child_female, child_male, elderly_female, elderly_male 6개 음성으로 자동 생성됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};
