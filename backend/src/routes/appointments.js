import express from 'express';
import {
  bookAppointment,
  getMyAppointments,
  getAllAppointments,
  getAvailableSlots,
  updateAppointmentStatus,
  reassignDoctor,
  cancelAppointment,
  getAppointmentByCode,
  getCancelReasons,
} from '../controllers/appointmentController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Patient: book appointment
router.post('/', requireRole('patient'), bookAppointment);

// Get available slots
router.get('/available-slots', getAvailableSlots);

// List of valid cancellation reasons shown as options to the patient
router.get('/cancel-reasons', getCancelReasons);

// Get my appointments
router.get('/mine', getMyAppointments);

// Front-desk / pharmacy: look up an appointment by its human-readable code
router.get('/lookup/:code', getAppointmentByCode);

// Admin + receptionist: get all appointments (reception needs this to check patients in)
router.get('/', requireRole('admin', 'receptionist'), getAllAppointments);

// Update appointment status (check-in / complete / no-show) - front-desk and clinical staff only
router.patch(
  '/:id/status',
  requireRole('admin', 'doctor', 'nurse', 'receptionist'),
  updateAppointmentStatus
);

// Receptionist / admin: reassign an appointment to a different doctor
router.patch('/:id/assign-doctor', requireRole('admin', 'receptionist'), reassignDoctor);

// Cancel appointment
router.delete('/:id', cancelAppointment);

export default router;
