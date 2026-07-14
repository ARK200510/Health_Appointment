import { Router } from 'express';
import { doctorController } from '../controllers/admin.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/search', optionalAuth, doctorController.search);

router.use(authenticate, authorize('DOCTOR'));
router.get('/me/patients', doctorController.getPatients);
router.put('/me/profile', doctorController.updateProfile);
router.get('/me/working-hours', doctorController.getWorkingHours);

router.get('/:id', doctorController.getProfile);

export default router;
