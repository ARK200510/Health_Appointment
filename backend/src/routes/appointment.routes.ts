import { Router } from 'express';
import { appointmentController } from '../controllers/appointment.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate, slotHoldSchema, bookAppointmentSchema, cancelAppointmentSchema, rescheduleSchema, clinicalNotesSchema } from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get('/slots', appointmentController.getSlots);
router.post('/hold', authorize('PATIENT'), validate(slotHoldSchema), appointmentController.holdSlot);
router.post('/book', authorize('PATIENT'), validate(bookAppointmentSchema), appointmentController.book);
router.get('/', appointmentController.list);
router.get('/today', authorize('DOCTOR'), appointmentController.todaySchedule);
router.get('/:id', appointmentController.getById);
router.post('/:id/cancel', validate(cancelAppointmentSchema), appointmentController.cancel);
router.post('/:id/reschedule', authorize('PATIENT'), validate(rescheduleSchema), appointmentController.reschedule);
router.post('/:id/complete', authorize('DOCTOR'), validate(clinicalNotesSchema), appointmentController.complete);

export default router;
