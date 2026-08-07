import { logger } from '../../config/logger.js';
import { normalizeClassification, parseOcrDate, parseGraduationYear } from './ocr.service.js';

function normalizeText(s) {
  if (!s) return '';
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(s) {
  return normalizeText(s).split(/\s+/).filter(Boolean);
}

function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function stringSimilarity(a, b) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return 100;
  if (!na || !nb) return 0;
  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshtein(na, nb);
  return Math.round(((maxLen - dist) / maxLen) * 100);
}

function setSimilarity(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;
  const bSet = new Set(bTokens);
  let matches = 0;
  for (const t of aTokens) {
    if (bSet.has(t)) matches++;
    else {
      for (const bt of bSet) {
        if (levenshtein(t, bt) <= Math.max(1, Math.floor(Math.min(t.length, bt.length) * 0.25))) {
          matches++;
          break;
        }
      }
    }
  }
  return Math.round((matches / Math.max(aTokens.length, bTokens.length)) * 100);
}

function nameSimilarity(a, b) {
  if (!a || !b) return 0;
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return 100;
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  if (!aTokens.length || !bTokens.length) return 0;
  const exact = setSimilarity(aTokens, bTokens);
  const fullString = stringSimilarity(na, nb);
  const firstLast = (() => {
    const [aFirst, , aLast] = [aTokens[0], aTokens.slice(1, -1).join(' '), aTokens[aTokens.length - 1]];
    const [bFirst, , bLast] = [bTokens[0], bTokens.slice(1, -1).join(' '), bTokens[bTokens.length - 1]];
    const firstMatch = aFirst && bFirst && (levenshtein(aFirst, bFirst) <= 1);
    const lastMatch = aLast && bLast && (levenshtein(aLast, bLast) <= 1);
    if (firstMatch && lastMatch) return 90;
    if (firstMatch || lastMatch) return 50;
    return 0;
  })();
  return Math.max(exact, fullString, firstLast);
}

function idSimilarity(a, b) {
  if (!a || !b) return 0;
  const na = String(a).trim().toLowerCase().replace(/[\s\-\/_]/g, '');
  const nb = String(b).trim().toLowerCase().replace(/[\s\-\/_]/g, '');
  if (na === nb) return 100;
  if (!na || !nb) return 0;
  if (na.endsWith(nb) || nb.endsWith(na)) return 85;
  if (na.startsWith(nb) || nb.startsWith(na)) return 75;
  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshtein(na, nb);
  return Math.max(0, Math.round(((maxLen - dist) / maxLen) * 100));
}

function dateSimilarity(a, b) {
  if (!a || !b) return 0;
  const da = a instanceof Date ? a : parseOcrDate(a);
  const db = b instanceof Date ? b : parseOcrDate(b);
  if (!da || !db || isNaN(da.getTime()) || isNaN(db.getTime())) {
    const sa = String(a).trim();
    const sb = String(b).trim();
    if (sa && sb && sa === sb) return 100;
    const ya = parseGraduationYear(sa);
    const yb = parseGraduationYear(sb);
    if (ya && yb) return ya === yb ? 90 : 0;
    return stringSimilarity(sa, sb) * 0.6;
  }
  const diffDays = Math.abs(Math.round((da - db) / (1000 * 60 * 60 * 24)));
  if (diffDays === 0) return 100;
  if (diffDays <= 7) return 95;
  if (diffDays <= 31) return 85;
  if (diffDays <= 90) return 70;
  if (diffDays <= 365) return 50;
  return 0;
}

function classificationSimilarity(a, b) {
  if (!a || !b) return 0;
  const na = normalizeClassification(a);
  const nb = normalizeClassification(b);
  if (na && nb && na === nb) return 100;
  return Math.max(
    na && nb ? stringSimilarity(na, nb) : 0,
    stringSimilarity(String(a), String(b)),
  );
}

export function matchCertificateFields(record, extracted, options = {}) {
  const fieldWeights = options.fieldWeights || {
    certificateNumber: 30,
    awardTitle: 15,
    programme: 10,
    classification: 10,
    issueDate: 15,
    graduationYear: 10,
    gpa: 5,
    honours: 5,
  };

  const checks = [];
  let weightedSum = 0;
  let totalWeight = 0;
  const mismatchedFields = [];
  const missingFields = [];
  const matched = {};

  const addCheck = (field, extractedValue, storedValue, similarity, weight) => {
    checks.push({ field, extractedValue, storedValue, similarity, weight });
    if (weight > 0) {
      weightedSum += similarity * weight;
      totalWeight += weight;
    }
    if (extractedValue && !storedValue) missingFields.push(field);
    else if (storedValue && extractedValue) {
      if (similarity < 60) mismatchedFields.push(field);
      else matched[field] = { extracted: extractedValue, stored: storedValue, similarity };
    }
  };

  if (extracted.certificateNumber || record.certificateNumber) {
    const sim = idSimilarity(extracted.certificateNumber, record.certificateNumber);
    addCheck('certificateNumber', extracted.certificateNumber, record.certificateNumber, sim, fieldWeights.certificateNumber);
  }

  if (extracted.awardTitle || record.awardTitle) {
    const sim = stringSimilarity(extracted.awardTitle, record.awardTitle);
    addCheck('awardTitle', extracted.awardTitle, record.awardTitle, sim, fieldWeights.awardTitle);
  }

  if (extracted.programme || record.programme) {
    const sim = stringSimilarity(extracted.programme, record.programme);
    addCheck('programme', extracted.programme, record.programme, sim, fieldWeights.programme);
  }

  if (extracted.CLASSIFICATION || record.classification) {
    const sim = classificationSimilarity(extracted.CLASSIFICATION, record.classification);
    addCheck('classification', extracted.CLASSIFICATION, record.classification, sim, fieldWeights.classification);
  }

  if (extracted.ISSUE_DATE || record.issueDate) {
    const sim = dateSimilarity(extracted.ISSUE_DATE, record.issueDate);
    addCheck('issueDate', extracted.ISSUE_DATE, record.issueDate, sim, fieldWeights.issueDate);
  }

  if (extracted.GRADUATION_YEAR || record.issueDate) {
    const storedYear = record.issueDate
      ? new Date(record.issueDate).getFullYear().toString()
      : null;
    const extractedYear = parseGraduationYear(extracted.GRADUATION_YEAR || '');
    const sim = (extractedYear && storedYear && extractedYear === storedYear) ? 100 :
      (extractedYear && storedYear ? stringSimilarity(extractedYear, storedYear) : 0);
    addCheck('graduationYear', extractedYear, storedYear, sim, fieldWeights.graduationYear);
  }

  if (extracted.GPA || record.gpa) {
    const sim = idSimilarity(extracted.GPA, record.gpa);
    addCheck('gpa', extracted.GPA, record.gpa, sim, fieldWeights.gpa);
  }

  if (extracted.HONOURS || record.honours) {
    const sim = stringSimilarity(extracted.HONOURS, record.honours);
    addCheck('honours', extracted.HONOURS, record.honours, sim, fieldWeights.honours);
  }

  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return {
    score,
    checks,
    matchedFields: matched,
    mismatchedFields,
    missingFields,
    totalWeight,
  };
}

export function matchGraduateFields(graduate, extracted, options = {}) {
  const fieldWeights = options.fieldWeights || {
    fullName: 30,
    firstName: 15,
    lastName: 15,
    matricNumber: 30,
    programme: 10,
  };

  const checks = [];
  let weightedSum = 0;
  let totalWeight = 0;
  const mismatchedFields = [];
  const missingFields = [];
  const matched = {};

  const addCheck = (field, extractedValue, storedValue, similarity, weight) => {
    checks.push({ field, extractedValue, storedValue, similarity, weight });
    if (weight > 0) {
      weightedSum += similarity * weight;
      totalWeight += weight;
    }
    if (extractedValue && !storedValue) missingFields.push(field);
    else if (storedValue && extractedValue) {
      if (similarity < 60) mismatchedFields.push(field);
      else matched[field] = { extracted: extractedValue, stored: storedValue, similarity };
    }
  };

  const graduateFullName = [graduate.firstName, graduate.middleName, graduate.lastName]
    .filter(Boolean).join(' ');
  const extractedFullName = extracted.FULL_NAME ||
    [extracted.FIRST_NAME, extracted.MIDDLE_NAME, extracted.LAST_NAME].filter(Boolean).join(' ');

  if (extractedFullName || graduateFullName) {
    const sim = nameSimilarity(extractedFullName, graduateFullName);
    addCheck('fullName', extractedFullName, graduateFullName, sim, fieldWeights.fullName);
  }

  if (extracted.FIRST_NAME || graduate.firstName) {
    const sim = nameSimilarity(extracted.FIRST_NAME, graduate.firstName);
    addCheck('firstName', extracted.FIRST_NAME, graduate.firstName, sim, fieldWeights.firstName);
  }

  if (extracted.LAST_NAME || graduate.lastName) {
    const sim = nameSimilarity(extracted.LAST_NAME, graduate.lastName);
    addCheck('lastName', extracted.LAST_NAME, graduate.lastName, sim, fieldWeights.lastName);
  }

  if (extracted.MATRIC_NUMBER || graduate.matricNumber) {
    const sim = idSimilarity(extracted.MATRIC_NUMBER, graduate.matricNumber);
    addCheck('matricNumber', extracted.MATRIC_NUMBER, graduate.matricNumber, sim, fieldWeights.matricNumber);
  }

  if (extracted.PROGRAMME || graduate.programme) {
    const sim = stringSimilarity(extracted.PROGRAMME, graduate.programme);
    addCheck('programme', extracted.PROGRAMME, graduate.programme, sim, fieldWeights.programme);
  }

  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return {
    score,
    checks,
    matchedFields: matched,
    mismatchedFields,
    missingFields,
    totalWeight,
  };
}

export function matchInstitutionFields(institution, extracted, options = {}) {
  const fieldWeights = options.fieldWeights || {
    name: 70,
    country: 10,
    city: 10,
    website: 10,
  };

  const checks = [];
  let weightedSum = 0;
  let totalWeight = 0;
  const mismatchedFields = [];
  const missingFields = [];
  const matched = {};

  const addCheck = (field, extractedValue, storedValue, similarity, weight) => {
    checks.push({ field, extractedValue, storedValue, similarity, weight });
    if (weight > 0) {
      weightedSum += similarity * weight;
      totalWeight += weight;
    }
    if (extractedValue && !storedValue) missingFields.push(field);
    else if (storedValue && extractedValue) {
      if (similarity < 60) mismatchedFields.push(field);
      else matched[field] = { extracted: extractedValue, stored: storedValue, similarity };
    }
  };

  if (extracted.INSTITUTION || institution.name) {
    const sim = stringSimilarity(extracted.INSTITUTION, institution.name);
    addCheck('name', extracted.INSTITUTION, institution.name, sim, fieldWeights.name);
  }

  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return {
    score,
    checks,
    matchedFields: matched,
    mismatchedFields,
    missingFields,
    totalWeight,
  };
}

export function aggregateScores({ certificate, graduate, institution }, options = {}) {
  const weights = options.weights || {
    certificate: 0.50,
    graduate: 0.35,
    institution: 0.15,
  };

  const overall = Math.round(
    (certificate || 0) * weights.certificate +
    (graduate || 0) * weights.graduate +
    (institution || 0) * weights.institution,
  );

  let status;
  if (overall >= 85) status = 'AUTHENTIC';
  else if (overall >= 65) status = 'SUSPICIOUS';
  else status = 'INVALID';

  return {
    overall,
    status,
    breakdown: {
      certificate,
      graduate,
      institution,
    },
  };
}

export function stringMatchAny(needle, haystacks) {
  if (!needle || !haystacks || !haystacks.length) return 0;
  let best = 0;
  for (const h of haystacks) {
    best = Math.max(best, stringSimilarity(needle, h));
    if (best >= 95) break;
  }
  return best;
}

export { normalizeText, tokenize, stringSimilarity, nameSimilarity, idSimilarity, dateSimilarity };
