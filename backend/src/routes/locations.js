const express = require("express");
const router = express.Router();
const { INDIA_STATES_DISTRICTS } = require("../lib/indiaStatesDistricts");

// All 28 states + 8 union territories of India, each with their full
// district list — powers the State → District dropdowns used when a
// customer or admin submits a review (and anywhere else a location needs
// to be captured consistently instead of free text).
router.get("/states", (_req, res) =>
  res.json({
    success: true,
    states: Object.entries(INDIA_STATES_DISTRICTS)
      .map(([name, districts]) => ({ name, code: name.slice(0, 2).toUpperCase(), districts }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  })
);

router.get("/districts/:state", (req, res) =>
  res.json({
    success: true,
    state: req.params.state,
    districts: INDIA_STATES_DISTRICTS[req.params.state] || [],
  })
);

module.exports = router;
