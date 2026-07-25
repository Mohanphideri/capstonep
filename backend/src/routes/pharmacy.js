import express from 'express';
import {
  createPrescription,
  getPrescriptions,
  getMyPrescriptions,
  updateMedicineAvailability,
  addMedicine,
  addMedicineBatch,
  getMedicines,
  getExpiringBatches,
  updateMedicine,
  updateMedicineBatch,
  deleteMedicine,
} from '../controllers/pharmacyController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Prescriptions
router.post('/prescriptions', requireRole('doctor'), createPrescription);
router.get('/prescriptions', getPrescriptions);
router.get('/my-prescriptions', requireRole('patient'), getMyPrescriptions);
router.patch('/prescriptions/:id/availability', requireRole('pharmacist'), updateMedicineAvailability);

// Medicines (inventory) - catalog + batch/lot tracking
router.post('/medicines', requireRole('pharmacist'), addMedicine);
router.get('/medicines', getMedicines);
router.get('/medicines/expiring', requireRole('pharmacist', 'receptionist', 'admin'), getExpiringBatches);
router.patch('/medicines/:id', requireRole('pharmacist'), updateMedicine);
router.delete('/medicines/:id', requireRole('pharmacist'), deleteMedicine);
router.post('/medicines/:id/batches', requireRole('pharmacist'), addMedicineBatch);
router.patch('/medicines/:id/batches/:batchId', requireRole('pharmacist'), updateMedicineBatch);

export default router;
