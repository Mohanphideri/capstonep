const MS_PER_DAY = 24 * 60 * 60 * 1000;

class PricingError extends Error {}

/**
 * Whole-day count between journeyStart and journeyEnd, rounded up so a
 * same-day or partial-day trip still bills a minimum of 1 day. This is the
 * unit `perDayRate` is billed against, since there's no distance/maps
 * service configured to price by route km.
 */
function daysBetween(journeyStart, journeyEnd) {
  const ms = new Date(journeyEnd).getTime() - new Date(journeyStart).getTime();
  if (!Number.isFinite(ms) || ms <= 0) {
    throw new PricingError("Return date must be after the journey date.");
  }
  return Math.max(1, Math.ceil(ms / MS_PER_DAY));
}

/**
 * Computes a full price breakdown from an active PricingRule document and
 * journey dates. Every figure here is derived from admin-configured rates
 * — nothing is hard-coded or guessed. `discount`/`couponCode` are resolved
 * by the caller (coupon lookup) and passed in already validated.
 */
function calculatePrice({ pricingRule, journeyStart, journeyEnd, discount = 0, couponCode = null }) {
  if (!pricingRule) {
    throw new PricingError("No active pricing is configured for this vehicle yet.");
  }

  const days = daysBetween(journeyStart, journeyEnd);

  const baseFare = pricingRule.perDayRate * days;
  const driverAllowance = (pricingRule.driverAllowancePerDay || 0) * days;
  const toll = pricingRule.tollDefault || 0;
  const parking = pricingRule.parkingDefault || 0;

  const subtotal = baseFare + driverAllowance + toll + parking - discount;
  const taxableAmount = Math.max(0, subtotal);
  const taxAmount = Math.round((taxableAmount * (pricingRule.taxPercent || 0)) / 100);

  const totalAmount = Math.max(0, Math.round(taxableAmount + taxAmount));

  return {
    pricingRuleId: pricingRule._id,
    pricingRuleVersion: pricingRule.version,
    days,
    perDayRate: pricingRule.perDayRate,
    baseFare,
    driverAllowance,
    toll,
    parking,
    taxPercent: pricingRule.taxPercent || 0,
    taxAmount,
    discount,
    couponCode,
    totalAmount,
    currency: "INR",
  };
}

/**
 * Refund amount for a cancellation, based on the pricing rule's own
 * cancellation policy tiers (never a hard-coded percentage).
 */
function calculateRefund({ pricingRule, paidAmount, journeyStart, now = new Date() }) {
  const tiers = pricingRule?.cancellationPolicy?.tiers?.length
    ? [...pricingRule.cancellationPolicy.tiers].sort(
        (a, b) => b.minDaysBeforeJourney - a.minDaysBeforeJourney
      )
    : [{ minDaysBeforeJourney: 0, refundPercent: 0 }];

  const daysBeforeJourney = Math.floor(
    (new Date(journeyStart).getTime() - now.getTime()) / MS_PER_DAY
  );

  const tier =
    tiers.find((t) => daysBeforeJourney >= t.minDaysBeforeJourney) || tiers[tiers.length - 1];

  const refundPercent = tier.refundPercent;
  const refundAmount = Math.round((paidAmount * refundPercent) / 100);
  const cancellationCharge = paidAmount - refundAmount;

  return { refundPercent, refundAmount, cancellationCharge, daysBeforeJourney };
}

module.exports = { PricingError, calculatePrice, calculateRefund, daysBetween };
