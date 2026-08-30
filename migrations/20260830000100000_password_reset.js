exports.up = (pgm) => {
  pgm.sql(`
CREATE TABLE IF NOT EXISTS admin_password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_password_reset_tokens_user
  ON admin_password_reset_tokens (admin_user_id);

CREATE TABLE IF NOT EXISTS customer_password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_password_reset_tokens_user
  ON customer_password_reset_tokens (customer_user_id);
`);
};

exports.down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS admin_password_reset_tokens;
DROP TABLE IF EXISTS customer_password_reset_tokens;
`);
};