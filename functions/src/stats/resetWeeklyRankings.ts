import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getWeekStartString = (date: Date): string => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const resetWeeklyRankings = onSchedule(
  {
    schedule: '0 0 * * 1',
    timeZone: 'Asia/Seoul',
  },
  async () => {
    const db = getFirestore();
    const now = new Date();
    
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const weekId = getWeekStartString(lastWeekStart);

    console.log(`Archiving weekly rankings for week starting: ${weekId}`);

    const usersSnapshot = await db.collection('users').where('role', '==', 'student').get();
    
    const weeklyRankings: Array<{
      uid: string;
      name: string;
      weeklyStudyTimeSeconds: number;
    }> = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const weeklyTime = userData.stats?.weeklyStudyTimeSeconds || 0;
      
      if (weeklyTime > 0) {
        weeklyRankings.push({
          uid: userDoc.id,
          name: userData.profile?.name || '익명',
          weeklyStudyTimeSeconds: weeklyTime,
        });
      }
    }

    weeklyRankings.sort((a, b) => b.weeklyStudyTimeSeconds - a.weeklyStudyTimeSeconds);

    const rankedEntries = weeklyRankings.slice(0, 50).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    if (rankedEntries.length > 0) {
      await db.collection('weekly_ranking_archives').doc(weekId).set({
        weekId,
        createdAt: FieldValue.serverTimestamp(),
        entries: rankedEntries,
        totalParticipants: weeklyRankings.length,
      });
      console.log(`Archived ${rankedEntries.length} rankings for week ${weekId}`);
    }

    const batch = db.batch();
    let resetCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (userData.stats?.weeklyStudyTimeSeconds > 0) {
        batch.update(userDoc.ref, {
          'stats.weeklyStudyTimeSeconds': 0,
        });
        resetCount++;
      }
    }

    if (resetCount > 0) {
      await batch.commit();
      console.log(`Reset weekly study time for ${resetCount} users`);
    }

    console.log('Weekly ranking reset complete');
  }
);
