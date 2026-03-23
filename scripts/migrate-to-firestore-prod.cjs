/**
 * Production Firestore Migration Script
 * 
 * Usage:
 *   1. Download service account key from Firebase Console:
 *      Project Settings > Service Accounts > Generate new private key
 *   2. Save as: scripts/service-account.json (gitignored)
 *   3. Run: node scripts/migrate-to-firestore-prod.cjs
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// === Production Configuration ===
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ Service account key not found!');
  console.error('');
  console.error('Please download it from Firebase Console:');
  console.error('1. Go to: https://console.firebase.google.com/project/sdc-app-1d02c/settings/serviceaccounts/adminsdk');
  console.error('2. Click "Generate new private key"');
  console.error('3. Save the file as: scripts/service-account.json');
  process.exit(1);
}

// Initialize Firebase Admin with service account (PRODUCTION)
const serviceAccount = require(SERVICE_ACCOUNT_PATH);
initializeApp({
  credential: cert(serviceAccount),
  projectId: 'sdc-app-1d02c'
});

const db = getFirestore();
console.log('🔥 Connected to PRODUCTION Firestore');

const PUBLIC_DIR = path.join(__dirname, '../public');

const DATA_SETS = [
  { id: 'ultimate_speaking_beginner_1_1050', file: 'ultimate_speaking_beginner_1_1050.csv', title: '왕초보 1050문장' },
  { id: 'essential_travel_english_phrases_100', file: 'essential_travel_english_phrases_100.csv', title: '여행 필수 100문장' },
  { id: 'frequent_30_patterns', file: 'frequent_30_patterns.csv', title: '자주 쓰이는 30패턴' }
];

async function migrateCSV() {
  console.log('\n--- Starting CSV Migration to Production Firestore ---');
  
  for (const set of DATA_SETS) {
    const filePath = path.join(PUBLIC_DIR, set.file);
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skipping ${set.file} (File not found)`);
      continue;
    }
    
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const { data: rows } = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    
    // 1. Create set document
    const setRef = db.collection('learning_sets').doc(set.id);
    await setRef.set({
      setId: set.id,
      title: set.title,
      description: '',
      sentenceCount: rows.length,
      status: 'ready',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: 'system',
      processingError: null,
    });
    
    console.log(`📚 Created learning set: ${set.id} with ${rows.length} sentences`);
    
    // 2. Add sentences in subcollection (batched)
    let batch = db.batch();
    let count = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const sentenceId = String(i);
      
      const sentenceRef = setRef.collection('sentences').doc(sentenceId);
      
      // TTS URLs pointing to local public folder (can be migrated to Storage later)
      const ttsUrls = {
        female: `/tts/${set.id}/female/${i}.mp3`,
        male: `/tts/${set.id}/male/${i}.mp3`,
        child_female: `/tts/${set.id}/child_female/${i}.mp3`,
        child_male: `/tts/${set.id}/child_male/${i}.mp3`,
        elderly_female: `/tts/${set.id}/elderly_female/${i}.mp3`,
        elderly_male: `/tts/${set.id}/elderly_male/${i}.mp3`,
      };

      batch.set(sentenceRef, {
        id: i,
        english: row['English Sentence'] || '',
        koreanPronounce: row['Korean Pronounce'] || '',
        directComprehension: row['Direct Comprehension'] || '',
        comprehension: row['Comprehension'] || '',
        ttsUrls
      });
      
      count++;
      
      if (count === 400) { // Firestore batch limit is 500
        await batch.commit();
        console.log(`   Committed batch (${i + 1}/${rows.length})`);
        batch = db.batch();
        count = 0;
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
    console.log(`✅ Finished migrating sentences for ${set.id}`);
  }
}

async function migrateSpeedListening() {
  console.log('\n--- Starting Speed Listening Migration to Production Firestore ---');
  
  const speedFiles = [
    { file: 'speed_listening_beginner.json', collectionId: 'speed_listening_beginner' },
    { file: 'speed_listening_travel.json', collectionId: 'speed_listening_travel' },
    { file: 'speed_listening_patterns.json', collectionId: 'speed_listening_patterns' }
  ];

  for (const speedFile of speedFiles) {
    const filePath = path.join(PUBLIC_DIR, speedFile.file);
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skipping ${speedFile.file} (File not found)`);
      continue;
    }
    
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // jsonData format: Array of sets, each with { setId, theme, level, sentences: [...], quiz: {...} }
    
    console.log(`🎧 Processing ${speedFile.file} with ${jsonData.length} sets`);
    
    let batch = db.batch();
    let count = 0;
    
    for (const setData of jsonData) {
      const setRef = db.collection('speed_listening_sets').doc(setData.setId);
      
      batch.set(setRef, {
        setNumber: setData.setNumber,
        setId: setData.setId,
        theme: setData.theme,
        level: setData.level,
        sentenceCount: setData.sentences.length,
        quiz: setData.quiz,
        createdAt: FieldValue.serverTimestamp()
      });
      
      count++;
      
      // Add sentences as subcollection
      for (const sentence of setData.sentences) {
        const sentenceRef = setRef.collection('sentences').doc(String(sentence.id));
        batch.set(sentenceRef, {
          id: sentence.id,
          english: sentence.english,
          korean: sentence.korean,
          properNounIndices: sentence.properNounIndices || []
        });
        
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
    console.log(`✅ Finished migrating ${speedFile.file}`);
  }
}

async function run() {
  console.log('🚀 Starting Production Migration');
  console.log('================================\n');
  
  // await migrateCSV();
  await migrateSpeedListening();
  
  console.log('\n================================');
  console.log('✅ All migrations complete!');
  console.log('');
  console.log('You can verify the data in Firebase Console:');
  console.log('https://console.firebase.google.com/project/sdc-app-1d02c/firestore');
}

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
