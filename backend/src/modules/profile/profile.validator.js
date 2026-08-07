import { z } from 'zod';

const emptyShape = z.object({}).strict();

export const getProfileSchema = z.object({
  params: emptyShape,
  query: emptyShape,
  body: emptyShape,
});

export const updateUserProfileSchema = z.object({
  params: emptyShape,
  query: emptyShape,
  body: z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    email: z.string().trim().email(),
  }),
});

export const updateInstitutionProfileSchema = z.object({
  params: emptyShape,
  query: emptyShape,
  body: z.object({
    name: z.string().trim().min(1).optional(),
    accreditationRef: z.string().trim().min(1).optional(),
    country: z.string().trim().min(1).optional(),
    publicContactEmail: z.string().trim().email().optional(),
    website: z.string().trim().url().optional(),
    about: z.string().trim().optional(),
  }),
});

export const updateProfilePasswordSchema = z.object({
  params: emptyShape,
  query: emptyShape,
  body: z.object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(12),
  }),
});
