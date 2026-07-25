import Department from '../models/Department.js';
import User from '../models/User.js';

export const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Department name required' });
    }

    const department = await Department.create({ name });

    res.status(201).json({
      message: 'Department created successfully',
      department,
    });
  } catch (error) {
    console.error('Create Department Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().populate('doctors');

    res.json(departments);
  } catch (error) {
    console.error('Get Departments Error:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

export const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id).populate('doctors');

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json(department);
  } catch (error) {
    console.error('Get Department By ID Error:', error);
    res.status(500).json({ error: 'Failed to fetch department' });
  }
};

export const assignDoctorToDepartment = async (req, res) => {
  try {
    const { doctorId } = req.body;

    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor ID required' });
    }

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { doctors: doctorId } },
      { new: true }
    ).populate('doctors');

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Update doctor's department
    await User.findByIdAndUpdate(doctorId, { department: req.params.id });

    res.json({
      message: 'Doctor assigned to department',
      department,
    });
  } catch (error) {
    console.error('Assign Doctor Error:', error);
    res.status(500).json({ error: 'Failed to assign doctor' });
  }
};

export const removeDoctorFromDepartment = async (req, res) => {
  try {
    const { doctorId } = req.body;

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { $pull: { doctors: doctorId } },
      { new: true }
    ).populate('doctors');

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({
      message: 'Doctor removed from department',
      department,
    });
  } catch (error) {
    console.error('Remove Doctor Error:', error);
    res.status(500).json({ error: 'Failed to remove doctor' });
  }
};
