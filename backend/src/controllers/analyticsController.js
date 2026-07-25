import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Department from '../models/Department.js';
import Appointment from '../models/Appointment.js';
import LeaveRequest from '../models/LeaveRequest.js';
import QueueToken from '../models/QueueToken.js';

export const getOverview = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [
      staffByRole,
      totalPatients,
      totalDepartments,
      appointmentsByStatus,
      totalAppointments,
      appointmentsToday,
      pendingLeaveCount,
      activeQueueCount,
      avgWaitAgg,
      recentAppointments,
    ] = await Promise.all([
      User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      Patient.countDocuments(),
      Department.countDocuments(),
      Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Appointment.countDocuments(),
      Appointment.countDocuments({ slotTime: { $gte: startOfDay, $lte: endOfDay } }),
      LeaveRequest.countDocuments({ status: 'pending' }),
      QueueToken.countDocuments({ status: { $in: ['waiting', 'in-progress'] } }),
      QueueToken.aggregate([
        { $match: { estimatedWaitTime: { $ne: null } } },
        { $group: { _id: null, avgWait: { $avg: '$estimatedWaitTime' } } },
      ]),
      Appointment.find()
        .populate('patientId')
        .populate('doctorId')
        .populate('department')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const staffCounts = staffByRole.reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});

    const statusCounts = appointmentsByStatus.reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});

    res.json({
      staff: {
        total: Object.values(staffCounts).reduce((a, b) => a + b, 0),
        byRole: staffCounts,
      },
      patients: { total: totalPatients },
      departments: { total: totalDepartments },
      appointments: {
        total: totalAppointments,
        today: appointmentsToday,
        byStatus: statusCounts,
        recent: recentAppointments,
      },
      leave: { pending: pendingLeaveCount },
      queue: {
        active: activeQueueCount,
        avgWaitMinutes: avgWaitAgg[0]?.avgWait ? Math.round(avgWaitAgg[0].avgWait) : null,
      },
    });
  } catch (error) {
    console.error('Get Analytics Overview Error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};
