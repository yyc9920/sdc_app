import { useCallback } from 'react';
import { doc, collection, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import type { TrainingSession } from './types';
import { getTodayString, getStreakUpdates } from '../useStudySession';

export function useTrainingProgress(session: TrainingSession) {
  const saveProgress = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    const batch = writeBatch(db);
    const today = getTodayString();

    const dailyRef = doc(db, 'users', user.uid, 'daily_stats', today);
    batch.set(
      dailyRef,
      {
        date: today,
        studyTimeSeconds: increment(session.elapsedSeconds),
        sessionsCount: increment(1),
        lastUpdatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    const streakUpdates = await getStreakUpdates(user.uid);

    const userRef = doc(db, 'users', user.uid);
    batch.update(userRef, {
      'stats.totalStudyTimeSeconds': increment(session.elapsedSeconds),
      'stats.weeklyStudyTimeSeconds': increment(session.elapsedSeconds),
      'stats.lastActiveDate': today,
      'stats.currentStreak': streakUpdates.stats.currentStreak,
      'stats.longestStreak': streakUpdates.stats.longestStreak,
    });

    await batch.commit();
  }, [session.elapsedSeconds]);

  const saveResult = useCallback(
    async (score?: number) => {
      const user = auth.currentUser;
      if (!user) return;

      const batch = writeBatch(db);
      const today = getTodayString();
      const timestamp = Date.now();

      const resultCollection = session.mode === 'speedListening'
        ? 'quiz_results'
        : 'speaking_results';

      const resultRef = doc(
        collection(db, 'users', user.uid, resultCollection),
        `${session.setId}_${timestamp}`,
      );

      batch.set(resultRef, {
        setId: session.setId,
        mode: session.mode,
        score: score ?? null,
        round: session.round,
        totalRounds: session.totalRounds,
        timeSpentSeconds: session.elapsedSeconds,
        completedAt: serverTimestamp(),
      });

      const dailyRef = doc(db, 'users', user.uid, 'daily_stats', today);
      const counterField = session.mode === 'speedListening'
        ? 'quizzesCompleted'
        : 'speakingSessionsCompleted';

      batch.set(
        dailyRef,
        {
          date: today,
          [counterField]: increment(1),
          studyTimeSeconds: increment(session.elapsedSeconds),
          lastUpdatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      await batch.commit();
    },
    [session.setId, session.mode, session.round, session.totalRounds, session.elapsedSeconds],
  );

  return {
    saveProgress,
    saveResult,
  };
}
