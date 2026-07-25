import LeaveRequest from '../models/LeaveRequest.js';

export const applyForLeave = async (req, res) => {
  try {
    const { fromDate, toDate, reason } = req.body;
    const staffId = req.user._id;

    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({ error: 'From date, to date, and reason required' });
    }

    if (new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({ error: 'From date must be before to date' });
    }

    const leaveRequest = await LeaveRequest.create({
      staffId,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      reason,
      status: 'pending',
    });

    await leaveRequest.populate('staffId');

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveRequest,
    });
  } catch (error) {
    console.error('Apply For Leave Error:', error);
    res.status(500).json({ error: 'Failed to apply for leave' });
  }
};

export const getMyLeaveRequests = async (req, res) => {
  try {
    const staffId = req.user._id;

    const leaveRequests = await LeaveRequest.find({ staffId })
      .populate('staffId')
      .populate('reviewedBy')
      .sort({ createdAt: -1 });

    res.json(leaveRequests);
  } catch (error) {
    console.error('Get My Leave Requests Error:', error);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};

export const getPendingLeaveRequests = async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.find({ status: 'pending' })
      .populate('staffId')
      .sort({ createdAt: 1 });

    res.json(leaveRequests);
  } catch (error) {
    console.error('Get Pending Leave Requests Error:', error);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};

export const approveLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      },
      { new: true }
    )
      .populate('staffId')
      .populate('reviewedBy');

    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    res.json({
      message: 'Leave request approved',
      leaveRequest,
    });
  } catch (error) {
    console.error('Approve Leave Request Error:', error);
    res.status(500).json({ error: 'Failed to approve leave request' });
  }
};

export const rejectLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      },
      { new: true }
    )
      .populate('staffId')
      .populate('reviewedBy');

    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    res.json({
      message: 'Leave request rejected',
      leaveRequest,
    });
  } catch (error) {
    console.error('Reject Leave Request Error:', error);
    res.status(500).json({ error: 'Failed to reject leave request' });
  }
};
