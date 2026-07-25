import Patient from '../models/Patient.js';

// Patient: view my own profile
export const getMyPatientProfile = async (req, res) => {
  try {
    const patient = await Patient.findById(req.user._id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    console.error('Get My Patient Profile Error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Doctor / nurse / receptionist / admin: look up a patient by phone number
// (used e.g. when admitting a patient to IPD, where a real Patient _id is needed).
export const findPatientByPhone = async (req, res) => {
  try {
    const phone = (req.params.phone || '').trim();
    const patient = await Patient.findOne({ phone });
    if (!patient) {
      return res.status(404).json({ error: 'No patient found with that phone number' });
    }
    res.json(patient);
  } catch (error) {
    console.error('Find Patient By Phone Error:', error);
    res.status(500).json({ error: 'Failed to look up patient' });
  }
};

// Patient: set/update my own profile. Name is compulsory for a first-time (new
// number) patient - every prescription and portal screen displays this name.
export const updateMyPatientProfile = async (req, res) => {
  try {
    const { name, age, gender, email } = req.body;

    const patient = await Patient.findById(req.user._id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const isFirstTimeName = !patient.name;
    const trimmedName = typeof name === 'string' ? name.trim() : undefined;

    if (isFirstTimeName && !trimmedName) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (trimmedName) patient.name = trimmedName;
    if (age !== undefined && age !== '') patient.age = Number(age);
    if (gender !== undefined) patient.gender = gender;
    if (email !== undefined) patient.email = email;

    await patient.save();

    res.json({ message: 'Profile updated successfully', patient });
  } catch (error) {
    console.error('Update My Patient Profile Error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
