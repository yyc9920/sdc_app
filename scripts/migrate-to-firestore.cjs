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

const DATA_SETS = [
  { id: 'ultimate_speaking_beginner_1_1050', file: 'ultimate_speaking_beginner_1_1050.csv', title: '왕초보 1050문장' },
  { id: 'essential_travel_english_phrases_100', file: 'essential_travel_english_phrases_100.csv', title: '여행 필수 100문장' },
  { id: 'frequent_30_patterns', file: 'frequent_30_patterns.csv', title: '자주 쓰이는 30패턴' }
];

async function migrateCSV() {
  console.log('--- Starting CSV Migration to Firestore ---');
  
  for (const set of DATA_SETS) {
    const filePath = path.join(PUBLIC_DIR, set.file);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${set.file} (File not found)`);
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
    
    console.log(`Created learning set: ${set.id} with ${rows.length} sentences`);
    
    // 2. Add sentences in subcollection (batched)
    let batch = db.batch();
    let count = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const sentenceId = String(i);
      
      const sentenceRef = setRef.collection('sentences').doc(sentenceId);
      
      // Keep existing TTS local URLs for now (Phase 2 focuses on data layer, Storage migration is separate/continuous)
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
        batch = db.batch();
        count = 0;
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
    console.log(`Finished migrating sentences for ${set.id}`);
  }
}

async function migrateSpeedListening() {
  console.log('\n--- Starting Speed Listening Migration to Firestore ---');
  
  const speedSets = [
    { id: 'speed_listening_beginner', file: 'speed_listening_beginner.json', parentSetId: 'ultimate_speaking_beginner_1_1050' },
    { id: 'speed_listening_travel', file: 'speed_listening_travel.json', parentSetId: 'essential_travel_english_phrases_100' },
    { id: 'speed_listening_patterns', file: 'speed_listening_patterns.json', parentSetId: 'frequent_30_patterns' }
  ];

  for (const setInfo of speedSets) {
    const filePath = path.join(PUBLIC_DIR, setInfo.file);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${setInfo.file} (File not found)`);
      continue;
    }
    
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // jsonData format: Array of SpeedListeningSet objects
    
    console.log(`Migrating ${jsonData.length} sets for ${setInfo.id}`);

    for (const setData of jsonData) {
      const setRef = db.collection('speed_listening_sets').doc(setData.setId);
      
      await setRef.set({
        setId: setData.setId,
        parentSetId: setInfo.parentSetId,
        theme: setData.theme,
        level: setData.level,
        setNumber: setData.setNumber,
        quiz: setData.quiz,
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
    }
    
    console.log(`Finished migrating speed listening sets for ${setInfo.id}`);
  }
}

async function run() {
  await migrateCSV();
  await migrateSpeedListening();
  console.log('\n✅ All migrations complete!');
}

run().catch(console.error);
