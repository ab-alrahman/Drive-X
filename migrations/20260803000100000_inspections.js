exports.up = (pgm) => {
  pgm.sql(`
DO $$ BEGIN
  CREATE TYPE inspection_requester_role AS ENUM ('SELLER', 'BUYER', 'RENTER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inspection_source_type AS ENUM ('EXTERNAL_FILE', 'TEMPLATE', 'DRIVEX_INSPECTION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inspection_round_status AS ENUM (
    'OPENED', 'INTERNAL_REVIEW', 'FILE_ACCEPTED', 'ESCALATED_TO_TECHNICIAN',
    'SCHEDULED', 'IN_PROGRESS', 'REPORT_SUBMITTED', 'CERTIFIED', 'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inspection_service_tier AS ENUM ('QUICK', 'COMPREHENSIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inspection_finding_severity AS ENUM ('MINOR', 'MODERATE', 'SEVERE', 'SAFETY_CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  city VARCHAR(80) NOT NULL,
  phone VARCHAR(30),
  service_tiers inspection_service_tier[] NOT NULL DEFAULT '{}',
  specialty VARCHAR(80),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL UNIQUE REFERENCES cars(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES inspection_cases(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  requested_by_role inspection_requester_role NOT NULL,
  requested_by_admin_id UUID REFERENCES admin_users(id),
  requested_by_customer_id UUID REFERENCES customer_users(id),
  source_type inspection_source_type NOT NULL,
  status inspection_round_status NOT NULL DEFAULT 'OPENED',
  template_data JSONB,
  external_file_url TEXT,
  technician_id UUID REFERENCES technicians(id),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  overall_verdict VARCHAR(40),
  price_amount NUMERIC(12,2),
  price_currency VARCHAR(3) CHECK (price_currency IS NULL OR price_currency IN ('USD', 'SYP')),
  paid_by VARCHAR(20) CHECK (paid_by IS NULL OR paid_by IN ('SELLER', 'BUYER', 'RENTER', 'DRIVEX')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, round_number)
);

CREATE TABLE IF NOT EXISTS inspection_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES inspection_rounds(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  severity inspection_finding_severity NOT NULL,
  estimated_repair_cost_amount NUMERIC(12,2),
  estimated_repair_cost_currency VARCHAR(3) CHECK (estimated_repair_cost_currency IS NULL OR estimated_repair_cost_currency IN ('USD', 'SYP')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspection_rounds_case ON inspection_rounds (case_id);
CREATE INDEX IF NOT EXISTS idx_inspection_rounds_status ON inspection_rounds (status);
CREATE INDEX IF NOT EXISTS idx_inspection_findings_round ON inspection_findings (round_id);
CREATE INDEX IF NOT EXISTS idx_technicians_city ON technicians (city);
`);
};

exports.down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS inspection_findings;
DROP TABLE IF EXISTS inspection_rounds;
DROP TABLE IF EXISTS inspection_cases;
DROP TABLE IF EXISTS technicians;
DROP TYPE IF EXISTS inspection_finding_severity;
DROP TYPE IF EXISTS inspection_service_tier;
DROP TYPE IF EXISTS inspection_round_status;
DROP TYPE IF EXISTS inspection_source_type;
DROP TYPE IF EXISTS inspection_requester_role;
`);
};
