#!/usr/bin/env node
// scripts/backfill-supported-modes.cjs
//
// One-time migration: reads each learning_set's sentences, computes supportedModes,
// checks for speed_listening_sets children, and writes back to the learning_set doc.
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json node scripts/backfill-supported-modes.cjs
//
// Or with Firebase emulators:
//   FIRESTORE_EMULATOR_HOST=localhost:8080 node scripts/backfill-supported-modes.cjs

const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function main() {
  const setsSnap = await db.collection('learning_sets').get();
  console.log(`Processing ${setsSnap.size} learning sets...`);

  // Pre-fetch speed listening parent IDs
  const slSnap = await db.collection('speed_listening_sets').get();
  const slParentIds = new Set();
  slSnap.forEach(doc => {
    const data = doc.data();
    if (data.parentSetId) slParentIds.add(data.parentSetId);
  });
  console.log(`Found ${slParentIds.size} parent sets with speed listening data.`);

  let updated = 0;
  for (const setDoc of setsSnap.docs) {
    const setId = setDoc.id;
    const sentencesSnap = await db
      .collection('learning_sets')
      .doc(setId)
      .collection('sentences')
      .get();

    const rowTypes = new Set();
    const speakers = new Set();
    sentencesSnap.forEach(sDoc => {
      const d = sDoc.data();
      if (d.rowType) rowTypes.add(d.rowType);
      if (d.rowType === 'script' && d.speaker) speakers.add(d.speaker);
    });

    const modes = [];
    if (rowTypes.has('script') || rowTypes.has('reading')) modes.push('repetition');
    if (rowTypes.has('script') || rowTypes.has('reading')) modes.push('speedListening');
    if (rowTypes.has('script')) modes.push('infiniteSpeaking');
    if (rowTypes.has('script') && speakers.size >= 2) modes.push('rolePlay');
    if (rowTypes.has('vocab') || rowTypes.has('expression')) modes.push('vocab');
    if (rowTypes.has('prompt') && rowTypes.has('script')) modes.push('freeResponse');

    const hasSpeedListening = slParentIds.has(setId);

    await db.collection('learning_sets').doc(setId).update({
      supportedModes: modes,
      hasSpeedListening,
    });

    updated++;
    if (updated % 20 === 0) console.log(`  ${updated}/${setsSnap.size}`);
  }

  console.log(`Done. Updated ${updated} sets.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
