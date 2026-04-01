import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

export const getRankings = onCall({
  cors: true
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { type, limit = 50 } = request.data;
  
  if (!type) {
    throw new HttpsError('invalid-argument', 'Ranking type is required.');
  }

  const db = getFirestore();
  const fieldMap: Record<string, string> = {
    'weekly_study_time': 'stats.weeklyStudyTimeSeconds',
    'total_study_time': 'stats.totalStudyTimeSeconds',
    'total_mastered': 'stats.totalMasteredCount',
    'current_streak': 'stats.currentStreak',
    'longest_streak': 'stats.longestStreak'
  };

  const field = fieldMap[type];
  if (!field) {
    throw new HttpsError('invalid-argument', 'Invalid ranking type.');
  }

  try {
    const snapshot = await db.collection('users')
      .where('role', '==', 'student')
      .orderBy(field, 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc, index) => {
      const data = doc.data();
      
      let value = 0;
      if (data.stats) {
        switch (type) {
          case 'weekly_study_time': value = data.stats.weeklyStudyTimeSeconds || 0; break;
          case 'total_study_time': value = data.stats.totalStudyTimeSeconds || 0; break;
          case 'total_mastered': value = data.stats.totalMasteredCount || 0; break;
          case 'current_streak': value = data.stats.currentStreak || 0; break;
          case 'longest_streak': value = data.stats.longestStreak || 0; break;
        }
      }

      return {
        uid: doc.id,
        name: data.profile?.name || '익명',
        value,
        rank: index + 1
      };
    }).filter(entry => entry.value > 0);
  } catch (error) {
    console.error('Error fetching rankings:', error);
    throw new HttpsError('internal', 'Failed to fetch rankings.');
  }
});
