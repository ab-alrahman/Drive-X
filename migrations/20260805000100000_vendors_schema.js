exports.up = (pgm) => {
  pgm.sql(`
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'PLATFORM_ADMIN';

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE RESTRICT;

-- Nullable for now - backfilled and locked to NOT NULL in the next migration, since existing
-- rows don't have a vendor yet.
ALTER TABLE cars ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE RESTRICT;

-- Orthogonal to the vendor's own "status" field: Platform Admin hiding a listing (e.g. a
-- confirmed falsified maintenance file, or an escalated complaint) doesn't touch the vendor's
-- own AVAILABLE/RESERVED/etc. status, so un-hiding restores exactly what the vendor had set.
ALTER TABLE cars ADD COLUMN IF NOT EXISTS hidden_by_platform_at TIMESTAMPTZ;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

CREATE TABLE IF NOT EXISTS platform_admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id),
  action VARCHAR(40) NOT NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('VENDOR', 'CAR')),
  target_id UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_vendor ON admin_users (vendor_id);
CREATE INDEX IF NOT EXISTS idx_cars_vendor ON cars (vendor_id);
CREATE INDEX IF NOT EXISTS idx_platform_admin_actions_target ON platform_admin_actions (target_type, target_id);
`);
};

exports.down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS platform_admin_actions;
ALTER TABLE cars DROP COLUMN IF EXISTS hidden_reason;
ALTER TABLE cars DROP COLUMN IF EXISTS hidden_by_platform_at;
ALTER TABLE cars DROP COLUMN IF EXISTS vendor_id;
ALTER TABLE admin_users DROP COLUMN IF EXISTS vendor_id;
DROP TABLE IF EXISTS vendors;
`);
};
