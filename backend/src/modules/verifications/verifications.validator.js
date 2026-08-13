import { z } from 'zod';

const verificationIdParams = z.object({ verificationId: z.string().trim().min(1) });
const referenceParams = z.object({ reference: z.string().trim().min(1) });

export const listVerificationsSchema = z.object({
  params: z.object({}).strict(),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.string().trim().optional(),
    search: z.string().trim().optional(),
  }),
  body: z.object({}).strict(),
});

export const verificationDetailSchema = z.object({
  params: verificationIdParams,
  query: z.object({}).strict(),
  body: z.object({}).strict(),
});

export const referenceLookupSchema = z.object({
  params: referenceParams,
  query: z.object({}).strict(),
  body: z.object({}).strict(),
});

export const verifyByNumberSchema = z.object({
  params: z.object({}).strict(),
  query: z.object({}).strict(),
  body: z.object({
    certificateNumber: z.string().trim().min(1),
    surname: z.string().trim().optional(),
    firstName: z.string().trim().optional(),
    matricNumber: z.string().trim().optional(),
    institutionId: z.string().trim().optional(),
    awardTitle: z.string().trim().optional(),
    programme: z.string().trim().optional(),
  }).passthrough(),
});

export const verifyByUploadSchema = z.object({
  params: z.object({}).strict(),
  query: z.object({}).strict(),
  body: z.object({
    fileName: z.string().trim().optional(),
    mimeType: z.string().trim().optional(),
    size: z.coerce.number().positive().optional(),
    surname: z.string().trim().optional(),
    matricNumber: z.string().trim().optional(),
    institutionId: z.string().trim().optional(),
  }).passthrough(),
});

export const publicVerifySchema = z.object({
  params: z.object({}).strict(),
  query: z.object({}).strict(),
  body: z.object({
    identifier: z.string().trim().min(2, 'Identifier must be at least 2 characters'),
  }),
});
