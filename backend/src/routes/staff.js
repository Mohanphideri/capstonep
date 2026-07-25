import express from 'express';
import {
  addStaff,
  getStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  getDoctors,
  getMyProfile,
  updateMyProfile,
} from '../controllers/staffController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Self-service profile (any authenticated staff/doctor)
router.get('/me', getMyProfile);
router.patch('/me', updateMyProfile);

// Admin only
router.post('/', requireRole('admin'), addStaff);
router.get('/', requireRole('admin', 'accountant'), getStaff);
router.get('/id/:id', getStaffById);
router.patch('/:id', requireRole('admin'), updateStaff);
router.delete('/:id', requireRole('admin'), deleteStaff);

// Public staff endpoints
router.get('/doctors', getDoctors);

export default router;
