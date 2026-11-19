import { IntermediaryProfile, IntermediaryRole } from './types';

export type MemberTier = 'PRO_ADVISOR' | 'FAMILY_OFFICE_DESK';
export type MemberAuthProvider = 'MEMBER_CREDENTIALS' | 'GOOGLE_SSO';

export interface MemberAccountProfile {
  id: string;
  email: string;
  fullNameEn: string;
  fullNameZh: string;
  iaLicenseNo: string;
  firmName: string;
  role: IntermediaryRole;
  tier: MemberTier;
  authProvider: MemberAuthProvider;
  createdAtIso: string;
  lastLoginAtIso: string;
}

export interface StoredMemberRecord extends MemberAccountProfile {
  passwordDigest: string;
}

export interface MemberRegistrationInput {
  email: string;
  password: string;
  fullNameEn: string;
  fullNameZh?: string;
  iaLicenseNo: string;
  firmName: string;
  role: IntermediaryRole;
}

export interface MemberLoginInput {
  email: string;
  password: string;
}

export interface MemberProfileUpdateInput {
  fullNameEn: string;
  fullNameZh: string;
  iaLicenseNo: string;
  firmName: string;
  role: IntermediaryRole;
}

export interface MemberValidationErrors {
  email?: string;
  password?: string;
  fullNameEn?: string;
  iaLicenseNo?: string;
  firmName?: string;
  form?: string;
}

export const MEMBER_REGISTRY_STORAGE_KEY = 'hk_insurehub_members_registry_v1';
export const ACTIVE_MEMBER_SESSION_STORAGE_KEY = 'hk_insurehub_active_member_session_v1';
export const ACTIVE_MEMBER_TOKEN_STORAGE_KEY = 'hk_insurehub_active_member_token_v1';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HKIA_LICENSE_PATTERN = /^[A-Z]{2}\d{4,6}$/;

export function normalizeMemberEmail(raw: string): string {
  return (raw || '').trim().toLowerCase();
}

export function normalizeHkiaLicenseNo(raw: string): string {
  return (raw || '').trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Deterministic multi-lane salted digest for client-side static hosting fallback & unit tests.
 * Server-side Express API additionally hashes credentials with node:crypto scryptSync.
 */
export function computeDeterministicPasswordDigest(email: string, password: string): string {
  const normalizedEmail = normalizeMemberEmail(email);
  const payload = `hk-insurehub-v1::${normalizedEmail}::${password}`;
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];

  for (let round = 0; round < 64; round++) {
    for (let i = 0; i < payload.length; i++) {
      const code = payload.charCodeAt(i) ^ ((round * 31 + i * 17) & 0xff);
      seeds[0] = Math.imul(seeds[0] ^ code, 0x01000193) >>> 0;
      seeds[1] = Math.imul(seeds[1] ^ ((code + seeds[0]) & 0xffff), 0x85ebca77) >>> 0;
      seeds[2] = Math.imul(seeds[2] ^ ((code ^ (seeds[1] >>> 13)) & 0xffff), 0xc2b2ae3d) >>> 0;
      seeds[3] = Math.imul(seeds[3] ^ ((code + (seeds[2] >>> 15)) & 0xffff), 0x27d4eb2f) >>> 0;
    }
  }

  return seeds.map((s) => (s >>> 0).toString(16).padStart(8, '0')).join('');
}

export function stripStoredSecrets(record: StoredMemberRecord): MemberAccountProfile {
  const { passwordDigest: _ignored, ...publicProfile } = record;
  return publicProfile;
}

export const DEMO_MEMBER_DEFAULT_PASSWORD = 'Hkia2026!';

export const SEED_DEMO_MEMBER_RECORDS: StoredMemberRecord[] = [
  {
    id: 'member-raymond-kwok',
    email: 'raymond.kwok@hkinsurehub.hk',
    fullNameEn: 'Raymond Kwok',
    fullNameZh: '郭志明',
    iaLicenseNo: 'FB1928',
    firmName: 'Harbour Wealth Insurance Brokers Ltd.',
    role: IntermediaryRole.BROKER_TR,
    tier: 'FAMILY_OFFICE_DESK',
    authProvider: 'MEMBER_CREDENTIALS',
    createdAtIso: '2026-01-15T09:00:00.000Z',
    lastLoginAtIso: '2026-11-14T08:30:00.000Z',
    passwordDigest: computeDeterministicPasswordDigest(
      'raymond.kwok@hkinsurehub.hk',
      DEMO_MEMBER_DEFAULT_PASSWORD
    ),
  },
  {
    id: 'member-grace-cheng',
    email: 'grace.cheng@hkinsurehub.hk',
    fullNameEn: 'Grace Cheng',
    fullNameZh: '鄭雅詩',
    iaLicenseNo: 'FA8402',
    firmName: 'AIA International Limited (HK)',
    role: IntermediaryRole.TIED_AGENT,
    tier: 'PRO_ADVISOR',
    authProvider: 'MEMBER_CREDENTIALS',
    createdAtIso: '2026-02-10T09:00:00.000Z',
    lastLoginAtIso: '2026-11-12T10:15:00.000Z',
    passwordDigest: computeDeterministicPasswordDigest(
      'grace.cheng@hkinsurehub.hk',
      DEMO_MEMBER_DEFAULT_PASSWORD
    ),
  },
];

export function validateMemberRegistrationInput(
  input: MemberRegistrationInput
): { valid: boolean; errors: MemberValidationErrors } {
  const errors: MemberValidationErrors = {};
  const email = normalizeMemberEmail(input.email);
  const fullNameEn = (input.fullNameEn || '').trim();
  const license = normalizeHkiaLicenseNo(input.iaLicenseNo);
  const firmName = (input.firmName || '').trim();
  const password = input.password || '';

  if (!email) {
    errors.email = 'Please enter your advisor email address. / 請輸入顧問電郵地址。';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Please enter a valid email format (e.g. name@firm.hk). / 電郵格式不正確。';
  }

  if (!password) {
    errors.password = 'Please create a password (at least 8 characters). / 請設定登入密碼（最少 8 個字元）。';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters long. / 密碼長度須至少 8 個字元。';
  }

  if (fullNameEn.length < 2) {
    errors.fullNameEn = 'Please enter your licensed English full name. / 請輸入持牌英文全名。';
  }

  if (!license) {
    errors.iaLicenseNo = 'Please enter your HKIA license number (e.g. FB1928). / 請輸入保監局牌照號碼（如 FB1928）。';
  } else if (!HKIA_LICENSE_PATTERN.test(license)) {
    errors.iaLicenseNo =
      'HKIA license must be 2 letters followed by 4–6 digits (e.g. FB1928 or FA8402). / 牌照格式須為 2 個英文字母加 4–6 位數字（如 FB1928）。';
  }

  if (firmName.length < 2) {
    errors.firmName = 'Please enter your brokerage or principal insurer name. / 請輸入所屬經紀行或主事保險公司名稱。';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateMemberLoginInput(
  input: MemberLoginInput
): { valid: boolean; errors: MemberValidationErrors } {
  const errors: MemberValidationErrors = {};
  const email = normalizeMemberEmail(input.email);
  const password = input.password || '';

  if (!email) {
    errors.email = 'Please enter your registered email. / 請輸入註冊電郵。';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Please enter a valid email address. / 請輸入有效電郵地址。';
  }

  if (!password) {
    errors.password = 'Please enter your password. / 請輸入登入密碼。';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateMemberProfileUpdateInput(
  input: MemberProfileUpdateInput
): { valid: boolean; errors: MemberValidationErrors } {
  const errors: MemberValidationErrors = {};
  const fullNameEn = (input.fullNameEn || '').trim();
  const license = normalizeHkiaLicenseNo(input.iaLicenseNo);
  const firmName = (input.firmName || '').trim();

  if (fullNameEn.length < 2) {
    errors.fullNameEn = 'English full name must be at least 2 characters. / 英文姓名最少 2 個字元。';
  }
  if (!HKIA_LICENSE_PATTERN.test(license)) {
    errors.iaLicenseNo =
      'HKIA license must be 2 letters + 4–6 digits (e.g. FB1928). / 牌照格式須為 2 字母加 4–6 位數字。';
  }
  if (firmName.length < 2) {
    errors.firmName = 'Firm name is required. / 請填寫所屬機構名稱。';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function mergeWithSeedMembers(existing: StoredMemberRecord[]): StoredMemberRecord[] {
  const byEmail = new Map<string, StoredMemberRecord>();
  for (const seed of SEED_DEMO_MEMBER_RECORDS) {
    byEmail.set(normalizeMemberEmail(seed.email), seed);
  }
  for (const item of existing) {
    if (item && typeof item.email === 'string') {
      byEmail.set(normalizeMemberEmail(item.email), item);
    }
  }
  return Array.from(byEmail.values());
}

export function registerMemberInRegistry(
  registry: StoredMemberRecord[],
  input: MemberRegistrationInput,
  nowIso: string = new Date().toISOString()
):
  | { ok: true; member: MemberAccountProfile; updatedRegistry: StoredMemberRecord[] }
  | { ok: false; errorCode: 'VALIDATION_FAILED' | 'EMAIL_EXISTS'; errors: MemberValidationErrors } {
  const validation = validateMemberRegistrationInput(input);
  if (!validation.valid) {
    return {
      ok: false,
      errorCode: 'VALIDATION_FAILED',
      errors: validation.errors,
    };
  }

  const merged = mergeWithSeedMembers(registry);
  const normalizedEmail = normalizeMemberEmail(input.email);
  const duplicate = merged.find((m) => normalizeMemberEmail(m.email) === normalizedEmail);
  if (duplicate) {
    return {
      ok: false,
      errorCode: 'EMAIL_EXISTS',
      errors: {
        email: 'This email is already registered. Please sign in instead. / 此電郵已註冊，請直接登入。',
      },
    };
  }

  const cleanNameEn = input.fullNameEn.trim();
  const cleanNameZh = (input.fullNameZh || '').trim() || cleanNameEn;
  const cleanLicense = normalizeHkiaLicenseNo(input.iaLicenseNo);
  const cleanFirm = input.firmName.trim();
  const role =
    input.role === IntermediaryRole.TIED_AGENT
      ? IntermediaryRole.TIED_AGENT
      : IntermediaryRole.BROKER_TR;

  const newRecord: StoredMemberRecord = {
    id: `member-${Date.now().toString(36)}-${cleanLicense.toLowerCase()}`,
    email: normalizedEmail,
    fullNameEn: cleanNameEn,
    fullNameZh: cleanNameZh,
    iaLicenseNo: cleanLicense,
    firmName: cleanFirm,
    role,
    tier: role === IntermediaryRole.BROKER_TR ? 'FAMILY_OFFICE_DESK' : 'PRO_ADVISOR',
    authProvider: 'MEMBER_CREDENTIALS',
    createdAtIso: nowIso,
    lastLoginAtIso: nowIso,
    passwordDigest: computeDeterministicPasswordDigest(normalizedEmail, input.password),
  };

  const updatedRegistry = [newRecord, ...merged];
  return {
    ok: true,
    member: stripStoredSecrets(newRecord),
    updatedRegistry,
  };
}

export function authenticateMemberInRegistry(
  registry: StoredMemberRecord[],
  input: MemberLoginInput,
  nowIso: string = new Date().toISOString()
):
  | { ok: true; member: MemberAccountProfile; updatedRegistry: StoredMemberRecord[] }
  | { ok: false; errorCode: 'VALIDATION_FAILED' | 'INVALID_CREDENTIALS'; errors: MemberValidationErrors } {
  const validation = validateMemberLoginInput(input);
  if (!validation.valid) {
    return {
      ok: false,
      errorCode: 'VALIDATION_FAILED',
      errors: validation.errors,
    };
  }

  const merged = mergeWithSeedMembers(registry);
  const normalizedEmail = normalizeMemberEmail(input.email);
  const found = merged.find((m) => normalizeMemberEmail(m.email) === normalizedEmail);
  const candidateDigest = computeDeterministicPasswordDigest(normalizedEmail, input.password);

  if (!found || found.passwordDigest !== candidateDigest) {
    return {
      ok: false,
      errorCode: 'INVALID_CREDENTIALS',
      errors: {
        form: 'Incorrect email or password. Try again or use a Demo Advisor account. / 電郵或密碼不正確，請重試。',
      },
    };
  }

  const updatedRecord: StoredMemberRecord = {
    ...found,
    lastLoginAtIso: nowIso,
  };
  const updatedRegistry = merged.map((m) =>
    normalizeMemberEmail(m.email) === normalizedEmail ? updatedRecord : m
  );

  return {
    ok: true,
    member: stripStoredSecrets(updatedRecord),
    updatedRegistry,
  };
}

export function updateMemberProfileInRegistry(
  registry: StoredMemberRecord[],
  memberId: string,
  patch: MemberProfileUpdateInput
):
  | { ok: true; member: MemberAccountProfile; updatedRegistry: StoredMemberRecord[] }
  | { ok: false; errors: MemberValidationErrors } {
  const validation = validateMemberProfileUpdateInput(patch);
  if (!validation.valid) {
    return {
      ok: false,
      errors: validation.errors,
    };
  }

  const merged = mergeWithSeedMembers(registry);
  const target = merged.find((m) => m.id === memberId);
  const cleanNameEn = patch.fullNameEn.trim();
  const cleanNameZh = (patch.fullNameZh || '').trim() || cleanNameEn;
  const cleanLicense = normalizeHkiaLicenseNo(patch.iaLicenseNo);
  const cleanFirm = patch.firmName.trim();
  const role =
    patch.role === IntermediaryRole.TIED_AGENT
      ? IntermediaryRole.TIED_AGENT
      : IntermediaryRole.BROKER_TR;

  if (!target) {
    // Support updating a Google SSO session profile that isn't in the password registry
    const ssoUpdated: MemberAccountProfile = {
      id: memberId,
      email: 'sso@hkinsurehub.hk',
      fullNameEn: cleanNameEn,
      fullNameZh: cleanNameZh,
      iaLicenseNo: cleanLicense,
      firmName: cleanFirm,
      role,
      tier: role === IntermediaryRole.BROKER_TR ? 'FAMILY_OFFICE_DESK' : 'PRO_ADVISOR',
      authProvider: 'GOOGLE_SSO',
      createdAtIso: new Date().toISOString(),
      lastLoginAtIso: new Date().toISOString(),
    };
    return {
      ok: true,
      member: ssoUpdated,
      updatedRegistry: merged,
    };
  }

  const updatedRecord: StoredMemberRecord = {
    ...target,
    fullNameEn: cleanNameEn,
    fullNameZh: cleanNameZh,
    iaLicenseNo: cleanLicense,
    firmName: cleanFirm,
    role,
    tier: role === IntermediaryRole.BROKER_TR ? 'FAMILY_OFFICE_DESK' : 'PRO_ADVISOR',
  };

  const updatedRegistry = merged.map((m) => (m.id === memberId ? updatedRecord : m));
  return {
    ok: true,
    member: stripStoredSecrets(updatedRecord),
    updatedRegistry,
  };
}

export function buildGoogleSsoMemberProfile(params: {
  uid: string;
  email: string;
  displayName?: string | null;
  fallbackRole: IntermediaryRole;
  existingMember?: MemberAccountProfile | null;
  nowIso?: string;
}): MemberAccountProfile {
  const now = params.nowIso || new Date().toISOString();
  const normalizedEmail = normalizeMemberEmail(params.email);
  const displayName = (params.displayName || '').trim() || normalizedEmail.split('@')[0] || 'Advisor';

  if (
    params.existingMember &&
    normalizeMemberEmail(params.existingMember.email) === normalizedEmail
  ) {
    return {
      ...params.existingMember,
      lastLoginAtIso: now,
    };
  }

  const defaultLicense =
    params.fallbackRole === IntermediaryRole.TIED_AGENT ? 'FA8402' : 'FB1928';
  const defaultFirm =
    params.fallbackRole === IntermediaryRole.TIED_AGENT
      ? 'AIA International Limited (HK)'
      : 'Harbour Wealth Insurance Brokers Ltd.';

  return {
    id: `google-${params.uid}`,
    email: normalizedEmail,
    fullNameEn: displayName,
    fullNameZh: displayName,
    iaLicenseNo: defaultLicense,
    firmName: defaultFirm,
    role: params.fallbackRole,
    tier: params.fallbackRole === IntermediaryRole.BROKER_TR ? 'FAMILY_OFFICE_DESK' : 'PRO_ADVISOR',
    authProvider: 'GOOGLE_SSO',
    createdAtIso: now,
    lastLoginAtIso: now,
  };
}

export function toIntermediaryProfileFromMember(
  member: MemberAccountProfile | null,
  baseProfile: IntermediaryProfile
): IntermediaryProfile {
  if (!member) return baseProfile;
  return {
    ...baseProfile,
    id: member.id,
    nameEn: member.fullNameEn,
    nameZh: member.fullNameZh || member.fullNameEn,
    iaLicenseNo: member.iaLicenseNo,
    firmName: member.firmName,
    role: member.role,
    appointedInsurers: member.role === IntermediaryRole.TIED_AGENT ? ['AIA'] : ['ALL'],
  };
}

export function buildMemberInitials(
  member: Pick<MemberAccountProfile, 'fullNameEn' | 'fullNameZh'>
): string {
  const parts = (member.fullNameEn || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (member.fullNameZh || 'HK').slice(0, 2).toUpperCase();
}
