import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  app,
  auth,
  firebaseAnalytics,
  firebaseConfig,
  googleProvider,
  SCOPES,
  clearCachedAccessToken,
  getCachedAccessToken,
  getIsSigningIn,
  setCachedAccessToken,
  setIsSigningIn,
} from '../firebase';

export { app as firebaseApp, firebaseAnalytics, firebaseConfig, SCOPES };

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    const cachedToken = getCachedAccessToken();
    if (user) {
      if (cachedToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedToken);
      } else if (!getIsSigningIn()) {
        clearCachedAccessToken();
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      clearCachedAccessToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    setIsSigningIn(true);
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Google Drive access token from sign-in.');
    }
    setCachedAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  } finally {
    setIsSigningIn(false);
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return getCachedAccessToken();
};

export const logoutGoogle = async (): Promise<void> => {
  await auth.signOut();
  clearCachedAccessToken();
};
