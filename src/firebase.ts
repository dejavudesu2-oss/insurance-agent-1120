import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfigJson from '../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
];

const viteEnv =
  (import.meta as { env?: Record<string, string | undefined> }).env || {};

export const firebaseConfig = {
  apiKey: viteEnv.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain:
    viteEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId:
    viteEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket:
    viteEnv.VITE_FIREBASE_STORAGE_BUCKET ||
    firebaseConfigJson.storageBucket,
  messagingSenderId:
    viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    firebaseConfigJson.messagingSenderId,
  appId: viteEnv.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
  measurementId:
    viteEnv.VITE_FIREBASE_MEASUREMENT_ID ||
    firebaseConfigJson.measurementId,
};

// Single canonical Firebase App instance across the entire application
export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export let firebaseAnalytics: Analytics | null = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isSupported()
    .then((supported) => {
      if (supported) {
        firebaseAnalytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Skip analytics gracefully in headless or restricted browsers
    });
}

// 1. Export shared Firebase Auth instance
export const auth = getAuth(app);

// 2. Export GoogleAuthProvider pre-configured with Google Drive backup scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.appdata');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

// Strictly in-memory OAuth access token cache (never stored in localStorage/sessionStorage)
let signingInFlag = false;
let inMemoryAccessToken: string | null = null;

export function setIsSigningIn(active: boolean): void {
  signingInFlag = active;
}

export function getIsSigningIn(): boolean {
  return signingInFlag;
}

export function setCachedAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getCachedAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function clearCachedAccessToken(): void {
  inMemoryAccessToken = null;
}
