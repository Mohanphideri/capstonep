/**
 * DEVELOPMENT / DEMO SEED DATA ONLY.
 *
 * Populates a small example fleet (categories, vehicles, pricing rules) so
 * the consumer-facing search/booking flow can actually be exercised
 * end-to-end. None of this is real Kuwarji Travels fleet or pricing
 * information — every vehicle name, capacity, and rate here is a
 * placeholder for admin to replace once real fleet data is entered
 * through the admin portal.
 *
 * Run with: node scripts/seedVehicles.js
 */
require("dotenv").config();
const { connectToDatabase } = require("../src/lib/mongodb");
const { VehicleCategory } = require("../src/models/VehicleCategory");
const { Vehicle } = require("../src/models/Vehicle");
const { PricingRule } = require("../src/models/PricingRule");

const CATEGORIES = [
  { name: "Volvo", slug: "volvo", icon: "luxury", sortOrder: 1 },
  { name: "AC Bus", slug: "ac-bus", icon: "bus", sortOrder: 2 },
  { name: "Non-AC Bus", slug: "non-ac-bus", icon: "bus", sortOrder: 3 },
  { name: "Sleeper", slug: "sleeper", icon: "sleeper", sortOrder: 4 },
  { name: "Tempo Traveller", slug: "tempo-traveller", icon: "van", sortOrder: 5 },
];

// [DEV SEED] Placeholder fleet — replace via the admin portal.
const VEHICLES = [
  {
    categorySlug: "volvo",
    name: "Volvo 9600 Multi-Axle [DEV SEED]",
    capacity: 45,
    acType: "AC",
    seatType: "SEATER",
    amenities: ["Reclining seats", "Charging points", "Reading lights", "Curtains"],
    description: "Example Volvo multi-axle coach for long-distance outstation trips. Placeholder listing.",
    perDayRate: 18000,
    driverAllowancePerDay: 800,
  },
  {
    categorySlug: "ac-bus",
    name: "AC Seater 40-Seater [DEV SEED]",
    capacity: 40,
    acType: "AC",
    seatType: "SEATER",
    amenities: ["AC", "Charging points", "Music system"],
    description: "Example AC seater bus, suited for group travel and day trips. Placeholder listing.",
    perDayRate: 12000,
    driverAllowancePerDay: 600,
  },
  {
    categorySlug: "sleeper",
    name: "AC Sleeper Coach [DEV SEED]",
    capacity: 30,
    acType: "AC",
    seatType: "SLEEPER",
    amenities: ["Sleeper berths", "AC", "Blankets", "Charging points"],
    description: "Example AC sleeper coach for overnight outstation journeys. Placeholder listing.",
    perDayRate: 16000,
    driverAllowancePerDay: 800,
  },
  {
    categorySlug: "non-ac-bus",
    name: "Non-AC Seater 50-Seater [DEV SEED]",
    capacity: 50,
    acType: "NON_AC",
    seatType: "SEATER",
    amenities: ["Music system"],
    description: "Example non-AC seater bus for budget group travel. Placeholder listing.",
    perDayRate: 8000,
    driverAllowancePerDay: 500,
  },
  {
    categorySlug: "tempo-traveller",
    name: "17-Seater Tempo Traveller [DEV SEED]",
    capacity: 17,
    acType: "AC",
    seatType: "SEATER",
    amenities: ["AC", "Pushback seats", "Charging points"],
    description: "Example tempo traveller for small group trips and airport transfers. Placeholder listing.",
    perDayRate: 6000,
    driverAllowancePerDay: 400,
  },
];

async function seed() {
  await connectToDatabase();

  const categoryBySlug = new Map();
  for (const c of CATEGORIES) {
    const category = await VehicleCategory.findOneAndUpdate(
      { slug: c.slug },
      { $setOnInsert: c },
      { upsert: true, new: true }
    );
    categoryBySlug.set(c.slug, category);
  }
  console.log(`[seed] Ensured ${categoryBySlug.size} vehicle categories.`);

  let vehicleCount = 0;
  let ruleCount = 0;

  for (const v of VEHICLES) {
    const category = categoryBySlug.get(v.categorySlug);
    let vehicle = await Vehicle.findOne({ name: v.name });
    if (!vehicle) {
      vehicle = await Vehicle.create({
        name: v.name,
        categoryId: category._id,
        capacity: v.capacity,
        acType: v.acType,
        seatType: v.seatType,
        amenities: v.amenities,
        description: v.description,
        status: "AVAILABLE",
        photos: [],
      });
      vehicleCount += 1;
    }

    const existingRule = await PricingRule.findOne({ vehicleId: vehicle._id, isActive: true });
    if (!existingRule) {
      await PricingRule.create({
        vehicleId: vehicle._id,
        version: 1,
        isActive: true,
        perDayRate: v.perDayRate,
        driverAllowancePerDay: v.driverAllowancePerDay,
        tollDefault: 0,
        parkingDefault: 0,
        taxPercent: 5,
      });
      ruleCount += 1;
    }
  }

  console.log(`[seed] Created ${vehicleCount} vehicles and ${ruleCount} pricing rules.`);
  console.log("[seed] Done. This is DEV/DEMO data — replace it via the admin portal before going live.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
