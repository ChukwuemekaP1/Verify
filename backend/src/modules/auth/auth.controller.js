import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { extractRefreshToken } from '../../middlewares/auth.middleware.js';

const authService = new AuthService({ authRepository: new AuthRepository() });

export async function loginController(req, res) {
  const result = await authService.login(req.body);
  res.cookie('access_token', result.accessToken, result.cookieOptions.access);
  res.cookie('refresh_token', result.refreshToken, result.cookieOptions.refresh);
  res.status(200).json({
    status: 'success',
    data: {
      user: result.user,
    },
  });
}

export async function meController(req, res) {
  const result = await authService.me(req.user._id);
  res.status(200).json({ status: 'success', data: result });
}

export async function refreshController(req, res) {
  const refreshToken = extractRefreshToken(req);
  const result = await authService.refresh(refreshToken);
  res.cookie('access_token', result.accessToken, result.cookieOptions.access);
  res.status(200).json({
    status: 'success',
    data: {
      user: result.user,
    },
  });
}

export async function logoutController(_req, res) {
  const result = authService.logout();
  res.clearCookie('access_token', result.clearOptions.access);
  res.clearCookie('refresh_token', result.clearOptions.refresh);
  res.status(200).json({ status: 'success', data: { message: 'Logged out successfully' } });
}

export async function forgotPasswordController(req, res) {
  const meta = {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
  const result = await authService.requestPasswordReset(req.body, meta);
  res.status(202).json({ status: 'success', data: result });
}

export async function resetPasswordController(req, res) {
  const result = await authService.resetPassword(req.body);
  res.status(200).json({ status: 'success', data: result });
}

export async function changePasswordController(req, res) {
  const result = await authService.changePassword(req.user._id, req.body);
  res.status(200).json({ status: 'success', data: result });
}

export async function seedSuperAdminController(_req, res) {
  const result = await authService.seedSuperAdminIfNeeded();
  res.status(200).json({ status: 'success', data: result });
}
