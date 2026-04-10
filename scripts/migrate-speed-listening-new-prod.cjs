/**
 * Production Migration Script for new Speed Listening sets → Firestore
 *
 * Usage:
 *   1. Generate data first: node scripts/generate-speed-listening-new.cjs
 *   2. Ensure service account key exists: scripts/service-account.json
 *   3. Run: node scripts/migrate-speed-listening-new-prod.cjs
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// === Production Configuration ===
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('Service account key not found!');
  console.error('');
  console.error('Please download it from Firebase Console:');
  console.error('1. Go to: https://console.firebase.google.com/project/sdc-app-1d02c/settings/serviceaccounts/adminsdk');
  console.error('2. Click "Generate new private key"');
  console.error('3. Save the file as: scripts/service-account.json');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'sdc-app-1d02c'
});
const db = getFirestore();

const INPUT_DIR = path.join(__dirname, '../public/speed_listening_new');

const OBSOLETE_PARENT_SETS = [
  'L2_TRES_001',
  'L4_TAL_002',
  'L4_TED_003',
  'L4_TED_004',
];

async function deleteObsoleteSpeedListeningSets() {
  console.log('--- Deleting Speed Listening sets for obsolete parents ---');

  for (const parentSetId of OBSOLETE_PARENT_SETS) {
    const snapshot = await db.collection('speed_listening_sets')
      .where('parentSetId', '==', parentSetId)
      .get();

    if (snapshot.empty) {
      console.log(`  ${parentSetId}: no speed listening sets found`);
      continue;
    }

    for (const doc of snapshot.docs) {
      const sentences = await doc.ref.collection('sentences').listDocuments();
      if (sentences.length > 0) {
        const batch = db.batch();
        for (const sentenceDoc of sentences) {
          batch.delete(sentenceDoc);
        }
        await batch.commit();
      }
      await doc.ref.delete();
    }

    console.log(`  Deleted ${snapshot.size} speed listening sets for ${parentSetId}`);
  }
}

async function migrate() {
  console.log('=== PRODUCTION: New Speed Listening Migration ===');
  console.log('Target: sdc-app-1d02c (PRODUCTION)\n');

  if (!fs.existsSync(INPUT_DIR)) {
    console.error('speed_listening_new/ directory not found. Run generate-speed-listening-new.cjs first.');
    process.exit(1);
  }

  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} JSON files\n`);

  let totalSets = 0;
  let totalSentences = 0;

  for (const file of files) {
    const filePath = path.join(INPUT_DIR, file);
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (const setData of jsonData) {
      const setRef = db.collection('speed_listening_sets').doc(setData.setId);

      // Normalize quiz field: use answerIndex consistently
      const quiz = setData.quiz ? {
        question: setData.quiz.question,
        options: setData.quiz.options,
        answerIndex: setData.quiz.answerIndex ?? setData.quiz.answer ?? 0
      } : null;

      await setRef.set({
        setId: setData.setId,
        parentSetId: setData.parentSetId,
        theme: setData.theme,
        level: setData.level,
        setNumber: setData.setNumber,
        quiz,
        sentenceCount: setData.sentences.length,
        createdAt: FieldValue.serverTimestamp()
      });

      // Add sentences in subcollection
      let batch = db.batch();
      let count = 0;

      for (const item of setData.sentences) {
        const sentenceRef = setRef.collection('sentences').doc(String(item.id));

        batch.set(sentenceRef, {
          id: item.id,
          english: item.english,
          korean: item.korean,
          properNounIndices: item.properNounIndices || []
        });

        count++;
        if (count === 400) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      totalSets++;
      totalSentences += setData.sentences.length;
    }

    console.log(`  ${file}: ${jsonData.length} sets migrated`);
  }

  console.log(`\n=== Production Migration Complete ===`);
  console.log(`Total sets: ${totalSets}`);
  console.log(`Total sentences: ${totalSentences}`);
}

async function run() {
  await deleteObsoleteSpeedListeningSets();
  await migrate();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
