import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, writeBatch, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

interface UseStudySessionOptions {
  sentenceId: number;
  setId: string;
  onProgressSaved?: () => void;
}

export const useStudySession = ({ sentenceId, setId, onProgressSaved }: UseStudySessionOptions) => {
  const [isActive, setIsActive] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const currentSentenceRef = useRef({ sentenceId, setId });

  useEffect(() => {
    currentSentenceRef.current = { sentenceId, setId };
  }, [sentenceId, setId]);

  const pauseSession = useCallback(() => {
    if (startTimeRef.current) {
      accumulatedRef.current += (Date.now() - startTimeRef.current) / 1000;
      startTimeRef.current = null;
    }
    setIsActive(false);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isActive) {
        pauseSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isActive, pauseSession]);

  const startSession = useCallback(() => {
    startTimeRef.current = Date.now();
    setIsActive(true);
  }, []);

  const saveProgress = useCallback(async (seconds: number) => {
    const uid = auth.currentUser?.uid;
    if (!uid || seconds <= 0) return;

    const { sentenceId: sid, setId: sId } = currentSentenceRef.current;
    const progressRef = doc(db, `users/${uid}/progress/${sId}_${sid}`);
    const dailyRef = doc(db, `users/${uid}/daily_stats/${getTodayString()}`);
    const userRef = doc(db, `users/${uid}`);

    const batch = writeBatch(db);

    batch.set(progressRef, {
      sentenceId: sid,
      setId: sId,
      studyTimeSeconds: increment(seconds),
      repeatCount: increment(1),
      lastStudiedAt: serverTimestamp(),
      status: 'learning',
    }, { merge: true });

    batch.set(dailyRef, {
      date: getTodayString(),
      studyTimeSeconds: increment(seconds),
      sentencesStudied: increment(1),
      sessionsCount: increment(1),
    }, { merge: true });

    batch.set(userRef, {
      'stats.totalStudyTimeSeconds': increment(seconds),
      'stats.lastActiveDate': getTodayString(),
    }, { merge: true });

    try {
      await batch.commit();
      onProgressSaved?.();
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }, [onProgressSaved]);

  const endSession = useCallback(async () => {
    pauseSession();
    const totalSeconds = Math.floor(accumulatedRef.current);

    if (totalSeconds > 0) {
      await saveProgress(totalSeconds);
      accumulatedRef.current = 0;
    }
  }, [pauseSession, saveProgress]);

  const resetAccumulated = useCallback(() => {
    accumulatedRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000 + accumulatedRef.current);
        if (elapsed > 0) {
          saveProgress(elapsed);
        }
      }
    };
  }, [saveProgress]);

  return {
    isActive,
    startSession,
    pauseSession,
    endSession,
    resetAccumulated,
  };
};

export const useMarkSentenceStudied = () => {
  const markStudied = useCallback(async (sentenceId: number, setId: string, studyTimeSeconds: number) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const progressRef = doc(db, `users/${uid}/progress/${setId}_${sentenceId}`);
    const dailyRef = doc(db, `users/${uid}/daily_stats/${getTodayString()}`);
    const userRef = doc(db, `users/${uid}`);

    const batch = writeBatch(db);

    batch.set(progressRef, {
      sentenceId,
      setId,
      studyTimeSeconds: increment(studyTimeSeconds),
      repeatCount: increment(1),
      lastStudiedAt: serverTimestamp(),
      status: 'learning',
    }, { merge: true });

    batch.set(dailyRef, {
      date: getTodayString(),
      studyTimeSeconds: increment(studyTimeSeconds),
      sentencesStudied: increment(1),
    }, { merge: true });

    batch.set(userRef, {
      'stats.totalStudyTimeSeconds': increment(studyTimeSeconds),
      'stats.lastActiveDate': getTodayString(),
    }, { merge: true });

    try {
      await batch.commit();
    } catch (error) {
      console.error('Failed to mark sentence studied:', error);
    }
  }, []);

  return { markStudied };
};

export const useSaveQuizResult = () => {
  const saveQuizResult = useCallback(async (
    setId: string,
    level: number,
    score: number,
    blanksTotal: number,
    blanksCorrect: number,
    timeSpentSeconds: number
  ) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const resultRef = doc(db, `users/${uid}/quiz_results/${setId}_${Date.now()}`);
    const dailyRef = doc(db, `users/${uid}/daily_stats/${getTodayString()}`);
    const userRef = doc(db, `users/${uid}`);

    try {
      await setDoc(resultRef, {
        setId,
        level,
        score,
        blanksTotal,
        blanksCorrect,
        completedAt: serverTimestamp(),
        timeSpentSeconds,
      });

      const batch = writeBatch(db);
      batch.set(dailyRef, {
        date: getTodayString(),
        studyTimeSeconds: increment(timeSpentSeconds),
        quizzesCompleted: increment(1),
      }, { merge: true });

      batch.set(userRef, {
        'stats.totalStudyTimeSeconds': increment(timeSpentSeconds),
        'stats.lastActiveDate': getTodayString(),
      }, { merge: true });

      await batch.commit();
    } catch (error) {
      console.error('Failed to save quiz result:', error);
    }
  }, []);

  return { saveQuizResult };
};
