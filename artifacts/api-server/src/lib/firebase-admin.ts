import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "./logger";

let app: admin.app.App;

function getFirebaseAdmin(): admin.app.App {
  if (!app) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

    if (!privateKey || !clientEmail || !projectId) {
      logger.error("Missing Firebase Admin credentials");
      throw new Error("Missing Firebase Admin credentials");
    }

    app = admin.initializeApp({
      credential: admin.credential.cert({ privateKey, clientEmail, projectId }),
      storageBucket,
    });
  }
  return app;
}

export async function verifyFirebaseToken(token: string): Promise<admin.auth.DecodedIdToken> {
  const adminApp = getFirebaseAdmin();
  return adminApp.auth().verifyIdToken(token);
}

export async function setAdminClaim(uid: string): Promise<void> {
  const adminApp = getFirebaseAdmin();
  await adminApp.auth().setCustomUserClaims(uid, { admin: true });
}

export function getFirebaseFirestore() {
  const adminApp = getFirebaseAdmin();
  const databaseId = process.env.FIRESTORE_DATABASE_ID ?? "(default)";
  return getFirestore(adminApp, databaseId);
}

export function getFirebaseStorageBucket() {
  const adminApp = getFirebaseAdmin();
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error("FIREBASE_STORAGE_BUCKET is not set");
  return getStorage(adminApp).bucket(bucketName);
}
