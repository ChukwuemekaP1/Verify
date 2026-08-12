import type { IntegrationPoint } from './contracts';

export const integrationPoints: IntegrationPoint[] = [
  {
    screen: 'Landing page reference checker',
    method: 'GET',
    endpoint: '/verifications/reference/:reference',
    purpose: 'Resolve the public verification reference entered on the marketing page.',
  },
  {
    screen: 'Login page',
    method: 'POST',
    endpoint: '/auth/login',
    purpose: 'Authenticate an institutional user.',
  },
  {
    screen: 'Forgot password page',
    method: 'POST',
    endpoint: '/auth/forgot-password',
    purpose: 'Start the password-reset flow.',
  },
  {
    screen: 'Profile and change password pages',
    method: 'PATCH',
    endpoint: '/profile/*',
    purpose: 'Update user profile, institution profile, and password.',
  },
  {
    screen: 'Graduate management pages',
    method: 'GET',
    endpoint: '/graduates and /graduates/:graduateId',
    purpose: 'Populate list, detail, and edit views for graduate records.',
  },
  {
    screen: 'Graduate archive/unarchive',
    method: 'PATCH',
    endpoint: '/graduates/:graduateId/archive and /graduates/:graduateId/unarchive',
    purpose: 'Soft-delete or restore graduate records without deletion.',
  },
  {
    screen: 'Graduate profile with certificates',
    method: 'GET',
    endpoint: '/graduates/:graduateId/profile',
    purpose: 'Load a graduate profile with their issued certificates and verification counts.',
  },
  {
    screen: 'Institution admin pages',
    method: 'GET',
    endpoint: '/institutions and /institutions/:institutionId',
    purpose: 'Drive institution list, detail, and edit screens.',
  },
  {
    screen: 'Certificate list and search pages',
    method: 'GET',
    endpoint: '/certificates and /certificates/:certificateId',
    purpose: 'Drive the certificate management list, filters and detail view.',
  },
  {
    screen: 'Certificate preview',
    method: 'GET',
    endpoint: '/certificates/:certificateId/preview',
    purpose: 'Return the preview document, graduate and institution metadata for the preview pane.',
  },
  {
    screen: 'Certificate upload and metadata intake',
    method: 'POST',
    endpoint: '/certificates/upload/metadata',
    purpose: 'Submit reviewed certificate metadata from the upload screen for processing.',
  },
  {
    screen: 'Certificate create/update/revoke',
    method: 'POST|PATCH',
    endpoint: '/certificates and /certificates/:certificateId/*',
    purpose: 'Create, edit, publish and revoke verifiable certificate records.',
  },
  {
    screen: 'Certificates linked to a graduate',
    method: 'GET',
    endpoint: '/certificates/graduate/:graduateId',
    purpose: 'List all certificates issued under a single graduate profile.',
  },
  {
    screen: 'Public verification page',
    method: 'POST',
    endpoint: '/verifications/public/*',
    purpose: 'Start verification by certificate number or document upload.',
  },
  {
    screen: 'Dashboard and verification history pages',
    method: 'GET',
    endpoint: '/verifications',
    purpose: 'Populate verification summaries, audit trails, and result pages.',
  },
];
