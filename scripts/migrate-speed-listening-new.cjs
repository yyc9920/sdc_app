/**
 * Migration Script for new Speed Listening sets → Firestore (Emulator)
 *
 * Reads generated JSON files from public/speed_listening_new/
 * and writes to speed_listening_sets collection in Firestore emulator.
 *
 * Usage:
 *   1. Generate data first: node scripts/generate-speed-listening-new.cjs
 *   2. Start emulators: firebase emulators:start
 *   3. Run: node scripts/migrate-speed-listening-new.cjs
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
initializeApp({ projectId: 'sdc-app-1d02c' });
const db = getFirestore();

const INPUT_DIR = path.join(__dirname, '../public/speed_listening_new');

async function migrate() {
  console.log('--- Starting New Speed Listening Migration to Firestore ---');

  if (!fs.existsSync(INPUT_DIR)) {
    console.error('speed_listening_new/ directory not found. Run generate-speed-listening-new.cjs first.');
    process.exit(1);
  }

  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} JSON files`);

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

  console.log(`\n--- Migration Complete ---`);
  console.log(`Total sets: ${totalSets}`);
  console.log(`Total sentences: ${totalSentences}`);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
