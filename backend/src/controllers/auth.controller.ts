import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/errors';
import { config } from '../config';
import { emailService } from '../services/email.service';

export class AuthController {
  register = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.registerPatient(req.body);
      sendSuccess(res, result, 'Registration successful', 201);
    } catch (err) {
      next(err);
    }
  };

  login = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body.email, req.body.password);
      sendSuccess(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.refreshToken(req.body.refreshToken);
      sendSuccess(res, result, 'Token refreshed');
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await authService.logout(req.body.refreshToken);
      sendSuccess(res, null, 'Logged out');
    } catch (err) {
      next(err);
    }
  };

  forgotPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.forgotPassword(req.body.email);
      if ('resetToken' in result && result.resetToken) {
        await emailService.passwordReset({
          email: result.email!,
          resetLink: `${config.frontendUrl}/reset-password?token=${result.resetToken}`,
        });
      }
      sendSuccess(res, null, 'If email exists, reset link sent');
    } catch (err) {
      next(err);
    }
  };

  resetPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await authService.resetPassword(req.body.token, req.body.password);
      sendSuccess(res, null, 'Password reset successful');
    } catch (err) {
      next(err);
    }
  };

  me = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { prisma } = await import('../config/database');
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        include: { admin: true, doctor: true, patient: true },
      });
      sendSuccess(res, {
        id: user?.id,
        email: user?.email,
        role: user?.role,
        profile: user?.admin || user?.doctor || user?.patient,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
