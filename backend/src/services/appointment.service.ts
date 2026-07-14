import prisma from '../config/database';
import { config } from '../config';
import { AppError } from '../utils/errors';
import {
  addMinutesToTime,
  timeToMinutes,
  startOfDay,
  endOfDay,
  isSameDay,
} from '../utils/helpers';
import { AppointmentStatus, SlotHoldStatus, LeaveType, Prisma, type WorkingHours } from '@prisma/client';

export class SlotService {
  async getAvailableSlots(doctorId: string, dateStr: string) {
    const date = startOfDay(new Date(dateStr));
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { workingHours: true, leaves: { where: { status: 'APPROVED' } } },
    });

    if (!doctor || !doctor.isAvailable) {
      throw new AppError(404, 'Doctor not found or unavailable');
    }

    const dayOfWeek = date.getDay();
    const workingHour = doctor.workingHours.find(
      (wh: WorkingHours) => wh.dayOfWeek === dayOfWeek && wh.isActive
    );

    if (!workingHour) return [];

    if (this.isOnLeave(doctor.leaves, date, workingHour.startTime, workingHour.endTime)) {
      return [];
    }

    const slots = this.generateTimeSlots(
      workingHour.startTime,
      workingHour.endTime,
      doctor.slotDuration
    );

    const [appointments, holds] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          doctorId,
          date: { gte: date, lte: endOfDay(date) },
          status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
        },
      }),
      prisma.slotHold.findMany({
        where: {
          doctorId,
          date: { gte: date, lte: endOfDay(date) },
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    const bookedTimes = new Set([
      ...appointments.map((a: { startTime: string }) => a.startTime),
      ...holds.map((h: { startTime: string }) => h.startTime),
    ]);

    return slots
      .filter((slot) => !bookedTimes.has(slot.startTime))
      .map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        available: true,
      }));
  }

  async holdSlot(patientId: string, doctorId: string, dateStr: string, startTime: string) {
    const date = startOfDay(new Date(dateStr));
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new AppError(404, 'Doctor not found');

    const endTime = addMinutesToTime(startTime, doctor.slotDuration);
    const expiresAt = new Date(Date.now() + config.slotHold.durationMinutes * 60 * 1000);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Release expired holds first
      await tx.slotHold.updateMany({
        where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
        data: { status: 'EXPIRED' },
      });

      const existingAppointment = await tx.appointment.findFirst({
        where: {
          doctorId,
          date: { gte: date, lte: endOfDay(date) },
          startTime,
          status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
        },
      });

      if (existingAppointment) {
        throw new AppError(409, 'Slot already booked');
      }

      const existingHold = await tx.slotHold.findFirst({
        where: {
          doctorId,
          date: { gte: date, lte: endOfDay(date) },
          startTime,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
      });

      if (existingHold && existingHold.patientId !== patientId) {
        throw new AppError(409, 'Slot is temporarily held by another patient');
      }

      if (existingHold) {
        return tx.slotHold.update({
          where: { id: existingHold.id },
          data: { expiresAt },
        });
      }

      return tx.slotHold.create({
        data: {
          doctorId,
          patientId,
          date,
          startTime,
          endTime,
          expiresAt,
          status: SlotHoldStatus.ACTIVE,
        },
      });
    }, {
      isolationLevel: 'Serializable',
    });
  }

  async releaseExpiredHolds() {
    const result = await prisma.slotHold.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
      data: { status: SlotHoldStatus.EXPIRED },
    });
    return result.count;
  }

  private generateTimeSlots(start: string, end: string, duration: number) {
    const slots: { startTime: string; endTime: string }[] = [];
    let current = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);

    while (current + duration <= endMinutes) {
      const startTime = `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`;
      const endTime = addMinutesToTime(startTime, duration);
      slots.push({ startTime, endTime });
      current += duration;
    }
    return slots;
  }

  private isOnLeave(
    leaves: { leaveType: LeaveType; startDate: Date; endDate: Date; startTime?: string | null; endTime?: string | null }[],
    date: Date,
    workStart: string,
    workEnd: string
  ): boolean {
    return leaves.some((leave) => {
      const leaveStart = startOfDay(leave.startDate);
      const leaveEnd = endOfDay(leave.endDate);
      if (date < leaveStart || date > leaveEnd) return false;

      if (leave.leaveType === LeaveType.FULL_DAY || leave.leaveType === LeaveType.EMERGENCY) {
        return true;
      }

      if (leave.leaveType === LeaveType.HALF_DAY && leave.startTime && leave.endTime) {
        const leaveStartMin = timeToMinutes(leave.startTime);
        const leaveEndMin = timeToMinutes(leave.endTime);
        const workStartMin = timeToMinutes(workStart);
        const workEndMin = timeToMinutes(workEnd);
        return leaveStartMin <= workEndMin && leaveEndMin >= workStartMin;
      }

      return false;
    });
  }
}

export class AppointmentService {
  private slotService = new SlotService();

  async bookFromHold(holdId: string, patientId: string, reason?: string, symptoms?: {
    description: string;
    duration?: string;
    severity?: string;
  }) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const hold = await tx.slotHold.findUnique({ where: { id: holdId } });

      if (!hold || hold.patientId !== patientId) {
        throw new AppError(404, 'Slot hold not found');
      }
      if (hold.status !== 'ACTIVE' || hold.expiresAt < new Date()) {
        throw new AppError(410, 'Slot hold has expired. Please select a new slot.');
      }

      const existing = await tx.appointment.findFirst({
        where: {
          doctorId: hold.doctorId,
          date: hold.date,
          startTime: hold.startTime,
          status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
        },
      });

      if (existing) {
        throw new AppError(409, 'Slot no longer available');
      }

      const appointment = await tx.appointment.create({
        data: {
          patientId,
          doctorId: hold.doctorId,
          date: hold.date,
          startTime: hold.startTime,
          endTime: hold.endTime,
          status: AppointmentStatus.CONFIRMED,
          reason,
          symptoms: symptoms
            ? {
                create: {
                  patientId,
                  description: symptoms.description,
                  duration: symptoms.duration,
                  severity: symptoms.severity,
                  attachments: [],
                },
              }
            : undefined,
        },
        include: {
          doctor: { include: { user: { select: { email: true } } } },
          patient: { include: { user: { select: { email: true } } } },
          symptoms: true,
        },
      });

      await tx.slotHold.update({
        where: { id: holdId },
        data: { status: SlotHoldStatus.CONVERTED },
      });

      return appointment;
    }, { isolationLevel: 'Serializable' });
  }

  async cancel(appointmentId: string, userId: string, role: string, reason: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    if (!appointment) throw new AppError(404, 'Appointment not found');

    if (role === 'PATIENT' && appointment.patient.userId !== userId) {
      throw new AppError(403, 'Not authorized');
    }
    if (role === 'DOCTOR' && appointment.doctor.userId !== userId) {
      throw new AppError(403, 'Not authorized');
    }

    if (['CANCELLED', 'COMPLETED'].includes(appointment.status)) {
      throw new AppError(400, 'Appointment cannot be cancelled');
    }

    return prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
      },
    });
  }

  async reschedule(appointmentId: string, holdId: string, patientId: string, reason?: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: { patient: true },
      });

      if (!appointment || appointment.patientId !== patientId) {
        throw new AppError(404, 'Appointment not found');
      }

      const hold = await tx.slotHold.findUnique({ where: { id: holdId } });
      if (!hold || hold.patientId !== patientId || hold.status !== 'ACTIVE' || hold.expiresAt < new Date()) {
        throw new AppError(410, 'Invalid or expired slot hold');
      }

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.RESCHEDULED },
      });

      const newAppointment = await tx.appointment.create({
        data: {
          patientId,
          doctorId: hold.doctorId,
          date: hold.date,
          startTime: hold.startTime,
          endTime: hold.endTime,
          status: AppointmentStatus.CONFIRMED,
          reason: reason || appointment.reason,
          rescheduleCount: appointment.rescheduleCount + 1,
        },
        include: {
          doctor: { include: { user: true } },
          patient: { include: { user: true } },
        },
      });

      await tx.slotHold.update({
        where: { id: holdId },
        data: { status: SlotHoldStatus.CONVERTED },
      });

      return newAppointment;
    }, { isolationLevel: 'Serializable' });
  }

  async complete(appointmentId: string, doctorUserId: string, clinicalNotes: string) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, doctor: { userId: doctorUserId } },
    });
    if (!appointment) throw new AppError(404, 'Appointment not found');

    return prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.COMPLETED,
        clinicalNotes,
        completedAt: new Date(),
      },
    });
  }

  getAvailableSlots = (doctorId: string, date: string) =>
    this.slotService.getAvailableSlots(doctorId, date);

  holdSlot = (patientId: string, doctorId: string, date: string, startTime: string) =>
    this.slotService.holdSlot(patientId, doctorId, date, startTime);
}

export const appointmentService = new AppointmentService();
export const slotService = new SlotService();
