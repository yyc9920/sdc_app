/**
 * Create Initial Admin Access Code (Production)
 * 
 * This creates the first admin code directly in Firestore.
 * After this, new admin codes can be created via the Cloud Function.
 * 
 * Usage: node scripts/create-initial-admin-code.cjs
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { randomBytes } = require('crypto');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ Service account key not found at scripts/service-account.json');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);
initializeApp({
  credential: cert(serviceAccount),
  projectId: 'sdc-app-1d02c'
});

const db = getFirestore();

function generateCode() {
  const charsList = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += charsList[bytes[i] % charsList.length];
    if (i === 3) code += '-';
  }
  return code;
}

async function createInitialAdminCode() {
  console.log('🔐 Creating Initial Admin Access Code\n');
  
  // Check if any admin code already exists
  const existingCodes = await db.collection('access_codes')
    .where('role', '==', 'admin')
    .where('status', '==', 'available')
    .limit(1)
    .get();
  
  if (!existingCodes.empty) {
    const existing = existingCodes.docs[0].data();
    console.log('⚠️  An available admin code already exists:');
    console.log(`   Code: ${existing.code}`);
    console.log('\nNo new code created.');
    return;
  }
  
  const code = generateCode();
  
  const codeDoc = await db.collection('access_codes').add({
    code,
    role: 'admin',
    status: 'available',
    assignedTo: null,
    createdAt: FieldValue.serverTimestamp(),
    usedAt: null,
    expiresAt: null, // Admin codes don't expire
    extendedBy: null,
    extendedAt: null,
  });
  
  console.log('✅ Initial Admin Code Created!\n');
  console.log('================================');
  console.log(`   Code: ${code}`);
  console.log(`   Role: admin`);
  console.log(`   Doc ID: ${codeDoc.id}`);
  console.log('================================\n');
  console.log('⚠️  IMPORTANT: Save this code securely!');
  console.log('   Use it to register the first admin account.');
  console.log('   This code can only be used ONCE.');
}

createInitialAdminCode().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
