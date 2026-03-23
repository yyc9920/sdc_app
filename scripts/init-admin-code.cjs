const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase Admin with emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
initializeApp({ projectId: 'sdc-app-1d02c' });

const db = getFirestore();

async function initAdmin() {
  const code = 'ADMIN-0000';
  const codesRef = db.collection('access_codes');
  
  // Check if it already exists
  const snapshot = await codesRef.where('code', '==', code).get();
  if (!snapshot.empty) {
    console.log(`Admin code ${code} already exists.`);
    process.exit(0);
  }
  
  await codesRef.add({
    code,
    role: 'admin',
    status: 'available',
    assignedTo: null,
    createdAt: FieldValue.serverTimestamp(),
    usedAt: null,
    expiresAt: null,
    extendedBy: null,
    extendedAt: null,
  });
  
  console.log(`Successfully created admin code: ${code}`);
}

initAdmin().catch(console.error);
