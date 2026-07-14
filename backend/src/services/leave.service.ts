import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { emailService } from './email.service';
import { startOfDay, endOfDay } from '../utils/helpers';
import { LeaveType } from '@prisma/client';

export class LeaveService {
  async createLeave(data: {
    doctorId: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
    reason?: string;
    createdBy?: string;
  }) {
    const leave = await prisma.doctorLeave.create({
      data: {
        doctorId: data.doctorId,
        leaveType: data.leaveType,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
        createdBy: data.createdBy,
      },
      include: { doctor: { include: { user: true } } },
    });

    await this.handleAffectedAppointments(leave);
    return leave;
  }

  private async handleAffectedAppointments(leave: {
    id: string;
    doctorId: string;
    startDate: Date;
    endDate: Date;
    reason?: string | null;
    doctor: { firstName: string; lastName: string };
  }) {
    const affected = await prisma.appointment.findMany({
      where: {
        doctorId: leave.doctorId,
        date: { gte: startOfDay(leave.startDate), lte: endOfDay(leave.endDate) },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: {
        patient: { include: { user: true } },
      },
    });

    for (const appointment of affected) {
      await emailService.doctorLeaveNotice({
        patientEmail: appointment.patient.user.email,
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        doctorName: `Dr. ${leave.doctor.firstName} ${leave.doctor.lastName}`,
        date: appointment.date.toDateString(),
        reason: leave.reason || undefined,
      });
    }

    return affected;
  }

  async getDoctorLeaves(doctorId: string) {
    return prisma.doctorLeave.findMany({
      where: { doctorId },
      orderBy: { startDate: 'desc' },
    });
  }

  async deleteLeave(leaveId: string) {
    const leave = await prisma.doctorLeave.findUnique({ where: { id: leaveId } });
    if (!leave) throw new AppError(404, 'Leave not found');
    return prisma.doctorLeave.delete({ where: { id: leaveId } });
  }
}

export const leaveService = new LeaveService();
