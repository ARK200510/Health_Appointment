import prisma from '../config/database';
import { MedicationFrequency, ReminderStatus } from '@prisma/client';
import { emailService } from './email.service';

const FREQUENCY_HOURS: Record<MedicationFrequency, number[]> = {
  ONCE_DAILY: [9],
  TWICE_DAILY: [9, 21],
  THREE_TIMES: [9, 14, 21],
  WEEKLY: [9],
  CUSTOM: [],
};

export class MedicationService {
  async createPrescription(data: {
    appointmentId: string;
    doctorId: string;
    patientId: string;
    diagnosis?: string;
    notes?: string;
    medications: {
      name: string;
      dosage: string;
      frequency: MedicationFrequency;
      customSchedule?: Record<string, unknown>;
      instructions?: string;
      startDate: string;
      endDate?: string;
    }[];
  }) {
    return prisma.$transaction(async (tx) => {
      const prescription = await tx.prescription.create({
        data: {
          appointmentId: data.appointmentId,
          doctorId: data.doctorId,
          patientId: data.patientId,
          diagnosis: data.diagnosis,
          notes: data.notes,
        },
      });

      for (const med of data.medications) {
        const medication = await tx.medication.create({
          data: {
            prescriptionId: prescription.id,
            patientId: data.patientId,
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            customSchedule: med.customSchedule as object | undefined,
            instructions: med.instructions,
            startDate: new Date(med.startDate),
            endDate: med.endDate ? new Date(med.endDate) : null,
          },
        });

        await this.scheduleReminders(tx, medication.id, med.frequency, new Date(med.startDate), med.endDate ? new Date(med.endDate) : null);
      }

      return tx.prescription.findUnique({
        where: { id: prescription.id },
        include: { medications: { include: { reminders: true } } },
      });
    });
  }

  private async scheduleReminders(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    medicationId: string,
    frequency: MedicationFrequency,
    startDate: Date,
    endDate: Date | null
  ) {
    const hours = FREQUENCY_HOURS[frequency];
    const reminders: { medicationId: string; scheduledAt: Date }[] = [];
    const end = endDate || new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const dayIncrement = frequency === MedicationFrequency.WEEKLY ? 7 : 1;

    for (let d = new Date(startDate); d <= end; d.setDate(d.getDate() + dayIncrement)) {
      for (const hour of hours) {
        const scheduledAt = new Date(d);
        scheduledAt.setHours(hour, 0, 0, 0);
        if (scheduledAt > new Date()) {
          reminders.push({ medicationId, scheduledAt: new Date(scheduledAt) });
        }
      }
      if (frequency === MedicationFrequency.WEEKLY) break;
    }

    if (reminders.length > 0) {
      await tx.medicationReminder.createMany({ data: reminders });
    }
  }

  async processDueReminders() {
    const due = await prisma.medicationReminder.findMany({
      where: {
        status: ReminderStatus.PENDING,
        scheduledAt: { lte: new Date() },
      },
      include: {
        medication: {
          include: {
            patient: { include: { user: true } },
          },
        },
      },
      take: 50,
    });

    for (const reminder of due) {
      try {
        await emailService.medicationReminder({
          patientEmail: reminder.medication.patient.user.email,
          patientName: reminder.medication.patient.firstName,
          medicineName: reminder.medication.name,
          dosage: reminder.medication.dosage,
        });

        await prisma.medicationReminder.update({
          where: { id: reminder.id },
          data: { status: ReminderStatus.SENT, sentAt: new Date() },
        });
      } catch (error) {
        await prisma.medicationReminder.update({
          where: { id: reminder.id },
          data: {
            status: ReminderStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : 'Failed',
            retryCount: { increment: 1 },
          },
        });
      }
    }

    return due.length;
  }

  async getPatientMedications(patientId: string) {
    return prisma.medication.findMany({
      where: { patientId, isActive: true },
      include: { prescription: true, reminders: { take: 5, orderBy: { scheduledAt: 'desc' } } },
    });
  }
}

export const medicationService = new MedicationService();
