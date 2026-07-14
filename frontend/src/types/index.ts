export type Role = 'ADMIN' | 'DOCTOR' | 'PATIENT';

export interface User {
  id: string;
  email: string;
  role: Role;
  isVerified: boolean;
  profile?: Record<string, unknown>;
}

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string;
  qualification?: string;
  experience: number;
  bio?: string;
  avatar?: string;
  consultationFee: number;
  rating: number;
  totalReviews: number;
  slotDuration: number;
  workingHours?: WorkingHours[];
}

export interface WorkingHours {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  reason?: string;
  clinicalNotes?: string;
  patient?: { firstName: string; lastName: string; phone?: string };
  doctor?: { firstName: string; lastName: string; specialization: string };
  symptoms?: Symptom[];
  aiSummaries?: AISummary[];
}

export interface Symptom {
  id: string;
  description: string;
  duration?: string;
  severity?: string;
}

export interface AISummary {
  id: string;
  type: string;
  urgencyLevel?: string;
  chiefComplaint?: string;
  riskFactors?: string[];
  doctorQuestions?: string[];
  redFlags?: string[];
  confidenceScore?: number;
  simpleExplanation?: string;
  diagnosis?: string;
  status: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface DashboardStats {
  appointmentsToday: number;
  weeklyAppointments: number;
  cancelled: number;
  completed: number;
  totalPatients: number;
  totalDoctors: number;
  aiUsage: number;
  revenuePlaceholder: number;
  systemStatus: string;
  recentBookings: Appointment[];
  popularSpecializations: { specialization: string; _count: { specialization: number } }[];
  mostVisitedDoctor: { firstName: string; lastName: string; specialization: string } | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
