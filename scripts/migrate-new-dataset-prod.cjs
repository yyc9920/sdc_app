/**
 * Production Migration Script for english_dataset.csv → Firestore
 *
 * Usage:
 *   1. Download service account key from Firebase Console:
 *      Project Settings > Service Accounts > Generate new private key
 *   2. Save as: scripts/service-account.json (gitignored)
 *   3. Run: node scripts/migrate-new-dataset-prod.cjs
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

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
  projectId: 'sdc-app-1d02c',
});

const db = getFirestore();
console.log('Connected to PRODUCTION Firestore');

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
};

function parseSetCode(setCode) {
  const parts = setCode.split('_');
  const level = parseInt(parts[0].substring(1), 10);
  const category = parts[1];
  return { level, category };
}

async function migrateNewDataset() {
  console.log('\n--- Starting english_dataset.csv Migration to Production ---');

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
        console.log(`   Committed batch for ${setCode} (${i + 1}/${setRows.length})`);
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
  console.log('Starting Production Migration');
  console.log('================================\n');

  await migrateNewDataset();
  await updateLegacySets();

  console.log('\n================================');
  console.log('All migrations complete!');
  console.log('');
  console.log('Verify in Firebase Console:');
  console.log('https://console.firebase.google.com/project/sdc-app-1d02c/firestore');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
