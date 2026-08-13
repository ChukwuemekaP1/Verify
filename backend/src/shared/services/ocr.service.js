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
      await worker.setParameters({
        tessedit_pageseg_mode: '1',
      });
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

/**
 * Preprocess an image buffer for optimal OCR results.
 * - Auto-rotate based on EXIF
 * - Upscale small images to improve character recognition
 * - Convert to greyscale
 * - Normalize contrast
 * - Sharpen for edge clarity
 * - Apply adaptive-style thresholding via moderate threshold
 */
async function preprocessImage(buffer) {
  try {
    const meta = await sharp(buffer).metadata();
    let pipeline = sharp(buffer, { failOnError: false }).rotate();

    const width = meta.width || 0;
    const density = meta.density || 0;

    // Upscale small images to at least 2000px wide for better OCR
    if (width > 0 && width < 2000) {
      pipeline = pipeline.resize(2400, undefined, {
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3,
      });
    }

    // Upscale based on DPI if low resolution
    if (density > 0 && density < 200) {
      const targetWidth = Math.round(width * (300 / density));
      if (targetWidth > width) {
        pipeline = pipeline.resize(targetWidth, undefined, {
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
        });
      }
    }

    pipeline = pipeline
      .greyscale()
      .normalize()
      .sharpen({ sigma: 1.2 })
      .threshold(140)
      .png({ compressionLevel: 6 });

    return await pipeline.toBuffer();
  } catch (err) {
    logger.warn({ err }, 'Image preprocessing failed; using raw buffer');
    return buffer;
  }
}

/**
 * Render a PDF buffer into an array of PNG image buffers (one per page).
 * Uses sharp's PDF loader (libvips + poppler).
 * Falls back to empty array if PDF rendering fails.
 */
async function renderPdfToImages(buffer, { dpi = 300, maxPages = 5 } = {}) {
  const pages = [];
  try {
    // First, get page count by attempting to read metadata
    const meta = await sharp(buffer, { failOnError: false, pages: -1 }).metadata();
    const pageCount = Math.min(meta.pages || 1, maxPages);

    for (let i = 0; i < pageCount; i++) {
      try {
        const pageBuffer = await sharp(buffer, { failOnError: false, page: i })
          .resize(2400, undefined, {
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3,
          })
          .greyscale()
          .normalize()
          .sharpen({ sigma: 1.2 })
          .threshold(140)
          .png({ compressionLevel: 6 })
          .toBuffer();
        pages.push(pageBuffer);
      } catch (pageErr) {
        logger.warn({ err: pageErr, page: i }, 'Failed to render PDF page');
      }
    }
  } catch (err) {
    logger.warn({ err }, 'PDF rendering failed; attempting raw OCR on PDF buffer');
  }
  return pages;
}

function parsePdfMime(buffer) {
  const header = buffer.slice(0, 5).toString('ascii');
  return header === '%PDF-';
}

/**
 * Run OCR on a file buffer (image or PDF).
 * For PDFs: renders each page to an image, then OCRs each page.
 * For images: preprocesses then OCRs.
 * Returns combined text, per-word/line data, and confidence.
 */
export async function runOcr(fileBuffer, { mimeType, fileName } = {}) {
  const startTime = Date.now();
  const ext = fileName ? path.extname(fileName).toLowerCase().slice(1) : '';
  const isPdf = mimeType === 'application/pdf' || ext === 'pdf' || parsePdfMime(fileBuffer);

  const worker = await getWorker();
  let allText = '';
  let allWords = [];
  let allLines = [];
  let confidences = [];

  if (isPdf) {
    const pageImages = await renderPdfToImages(fileBuffer);
    if (pageImages.length === 0) {
      // PDF rendering not supported or failed — return empty result
      logger.warn('PDF rendering failed and no fallback available');
      return {
        text: '',
        words: [],
        lines: [],
        overallConfidence: 0,
        charCount: 0,
        wordCount: 0,
        durationMs: Date.now() - startTime,
        isPdf: true,
      };
    }

    for (const pageBuffer of pageImages) {
      let result;
      try {
        result = await worker.recognize(pageBuffer);
      } catch (pageErr) {
        logger.warn({ err: pageErr }, 'Tesseract failed on PDF page');
        continue;
      }
      const pageText = result.data.text || '';
      allText += (allText ? '\n\n' : '') + pageText;

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

      allWords.push(...words);
      allLines.push(...lines);
      if (words.length > 0) {
        const pageConf = words.reduce((s, w) => s + (Number(w.confidence) || 0), 0) / words.length;
        confidences.push(pageConf);
      }
    }
  } else {
    const processBuffer = await preprocessImage(fileBuffer);
    let result;
    try {
      result = await worker.recognize(processBuffer);
    } catch (imgErr) {
      logger.warn({ err: imgErr }, 'Tesseract failed on image');
      return {
        text: '',
        words: [],
        lines: [],
        overallConfidence: 0,
        charCount: 0,
        wordCount: 0,
        durationMs: Date.now() - startTime,
        isPdf: false,
      };
    }
    allText = result.data.text || '';
    allWords = (result.data.words || []).map((w) => ({
      text: w.text,
      confidence: w.confidence,
      bbox: w.bbox,
    }));
    allLines = (result.data.lines || []).map((l) => ({
      text: l.text,
      confidence: l.confidence,
      bbox: l.bbox,
    }));
    if (allWords.length > 0) {
      confidences.push(
        allWords.reduce((s, w) => s + (Number(w.confidence) || 0), 0) / allWords.length,
      );
    }
  }

  const overallConfidence = confidences.length > 0
    ? confidences.reduce((s, c) => s + c, 0) / confidences.length
    : 0;
  const duration = Date.now() - startTime;

  logger.info(
    { chars: allText.length, wordCount: allWords.length, overallConfidence, durationMs: duration, isPdf },
    'OCR extraction completed',
  );

  return {
    text: allText,
    words: allWords,
    lines: allLines,
    overallConfidence: Math.round(overallConfidence),
    charCount: allText.length,
    wordCount: allWords.length,
    durationMs: duration,
    isPdf,
  };
}

// ─── Identifier Extraction ───────────────────────────────────────────────────

/**
 * Known institution prefixes used in verification references and certificate numbers.
 * Derived from seed data — covers UNN, UNIZIK, UNILAG patterns.
 */
const INSTITUTION_PREFIXES = ['UNN', 'UNIZIK', 'UNILAG'];
const PREFIX_PATTERN = INSTITUTION_PREFIXES.join('|');

/**
 * Extract candidate identifiers from raw OCR text.
 * Returns candidates in priority order with confidence scores.
 *
 * Priority:
 * 1. Verification Reference (most specific — unique lookup)
 * 2. Certificate Number (unique within institution)
 * 3. Registration/Matric Number (resolves via graduate)
 */
export function extractIdentifiers(rawText, ocrLines = []) {
  if (!rawText || typeof rawText !== 'string') {
    return { candidates: [], rawText: '', overallConfidence: 0 };
  }

  const text = rawText.replace(/\r\n/g, '\n');
  const candidates = [];

  // ── 1. Verification Reference ──
  // Format: e.g. UNNV001K0L1BO, V1XYZ012ABC, or prefixed with "Verification Ref: ..."
  const verRefPatterns = [
    // Explicit label
    new RegExp(
      `(?:verification|verify|verif|ref|reference|pin)\\s*(?:no|number|#|reference)?[:\\.\\-\\s]*(${PREFIX_PATTERN}[A-Z]?\\-?\\d{2,}[\\-]?[A-Z0-9]{2,}[\\-]?[A-Z0-9]{2,})`,
      'i',
    ),
    // Standalone reference pattern: PREFIX + V + digits + alphanumeric
    new RegExp(`(${PREFIX_PATTERN}V\\d{2,}[A-Z0-9]{3,})`, 'i'),
    // Generic V-prefix reference: V + 8+ alphanumeric chars
    /(V[A-Z0-9]{7,})/i,
    // Label + any alphanumeric reference
    /(?:verification|verify|verif|ref|reference|pin)\s*(?:no|number|#|reference)?[:\.\-\s]*([A-Za-z0-9\-]{8,50})/i,
  ];

  for (const pattern of verRefPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = (match[1] || match[0]).trim().toUpperCase().replace(/\s+/g, '');
      if (value.length >= 6) {
        candidates.push({
          type: 'VERIFICATION_REFERENCE',
          value,
          confidence: estimateIdentifierConfidence(value, text, ocrLines),
          source: 'ocr',
        });
        break;
      }
    }
  }

  // ── 2. Certificate Number ──
  // Format: e.g. UNN-CERT-0001-2026, PREFIX-CERT-NNNN-YYYY
  const certNumPatterns = [
    // Institution prefix pattern
    new RegExp(
      `(${PREFIX_PATTERN}[\\-\\/]?CERT[\\-\\/]?\\d{3,}[\\-\\/]?\\d{0,10}[A-Za-z0-9\\-]*)`,
      'i',
    ),
    // Explicit label
    /(?:certificate|cert|serial|series)\s*(?:no|number|#|№)?[:\.\-\s]*([A-Za-z0-9\-\/]{6,60})/i,
    // Generic pattern: ALPHA-NUMBER-NUMBER-NUMBER
    /([A-Z]{2,5}[\/\-]\d{3,}[\/\-]\d{3,}[\/\-]\d{2,})/i,
  ];

  for (const pattern of certNumPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = (match[1] || match[0]).trim().replace(/\s+/g, ' ');
      if (value.length >= 6) {
        candidates.push({
          type: 'CERTIFICATE_NUMBER',
          value,
          confidence: estimateIdentifierConfidence(value, text, ocrLines),
          source: 'ocr',
        });
        break;
      }
    }
  }

  // ── 3. Registration/Matric Number ──
  // Format: e.g. UNN/2018/001234, PREFIX/YYYY/NNNNNN
  const regNumPatterns = [
    // Institution prefix pattern
    new RegExp(
      `(${PREFIX_PATTERN}[\\-\\/]\\d{4}[\\-\\/]\\d{4,})`,
      'i',
    ),
    // Explicit label
    /(?:matric|matriculation|student|registration)\s*(?:no|number|id)?[:\.\-\s]*([A-Za-z0-9\-\/]{6,40})/i,
    // Generic: ALPHA/NUMBER/NUMBER
    /([A-Z]{2,5}\/\d{4}\/\d{3,})/i,
  ];

  for (const pattern of regNumPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = (match[1] || match[0]).trim().toUpperCase().replace(/\s+/g, '');
      if (value.length >= 6) {
        candidates.push({
          type: 'REGISTRATION_NUMBER',
          value,
          confidence: estimateIdentifierConfidence(value, text, ocrLines),
          source: 'ocr',
        });
        break;
      }
    }
  }

  return {
    candidates,
    rawText: text,
    overallConfidence: candidates.length > 0
      ? Math.max(...candidates.map((c) => c.confidence))
      : 0,
  };
}

/**
 * Estimate confidence for an extracted identifier.
 * Checks if the identifier appears clearly in the text and in OCR lines.
 */
function estimateIdentifierConfidence(identifier, rawText, ocrLines = []) {
  if (!identifier) return 0;

  const normalizedId = identifier.toUpperCase().replace(/[\s\-_]/g, '');
  const normalizedText = rawText.toUpperCase().replace(/[\s\-_]/g, '');

  // Check if identifier appears in raw text (exact or near-exact)
  const textContains = normalizedText.includes(normalizedId);

  // Check OCR lines for the identifier (words near each other)
  let lineConfidence = 0;
  if (ocrLines && ocrLines.length > 0) {
    for (const line of ocrLines) {
      const lineText = (line.text || '').toUpperCase().replace(/[\s\-_]/g, '');
      if (lineText.includes(normalizedId)) {
        lineConfidence = Math.max(lineConfidence, line.confidence || 0);
      }
    }
  }

  // Base confidence
  let confidence = 50;
  if (textContains) confidence += 30;
  if (lineConfidence > 0) confidence = Math.max(confidence, lineConfidence);

  // Penalize very short or very long identifiers
  if (identifier.length < 6) confidence -= 20;
  if (identifier.length > 30) confidence -= 10;

  return Math.min(100, Math.max(0, Math.round(confidence)));
}

/**
 * Normalize an extracted identifier for lookup.
 * Handles common OCR formatting issues:
 * - Whitespace, line breaks
 * - Case normalization
 * - Separator variations (O/0, I/1 confusion for known patterns)
 *
 * Does NOT do aggressive fuzzy matching — only harmless formatting fixes.
 */
export function normalizeIdentifier(raw) {
  if (typeof raw !== 'string') return '';
  let normalized = raw.trim().replace(/[\r\n\t]+/g, '').replace(/\s{2,}/g, ' ');

  // Uppercase for consistency
  normalized = normalized.toUpperCase();

  // Remove harmless separators for comparison (but keep the original structure)
  // This is used by the verification service, not here

  return normalized;
}

/**
 * Attempt to fix common OCR character confusion in identifiers.
 * Only applies to known patterns where the fix is safe.
 */
export function fixOcrCharacterConfusion(identifier) {
  if (!identifier || typeof identifier !== 'string') return identifier;

  let fixed = identifier;

  // For verification references (V-prefix): O→0 in digit positions
  if (/^V[A-Z0-9]+$/i.test(fixed)) {
    // Keep as-is — verification refs use both letters and digits
  }

  // For matric numbers (PREFIX/YYYY/NNNNN): ensure digits in numeric parts
  const matricMatch = fixed.match(/^([A-Z]+)[\/\-](\d{4})[\/\-](\d+)$/);
  if (matricMatch) {
    fixed = `${matricMatch[1]}/${matricMatch[2]}/${matricMatch[3]}`;
  }

  // For certificate numbers (PREFIX-CERT-NNNN-YYYY): ensure structure
  const certMatch = fixed.match(/^([A-Z]+)[\-\/](CERT)[\-\/](\d+)[\-\/](\d{4})$/i);
  if (certMatch) {
    fixed = `${certMatch[1]}-${certMatch[2]}-${certMatch[3]}-${certMatch[4]}`;
  }

  return fixed;
}

// ─── OCR → Verification Bridge ───────────────────────────────────────────────

/**
 * Bridge function: takes OCR results, extracts identifiers, and attempts
 * verification via the canonical verifyCertificate() service.
 *
 * Returns:
 * - If identifier found and verified: { verified: true, result, identifier, ocrData }
 * - If identifier found but not verified: { verified: false, reason: 'NOT_FOUND', identifier, ocrData }
 * - If no identifier extracted: { verified: false, reason: 'NO_IDENTIFIER', ocrData }
 * - If low confidence: { verified: false, reason: 'LOW_CONFIDENCE', identifier, ocrData }
 */
export async function identifyCertificateFromOcr(ocrResult) {
  const { text, lines, overallConfidence } = ocrResult;

  if (!text || text.trim().length < 5) {
    return {
      verified: false,
      reason: 'NO_TEXT',
      message: 'OCR produced no readable text from the uploaded document.',
      ocrData: { overallConfidence, charCount: text?.length || 0 },
    };
  }

  const { candidates } = extractIdentifiers(text, lines);

  if (candidates.length === 0) {
    return {
      verified: false,
      reason: 'NO_IDENTIFIER',
      message: 'OCR completed but no verification identifier could be extracted from the document.',
      ocrData: {
        overallConfidence,
        charCount: text.length,
        wordCount: ocrResult.wordCount,
        rawTextPreview: text.substring(0, 500),
      },
    };
  }

  // Try each candidate in priority order
  // Dynamically import to avoid circular dependency
  const { verifyCertificate } = await import('./certificate-verification.service.js');

  for (const candidate of candidates) {
    // Skip very low confidence candidates
    if (candidate.confidence < 20) continue;

    const normalized = normalizeIdentifier(candidate.value);
    const fixed = fixOcrCharacterConfusion(normalized);

    // Flag ambiguous identifiers
    if (candidate.confidence < 40) {
      return {
        verified: false,
        reason: 'LOW_CONFIDENCE',
        message: `OCR extracted a ${candidate.type.toLowerCase().replace(/_/g, ' ')} ("${fixed}") but with low confidence (${candidate.confidence}%). Please verify manually or enter the identifier directly.`,
        identifier: {
          type: candidate.type,
          value: fixed,
          confidence: candidate.confidence,
        },
        ocrData: {
          overallConfidence,
          charCount: text.length,
          wordCount: ocrResult.wordCount,
          rawTextPreview: text.substring(0, 500),
        },
      };
    }

    try {
      const result = await verifyCertificate(fixed);
      return {
        verified: true,
        result,
        identifier: {
          type: candidate.type,
          value: fixed,
          confidence: candidate.confidence,
        },
        ocrData: {
          overallConfidence,
          charCount: text.length,
          wordCount: ocrResult.wordCount,
        },
      };
    } catch (err) {
      // If this candidate failed, try the next one
      if (err.statusCode === 404) continue;
      throw err;
    }
  }

  // All candidates failed verification
  const best = candidates[0];
  return {
    verified: false,
    reason: 'NOT_FOUND',
    message: `OCR extracted a ${best.type.toLowerCase().replace(/_/g, ' ')} ("${fixOcrCharacterConfusion(normalizeIdentifier(best.value))}") but no matching published certificate was found.`,
    identifier: {
      type: best.type,
      value: fixOcrCharacterConfusion(normalizeIdentifier(best.value)),
      confidence: best.confidence,
    },
    ocrData: {
      overallConfidence,
      charCount: text.length,
      wordCount: ocrResult.wordCount,
      rawTextPreview: text.substring(0, 500),
    },
  };
}

// ─── Legacy Extraction Functions (used by institution-side upload flows) ──────

const PATTERNS = {
  CERTIFICATE_NUMBER: [
    /(?:certificate|cert|reg|registration)\s*(?:no|number|#|№)?[:\.\-\s]*([A-Za-z0-9\-\/]{4,50})/i,
    /certificate\s*no[:\.\-\s]*([A-Za-z0-9\-\/]{4,50})/i,
    /(?:serial|series)\s*(?:no|number)?[:\.\-\s]*([A-Za-z0-9\-\/]{4,50})/i,
    new RegExp(`(?:${PREFIX_PATTERN})[\\-\\/]?\\d{3,}[\\-\\/]?\\d{0,10}[A-Za-z0-9\\-]*`, 'i'),
    /([A-Z]{2,5}[\/\-]?\d{4,}[\/\-]?[A-Za-z0-9\-]{1,10})/,
  ],
  VERIFICATION_REFERENCE: [
    /(?:verification|verify|verif|ref|reference|pin)\s*(?:no|number|#|reference)?[:\.\-\s]*([A-Za-z0-9\-]{6,50})/i,
    new RegExp(`((?:${PREFIX_PATTERN})[A-Z]?\\-?\\d{2,}[\\-]?[A-Z0-9]{2,}[\\-]?[A-Z0-9]{2,})`, 'i'),
    /(V[A-Z0-9]{8,})/,
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
