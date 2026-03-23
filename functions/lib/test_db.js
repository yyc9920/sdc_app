"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
(0, app_1.initializeApp)({ projectId: 'sdc-app-1d02c' });
const db = (0, firestore_1.getFirestore)();
async function check() {
    const doc = await db.collection('speed_listening_sets').doc('native_30_patterns').get();
    console.log('Exists:', doc.exists);
}
check();
