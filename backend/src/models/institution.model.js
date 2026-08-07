import mongoose from 'mongoose';

export const INSTITUTION_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
  SUSPENDED: 'SUSPENDED',
});

export const INSTITUTION_TYPE = Object.freeze({
  UNIVERSITY: 'UNIVERSITY',
  COLLEGE: 'COLLEGE',
  POLYTECHNIC: 'POLYTECHNIC',
  SECONDARY: 'SECONDARY',
  VOCATIONAL: 'VOCATIONAL',
  OTHER: 'OTHER',
});

const institutionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, 'Institution name is required'],
      maxlength: [200, 'Institution name cannot exceed 200 characters'],
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(INSTITUTION_TYPE),
      default: INSTITUTION_TYPE.UNIVERSITY,
    },
    accreditationRef: {
      type: String,
      trim: true,
      sparse: true,
    },
    country: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    publicContactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid contact email'],
    },
    website: {
      type: String,
      trim: true,
    },
    about: {
      type: String,
      trim: true,
      maxlength: [2000, 'About text cannot exceed 2000 characters'],
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(INSTITUTION_STATUS),
      default: INSTITUTION_STATUS.PENDING,
      index: true,
    },
    verificationPrefix: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      uppercase: true,
      maxlength: [10, 'Verification prefix cannot exceed 10 characters'],
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

institutionSchema.index({ name: 1, country: 1 });
institutionSchema.index({ status: 1, type: 1 });

institutionSchema.virtual('adminCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'institution',
  count: true,
});

export const Institution = mongoose.model('Institution', institutionSchema);
