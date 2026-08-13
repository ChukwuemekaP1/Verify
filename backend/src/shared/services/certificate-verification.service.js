import { Certificate, CERTIFICATE_STATUS } from '../../models/certificate.model.js';
import { Graduate } from '../../models/graduate.model.js';
import { AppError } from '../errors/app-error.js';

/**
 * Normalize a verification identifier for consistent lookup.
 * - Trims whitespace
 * - Collapses internal whitespace runs to a single space
 * - Uppercases (verification references are stored uppercase)
 */
function normalizeIdentifier(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Strip hyphens/spaces for certificate-number style lookups where
 * formatting differences (e.g. "UNN-CERT-0001-2026" vs "UNNCERT00012026")
 * should not prevent a match.
 */
function stripFormatting(value) {
  return value.replace(/[\s\-_/\\.]/g, '').toUpperCase();
}

/**
 * Attempt to find a PUBLISHED certificate by verificationReference.
 */
async function findByVerificationReference(normalized) {
  return Certificate.findOne({
    verificationReference: normalized,
    status: CERTIFICATE_STATUS.PUBLISHED,
  })
    .populate('graduate', 'firstName lastName middleName matricNumber email programme level graduationYear classification')
    .populate('institution', 'name type status logoUrl country city website publicContactEmail verificationPrefix')
    .lean()
    .exec();
}

/**
 * Attempt to find a PUBLISHED certificate by certificateNumber.
 * Tries exact match first, then a stripped-formatting match scoped
 * to avoid cross-institution collisions.
 */
async function findByCertificateNumber(normalized) {
  let cert = await Certificate.findOne({
    certificateNumber: normalized,
    status: CERTIFICATE_STATUS.PUBLISHED,
  })
    .populate('graduate', 'firstName lastName middleName matricNumber email programme level graduationYear classification')
    .populate('institution', 'name type status logoUrl country city website publicContactEmail verificationPrefix')
    .lean()
    .exec();

  if (cert) return cert;

  const stripped = stripFormatting(normalized);
  const candidates = await Certificate.find({
    status: CERTIFICATE_STATUS.PUBLISHED,
  })
    .populate('graduate', 'firstName lastName middleName matricNumber email programme level graduationYear classification')
    .populate('institution', 'name type status logoUrl country city website publicContactEmail verificationPrefix')
    .lean()
    .exec();

  cert = candidates.find(
    (c) => stripFormatting(c.certificateNumber) === stripped,
  );

  return cert || null;
}

/**
 * Attempt to find a PUBLISHED certificate by registration number
 * (graduate's matricNumber). Looks up the graduate first, then
 * finds their published certificate.
 */
async function findByRegistrationNumber(normalized) {
  const graduate = await Graduate.findOne({
    matricNumber: normalized,
  })
    .lean()
    .exec();

  if (!graduate) return null;

  const cert = await Certificate.findOne({
    graduate: graduate._id,
    status: CERTIFICATE_STATUS.PUBLISHED,
  })
    .populate('graduate', 'firstName lastName middleName matricNumber email programme level graduationYear classification')
    .populate('institution', 'name type status logoUrl country city website publicContactEmail verificationPrefix')
    .lean()
    .exec();

  return cert || null;
}

/**
 * Build the consistent public verification response from a certificate document.
 * Exposes only intended public information — no internal IDs, credentials, or secrets.
 */
function buildPublicResponse(certificate, lookupMethod) {
  const graduate = certificate.graduate || {};
  const institution = certificate.institution || {};

  const fullName = [graduate.firstName, graduate.middleName, graduate.lastName]
    .filter(Boolean)
    .join(' ');

  return {
    verified: true,
    lookupMethod,
    certificate: {
      certificateNumber: certificate.certificateNumber,
      verificationReference: certificate.verificationReference,
      type: certificate.type,
      status: certificate.status,
      awardTitle: certificate.awardTitle,
      programme: certificate.programme ?? null,
      classification: certificate.classification ?? null,
      issueDate: certificate.issueDate,
      expiryDate: certificate.expiryDate ?? null,
      documentUrl: certificate.documentUrl ?? null,
      previewUrl: certificate.previewUrl ?? certificate.thumbnailUrl ?? null,
      verificationQrCodeUrl: certificate.verificationQrCodeUrl ?? null,
      verificationUrl: certificate.verificationUrl ?? null,
      publishedAt: certificate.publishedAt ?? null,
    },
    graduate: {
      fullName: fullName || null,
      firstName: graduate.firstName ?? null,
      lastName: graduate.lastName ?? null,
      middleName: graduate.middleName ?? null,
      programme: graduate.programme ?? null,
      level: graduate.level ?? null,
      graduationYear: graduate.graduationYear ?? null,
      classification: graduate.classification ?? null,
      registrationNumber: graduate.matricNumber ?? null,
    },
    institution: {
      name: institution.name ?? null,
      type: institution.type ?? null,
      logoUrl: institution.logoUrl ?? null,
      country: institution.country ?? null,
      city: institution.city ?? null,
      website: institution.website ?? null,
      publicContactEmail: institution.publicContactEmail ?? null,
    },
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * Canonical verification service.
 *
 * verifyCertificate(identifier)
 *
 * 1. Normalizes the input
 * 2. Searches supported identifier fields (verification reference, certificate number, registration number)
 * 3. Validates certificate status
 * 4. Returns one consistent public verification response
 *
 * @param {string} identifier - verification reference, certificate number, or registration number
 * @returns {Promise<object>} consistent public verification response
 * @throws {AppError} 400 for empty/invalid input, 404 if not found
 */
export async function verifyCertificate(identifier) {
  const normalized = normalizeIdentifier(identifier);

  if (!normalized || normalized.length < 2) {
    throw AppError.badRequest('A valid verification identifier is required');
  }

  // 1. Try verification reference (most specific — unique field)
  const byRef = await findByVerificationReference(normalized);
  if (byRef) return buildPublicResponse(byRef, 'VERIFICATION_REFERENCE');

  // 2. Try certificate number
  const byCertNumber = await findByCertificateNumber(normalized);
  if (byCertNumber) return buildPublicResponse(byCertNumber, 'CERTIFICATE_NUMBER');

  // 3. Try registration number (graduate matricNumber)
  const byRegNumber = await findByRegistrationNumber(normalized);
  if (byRegNumber) return buildPublicResponse(byRegNumber, 'REGISTRATION_NUMBER');

  throw AppError.notFound('No verified certificate found for this identifier');
}

/**
 * Resolve a QR payload into a verification reference, then verify.
 * Accepts either a raw reference string or a JSON QR payload.
 */
export async function verifyFromQr(qrData) {
  if (!qrData || (typeof qrData !== 'string' && typeof qrData !== 'object')) {
    throw AppError.badRequest('QR data is required');
  }

  let reference = null;

  if (typeof qrData === 'string') {
    const trimmed = qrData.trim();

    // Try JSON parse first (structured QR payload)
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.ref) {
        reference = parsed.ref;
      }
    } catch {
      // Not JSON — try URL with ref= param
      const urlMatch = trimmed.match(/[?&]ref=([A-Za-z0-9_-]+)/i);
      if (urlMatch) {
        reference = decodeURIComponent(urlMatch[1]);
      } else {
        // Treat the entire string as a reference
        reference = trimmed;
      }
    }
  } else if (qrData.ref) {
    reference = qrData.ref;
  }

  if (!reference) {
    throw AppError.badRequest('Could not extract verification reference from QR data');
  }

  return verifyCertificate(reference);
}
