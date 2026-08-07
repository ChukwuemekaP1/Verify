import { z } from 'zod';

const emptyShape = z.object({}).strict();

const passwordStrength = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const loginSchema = z.object({
  params: emptyShape,
  query: emptyShape,
  body: z.object({
    email: z.string().trim().email(),
    password: z.string().min(8),
    remember: z.boolean().optional(),
  }),
});

export const forgotPasswordSchema = z.object({
  params: emptyShape,
  query: emptyShape,
  body: z.object({
    email: z.string().trim().email(),
  }),
});

export const resetPasswordSchema = z.object({
  params: emptyShape,
  query: emptyShape,
  body: z.object({
    token: z.string().trim().min(1),
    newPassword: passwordStrength,
    confirmPassword: z.string().trim().min(1),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

export const changePasswordSchema = z.object({
  params: emptyShape,
  query: emptyShape,
  body: z.object({
    currentPassword: z.string().min(8),
    newPassword: passwordStrength,
  }),
});

export const seedSuperAdminSchema = z.object({
  params: emptyShape,
  query: emptyShape,
  body: z.object({}).strict().optional(),
});
