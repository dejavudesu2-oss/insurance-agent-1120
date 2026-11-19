import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, type User } from 'firebase/auth';
import { CloudCheck, CloudUpload, Loader2 } from 'lucide-react';
import {
  auth,
  googleProvider,
  getCachedAccessToken,
  setCachedAccessToken,
  setIsSigningIn,
} from '../firebase';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';

export interface LoginButtonProps {
  connectedUser?: User | null;
  isBusy?: boolean;
  labelOverride?: string;
  mode?: 'backup' | 'signin';
  variant?: 'google-material' | 'cinema-gold';
  onAuthAndBackup?: (params: {
    user: User;
    accessToken: string;
  }) => Promise<void> | void;
  onSignedInOnly?: (params: {
    user: User;
    accessToken: string;
  }) => Promise<void> | void;
  onError?: (message: string) => void;
}

export function LoginButton({
  connectedUser = null,
  isBusy = false,
  labelOverride,
  mode = 'backup',
  variant = 'google-material',
  onAuthAndBackup,
  onSignedInOnly,
  onError,
}: LoginButtonProps) {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);
  const [localLoading, setLocalLoading] = useState(false);

  const busy = isBusy || localLoading;

  const handleLogin = async () => {
    if (busy) return;
    setLocalLoading(true);
    try {
      const existingToken = getCachedAccessToken();
      if (mode === 'backup' && connectedUser && existingToken && onAuthAndBackup) {
        await onAuthAndBackup({ user: connectedUser, accessToken: existingToken });
        return;
      }

      setIsSigningIn(true);
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken || '';

      if (accessToken) {
        setCachedAccessToken(accessToken);
      }

      if (mode === 'signin') {
        if (onSignedInOnly) {
          await onSignedInOnly({ user: result.user, accessToken });
        } else if (accessToken && onAuthAndBackup) {
          await onAuthAndBackup({ user: result.user, accessToken });
        }
        return;
      }

      if (!accessToken) {
        throw new Error(
          t(
            'Unable to obtain Google Drive backup permission token.',
            conv('未能取得 Google Drive 授權，請重試。')
          )
        );
      }

      if (onAuthAndBackup) {
        await onAuthAndBackup({ user: result.user, accessToken });
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : t('Google Sign-In failed or was cancelled.', conv('Google 登入未完成或已取消。'));
      console.error('Google Sign-In error:', error);
      onError?.(msg);
    } finally {
      setIsSigningIn(false);
      setLocalLoading(false);
    }
  };

  const defaultLabel =
    mode === 'signin'
      ? t('Continue with Google', conv('使用 Google 帳號登入'))
      : connectedUser && getCachedAccessToken()
      ? t('Back Up to Google Drive', conv('立即備份至 Google Drive'))
      : t('Connect Google Drive Backup', conv('連接 Google Drive 雲端備份'));

  const buttonText = labelOverride || defaultLabel;

  if (variant === 'cinema-gold') {
    return (
      <button
        type="button"
        data-testid="google-cloud-backup-btn"
        onClick={handleLogin}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full border border-[#D8B377]/55 bg-black/45 px-5 py-2.5 text-xs font-semibold text-[#FAF6F0] hover:border-[#D8B377] hover:bg-black/65 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#D8B377]" aria-hidden="true" />
        ) : (
          <CloudCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        )}
        <span>
          {busy
            ? mode === 'signin'
              ? t('Signing in...', conv('登入中...'))
              : t('Backing up...', conv('備份中...'))
            : buttonText}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-testid="google-login-backup-btn"
      onClick={handleLogin}
      disabled={busy}
      className="gsi-material-button shrink-0"
    >
      <div className="gsi-material-button-state" />
      <div className="gsi-material-button-content-wrapper">
        <div className="gsi-material-button-icon">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-600" aria-hidden="true" />
          ) : mode === 'backup' && connectedUser && getCachedAccessToken() ? (
            <CloudUpload className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          ) : (
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="block h-full w-full"
              aria-hidden="true"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
          )}
        </div>
        <span className="gsi-material-button-contents whitespace-nowrap">
          {busy
            ? mode === 'signin'
              ? t('Signing in...', conv('登入中...'))
              : t('Backing up...', conv('雲端備份中...'))
            : buttonText}
        </span>
      </div>
    </button>
  );
}
