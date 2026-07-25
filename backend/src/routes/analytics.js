import express from 'express';
import { getOverview } from '../controllers/analyticsController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Admin only
router.get('/overview', requireRole('admin'), getOverview);

export default router;
