import express from 'express';
import {
  createWard,
  addBed,
  getWards,
  updateBedStatus,
  admitPatient,
  getAdmissions,
  getAdmissionById,
  transferBed,
  dischargePatient,
  createIpdBill,
} from '../controllers/ipdController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Wards & beds
router.post('/wards', requireRole('admin'), createWard);
router.get('/wards', requireRole('doctor', 'nurse', 'receptionist', 'accountant', 'admin'), getWards);
router.post('/wards/:id/beds', requireRole('admin'), addBed);
router.patch('/wards/:id/beds/:bedId/status', requireRole('admin', 'nurse'), updateBedStatus);

// Admissions
router.post('/admissions', requireRole('doctor', 'receptionist', 'admin'), admitPatient);
router.get('/admissions', requireRole('doctor', 'nurse', 'receptionist', 'admin'), getAdmissions);
router.get('/admissions/:id', requireRole('doctor', 'nurse', 'receptionist', 'admin'), getAdmissionById);
router.patch('/admissions/:id/transfer', requireRole('doctor', 'nurse', 'admin'), transferBed);
router.patch('/admissions/:id/discharge', requireRole('doctor', 'admin'), dischargePatient);
router.post('/admissions/:id/bill', requireRole('receptionist', 'accountant', 'admin'), createIpdBill);

export default router;
