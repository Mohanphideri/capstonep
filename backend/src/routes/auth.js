import express from 'express';
import {
  sendOTP,
  verifyOTP,
  staffLogin,
  changePassword,
  getCurrentUser,
} from '../controllers/authController.js';
import { authenticate, requirePasswordReset } from '../middleware/auth.js';

const router = express.Router();

// Patient OTP flow
router.post('/patient/send-otp', sendOTP);
router.post('/patient/verify-otp', verifyOTP);

// Staff login
router.post('/staff/login', staffLogin);

// Restore session on page refresh / app startup - re-validates against the DB
router.get('/me', authenticate, getCurrentUser);

// Change password (for all authenticated users)
router.post('/change-password', authenticate, changePassword);

export default router;
