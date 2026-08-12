import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { FormField } from '@/components/common/form-field';
import { SectionCard } from '@/components/common/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import type { Graduate } from '@/lib/api/contracts';
import { ApiError } from '@/lib/api/http-client';

const graduateFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  middleName: z.string().trim().max(100).optional().or(z.literal('')),
  matricNumber: z.string().trim().min(1, 'Matriculation number is required').max(50),
  email: z.string().trim().email('Please provide a valid email').optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  programme: z.string().trim().min(1, 'Programme is required').max(200),
  level: z.enum(['DIPLOMA', 'UNDERGRADUATE', 'POSTGRADUATE', 'DOCTORATE']).optional(),
  graduationYear: z.string().trim().min(4, 'Graduation year is required'),
  classification: z.string().trim().max(100).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  institution: z.string().trim().min(1).optional(),
  dateOfBirth: z.string().trim().optional().or(z.literal('')),
  nationalId: z.string().trim().optional().or(z.literal('')),
});

export type GraduateFormValues = z.infer<typeof graduateFormSchema>;

interface GraduateFormProps {
  heading: string;
  description?: string | undefined;
  submitLabel: string;
  onCancel?: ReactNode | undefined;
  footerNote?: string | undefined;
  mode?: 'create' | 'edit';
  initialValues?: Partial<GraduateFormValues>;
  graduateId?: string;
  onSuccessRedirectTo?: string;
}

export function GraduateForm({
  heading,
  description,
  submitLabel,
  onCancel,
  footerNote,
  mode = 'create',
  initialValues,
  graduateId,
  onSuccessRedirectTo,
}: GraduateFormProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<GraduateFormValues>({
    resolver: zodResolver(graduateFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      middleName: '',
      matricNumber: '',
      email: '',
      phone: '',
      programme: '',
      level: undefined,
      graduationYear: '',
      classification: '',
      notes: '',
      status: 'ACTIVE',
      institution: undefined,
      dateOfBirth: '',
      nationalId: '',
      ...initialValues,
    },
  });

  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
    }
  }, [initialValues, reset]);

  const selectedLevel = watch('level');
  const selectedStatus = watch('status');

  function setSelectValue(name: keyof GraduateFormValues, value: string) {
    setValue(name, value as never, { shouldDirty: true, shouldValidate: true });
  }

  async function onSubmit(values: GraduateFormValues) {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload: Record<string, unknown> = {
        firstName: values.firstName,
        lastName: values.lastName,
        middleName: values.middleName || undefined,
        matricNumber: values.matricNumber,
        email: values.email || undefined,
        phone: values.phone || undefined,
        programme: values.programme,
        level: values.level,
        graduationYear: values.graduationYear,
        classification: values.classification || undefined,
        notes: values.notes || undefined,
        status: values.status,
        dateOfBirth: values.dateOfBirth || undefined,
        nationalId: values.nationalId || undefined,
      };

      if (mode === 'create' && values.institution) {
        payload.institution = values.institution;
      }

      if (mode === 'create') {
        await api.graduates.create(payload);
        toast.success('Graduate record created successfully');
      } else {
        if (!graduateId) {
          throw new Error('Graduate ID required for edit mode');
        }
        await api.graduates.update(graduateId, payload);
        toast.success('Graduate record updated successfully');
      }

      if (onSuccessRedirectTo) {
        await navigate({ to: onSuccessRedirectTo });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
        toast.error(error.message);
      } else {
        const message = error instanceof Error ? error.message : 'Failed to save graduate record. Please try again.';
        setServerError(message);
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SectionCard title={heading} {...(description ? { description } : {})}>
      <form
        className="space-y-6"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        {serverError ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </div>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="first-name"
            label="First name"
            required
            error={errors.firstName?.message}
          >
            <Input
              id="first-name"
              autoComplete="given-name"
              disabled={isSubmitting}
              {...register('firstName')}
            />
          </FormField>
          <FormField
            id="last-name"
            label="Last name"
            required
            error={errors.lastName?.message}
          >
            <Input
              id="last-name"
              autoComplete="family-name"
              disabled={isSubmitting}
              {...register('lastName')}
            />
          </FormField>
          <FormField
            id="middle-name"
            label="Middle name"
            error={errors.middleName?.message}
          >
            <Input
              id="middle-name"
              disabled={isSubmitting}
              {...register('middleName')}
            />
          </FormField>
          <FormField
            id="matric"
            label="Matriculation number"
            required
            error={errors.matricNumber?.message}
          >
            <Input
              id="matric"
              className="font-mono"
              disabled={isSubmitting}
              {...register('matricNumber')}
            />
          </FormField>
          <FormField
            id="email"
            label="Email address"
            hint="Used for credential notifications"
            error={errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              disabled={isSubmitting}
              {...register('email')}
            />
          </FormField>
          <FormField
            id="phone"
            label="Phone number"
            error={errors.phone?.message}
          >
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              disabled={isSubmitting}
              {...register('phone')}
            />
          </FormField>
          <FormField
            id="programme"
            label="Programme"
            required
            error={errors.programme?.message}
            className="sm:col-span-2"
          >
            <Input
              id="programme"
              disabled={isSubmitting}
              {...register('programme')}
            />
          </FormField>
          <FormField
            id="level"
            label="Qualification level"
            error={errors.level?.message}
          >
            <Select
              value={selectedLevel}
              onValueChange={(value) => setSelectValue('level', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="level">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DIPLOMA">Diploma</SelectItem>
                <SelectItem value="UNDERGRADUATE">Undergraduate</SelectItem>
                <SelectItem value="POSTGRADUATE">Postgraduate</SelectItem>
                <SelectItem value="DOCTORATE">Doctorate</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            id="graduation-year"
            label="Graduation year"
            required
            error={errors.graduationYear?.message}
          >
            <Input
              id="graduation-year"
              inputMode="numeric"
              disabled={isSubmitting}
              {...register('graduationYear')}
            />
          </FormField>
          <FormField
            id="classification"
            label="Classification"
            error={errors.classification?.message}
          >
            <Input
              id="classification"
              disabled={isSubmitting}
              {...register('classification')}
            />
          </FormField>
          <FormField
            id="date-of-birth"
            label="Date of birth"
            error={errors.dateOfBirth?.message}
          >
            <Input
              id="date-of-birth"
              type="date"
              disabled={isSubmitting}
              {...register('dateOfBirth')}
            />
          </FormField>
          <FormField
            id="national-id"
            label="National ID / ID number"
            error={errors.nationalId?.message}
          >
            <Input
              id="national-id"
              disabled={isSubmitting}
              {...register('nationalId')}
            />
          </FormField>
          <FormField
            id="record-status"
            label="Record status"
            error={errors.status?.message}
          >
            <Select
              value={selectedStatus ?? 'ACTIVE'}
              onValueChange={(value) => setSelectValue('status', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="record-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <FormField
          id="notes"
          label="Internal notes"
          hint="Visible to institution staff only"
          error={errors.notes?.message}
        >
          <Textarea
            id="notes"
            rows={3}
            disabled={isSubmitting}
            {...register('notes')}
          />
        </FormField>

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
          {onCancel}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : submitLabel}
          </Button>
        </div>

        {footerNote ? <p className="text-xs text-muted-foreground">{footerNote}</p> : null}
      </form>
    </SectionCard>
  );
}

export function prepareGraduateFormValues(
  graduate: Graduate | null | undefined,
): Partial<GraduateFormValues> {
  if (!graduate) return {};
  return {
    firstName: graduate.firstName ?? '',
    lastName: graduate.lastName ?? '',
    middleName: graduate.middleName ?? '',
    matricNumber: graduate.matricNumber ?? '',
    email: graduate.email ?? '',
    phone: graduate.phone ?? '',
    programme: graduate.programme ?? '',
    level: graduate.level ?? undefined,
    graduationYear: graduate.graduationYear ?? '',
    classification: graduate.classification ?? '',
    notes: graduate.notes ?? '',
    status: graduate.status ?? 'ACTIVE',
    dateOfBirth: graduate.dateOfBirth ?? '',
    nationalId: graduate.nationalId ?? '',
    institution:
      typeof graduate.institution === 'object'
        ? graduate.institution._id
        : graduate.institution ?? undefined,
  };
}
