import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const MASTERY_TIME_THRESHOLD = 300;
const MASTERY_REPEAT_THRESHOLD = 10;

export const checkMastery = onDocumentWritten(
  'users/{uid}/progress/{progressId}',
  async (event) => {
    const after = event.data?.after.data();
    const before = event.data?.before.data();

    if (!after) return;

    const wasMastered = before?.status === 'mastered';
    const shouldBeMastered =
      after.studyTimeSeconds >= MASTERY_TIME_THRESHOLD ||
      after.repeatCount >= MASTERY_REPEAT_THRESHOLD;

    if (shouldBeMastered && !wasMastered) {
      const db = getFirestore();
      const { uid } = event.params;
      const userRef = db.doc(`users/${uid}`);
      const progressRef = event.data?.after.ref;

      if (!progressRef) return;

      try {
        await db.runTransaction(async (transaction) => {
          const progressDoc = await transaction.get(progressRef);
          const currentStatus = progressDoc.data()?.status;

          // Double check status in transaction
          if (currentStatus === 'mastered') return;

          transaction.update(progressRef, {
            status: 'mastered',
            masteredAt: FieldValue.serverTimestamp(),
          });

          transaction.update(userRef, {
            'stats.totalMasteredCount': FieldValue.increment(1),
          });
        });

        // Today's stats update (non-transactional is fine for daily stats)
        const now = new Date();
        const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
        const today = kst.toISOString().split('T')[0];
        
        await db.doc(`users/${uid}/daily_stats/${today}`).set({
          sentencesMastered: FieldValue.increment(1),
        }, { merge: true });

        console.log(`User ${uid} mastered sentence ${event.params.progressId}`);
      } catch (error) {
        console.error('Transaction failed: ', error);
      }
    }
  }
);
