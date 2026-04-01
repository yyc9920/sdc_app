/**
 * Recalculate and Backfill User Stats for Ranking System
 * 
 * Usage:
 *   1. Ensure scripts/service-account.json exists.
 *   2. Run: node scripts/recalculate-all-user-stats.cjs
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

if (!require('fs').existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ Service account key not found at scripts/service-account.json');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getMostRecentMonday = () => {
  const d = new Date();
  const day = d.getDay(); // 0: Sun, 1: Mon, ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
};

async function recalculateUserStats(uid) {
  console.log(`\nProcessing user: ${uid}`);
  
  const userRef = db.collection('users').doc(uid);
  const progressRef = userRef.collection('progress');
  const dailyStatsRef = userRef.collection('daily_stats');

  // Thresholds (Matching Cloud Function)
  const MASTERY_TIME_THRESHOLD = 300;
  const MASTERY_REPEAT_THRESHOLD = 10;

  // 1. Check and Update Mastery Status for all sentences
  const allProgressSnap = await progressRef.get();
  let masteredSentencesInThisBatch = 0;
  
  for (const doc of allProgressSnap.docs) {
    const data = doc.data();
    const shouldBeMastered = 
      data.studyTimeSeconds >= MASTERY_TIME_THRESHOLD || 
      data.repeatCount >= MASTERY_REPEAT_THRESHOLD;
    
    if (shouldBeMastered && data.status !== 'mastered') {
      await doc.ref.update({
        status: 'mastered',
        masteredAt: data.lastStudiedAt || FieldValue.serverTimestamp()
      });
      masteredSentencesInThisBatch++;
    }
  }
  
  if (masteredSentencesInThisBatch > 0) {
    console.log(`   - Backfilled Mastery for ${masteredSentencesInThisBatch} sentences`);
  }

  // 2. Calculate Total Mastered Count
  const progressSnap = await progressRef.where('status', '==', 'mastered').get();
  const totalMasteredCount = progressSnap.size;
  console.log(`   - Mastered Count: ${totalMasteredCount}`);

  // 3. Calculate Total Study Time and Weekly Study Time
  const dailyStatsSnap = await dailyStatsRef.get();
  let totalStudyTimeSeconds = 0;
  let weeklyStudyTimeSeconds = 0;
  
  const mondayStr = getMostRecentMonday();
  const todayStr = getTodayString();
  
  const sortedDates = [];

  dailyStatsSnap.forEach(doc => {
    const data = doc.data();
    const time = data.studyTimeSeconds || 0;
    totalStudyTimeSeconds += time;
    
    const date = doc.id; // YYYY-MM-DD
    if (date >= mondayStr && date <= todayStr) {
      weeklyStudyTimeSeconds += time;
    }
    
    sortedDates.push(date);
  });
  
  sortedDates.sort((a, b) => b.localeCompare(a)); // Descending order
  
  console.log(`   - Total Study Time: ${totalStudyTimeSeconds}s`);
  console.log(`   - Weekly Study Time: ${weeklyStudyTimeSeconds}s`);

  // 4. Calculate Streaks
  let currentStreak = 0;
  let longestStreak = 0;
  
  if (sortedDates.length > 0) {
    // Current Streak
    let d = new Date();
    while (true) {
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (sortedDates.includes(dStr)) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
      } else {
        // If today is not in sortedDates, check yesterday
        if (currentStreak === 0) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
          if (sortedDates.includes(yStr)) {
            // Start counting from yesterday
            d = yesterday;
            continue;
          }
        }
        break;
      }
    }

    // Longest Streak
    let tempStreak = 1;
    longestStreak = sortedDates.length > 0 ? 1 : 0;
    
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
  }
  
  console.log(`   - Current Streak: ${currentStreak}`);
  console.log(`   - Longest Streak: ${longestStreak}`);

  // 5. Update User Document
  await userRef.update({
    'stats.totalStudyTimeSeconds': totalStudyTimeSeconds,
    'stats.weeklyStudyTimeSeconds': weeklyStudyTimeSeconds,
    'stats.totalMasteredCount': totalMasteredCount,
    'stats.currentStreak': currentStreak,
    'stats.longestStreak': longestStreak,
    'stats.lastActiveDate': sortedDates[0] || null
  });
  
  console.log(`✅ Updated stats for user ${uid}`);
}

async function run() {
  console.log('🚀 Starting User Stats Recalculation');
  
  const usersSnap = await db.collection('users').where('role', '==', 'student').get();
  console.log(`Found ${usersSnap.size} students to process.`);
  
  for (const doc of usersSnap.docs) {
    try {
      await recalculateUserStats(doc.id);
    } catch (err) {
      console.error(`❌ Failed to process user ${doc.id}:`, err);
    }
  }
  
  console.log('\n================================');
  console.log('✅ All user stats recalculated!');
}

run().catch(console.error);
