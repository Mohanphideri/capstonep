import express from 'express';
import {
  setDoctorSlots,
  getDoctorSlots,
  getMyDoctorSlots,
  getAvailableSlotsForBooking,
} from '../controllers/scheduleController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Patient: available time slots for a department + date (no doctor picked by patient)
router.get('/available', requireRole('patient'), getAvailableSlotsForBooking);

// Doctor: view my own weekly schedule
router.get('/mine', requireRole('doctor'), getMyDoctorSlots);

// Admin: view / set a specific doctor's weekly schedule
router.get('/doctor/:doctorId', requireRole('admin'), getDoctorSlots);
router.put('/doctor/:doctorId', requireRole('admin'), setDoctorSlots);

export default router;
