import express from 'express';
import {
  createEncounter,
  updateEncounter,
  getEncountersForPatient,
  getMyEncounters,
  getEncountersForAppointment,
  getEncountersForAdmission,
} from '../controllers/encounterController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Doctor: record a new encounter (vitals, diagnosis, notes)
router.post('/', requireRole('doctor'), createEncounter);

// Doctor / admin: edit an encounter
router.patch('/:id', requireRole('doctor', 'admin'), updateEncounter);

// Patient: their own clinical history
router.get('/mine', requireRole('patient'), getMyEncounters);

// Doctor / nurse / admin: a patient's full clinical history
router.get('/patient/:patientId', requireRole('doctor', 'nurse', 'admin'), getEncountersForPatient);

// Doctor / nurse / receptionist / admin: encounters tied to a specific OPD visit or IPD stay
router.get(
  '/appointment/:appointmentId',
  requireRole('doctor', 'nurse', 'receptionist', 'admin'),
  getEncountersForAppointment
);
router.get(
  '/admission/:admissionId',
  requireRole('doctor', 'nurse', 'receptionist', 'admin'),
  getEncountersForAdmission
);

export default router;
