import QueueToken from '../models/QueueToken.js';
import Patient from '../models/Patient.js';

export const joinQueue = async (req, res) => {
  try {
    const { departmentId } = req.body;
    const patientId = req.user._id;

    if (!departmentId) {
      return res.status(400).json({ error: 'Department ID required' });
    }

    // Check if patient already in queue for this department
    const existingToken = await QueueToken.findOne({
      patientId,
      department: departmentId,
      status: { $in: ['waiting', 'in-progress'] },
    });

    if (existingToken) {
      return res.status(400).json({ error: 'Already in queue for this department' });
    }

    // Get latest token number
    const lastToken = await QueueToken.findOne({ department: departmentId }).sort({
      tokenNumber: -1,
    });

    const tokenNumber = (lastToken?.tokenNumber || 0) + 1;

    // Calculate position and estimated wait time
    const waitingTokens = await QueueToken.countDocuments({
      department: departmentId,
      status: 'waiting',
    });

    const queueToken = await QueueToken.create({
      patientId,
      department: departmentId,
      tokenNumber,
      status: 'waiting',
      position: waitingTokens + 1,
      estimatedWaitTime: (waitingTokens + 1) * 15, // 15 min per patient
    });

    await queueToken.populate(['patientId', 'department']);

    res.status(201).json({
      message: 'Joined queue successfully',
      token: queueToken,
    });
  } catch (error) {
    console.error('Join Queue Error:', error);
    res.status(500).json({ error: 'Failed to join queue' });
  }
};

export const getQueueStatus = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const tokens = await QueueToken.find({
      department: departmentId,
      status: { $in: ['waiting', 'in-progress'] },
    })
      .populate('patientId')
      .sort({ createdAt: 1 });

    // Calculate positions
    const tokensWithPositions = tokens.map((token, index) => ({
      ...token.toObject(),
      position: index + 1,
      estimatedWaitTime: (index + 1) * 15,
    }));

    res.json({
      department: departmentId,
      tokens: tokensWithPositions,
      totalWaiting: tokens.filter((t) => t.status === 'waiting').length,
      inProgress: tokens.filter((t) => t.status === 'in-progress').length,
    });
  } catch (error) {
    console.error('Get Queue Status Error:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
};

export const getMyQueueToken = async (req, res) => {
  try {
    const patientId = req.user._id;

    const token = await QueueToken.findOne({
      patientId,
      status: { $in: ['waiting', 'in-progress'] },
    })
      .populate(['patientId', 'department']);

    if (!token) {
      return res.json({ token: null, message: 'Not in any queue' });
    }

    // Get current position
    const waitingBefore = await QueueToken.countDocuments({
      department: token.department,
      status: 'waiting',
      createdAt: { $lt: token.createdAt },
    });

    const inProgressCount = await QueueToken.countDocuments({
      department: token.department,
      status: 'in-progress',
    });

    const position = waitingBefore + inProgressCount + 1;

    res.json({
      token: {
        ...token.toObject(),
        position,
        estimatedWaitTime: position * 15,
      },
    });
  } catch (error) {
    console.error('Get My Queue Token Error:', error);
    res.status(500).json({ error: 'Failed to get queue token' });
  }
};

export const updateTokenStatus = async (req, res) => {
  try {
    const { status, action } = req.body;
    const tokenId = req.params.id;

    if (!['waiting', 'in-progress', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const token = await QueueToken.findById(tokenId).populate(['patientId', 'department']);

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    token.status = status;

    // If calling next patient
    if (action === 'call-next' && status === 'in-progress') {
      // Complete any previous in-progress token
      await QueueToken.updateMany(
        { department: token.department, status: 'in-progress', _id: { $ne: tokenId } },
        { status: 'done' }
      );
    }

    await token.save();

    res.json({
      message: `Token marked as ${status}`,
      token,
    });
  } catch (error) {
    console.error('Update Token Status Error:', error);
    res.status(500).json({ error: 'Failed to update token' });
  }
};

export const leaveQueue = async (req, res) => {
  try {
    const tokenId = req.params.id;
    const token = await QueueToken.findByIdAndUpdate(
      tokenId,
      { status: 'done' },
      { new: true }
    );

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    res.json({ message: 'Left queue', token });
  } catch (error) {
    console.error('Leave Queue Error:', error);
    res.status(500).json({ error: 'Failed to leave queue' });
  }
};
