const express = require("express");
const { z } = require("zod");
const { connectToDatabase } = require("../lib/mongodb");
const { Vehicle } = require("../models/Vehicle");
const { VehicleCategory } = require("../models/VehicleCategory");
const { VehicleAmenity } = require("../models/VehicleAmenity");
const { PricingRule } = require("../models/PricingRule");

const router = express.Router();

// Only these fields are ever sent to the public API — internal fleet data
// (registrationNumber, etc.) is excluded at the query level, not just by
// convention, via `.select()`.
const PUBLIC_VEHICLE_FIELDS =
  "name categoryId capacity acType seatType amenities amenityIds photos description rentalInfo status ratingAvg ratingCount priority";

// Resolves the display amenity list: the proper amenityIds relation
// (Phase 2) takes priority when populated, falling back to the legacy
// free-text `amenities` array so older/seeded vehicles still show
// something. `amenityById` is a Map<string, {name}> for active amenities.
function resolveAmenityNames(v, amenityById) {
  if (v.amenityIds?.length) {
    return v.amenityIds
      .map((id) => amenityById.get(id.toString())?.name)
      .filter(Boolean);
  }
  return v.amenities || [];
}

function sortedPhotoUrls(photos, predicate = () => true) {
  return [...(photos || [])]
    .filter(predicate)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.order - b.order)
    .map((p) => p.url);
}

function serializeVehicle(v, category, startingPrice, amenityById = new Map()) {
  const portalPhotos = sortedPhotoUrls(v.photos, (p) => p.showInPortal !== false);
  const explicitlySelectedLanding = sortedPhotoUrls(v.photos, (p) => p.showOnLanding === true);
  // Backward compatibility for vehicles created before landing permissions: use
  // the primary image until an admin explicitly selects a landing image.
  const landingPhotos = explicitlySelectedLanding.length
    ? explicitlySelectedLanding
    : sortedPhotoUrls(v.photos, (p) => p.isPrimary === true).slice(0, 1);

  return {
    id: v._id.toString(),
    name: v.name,
    category: category ? { id: category._id.toString(), name: category.name, slug: category.slug } : null,
    capacity: v.capacity,
    acType: v.acType,
    seatType: v.seatType,
    amenities: resolveAmenityNames(v, amenityById),
    // Customer portal: only images explicitly allowed by admin.
    photos: portalPhotos,
    // Landing page: only the admin-selected image.
    landingPhotos,
    description: v.description,
    rentalInfo: v.rentalInfo || "",
    status: v.status,
    ratingAvg: v.ratingAvg,
    ratingCount: v.ratingCount,
    startingPrice, // per-day rate from the active pricing rule, or null if unconfigured
  };
}

// --- Public: list active categories ---
router.get("/categories", async (req, res) => {
  try {
    await connectToDatabase();
    const categories = await VehicleCategory.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    return res.json({
      success: true,
      categories: categories.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
      })),
    });
  } catch (err) {
    console.error("categories list error", err);
    return res.status(500).json({ success: false, error: "Failed to load categories." });
  }
});

const searchQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().optional(),
  acType: z.enum(["AC", "NON_AC"]).optional(),
  seatType: z.enum(["SEATER", "SLEEPER", "SEMI_SLEEPER"]).optional(),
  minCapacity: z.coerce.number().int().positive().optional(),
  maxCapacity: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: z.enum(["recommended", "price_asc", "price_desc", "capacity", "rating"]).default("recommended"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
});

// --- Public: search/list vehicles with server-side filters + pagination ---
router.get("/", async (req, res) => {
  try {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Invalid search parameters." });
    }
    const q = parsed.data;

    await connectToDatabase();

    // The public catalogue is a fleet catalogue, not a live availability list.
    // A vehicle can remain visible even while another booking uses it; the
    // booking flow performs the date-range conflict check separately.
    const filter = { status: { $nin: ["INACTIVE", "MAINTENANCE"] }, deletedAt: null };

    if (q.search) {
      const rawSearch = q.search.toLowerCase().trim();
      const rawTerms = rawSearch.split(/[^a-z0-9]+/).filter(Boolean);
      const normalized = rawSearch.replace(/[^a-z0-9]+/g, "");
      const numericSeats = rawTerms.map(Number).find((n) => Number.isInteger(n) && n > 0 && n < 200);
      const hasAc = rawTerms.includes("ac") || rawTerms.includes("air") || rawTerms.includes("conditioned");
      const hasNonAc = normalized.includes("nonac") || rawTerms.includes("nonac");
      const seatSleeper = rawTerms.some((t) => t.includes("sleeper"));
      const seatSemi = rawTerms.some((t) => t.includes("semi"));
      const seatSeater = rawTerms.some((t) => t.includes("seater") || t.includes("seats"));
      const stopWords = new Set(["bus","vehicle","vehicles","coach","travel","traveller","traveler","car","van","the","and","with","for","a","an"]);
      const textTerms = rawTerms.filter((t) => !stopWords.has(t) && !/^\d+$/.test(t) && !["ac","nonac","seater","seats","sleeper","semi","air","conditioned"].includes(t));
      const searchAnd = [];

      if (numericSeats) searchAnd.push({ capacity: numericSeats });
      if (hasAc && !hasNonAc) searchAnd.push({ acType: "AC" });
      if (hasNonAc) searchAnd.push({ acType: "NON_AC" });
      if (seatSleeper && !seatSemi) searchAnd.push({ seatType: "SLEEPER" });
      if (seatSemi) searchAnd.push({ seatType: "SEMI_SLEEPER" });
      if (seatSeater && !seatSleeper && !seatSemi) searchAnd.push({ seatType: "SEATER" });

      for (const term of textTerms) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const r = { $regex: escaped, $options: "i" };
        const [matchingCategories, matchingAmenities] = await Promise.all([
          VehicleCategory.find({ $or: [{ name: r }, { description: r }, { slug: r }], isActive: true }).select("_id").lean(),
          VehicleAmenity.find({ name: r, isActive: true }).select("_id").lean(),
        ]);
        const termOr = [{ name: r }, { description: r }, { rentalInfo: r }, { amenities: r }];
        if (matchingCategories.length) termOr.push({ categoryId: { $in: matchingCategories.map((c) => c._id) } });
        if (matchingAmenities.length) termOr.push({ amenityIds: { $in: matchingAmenities.map((a) => a._id) } });
        searchAnd.push({ $or: termOr });
      }

      if (searchAnd.length) filter.$and = searchAnd;
    }

    if (q.category) {
      const category = await VehicleCategory.findOne({ slug: q.category, isActive: true }).lean();
      if (!category) {
        return res.json({ success: true, vehicles: [], page: q.page, limit: q.limit, total: 0 });
      }
      filter.categoryId = category._id;
    }
    if (q.acType) filter.acType = q.acType;
    if (q.seatType) filter.seatType = q.seatType;
    if (q.minCapacity || q.maxCapacity) {
      filter.capacity = {};
      if (q.minCapacity) filter.capacity.$gte = q.minCapacity;
      if (q.maxCapacity) filter.capacity.$lte = q.maxCapacity;
    }

    // Pull a working set, then attach starting price (from PricingRule) and
    // apply price filter/sort in memory — price lives in a separate
    // collection, and the catalog is small enough that this stays fast
    // without needing a materialized denormalized field yet.
    const [vehicles, categories, amenities] = await Promise.all([
      Vehicle.find(filter).select(PUBLIC_VEHICLE_FIELDS).lean(),
      VehicleCategory.find({}).lean(),
      VehicleAmenity.find({ isActive: true }).lean(),
    ]);
    const categoryById = new Map(categories.map((c) => [c._id.toString(), c]));
    const amenityById = new Map(amenities.map((a) => [a._id.toString(), a]));

    const vehicleIds = vehicles.map((v) => v._id);
    const activeRules = await PricingRule.find({ vehicleId: { $in: vehicleIds }, isActive: true })
      .select("vehicleId perDayRate")
      .lean();
    const priceByVehicle = new Map(activeRules.map((r) => [r.vehicleId.toString(), r.perDayRate]));

    let results = vehicles.map((v) => ({
      vehicle: v,
      category: categoryById.get(v.categoryId.toString()),
      price: priceByVehicle.get(v._id.toString()) ?? null,
    }));

    if (q.minPrice != null) results = results.filter((r) => r.price != null && r.price >= q.minPrice);
    if (q.maxPrice != null) results = results.filter((r) => r.price != null && r.price <= q.maxPrice);

    switch (q.sort) {
      case "price_asc":
        results.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
        break;
      case "price_desc":
        results.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
        break;
      case "capacity":
        results.sort((a, b) => b.vehicle.capacity - a.vehicle.capacity);
        break;
      case "rating":
        results.sort((a, b) => b.vehicle.ratingAvg - a.vehicle.ratingAvg);
        break;
      default:
        // "recommended" — admin priority first, then rating, then recency
        // of the doc (all real signals, no invented AI claim).
        results.sort(
          (a, b) =>
            (b.vehicle.priority ?? 0) - (a.vehicle.priority ?? 0) ||
            b.vehicle.ratingAvg - a.vehicle.ratingAvg
        );
    }

    const total = results.length;
    const start = (q.page - 1) * q.limit;
    const page = results.slice(start, start + q.limit);

    return res.json({
      success: true,
      vehicles: page.map((r) => serializeVehicle(r.vehicle, r.category, r.price, amenityById)),
      page: q.page,
      limit: q.limit,
      total,
    });
  } catch (err) {
    console.error("vehicle search error", err);
    return res.status(500).json({ success: false, error: "Failed to search vehicles." });
  }
});

// --- Public: vehicle detail ---
router.get("/:id", async (req, res) => {
  try {
    await connectToDatabase();
    const vehicle = await Vehicle.findOne({ _id: req.params.id, deletedAt: null })
      .select(PUBLIC_VEHICLE_FIELDS)
      .lean();
    // Public vehicle pages are catalogue pages. BOOKED vehicles remain
    // visible; only inactive/maintenance/soft-deleted vehicles are hidden.
    if (!vehicle || ["INACTIVE", "MAINTENANCE"].includes(vehicle.status)) {
      return res.status(404).json({ success: false, error: "Vehicle not found." });
    }
    const [category, pricingRule, amenities] = await Promise.all([
      VehicleCategory.findById(vehicle.categoryId).lean(),
      PricingRule.findOne({ vehicleId: vehicle._id, isActive: true }).lean(),
      VehicleAmenity.find({ isActive: true }).lean(),
    ]);
    const amenityById = new Map(amenities.map((a) => [a._id.toString(), a]));

    return res.json({
      success: true,
      vehicle: serializeVehicle(vehicle, category, pricingRule?.perDayRate ?? null, amenityById),
      pricing: pricingRule
        ? {
            perDayRate: pricingRule.perDayRate,
            driverAllowancePerDay: pricingRule.driverAllowancePerDay,
            tollDefault: pricingRule.tollDefault,
            parkingDefault: pricingRule.parkingDefault,
            taxPercent: pricingRule.taxPercent,
            cancellationPolicy: pricingRule.cancellationPolicy,
          }
        : null,
    });
  } catch (err) {
    console.error("vehicle detail error", err);
    return res.status(500).json({ success: false, error: "Failed to load vehicle." });
  }
});

module.exports = router;
