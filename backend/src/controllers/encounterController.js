import Encounter from '../models/Encounter.js';
import Appointment from '../models/Appointment.js';
import Admission from '../models/Admission.js';

const POPULATE = [
  { path: 'doctorId', select: 'name' },
  { path: 'patientId' },
];

// Doctor: record an encounter (vitals + diagnosis + notes) for an OPD visit
// or an IPD admission. One appointment/admission can have several encounters
// over time (e.g. daily rounds during an inpatient stay).
export const createEncounter = async (req, res) => {
  try {
    const {
      appointmentId,
      admissionId,
      vitals,
      chiefComplaint,
      diagnosis,
      clinicalNotes,
      followUpDate,
    } = req.body;

    if (!appointmentId && !admissionId) {
      return res.status(400).json({ error: 'An appointment or admission is required' });
    }

    let patientId;
    let type;

    if (admissionId) {
      const admission = await Admission.findById(admissionId);
      if (!admission) return res.status(404).json({ error: 'Admission not found' });
      patientId = admission.patientId;
      type = 'ipd';
    } else {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
      patientId = appointment.patientId;
      type = 'opd';
    }

    const encounter = await Encounter.create({
      patientId,
      doctorId: req.user._id,
      type,
      appointmentId: appointmentId || null,
      admissionId: admissionId || null,
      vitals: vitals || {},
      chiefComplaint: chiefComplaint || '',
      diagnosis: Array.isArray(diagnosis) ? diagnosis : [],
      clinicalNotes: clinicalNotes || '',
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
    });

    await encounter.populate(POPULATE);

    res.status(201).json({ message: 'Encounter recorded', encounter });
  } catch (error) {
    console.error('Create Encounter Error:', error);
    res.status(500).json({ error: 'Failed to record encounter' });
  }
};

// Doctor: update an encounter they recorded (correct a note/vitals entry).
export const updateEncounter = async (req, res) => {
  try {
    const { vitals, chiefComplaint, diagnosis, clinicalNotes, followUpDate } = req.body;

    const encounter = await Encounter.findById(req.params.id);
    if (!encounter) return res.status(404).json({ error: 'Encounter not found' });

    if (String(encounter.doctorId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own encounters' });
    }

    if (vitals !== undefined) encounter.vitals = vitals;
    if (chiefComplaint !== undefined) encounter.chiefComplaint = chiefComplaint;
    if (diagnosis !== undefined) encounter.diagnosis = diagnosis;
    if (clinicalNotes !== undefined) encounter.clinicalNotes = clinicalNotes;
    if (followUpDate !== undefined) encounter.followUpDate = followUpDate ? new Date(followUpDate) : null;

    await encounter.save();
    await encounter.populate(POPULATE);

    res.json({ message: 'Encounter updated', encounter });
  } catch (error) {
    console.error('Update Encounter Error:', error);
    res.status(500).json({ error: 'Failed to update encounter' });
  }
};

// Doctor / nurse / admin: full clinical history for a patient.
export const getEncountersForPatient = async (req, res) => {
  try {
    const encounters = await Encounter.find({ patientId: req.params.patientId })
      .populate(POPULATE)
      .sort({ createdAt: -1 });
    res.json(encounters);
  } catch (error) {
    console.error('Get Encounters For Patient Error:', error);
    res.status(500).json({ error: 'Failed to fetch clinical history' });
  }
};

// Patient: their own clinical history.
export const getMyEncounters = async (req, res) => {
  try {
    const encounters = await Encounter.find({ patientId: req.user._id })
      .populate(POPULATE)
      .sort({ createdAt: -1 });
    res.json(encounters);
  } catch (error) {
    console.error('Get My Encounters Error:', error);
    res.status(500).json({ error: 'Failed to fetch your clinical history' });
  }
};

export const getEncountersForAppointment = async (req, res) => {
  try {
    const encounters = await Encounter.find({ appointmentId: req.params.appointmentId })
      .populate(POPULATE)
      .sort({ createdAt: -1 });
    res.json(encounters);
  } catch (error) {
    console.error('Get Encounters For Appointment Error:', error);
    res.status(500).json({ error: 'Failed to fetch encounters' });
  }
};

export const getEncountersForAdmission = async (req, res) => {
  try {
    const encounters = await Encounter.find({ admissionId: req.params.admissionId })
      .populate(POPULATE)
      .sort({ createdAt: -1 });
    res.json(encounters);
  } catch (error) {
    console.error('Get Encounters For Admission Error:', error);
    res.status(500).json({ error: 'Failed to fetch encounters' });
  }
};
