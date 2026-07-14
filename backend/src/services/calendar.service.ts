import { google } from 'googleapis';
import prisma from '../config/database';
import { config } from '../config';
import { AppError } from '../utils/errors';

export class CalendarService {
  private oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );

  getAuthUrl(userId: string) {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      state: userId,
      prompt: 'consent',
    });
  }

  async handleCallback(code: string, userId: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    await prisma.googleOAuthToken.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope,
      },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || undefined,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });
    return tokens;
  }

  async createEventForAppointment(appointmentId: string, userId: string) {
    const token = await prisma.googleOAuthToken.findUnique({ where: { userId } });
    if (!token) throw new AppError(400, 'Google Calendar not connected');

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: true,
        patient: { include: { user: true } },
      },
    });

    if (!appointment) throw new AppError(404, 'Appointment not found');

    this.oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken || undefined,
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const startDateTime = new Date(appointment.date);
    const [sh, sm] = appointment.startTime.split(':').map(Number);
    startDateTime.setHours(sh, sm, 0, 0);

    const endDateTime = new Date(appointment.date);
    const [eh, em] = appointment.endTime.split(':').map(Number);
    endDateTime.setHours(eh, em, 0, 0);

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Appointment with Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
        description: appointment.reason || 'Medical appointment',
        start: { dateTime: startDateTime.toISOString(), timeZone: 'UTC' },
        end: { dateTime: endDateTime.toISOString(), timeZone: 'UTC' },
        attendees: [{ email: appointment.patient.user.email }],
      },
    });

    await prisma.calendarEvent.create({
      data: {
        appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        googleEventId: event.data.id,
        title: event.data.summary || 'Appointment',
        description: event.data.description,
        startTime: startDateTime,
        endTime: endDateTime,
        isSynced: true,
      },
    });

    return event.data;
  }

  async deleteEvent(appointmentId: string, userId: string) {
    const calEvent = await prisma.calendarEvent.findFirst({
      where: { appointmentId },
    });
    if (!calEvent?.googleEventId) return;

    const token = await prisma.googleOAuthToken.findUnique({ where: { userId } });
    if (!token) return;

    this.oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken || undefined,
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: calEvent.googleEventId,
    });

    await prisma.calendarEvent.delete({ where: { id: calEvent.id } });
  }
}

export const calendarService = new CalendarService();
