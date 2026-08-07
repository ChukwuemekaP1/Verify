import { z } from 'zod';

import { CERTIFICATE_STATUS, CERTIFICATE_TYPE, VERIFICATION_METHOD } from '../../models/certificate.model.js';

const emptyShape = z.object({}).strict();

const certificateIdParams = z.object({ certificateId: z.string().trim().min(1) });
const graduateIdParams = z.object({ graduateId: z.string().trim().min(1) });

export const listCertificatesSchema = z.object({
  params: emptyShape,
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().optional(),
    status: z.string().trim().optional(),
    type: z.string().trim().optional(),
    graduateId: z.string().trim().optional(),
    certificateNumber: z.string().trim().optional(),
    verificationReference: z.string().trim().optional(),
    classification: z.string().trim().optional(),
    issueDateFrom: z.string().trim().optional(),
    issueDateTo: z.string().trim().optional(),
  }),
  body: emptyShape,
});

export const certificateDetailSchema = z.object({
  params: certificateIdParams,
  query: emptyShape,
  body: emptyShape,
});

export const graduateCertificatesSchema = z.object({
  params: graduateIdParams,
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
    status: z.string().trim().optional(),
    type: z.string().trim().optional(),
  }),
  body: emptyShape,
});

export const createCertificateSchema = z.object({
  params: emptyShape,
  query: emptyShape,
  body: z.object({
    certificateNumber: z.string().trim().min(1).max(100),
    type: z.enum(Object.values(CERTIFICATE_TYPE)),
    status: z.enum(Object.values(CERTIFICATE_STATUS)).default(CERTIFICATE_STATUS.DRAFT),
    issueDate: z.coerce.date(),
    expiryDate: z.coerce.date().optional(),
    awardTitle: z.string().trim().min(1).max(300),
    programme: z.string().trim().max(200).optional(),
    classification: z.string().trim().max(100).optional(),
    honours: z.string().trim().max(100).optional(),
    gpa: z.string().trim().max(20).optional(),
    credits: z.string().trim().max(50).optional(),
    graduate: z.string().trim().min(1),
    institution: z.string().trim().min(1).optional(),
    issuedBy: z.string().trim().max(200).optional(),
    signatoryName: z.string().trim().max(200).optional(),
    signatoryTitle: z.string().trim().max(200).optional(),
    signatorySignatureUrl: z.string().trim().url().optional(),
    documentUrl: z.string().trim().url().optional(),
    documentMimeType: z.string().trim().optional(),
    documentSize: z.coerce.number().int().nonnegative().optional(),
    thumbnailUrl: z.string().trim().url().optional(),
    previewUrl: z.string().trim().url().optional(),
    verificationReference: z.string().trim().toUpperCase().max(100).optional(),
    verificationMethod: z.enum(Object.values(VERIFICATION_METHOD)).default(VERIFICATION_METHOD.BOTH),
    verificationQrCodeUrl: z.string().trim().url().optional(),
    verificationQrData: z.string().trim().optional(),
    verificationUrl: z.string().trim().url().optional(),
    ocrExtractionConfidence: z.coerce.number().min(0).max(100).optional(),
    ocrFieldsCorrected: z.coerce.number().int().nonnegative().optional(),
    ocrReviewedBy: z.string().trim().min(1).optional(),
    ocrReviewedAt: z.coerce.date().optional(),
    metadata: z.record(z.unknown()).optional(),
    notes: z.string().trim().max(2000).optional(),
  }),
});

export const uploadCertificateMetadataSchema = z.object({
  params: emptyShape,
  query: emptyShape,
  body: z.object({
    certificateNumber: z.string().trim().min(1).max(100).optional(),
    type: z.enum(Object.values(CERTIFICATE_TYPE)).optional(),
    status: z.enum(Object.values(CERTIFICATE_STATUS)).optional(),
    issueDate: z.coerce.date().optional(),
    awardTitle: z.string().trim().min(1).max(300).optional(),
    programme: z.string().trim().max(200).optional(),
    classification: z.string().trim().max(100).optional(),
    graduate: z.string().trim().min(1).optional(),
    institution: z.string().trim().min(1).optional(),
    documentUrl: z.string().trim().url().optional(),
    documentMimeType: z.string().trim().optional(),
    documentSize: z.coerce.number().int().nonnegative().optional(),
    thumbnailUrl: z.string().trim().url().optional(),
    previewUrl: z.string().trim().url().optional(),
    ocrExtractionConfidence: z.coerce.number().min(0).max(100).optional(),
    ocrFieldsCorrected: z.coerce.number().int().nonnegative().optional(),
    fileName: z.string().trim().max(500).optional(),
    originalFileName: z.string().trim().max(500).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const updateCertificateSchema = z.object({
  params: certificateIdParams,
  query: emptyShape,
  body: createCertificateSchema.shape.body
    .partial()
    .omit({ institution: true })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field must be updated',
    }),
});

export const publishCertificateSchema = z.object({
  params: certificateIdParams,
  query: emptyShape,
  body: emptyShape,
});

export const revokeCertificateSchema = z.object({
  params: certificateIdParams,
  query: emptyShape,
  body: z.object({
    reason: z.string().trim().max(500).optional(),
  }),
});

export const deleteCertificateSchema = z.object({
  params: certificateIdParams,
  query: emptyShape,
  body: emptyShape,
});
