import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeHkidCheckDigit,
  validateAndFormatHkid,
  parseHkIdentityDocumentOcr,
} from './hkIdentityParser';

test('HKID Modulus-11 check digit computes and validates official single- and double-prefix numbers', () => {
  assert.equal(computeHkidCheckDigit('K', '654321'), '9');
  assert.equal(computeHkidCheckDigit('A', '123456'), '3');

  const validSingle = validateAndFormatHkid('k654321(9)');
  assert.deepEqual(validSingle, { formatted: 'K654321(9)', valid: true });

  const invalidTampered = validateAndFormatHkid('K654321(4)');
  assert.deepEqual(invalidTampered, { formatted: 'K654321(4)', valid: false });
});

test('Google Cloud Vision DOCUMENT_TEXT_DETECTION raw text for HKID Smart Card extracts fullNameEn, fullNameZh, hkidNumber, and age', () => {
  const sampleVisionHkidText = `
HONG KONG PERMANENT IDENTITY CARD
香港永久性居民身份證
WONG, Ka Ming
黃家明
Date of Birth 出生日期: 15-05-1988
Sex 性別: 男 M
Date of Issue 簽發日期: 12-09-2023
K654321(9)
`;

  const parsed = parseHkIdentityDocumentOcr(
    sampleVisionHkidText,
    'AUTO',
    'google-cloud-vision',
    new Date('2026-11-11T00:00:00Z')
  );

  assert.equal(parsed.verified, true);
  assert.equal(parsed.docType, 'HKID');
  assert.equal(parsed.residency, 'HK_RESIDENT');
  assert.equal(parsed.fullNameEn, 'WONG, Ka Ming');
  assert.equal(parsed.fullNameZh, '黃家明');
  assert.equal(parsed.hkidNumber, 'K654321(9)');
  assert.equal(parsed.hkidChecksumValid, true);
  assert.equal(parsed.dateOfBirth, '1988-05-15');
  assert.equal(parsed.calculatedAge, 38);
  assert.equal(parsed.gender, 'M');
});

test('Google Cloud Vision DOCUMENT_TEXT_DETECTION raw text for HKSAR Visitor Landing Slip extracts MCV residency, travel doc, and stay dates', () => {
  const sampleVisionEntrySlipText = `
IMMIGRATION DEPARTMENT, HKSAR 香港入境事務處
VISITOR LANDING SLIP 旅客抵港入境標籤
NAME: ZHOU YUTING (周雨婷)
DATE OF BIRTH: 22-08-1991
TRAVEL DOC NO: EEP-G6291048
ARRIVAL DATE (HKG): 2026-11-11
PERMITTED TO REMAIN UNTIL: 2026-11-18
CONDITION: VISITOR - ONSHORE HKSAR VERIFIED
`;

  const parsed = parseHkIdentityDocumentOcr(
    sampleVisionEntrySlipText,
    'AUTO',
    'google-cloud-vision',
    new Date('2026-11-11T00:00:00Z')
  );

  assert.equal(parsed.verified, true);
  assert.equal(parsed.docType, 'MCV_ENTRY_SLIP');
  assert.equal(parsed.residency, 'MCV');
  assert.equal(parsed.fullNameEn, 'ZHOU YUTING');
  assert.equal(parsed.fullNameZh, '周雨婷');
  assert.equal(parsed.hkidNumber, 'EEP-G6291048');
  assert.equal(parsed.entryDate, '2026-11-11');
  assert.equal(parsed.permittedUntil, '2026-11-18');
  assert.equal(parsed.calculatedAge, 35);
  assert.equal(parsed.onshoreValid, true);
});
