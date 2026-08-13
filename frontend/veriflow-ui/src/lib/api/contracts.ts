export interface ApiResponse<TData> {
  status: 'success' | 'error' | 'ok' | 'degraded';
  message?: string;
  data?: TData;
  code?: string;
  details?: unknown;
  requestId?: string;
}

export interface IntegrationPoint {
  screen: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  endpoint: string;
  purpose: string;
}

export type UserRole = 'SUPER_ADMIN' | 'INSTITUTION_ADMIN';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export type InstitutionType =
  | 'UNIVERSITY'
  | 'COLLEGE'
  | 'POLYTECHNIC'
  | 'SECONDARY'
  | 'VOCATIONAL'
  | 'OTHER';

export type InstitutionStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';

export interface InstitutionRef {
  _id: string;
  name: string;
  type?: InstitutionType;
  status?: InstitutionStatus;
  accreditationRef?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  publicContactEmail?: string | null;
  website?: string | null;
  about?: string | null;
  logoUrl?: string | null;
  verificationPrefix?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Institution extends Required<Omit<InstitutionRef, 'accreditationRef'>> {
  _id: string;
  name: string;
  type: InstitutionType;
  status: InstitutionStatus;
  accreditationRef: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  publicContactEmail: string | null;
  website: string | null;
  about: string | null;
  logoUrl: string | null;
  verificationPrefix: string | null;
  createdAt: string;
  updatedAt: string;
  adminCount?: number;
}

export type GraduateLevel = 'DIPLOMA' | 'UNDERGRADUATE' | 'POSTGRADUATE' | 'DOCTORATE';

export type GraduateStatus = 'ACTIVE' | 'ARCHIVED';

export interface GraduateInstitutionRef {
  _id: string;
  name: string;
  type: InstitutionType;
  status: InstitutionStatus;
}

export interface Graduate {
  _id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  fullName?: string;
  matricNumber: string;
  email?: string | null;
  phone?: string | null;
  programme: string;
  level?: GraduateLevel | null;
  graduationYear: string;
  graduationDate?: string | null;
  classification?: string | null;
  notes?: string | null;
  status: GraduateStatus;
  institution: string | GraduateInstitutionRef;
  dateOfBirth?: string | null;
  nationalId?: string | null;
  createdAt: string;
  updatedAt: string;
  certificateCount?: number;
}

export type CertificateType = 'DEGREE' | 'DIPLOMA' | 'TRANSCRIPT' | 'CERTIFICATE';

export type CertificateStatus =
  | 'DRAFT'
  | 'PROCESSING'
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'PUBLISHED'
  | 'REVOKED';

export type VerificationMethod = 'NONE' | 'QR' | 'REFERENCE' | 'BOTH';

export interface CertificateGraduateRef {
  _id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  matricNumber: string;
  email?: string | null;
  programme?: string | null;
  level?: GraduateLevel | null;
  graduationYear?: string | null;
  dateOfBirth?: string | null;
  nationalId?: string | null;
}

export interface CertificateInstitutionRef {
  _id: string;
  name: string;
  type: InstitutionType;
  status: InstitutionStatus;
  verificationPrefix?: string | null;
  logoUrl?: string | null;
  country?: string | null;
  city?: string | null;
  website?: string | null;
  publicContactEmail?: string | null;
}

export interface Certificate {
  _id: string;
  certificateNumber: string;
  type: CertificateType;
  status: CertificateStatus;
  issueDate: string;
  expiryDate?: string | null;
  awardTitle: string;
  programme?: string | null;
  classification?: string | null;
  honours?: string | null;
  gpa?: string | null;
  credits?: string | null;
  graduate: string | CertificateGraduateRef;
  institution: string | CertificateInstitutionRef;
  issuedBy?: string | null;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
  signatorySignatureUrl?: string | null;
  documentUrl?: string | null;
  documentMimeType?: string | null;
  documentSize?: number | null;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  verificationReference?: string | null;
  verificationMethod?: VerificationMethod;
  verificationQrCodeUrl?: string | null;
  verificationQrData?: string | null;
  verificationUrl?: string | null;
  ocrExtractionConfidence?: number | null;
  ocrFieldsCorrected?: number | null;
  ocrReviewedBy?: string | null;
  ocrReviewedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  notes?: string | null;
  publishedAt?: string | null;
  publishedBy?: string | null;
  revokedAt?: string | null;
  revokedBy?: string | null;
  revocationReason?: string | null;
  verificationCount?: number;
  lastVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<TItem> {
  items: TItem[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export interface AuthUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  institution: InstitutionRef | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  fullName?: string;
}

export interface LoginResponse {
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser;
}

export interface LogoutResponse {
  message: string;
}

export interface ForgotPasswordResponse {
  message: string;
  debug_token?: string;
  expiresAt?: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface ChangePasswordResponse {
  message: string;
  user?: AuthUser;
}

export interface InstitutionDetailResponse {
  institution: Institution;
  admin: AuthUser | null;
  adminCount: number;
}

export interface CreateInstitutionResponse {
  institution: Institution;
  admin: AuthUser | null;
}

export interface UpdateInstitutionResponse {
  institution: Institution;
}

export interface UpdateInstitutionStatusResponse {
  institution: Institution;
  previousStatus: InstitutionStatus;
  newStatus: InstitutionStatus;
}

export interface DeleteInstitutionResponse {
  deleted: boolean;
  institutionId: string;
  name: string;
}

export interface GraduateDetailResponse {
  graduate: Graduate;
}

export interface GraduateProfileResponse {
  graduate: Graduate;
  certificateCount: number;
  certificates: Certificate[];
}

export interface GraduateFiltersMetadataResponse {
  graduationYears: string[];
  programmes: string[];
  levels: GraduateLevel[];
  statuses: GraduateStatus[];
}

export interface CreateGraduateResponse {
  graduate: Graduate;
}

export interface UpdateGraduateResponse {
  graduate: Graduate;
}

export interface ArchiveGraduateResponse {
  graduate: Graduate;
  previousStatus: GraduateStatus;
  newStatus: GraduateStatus;
}

export interface DeleteGraduateResponse {
  deleted: boolean;
  graduateId: string;
  fullName: string;
  matricNumber: string;
}

export interface CertificateDetailResponse {
  certificate: Certificate;
}

export interface CertificatePreviewResponse {
  certificate: Certificate;
  preview: {
    certificateNumber: string;
    verificationReference: string | null;
    awardTitle: string;
    programme: string | null;
    classification: string | null;
    issueDate: string;
    expiryDate: string | null;
    documentUrl: string | null;
    previewUrl: string | null;
    thumbnailUrl: string | null;
    verificationQrCodeUrl: string | null;
    verificationUrl: string | null;
    status: CertificateStatus;
    type: CertificateType;
  };
  graduate: {
    firstName: string;
    lastName: string;
    middleName: string | null;
    fullName: string | null;
    matricNumber: string;
    email: string | null;
    programme: string | null;
    level: GraduateLevel | null;
    graduationYear: string | null;
    dateOfBirth: string | null;
  } | null;
  institution: {
    name: string;
    type: InstitutionType;
    status: InstitutionStatus;
    logoUrl: string | null;
    country: string | null;
    city: string | null;
    publicContactEmail: string | null;
    website: string | null;
    verificationPrefix: string | null;
  } | null;
}

export interface CertificateFiltersMetadataResponse {
  types: CertificateType[];
  statuses: CertificateStatus[];
  verificationMethods: VerificationMethod[];
}

export interface CreateCertificateResponse {
  certificate: Certificate;
}

export interface UpdateCertificateResponse {
  certificate: Certificate;
}

export interface PublishCertificateResponse {
  certificate: Certificate;
  previousStatus: CertificateStatus;
  newStatus: CertificateStatus;
}

export interface RevokeCertificateResponse {
  certificate: Certificate;
  previousStatus: CertificateStatus;
  newStatus: CertificateStatus;
  reason: string | null;
}

export interface DeleteCertificateResponse {
  deleted: boolean;
  certificateId: string;
  certificateNumber: string;
}

export interface UploadCertificateMetadataResponse {
  metadata: {
    uploadAccepted: boolean;
    institutionId: string;
    suggestedStatus: CertificateStatus;
    graduateLinked: boolean;
    documentMimeType: string | null;
    documentSize: number | null;
    ocrExtractionConfidence: number | null;
  };
}

export type VerificationStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'AUTHENTIC'
  | 'SUSPICIOUS'
  | 'INVALID'
  | 'NOT_FOUND'
  | 'ERROR';

export type VerificationMethodCode =
  | 'REFERENCE'
  | 'CERTIFICATE_NUMBER'
  | 'DOCUMENT_UPLOAD'
  | 'QR_CODE'
  | 'MANUAL';

export interface VerificationRecord {
  _id: string;
  verificationReference: string;
  method: VerificationMethodCode;
  status: VerificationStatus;
  confidenceScore: number;
  certificateMatchScore?: number | null;
  graduateMatchScore?: number | null;
  institutionMatchScore?: number | null;
  matchedFields?: Record<string, unknown>;
  mismatchedFields?: string[];
  missingFields?: string[];
  ocrConfidence?: number | null;
  uploadedDocumentUrl?: string | null;
  certificate?: string | Certificate | null;
  graduate?: string | Graduate | null;
  institution?: string | InstitutionRef | null;
  verifier?: string | AuthUser | null;
  verifierIp?: string | null;
  verifierUserAgent?: string | null;
  verifierNotes?: string | null;
  requestedFields?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface VerificationResult {
  verification: VerificationRecord;
  certificate?: {
    _id: string;
    certificateNumber: string;
    verificationReference?: string | null;
    type: CertificateType;
    status: CertificateStatus;
    awardTitle: string;
    programme?: string | null;
    classification?: string | null;
    issueDate: string;
    documentUrl?: string | null;
    verificationQrCodeUrl?: string | null;
    verificationUrl?: string | null;
  };
  graduate?: {
    _id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    fullName: string;
    matricNumber: string;
    programme?: string | null;
  };
  institution?: {
    _id: string;
    name: string;
    type: InstitutionType;
    status: InstitutionStatus;
    logoUrl?: string | null;
    country?: string | null;
    city?: string | null;
  };
  alternatives?: Array<{
    certificateId: string;
    certificateNumber: string;
    confidenceScore: number;
    status: VerificationStatus;
  }>;
  ocr?: {
    textSummary: string;
    confidence: number;
  };
  recentVerifications?: VerificationRecord[];
}

export interface ReferenceLookupResponse {
  verified: boolean;
  lookupMethod: 'CERTIFICATE_REFERENCE' | 'VERIFICATION_RECORD_REFERENCE';
  certificate?: Certificate & { verificationCount?: number };
  graduate?: {
    firstName: string;
    lastName: string;
    middleName?: string | null;
    fullName: string;
    matricNumber: string;
    programme?: string | null;
    level?: string | null;
    graduationYear?: string | null;
  };
  institution?: {
    _id: string;
    name: string;
    type: InstitutionType;
    status: InstitutionStatus;
    verificationPrefix?: string | null;
    logoUrl?: string | null;
    country?: string | null;
    city?: string | null;
    website?: string | null;
    publicContactEmail?: string | null;
  };
  verificationId?: string;
  verificationReference?: string;
  status?: VerificationStatus;
  confidenceScore?: number | null;
  completedAt?: string | null;
  recentVerifications?: VerificationRecord[];
  lookedUpAt: string;
  createdAt?: string;
}

export interface PublicVerifyResponse {
  verified: boolean;
  lookupMethod: 'VERIFICATION_REFERENCE' | 'CERTIFICATE_NUMBER' | 'REGISTRATION_NUMBER';
  certificate: {
    certificateNumber: string;
    verificationReference: string | null;
    type: CertificateType;
    status: CertificateStatus;
    awardTitle: string;
    programme: string | null;
    classification: string | null;
    issueDate: string;
    expiryDate: string | null;
    documentUrl: string | null;
    previewUrl: string | null;
    verificationQrCodeUrl: string | null;
    verificationUrl: string | null;
    publishedAt: string | null;
  };
  graduate: {
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
    middleName: string | null;
    programme: string | null;
    level: string | null;
    graduationYear: string | null;
    classification: string | null;
    registrationNumber: string | null;
  };
  institution: {
    name: string | null;
    type: InstitutionType | null;
    logoUrl: string | null;
    country: string | null;
    city: string | null;
    website: string | null;
    publicContactEmail: string | null;
  };
  verifiedAt: string;
}

export interface OcrVerifyResponse {
  verified: boolean;
  reason?: 'NO_TEXT' | 'NO_IDENTIFIER' | 'LOW_CONFIDENCE' | 'NOT_FOUND' | 'OCR_FAILED';
  message?: string;
  result?: PublicVerifyResponse;
  identifier?: {
    type: string;
    value: string;
    confidence: number;
  };
  ocrData?: {
    overallConfidence: number;
    charCount: number;
    wordCount?: number;
    rawTextPreview?: string;
    error?: string;
  };
}

export interface OcrUploadResponse {
  upload: {
    fileName: string;
    mimeType: string;
    size: number;
    documentUrl: string | null;
    cloudinaryId: string | null;
  };
  ocr: {
    rawText: string;
    overallConfidence: number;
    charCount: number;
    wordCount: number;
    durationMs: number;
    isPdf: boolean;
  } | null;
  extractedFields: Record<string, unknown>;
  normalizedFields: Record<string, unknown>;
  suggestedStatus: CertificateStatus;
  requestedAt?: string;
}

export interface CreateCertificateWithOcrResponse {
  certificate: Certificate;
  upload: OcrUploadResponse['upload'];
  ocrSummary?: {
    confidence: number;
    charCount: number;
    wordCount: number;
  } | null;
}

export interface CorrectCertificateResponse {
  certificate: Certificate;
  changesApplied: number;
}

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'PUBLISH'
  | 'REVOKE'
  | 'VERIFY'
  | 'CORRECT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'PROFILE_UPDATE'
  | 'INSTITUTION_UPDATE'
  | 'DOCUMENT_UPLOAD'
  | 'OCR_RUN'
  | 'QR_GENERATE'
  | 'STATUS_CHANGE'
  | 'EXPORT'
  | 'SEED'
  | 'MANUAL'
  | 'OTHER';

export type AuditEntity = 'USER' | 'INSTITUTION' | 'GRADUATE' | 'CERTIFICATE' | 'VERIFICATION' | 'PROFILE' | 'SYSTEM';

export type AuditSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditLog {
  _id: string;
  action: AuditAction;
  entityType: AuditEntity;
  entityId?: string | null;
  entityLabel?: string | null;
  severity: AuditSeverity;
  actor?: string | AuthUser | null;
  actorLabel?: string | null;
  actorRole?: string | null;
  institution?: string | InstitutionRef | null;
  changes?: Record<string, unknown>;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  success: boolean;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogStats {
  total: number;
  byAction: Record<string, number>;
  bySeverity: Record<string, number>;
  byEntity: Record<string, number>;
  successRate: number;
  last7Days: Array<{ date: string; count: number; errors: number }>;
}

export interface AuditLogsMetadata {
  actions: AuditAction[];
  entityTypes: AuditEntity[];
  severities: AuditSeverity[];
}

export interface DashboardAnalytics {
  scope: { isSuperAdmin: boolean; institutionId: string | null };
  graduates: { total: number; active: number; archived: number };
  certificates: {
    total: number;
    published: number;
    verified: number;
    pendingReview: number;
    processing: number;
    revoked: number;
    perStatus: Record<string, number>;
    verificationsIssued: number;
  };
  verifications: {
    total: number;
    authentic: number;
    suspicious: number;
    invalid: number;
    notFound: number;
    pending: number;
    error: number;
    last7Days: number;
    successRate: number;
    averageConfidence: number;
  };
  institutionCount?: number;
  recentVerifications: VerificationRecord[];
  verificationStatusBreakdown: Record<string, number>;
  verificationMethodBreakdown: Record<string, number>;
  trend: {
    certificates: Array<{ month: string; label: string; count: number }>;
    verifications: Array<{ month: string; label: string; count: number }>;
    graduates: Array<{ month: string; label: string; count: number }>;
  };
  topProgrammes: Array<{ programme: string; count: number }>;
  topInstitutions?: Array<{
    institution: Institution | null;
    certificateCount: number;
    verificationCount: number;
  }>;
  generatedAt: string;
}

export interface SystemStatistics {
  institutions: {
    total: number;
    active: number;
    pending: number;
    inactive: number;
    suspended: number;
  };
  users: {
    total: number;
    roles: Record<string, number>;
    statuses: Record<string, number>;
    last30DaysActive: number;
  };
  auditLogs: number;
  database?: {
    dataSizeBytes?: number;
    storageSizeBytes?: number;
    indexSizeBytes?: number;
    objects?: number;
    collections?: number;
    indexes?: number;
    avgObjectSizeBytes?: number;
    error?: string;
  };
  storage?: {
    totalBytes: number;
    collections: Array<{ name: string; sizeBytes: number; count: number }>;
  } | null;
  generatedAt: string;
}

export interface PublicStatistics {
  totalPublishedCertificates: number;
  totalVerifications: number;
  authenticVerifications: number;
  participatingInstitutions: number;
  verificationSuccessRate: number;
  generatedAt: string;
}

export interface VerificationMetadataResponse {
  statuses: VerificationStatus[];
  methods: VerificationMethodCode[];
}

export interface ManualVerifyResponse {
  verification: VerificationRecord;
  manuallyOverridden: boolean;
}
