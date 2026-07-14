import { Queue, Worker } from 'bullmq';
import { config } from '../config';
import { slotService } from '../services/appointment.service';
import { medicationService } from '../services/medication.service';
import { emailService } from '../services/email.service';
import prisma from '../config/database';
import { startOfDay, endOfDay } from '../utils/helpers';

const connection = { url: config.redis.url, maxRetriesPerRequest: null };

export const reminderQueue = new Queue('reminders', { connection });
export const slotQueue = new Queue('slot-cleanup', { connection });
export const notificationQueue = new Queue('notifications', { connection });

// Slot hold cleanup - every minute
new Worker('slot-cleanup', async () => {
  const released = await slotService.releaseExpiredHolds();
  if (released > 0) console.log(`Released ${released} expired slot holds`);
}, { connection });

// Medication reminders - every 5 minutes
new Worker('reminders', async () => {
  const processed = await medicationService.processDueReminders();
  if (processed > 0) console.log(`Processed ${processed} medication reminders`);
}, { connection });

// Appointment reminders - daily
new Worker('notifications', async (job) => {
  if (job.name === 'appointment-reminders') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const appointments = await prisma.appointment.findMany({
      where: {
        date: { gte: startOfDay(tomorrow), lte: endOfDay(tomorrow) },
        status: 'CONFIRMED',
      },
      include: {
        patient: { include: { user: true } },
        doctor: true,
      },
    });

    for (const apt of appointments) {
      await emailService.appointmentReminder({
        patientEmail: apt.patient.user.email,
        patientName: apt.patient.firstName,
        doctorName: `${apt.doctor.firstName} ${apt.doctor.lastName}`,
        date: apt.date.toDateString(),
        time: apt.startTime,
      });
    }
  }

  if (job.name === 'retry-notifications') {
    const failed = await prisma.notification.findMany({
      where: { status: 'FAILED', retryCount: { lt: 3 } },
      take: 10,
    });
    for (const n of failed) {
      await emailService.retryFailed(n.id).catch(console.error);
    }
  }
}, { connection });

async function scheduleJobs() {
  await slotQueue.add('cleanup', {}, { repeat: { every: 60000 } });
  await reminderQueue.add('medication', {}, { repeat: { every: 300000 } });
  await notificationQueue.add('appointment-reminders', {}, { repeat: { every: 86400000 } });
  await notificationQueue.add('retry-notifications', {}, { repeat: { every: 3600000 } });
  console.log('Background workers started');
}

scheduleJobs().catch(console.error);
