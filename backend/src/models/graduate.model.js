import mongoose from 'mongoose';

export const GRADUATE_LEVEL = Object.freeze({
  DIPLOMA: 'DIPLOMA',
  UNDERGRADUATE: 'UNDERGRADUATE',
  POSTGRADUATE: 'POSTGRADUATE',
  DOCTORATE: 'DOCTORATE',
});

export const GRADUATE_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
});

const graduateSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
      required: [true, 'First name is required'],
      maxlength: [100, 'First name cannot exceed 100 characters'],
      index: true,
    },
    lastName: {
      type: String,
      trim: true,
      required: [true, 'Last name is required'],
      maxlength: [100, 'Last name cannot exceed 100 characters'],
      index: true,
    },
    middleName: {
      type: String,
      trim: true,
      maxlength: [100, 'Middle name cannot exceed 100 characters'],
    },
    matricNumber: {
      type: String,
      trim: true,
      required: [true, 'Matriculation number is required'],
      maxlength: [50, 'Matriculation number cannot exceed 50 characters'],
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    programme: {
      type: String,
      trim: true,
      required: [true, 'Programme is required'],
      maxlength: [200, 'Programme cannot exceed 200 characters'],
      index: true,
    },
    level: {
      type: String,
      enum: Object.values(GRADUATE_LEVEL),
      index: true,
    },
    graduationYear: {
      type: String,
      trim: true,
      required: [true, 'Graduation year is required'],
      index: true,
    },
    graduationDate: {
      type: Date,
    },
    classification: {
      type: String,
      trim: true,
      maxlength: [100, 'Classification cannot exceed 100 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(GRADUATE_STATUS),
      default: GRADUATE_STATUS.ACTIVE,
      index: true,
    },
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution is required'],
      index: true,
    },
    dateOfBirth: {
      type: Date,
    },
    nationalId: {
      type: String,
      trim: true,
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

graduateSchema.index({ institution: 1, matricNumber: 1 }, { unique: true });
graduateSchema.index({ institution: 1, lastName: 1, firstName: 1 });
graduateSchema.index({ institution: 1, status: 1, level: 1, graduationYear: 1 });

graduateSchema.virtual('fullName').get(function () {
  const parts = [this.firstName, this.middleName, this.lastName].filter(Boolean);
  return parts.join(' ');
});

graduateSchema.virtual('certificateCount', {
  ref: 'Certificate',
  localField: '_id',
  foreignField: 'graduate',
  count: true,
});

export const Graduate = mongoose.model('Graduate', graduateSchema);
