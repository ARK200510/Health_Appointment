import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { adminService } from '../services/admin.service';
import { leaveService } from '../services/leave.service';
import { emailService } from '../services/email.service';
import { sendSuccess, sendPaginated, AppError } from '../utils/errors';
import prisma from '../config/database';
import { hashPassword } from '../utils/password';

export class AdminController {
  dashboard = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await adminService.getDashboardStats();
      sendSuccess(res, stats);
    } catch (err) {
      next(err);
    }
  };

  createDoctor = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const doctor = await adminService.createDoctor(req.body);
      sendSuccess(res, doctor, 'Doctor created', 201);
    } catch (err) {
      next(err);
    }
  };

  getDoctors = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { doctors, pagination } = await adminService.getDoctors(req.query as Record<string, string>);
      sendPaginated(res, doctors, pagination);
    } catch (err) {
      next(err);
    }
  };

  updateDoctor = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const doctor = await prisma.doctor.update({
        where: { id: req.params.id },
        data: req.body,
        include: { user: { select: { email: true } } },
      });
      sendSuccess(res, doctor, 'Doctor updated');
    } catch (err) {
      next(err);
    }
  };

  deleteDoctor = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const doctor = await prisma.doctor.findUnique({ where: { id: req.params.id } });
      if (!doctor) throw new AppError(404, 'Doctor not found');
      await prisma.user.delete({ where: { id: doctor.userId } });
      sendSuccess(res, null, 'Doctor deleted');
    } catch (err) {
      next(err);
    }
  };

  getPatients = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { patients, pagination } = await adminService.getPatients(req.query as Record<string, string>);
      sendPaginated(res, patients, pagination);
    } catch (err) {
      next(err);
    }
  };

  createLeave = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const leave = await leaveService.createLeave({
        ...req.body,
        createdBy: req.user!.userId,
      });
      sendSuccess(res, leave, 'Leave created', 201);
    } catch (err) {
      next(err);
    }
  };

  getAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { logs, pagination } = await adminService.getAuditLogs(req.query as Record<string, string>);
      sendPaginated(res, logs, pagination);
    } catch (err) {
      next(err);
    }
  };

  getAILogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { logs, pagination } = await adminService.getAILogs(req.query as Record<string, string>);
      sendPaginated(res, logs, pagination);
    } catch (err) {
      next(err);
    }
  };

  getFailedNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { notifications, pagination } = await adminService.getFailedNotifications(req.query as Record<string, string>);
      sendPaginated(res, notifications, pagination);
    } catch (err) {
      next(err);
    }
  };

  retryNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await emailService.retryFailed(req.params.id);
      sendSuccess(res, result, 'Notification retry initiated');
    } catch (err) {
      next(err);
    }
  };

  updateWorkingHours = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { doctorId, hours } = req.body;
      await prisma.workingHours.deleteMany({ where: { doctorId } });
      const created = await prisma.workingHours.createMany({
        data: hours.map((h: { dayOfWeek: number; startTime: string; endTime: string; isActive?: boolean }) => ({
          doctorId,
          ...h,
        })),
      });
      sendSuccess(res, created, 'Working hours updated');
    } catch (err) {
      next(err);
    }
  };

  updateSlotDuration = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const doctor = await prisma.doctor.update({
        where: { id: req.params.id },
        data: { slotDuration: req.body.slotDuration },
      });
      sendSuccess(res, doctor, 'Slot duration updated');
    } catch (err) {
      next(err);
    }
  };
}

export class DoctorController {
  search = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { search, specialization, page = '1', limit = '10' } = req.query as Record<string, string>;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where: Record<string, unknown> = { isAvailable: true };

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (specialization) where.specialization = { contains: specialization, mode: 'insensitive' };

      const [doctors, total] = await Promise.all([
        prisma.doctor.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { rating: 'desc' },
          select: {
            id: true, firstName: true, lastName: true, specialization: true,
            qualification: true, experience: true, bio: true, avatar: true,
            consultationFee: true, rating: true, totalReviews: true, slotDuration: true,
          },
        }),
        prisma.doctor.count({ where }),
      ]);

      if (req.user?.role === 'PATIENT' && search) {
        const patient = await prisma.patient.findUnique({ where: { userId: req.user.userId } });
        if (patient) {
          prisma.searchHistory.create({
            data: { patientId: patient.id, query: search, filters: { specialization } },
          }).catch(console.error);
        }
      }

      sendPaginated(res, doctors, { page: parseInt(page), limit: parseInt(limit), total });
    } catch (err) {
      next(err);
    }
  };

  getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const doctor = await prisma.doctor.findUnique({
        where: { id: req.params.id },
        include: { workingHours: true },
      });
      if (!doctor) throw new AppError(404, 'Doctor not found');
      sendSuccess(res, doctor);
    } catch (err) {
      next(err);
    }
  };

  getPatients = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
      if (!doctor) throw new AppError(404, 'Doctor not found');

      const patients = await prisma.patient.findMany({
        where: {
          appointments: { some: { doctorId: doctor.id } },
        },
        distinct: ['id'],
        include: {
          appointments: {
            where: { doctorId: doctor.id },
            orderBy: { date: 'desc' },
            take: 1,
          },
        },
      });
      sendSuccess(res, patients);
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const doctor = await prisma.doctor.update({
        where: { userId: req.user!.userId },
        data: req.body,
      });
      sendSuccess(res, doctor, 'Profile updated');
    } catch (err) {
      next(err);
    }
  };

  getWorkingHours = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
      const hours = await prisma.workingHours.findMany({ where: { doctorId: doctor!.id } });
      sendSuccess(res, hours);
    } catch (err) {
      next(err);
    }
  };
}

export const adminController = new AdminController();
export const doctorController = new DoctorController();
