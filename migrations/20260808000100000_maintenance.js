exports.up = (pgm) => {
  pgm.sql(`
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  assigned_partner_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
  request_type VARCHAR(30) NOT NULL CHECK (
    request_type IN ('ROUTINE_SERVICE', 'REPAIR', 'DIAGNOSTIC', 'BODY_PAINT', 'TIRES_BRAKES', 'EMERGENCY', 'OTHER')
  ),
  status VARCHAR(40) NOT NULL DEFAULT 'NEW' CHECK (
    status IN (
      'NEW', 'ADMIN_REVIEW', 'TRIAGED', 'SENT_TO_VENDOR', 'VENDOR_ACKNOWLEDGED',
      'ASSIGNED_TO_PARTNER', 'SCHEDULED', 'IN_PROGRESS', 'WAITING_CUSTOMER_APPROVAL',
      'COMPLETED', 'CANCELLED', 'REJECTED'
    )
  ),
  city VARCHAR(80) NOT NULL,
  preferred_time TIMESTAMPTZ,
  pickup_needed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL,
  contact_phone VARCHAR(30) NOT NULL,
  quoted_amount NUMERIC(12,2),
  quoted_currency VARCHAR(3) CHECK (quoted_currency IS NULL OR quoted_currency IN ('USD', 'SYP')),
  approved_amount NUMERIC(12,2),
  approved_currency VARCHAR(3) CHECK (approved_currency IS NULL OR approved_currency IN ('USD', 'SYP')),
  quote_approved_at TIMESTAMPTZ,
  public_summary TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_request_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  storage_key TEXT,
  file_type VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  author_role VARCHAR(30) NOT NULL CHECK (author_role IN ('CUSTOMER', 'VENDOR', 'PLATFORM_ADMIN', 'SYSTEM')),
  author_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  author_customer_id UUID REFERENCES customer_users(id) ON DELETE SET NULL,
  status_from VARCHAR(40),
  status_to VARCHAR(40),
  note TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_customer ON maintenance_requests (customer_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_car ON maintenance_requests (car_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_deal ON maintenance_requests (deal_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_vendor ON maintenance_requests (vendor_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests (status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created ON maintenance_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_updates_request ON maintenance_updates (request_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_files_request ON maintenance_request_files (request_id);
`);
};

exports.down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS maintenance_updates;
DROP TABLE IF EXISTS maintenance_request_files;
DROP TABLE IF EXISTS maintenance_requests;
`);
};
