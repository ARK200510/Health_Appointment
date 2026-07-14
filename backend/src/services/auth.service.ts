import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  parseExpiryToMs,
} from '../utils/jwt';
import { config } from '../config';
import { AppError } from '../utils/errors';
import { Role } from '@prisma/client';

export class AuthService {
  async registerPatient(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError(409, 'Email already registered');

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        role: Role.PATIENT,
        patient: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
            gender: data.gender,
          },
        },
      },
      include: { patient: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { admin: true, doctor: true, patient: true },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid credentials');
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshToken(token: string) {
    const payload = verifyRefreshToken(token);
    const stored = await prisma.refreshToken.findUnique({ where: { token } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError(401, 'Invalid refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) throw new AppError(401, 'User not found');

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(user.id, user.email, user.role);
  }

  async logout(token: string) {
    await prisma.refreshToken.updateMany({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'If email exists, reset link sent' };

    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 3600000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: `reset_${resetToken}`,
        expiresAt,
      },
    });

    return { resetToken, email: user.email };
  }

  async resetPassword(token: string, newPassword: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: `reset_${token}` },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: stored.userId },
        data: { password: hashedPassword },
      }),
      prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private async generateTokens(userId: string, email: string, role: Role) {
    const payload = { userId, email, role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + parseExpiryToMs(config.jwt.refreshExpiry)),
      },
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    role: Role;
    isVerified: boolean;
    admin?: unknown;
    doctor?: unknown;
    patient?: unknown;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      profile: user.admin || user.doctor || user.patient,
    };
  }
}

export const authService = new AuthService();
