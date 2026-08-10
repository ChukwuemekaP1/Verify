import mongoose from 'mongoose';

export const VERIFICATION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  AUTHENTIC: 'AUTHENTIC',
  SUSPICIOUS: 'SUSPICIOUS',
  INVALID: 'INVALID',
  NOT_FOUND: 'NOT_FOUND',
  ERROR: 'ERROR',
});

export const VERIFICATION_METHOD = Object.freeze({
  REFERENCE: 'REFERENCE',
  CERTIFICATE_NUMBER: 'CERTIFICATE_NUMBER',
  DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD',
  QR_CODE: 'QR_CODE',
  MANUAL: 'MANUAL',
});

const verificationRecordSchema = new mongoose.Schema(
  {
    verificationReference: {
      type: String,
      trim: true,
      required: [true, 'Verification reference is required'],
      unique: true,
    },
    method: {
      type: String,
      enum: Object.values(VERIFICATION_METHOD),
      required: [true, 'Verification method is required'],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.PENDING,
      index: true,
    },
    certificate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Certificate',
      index: true,
    },
    graduate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Graduate',
      index: true,
    },
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      index: true,
    },
    requestedFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    matchedFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    mismatchedFields: {
      type: [String],
      default: [],
    },
    missingFields: {
      type: [String],
      default: [],
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    certificateMatchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    graduateMatchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    institutionMatchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    ocrText: {
      type: String,
      trim: true,
    },
    ocrConfidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    uploadedDocumentUrl: {
      type: String,
      trim: true,
    },
    uploadedDocumentCloudinaryId: {
      type: String,
      trim: true,
    },
    verifier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    verifierIp: {
      type: String,
      trim: true,
    },
    verifierUserAgent: {
      type: String,
      trim: true,
    },
    verifierNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Verifier notes cannot exceed 1000 characters'],
    },
    completedAt: {
      type: Date,
      index: true,
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

verificationRecordSchema.index({ institution: 1, status: 1, createdAt: -1 });
verificationRecordSchema.index({ certificate: 1, createdAt: -1 });
verificationRecordSchema.index({ method: 1, status: 1 });
verificationRecordSchema.index({ createdAt: -1 });
verificationRecordSchema.index({ confidenceScore: 1 });

verificationRecordSchema.methods.generateVerificationReference = function () {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `V${timestamp}${random}`;
};

export const VerificationRecord = mongoose.model('VerificationRecord', verificationRecordSchema);
