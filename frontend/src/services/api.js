import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Add token to headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    // Auth endpoints handle their own 401s (invalid OTP, wrong password, or a
    // failed session-restore check on app startup) - don't also force a hard
    // redirect here, or a normal "wrong password" attempt would bounce the page.
    const isAuthEndpoint = url.includes('/auth/');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authService = {
  sendOTP: (phone) => api.post('/auth/patient/send-otp', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/patient/verify-otp', { phone, otp }),
  staffLogin: (username, password) => api.post('/auth/staff/login', { username, password }),
  changePassword: (oldPassword, newPassword) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),
  // Restore session on refresh/app startup - re-validates the token against the DB
  getMe: () => api.get('/auth/me'),
};

// Staff endpoints
export const staffService = {
  addStaff: (staffData) => api.post('/staff', staffData),
  getStaff: (role) => api.get('/staff', { params: { role } }),
  updateStaff: (id, data) => api.patch(`/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/staff/${id}`),
  getDoctors: (departmentId) => api.get('/staff/doctors', { params: { departmentId } }),
  getMyProfile: () => api.get('/staff/me'),
  updateMyProfile: (data) => api.patch('/staff/me', data),
};

// Appointments endpoints
export const appointmentService = {
  // Patient no longer picks a doctor - just a department + slot time; the
  // backend auto-assigns whichever doctor the admin scheduled for that slot.
  bookAppointment: (data) => api.post('/appointments', data),
  getMyAppointments: () => api.get('/appointments/mine'),
  getAllAppointments: (filters) => api.get('/appointments', { params: filters }),
  getAvailableSlots: (doctorId, date) =>
    api.get('/appointments/available-slots', { params: { doctorId, date } }),
  updateStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }),
  reassignDoctor: (id, doctorId) => api.patch(`/appointments/${id}/assign-doctor`, { doctorId }),
  cancel: (id, reason, note) => api.delete(`/appointments/${id}`, { data: { reason, note } }),
  getCancelReasons: () => api.get('/appointments/cancel-reasons'),
  getByCode: (code) => api.get(`/appointments/lookup/${encodeURIComponent(code)}`),
};

// Doctor schedule endpoints (admin sets which doctor is available for which slot)
export const scheduleService = {
  // Patient: which time slots are open for a department + date
  getAvailable: (departmentId, date) =>
    api.get('/schedule/available', { params: { departmentId, date } }),
  // Doctor: my own weekly availability
  getMine: () => api.get('/schedule/mine'),
  // Admin: view/set a specific doctor's weekly availability
  getForDoctor: (doctorId) => api.get(`/schedule/doctor/${doctorId}`),
  setForDoctor: (doctorId, departmentId, dayOfWeek, times) =>
    api.put(`/schedule/doctor/${doctorId}`, { departmentId, dayOfWeek, times }),
};

// Patient profile endpoints (name capture on first login, etc.)
export const patientService = {
  getMyProfile: () => api.get('/patients/me'),
  updateMyProfile: (data) => api.patch('/patients/me', data),
  findByPhone: (phone) => api.get(`/patients/by-phone/${encodeURIComponent(phone)}`),
};

// Queue endpoints
export const queueService = {
  joinQueue: (departmentId) => api.post('/queue/join', { departmentId }),
  getQueueStatus: (departmentId) => api.get(`/queue/status/${departmentId}`),
  getMyToken: () => api.get('/queue/my-token'),
  updateStatus: (id, status, action) => api.patch(`/queue/${id}/status`, { status, action }),
  leaveQueue: (id) => api.delete(`/queue/${id}/leave`),
};

// Queries / support tickets endpoints
export const queryService = {
  // Patient: raise a ticket -> gets a ticketId back
  create: (subject, message) => api.post('/queries', { subject, message }),
  getMine: () => api.get('/queries/mine'),
  // Admin: every ticket raised by any patient
  getAll: (status) => api.get('/queries', { params: { status } }),
  // Receptionist / admin: raise a ticket at the desk on behalf of a patient
  createOnBehalf: (patientPhone, subject, message) =>
    api.post('/queries/on-behalf', { patientPhone, subject, message }),
  // Any staff member: tickets currently redirected to me
  getAssigned: () => api.get('/queries/assigned'),
  // Admin only: redirect a ticket to any staff member and/or change its status
  manage: (id, { assignedToId, status } = {}) =>
    api.patch(`/queries/${id}/manage`, { assignedToId, status }),
  // Admin, or the staff member the ticket is assigned to
  reply: (id, reply) => api.patch(`/queries/${id}/reply`, { reply }),
  // Patient: send a follow-up message on my own ticket
  patientReply: (id, message) => api.patch(`/queries/${id}/patient-reply`, { message }),
};

// Pharmacy endpoints
export const pharmacyService = {
  createPrescription: (data) => api.post('/pharmacy/prescriptions', data),
  getPrescriptions: (filters) => api.get('/pharmacy/prescriptions', { params: filters }),
  getMyPrescriptions: () => api.get('/pharmacy/my-prescriptions'),
  updateMedicineAvailability: (prescriptionId, medicineIndex, availability, medicineId) =>
    api.patch(`/pharmacy/prescriptions/${prescriptionId}/availability`, {
      medicineIndex,
      availability,
      medicineId,
    }),
  addMedicine: (data) => api.post('/pharmacy/medicines', data),
  getMedicines: () => api.get('/pharmacy/medicines'),
  getExpiringBatches: (days) => api.get('/pharmacy/medicines/expiring', { params: { days } }),
  updateMedicine: (id, data) => api.patch(`/pharmacy/medicines/${id}`, data),
  deleteMedicine: (id) => api.delete(`/pharmacy/medicines/${id}`),
  addBatch: (medicineId, data) => api.post(`/pharmacy/medicines/${medicineId}/batches`, data),
  updateBatch: (medicineId, batchId, data) =>
    api.patch(`/pharmacy/medicines/${medicineId}/batches/${batchId}`, data),
};

// Leave endpoints
export const leaveService = {
  apply: (fromDate, toDate, reason) =>
    api.post('/leave', { fromDate, toDate, reason }),
  getMine: () => api.get('/leave/mine'),
  getPending: () => api.get('/leave'),
  approve: (id) => api.patch(`/leave/${id}/approve`),
  reject: (id) => api.patch(`/leave/${id}/reject`),
};

// Departments endpoints
export const departmentService = {
  getAll: () => api.get('/departments'),
  getById: (id) => api.get(`/departments/${id}`),
  create: (name) => api.post('/departments', { name }),
  assignDoctor: (id, doctorId) => api.patch(`/departments/${id}/assign-doctor`, { doctorId }),
  removeDoctor: (id, doctorId) => api.patch(`/departments/${id}/remove-doctor`, { doctorId }),
};

// Analytics endpoints
export const analyticsService = {
  getOverview: () => api.get('/analytics/overview'),
};

// Billing endpoints (receptionist creates/collects, accountant + admin can also view)
export const billingService = {
  create: (data) => api.post('/billing', data),
  getBills: (filters) => api.get('/billing', { params: filters }),
  getBillableItems: (appointmentCode) =>
    api.get(`/billing/billable/${encodeURIComponent(appointmentCode)}`),
  markPaid: (id, paymentMethod) => api.patch(`/billing/${id}/pay`, { paymentMethod }),
};

// Finance endpoints (accountant + admin only) - cash flow overview and salary slips
export const financeService = {
  getCashFlow: (from, to) => api.get('/finance/cashflow', { params: { from, to } }),
  createSalarySlip: (data) => api.post('/finance/salary-slips', data),
  getSalarySlips: (filters) => api.get('/finance/salary-slips', { params: filters }),
  markSalaryPaid: (id) => api.patch(`/finance/salary-slips/${id}/pay`),
  // Any staff member / admin: my own salary slips
  getMySalarySlips: () => api.get('/finance/my-salary-slips'),
};

// EMR endpoints - vitals, diagnosis, clinical notes per encounter
export const encounterService = {
  create: (data) => api.post('/encounters', data),
  update: (id, data) => api.patch(`/encounters/${id}`, data),
  getMine: () => api.get('/encounters/mine'),
  getForPatient: (patientId) => api.get(`/encounters/patient/${patientId}`),
  getForAppointment: (appointmentId) => api.get(`/encounters/appointment/${appointmentId}`),
  getForAdmission: (admissionId) => api.get(`/encounters/admission/${admissionId}`),
};

// IPD endpoints - wards/beds and admission/transfer/discharge workflow
export const ipdService = {
  getWards: () => api.get('/ipd/wards'),
  createWard: (data) => api.post('/ipd/wards', data),
  addBed: (wardId, data) => api.post(`/ipd/wards/${wardId}/beds`, data),
  updateBedStatus: (wardId, bedId, status) =>
    api.patch(`/ipd/wards/${wardId}/beds/${bedId}/status`, { status }),
  admit: (data) => api.post('/ipd/admissions', data),
  getAdmissions: (status) => api.get('/ipd/admissions', { params: { status } }),
  getAdmission: (id) => api.get(`/ipd/admissions/${id}`),
  transfer: (id, data) => api.patch(`/ipd/admissions/${id}/transfer`, data),
  discharge: (id, data) => api.patch(`/ipd/admissions/${id}/discharge`, data),
  createBill: (id, data) => api.post(`/ipd/admissions/${id}/bill`, data),
};

export default api;
