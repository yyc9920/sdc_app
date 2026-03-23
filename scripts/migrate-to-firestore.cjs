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
    { id: 'speed_listening_beginner', file: 'speed_listening_beginner.json', parentSetId: 'ultimate_speaking_beginner_1_1050', theme: '왕초보 1050문장' },
    { id: 'speed_listening_travel', file: 'speed_listening_travel.json', parentSetId: 'essential_travel_english_phrases_100', theme: '여행 필수 100문장' },
    { id: 'speed_listening_patterns', file: 'speed_listening_patterns.json', parentSetId: 'frequent_30_patterns', theme: '자주 쓰이는 30패턴' }
  ];

  for (const set of speedSets) {
    const filePath = path.join(PUBLIC_DIR, set.file);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${set.file} (File not found)`);
      continue;
    }
    
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // jsonData format: { level_1: [ {id, ...}, ... ], level_2: [...] }
    
    const setRef = db.collection('speed_listening_sets').doc(set.id);
    let totalSentenceCount = 0;
    for (const level of Object.keys(jsonData)) {
       totalSentenceCount += jsonData[level].length;
    }

    await setRef.set({
      setId: set.id,
      theme: set.theme,
      parentSetId: set.parentSetId,
      sentenceCount: totalSentenceCount,
      levelsAvailable: Object.keys(jsonData).length,
      createdAt: FieldValue.serverTimestamp()
    });
    
    console.log(`Created speed listening set: ${set.id} with ${totalSentenceCount} sentences across levels`);

    // We store all sentences in a single subcollection, adding 'level' property
    let batch = db.batch();
    let count = 0;
    
    for (const [levelKey, sentences] of Object.entries(jsonData)) {
      const levelNum = parseInt(levelKey.replace('level_', ''), 10);
      
      for (const item of sentences) {
        // Doc ID format: level_id (e.g. 1_0, 1_1)
        const docId = `${levelNum}_${item.id}`;
        const itemRef = setRef.collection('sentences').doc(docId);
        
        batch.set(itemRef, {
          level: levelNum,
          originalId: item.id,
          quiz: item.quiz, // contains question, options, answerIndex
          ttsOptions: item.ttsOptions // contains url, voice
        });
        
        count++;
        if (count === 400) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
    console.log(`Finished migrating speed listening sentences for ${set.id}`);
  }
}

async function run() {
  await migrateCSV();
  await migrateSpeedListening();
  console.log('\n✅ All migrations complete!');
}

run().catch(console.error);
