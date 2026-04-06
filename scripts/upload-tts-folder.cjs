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
  storageBucket: 'gs://sdc-app-1d02c.appspot.com'
});

const bucket = getStorage().bucket();

async function uploadFolder(localFolderPath, destinationPrefix) {
  console.log(`Uploading files from "${localFolderPath}" to "${destinationPrefix}"...`);

  const files = fs.readdirSync(localFolderPath, { withFileTypes: true });
  
  let uploadedCount = 0;
  for (const file of files) {
    const localFilePath = path.join(localFolderPath, file.name);
    
    if (file.isDirectory()) {
      // Recursively upload subdirectories
      const subFolderPrefix = `${destinationPrefix}${file.name}/`;
      await uploadFolder(localFilePath, subFolderPrefix);
    } else {
      // Upload file
      const destination = `${destinationPrefix}${file.name}`;
      try {
        await bucket.upload(localFilePath, {
          destination: destination,
          public: true // Make files publicly accessible
        });
        console.log(`  Uploaded ${localFilePath} to ${destination}`);
        uploadedCount++;
      } catch (err) {
        console.error(`  Failed to upload ${localFilePath}:`, err);
      }
    }
  }
  return uploadedCount;
}

async function run() {
  const localFolder = path.join(__dirname, '../public/tts/frequent_30_patterns');
  const destinationFolder = 'frequent_30_patterns/';
  
  if (!fs.existsSync(localFolder)) {
    console.error(`❌ Local folder not found: ${localFolder}`);
    return;
  }

  console.log('Starting upload...');
  const totalUploaded = await uploadFolder(localFolder, destinationFolder);
  console.log(`
✅ Finished. Uploaded ${totalUploaded} files.`);
}

run().catch((err) => {
  console.error('❌ An error occurred during the upload process:', err);
  process.exit(1);
});
