import mongoose from 'mongoose';

export const CERTIFICATE_TYPE = Object.freeze({
  DEGREE: 'DEGREE',
  DIPLOMA: 'DIPLOMA',
  TRANSCRIPT: 'TRANSCRIPT',
  CERTIFICATE: 'CERTIFICATE',
});

export const CERTIFICATE_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PROCESSING: 'PROCESSING',
  PENDING_REVIEW: 'PENDING_REVIEW',
  VERIFIED: 'VERIFIED',
  PUBLISHED: 'PUBLISHED',
  REVOKED: 'REVOKED',
});

export const VERIFICATION_METHOD = Object.freeze({
  NONE: 'NONE',
  QR: 'QR',
  REFERENCE: 'REFERENCE',
  BOTH: 'BOTH',
});

const certificateSchema = new mongoose.Schema(
  {
    certificateNumber: {
      type: String,
      trim: true,
      required: [true, 'Certificate number is required'],
      maxlength: [100, 'Certificate number cannot exceed 100 characters'],
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(CERTIFICATE_TYPE),
      required: [true, 'Certificate type is required'],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CERTIFICATE_STATUS),
      default: CERTIFICATE_STATUS.DRAFT,
      index: true,
    },
    issueDate: {
      type: Date,
      required: [true, 'Issue date is required'],
      index: true,
    },
    expiryDate: {
      type: Date,
    },
    awardTitle: {
      type: String,
      trim: true,
      required: [true, 'Award title is required'],
      maxlength: [300, 'Award title cannot exceed 300 characters'],
    },
    programme: {
      type: String,
      trim: true,
      maxlength: [200, 'Programme cannot exceed 200 characters'],
    },
    classification: {
      type: String,
      trim: true,
      maxlength: [100, 'Classification cannot exceed 100 characters'],
    },
    honours: {
      type: String,
      trim: true,
      maxlength: [100, 'Honours cannot exceed 100 characters'],
    },
    gpa: {
      type: String,
      trim: true,
      maxlength: [20, 'GPA cannot exceed 20 characters'],
    },
    credits: {
      type: String,
      trim: true,
      maxlength: [50, 'Credits cannot exceed 50 characters'],
    },
    graduate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Graduate',
      required: [true, 'Graduate is required'],
      index: true,
    },
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution is required'],
      index: true,
    },
    issuedBy: {
      type: String,
      trim: true,
      maxlength: [200, 'Issued by cannot exceed 200 characters'],
    },
    signatoryName: {
      type: String,
      trim: true,
      maxlength: [200, 'Signatory name cannot exceed 200 characters'],
    },
    signatoryTitle: {
      type: String,
      trim: true,
      maxlength: [200, 'Signatory title cannot exceed 200 characters'],
    },
    signatorySignatureUrl: {
      type: String,
      trim: true,
    },
    documentUrl: {
      type: String,
      trim: true,
    },
    documentMimeType: {
      type: String,
      trim: true,
    },
    documentSize: {
      type: Number,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    previewUrl: {
      type: String,
      trim: true,
    },
    verificationReference: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      uppercase: true,
      maxlength: [100, 'Verification reference cannot exceed 100 characters'],
      index: true,
    },
    verificationMethod: {
      type: String,
      enum: Object.values(VERIFICATION_METHOD),
      default: VERIFICATION_METHOD.BOTH,
    },
    verificationQrCodeUrl: {
      type: String,
      trim: true,
    },
    verificationQrData: {
      type: String,
      trim: true,
    },
    verificationUrl: {
      type: String,
      trim: true,
    },
    ocrExtractionConfidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    ocrFieldsCorrected: {
      type: Number,
      default: 0,
    },
    ocrReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    ocrReviewedAt: {
      type: Date,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    publishedAt: {
      type: Date,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    revokedAt: {
      type: Date,
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    revocationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Revocation reason cannot exceed 500 characters'],
    },
    verificationCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastVerifiedAt: {
      type: Date,
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

certificateSchema.index({ institution: 1, certificateNumber: 1 }, { unique: true });
certificateSchema.index({ institution: 1, graduate: 1 });
certificateSchema.index({ institution: 1, status: 1, type: 1 });
certificateSchema.index({ institution: 1, issueDate: -1 });
certificateSchema.index({ verificationReference: 1 }, { unique: true, sparse: true });

certificateSchema.virtual('graduateInfo', {
  ref: 'Graduate',
  localField: 'graduate',
  foreignField: '_id',
  justOne: true,
});

certificateSchema.virtual('institutionInfo', {
  ref: 'Institution',
  localField: 'institution',
  foreignField: '_id',
  justOne: true,
});

certificateSchema.methods.generateVerificationReference = function generateVerificationReference() {
  const prefix = this.verificationPrefix ?? '';
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timestampPart = Date.now().toString(36).toUpperCase();
  return `${prefix}${timestampPart}${randomPart}`;
};

export const Certificate = mongoose.model('Certificate', certificateSchema);
