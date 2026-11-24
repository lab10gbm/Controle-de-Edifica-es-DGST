import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  Firestore,
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
      experimentalAutoDetectLongPolling: true,
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const AUTHORIZED_EMAIL = 'sst10gbm@gmail.com';

export function isAuthorizedUser(user: User | null | undefined): boolean {
  return Boolean(user?.email && user.email.trim().toLowerCase() === AUTHORIZED_EMAIL);
}

export const db = dbInstance;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
  login_hint: AUTHORIZED_EMAIL,
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

let activeSignInPromise: Promise<User> | null = null;

export async function signInWithGoogle(): Promise<User> {
  if (activeSignInPromise) {
    return activeSignInPromise;
  }
  activeSignInPromise = signInWithPopup(auth, googleProvider)
    .then(async (result) => {
      if (!isAuthorizedUser(result.user)) {
        const attemptedEmail = result.user?.email || 'desconhecido';
        await signOut(auth);
        const err = new Error(
          `Acesso restrito ao e-mail ${AUTHORIZED_EMAIL}. A conta "${attemptedEmail}" não tem permissão.`
        ) as Error & { code?: string };
        err.code = 'auth/unauthorized-email';
        throw err;
      }
      return result.user;
    })
    .finally(() => {
      activeSignInPromise = null;
    });
  return activeSignInPromise;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

testConnection();

export { firebaseConfig };
