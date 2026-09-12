const test = require("node:test");
const assert = require("node:assert/strict");
const {
  welcomeEmail,
  enquiryCustomerEmail,
  enquirySuperAdminEmail,
  bookingConfirmationEmail,
  bookingCancellationEmail,
  invoiceEmail,
} = require("../src/lib/emailTemplates");

test("all transactional templates use the branded email shell", () => {
  const enquiry = {
    enquiryId: "ENQ-001",
    name: "Asha <Test>",
    phone: "9876543210",
    email: "asha@example.com",
    pickupLocation: "Delhi",
    destination: "Jaipur",
    tripDate: "2026-09-29",
    returnDate: null,
    passengers: 4,
    message: "Need a comfortable bus",
    vehicleType: "Tempo Traveller",
    selectedVehicles: [],
  };
  const booking = {
    bookingId: "BK-001",
    customerSnapshot: { name: "Asha" },
    journey: { pickup: "Delhi", destination: "Jaipur", journeyStart: "2026-09-29", passengers: 4 },
    vehicles: [],
    pricing: { totalAmount: 15000 },
  };
  const invoice = {
    customerSnapshot: { name: "Asha" },
    invoiceNumber: "INV-001",
    invoiceDate: "2026-09-29",
    total: 15000,
    amountReceived: 5000,
    balance: 10000,
  };

  const html = [
    welcomeEmail({ name: "Asha" }),
    enquiryCustomerEmail({ enquiry }),
    enquirySuperAdminEmail({ enquiry }),
    bookingConfirmationEmail({ booking }),
    bookingCancellationEmail({ booking: { ...booking, cancellationReason: "Customer request" } }),
    invoiceEmail({ invoice }),
  ];

  for (const output of html) {
    assert.match(output, /Kuwarji Travels/i);
    assert.match(output, /background:#082d63/);
    assert.match(output, /kuwarji-travels-logo\.png/);
  }

  assert.match(enquiryCustomerEmail({ enquiry }), /Asha &lt;Test&gt;/);
});
