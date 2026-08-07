import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

import { env } from '../../config/env.js';
import { uploadToCloudinary, isCloudinaryConfigured } from './cloudinary.service.js';

function buildVerificationUrl(verificationReference) {
  const base = env.PUBLIC_VERIFY_BASE_URL.replace(/\/$/, '');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}ref=${encodeURIComponent(verificationReference)}`;
}

function buildQrPayload(verificationReference, certificateNumber, institutionName) {
  return JSON.stringify({
    v: 1,
    ref: verificationReference,
    certNo: certificateNumber || null,
    inst: institutionName || null,
    url: buildVerificationUrl(verificationReference),
    iat: Date.now(),
  });
}

export async function generateQrCodeDataUrl(verificationReference, options = {}) {
  const payload = options.payload || buildVerificationUrl(verificationReference);
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: options.width || 512,
    color: {
      dark: options.darkColor || '#0f172a',
      light: options.lightColor || '#ffffff',
    },
  });
}

export async function generateQrCodeBuffer(verificationReference, options = {}) {
  const payload = options.payload || buildVerificationUrl(verificationReference);
  return QRCode.toBuffer(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: options.width || 512,
    color: {
      dark: options.darkColor || '#0f172a',
      light: options.lightColor || '#ffffff',
    },
    type: 'png',
  });
}

export async function generateQrCodeFile(verificationReference, {
  certificateNumber,
  institutionName,
  folder = `${env.CLOUDINARY_UPLOAD_FOLDER}/qrcodes`,
} = {}) {
  const payload = buildQrPayload(verificationReference, certificateNumber, institutionName);
  const dataUrl = await generateQrCodeDataUrl(verificationReference, { payload });
  const base64Data = dataUrl.split(',')[1];
  const buffer = Buffer.from(base64Data, 'base64');

  let qrCodeUrl = dataUrl;
  let qrPublicId = `qr-${verificationReference}`;

  if (isCloudinaryConfigured()) {
    try {
      const upload = await uploadToCloudinary(buffer, {
        folder,
        public_id: qrPublicId,
        format: 'png',
        resource_type: 'image',
      });
      if (upload?.secure_url) {
        qrCodeUrl = upload.secure_url;
        qrPublicId = upload.public_id || qrPublicId;
      }
    } catch (_err) {
      // Fall back to data URL
    }
  }

  return {
    verificationReference,
    verificationUrl: buildVerificationUrl(verificationReference),
    qrCodeUrl,
    qrPublicId,
    qrPayload: payload,
    qrDownloadName: `verification-qr-${verificationReference}.png`,
  };
}

export function parseQrPayload(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.ref) {
      return { ok: true, data: parsed };
    }
    return { ok: false, data: null };
  } catch {
    return { ok: false, data: null };
  }
}

export function buildVerificationQrId() {
  return `QR-${uuidv4().replace(/-/g, '').slice(0, 20).toUpperCase()}`;
}
