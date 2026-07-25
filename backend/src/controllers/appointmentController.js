import Appointment from '../models/Appointment.js';
import Department from '../models/Department.js';
import DoctorSlot from '../models/DoctorSlot.js';
import { generateAppointmentCode } from '../utils/crypto.js';
import { toClinicParts, clinicDayBounds } from '../utils/clinicTime.js';

const CANCEL_REASONS = [
  'Schedule conflict',
  'Feeling better now',
  'Found another doctor',
  'Personal emergency',
  'Other',
];

export const bookAppointment = async (req, res) => {
  try {
    const { departmentId, slotTime } = req.body;
    const patientId = req.user._id;

    if (!departmentId || !slotTime) {
      return res.status(400).json({ error: 'Department and slot time required' });
    }

    const requestedTime = new Date(slotTime);
    // Read the day/time back as clinic (India) wall-clock time - not the server's own
    // timezone - so it matches the "HH:MM" the admin set for the doctor's schedule.
    const { dayOfWeek, time: timeStr } = toClinicParts(requestedTime);

    // Which doctors in this department are scheduled at this weekday/time (admin-set)?
    const scheduledSlots = await DoctorSlot.find({
      department: departmentId,
      dayOfWeek,
      time: timeStr,
    });

    if (scheduledSlots.length === 0) {
      return res.status(400).json({ error: 'No doctor is scheduled for that slot' });
    }

    // Already-booked doctors at this exact slot time, so we can pick a free one.
    const candidateDoctorIds = scheduledSlots.map((s) => s.doctorId);
    const bookedAppointments = await Appointment.find({
      doctorId: { $in: candidateDoctorIds },
      slotTime: requestedTime,
      status: { $ne: 'cancelled' },
    });
    const bookedDoctorIds = new Set(bookedAppointments.map((a) => a.doctorId.toString()));

    const availableDoctorId = candidateDoctorIds.find(
      (id) => !bookedDoctorIds.has(id.toString())
    );

    if (!availableDoctorId) {
      return res.status(400).json({ error: 'Slot already booked' });
    }

    const doctorId = availableDoctorId;

    // Generate a unique, human-readable appointment code (e.g. APT-260723-4F2K)
    let appointmentCode = generateAppointmentCode();
    while (await Appointment.findOne({ appointmentCode })) {
      appointmentCode = generateAppointmentCode();
    }

    const appointment = await Appointment.create({
      appointmentCode,
      patientId,
      doctorId,
      department: departmentId,
      slotTime: new Date(slotTime),
      status: 'booked',
    });

    await appointment.populate(['patientId', 'doctorId', 'department']);

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment,
    });
  } catch (error) {
    console.error('Book Appointment Error:', error);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
};

export const getMyAppointments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { role } = req.user;
    let filter = {};

    if (role === 'patient') {
      filter.patientId = userId;
    } else if (role === 'doctor') {
      filter.doctorId = userId;
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId')
      .populate('doctorId')
      .populate('department')
      .sort({ slotTime: -1 });

    res.json(appointments);
  } catch (error) {
    console.error('Get My Appointments Error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

export const getAllAppointments = async (req, res) => {
  try {
    const { status, date } = req.query;
    const filter = {};

    if (status) filter.status = status;

    if (date) {
      const { startOfDay, endOfDay } = clinicDayBounds(date);
      filter.slotTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId')
      .populate('doctorId')
      .populate('department')
      .sort({ slotTime: -1 });

    res.json(appointments);
  } catch (error) {
    console.error('Get All Appointments Error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

export const getAppointmentByCode = async (req, res) => {
  try {
    // Patients shouldn't be able to browse arbitrary appointments by guessing codes
    if (req.user.role === 'patient') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const code = (req.params.code || '').trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ error: 'Appointment code required' });
    }

    const appointment = await Appointment.findOne({ appointmentCode: code })
      .populate('patientId')
      .populate('doctorId')
      .populate('department');

    if (!appointment) {
      return res.status(404).json({ error: 'No appointment found for that code' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Get Appointment By Code Error:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
};

export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({ error: 'Doctor ID and date required' });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedSlots = await Appointment.find({
      doctorId,
      slotTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'cancelled' },
    });

    // Generate available slots (9 AM to 5 PM, every 30 minutes)
    const slots = [];
    const startHour = 9;
    const endHour = 17;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(startOfDay);
        slotTime.setHours(hour, minute);

        const isBooked = bookedSlots.some(
          (slot) => slot.slotTime.getTime() === slotTime.getTime()
        );

        if (!isBooked) {
          slots.push({
            time: slotTime,
            available: true,
          });
        }
      }
    }

    res.json(slots);
  } catch (error) {
    console.error('Get Available Slots Error:', error);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['booked', 'completed', 'cancelled', 'no-show'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('patientId')
      .populate('doctorId')
      .populate('department');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      message: 'Appointment status updated',
      appointment,
    });
  } catch (error) {
    console.error('Update Appointment Status Error:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
};

// Receptionist / admin: reassign an appointment to a different doctor
// (e.g. the originally-assigned doctor is unavailable/on leave).
export const reassignDoctor = async (req, res) => {
  try {
    const { doctorId } = req.body;

    if (!doctorId) {
      return res.status(400).json({ error: 'doctorId is required' });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { doctorId },
      { new: true }
    )
      .populate('patientId')
      .populate('doctorId')
      .populate('department');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      message: 'Doctor reassigned',
      appointment,
    });
  } catch (error) {
    console.error('Reassign Doctor Error:', error);
    res.status(500).json({ error: 'Failed to reassign doctor' });
  }
};

export const getCancelReasons = async (req, res) => {
  res.json(CANCEL_REASONS);
};

export const cancelAppointment = async (req, res) => {
  try {
    const { reason, note } = req.body;

    if (!reason || !CANCEL_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'A valid cancellation reason is required' });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'cancelled',
        cancelReason: reason,
        cancelNote: note || '',
        cancelledBy: req.user._id,
        cancelledByModel: req.user.role === 'patient' ? 'Patient' : 'User',
        cancelledAt: new Date(),
      },
      { new: true }
    )
      .populate('patientId')
      .populate('doctorId')
      .populate('department');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      message: 'Appointment cancelled',
      appointment,
    });
  } catch (error) {
    console.error('Cancel Appointment Error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
};
