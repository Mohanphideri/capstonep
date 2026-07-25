import Patient from '../models/Patient.js';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { hashPassword, comparePassword, generateOTP } from '../utils/crypto.js';
import { generateToken } from '../utils/jwt.js';

export const sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    // For demo: use hardcoded OTP
    const otp = process.env.DEMO_OTP || '1234';

    // Save OTP to database
    await Otp.findOneAndUpdate(
      { phone },
      { phone, otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      { upsert: true }
    );

    // In production, send via SMS/Twilio
    console.log(`[DEMO] OTP for ${phone}: ${otp}`);

    res.json({ message: 'OTP sent successfully', phone });
  } catch (error) {
    console.error('OTP Send Error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required' });
    }

    // Verify OTP
    const storedOtp = await Otp.findOne({ phone });

    if (!storedOtp || storedOtp.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (new Date() > storedOtp.expiresAt) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    // Find or create patient
    let patient = await Patient.findOne({ phone });

    if (!patient) {
      patient = await Patient.create({ phone });
    }

    const token = generateToken({
      _id: patient._id,
      role: 'patient',
      name: patient.name || 'Patient',
    });

    // Delete OTP after use
    await Otp.deleteOne({ phone });

    res.json({
      message: 'OTP verified successfully',
      token,
      patient,
      // Existing patients (recognized number) skip this; a brand-new number must
      // provide their name before continuing into the portal.
      nameRequired: !patient.name,
    });
  } catch (error) {
    console.error('OTP Verify Error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

export const staffLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const user = await User.findOne({ username: normalizedUsername });

    if (!user || !(await comparePassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        mustResetPassword: user.mustResetPassword,
      },
    });
  } catch (error) {
    console.error('Staff Login Error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Called on app startup / page refresh to restore the session. Re-fetches the
// actual user (or patient) record from the DB rather than trusting the JWT
// payload alone - this way a deactivated account or a role change made by an
// admin after the token was issued is reflected immediately, not just at next
// login. Returns 401 only if the account genuinely no longer exists/is inactive;
// the frontend treats that as "session invalid", everything else as "restored".
export const getCurrentUser = async (req, res) => {
  try {
    if (req.user.role === 'patient') {
      const patient = await Patient.findById(req.user._id);
      if (!patient) {
        return res.status(401).json({ error: 'Session is no longer valid' });
      }
      return res.json({ role: 'patient', patient });
    }

    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Session is no longer valid' });
    }
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    res.json({
      role: user.role,
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        mustResetPassword: user.mustResetPassword,
      },
    });
  } catch (error) {
    console.error('Get Current User Error:', error);
    res.status(500).json({ error: 'Failed to restore session' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old and new password required' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only check old password if user is changing password (not first time)
    if (!user.mustResetPassword) {
      if (!(await comparePassword(oldPassword, user.passwordHash))) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const newHash = await hashPassword(newPassword);
    user.passwordHash = newHash;
    user.mustResetPassword = false;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};
