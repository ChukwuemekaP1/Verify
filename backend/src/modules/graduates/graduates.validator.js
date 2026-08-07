import { z } from 'zod';

import { GRADUATE_LEVEL, GRADUATE_STATUS } from '../../models/graduate.model.js';

const emptyShape = z.object({}).strict();

const graduateIdParams = z.object({
  graduateId: z.string().trim().min(1),
});

export const listGraduatesSchema = z.object({
  params: emptyShape,
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().optional(),
    programme: z.string().trim().optional(),
    level: z.string().trim().optional(),
    graduationYear: z.string().trim().optional(),
    status: z.string().trim().optional(),
    matricNumber: z.string().trim().optional(),
    classification: z.string().trim().optional(),
  }),
  body: emptyShape,
});

export const graduateDetailSchema = z.object({
  params: graduateIdParams,
  query: emptyShape,
  body: emptyShape,
});

export const createGraduateSchema = z.object({
  params: emptyShape,
  query: emptyShape,
  body: z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    middleName: z.string().trim().max(100).optional(),
    matricNumber: z.string().trim().min(1).max(50),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().optional(),
    programme: z.string().trim().min(1).max(200),
    level: z.enum(Object.values(GRADUATE_LEVEL)).optional(),
    graduationYear: z.string().trim().min(4),
    graduationDate: z.coerce.date().optional(),
    classification: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(2000).optional(),
    status: z.enum(Object.values(GRADUATE_STATUS)).default(GRADUATE_STATUS.ACTIVE),
    institution: z.string().trim().min(1).optional(),
    dateOfBirth: z.coerce.date().optional(),
    nationalId: z.string().trim().optional(),
  }),
});

export const updateGraduateSchema = z.object({
  params: graduateIdParams,
  query: emptyShape,
  body: createGraduateSchema.shape.body
    .partial()
    .omit({ institution: true })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field must be updated',
    }),
});

export const archiveGraduateSchema = z.object({
  params: graduateIdParams,
  query: emptyShape,
  body: emptyShape,
});

export const unarchiveGraduateSchema = z.object({
  params: graduateIdParams,
  query: emptyShape,
  body: emptyShape,
});

export const deleteGraduateSchema = z.object({
  params: graduateIdParams,
  query: emptyShape,
  body: emptyShape,
});
