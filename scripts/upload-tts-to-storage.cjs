/**
 * Upload TTS files to Firebase Storage (Production)
 * 
 * Usage: node scripts/upload-tts-to-storage.cjs
 * 
 * Requires: scripts/service-account.json
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ Service account key not found at scripts/service-account.json');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);
const BUCKET_NAME = 'sdc-app-1d02c.firebasestorage.app';

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: BUCKET_NAME
});

const bucket = getStorage().bucket();
const db = getFirestore();
const TTS_DIR = path.join(__dirname, '../public/tts');

// Map TTS folder names to Firestore document IDs
const FOLDER_TO_FIRESTORE_ID = {
  'native_30_patterns': 'frequent_30_patterns',
  'essential_travel_english_phrases_100': 'essential_travel_english_phrases_100',
  'ultimate_speaking_beginner_1_1050': 'ultimate_speaking_beginner_1_1050'
};

async function uploadFile(localPath, storagePath) {
  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: {
      contentType: 'audio/mpeg',
      cacheControl: 'public, max-age=31536000', // 1 year cache
    }
  });
  
  // Make file publicly accessible
  const file = bucket.file(storagePath);
  await file.makePublic();
  
  return `https://storage.googleapis.com/${BUCKET_NAME}/${storagePath}`;
}

async function uploadTTSFiles() {
  console.log('🚀 Starting TTS Upload to Firebase Storage');
  console.log(`📁 Source: ${TTS_DIR}`);
  console.log(`🪣 Bucket: ${BUCKET_NAME}\n`);

  const setFolders = fs.readdirSync(TTS_DIR).filter(f => 
    fs.statSync(path.join(TTS_DIR, f)).isDirectory()
  );

  let totalUploaded = 0;
  let totalSkipped = 0;

  for (const setId of setFolders) {
    const setPath = path.join(TTS_DIR, setId);
    const voiceFolders = fs.readdirSync(setPath).filter(f =>
      fs.statSync(path.join(setPath, f)).isDirectory()
    );

    console.log(`\n📚 Processing: ${setId}`);
    
    const urlUpdates = {}; // { sentenceId: { voice: url, ... } }

    for (const voice of voiceFolders) {
      const voicePath = path.join(setPath, voice);
      const files = fs.readdirSync(voicePath).filter(f => f.endsWith('.mp3'));
      
      console.log(`   🎤 ${voice}: ${files.length} files`);
      
      for (const file of files) {
        const localPath = path.join(voicePath, file);
        const storagePath = `tts/${setId}/${voice}/${file}`;
        
        try {
          // Check if already exists
          const [exists] = await bucket.file(storagePath).exists();
          if (exists) {
            totalSkipped++;
            continue;
          }
          
          const url = await uploadFile(localPath, storagePath);
          
          // Track URL for Firestore update
          const sentenceId = file.replace('.mp3', '');
          if (!urlUpdates[sentenceId]) {
            urlUpdates[sentenceId] = {};
          }
          urlUpdates[sentenceId][voice] = url;
          
          totalUploaded++;
          
          if (totalUploaded % 100 === 0) {
            console.log(`      ✅ Uploaded ${totalUploaded} files...`);
          }
        } catch (err) {
          console.error(`      ❌ Failed: ${storagePath}`, err.message);
        }
      }
    }

    // Update Firestore with new URLs
    if (Object.keys(urlUpdates).length > 0) {
      const firestoreSetId = FOLDER_TO_FIRESTORE_ID[setId] || setId;
      console.log(`   📝 Updating Firestore URLs for ${firestoreSetId}...`);
      
      let batch = db.batch();
      let count = 0;
      
      for (const [sentenceId, urls] of Object.entries(urlUpdates)) {
        const docRef = db.collection('learning_sets').doc(firestoreSetId)
          .collection('sentences').doc(sentenceId);
        
        batch.update(docRef, { ttsUrls: urls });
        count++;
        
        if (count >= 400) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
      
      if (count > 0) {
        await batch.commit();
      }
    }
  }

  // Also upload announcement and dingdong
  const miscFiles = ['announcement.mp3', 'dingdong.wav'];
  for (const file of miscFiles) {
    const localPath = path.join(TTS_DIR, file);
    if (fs.existsSync(localPath)) {
      const storagePath = `tts/${file}`;
      const [exists] = await bucket.file(storagePath).exists();
      if (!exists) {
        await bucket.upload(localPath, {
          destination: storagePath,
          metadata: { cacheControl: 'public, max-age=31536000' }
        });
        await bucket.file(storagePath).makePublic();
        console.log(`✅ Uploaded: ${file}`);
        totalUploaded++;
      }
    }
  }

  console.log('\n================================');
  console.log(`✅ Upload complete!`);
  console.log(`   Uploaded: ${totalUploaded} files`);
  console.log(`   Skipped (already exists): ${totalSkipped} files`);
}

uploadTTSFiles().catch(err => {
  console.error('❌ Upload failed:', err);
  process.exit(1);
});
