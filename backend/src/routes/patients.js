import express from 'express';
import {
  getMyPatientProfile,
  updateMyPatientProfile,
  findPatientByPhone,
} from '../controllers/patientController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/me', requireRole('patient'), getMyPatientProfile);
router.patch('/me', requireRole('patient'), updateMyPatientProfile);

// Doctor / nurse / receptionist / admin: look up a patient by phone (e.g. for IPD admission)
router.get(
  '/by-phone/:phone',
  requireRole('doctor', 'nurse', 'receptionist', 'admin'),
  findPatientByPhone
);

export default router;
