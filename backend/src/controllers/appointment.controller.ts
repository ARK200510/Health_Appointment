import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { appointmentService } from '../services/appointment.service';
import { emailService } from '../services/email.service';
import { aiService } from '../services/ai.service';
import { sendSuccess, sendPaginated, AppError } from '../utils/errors';
import prisma from '../config/database';
import { parsePagination, startOfDay, endOfDay } from '../utils/helpers';

export class AppointmentController {
  getSlots = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { doctorId, date } = req.query as { doctorId: string; date: string };
      const slots = await appointmentService.getAvailableSlots(doctorId, date);
      sendSuccess(res, slots);
    } catch (err) {
      next(err);
    }
  };

  holdSlot = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
      if (!patient) throw new AppError(404, 'Patient profile not found');

      const hold = await appointmentService.holdSlot(
        patient.id,
        req.body.doctorId,
        req.body.date,
        req.body.startTime
      );
      sendSuccess(res, hold, 'Slot held successfully', 201);
    } catch (err) {
      next(err);
    }
  };

  book = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
      if (!patient) throw new AppError(404, 'Patient profile not found');

      const appointment = await appointmentService.bookFromHold(
        req.body.holdId,
        patient.id,
        req.body.reason,
        req.body.symptoms
      );

      await emailService.bookingConfirmation({
        patientEmail: appointment.patient.user.email,
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        doctorName: `${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
        date: appointment.date.toDateString(),
        time: appointment.startTime,
        userId: req.user!.userId,
      });

      if (req.body.symptoms && appointment.symptoms[0]) {
        aiService.analyzeSymptoms(
          appointment.id,
          appointment.symptoms[0].id,
          req.body.symptoms.description
        ).catch(console.error);
      }

      sendSuccess(res, appointment, 'Appointment booked', 201);
    } catch (err) {
      next(err);
    }
  };

  cancel = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const appointment = await appointmentService.cancel(
        req.params.id,
        req.user!.userId,
        req.user!.role,
        req.body.reason
      );

      await emailService.cancellationNotice({
        email: appointment.patient.user.email,
        name: appointment.patient.firstName,
        doctorName: `${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
        date: appointment.date.toDateString(),
        reason: req.body.reason,
      });

      sendSuccess(res, appointment, 'Appointment cancelled');
    } catch (err) {
      next(err);
    }
  };

  reschedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
      if (!patient) throw new AppError(404, 'Patient not found');

      const appointment = await appointmentService.reschedule(
        req.params.id,
        req.body.holdId,
        patient.id,
        req.body.reason
      );
      sendSuccess(res, appointment, 'Appointment rescheduled');
    } catch (err) {
      next(err);
    }
  };

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page, limit, skip } = parsePagination(req.query as Record<string, string>);
      const where: Record<string, unknown> = {};

      if (req.user!.role === 'PATIENT') {
        const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
        where.patientId = patient?.id;
      } else if (req.user!.role === 'DOCTOR') {
        const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
        where.doctorId = doctor?.id;
      }

      if (req.query.status) where.status = req.query.status;
      if (req.query.date) {
        where.date = { gte: startOfDay(new Date(req.query.date as string)), lte: endOfDay(new Date(req.query.date as string)) };
      }

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { date: 'desc' },
          include: {
            patient: { select: { firstName: true, lastName: true, phone: true } },
            doctor: { select: { firstName: true, lastName: true, specialization: true } },
            symptoms: true,
            aiSummaries: { where: { type: 'PRE_VISIT' }, take: 1 },
          },
        }),
        prisma.appointment.count({ where }),
      ]);

      sendPaginated(res, appointments, { page, limit, total });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: req.params.id },
        include: {
          patient: true,
          doctor: true,
          symptoms: true,
          aiSummaries: true,
          prescriptions: { include: { medications: true } },
        },
      });
      if (!appointment) throw new AppError(404, 'Not found');
      sendSuccess(res, appointment);
    } catch (err) {
      next(err);
    }
  };

  complete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const appointment = await appointmentService.complete(
        req.params.id,
        req.user!.userId,
        req.body.clinicalNotes
      );

      aiService.generatePostVisitSummary(req.params.id, req.body.clinicalNotes).catch(console.error);

      sendSuccess(res, appointment, 'Appointment completed');
    } catch (err) {
      next(err);
    }
  };

  todaySchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
      if (!doctor) throw new AppError(404, 'Doctor not found');

      const today = startOfDay(new Date());
      const appointments = await prisma.appointment.findMany({
        where: {
          doctorId: doctor.id,
          date: { gte: today, lte: endOfDay(today) },
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
        include: { patient: true, symptoms: true, aiSummaries: { where: { type: 'PRE_VISIT' } } },
        orderBy: { startTime: 'asc' },
      });
      sendSuccess(res, appointments);
    } catch (err) {
      next(err);
    }
  };
}

export const appointmentController = new AppointmentController();
