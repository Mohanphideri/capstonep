import bcryptjs from 'bcryptjs';

export const hashPassword = async (password) => {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
};

export const comparePassword = async (password, hash) => {
  return bcryptjs.compare(password, hash);
};

// Username format: first 3 letters of the name + last 3 digits of the phone number + "H"
// e.g. "Ravi Kumar" + "+91-9876543210" -> "rav210H"
export const generateUsername = (name, contactNumber) => {
  const lettersOnly = (name || '').replace(/[^a-zA-Z]/g, '').toLowerCase();
  const namePart = lettersOnly.length >= 3 ? lettersOnly.slice(0, 3) : lettersOnly.padEnd(3, 'x');

  const digitsOnly = (contactNumber || '').replace(/[^0-9]/g, '');
  const phonePart =
    digitsOnly.length >= 3 ? digitsOnly.slice(-3) : digitsOnly.padStart(3, '0');

  return `${namePart}${phonePart}H`;
};

export const generateAppointmentCode = () => {
  const datePart = new Date()
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, ''); // YYMMDD
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  let random = '';
  for (let i = 0; i < 4; i += 1) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return `APT-${datePart}-${random}`;
};
// Bill number format: BIL-YYMMDD-XXXX (e.g. BIL-260723-9P3Q)
export const generateBillNumber = () => {
  const datePart = new Date()
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, ''); // YYMMDD
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  let random = '';
  for (let i = 0; i < 4; i += 1) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return `BIL-${datePart}-${random}`;
};

export const generateTempPassword = () => {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
};

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Ticket ID format: TCK-YYMMDD-XXXX (e.g. TCK-260723-7K2M)
export const generateTicketId = () => {
  const datePart = new Date()
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, ''); // YYMMDD
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  let random = '';
  for (let i = 0; i < 4; i += 1) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return `TCK-${datePart}-${random}`;
};
