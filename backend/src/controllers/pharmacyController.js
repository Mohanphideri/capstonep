import Prescription from '../models/Prescription.js';
import Medicine from '../models/Medicine.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';

export const createPrescription = async (req, res) => {
  try {
    const { appointmentId, patientId, medicines } = req.body;
    const doctorId = req.user._id;

    if (!appointmentId || !patientId || !medicines || medicines.length === 0) {
      return res.status(400).json({ error: 'Appointment, patient, and medicines required' });
    }

    const prescription = await Prescription.create({
      appointmentId,
      patientId,
      doctorId,
      medicines,
    });

    await prescription.populate(['appointmentId', 'patientId', 'doctorId']);

    res.status(201).json({
      message: 'Prescription created successfully',
      prescription,
    });
  } catch (error) {
    console.error('Create Prescription Error:', error);
    res.status(500).json({ error: 'Failed to create prescription' });
  }
};

export const getPrescriptions = async (req, res) => {
  try {
    const { patientId, appointmentId, appointmentCode, patientName, doctorId } = req.query;
    let filter = {};

    if (patientId) filter.patientId = patientId;
    if (appointmentId) filter.appointmentId = appointmentId;
    if (doctorId) filter.doctorId = doctorId;

    // Human-readable appointment code (e.g. APT-260723-4F2K) -> resolve to its ObjectId
    if (appointmentCode) {
      const appointment = await Appointment.findOne({
        appointmentCode: appointmentCode.trim().toUpperCase(),
      });
      if (!appointment) {
        return res.json([]);
      }
      filter.appointmentId = appointment._id;
    }

    const prescriptions = await Prescription.find(filter)
      .populate(['appointmentId', 'patientId', 'doctorId']);

    // If searching by patient name, filter results
    let results = prescriptions;
    if (patientName) {
      results = prescriptions.filter((p) =>
        p.patientId.name.toLowerCase().includes(patientName.toLowerCase())
      );
    }

    res.json(results);
  } catch (error) {
    console.error('Get Prescriptions Error:', error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
};

export const getMyPrescriptions = async (req, res) => {
  try {
    const patientId = req.user._id;

    const prescriptions = await Prescription.find({ patientId })
      .populate(['appointmentId', 'doctorId'])
      .sort({ createdAt: -1 });

    res.json(prescriptions);
  } catch (error) {
    console.error('Get My Prescriptions Error:', error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
};

export const updateMedicineAvailability = async (req, res) => {
  try {
    const { medicineIndex, availability, medicineId } = req.body;
    const prescriptionId = req.params.id;

    const prescription = await Prescription.findById(prescriptionId);

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (medicineIndex < 0 || medicineIndex >= prescription.medicines.length) {
      return res.status(400).json({ error: 'Invalid medicine index' });
    }

    const line = prescription.medicines[medicineIndex];

    // If the pharmacist has linked this prescription line to a real catalog
    // medicine, marking it "available" (dispensed) draws stock from the
    // earliest-expiring batch first (FEFO) instead of just flipping a flag.
    if (availability === 'available' && medicineId) {
      const medicine = await Medicine.findById(medicineId);
      if (!medicine) {
        return res.status(404).json({ error: 'Linked medicine not found in inventory' });
      }

      const needed = Number(line.quantity) || 1;
      const now = new Date();
      const usableBatches = medicine.batches
        .filter((b) => b.expiryDate >= now && b.quantity > 0)
        .sort((a, b) => a.expiryDate - b.expiryDate);

      const totalAvailable = usableBatches.reduce((sum, b) => sum + b.quantity, 0);
      if (totalAvailable < needed) {
        return res.status(400).json({
          error: `Not enough stock: need ${needed}, only ${totalAvailable} available across unexpired batches`,
        });
      }

      let remaining = needed;
      for (const batch of usableBatches) {
        if (remaining <= 0) break;
        const take = Math.min(batch.quantity, remaining);
        batch.quantity -= take;
        remaining -= take;
      }
      await medicine.save();

      line.medicineId = medicineId;
    }

    line.availability = availability;
    await prescription.save();

    res.json({
      message: 'Medicine availability updated',
      prescription,
    });
  } catch (error) {
    console.error('Update Medicine Availability Error:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
};

// Pharmacist: add a brand new medicine to the catalog, with its first batch.
export const addMedicine = async (req, res) => {
  try {
    const { name, unit, batchNumber, quantity, price, expiryDate } = req.body;

    if (!name || !batchNumber || !quantity || !price || !expiryDate) {
      return res
        .status(400)
        .json({ error: 'Name, batch number, quantity, price, and expiry date are required' });
    }

    const medicine = await Medicine.create({
      name,
      unit: unit || 'tablets',
      batches: [
        {
          batchNumber,
          quantity,
          price,
          expiryDate: new Date(expiryDate),
        },
      ],
    });

    res.status(201).json({
      message: 'Medicine added successfully',
      medicine,
    });
  } catch (error) {
    console.error('Add Medicine Error:', error);
    res.status(500).json({ error: 'Failed to add medicine' });
  }
};

// Pharmacist: restock an existing medicine by adding a new batch/lot.
export const addMedicineBatch = async (req, res) => {
  try {
    const { batchNumber, quantity, price, expiryDate } = req.body;

    if (!batchNumber || !quantity || !price || !expiryDate) {
      return res
        .status(400)
        .json({ error: 'Batch number, quantity, price, and expiry date are required' });
    }

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    medicine.batches.push({
      batchNumber,
      quantity,
      price,
      expiryDate: new Date(expiryDate),
    });
    await medicine.save();

    res.status(201).json({ message: 'Batch added successfully', medicine });
  } catch (error) {
    console.error('Add Medicine Batch Error:', error);
    res.status(500).json({ error: 'Failed to add batch' });
  }
};

export const getMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ name: 1 });
    res.json(medicines);
  } catch (error) {
    console.error('Get Medicines Error:', error);
    res.status(500).json({ error: 'Failed to fetch medicines' });
  }
};

// Pharmacist / receptionist: batches across every medicine that are running
// low or expiring soon, so restocking/disposal decisions are actionable.
export const getExpiringBatches = async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const now = new Date();

    const medicines = await Medicine.find();
    const expiring = [];
    const expired = [];

    for (const med of medicines) {
      for (const batch of med.batches) {
        if (batch.quantity <= 0) continue;
        if (batch.expiryDate < now) {
          expired.push({ medicineId: med._id, medicineName: med.name, unit: med.unit, batch });
        } else if (batch.expiryDate <= cutoff) {
          expiring.push({ medicineId: med._id, medicineName: med.name, unit: med.unit, batch });
        }
      }
    }

    expiring.sort((a, b) => a.batch.expiryDate - b.batch.expiryDate);
    expired.sort((a, b) => a.batch.expiryDate - b.batch.expiryDate);

    res.json({ expiring, expired, windowDays: days });
  } catch (error) {
    console.error('Get Expiring Batches Error:', error);
    res.status(500).json({ error: 'Failed to fetch expiring batches' });
  }
};

// Pharmacist: edit the medicine's name/unit (not stock - use addMedicineBatch
// for restocking, or updateMedicineBatch to correct a specific batch).
export const updateMedicine = async (req, res) => {
  try {
    const { name, unit } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (unit !== undefined) updates.unit = unit;

    const medicine = await Medicine.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    res.json({
      message: 'Medicine updated successfully',
      medicine,
    });
  } catch (error) {
    console.error('Update Medicine Error:', error);
    res.status(500).json({ error: 'Failed to update medicine' });
  }
};

// Pharmacist: correct a specific batch's quantity/price/expiry (e.g. a data-entry fix).
export const updateMedicineBatch = async (req, res) => {
  try {
    const { quantity, price, expiryDate } = req.body;

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    const batch = medicine.batches.id(req.params.batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (quantity !== undefined) batch.quantity = quantity;
    if (price !== undefined) batch.price = price;
    if (expiryDate !== undefined) batch.expiryDate = new Date(expiryDate);

    await medicine.save();

    res.json({ message: 'Batch updated successfully', medicine });
  } catch (error) {
    console.error('Update Medicine Batch Error:', error);
    res.status(500).json({ error: 'Failed to update batch' });
  }
};

export const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);

    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    res.json({ message: 'Medicine deleted successfully' });
  } catch (error) {
    console.error('Delete Medicine Error:', error);
    res.status(500).json({ error: 'Failed to delete medicine' });
  }
};
