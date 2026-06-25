exports.up = (pgm) => {
  pgm.sql(`
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

CREATE TABLE IF NOT EXISTS customer_favorites (
  customer_user_id UUID NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (customer_user_id, car_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_refresh_tokens_user ON customer_refresh_tokens (customer_user_id);
CREATE INDEX IF NOT EXISTS idx_customer_refresh_tokens_expires_at ON customer_refresh_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_customer_favorites_car ON customer_favorites (car_id);
`);
};

exports.down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS customer_favorites;
DROP TABLE IF EXISTS customer_refresh_tokens;
DROP TABLE IF EXISTS customer_users;
`);
};
