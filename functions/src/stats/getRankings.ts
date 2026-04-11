import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const fieldMap: Record<string, string> = {
  'weekly_study_time': 'stats.weeklyStudyTimeSeconds',
  'total_study_time': 'stats.totalStudyTimeSeconds',
  'total_mastered': 'stats.totalMasteredCount',
  'current_streak': 'stats.currentStreak',
  'longest_streak': 'stats.longestStreak',
  'mode_repetition_sessions': 'stats.modeStats.repetition.sessions',
  'mode_speedListening_sessions': 'stats.modeStats.speedListening.sessions',
  'mode_infiniteSpeaking_sessions': 'stats.modeStats.infiniteSpeaking.sessions',
  'mode_rolePlay_sessions': 'stats.modeStats.rolePlay.sessions',
  'mode_vocab_sessions': 'stats.modeStats.vocab.sessions',
  'mode_freeResponse_sessions': 'stats.modeStats.freeResponse.sessions',
};

function getNestedValue(obj: Record<string, unknown>, path: string): number {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof value === 'number' ? value : 0;
}

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

  const field = fieldMap[type];
  if (!field) {
    throw new HttpsError('invalid-argument', 'Invalid ranking type.');
  }

  const db = getFirestore();

  try {
    const snapshot = await db.collection('users')
      .where('role', '==', 'student')
      .orderBy(field, 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc, index) => {
      const data = doc.data();
      const value = getNestedValue(data, field);

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
