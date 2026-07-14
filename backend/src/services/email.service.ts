import nodemailer from 'nodemailer';
import { config } from '../config';
import prisma from '../config/database';
import { NotificationType, NotificationStatus } from '@prisma/client';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter() {
    if (!this.transporter) {
      if (config.email.provider === 'sendgrid' && config.email.sendgrid.apiKey) {
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          auth: {
            user: 'apikey',
            pass: config.email.sendgrid.apiKey,
          },
        });
      } else {
        this.transporter = nodemailer.createTransport({
          host: config.email.smtp.host,
          port: config.email.smtp.port,
          secure: config.email.smtp.secure,
          auth: config.email.smtp.user
            ? { user: config.email.smtp.user, pass: config.email.smtp.pass }
            : undefined,
        });
      }
    }
    return this.transporter;
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    type: NotificationType;
    userId?: string;
    metadata?: Record<string, unknown>;
  }) {
    const notification = await prisma.notification.create({
      data: {
        email: params.to,
        userId: params.userId,
        type: params.type,
        subject: params.subject,
        body: params.html,
        status: NotificationStatus.PENDING,
        metadata: (params.metadata || {}) as object,
      },
    });

    try {
      if (config.nodeEnv === 'development' && !config.email.smtp.user) {
        console.log(`[EMAIL DEV] To: ${params.to} | Subject: ${params.subject}`);
        await prisma.notification.update({
          where: { id: notification.id },
          data: { status: NotificationStatus.SENT, sentAt: new Date() },
        });
        return notification;
      }

      await this.getTransporter().sendMail({
        from: config.email.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.SENT, sentAt: new Date() },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: message,
          retryCount: { increment: 1 },
        },
      });
      throw error;
    }

    return notification;
  }

  async retryFailed(notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new Error('Notification not found');
    if (notification.retryCount >= notification.maxRetries) {
      throw new Error('Max retries exceeded');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: NotificationStatus.RETRYING },
    });

    return this.sendEmail({
      to: notification.email,
      subject: notification.subject,
      html: notification.body,
      type: notification.type,
      userId: notification.userId || undefined,
      metadata: (notification.metadata as Record<string, unknown>) || undefined,
    });
  }

  bookingConfirmation(data: {
    patientEmail: string;
    patientName: string;
    doctorName: string;
    date: string;
    time: string;
    userId?: string;
  }) {
    return this.sendEmail({
      to: data.patientEmail,
      subject: 'Appointment Confirmed - HealthCare+',
      type: NotificationType.BOOKING_CONFIRMATION,
      userId: data.userId,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0d9488;">Appointment Confirmed</h2>
          <p>Dear ${data.patientName},</p>
          <p>Your appointment has been confirmed.</p>
          <div style="background: #f0fdfa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Doctor:</strong> Dr. ${data.doctorName}</p>
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Time:</strong> ${data.time}</p>
          </div>
          <p>Please arrive 10 minutes early.</p>
        </div>
      `,
    });
  }

  appointmentReminder(data: {
    patientEmail: string;
    patientName: string;
    doctorName: string;
    date: string;
    time: string;
  }) {
    return this.sendEmail({
      to: data.patientEmail,
      subject: 'Appointment Reminder - Tomorrow',
      type: NotificationType.APPOINTMENT_REMINDER,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2 style="color: #0d9488;">Appointment Reminder</h2>
          <p>Hi ${data.patientName}, this is a reminder for your appointment with Dr. ${data.doctorName} on ${data.date} at ${data.time}.</p>
        </div>
      `,
    });
  }

  cancellationNotice(data: {
    email: string;
    name: string;
    doctorName: string;
    date: string;
    reason?: string;
  }) {
    return this.sendEmail({
      to: data.email,
      subject: 'Appointment Cancelled',
      type: NotificationType.CANCELLATION,
      html: `
        <p>Hi ${data.name}, your appointment with Dr. ${data.doctorName} on ${data.date} has been cancelled.</p>
        ${data.reason ? `<p>Reason: ${data.reason}</p>` : ''}
      `,
    });
  }

  doctorLeaveNotice(data: {
    patientEmail: string;
    patientName: string;
    doctorName: string;
    date: string;
    reason?: string;
  }) {
    return this.sendEmail({
      to: data.patientEmail,
      subject: 'Doctor Unavailable - Reschedule Required',
      type: NotificationType.DOCTOR_LEAVE,
      html: `
        <p>Dear ${data.patientName}, Dr. ${data.doctorName} is unavailable on ${data.date}.</p>
        <p>Please log in to reschedule your appointment.</p>
        ${data.reason ? `<p>Reason: ${data.reason}</p>` : ''}
      `,
    });
  }

  medicationReminder(data: {
    patientEmail: string;
    patientName: string;
    medicineName: string;
    dosage: string;
  }) {
    return this.sendEmail({
      to: data.patientEmail,
      subject: `Medication Reminder: ${data.medicineName}`,
      type: NotificationType.MEDICATION_REMINDER,
      html: `
        <p>Hi ${data.patientName}, it's time to take your medication:</p>
        <p><strong>${data.medicineName}</strong> - ${data.dosage}</p>
      `,
    });
  }

  passwordReset(data: { email: string; resetLink: string }) {
    return this.sendEmail({
      to: data.email,
      subject: 'Password Reset Request',
      type: NotificationType.PASSWORD_RESET,
      html: `<p>Click <a href="${data.resetLink}">here</a> to reset your password. Link expires in 1 hour.</p>`,
    });
  }
}

export const emailService = new EmailService();
