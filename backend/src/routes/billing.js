import express from 'express';
import {
  createBill,
  getBills,
  getBillableItems,
  markBillPaid,
} from '../controllers/billingController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Receptionist / admin: generate a bill for an appointment
router.post('/', requireRole('receptionist', 'admin'), createBill);

// Receptionist / accountant / admin: view bills (list + filters)
router.get('/', requireRole('receptionist', 'accountant', 'admin'), getBills);

// Receptionist / accountant / admin: pull billable items (prescription + fees) for an appointment code
router.get(
  '/billable/:code',
  requireRole('receptionist', 'accountant', 'admin'),
  getBillableItems
);

// Receptionist / accountant / admin: mark a bill paid
router.patch('/:id/pay', requireRole('receptionist', 'accountant', 'admin'), markBillPaid);

export default router;
