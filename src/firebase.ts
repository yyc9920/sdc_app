import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator, ref, getDownloadURL } from 'firebase/storage';
import { Capacitor } from '@capacitor/core';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
export const functions = getFunctions(app, 'asia-northeast3');
export const storage = getStorage(app);

/**
 * Get the download URL for a file in Firebase Storage.
 * This handles both production and emulator environments.
 */
export const getStorageUrl = async (path: string): Promise<string> => {
  try {
    const fileRef = ref(storage, path);
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error(`Error getting storage URL for ${path}:`, error);
    // Return the path as is as a last resort, prefixed with a slash
    return `/${path}`;
  }
};

// Use Emulators only in DEV mode AND when VITE_USE_EMULATOR is not 'false'
// Never use emulators in native app builds
const useEmulator = import.meta.env.DEV
  && import.meta.env.VITE_USE_EMULATOR !== 'false'
  && !Capacitor.isNativePlatform();

if (useEmulator) {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
  
  connectAuthEmulator(auth, `http://${hostname}:9099`);
  connectFirestoreEmulator(db, hostname, 8080);
  connectFunctionsEmulator(functions, hostname, 5001);
  connectStorageEmulator(storage, hostname, 9199);
  
  console.log('🔧 Using Firebase Emulators');
} else if (import.meta.env.DEV) {
  console.log('🔥 DEV mode using PRODUCTION Firebase');
}

export default app;
