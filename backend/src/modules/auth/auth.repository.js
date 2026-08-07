import { User } from '../../models/user.model.js';
import { Institution } from '../../models/institution.model.js';
import { PasswordResetToken } from '../../models/password-reset-token.model.js';

export class AuthRepository {
  async findUserByEmail(email, options = {}) {
    const query = User.findOne({ email: email?.toLowerCase() });
    if (options.includePassword) {
      query.select('+password');
    }
    if (options.populateInstitution) {
      query.populate('institution');
    }
    return query.exec();
  }

  async findUserById(userId, options = {}) {
    const query = User.findById(userId);
    if (options.includePassword) {
      query.select('+password');
    }
    if (options.populateInstitution) {
      query.populate('institution');
    }
    return query.exec();
  }

  async updateUserLastLogin(userId) {
    return User.findByIdAndUpdate(
      userId,
      { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
      { new: true, runValidators: true },
    ).populate('institution').exec();
  }

  async incrementFailedLogin(userId) {
    return User.findByIdAndUpdate(
      userId,
      { $inc: { failedLoginAttempts: 1 } },
      { new: true, runValidators: true },
    ).exec();
  }

  async lockAccount(userId, until) {
    return User.findByIdAndUpdate(
      userId,
      { lockedUntil: until },
      { new: true, runValidators: true },
    ).exec();
  }

  async createUser(userData) {
    const user = new User(userData);
    await user.save();
    return user.populate('institution');
  }

  async findInstitutionById(institutionId) {
    return Institution.findById(institutionId).exec();
  }

  async createPasswordResetToken(resetData) {
    const resetToken = new PasswordResetToken(resetData);
    await resetToken.save();
    return resetToken;
  }

  async findValidResetToken(userId, hashedToken) {
    return PasswordResetToken.findOne({
      user: userId,
      token: hashedToken,
      used: false,
      expiresAt: { $gt: new Date() },
    }).exec();
  }

  async markResetTokenUsed(tokenId) {
    return PasswordResetToken.findByIdAndUpdate(
      tokenId,
      { used: true, usedAt: new Date() },
      { new: true, runValidators: true },
    ).exec();
  }

  async invalidateAllResetTokens(userId) {
    return PasswordResetToken.updateMany(
      { user: userId, used: false, expiresAt: { $gt: new Date() } },
      { used: true },
    ).exec();
  }

  async updatePassword(userId, newPassword) {
    const user = await User.findById(userId).select('+password').exec();
    if (!user) {
      return null;
    }
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();
    return user.populate('institution');
  }

  async updatePasswordWithCurrent(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password').exec();
    if (!user) {
      return { user: null, match: false };
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return { user, match: false };
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();
    return { user: await user.populate('institution'), match: true };
  }

  async countUsersByCriteria(criteria) {
    return User.countDocuments(criteria).exec();
  }

  async findSuperAdmin() {
    return User.findOne({ role: 'SUPER_ADMIN' })
      .populate('institution')
      .exec();
  }
}
