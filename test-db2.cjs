const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'scripts', 'service-account.json');

initializeApp({
  credential: cert(require(SERVICE_ACCOUNT_PATH)),
  projectId: 'sdc-app-1d02c'
});

const db = getFirestore();

async function check() {
  const learningSetId = 'native_30_patterns';
  const LEARNING_SET_TO_SPEED_PREFIX = {
    'ultimate_speaking_beginner_1_1050': 'beginner_',
    'essential_travel_english_phrases_100': 'travel_',
    'native_30_patterns': 'native_patterns_',
  };
  const prefix = LEARNING_SET_TO_SPEED_PREFIX[learningSetId];
  
  const snapshot = await db.collection('speed_listening_sets')
    .orderBy('level', 'asc')
    .get();
  
  const matchingSets = snapshot.docs.filter(doc => doc.id.startsWith(prefix));

  const results = await Promise.all(matchingSets.map(async (setDoc) => {
    const sentencesQuery = db.collection('speed_listening_sets')
      .doc(setDoc.id)
      .collection('sentences')
      .orderBy('id', 'asc');
      
    const sentencesSnapshot = await sentencesQuery.get();
    
    console.log(`Set ${setDoc.id} has ${sentencesSnapshot.docs.length} sentences`);
  }));
}

check().catch(console.error);
