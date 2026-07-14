import prisma from '../config/database';
import { parsePagination, parseSort, startOfDay, endOfDay } from '../utils/helpers';
import { hashPassword } from '../utils/password';
import { AppError } from '../utils/errors';
import { Role } from '@prisma/client';

export class AdminService {
  async getDashboardStats() {
    const today = startOfDay(new Date());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      appointmentsToday,
      weeklyAppointments,
      cancelled,
      completed,
      totalPatients,
      totalDoctors,
      aiUsage,
      failedNotifications,
      pendingReminders,
    ] = await Promise.all([
      prisma.appointment.count({
        where: { date: { gte: today, lte: endOfDay(today) }, status: { in: ['CONFIRMED', 'PENDING'] } },
      }),
      prisma.appointment.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.appointment.count({ where: { status: 'CANCELLED', createdAt: { gte: weekAgo } } }),
      prisma.appointment.count({ where: { status: 'COMPLETED', createdAt: { gte: weekAgo } } }),
      prisma.patient.count(),
      prisma.doctor.count(),
      prisma.aISummary.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.notification.count({ where: { status: 'FAILED' } }),
      prisma.medicationReminder.count({ where: { status: 'PENDING' } }),
    ]);

    const popularSpecialization = await prisma.doctor.groupBy({
      by: ['specialization'],
      _count: { specialization: true },
      orderBy: { _count: { specialization: 'desc' } },
      take: 5,
    });

    const mostVisitedDoctor = await prisma.appointment.groupBy({
      by: ['doctorId'],
      _count: { doctorId: true },
      orderBy: { _count: { doctorId: 'desc' } },
      take: 1,
    });

    let topDoctor = null;
    if (mostVisitedDoctor[0]) {
      topDoctor = await prisma.doctor.findUnique({
        where: { id: mostVisitedDoctor[0].doctorId },
        select: { firstName: true, lastName: true, specialization: true },
      });
    }

    const recentBookings = await prisma.appointment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        doctor: { select: { firstName: true, lastName: true, specialization: true } },
      },
    });

    return {
      appointmentsToday,
      weeklyAppointments,
      cancelled,
      completed,
      revenuePlaceholder: completed * 500,
      totalPatients,
      totalDoctors,
      aiUsage,
      reminderStats: { pending: pendingReminders, failed: failedNotifications },
      popularSpecializations: popularSpecialization,
      mostVisitedDoctor: topDoctor,
      recentBookings,
      systemStatus: 'operational',
    };
  }

  async createDoctor(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    specialization: string;
    qualification?: string;
    experience?: number;
    bio?: string;
    phone?: string;
    consultationFee?: number;
    slotDuration?: number;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError(409, 'Email already exists');

    const hashedPassword = await hashPassword(data.password);

    return prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        role: Role.DOCTOR,
        isVerified: true,
        doctor: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            specialization: data.specialization,
            qualification: data.qualification,
            experience: data.experience || 0,
            bio: data.bio,
            phone: data.phone,
            consultationFee: data.consultationFee || 0,
            slotDuration: data.slotDuration || 30,
          },
        },
      },
      include: { doctor: true },
    });
  }

  async getDoctors(query: Record<string, string | undefined>) {
    const { page, limit, skip } = parsePagination(query);
    const where = query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: 'insensitive' as const } },
            { lastName: { contains: query.search, mode: 'insensitive' as const } },
            { specialization: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        skip,
        take: limit,
        orderBy: parseSort(query.sortBy, query.sortOrder, ['createdAt', 'firstName', 'rating']),
        include: { user: { select: { email: true, isActive: true } } },
      }),
      prisma.doctor.count({ where }),
    ]);

    return { doctors, pagination: { page, limit, total } };
  }

  async getPatients(query: Record<string, string | undefined>) {
    const { page, limit, skip } = parsePagination(query);
    const where = query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: 'insensitive' as const } },
            { lastName: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, isActive: true, createdAt: true } } },
      }),
      prisma.patient.count({ where }),
    ]);

    return { patients, pagination: { page, limit, total } };
  }

  async getAuditLogs(query: Record<string, string | undefined>) {
    const { page, limit, skip } = parsePagination(query);
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, role: true } } },
      }),
      prisma.auditLog.count(),
    ]);
    return { logs, pagination: { page, limit, total } };
  }

  async getAILogs(query: Record<string, string | undefined>) {
    const { page, limit, skip } = parsePagination(query);
    const [logs, total] = await Promise.all([
      prisma.aISummary.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { appointment: { select: { id: true, date: true } } },
      }),
      prisma.aISummary.count(),
    ]);
    return { logs, pagination: { page, limit, total } };
  }

  async getFailedNotifications(query: Record<string, string | undefined>) {
    const { page, limit, skip } = parsePagination(query);
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { status: 'FAILED' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { status: 'FAILED' } }),
    ]);
    return { notifications, pagination: { page, limit, total } };
  }
}

export const adminService = new AdminService();
