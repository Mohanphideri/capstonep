import DoctorSlot from '../models/DoctorSlot.js';
import Appointment from '../models/Appointment.js';
import { dateStringDayOfWeek, clinicDayBounds, toClinicParts } from '../utils/clinicTime.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Admin only: replace a doctor's slots for a single day-of-week with a new list of times.
export const setDoctorSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { departmentId, dayOfWeek, times } = req.body;

    if (!departmentId || dayOfWeek === undefined || !Array.isArray(times)) {
      return res.status(400).json({ error: 'departmentId, dayOfWeek and times[] are required' });
    }

    const day = Number(dayOfWeek);
    if (Number.isNaN(day) || day < 0 || day > 6) {
      return res.status(400).json({ error: 'dayOfWeek must be 0 (Sun) to 6 (Sat)' });
    }

    // Wipe existing slots for this doctor on this day, then set the new ones.
    await DoctorSlot.deleteMany({ doctorId, dayOfWeek: day });

    const cleanTimes = [...new Set(times.filter(Boolean))].sort();
    const docs = cleanTimes.map((time) => ({
      doctorId,
      department: departmentId,
      dayOfWeek: day,
      time,
    }));

    if (docs.length > 0) {
      await DoctorSlot.insertMany(docs);
    }

    res.json({
      message: `Availability updated for ${DAY_NAMES[day]}`,
      dayOfWeek: day,
      times: cleanTimes,
    });
  } catch (error) {
    console.error('Set Doctor Slots Error:', error);
    res.status(500).json({ error: 'Failed to set doctor availability' });
  }
};

// Admin: view a doctor's full weekly availability grid
export const getDoctorSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const slots = await DoctorSlot.find({ doctorId }).sort({ dayOfWeek: 1, time: 1 });

    const byDay = {};
    for (let d = 0; d <= 6; d += 1) byDay[d] = [];
    slots.forEach((slot) => {
      byDay[slot.dayOfWeek].push(slot.time);
    });

    res.json({ doctorId, schedule: byDay, dayNames: DAY_NAMES });
  } catch (error) {
    console.error('Get Doctor Slots Error:', error);
    res.status(500).json({ error: 'Failed to fetch doctor availability' });
  }
};

// Doctor: view my own weekly availability
export const getMyDoctorSlots = async (req, res) => {
  try {
    const slots = await DoctorSlot.find({ doctorId: req.user._id }).sort({ dayOfWeek: 1, time: 1 });

    const byDay = {};
    for (let d = 0; d <= 6; d += 1) byDay[d] = [];
    slots.forEach((slot) => {
      byDay[slot.dayOfWeek].push(slot.time);
    });

    res.json({ schedule: byDay, dayNames: DAY_NAMES });
  } catch (error) {
    console.error('Get My Doctor Slots Error:', error);
    res.status(500).json({ error: 'Failed to fetch your availability' });
  }
};

// Patient: for a department + date, which time slots have at least one doctor free.
// The patient never picks a doctor - the system assigns one automatically at booking time.
export const getAvailableSlotsForBooking = async (req, res) => {
  try {
    const { departmentId, date } = req.query;

    if (!departmentId || !date) {
      return res.status(400).json({ error: 'departmentId and date are required' });
    }

    const dayOfWeek = dateStringDayOfWeek(date);

    const slots = await DoctorSlot.find({ department: departmentId, dayOfWeek });
    if (slots.length === 0) {
      return res.json([]);
    }

    const { startOfDay, endOfDay } = clinicDayBounds(date);

    const doctorIds = [...new Set(slots.map((s) => s.doctorId.toString()))];
    const bookedAppointments = await Appointment.find({
      doctorId: { $in: doctorIds },
      slotTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'cancelled' },
    });

    const bookedKey = (doctorId, time) => `${doctorId}_${time}`;
    const bookedSet = new Set(
      bookedAppointments.map((a) => {
        const { time } = toClinicParts(a.slotTime);
        return bookedKey(a.doctorId.toString(), time);
      })
    );

    // Group by time -> is there at least one doctor scheduled at this time who isn't booked?
    const timeMap = new Map();
    slots.forEach((slot) => {
      const docIdStr = slot.doctorId.toString();
      const isFree = !bookedSet.has(bookedKey(docIdStr, slot.time));
      if (!timeMap.has(slot.time)) {
        timeMap.set(slot.time, { time: slot.time, available: false });
      }
      if (isFree) {
        timeMap.get(slot.time).available = true;
      }
    });

    const result = [...timeMap.values()].sort((a, b) => a.time.localeCompare(b.time));
    res.json(result);
  } catch (error) {
    console.error('Get Available Slots For Booking Error:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
};
