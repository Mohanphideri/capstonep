import express from 'express';
import {
  joinQueue,
  getQueueStatus,
  getMyQueueToken,
  updateTokenStatus,
  leaveQueue,
} from '../controllers/queueController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Patient: join queue
router.post('/join', requireRole('patient'), joinQueue);

// Get queue status for a department
router.get('/status/:departmentId', getQueueStatus);

// Patient: get their queue token
router.get('/my-token', getMyQueueToken);

// Staff: call next patient, mark no-show, etc.
router.patch('/:id/status', updateTokenStatus);

// Patient: leave queue
router.delete('/:id/leave', leaveQueue);

export default router;
