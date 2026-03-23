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
  const snapshot = await db.collection('speed_listening_sets').get();
  console.log("All Document IDs in speed_listening_sets:");
  snapshot.docs.forEach(doc => {
    if (doc.id.includes("native") || doc.id.includes("pattern")) {
      console.log(doc.id);
    }
  });
}

check().catch(console.error);
