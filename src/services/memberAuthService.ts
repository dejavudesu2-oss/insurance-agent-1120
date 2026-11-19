import {
  ACTIVE_MEMBER_SESSION_STORAGE_KEY,
  ACTIVE_MEMBER_TOKEN_STORAGE_KEY,
  authenticateMemberInRegistry,
  MemberAccountProfile,
  MemberLoginInput,
  MemberProfileUpdateInput,
  MemberRegistrationInput,
  MemberValidationErrors,
  MEMBER_REGISTRY_STORAGE_KEY,
  mergeWithSeedMembers,
  registerMemberInRegistry,
  SEED_DEMO_MEMBER_RECORDS,
  StoredMemberRecord,
  updateMemberProfileInRegistry,
  validateMemberLoginInput,
  validateMemberProfileUpdateInput,
  validateMemberRegistrationInput,
} from '../domain/memberAuthEngine';

function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json');
}

function readLocalRegistry(): StoredMemberRecord[] {
  if (typeof window === 'undefined') return SEED_DEMO_MEMBER_RECORDS;
  try {
    const raw = window.localStorage.getItem(MEMBER_REGISTRY_STORAGE_KEY);
    if (!raw) return SEED_DEMO_MEMBER_RECORDS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? mergeWithSeedMembers(parsed) : SEED_DEMO_MEMBER_RECORDS;
  } catch {
    return SEED_DEMO_MEMBER_RECORDS;
  }
}

function writeLocalRegistry(records: StoredMemberRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MEMBER_REGISTRY_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore storage quota errors
  }
}

export function readPersistedMemberSession(): MemberAccountProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_MEMBER_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MemberAccountProfile;
    if (parsed && typeof parsed.email === 'string' && typeof parsed.iaLicenseNo === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function persistMemberSession(
  member: MemberAccountProfile | null,
  sessionToken?: string | null
): void {
  if (typeof window === 'undefined') return;
  try {
    if (!member) {
      window.localStorage.removeItem(ACTIVE_MEMBER_SESSION_STORAGE_KEY);
      window.localStorage.removeItem(ACTIVE_MEMBER_TOKEN_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(ACTIVE_MEMBER_SESSION_STORAGE_KEY, JSON.stringify(member));
    if (sessionToken) {
      window.localStorage.setItem(ACTIVE_MEMBER_TOKEN_STORAGE_KEY, sessionToken);
    }
  } catch {
    // ignore storage quota errors
  }
}

export function readPersistedMemberToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ACTIVE_MEMBER_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function verifyServerMemberSession(): Promise<MemberAccountProfile | null> {
  const token = readPersistedMemberToken();
  const cached = readPersistedMemberSession();
  if (!token) return cached;

  try {
    const res = await fetch('/api/members/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok && isJsonResponse(res)) {
      const data = await res.json();
      if (data?.ok && data?.member) {
        persistMemberSession(data.member, token);
        return data.member as MemberAccountProfile;
      }
    }
    if (res.status === 401 && isJsonResponse(res)) {
      persistMemberSession(null);
      return null;
    }
  } catch {
    // Static Firebase Hosting or offline PWA mode: retain verified local session
  }
  return cached;
}

export async function registerAdvisorMember(
  input: MemberRegistrationInput
): Promise<
  | { ok: true; member: MemberAccountProfile }
  | { ok: false; errors: MemberValidationErrors }
> {
  const validation = validateMemberRegistrationInput(input);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  // Always keep local registry synchronized for offline/static resilience
  const localReg = readLocalRegistry();

  try {
    const res = await fetch('/api/members/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (isJsonResponse(res)) {
      const data = await res.json();
      if (res.ok && data?.ok && data?.member) {
        const localSync = registerMemberInRegistry(localReg, input);
        if (localSync.ok) writeLocalRegistry(localSync.updatedRegistry);
        persistMemberSession(data.member, data.token || null);
        return { ok: true, member: data.member as MemberAccountProfile };
      }
      return {
        ok: false,
        errors: data?.errors || {
          form: data?.error || 'Registration failed. / 註冊失敗，請檢查輸入資料。',
        },
      };
    }
  } catch {
    // Static Firebase Hosting or offline fallback below
  }

  const localResult = registerMemberInRegistry(localReg, input);
  if (!localResult.ok) {
    return { ok: false, errors: localResult.errors };
  }
  writeLocalRegistry(localResult.updatedRegistry);
  persistMemberSession(localResult.member, `local-${localResult.member.id}`);
  return { ok: true, member: localResult.member };
}

export async function loginAdvisorMember(
  input: MemberLoginInput
): Promise<
  | { ok: true; member: MemberAccountProfile }
  | { ok: false; errors: MemberValidationErrors }
> {
  const validation = validateMemberLoginInput(input);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  const localReg = readLocalRegistry();

  try {
    const res = await fetch('/api/members/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (isJsonResponse(res)) {
      const data = await res.json();
      if (res.ok && data?.ok && data?.member) {
        persistMemberSession(data.member, data.token || null);
        return { ok: true, member: data.member as MemberAccountProfile };
      }
      // If account was registered while offline in localStorage, verify locally before failing
      const offlineCheck = authenticateMemberInRegistry(localReg, input);
      if (offlineCheck.ok) {
        writeLocalRegistry(offlineCheck.updatedRegistry);
        persistMemberSession(offlineCheck.member, `local-${offlineCheck.member.id}`);
        return { ok: true, member: offlineCheck.member };
      }
      return {
        ok: false,
        errors: data?.errors || {
          form: data?.error || 'Invalid email or password. / 電郵或密碼不正確。',
        },
      };
    }
  } catch {
    // Static Firebase Hosting or offline fallback below
  }

  const localAuth = authenticateMemberInRegistry(localReg, input);
  if (!localAuth.ok) {
    return { ok: false, errors: localAuth.errors };
  }
  writeLocalRegistry(localAuth.updatedRegistry);
  persistMemberSession(localAuth.member, `local-${localAuth.member.id}`);
  return { ok: true, member: localAuth.member };
}

export async function updateAdvisorMemberProfile(
  member: MemberAccountProfile,
  patch: MemberProfileUpdateInput
): Promise<
  | { ok: true; member: MemberAccountProfile }
  | { ok: false; errors: MemberValidationErrors }
> {
  const validation = validateMemberProfileUpdateInput(patch);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  const token = readPersistedMemberToken();
  const localReg = readLocalRegistry();

  try {
    const res = await fetch('/api/members/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ memberId: member.id, ...patch }),
    });
    if (isJsonResponse(res)) {
      const data = await res.json();
      if (res.ok && data?.ok && data?.member) {
        const localUpdated = updateMemberProfileInRegistry(localReg, member.id, patch);
        if (localUpdated.ok) writeLocalRegistry(localUpdated.updatedRegistry);
        persistMemberSession(data.member, token);
        return { ok: true, member: data.member as MemberAccountProfile };
      }
    }
  } catch {
    // Fallback to local update below
  }

  const localUpdated = updateMemberProfileInRegistry(localReg, member.id, patch);
  if (!localUpdated.ok) {
    return { ok: false, errors: localUpdated.errors };
  }
  const mergedMember: MemberAccountProfile = {
    ...localUpdated.member,
    email: member.email,
    authProvider: member.authProvider,
  };
  writeLocalRegistry(localUpdated.updatedRegistry);
  persistMemberSession(mergedMember, token);
  return { ok: true, member: mergedMember };
}

export async function logoutAdvisorMember(): Promise<void> {
  const token = readPersistedMemberToken();
  persistMemberSession(null);
  if (!token) return;
  try {
    await fetch('/api/members/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    // Ignore network errors on logout
  }
}
