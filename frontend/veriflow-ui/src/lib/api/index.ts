import { apiEndpoints } from './endpoints';
import { httpClient } from './http-client';
import type {
  ArchiveGraduateResponse,
  AuditLog,
  AuditLogStats,
  AuditLogsMetadata,
  Certificate,
  CertificateDetailResponse,
  CertificateFiltersMetadataResponse,
  CertificatePreviewResponse,
  CertificateStatus,
  CertificateType,
  ChangePasswordResponse,
  CorrectCertificateResponse,
  CreateCertificateResponse,
  CreateCertificateWithOcrResponse,
  CreateGraduateResponse,
  CreateInstitutionResponse,
  DashboardAnalytics,
  DeleteCertificateResponse,
  DeleteGraduateResponse,
  DeleteInstitutionResponse,
  ForgotPasswordResponse,
  Graduate,
  GraduateDetailResponse,
  GraduateFiltersMetadataResponse,
  GraduateProfileResponse,
  Institution,
  InstitutionDetailResponse,
  LoginResponse,
  LogoutResponse,
  ManualVerifyResponse,
  MeResponse,
  OcrUploadResponse,
  PaginatedResponse,
  PublicStatistics,
  PublishCertificateResponse,
  ReferenceLookupResponse,
  ResetPasswordResponse,
  RevokeCertificateResponse,
  SystemStatistics,
  UpdateCertificateResponse,
  UpdateGraduateResponse,
  UpdateInstitutionResponse,
  UpdateInstitutionStatusResponse,
  UploadCertificateMetadataResponse,
  VerificationMetadataResponse,
  VerificationRecord,
  VerificationResult,
  VerificationStatus,
} from './contracts';

type QueryString = Record<string, string | number | boolean | undefined | null>;

function buildQuery(params: QueryString): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.append(key, String(value));
  }
  const result = search.toString();
  return result ? `?${result}` : '';
}

export const api = {
  health: {
    get: () => httpClient.get(apiEndpoints.health),
  },
  auth: {
    login: (payload: { email: string; password: string; remember?: boolean }) =>
      httpClient.post<LoginResponse>(apiEndpoints.auth.login, payload),
    refresh: () => httpClient.post<LoginResponse>(apiEndpoints.auth.refresh),
    me: () => httpClient.get<MeResponse>(apiEndpoints.auth.me),
    logout: () => httpClient.post<LogoutResponse>(apiEndpoints.auth.logout),
    forgotPassword: (payload: { email: string }) =>
      httpClient.post<ForgotPasswordResponse>(apiEndpoints.auth.forgotPassword, payload),
    resetPassword: (payload: { token: string; newPassword: string; confirmPassword: string }) =>
      httpClient.post<ResetPasswordResponse>(apiEndpoints.auth.resetPassword, payload),
    changePassword: (payload: { currentPassword: string; newPassword: string }) =>
      httpClient.post<ChangePasswordResponse>(apiEndpoints.auth.changePassword, payload),
    seedSuperAdmin: () => httpClient.post(apiEndpoints.auth.seedSuperAdmin),
  },
  graduates: {
    list: (params: QueryString = {}) =>
      httpClient.get<PaginatedResponse<Graduate>>(
        `${apiEndpoints.graduates.list}${buildQuery(params)}`,
      ),
    filtersMetadata: () =>
      httpClient.get<GraduateFiltersMetadataResponse>(apiEndpoints.graduates.filtersMetadata),
    detail: (graduateId: string) =>
      httpClient.get<GraduateDetailResponse>(apiEndpoints.graduates.detail(graduateId)),
    profile: (graduateId: string) =>
      httpClient.get<GraduateProfileResponse>(apiEndpoints.graduates.profile(graduateId)),
    create: (payload: {
      firstName: string;
      lastName: string;
      middleName?: string;
      matricNumber: string;
      email?: string;
      phone?: string;
      programme: string;
      level?: string;
      graduationYear: string;
      graduationDate?: string;
      classification?: string;
      notes?: string;
      status?: string;
      institution?: string;
      dateOfBirth?: string;
      nationalId?: string;
    }) => httpClient.post<CreateGraduateResponse>(apiEndpoints.graduates.create, payload),
    update: (
      graduateId: string,
      payload: Partial<{
        firstName: string;
        lastName: string;
        middleName: string;
        matricNumber: string;
        email: string;
        phone: string;
        programme: string;
        level: string;
        graduationYear: string;
        graduationDate: string;
        classification: string;
        notes: string;
        status: string;
        dateOfBirth: string;
        nationalId: string;
      }>,
    ) => httpClient.patch<UpdateGraduateResponse>(apiEndpoints.graduates.update(graduateId), payload),
    archive: (graduateId: string) =>
      httpClient.patch<ArchiveGraduateResponse>(apiEndpoints.graduates.archive(graduateId)),
    unarchive: (graduateId: string) =>
      httpClient.patch<ArchiveGraduateResponse>(apiEndpoints.graduates.unarchive(graduateId)),
    remove: (graduateId: string) =>
      httpClient.delete<DeleteGraduateResponse>(apiEndpoints.graduates.remove(graduateId)),
    certificates: (graduateId: string, params: QueryString = {}) =>
      httpClient.get<PaginatedResponse<Certificate>>(
        `${apiEndpoints.graduates.certificates(graduateId)}${buildQuery(params)}`,
      ),
  },
  institutions: {
    list: (params: QueryString = {}) =>
      httpClient.get<PaginatedResponse<Institution>>(
        `${apiEndpoints.institutions.list}${buildQuery(params)}`,
      ),
    detail: (institutionId: string) =>
      httpClient.get<InstitutionDetailResponse>(apiEndpoints.institutions.detail(institutionId)),
    create: (payload: {
      name: string;
      type?: string;
      accreditationRef: string;
      country?: string;
      state?: string;
      city?: string;
      address?: string;
      publicContactEmail: string;
      website?: string;
      about?: string;
      logoUrl?: string;
      status?: string;
      verificationPrefix?: string;
      adminEmail?: string;
      adminFirstName?: string;
      adminLastName?: string;
      adminPassword?: string;
    }) =>
      httpClient.post<CreateInstitutionResponse>(apiEndpoints.institutions.create, payload),
    update: (
      institutionId: string,
      payload: Partial<{
        name: string;
        type: string;
        accreditationRef: string;
        country: string;
        state: string;
        city: string;
        address: string;
        publicContactEmail: string;
        website: string;
        about: string;
        logoUrl: string;
        status: string;
        verificationPrefix: string;
      }>,
    ) =>
      httpClient.patch<UpdateInstitutionResponse>(
        apiEndpoints.institutions.update(institutionId),
        payload,
      ),
    updateStatus: (institutionId: string, payload: { status: string; reason?: string }) =>
      httpClient.patch<UpdateInstitutionStatusResponse>(
        apiEndpoints.institutions.updateStatus(institutionId),
        payload,
      ),
    remove: (institutionId: string) =>
      httpClient.delete<DeleteInstitutionResponse>(apiEndpoints.institutions.remove(institutionId)),
  },
  certificates: {
    list: (params: QueryString = {}) =>
      httpClient.get<PaginatedResponse<Certificate>>(
        `${apiEndpoints.certificates.list}${buildQuery(params)}`,
      ),
    filtersMetadata: () =>
      httpClient.get<CertificateFiltersMetadataResponse>(apiEndpoints.certificates.filtersMetadata),
    detail: (certificateId: string) =>
      httpClient.get<CertificateDetailResponse>(apiEndpoints.certificates.detail(certificateId)),
    preview: (certificateId: string) =>
      httpClient.get<CertificatePreviewResponse>(apiEndpoints.certificates.preview(certificateId)),
    create: (payload: {
      certificateNumber: string;
      type: CertificateType;
      status?: CertificateStatus;
      issueDate: string;
      expiryDate?: string;
      awardTitle: string;
      programme?: string;
      classification?: string;
      honours?: string;
      gpa?: string;
      credits?: string;
      graduate: string;
      institution?: string;
      issuedBy?: string;
      signatoryName?: string;
      signatoryTitle?: string;
      signatorySignatureUrl?: string;
      documentUrl?: string;
      documentMimeType?: string;
      documentSize?: number;
      thumbnailUrl?: string;
      previewUrl?: string;
      verificationReference?: string;
      verificationMethod?: string;
      verificationQrCodeUrl?: string;
      verificationQrData?: string;
      verificationUrl?: string;
      ocrExtractionConfidence?: number;
      ocrFieldsCorrected?: number;
      ocrReviewedBy?: string;
      ocrReviewedAt?: string;
      metadata?: Record<string, unknown>;
      notes?: string;
    }) => httpClient.post<CreateCertificateResponse>(apiEndpoints.certificates.create, payload),
    uploadMetadata: (payload: {
      certificateNumber?: string;
      type?: CertificateType;
      status?: CertificateStatus;
      issueDate?: string;
      awardTitle?: string;
      programme?: string;
      classification?: string;
      graduate?: string;
      institution?: string;
      documentUrl?: string;
      documentMimeType?: string;
      documentSize?: number;
      thumbnailUrl?: string;
      previewUrl?: string;
      ocrExtractionConfidence?: number;
      ocrFieldsCorrected?: number;
      fileName?: string;
      originalFileName?: string;
      metadata?: Record<string, unknown>;
    }) =>
      httpClient.post<UploadCertificateMetadataResponse>(
        apiEndpoints.certificates.uploadMetadata,
        payload,
      ),
    update: (
      certificateId: string,
      payload: Partial<{
        certificateNumber: string;
        type: CertificateType;
        status: CertificateStatus;
        issueDate: string;
        expiryDate: string;
        awardTitle: string;
        programme: string;
        classification: string;
        honours: string;
        gpa: string;
        credits: string;
        graduate: string;
        issuedBy: string;
        signatoryName: string;
        signatoryTitle: string;
        signatorySignatureUrl: string;
        documentUrl: string;
        documentMimeType: string;
        documentSize: number;
        thumbnailUrl: string;
        previewUrl: string;
        verificationReference: string;
        verificationMethod: string;
        verificationQrCodeUrl: string;
        verificationQrData: string;
        verificationUrl: string;
        ocrExtractionConfidence: number;
        ocrFieldsCorrected: number;
        ocrReviewedBy: string;
        ocrReviewedAt: string;
        metadata: Record<string, unknown>;
        notes: string;
      }>,
    ) =>
      httpClient.patch<UpdateCertificateResponse>(
        apiEndpoints.certificates.update(certificateId),
        payload,
      ),
    publish: (certificateId: string) =>
      httpClient.patch<PublishCertificateResponse>(apiEndpoints.certificates.publish(certificateId)),
    revoke: (certificateId: string, payload: { reason?: string }) =>
      httpClient.patch<RevokeCertificateResponse>(
        apiEndpoints.certificates.revoke(certificateId),
        payload,
      ),
    remove: (certificateId: string) =>
      httpClient.delete<DeleteCertificateResponse>(apiEndpoints.certificates.remove(certificateId)),
    byGraduate: (graduateId: string, params: QueryString = {}) =>
      httpClient.get<PaginatedResponse<Certificate>>(
        `${apiEndpoints.certificates.byGraduate(graduateId)}${buildQuery(params)}`,
      ),
  },
  verifications: {
    list: (params: QueryString = {}) =>
      httpClient.get<PaginatedResponse<VerificationRecord>>(
        `${apiEndpoints.verifications.list}${buildQuery(params)}`,
      ),
    detail: (verificationId: string) =>
      httpClient.get<{ verification: VerificationRecord }>(
        apiEndpoints.verifications.detail(verificationId),
      ),
    lookupReference: (reference: string) =>
      httpClient.get<ReferenceLookupResponse>(apiEndpoints.verifications.lookupReference(reference)),
    verifyByNumber: (payload: {
      certificateNumber: string;
      surname?: string;
      firstName?: string;
      matricNumber?: string;
      institutionId?: string;
      awardTitle?: string;
      programme?: string;
    }) => httpClient.post<VerificationResult>(apiEndpoints.verifications.verifyByNumber, payload),
    verifyByUpload: (file: File, extraFields?: { surname?: string; matricNumber?: string; institutionId?: string }) =>
      httpClient.upload<VerificationResult>(apiEndpoints.verifications.verifyByUpload, file, extraFields),
    verifyByQr: (payload: { qrData?: string; reference?: string; fileName?: string }, file?: File) => {
      if (file) {
        return httpClient.upload<VerificationResult>(
          apiEndpoints.verifications.verifyByQr,
          file,
          payload,
        );
      }
      return httpClient.post<VerificationResult>(apiEndpoints.verifications.verifyByQr, payload);
    },
    metadata: () =>
      httpClient.get<VerificationMetadataResponse>(apiEndpoints.verifications.metadata),
    manual: (
      verificationId: string,
      payload: {
        status: VerificationStatus;
        overrideConfidence?: number;
        verifierNotes?: string;
        matchedFields?: Record<string, unknown>;
        mismatchedFields?: string[];
        missingFields?: string[];
      },
    ) =>
      httpClient.patch<ManualVerifyResponse>(
        apiEndpoints.verifications.manual(verificationId),
        payload,
      ),
    byCertificate: (certificateId: string, params: QueryString = {}) =>
      httpClient.get<PaginatedResponse<VerificationRecord>>(
        `${apiEndpoints.verifications.byCertificate(certificateId)}${buildQuery(params)}`,
      ),
    byGraduate: (graduateId: string, params: QueryString = {}) =>
      httpClient.get<PaginatedResponse<VerificationRecord>>(
        `${apiEndpoints.verifications.byGraduate(graduateId)}${buildQuery(params)}`,
      ),
  },
  uploads: {
    publicVerify: (file: File) =>
      httpClient.upload<OcrUploadResponse>(apiEndpoints.uploads.publicVerify, file),
    certificateOcr: (file: File) =>
      httpClient.upload<OcrUploadResponse>(apiEndpoints.uploads.certificateOcr, file),
    certificateReOcr: (certificateId: string, file: File) =>
      httpClient.upload<OcrUploadResponse>(
        apiEndpoints.uploads.certificateReOcr(certificateId),
        file,
      ),
    certificateCreate: (file: File, extraFields?: Record<string, unknown>) =>
      httpClient.upload<CreateCertificateWithOcrResponse>(
        apiEndpoints.uploads.certificateCreate,
        file,
        extraFields,
      ),
    graduateCertificate: (graduateId: string, file: File, extraFields?: Record<string, unknown>) =>
      httpClient.upload<CreateCertificateWithOcrResponse>(
        apiEndpoints.uploads.graduateCertificate(graduateId),
        file,
        extraFields,
      ),
    certificateCorrect: (
      certificateId: string,
      payload: Record<string, unknown>,
      file?: File,
    ) => {
      if (file) {
        return httpClient.uploadPatch<CorrectCertificateResponse>(
          apiEndpoints.uploads.certificateCorrect(certificateId),
          file,
          payload,
        );
      }
      return httpClient.patch<CorrectCertificateResponse>(
        apiEndpoints.uploads.certificateCorrect(certificateId),
        payload,
      );
    },
    certificateRegenerateQr: (certificateId: string) =>
      httpClient.post<{ certificate: Certificate }>(
        apiEndpoints.uploads.certificateRegenerateQr(certificateId),
      ),
    document: (file: File) =>
      httpClient.upload<{ upload: OcrUploadResponse['upload'] }>(apiEndpoints.uploads.document, file),
  },
  auditLogs: {
    list: (params: QueryString = {}) =>
      httpClient.get<PaginatedResponse<AuditLog>>(
        `${apiEndpoints.auditLogs.list}${buildQuery(params)}`,
      ),
    metadata: () =>
      httpClient.get<AuditLogsMetadata>(apiEndpoints.auditLogs.metadata),
    stats: () => httpClient.get<AuditLogStats>(apiEndpoints.auditLogs.stats),
    export: (params: QueryString = {}) =>
      httpClient.get<{ count: number; exportedAt: string; format: string; items: AuditLog[] }>(
        `${apiEndpoints.auditLogs.export}${buildQuery(params)}`,
      ),
    detail: (auditLogId: string) =>
      httpClient.get<{ auditLog: AuditLog }>(apiEndpoints.auditLogs.detail(auditLogId)),
    entity: (entityType: string, entityId: string, params: QueryString = {}) =>
      httpClient.get<PaginatedResponse<AuditLog>>(
        `${apiEndpoints.auditLogs.entity(entityType, entityId)}${buildQuery(params)}`,
      ),
  },
  analytics: {
    dashboard: () => httpClient.get<DashboardAnalytics>(apiEndpoints.analytics.dashboard),
    system: () => httpClient.get<SystemStatistics>(apiEndpoints.analytics.system),
    publicStats: () => httpClient.get<PublicStatistics>(apiEndpoints.analytics.publicStats),
  },
  profile: {
    get: () => httpClient.get(apiEndpoints.profile.get),
    updateUser: (payload: { firstName: string; lastName: string; email: string }) =>
      httpClient.patch(apiEndpoints.profile.updateUser, payload),
    updateInstitution: (payload: {
      name?: string;
      accreditationRef?: string;
      country?: string;
      publicContactEmail?: string;
      website?: string;
      about?: string;
    }) => httpClient.patch(apiEndpoints.profile.updateInstitution, payload),
    updatePassword: (payload: { currentPassword: string; newPassword: string }) =>
      httpClient.patch(apiEndpoints.profile.updatePassword, payload),
  },
};
