import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, writeBatch, increment, serverTimestamp, setDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';

const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};


const getStreakUpdates = async (uid: string) => {
  const statsRef = collection(db, `users/${uid}/daily_stats`);
  const q = query(statsRef, orderBy('date', 'desc'));
  const snap = await getDocs(q);
  
  const dates = snap.docs.map(doc => doc.data().date);
  const today = getTodayString();
  
  if (!dates.includes(today)) {
    dates.unshift(today);
  }
  
  const sortedDates = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
  
  let currentStreak = 0;
  let d = new Date();
  while (true) {
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (sortedDates.includes(dStr)) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  let longestStreak = currentStreak;
  let tempStreak = 1;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const d1Str = sortedDates[i];
    const d2Str = sortedDates[i+1];
    
    const parts1 = d1Str.split('-');
    const parts2 = d2Str.split('-');
    
    const d1 = new Date(parseInt(parts1[0]), parseInt(parts1[1]) - 1, parseInt(parts1[2]));
    const d2 = new Date(parseInt(parts2[0]), parseInt(parts2[1]) - 1, parseInt(parts2[2]));
    
    const diff = Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff === 1) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 1;
    }
  }

  return {
    stats: {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      lastActiveDate: today
    }
  };
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
    if (!sId || sid <= 0) return;
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
    }, { merge: true });

    batch.set(dailyRef, {
      date: getTodayString(),
      studyTimeSeconds: increment(seconds),
      sentencesStudied: increment(1),
      sessionsCount: increment(1),
    }, { merge: true });

    const streakUpdates = await getStreakUpdates(uid);
    batch.update(userRef, {
      'stats.totalStudyTimeSeconds': increment(seconds),
      'stats.currentStreak': streakUpdates.stats.currentStreak,
      'stats.longestStreak': streakUpdates.stats.longestStreak,
      'stats.lastActiveDate': streakUpdates.stats.lastActiveDate,
    });

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
    }, { merge: true });

    batch.set(dailyRef, {
      date: getTodayString(),
      studyTimeSeconds: increment(studyTimeSeconds),
      sentencesStudied: increment(1),
    }, { merge: true });

    const streakUpdates = await getStreakUpdates(uid);
    batch.update(userRef, {
      'stats.totalStudyTimeSeconds': increment(studyTimeSeconds),
      'stats.currentStreak': streakUpdates.stats.currentStreak,
      'stats.longestStreak': streakUpdates.stats.longestStreak,
      'stats.lastActiveDate': streakUpdates.stats.lastActiveDate,
    });

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

      const streakUpdates = await getStreakUpdates(uid);
      batch.update(userRef, {
        'stats.totalStudyTimeSeconds': increment(timeSpentSeconds),
        'stats.currentStreak': streakUpdates.stats.currentStreak,
        'stats.longestStreak': streakUpdates.stats.longestStreak,
        'stats.lastActiveDate': streakUpdates.stats.lastActiveDate,
      });

      await batch.commit();
    } catch (error) {
      console.error('Failed to save quiz result:', error);
    }
  }, []);

  return { saveQuizResult };
};
