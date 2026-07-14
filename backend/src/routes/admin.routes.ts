import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate, createDoctorSchema, leaveSchema } from '../validators/schemas';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/dashboard', adminController.dashboard);
router.get('/doctors', adminController.getDoctors);
router.post('/doctors', validate(createDoctorSchema), adminController.createDoctor);
router.put('/doctors/:id', adminController.updateDoctor);
router.delete('/doctors/:id', adminController.deleteDoctor);
router.get('/patients', adminController.getPatients);
router.post('/leaves', validate(leaveSchema), adminController.createLeave);
router.put('/working-hours', adminController.updateWorkingHours);
router.put('/doctors/:id/slot-duration', adminController.updateSlotDuration);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/ai-logs', adminController.getAILogs);
router.get('/notifications/failed', adminController.getFailedNotifications);
router.post('/notifications/:id/retry', adminController.retryNotification);

export default router;
