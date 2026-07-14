import { Router } from 'express';
import { aiController, medicationController, calendarController } from '../controllers/feature.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate, prescriptionSchema } from '../validators/schemas';

const router = Router();

router.get('/calendar/oauth/callback', calendarController.callback);

router.use(authenticate);

router.post('/analyze', authorize('DOCTOR', 'PATIENT'), aiController.analyzeSymptoms);
router.post('/post-visit', authorize('DOCTOR'), aiController.postVisitSummary);
router.get('/summaries/:appointmentId', aiController.getSummaries);

router.post('/prescriptions', authorize('DOCTOR'), validate(prescriptionSchema), medicationController.createPrescription);
router.get('/medications', authorize('PATIENT'), medicationController.getMyMedications);

router.get('/calendar/auth', calendarController.getAuthUrl);
router.post('/calendar/sync/:appointmentId', authorize('PATIENT'), calendarController.syncAppointment);

export default router;
