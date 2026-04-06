const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const path = require('path');
const fs = require('fs');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ Service account key not found at scripts/service-account.json');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);
initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'sdc-app-1d02c.firebasestorage.app'
});

const bucket = getStorage().bucket();

async function checkFolder(prefix) {
  console.log(`Checking for files in folder "${prefix}"...`);

  const [files] = await bucket.getFiles({ prefix: prefix });
  console.log(`Found ${files.length} files.`);

  if (files.length > 0) {
    console.log('First 5 files found:');
    files.slice(0, 5).forEach(f => console.log(` - ${f.name}`));
  }
}

async function run() {
  const newFolder = 'frequent_30_patterns/';
  await checkFolder(newFolder);
}

run().catch((err) => {
  console.error('❌ An error occurred during the renaming process:', err);
  process.exit(1);
});
