-- Align plan storage limits with official subscription tiers (GB).

UPDATE "StudioSubscriptionPlan"
SET "storageLimitGb" = 5, "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'creator';

UPDATE "StudioSubscriptionPlan"
SET "storageLimitGb" = 25, "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'pro';

UPDATE "StudioSubscriptionPlan"
SET "storageLimitGb" = 100, "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'studio';

UPDATE "StudioBillingPolicy"
SET
  "plansJson" = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(COALESCE("plansJson"::jsonb, '{}'::jsonb), '{free,storageLimitGb}', '1'::jsonb),
        '{creator,storageLimitGb}',
        '5'::jsonb
      ),
      '{pro,storageLimitGb}',
      '25'::jsonb
    ),
    '{studio,storageLimitGb}',
    '100'::jsonb
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'default';
