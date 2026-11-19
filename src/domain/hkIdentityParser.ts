import { IdentityScanResult, ResidencyType } from './types';

const HK_BOILERPLATE_ZH = [
  '香港永久性居民身份證',
  '香港居民身份證',
  '香港特別行政區',
  '香港入境事務處',
  '入境事務處',
  '旅客抵港入境標籤',
  '入境標籤',
  '逗留條件',
  '訪客',
  '獲准逗留至',
  '抵港日期',
  '出生日期',
  '簽發日期',
  '首次簽發日期',
  '性別',
  '男',
  '女',
  '持證人',
  '姓名',
  '證件號碼',
  '旅行證件號碼',
];

const HK_BOILERPLATE_EN = [
  'HONG KONG PERMANENT IDENTITY CARD',
  'HONG KONG IDENTITY CARD',
  'IMMIGRATION DEPARTMENT',
  'HKSAR',
  'VISITOR LANDING SLIP',
  'DATE OF BIRTH',
  'DATE OF ISSUE',
  'PERMITTED TO REMAIN UNTIL',
  'ARRIVAL DATE',
  'TRAVEL DOC NO',
  'DOCUMENT NO',
  'CONDITION',
  'VISITOR',
  'ONSHORE',
  'VERIFIED',
  'HKG',
  'NAME',
  'SEX',
];

/**
 * Computes the official Hong Kong Identity Card (HKID) Modulus-11 check digit
 * for a 1- or 2-letter prefix + 6 digits (e.g., "K654321" -> "9", "A123456" -> "3").
 */
export function computeHkidCheckDigit(prefixLetters: string, sixDigits: string): string | null {
  const cleanPrefix = prefixLetters.trim().toUpperCase();
  const cleanDigits = sixDigits.trim();

  if (!/^[A-Z]{1,2}$/.test(cleanPrefix) || !/^\d{6}$/.test(cleanDigits)) {
    return null;
  }

  let sum = 0;
  if (cleanPrefix.length === 1) {
    // Space value 36 * weight 9 = 324 (36 mod 11 === 58 mod 11 === 3)
    sum += 36 * 9;
    sum += (cleanPrefix.charCodeAt(0) - 55) * 8;
  } else {
    sum += (cleanPrefix.charCodeAt(0) - 55) * 9;
    sum += (cleanPrefix.charCodeAt(1) - 55) * 8;
  }

  for (let i = 0; i < 6; i++) {
    const digit = Number(cleanDigits[i]);
    const weight = 7 - i; // weights 7, 6, 5, 4, 3, 2
    sum += digit * weight;
  }

  const remainder = sum % 11;
  const checkVal = (11 - remainder) % 11;
  if (checkVal === 10) return 'A';
  return String(checkVal);
}

/**
 * Normalizes an HKID string to standard HKSAR format, e.g. "k6543219" -> "K654321(9)"
 * and checks whether its Modulus-11 check digit is mathematically valid.
 */
export function validateAndFormatHkid(rawCandidate: string): {
  formatted: string;
  valid: boolean;
} | null {
  const compact = rawCandidate
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[（\[]/g, '(')
    .replace(/[）\]]/g, ')');

  const match = compact.match(/^([A-Z]{1,2})(\d{6})\(?([0-9A])\)?$/);
  if (!match) return null;

  const [, prefix, digits, checkChar] = match;
  const expected = computeHkidCheckDigit(prefix, digits);
  return {
    formatted: `${prefix}${digits}(${checkChar})`,
    valid: expected === checkChar,
  };
}

function normalizeDateToIso(rawDate: string): string {
  const trimmed = rawDate.trim();
  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // DD-MM-YYYY or DD/MM/YYYY (standard on HKID Smart Cards)
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return trimmed;
}

export function calculateAgeFromIsoDate(
  isoDate: string,
  referenceDate: Date = new Date('2026-11-11T00:00:00Z')
): number | null {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const birthYear = Number(m[1]);
  const birthMonth = Number(m[2]);
  const birthDay = Number(m[3]);
  if (birthYear < 1920 || birthYear > referenceDate.getUTCFullYear()) return null;

  let age = referenceDate.getUTCFullYear() - birthYear;
  const refMonth = referenceDate.getUTCMonth() + 1;
  const refDay = referenceDate.getUTCDate();
  if (refMonth < birthMonth || (refMonth === birthMonth && refDay < birthDay)) {
    age -= 1;
  }
  return age >= 0 && age <= 110 ? age : null;
}

/**
 * Parses raw OCR text returned by Google Cloud Vision API (DOCUMENT_TEXT_DETECTION)
 * into structured Hong Kong Lead CRM fields (fullNameEn, fullNameZh, hkidNumber, DOB, MCV dates).
 */
export function parseHkIdentityDocumentOcr(
  rawOcrText: string,
  preferredDocType?: 'AUTO' | 'HKID' | 'MCV_ENTRY_SLIP',
  ocrEngine: IdentityScanResult['ocrEngine'] = 'google-cloud-vision',
  referenceDate: Date = new Date('2026-11-11T00:00:00Z')
): IdentityScanResult {
  const cleanText = (rawOcrText || '').replace(/\r/g, '').trim();
  const lines = cleanText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const upperAll = cleanText.toUpperCase();

  // 1. Determine document type (HKID vs MCV Entry Slip)
  const looksLikeEntrySlip =
    upperAll.includes('LANDING SLIP') ||
    cleanText.includes('入境標籤') ||
    upperAll.includes('PERMITTED TO REMAIN') ||
    cleanText.includes('獲准逗留') ||
    upperAll.includes('EEP-');

  const looksLikeHkid =
    upperAll.includes('IDENTITY CARD') ||
    cleanText.includes('居民身份證') ||
    /\b[A-Z]{1,2}\d{6}\s*[\(（\[]?[0-9A][\)）\]]?/.test(upperAll);

  let docType: 'HKID' | 'MCV_ENTRY_SLIP' = 'HKID';
  if (preferredDocType === 'MCV_ENTRY_SLIP') {
    docType = 'MCV_ENTRY_SLIP';
  } else if (preferredDocType === 'HKID') {
    docType = looksLikeEntrySlip && !looksLikeHkid ? 'MCV_ENTRY_SLIP' : 'HKID';
  } else {
    docType = looksLikeEntrySlip && !looksLikeHkid ? 'MCV_ENTRY_SLIP' : looksLikeEntrySlip ? 'MCV_ENTRY_SLIP' : 'HKID';
  }

  // 2. Extract HKID Number or Mainland Exit-Entry Permit / Passport Number
  let hkidNumber = '';
  let hkidChecksumValid: boolean | null = null;

  const hkidRegex = /\b([A-Z]{1,2})\s*(\d{6})\s*[\(（\[]?\s*([0-9A])\s*[\)）\]]?(?!\d)/gi;
  let matchHkid: RegExpExecArray | null;
  while ((matchHkid = hkidRegex.exec(upperAll)) !== null) {
    const candidate = `${matchHkid[1]}${matchHkid[2]}(${matchHkid[3]})`;
    const checked = validateAndFormatHkid(candidate);
    if (checked) {
      hkidNumber = checked.formatted;
      hkidChecksumValid = checked.valid;
      if (checked.valid) break;
    }
  }

  // Extract Travel Document / EEP number if Entry Slip or no HKID found
  let travelDocNumber = '';
  const labeledDocMatch = cleanText.match(
    /(?:TRAVEL\s*DOC(?:\s*NO\.?)?|DOC(?:UMENT)?\s*NO\.?|證件號碼|旅行證件號碼)\s*[:：]?\s*([A-Z0-9-]{6,16})/i
  );
  if (labeledDocMatch) {
    travelDocNumber = labeledDocMatch[1].toUpperCase();
  } else {
    const eepMatch = upperAll.match(/\b(EEP-[A-Z0-9]{6,12}|[CEGKW]\d{7,8}|CS\d{7})\b/);
    if (eepMatch) {
      travelDocNumber = eepMatch[1];
    }
  }

  const resolvedDocNumber =
    docType === 'HKID' ? hkidNumber || travelDocNumber : travelDocNumber || hkidNumber;

  // 3. Extract English Full Name (fullNameEn)
  let fullNameEn = '';
  const labeledNameLine = lines.find((l) => /^NAME\s*[:：]/i.test(l) || /^HOLDER\s*[:：]/i.test(l));
  if (labeledNameLine) {
    const afterColon = labeledNameLine.replace(/^(?:NAME|HOLDER)\s*[:：]\s*/i, '');
    // Strip trailing Chinese characters in parentheses e.g. "LIN XIAOMEI (林小美)"
    fullNameEn = afterColon
      .replace(/[\(（][^\u0000-\u007F]+[\)）]/g, '')
      .replace(/[^\x20-\x7E]/g, '')
      .trim();
  }

  if (!fullNameEn) {
    // Standard HKID format: "WONG, Ka Ming" or "CHAN, TAI MAN"
    for (const line of lines) {
      const cleanAscii = line.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleanAscii || cleanAscii.length < 4 || cleanAscii.length > 46) continue;
      const upperLine = cleanAscii.toUpperCase();
      if (HK_BOILERPLATE_EN.some((b) => upperLine.includes(b))) continue;
      if (/\d/.test(cleanAscii)) continue;

      if (/^[A-Z]{2,20},\s*[A-Za-z][A-Za-z\s-]{1,30}$/.test(cleanAscii)) {
        fullNameEn = cleanAscii;
        break;
      }
    }
  }

  if (!fullNameEn) {
    // Fallback: 2 to 4 alphabetic words not matching boilerplate
    for (const line of lines) {
      const cleanAscii = line.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
      const upperLine = cleanAscii.toUpperCase();
      if (HK_BOILERPLATE_EN.some((b) => upperLine.includes(b))) continue;
      if (/^[A-Za-z]+(?:\s+[A-Za-z]+){1,3}$/.test(cleanAscii) && cleanAscii.length >= 5) {
        fullNameEn = cleanAscii;
        break;
      }
    }
  }

  // 4. Extract Chinese Full Name (fullNameZh)
  let fullNameZh = '';
  const parenZhMatch = cleanText.match(/[\(（]([\u4e00-\u9fff]{2,5})[\)）]/);
  if (parenZhMatch && !HK_BOILERPLATE_ZH.includes(parenZhMatch[1])) {
    fullNameZh = parenZhMatch[1];
  }

  if (!fullNameZh) {
    const labeledZh = cleanText.match(/(?:中文姓名|姓名)\s*[:：]\s*([\u4e00-\u9fff]{2,5})/);
    if (labeledZh && !HK_BOILERPLATE_ZH.includes(labeledZh[1])) {
      fullNameZh = labeledZh[1];
    }
  }

  if (!fullNameZh) {
    // Look for standalone 2-4 Chinese character blocks on HKID cards (e.g., "黃家明", "陳大文")
    const zhBlocks = cleanText.match(/[\u4e00-\u9fff]{2,5}/g) || [];
    for (const block of zhBlocks) {
      const isBoilerplate = HK_BOILERPLATE_ZH.some(
        (b) => block.includes(b) || b.includes(block)
      );
      if (!isBoilerplate && block.length >= 2 && block.length <= 4) {
        fullNameZh = block;
        break;
      }
    }
  }

  // 5. Extract Dates (DOB, Entry Date, Permitted Until) & Gender
  let dateOfBirth = '';
  const dobLabeled = cleanText.match(
    /(?:DATE\s*OF\s*BIRTH|DOB|出生日期)\s*[:：]?\s*(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})/i
  );
  if (dobLabeled) {
    dateOfBirth = normalizeDateToIso(dobLabeled[1]);
  }

  let entryDate = '';
  const entryLabeled = cleanText.match(
    /(?:ARRIVAL\s*DATE(?:\s*\(HKG\))?|ENTRY\s*DATE|抵港日期)\s*[:：]?\s*(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})/i
  );
  if (entryLabeled) {
    entryDate = normalizeDateToIso(entryLabeled[1]);
  }

  let permittedUntil = '';
  const permittedLabeled = cleanText.match(
    /(?:PERMITTED\s*TO\s*REMAIN\s*UNTIL|STAY\s*UNTIL|獲准逗留至)\s*[:：]?\s*(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})/i
  );
  if (permittedLabeled) {
    permittedUntil = normalizeDateToIso(permittedLabeled[1]);
  }

  // If DOB wasn't explicitly labeled on HKID, pick first historical date (year < 2015)
  if (!dateOfBirth && docType === 'HKID') {
    const allDates = cleanText.match(/\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/g) || [];
    for (const d of allDates) {
      const iso = normalizeDateToIso(d);
      const yr = Number(iso.slice(0, 4));
      if (yr >= 1935 && yr <= 2010) {
        dateOfBirth = iso;
        break;
      }
    }
  }

  let gender: 'M' | 'F' | '' = '';
  if (
    /(?:SEX(?:\s*性別)?|性別)\s*[:：]?\s*(?:男\s*M|M\b|男)/i.test(cleanText) ||
    /男\s*M\b/i.test(cleanText)
  ) {
    gender = 'M';
  } else if (
    /(?:SEX(?:\s*性別)?|性別)\s*[:：]?\s*(?:女\s*F|F\b|女)/i.test(cleanText) ||
    /女\s*F\b/i.test(cleanText)
  ) {
    gender = 'F';
  }

  const calculatedAge = dateOfBirth
    ? calculateAgeFromIsoDate(dateOfBirth, referenceDate)
    : null;

  const residency: ResidencyType = docType === 'MCV_ENTRY_SLIP' ? 'MCV' : 'HK_RESIDENT';
  const verified = Boolean(resolvedDocNumber || fullNameEn);

  const onshoreValid =
    docType === 'MCV_ENTRY_SLIP'
      ? Boolean(permittedUntil || upperAll.includes('ONSHORE') || verified)
      : true;

  return {
    verified,
    docType,
    residency,
    fullNameEn,
    fullNameZh,
    hkidNumber: resolvedDocNumber,
    documentNumber: resolvedDocNumber,
    hkidChecksumValid,
    dateOfBirth,
    calculatedAge,
    gender,
    entryDate,
    permittedUntil,
    onshoreValid,
    rawOcrText: cleanText,
    ocrEngine,
  };
}
