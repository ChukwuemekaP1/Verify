import jwt from 'jsonwebtoken';

import { AppError } from '../../shared/errors/app-error.js';
import { env } from '../../config/env.js';
import { USER_ROLES, USER_STATUS } from '../../models/user.model.js';
import { PasswordResetToken } from '../../models/password-reset-token.model.js';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MINUTES = 30;
const PASSWORD_RESET_HOURS = 1;

function parseDurationToMs(durationStr) {
  const match = durationStr.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 15 * 60 * 1000;
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
}

function sanitizeUser(user) {
  if (!user) return null;
  const userObj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete userObj.password;
  delete userObj.__v;
  return userObj;
}

export class AuthService {
  constructor({ authRepository }) {
    this.authRepository = authRepository;
  }

  generateAccessToken(user) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      type: 'access',
      institution: user.institution?._id?.toString() ?? user.institution ?? null,
    };
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    });
  }

  generateRefreshToken(user) {
    const payload = {
      sub: user._id.toString(),
      type: 'refresh',
    };
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    });
  }

  getCookieOptions() {
    const accessMaxAge = parseDurationToMs(env.JWT_ACCESS_EXPIRES_IN);
    const refreshMaxAge = parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN);
    return {
      access: {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        maxAge: accessMaxAge,
      },
      refresh: {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/api/v1/auth',
        maxAge: refreshMaxAge,
      },
    };
  }

  async login(credentials) {
    const { email, password } = credentials;

    const user = await this.authRepository.findUserByEmail(email, {
      includePassword: true,
      populateInstitution: true,
    });

    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (user.status === USER_STATUS.INACTIVE) {
      throw AppError.unauthorized('Account has been deactivated');
    }

    if (user.status === USER_STATUS.PENDING) {
      throw new AppError({
        message: 'Account is pending activation',
        statusCode: 403,
        code: 'ACCOUNT_PENDING',
      });
    }

    if (user.isLocked()) {
      const lockedUntil = user.lockedUntil;
      const minutesLeft = Math.ceil((lockedUntil - new Date()) / 60000);
      throw new AppError({
        message: `Account is temporarily locked. Try again in ${minutesLeft} minutes.`,
        statusCode: 423,
        code: 'ACCOUNT_LOCKED',
        details: { lockedUntil, minutesLeft },
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      await this.authRepository.incrementFailedLogin(user._id);

      if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60000);
        await this.authRepository.lockAccount(user._id, lockUntil);
        throw new AppError({
          message: `Account locked after ${MAX_FAILED_LOGIN_ATTEMPTS} failed attempts. Try again in ${ACCOUNT_LOCK_MINUTES} minutes.`,
          statusCode: 423,
          code: 'ACCOUNT_LOCKED',
          details: { lockedUntil: lockUntil, minutes: ACCOUNT_LOCK_MINUTES },
        });
      }

      const remaining = MAX_FAILED_LOGIN_ATTEMPTS - attempts;
      throw new AppError({
        message: `Invalid email or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before account lock.`,
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        details: { remainingAttempts: remaining, maxAttempts: MAX_FAILED_LOGIN_ATTEMPTS },
      });
    }

    const updatedUser = await this.authRepository.updateUserLastLogin(user._id);
    const accessToken = this.generateAccessToken(updatedUser);
    const refreshToken = this.generateRefreshToken(updatedUser);
    const cookieOptions = this.getCookieOptions();

    return {
      user: sanitizeUser(updatedUser),
      accessToken,
      refreshToken,
      cookieOptions,
    };
  }

  async refresh(refreshTokenRaw) {
    if (!refreshTokenRaw) {
      throw AppError.unauthorized('Refresh token required');
    }

    let payload;
    try {
      payload = jwt.verify(refreshTokenRaw, env.JWT_SECRET);
      if (payload.type !== 'refresh') {
        throw AppError.unauthorized('Invalid token type');
      }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized('Refresh token has expired');
      }
      throw AppError.unauthorized('Invalid refresh token');
    }

    const user = await this.authRepository.findUserById(payload.sub, {
      populateInstitution: true,
    });

    if (!user || user.status !== USER_STATUS.ACTIVE) {
      throw AppError.unauthorized('Invalid refresh token');
    }

    const accessToken = this.generateAccessToken(user);
    const cookieOptions = this.getCookieOptions();

    return {
      user: sanitizeUser(user),
      accessToken,
      cookieOptions,
    };
  }

  async me(userId) {
    const user = await this.authRepository.findUserById(userId, {
      populateInstitution: true,
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    return { user: sanitizeUser(user) };
  }

  async requestPasswordReset(payload, meta = {}) {
    const { email } = payload;

    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      return {
        message: 'If an account exists with that email, reset instructions have been sent.',
      };
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      return {
        message: 'If an account exists with that email, reset instructions have been sent.',
      };
    }

    await this.authRepository.invalidateAllResetTokens(user._id);

    const rawToken = PasswordResetToken.generateToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_HOURS * 60 * 60 * 1000);

    await this.authRepository.createPasswordResetToken({
      user: user._id,
      token: rawToken,
      expiresAt,
      requestIp: meta.ip,
      requestUserAgent: meta.userAgent,
    });

    return {
      message: 'If an account exists with that email, reset instructions have been sent.',
      debug_token: env.NODE_ENV === 'development' ? rawToken : undefined,
      expiresAt,
    };
  }

  async resetPassword(payload) {
    const { token, newPassword } = payload;

    if (!token) {
      throw AppError.badRequest('Reset token is required');
    }

    const hashedToken = PasswordResetToken.hashToken(token);

    const allTokens = await PasswordResetToken.find({
      token: hashedToken,
    }).select('+user');

    if (allTokens.length === 0) {
      throw AppError.badRequest('Invalid or expired password reset token');
    }

    const resetRecord = allTokens.find((t) => !t.used && t.expiresAt > new Date());
    if (!resetRecord) {
      throw AppError.badRequest('Invalid or expired password reset token');
    }

    const updatedUser = await this.authRepository.updatePassword(resetRecord.user, newPassword);
    if (!updatedUser) {
      throw AppError.notFound('User not found');
    }

    await this.authRepository.markResetTokenUsed(resetRecord._id);
    await this.authRepository.invalidateAllResetTokens(resetRecord.user);

    return {
      message: 'Password reset successfully. You can now sign in with your new password.',
    };
  }

  async changePassword(userId, payload) {
    const { currentPassword, newPassword } = payload;

    const result = await this.authRepository.updatePasswordWithCurrent(
      userId,
      currentPassword,
      newPassword,
    );

    if (!result.user) {
      throw AppError.notFound('User not found');
    }

    if (!result.match) {
      throw new AppError({
        message: 'Current password is incorrect',
        statusCode: 401,
        code: 'INVALID_CURRENT_PASSWORD',
      });
    }

    return {
      message: 'Password updated successfully',
      user: sanitizeUser(result.user),
    };
  }

  async seedSuperAdminIfNeeded() {
    const existingSuperAdmin = await this.authRepository.findSuperAdmin();
    if (existingSuperAdmin) {
      return { created: false, user: sanitizeUser(existingSuperAdmin) };
    }

    const user = await this.authRepository.createUser({
      firstName: 'Super',
      lastName: 'Admin',
      email: env.SUPER_ADMIN_EMAIL,
      password: env.SUPER_ADMIN_PASSWORD,
      role: USER_ROLES.SUPER_ADMIN,
      status: USER_STATUS.ACTIVE,
      institution: null,
    });

    return { created: true, user: sanitizeUser(user) };
  }

  logout() {
    const clearOptions = {
      access: {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
      },
      refresh: {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/api/v1/auth',
      },
    };
    return { clearOptions };
  }
}
