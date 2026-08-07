// Pillar 2 completion - items 23b/25 of the TODO:
//   - vendors: auto-flag columns (3+ substantiated complaints in 30 days FLAGS, not suspends)
//   - platform_settings: single flat platform-wide commission take-rate (item 25)
//   - complaints: buyer-complaint queue reviewed by Platform Admin
exports.up = (pgm) => {
  pgm.sql(`
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS flagged_reason TEXT;

CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(80) NOT NULL UNIQUE,
  value NUMERIC(12,4) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Single flat platform-wide take-rate at launch (e.g. 2.5% on every completed deal, any
-- vendor) - NOT per-vendor negotiated, NOT volume-tiered yet.
INSERT INTO platform_settings (key, value) VALUES ('commission_rate_percent', 2.5)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customer_users(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'SUBSTANTIATED', 'DISMISSED', 'RESOLVED')),
  reviewed_by UUID REFERENCES admin_users(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_car ON complaints (car_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints (status);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints (created_at);
`);
};

exports.down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS platform_settings;
ALTER TABLE vendors DROP COLUMN IF EXISTS flagged_reason;
ALTER TABLE vendors DROP COLUMN IF EXISTS flagged_at;
`);
};
