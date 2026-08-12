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
import type { Institution } from '@/lib/api/contracts';
import { ApiError } from '@/lib/api/http-client';

const institutionFormSchema = z.object({
  name: z.string().trim().min(1, 'Institution name is required').max(200),
  type: z.enum(['UNIVERSITY', 'COLLEGE', 'POLYTECHNIC', 'SECONDARY', 'VOCATIONAL', 'OTHER'], {
    message: 'Please select an institution type',
  }).optional(),
  accreditationRef: z.string().trim().min(1, 'Accreditation reference is required'),
  country: z.string().trim().min(1, 'Country is required').optional(),
  state: z.string().trim().optional(),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
  publicContactEmail: z.string().trim().email('Please provide a valid email'),
  website: z.string().trim().url('Please provide a valid URL').or(z.literal('')).optional(),
  about: z.string().trim().max(2000).optional(),
  logoUrl: z.string().trim().url('Please provide a valid URL').or(z.literal('')).optional(),
  verificationPrefix: z.string().trim().toUpperCase().max(10).optional(),
  adminEmail: z.string().trim().email('Please provide a valid email').optional().or(z.literal('')),
  adminFirstName: z.string().trim().min(1, 'Admin first name is required when creating admin').optional().or(z.literal('')),
  adminLastName: z.string().trim().min(1, 'Admin last name is required when creating admin').optional().or(z.literal('')),
  adminPassword: z.string().trim().min(12, 'Admin password must be at least 12 characters').optional().or(z.literal('')),
});

export type InstitutionFormValues = z.infer<typeof institutionFormSchema>;

interface InstitutionFormProps {
  heading: string;
  description?: string | undefined;
  submitLabel: string;
  onCancel?: ReactNode | undefined;
  mode?: 'create' | 'edit';
  initialValues?: Partial<InstitutionFormValues>;
  institutionId?: string;
  onSuccessRedirectTo?: string;
}

export function InstitutionForm({
  heading,
  description,
  submitLabel,
  onCancel,
  mode = 'create',
  initialValues,
  institutionId,
  onSuccessRedirectTo,
}: InstitutionFormProps) {
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
  } = useForm<InstitutionFormValues>({
    resolver: zodResolver(institutionFormSchema),
    defaultValues: {
      name: '',
      type: 'UNIVERSITY',
      accreditationRef: '',
      country: '',
      state: '',
      city: '',
      address: '',
      publicContactEmail: '',
      website: '',
      about: '',
      logoUrl: '',
      verificationPrefix: '',
      adminEmail: '',
      adminFirstName: '',
      adminLastName: '',
      adminPassword: '',
      ...initialValues,
    },
  });

  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
    }
  }, [initialValues, reset]);

  const selectedType = watch('type');

  function setSelectValue(name: keyof InstitutionFormValues, value: string) {
    setValue(name, value as never, { shouldDirty: true, shouldValidate: true });
  }

  async function onSubmit(values: InstitutionFormValues) {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload = {
        name: values.name,
        type: values.type,
        accreditationRef: values.accreditationRef,
        country: values.country || undefined,
        state: values.state || undefined,
        city: values.city || undefined,
        address: values.address || undefined,
        publicContactEmail: values.publicContactEmail,
        website: values.website || undefined,
        about: values.about || undefined,
        logoUrl: values.logoUrl || undefined,
        verificationPrefix: values.verificationPrefix || undefined,
      };

      if (mode === 'create') {
        if (values.adminEmail && values.adminFirstName && values.adminLastName) {
          (payload as Record<string, unknown>)['adminEmail'] = values.adminEmail;
          (payload as Record<string, unknown>)['adminFirstName'] = values.adminFirstName;
          (payload as Record<string, unknown>)['adminLastName'] = values.adminLastName;
          if (values.adminPassword) {
            (payload as Record<string, unknown>)['adminPassword'] = values.adminPassword;
          }
        }
        await api.institutions.create(payload as never);
        toast.success('Institution created successfully');
      } else {
        if (!institutionId) {
          throw new Error('Institution ID required for edit mode');
        }
        await api.institutions.update(institutionId, payload as never);
        toast.success('Institution updated successfully');
      }

      if (onSuccessRedirectTo) {
        await navigate({ to: onSuccessRedirectTo });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
        toast.error(error.message);
      } else {
        const message = error instanceof Error ? error.message : 'Failed to save institution. Please try again.';
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
            id="institution-name"
            label="Institution name"
            required
            error={errors.name?.message}
            className="sm:col-span-2"
          >
            <Input
              id="institution-name"
              autoComplete="organization"
              disabled={isSubmitting}
              {...register('name')}
            />
          </FormField>

          <FormField
            id="accreditation-ref"
            label="Accreditation reference"
            required
            error={errors.accreditationRef?.message}
          >
            <Input
              id="accreditation-ref"
              className="font-mono"
              disabled={isSubmitting}
              {...register('accreditationRef')}
            />
          </FormField>

          <FormField
            id="institution-type"
            label="Institution type"
            error={errors.type?.message}
          >
            <Select
              value={selectedType ?? ''}
              onValueChange={(value) => setSelectValue('type', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="institution-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNIVERSITY">University</SelectItem>
                <SelectItem value="COLLEGE">College</SelectItem>
                <SelectItem value="POLYTECHNIC">Polytechnic</SelectItem>
                <SelectItem value="SECONDARY">Secondary school</SelectItem>
                <SelectItem value="VOCATIONAL">Vocational</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            id="institution-country"
            label="Country"
            required
            error={errors.country?.message}
          >
            <Input
              id="institution-country"
              autoComplete="country-name"
              disabled={isSubmitting}
              {...register('country')}
            />
          </FormField>

          <FormField
            id="institution-state"
            label="State / Region"
            error={errors.state?.message}
          >
            <Input
              id="institution-state"
              autoComplete="address-level1"
              disabled={isSubmitting}
              {...register('state')}
            />
          </FormField>

          <FormField
            id="institution-city"
            label="City"
            error={errors.city?.message}
          >
            <Input
              id="institution-city"
              autoComplete="address-level2"
              disabled={isSubmitting}
              {...register('city')}
            />
          </FormField>

          <FormField
            id="institution-website"
            label="Website"
            error={errors.website?.message}
          >
            <Input
              id="institution-website"
              type="url"
              placeholder="https://"
              disabled={isSubmitting}
              {...register('website')}
            />
          </FormField>

          <FormField
            id="verification-prefix"
            label="Verification prefix"
            hint="Max 10 uppercase characters"
            error={errors.verificationPrefix?.message}
          >
            <Input
              id="verification-prefix"
              className="font-mono uppercase"
              disabled={isSubmitting}
              {...register('verificationPrefix')}
            />
          </FormField>

          <FormField
            id="contact-email"
            label="Contact email"
            required
            error={errors.publicContactEmail?.message}
          >
            <Input
              id="contact-email"
              type="email"
              disabled={isSubmitting}
              {...register('publicContactEmail')}
            />
          </FormField>

          <FormField
            id="logo-url"
            label="Logo URL"
            error={errors.logoUrl?.message}
            className="sm:col-span-2"
          >
            <Input
              id="logo-url"
              type="url"
              placeholder="https://…/logo.png"
              disabled={isSubmitting}
              {...register('logoUrl')}
            />
          </FormField>
        </div>

        <FormField
          id="institution-address"
          label="Registered address"
          error={errors.address?.message}
        >
          <Textarea
            id="institution-address"
            rows={3}
            disabled={isSubmitting}
            {...register('address')}
          />
        </FormField>

        <FormField
          id="institution-about"
          label="About"
          error={errors.about?.message}
        >
          <Textarea
            id="institution-about"
            rows={4}
            disabled={isSubmitting}
            {...register('about')}
          />
        </FormField>

        {mode === 'create' ? (
          <SectionCard
            title="Institution administrator"
            description="Optionally create the first admin user for this institution"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="admin-first-name"
                label="Admin first name"
                error={errors.adminFirstName?.message}
              >
                <Input
                  id="admin-first-name"
                  autoComplete="given-name"
                  disabled={isSubmitting}
                  {...register('adminFirstName')}
                />
              </FormField>
              <FormField
                id="admin-last-name"
                label="Admin last name"
                error={errors.adminLastName?.message}
              >
                <Input
                  id="admin-last-name"
                  autoComplete="family-name"
                  disabled={isSubmitting}
                  {...register('adminLastName')}
                />
              </FormField>
              <FormField
                id="admin-email"
                label="Admin email"
                error={errors.adminEmail?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  disabled={isSubmitting}
                  {...register('adminEmail')}
                />
              </FormField>
              <FormField
                id="admin-password"
                label="Temporary password"
                hint="Min 12 characters. User is forced to change on first sign-in."
                error={errors.adminPassword?.message}
                className="sm:col-span-2"
              >
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  {...register('adminPassword')}
                />
              </FormField>
            </div>
          </SectionCard>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
          {onCancel}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

export function prepareInstitutionFormValues(
  institution: Institution | null | undefined,
): Partial<InstitutionFormValues> {
  if (!institution) return {};
  return {
    name: institution.name ?? '',
    type: institution.type,
    accreditationRef: institution.accreditationRef ?? '',
    country: institution.country ?? '',
    state: institution.state ?? '',
    city: institution.city ?? '',
    address: institution.address ?? '',
    publicContactEmail: institution.publicContactEmail ?? '',
    website: institution.website ?? '',
    about: institution.about ?? '',
    logoUrl: institution.logoUrl ?? '',
    verificationPrefix: institution.verificationPrefix ?? '',
  };
}
