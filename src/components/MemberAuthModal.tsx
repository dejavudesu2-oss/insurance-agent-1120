import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import {
  buildMemberInitials,
  DEMO_MEMBER_DEFAULT_PASSWORD,
  MemberAccountProfile,
  MemberValidationErrors,
  SEED_DEMO_MEMBER_RECORDS,
} from '../domain/memberAuthEngine';
import { IntermediaryRole } from '../domain/types';
import {
  loginAdvisorMember,
  registerAdvisorMember,
  updateAdvisorMemberProfile,
} from '../services/memberAuthService';
import { LoginButton } from './LoginButton';

export type MemberModalInitialTab = 'SIGN_IN' | 'REGISTER' | 'PROFILE';

export interface MemberAuthModalProps {
  open: boolean;
  initialTab?: MemberModalInitialTab;
  activeMember: MemberAccountProfile | null;
  googleUser?: User | null;
  cloudBackupBusy?: boolean;
  onClose: () => void;
  onAuthenticated: (member: MemberAccountProfile, isNewRegistration: boolean) => void;
  onProfileUpdated: (member: MemberAccountProfile) => void;
  onLogout: () => Promise<void> | void;
  onGoogleAuthAndBackup?: (params: {
    user: User;
    accessToken: string;
  }) => Promise<void> | void;
  onGoogleAuthError?: (message: string) => void;
}

export const MemberAuthModal: React.FC<MemberAuthModalProps> = ({
  open,
  initialTab = 'SIGN_IN',
  activeMember,
  googleUser = null,
  cloudBackupBusy = false,
  onClose,
  onAuthenticated,
  onProfileUpdated,
  onLogout,
  onGoogleAuthAndBackup,
  onGoogleAuthError,
}) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const [tab, setTab] = useState<'SIGN_IN' | 'REGISTER'>(
    initialTab === 'REGISTER' ? 'REGISTER' : 'SIGN_IN'
  );
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<MemberValidationErrors>({});
  const [profileSavedBanner, setProfileSavedBanner] = useState(false);

  // Sign-In state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register state
  const [regNameEn, setRegNameEn] = useState('');
  const [regNameZh, setRegNameZh] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLicenseNo, setRegLicenseNo] = useState('');
  const [regFirmName, setRegFirmName] = useState('');
  const [regRole, setRegRole] = useState<IntermediaryRole>(IntermediaryRole.BROKER_TR);

  // Profile Edit state (when signed in)
  const [editNameEn, setEditNameEn] = useState('');
  const [editNameZh, setEditNameZh] = useState('');
  const [editLicenseNo, setEditLicenseNo] = useState('');
  const [editFirmName, setEditFirmName] = useState('');
  const [editRole, setEditRole] = useState<IntermediaryRole>(IntermediaryRole.BROKER_TR);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setProfileSavedBanner(false);
    if (initialTab === 'REGISTER') {
      setTab('REGISTER');
    } else if (initialTab === 'SIGN_IN') {
      setTab('SIGN_IN');
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (activeMember) {
      setEditNameEn(activeMember.fullNameEn);
      setEditNameZh(activeMember.fullNameZh);
      setEditLicenseNo(activeMember.iaLicenseNo);
      setEditFirmName(activeMember.firmName);
      setEditRole(activeMember.role);
    }
  }, [activeMember]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const pickLocalizedError = (raw?: string): string | null => {
    if (!raw) return null;
    const parts = raw.split(' / ');
    if (parts.length === 2) {
      return lang === 'en' ? parts[0] : conv(parts[1]);
    }
    return lang === 'en' ? raw : conv(raw);
  };

  const handleQuickFillDemo = (demoIndex: number) => {
    const demo = SEED_DEMO_MEMBER_RECORDS[demoIndex] || SEED_DEMO_MEMBER_RECORDS[0];
    setLoginEmail(demo.email);
    setLoginPassword(DEMO_MEMBER_DEFAULT_PASSWORD);
    setErrors({});
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const result = await loginAdvisorMember({
        email: loginEmail,
        password: loginPassword,
      });
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      onAuthenticated(result.member, false);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const result = await registerAdvisorMember({
        email: regEmail,
        password: regPassword,
        fullNameEn: regNameEn,
        fullNameZh: regNameZh,
        iaLicenseNo: regLicenseNo,
        firmName: regFirmName,
        role: regRole,
      });
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      onAuthenticated(result.member, true);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember) return;
    setBusy(true);
    setErrors({});
    setProfileSavedBanner(false);
    try {
      const result = await updateAdvisorMemberProfile(activeMember, {
        fullNameEn: editNameEn,
        fullNameZh: editNameZh,
        iaLicenseNo: editLicenseNo,
        firmName: editFirmName,
        role: editRole,
      });
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      onProfileUpdated(result.member);
      setProfileSavedBanner(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-auth-modal-title"
      data-testid="member-auth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0A09]/80 p-4 sm:p-6 backdrop-blur-xs"
    >
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-300 bg-[#FAF6F0] p-6 sm:p-8 text-[#1C1815] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <div className="text-xs font-semibold tracking-wider text-[#8C5E24]">
              {activeMember
                ? t('Advisor Account', conv('顧問帳戶設定'))
                : t('HK InsureHub Pro · Member Sign In', conv('HK InsureHub Pro · 會員登入'))}
            </div>
            <h2
              id="member-auth-modal-title"
              className="mt-1 font-editorial text-2xl sm:text-3xl font-semibold text-[#1C1815]"
            >
              {activeMember
                ? t('Account Profile & Cloud Backup', conv('個人資料與雲端備份'))
                : tab === 'SIGN_IN'
                ? t('Sign in to your account', conv('登入顧問帳戶'))
                : t('Create Advisor Account', conv('註冊新顧問帳戶'))}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('Close member dialog', conv('關閉會員視窗'))}
            data-testid="member-auth-close-btn"
            className="rounded-lg border border-stone-300 bg-white p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* ===================================================================
            AUTHENTICATED VIEW: MEMBER PROFILE & LOGOUT
            =================================================================== */}
        {activeMember ? (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-stone-300 bg-white p-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#12100E] font-mono text-sm font-semibold text-[#D8B377]">
                  {buildMemberInitials(activeMember)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-[#1C1815]">
                    {activeMember.fullNameEn}
                    {activeMember.fullNameZh &&
                    activeMember.fullNameZh !== activeMember.fullNameEn
                      ? ` · ${conv(activeMember.fullNameZh)}`
                      : ''}
                  </div>
                  <div className="truncate text-xs text-stone-600">{activeMember.email}</div>
                  <div className="mt-0.5 font-mono text-xs font-semibold text-[#8C5E24] tabular-nums">
                    HKIA Lic: {activeMember.iaLicenseNo} ·{' '}
                    {activeMember.authProvider === 'GOOGLE_SSO' ? 'Google SSO' : 'Member Pass'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                data-testid="member-logout-btn"
                onClick={async () => {
                  await onLogout();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors whitespace-nowrap shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Sign Out', conv('登出帳戶'))}</span>
              </button>
            </div>

            {profileSavedBanner && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-900"
              >
                <Check className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <span>
                  {t(
                    'Advisor credentials updated across proposals, PDFs, and STP e-Sign.',
                    conv('已更新顧問姓名、保監牌照與主事機構，並同步套用至建議書、PDF 及電子簽單。')
                  )}
                </span>
              </div>
            )}

            <form onSubmit={handleSaveProfileSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="member-edit-name-en"
                    className="block text-xs font-semibold text-stone-700"
                  >
                    {t('Licensed English Name *', conv('持牌英文全名 *'))}
                  </label>
                  <input
                    id="member-edit-name-en"
                    type="text"
                    value={editNameEn}
                    onChange={(e) => setEditNameEn(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#8C5E24] focus:outline-none"
                  />
                  {errors.fullNameEn && (
                    <p className="mt-1 text-xs font-medium text-rose-700">
                      {pickLocalizedError(errors.fullNameEn)}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="member-edit-name-zh"
                    className="block text-xs font-semibold text-stone-700"
                  >
                    {t('Chinese Name', conv('中文姓名'))}
                  </label>
                  <input
                    id="member-edit-name-zh"
                    type="text"
                    value={editNameZh}
                    onChange={(e) => setEditNameZh(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#8C5E24] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="member-edit-license"
                    className="block text-xs font-semibold text-stone-700"
                  >
                    {t('HKIA License No. *', conv('保監局牌照號碼 *'))}
                  </label>
                  <input
                    id="member-edit-license"
                    type="text"
                    value={editLicenseNo}
                    onChange={(e) => setEditLicenseNo(e.target.value.toUpperCase())}
                    placeholder="FB1928"
                    className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 font-mono text-sm text-stone-900 uppercase tabular-nums focus:border-[#8C5E24] focus:outline-none"
                  />
                  {errors.iaLicenseNo && (
                    <p className="mt-1 text-xs font-medium text-rose-700">
                      {pickLocalizedError(errors.iaLicenseNo)}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="member-edit-role"
                    className="block text-xs font-semibold text-stone-700"
                  >
                    {t('License Capacity (RBAC)', conv('持牌身份權限 (RBAC)'))}
                  </label>
                  <select
                    id="member-edit-role"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as IntermediaryRole)}
                    className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-[#8C5E24] focus:outline-none"
                  >
                    <option value={IntermediaryRole.BROKER_TR}>
                      {t('Broker TR (Whole Market)', conv('持牌保險經紀代表（全市場）'))}
                    </option>
                    <option value={IntermediaryRole.TIED_AGENT}>
                      {t('Tied Agent (AIA Principal)', conv('專屬保險代理人（AIA 委任）'))}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="member-edit-firm"
                  className="block text-xs font-semibold text-stone-700"
                >
                  {t('Brokerage / Principal Insurer *', conv('所屬經紀行／主事保險公司 *'))}
                </label>
                <input
                  id="member-edit-firm"
                  type="text"
                  value={editFirmName}
                  onChange={(e) => setEditFirmName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#8C5E24] focus:outline-none"
                />
                {errors.firmName && (
                  <p className="mt-1 text-xs font-medium text-rose-700">
                    {pickLocalizedError(errors.firmName)}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200">
                <LoginButton
                  connectedUser={googleUser}
                  isBusy={cloudBackupBusy}
                  onAuthAndBackup={onGoogleAuthAndBackup}
                  onError={onGoogleAuthError}
                />

                <button
                  type="submit"
                  disabled={busy}
                  data-testid="member-save-profile-btn"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#12100E] px-5 py-2.5 text-xs font-semibold text-[#FAF6F0] hover:bg-stone-800 transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  <UserCheck className="h-4 w-4 text-[#D8B377]" aria-hidden="true" />
                  <span>
                    {busy
                      ? t('Saving...', conv('儲存中...'))
                      : t('Save Advisor Profile', conv('儲存顧問資料'))}
                  </span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ===================================================================
             UNAUTHENTICATED VIEW: SIGN IN OR REGISTER
             =================================================================== */
          <div className="mt-5 space-y-5">
            {/* Segmented Mode Control */}
            <div
              role="tablist"
              aria-label="Member authentication mode"
              className="grid grid-cols-2 rounded-xl border border-stone-300 bg-stone-200/70 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'SIGN_IN'}
                data-testid="member-tab-signin"
                onClick={() => {
                  setTab('SIGN_IN');
                  setErrors({});
                }}
                className={`inline-flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === 'SIGN_IN'
                    ? 'bg-white text-[#1C1815] shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Member Sign In', conv('會員密碼登入'))}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={tab === 'REGISTER'}
                data-testid="member-tab-register"
                onClick={() => {
                  setTab('REGISTER');
                  setErrors({});
                }}
                className={`inline-flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === 'REGISTER'
                    ? 'bg-white text-[#1C1815] shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('Register Advisor', conv('註冊新顧問帳戶'))}</span>
              </button>
            </div>

            {errors.form && (
              <div
                role="alert"
                data-testid="member-auth-form-error"
                className="rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800"
              >
                {pickLocalizedError(errors.form)}
              </div>
            )}

            {tab === 'SIGN_IN' ? (
              <form onSubmit={handleSignInSubmit} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="member-login-email"
                    className="block text-xs font-semibold text-stone-700"
                  >
                    {t('Advisor Email Address', conv('顧問註冊電郵'))}
                  </label>
                  <input
                    id="member-login-email"
                    type="email"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="raymond.kwok@hkinsurehub.hk"
                    className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#8C5E24] focus:outline-none"
                  />
                  {errors.email && (
                    <p
                      data-testid="member-email-error"
                      className="mt-1 text-xs font-medium text-rose-700"
                    >
                      {pickLocalizedError(errors.email)}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="member-login-password"
                    className="block text-xs font-semibold text-stone-700"
                  >
                    {t('Password', conv('登入密碼'))}
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="member-login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#8C5E24] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label={
                        showPassword
                          ? t('Hide password', conv('隱藏密碼'))
                          : t('Show password', conv('顯示密碼'))
                      }
                      className="absolute inset-y-0 right-2.5 flex items-center text-stone-500 hover:text-stone-800"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p
                      data-testid="member-password-error"
                      className="mt-1 text-xs font-medium text-rose-700"
                    >
                      {pickLocalizedError(errors.password)}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  data-testid="member-signin-submit-btn"
                  className="w-full rounded-lg bg-[#12100E] py-3 text-sm font-semibold text-[#FAF6F0] hover:bg-stone-800 transition-colors disabled:opacity-60"
                >
                  {busy
                    ? t('Signing in...', conv('登入中...'))
                    : t('Sign In', conv('登入工作台'))}
                </button>

                {/* Quick Demo Fill Bar for Instant Evaluation */}
                <div className="rounded-xl border border-stone-200 bg-white p-3.5">
                  <div className="text-[11px] font-semibold text-stone-600">
                    {t(
                      'Demo Accounts (1-Click Fill):',
                      conv('試用示範帳戶（一鍵填入）：')
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      data-testid="member-demo-fill-broker"
                      onClick={() => handleQuickFillDemo(0)}
                      className="rounded-lg border border-stone-300 bg-[#FAF6F0] px-3 py-2 text-left text-xs hover:border-[#8C5E24] transition-colors"
                    >
                      <div className="font-semibold text-[#1C1815]">
                        Raymond Kwok · {conv('郭志明')}
                      </div>
                      <div className="font-mono text-[11px] text-[#8C5E24] tabular-nums">
                        {t('Broker · FB1928', conv('保險經紀 · FB1928'))}
                      </div>
                    </button>

                    <button
                      type="button"
                      data-testid="member-demo-fill-agent"
                      onClick={() => handleQuickFillDemo(1)}
                      className="rounded-lg border border-stone-300 bg-[#FAF6F0] px-3 py-2 text-left text-xs hover:border-[#8C5E24] transition-colors"
                    >
                      <div className="font-semibold text-[#1C1815]">
                        Grace Cheng · {conv('鄭雅詩')}
                      </div>
                      <div className="font-mono text-[11px] text-[#8C5E24] tabular-nums">
                        {t('AIA Agent · FA8402', conv('友邦代理 · FA8402'))}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Plain Google Sign-In Option (no Google Drive mention before login) */}
                <div className="space-y-3 pt-2 border-t border-stone-200">
                  <div className="text-center text-xs text-stone-500">
                    {t('Or continue with Google', conv('或使用 Google 帳號登入'))}
                  </div>
                  <div className="flex justify-center">
                    <LoginButton
                      mode="signin"
                      connectedUser={googleUser}
                      isBusy={cloudBackupBusy}
                      onSignedInOnly={async () => {
                        onClose();
                      }}
                      onError={onGoogleAuthError}
                    />
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} noValidate className="space-y-3.5">
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="member-reg-name-en"
                      className="block text-xs font-semibold text-stone-700"
                    >
                      {t('English Full Name *', conv('持牌英文全名 *'))}
                    </label>
                    <input
                      id="member-reg-name-en"
                      type="text"
                      value={regNameEn}
                      onChange={(e) => setRegNameEn(e.target.value)}
                      placeholder="Ivan Lam"
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#8C5E24] focus:outline-none"
                    />
                    {errors.fullNameEn && (
                      <p className="mt-1 text-xs font-medium text-rose-700">
                        {pickLocalizedError(errors.fullNameEn)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="member-reg-name-zh"
                      className="block text-xs font-semibold text-stone-700"
                    >
                      {t('Chinese Name (Optional)', conv('中文姓名（選填）'))}
                    </label>
                    <input
                      id="member-reg-name-zh"
                      type="text"
                      value={regNameZh}
                      onChange={(e) => setRegNameZh(e.target.value)}
                      placeholder={conv('林逸凡')}
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#8C5E24] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="member-reg-email"
                      className="block text-xs font-semibold text-stone-700"
                    >
                      {t('Work Email *', conv('工作電郵 *'))}
                    </label>
                    <input
                      id="member-reg-email"
                      type="email"
                      autoComplete="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="ivan.lam@wealthhk.com"
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#8C5E24] focus:outline-none"
                    />
                    {errors.email && (
                      <p
                        data-testid="member-reg-email-error"
                        className="mt-1 text-xs font-medium text-rose-700"
                      >
                        {pickLocalizedError(errors.email)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="member-reg-password"
                      className="block text-xs font-semibold text-stone-700"
                    >
                      {t('Password (min 8 chars) *', conv('設定密碼（最少 8 字元）*'))}
                    </label>
                    <input
                      id="member-reg-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#8C5E24] focus:outline-none"
                    />
                    {errors.password && (
                      <p className="mt-1 text-xs font-medium text-rose-700">
                        {pickLocalizedError(errors.password)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="member-reg-license"
                      className="block text-xs font-semibold text-stone-700"
                    >
                      {t('HKIA License No. *', conv('保監局牌照號碼 *'))}
                    </label>
                    <input
                      id="member-reg-license"
                      type="text"
                      value={regLicenseNo}
                      onChange={(e) => setRegLicenseNo(e.target.value.toUpperCase())}
                      placeholder="FB9088"
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm text-stone-900 uppercase tabular-nums placeholder:text-stone-400 focus:border-[#8C5E24] focus:outline-none"
                    />
                    {errors.iaLicenseNo && (
                      <p className="mt-1 text-xs font-medium text-rose-700">
                        {pickLocalizedError(errors.iaLicenseNo)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="member-reg-role"
                      className="block text-xs font-semibold text-stone-700"
                    >
                      {t('HKIA Capacity *', conv('牌照類別 *'))}
                    </label>
                    <select
                      id="member-reg-role"
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as IntermediaryRole)}
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-[#8C5E24] focus:outline-none"
                    >
                      <option value={IntermediaryRole.BROKER_TR}>
                        {t('Broker TR (Whole Market)', conv('持牌經紀代表（全市場）'))}
                      </option>
                      <option value={IntermediaryRole.TIED_AGENT}>
                        {t('Tied Agent (AIA Principal)', conv('專屬代理人（AIA 委任）'))}
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="member-reg-firm"
                    className="block text-xs font-semibold text-stone-700"
                  >
                    {t('Brokerage / Principal Insurer *', conv('所屬經紀行／主事保司 *'))}
                  </label>
                  <input
                    id="member-reg-firm"
                    type="text"
                    value={regFirmName}
                    onChange={(e) => setRegFirmName(e.target.value)}
                    placeholder="Harbour Private Wealth Brokers Ltd."
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#8C5E24] focus:outline-none"
                  />
                  {errors.firmName && (
                    <p className="mt-1 text-xs font-medium text-rose-700">
                      {pickLocalizedError(errors.firmName)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-stone-600 pt-1">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#8C5E24]" aria-hidden="true" />
                  <span>
                    {t(
                      'Each member receives an isolated CRM workspace and personalized PDF/QR proposal credentials.',
                      conv('每位註冊會員均享有獨立隔離的客戶 CRM 工作區及專屬建議書簽署牌照抬頭。')
                    )}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  data-testid="member-register-submit-btn"
                  className="w-full rounded-lg bg-[#C59B5F] py-3 text-sm font-semibold text-[#12100E] hover:bg-[#d8b377] transition-colors disabled:opacity-60"
                >
                  {busy
                    ? t('Creating Advisor Account...', conv('正在建立顧問帳戶...'))
                    : t('Create Member Account & Sign In', conv('立即建立顧問帳戶並登入'))}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
