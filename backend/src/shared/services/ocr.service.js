import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import path from 'path';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';

let workerInstance = null;
let workerInitPromise = null;

async function getWorker() {
  if (workerInstance) return workerInstance;
  if (workerInitPromise) return workerInitPromise;

  workerInitPromise = (async () => {
    try {
      const languages = [env.OCR_LANG_1, env.OCR_LANG_2].filter(Boolean).join('+') || 'eng';
      logger.info({ languages }, 'Initializing Tesseract OCR worker');
      const worker = await createWorker(languages);
      workerInstance = worker;
      return worker;
    } catch (err) {
      logger.error({ err }, 'Failed to initialize Tesseract OCR worker');
      workerInitPromise = null;
      throw err;
    }
  })();

  return workerInitPromise;
}

export async function terminateOcrWorker() {
  if (workerInstance) {
    try {
      await workerInstance.terminate();
    } catch (_err) {
      // ignore
    }
    workerInstance = null;
    workerInitPromise = null;
  }
}

async function preprocessImage(buffer) {
  try {
    const meta = await sharp(buffer).metadata();
    let pipeline = sharp(buffer).rotate();
    if (meta.width && meta.width > 2400) {
      pipeline = pipeline.resize(2400, undefined, { withoutEnlargement: true });
    }
    pipeline = pipeline
      .greyscale()
      .normalize()
      .sharpen()
      .png();
    return await pipeline.toBuffer();
  } catch (err) {
    logger.warn({ err }, 'Image preprocessing failed; using raw buffer');
    return buffer;
  }
}

function parsePdfMime(buffer) {
  const header = buffer.slice(0, 5).toString('ascii');
  return header === '%PDF-';
}

export async function runOcr(fileBuffer, { mimeType, fileName } = {}) {
  const startTime = Date.now();
  const ext = fileName ? path.extname(fileName).toLowerCase().slice(1) : '';
  const isPdf = mimeType === 'application/pdf' || ext === 'pdf' || parsePdfMime(fileBuffer);
  const processBuffer = isPdf ? fileBuffer : await preprocessImage(fileBuffer);

  const worker = await getWorker();
  const result = await worker.recognize(processBuffer, {}, {
    pdfAutoOCR: isPdf,
    tessedit_pageseg_mode: isPdf ? '6' : '1',
  });

  const text = result.data.text || '';
  const words = (result.data.words || []).map((w) => ({
    text: w.text,
    confidence: w.confidence,
    bbox: w.bbox,
  }));

  const lines = (result.data.lines || []).map((l) => ({
    text: l.text,
    confidence: l.confidence,
    bbox: l.bbox,
  }));

  const overallConfidence = result.data.confidence ?? calculateConfidence(words);
  const duration = Date.now() - startTime;

  logger.info(
    { chars: text.length, wordCount: words.length, overallConfidence, durationMs: duration, isPdf },
    'OCR extraction completed',
  );

  return {
    text,
    words,
    lines,
    overallConfidence: Math.round(overallConfidence),
    charCount: text.length,
    wordCount: words.length,
    durationMs: duration,
    isPdf,
  };
}

function calculateConfidence(words) {
  if (!words || words.length === 0) return 0;
  const sum = words.reduce((acc, w) => acc + (Number(w.confidence) || 0), 0);
  return Math.min(100, Math.max(0, sum / words.length));
}

const PATTERNS = {
  CERTIFICATE_NUMBER: [
    /(?:certificate|cert|reg|registration)\s*(?:no|number|#|№)?[:\.\-\s]*([A-Za-z0-9\-\/]{4,50})/i,
    /certificate\s*no[:\.\-\s]*([A-Za-z0-9\-\/]{4,50})/i,
    /(?:serial|series)\s*(?:no|number)?[:\.\-\s]*([A-Za-z0-9\-\/]{4,50})/i,
    /([A-Z]{2,5}[\/\-]?\d{4,}[\/\-]?[A-Za-z0-9\-]{1,10})/,
  ],
  MATRIC_NUMBER: [
    /(?:matric|matriculation|student|reg|registration)\s*(?:no|number|id)?[:\.\-\s]*([A-Za-z0-9\-\/]{4,40})/i,
    /matric\s*no[:\.\-\s]*([A-Za-z0-9\-\/]{4,40})/i,
  ],
  AWARD_TITLE: [
    /(?:award(?:ed)?|degree|diploma|certificate(?:\s+of)?)\s+(?:with|in|of)?\s*([A-Za-z][A-Za-z\s,&()]{5,150}?)(?:\s+in\s|\.|,|;|:|\n)/i,
    /(?:bachelor|master|doctor|bsc|msc|ba|ma|phd|diploma|certificate)\s*(?:of|in)?\s*([A-Za-z][A-Za-z\s,&()]{3,150}?)(?:\s+(?:with|in)\s|\.|,|;|:|\n)/i,
  ],
  CLASSIFICATION: [
    /(?:class|classification|grade|division)\s*[:\-\s]*([1-9][a-z]?|first(?:\s+class)?|second(?:\s+class)?\s*(?:upper|lower)?|third|distinction|merit|pass|credit|honou?rs)/i,
    /(?:first|second)(?:\s+class)?\s*(?:upper|lower)?\s*(?:division)?/i,
    /(?:cgpa|gpa)\s*[:\.\-\s]*(\d(?:\.\d{1,3})?)/i,
  ],
  PROGRAMME: [
    /(?:programme|program|course|course of study)\s*[:\.\-\s]*([A-Za-z][A-Za-z\s,&()]{4,200}?)(?:\s+(?:in|at)\s|\.|,|;|:|\n)/i,
  ],
  ISSUE_DATE: [
    /(?:issued|given|awarded|conferred|date)\s*(?:on|of)?\s*[:\.\-\s]*([0-9]{1,2}[\/\-\.\s][A-Za-z0-9]{2,12}[\/\-\.\s][0-9]{2,4})/i,
    /([0-9]{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+[0-9]{4})/i,
    /([0-9]{4}[\/\-][0-9]{2}[\/\-][0-9]{2})/,
  ],
  EXPIRY_DATE: [
    /(?:expires|expiry|valid\s+until|valid\s+to)\s*[:\.\-\s]*([0-9]{1,2}[\/\-\.\s][A-Za-z0-9]{2,12}[\/\-\.\s][0-9]{2,4})/i,
  ],
  GRADUATION_YEAR: [
    /(?:class\s+of|graduated?\s+in|year|session)\s*[:\.\-\s]*((?:19|20)\d{2}(?:\/(?:19|20)?\d{2})?)/i,
    /((?:19|20)\d{2}(?:\/(?:19|20)?\d{2})?)/,
  ],
  GPA: [
    /(?:cgpa|gpa)\s*[:\.\-\s]*(\d(?:\.\d{1,3})?)(?:\s*\/\s*(\d(?:\.\d{1,2})?))?/i,
  ],
  FIRST_NAME: [
    /(?:first\s+name|given\s+name|christian\s+name)\s*[:\.\-\s]*([A-Za-z][A-Za-z'\-]{2,60})/i,
  ],
  LAST_NAME: [
    /(?:last\s+name|surname|family\s+name)\s*[:\.\-\s]*([A-Za-z][A-Za-z'\-]{2,60})/i,
  ],
  FULL_NAME: [
    /(?:name|student|graduate|recipient|candidate)\s*[:\.\-\s]*([A-Z][A-Za-z'\-.]*(?:\s+[A-Z][A-Za-z'\-.]*){1,5})/,
    /hereby\s+(?:certifies|confirms|awards|grants)\s+(?:that\s+)?([A-Z][A-Za-z'\-.]*(?:\s+[A-Z][A-Za-z'\-.]*){1,5})/i,
    /awarded\s+to\s*[:\.\-\s]*([A-Z][A-Za-z'\-.]*(?:\s+[A-Z][A-Za-z'\-.]*){1,5})/i,
    /(?:was|is)\s+conferred\s+(?:on|upon)\s+([A-Z][A-Za-z'\-.]*(?:\s+[A-Z][A-Za-z'\-.]*){1,5})/i,
  ],
  INSTITUTION: [
    /([A-Z][A-Za-z&.'()\-]*(?:\s+(?:university|college|institute|polytechnic|school|academy))(?:\s+of\s+[A-Za-z&.\-]+)?)/i,
    /the\s+(?:[A-Za-z&.'()\-]+\s+)*(?:university|college|institute|polytechnic|school|academy)(?:\s+of\s+[A-Za-z&.\-]+)?/i,
  ],
  SIGNATORY: [
    /(?:registrar|vice\s*chancellor|president|dean|director|principal|rector|chairman)\s*(?:,\s*[A-Za-z\s]+)?\s*\n?\s*([A-Z][A-Za-z.\- ]{3,100})/i,
  ],
  SIGNATORY_TITLE: [
    /(?:registrar|vice[\s-]*chancellor|president|dean|director|principal|rector|chairm[ae]n|secretary|provost)/i,
  ],
  HONOURS: [
    /with\s+(?:[A-Z]\w+\s+)?honou?rs(?:\s*\([^)]*\))?/i,
  ],
};

export function extractStructuredFields(ocrText, ocrLines = []) {
  const fields = {};
  const normalizedText = ocrText.replace(/\r\n/g, '\n');

  for (const [key, patterns] of Object.entries(PATTERNS)) {
    for (const pattern of patterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        let value = match[1] !== undefined ? match[1] : match[0];
        value = value.trim().replace(/\s+/g, ' ');
        if (value && value.length > 1) {
          fields[key] = value;
          break;
        }
      }
    }
  }

  if (!fields.FIRST_NAME && !fields.LAST_NAME && fields.FULL_NAME) {
    const parts = fields.FULL_NAME.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      fields.FIRST_NAME = parts[0];
      fields.LAST_NAME = parts[parts.length - 1];
      if (parts.length > 2) {
        fields.MIDDLE_NAME = parts.slice(1, -1).join(' ');
      }
    }
  }

  if (!fields.ISSUE_DATE) {
    const anyDate = normalizedText.match(/\b(?:19|20)\d{2}\b/);
    if (anyDate) fields.GRADUATION_YEAR = anyDate[0];
  }

  return fields;
}

export function splitFullName(fullName) {
  if (!fullName) return { firstName: '', middleName: '', lastName: '' };
  const parts = fullName.trim().replace(/\s+/g, ' ').split(' ');
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

export function parseOcrDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = dateStr.trim().replace(/(st|nd|rd|th)/i, '').replace(/[,]/g, ' ').replace(/\s+/g, ' ');
  const formats = [
    { re: /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/, parse: (m) => {
      const d = parseInt(m[1]), mo = parseInt(m[2]); let y = parseInt(m[3]);
      if (y < 100) y += 2000;
      return new Date(Date.UTC(y, mo - 1, d));
    }},
    { re: /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/, parse: (m) => {
      const monthMap = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,
        january:0,february:1,march:2,april:3,june:5,july:6,august:7,september:8,october:9,november:10,december:11};
      const mo = monthMap[m[2].toLowerCase()];
      if (mo === undefined) return null;
      return new Date(Date.UTC(parseInt(m[3]), mo, parseInt(m[1])));
    }},
  ];
  for (const fmt of formats) {
    const m = cleaned.match(fmt.re);
    if (m) {
      const d = fmt.parse(m);
      if (d && !isNaN(d.getTime())) return d;
    }
  }
  return null;
}

export function parseGraduationYear(str) {
  if (!str) return null;
  const m = str.match(/(19|20)\d{2}/);
  return m ? m[0] : null;
}

export function normalizeClassification(raw) {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  if (/first( class)?( honou?rs)?( division)?/.test(s)) return 'First Class';
  if (/second.*upper/.test(s) || /2:?1/.test(s)) return 'Second Class Upper';
  if (/second.*lower/.test(s) || /2:?2/.test(s)) return 'Second Class Lower';
  if (/third( class)?( division)?/.test(s)) return 'Third Class';
  if (/distinction/.test(s)) return 'Distinction';
  if (/merit/.test(s)) return 'Merit';
  if (/credit/.test(s)) return 'Credit';
  if (/pass/.test(s)) return 'Pass';
  if (/fail/.test(s)) return 'Fail';
  return raw.trim();
}

export function normalizeCertificateType(raw) {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (/(bachelor|bsc|ba|b\.|degree|b\.tech)/.test(s)) return 'DEGREE';
  if (/diploma/.test(s)) return 'DIPLOMA';
  if (/transcript/.test(s)) return 'TRANSCRIPT';
  if (/certificate/.test(s)) return 'CERTIFICATE';
  return null;
}

export function normalizeExtractedFields(rawFields = {}) {
  if (!rawFields || typeof rawFields !== 'object') return {};
  const out = { ...rawFields };

  if (rawFields.fullName) {
    const parts = splitFullName(rawFields.fullName);
    out.firstName = parts.firstName ?? out.firstName;
    out.middleName = parts.middleName ?? out.middleName;
    out.lastName = parts.lastName ?? out.lastName;
  }
  if (rawFields.graduateName && !rawFields.fullName) {
    const parts = splitFullName(rawFields.graduateName);
    out.graduateName = rawFields.graduateName;
    out.firstName = parts.firstName ?? out.firstName;
    out.middleName = parts.middleName ?? out.middleName;
    out.lastName = parts.lastName ?? out.lastName;
    out.fullName = rawFields.graduateName;
  }
  if (rawFields.name && !out.fullName) {
    const parts = splitFullName(rawFields.name);
    out.firstName = parts.firstName ?? out.firstName;
    out.middleName = parts.middleName ?? out.middleName;
    out.lastName = parts.lastName ?? out.lastName;
    out.fullName = rawFields.name;
  }

  const dateKeys = ['issueDate', 'awardDate', 'graduationDate', 'dateIssued', 'conferredOn', 'dateOfBirth'];
  for (const k of dateKeys) {
    if (rawFields[k]) {
      const parsed = parseOcrDate(rawFields[k]);
      if (parsed) out[k] = parsed;
    }
  }

  const yearKeys = ['graduationYear', 'year', 'yearOfGraduation'];
  for (const k of yearKeys) {
    if (rawFields[k]) {
      const parsed = parseGraduationYear(rawFields[k]);
      if (parsed) out[k] = parsed;
    }
  }

  if (rawFields.classification || rawFields.class || rawFields.grade || rawFields.honours || rawFields.division) {
    const candidate = rawFields.classification ?? rawFields.class ?? rawFields.grade ?? rawFields.honours ?? rawFields.division;
    const normalized = normalizeClassification(String(candidate));
    if (normalized) out.classification = normalized;
  }
  if (rawFields.type || rawFields.certificateType || rawFields.qualification || rawFields.awardType) {
    const c = rawFields.type ?? rawFields.certificateType ?? rawFields.qualification ?? rawFields.awardType;
    const norm = normalizeCertificateType(String(c));
    if (norm) out.type = norm;
  }

  if (rawFields.certificateNumber || rawFields.certificateNo || rawFields.certNumber || rawFields.serialNumber || rawFields.registrationNumber) {
    out.certificateNumber = String(rawFields.certificateNumber ?? rawFields.certificateNo ?? rawFields.certNumber ?? rawFields.serialNumber ?? rawFields.registrationNumber);
  }
  if (rawFields.matricNumber || rawFields.studentId || rawFields.studentNumber || rawFields.regNo || rawFields.registrationNumber) {
    if (!out.matricNumber) {
      out.matricNumber = String(rawFields.matricNumber ?? rawFields.studentId ?? rawFields.studentNumber ?? rawFields.regNo ?? rawFields.registrationNumber);
    }
  }

  for (const k of Object.keys(out)) {
    const v = out[k];
    if (typeof v === 'string' && v !== null && v !== undefined) {
      out[k] = v.replace(/\s+/g, ' ').trim();
    }
  }

  return out;
}
