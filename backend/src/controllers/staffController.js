import User from '../models/User.js';
import Department from '../models/Department.js';
import { hashPassword, generateUsername, generateTempPassword } from '../utils/crypto.js';

export const addStaff = async (req, res) => {
  try {
    const {
      name,
      contactNumber,
      email,
      role,
      designation,
      degree,
      registrationNo,
      departmentId,
      consultationFee,
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      emergencyContactName,
      emergencyContactNumber,
      qualification,
      experienceYears,
      joiningDate,
      shiftTiming,
      employeeIdProof,
      salary,
    } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role required' });
    }

    if (!contactNumber) {
      return res.status(400).json({ error: 'Contact number is required to generate a username' });
    }

    // Generate a unique username: first 3 letters of name + last 3 digits of phone + "H"
    const baseUsername = generateUsername(name, contactNumber);
    let username = baseUsername;
    let suffix = 2;
    while (await User.findOne({ username })) {
      username = `${baseUsername}${suffix}`;
      suffix += 1;
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const user = await User.create({
      username,
      passwordHash,
      name,
      contactNumber,
      email,
      role,
      designation,
      degree,
      registrationNo,
      department: departmentId,
      consultationFee,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined,
      bloodGroup: bloodGroup || undefined,
      address: address || undefined,
      emergencyContactName: emergencyContactName || undefined,
      emergencyContactNumber: emergencyContactNumber || undefined,
      qualification: qualification || undefined,
      experienceYears: experienceYears !== undefined && experienceYears !== '' ? Number(experienceYears) : undefined,
      joiningDate: joiningDate || undefined,
      shiftTiming: shiftTiming || undefined,
      employeeIdProof: employeeIdProof || undefined,
      salary: salary !== undefined && salary !== '' ? Number(salary) : undefined,
      mustResetPassword: true,
      isActive: true,
    });

    if (departmentId && role === 'doctor') {
      await Department.findByIdAndUpdate(
        departmentId,
        { $push: { doctors: user._id } },
        { new: true }
      );
    }

    res.status(201).json({
      message: 'Staff member added successfully',
      user: {
        _id: user._id,
        username: user.username,
        tempPassword,
        name: user.name,
        role: user.role,
      },
      warning: 'Share the temporary password with the staff member. They must change it on first login.',
    });
  } catch (error) {
    console.error('Add Staff Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getStaff = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = { isActive: true };

    if (role) {
      filter.role = role;
    }

    const staff = await User.find(filter).populate('department').select('-passwordHash');

    res.json(staff);
  } catch (error) {
    console.error('Get Staff Error:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
};

export const getStaffById = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id)
      .populate('department')
      .select('-passwordHash');

    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    res.json(staff);
  } catch (error) {
    console.error('Get Staff By ID Error:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const { name, contactNumber, email, designation, degree, registrationNo, consultationFee } =
      req.body;

    const updates = {};
    if (name) updates.name = name;
    if (contactNumber) updates.contactNumber = contactNumber;
    if (email) updates.email = email;
    if (designation) updates.designation = designation;
    if (degree) updates.degree = degree;
    if (registrationNo) updates.registrationNo = registrationNo;
    if (consultationFee !== undefined) updates.consultationFee = consultationFee;

    const staff = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('department')
      .select('-passwordHash');

    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    res.json({ message: 'Staff updated successfully', staff });
  } catch (error) {
    console.error('Update Staff Error:', error);
    res.status(500).json({ error: 'Failed to update staff' });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const staff = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    res.json({ message: 'Staff deactivated successfully' });
  } catch (error) {
    console.error('Delete Staff Error:', error);
    res.status(500).json({ error: 'Failed to delete staff' });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const staff = await User.findById(req.user._id)
      .populate('department')
      .select('-passwordHash');

    if (!staff) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(staff);
  } catch (error) {
    console.error('Get My Profile Error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    // Staff can only self-edit contact/personal details, not role, department, pay, etc.
    const {
      contactNumber,
      email,
      address,
      emergencyContactName,
      emergencyContactNumber,
      bloodGroup,
      photoUrl,
    } = req.body;

    const updates = {};
    if (contactNumber !== undefined) updates.contactNumber = contactNumber;
    if (email !== undefined) updates.email = email;
    if (address !== undefined) updates.address = address;
    if (emergencyContactName !== undefined) updates.emergencyContactName = emergencyContactName;
    if (emergencyContactNumber !== undefined) updates.emergencyContactNumber = emergencyContactNumber;
    if (bloodGroup !== undefined) updates.bloodGroup = bloodGroup;
    if (photoUrl !== undefined) updates.photoUrl = photoUrl;

    const staff = await User.findByIdAndUpdate(req.user._id, updates, { new: true })
      .populate('department')
      .select('-passwordHash');

    if (!staff) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ message: 'Profile updated successfully', staff });
  } catch (error) {
    console.error('Update My Profile Error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const getDoctors = async (req, res) => {
  try {
    const { departmentId } = req.query;

    const filter = { role: 'doctor', isActive: true };
    if (departmentId) {
      filter.department = departmentId;
    }

    const doctors = await User.find(filter).populate('department').select('-passwordHash');

    res.json(doctors);
  } catch (error) {
    console.error('Get Doctors Error:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
};
