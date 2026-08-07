import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AppError } from '../shared/errors/app-error.js';
import { User, USER_ROLES, USER_STATUS } from '../models/user.model.js';
import { asyncHandler } from '../shared/utils/async-handler.js';

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

function extractTokenFromHeader(req) {
  const authHeader = req.headers.authorization ?? req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token;
}

function extractAccessToken(req) {
  const headerToken = extractTokenFromHeader(req);
  if (headerToken) {
    return headerToken;
  }
  return req.cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
}

function extractRefreshToken(req) {
  return req.cookies?.[REFRESH_TOKEN_COOKIE] ?? null;
}

function verifyToken(token, type = 'access') {
  try {
    const secret = env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);

    if (type === 'access' && decoded.type !== 'access') {
      throw AppError.unauthorized('Invalid token type');
    }
    if (type === 'refresh' && decoded.type !== 'refresh') {
      throw AppError.unauthorized('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw AppError.unauthorized('Invalid token');
    }
    throw error;
  }
}

async function loadUserFromPayload(payload) {
  if (!payload?.sub) {
    throw AppError.unauthorized('Invalid token payload');
  }

  const user = await User.findById(payload.sub)
    .select('+password')
    .populate('institution');

  if (!user) {
    throw AppError.unauthorized('User no longer exists');
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

  if (payload.iat && user.passwordChangedAt) {
    const passwordChangedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
    if (payload.iat < passwordChangedTimestamp) {
      throw AppError.unauthorized('Token is no longer valid after password change');
    }
  }

  return user;
}

export const authenticate = asyncHandler(async (req, _res, next) => {
  const accessToken = extractAccessToken(req);

  if (!accessToken) {
    throw AppError.unauthorized('Authentication required');
  }

  const payload = verifyToken(accessToken, 'access');
  const user = await loadUserFromPayload(payload);

  req.user = user;
  req.auth = {
    accessTokenPayload: payload,
  };

  next();
});

export const authenticateOptional = asyncHandler(async (req, _res, next) => {
  const accessToken = extractAccessToken(req);

  if (!accessToken) {
    next();
    return;
  }

  try {
    const payload = verifyToken(accessToken, 'access');
    const user = await loadUserFromPayload(payload);
    req.user = user;
    req.auth = { accessTokenPayload: payload };
  } catch {
    // Ignore errors for optional auth
  }

  next();
});

export const requireRole = (...roles) => {
  const allowedRoles = roles.flat();
  return function requireRoleHandler(req, _res, next) {
    if (!req.user) {
      throw AppError.unauthorized('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError({
        message: 'Insufficient permissions to perform this action',
        statusCode: 403,
        code: 'INSUFFICIENT_PERMISSIONS',
        details: { required: allowedRoles, actual: req.user.role },
      });
    }

    next();
  };
};

export const requireSuperAdmin = requireRole(USER_ROLES.SUPER_ADMIN);

export const requireInstitutionAdmin = requireRole(USER_ROLES.INSTITUTION_ADMIN);

export const requireAnyAdmin = requireRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.INSTITUTION_ADMIN);

export function requireInstitutionScope(req, _res, next) {
  if (!req.user) {
    throw AppError.unauthorized('Authentication required');
  }

  if (req.user.role === USER_ROLES.SUPER_ADMIN) {
    next();
    return;
  }

  if (!req.user.institution) {
    throw new AppError({
      message: 'User is not associated with an institution',
      statusCode: 403,
      code: 'NO_INSTITUTION_SCOPE',
    });
  }

  next();
}

export {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  extractAccessToken,
  extractRefreshToken,
  verifyToken,
  loadUserFromPayload,
};
