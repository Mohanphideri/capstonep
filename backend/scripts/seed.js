import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import Department from '../src/models/Department.js';
import Medicine from '../src/models/Medicine.js';
import Ward from '../src/models/Ward.js';
import { hashPassword, generateUsername, generateTempPassword } from '../src/utils/crypto.js';

dotenv.config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/heartstone');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Department.deleteMany({});
    await Medicine.deleteMany({});
    await Ward.deleteMany({});
    console.log('Cleared existing data');

    // Create departments
    const cardiology = await Department.create({ name: 'Cardiology' });
    const neurology = await Department.create({ name: 'Neurology' });
    const pediatrics = await Department.create({ name: 'Pediatrics' });
    const orthopedics = await Department.create({ name: 'Orthopedics' });

    console.log('Departments created');

    // Create admin account
    const adminPassword = 'admin@123';
    const adminHash = await hashPassword(adminPassword);

    const admin = await User.create({
      username: 'admin',
      passwordHash: adminHash,
      name: 'Admin User',
      email: 'admin@heartstone.com',
      role: 'admin',
      contactNumber: '+91-1234567890',
      mustResetPassword: false,
      isActive: true,
    });

    console.log(`Admin created:\n  Username: admin\n  Password: ${adminPassword}`);

    // Create sample doctors
    const doctors = [];
    const doctorData = [
      {
        name: 'Dr. Rina Kapoor',
        designation: 'Cardiologist',
        degree: 'MBBS, MD (Cardiology)',
        registrationNo: 'REG/CARD/001',
        department: cardiology._id,
        consultationFee: 500,
      },
      {
        name: 'Dr. Amit Singh',
        designation: 'Neurologist',
        degree: 'MBBS, MD (Neurology)',
        registrationNo: 'REG/NEURO/002',
        department: neurology._id,
        consultationFee: 600,
      },
      {
        name: 'Dr. Priya Patel',
        designation: 'Pediatrician',
        degree: 'MBBS, MD (Pediatrics)',
        registrationNo: 'REG/PEDI/003',
        department: pediatrics._id,
        consultationFee: 400,
      },
      {
        name: 'Dr. Rajesh Kumar',
        designation: 'Orthopedic Surgeon',
        degree: 'MBBS, MS (Orthopedics)',
        registrationNo: 'REG/ORTHO/004',
        department: orthopedics._id,
        consultationFee: 700,
      },
    ];

    for (const data of doctorData) {
      const tempPassword = generateTempPassword();
      const contactNumber = `+91-${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
      const username = generateUsername(data.name, contactNumber);
      const passwordHash = await hashPassword(tempPassword);

      const doctor = await User.create({
        username,
        passwordHash,
        role: 'doctor',
        name: data.name,
        email: `${username}@heartstone.com`,
        contactNumber,
        designation: data.designation,
        degree: data.degree,
        registrationNo: data.registrationNo,
        department: data.department,
        consultationFee: data.consultationFee,
        mustResetPassword: true,
        isActive: true,
      });

      doctors.push({
        doctor,
        tempPassword,
        username,
      });

      // Add doctor to department
      await Department.findByIdAndUpdate(data.department, {
        $push: { doctors: doctor._id },
      });
    }

    console.log(`${doctors.length} Doctors created`);
    console.log('Doctor temporary passwords:');
    doctors.forEach((d) => {
      console.log(`  ${d.username}: ${d.tempPassword}`);
    });

    // Create sample staff
    const staffRoles = [
      {
        role: 'nurse',
        names: ['Nurse Anjali', 'Nurse Bharti'],
      },
      {
        role: 'receptionist',
        names: ['Receptionist Ram', 'Receptionist Lisa'],
      },
      {
        role: 'accountant',
        names: ['Accountant John'],
      },
      {
        role: 'pharmacist',
        names: ['Pharmacist Maya'],
      },
    ];

    const staffMembers = [];

    for (const roleGroup of staffRoles) {
      for (const name of roleGroup.names) {
        const tempPassword = generateTempPassword();
        const contactNumber = `+91-${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
        const username = generateUsername(name, contactNumber);
        const passwordHash = await hashPassword(tempPassword);

        const staff = await User.create({
          username,
          passwordHash,
          role: roleGroup.role,
          name,
          email: `${username}@heartstone.com`,
          contactNumber,
          mustResetPassword: true,
          isActive: true,
        });

        staffMembers.push({
          staff,
          tempPassword,
          username,
          role: roleGroup.role,
        });
      }
    }

    console.log(`${staffMembers.length} Staff members created`);
    console.log('Staff temporary passwords:');
    staffMembers.forEach((s) => {
      console.log(`  ${s.username} (${s.role}): ${s.tempPassword}`);
    });

    // Create sample medicines with an initial batch each
    const farOutExpiry = new Date();
    farOutExpiry.setFullYear(farOutExpiry.getFullYear() + 2);
    const soonExpiry = new Date();
    soonExpiry.setDate(soonExpiry.getDate() + 20); // one batch expiring soon, to exercise alerts

    const medicines = [
      { name: 'Aspirin', unit: 'tablets', batchNumber: 'ASP-001', quantity: 100, price: 5, expiryDate: farOutExpiry },
      { name: 'Amoxicillin', unit: 'capsules', batchNumber: 'AMX-001', quantity: 50, price: 15, expiryDate: farOutExpiry },
      { name: 'Paracetamol', unit: 'tablets', batchNumber: 'PARA-001', quantity: 150, price: 3, expiryDate: farOutExpiry },
      { name: 'Ibuprofen', unit: 'tablets', batchNumber: 'IBU-001', quantity: 80, price: 8, expiryDate: soonExpiry },
      { name: 'Metformin', unit: 'tablets', batchNumber: 'MET-001', quantity: 60, price: 10, expiryDate: farOutExpiry },
      { name: 'Lisinopril', unit: 'tablets', batchNumber: 'LIS-001', quantity: 40, price: 12, expiryDate: farOutExpiry },
      { name: 'Atorvastatin', unit: 'tablets', batchNumber: 'ATO-001', quantity: 45, price: 18, expiryDate: farOutExpiry },
      { name: 'Omeprazole', unit: 'capsules', batchNumber: 'OME-001', quantity: 70, price: 6, expiryDate: farOutExpiry },
    ];

    for (const med of medicines) {
      await Medicine.create({
        name: med.name,
        unit: med.unit,
        batches: [
          {
            batchNumber: med.batchNumber,
            quantity: med.quantity,
            price: med.price,
            expiryDate: med.expiryDate,
          },
        ],
      });
    }

    console.log(`${medicines.length} Medicines added to inventory (with one batch each)`);

    // Create sample wards with beds, for IPD admissions
    const wards = [
      {
        name: 'General Ward A',
        type: 'general',
        floor: '1',
        beds: [
          { bedNumber: 'GA-01', dailyCharge: 800 },
          { bedNumber: 'GA-02', dailyCharge: 800 },
          { bedNumber: 'GA-03', dailyCharge: 800 },
        ],
      },
      {
        name: 'ICU',
        type: 'icu',
        floor: '2',
        beds: [
          { bedNumber: 'ICU-01', dailyCharge: 5000 },
          { bedNumber: 'ICU-02', dailyCharge: 5000 },
        ],
      },
      {
        name: 'Private Ward',
        type: 'private',
        floor: '3',
        beds: [
          { bedNumber: 'PVT-01', dailyCharge: 2500 },
          { bedNumber: 'PVT-02', dailyCharge: 2500 },
        ],
      },
    ];

    for (const ward of wards) {
      await Ward.create(ward);
    }

    console.log(`${wards.length} Wards created with beds for IPD`);


    console.log('\n✅ Database seeded successfully!');
    console.log('\n📝 Admin Credentials:');
    console.log(`  Username: admin`);
    console.log(`  Password: ${adminPassword}`);
    console.log('\n⚠️  Doctor & Staff must change password on first login');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
