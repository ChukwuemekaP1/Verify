import mongoose from 'mongoose';

export const AUDIT_ACTION = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  PUBLISH: 'PUBLISH',
  REVOKE: 'REVOKE',
  VERIFY: 'VERIFY',
  MANUAL: 'MANUAL',
  CORRECT: 'CORRECT',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PROFILE_UPDATE: 'PROFILE_UPDATE',
  INSTITUTION_UPDATE: 'INSTITUTION_UPDATE',
  DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD',
  OCR_RUN: 'OCR_RUN',
  QR_GENERATE: 'QR_GENERATE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  EXPORT: 'EXPORT',
  SEED: 'SEED',
  OTHER: 'OTHER',
});

export const AUDIT_ENTITY = Object.freeze({
  USER: 'USER',
  INSTITUTION: 'INSTITUTION',
  GRADUATE: 'GRADUATE',
  CERTIFICATE: 'CERTIFICATE',
  VERIFICATION: 'VERIFICATION',
  PROFILE: 'PROFILE',
  SYSTEM: 'SYSTEM',
});

export const AUDIT_SEVERITY = Object.freeze({
  INFO: 'INFO',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
});

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTION),
      required: [true, 'Audit action is required'],
      index: true,
    },
    entityType: {
      type: String,
      enum: Object.values(AUDIT_ENTITY),
      required: [true, 'Entity type is required'],
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    entityLabel: {
      type: String,
      trim: true,
    },
    severity: {
      type: String,
      enum: Object.values(AUDIT_SEVERITY),
      default: AUDIT_SEVERITY.INFO,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    actorLabel: {
      type: String,
      trim: true,
    },
    actorRole: {
      type: String,
      trim: true,
    },
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      index: true,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    previousValues: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    requestId: {
      type: String,
      trim: true,
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  },
);

auditLogSchema.index({ action: 1, entityType: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ institution: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ success: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
