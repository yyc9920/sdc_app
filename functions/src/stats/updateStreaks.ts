import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';

const getDateString = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getYesterdayString = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getDateString(yesterday);
};

const getTodayString = () => getDateString(new Date());

export const updateStreaks = onSchedule(
  {
    schedule: '0 0 * * *',
    timeZone: 'Asia/Seoul',
  },
  async () => {
    const db = getFirestore();
    const yesterday = getYesterdayString();
    const today = getTodayString();

    console.log(`Running streak update. Yesterday: ${yesterday}, Today: ${today}`);

    const usersSnapshot = await db.collection('users').get();
    let updatedCount = 0;
    let resetCount = 0;

    const MAX_BATCH_SIZE = 500;
    let batch = db.batch();
    let batchCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const lastActive = userData.stats?.lastActiveDate;
      const currentStreak = userData.stats?.currentStreak || 0;
      const longestStreak = userData.stats?.longestStreak || 0;

      let newStreak = currentStreak;
      let newLongestStreak = longestStreak;

      if (lastActive === yesterday) {
        newStreak = currentStreak + 1;
        if (newStreak > longestStreak) {
          newLongestStreak = newStreak;
        }
        updatedCount++;
      } else if (lastActive !== today) {
        newStreak = 0;
        resetCount++;
      }

      if (newStreak !== currentStreak || newLongestStreak !== longestStreak) {
        batch.update(userDoc.ref, {
          'stats.currentStreak': newStreak,
          'stats.longestStreak': newLongestStreak,
        });
        batchCount++;

        if (batchCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`Streak update complete. Incremented: ${updatedCount}, Reset: ${resetCount}`);
  }
);
