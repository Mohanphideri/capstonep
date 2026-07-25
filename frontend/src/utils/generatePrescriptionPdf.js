import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Brand palette (kept in sync with tailwind.config.js)
const CRIMSON = [200, 16, 46]; // #C8102E
const NAVY = [15, 31, 61]; // #0F1F3D
const MIST = [238, 241, 246]; // #EEF1F6
const INK = [20, 33, 61]; // #14213D
const SLATE = [91, 100, 120]; // slate.soft

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Generates and downloads a professional hospital-style prescription PDF.
 * @param {object} prescription - populated prescription document (doctorId populated, medicines array)
 * @param {object} patient - { name, phone } of the logged-in patient
 */
export function downloadPrescriptionPdf(prescription, patient) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // ---- Header band ----
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 96, "F");
  doc.setFillColor(...CRIMSON);
  doc.rect(0, 96, pageWidth, 4, "F");

  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text("HeartStone Hospital", margin, 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 224, 232);
  doc.text("Multi-specialty care, when it matters most", margin, 60);
  doc.text("123 Wellness Avenue, Ludhiana, Punjab, India  |  +91-161-000-0000  |  care@heartstone.com", margin, 74);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("PRESCRIPTION", pageWidth - margin, 42, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const shortId = (prescription._id || "").toString().slice(-8).toUpperCase();
  doc.text(`Ref: RX-${shortId}`, pageWidth - margin, 58, { align: "right" });
  doc.text(`Date: ${formatDate(prescription.createdAt || Date.now())}`, pageWidth - margin, 71, { align: "right" });

  let y = 130;

  // ---- Doctor + Patient info panels ----
  const panelWidth = (pageWidth - margin * 2 - 16) / 2;
  const doctor = prescription.doctorId || {};

  const drawPanel = (x, title, lines) => {
    doc.setDrawColor(...MIST);
    doc.setFillColor(...MIST);
    doc.roundedRect(x, y, panelWidth, 84, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...CRIMSON);
    doc.text(title.toUpperCase(), x + 14, y + 20);
    doc.setTextColor(...INK);
    let ly = y + 38;
    lines.forEach((line) => {
      if (!line) return;
      doc.setFont("helvetica", line.bold ? "bold" : "normal");
      doc.setFontSize(line.bold ? 10.5 : 9.5);
      doc.text(line.text, x + 14, ly);
      ly += 15;
    });
  };

  drawPanel(margin, "Attending Doctor", [
    { text: doctor.name || "Doctor", bold: true },
    { text: [doctor.designation, doctor.degree].filter(Boolean).join(" · ") || "—" },
    { text: doctor.registrationNo ? `Reg. No: ${doctor.registrationNo}` : null },
  ]);

  drawPanel(margin + panelWidth + 16, "Patient", [
    { text: patient?.name || "Patient", bold: true },
    { text: patient?.phone ? `Phone: ${patient.phone}` : null },
    { text: prescription.appointmentId?.appointmentCode ? `Appointment ID: ${prescription.appointmentId.appointmentCode}` : null },
  ]);

  y += 84 + 30;

  // ---- Rx symbol + section title ----
  doc.setFont("times", "bolditalic");
  doc.setFontSize(28);
  doc.setTextColor(...CRIMSON);
  doc.text("Rx", margin, y);
  doc.setDrawColor(...CRIMSON);
  doc.setLineWidth(1.2);
  doc.line(margin + 34, y - 8, pageWidth - margin, y - 8);

  y += 20;

  // ---- Medicines table ----
  const rows = (prescription.medicines || []).map((med, i) => [
    String(i + 1),
    med.name || "—",
    med.dosage || "—",
    med.quantity ? String(med.quantity) : "—",
    (med.availability || "pending").replace(/^\w/, (c) => c.toUpperCase()),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Medicine", "Dosage", "Qty", "Pharmacy status"]],
    body: rows,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9.5,
      cellPadding: 8,
      textColor: INK,
      lineColor: [222, 226, 234],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: {
      0: { cellWidth: 24, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 110 },
      3: { cellWidth: 50, halign: "center" },
      4: { cellWidth: 110 },
    },
  });

  let afterTableY = doc.lastAutoTable.finalY + 40;

  // ---- Signature + footer ----
  if (afterTableY > 700) {
    doc.addPage();
    afterTableY = 60;
  }

  doc.setDrawColor(...SLATE);
  doc.setLineWidth(0.75);
  doc.line(pageWidth - margin - 160, afterTableY, pageWidth - margin, afterTableY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE);
  doc.text("Doctor's signature", pageWidth - margin, afterTableY + 14, { align: "right" });
  if (doctor.name) {
    doc.text(doctor.name, pageWidth - margin, afterTableY - 6, { align: "right" });
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(
    "This is a digitally generated prescription issued through the HeartStone Hospital patient portal.",
    margin,
    afterTableY + 40
  );
  doc.text(
    "Please consult your pharmacist before substituting any medicine listed above.",
    margin,
    afterTableY + 52
  );

  // Bottom brand strip
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...MIST);
  doc.rect(0, pageHeight - 28, pageWidth, 28, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE);
  doc.text("HeartStone Hospital · Multi-specialty care, when it matters most", margin, pageHeight - 11);

  doc.save(`HeartStone-Prescription-${shortId}.pdf`);
}
