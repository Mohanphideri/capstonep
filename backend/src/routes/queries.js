import express from 'express';
import {
  createQuery,
  createQueryOnBehalf,
  getMyQueries,
  getAllQueries,
  getAssignedQueries,
  manageQuery,
  replyToQuery,
  patientReplyToQuery,
} from '../controllers/queryController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Patient: raise a ticket
router.post('/', requireRole('patient'), createQuery);

// Receptionist / admin: raise a ticket at the desk on behalf of a patient
router.post('/on-behalf', requireRole('receptionist', 'admin'), createQueryOnBehalf);

// Patient: view my own tickets
router.get('/mine', requireRole('patient'), getMyQueries);

// Patient: send a follow-up message on my own ticket
router.patch('/:id/patient-reply', requireRole('patient'), patientReplyToQuery);

// Any staff member: tickets currently redirected to me by admin
router.get(
  '/assigned',
  requireRole('doctor', 'nurse', 'accountant', 'receptionist', 'pharmacist'),
  getAssignedQueries
);

// Admin: view every ticket
router.get('/', requireRole('admin'), getAllQueries);

// Admin only: redirect ticket to a staff member and/or change its status
router.patch('/:id/manage', requireRole('admin'), manageQuery);

// Admin, or the staff member the ticket is assigned to: reply to the patient
router.patch(
  '/:id/reply',
  requireRole('admin', 'doctor', 'nurse', 'accountant', 'receptionist', 'pharmacist'),
  replyToQuery
);

export default router;
