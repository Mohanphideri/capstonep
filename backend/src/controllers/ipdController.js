import Ward from '../models/Ward.js';
import Admission from '../models/Admission.js';
import Bill from '../models/Bill.js';
import { generateBillNumber } from '../utils/crypto.js';

// ---------------------------------------------------------------------
// Wards & beds
// ---------------------------------------------------------------------

// Admin: create a ward (with an initial set of beds, or add beds later).
export const createWard = async (req, res) => {
  try {
    const { name, department, type, floor, beds } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Ward name is required' });
    }

    const ward = await Ward.create({
      name,
      department: department || undefined,
      type: type || 'general',
      floor,
      beds: Array.isArray(beds) ? beds : [],
    });

    res.status(201).json({ message: 'Ward created', ward });
  } catch (error) {
    console.error('Create Ward Error:', error);
    res.status(500).json({ error: 'Failed to create ward' });
  }
};

// Admin: add a bed to an existing ward.
export const addBed = async (req, res) => {
  try {
    const { bedNumber, dailyCharge } = req.body;
    if (!bedNumber || dailyCharge === undefined) {
      return res.status(400).json({ error: 'Bed number and daily charge are required' });
    }

    const ward = await Ward.findById(req.params.id);
    if (!ward) return res.status(404).json({ error: 'Ward not found' });

    ward.beds.push({ bedNumber, dailyCharge, status: 'vacant' });
    await ward.save();

    res.status(201).json({ message: 'Bed added', ward });
  } catch (error) {
    console.error('Add Bed Error:', error);
    res.status(500).json({ error: 'Failed to add bed' });
  }
};

// Any clinical/front-desk staff: list wards with their beds and occupancy.
export const getWards = async (req, res) => {
  try {
    const wards = await Ward.find().populate('department').sort({ name: 1 });
    res.json(wards);
  } catch (error) {
    console.error('Get Wards Error:', error);
    res.status(500).json({ error: 'Failed to fetch wards' });
  }
};

// Admin/nurse: take a bed in/out of maintenance.
export const updateBedStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['vacant', 'maintenance'].includes(status)) {
      return res.status(400).json({ error: 'Status must be vacant or maintenance (occupancy is set via admission/discharge)' });
    }

    const ward = await Ward.findById(req.params.id);
    if (!ward) return res.status(404).json({ error: 'Ward not found' });

    const bed = ward.beds.id(req.params.bedId);
    if (!bed) return res.status(404).json({ error: 'Bed not found' });
    if (bed.status === 'occupied') {
      return res.status(400).json({ error: 'Cannot change status of an occupied bed - discharge or transfer the patient first' });
    }

    bed.status = status;
    await ward.save();

    res.json({ message: 'Bed status updated', ward });
  } catch (error) {
    console.error('Update Bed Status Error:', error);
    res.status(500).json({ error: 'Failed to update bed status' });
  }
};

// ---------------------------------------------------------------------
// Admissions
// ---------------------------------------------------------------------

const POPULATE_ADMISSION = [
  { path: 'patientId' },
  { path: 'admittingDoctorId', select: 'name' },
  { path: 'admittedBy', select: 'name role' },
  { path: 'wardId' },
];

// Doctor / receptionist / admin: admit a patient to a specific bed.
export const admitPatient = async (req, res) => {
  try {
    const { patientId, wardId, bedId, admittingDoctorId, reasonForAdmission, diagnosis, originatingAppointmentId } = req.body;

    if (!patientId || !wardId || !bedId || !admittingDoctorId || !reasonForAdmission) {
      return res.status(400).json({
        error: 'Patient, ward, bed, admitting doctor, and reason for admission are required',
      });
    }

    const ward = await Ward.findById(wardId);
    if (!ward) return res.status(404).json({ error: 'Ward not found' });

    const bed = ward.beds.id(bedId);
    if (!bed) return res.status(404).json({ error: 'Bed not found' });
    if (bed.status !== 'vacant') {
      return res.status(400).json({ error: `Bed ${bed.bedNumber} is not vacant` });
    }

    bed.status = 'occupied';
    await ward.save();

    const admission = await Admission.create({
      patientId,
      wardId,
      bedId,
      admittingDoctorId,
      originatingAppointmentId: originatingAppointmentId || null,
      reasonForAdmission,
      diagnosis,
      admittedBy: req.user._id,
    });

    await admission.populate(POPULATE_ADMISSION);

    res.status(201).json({ message: 'Patient admitted', admission });
  } catch (error) {
    console.error('Admit Patient Error:', error);
    res.status(500).json({ error: 'Failed to admit patient' });
  }
};

// Doctor / nurse / receptionist / admin: list admissions, optionally filtered by status.
export const getAdmissions = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const admissions = await Admission.find(filter).populate(POPULATE_ADMISSION).sort({ admissionDate: -1 });
    res.json(admissions);
  } catch (error) {
    console.error('Get Admissions Error:', error);
    res.status(500).json({ error: 'Failed to fetch admissions' });
  }
};

export const getAdmissionById = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id).populate(POPULATE_ADMISSION);
    if (!admission) return res.status(404).json({ error: 'Admission not found' });
    res.json(admission);
  } catch (error) {
    console.error('Get Admission Error:', error);
    res.status(500).json({ error: 'Failed to fetch admission' });
  }
};

// Nurse / doctor / admin: move a patient to a different bed (same or different ward).
export const transferBed = async (req, res) => {
  try {
    const { toWardId, toBedId, reason } = req.body;
    if (!toWardId || !toBedId) {
      return res.status(400).json({ error: 'Destination ward and bed are required' });
    }

    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ error: 'Admission not found' });
    if (admission.status !== 'admitted') {
      return res.status(400).json({ error: 'Only an active admission can be transferred' });
    }

    const fromWard = await Ward.findById(admission.wardId);
    const fromBed = fromWard?.beds.id(admission.bedId);

    const toWard = await Ward.findById(toWardId);
    if (!toWard) return res.status(404).json({ error: 'Destination ward not found' });
    const toBed = toWard.beds.id(toBedId);
    if (!toBed) return res.status(404).json({ error: 'Destination bed not found' });
    if (toBed.status !== 'vacant') {
      return res.status(400).json({ error: `Bed ${toBed.bedNumber} is not vacant` });
    }

    if (fromBed) fromBed.status = 'vacant';
    toBed.status = 'occupied';

    await Promise.all([fromWard?.save(), toWard.save()].filter(Boolean));

    admission.transfers.push({
      fromWardId: admission.wardId,
      fromBedId: admission.bedId,
      toWardId,
      toBedId,
      reason,
      transferredBy: req.user._id,
    });
    admission.wardId = toWardId;
    admission.bedId = toBedId;
    await admission.save();
    await admission.populate(POPULATE_ADMISSION);

    res.json({ message: 'Patient transferred', admission });
  } catch (error) {
    console.error('Transfer Bed Error:', error);
    res.status(500).json({ error: 'Failed to transfer patient' });
  }
};

// Doctor / admin: discharge a patient - frees the bed and writes a discharge summary.
// Also returns a billing suggestion (receptionist/accountant generate the actual IPD
// bill via createIpdBill once discharged).
export const dischargePatient = async (req, res) => {
  try {
    const { summary, followUpInstructions } = req.body;
    if (!summary) {
      return res.status(400).json({ error: 'A discharge summary is required' });
    }

    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ error: 'Admission not found' });
    if (admission.status !== 'admitted') {
      return res.status(400).json({ error: 'This admission has already been discharged' });
    }

    const ward = await Ward.findById(admission.wardId);
    const bed = ward?.beds.id(admission.bedId);
    if (bed) {
      bed.status = 'vacant';
      await ward.save();
    }

    admission.status = 'discharged';
    admission.dischargeDate = new Date();
    admission.dischargeSummary = {
      summary,
      followUpInstructions: followUpInstructions || '',
      dischargedBy: req.user._id,
      dischargedAt: new Date(),
    };
    await admission.save();
    await admission.populate(POPULATE_ADMISSION);

    const days = Math.max(
      1,
      Math.ceil((admission.dischargeDate - admission.admissionDate) / (1000 * 60 * 60 * 24))
    );
    const bedCharges = (bed?.dailyCharge || 0) * days;

    res.json({
      message: 'Patient discharged',
      admission,
      billingSuggestion: { days, dailyCharge: bed?.dailyCharge || 0, bedCharges },
    });
  } catch (error) {
    console.error('Discharge Patient Error:', error);
    res.status(500).json({ error: 'Failed to discharge patient' });
  }
};

// Receptionist / accountant / admin: generate the IPD stay bill once discharged.
export const createIpdBill = async (req, res) => {
  try {
    const { consultationFee, otherCharges, paymentMethod, notes } = req.body;

    const admission = await Admission.findById(req.params.id).populate('patientId');
    if (!admission) return res.status(404).json({ error: 'Admission not found' });
    if (admission.status !== 'discharged') {
      return res.status(400).json({ error: 'Bill can only be generated after discharge' });
    }

    const existing = await Bill.findOne({ admissionId: admission._id });
    if (existing) {
      return res.status(400).json({ error: 'A bill has already been generated for this admission' });
    }

    const ward = await Ward.findById(admission.wardId);
    const bed = ward?.beds.id(admission.bedId);
    const dailyCharge = bed?.dailyCharge || 0;
    const days = Math.max(
      1,
      Math.ceil(((admission.dischargeDate || new Date()) - admission.admissionDate) / (1000 * 60 * 60 * 24))
    );
    const bedTotal = dailyCharge * days;

    const items = [
      {
        description: `Ward stay (${days} day${days !== 1 ? 's' : ''} @ ₹${dailyCharge}/day)`,
        quantity: days,
        unitPrice: dailyCharge,
        amount: bedTotal,
      },
    ];
    const extra = Number(otherCharges) || 0;
    if (extra) {
      items.push({ description: 'Other charges', quantity: 1, unitPrice: extra, amount: extra });
    }

    const medicinesTotal = items.reduce((sum, it) => sum + it.amount, 0);
    const fee = Number(consultationFee) || 0;
    const totalAmount = medicinesTotal + fee;

    let billNumber = generateBillNumber();
    while (await Bill.findOne({ billNumber })) {
      billNumber = generateBillNumber();
    }

    const bill = await Bill.create({
      billNumber,
      admissionId: admission._id,
      patientId: admission.patientId._id,
      items,
      medicinesTotal,
      consultationFee: fee,
      totalAmount,
      paymentMethod: paymentMethod || 'cash',
      notes: notes || '',
      generatedBy: req.user._id,
    });

    res.status(201).json({ message: 'IPD bill generated', bill });
  } catch (error) {
    console.error('Create IPD Bill Error:', error);
    res.status(500).json({ error: 'Failed to generate IPD bill' });
  }
};
