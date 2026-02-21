import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// This uses Application Default Credentials (ADC) since we are in Google Cloud/Next.js
// It will automatically use the service account we configured for Vertex AI
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const adminDb = admin.firestore();
const adminStorage = admin.storage();

export { adminDb, adminStorage };