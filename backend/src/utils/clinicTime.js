// HeartStone runs for a single clinic in India (IST, UTC+5:30, no DST).
//
// Doctor availability (DoctorSlot.time) is stored as a plain "HH:MM" string typed in by
// the admin - it always means "this clock time at the clinic", not any particular UTC
// offset. Appointment booking, on the other hand, sends a real timestamp (a full ISO
// string built in the patient's browser). To compare the two we must read that timestamp
// back as clinic wall-clock time - NOT using the Node process's own OS timezone, which is
// commonly UTC on hosting providers and does not match IST. Using Date.getHours()/getDay()
// directly reads the *server's* local timezone and was causing booking to look for a
// doctor at the wrong hour/day ("No doctor is scheduled for that slot").
const IST_OFFSET_MINUTES = 5 * 60 + 30;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

// Given any Date-parseable value (a real instant in time), return the day-of-week (0-6,
// Sun-Sat) and "HH:MM" clock time it represents in India, independent of server timezone.
export const toClinicParts = (dateLike) => {
  const utcMs = new Date(dateLike).getTime();
  const ist = new Date(utcMs + IST_OFFSET_MS);

  const dayOfWeek = ist.getUTCDay();
  const hh = String(ist.getUTCHours()).padStart(2, '0');
  const mm = String(ist.getUTCMinutes()).padStart(2, '0');

  return { dayOfWeek, time: `${hh}:${mm}` };
};

// Given a date-only string like "2026-07-25" (e.g. from a <input type="date">), return the
// day-of-week (0-6) that calendar date falls on. Pure calendar arithmetic - deliberately
// uses getUTCDay() (matching how date-only strings are parsed, as UTC midnight) so it never
// depends on the server's local timezone.
export const dateStringDayOfWeek = (dateStr) => new Date(dateStr).getUTCDay();

// Given a date-only string like "2026-07-25", return the [startOfDay, endOfDay] instants
// (real UTC Dates) that correspond to midnight-to-midnight in India for that calendar date.
export const clinicDayBounds = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MS;
  const startOfDay = new Date(startUtcMs);
  const endOfDay = new Date(startUtcMs + 24 * 60 * 60 * 1000 - 1);
  return { startOfDay, endOfDay };
};
