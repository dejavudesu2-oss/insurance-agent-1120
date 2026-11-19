import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticateMemberInRegistry,
  buildGoogleSsoMemberProfile,
  buildMemberInitials,
  DEMO_MEMBER_DEFAULT_PASSWORD,
  registerMemberInRegistry,
  SEED_DEMO_MEMBER_RECORDS,
  toIntermediaryProfileFromMember,
  updateMemberProfileInRegistry,
  validateMemberRegistrationInput,
} from './memberAuthEngine';
import { IntermediaryRole } from './types';

test('validateMemberRegistrationInput rejects empty or malformed fields without silent fallback', () => {
  const res = validateMemberRegistrationInput({
    email: 'invalid-email',
    password: '123',
    fullNameEn: 'A',
    fullNameZh: '',
    iaLicenseNo: '1234',
    firmName: '',
    role: IntermediaryRole.BROKER_TR,
  });

  assert.equal(res.valid, false);
  assert.ok(res.errors.email);
  assert.ok(res.errors.password);
  assert.ok(res.errors.fullNameEn);
  assert.ok(res.errors.iaLicenseNo);
  assert.ok(res.errors.firmName);
});

test('registerMemberInRegistry creates a new licensed member and blocks duplicate emails', () => {
  const regResult = registerMemberInRegistry(
    SEED_DEMO_MEMBER_RECORDS,
    {
      email: 'Ivan.Lam@WealthHK.com',
      password: 'Wealth2026!',
      fullNameEn: 'Ivan Lam',
      fullNameZh: '林逸凡',
      iaLicenseNo: 'fb9088',
      firmName: 'Victoria Family Office Brokers',
      role: IntermediaryRole.BROKER_TR,
    },
    '2026-11-14T12:00:00.000Z'
  );

  assert.equal(regResult.ok, true);
  if (!regResult.ok) return;

  assert.equal(regResult.member.email, 'ivan.lam@wealthhk.com');
  assert.equal(regResult.member.iaLicenseNo, 'FB9088');
  assert.equal(regResult.member.fullNameZh, '林逸凡');
  assert.equal(regResult.member.tier, 'FAMILY_OFFICE_DESK');

  // Duplicate email check (case-insensitive)
  const dupResult = registerMemberInRegistry(regResult.updatedRegistry, {
    email: 'ivan.lam@wealthhk.com',
    password: 'AnotherPassword99!',
    fullNameEn: 'Ivan Lam',
    fullNameZh: '林逸凡',
    iaLicenseNo: 'FB9088',
    firmName: 'Victoria Family Office Brokers',
    role: IntermediaryRole.BROKER_TR,
  });

  assert.equal(dupResult.ok, false);
  if (!dupResult.ok) {
    assert.equal(dupResult.errorCode, 'EMAIL_EXISTS');
    assert.ok(dupResult.errors.email);
  }
});

test('authenticateMemberInRegistry authenticates seeded demo advisor and rejects wrong password', () => {
  const loginOk = authenticateMemberInRegistry(SEED_DEMO_MEMBER_RECORDS, {
    email: 'RAYMOND.KWOK@HKINSUREHUB.HK',
    password: DEMO_MEMBER_DEFAULT_PASSWORD,
  });

  assert.equal(loginOk.ok, true);
  if (loginOk.ok) {
    assert.equal(loginOk.member.iaLicenseNo, 'FB1928');
    assert.equal(loginOk.member.fullNameZh, '郭志明');
  }

  const loginBad = authenticateMemberInRegistry(SEED_DEMO_MEMBER_RECORDS, {
    email: 'raymond.kwok@hkinsurehub.hk',
    password: 'WrongPassword123',
  });

  assert.equal(loginBad.ok, false);
  if (!loginBad.ok) {
    assert.equal(loginBad.errorCode, 'INVALID_CREDENTIALS');
    assert.ok(loginBad.errors.form);
  }
});

test('updateMemberProfileInRegistry updates advisor credentials and maps to IntermediaryProfile', () => {
  const updated = updateMemberProfileInRegistry(
    SEED_DEMO_MEMBER_RECORDS,
    'member-raymond-kwok',
    {
      fullNameEn: 'Raymond C. Kwok',
      fullNameZh: '郭志明總監',
      iaLicenseNo: 'fa7711',
      firmName: 'AIA International Limited',
      role: IntermediaryRole.TIED_AGENT,
    }
  );

  assert.equal(updated.ok, true);
  if (!updated.ok) return;

  assert.equal(updated.member.iaLicenseNo, 'FA7711');
  assert.equal(updated.member.role, IntermediaryRole.TIED_AGENT);

  const mapped = toIntermediaryProfileFromMember(updated.member, {
    id: 'base',
    nameEn: 'Default',
    nameZh: '預設',
    iaLicenseNo: 'FB0000',
    firmName: 'Base',
    role: IntermediaryRole.BROKER_TR,
    appointedInsurers: ['ALL'],
    avatarUrl: '',
  });

  assert.equal(mapped.nameEn, 'Raymond C. Kwok');
  assert.equal(mapped.nameZh, '郭志明總監');
  assert.equal(mapped.iaLicenseNo, 'FA7711');
  assert.deepEqual(mapped.appointedInsurers, ['AIA']);
  assert.equal(buildMemberInitials(updated.member), 'RK');
});

test('buildGoogleSsoMemberProfile preserves existing customized license on repeat sign-in', () => {
  const first = buildGoogleSsoMemberProfile({
    uid: 'uid-123',
    email: 'advisor@gmail.com',
    displayName: 'Carmen Leung',
    fallbackRole: IntermediaryRole.BROKER_TR,
  });
  assert.equal(first.authProvider, 'GOOGLE_SSO');
  assert.equal(first.iaLicenseNo, 'FB1928');

  const customized = { ...first, iaLicenseNo: 'FB6612', firmName: 'Central Wealth Desk' };
  const second = buildGoogleSsoMemberProfile({
    uid: 'uid-123',
    email: 'advisor@gmail.com',
    displayName: 'Carmen Leung',
    fallbackRole: IntermediaryRole.BROKER_TR,
    existingMember: customized,
  });
  assert.equal(second.iaLicenseNo, 'FB6612');
  assert.equal(second.firmName, 'Central Wealth Desk');
});
