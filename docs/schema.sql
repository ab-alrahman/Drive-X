-- PostgreSQL schema aligned with openapi.yaml (v2.0.0)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE listing_type AS ENUM ('SALE', 'RENT', 'BOTH');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transmission_type AS ENUM ('AUTOMATIC', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fuel_type AS ENUM ('GASOLINE', 'DIESEL', 'HYBRID', 'ELECTRIC');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE car_condition AS ENUM ('NEW', 'USED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE car_status AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'RENTED', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_intent AS ENUM ('BUY', 'RENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('NEW', 'CONTACTED', 'NEGOTIATING', 'APPROVED', 'REJECTED', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE deal_type AS ENUM ('SALE', 'RENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE commission_type AS ENUM ('PERCENTAGE', 'FIXED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM ('OWNER', 'STAFF', 'PLATFORM_ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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
    'SCHEDULED', 'IN_PROGRESS', 'REPORT_SUBMITTED', 'CERTIFIED', 'CANCELLED', 'FLAGGED_FRAUDULENT'
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

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT,
  -- Auto-set by the 3+ substantiated-complaints-in-30-days rule; FLAGS for Platform Admin
  -- review, does NOT suspend (a human makes the final suspend call).
  flagged_at TIMESTAMPTZ,
  flagged_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(120),
  role admin_role NOT NULL DEFAULT 'OWNER',
  -- NULL = Platform Admin (oversees every vendor); set = scoped to that vendor as OWNER/STAFF.
  vendor_id UUID REFERENCES vendors(id) ON DELETE RESTRICT,
  token_version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_users_role_vendor_check CHECK (
    (role = 'PLATFORM_ADMIN' AND vendor_id IS NULL) OR
    (role IN ('OWNER', 'STAFF') AND vendor_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS platform_admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id),
  action VARCHAR(40) NOT NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('VENDOR', 'CAR')),
  target_id UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  brand VARCHAR(80) NOT NULL,
  model VARCHAR(80) NOT NULL,
  year INT NOT NULL CHECK (year >= 1980 AND year <= 2100),
  listing_type listing_type NOT NULL,
  condition car_condition NOT NULL,
  status car_status NOT NULL,
  sale_price_amount NUMERIC(12,2),
  sale_price_currency VARCHAR(3) CHECK (sale_price_currency IS NULL OR sale_price_currency IN ('USD', 'SYP')),
  daily_rent_price_amount NUMERIC(12,2),
  daily_rent_price_currency VARCHAR(3) CHECK (daily_rent_price_currency IS NULL OR daily_rent_price_currency IN ('USD', 'SYP')),
  monthly_rent_price_amount NUMERIC(12,2),
  monthly_rent_price_currency VARCHAR(3) CHECK (monthly_rent_price_currency IS NULL OR monthly_rent_price_currency IN ('USD', 'SYP')),
  mileage_km INT CHECK (mileage_km >= 0),
  transmission transmission_type,
  fuel_type fuel_type,
  color VARCHAR(40),
  city VARCHAR(80),
  engine VARCHAR(40) NOT NULL,
  seats INT NOT NULL CHECK (seats > 0),
  drivetrain VARCHAR(40),
  horsepower INT CHECK (horsepower > 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id),
  deleted_at TIMESTAMPTZ,
  -- Orthogonal to the vendor's own status field - set by Platform Admin oversight actions
  -- (see platform_admin_actions); unset restores exactly whatever status the vendor had set.
  hidden_by_platform_at TIMESTAMPTZ,
  hidden_reason TEXT,
  CONSTRAINT chk_sale_price_required
    CHECK (
      listing_type NOT IN ('SALE', 'BOTH') OR sale_price_amount IS NOT NULL
    ),
  CONSTRAINT chk_rent_price_required
    CHECK (
      listing_type NOT IN ('RENT', 'BOTH') OR (daily_rent_price_amount IS NOT NULL OR monthly_rent_price_amount IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS car_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_key TEXT,
  local_path TEXT,
  mime_type VARCHAR(100),
  size_bytes INT CHECK (size_bytes IS NULL OR size_bytes >= 0),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id),
  intent lead_intent NOT NULL,
  status lead_status NOT NULL DEFAULT 'NEW',
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(255),
  city VARCHAR(80),
  message TEXT,
  rental_start_date DATE,
  rental_end_date DATE,
  request_delivery BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_address VARCHAR(500),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id),
  CONSTRAINT chk_rent_dates
    CHECK (
      intent <> 'RENT' OR rental_start_date IS NOT NULL
    )
);

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL UNIQUE REFERENCES leads(id),
  car_id UUID NOT NULL REFERENCES cars(id),
  type deal_type NOT NULL,
  final_price_amount NUMERIC(12,2) NOT NULL CHECK (final_price_amount >= 0),
  final_price_currency VARCHAR(3) NOT NULL CHECK (final_price_currency IN ('USD', 'SYP')),
  commission_type commission_type NOT NULL,
  commission_value NUMERIC(12,4) NOT NULL CHECK (commission_value >= 0),
  commission_amount NUMERIC(12,2) NOT NULL CHECK (commission_amount >= 0),
  commission_currency VARCHAR(3) NOT NULL CHECK (commission_currency IN ('USD', 'SYP')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id)
);

CREATE TABLE IF NOT EXISTS customer_favorites (
  customer_user_id UUID NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (customer_user_id, car_id)
);

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

CREATE INDEX IF NOT EXISTS idx_cars_brand_model ON cars (brand, model);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars (status);
CREATE INDEX IF NOT EXISTS idx_cars_listing_type ON cars (listing_type);
CREATE INDEX IF NOT EXISTS idx_cars_price_sale ON cars (sale_price_amount);
CREATE INDEX IF NOT EXISTS idx_cars_deleted_at ON cars (deleted_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_admin_user ON refresh_tokens (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_customer_refresh_tokens_user ON customer_refresh_tokens (customer_user_id);
CREATE INDEX IF NOT EXISTS idx_customer_refresh_tokens_expires_at ON customer_refresh_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_intent ON leads (intent);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_favorites_car ON customer_favorites (car_id);
CREATE INDEX IF NOT EXISTS idx_inspection_rounds_case ON inspection_rounds (case_id);
CREATE INDEX IF NOT EXISTS idx_inspection_rounds_status ON inspection_rounds (status);
CREATE INDEX IF NOT EXISTS idx_inspection_findings_round ON inspection_findings (round_id);
CREATE INDEX IF NOT EXISTS idx_technicians_city ON technicians (city);
CREATE INDEX IF NOT EXISTS idx_admin_users_vendor ON admin_users (vendor_id);
CREATE INDEX IF NOT EXISTS idx_cars_vendor ON cars (vendor_id);
CREATE INDEX IF NOT EXISTS idx_platform_admin_actions_target ON platform_admin_actions (target_type, target_id);

-- Flat platform-wide take-rate (single row, key = 'commission_rate_percent').
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(80) NOT NULL UNIQUE,
  value NUMERIC(12,4) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  assigned_partner_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
  preferred_partner_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_preferred_partner ON maintenance_requests (preferred_partner_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests (status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created ON maintenance_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_updates_request ON maintenance_updates (request_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_files_request ON maintenance_request_files (request_id);

CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (car_id, customer_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('CUSTOMER', 'VENDOR')),
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_customer ON chat_threads (customer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_threads_vendor ON chat_threads (vendor_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages (thread_id, created_at);
