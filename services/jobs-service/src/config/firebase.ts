import * as admin from 'firebase-admin';
import { env } from './env';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: env.FIREBASE_PROJECT_ID,
    ...(env.GOOGLE_APPLICATION_CREDENTIALS
      ? { credential: admin.credential.applicationDefault() }
      : {}),
  });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

export { db, admin };

export const col = {
  jobs:            db.collection('jobs'),
  jobApplications: db.collection('jobApplications'),
  users:           db.collection('users'),
  matchScores:     db.collection('matchScores'),
  conversionEvents: db.collection('conversionEvents'),
};
