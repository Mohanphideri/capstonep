import Query from '../models/Query.js';
import Patient from '../models/Patient.js';
import { generateTicketId } from '../utils/crypto.js';

const POPULATE_FIELDS = [
  { path: 'patientId' },
  { path: 'assignedToId', select: '-passwordHash' },
  { path: 'assignedBy', select: 'name role' },
  { path: 'repliedBy', select: 'name role' },
  { path: 'messages.sender' },
];

// Patient: raise a new query -> generates a ticket ID
export const createQuery = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const patientId = req.user._id;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message required' });
    }

    let ticketId = generateTicketId();
    while (await Query.findOne({ ticketId })) {
      ticketId = generateTicketId();
    }

    const patient = await Patient.findById(patientId);

    const query = await Query.create({
      ticketId,
      patientId,
      subject,
      message,
      status: 'pending',
      messages: [
        {
          text: message,
          sender: patientId,
          senderModel: 'Patient',
          senderName: patient?.name || patient?.phone || 'Patient',
          senderRole: 'patient',
        },
      ],
    });

    await query.populate(POPULATE_FIELDS);

    res.status(201).json({
      message: 'Ticket raised successfully',
      query,
    });
  } catch (error) {
    console.error('Create Query Error:', error);
    res.status(500).json({ error: 'Failed to create query' });
  }
};

// Receptionist / admin: raise a ticket at the desk on behalf of a patient,
// identified by their phone number (the same identity patients log in with).
export const createQueryOnBehalf = async (req, res) => {
  try {
    const { patientPhone, subject, message } = req.body;

    if (!patientPhone || !subject || !message) {
      return res.status(400).json({ error: 'Patient phone, subject and message required' });
    }

    const patient = await Patient.findOne({ phone: patientPhone.trim() });
    if (!patient) {
      return res.status(404).json({ error: 'No patient found with that phone number' });
    }

    let ticketId = generateTicketId();
    while (await Query.findOne({ ticketId })) {
      ticketId = generateTicketId();
    }

    const query = await Query.create({
      ticketId,
      patientId: patient._id,
      subject,
      message,
      status: 'pending',
      messages: [
        {
          text: message,
          sender: patient._id,
          senderModel: 'Patient',
          senderName: patient.name || patient.phone || 'Patient',
          senderRole: 'patient',
        },
      ],
    });

    await query.populate(POPULATE_FIELDS);

    res.status(201).json({
      message: 'Ticket raised on behalf of patient',
      query,
    });
  } catch (error) {
    console.error('Create Query On Behalf Error:', error);
    res.status(500).json({ error: 'Failed to create query' });
  }
};

// Patient: view their own tickets
export const getMyQueries = async (req, res) => {
  try {
    const patientId = req.user._id;

    const queries = await Query.find({ patientId })
      .populate(POPULATE_FIELDS)
      .sort({ createdAt: -1 });

    res.json(queries);
  } catch (error) {
    console.error('Get My Queries Error:', error);
    res.status(500).json({ error: 'Failed to fetch queries' });
  }
};

// Admin: view every ticket raised by any patient
export const getAllQueries = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const queries = await Query.find(filter)
      .populate(POPULATE_FIELDS)
      .sort({ createdAt: -1 });

    res.json(queries);
  } catch (error) {
    console.error('Get All Queries Error:', error);
    res.status(500).json({ error: 'Failed to fetch queries' });
  }
};

// Any staff member: tickets the admin has redirected to them
export const getAssignedQueries = async (req, res) => {
  try {
    const queries = await Query.find({ assignedToId: req.user._id })
      .populate(POPULATE_FIELDS)
      .sort({ createdAt: -1 });

    res.json(queries);
  } catch (error) {
    console.error('Get Assigned Queries Error:', error);
    res.status(500).json({ error: 'Failed to fetch assigned queries' });
  }
};

// Admin only: redirect a ticket to any staff member and/or set its status
export const manageQuery = async (req, res) => {
  try {
    const { assignedToId, status } = req.body;
    const updates = {};

    if (assignedToId !== undefined) {
      updates.assignedToId = assignedToId || null;
      updates.assignedBy = req.user._id;
      updates.assignedAt = new Date();
    }

    if (status !== undefined) {
      if (!['pending', 'in-progress', 'completed', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const query = await Query.findByIdAndUpdate(req.params.id, updates, { new: true }).populate(
      POPULATE_FIELDS
    );

    if (!query) {
      return res.status(404).json({ error: 'Query not found' });
    }

    res.json({
      message: 'Ticket updated successfully',
      query,
    });
  } catch (error) {
    console.error('Manage Query Error:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
};

// Admin, or the staff member the ticket is currently assigned to: reply to the patient
export const replyToQuery = async (req, res) => {
  try {
    const { reply } = req.body;
    const queryId = req.params.id;

    if (!reply) {
      return res.status(400).json({ error: 'Reply required' });
    }

    const existing = await Query.findById(queryId);
    if (!existing) {
      return res.status(404).json({ error: 'Query not found' });
    }

    const isAssignee =
      existing.assignedToId && existing.assignedToId.toString() === req.user._id;
    if (req.user.role !== 'admin' && !isAssignee) {
      return res.status(403).json({ error: 'Only the assigned staff member or admin can reply' });
    }

    const query = await Query.findByIdAndUpdate(
      queryId,
      {
        // Legacy single-reply fields, kept in sync for backward compatibility.
        reply,
        repliedBy: req.user._id,
        repliedAt: new Date(),
        $push: {
          messages: {
            text: reply,
            sender: req.user._id,
            senderModel: 'User',
            senderName: req.user.name,
            senderRole: req.user.role,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).populate(POPULATE_FIELDS);

    res.json({
      message: 'Reply sent successfully',
      query,
    });
  } catch (error) {
    console.error('Reply To Query Error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
};

// Patient: send a follow-up message on their own ticket (adds to the conversation thread,
// so the patient can respond to a staff reply instead of the ticket being one-shot).
export const patientReplyToQuery = async (req, res) => {
  try {
    const { message } = req.body;
    const queryId = req.params.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message required' });
    }

    const existing = await Query.findById(queryId);
    if (!existing) {
      return res.status(404).json({ error: 'Query not found' });
    }

    if (existing.patientId.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (existing.status === 'closed') {
      return res.status(400).json({ error: 'This ticket is closed and can no longer receive replies' });
    }

    const query = await Query.findByIdAndUpdate(
      queryId,
      {
        $push: {
          messages: {
            text: message.trim(),
            sender: req.user._id,
            senderModel: 'Patient',
            senderName: req.user.name || req.user.phone || 'Patient',
            senderRole: 'patient',
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).populate(POPULATE_FIELDS);

    res.json({
      message: 'Reply sent successfully',
      query,
    });
  } catch (error) {
    console.error('Patient Reply To Query Error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
};
