import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';

initializeApp();
setGlobalOptions({ maxInstances: 10, region: 'asia-northeast3' });

export * from './auth/validateCode';
export * from './auth/createAccessCode';
export * from './auth/extendCodeExpiration';
