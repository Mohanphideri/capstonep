import express from 'express';
import {
  applyForLeave,
  getMyLeaveRequests,
  getPendingLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
} from '../controllers/leaveController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Staff: apply for leave
router.post('/', requireRole('nurse', 'accountant', 'receptionist', 'pharmacist'), applyForLeave);

// Staff: get my leave requests
router.get('/mine', getMyLeaveRequests);

// Admin: get pending leave requests
router.get('/', requireRole('admin'), getPendingLeaveRequests);

// Admin: approve leave
router.patch('/:id/approve', requireRole('admin'), approveLeaveRequest);

// Admin: reject leave
router.patch('/:id/reject', requireRole('admin'), rejectLeaveRequest);

export default router;
