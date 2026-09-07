// Split into its own migration (separate transaction) because the previous migration's
// `ALTER TYPE admin_role ADD VALUE 'PLATFORM_ADMIN'` cannot be used in the same transaction
// it was added in - a long-standing Postgres restriction on enum additions.
exports.up = (pgm) => {
  pgm.sql(`
INSERT INTO vendors (name, status)
SELECT 'Drive X Direct', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE name = 'Drive X Direct');

-- Existing inventory and the two existing OWNER/STAFF accounts have always been Drive X's own
-- direct-sale business - they become an ordinary vendor row, not tied to the new Platform Admin
-- concept (per the "no special-casing" decision: Drive X Direct is governed like any vendor).
UPDATE cars SET vendor_id = (SELECT id FROM vendors WHERE name = 'Drive X Direct')
WHERE vendor_id IS NULL;

UPDATE admin_users SET vendor_id = (SELECT id FROM vendors WHERE name = 'Drive X Direct')
WHERE role IN ('OWNER', 'STAFF') AND vendor_id IS NULL;

ALTER TABLE cars ALTER COLUMN vendor_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_users_role_vendor_check'
      AND conrelid = 'admin_users'::regclass
  ) THEN
    ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_vendor_check CHECK (
      (role = 'PLATFORM_ADMIN' AND vendor_id IS NULL) OR
      (role IN ('OWNER', 'STAFF') AND vendor_id IS NOT NULL)
    );
  END IF;
END $$;
`);
};

exports.down = (pgm) => {
  pgm.sql(`
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_vendor_check;
ALTER TABLE cars ALTER COLUMN vendor_id DROP NOT NULL;
`);
};
