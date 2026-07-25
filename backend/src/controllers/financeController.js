import Bill from '../models/Bill.js';
import SalarySlip from '../models/SalarySlip.js';
import User from '../models/User.js';

// Accountant / admin: cash flow summary - money collected (paid bills) over an
// optional date range, plus salary payouts over the same range, so the
// accountant can see net cash flow at a glance.
export const getCashFlow = async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    const billFilter = { status: 'paid' };
    if (from || to) billFilter.paidAt = dateFilter;

    const paidBills = await Bill.find(billFilter).sort({ paidAt: -1 });
    const unpaidBills = await Bill.find({ status: 'unpaid' });

    const totalCollected = paidBills.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalOutstanding = unpaidBills.reduce((sum, b) => sum + b.totalAmount, 0);

    const byMethod = {};
    for (const b of paidBills) {
      byMethod[b.paymentMethod] = (byMethod[b.paymentMethod] || 0) + b.totalAmount;
    }

    const salaryFilter = { status: 'paid' };
    if (from || to) salaryFilter.paidAt = dateFilter;
    const paidSalaries = await SalarySlip.find(salaryFilter);
    const totalSalariesPaid = paidSalaries.reduce((sum, s) => sum + s.netPay, 0);

    res.json({
      totalCollected,
      totalOutstanding,
      billsCollectedCount: paidBills.length,
      billsOutstandingCount: unpaidBills.length,
      collectedByPaymentMethod: byMethod,
      totalSalariesPaid,
      netCashFlow: totalCollected - totalSalariesPaid,
      recentPaidBills: paidBills.slice(0, 20),
    });
  } catch (error) {
    console.error('Get Cash Flow Error:', error);
    res.status(500).json({ error: 'Failed to fetch cash flow summary' });
  }
};

// Accountant / admin: generate a salary slip for a staff member for a given month/year.
export const createSalarySlip = async (req, res) => {
  try {
    const { staffId, month, year, basicSalary, bonus, deductions, notes } = req.body;

    if (!staffId || !month || !year || basicSalary === undefined) {
      return res.status(400).json({ error: 'Staff member, month, year and basic salary are required' });
    }

    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const existing = await SalarySlip.findOne({ staffId, month, year });
    if (existing) {
      return res.status(400).json({ error: 'A salary slip for this staff member and month already exists' });
    }

    const b = Number(basicSalary) || 0;
    const bo = Number(bonus) || 0;
    const d = Number(deductions) || 0;
    const netPay = b + bo - d;

    const slip = await SalarySlip.create({
      staffId,
      month: Number(month),
      year: Number(year),
      basicSalary: b,
      bonus: bo,
      deductions: d,
      netPay,
      notes: notes || '',
      generatedBy: req.user._id,
    });

    await slip.populate('staffId', 'name role designation');

    res.status(201).json({ message: 'Salary slip generated', slip });
  } catch (error) {
    console.error('Create Salary Slip Error:', error);
    res.status(500).json({ error: 'Failed to generate salary slip' });
  }
};

// Any authenticated staff member / admin: view my own salary slips.
export const getMySalarySlips = async (req, res) => {
  try {
    const slips = await SalarySlip.find({ staffId: req.user._id })
      .populate('staffId', 'name role designation')
      .populate('generatedBy', 'name role')
      .sort({ year: -1, month: -1 });

    res.json(slips);
  } catch (error) {
    console.error('Get My Salary Slips Error:', error);
    res.status(500).json({ error: 'Failed to fetch your salary slips' });
  }
};

// Accountant / admin: list salary slips, optionally filtered by staff/month/year.
export const getSalarySlips = async (req, res) => {
  try {
    const { staffId, month, year, status } = req.query;
    const filter = {};
    if (staffId) filter.staffId = staffId;
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    if (status) filter.status = status;

    const slips = await SalarySlip.find(filter)
      .populate('staffId', 'name role designation')
      .populate('generatedBy', 'name role')
      .sort({ year: -1, month: -1 });

    res.json(slips);
  } catch (error) {
    console.error('Get Salary Slips Error:', error);
    res.status(500).json({ error: 'Failed to fetch salary slips' });
  }
};

// Accountant / admin: mark a salary slip as paid.
export const markSalaryPaid = async (req, res) => {
  try {
    const slip = await SalarySlip.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paidAt: new Date() },
      { new: true }
    ).populate('staffId', 'name role designation');

    if (!slip) {
      return res.status(404).json({ error: 'Salary slip not found' });
    }

    res.json({ message: 'Salary slip marked as paid', slip });
  } catch (error) {
    console.error('Mark Salary Paid Error:', error);
    res.status(500).json({ error: 'Failed to update salary slip' });
  }
};
