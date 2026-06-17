-- Align StudioSubscriptionPlan with official Stripe monthly prices (EUR).

UPDATE "StudioSubscriptionPlan"
SET
  "monthlyPriceEur" = 7.99,
  "yearlyPriceEur" = 79.9,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'creator';

UPDATE "StudioSubscriptionPlan"
SET
  "monthlyPriceEur" = 24.99,
  "yearlyPriceEur" = 249.9,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'pro';

UPDATE "StudioSubscriptionPlan"
SET
  "monthlyPriceEur" = 79.99,
  "yearlyPriceEur" = 799.9,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'studio';
