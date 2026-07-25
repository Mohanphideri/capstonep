import Bill from '../models/Bill.js';
import Appointment from '../models/Appointment.js';
import Prescription from '../models/Prescription.js';
import { generateBillNumber } from '../utils/crypto.js';

const POPULATE_FIELDS = [
  { path: 'patientId' },
  { path: 'generatedBy', select: 'name role' },
  {
    path: 'appointmentId',
    populate: [{ path: 'doctorId', select: 'name consultationFee' }, { path: 'department' }],
  },
];

// Receptionist / admin: create a bill for an appointment. Either pass in the
// prescriptionId + a list of medicine line items to bill (only ones the
// pharmacist marked "available" should be sent), or omit medicines entirely
// and only charge the consultation/application fee.
export const createBill = async (req, res) => {
  try {
    const {
      appointmentId,
      prescriptionId,
      items,
      consultationFee,
      applicationFee,
      paymentMethod,
      notes,
    } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ error: 'Appointment is required' });
    }

    const appointment = await Appointment.findById(appointmentId).populate('patientId');
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const existing = await Bill.findOne({ appointmentId });
    if (existing) {
      return res.status(400).json({ error: 'A bill has already been generated for this appointment' });
    }

    const lineItems = Array.isArray(items) ? items : [];
    const normalizedItems = lineItems
      .filter((it) => it && it.description)
      .map((it) => {
        const quantity = Number(it.quantity) || 1;
        const unitPrice = Number(it.unitPrice) || 0;
        return {
          description: it.description,
          quantity,
          unitPrice,
          amount: quantity * unitPrice,
        };
      });

    const medicinesTotal = normalizedItems.reduce((sum, it) => sum + it.amount, 0);
    const fee = Number(consultationFee) || 0;
    // Application/visit fee only makes sense when the patient isn't taking any medicine.
    const flatFee = normalizedItems.length === 0 ? Number(applicationFee) || 0 : 0;
    const totalAmount = medicinesTotal + fee + flatFee;

    let billNumber = generateBillNumber();
    while (await Bill.findOne({ billNumber })) {
      billNumber = generateBillNumber();
    }

    const bill = await Bill.create({
      billNumber,
      appointmentId,
      patientId: appointment.patientId._id,
      prescriptionId: prescriptionId || null,
      items: normalizedItems,
      medicinesTotal,
      consultationFee: fee,
      applicationFee: flatFee,
      totalAmount,
      paymentMethod: paymentMethod || 'cash',
      status: 'unpaid',
      notes: notes || '',
      generatedBy: req.user._id,
    });

    await bill.populate(POPULATE_FIELDS);

    res.status(201).json({ message: 'Bill generated successfully', bill });
  } catch (error) {
    console.error('Create Bill Error:', error);
    res.status(500).json({ error: 'Failed to generate bill' });
  }
};

// Receptionist / accountant / admin: list bills, optionally filtered.
export const getBills = async (req, res) => {
  try {
    const { status, appointmentCode, patientId, from, to } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;

    if (appointmentCode) {
      const appointment = await Appointment.findOne({
        appointmentCode: appointmentCode.trim().toUpperCase(),
      });
      if (!appointment) return res.json([]);
      filter.appointmentId = appointment._id;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const bills = await Bill.find(filter).populate(POPULATE_FIELDS).sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    console.error('Get Bills Error:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
};

// Receptionist / accountant / admin: fetch the medicines available to bill for
// a given appointment (pulls the prescription, if any, filtered to items the
// pharmacist has already marked "available").
export const getBillableItems = async (req, res) => {
  try {
    const code = (req.params.code || '').trim().toUpperCase();
    const appointment = await Appointment.findOne({ appointmentCode: code })
      .populate('patientId')
      .populate('doctorId')
      .populate('department');

    if (!appointment) {
      return res.status(404).json({ error: 'No appointment found for that code' });
    }

    const existingBill = await Bill.findOne({ appointmentId: appointment._id });
    const prescription = await Prescription.findOne({ appointmentId: appointment._id });

    res.json({
      appointment,
      prescription,
      alreadyBilled: !!existingBill,
      bill: existingBill,
    });
  } catch (error) {
    console.error('Get Billable Items Error:', error);
    res.status(500).json({ error: 'Failed to fetch billing details' });
  }
};

// Receptionist / accountant / admin: mark a bill as paid (records payment method too).
export const markBillPaid = async (req, res) => {
  try {
    const { paymentMethod } = req.body;

    const updates = { status: 'paid', paidAt: new Date() };
    if (paymentMethod) updates.paymentMethod = paymentMethod;

    const bill = await Bill.findByIdAndUpdate(req.params.id, updates, { new: true }).populate(
      POPULATE_FIELDS
    );

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.json({ message: 'Bill marked as paid', bill });
  } catch (error) {
    console.error('Mark Bill Paid Error:', error);
    res.status(500).json({ error: 'Failed to update bill' });
  }
};
