import { z } from 'zod';

import { INSTITUTION_STATUS, INSTITUTION_TYPE } from '../../models/institution.model.js';

const emptyShape = z.object({}).strict();

const institutionIdParams = z.object({ institutionId: z.string().trim().min(1) });

export const listInstitutionsSchema = z.object({
  params: emptyShape,
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().optional(),
    type: z.string().trim().optional(),
    status: z.string().trim().optional(),
    country: z.string().trim().optional(),
  }),
  body: emptyShape,
});

export const institutionDetailSchema = z.object({
  params: institutionIdParams,
  query: emptyShape,
  body: emptyShape,
});

export const createInstitutionSchema = z.object({
  params: emptyShape,
  query: emptyShape,
  body: z.object({
    name: z.string().trim().min(1).max(200),
    type: z.enum(Object.values(INSTITUTION_TYPE)).default(INSTITUTION_TYPE.UNIVERSITY),
    accreditationRef: z.string().trim().min(1),
    country: z.string().trim().min(1).optional(),
    state: z.string().trim().optional(),
    city: z.string().trim().optional(),
    address: z.string().trim().optional(),
    publicContactEmail: z.string().trim().email(),
    website: z.string().trim().url().optional().or(z.literal('')),
    about: z.string().trim().max(2000).optional(),
    logoUrl: z.string().trim().url().optional().or(z.literal('')),
    status: z.enum(Object.values(INSTITUTION_STATUS)).default(INSTITUTION_STATUS.PENDING),
    verificationPrefix: z.string().trim().toUpperCase().max(10).optional(),
    adminEmail: z.string().trim().email().optional(),
    adminFirstName: z.string().trim().min(1).optional(),
    adminLastName: z.string().trim().min(1).optional(),
    adminPassword: z.string().trim().min(12).optional(),
  }),
});

export const updateInstitutionSchema = z.object({
  params: institutionIdParams,
  query: emptyShape,
  body: createInstitutionSchema.shape.body
    .partial()
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field must be updated',
    }),
});

export const updateInstitutionStatusSchema = z.object({
  params: institutionIdParams,
  query: emptyShape,
  body: z.object({
    status: z.enum(Object.values(INSTITUTION_STATUS)),
    reason: z.string().trim().min(1).optional(),
  }),
});

export const deleteInstitutionSchema = z.object({
  params: institutionIdParams,
  query: emptyShape,
  body: emptyShape,
});
