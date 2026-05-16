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
  CREATE TYPE admin_role AS ENUM ('OWNER', 'STAFF');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(120),
  role admin_role NOT NULL DEFAULT 'OWNER',
  token_version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX IF NOT EXISTS idx_cars_brand_model ON cars (brand, model);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars (status);
CREATE INDEX IF NOT EXISTS idx_cars_listing_type ON cars (listing_type);
CREATE INDEX IF NOT EXISTS idx_cars_price_sale ON cars (sale_price_amount);
CREATE INDEX IF NOT EXISTS idx_cars_deleted_at ON cars (deleted_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_admin_user ON refresh_tokens (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_intent ON leads (intent);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals (created_at DESC);
