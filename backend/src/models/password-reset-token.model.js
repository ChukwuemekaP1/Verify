import mongoose from 'mongoose';
import crypto from 'crypto';

const passwordResetTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
    },
    used: {
      type: Boolean,
      default: false,
    },
    requestIp: {
      type: String,
      trim: true,
    },
    requestUserAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

passwordResetTokenSchema.index({ user: 1, used: 1, expiresAt: -1 });

passwordResetTokenSchema.statics.generateToken = function generateToken() {
  return crypto.randomBytes(32).toString('hex');
};

passwordResetTokenSchema.methods.isExpired = function isExpired() {
  return this.expiresAt < new Date() || this.used;
};

passwordResetTokenSchema.pre('save', function preSave(next) {
  if (this.isModified('token')) {
    const hash = crypto.createHash('sha256').update(this.token).digest('hex');
    this.token = hash;
  }
  next();
});

passwordResetTokenSchema.statics.hashToken = function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

export const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
