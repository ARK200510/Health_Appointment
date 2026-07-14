import { z } from 'zod';
import { Role } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerPatientSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  phone: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.string().optional(),
});

export const createDoctorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  specialization: z.string().min(2),
  qualification: z.string().optional(),
  experience: z.number().int().min(0).optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
  consultationFee: z.number().min(0).optional(),
  slotDuration: z.number().int().min(15).max(120).optional(),
});

export const updateDoctorSchema = createDoctorSchema.partial().omit({ email: true, password: true });

export const workingHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isActive: z.boolean().optional(),
});

export const leaveSchema = z.object({
  doctorId: z.string().uuid(),
  leaveType: z.enum(['FULL_DAY', 'HALF_DAY', 'EMERGENCY']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().optional(),
});

export const slotHoldSchema = z.object({
  doctorId: z.string().uuid(),
  date: z.string(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const bookAppointmentSchema = z.object({
  holdId: z.string().uuid(),
  reason: z.string().optional(),
  symptoms: z.object({
    description: z.string().min(10),
    duration: z.string().optional(),
    severity: z.string().optional(),
  }).optional(),
});

export const rescheduleSchema = z.object({
  holdId: z.string().uuid(),
  reason: z.string().optional(),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().min(3),
});

export const symptomSchema = z.object({
  appointmentId: z.string().uuid(),
  description: z.string().min(10),
  duration: z.string().optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
});

export const clinicalNotesSchema = z.object({
  clinicalNotes: z.string().min(5),
  diagnosis: z.string().optional(),
});

export const prescriptionSchema = z.object({
  appointmentId: z.string().uuid(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  medications: z.array(z.object({
    name: z.string().min(1),
    dosage: z.string().min(1),
    frequency: z.enum(['ONCE_DAILY', 'TWICE_DAILY', 'THREE_TIMES', 'WEEKLY', 'CUSTOM']),
    customSchedule: z.record(z.unknown()).optional(),
    instructions: z.string().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
  })).min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export const paginationSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const validate = <T>(schema: z.ZodSchema<T>) => {
  return (req: { body: unknown }, _res: unknown, next: (err?: unknown) => void) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
};
