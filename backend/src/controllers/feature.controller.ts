import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { aiService } from '../services/ai.service';
import { medicationService } from '../services/medication.service';
import { calendarService } from '../services/calendar.service';
import { sendSuccess, AppError } from '../utils/errors';
import prisma from '../config/database';

export class AIController {
  analyzeSymptoms = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const symptom = await prisma.symptom.findUnique({
        where: { id: req.body.symptomId },
        include: { appointment: true },
      });
      if (!symptom) throw new AppError(404, 'Symptom not found');

      const summary = await aiService.analyzeSymptoms(
        symptom.appointmentId,
        symptom.id,
        symptom.description
      );
      sendSuccess(res, summary, 'AI analysis complete');
    } catch (err) {
      next(err);
    }
  };

  postVisitSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const summary = await aiService.generatePostVisitSummary(
        req.body.appointmentId,
        req.body.clinicalNotes
      );
      sendSuccess(res, summary, 'Post-visit summary generated');
    } catch (err) {
      next(err);
    }
  };

  getSummaries = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const summaries = await prisma.aISummary.findMany({
        where: { appointmentId: req.params.appointmentId },
        orderBy: { createdAt: 'desc' },
      });
      sendSuccess(res, summaries);
    } catch (err) {
      next(err);
    }
  };
}

export class MedicationController {
  createPrescription = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
      if (!doctor) throw new AppError(404, 'Doctor not found');

      const appointment = await prisma.appointment.findUnique({ where: { id: req.body.appointmentId } });
      if (!appointment) throw new AppError(404, 'Appointment not found');

      const prescription = await medicationService.createPrescription({
        ...req.body,
        doctorId: doctor.id,
        patientId: appointment.patientId,
      });
      sendSuccess(res, prescription, 'Prescription created', 201);
    } catch (err) {
      next(err);
    }
  };

  getMyMedications = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
      if (!patient) throw new AppError(404, 'Patient not found');
      const medications = await medicationService.getPatientMedications(patient.id);
      sendSuccess(res, medications);
    } catch (err) {
      next(err);
    }
  };
}

export class CalendarController {
  getAuthUrl = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const url = calendarService.getAuthUrl(req.user!.userId);
      sendSuccess(res, { url });
    } catch (err) {
      next(err);
    }
  };

  callback = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { code, state } = req.query as { code: string; state: string };
      await calendarService.handleCallback(code, state);
      res.redirect(`${process.env.FRONTEND_URL}/patient/calendar?connected=true`);
    } catch (err) {
      next(err);
    }
  };

  syncAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const event = await calendarService.createEventForAppointment(
        req.params.appointmentId,
        req.user!.userId
      );
      sendSuccess(res, event, 'Calendar event created');
    } catch (err) {
      next(err);
    }
  };
}

export const aiController = new AIController();
export const medicationController = new MedicationController();
export const calendarController = new CalendarController();
