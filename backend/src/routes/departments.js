import express from 'express';
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  assignDoctorToDepartment,
  removeDoctorFromDepartment,
} from '../controllers/departmentController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Public: get departments
router.get('/', getDepartments);
router.get('/:id', getDepartmentById);

router.use(authenticate);

// Admin only
router.post('/', requireRole('admin'), createDepartment);
router.patch('/:id/assign-doctor', requireRole('admin'), assignDoctorToDepartment);
router.patch('/:id/remove-doctor', requireRole('admin'), removeDoctorFromDepartment);

export default router;
