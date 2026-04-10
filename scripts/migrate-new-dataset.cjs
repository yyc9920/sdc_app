/**
 * Migration Script for english_dataset.csv → Firestore (Emulator)
 *
 * Parses english_dataset.csv, groups by SetCode, and writes to
 * learning_sets/{SetCode}/sentences/{id} in Firestore emulator.
 * Also updates legacy sets with new metadata fields.
 *
 * Usage:
 *   1. Start emulators: firebase emulators:start
 *   2. Run: node scripts/migrate-new-dataset.cjs
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Initialize Firebase Admin with emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
initializeApp({ projectId: 'sdc-app-1d02c' });
const db = getFirestore();

const PUBLIC_DIR = path.join(__dirname, '../public');

const CATEGORY_MAP = {
  LEGACY: '기존 학습',
  SPK: 'TOEFL Speaking 독립형',
  INT: 'TOEFL Speaking 통합형',
  CONV: 'TOEFL Listening 대화',
  ACA: 'TOEFL Speaking Q4',
  LEC: 'TOEFL Listening 강의',
  TED: 'TED Talk',
  BTEW: 'BBC TEWS',
  B6ME: 'BBC 6 Minute English',
  ELLO: 'ELLLO Mixer',
  TRES: 'TOEFL Resources',
  BEP: 'Business English Pod',
  TAL: 'This American Life',
  EXT: '확장 콘텐츠',
  DLG: '일상 대화',
};

function parseSetCode(setCode) {
  // Format: L{level}_{category}_{sequence} e.g. L1_SPK_001
  const parts = setCode.split('_');
  const level = parseInt(parts[0].substring(1), 10); // L1 → 1
  const category = parts[1]; // SPK
  return { level, category };
}

async function migrateNewDataset() {
  console.log('--- Starting english_dataset.csv Migration ---');

  const filePath = path.join(PUBLIC_DIR, 'english_dataset.csv');
  if (!fs.existsSync(filePath)) {
    console.error('english_dataset.csv not found in public/');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(filePath, 'utf8');
  const { data: rows } = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  console.log(`Parsed ${rows.length} rows`);

  // Group rows by SetCode
  const setMap = new Map();
  for (const row of rows) {
    const code = row.SetCode;
    if (!code) continue;
    if (!setMap.has(code)) {
      setMap.set(code, []);
    }
    setMap.get(code).push(row);
  }

  console.log(`Found ${setMap.size} sets`);

  let totalSentences = 0;

  for (const [setCode, setRows] of setMap) {
    const { level, category } = parseSetCode(setCode);
    const title = setRows[0].SetTitle || setCode;
    const categoryLabel = CATEGORY_MAP[category] || category;

    // Create set document
    const setRef = db.collection('learning_sets').doc(setCode);
    await setRef.set({
      setId: setCode,
      title,
      level,
      category,
      categoryLabel,
      sentenceCount: setRows.length,
      isLegacy: false,
      status: 'ready',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Write sentences in batches
    let batch = db.batch();
    let count = 0;

    for (let i = 0; i < setRows.length; i++) {
      const row = setRows[i];
      const sentenceId = String(i);
      const sentenceRef = setRef.collection('sentences').doc(sentenceId);

      batch.set(sentenceRef, {
        id: i,
        rowSeq: parseInt(row.RowSeq, 10) || i + 1,
        rowType: (row.RowType || 'script').toLowerCase(),
        speaker: row.Speaker || '',
        english: row.EnglishSentence || '',
        koreanPronounce: row.KoreanPronounce || '',
        directComprehension: row.DirectComprehension || '',
        comprehension: row.Comprehension || '',
        note: row.Note || '',
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

    totalSentences += setRows.length;
    console.log(`  ${setCode}: "${title}" — ${setRows.length} sentences (L${level}/${category})`);
  }

  console.log(`\nMigrated ${setMap.size} sets, ${totalSentences} sentences total`);
}

async function updateLegacySets() {
  console.log('\n--- Updating Legacy Sets with new metadata ---');

  const legacySets = [
    'ultimate_speaking_beginner_1_1050',
    'essential_travel_english_phrases_100',
    'frequent_30_patterns',
  ];

  for (const setId of legacySets) {
    const setRef = db.collection('learning_sets').doc(setId);
    const doc = await setRef.get();

    if (!doc.exists) {
      console.log(`  ${setId}: not found, skipping`);
      continue;
    }

    await setRef.set(
      {
        level: 0,
        category: 'LEGACY',
        categoryLabel: '기존 학습',
        isLegacy: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`  Updated ${setId} with legacy metadata`);
  }
}

async function run() {
  await migrateNewDataset();
  await updateLegacySets();
  console.log('\nAll migrations complete!');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
