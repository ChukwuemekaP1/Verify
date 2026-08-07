import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

let isConfigured = false;

const PLACEHOLDER_PATTERNS = [
  /^your_/i,
  /^example/i,
  /^changeme/i,
  /^change_me/i,
  /^xxxxx+/i,
  /^<.*>$/,
  /placeholder/i,
  /^test$/i,
];

function looksPlaceholder(value) {
  if (!value) return true;
  const s = String(value).trim();
  if (!s) return true;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(s));
}

export function configureCloudinary() {
  if (isConfigured) return cloudinary;

  const nameOk = !looksPlaceholder(env.CLOUDINARY_CLOUD_NAME);
  const keyOk = !looksPlaceholder(env.CLOUDINARY_API_KEY);
  const secretOk = !looksPlaceholder(env.CLOUDINARY_API_SECRET);

  if (nameOk && keyOk && secretOk) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    isConfigured = true;
    logger.info('Cloudinary configured successfully');
  } else {
    logger.warn('Cloudinary credentials not found or placeholders; using fallback filesystem uploads');
  }

  return cloudinary;
}

export function isCloudinaryConfigured() {
  return isConfigured;
}

function createCloudinaryStorage(folder = env.CLOUDINARY_UPLOAD_FOLDER, params = {}) {
  return new CloudinaryStorage({
    cloudinary: configureCloudinary(),
    params: {
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
      transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
      ...params,
    },
  });
}

const DEFAULT_ALLOWED_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
];

function fileFilter(allowedMimes = DEFAULT_ALLOWED_MIMES) {
  return (_req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Allowed: ${allowedMimes.join(', ')}`,
        ),
      );
    }
  };
}

export function createUploadMiddleware({
  maxSizeMb = 10,
  fieldName = 'file',
  folder = env.CLOUDINARY_UPLOAD_FOLDER,
  allowedMimes = DEFAULT_ALLOWED_MIMES,
  storageParams = {},
} = {}) {
  let storage;
  if (isCloudinaryConfigured()) {
    storage = createCloudinaryStorage(folder, storageParams);
  } else {
    storage = multer.memoryStorage();
  }

  return multer({
    storage,
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
    fileFilter: fileFilter(allowedMimes),
  }).single(fieldName);
}

export async function uploadToCloudinary(fileBuffer, options = {}) {
  const cdn = configureCloudinary();
  if (!isCloudinaryConfigured()) {
    return {
      secure_url: `data:application/octet-stream;base64,${fileBuffer.toString('base64')}`,
      public_id: `fallback-${Date.now()}`,
      bytes: fileBuffer.length,
      format: options.format || 'bin',
      width: null,
      height: null,
    };
  }

  return new Promise((resolve, reject) => {
    const upload = cdn.uploader.upload_stream(
      {
        folder: env.CLOUDINARY_UPLOAD_FOLDER,
        resource_type: options.resource_type || 'auto',
        format: options.format,
        ...options,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    if (typeof fileBuffer === 'string') {
      cdn.uploader.upload(fileBuffer, options, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    } else {
      upload.end(fileBuffer);
    }
  });
}

export async function deleteFromCloudinary(publicId, options = {}) {
  const cdn = configureCloudinary();
  if (!isConfigured || !publicId || publicId.startsWith('fallback-')) {
    return { result: 'ok' };
  }
  try {
    return await cdn.uploader.destroy(publicId, options);
  } catch (err) {
    logger.warn({ err, publicId }, 'Failed to delete Cloudinary asset');
    return { result: 'failed' };
  }
}

export function extractCloudinaryPublicId(url) {
  if (!url) return null;
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.*?)(\.[^.]+)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
