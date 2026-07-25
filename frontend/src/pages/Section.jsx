import { useState, useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import { DataCard, DataGrid, StatusBadge, statusTone, EmptyRow, SectionToolbar } from "../components/DataCard";
import { useAuth } from "../contexts/AuthContext.jsx";
import { downloadPrescriptionPdf } from "../utils/generatePrescriptionPdf";
import {
  appointmentService,
  queueService,
  pharmacyService,
  queryService,
  departmentService,
  staffService,
  leaveService,
  analyticsService,
  scheduleService,
  patientService,
  billingService,
  financeService,
  encounterService,
  ipdService,
} from "../services/api.js";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TICKET_STATUSES = ["pending", "in-progress", "completed", "closed"];

const STAFF_ROLES = ["doctor", "nurse", "accountant", "receptionist", "pharmacist"];
const EMPTY_STAFF_FORM = {
  name: "",
  role: "nurse",
  contactNumber: "",
  email: "",
  designation: "",
  degree: "",
  registrationNo: "",
  departmentId: "",
  consultationFee: "",
  dateOfBirth: "",
  gender: "",
  bloodGroup: "",
  address: "",
  emergencyContactName: "",
  emergencyContactNumber: "",
  qualification: "",
  experienceYears: "",
  joiningDate: "",
  shiftTiming: "",
  employeeIdProof: "",
  salary: "",
};

const EMPTY_MEDICINE_LINE = { name: "", dosage: "", quantity: "" };

export default function Section() {
  const { section } = useParams();
  const config = useOutletContext();
  const { user } = useAuth();
  const current = config.sections.find((s) => s.path === section) ?? config.sections[0];
  // The real logged-in role (nurse / accountant / receptionist / doctor / pharmacist / admin / patient),
  // as opposed to config.role which is "staff" for the shared nurse/accountant/receptionist portal.
  const actualRole = user?.role || config.role;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [bookingStatus, setBookingStatus] = useState("");

  // --- Admin-only state ---
  const [staffList, setStaffList] = useState([]);
  const [staffRoleFilter, setStaffRoleFilter] = useState("");
  const [newStaffResult, setNewStaffResult] = useState(null);
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF_FORM);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [assignDoctorChoice, setAssignDoctorChoice] = useState({});
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [actionMessage, setActionMessage] = useState("");

  // --- Doctor-only state ---
  const [rxAppointmentId, setRxAppointmentId] = useState(null);
  const [rxMedicines, setRxMedicines] = useState([{ ...EMPTY_MEDICINE_LINE }]);
  const [rxStatus, setRxStatus] = useState("");

  // --- Clinical / EMR state (doctor records; nurse/receptionist/patient can view) ---
  const [clinicalLookupCode, setClinicalLookupCode] = useState("");
  const [clinicalLookupResult, setClinicalLookupResult] = useState(null); // { appointment, encounters }
  const [clinicalLookupSearched, setClinicalLookupSearched] = useState(false);
  const [clinicalLookupError, setClinicalLookupError] = useState("");
  const EMPTY_ENCOUNTER_FORM = {
    temperatureF: "",
    bloodPressure: "",
    pulseBpm: "",
    respiratoryRate: "",
    spo2: "",
    weightKg: "",
    heightCm: "",
    chiefComplaint: "",
    diagnosisText: "", // comma-separated, split on save
    clinicalNotes: "",
    followUpDate: "",
  };
  const [encounterForm, setEncounterForm] = useState(EMPTY_ENCOUNTER_FORM);
  const [encounterSaveStatus, setEncounterSaveStatus] = useState("");

  // --- IPD state (doctor / nurse / receptionist) ---
  const [wards, setWards] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [admissionStatusFilter, setAdmissionStatusFilter] = useState("admitted");
  const [admitForm, setAdmitForm] = useState({
    patientPhone: "",
    wardId: "",
    bedId: "",
    admittingDoctorId: "",
    reasonForAdmission: "",
    diagnosis: "",
  });
  const [admitStatus, setAdmitStatus] = useState("");
  const [transferChoice, setTransferChoice] = useState({}); // { [admissionId]: { wardId, bedId } }
  const [dischargeDrafts, setDischargeDrafts] = useState({}); // { [admissionId]: { summary, followUpInstructions } }
  const [ipdBillDrafts, setIpdBillDrafts] = useState({}); // { [admissionId]: { consultationFee, otherCharges, paymentMethod } }
  const [ipdActionStatus, setIpdActionStatus] = useState("");

  // --- Patient medical records state ---
  const [myEncounters, setMyEncounters] = useState([]);

  // --- Staff (nurse / accountant / receptionist) state ---
  const [leaveForm, setLeaveForm] = useState({ fromDate: "", toDate: "", reason: "" });
  const [leaveApplyStatus, setLeaveApplyStatus] = useState("");
  const [apptLookupValue, setApptLookupValue] = useState("");
  const [apptLookupResult, setApptLookupResult] = useState(null);
  const [apptLookupSearched, setApptLookupSearched] = useState(false);
  const [apptLookupError, setApptLookupError] = useState("");

  // --- Shared profile state (doctor + staff) ---
  const [profileData, setProfileData] = useState(null);
  const [profileForm, setProfileForm] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // --- Patient: raise a new ticket ---
  const [newTicketForm, setNewTicketForm] = useState({ subject: "", message: "" });
  const [newTicketStatus, setNewTicketStatus] = useState("");

  // --- Tickets (patient queries) state - used across admin/doctor/staff/pharmacist/patient ---
  const [staffDirectory, setStaffDirectory] = useState([]); // for admin's assign-to dropdown
  const [ticketReplyDrafts, setTicketReplyDrafts] = useState({});
  const [patientReplyDrafts, setPatientReplyDrafts] = useState({});
  const [ticketActionMessage, setTicketActionMessage] = useState("");

  // --- Cancel appointment (with reason) state ---
  const [cancelReasons, setCancelReasons] = useState([]);
  const [cancelDrafts, setCancelDrafts] = useState({}); // { [appointmentId]: { reason, note } }
  const [openCancelId, setOpenCancelId] = useState(null);

  // --- Admin doctor-schedule management state ---
  const [scheduleDoctorId, setScheduleDoctorId] = useState("");
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(new Date().getDay());
  const [scheduleTimes, setScheduleTimes] = useState([]); // times already saved for doctor+day
  const [scheduleNewTime, setScheduleNewTime] = useState("09:00");
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [myWeeklySchedule, setMyWeeklySchedule] = useState(null); // doctor's own read-only view

  // --- Patient profile state ---
  const [patientProfile, setPatientProfile] = useState(null);
  const [patientProfileForm, setPatientProfileForm] = useState({ name: "", age: "", gender: "", email: "" });
  const [patientProfileSaving, setPatientProfileSaving] = useState(false);
  const [patientProfileMessage, setPatientProfileMessage] = useState("");

  // --- Pharmacist-only state ---
  const [lookupType, setLookupType] = useState("appointment");
  const [lookupValue, setLookupValue] = useState("");
  const [lookupResults, setLookupResults] = useState(null);
  const [lookupSearched, setLookupSearched] = useState(false);
  const [medicineCatalog, setMedicineCatalog] = useState([]); // full catalog, used to link a prescription line to real stock
  const [linkedMedicineChoice, setLinkedMedicineChoice] = useState({}); // { "rxId:index": medicineId }
  const [batchDrafts, setBatchDrafts] = useState({}); // { [medicineId]: { batchNumber, quantity, price, expiryDate } }
  const [expiringBatches, setExpiringBatches] = useState(null);
  const [addMedicineForm, setAddMedicineForm] = useState({
    name: "",
    unit: "tablets",
    batchNumber: "",
    quantity: "",
    price: "",
    expiryDate: "",
  });

  // --- Receptionist-only state ---
  const [receptionAppointments, setReceptionAppointments] = useState([]);
  const [receptionStatusFilter, setReceptionStatusFilter] = useState("");
  const [billLookupCode, setBillLookupCode] = useState("");
  const [billLookupResult, setBillLookupResult] = useState(null);
  const [billLookupSearched, setBillLookupSearched] = useState(false);
  const [billLookupError, setBillLookupError] = useState("");
  const [billMedicineChoices, setBillMedicineChoices] = useState({}); // { medicineIndex: bool }
  const [billConsultationFee, setBillConsultationFee] = useState("");
  const [billApplicationFee, setBillApplicationFee] = useState("");
  const [billPaymentMethod, setBillPaymentMethod] = useState("cash");
  const [billGenerateStatus, setBillGenerateStatus] = useState("");
  const [billsList, setBillsList] = useState([]);
  const [onBehalfTicketForm, setOnBehalfTicketForm] = useState({ patientPhone: "", subject: "", message: "" });
  const [onBehalfTicketStatus, setOnBehalfTicketStatus] = useState("");
  const [doctorReassignChoice, setDoctorReassignChoice] = useState({}); // { [appointmentId]: doctorId }

  // --- Accountant-only state ---
  const [cashFlow, setCashFlow] = useState(null);
  const [salarySlips, setSalarySlips] = useState([]);
  const [salaryStaffList, setSalaryStaffList] = useState([]);
  const [salaryForm, setSalaryForm] = useState({ staffId: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), basicSalary: "", bonus: "", deductions: "", notes: "" });
  const [salaryFormStatus, setSalaryFormStatus] = useState("");

  useEffect(() => {
    setError("");
    setPayload(null);
    setActionMessage("");
    setRxAppointmentId(null);
    setRxMedicines([{ ...EMPTY_MEDICINE_LINE }]);
    setRxStatus("");
    setLeaveApplyStatus("");
    setProfileMessage("");
    setLookupResults(null);
    setLookupSearched(false);
    setApptLookupResult(null);
    setApptLookupSearched(false);
    setApptLookupError("");
    setBillLookupResult(null);
    setBillLookupSearched(false);
    setBillLookupError("");
    setBillMedicineChoices({});
    setBillGenerateStatus("");
    setOnBehalfTicketStatus("");
    setSalaryFormStatus("");
    setClinicalLookupResult(null);
    setClinicalLookupSearched(false);
    setClinicalLookupError("");
    setEncounterSaveStatus("");
    setAdmitStatus("");
    setIpdActionStatus("");
    setLoading(true);

    const fetchData = async () => {
      try {
        if (section === "my-salary") {
          const response = await financeService.getMySalarySlips();
          setPayload(response.data);
        } else if (config.role === "patient") {
          if (section === "appointments") {
            const response = await appointmentService.getMyAppointments();
            setPayload(response.data);
          } else if (section === "queue") {
            const response = await queueService.getMyToken();
            setPayload(response.data);
          } else if (section === "prescriptions") {
            const response = await pharmacyService.getMyPrescriptions();
            setPayload(response.data);
          } else if (section === "queries") {
            const response = await queryService.getMine();
            setPayload(response.data);
          } else if (section === "book") {
            const deptResponse = await departmentService.getAll();
            setDepartments(deptResponse.data || []);
          } else if (section === "profile") {
            const response = await patientService.getMyProfile();
            setPatientProfile(response.data);
          } else if (section === "medical-records") {
            const response = await encounterService.getMine();
            setMyEncounters(response.data || []);
          }
        } else if (config.role === "admin") {
          if (section === "staff") {
            const response = await staffService.getStaff(staffRoleFilter || undefined);
            setStaffList(response.data || []);
          } else if (section === "add-staff") {
            const deptResponse = await departmentService.getAll();
            setDepartments(deptResponse.data || []);
          } else if (section === "departments") {
            const [deptResponse, doctorResponse] = await Promise.all([
              departmentService.getAll(),
              staffService.getStaff("doctor"),
            ]);
            setDepartments(deptResponse.data || []);
            setDoctors(doctorResponse.data || []);
          } else if (section === "doctor-schedule") {
            const [deptResponse, doctorResponse] = await Promise.all([
              departmentService.getAll(),
              staffService.getStaff("doctor"),
            ]);
            setDepartments(deptResponse.data || []);
            setDoctors(doctorResponse.data || []);
          } else if (section === "leave-requests") {
            const response = await leaveService.getPending();
            setLeaveRequests(response.data || []);
          } else if (section === "appointments") {
            const response = await appointmentService.getAllAppointments();
            setAllAppointments(response.data || []);
          } else if (section === "tickets") {
            const [queryResponse, staffResponse] = await Promise.all([
              queryService.getAll(),
              staffService.getStaff(),
            ]);
            setPayload(queryResponse.data);
            setStaffDirectory(staffResponse.data || []);
          } else if (section === "analytics") {
            const response = await analyticsService.getOverview();
            setAnalytics(response.data);
          }
        } else if (config.role === "doctor") {
          if (section === "appointments") {
            const response = await appointmentService.getMyAppointments();
            setPayload(response.data);
          } else if (section === "prescriptions") {
            const response = await pharmacyService.getPrescriptions({ doctorId: user?._id });
            setPayload(response.data);
          } else if (section === "schedule") {
            const response = await scheduleService.getMine();
            setMyWeeklySchedule(response.data);
          } else if (section === "tickets") {
            const response = await queryService.getAssigned();
            setPayload(response.data);
          } else if (section === "profile") {
            const response = await staffService.getMyProfile();
            setProfileData(response.data);
          } else if (section === "ipd") {
            const [wardResponse, admissionResponse] = await Promise.all([
              ipdService.getWards(),
              ipdService.getAdmissions(admissionStatusFilter || undefined),
            ]);
            setWards(wardResponse.data || []);
            setAdmissions(
              (admissionResponse.data || []).filter(
                (a) => String(a.admittingDoctorId?._id) === String(user?._id)
              )
            );
          }
        } else if (config.role === "nurse") {
          if (section === "leave-history") {
            const response = await leaveService.getMine();
            setPayload(response.data);
          } else if (section === "tickets") {
            const response = await queryService.getAssigned();
            setPayload(response.data);
          } else if (section === "profile") {
            const response = await staffService.getMyProfile();
            setProfileData(response.data);
          } else if (section === "ipd") {
            const [wardResponse, admissionResponse] = await Promise.all([
              ipdService.getWards(),
              ipdService.getAdmissions("admitted"),
            ]);
            setWards(wardResponse.data || []);
            setAdmissions(admissionResponse.data || []);
          }
        } else if (config.role === "receptionist") {
          if (section === "appointments") {
            const [apptResponse, doctorResponse] = await Promise.all([
              appointmentService.getAllAppointments(
                receptionStatusFilter ? { status: receptionStatusFilter } : undefined
              ),
              staffService.getDoctors(),
            ]);
            setReceptionAppointments(apptResponse.data || []);
            setDoctors(doctorResponse.data || []);
          } else if (section === "ipd") {
            const [wardResponse, admissionResponse, doctorResponse] = await Promise.all([
              ipdService.getWards(),
              ipdService.getAdmissions(admissionStatusFilter || undefined),
              staffService.getDoctors(),
            ]);
            setWards(wardResponse.data || []);
            setAdmissions(admissionResponse.data || []);
            setDoctors(doctorResponse.data || []);
          } else if (section === "bills") {
            const response = await billingService.getBills();
            setBillsList(response.data || []);
          } else if (section === "leave-history") {
            const response = await leaveService.getMine();
            setPayload(response.data);
          } else if (section === "tickets") {
            const response = await queryService.getAssigned();
            setPayload(response.data);
          } else if (section === "profile") {
            const response = await staffService.getMyProfile();
            setProfileData(response.data);
          }
        } else if (config.role === "accountant") {
          if (section === "bills") {
            const response = await billingService.getBills();
            setBillsList(response.data || []);
          } else if (section === "cashflow") {
            const response = await financeService.getCashFlow();
            setCashFlow(response.data);
          } else if (section === "salary-slips") {
            const [slipResponse, staffResponse] = await Promise.all([
              financeService.getSalarySlips(),
              staffService.getStaff(),
            ]);
            setSalarySlips(slipResponse.data || []);
            setSalaryStaffList(staffResponse.data || []);
          } else if (section === "leave-history") {
            const response = await leaveService.getMine();
            setPayload(response.data);
          } else if (section === "tickets") {
            const response = await queryService.getAssigned();
            setPayload(response.data);
          } else if (section === "profile") {
            const response = await staffService.getMyProfile();
            setProfileData(response.data);
          }
        } else if (config.role === "pharmacist") {
          if (section === "inventory") {
            const response = await pharmacyService.getMedicines();
            setPayload(response.data);
          } else if (section === "lookup") {
            const response = await pharmacyService.getMedicines();
            setMedicineCatalog(response.data || []);
          } else if (section === "expiry-alerts") {
            const response = await pharmacyService.getExpiringBatches(30);
            setExpiringBatches(response.data);
          } else if (section === "tickets") {
            const response = await queryService.getAssigned();
            setPayload(response.data);
          }
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load section data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [config.role, section, staffRoleFilter, actualRole, receptionStatusFilter, admissionStatusFilter]);

  // Patients and admin both need the list of valid cancellation reasons for the cancel-appointment form.
  useEffect(() => {
    if (config.role !== "patient" && config.role !== "admin") return;
    appointmentService
      .getCancelReasons()
      .then((response) => setCancelReasons(response.data || []))
      .catch(() => setCancelReasons(["Schedule conflict", "Feeling better now", "Found another doctor", "Personal emergency", "Other"]));
  }, [config.role]);

  // Load a doctor's existing weekly slots into the editor when the admin picks a doctor/day.
  useEffect(() => {
    if (config.role !== "admin" || section !== "doctor-schedule" || !scheduleDoctorId) {
      setScheduleTimes([]);
      return;
    }
    scheduleService
      .getForDoctor(scheduleDoctorId)
      .then((response) => {
        const day = response.data?.schedule?.[scheduleDayOfWeek] || [];
        setScheduleTimes(day);
      })
      .catch(() => setScheduleTimes([]));
  }, [config.role, section, scheduleDoctorId, scheduleDayOfWeek]);

  useEffect(() => {
    if (patientProfile) {
      setPatientProfileForm({
        name: patientProfile.name || "",
        age: patientProfile.age ?? "",
        gender: patientProfile.gender || "",
        email: patientProfile.email || "",
      });
    }
  }, [patientProfile]);

  useEffect(() => {
    if (profileData) {
      setProfileForm({
        contactNumber: profileData.contactNumber || "",
        email: profileData.email || "",
        address: profileData.address || "",
        emergencyContactName: profileData.emergencyContactName || "",
        emergencyContactNumber: profileData.emergencyContactNumber || "",
        bloodGroup: profileData.bloodGroup || "",
      });
    }
  }, [profileData]);

  const fetchSlots = async () => {
    if (!selectedDepartment || !selectedDate) {
      setError("Select a department and date to see available slots.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      const response = await scheduleService.getAvailable(selectedDepartment, selectedDate);
      setSlots((response.data || []).filter((s) => s.available));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load available slots");
    } finally {
      setLoading(false);
    }
  };

  const bookAppointment = async (time) => {
    // time is an "HH:MM" string; combine it with the selected date into a full Date.
    const [hh, mm] = time.split(":").map(Number);
    const slotDate = new Date(selectedDate);
    slotDate.setHours(hh, mm, 0, 0);

    try {
      setError("");
      setBookingStatus("Booking appointment...");
      const response = await appointmentService.bookAppointment({
        departmentId: selectedDepartment,
        slotTime: slotDate.toISOString(),
      });
      const code = response.data?.appointment?.appointmentCode;
      const doctorName = response.data?.appointment?.doctorId?.name;
      setBookingStatus(
        code
          ? `Appointment booked with ${doctorName || "your assigned doctor"}. Your appointment ID is ${code} — keep it handy for pharmacy pickup and check-in.`
          : "Appointment booked successfully."
      );
      setSlots((prev) => prev.filter((slot) => slot.time !== time));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to book appointment");
      setBookingStatus("");
    }
  };

  const submitNewTicket = async (e) => {
    e.preventDefault();
    if (!newTicketForm.subject.trim() || !newTicketForm.message.trim()) {
      setNewTicketStatus("Subject and message are required.");
      return;
    }
    try {
      setNewTicketStatus("Submitting...");
      const response = await queryService.create(newTicketForm.subject.trim(), newTicketForm.message.trim());
      setPayload((prev) => [response.data.query, ...(prev || [])]);
      setNewTicketStatus(`Ticket ${response.data.query.ticketId} raised successfully.`);
      setNewTicketForm({ subject: "", message: "" });
    } catch (err) {
      setNewTicketStatus(err.response?.data?.error || "Failed to raise ticket");
    }
  };

  const cancelMyAppointment = async (id) => {
    const draft = cancelDrafts[id] || {};
    if (!draft.reason) return;
    try {
      setError("");
      const response = await appointmentService.cancel(id, draft.reason, draft.note);
      setPayload((prev) => prev.map((a) => (a._id === id ? response.data.appointment : a)));
      setOpenCancelId(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to cancel appointment");
    }
  };

  // --- Patient profile actions ---

  const submitPatientProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setPatientProfileSaving(true);
      setPatientProfileMessage("");
      const response = await patientService.updateMyProfile(patientProfileForm);
      setPatientProfile(response.data.patient);
      setPatientProfileMessage("Profile updated.");
    } catch (err) {
      setPatientProfileMessage(err.response?.data?.error || "Failed to update profile");
    } finally {
      setPatientProfileSaving(false);
    }
  };

  // --- Admin actions ---

  const handleStaffFormChange = (field, value) => {
    setStaffForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitAddStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.role) {
      setError("Name and role are required.");
      return;
    }
    if (!staffForm.contactNumber) {
      setError("Contact number is required (it's used to generate the username).");
      return;
    }
    try {
      setError("");
      setLoading(true);
      const body = {
        name: staffForm.name,
        role: staffForm.role,
        contactNumber: staffForm.contactNumber,
        email: staffForm.email || undefined,
        dateOfBirth: staffForm.dateOfBirth || undefined,
        gender: staffForm.gender || undefined,
        bloodGroup: staffForm.bloodGroup || undefined,
        address: staffForm.address || undefined,
        emergencyContactName: staffForm.emergencyContactName || undefined,
        emergencyContactNumber: staffForm.emergencyContactNumber || undefined,
        qualification: staffForm.qualification || undefined,
        experienceYears: staffForm.experienceYears || undefined,
        joiningDate: staffForm.joiningDate || undefined,
        shiftTiming: staffForm.shiftTiming || undefined,
        employeeIdProof: staffForm.employeeIdProof || undefined,
        salary: staffForm.salary || undefined,
      };
      if (staffForm.role === "doctor") {
        body.designation = staffForm.designation || undefined;
        body.degree = staffForm.degree || undefined;
        body.registrationNo = staffForm.registrationNo || undefined;
        body.departmentId = staffForm.departmentId || undefined;
        body.consultationFee = staffForm.consultationFee ? Number(staffForm.consultationFee) : undefined;
      }
      const response = await staffService.addStaff(body);
      setNewStaffResult(response.data);
      setStaffForm(EMPTY_STAFF_FORM);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add staff member");
    } finally {
      setLoading(false);
    }
  };

  const deactivateStaff = async (id) => {
    try {
      setError("");
      await staffService.deleteStaff(id);
      setStaffList((prev) => prev.filter((s) => s._id !== id));
      setActionMessage("Staff member deactivated.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to deactivate staff member");
    }
  };

  const createDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) return;
    try {
      setError("");
      const response = await departmentService.create(newDepartmentName.trim());
      setDepartments((prev) => [...prev, response.data.department]);
      setNewDepartmentName("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create department");
    }
  };

  const assignDoctor = async (departmentId) => {
    const doctorId = assignDoctorChoice[departmentId];
    if (!doctorId) return;
    try {
      setError("");
      const response = await departmentService.assignDoctor(departmentId, doctorId);
      setDepartments((prev) =>
        prev.map((d) => (d._id === departmentId ? response.data.department : d))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to assign doctor");
    }
  };

  const removeDoctor = async (departmentId, doctorId) => {
    try {
      setError("");
      const response = await departmentService.removeDoctor(departmentId, doctorId);
      setDepartments((prev) =>
        prev.map((d) => (d._id === departmentId ? response.data.department : d))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove doctor");
    }
  };

  const reviewLeave = async (id, decision) => {
    try {
      setError("");
      if (decision === "approve") {
        await leaveService.approve(id);
      } else {
        await leaveService.reject(id);
      }
      setLeaveRequests((prev) => prev.filter((l) => l._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update leave request");
    }
  };

  const updateAppointmentStatusAdmin = async (id, status) => {
    try {
      setError("");
      const response = await appointmentService.updateStatus(id, status);
      setAllAppointments((prev) =>
        prev.map((a) => (a._id === id ? response.data.appointment : a))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update appointment");
    }
  };

  const cancelAppointmentAdmin = async (id) => {
    const draft = cancelDrafts[id] || {};
    if (!draft.reason) return;
    try {
      setError("");
      const response = await appointmentService.cancel(id, draft.reason, draft.note);
      setAllAppointments((prev) => prev.map((a) => (a._id === id ? response.data.appointment : a)));
      setOpenCancelId(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to cancel appointment");
    }
  };

  const assignTicket = async (id, assignedToId) => {
    try {
      setError("");
      const response = await queryService.manage(id, { assignedToId: assignedToId || null });
      setPayload((prev) => prev.map((q) => (q._id === id ? response.data.query : q)));
      setTicketActionMessage("Ticket redirected.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to redirect ticket");
    }
  };

  const setTicketStatus = async (id, status) => {
    try {
      setError("");
      const response = await queryService.manage(id, { status });
      setPayload((prev) => prev.map((q) => (q._id === id ? response.data.query : q)));
      setTicketActionMessage("Ticket status updated.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update ticket status");
    }
  };

  const replyToTicket = async (id) => {
    const reply = (ticketReplyDrafts[id] || "").trim();
    if (!reply) return;
    try {
      setError("");
      const response = await queryService.reply(id, reply);
      setPayload((prev) => prev.map((q) => (q._id === id ? response.data.query : q)));
      setTicketReplyDrafts((prev) => ({ ...prev, [id]: "" }));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reply");
    }
  };

  const patientReplyToTicket = async (id) => {
    const message = (patientReplyDrafts[id] || "").trim();
    if (!message) return;
    try {
      setError("");
      const response = await queryService.patientReply(id, message);
      setPayload((prev) => prev.map((q) => (q._id === id ? response.data.query : q)));
      setPatientReplyDrafts((prev) => ({ ...prev, [id]: "" }));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reply");
    }
  };

  // Shared conversation-thread renderer used across the patient, admin and staff ticket
  // views. Falls back to the legacy single message/reply pair for any ticket that
  // predates the messages[] thread.
  const renderTicketThread = (query) => {
    const messages =
      query.messages && query.messages.length > 0
        ? query.messages
        : [
            {
              _id: `${query._id}-legacy-message`,
              text: query.message,
              senderModel: "Patient",
              senderName: query.patientId?.name || query.patientId?.phone || "Patient",
              senderRole: "patient",
              createdAt: query.createdAt,
            },
            ...(query.reply
              ? [
                  {
                    _id: `${query._id}-legacy-reply`,
                    text: query.reply,
                    senderModel: "User",
                    senderName: query.repliedBy?.name || "Hospital",
                    senderRole: query.repliedBy?.role || "staff",
                    createdAt: query.repliedAt,
                  },
                ]
              : []),
          ];

    return (
      <div className="mt-3 space-y-3">
        {messages.map((msg) => {
          const isPatient = msg.senderModel === "Patient";
          const isMe =
            (msg.sender?._id || msg.sender) === user?._id || (msg.sender?._id || msg.sender) === user?.id;
          return (
            <div
              key={msg._id || `${msg.senderModel}-${msg.createdAt}`}
              className={`rounded-xl p-4 text-sm leading-relaxed ${
                isPatient ? "bg-mist text-ink" : "bg-navy text-white"
              } ${isMe ? "ring-2 ring-crimson/30" : ""}`}
            >
              <div
                className={`flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide ${
                  isPatient ? "text-slate-soft/80" : "text-white/70"
                }`}
              >
                <span>
                  {isPatient ? "Patient" : msg.senderName || "Hospital"}
                  {!isPatient && msg.senderRole ? ` · ${msg.senderRole}` : ""}
                </span>
                {msg.createdAt && (
                  <span className="font-normal normal-case">
                    {new Date(msg.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                )}
              </div>
              <div className="mt-1.5">{msg.text}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const saveDoctorSchedule = async () => {
    const doctor = doctors.find((d) => d._id === scheduleDoctorId);
    if (!doctor?.department) return;
    const departmentId = doctor.department._id || doctor.department;
    try {
      setScheduleSaving(true);
      setScheduleMessage("");
      await scheduleService.setForDoctor(scheduleDoctorId, departmentId, scheduleDayOfWeek, scheduleTimes);
      setScheduleMessage(`Saved. ${doctor.name} is now available on ${DAY_NAMES[scheduleDayOfWeek]} at: ${scheduleTimes.join(", ") || "no times"}.`);
    } catch (err) {
      setScheduleMessage(err.response?.data?.error || "Failed to save schedule");
    } finally {
      setScheduleSaving(false);
    }
  };

  // --- Doctor actions ---

  const updateDoctorAppointmentStatus = async (id, status) => {
    try {
      setError("");
      const response = await appointmentService.updateStatus(id, status);
      setPayload((prev) => prev.map((a) => (a._id === id ? response.data.appointment : a)));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update appointment");
    }
  };

  const updateRxMedicineLine = (index, field, value) => {
    setRxMedicines((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const addRxMedicineLine = () => {
    setRxMedicines((prev) => [...prev, { ...EMPTY_MEDICINE_LINE }]);
  };

  const removeRxMedicineLine = (index) => {
    setRxMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const submitPrescription = async (appt) => {
    const validLines = rxMedicines.filter((m) => m.name.trim());
    if (validLines.length === 0) {
      setRxStatus("Add at least one medicine.");
      return;
    }
    try {
      setRxStatus("Saving prescription...");
      await pharmacyService.createPrescription({
        appointmentId: appt._id,
        patientId: appt.patientId?._id,
        medicines: validLines.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          quantity: m.quantity ? Number(m.quantity) : undefined,
        })),
      });
      setRxStatus("Prescription saved.");
      setRxMedicines([{ ...EMPTY_MEDICINE_LINE }]);
      setRxAppointmentId(null);
    } catch (err) {
      setRxStatus(err.response?.data?.error || "Failed to save prescription");
    }
  };

  // --- Staff (nurse / accountant / receptionist) actions ---

  const submitLeaveApplication = async (e) => {
    e.preventDefault();
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason) {
      setLeaveApplyStatus("From date, to date, and reason are required.");
      return;
    }
    try {
      setLeaveApplyStatus("Submitting...");
      await leaveService.apply(leaveForm.fromDate, leaveForm.toDate, leaveForm.reason);
      setLeaveApplyStatus("Leave request submitted.");
      setLeaveForm({ fromDate: "", toDate: "", reason: "" });
    } catch (err) {
      setLeaveApplyStatus(err.response?.data?.error || "Failed to submit leave request");
    }
  };

  const runAppointmentLookup = async (e) => {
    e.preventDefault();
    if (!apptLookupValue.trim()) return;
    try {
      setApptLookupError("");
      setApptLookupSearched(true);
      const response = await appointmentService.getByCode(apptLookupValue.trim());
      setApptLookupResult(response.data);
    } catch (err) {
      setApptLookupResult(null);
      setApptLookupError(err.response?.data?.error || "No appointment found for that code");
    }
  };

  const updateApptLookupStatus = async (status) => {
    if (!apptLookupResult) return;
    try {
      setApptLookupError("");
      const response = await appointmentService.updateStatus(apptLookupResult._id, status);
      setApptLookupResult(response.data.appointment);
    } catch (err) {
      setApptLookupError(err.response?.data?.error || "Failed to update appointment");
    }
  };

  // --- Shared profile actions ---

  const submitProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      setProfileMessage("");
      const response = await staffService.updateMyProfile(profileForm);
      setProfileData(response.data.staff);
      setProfileMessage("Profile updated.");
    } catch (err) {
      setProfileMessage(err.response?.data?.error || "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  // --- Pharmacist actions ---

  const runLookup = async (e) => {
    e.preventDefault();
    if (!lookupValue.trim()) return;
    try {
      setError("");
      setLoading(true);
      setLookupSearched(true);
      const params = lookupType === "appointment" ? { appointmentCode: lookupValue.trim() } : { patientName: lookupValue.trim() };
      const response = await pharmacyService.getPrescriptions(params);
      setLookupResults(response.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Lookup failed");
      setLookupResults([]);
    } finally {
      setLoading(false);
    }
  };

  const updateLookupMedicineAvailability = async (prescriptionId, medicineIndex, availability) => {
    try {
      setError("");
      const medicineId = linkedMedicineChoice[`${prescriptionId}:${medicineIndex}`] || undefined;
      const response = await pharmacyService.updateMedicineAvailability(
        prescriptionId,
        medicineIndex,
        availability,
        medicineId
      );
      setLookupResults((prev) =>
        prev.map((p) => (p._id === prescriptionId ? response.data.prescription : p))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update availability");
    }
  };

  const getBatchDraft = (medicineId) =>
    batchDrafts[medicineId] || { batchNumber: "", quantity: "", price: "", expiryDate: "" };

  const setBatchDraft = (medicineId, field, value) => {
    setBatchDrafts((prev) => ({
      ...prev,
      [medicineId]: { ...getBatchDraft(medicineId), [field]: value },
    }));
  };

  const submitRestock = async (medicineId) => {
    const draft = getBatchDraft(medicineId);
    if (!draft.batchNumber || !draft.quantity || !draft.price || !draft.expiryDate) {
      setError("Batch number, quantity, price, and expiry date are all required to restock.");
      return;
    }
    try {
      setError("");
      const response = await pharmacyService.addBatch(medicineId, {
        batchNumber: draft.batchNumber,
        quantity: Number(draft.quantity),
        price: Number(draft.price),
        expiryDate: draft.expiryDate,
      });
      setPayload((prev) => prev.map((m) => (m._id === medicineId ? response.data.medicine : m)));
      setBatchDrafts((prev) => ({ ...prev, [medicineId]: { batchNumber: "", quantity: "", price: "", expiryDate: "" } }));
      setActionMessage("Batch added.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add batch");
    }
  };

  const deleteMedicineRow = async (id) => {
    try {
      setError("");
      await pharmacyService.deleteMedicine(id);
      setPayload((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete medicine");
    }
  };

  const submitAddMedicine = async (e) => {
    e.preventDefault();
    if (!addMedicineForm.name || !addMedicineForm.batchNumber || !addMedicineForm.quantity || !addMedicineForm.price || !addMedicineForm.expiryDate) {
      setError("Name, batch number, quantity, price, and expiry date are all required.");
      return;
    }
    try {
      setError("");
      setLoading(true);
      await pharmacyService.addMedicine({
        name: addMedicineForm.name,
        unit: addMedicineForm.unit,
        batchNumber: addMedicineForm.batchNumber,
        quantity: Number(addMedicineForm.quantity),
        price: Number(addMedicineForm.price),
        expiryDate: addMedicineForm.expiryDate,
      });
      setActionMessage(`${addMedicineForm.name} added to inventory.`);
      setAddMedicineForm({ name: "", unit: "tablets", batchNumber: "", quantity: "", price: "", expiryDate: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add medicine");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------
  // Receptionist actions
  // ---------------------------------------------------------------------

  const updateReceptionApptStatus = async (id, status) => {
    try {
      setError("");
      const response = await appointmentService.updateStatus(id, status);
      setReceptionAppointments((prev) => prev.map((a) => (a._id === id ? response.data.appointment : a)));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update appointment");
    }
  };

  const submitReassignDoctor = async (id) => {
    const doctorId = doctorReassignChoice[id];
    if (!doctorId) return;
    try {
      setError("");
      const response = await appointmentService.reassignDoctor(id, doctorId);
      setReceptionAppointments((prev) => prev.map((a) => (a._id === id ? response.data.appointment : a)));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reassign doctor");
    }
  };

  const runBillLookup = async (e) => {
    e.preventDefault();
    if (!billLookupCode.trim()) return;
    try {
      setBillLookupError("");
      setBillLookupSearched(true);
      setBillMedicineChoices({});
      const response = await billingService.getBillableItems(billLookupCode.trim());
      setBillLookupResult(response.data);
      const doctorFee = response.data?.appointment?.doctorId?.consultationFee;
      setBillConsultationFee(doctorFee !== undefined && doctorFee !== null ? String(doctorFee) : "");
      setBillApplicationFee("");
    } catch (err) {
      setBillLookupResult(null);
      setBillLookupError(err.response?.data?.error || "No appointment found for that code");
    }
  };

  const toggleBillMedicine = (index) => {
    setBillMedicineChoices((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const submitGenerateBill = async () => {
    if (!billLookupResult?.appointment) return;
    const medicines = billLookupResult.prescription?.medicines || [];
    const items = medicines
      .map((med, i) => ({ med, i }))
      .filter(({ med, i }) => med.availability === "available" && billMedicineChoices[i])
      .map(({ med }) => ({
        description: `${med.name}${med.dosage ? ` (${med.dosage})` : ""}`,
        quantity: med.quantity || 1,
        unitPrice: 0, // pharmacy doesn't currently store a per-medicine price on the prescription line
      }));

    try {
      setBillGenerateStatus("Generating bill...");
      const response = await billingService.create({
        appointmentId: billLookupResult.appointment._id,
        prescriptionId: billLookupResult.prescription?._id,
        items,
        consultationFee: billConsultationFee ? Number(billConsultationFee) : 0,
        applicationFee: items.length === 0 ? (billApplicationFee ? Number(billApplicationFee) : 0) : 0,
        paymentMethod: billPaymentMethod,
      });
      setBillGenerateStatus(`Bill ${response.data.bill.billNumber} generated for ₹${response.data.bill.totalAmount}.`);
      setBillLookupResult((prev) => ({ ...prev, alreadyBilled: true, bill: response.data.bill }));
    } catch (err) {
      setBillGenerateStatus(err.response?.data?.error || "Failed to generate bill");
    }
  };

  const markBillPaidAction = async (id, method) => {
    try {
      setError("");
      const response = await billingService.markPaid(id, method);
      setBillsList((prev) => prev.map((b) => (b._id === id ? response.data.bill : b)));
      if (billLookupResult?.bill?._id === id) {
        setBillLookupResult((prev) => ({ ...prev, bill: response.data.bill }));
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update bill");
    }
  };

  const submitOnBehalfTicket = async (e) => {
    e.preventDefault();
    const { patientPhone, subject, message } = onBehalfTicketForm;
    if (!patientPhone.trim() || !subject.trim() || !message.trim()) {
      setOnBehalfTicketStatus("Patient phone, subject, and message are all required.");
      return;
    }
    try {
      setOnBehalfTicketStatus("Submitting...");
      const response = await queryService.createOnBehalf(patientPhone.trim(), subject.trim(), message.trim());
      setOnBehalfTicketStatus(`Ticket ${response.data.query.ticketId} raised for this patient.`);
      setOnBehalfTicketForm({ patientPhone: "", subject: "", message: "" });
    } catch (err) {
      setOnBehalfTicketStatus(err.response?.data?.error || "Failed to raise ticket");
    }
  };

  // ---------------------------------------------------------------------
  // Accountant actions
  // ---------------------------------------------------------------------

  const markSalaryPaidAction = async (id) => {
    try {
      setError("");
      const response = await financeService.markSalaryPaid(id);
      setSalarySlips((prev) => prev.map((s) => (s._id === id ? response.data.slip : s)));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update salary slip");
    }
  };

  const submitSalarySlip = async (e) => {
    e.preventDefault();
    if (!salaryForm.staffId || !salaryForm.basicSalary) {
      setSalaryFormStatus("Staff member and basic salary are required.");
      return;
    }
    try {
      setSalaryFormStatus("Generating...");
      const response = await financeService.createSalarySlip({
        staffId: salaryForm.staffId,
        month: Number(salaryForm.month),
        year: Number(salaryForm.year),
        basicSalary: Number(salaryForm.basicSalary),
        bonus: salaryForm.bonus ? Number(salaryForm.bonus) : 0,
        deductions: salaryForm.deductions ? Number(salaryForm.deductions) : 0,
        notes: salaryForm.notes || undefined,
      });
      setSalarySlips((prev) => [response.data.slip, ...prev]);
      setSalaryFormStatus("Salary slip generated.");
      setSalaryForm((prev) => ({ ...prev, basicSalary: "", bonus: "", deductions: "", notes: "" }));
    } catch (err) {
      setSalaryFormStatus(err.response?.data?.error || "Failed to generate salary slip");
    }
  };

  // ---------------------------------------------------------------------
  // Clinical / EMR actions (doctor)
  // ---------------------------------------------------------------------

  const runClinicalLookup = async (e) => {
    e.preventDefault();
    if (!clinicalLookupCode.trim()) return;
    try {
      setClinicalLookupError("");
      setClinicalLookupSearched(true);
      setEncounterForm(EMPTY_ENCOUNTER_FORM);
      setEncounterSaveStatus("");
      const apptResponse = await appointmentService.getByCode(clinicalLookupCode.trim());
      const encResponse = await encounterService.getForAppointment(apptResponse.data._id);
      setClinicalLookupResult({ appointment: apptResponse.data, encounters: encResponse.data || [] });
    } catch (err) {
      setClinicalLookupResult(null);
      setClinicalLookupError(err.response?.data?.error || "No appointment found for that ID");
    }
  };

  const submitEncounter = async () => {
    if (!clinicalLookupResult?.appointment) return;
    const diagnosis = encounterForm.diagnosisText
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((description) => ({ description }));

    try {
      setEncounterSaveStatus("Saving...");
      const response = await encounterService.create({
        appointmentId: clinicalLookupResult.appointment._id,
        vitals: {
          temperatureF: encounterForm.temperatureF ? Number(encounterForm.temperatureF) : undefined,
          bloodPressure: encounterForm.bloodPressure || undefined,
          pulseBpm: encounterForm.pulseBpm ? Number(encounterForm.pulseBpm) : undefined,
          respiratoryRate: encounterForm.respiratoryRate ? Number(encounterForm.respiratoryRate) : undefined,
          spo2: encounterForm.spo2 ? Number(encounterForm.spo2) : undefined,
          weightKg: encounterForm.weightKg ? Number(encounterForm.weightKg) : undefined,
          heightCm: encounterForm.heightCm ? Number(encounterForm.heightCm) : undefined,
        },
        chiefComplaint: encounterForm.chiefComplaint,
        diagnosis,
        clinicalNotes: encounterForm.clinicalNotes,
        followUpDate: encounterForm.followUpDate || undefined,
      });
      setClinicalLookupResult((prev) => ({
        ...prev,
        encounters: [response.data.encounter, ...(prev.encounters || [])],
      }));
      setEncounterForm(EMPTY_ENCOUNTER_FORM);
      setEncounterSaveStatus("Encounter recorded.");
    } catch (err) {
      setEncounterSaveStatus(err.response?.data?.error || "Failed to record encounter");
    }
  };

  // ---------------------------------------------------------------------
  // IPD actions (doctor / nurse / receptionist)
  // ---------------------------------------------------------------------

  const submitAdmitPatient = async (e) => {
    e.preventDefault();
    const { patientPhone, wardId, bedId, admittingDoctorId, reasonForAdmission, diagnosis } = admitForm;
    if (!patientPhone.trim() || !wardId || !bedId || !admittingDoctorId || !reasonForAdmission.trim()) {
      setAdmitStatus("Patient phone, ward, bed, doctor, and reason are all required.");
      return;
    }
    try {
      setAdmitStatus("Admitting...");
      const patientLookup = await patientService.findByPhone(patientPhone.trim());
      const patientId = patientLookup?.data?._id;
      if (!patientId) {
        setAdmitStatus("Could not find a patient with that phone number.");
        return;
      }
      const response = await ipdService.admit({
        patientId,
        wardId,
        bedId,
        admittingDoctorId,
        reasonForAdmission: reasonForAdmission.trim(),
        diagnosis: diagnosis.trim() || undefined,
      });
      setAdmissions((prev) => [response.data.admission, ...prev]);
      setWards((prev) =>
        prev.map((w) => (w._id === wardId ? { ...w, beds: w.beds.map((b) => (b._id === bedId ? { ...b, status: "occupied" } : b)) } : w))
      );
      setAdmitStatus(`Patient admitted to bed ${response.data.admission.wardId?.name || ""}.`);
      setAdmitForm({ patientPhone: "", wardId: "", bedId: "", admittingDoctorId: "", reasonForAdmission: "", diagnosis: "" });
    } catch (err) {
      setAdmitStatus(err.response?.data?.error || "Failed to admit patient");
    }
  };

  const submitTransferBed = async (admissionId) => {
    const choice = transferChoice[admissionId];
    if (!choice?.wardId || !choice?.bedId) return;
    try {
      setIpdActionStatus("");
      const response = await ipdService.transfer(admissionId, { toWardId: choice.wardId, toBedId: choice.bedId });
      setAdmissions((prev) => prev.map((a) => (a._id === admissionId ? response.data.admission : a)));
      setIpdActionStatus("Patient transferred.");
    } catch (err) {
      setIpdActionStatus(err.response?.data?.error || "Failed to transfer patient");
    }
  };

  const submitDischarge = async (admissionId) => {
    const draft = dischargeDrafts[admissionId] || {};
    if (!draft.summary?.trim()) {
      setIpdActionStatus("A discharge summary is required.");
      return;
    }
    try {
      const response = await ipdService.discharge(admissionId, {
        summary: draft.summary.trim(),
        followUpInstructions: draft.followUpInstructions?.trim() || "",
      });
      setAdmissions((prev) => prev.map((a) => (a._id === admissionId ? response.data.admission : a)));
      setIpdActionStatus("Patient discharged.");
    } catch (err) {
      setIpdActionStatus(err.response?.data?.error || "Failed to discharge patient");
    }
  };

  const submitIpdBill = async (admissionId) => {
    const draft = ipdBillDrafts[admissionId] || {};
    try {
      setIpdActionStatus("Generating bill...");
      const response = await ipdService.createBill(admissionId, {
        consultationFee: draft.consultationFee ? Number(draft.consultationFee) : 0,
        otherCharges: draft.otherCharges ? Number(draft.otherCharges) : 0,
        paymentMethod: draft.paymentMethod || "cash",
      });
      setIpdActionStatus(`Bill ${response.data.bill.billNumber} generated for ₹${response.data.bill.totalAmount}.`);
    } catch (err) {
      setIpdActionStatus(err.response?.data?.error || "Failed to generate IPD bill");
    }
  };

  // ---------------------------------------------------------------------
  // Shared IPD workspace (adapts action buttons to the calling role)
  // ---------------------------------------------------------------------

  const renderIpdWorkspace = (role) => {
    const allBeds = wards.flatMap((w) => w.beds.map((b) => ({ ...b, wardId: w._id, wardName: w.name })));
    const vacantByWard = (wardId) => wards.find((w) => w._id === wardId)?.beds.filter((b) => b.status === "vacant") || [];

    return (
      <div className="space-y-8">
        {ipdActionStatus && (
          <div className="rounded-2xl border border-mist bg-white p-4 text-sm font-medium text-ink shadow-sm">{ipdActionStatus}</div>
        )}

        {/* Ward & bed occupancy overview */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mb-3">Wards & beds</div>
          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : wards.length === 0 ? (
            <EmptyRow>No wards have been set up yet.</EmptyRow>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {wards.map((w) => (
                <DataCard key={w._id} title={w.name} subtitle={`${w.type} · Floor ${w.floor || "—"}`}>
                  <div className="flex flex-wrap gap-2">
                    {w.beds.map((b) => (
                      <span
                        key={b._id}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          b.status === "vacant"
                            ? "bg-emerald-50 text-emerald-700"
                            : b.status === "occupied"
                            ? "bg-red-50 text-red-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {b.bedNumber} · {b.status}
                      </span>
                    ))}
                  </div>
                </DataCard>
              ))}
            </div>
          )}
        </div>

        {/* Admit new patient (doctor + receptionist only) */}
        {(role === "doctor" || role === "receptionist") && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mb-3">Admit a patient</div>
            {admitStatus && <div className="mb-3 text-sm font-medium text-ink">{admitStatus}</div>}
            <form onSubmit={submitAdmitPatient} className="space-y-4 rounded-2xl border border-mist bg-white p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Patient phone number</span>
                  <input
                    type="text"
                    value={admitForm.patientPhone}
                    onChange={(e) => setAdmitForm((prev) => ({ ...prev, patientPhone: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Admitting doctor</span>
                  <select
                    value={admitForm.admittingDoctorId}
                    onChange={(e) => setAdmitForm((prev) => ({ ...prev, admittingDoctorId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                  >
                    <option value="">Choose doctor...</option>
                    {doctors.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Ward</span>
                  <select
                    value={admitForm.wardId}
                    onChange={(e) => setAdmitForm((prev) => ({ ...prev, wardId: e.target.value, bedId: "" }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                  >
                    <option value="">Choose ward...</option>
                    {wards.map((w) => (
                      <option key={w._id} value={w._id}>{w.name}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Bed</span>
                  <select
                    value={admitForm.bedId}
                    onChange={(e) => setAdmitForm((prev) => ({ ...prev, bedId: e.target.value }))}
                    disabled={!admitForm.wardId}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Choose vacant bed...</option>
                    {vacantByWard(admitForm.wardId).map((b) => (
                      <option key={b._id} value={b._id}>{b.bedNumber} (₹{b.dailyCharge}/day)</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="space-y-2 block">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Reason for admission</span>
                <input
                  type="text"
                  value={admitForm.reasonForAdmission}
                  onChange={(e) => setAdmitForm((prev) => ({ ...prev, reasonForAdmission: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                />
              </label>
              <label className="space-y-2 block">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Diagnosis (optional)</span>
                <input
                  type="text"
                  value={admitForm.diagnosis}
                  onChange={(e) => setAdmitForm((prev) => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                />
              </label>
              <button type="submit" className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
                Admit patient
              </button>
            </form>
          </div>
        )}

        {/* Admissions list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Admissions</span>
            <select
              value={admissionStatusFilter}
              onChange={(e) => setAdmissionStatusFilter(e.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs focus:border-crimson/50 focus:outline-none"
            >
              <option value="admitted">Currently admitted</option>
              <option value="discharged">Discharged</option>
              <option value="">All</option>
            </select>
          </div>

          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : admissions.length === 0 ? (
            <EmptyRow>No admissions match this filter.</EmptyRow>
          ) : (
            <div className="space-y-4">
              {admissions.map((a) => (
                <DataCard
                  key={a._id}
                  title={a.patientId?.name || a.patientId?.phone || "Unknown patient"}
                  subtitle={`${a.wardId?.name || "—"} · Dr. ${a.admittingDoctorId?.name || "—"}`}
                  badge={<StatusBadge status={a.status} tone={statusTone(a.status)} />}
                >
                  <DataGrid
                    fields={[
                      { label: "Reason", value: a.reasonForAdmission },
                      { label: "Diagnosis", value: a.diagnosis || "—" },
                      { label: "Admitted", value: new Date(a.admissionDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) },
                      ...(a.dischargeDate ? [{ label: "Discharged", value: new Date(a.dischargeDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) }] : []),
                    ]}
                  />

                  {a.status === "admitted" && (role === "nurse" || role === "doctor") && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 pt-4 border-t border-mist">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mr-1">Transfer to</span>
                      <select
                        value={transferChoice[a._id]?.wardId || ""}
                        onChange={(e) =>
                          setTransferChoice((prev) => ({ ...prev, [a._id]: { wardId: e.target.value, bedId: "" } }))
                        }
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none"
                      >
                        <option value="">Ward...</option>
                        {wards.map((w) => (
                          <option key={w._id} value={w._id}>{w.name}</option>
                        ))}
                      </select>
                      <select
                        value={transferChoice[a._id]?.bedId || ""}
                        onChange={(e) =>
                          setTransferChoice((prev) => ({ ...prev, [a._id]: { ...prev[a._id], bedId: e.target.value } }))
                        }
                        disabled={!transferChoice[a._id]?.wardId}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none disabled:opacity-50"
                      >
                        <option value="">Bed...</option>
                        {vacantByWard(transferChoice[a._id]?.wardId).map((b) => (
                          <option key={b._id} value={b._id}>{b.bedNumber}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => submitTransferBed(a._id)}
                        disabled={!transferChoice[a._id]?.bedId}
                        className="rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-light disabled:opacity-50 transition-colors"
                      >
                        Transfer
                      </button>
                    </div>
                  )}

                  {a.status === "admitted" && role === "doctor" && (
                    <div className="mt-4 space-y-3 pt-4 border-t border-mist">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Discharge</span>
                      <textarea
                        placeholder="Discharge summary"
                        value={dischargeDrafts[a._id]?.summary || ""}
                        onChange={(e) =>
                          setDischargeDrafts((prev) => ({ ...prev, [a._id]: { ...prev[a._id], summary: e.target.value } }))
                        }
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                      />
                      <textarea
                        placeholder="Follow-up instructions (optional)"
                        value={dischargeDrafts[a._id]?.followUpInstructions || ""}
                        onChange={(e) =>
                          setDischargeDrafts((prev) => ({ ...prev, [a._id]: { ...prev[a._id], followUpInstructions: e.target.value } }))
                        }
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                      />
                      <button
                        onClick={() => submitDischarge(a._id)}
                        className="rounded-full bg-crimson px-5 py-2 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors"
                      >
                        Discharge patient
                      </button>
                    </div>
                  )}

                  {a.status === "discharged" && role === "receptionist" && (
                    <div className="mt-4 space-y-3 pt-4 border-t border-mist">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Generate stay bill</span>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <input
                          type="number"
                          placeholder="Consultation fee"
                          value={ipdBillDrafts[a._id]?.consultationFee || ""}
                          onChange={(e) =>
                            setIpdBillDrafts((prev) => ({ ...prev, [a._id]: { ...prev[a._id], consultationFee: e.target.value } }))
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Other charges"
                          value={ipdBillDrafts[a._id]?.otherCharges || ""}
                          onChange={(e) =>
                            setIpdBillDrafts((prev) => ({ ...prev, [a._id]: { ...prev[a._id], otherCharges: e.target.value } }))
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                        />
                        <select
                          value={ipdBillDrafts[a._id]?.paymentMethod || "cash"}
                          onChange={(e) =>
                            setIpdBillDrafts((prev) => ({ ...prev, [a._id]: { ...prev[a._id], paymentMethod: e.target.value } }))
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                        >
                          {["cash", "card", "upi", "other"].map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => submitIpdBill(a._id)}
                        className="rounded-full bg-crimson px-5 py-2 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors"
                      >
                        Generate bill
                      </button>
                    </div>
                  )}
                </DataCard>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------
  // Renderers
  // ---------------------------------------------------------------------

  const renderPatientContent = () => {
    if (loading) {
      return <div className="text-gray-600">Loading...</div>;
    }

    if (error) {
      return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
    }

    if (section === "appointments") {
      if (!payload || payload.length === 0) {
        return <EmptyRow>No appointments found. Book one from the Book Appointment tab.</EmptyRow>;
      }

      const canCancel = (appt) => appt.status === "booked";

      return (
        <div className="space-y-4">
          <div className="text-sm text-slate-soft">{payload.length} appointment{payload.length !== 1 ? "s" : ""}</div>
          {payload.map((appt) => {
            const draft = cancelDrafts[appt._id] || { reason: "", note: "" };
            const isCancelling = openCancelId === appt._id;
            return (
              <DataCard
                key={appt._id}
                title={appt.doctorId?.name || "Unknown doctor"}
                subtitle={appt.appointmentCode}
                badge={<StatusBadge status={appt.status} tone={statusTone(appt.status)} />}
                actions={
                  canCancel(appt) && (
                    <button
                      onClick={() => setOpenCancelId(isCancelling ? null : appt._id)}
                      className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                    >
                      {isCancelling ? "Never mind" : "Cancel appointment"}
                    </button>
                  )
                }
              >
                <DataGrid
                  fields={[
                    { label: "Appointment ID", value: appt.appointmentCode || "—" },
                    { label: "Slot", value: new Date(appt.slotTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) },
                    { label: "Department", value: appt.department?.name },
                    { label: "Doctor", value: appt.doctorId?.name },
                  ]}
                />
                {appt.status === "cancelled" && appt.cancelReason && (
                  <div className="mt-4 pt-4 border-t border-mist text-sm text-slate-600">
                    <span className="text-slate-500">Cancelled — reason:</span>{" "}
                    <span className="font-medium text-ink">{appt.cancelReason}</span>
                    {appt.cancelNote && <span className="text-slate-500"> · {appt.cancelNote}</span>}
                  </div>
                )}
                {isCancelling && (
                  <div className="mt-4 space-y-3 pt-4 border-t border-mist">
                    <label className="space-y-2 block">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Reason for cancelling</span>
                      <select
                        value={draft.reason}
                        onChange={(e) =>
                          setCancelDrafts((prev) => ({ ...prev, [appt._id]: { ...draft, reason: e.target.value } }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                      >
                        <option value="">Select a reason</option>
                        {cancelReasons.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </label>
                    <textarea
                      value={draft.note}
                      onChange={(e) =>
                        setCancelDrafts((prev) => ({ ...prev, [appt._id]: { ...draft, note: e.target.value } }))
                      }
                      rows={2}
                      placeholder="Anything else you'd like us to know? (optional)"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                    />
                    <button
                      onClick={() => cancelMyAppointment(appt._id)}
                      disabled={!draft.reason}
                      className="rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                    >
                      Confirm cancellation
                    </button>
                  </div>
                )}
              </DataCard>
            );
          })}
        </div>
      );
    }

    if (section === "queue") {
      if (!payload) {
        return <EmptyRow>You are not currently in a queue. Join one through the Book Appointment tab.</EmptyRow>;
      }

      return (
        <div className="rounded-2xl border border-mist bg-white p-8 shadow-sm max-w-md">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Your current token</div>
          <div className="mt-3 text-5xl font-display font-semibold text-navy">{payload.token || "—"}</div>
          <div className="mt-6 pt-6 border-t border-mist">
            <DataGrid
              fields={[
                { label: "Department", value: payload.department?.name || "N/A" },
                { label: "Status", value: <StatusBadge status={payload.status || "Waiting"} tone={statusTone(payload.status)} /> },
              ]}
            />
          </div>
        </div>
      );
    }

    if (section === "prescriptions") {
      if (!payload || payload.length === 0) {
        return <EmptyRow>No prescriptions available yet. They will appear here after a doctor visit.</EmptyRow>;
      }

      return (
        <div className="space-y-4">
          <div className="text-sm text-slate-soft">{payload.length} prescription{payload.length !== 1 ? "s" : ""}</div>
          {payload.map((prescription) => (
            <DataCard
              key={prescription._id}
              title={prescription.doctorId?.name || "Unknown doctor"}
              subtitle={`Issued ${new Date(prescription.createdAt).toLocaleDateString([], { dateStyle: "medium" })}`}
              actions={
                <button
                  onClick={() => downloadPrescriptionPdf(prescription, user)}
                  className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-light transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </button>
              }
            >
              <div className="space-y-2.5">
                {prescription.medicines?.map((med, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-xl bg-mist px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-sm truncate">{med.name}</div>
                      <div className="text-xs text-slate-soft mt-0.5">
                        {med.dosage || "Follow doctor's instructions"}{med.quantity ? ` · qty ${med.quantity}` : ""}
                      </div>
                    </div>
                    <StatusBadge status={med.availability || "pending"} tone={statusTone(med.availability)} />
                  </div>
                ))}
              </div>
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "medical-records") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (!myEncounters || myEncounters.length === 0) {
        return <EmptyRow>No clinical records yet. They'll appear here after a doctor records vitals or a diagnosis during a visit.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          {myEncounters.map((enc) => (
            <DataCard
              key={enc._id}
              title={new Date(enc.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              subtitle={`Dr. ${enc.doctorId?.name || "Unknown"} · ${enc.type === "ipd" ? "Inpatient" : "Outpatient"}`}
            >
              <div className="space-y-3">
                {enc.chiefComplaint && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Chief complaint</div>
                    <div className="mt-1 text-sm text-ink">{enc.chiefComplaint}</div>
                  </div>
                )}
                {enc.diagnosis?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Diagnosis</div>
                    <div className="mt-1 text-sm text-ink">{enc.diagnosis.map((d) => d.description).join(", ")}</div>
                  </div>
                )}
                {enc.vitals && Object.values(enc.vitals).some(Boolean) && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Vitals</div>
                    <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-ink">
                      {enc.vitals.temperatureF && <div>Temp: {enc.vitals.temperatureF}°F</div>}
                      {enc.vitals.bloodPressure && <div>BP: {enc.vitals.bloodPressure}</div>}
                      {enc.vitals.pulseBpm && <div>Pulse: {enc.vitals.pulseBpm} bpm</div>}
                      {enc.vitals.spo2 && <div>SpO2: {enc.vitals.spo2}%</div>}
                      {enc.vitals.weightKg && <div>Weight: {enc.vitals.weightKg} kg</div>}
                      {enc.vitals.heightCm && <div>Height: {enc.vitals.heightCm} cm</div>}
                    </div>
                  </div>
                )}
                {enc.clinicalNotes && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Notes</div>
                    <div className="mt-1 text-sm text-slate-soft">{enc.clinicalNotes}</div>
                  </div>
                )}
              </div>
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "queries") {
      return (
        <div className="space-y-6">
          <DataCard title="Raise a new ticket">
            <form
              onSubmit={submitNewTicket}
              className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] items-end"
            >
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Subject</span>
                <input
                  type="text"
                  value={newTicketForm.subject}
                  onChange={(e) => setNewTicketForm((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g. Billing question"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Message</span>
                <input
                  type="text"
                  value={newTicketForm.message}
                  onChange={(e) => setNewTicketForm((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Describe your query"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                />
              </label>
              <button
                type="submit"
                className="rounded-full bg-crimson px-5 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors"
              >
                Submit
              </button>
            </form>
            {newTicketStatus && <div className="mt-3 text-sm font-medium text-emerald-600">{newTicketStatus}</div>}
          </DataCard>

          {!payload || payload.length === 0 ? (
            <EmptyRow>You haven't raised any tickets yet.</EmptyRow>
          ) : (
            <div className="space-y-4">
              {payload.map((query) => (
                <DataCard
                  key={query._id}
                  title={query.subject}
                  subtitle={`Ticket ${query.ticketId}`}
                  badge={<StatusBadge status={query.status} tone={statusTone(query.status)} />}
                >
                  {query.assignedToId?.name && (
                    <div className="mb-3 text-xs text-slate-soft">
                      Being handled by <span className="font-semibold text-ink">{query.assignedToId.name}</span>
                      {query.assignedToId.role ? ` (${query.assignedToId.role})` : ""}
                    </div>
                  )}
                  {renderTicketThread(query)}
                  {query.status === "closed" ? (
                    <div className="mt-3 text-xs text-slate-soft">This ticket is closed.</div>
                  ) : (
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end pt-4 border-t border-mist">
                      <input
                        type="text"
                        value={patientReplyDrafts[query._id] || ""}
                        onChange={(e) =>
                          setPatientReplyDrafts((prev) => ({ ...prev, [query._id]: e.target.value }))
                        }
                        placeholder="Write a reply..."
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                      />
                      <button
                        type="button"
                        onClick={() => patientReplyToTicket(query._id)}
                        disabled={!(patientReplyDrafts[query._id] || "").trim()}
                        className="rounded-full bg-crimson px-5 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors disabled:opacity-40"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </DataCard>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (section === "profile") {
      if (!patientProfile) return <div className="text-gray-600">Loading...</div>;
      return (
        <div className="max-w-xl space-y-6">
          {patientProfileMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{patientProfileMessage}</div>
          )}
          <form onSubmit={submitPatientProfileUpdate} className="space-y-4 rounded-2xl border border-mist bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Name</span>
                <input
                  type="text"
                  required
                  value={patientProfileForm.name}
                  onChange={(e) => setPatientProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Age</span>
                <input
                  type="number"
                  value={patientProfileForm.age}
                  onChange={(e) => setPatientProfileForm((prev) => ({ ...prev, age: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Gender</span>
                <select
                  value={patientProfileForm.gender}
                  onChange={(e) => setPatientProfileForm((prev) => ({ ...prev, gender: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Email</span>
                <input
                  type="email"
                  value={patientProfileForm.email}
                  onChange={(e) => setPatientProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={patientProfileSaving}
              className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {patientProfileSaving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>
      );
    }

    if (section === "book") {
      return (
        <div className="space-y-6">
          <DataCard title="Find a slot" subtitle="You don't choose a doctor — HeartStone assigns you whichever doctor is available for that department and time.">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Department</span>
                <select
                  value={selectedDepartment}
                  onChange={(e) => {
                    setSelectedDepartment(e.target.value);
                    setSlots([]);
                    setBookingStatus("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Visit date</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSlots([]);
                    setBookingStatus("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4 pt-5 border-t border-mist">
              <button
                type="button"
                onClick={fetchSlots}
                disabled={!selectedDepartment || !selectedDate}
                className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
              >
                Find available slots
              </button>
              {bookingStatus && <div className="text-sm font-medium text-emerald-600">{bookingStatus}</div>}
            </div>
          </DataCard>

          {slots.length > 0 ? (
            <div>
              <div className="text-sm text-slate-soft mb-3">{slots.length} slot{slots.length !== 1 ? "s" : ""} available</div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => bookAppointment(slot.time)}
                    className="rounded-xl border border-mist bg-white p-4 text-left hover:border-crimson/40 hover:shadow-md transition-all duration-150"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Available slot</div>
                    <div className="mt-1.5 text-lg font-semibold text-ink">{slot.time}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            selectedDepartment && selectedDate && !loading && (
              <EmptyRow>No slots available for the selected department and date.</EmptyRow>
            )
          )}
        </div>
      );
    }

    return (
      <EmptyState
        title={current.label}
        description={current.desc}
        accent={config.accent === "crimson" ? "crimson" : "navy"}
      />
    );
  };

  const renderAdminContent = () => {
    if (section === "staff") {
      return (
        <div className="space-y-6">
          <SectionToolbar>
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Filter by role</span>
              <select
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
              >
                <option value="">All roles</option>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </label>
            {actionMessage && <div className="text-sm font-medium text-emerald-600">{actionMessage}</div>}
          </SectionToolbar>

          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
          ) : staffList.length === 0 ? (
            <EmptyRow>No staff members found. Add one from the Add staff tab.</EmptyRow>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-slate-soft">{staffList.length} staff member{staffList.length !== 1 ? "s" : ""}</div>
              {staffList.map((s) => (
                <DataCard
                  key={s._id}
                  title={s.name}
                  subtitle={`@${s.username}`}
                  badge={<StatusBadge status={s.role} tone="info" />}
                  actions={
                    <button
                      onClick={() => deactivateStaff(s._id)}
                      className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                    >
                      Deactivate
                    </button>
                  }
                >
                  <DataGrid
                    fields={[
                      { label: "Department", value: s.department?.name || "—" },
                      { label: "Contact", value: s.contactNumber || s.email || "—" },
                      { label: "Shift", value: s.shiftTiming ? s.shiftTiming.charAt(0).toUpperCase() + s.shiftTiming.slice(1) : "—" },
                      { label: "Joined", value: s.joiningDate ? new Date(s.joiningDate).toLocaleDateString() : "—" },
                    ]}
                  />
                </DataCard>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (section === "add-staff") {
      return (
        <div className="max-w-3xl space-y-6">
          {newStaffResult && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">
              <div className="font-semibold">Staff member added successfully</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div><span className="text-emerald-600">Username:</span> <strong>{newStaffResult.user.username}</strong></div>
                <div><span className="text-emerald-600">Temp password:</span> <strong>{newStaffResult.user.tempPassword}</strong></div>
              </div>
              <div className="mt-3 text-xs text-emerald-700">{newStaffResult.warning}</div>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={submitAddStaff} className="space-y-6 rounded-2xl border border-mist bg-white p-6 shadow-sm">
            <div>
              <div className="text-sm font-semibold text-ink mb-3">Basic details</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Full name *</span>
                  <input
                    type="text"
                    value={staffForm.name}
                    onChange={(e) => handleStaffFormChange("name", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Role *</span>
                  <select
                    value={staffForm.role}
                    onChange={(e) => handleStaffFormChange("role", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Contact number * <span className="text-slate-400">(used to generate username)</span></span>
                  <input
                    type="text"
                    value={staffForm.contactNumber}
                    onChange={(e) => handleStaffFormChange("contactNumber", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="e.g. +91-9876543210"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Email</span>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => handleStaffFormChange("email", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Date of birth</span>
                  <input
                    type="date"
                    value={staffForm.dateOfBirth}
                    onChange={(e) => handleStaffFormChange("dateOfBirth", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Gender</span>
                  <select
                    value={staffForm.gender}
                    onChange={(e) => handleStaffFormChange("gender", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Blood group</span>
                  <input
                    type="text"
                    value={staffForm.bloodGroup}
                    onChange={(e) => handleStaffFormChange("bloodGroup", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="e.g. O+"
                  />
                </label>
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm text-slate-600">Address</span>
                  <input
                    type="text"
                    value={staffForm.address}
                    onChange={(e) => handleStaffFormChange("address", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-mist pt-4">
              <div className="text-sm font-semibold text-ink mb-3">Emergency contact</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Name</span>
                  <input
                    type="text"
                    value={staffForm.emergencyContactName}
                    onChange={(e) => handleStaffFormChange("emergencyContactName", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Number</span>
                  <input
                    type="text"
                    value={staffForm.emergencyContactNumber}
                    onChange={(e) => handleStaffFormChange("emergencyContactNumber", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-mist pt-4">
              <div className="text-sm font-semibold text-ink mb-3">Employment details</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Qualification</span>
                  <input
                    type="text"
                    value={staffForm.qualification}
                    onChange={(e) => handleStaffFormChange("qualification", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="e.g. B.Sc Nursing"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Experience (years)</span>
                  <input
                    type="number"
                    min="0"
                    value={staffForm.experienceYears}
                    onChange={(e) => handleStaffFormChange("experienceYears", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Joining date</span>
                  <input
                    type="date"
                    value={staffForm.joiningDate}
                    onChange={(e) => handleStaffFormChange("joiningDate", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Shift timing</span>
                  <select
                    value={staffForm.shiftTiming}
                    onChange={(e) => handleStaffFormChange("shiftTiming", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                    <option value="rotational">Rotational</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Government ID / proof number</span>
                  <input
                    type="text"
                    value={staffForm.employeeIdProof}
                    onChange={(e) => handleStaffFormChange("employeeIdProof", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="e.g. Aadhar number"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Monthly salary</span>
                  <input
                    type="number"
                    min="0"
                    value={staffForm.salary}
                    onChange={(e) => handleStaffFormChange("salary", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
              </div>
            </div>

            {staffForm.role === "doctor" && (
              <div className="border-t border-mist pt-4">
                <div className="text-sm font-semibold text-ink mb-3">Doctor-specific details</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm text-slate-600">Designation</span>
                    <input
                      type="text"
                      value={staffForm.designation}
                      onChange={(e) => handleStaffFormChange("designation", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-600">Degree</span>
                    <input
                      type="text"
                      value={staffForm.degree}
                      onChange={(e) => handleStaffFormChange("degree", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-600">Registration number</span>
                    <input
                      type="text"
                      value={staffForm.registrationNo}
                      onChange={(e) => handleStaffFormChange("registrationNo", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-600">Department</span>
                    <select
                      value={staffForm.departmentId}
                      onChange={(e) => handleStaffFormChange("departmentId", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      <option value="">Select department</option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>{dept.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-600">Consultation fee</span>
                    <input
                      type="number"
                      value={staffForm.consultationFee}
                      onChange={(e) => handleStaffFormChange("consultationFee", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    />
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Adding..." : "Add staff member"}
            </button>
          </form>
        </div>
      );
    }

    if (section === "departments") {
      return (
        <div className="space-y-6">
          <form onSubmit={createDepartment} className="flex flex-wrap items-end gap-3">
            <label className="space-y-2">
              <span className="text-sm text-slate-600">New department name</span>
              <input
                type="text"
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                className="w-64 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                placeholder="e.g. Orthopedics"
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-light"
            >
              Create department
            </button>
          </form>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : departments.length === 0 ? (
            <p className="text-gray-600">No departments yet. Create one above.</p>
          ) : (
            <div className="space-y-4">
              {departments.map((dept) => {
                const assignedIds = new Set((dept.doctors || []).map((d) => d._id));
                const unassignedDoctors = doctors.filter((d) => !assignedIds.has(d._id));
                return (
                  <div key={dept._id} className="rounded-2xl border border-mist bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="font-semibold text-ink text-lg">{dept.name}</div>
                      <div className="flex items-center gap-2">
                        <select
                          value={assignDoctorChoice[dept._id] || ""}
                          onChange={(e) =>
                            setAssignDoctorChoice((prev) => ({ ...prev, [dept._id]: e.target.value }))
                          }
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Assign doctor...</option>
                          {unassignedDoctors.map((d) => (
                            <option key={d._id} value={d._id}>{d.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => assignDoctor(dept._id)}
                          className="rounded-2xl bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-light"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(dept.doctors || []).length === 0 ? (
                        <span className="text-sm text-slate-500">No doctors assigned yet.</span>
                      ) : (
                        dept.doctors.map((doc) => (
                          <span key={doc._id} className="inline-flex items-center gap-2 rounded-full bg-mist px-3 py-1.5 text-xs text-ink">
                            {doc.name}
                            <button
                              onClick={() => removeDoctor(dept._id, doc._id)}
                              className="text-slate-400 hover:text-red-600"
                              title="Remove"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (section === "leave-requests") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (leaveRequests.length === 0) {
        return <EmptyRow>No pending leave requests right now.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          {leaveRequests.map((lr) => (
            <DataCard
              key={lr._id}
              title={lr.staffId?.name || "Unknown"}
              subtitle={lr.staffId?.role ? lr.staffId.role.charAt(0).toUpperCase() + lr.staffId.role.slice(1) : undefined}
              actions={
                <div className="flex gap-2">
                  <button
                    onClick={() => reviewLeave(lr._id, "approve")}
                    className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reviewLeave(lr._id, "reject")}
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              }
            >
              <DataGrid
                fields={[
                  { label: "From", value: new Date(lr.fromDate).toLocaleDateString() },
                  { label: "To", value: new Date(lr.toDate).toLocaleDateString() },
                  { label: "Reason", value: lr.reason },
                ]}
              />
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "appointments") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (allAppointments.length === 0) {
        return <EmptyRow>No appointments booked yet.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          <div className="text-sm text-slate-soft">{allAppointments.length} appointment{allAppointments.length !== 1 ? "s" : ""}</div>
          {allAppointments.map((appt) => {
            const draft = cancelDrafts[appt._id] || { reason: "", note: "" };
            const isCancelling = openCancelId === appt._id;
            return (
              <DataCard
                key={appt._id}
                title={appt.patientId?.name || appt.patientId?.phone || "Unknown patient"}
                subtitle={appt.appointmentCode ? `${appt.appointmentCode} · with ${appt.doctorId?.name || "Unknown doctor"}` : `with ${appt.doctorId?.name || "Unknown doctor"}`}
                actions={
                  <div className="flex items-center gap-2">
                    <select
                      value={appt.status}
                      onChange={(e) => updateAppointmentStatusAdmin(appt._id, e.target.value)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none"
                    >
                      {["booked", "completed", "cancelled", "no-show"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {appt.status !== "cancelled" && (
                      <button
                        onClick={() => setOpenCancelId(isCancelling ? null : appt._id)}
                        className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                      >
                        {isCancelling ? "Never mind" : "Cancel"}
                      </button>
                    )}
                  </div>
                }
              >
                <DataGrid
                  fields={[
                    { label: "Department", value: appt.department?.name || "—" },
                    { label: "Slot", value: new Date(appt.slotTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) },
                    { label: "Status", value: <StatusBadge status={appt.status} tone={statusTone(appt.status)} /> },
                  ]}
                />
                {appt.status === "cancelled" && appt.cancelReason && (
                  <div className="mt-4 pt-4 border-t border-mist text-sm text-slate-600">
                    <span className="text-slate-500">Cancelled — reason:</span>{" "}
                    <span className="font-medium text-ink">{appt.cancelReason}</span>
                    {appt.cancelNote && <span className="text-slate-500"> · {appt.cancelNote}</span>}
                  </div>
                )}
                {isCancelling && (
                  <div className="mt-4 space-y-3 pt-4 border-t border-mist">
                    <select
                      value={draft.reason}
                      onChange={(e) => setCancelDrafts((prev) => ({ ...prev, [appt._id]: { ...draft, reason: e.target.value } }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none"
                    >
                      <option value="">Select a reason</option>
                      {cancelReasons.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => cancelAppointmentAdmin(appt._id)}
                      disabled={!draft.reason}
                      className="rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                    >
                      Confirm cancellation
                    </button>
                  </div>
                )}
              </DataCard>
            );
          })}
        </div>
      );
    }

    if (section === "tickets") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <EmptyRow>No tickets have been raised by patients yet.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          {ticketActionMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{ticketActionMessage}</div>
          )}
          {payload.map((q) => (
            <DataCard
              key={q._id}
              title={q.subject}
              subtitle={`Ticket ${q.ticketId} · ${q.patientId?.name || q.patientId?.phone || "Unknown patient"}`}
              badge={<StatusBadge status={q.status} tone={statusTone(q.status)} />}
            >
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mr-1">Redirect to</span>
                <select
                  value={q.assignedToId?._id || ""}
                  onChange={(e) => assignTicket(q._id, e.target.value)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {staffDirectory.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                  ))}
                </select>

                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mr-1 ml-4">Status</span>
                <select
                  value={q.status}
                  onChange={(e) => setTicketStatus(q._id, e.target.value)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none"
                >
                  {TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 mt-4 border-t border-mist">{renderTicketThread(q)}</div>

              <div className="mt-4 space-y-3 pt-4 border-t border-mist">
                <textarea
                  value={ticketReplyDrafts[q._id] || ""}
                  onChange={(e) => setTicketReplyDrafts((prev) => ({ ...prev, [q._id]: e.target.value }))}
                  rows={2}
                  placeholder="Reply to this patient..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                />
                <button
                  onClick={() => replyToTicket(q._id)}
                  className="rounded-full bg-crimson px-4 py-1.5 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors"
                >
                  Send reply
                </button>
              </div>
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "doctor-schedule") {
      const doctor = doctors.find((d) => d._id === scheduleDoctorId);
      return (
        <div className="space-y-6">
          <DataCard title="Set doctor availability" subtitle="Pick a doctor and a day of the week, then add the exact time slots they're available. Patients booking that department will only see these times.">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Doctor</span>
                <select
                  value={scheduleDoctorId}
                  onChange={(e) => {
                    setScheduleDoctorId(e.target.value);
                    setScheduleMessage("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                >
                  <option value="">Select doctor</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}{d.department?.name ? ` · ${d.department.name}` : ""}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Day of week</span>
                <select
                  value={scheduleDayOfWeek}
                  onChange={(e) => setScheduleDayOfWeek(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                >
                  {DAY_NAMES.map((name, i) => (
                    <option key={name} value={i}>{name}</option>
                  ))}
                </select>
              </label>
            </div>

            {scheduleDoctorId && (
              <div className="mt-5 pt-5 border-t border-mist space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {scheduleTimes.length === 0 && <span className="text-sm text-slate-soft">No slots set for this day yet.</span>}
                  {scheduleTimes.map((t) => (
                    <span key={t} className="inline-flex items-center gap-2 rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-ink">
                      {t}
                      <button onClick={() => setScheduleTimes((prev) => prev.filter((x) => x !== t))} className="text-slate-400 hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={scheduleNewTime}
                    onChange={(e) => setScheduleNewTime(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      if (scheduleNewTime && !scheduleTimes.includes(scheduleNewTime)) {
                        setScheduleTimes((prev) => [...prev, scheduleNewTime].sort());
                      }
                    }}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-ink hover:border-crimson/30 transition-colors"
                  >
                    + Add time
                  </button>
                  <button
                    onClick={saveDoctorSchedule}
                    disabled={scheduleSaving || !doctor?.department}
                    className="rounded-full bg-crimson px-5 py-2 text-xs font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                  >
                    {scheduleSaving ? "Saving..." : `Save ${DAY_NAMES[scheduleDayOfWeek]} schedule`}
                  </button>
                </div>
                {!doctor?.department && (
                  <div className="text-xs text-amber-700">This doctor has no department assigned yet — assign one first under Departments.</div>
                )}
                {scheduleMessage && <div className="text-sm font-medium text-emerald-600">{scheduleMessage}</div>}
              </div>
            )}
          </DataCard>
        </div>
      );
    }

    if (section === "analytics") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!analytics) return <EmptyRow>No analytics data available yet.</EmptyRow>;

      const cards = [
        { label: "Total staff", value: analytics.staff.total },
        { label: "Total patients", value: analytics.patients.total },
        { label: "Departments", value: analytics.departments.total },
        { label: "Appointments today", value: analytics.appointments.today },
        { label: "Total appointments", value: analytics.appointments.total },
        { label: "Pending leave requests", value: analytics.leave.pending },
        { label: "Active queue tokens", value: analytics.queue.active },
        { label: "Avg. wait time (min)", value: analytics.queue.avgWaitMinutes ?? "—" },
      ];

      return (
        <div className="space-y-8">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-mist bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">{c.label}</div>
                <div className="mt-2 text-3xl font-display font-semibold text-navy">{c.value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DataCard title="Staff by role">
              <div className="flex flex-wrap gap-2">
                {Object.entries(analytics.staff.byRole).map(([role, count]) => (
                  <span key={role} className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-xs text-ink">
                    <span className="capitalize">{role}</span>
                    <span className="font-semibold text-navy">{count}</span>
                  </span>
                ))}
              </div>
            </DataCard>

            <DataCard title="Appointments by status">
              <div className="flex flex-wrap gap-2">
                {Object.entries(analytics.appointments.byStatus).map(([status, count]) => (
                  <StatusBadge key={status} status={`${status}: ${count}`} tone={statusTone(status)} />
                ))}
              </div>
            </DataCard>
          </div>
        </div>
      );
    }

    return (
      <EmptyState
        title={current.label}
        description={current.desc}
        accent={config.accent === "crimson" ? "crimson" : "navy"}
      />
    );
  };

  const renderProfileContent = () => {
    if (loading) return <div className="text-gray-600">Loading...</div>;
    if (!profileData || !profileForm) return <p className="text-gray-600">Profile not available.</p>;

    return (
      <div className="max-w-xl space-y-6">
        <div className="rounded-2xl border border-mist bg-white p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div><span className="text-slate-500">Name:</span> <span className="font-semibold text-ink">{profileData.name}</span></div>
            <div><span className="text-slate-500">Username:</span> <span className="font-semibold text-ink">@{profileData.username}</span></div>
            <div><span className="text-slate-500">Role:</span> <span className="font-semibold text-ink capitalize">{profileData.role}</span></div>
            {profileData.department?.name && (
              <div><span className="text-slate-500">Department:</span> <span className="font-semibold text-ink">{profileData.department.name}</span></div>
            )}
            {profileData.designation && (
              <div><span className="text-slate-500">Designation:</span> <span className="font-semibold text-ink">{profileData.designation}</span></div>
            )}
            {profileData.degree && (
              <div><span className="text-slate-500">Degree:</span> <span className="font-semibold text-ink">{profileData.degree}</span></div>
            )}
            {profileData.registrationNo && (
              <div><span className="text-slate-500">Registration no:</span> <span className="font-semibold text-ink">{profileData.registrationNo}</span></div>
            )}
            {profileData.shiftTiming && (
              <div><span className="text-slate-500">Shift:</span> <span className="font-semibold text-ink capitalize">{profileData.shiftTiming}</span></div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        )}
        {profileMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{profileMessage}</div>
        )}

        <form onSubmit={submitProfileUpdate} className="space-y-4 rounded-2xl border border-mist bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-ink">Editable details</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Contact number</span>
              <input
                type="text"
                value={profileForm.contactNumber}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, contactNumber: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Email</span>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Blood group</span>
              <input
                type="text"
                value={profileForm.bloodGroup}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, bloodGroup: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm text-slate-600">Address</span>
              <input
                type="text"
                value={profileForm.address}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Emergency contact name</span>
              <input
                type="text"
                value={profileForm.emergencyContactName}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Emergency contact number</span>
              <input
                type="text"
                value={profileForm.emergencyContactNumber}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, emergencyContactNumber: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={profileSaving}
            className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {profileSaving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    );
  };

  const renderDoctorContent = () => {
    if (section === "appointments") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <EmptyRow>No appointments scheduled yet.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          <div className="text-sm text-slate-soft">{payload.length} appointment{payload.length !== 1 ? "s" : ""}</div>
          {payload.map((appt) => (
            <DataCard
              key={appt._id}
              title={appt.patientId?.name || appt.patientId?.phone || "Unknown patient"}
              subtitle={appt.appointmentCode ? `${appt.appointmentCode} · ${new Date(appt.slotTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : new Date(appt.slotTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              actions={
                <div className="flex items-center gap-2">
                  <select
                    value={appt.status}
                    onChange={(e) => updateDoctorAppointmentStatus(appt._id, e.target.value)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none"
                  >
                    {["booked", "completed", "cancelled", "no-show"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setRxAppointmentId(rxAppointmentId === appt._id ? null : appt._id);
                      setRxStatus("");
                      setRxMedicines([{ ...EMPTY_MEDICINE_LINE }]);
                    }}
                    className="rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-light transition-colors"
                  >
                    {rxAppointmentId === appt._id ? "Close" : "Write prescription"}
                  </button>
                </div>
              }
            >
              {rxAppointmentId === appt._id && (
                <div className="rounded-xl bg-mist p-5 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">New prescription</div>
                  {rxMedicines.map((line, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_1fr_auto] gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Medicine name"
                        value={line.name}
                        onChange={(e) => updateRxMedicineLine(index, "name", e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 1-0-1)"
                        value={line.dosage}
                        onChange={(e) => updateRxMedicineLine(index, "dosage", e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={line.quantity}
                        onChange={(e) => updateRxMedicineLine(index, "quantity", e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                      />
                      {rxMedicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRxMedicineLine(index)}
                          className="text-slate-400 hover:text-red-600 text-sm justify-self-start sm:justify-self-auto"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={addRxMedicineLine}
                      className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-ink hover:border-crimson/30 transition-colors"
                    >
                      + Add medicine
                    </button>
                    <button
                      type="button"
                      onClick={() => submitPrescription(appt)}
                      className="rounded-full bg-crimson px-4 py-1.5 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors"
                    >
                      Save prescription
                    </button>
                    {rxStatus && <span className="text-xs font-medium text-slate-600">{rxStatus}</span>}
                  </div>
                </div>
              )}
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "prescriptions") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <EmptyRow>You haven't written any prescriptions yet.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          {payload.map((rx) => (
            <DataCard
              key={rx._id}
              title={rx.patientId?.name || rx.patientId?.phone || "Unknown patient"}
              subtitle={`Written ${new Date(rx.createdAt).toLocaleDateString()}`}
            >
              <div className="space-y-2.5">
                {rx.medicines?.map((med, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-xl bg-mist px-4 py-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-sm truncate">{med.name}</div>
                      <div className="text-xs text-slate-soft mt-0.5">{med.dosage}{med.quantity ? ` · qty ${med.quantity}` : ""}</div>
                    </div>
                    <StatusBadge status={med.availability} tone={statusTone(med.availability)} />
                  </div>
                ))}
              </div>
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "schedule") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (!myWeeklySchedule) return <EmptyRow>Your availability hasn't been set by the admin yet.</EmptyRow>;
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DAY_NAMES.map((name, i) => {
            const times = myWeeklySchedule.schedule?.[i] || [];
            return (
              <DataCard key={name} title={name}>
                {times.length === 0 ? (
                  <div className="text-sm text-slate-soft">No slots set.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {times.map((t) => (
                      <span key={t} className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-ink">{t}</span>
                    ))}
                  </div>
                )}
              </DataCard>
            );
          })}
        </div>
      );
    }

    if (section === "tickets") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <EmptyRow>No patient tickets have been redirected to you.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          {payload.map((q) => (
            <DataCard
              key={q._id}
              title={q.subject}
              subtitle={`Ticket ${q.ticketId} · ${q.patientId?.name || q.patientId?.phone || "Unknown patient"}`}
              badge={<StatusBadge status={q.status} tone={statusTone(q.status)} />}
            >
              {renderTicketThread(q)}
              {q.status !== "closed" && q.status !== "completed" && (
                <div className="mt-4 space-y-3 pt-4 border-t border-mist">
                  <textarea
                    value={ticketReplyDrafts[q._id] || ""}
                    onChange={(e) => setTicketReplyDrafts((prev) => ({ ...prev, [q._id]: e.target.value }))}
                    rows={2}
                    placeholder="Reply to this patient..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                  />
                  <button
                    onClick={() => replyToTicket(q._id)}
                    className="rounded-full bg-crimson px-4 py-1.5 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors"
                  >
                    Send reply
                  </button>
                  <span className="ml-2 text-xs text-slate-soft">Only admin can change the ticket's status.</span>
                </div>
              )}
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "clinical") {
      return (
        <div className="space-y-6">
          <DataCard>
            <form onSubmit={runClinicalLookup} className="flex flex-wrap items-end gap-4">
              <label className="space-y-2 flex-1 min-w-[220px]">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Appointment ID</span>
                <input
                  type="text"
                  value={clinicalLookupCode}
                  onChange={(e) => setClinicalLookupCode(e.target.value)}
                  placeholder="e.g. APT-260723-4F2K"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase tracking-wide focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                />
              </label>
              <button type="submit" className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
                Look up
              </button>
            </form>
          </DataCard>

          {clinicalLookupError && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{clinicalLookupError}</div>}

          {clinicalLookupResult && (
            <>
              <DataCard
                title={clinicalLookupResult.appointment.patientId?.name || clinicalLookupResult.appointment.patientId?.phone}
                subtitle={clinicalLookupResult.appointment.appointmentCode}
              >
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <input type="text" placeholder="Temp (°F)" value={encounterForm.temperatureF} onChange={(e) => setEncounterForm((p) => ({ ...p, temperatureF: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    <input type="text" placeholder="BP (e.g. 120/80)" value={encounterForm.bloodPressure} onChange={(e) => setEncounterForm((p) => ({ ...p, bloodPressure: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    <input type="text" placeholder="Pulse (bpm)" value={encounterForm.pulseBpm} onChange={(e) => setEncounterForm((p) => ({ ...p, pulseBpm: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    <input type="text" placeholder="SpO2 (%)" value={encounterForm.spo2} onChange={(e) => setEncounterForm((p) => ({ ...p, spo2: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    <input type="text" placeholder="Resp. rate" value={encounterForm.respiratoryRate} onChange={(e) => setEncounterForm((p) => ({ ...p, respiratoryRate: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    <input type="text" placeholder="Weight (kg)" value={encounterForm.weightKg} onChange={(e) => setEncounterForm((p) => ({ ...p, weightKg: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    <input type="text" placeholder="Height (cm)" value={encounterForm.heightCm} onChange={(e) => setEncounterForm((p) => ({ ...p, heightCm: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    <input type="date" value={encounterForm.followUpDate} onChange={(e) => setEncounterForm((p) => ({ ...p, followUpDate: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                  </div>
                  <input type="text" placeholder="Chief complaint" value={encounterForm.chiefComplaint} onChange={(e) => setEncounterForm((p) => ({ ...p, chiefComplaint: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                  <input type="text" placeholder="Diagnosis (comma-separated if more than one)" value={encounterForm.diagnosisText} onChange={(e) => setEncounterForm((p) => ({ ...p, diagnosisText: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                  <textarea placeholder="Clinical notes" value={encounterForm.clinicalNotes} onChange={(e) => setEncounterForm((p) => ({ ...p, clinicalNotes: e.target.value }))} rows={3} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                  {encounterSaveStatus && <div className="text-sm font-medium text-emerald-600">{encounterSaveStatus}</div>}
                  <button onClick={submitEncounter} className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
                    Save encounter
                  </button>
                </div>
              </DataCard>

              {clinicalLookupResult.encounters.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mb-3">Previous encounters for this visit</div>
                  <div className="space-y-3">
                    {clinicalLookupResult.encounters.map((enc) => (
                      <DataCard key={enc._id} title={new Date(enc.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} subtitle={enc.chiefComplaint}>
                        {enc.diagnosis?.length > 0 && (
                          <div className="text-sm text-ink">Diagnosis: {enc.diagnosis.map((d) => d.description).join(", ")}</div>
                        )}
                        {enc.clinicalNotes && <div className="mt-1 text-sm text-slate-soft">{enc.clinicalNotes}</div>}
                      </DataCard>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    if (section === "ipd") {
      return renderIpdWorkspace("doctor");
    }

    if (section === "profile") {
      return renderProfileContent();
    }

    return (
      <EmptyState
        title={current.label}
        description={current.desc}
        accent={config.accent === "crimson" ? "crimson" : "navy"}
      />
    );
  };

  const renderStaffContent = () => {
    if (section === "ipd") {
      return renderIpdWorkspace("nurse");
    }

    if (section === "appointment-lookup") {
      return (
        <div className="space-y-6">
          <DataCard>
            <form onSubmit={runAppointmentLookup} className="flex flex-wrap items-end gap-4">
              <label className="space-y-2 flex-1 min-w-[220px]">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Appointment ID</span>
                <input
                  type="text"
                  value={apptLookupValue}
                  onChange={(e) => setApptLookupValue(e.target.value)}
                  placeholder="e.g. APT-260723-4F2K"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase tracking-wide focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                />
              </label>
              <button
                type="submit"
                className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors"
              >
                Look up
              </button>
            </form>
          </DataCard>

          {apptLookupError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{apptLookupError}</div>
          )}

          {apptLookupResult ? (
            <DataCard
              title={apptLookupResult.patientId?.name || apptLookupResult.patientId?.phone || "Unknown patient"}
              subtitle={apptLookupResult.appointmentCode}
              badge={<StatusBadge status={apptLookupResult.status} tone={statusTone(apptLookupResult.status)} />}
            >
              <DataGrid
                fields={[
                  { label: "Doctor", value: apptLookupResult.doctorId?.name || "—" },
                  { label: "Department", value: apptLookupResult.department?.name || "—" },
                  { label: "Slot", value: new Date(apptLookupResult.slotTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) },
                  { label: "Patient phone", value: apptLookupResult.patientId?.phone || "—" },
                ]}
              />
              <div className="mt-5 flex flex-wrap items-center gap-2 pt-4 border-t border-mist">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mr-1">Update status</span>
                {["booked", "completed", "cancelled", "no-show"].map((s) => (
                  <button
                    key={s}
                    onClick={() => updateApptLookupStatus(s)}
                    disabled={apptLookupResult.status === s}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                      apptLookupResult.status === s
                        ? "bg-mist text-slate-400 cursor-not-allowed"
                        : "border border-slate-300 bg-white text-ink hover:border-crimson/40"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </DataCard>
          ) : (
            apptLookupSearched === false && (
              <EmptyRow>Enter an appointment ID to view its details and update its status.</EmptyRow>
            )
          )}
        </div>
      );
    }

    if (section === "leave") {
      return (
        <div className="max-w-lg space-y-6">
          {leaveApplyStatus && (
            <div className="rounded-2xl border border-mist bg-white p-4 text-sm font-medium text-ink shadow-sm">{leaveApplyStatus}</div>
          )}
          <form onSubmit={submitLeaveApplication} className="space-y-5 rounded-2xl border border-mist bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">From date</span>
                <input
                  type="date"
                  value={leaveForm.fromDate}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, fromDate: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">To date</span>
                <input
                  type="date"
                  value={leaveForm.toDate}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, toDate: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                />
              </label>
            </div>
            <label className="space-y-2 block">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Reason</span>
              <textarea
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition-colors"
            >
              Submit leave request
            </button>
          </form>
        </div>
      );
    }

    if (section === "leave-history") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <EmptyRow>No leave requests submitted yet.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          {payload.map((lr) => (
            <DataCard
              key={lr._id}
              title={`${new Date(lr.fromDate).toLocaleDateString()} – ${new Date(lr.toDate).toLocaleDateString()}`}
              badge={<StatusBadge status={lr.status} tone={statusTone(lr.status)} />}
            >
              <p className="text-sm text-slate-600 leading-relaxed">{lr.reason}</p>
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "tickets") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <EmptyRow>No patient tickets have been redirected to you.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          {payload.map((q) => (
            <DataCard
              key={q._id}
              title={q.subject}
              subtitle={`Ticket ${q.ticketId} · ${q.patientId?.name || q.patientId?.phone || "Unknown patient"}`}
              badge={<StatusBadge status={q.status} tone={statusTone(q.status)} />}
            >
              {renderTicketThread(q)}
              {q.status !== "closed" && q.status !== "completed" && (
                <div className="mt-4 space-y-3 pt-4 border-t border-mist">
                  <textarea
                    value={ticketReplyDrafts[q._id] || ""}
                    onChange={(e) => setTicketReplyDrafts((prev) => ({ ...prev, [q._id]: e.target.value }))}
                    rows={2}
                    placeholder="Reply to this patient..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                  />
                  <button
                    onClick={() => replyToTicket(q._id)}
                    className="rounded-full bg-crimson px-4 py-1.5 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors"
                  >
                    Send reply
                  </button>
                  <span className="ml-2 text-xs text-slate-soft">Only admin can change the ticket's status.</span>
                </div>
              )}
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "profile") {
      return renderProfileContent();
    }

    return (
      <EmptyState
        title={current.label}
        description={current.desc}
        accent={config.accent === "crimson" ? "crimson" : "navy"}
      />
    );
  };

  const renderReceptionistContent = () => {
    if (section === "ipd") {
      return renderIpdWorkspace("receptionist");
    }

    if (section === "appointments") {
      return (
        <div className="space-y-6">
          <SectionToolbar>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Filter</span>
              <select
                value={receptionStatusFilter}
                onChange={(e) => setReceptionStatusFilter(e.target.value)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs focus:border-crimson/50 focus:outline-none"
              >
                <option value="">All statuses</option>
                {["booked", "completed", "cancelled", "no-show"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="text-sm text-slate-soft">{receptionAppointments.length} appointment{receptionAppointments.length !== 1 ? "s" : ""}</div>
          </SectionToolbar>

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}

          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : receptionAppointments.length === 0 ? (
            <EmptyRow>No appointments match this filter.</EmptyRow>
          ) : (
            <div className="space-y-4">
              {receptionAppointments.map((a) => (
                <DataCard
                  key={a._id}
                  title={a.patientId?.name || a.patientId?.phone || "Unknown patient"}
                  subtitle={`${a.appointmentCode} · ${a.department?.name || "—"}`}
                  badge={<StatusBadge status={a.status} tone={statusTone(a.status)} />}
                >
                  <DataGrid
                    fields={[
                      { label: "Doctor", value: a.doctorId?.name || "—" },
                      { label: "Slot", value: new Date(a.slotTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) },
                      { label: "Patient phone", value: a.patientId?.phone || "—" },
                    ]}
                  />
                  <div className="mt-5 flex flex-wrap items-center gap-2 pt-4 border-t border-mist">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mr-1">Check-in</span>
                    {["booked", "completed", "cancelled", "no-show"].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateReceptionApptStatus(a._id, s)}
                        disabled={a.status === s}
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                          a.status === s
                            ? "bg-mist text-slate-400 cursor-not-allowed"
                            : "border border-slate-300 bg-white text-ink hover:border-crimson/40"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-mist">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mr-1">Reassign doctor</span>
                    <select
                      value={doctorReassignChoice[a._id] || ""}
                      onChange={(e) => setDoctorReassignChoice((prev) => ({ ...prev, [a._id]: e.target.value }))}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none"
                    >
                      <option value="">Choose doctor...</option>
                      {doctors.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => submitReassignDoctor(a._id)}
                      disabled={!doctorReassignChoice[a._id]}
                      className="rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Reassign
                    </button>
                  </div>
                </DataCard>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (section === "billing") {
      const medicines = billLookupResult?.prescription?.medicines || [];
      const selectedTotal = medicines.reduce((sum, med, i) => {
        if (med.availability === "available" && billMedicineChoices[i]) {
          return sum + (Number(med.quantity) || 1);
        }
        return sum;
      }, 0);

      return (
        <div className="space-y-6">
          <DataCard>
            <form onSubmit={runBillLookup} className="flex flex-wrap items-end gap-4">
              <label className="space-y-2 flex-1 min-w-[220px]">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Appointment ID</span>
                <input
                  type="text"
                  value={billLookupCode}
                  onChange={(e) => setBillLookupCode(e.target.value)}
                  placeholder="e.g. APT-260723-4F2K"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase tracking-wide focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                />
              </label>
              <button type="submit" className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
                Look up
              </button>
            </form>
          </DataCard>

          {billLookupError && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{billLookupError}</div>}

          {billLookupResult && (
            <DataCard
              title={billLookupResult.appointment.patientId?.name || billLookupResult.appointment.patientId?.phone}
              subtitle={billLookupResult.appointment.appointmentCode}
              badge={<StatusBadge status={billLookupResult.appointment.status} tone={statusTone(billLookupResult.appointment.status)} />}
            >
              {billLookupResult.alreadyBilled ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-mist p-4 text-sm text-ink">
                    Bill <span className="font-semibold">{billLookupResult.bill?.billNumber}</span> already generated — total ₹{billLookupResult.bill?.totalAmount}, status:{" "}
                    <StatusBadge status={billLookupResult.bill?.status} tone={statusTone(billLookupResult.bill?.status)} />
                  </div>
                  {billLookupResult.bill?.status === "unpaid" && (
                    <button
                      onClick={() => markBillPaidAction(billLookupResult.bill._id, billPaymentMethod)}
                      className="rounded-full bg-navy px-5 py-2 text-xs font-semibold text-white hover:bg-navy-light transition-colors"
                    >
                      Mark as paid
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {medicines.length === 0 ? (
                    <div className="text-sm text-slate-soft">No prescription/medicines for this visit — only the consultation or a flat visit fee applies.</div>
                  ) : (
                    <div className="space-y-2.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Dispensed medicines to bill</span>
                      {medicines.map((med, i) => (
                        <label key={i} className="flex items-center gap-3 rounded-xl bg-mist px-4 py-3">
                          <input
                            type="checkbox"
                            disabled={med.availability !== "available"}
                            checked={!!billMedicineChoices[i]}
                            onChange={() => toggleBillMedicine(i)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-ink text-sm truncate">{med.name}</div>
                            <div className="text-xs text-slate-soft mt-0.5">{med.dosage}{med.quantity ? ` · qty ${med.quantity}` : ""}</div>
                          </div>
                          <StatusBadge status={med.availability} tone={statusTone(med.availability)} />
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t border-mist">
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Consultation fee</span>
                      <input
                        type="number"
                        value={billConsultationFee}
                        onChange={(e) => setBillConsultationFee(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                      />
                    </label>
                    {selectedTotal === 0 && (
                      <label className="space-y-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Visit / application fee</span>
                        <input
                          type="number"
                          value={billApplicationFee}
                          onChange={(e) => setBillApplicationFee(e.target.value)}
                          placeholder="If patient takes no medicine"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                        />
                      </label>
                    )}
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Payment method</span>
                      <select
                        value={billPaymentMethod}
                        onChange={(e) => setBillPaymentMethod(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                      >
                        {["cash", "card", "upi", "other"].map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {billGenerateStatus && <div className="text-sm font-medium text-emerald-600">{billGenerateStatus}</div>}

                  <button
                    onClick={submitGenerateBill}
                    className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors"
                  >
                    Generate bill
                  </button>
                </div>
              )}
            </DataCard>
          )}

          {!billLookupResult && billLookupSearched === false && (
            <EmptyRow>Look up an appointment by its ID to bill it.</EmptyRow>
          )}
        </div>
      );
    }

    if (section === "bills") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (!billsList || billsList.length === 0) return <EmptyRow>No bills generated yet.</EmptyRow>;
      return (
        <div className="space-y-4">
          {billsList.map((b) => (
            <DataCard
              key={b._id}
              title={b.patientId?.name || b.patientId?.phone || "Unknown patient"}
              subtitle={`${b.billNumber} · ${b.appointmentId?.appointmentCode || ""}`}
              badge={<StatusBadge status={b.status} tone={statusTone(b.status)} />}
            >
              <DataGrid
                fields={[
                  { label: "Medicines", value: `₹${b.medicinesTotal}` },
                  { label: "Consultation fee", value: `₹${b.consultationFee}` },
                  { label: "Application fee", value: `₹${b.applicationFee}` },
                  { label: "Total", value: `₹${b.totalAmount}` },
                  { label: "Payment method", value: b.paymentMethod },
                  { label: "Generated by", value: b.generatedBy?.name || "—" },
                ]}
              />
              {b.status === "unpaid" && (
                <div className="mt-4 pt-4 border-t border-mist">
                  <button
                    onClick={() => markBillPaidAction(b._id, b.paymentMethod)}
                    className="rounded-full bg-navy px-5 py-2 text-xs font-semibold text-white hover:bg-navy-light transition-colors"
                  >
                    Mark as paid
                  </button>
                </div>
              )}
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "create-query") {
      return (
        <div className="max-w-lg space-y-6">
          {onBehalfTicketStatus && (
            <div className="rounded-2xl border border-mist bg-white p-4 text-sm font-medium text-ink shadow-sm">{onBehalfTicketStatus}</div>
          )}
          <form onSubmit={submitOnBehalfTicket} className="space-y-5 rounded-2xl border border-mist bg-white p-6 shadow-sm">
            <label className="space-y-2 block">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Patient phone number</span>
              <input
                type="text"
                value={onBehalfTicketForm.patientPhone}
                onChange={(e) => setOnBehalfTicketForm((prev) => ({ ...prev, patientPhone: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
              />
            </label>
            <label className="space-y-2 block">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Subject</span>
              <input
                type="text"
                value={onBehalfTicketForm.subject}
                onChange={(e) => setOnBehalfTicketForm((prev) => ({ ...prev, subject: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
              />
            </label>
            <label className="space-y-2 block">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Message</span>
              <textarea
                value={onBehalfTicketForm.message}
                onChange={(e) => setOnBehalfTicketForm((prev) => ({ ...prev, message: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
              />
            </label>
            <button type="submit" className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
              Raise ticket
            </button>
          </form>
        </div>
      );
    }

    if (section === "leave") {
      return renderStaffContent();
    }
    if (section === "leave-history" || section === "tickets") {
      return renderStaffContent();
    }
    if (section === "profile") {
      return renderProfileContent();
    }

    return (
      <EmptyState
        title={current.label}
        description={current.desc}
        accent={config.accent === "crimson" ? "crimson" : "navy"}
      />
    );
  };

  const renderAccountantContent = () => {
    if (section === "bills") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (!billsList || billsList.length === 0) return <EmptyRow>No bills generated yet.</EmptyRow>;
      return (
        <div className="space-y-4">
          {billsList.map((b) => (
            <DataCard
              key={b._id}
              title={b.patientId?.name || b.patientId?.phone || "Unknown patient"}
              subtitle={`${b.billNumber} · ${b.appointmentId?.appointmentCode || ""}`}
              badge={<StatusBadge status={b.status} tone={statusTone(b.status)} />}
            >
              <DataGrid
                fields={[
                  { label: "Total", value: `₹${b.totalAmount}` },
                  { label: "Payment method", value: b.paymentMethod },
                  { label: "Generated by", value: b.generatedBy?.name || "—" },
                  { label: "Date", value: new Date(b.createdAt).toLocaleDateString() },
                ]}
              />
              {b.status === "unpaid" && (
                <div className="mt-4 pt-4 border-t border-mist">
                  <button
                    onClick={() => markBillPaidAction(b._id, b.paymentMethod)}
                    className="rounded-full bg-navy px-5 py-2 text-xs font-semibold text-white hover:bg-navy-light transition-colors"
                  >
                    Mark as paid
                  </button>
                </div>
              )}
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "cashflow") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (!cashFlow) return <EmptyRow>No financial data yet.</EmptyRow>;
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DataCard title="Collected" subtitle="Paid bills">
              <div className="text-2xl font-bold text-emerald-600">₹{cashFlow.totalCollected}</div>
            </DataCard>
            <DataCard title="Outstanding" subtitle="Unpaid bills">
              <div className="text-2xl font-bold text-amber-600">₹{cashFlow.totalOutstanding}</div>
            </DataCard>
            <DataCard title="Salaries paid" subtitle="This period">
              <div className="text-2xl font-bold text-navy">₹{cashFlow.totalSalariesPaid}</div>
            </DataCard>
            <DataCard title="Net cash flow" subtitle="Collected − salaries">
              <div className={`text-2xl font-bold ${cashFlow.netCashFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}>₹{cashFlow.netCashFlow}</div>
            </DataCard>
          </div>

          <DataCard title="Collected by payment method">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(cashFlow.collectedByPaymentMethod || {}).map(([method, amount]) => (
                <div key={method}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">{method}</div>
                  <div className="mt-1 text-sm font-medium text-ink">₹{amount}</div>
                </div>
              ))}
              {Object.keys(cashFlow.collectedByPaymentMethod || {}).length === 0 && (
                <div className="text-sm text-slate-soft">No payments collected yet.</div>
              )}
            </div>
          </DataCard>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mb-3">Recent paid bills</div>
            {(cashFlow.recentPaidBills || []).length === 0 ? (
              <EmptyRow>No paid bills yet.</EmptyRow>
            ) : (
              <div className="space-y-3">
                {cashFlow.recentPaidBills.map((b) => (
                  <DataCard key={b._id} title={b.billNumber} subtitle={new Date(b.paidAt).toLocaleString()}>
                    <div className="text-sm font-medium text-ink">₹{b.totalAmount} · {b.paymentMethod}</div>
                  </DataCard>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (section === "salary-slips") {
      return (
        <div className="space-y-6">
          {salaryFormStatus && (
            <div className="rounded-2xl border border-mist bg-white p-4 text-sm font-medium text-ink shadow-sm">{salaryFormStatus}</div>
          )}
          <form onSubmit={submitSalarySlip} className="space-y-4 rounded-2xl border border-mist bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Staff member</span>
                <select
                  value={salaryForm.staffId}
                  onChange={(e) => setSalaryForm((prev) => ({ ...prev, staffId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                >
                  <option value="">Choose staff...</option>
                  {salaryStaffList.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} · {s.role}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Month</span>
                <select
                  value={salaryForm.month}
                  onChange={(e) => setSalaryForm((prev) => ({ ...prev, month: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Year</span>
                <input
                  type="number"
                  value={salaryForm.year}
                  onChange={(e) => setSalaryForm((prev) => ({ ...prev, year: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Basic salary</span>
                <input
                  type="number"
                  value={salaryForm.basicSalary}
                  onChange={(e) => setSalaryForm((prev) => ({ ...prev, basicSalary: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Bonus</span>
                <input
                  type="number"
                  value={salaryForm.bonus}
                  onChange={(e) => setSalaryForm((prev) => ({ ...prev, bonus: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Deductions</span>
                <input
                  type="number"
                  value={salaryForm.deductions}
                  onChange={(e) => setSalaryForm((prev) => ({ ...prev, deductions: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                />
              </label>
            </div>
            <button type="submit" className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
              Generate salary slip
            </button>
          </form>

          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : !salarySlips || salarySlips.length === 0 ? (
            <EmptyRow>No salary slips generated yet.</EmptyRow>
          ) : (
            <div className="space-y-4">
              {salarySlips.map((s) => (
                <DataCard
                  key={s._id}
                  title={s.staffId?.name || "Unknown staff"}
                  subtitle={`${s.month}/${s.year} · ${s.staffId?.role || ""}`}
                  badge={<StatusBadge status={s.status} tone={statusTone(s.status)} />}
                >
                  <DataGrid
                    fields={[
                      { label: "Basic", value: `₹${s.basicSalary}` },
                      { label: "Bonus", value: `₹${s.bonus}` },
                      { label: "Deductions", value: `₹${s.deductions}` },
                      { label: "Net pay", value: `₹${s.netPay}` },
                    ]}
                  />
                  {s.status === "pending" && (
                    <div className="mt-4 pt-4 border-t border-mist">
                      <button
                        onClick={() => markSalaryPaidAction(s._id)}
                        className="rounded-full bg-navy px-5 py-2 text-xs font-semibold text-white hover:bg-navy-light transition-colors"
                      >
                        Mark as paid
                      </button>
                    </div>
                  )}
                </DataCard>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (section === "my-salary") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <EmptyRow>No salary slips have been generated for you yet.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          {payload.map((s) => (
            <DataCard
              key={s._id}
              title={new Date(0, s.month - 1).toLocaleString([], { month: "long" }) + " " + s.year}
              subtitle={s.generatedBy?.name ? `Generated by ${s.generatedBy.name}` : "Salary slip"}
              badge={<StatusBadge status={s.status} tone={statusTone(s.status)} />}
            >
              <DataGrid
                fields={[
                  { label: "Basic", value: `₹${s.basicSalary}` },
                  { label: "Bonus", value: `₹${s.bonus}` },
                  { label: "Deductions", value: `₹${s.deductions}` },
                  { label: "Net pay", value: `₹${s.netPay}` },
                ]}
              />
              {s.notes && (
                <div className="mt-4 pt-4 border-t border-mist text-sm text-slate-600">
                  <span className="font-semibold text-ink">Notes: </span>{s.notes}
                </div>
              )}
              {s.status === "paid" && s.paidAt && (
                <div className="mt-3 text-xs text-slate-soft">
                  Paid on {new Date(s.paidAt).toLocaleDateString([], { dateStyle: "medium" })}
                </div>
              )}
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "leave" || section === "leave-history" || section === "tickets") {
      return renderStaffContent();
    }
    if (section === "profile") {
      return renderProfileContent();
    }

    return (
      <EmptyState
        title={current.label}
        description={current.desc}
        accent={config.accent === "crimson" ? "crimson" : "navy"}
      />
    );
  };

  const renderPharmacistContent = () => {
    if (section === "lookup") {
      return (
        <div className="space-y-6">
          <DataCard>
            <form onSubmit={runLookup} className="flex flex-wrap items-end gap-4">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Search by</span>
                <select
                  value={lookupType}
                  onChange={(e) => setLookupType(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                >
                  <option value="appointment">Appointment ID</option>
                  <option value="patient">Patient name</option>
                </select>
              </label>
              <label className="space-y-2 flex-1 min-w-[200px]">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">{lookupType === "appointment" ? "Appointment ID" : "Patient name"}</span>
                <input
                  type="text"
                  value={lookupValue}
                  onChange={(e) => setLookupValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                />
              </label>
              <button
                type="submit"
                className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors"
              >
                Search
              </button>
            </form>
          </DataCard>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="text-gray-600">Searching...</div>
          ) : lookupSearched && (!lookupResults || lookupResults.length === 0) ? (
            <EmptyRow>No matching prescriptions found.</EmptyRow>
          ) : lookupResults && lookupResults.length > 0 ? (
            <div className="space-y-4">
              {lookupResults.map((rx) => (
                <DataCard
                  key={rx._id}
                  title={rx.patientId?.name || rx.patientId?.phone || "Unknown patient"}
                  subtitle={`Prescribed by ${rx.doctorId?.name || "Unknown doctor"}`}
                >
                  <div className="space-y-2.5">
                    {rx.medicines?.map((med, i) => (
                      <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl bg-mist px-4 py-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-ink text-sm truncate">{med.name}</div>
                          <div className="text-xs text-slate-soft mt-0.5">{med.dosage}{med.quantity ? ` · qty ${med.quantity}` : ""}</div>
                        </div>
                        <select
                          value={linkedMedicineChoice[`${rx._id}:${i}`] || ""}
                          onChange={(e) =>
                            setLinkedMedicineChoice((prev) => ({ ...prev, [`${rx._id}:${i}`]: e.target.value }))
                          }
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none"
                        >
                          <option value="">Link to stock item...</option>
                          {medicineCatalog.map((m) => (
                            <option key={m._id} value={m._id}>{m.name} ({m.totalQuantity} {m.unit})</option>
                          ))}
                        </select>
                        <select
                          value={med.availability}
                          onChange={(e) => updateLookupMedicineAvailability(rx._id, i, e.target.value)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none"
                        >
                          <option value="pending">Pending</option>
                          <option value="available">Available</option>
                          <option value="unavailable">Unavailable</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </DataCard>
              ))}
            </div>
          ) : (
            <EmptyRow>Search by appointment ID or patient name to check a prescription against stock.</EmptyRow>
          )}
        </div>
      );
    }

    if (section === "inventory") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <EmptyRow>No medicines in inventory yet. Add one from the Add medicine tab.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          <SectionToolbar>
            <div className="text-sm text-slate-soft">{payload.length} medicine{payload.length !== 1 ? "s" : ""} in catalog</div>
            {actionMessage && <div className="text-sm font-medium text-emerald-600">{actionMessage}</div>}
          </SectionToolbar>
          {payload.map((med) => {
            const draft = getBatchDraft(med._id);
            return (
              <DataCard
                key={med._id}
                title={med.name}
                subtitle={`${med.totalQuantity} ${med.unit} in stock across ${med.batches?.length || 0} batch${med.batches?.length !== 1 ? "es" : ""}`}
                badge={<StatusBadge status={med.isAvailable ? "Available" : "Unavailable"} tone={med.isAvailable ? "success" : "danger"} />}
              >
                {med.batches?.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {med.batches.map((b) => {
                      const expired = new Date(b.expiryDate) < new Date();
                      return (
                        <div key={b._id} className="grid grid-cols-4 gap-3 rounded-xl bg-mist px-4 py-2.5 text-sm">
                          <div className="font-semibold text-ink">{b.batchNumber}</div>
                          <div className="text-slate-soft">{b.quantity} {med.unit}</div>
                          <div className="text-slate-soft">₹{b.price}</div>
                          <div className={expired ? "font-semibold text-red-600" : "text-slate-soft"}>
                            {new Date(b.expiryDate).toLocaleDateString()}{expired ? " (expired)" : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 pt-4 border-t border-mist">
                  <input
                    type="text"
                    placeholder="Batch #"
                    value={draft.batchNumber}
                    onChange={(e) => setBatchDraft(med._id, "batchNumber", e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={draft.quantity}
                    onChange={(e) => setBatchDraft(med._id, "quantity", e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={draft.price}
                    onChange={(e) => setBatchDraft(med._id, "price", e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                  />
                  <input
                    type="date"
                    value={draft.expiryDate}
                    onChange={(e) => setBatchDraft(med._id, "expiryDate", e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                  />
                </div>
                <div className="mt-4 flex gap-2 pt-4 border-t border-mist">
                  <button
                    onClick={() => submitRestock(med._id)}
                    className="rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-light transition-colors"
                  >
                    Add batch (restock)
                  </button>
                  <button
                    onClick={() => deleteMedicineRow(med._id)}
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                  >
                    Delete medicine
                  </button>
                </div>
              </DataCard>
            );
          })}
        </div>
      );
    }

    if (section === "expiry-alerts") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (!expiringBatches) return <EmptyRow>No data yet.</EmptyRow>;
      const { expiring, expired, windowDays } = expiringBatches;
      return (
        <div className="space-y-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-3">Already expired ({expired.length})</div>
            {expired.length === 0 ? (
              <EmptyRow>No expired stock sitting in inventory.</EmptyRow>
            ) : (
              <div className="space-y-3">
                {expired.map((item, i) => (
                  <DataCard key={i} title={item.medicineName} subtitle={`Batch ${item.batch.batchNumber}`}>
                    <div className="text-sm text-red-600 font-medium">
                      {item.batch.quantity} {item.unit} · expired {new Date(item.batch.expiryDate).toLocaleDateString()}
                    </div>
                  </DataCard>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-3">Expiring within {windowDays} days ({expiring.length})</div>
            {expiring.length === 0 ? (
              <EmptyRow>Nothing expiring soon.</EmptyRow>
            ) : (
              <div className="space-y-3">
                {expiring.map((item, i) => (
                  <DataCard key={i} title={item.medicineName} subtitle={`Batch ${item.batch.batchNumber}`}>
                    <div className="text-sm text-amber-600 font-medium">
                      {item.batch.quantity} {item.unit} · expires {new Date(item.batch.expiryDate).toLocaleDateString()}
                    </div>
                  </DataCard>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (section === "add-medicine") {
      return (
        <div className="max-w-xl space-y-6">
          {actionMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{actionMessage}</div>
          )}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
          )}
          <form onSubmit={submitAddMedicine} className="space-y-4 rounded-2xl border border-mist bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Medicine name *</span>
                <input
                  type="text"
                  value={addMedicineForm.name}
                  onChange={(e) => setAddMedicineForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Unit</span>
                <select
                  value={addMedicineForm.unit}
                  onChange={(e) => setAddMedicineForm((prev) => ({ ...prev, unit: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  {["tablets", "ml", "strips", "vials", "capsules"].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Batch number *</span>
                <input
                  type="text"
                  value={addMedicineForm.batchNumber}
                  onChange={(e) => setAddMedicineForm((prev) => ({ ...prev, batchNumber: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Quantity *</span>
                <input
                  type="number"
                  min="0"
                  value={addMedicineForm.quantity}
                  onChange={(e) => setAddMedicineForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Price *</span>
                <input
                  type="number"
                  min="0"
                  value={addMedicineForm.price}
                  onChange={(e) => setAddMedicineForm((prev) => ({ ...prev, price: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Expiry date *</span>
                <input
                  type="date"
                  value={addMedicineForm.expiryDate}
                  onChange={(e) => setAddMedicineForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  required
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Adding..." : "Add medicine"}
            </button>
          </form>
        </div>
      );
    }

    if (section === "tickets") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <EmptyRow>No patient tickets have been redirected to you.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          {payload.map((q) => (
            <DataCard
              key={q._id}
              title={q.subject}
              subtitle={`Ticket ${q.ticketId} · ${q.patientId?.name || q.patientId?.phone || "Unknown patient"}`}
              badge={<StatusBadge status={q.status} tone={statusTone(q.status)} />}
            >
              {renderTicketThread(q)}
              {q.status !== "closed" && q.status !== "completed" && (
                <div className="mt-4 space-y-3 pt-4 border-t border-mist">
                  <textarea
                    value={ticketReplyDrafts[q._id] || ""}
                    onChange={(e) => setTicketReplyDrafts((prev) => ({ ...prev, [q._id]: e.target.value }))}
                    rows={2}
                    placeholder="Reply to this patient..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                  />
                  <button
                    onClick={() => replyToTicket(q._id)}
                    className="rounded-full bg-crimson px-4 py-1.5 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors"
                  >
                    Send reply
                  </button>
                  <span className="ml-2 text-xs text-slate-soft">Only admin can change the ticket's status.</span>
                </div>
              )}
            </DataCard>
          ))}
        </div>
      );
    }

    return (
      <EmptyState
        title={current.label}
        description={current.desc}
        accent={config.accent === "crimson" ? "crimson" : "navy"}
      />
    );
  };

  let content;
  if (config.role === "patient") content = renderPatientContent();
  else if (config.role === "admin") content = renderAdminContent();
  else if (config.role === "doctor") content = renderDoctorContent();
  else if (config.role === "nurse") content = renderStaffContent();
  else if (config.role === "receptionist") content = renderReceptionistContent();
  else if (config.role === "accountant") content = renderAccountantContent();
  else if (config.role === "pharmacist") content = renderPharmacistContent();
  else
    content = (
      <EmptyState
        title={current.label}
        description={current.desc}
        accent={config.accent === "crimson" ? "crimson" : "navy"}
      />
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{current.label}</h1>
        <p className="text-gray-600 mt-2">{current.desc}</p>
      </div>

      {content}
    </div>
  );
}
