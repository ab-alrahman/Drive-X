// Item 7: customers can request maintenance for ANY Drive X car and pick a
// preferred workshop from the verified network. Stores the customer's chosen
// workshop separately from assigned_partner_id (which the admin sets during triage).
exports.up = (pgm) => {
  pgm.sql(`
ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS preferred_partner_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'maintenance_requests_preferred_partner_id_fkey'
  ) THEN
    ALTER TABLE maintenance_requests
      ADD CONSTRAINT maintenance_requests_preferred_partner_id_fkey
      FOREIGN KEY (preferred_partner_id)
      REFERENCES technicians(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_preferred_partner
  ON maintenance_requests (preferred_partner_id);
`);
};

exports.down = (pgm) => {
  pgm.sql(`
DROP INDEX IF EXISTS idx_maintenance_requests_preferred_partner;
ALTER TABLE maintenance_requests DROP COLUMN IF EXISTS preferred_partner_id;
`);
};
