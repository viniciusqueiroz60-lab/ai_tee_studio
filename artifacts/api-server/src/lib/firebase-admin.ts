import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "./logger";

let app: admin.app.App;

function getFirebaseAdmin(): admin.app.App {
  if (!app) {
    let privateKey: string | undefined;
    let clientEmail: string | undefined;
    let projectId: string | undefined;

    // Preferred: full service account JSON in one secret
    const jsonSecret = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (jsonSecret) {
      try {
        const parsed = JSON.parse(jsonSecret);
        privateKey = parsed.private_key;
        clientEmail = parsed.client_email;
        projectId = parsed.project_id;
      } catch (e) {
        logger.error({ err: e }, "Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON");
        throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
      }
    } else {
      // Fallback: separate env vars
      privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
      clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      projectId = process.env.FIREBASE_PROJECT_ID;
    }

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
